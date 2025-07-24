import dbConnect from "@/app/lib/db/connection";
import { NextRequest, NextResponse } from "next/server";
import Contact, { IContact } from "@/app/models/Contact";
import mongoose, { FilterQuery } from "mongoose";
import { authorizeRoles, isAuthenticatedUser } from "../../middlewares/auth";
import ContactResponse from "@/app/models/ContactResponse";

interface FilterBody {
  assignedTo?: { userId: string; isNot: boolean }[];
  pipelineNames?: string[];
  tags?: string[];
  activities?: { value: string; isNot: boolean }[];
  source?: string;
  createdAt?: {
    startDate?: string;
    endDate?: string;
  };
  updatedAt?: {
    startDate?: string;
    endDate?: string;
  };
  stage?: string;
}

type ResponseContact = Omit<IContact, "activities" | "uid">;

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const user = await isAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Need to login" },
        { status: 400 }
      );
    }

    // Authorize roles
    let isAdmin = false;
    try {
      authorizeRoles(user, "admin");
      isAdmin = true;
    } catch (error) {
      console.log("Admin authorization failed:", error);
      try {
        authorizeRoles(user, "team_member");
      } catch (error) {
        console.log("Team member authorization failed:", error);
        return NextResponse.json(
          { error: "User is neither admin nor team member" },
          { status: 401 }
        );
      }
    }

    await dbConnect();

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const keyword = searchParams.get("keyword") || "";

    // Parse filter body
    let filter: FilterBody;
    try {
      filter = await req.json();
    } catch (error) {
      console.error("Error parsing filter:", error);
      return NextResponse.json(
        { error: "Invalid filter format" },
        { status: 400 }
      );
    }

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Invalid page or limit" },
        { status: 400 }
      );
    }

    // Build search query
    const searchQuery: FilterQuery<IContact> = {};

    // Restrict team_member to their own contacts
    if (!isAdmin) {
      searchQuery["assignedTo.user"] = user._id;
      // Team members cannot use assignedTo filter
      if (filter.assignedTo && filter.assignedTo.length > 0) {
        return NextResponse.json(
          { error: "Team members can only view their own assigned contacts" },
          { status: 403 }
        );
      }
    } else if (filter.assignedTo && filter.assignedTo.length > 0) {
      // For admin, process assignedTo as an array with isNot logic
      const includeUsers = filter.assignedTo
        .filter((a) => !a.isNot && mongoose.Types.ObjectId.isValid(a.userId))
        .map((a) => new mongoose.Types.ObjectId(a.userId));
      const excludeUsers = filter.assignedTo
        .filter((a) => a.isNot && mongoose.Types.ObjectId.isValid(a.userId))
        .map((a) => new mongoose.Types.ObjectId(a.userId));

      if (includeUsers.length > 0 || excludeUsers.length > 0) {
        searchQuery["assignedTo.user"] = {};
        if (includeUsers.length > 0) {
          searchQuery["assignedTo.user"].$in = includeUsers;
        }
        if (excludeUsers.length > 0) {
          searchQuery["assignedTo.user"].$nin = excludeUsers;
        }
      }
    }

    // Search by keyword using $or with $regex for name, email, phone, notes
    if (keyword) {
      const regex = { $regex: keyword, $options: "i" }; // Case-insensitive search
      searchQuery.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { notes: regex },
      ];
    }

    // Filter by pipelineNames
    if (filter.pipelineNames?.length) {
      searchQuery["pipelinesActive.pipelineName"] = { $in: filter.pipelineNames };
    }

    // Filter by tags
    if (filter.tags?.length) {
      searchQuery["tags.name"] = { $in: filter.tags };
    }

    // Filter by source
    if (filter.source) {
      searchQuery.source = filter.source;
    }

    // Filter by activities
    if (filter.activities && filter.activities.length > 0) {
      const validActivities = [
        'HAD_CONVERSATION',
        'CALLED_NOT_PICKED',
        'CALLED_INVALID',
        'CALLED_SWITCHED_OFF',
        'WHATSAPP_COMMUNICATED',
        'ONLINE_MEETING_SCHEDULED',
        'OFFLINE_MEETING_SCHEDULED',
        'ONLINE_MEETING_CONFIRMED',
        'OFFLINE_MEETING_CONFIRMED',
        'PROPOSAL_SHARED',
        'PAYMENT_DONE_ADVANCE',
        'PAYMENT_DONE_PENDING',
        'FULL_PAYMENT_DONE',
        'PAYMENT_DONE_MONTHLY',
        'OTHER',
      ];

      // Validate activity values
      const invalidActivities = filter.activities.filter(
        (a) => !validActivities.includes(a.value)
      );
      if (invalidActivities.length > 0) {
        return NextResponse.json(
          { error: `Invalid activity values: ${invalidActivities.map(a => a.value).join(", ")}` },
          { status: 400 }
        );
      }

      // Separate include and exclude activities
      const includeActivities = filter.activities
        .filter((a) => !a.isNot)
        .map((a) => a.value);
      const excludeActivities = filter.activities
        .filter((a) => a.isNot)
        .map((a) => a.value);

      // Initialize contactIds arrays
      let includeContactIds: mongoose.Types.ObjectId[] = [];
      let excludeContactIds: mongoose.Types.ObjectId[] = [];

      // Fetch contacts for include activities
      if (includeActivities.length > 0) {
        const contactResponses = await ContactResponse.find({ activity: { $in: includeActivities } })
          .select("contact")
          .lean();
        includeContactIds = contactResponses.map((response) => response.contact);
        if (includeContactIds.length === 0) {
          // If no contacts match include activities, return empty results
          searchQuery._id = { $in: [] };
        } else {
          searchQuery._id = { $in: includeContactIds };
        }
      }

      // Fetch contacts for exclude activities
      if (excludeActivities.length > 0) {
        const contactResponses = await ContactResponse.find({ activity: { $in: excludeActivities } })
          .select("contact")
          .lean();
        excludeContactIds = contactResponses.map((response) => response.contact);
        if (excludeContactIds.length > 0) {
          if (searchQuery._id) {
            // Combine with existing _id filter
            searchQuery._id = { $in: (searchQuery._id.$in || []).filter((id: mongoose.Types.ObjectId) => !excludeContactIds.includes(id)) };
          } else {
            searchQuery._id = { $nin: excludeContactIds };
          }
        }
      }
    }

    // Filter by createdAt date range
    if (filter.createdAt) {
      searchQuery.createdAt = {};
      if (filter.createdAt.startDate) {
        try {
          // Set start of the day
          const startDate = new Date(filter.createdAt.startDate);
          startDate.setHours(0, 0, 0, 0); // Ensure start of day
          searchQuery.createdAt.$gte = startDate;
        } catch (error) {
          console.log(error);
          return NextResponse.json(
            { error: "Invalid startDate format" },
            { status: 400 }
          );
        }
      }

      if (filter.createdAt.endDate) {
        try {
          // Set end of the day
          const endDate = new Date(filter.createdAt.endDate);
          endDate.setHours(23, 59, 59, 999); // Ensure end of day
          searchQuery.createdAt.$lte = endDate;
        } catch (error) {
          console.log(error);
          return NextResponse.json(
            { error: "Invalid endDate format" },
            { status: 400 }
          );
        }
      }
      // Remove createdAt filter if no valid dates provided
      if (Object.keys(searchQuery.createdAt).length === 0) {
        delete searchQuery.createdAt;
      }
    }

    if (filter.updatedAt) {
      searchQuery.updatedAt = {};
      if (filter.updatedAt.startDate) {
        try {
          // Set start of the day
          const startDate = new Date(filter.updatedAt.startDate);
          startDate.setHours(0, 0, 0, 0); // Ensure start of day
          searchQuery.updatedAt.$gte = startDate;
        } catch (error) {
          console.log(error);
          return NextResponse.json(
            { error: "Invalid updatedAt startDate format" },
            { status: 400 }
          );
        }
      }

      if (filter.updatedAt.endDate) {
        try {
          // Set end of the day
          const endDate = new Date(filter.updatedAt.endDate);
          endDate.setHours(23, 59, 59, 999); // Ensure end of day
          searchQuery.updatedAt.$lte = endDate;
        } catch (error) {
          console.log(error);
          return NextResponse.json(
            { error: "Invalid updatedAt endDate format" },
            { status: 400 }
          );
        }
      }
      // Remove updatedAt filter if no valid dates provided
      if (Object.keys(searchQuery.updatedAt).length === 0) {
        delete searchQuery.updatedAt;
      }
    }

    // Filter by stage
    if (filter.stage) {
      if (mongoose.Types.ObjectId.isValid(filter.stage)) {
        searchQuery["pipelinesActive.stage_id"] = new mongoose.Types.ObjectId(filter.stage);
      } else {
        return NextResponse.json(
          { error: "Invalid stage ID" },
          { status: 400 }
        );
      }
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Fetch contacts with pagination and total count in parallel
    const [contacts, total] = await Promise.all([
      Contact.find(searchQuery)
        .select("-activities -uid")
        .populate("assignedTo.user", "name email")
        .populate({
          path: "contactResponses",
          options: { sort: { createdAt: -1 }, limit: 1 },
          select: "activity note meetingScheduledDate",
        })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean() as Promise<ResponseContact[]>,
      Contact.countDocuments(searchQuery),
    ]);
    console.log(contacts);

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        message: "Contacts retrieved successfully",
        contacts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}