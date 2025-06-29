import dbConnect from "@/app/lib/db/connection";
import { NextRequest, NextResponse } from "next/server";
import Contact, { IContact } from "@/app/models/Contact";
import mongoose, { FilterQuery } from "mongoose";
import { authorizeRoles, isAuthenticatedUser } from "../../middlewares/auth";

interface FilterBody {
  assignedTo?: string;
  pipelineNames?: string[];
  tags?: string[];
  source?: string; // Added source filter
  createdAt?: {
    startDate?: string; // ISO date string for start of range
    endDate?: string;   // ISO date string for end of range
  }; // Added createdAt filter
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
      // For team_member, ensure assignedTo.user matches user._id
      if (filter.assignedTo && filter.assignedTo !== user!._id?.toString()) {
        return NextResponse.json(
          { error: "Team members can only view their own assigned contacts" },
          { status: 403 }
        );
      }
      searchQuery["assignedTo.user"] = user._id;
    } else if (filter.assignedTo) {
      // For admin, allow assignedTo filter if valid
      if (mongoose.Types.ObjectId.isValid(filter.assignedTo)) {
        searchQuery["assignedTo.user"] = new mongoose.Types.ObjectId(filter.assignedTo);
      } else {
        return NextResponse.json(
          { error: "Invalid assignedTo ID" },
          { status: 400 }
        );
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

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Fetch contacts with pagination and total count in parallel
    const [contacts, total] = await Promise.all([
      Contact.find(searchQuery)
        .select("-activities -uid")
        .populate("assignedTo.user", "name email")
        .skip(skip)
        .limit(limit)
        .sort({createdAt:-1})
        .lean() as Promise<ResponseContact[]>,
      Contact.countDocuments(searchQuery),
    ]);

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