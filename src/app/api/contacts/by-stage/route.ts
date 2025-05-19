import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import User from "@/app/models/User"; // Import the User model

export interface GetContactsByStageRequest {
  pipelineId: string;
  stageId: string;
}

export interface GetContactsByStageResponse {
  contacts: Array<{
    _id: string;
    name: string;
    email: string;
    phone: string;
    notes?: string;
    user?: { name: string; email: string };
    tags: Array<{ user: { name: string; email: string }; name: string }>;
    pipelinesActive: Array<{
      pipeline_id: string;
      stage_id: string;
      order: number;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export async function GET(req: Request) {
  try {
    await dbConnect();
   // mongoose.model("User");

    const { searchParams } = new URL(req.url);
    const pipelineId = searchParams.get("pipelineId");
    const stageId = searchParams.get("stageId");

    if (!pipelineId || !stageId) {
      return NextResponse.json({ error: "pipelineId and stageId are required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(pipelineId) || !mongoose.Types.ObjectId.isValid(stageId)) {
      return NextResponse.json({ error: "Invalid pipelineId or stageId" }, { status: 400 });
    }

    const contacts = await Contact.find({
      "pipelinesActive.pipeline_id": pipelineId,
      "pipelinesActive.stage_id": stageId,
    })
      .select("name email phone notes user tags pipelinesActive createdAt updatedAt")
      .populate("user", "name email")
      .populate("tags.user", "name email")
      .lean();

    // Transform and sort contacts
    const formattedContacts = contacts
      .map((contact) => ({
        ...contact,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pipelinesActive: contact.pipelinesActive.map((pa: any) => ({
          pipeline_id: pa.pipeline_id.toString(),
          stage_id: pa.stage_id.toString(),
          order: pa.order,
        })),
      }))
      .sort((a, b) => {
        const orderA = a.pipelinesActive.find(
          (pa) => pa.pipeline_id === pipelineId && pa.stage_id === stageId
        )?.order ?? Infinity;
        const orderB = b.pipelinesActive.find(
          (pa) => pa.pipeline_id === pipelineId && pa.stage_id === stageId
        )?.order ?? Infinity;
        return orderA - orderB;
      });

    return NextResponse.json({ contacts: formattedContacts }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching contacts by stage:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}