/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import mongoose, { Types } from 'mongoose';
import dbConnect from '@/app/lib/db/connection'; // Adjust path to your database connection utility
import Contact, {  IContact } from '@/app/models/Contact'; // Adjust path to your Contact model
import User from '@/app/models/User'; // Adjust path to your User model
import { authorizeRoles, isAuthenticatedUser } from '../../middlewares/auth';

// Define the expected contact structure from the payload
interface PayloadContact {
  name: string;
  email: string;
  phone: string;
  tags?: string;
  businessName?: string;
}

// Define the expected payload structure
interface ContactPayload {
  contacts: PayloadContact[];
  assignedUsers: string[];
  assignType: 'every' | 'equally' | 'roundRobin';
  addToPipeline: boolean;
}

// Hardcoded pipeline and stage IDs
const PIPELINE_ID = new mongoose.Types.ObjectId(process.env.DEFAULT_PIPELINE);
const STAGE_ID = new mongoose.Types.ObjectId(process.env.DEFAULT_STAGE);

// POST: Create or upsert multiple contacts (bulk import from XLS/CSV)
export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize the user
    const currentUser = await isAuthenticatedUser(request);
    authorizeRoles(currentUser, 'admin');

    await dbConnect();

    const payload: ContactPayload = await request.json();

    // Validate payload
    if (!payload.contacts || !Array.isArray(payload.contacts)) {
      return NextResponse.json({ error: 'Invalid contacts array' }, { status: 400 });
    }
    if (!payload.assignedUsers || !Array.isArray(payload.assignedUsers)) {
      return NextResponse.json({ error: 'Invalid assignedUsers array' }, { status: 400 });
    }
    if (!['every', 'equally', 'roundRobin'].includes(payload.assignType)) {
      return NextResponse.json({ error: 'Invalid assignType' }, { status: 400 });
    }

    // Validate assignedUsers exist in the database
    const users = await User.find({ _id: { $in: payload.assignedUsers } });
    if (users.length !== payload.assignedUsers.length) {
      return NextResponse.json({ error: 'One or more assignedUsers not found' }, { status: 400 });
    }

    const processedContacts: IContact[] = [];
    const failedContacts: { contact: PayloadContact; error: string }[] = [];

    // Process contacts concurrently
    await Promise.all(
      payload.contacts.map(async (contact, index) => {
        try {
          // Validate required fields
          const requiredFields = ['name', 'email', 'phone'];
          for (const field of requiredFields) {
            if (!contact[field as keyof PayloadContact]) {
              throw new Error(`Missing required field: ${field}`);
            }
          }

          // Validate email format
          if (!/^[^@]+@[^@]+\.[^@]+$/.test(contact.email)) {
            throw new Error(`Invalid email format: ${contact.email}`);
          }

          // Validate phone format (example: +1234567890 or 123-456-7890)
          if (!/^\+?\d{10,15}$/.test(contact.phone.replace(/[\-\s()]/g, ''))) {
            throw new Error(`Invalid phone format: ${contact.phone}`);
          }

          const assignedTo: { user: Types.ObjectId; time: Date }[] = [];

          // Determine assigned users based on assignType
          if (payload.assignType === 'every') {
            // Assign every user to this contact
            payload.assignedUsers.forEach((userId) => {
              assignedTo.push({
                user: new mongoose.Types.ObjectId(userId),
                time: new Date(),
              });
            });
          } else if (payload.assignType === 'equally') {
            const usersCount = payload.assignedUsers.length;
            const contactsPerUser = Math.floor(payload.contacts.length / usersCount);
            const remainderStartIndex = contactsPerUser * usersCount;

            if (index < remainderStartIndex) {
              // Assign equally
              const userIndex = Math.floor(index / contactsPerUser);
              assignedTo.push({
                user: new mongoose.Types.ObjectId(payload.assignedUsers[userIndex]),
                time: new Date(),
              });
            } else {
              // Assign remainder using round-robin
              const remainderIndex = index - remainderStartIndex;
              assignedTo.push({
                user: new mongoose.Types.ObjectId(
                  payload.assignedUsers[remainderIndex % usersCount]
                ),
                time: new Date(),
              });
            }
          } else if (payload.assignType === 'roundRobin') {
            // Assign sequentially, cycling through users
            assignedTo.push({
              user: new mongoose.Types.ObjectId(
                payload.assignedUsers[index % payload.assignedUsers.length]
              ),
              time: new Date(),
            });
          }

          // Prepare contact data for upsert
          const contactData: Partial<IContact> = {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            businessName: contact.businessName || "Nil",
            source: 'bulk_import', // Override default 'manual' to indicate bulk import
            tags: contact.tags
              ? new mongoose.Types.DocumentArray([
                  {
                    user: new mongoose.Types.ObjectId(currentUser._id),
                    name: contact.tags,
                  },
                ])
              : new mongoose.Types.DocumentArray([]),
            assignedTo: new mongoose.Types.DocumentArray(assignedTo),
            pipelinesActive: payload.addToPipeline
              ? new mongoose.Types.DocumentArray([
                  {
                    pipeline_id: PIPELINE_ID,
                    stage_id: STAGE_ID,
                    order: 0,
                  },
                ])
              : new mongoose.Types.DocumentArray([]),
          };

          // Upsert contact using the authenticated user's ID
          const updatedContact = await Contact.upsertContact(
            contactData,
            currentUser._id ? new Types.ObjectId(currentUser._id) : new Types.ObjectId("6847dc679c7418164de7d8f3")
          );

          processedContacts.push(updatedContact);
        } catch (error: any) {
          // Log error and skip to next contact
          failedContacts.push({
            contact,
            error: error.message || 'Failed to process contact',
          });
        }
      })
    );

    // Return response with processed and failed contacts
    return NextResponse.json(
      {
        message: `Processed ${processedContacts.length} contacts successfully, ${failedContacts.length} failed`,
        contacts: processedContacts,
        failed: failedContacts,
      },
      { status: failedContacts.length > 0 ? 207 : 201 } // 207 for partial success
    );
  } catch (error: any) {
    console.error('Error processing contacts:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}