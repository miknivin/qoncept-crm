"use client";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
// import StatisticsChart from "@/components/ecommerce/StatisticsChart";
// import RecentOrders from "@/components/ecommerce/RecentOrders";
// import DemographicCard from "@/components/ecommerce/DemographicCard";
import Calendar from "@/components/calendar/Calendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/rootReducer";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import UsersTableTwo from "@/components/tables/UsersTableTwo";
export default function Page() {
  const { user } = useSelector((state: RootState) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (user?.role === "user") {
      router.push("/calendar");
    }
  }, [user, router]);
  // Conditionally render based on user role
  if (user?.role === "user") {
    return (
      <div>
        <PageBreadcrumb pageTitle="Calendar" />
        <Calendar />
      </div>
    );
  }

  // Default ecommerce dashboard for non-user roles (or unauthenticated)
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <EcommerceMetrics />
        <MonthlySalesChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget />
      </div>

      {/* <div className="col-span-12">
        <StatisticsChart />
      </div> */}

      {/* <div className="col-span-12 xl:col-span-5">
        <DemographicCard />
      </div> */}

      <div className="col-span-12 xl:col-span-12">
        <UsersTableTwo />
      </div>
    </div>
  );
}