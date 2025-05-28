/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import mongoose, { Types } from 'mongoose';
import Contact, { IContact } from '@/app/models/Contact';
import dbConnect from '@/app/lib/db/connection';
import { authorizeRoles, isAuthenticatedUser } from '@/app/api/middlewares/auth';

// Interface for request body
interface UpdateProbabilityRequest {
  probability: number;
}

// PATCH handler to update contact probability
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Connect to database
    await dbConnect();

    // Authenticate user and authorize roles
    let user;
    try {
      user = await isAuthenticatedUser(request);
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

    authorizeRoles(user, 'admin', 'team_member');

    // Extract and await params
    const { id } = await context.params;

    // Validate ID
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing contact ID' },
        { status: 400 }
      );
    }

    const { probability } = await request.json() as UpdateProbabilityRequest;

    // Validate probability
    if (typeof probability !== 'number' || probability < 0 || probability > 100) {
      return NextResponse.json(
        { success: false, error: 'Probability must be a number between 0 and 100' },
        { status: 400 }
      );
    }

    // Start a Mongoose session for transaction
    const mongooseSession = await mongoose.startSession();
    let contact: IContact | null = null;

    await mongooseSession.withTransaction(async () => {
      // Find and update contact
      contact = await Contact.findById(id).session(mongooseSession);

      if (!contact) {
        await mongooseSession.abortTransaction();
        return NextResponse.json(
          { success: false, error: 'Contact not found' },
          { status: 404 }
        );
      }

      // Store old probability for logging
      const oldProbability = contact.probability;

      // Update probability
      contact.probability = probability;

      // Log activity
      await contact.logActivity(
        'CONTACT_UPDATED',
        new Types.ObjectId(user._id),
        {
          field: 'probability',
          oldValue: oldProbability,
          newValue: probability,
        },
        mongooseSession
      );

      // Save contact
      await contact.save({ session: mongooseSession });
    });

    mongooseSession.endSession();

    return NextResponse.json({
      success: true,
      message: 'Probability updated successfully',
      contact: {
        _id: contact!._id,
        probability: contact!.probability,
      },
    });
  } catch (error: any) {
    console.error('Error updating contact probability:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: error.message.includes('login') || error.message.includes('Not allowed') ? 401 : 500 }
    );
  }
}