/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { authorizeRoles, isAuthenticatedUser } from '../middlewares/auth';
import Contact from '@/app/models/Contact';
import LeaveRequest from '@/app/models/Leave'; // ← Note: your import was 'Leave' but model is LeaveRequest
import dbConnect from '@/app/lib/db/connection';
import { startOfMonth, endOfMonth } from 'date-fns';

interface MonthlyConversionRate {
  year: number;
  month: string;
  totalContacts: number;
  closedContacts: number;
  conversionRate: string;
}

interface DashboardResponse {
  success: boolean;
  totalContacts: number;
  totalClosedContacts: number;
  monthlyConversionRates: MonthlyConversionRate[];
  totalLeaves: number;
  currentMonthLeaves: number;
}

export async function GET(req: NextRequest) {
  try {
    const user = await isAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Need to login' }, { status: 401 });
    }

    try {
      authorizeRoles(user, 'admin', 'team_member');
    } catch {
      return NextResponse.json(
        { error: 'Only admins or team members can view dashboard data' },
        { status: 403 }
      );
    }

    await dbConnect();

const defaultStages = [
        '682da76db5aab2e983c8863d',
      '682da76db5aab2e983c8863e',
      '682da76db5aab2e983c8863f',
]

const closedStageIds: string[] = process.env.SUCCESS_STAGES
  ? JSON.parse(process.env.SUCCESS_STAGES)
  : defaultStages;

    const isAdmin = user.role === 'admin';

    // Contacts base query (team_member sees only assigned, admin sees all)
    const contactBaseQuery = isAdmin ? {} : { 'assignedTo.user': user._id };

    // Leaves base query - different depending on role
    const leaveBaseQuery = isAdmin
      ? {}                                    // Admin → all employees
      : { employeeId: user._id };             // Team member → only self

    // ─── Parallel queries ───
    const [
      totalContacts,
      totalClosedContacts,
      monthlyData,
      totalLeaves,
      currentMonthLeaves
    ] = await Promise.all([
      // 1. Total contacts
      Contact.countDocuments(contactBaseQuery),

      // 2. Total closed contacts
      Contact.countDocuments({
        ...contactBaseQuery,
        'pipelinesActive.stage_id': { $in: closedStageIds },
      }),

      // 3. Monthly aggregation for conversion rates (same logic as contacts)
      Contact.aggregate([
        { $match: contactBaseQuery },
        {
          $facet: {
            totalContacts: [
              {
                $group: {
                  _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                  count: { $sum: 1 },
                },
              },
              { $sort: { '_id.year': 1, '_id.month': 1 } },
            ],
            closedContacts: [
              {
                $match: { 'pipelinesActive.stage_id': { $in: closedStageIds } },
              },
              {
                $group: {
                  _id: { year: { $year: '$updatedAt' }, month: { $month: '$updatedAt' } },
                  count: { $sum: 1 },
                },
              },
              { $sort: { '_id.year': 1, '_id.month': 1 } },
            ],
          },
        },
      ]),

      // 4. Total leaves (all time)
      LeaveRequest.countDocuments(leaveBaseQuery),

      // 5. Current month leaves (overlapping)
      (async () => {
        const now = new Date();
        const firstDay = startOfMonth(now);
        const lastDay = endOfMonth(now);

        return LeaveRequest.countDocuments({
          ...leaveBaseQuery,
          startDate: { $lte: lastDay },
          endDate: { $gte: firstDay },
        });
      })(),
    ]);

    // ─── Process monthly conversion rates ───
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const monthlyConversionRates: MonthlyConversionRate[] = [];
    const totalByMonth = monthlyData[0].totalContacts;
    const closedByMonth = monthlyData[0].closedContacts;

    totalByMonth.forEach((t: any) => {
      const closed = closedByMonth.find(
        (c: any) => c._id.year === t._id.year && c._id.month === t._id.month
      );
      const closedCount = closed?.count ?? 0;
      const rate = t.count > 0 ? (closedCount / t.count).toFixed(2) : '0.00';

      monthlyConversionRates.push({
        year: t._id.year,
        month: monthNames[t._id.month - 1],
        totalContacts: t.count,
        closedContacts: closedCount,
        conversionRate: rate,
      });
    });

    // Rare case: months with only closed
    closedByMonth.forEach((c: any) => {
      if (!totalByMonth.some((t: any) => t._id.year === c._id.year && t._id.month === c._id.month)) {
        monthlyConversionRates.push({
          year: c._id.year,
          month: monthNames[c._id.month - 1],
          totalContacts: 0,
          closedContacts: c.count,
          conversionRate: '0.00',
        });
      }
    });

    monthlyConversionRates.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
    });

    // ─── Final response ───
    const response: DashboardResponse = {
      success: true,
      totalContacts,
      totalClosedContacts,
      monthlyConversionRates,
      totalLeaves,
      currentMonthLeaves,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}