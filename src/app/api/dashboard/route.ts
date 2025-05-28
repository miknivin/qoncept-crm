import { NextRequest, NextResponse } from 'next/server';
import { authorizeRoles, isAuthenticatedUser } from '../middlewares/auth';
import Contact from '@/app/models/Contact';
import dbConnect from '@/app/lib/db/connection';


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

    // Authorize admin or team_member role
    try {
      authorizeRoles(user, 'admin', 'team_member');
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        { error: 'Only admins or team members can view dashboard data' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Define stage IDs for closed contacts
    const closedStageIds = [
      '682da76db5aab2e983c8863d',
      '682da76db5aab2e983c8863e',
      '682da76db5aab2e983c8863f',
    ];

    // Base query based on user role
    const baseQuery = user.role === 'team_member' ? { 'assignedTo.user': user._id } : {};

    // Count total contacts
    const totalContacts = await Contact.countDocuments(baseQuery);

    // Count total contacts in specified stages
    const totalClosedContacts = await Contact.countDocuments({
      ...baseQuery,
      'pipelinesActive.stage_id': { $in: closedStageIds },
    });

    // Calculate month-wise conversion rates using aggregation
    const monthlyData = await Contact.aggregate([
      {
        $match: baseQuery,
      },
      {
        $facet: {
          // Total contacts per month (based on createdAt)
          totalContacts: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                },
                count: { $sum: 1 },
              },
            },
            {
              $sort: { '_id.year': 1, '_id.month': 1 },
            },
          ],
          // Closed contacts per month (based on updatedAt)
          closedContacts: [
            {
              $match: {
                'pipelinesActive.stage_id': { $in: closedStageIds },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: '$updatedAt' },
                  month: { $month: '$updatedAt' },
                },
                count: { $sum: 1 },
              },
            },
            {
              $sort: { '_id.year': 1, '_id.month': 1 },
            },
          ],
        },
      },
    ]);
    console.log(monthlyData,'monthlydata');
    
    // Map month numbers to names
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    // Combine total and closed contacts, calculate conversion rates
    const monthlyConversionRates: MonthlyConversionRate[] = [];
    const totalContactsByMonth = monthlyData[0].totalContacts;
    const closedContactsByMonth = monthlyData[0].closedContacts;

    // Iterate over total contacts to ensure all months with contacts are included
    totalContactsByMonth.forEach((total: { _id: { year: number; month: number }; count: number }) => {
      const closed = closedContactsByMonth.find(
        (c: { _id: { year: number; month: number } }) =>
          c._id.year === total._id.year && c._id.month === total._id.month
      );
      const closedCount = closed ? closed.count : 0;
      const conversionRate = total.count > 0 ? (closedCount / total.count).toFixed(2) : '0.00';

      monthlyConversionRates.push({
        year: total._id.year,
        month: monthNames[total._id.month - 1],
        totalContacts: total.count,
        closedContacts: closedCount,
        conversionRate,
      });
    });

    // Include months with only closed contacts (if any)
    closedContactsByMonth.forEach((closed: { _id: { year: number; month: number }; count: number }) => {
      if (
        !totalContactsByMonth.find(
          (t: { _id: { year: number; month: number } }) =>
            t._id.year === closed._id.year && t._id.month === closed._id.month
        )
      ) {
        monthlyConversionRates.push({
          year: closed._id.year,
          month: monthNames[closed._id.month - 1],
          totalContacts: 0,
          closedContacts: closed.count,
          conversionRate: '0.00',
        });
      }
    });

    // Sort monthlyConversionRates by year and month
    monthlyConversionRates.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
    });

    // Prepare response
    const response: DashboardResponse = {
      success: true,
      totalContacts,
      totalClosedContacts,
      monthlyConversionRates,
    };

    return NextResponse.json(response, { status: 200 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}