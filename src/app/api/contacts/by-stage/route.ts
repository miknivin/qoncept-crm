/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";
import User from "@/app/models/User";
import { isAuthenticatedUser } from "../../middlewares/auth";

export interface GetContactsByStageRequest {
  pipelineId: string;
  stageId: string;
  source?: string;
  assignedTo?: string;
  keyword?: string; // Added keyword filter
}

export interface GetContactsByStageResponse {
  contacts: Array<{
    _id: string;
    name: string;
    email: string;
    phone: string;
    notes?: string;
    source?: string;
    businessName?:string;
    user?: { name: string; email: string };
    tags: Array<{ user: { name: string; email: string }; name: string }>;
    assignedTo?: Array<{
      user: { name: string; email: string; _id: string };
      time: Date;
    }>;
    pipelinesActive: Array<{
      pipeline_id: string;
      stage_id: string;
      order: number;
    }>;
    value?:number;
    probability?:number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    mongoose.model("User");
    await dbConnect();
    const user = await isAuthenticatedUser(req); // Assuming this returns user object with role
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    User;

    const { searchParams } = new URL(req.url);
    const pipelineId = searchParams.get("pipelineId");
    const stageId = searchParams.get("stageId");
    const source = searchParams.get("source");
    const assignedTo = searchParams.get("assignedTo");
    const keyword = searchParams.get("keyword"); // Added keyword parameter

    if (!pipelineId || !stageId) {
      return NextResponse.json({ error: "pipelineId and stageId are required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(pipelineId) || !mongoose.Types.ObjectId.isValid(stageId)) {
      return NextResponse.json({ error: "Invalid pipelineId or stageId" }, { status: 400 });
    }

    if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
      return NextResponse.json({ error: "Invalid assignedTo user ID" }, { status: 400 });
    }

    const query: any = {
      "pipelinesActive.pipeline_id": pipelineId,
      "pipelinesActive.stage_id": stageId,
    };

    // If user is a team_member, restrict to contacts assigned to them
    if (user.role === "team_member") {
      query["assignedTo.user"] = new mongoose.Types.ObjectId(user._id); // Assuming user._id is the user's ID
    } else if (assignedTo) {
      // For non-team_member roles (e.g., admin), allow filtering by assignedTo if provided
      query["assignedTo.user"] = new mongoose.Types.ObjectId(assignedTo);
    }

    if (source) {
      query.source = source;
    }

    if (keyword) {
      const keywordRegex = new RegExp(keyword, "i"); // Case-insensitive search
      query.$or = [
        { name: keywordRegex },
        { email: keywordRegex },
        { notes: keywordRegex },
      ];
    }

    const contacts = await Contact.find(query)
      .select("name email phone notes user source tags businessName probability pipelinesActive createdAt updatedAt")
      .populate("user", "name email")
      .populate("tags.user", "name email")
      .populate("assignedTo.user", "name email")
      .lean();

    const formattedContacts = contacts
      .map((contact) => ({
        ...contact,
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