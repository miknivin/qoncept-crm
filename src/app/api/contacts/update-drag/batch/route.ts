/* eslint-disable @typescript-eslint/no-explicit-any */
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
    // Initialize caches
    const pipelineCache = new Map<string, any>(); // Map<pipelineId, Pipeline>
    const stageCache = new Map<string, any>(); // Map<stageId, Stage>
    try {
      const response = await session.withTransaction(async () => {
        const updatedContacts: IContact[] = [];

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

          // Check cache for pipelineId
          let pipeline;
          if (pipelineCache.has(pipelineId)) {
            pipeline = pipelineCache.get(pipelineId);
          } else {
            pipeline = await mongoose.model('Pipeline').findById(pipelineObjectId).session(session);
            if (!pipeline) {
              throw new Error(`Invalid pipeline ID: ${pipelineId}`);
            }
            pipelineCache.set(pipelineId, pipeline);
          }

          // Check cache for stageId
          let stage;
          if (stageCache.has(stageId)) {
            stage = stageCache.get(stageId);
            // Verify stage belongs to the pipeline
            if (stage.pipeline_id.toString() !== pipelineId) {
              throw new Error(`Stage ${stageId} does not belong to pipeline ${pipelineId}`);
            }
          } else {
            stage = await mongoose.model('Stage').findOne({
              _id: stageObjectId,
              pipeline_id: pipelineObjectId,
            }).session(session);
            if (!stage) {
              throw new Error(`Invalid stage ID: ${stageId}`);
            }
            stageCache.set(stageId, stage);
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
        });
      });

      // Return the response from the transaction
      return response;
    } finally {
      // Clear caches
      pipelineCache.clear();
      stageCache.clear();
      // End the session
      session.endSession();
    }
  } catch (error: any) {
    console.error('Error updating contacts pipeline:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message.includes('not found') || error.message.includes('Invalid') ? 400 : 500 }
    );
  }
}