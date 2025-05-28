/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect } from "react";
import { useSelector } from "react-redux";

import { useRouter } from "next/navigation";
import ContactsMetrics from "@/components/ecommerce/ContactsMetrics";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import Calendar from "@/components/calendar/Calendar";

import UsersTableTwo from "@/components/tables/UsersTableTwo";
import LeavesTableTwo from "@/components/tables/LeavesTableTwo";
import ShortSpinnerPrimary from "@/components/ui/loaders/ShortSpinnerPrimary";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useGetDashboardDataQuery } from "../redux/api/dashboardApi";
import { RootState } from '@/app/redux/rootReducer';

export default function Page() {
  const { user } = useSelector((state: RootState) => state.user);
  const router = useRouter();
  const { data, error, isLoading } = useGetDashboardDataQuery();

  useEffect(() => {
    if (user?.role === "user") {
      router.push("/calendar");
    }
  }, [user, router]);

  // Conditionally render for user role
  if (user?.role === "user") {
    return (
      <div>
        <PageBreadcrumb pageTitle="Calendar" />
        <Calendar />
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <ShortSpinnerPrimary />
      </div>
    );
  }

  // Handle error state
  if (error || !data?.success) {
    return (
      <div className="text-red-500 text-center">
        Error: {(error as any)?.data?.error || "Failed to load dashboard data"}
      </div>
    );
  }


  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <ContactsMetrics
          totalContacts={data.totalContacts}
          totalClosedContacts={data.totalClosedContacts}
        />
        <MonthlySalesChart monthlyConversionRates={data.monthlyConversionRates} />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget />
      </div>

      <div className="col-span-12 xl:col-span-12">
        <UsersTableTwo />
      </div>
      <div className="col-span-12 xl:col-span-12">
        <LeavesTableTwo />
      </div>
    </div>
  );
}