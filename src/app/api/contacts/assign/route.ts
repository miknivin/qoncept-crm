import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/app/models/User";
import Contact from "@/app/models/Contact";
import { authorizeRoles, isAuthenticatedUser } from "../../middlewares/auth";
import dbConnect from "@/app/lib/db/connection";

// Define the request body interface
interface AssignContactsRequest {
  contactIds: string[];
  userIds: string[];
  assignType: "every" | "equally" | "roundRobin";
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate the user
    const currentUser = await isAuthenticatedUser(req);
    authorizeRoles(currentUser, 'admin');

    // Parse request body
    const body: AssignContactsRequest = await req.json();
    const { contactIds, userIds, assignType } = body;
    console.log("Debug: Parsed request body:", { contactIds, userIds, assignType });

    // Validate input
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      console.log("Debug: Validation failed - Invalid or empty contactIds:", contactIds);
      return NextResponse.json({ error: "Invalid or empty contactIds" }, { status: 400 });
    }
    if (!Array.isArray(userIds) || userIds.length === 0) {
      console.log("Debug: Validation failed - Invalid or empty userIds:", userIds);
      return NextResponse.json({ error: "Invalid or empty userIds" }, { status: 400 });
    }
    if (!["every", "equally", "roundRobin"].includes(assignType)) {
      console.log("Debug: Validation failed - Invalid assignType:", assignType);
      return NextResponse.json({ error: "Invalid assignType" }, { status: 400 });
    }

    // Connect to database
    await dbConnect();

    // Verify users exist
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      return NextResponse.json({ error: "One or more users not found" }, { status: 404 });
    }

    // Verify contacts exist
    const contacts = await Contact.find({ _id: { $in: contactIds } });
    if (contacts.length !== contactIds.length) {
      return NextResponse.json({ error: "One or more contacts not found" }, { status: 404 });
    }

    // Start a MongoDB session for atomic updates
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Assignment logic
        const updates: {
          contactId: string;
          assignedTo: { user: string; time: Date }[];
          activity: { action: string; user: string; details: object; createdAt: Date };
        }[] = [];

        if (assignType === "every") {
          // Assign all contacts to every user
          const assignedTo = userIds.map((userId) => ({ user: userId, time: new Date() }));
          contactIds.forEach((contactId) => {
            updates.push({
              contactId,
              assignedTo,
              activity: {
                action: "ASSIGNED_TO_UPDATED",
                user: currentUser._id!,
                details: { userIds, assignType },
                createdAt: new Date(),
              },
            });
          });
        } else if (assignType === "equally") {
          console.log("Debug: Processing 'equally' assignment");
          const contactsPerUser = Math.floor(contactIds.length / userIds.length);
          console.log("Debug: Contacts per user:", contactsPerUser, "Total contacts:", contactIds.length, "Users:", userIds.length);
          let contactIndex = 0;

          // First, assign the base number of contacts to each user
          userIds.forEach((userId) => {
            console.log("Debug: Assigning base contacts to user:", userId);
            for (let i = 0; i < contactsPerUser && contactIndex < contactIds.length; i++) {
              updates.push({
                contactId: contactIds[contactIndex],
                assignedTo: [{ user: userId, time: new Date() }],
                activity: {
                  action: "ASSIGNED_TO_UPDATED",
                  user: currentUser._id!,
                  details: { userIds: [userId], assignType },
                  createdAt: new Date(),
                },
              });
              console.log("Debug: Assigned contact", contactIds[contactIndex], "to user", userId);
              contactIndex++;
            }
          });


          console.log("Debug: Distributing remaining contacts, starting at index:", contactIndex);
          for (let i = contactIndex; i < contactIds.length; i++) {
            const userId = userIds[i % userIds.length];
            updates.push({
              contactId: contactIds[i],
              assignedTo: [{ user: userId, time: new Date() }],
              activity: {
                action: "ASSIGNED_TO_UPDATED",
                user: currentUser._id!,
                details: { userIds: [userId], assignType },
                createdAt: new Date(),
              },
            });
            console.log("Debug: Assigned remaining contact", contactIds[i], "to user", userId);
          }
          console.log("Debug: Final updates for 'equally':", updates);
        } else if (assignType === "roundRobin") {
          console.log("Debug: Processing 'roundRobin' assignment");
          contactIds.forEach((contactId, index) => {
            const userId = userIds[index % userIds.length];
            updates.push({
              contactId,
              assignedTo: [{ user: userId, time: new Date() }],
              activity: {
                action: "ASSIGNED_TO_UPDATED",
                user: currentUser._id!,
                details: { userIds: [userId], assignType },
                createdAt: new Date(),
              },
            });
            console.log("Debug: Assigned contact", contactId, "to user", userId);
          });
          console.log("Debug: Final updates for 'roundRobin':", updates);
        }

        // Perform bulk updates
        const bulkOps = updates.map(({ contactId, assignedTo, activity }) => ({
          updateOne: {
            filter: { _id: contactId },
            update: {
              $set: { assignedTo },
              $push: { activities: activity },
              $inc: { __v: 1 },
            },
          },
        }));

        await Contact.bulkWrite(bulkOps, { session });
      });
    } finally {
      session.endSession();
    }

    return NextResponse.json({ message: "Contacts assigned successfully" }, { status: 200 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Debug: Error assigning contacts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign contacts" },
      { status: error.message.includes("login") ? 401 : 500 }
    );
  }
}