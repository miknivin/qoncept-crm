import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/app/lib/db/connection';
import { authorizeRoles, isAuthenticatedUser } from '../../middlewares/auth';
import LeaveRequest from '@/app/models/Leave';
import { validateLeaveRequest } from '../../middlewares/validateLeaveCreate';


interface UpdateLeaveRequestBody {
  leaveType?: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'other';
  startDate?: string;
  endDate?: string;
  reason?: string;
  status?: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approverId?: string;
  rejectedReason?:string;
  durationType?: 'full-day' | 'half-day' | 'quarter-day';
}

// Interface for MongoDB update data (aligned with LeaveRequest schema, for PUT)
interface UpdateLeaveMongoData {
  leaveType?: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'other';
  startDate?: Date;
  endDate?: Date;
  reason?: string;
  rejectedReason?:string;
  status?: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approverId?: Types.ObjectId;
  durationType?: 'full-day' | 'half-day' | 'quarter-day';
  updatedAt: Date;
}

// GET /api/leaves/[id] - Get a leave request by ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    const { id } = params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid leave ID' }, { status: 400 });
    }

    const leaveRequest = await LeaveRequest.findById(id)
      .populate('employeeId', 'name email')
      .populate('approverId', 'name email');

    if (!leaveRequest) {
      return NextResponse.json({ message: 'Leave request not found' }, { status: 404 });
    }

    if (
      !user ||
      (user.role !== 'admin' &&
        (!leaveRequest.employeeId || !user?._id || leaveRequest.employeeId.toString() !== user._id.toString()))
    ) {
      return NextResponse.json({ message: 'Unauthorized to view this leave request' }, { status: 403 });
    }

    return NextResponse.json({
      message: 'Leave request retrieved successfully',
      data: {
        ...leaveRequest.toObject(),
        id: leaveRequest._id.toString(),
      },
    }, { status: 200 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error retrieving leave request:', error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: error.status || 500 });
  }
}

// PUT /api/leaves/[id] - Update a leave request
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    const { id } = params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid leave ID' }, { status: 400 });
    }

    const leaveRequest = await LeaveRequest.findById(id);
    if (!leaveRequest) {
      return NextResponse.json({ message: 'Leave request not found' }, { status: 404 });
    }

    if (
      !user ||
      (user.role !== 'admin' &&
        (!leaveRequest.employeeId || !user?._id || leaveRequest.employeeId.toString() !== user._id.toString()))
    ) {
      return NextResponse.json({ message: 'Unauthorized to update this leave request' }, { status: 403 });
    }

    if (user.role === 'admin') {
      authorizeRoles(user, 'admin');
    } else {
      authorizeRoles(user, 'user', 'employee', 'team_member');
    }

    const body = await req.json() as UpdateLeaveRequestBody;
    const { leaveType, startDate, endDate, reason, status, comments, approverId, durationType, rejectedReason } = body;

    if (leaveType || startDate || endDate || reason || durationType) {
      await validateLeaveRequest({
        leaveType: leaveType || leaveRequest.leaveType,
        startDate: startDate || leaveRequest.startDate.toISOString(),
        endDate: endDate || leaveRequest.endDate.toISOString(),
        reason: reason || leaveRequest.reason,
        durationType: durationType || leaveRequest.durationType,
      });
    }

    const updateData: Partial<UpdateLeaveMongoData> = {
      ...(leaveType && { leaveType }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(reason && { reason }),
      ...(status && { status }),
      ...(comments && { comments }),
      ...(approverId && { approverId: new Types.ObjectId(approverId) }),
      ...(durationType && { durationType }),
      ...(rejectedReason && { rejectedReason }),
      updatedAt: new Date(),
    };

    if (status || approverId) {
      if (user.role !== 'admin') {
        return NextResponse.json({ message: 'Only admins can update status or approver' }, { status: 403 });
      }
    }

    const updatedLeave = await LeaveRequest.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('employeeId', 'name email')
      .populate('approverId', 'name email');

    if (!updatedLeave) {
      return NextResponse.json({ message: 'Failed to update leave request' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Leave request updated successfully',
      data: {
        ...updatedLeave.toObject(),
        id: updatedLeave._id.toString(),
      },
    }, { status: 200 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error updating leave request:', error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: error.status || 500 });
  }
}