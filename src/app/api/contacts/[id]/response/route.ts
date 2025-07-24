import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import ContactResponse from '@/app/models/ContactResponse';
import { authorizeRoles, isAuthenticatedUser } from '@/app/api/middlewares/auth';
import Contact from '@/app/models/Contact';

const getParams = async (params: { id: string }): Promise<{ id: string }> => {
  return Promise.resolve(params); // Simulate async params retrieval
};

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await isAuthenticatedUser(request);
    authorizeRoles(user, 'admin', 'team_member');

    const { id } = await getParams(context.params);
    const { activity, note, meetingScheduledDate } = await request.json();
    console.log(meetingScheduledDate);
    
    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ message: 'Invalid contact ID' }, { status: 400 });
    }

    if (!activity || typeof activity !== 'string') {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ message: 'Activity type is required' }, { status: 400 });
    }

    let validatedMeetingScheduledDate: Date | null = null;
    if (meetingScheduledDate) {
      const parsedDate = new Date(meetingScheduledDate);
      if (isNaN(parsedDate.getTime())) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json({ message: 'Invalid meetingScheduledDate' }, { status: 400 });
      }
      validatedMeetingScheduledDate = parsedDate;
    }

    // Check if contact exists
    const contact = await Contact.findById(id).session(session);
    if (!contact) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ message: 'Contact not found' }, { status: 404 });
    }

    // Create ContactResponse and get its _id
    const contactResponse = new ContactResponse({
      contact: id,
      activity,
      note: note || '',
      meetingScheduledDate: validatedMeetingScheduledDate || null,
      createdAt: new Date(),
    });
    await contactResponse.save({ session });
    contact.contactResponses.push(contactResponse._id);
    await contact.save({ session }); 
    // Log activity
    await contact.logActivity(
      'CONTACT_RESPONSE_ADDED',
      new mongoose.Types.ObjectId(user._id),
      { activity, note, contactResponseId: contactResponse._id },
      session
    );

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json(
      { message: 'ContactResponse created successfully', id: contactResponse._id.toString() },
      { status: 201 }
    );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: error.message.includes('login') || error.message.includes('Not allowed') ? 401 : 500 }
    );
  }
}


export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Authenticate user and check roles
    const user = await isAuthenticatedUser(request);
    authorizeRoles(user, 'admin', 'team_member');

    // Await params
    const { id } = await getParams(context.params);

    // Validate contactId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid contact ID' }, { status: 400 });
    }

    // Check if contact exists
    const contact = await Contact.findById(id);
    if (!contact) {
      return NextResponse.json({ message: 'Contact not found' }, { status: 404 });
    }

    // Retrieve all ContactResponses for the contact
    const contactResponses = await ContactResponse.find({ contact: id }).sort({ createdAt: -1 });

    return NextResponse.json(contactResponses, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: (error as Error).message.includes('login') || (error as Error).message.includes('Not allowed') ? 401 : 500 }
    );
  }
}