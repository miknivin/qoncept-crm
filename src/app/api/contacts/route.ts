import dbConnect from "@/app/lib/db/connection";
import { NextRequest, NextResponse } from "next/server";
import { ExtendedNextRequest, validateContactRequest } from "../middlewares/validateContactCreate";
import Contact from "@/app/models/Contact";
import Pipeline from "@/app/models/Pipeline"; // Import Pipeline model for validation
import Stage from "@/app/models/Stage"; // Import Stage model for validation
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  const validationResponse = await validateContactRequest(req as ExtendedNextRequest);
  if (validationResponse) {
    return validationResponse;
  }

  try {
    await dbConnect();

    const { name, email, phone, notes, userId, tags = [] } = (req as ExtendedNextRequest).validatedBody!;

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

    // Define pipeline and stage IDs
    const pipelineId = new mongoose.Types.ObjectId("682da76cb5aab2e983c88634");
    const stageId = new mongoose.Types.ObjectId("682da76db5aab2e983c88636");

    // Validate pipeline existence
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 }
      );
    }

    // Validate stage existence and ensure it belongs to the pipeline
    const stage = await Stage.findOne({ _id: stageId, pipeline_id: pipelineId });
    if (!stage) {
      return NextResponse.json(
        { error: "Stage not found or does not belong to the specified pipeline" },
        { status: 404 }
      );
    }

    // Add contact to the pipeline's pipelinesActive array
    const pipelineActiveEntry = {
      pipeline_id: pipelineId,
      stage_id: stageId,
      order: 0, // Default order; adjust as needed
    };

    contact.pipelinesActive.push(pipelineActiveEntry);
    await contact.save();

    // Log the PIPELINE_ADDED activity
    await contact.logActivity("PIPELINE_ADDED", new mongoose.Types.ObjectId(userId), {
      pipelineId: pipelineId.toString(),
      stageId: stageId.toString(),
    });

    // Log TAG_ADDED activities for each tag
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        await contact.logActivity("TAG_ADDED", new mongoose.Types.ObjectId(userId), {
          tagName,
        });
      }
    }

    return NextResponse.json(
      {
        message: "Contact created/updated successfully and added to pipeline",
        contact,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating contact or adding to pipeline:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}