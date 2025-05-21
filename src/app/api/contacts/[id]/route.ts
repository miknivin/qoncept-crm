/* eslint-disable @typescript-eslint/no-unused-expressions */
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Contact from '@/app/models/Contact'; // Adjust path to your Contact model
import dbConnect from '@/app/lib/db/connection';
import Pipeline from '@/app/models/Pipeline';
import User from '@/app/models/User';
import Stage from '@/app/models/Stage';
import { validateUpdateContact } from '../../middlewares/validateContactPut';
import { isAuthenticatedUser } from '../../middlewares/auth';

// GET /api/contacts/[id] - Get contact by ID with all populated data
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()
    Pipeline;
    User;
    Stage;
    // Extract id from context.params
    const { id } = await context.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid contact ID' },
        { status: 400 }
      );
    }

    // Find contact and populate all referenced fields
    const contact = await Contact.findById(id)
      .populate('user', 'name email') // Populate user details
      .populate('assignedTo.user', 'name email') // Populate assigned users
      .populate('pipelinesActive.pipeline_id', 'name') // Populate pipeline details
      .populate('pipelinesActive.stage_id', 'name') // Populate stage details
      .populate('activities.user', 'name email') // Populate activity users
      .lean(); // Convert to plain JavaScript object for better performance

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    // Authenticate user
    let user;
    try {
      user = await isAuthenticatedUser(request);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!user._id) {
      return NextResponse.json(
        { success: false, error: 'Invalid user data' },
        { status: 401 }
      );
    }
    const userId = user._id.toString();

    const { id } = await context.params;
    const body = await request.json();

    // Validate contact ID and body
    try {
      validateUpdateContact(id, body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    const contact = await Contact.findById(id);
    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Track changes for activity logging
    const updatedFields: Record<string, unknown> = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      notes: body.notes || '',
    };

    // Update basic fields (replace entirely)
    contact.name = body.name;
    contact.email = body.email;
    contact.phone = body.phone;
    contact.notes = body.notes || '';

    // Handle tags (replace entirely)
    const currentTags = contact.tags.map((tag) => tag.name);
    const newTags = Array.isArray(body.tags) ? body.tags : [];
    const addedTags = newTags.filter((tag: string) => !currentTags.includes(tag));
    const removedTags = currentTags.filter((tag: string) => !newTags.includes(tag));

    contact.tags = newTags.map((tag: string) => ({
      user: new mongoose.Types.ObjectId(userId),
      name: tag,
    }));

    // Log activities sequentially
    for (const tag of addedTags) {
      try {
        await contact.logActivity('TAG_ADDED', new mongoose.Types.ObjectId(userId), { tag });
      } catch (error) {
        console.error(`Error logging TAG_ADDED for tag "${tag}":`, error);
      }
    }

    for (const tag of removedTags) {
      try {
        await contact.logActivity('TAG_REMOVED', new mongoose.Types.ObjectId(userId), { tag });
      } catch (error) {
        console.error(`Error logging TAG_REMOVED for tag "${tag}":`, error);
      }
    }

    if (newTags.length !== currentTags.length || addedTags.length || removedTags.length) {
      updatedFields.tags = newTags;
    }

    if (Object.keys(updatedFields).length) {
      try {
        await contact.logActivity('CONTACT_UPDATED', new mongoose.Types.ObjectId(userId), {
          updatedFields,
        });
      } catch (error) {
        console.error('Error logging CONTACT_UPDATED:', error);
      }
    }

    // Save the contact after all activities are logged
    await contact.save();


  
    return NextResponse.json({
      success: true,
      message: 'Contact updated successfully',
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}