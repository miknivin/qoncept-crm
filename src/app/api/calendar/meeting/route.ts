import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import ContactResponse from '@/app/models/ContactResponse';
import { isAuthenticatedUser, authorizeRoles } from '@/app/api/middlewares/auth';
import dbConnect from '@/app/lib/db/connection';
import { ICalendarEvent } from '@/components/calendar/Calendar';
import CalendarEvent from '@/app/models/CalendarEvents';


export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const event: ICalendarEvent & { contactResponse?: string } = await request.json();

    // Validate required fields
    if (!event.title || !event.start || !event.extendedProps?.calendar) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Authenticate user and check roles
    const user = await isAuthenticatedUser(request);
    authorizeRoles(user, 'admin', 'team_member');

    // Validate contactResponse if provided
    let contactResponseId = null;
    if (event.contactResponse) {
      if (!mongoose.Types.ObjectId.isValid(event.contactResponse)) {
        return NextResponse.json({ error: 'Invalid contactResponse ID' }, { status: 400 });
      }
      const contactResponse = await ContactResponse.findById(event.contactResponse);
      if (!contactResponse) {
        return NextResponse.json({ error: 'ContactResponse not found' }, { status: 404 });
      }
      contactResponseId = event.contactResponse;
    }

    const newEvent = new CalendarEvent({
      title: event.title,
      start: event.start,
      end: event.end || event.start,
      allDay: event.allDay ?? true,
      extendedProps: { calendar: event.extendedProps.calendar },
      contactResponse: contactResponseId,
    });

    const savedEvent = await newEvent.save();

    const responseEvent = {
      id: savedEvent._id.toString(),
      title: savedEvent.title,
      start: savedEvent.start,
      end: savedEvent.end,
      allDay: savedEvent.allDay,
      extendedProps: savedEvent.extendedProps,
      contactResponse: savedEvent.contactResponse?.toString() || null,
    };

    return NextResponse.json(responseEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event', details: (error as Error).message },
      { status: (error as Error).message.includes('login') || (error as Error).message.includes('Not allowed') ? 401 : 500 }
    );
  }
}