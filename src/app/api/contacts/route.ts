import dbConnect from "@/app/lib/db/connection";
import { NextRequest, NextResponse } from "next/server";
import { ExtendedNextRequest, validateContactRequest } from "../middlewares/validateContactCreate";
import Contact from "@/app/models/Contact";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  const validationResponse = await validateContactRequest(req as ExtendedNextRequest);
  if (validationResponse) {
    return validationResponse;
  }

  try {
    await dbConnect();

    const { name, email, phone, notes, userId, tags=[] } = (req as ExtendedNextRequest).validatedBody!;

    const tagSubdocuments = tags
      ? tags.map((tagName: string) => ({
          user: new mongoose.Types.ObjectId(userId),
          name: tagName,
        }))
      : [];

    // Prepare contact data
    const contactData = {
      name,
      email,
      phone,
      notes,
      user: new mongoose.Types.ObjectId(userId),
      tags: tagSubdocuments,
    };

    const contact = await Contact.upsertContact(
      {
        ...contactData,
        tags: new mongoose.Types.DocumentArray(tagSubdocuments),
      },
      new mongoose.Types.ObjectId(userId)
    );

    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        await contact.logActivity("TAG_ADDED", new mongoose.Types.ObjectId(userId), {
          tagName,
        });
      }
    }

    return NextResponse.json(
      {
        message: "Contact created/updated successfully",
        contact,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating contact:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}