import dbConnect from "@/app/lib/db/connection";
import { NextRequest, NextResponse } from "next/server";
import Contact, { IContact } from "@/app/models/Contact";
import mongoose, { FilterQuery } from "mongoose";

// Define interface for filter body
interface FilterBody {
  assignedTo?: string;
  pipelineNames?: string[];
  tags?: string[];
}

// Define response contact type (omitting activities and uid)
type ResponseContact = Omit<IContact, "activities" | "uid">;

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const keyword = searchParams.get("keyword") || "";

    // Extract filter from body
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

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Invalid page or limit" },
        { status: 400 }
      );
    }

    // Build search query
    const searchQuery: FilterQuery<IContact> = {};

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

    // Filter by assignedTo (user ID)
    if (filter.assignedTo) {
      if (mongoose.Types.ObjectId.isValid(filter.assignedTo)) {
        searchQuery["assignedTo.user"] = new mongoose.Types.ObjectId(filter.assignedTo);
      } else {
        return NextResponse.json(
          { error: "Invalid assignedTo ID" },
          { status: 400 }
        );
      }
    }

    // Filter by pipelineNames
    if (filter.pipelineNames?.length) {
      searchQuery["pipelinesActive.pipelineName"] = { $in: filter.pipelineNames };
    }

    // Filter by tags
    if (filter.tags?.length) {
      searchQuery["tags.name"] = { $in: filter.tags };
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Fetch contacts with pagination and search
    const [contacts, total] = await Promise.all([
      Contact.find(searchQuery)
        .select("-activities -uid")
        .skip(skip)
        .limit(limit)
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