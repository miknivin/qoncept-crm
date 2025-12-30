/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";
import ContactResponse from "@/app/models/ContactResponse"; // ← Make sure this is imported
import User from "@/app/models/User";
import { isAuthenticatedUser } from "../../middlewares/auth";
import Pipeline from "@/app/models/Pipeline";
import Stage from "@/app/models/Stage";

export interface GetContactsByStageRequest {
  pipelineId: string;
  stageId: string;
  source?: string;
  assignedTo?: Array<{ _id: string; isNot: boolean }>;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  activities?: Array<{ value: string; isNot: boolean }>; // ← Added
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
    User;
    Pipeline;
    Stage;
    await dbConnect();

    const user = await isAuthenticatedUser(req);

    const { searchParams } = new URL(req.url);
    const pipelineId = searchParams.get("pipelineId");
    const stageId = searchParams.get("stageId");
    const source = searchParams.get("source");
    const assignedToParam = searchParams.get("assignedTo");
    const keyword = searchParams.get("keyword");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const activitiesParam = searchParams.get("activities"); // ← NEW

    if (!pipelineId || !stageId) {
      return NextResponse.json({ error: "pipelineId and stageId are required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(pipelineId) || !mongoose.Types.ObjectId.isValid(stageId)) {
      return NextResponse.json({ error: "Invalid pipelineId or stageId" }, { status: 400 });
    }

    // Parse and validate assignedTo
    let assignedTo: Array<{ _id: string; isNot: boolean }> = [];
    if (assignedToParam) {
      try {
        assignedTo = JSON.parse(assignedToParam);
        if (!Array.isArray(assignedTo)) {
          return NextResponse.json({ error: "assignedTo must be an array" }, { status: 400 });
        }
        for (const item of assignedTo) {
          if (!item._id || !mongoose.Types.ObjectId.isValid(item._id)) {
            return NextResponse.json({ error: `Invalid user ID in assignedTo: ${item._id}` }, { status: 400 });
          }
          if (typeof item.isNot !== "boolean") {
            return NextResponse.json({ error: `Invalid isNot value for user ID: ${item._id}` }, { status: 400 });
          }
        }
      } catch (error) {
        console.log(error);
        
        return NextResponse.json({ error: "Invalid assignedTo format" }, { status: 400 });
      }
    }

    // Parse and validate activities
    let activities: Array<{ value: string; isNot: boolean }> = [];
    if (activitiesParam) {
      try {
        activities = JSON.parse(activitiesParam);
        if (!Array.isArray(activities)) {
          return NextResponse.json({ error: "activities must be an array" }, { status: 400 });
        }
      } catch (error) {
        console.log(error);
        
        return NextResponse.json({ error: "Invalid activities format" }, { status: 400 });
      }
    }

    // Validate dates
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

    // Team member restriction
    if (user.role === "team_member") {
      query["assignedTo.user"] = new mongoose.Types.ObjectId(user._id);
    } else if (assignedTo.length > 0) {
      const includeIds = assignedTo
        .filter((item) => !item.isNot)
        .map((item) => new mongoose.Types.ObjectId(item._id));
      const excludeIds = assignedTo
        .filter((item) => item.isNot)
        .map((item) => new mongoose.Types.ObjectId(item._id));

      if (includeIds.length > 0 || excludeIds.length > 0) {
        query["assignedTo.user"] = {};
        if (includeIds.length > 0) query["assignedTo.user"].$in = includeIds;
        if (excludeIds.length > 0) query["assignedTo.user"].$nin = excludeIds;
      }
    }

    if (source) query.source = source;

    if (keyword) {
      const keywordRegex = new RegExp(keyword, "i");
      query.$or = [
        { name: keywordRegex },
        { email: keywordRegex },
        { notes: keywordRegex },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // === ACTIVITIES FILTERING ===
    if (activities.length > 0) {
      const validActivities = [
        "HAD_CONVERSATION",
        "CALLED_NOT_PICKED",
        "CALLED_INVALID",
        "CALLED_SWITCHED_OFF",
        "WHATSAPP_COMMUNICATED",
        "ONLINE_MEETING_SCHEDULED",
        "OFFLINE_MEETING_SCHEDULED",
        "ONLINE_MEETING_CONFIRMED",
        "OFFLINE_MEETING_CONFIRMED",
        "PROPOSAL_SHARED",
        "PAYMENT_DONE_ADVANCE",
        "PAYMENT_DONE_PENDING",
        "FULL_PAYMENT_DONE",
        "PAYMENT_DONE_MONTHLY",
        "OTHER",
        "NO_ACTIVITY_RECORDED",
      ];

      const invalid = activities.filter((a) => !validActivities.includes(a.value));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Invalid activity values: ${invalid.map((a) => a.value).join(", ")}` },
          { status: 400 }
        );
      }

      const noActivityFilters = activities.filter((a) => a.value === "NO_ACTIVITY_RECORDED");
      const regularFilters = activities.filter((a) => a.value !== "NO_ACTIVITY_RECORDED");

      // Handle "No activity recorded"
      if (noActivityFilters.length > 0) {
        const wantsNo = noActivityFilters.some((a) => !a.isNot);
        const wantsHas = noActivityFilters.some((a) => a.isNot);

        if (wantsNo && wantsHas) {
          return NextResponse.json(
            { error: "Cannot combine 'No activity recorded' with 'Not No activity recorded'" },
            { status: 400 }
          );
        }

        if (wantsNo) {
          query.contactResponses = { $size: 0 };
        } else if (wantsHas) {
          query.contactResponses = { $exists: true, $ne: [], $not: { $size: 0 } };
        }
      }

      // Handle regular activities
      if (regularFilters.length > 0) {
        const include = regularFilters.filter((a) => !a.isNot).map((a) => a.value);
        const exclude = regularFilters.filter((a) => a.isNot).map((a) => a.value);

        let includeContactIds: mongoose.Types.ObjectId[] = [];
        let excludeContactIds: mongoose.Types.ObjectId[] = [];

        if (include.length > 0) {
          const responses = await ContactResponse.find({ activity: { $in: include } })
            .select("contact")
            .lean();
          includeContactIds = responses.map((r) => r.contact as mongoose.Types.ObjectId);

          if (includeContactIds.length === 0) {
            return NextResponse.json({ contacts: [] }, { status: 200 });
          }

          if (query._id?.$in) {
            query._id.$in = query._id.$in.filter((id: any) => includeContactIds.includes(id));
          } else {
            query._id = { $in: includeContactIds };
          }
        }

        if (exclude.length > 0) {
          const responses = await ContactResponse.find({ activity: { $in: exclude } })
            .select("contact")
            .lean();
          excludeContactIds = responses.map((r) => r.contact as mongoose.Types.ObjectId);

          if (excludeContactIds.length > 0) {
            if (query._id?.$in) {
              query._id.$in = query._id.$in.filter((id: any) => !excludeContactIds.includes(id));
              if (query._id.$in.length === 0) {
                return NextResponse.json({ contacts: [] }, { status: 200 });
              }
            } else {
              query._id = { $nin: excludeContactIds };
            }
          }
        }
      }
    }

    // Execute final query
    const contacts = await Contact.find(query)
      .select("name email phone notes user source tags businessName probability pipelinesActive createdAt updatedAt")
      .populate("user", "name email")
      .populate("tags.user", "name email")
      .populate("assignedTo.user", "name email _id")
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
        const orderA =
          a.pipelinesActive.find(
            (pa) => pa.pipeline_id === pipelineId && pa.stage_id === stageId
          )?.order ?? Infinity;
        const orderB =
          b.pipelinesActive.find(
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