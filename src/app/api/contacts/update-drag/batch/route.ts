/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import mongoose, { Types } from 'mongoose';
import Contact, { IContact, PipelineActive } from '@/app/models/Contact'; // Adjust path
import dbConnect from '@/app/lib/db/connection';
import { cacheContact, getCachedContactsBatch, cachePipeline, getCachedPipeline, cacheStage, getCachedStage} from '../../../utils/redis/contactRedis'; // Adjust path
import { authorizeRoles, isAuthenticatedUser } from '@/app/api/middlewares/auth';

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
export async function PATCH(req: NextRequest) {
  try {
    // Authenticate user
    const user = await isAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Need to login" },
        { status: 400 }
      );
    }
    try {
      authorizeRoles(user, "admin");
    } catch {
      try {
        authorizeRoles(user, "team_member");
      } catch {
        return NextResponse.json(
          { error: "User is neither admin nor team_member" },
          { status: 401 }
        );
      }
    }

    await dbConnect();

    const { updates } = (await req.json()) as BatchUpdateRequest;

    // Validate inputs
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Updates must be a non-empty array' }, { status: 400 });
    }

    const contactIds = new Set<string>();
    const pipelineIds = new Set<string>();
    const stageIds = new Set<string>();
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
      contactIds.add(contactId);
      pipelineIds.add(pipelineId);
      stageIds.add(stageId);
    }

    // Use a MongoDB transaction for atomic updates
    const session = await mongoose.startSession();
    try {
      const response = await session.withTransaction(async () => {
        // Batch check contacts in Redis
        const contactIdsArray = Array.from(contactIds);
        const cachedContacts = await getCachedContactsBatch(contactIdsArray);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const contactsToFetch = contactIdsArray.filter((_, i) => !cachedContacts[i]);

        // Batch fetch contacts from MongoDB for validation
        const contacts = await Contact.find({
          _id: { $in: contactIdsArray.map(id => new Types.ObjectId(id)) }
        }).session(session).lean();
        const contactMap = new Map(contacts.map(c => [c._id.toString(), c]));
        for (const contactId of contactIds) {
          if (!contactMap.has(contactId)) {
            throw new Error(`Contact not found: ${contactId}`);
          }
        }

        // Batch fetch pipelines and stages from Redis or MongoDB
        const pipelineMap = new Map<string, any>();
        const stageMap = new Map<string, any>();

        // Fetch pipelines
        const pipelineIdsArray = Array.from(pipelineIds);
        const cachedPipelines = await Promise.all(
          pipelineIdsArray.map(id => getCachedPipeline(id))
        );
        const pipelinesToFetch = pipelineIdsArray.filter((_, i) => !cachedPipelines[i]);
        if (pipelinesToFetch.length > 0) {
          const dbPipelines = await mongoose.model('Pipeline')
            .find({ _id: { $in: pipelinesToFetch.map(id => new Types.ObjectId(id)) } })
            .session(session)
            .lean();
          for (const pipeline of dbPipelines) {
            pipelineMap.set((pipeline as { _id: Types.ObjectId })._id.toString(), pipeline);
            Promise.allSettled([
              cachePipeline((pipeline as { _id: Types.ObjectId })._id.toString(), pipeline as any)
            ]).catch(error => console.error(`Error caching pipeline ${pipeline._id}:`, error));
          }
        }
        cachedPipelines.forEach((pipeline:any, i:number) => {
          if (pipeline) {
            pipelineMap.set(pipelineIdsArray[i], pipeline);
          }
        });
        for (const pipelineId of pipelineIds) {
          if (!pipelineMap.has(pipelineId)) {
            throw new Error(`Invalid pipeline ID: ${pipelineId}`);
          }
        }

        // Fetch stages
        const stageIdsArray = Array.from(stageIds);
        const cachedStages = await Promise.all(
          stageIdsArray.map(id => getCachedStage(id))
        );
        const stagesToFetch = stageIdsArray.filter((_, i) => !cachedStages[i]);
        if (stagesToFetch.length > 0) {
          const dbStages = await mongoose.model('Stage')
            .find({
              _id: { $in: stagesToFetch.map(id => new Types.ObjectId(id)) },
              pipeline_id: { $in: Array.from(pipelineIds).map(id => new Types.ObjectId(id)) }
            })
            .session(session)
            .lean();
          for (const stage of dbStages as any[]) {
            stageMap.set((stage as any)._id.toString(), stage);
            // Cache stage non-blocking
            Promise.allSettled([
              cacheStage((stage as any)._id.toString(), stage)
            ]).catch(error => console.error(`Error caching stage ${(stage as any)._id}:`, error));
          }
        }
        cachedStages.forEach((stage:any, i:number) => {
          if (stage) {
            stageMap.set(stageIdsArray[i], stage);
          }
        });
        for (const stageId of stageIds) {
          if (!stageMap.has(stageId)) {
            throw new Error(`Invalid stage ID: ${stageId}`);
          }
        }

        // Validate stage-pipeline relationships
        for (const update of updates) {
          const { pipelineId, stageId } = update;
          const stage = stageMap.get(stageId);
          if (stage.pipeline_id.toString() !== pipelineId) {
            throw new Error(`Stage ${stageId} does not belong to pipeline ${pipelineId}`);
          }
        }

        // Process updates
        const updatedContacts: IContact[] = [];
        const activityPromises: Promise<void>[] = [];
        for (const update of updates) {
          const { contactId, pipelineId, stageId, order, userId } = update;
          const contactObjectId = new Types.ObjectId(contactId);
          const pipelineObjectId = new Types.ObjectId(pipelineId);
          const stageObjectId = new Types.ObjectId(stageId);
          const userObjectId = userId ? new Types.ObjectId(userId) : null;

          // Update contact using findByIdAndUpdate
          const updateQuery: any = {
            $set: {
              [`pipelinesActive.$[elem].stage_id`]: stageObjectId,
              [`pipelinesActive.$[elem].order`]: order
            }
          };
          const arrayFilters = [{ 'elem.pipeline_id': pipelineObjectId }];

          // If pipeline doesn't exist, push new pipelineActive entry
          const contact = contactMap.get(contactId);
         let pipelineExists;
          if(contact){
           pipelineExists = contact.pipelinesActive.some(
            (pa: any) => pa.pipeline_id.toString() === pipelineId
          );
          }

          if (!pipelineExists) {
            updateQuery.$push = {
              pipelinesActive: {
                pipeline_id: pipelineObjectId,
                stage_id: stageObjectId,
                order
              } as PipelineActive
            };
            delete updateQuery.$set;
          }

          const updatedContact = await Contact.findByIdAndUpdate(
            contactObjectId,
            updateQuery,
            {
              new: true,
              session,
              arrayFilters: pipelineExists ? arrayFilters : undefined
            }
          );
          if (!updatedContact) {
            throw new Error(`Contact not found: ${contactId}`);
          }

          // Log activity non-blocking with separate try-catch
          if (userObjectId) {
            activityPromises.push(
              (async () => {
                try {
                  await updatedContact.logActivity(
                    'PIPELINE_STAGE_UPDATED',
                    userObjectId,
                    {
                      pipelineId,
                      stageId,
                      order,
                    },
                    session
                  );
                } catch (error) {
                  console.error(`Failed to log activity for contact ${contactId}:`, error);
                }
              })()
            );
          }

          // Cache updated contact non-blocking
          Promise.allSettled([
            cacheContact(contactId, updatedContact.toObject())
          ]).catch((error) => {
            console.error(`Error caching updated contact ${contactId}:`, error);
          });

          updatedContacts.push(updatedContact);
        }

        // Execute activity logging non-blocking
        await Promise.allSettled(activityPromises);

        // Return response inside transaction
        return NextResponse.json({
          success: true,
        });
      });

      // Return the response from the transaction
      return response;
    } finally {
      // End the session
      session.endSession();
    }
  } catch (error: any) {
    console.error('Error updating contacts pipeline:', error);
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return NextResponse.json(
        { error: `Duplicate key error for contact _id: ${error.keyValue?._id || 'unknown'}` },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message.includes('not found') || error.message.includes('Invalid') ? 400 : 500 }
    );
  }
}