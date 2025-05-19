import { NextResponse } from 'next/server';
import mongoose, { Types } from 'mongoose';
import Contact, { IContact, PipelineActive } from '@/app/models/Contact'; // Adjust path
import dbConnect from '@/app/lib/db/connection';

// Validate ObjectId utility
const validateObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

interface BatchUpdateRequest {
  updates: {
    contactId: string;
    pipelineId: string;
    stageId: string;
    order: number;
    userId?: string; // Optional
  }[];
}

// PATCH handler
export async function PATCH(req: Request) {
  try {
    //console.log("executed");
    await dbConnect();

    const { updates } = (await req.json()) as BatchUpdateRequest;

    // Validate inputs
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Updates must be a non-empty array' }, { status: 400 });
    }

    for (const update of updates) {
      const { contactId, pipelineId, stageId, order, userId } = update;
      if (!validateObjectId(contactId) || !validateObjectId(pipelineId) || !validateObjectId(stageId)) {
        return NextResponse.json(
          { error: `Invalid contactId, pipelineId, or stageId in update for contact ${contactId}` },
          { status: 400 }
        );
      }
      if (userId && !validateObjectId(userId)) {
        return NextResponse.json(
          { error: `Invalid userId in update for contact ${contactId}` },
          { status: 400 }
        );
      }
      if (typeof order !== 'number' || order < 0) {
        return NextResponse.json(
          { error: `Order must be a non-negative number in update for contact ${contactId}` },
          { status: 400 }
        );
      }
    }

    // Use a MongoDB transaction for atomic updates
    const session = await mongoose.startSession();
    try {
      const response = await session.withTransaction(async () => {
        const updatedContacts: IContact[] = [];
        ////console.log(updates,'updates')
        // Process each update
        for (const update of updates) {
          const { contactId, pipelineId, stageId, order, userId } = update;
          const contactObjectId = new Types.ObjectId(contactId);
          const pipelineObjectId = new Types.ObjectId(pipelineId);
          const stageObjectId = new Types.ObjectId(stageId);
          const userObjectId = userId ? new Types.ObjectId(userId) : null;

          // Find the contact
          const contact = await Contact.findById(contactObjectId).session(session);
          if (!contact) {
            throw new Error(`Contact not found: ${contactId}`);
          }

          // Verify pipeline and stage exist
          const pipeline = await mongoose.model('Pipeline').findById(pipelineObjectId).session(session);
          if (!pipeline) {
            throw new Error(`Invalid pipeline ID: ${pipelineId}`);
          }
          const stage = await mongoose.model('Stage').findOne({
            _id: stageObjectId,
            pipeline_id: pipelineObjectId,
          }).session(session);
          if (!stage) {
            throw new Error(`Invalid stage ID: ${stageId}`);
          }

          // Update pipelinesActive
          const pipelineActiveIndex = contact.pipelinesActive.findIndex(
            (pa) => pa.pipeline_id.toString() === pipelineId
          );

          if (pipelineActiveIndex === -1) {
            contact.pipelinesActive.push({
              pipeline_id: pipelineObjectId,
              stage_id: stageObjectId,
              order,
            } as PipelineActive);
          } else {
            contact.pipelinesActive[pipelineActiveIndex].stage_id = stageObjectId;
            contact.pipelinesActive[pipelineActiveIndex].order = order;
          }

          // Log activity if userId provided
          if (userObjectId) {
            await contact.logActivity(
              'PIPELINE_STAGE_UPDATED',
              userObjectId,
              {
                pipelineId,
                stageId,
                order,
              },
              session
            );
          }

          await contact.save({ session });
          updatedContacts.push(contact);
        }

        // Return response inside transaction
        return NextResponse.json({
          success: true,
        //   data: updatedContacts.map((contact) => ({
        //     _id: contact._id,
        //     name: contact.name,
        //     email: contact.email,
        //     phone: contact.phone,
        //     pipelinesActive: contact.pipelinesActive,
        //   })),
        });
      });

      // Return the response from the transaction
      return response;
    } finally {
      session.endSession();
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error updating contacts pipeline:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message.includes('not found') || error.message.includes('Invalid') ? 400 : 500 }
    );
  }
}