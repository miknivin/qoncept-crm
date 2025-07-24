/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import { NextResponse } from "next/server";
import User from "@/app/models/User";

import dbConnect from "@/app/lib/db/connection";
import sendToken from "@/app/api/utils/sendToken";
import { createHash } from "crypto"; // Explicit import for type safety

// Define interface for request body
interface ResetPasswordRequest {
  password: string;
  confirmPassword: string;
}

export async function PUT(req: Request, { params }: { params: { token: string } }) {
  try {
    await dbConnect();
    const { token } = params;

    let body: ResetPasswordRequest;
    try {
      body = await req.json();
    } catch (error:any) {
        console.log(error);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { password, confirmPassword } = body;

    if (!password || !confirmPassword) {
      return NextResponse.json(
        { error: "Password and confirmPassword are required" },
        { status: 400 }
      );
    }

    const resetPasswordToken = createHash("sha256")
      .update(token)
      .digest("hex");

    console.log("Hashed Token:", resetPasswordToken); // Debugging

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    }) ;

    if (!user) {
      return NextResponse.json(
        { error: "Password reset token is invalid or has expired" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Password does not match" },
        { status: 400 }
      );
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return sendToken(user, 200);
  } catch (error: unknown) {
    console.error("Error in reset password:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { error: errorMessage, details: errorStack },
      { status: 500 }
    );
  }
}