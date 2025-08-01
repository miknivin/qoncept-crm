/* eslint-disable @typescript-eslint/no-unused-expressions */
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import ContactResponse from '@/app/models/ContactResponse';
import { authorizeRoles, isAuthenticatedUser } from '@/app/api/middlewares/auth';
import Contact from '@/app/models/Contact';
import Pipeline from '@/app/models/Pipeline';
import Stage from '@/app/models/Stage';
import CalendarEvent from '@/app/models/CalendarEvents';

// Async function to simulate awaiting params
// const getParams = async (params: { contactId: string; responseId: string }): Promise<{ contactId: string; responseId: string }> => {
//   return Promise.resolve(params); // Simulate async params retrieval
// };

// const getParams2 = async (params: { responseId: string }): Promise<{ responseId: string }> => {
//   return Promise.resolve(params); // Simulate async params retrieval
// };

// Update an existing ContactResponse
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ contactId: string; responseId: string }> }
): Promise<NextResponse> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Authenticate user and check roles
    Pipeline
    Stage
    CalendarEvent
    const user = await isAuthenticatedUser(request);
    authorizeRoles(user, 'admin', 'team_member');

    // Await params
   const { contactId, responseId } = await context.params;

    const { activity, note, meetingScheduledDate } = await request.json();

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ message: 'Invalid contact ID' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(responseId)) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ message: 'Invalid response ID' }, { status: 400 });
    }

    if (!activity || typeof activity !== 'string') {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ message: 'Activity type is required' }, { status: 400 });
    }

    // Validate meetingScheduledDate if provided
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
    const contact = await Contact.findById(contactId).session(session);
    if (!contact) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ message: 'Contact not found' }, { status: 404 });
    }

    // Check if ContactResponse exists and belongs to the contact
    const contactResponse = await ContactResponse.findOne({
      _id: responseId,
      contact: contactId,
    }).session(session);
    if (!contactResponse) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json(
        { message: 'ContactResponse not found or does not belong to this contact' },
        { status: 404 }
      );
    }

    // Update ContactResponse
    await ContactResponse.findByIdAndUpdate(
      responseId,
      {
        activity,
        note: note || '',
        meetingScheduledDate: validatedMeetingScheduledDate,
      },
      { session, runValidators: true }
    );

    // Log activity
    await contact.logActivity(
      'CONTACT_RESPONSE_UPDATED',
      new mongoose.Types.ObjectId(user._id),
      { activity, note, meetingScheduledDate: validatedMeetingScheduledDate?.toISOString(), contactResponseId: responseId },
      session
    );

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ message: 'ContactResponse updated successfully' }, { status: 200 });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: (error as Error).message.includes('login') || (error as Error).message.includes('Not allowed') ? 401 : 500 }
    );
  }
}


export async function GET(
  request: NextRequest,
  context: { params: Promise< { responseId: string }> }
): Promise<NextResponse> {
  try {
    // Authenticate user and check roles
    Pipeline
    Stage
    CalendarEvent
    const user = await isAuthenticatedUser(request);
    authorizeRoles(user, 'admin', 'team_member');

    // Await params
    const { responseId } = await context.params;

    // Validate responseId
    if (!mongoose.Types.ObjectId.isValid(responseId)) {
      return NextResponse.json({ message: 'Invalid response ID' }, { status: 400 });
    }

    // Find ContactResponse by ID
    const contactResponse = await ContactResponse.findById(responseId);

    if (!contactResponse) {
      return NextResponse.json({ message: 'ContactResponse not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'ContactResponse retrieved successfully', data: contactResponse },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Server error', error: (error as Error).message },
      { status: (error as Error).message.includes('login') || (error as Error).message.includes('Not allowed') ? 401 : 500 }
    );
  }
}