"use client";
import { BoxIconLine, GroupIcon } from "@/icons"; // ← Add CalendarIcon or your preferred leave icon
import React from "react";
import CalendarIcon from "../ui/flowbiteIcons/Calendar";
// import Badge from "../ui/badge/Badge";
// import { ArrowDownIcon, ArrowUpIcon } from "@/icons";

interface ContactsMetricsProps {
  totalContacts: number;
  totalClosedContacts: number;
  totalLeaves: number;
  currentMonthLeaves: number;
}

const ContactsMetrics: React.FC<ContactsMetricsProps> = ({
  totalContacts,
  totalClosedContacts,
  totalLeaves,
  currentMonthLeaves,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 md:gap-6">
      {/* Total Contacts */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Total Contacts
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {totalContacts.toLocaleString()}
          </h4>
        </div>
      </div>

      {/* Closed Contacts */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Closed Contacts
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {totalClosedContacts.toLocaleString()}
          </h4>
        </div>
      </div>

      {/* Total Leaves - All Time */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          {/* You can replace with a better leave/suitcase icon if you have one */}
          <CalendarIcon className="text-gray-800 size-6 dark:text-white/90"/>
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Total Leaves
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {totalLeaves.toLocaleString()}
          </h4>
        </div>
      </div>

      {/* Current Month Leaves */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <CalendarIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            This Month Leaves
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {currentMonthLeaves.toLocaleString()}
          </h4>
        </div>
      </div>
    </div>
  );
};

export default ContactsMetrics;