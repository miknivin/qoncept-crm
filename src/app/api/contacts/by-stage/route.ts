/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";
import User from "@/app/models/User";
import { isAuthenticatedUser } from "../../middlewares/auth";
import Pipeline from "@/app/models/Pipeline";
import Stage from "@/app/models/Stage";

export interface GetContactsByStageRequest {
  pipelineId: string;
  stageId: string;
  source?: string;
  assignedTo?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetContactsByStageResponse {
  contacts: Array<{
    _id: string;
    name: string;
    email: string;
    phone: string;
    notes?: string;
    source?: string;
    businessName?: string;
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
    value?: number;
    probability?: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    mongoose.model("User");
    await dbConnect();
    const user = await isAuthenticatedUser(req); // Assuming this returns user object with role
    User;
    Pipeline;
    Stage;
    const { searchParams } = new URL(req.url);
    const pipelineId = searchParams.get("pipelineId");
    const stageId = searchParams.get("stageId");
    const source = searchParams.get("source");
    const assignedTo = searchParams.get("assignedTo");
    const keyword = searchParams.get("keyword");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!pipelineId || !stageId) {
      return NextResponse.json({ error: "pipelineId and stageId are required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(pipelineId) || !mongoose.Types.ObjectId.isValid(stageId)) {
      return NextResponse.json({ error: "Invalid pipelineId or stageId" }, { status: 400 });
    }

    if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
      return NextResponse.json({ error: "Invalid assignedTo user ID" }, { status: 400 });
    }

    // Validate date parameters
    if (startDate && isNaN(Date.parse(startDate))) {
      return NextResponse.json({ error: "Invalid startDate format" }, { status: 400 });
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      return NextResponse.json({ error: "Invalid endDate format" }, { status: 400 });
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

    // Add date range filter for createdAt
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Set to start of the day (00:00:00.000)
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set to end of the day (23:59:59.999)
        query.createdAt.$lte = end;
      }
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