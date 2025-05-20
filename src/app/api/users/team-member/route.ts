import { NextRequest, NextResponse } from "next/server";
import { authorizeRoles, isAuthenticatedUser } from "../../middlewares/auth";
import User, { IUser } from "@/app/models/User";
import dbConnect from "@/app/lib/db/connection";
import { validateUserInput } from "../../middlewares/validateTeamMember";
type ResponseUser = Pick<IUser, '_id' | 'name' | 'email' | 'role' | 'signupMethod' | 'avatar' | 'uid'>;

interface CreateUserRequest {
  name?: string;
  email: string;
  password?: string;
  signupMethod?: 'OTP' | 'Email/Password' | 'OAuth';
  avatar?: {
    public_id: string;
    url: string;
  };
}

interface TeamMembersResponse {
  success: boolean;
  users: Pick<IUser, '_id' | 'name' | 'email' | 'role' | 'signupMethod' | 'avatar' | 'uid' | 'createdAt'>[];
  page: number;
  totalPages: number;
  total: number;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const reqUser = await isAuthenticatedUser(req);
    if (!reqUser) {
      return NextResponse.json(
        { success: false, message: 'Need to login' },
        { status: 400 }
      );
    }

    // Authorize admin role
    try {
      authorizeRoles(reqUser, 'admin');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    } catch (error:any) {
      return NextResponse.json(
        { error: 'Only admins can create team members' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Parse request body
    let body: CreateUserRequest;
    try {
      body = await req.json();
    } catch (error) {
        console.log(error);
        
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate input
    validateUserInput(body);

    const { name, email, password, signupMethod = 'Email/Password', avatar } = body;

    // Create new user
    const newUser: Partial<IUser> = {
      name,
      email,
      password: signupMethod === 'Email/Password' ? password : undefined,
      signupMethod,
      role: 'team_member',
      avatar,
    };

    const user = new User(newUser);
    await user.save();
    
    const responseUser: ResponseUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      signupMethod: user.signupMethod,
      avatar: user.avatar,
      uid: user.uid,
    };

    return NextResponse.json(
      {
        success: true,
        user: responseUser,
      },
      { status: 201 }
    );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error creating team member:', error);

    // Handle duplicate email
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return NextResponse.json(
        { error: `Email ${error.keyValue?.email || 'unknown'} already exists` },
        { status: 409 }
      );
    }

    // Handle validation errors (from schema or validateUserInput)
    if (error.name === 'ValidationError' || error.message.includes('is required') || error.message.includes('Invalid signup method') || error.message.includes('Avatar must include')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const user = await isAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Need to login' },
        { status: 400 }
      );
    }

    // Authorize admin role
    try {
      authorizeRoles(user, 'admin');
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        { error: 'Only admins can view team members' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';

    // Validate query parameters
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: 'Page and limit must be positive numbers' },
        { status: 400 }
      );
    }

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { role: 'team_member' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Fetch team members
    const skip = (page - 1) * limit;
    const usersRaw = await User.find(query)
      .select('_id name email role signupMethod avatar uid createdAt')
      .skip(skip)
      .limit(limit)
      .lean();

    // Map users to expected type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users: Pick<IUser, '_id' | 'name' | 'email' | 'role' | 'signupMethod' | 'avatar' | 'uid' | 'createdAt'>[] = usersRaw.map((user: any) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      signupMethod: user.signupMethod,
      avatar: user.avatar,
      uid: user.uid,
      createdAt: user.createdAt,
    }));

    // Count total documents
    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Prepare response
    const response: TeamMembersResponse = {
      success: true,
      users,
      page,
      totalPages,
      total,
    };

    return NextResponse.json(response, { status: 200 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}