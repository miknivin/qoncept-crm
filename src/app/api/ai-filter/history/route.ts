import { NextRequest, NextResponse } from "next/server";
import { isAuthenticatedUser } from "../../middlewares/auth";
import dbConnect from "@/app/lib/db/connection";
import AiQueryHistory from "@/app/models/AiQueryHistory";

export async function GET(request: NextRequest) {
  try {
    const user = await isAuthenticatedUser(request);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 50);

    const history = await AiQueryHistory.find({ user: user._id })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    const items = history.map((item) => ({
      id: String(item._id),
      queryText: item.queryTextDisplay || item.queryText,
      querySpec: item.querySpec,
      response: item.response,
      uiType: item.uiType,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json({ success: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
