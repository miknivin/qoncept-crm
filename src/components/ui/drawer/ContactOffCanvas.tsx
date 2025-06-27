/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { RootState } from "@/app/redux/rootReducer";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import Chip from "../chips/Chip";
import { IUser } from "@/app/models/User";
import { useGetTeamMembersQuery } from "@/app/redux/api/userApi";
import { DateRangePicker } from "react-date-range";
import { format, parse } from "date-fns";
import "react-date-range/dist/styles.css"; // Main style file
import "react-date-range/dist/theme/default.css"; // Theme CSS file

interface ContactOffCanvasProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactOffCanvas({ isOpen, onClose }: ContactOffCanvasProps) {
  const offCanvasRef = useRef<HTMLDivElement>(null);
  const { user } = useSelector((state: RootState) => state.user);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Form state
  const [keyword, setKeyword] = useState("");
  const [source, setSource] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [assignedTo, setAssignedTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<IUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date(),
    key: "selection",
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Source options with label-value pairs
  const sourceOptions = [
    { value: "facebook", label: "Facebook Leads" },
    { value: "whatsApp", label: "WhatsApp" },
    { value: "Excel file", label: "Excel file" },
    { value: "manual", label: "Manual" },
  ];

  const { data: teamMembersData, isLoading } = useGetTeamMembersQuery({
    page: 1,
    limit: 10,
    search: searchQuery,
  });
  const teamMembers: IUser[] = teamMembersData?.users ?? [];

  // Initialize form state from query params
  useEffect(() => {
    if (!user) return;
    const keyword = searchParams.get("keyword") || "";
    const sourceParam = searchParams.get("source") || "";
    const source = sourceOptions.find((opt) => opt.label === sourceParam || opt.value === sourceParam)?.value || "";
    const filterStr = searchParams.get("filter");
    let filter: { assignedTo?: string; createdAt?: { startDate: string; endDate: string } } = {};
    try {
      if (filterStr) filter = JSON.parse(filterStr);
    } catch (e) {
      console.error("Invalid filter param:", e);
    }
    const assignedTo = user.role === "admin" ? filter.assignedTo || "" : "";
    const startDate = filter.createdAt?.startDate
      ? parse(filter.createdAt.startDate, "yyyy-MM-dd", new Date())
      : new Date();
    const endDate = filter.createdAt?.endDate
      ? parse(filter.createdAt.endDate, "yyyy-MM-dd", new Date())
      : new Date();

    setKeyword(keyword);
    setSource(source);
    setAssignedTo(assignedTo);
    setDateRange({ startDate, endDate, key: "selection" });
    // Optionally sync selectedUsers with assignedTo if needed
  }, [searchParams, user]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsDropdownOpen(e.target.value.length > 0);
  };

  const handleSelectMember = (member: IUser) => {
    if (member._id && !selectedUsers.some((user) => user._id === member._id)) {
      setSelectedUsers([member]);
      setAssignedTo(member._id || "");
    }
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        offCanvasRef.current &&
        !offCanvasRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, offCanvasRef]);

  const handleRemoveUser = (userId: string | undefined) => {
    if (userId) {
      setSelectedUsers(selectedUsers.filter((user) => user._id !== userId));
      setAssignedTo("");
    }
  };

  // Handle date range selection
  const handleDateRangeSelect = (ranges: any) => {
    setDateRange(ranges.selection);
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword && !source && !selectedUsers[0]?._id) {
      alert("Please apply at least one filter");
      return;
    }
    setIsSubmitting(true);
    const filter: { assignedTo?: string; createdAt?: { startDate: string; endDate: string } } = {
      ...(user?.role === "admin" && selectedUsers[0]?._id && { assignedTo: selectedUsers[0]._id }),
      ...(dateRange.startDate && dateRange.endDate && {
        createdAt: {
          startDate: format(dateRange.startDate, "yyyy-MM-dd"),
          endDate: format(dateRange.endDate, "yyyy-MM-dd"),
        },
      }),
    };
    const query = new URLSearchParams();
    query.set("page", "1");
    query.set("limit", searchParams.get("limit") || "10");
    if (keyword) query.set("keyword", keyword);
    if (source) {
      const sourceLabel = sourceOptions.find((opt) => opt.value === source)?.label || source;
      query.set("source", sourceLabel);
    }
    if (Object.keys(filter).length) query.set("filter", JSON.stringify(filter));
    await router.push(`?${query.toString()}`, { scroll: false });
    setIsSubmitting(false);
  };

  // Clear filters
  const handleClear = () => {
    setKeyword("");
    setSource("");
    setAssignedTo("");
    setSelectedUsers([]);
    setDateRange({ startDate: new Date(), endDate: new Date(), key: "selection" });
    const query = new URLSearchParams();
    query.set("page", "1");
    query.set("limit", searchParams.get("limit") || "10");
    router.push(`?${query.toString()}`, { scroll: false });
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 transition-opacity"
          aria-hidden="true"
        />
      )}
      <div
        ref={offCanvasRef}
        id="drawer-right-contact"
        className={`fixed top-0 right-0 z-[999] h-dvh p-4 overflow-y-auto transition-transform bg-white w-90 dark:bg-gray-800 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        tabIndex={-1}
        aria-labelledby="drawer-right-contact-label"
      >
        <h5
          id="drawer-right-contact-label"
          className="inline-flex items-center mb-4 text-base mt-7 font-semibold text-gray-500 dark:text-gray-400"
        >
          Contact Filters
        </h5>
        <button
          onClick={onClose}
          type="button"
          aria-label="Close contact filters"
          className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 absolute top-2.5 end-2.5 inline-flex items-center mt-7 justify-center dark:hover:bg-gray-600 dark:hover:text-white"
        >
          <svg
            className="w-3 h-3"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
            />
          </svg>
        </button>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Filter contacts by source, assigned user, date range, or other criteria.
        </p>

        <form onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="contact-search"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Search by keyword
            </label>
            <div className="relative mb-4">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-500 dark:text-gray-400"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                  />
                </svg>
              </div>
              <input
                type="search"
                id="contact-search"
                className="block w-full p-2.5 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Search by name, email, notes..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="contact-source"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Select source
            </label>
            <select
              id="contact-source"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">Choose a source</option>
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 relative">
            <label
              htmlFor="date-range"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Select date range
            </label>
            <input
              type="text"
              id="date-range"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              value={`${format(dateRange.startDate, "MM/dd/yyyy")} - ${format(dateRange.endDate, "MM/dd/yyyy")}`}
              readOnly
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              placeholder="Select date range"
            />
            {isDatePickerOpen && (
              <div className="z-10 absolute mt-1 bg-white rounded-lg shadow-sm w-full max-h-[300px] overflow-auto dark:bg-gray-700">
                <DateRangePicker
                  ranges={[dateRange]}
                  onChange={handleDateRangeSelect}
                  moveRangeOnFirstSelection={false}
                  months={1}
                  staticRanges={[]}
                  inputRanges={[]}
                  direction="vertical"
                  color="#2563eb" // Tailwind blue-600
                />
              </div>
            )}
          </div>

          {user && user.role === "admin" && (
            <div className="mb-4 relative">
              <label
                htmlFor="simple-search"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Search users
              </label>
              <input
                type="text"
                id="simple-search"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Search users"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsDropdownOpen(searchQuery.length > 0)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
              />
              {selectedUsers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedUsers.map((user) =>
                    user._id && user.name ? (
                      <Chip
                        key={user._id}
                        text={user.name}
                        onRemove={() => handleRemoveUser(user._id)}
                      />
                    ) : null
                  )}
                </div>
              )}
              {isDropdownOpen && (
                <div
                  id="dropdownDivider"
                  className="z-10 absolute mt-1 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-full dark:bg-gray-700 dark:divide-gray-600"
                >
                  <ul
                    className="py-2 text-sm text-gray-700 dark:text-gray-200"
                    aria-labelledby="dropdownDividerButton"
                  >
                    {isLoading ? (
                      <li className="block px-4 py-2">Loading...</li>
                    ) : teamMembers.length > 0 ? (
                      teamMembers
                        .filter((member) => !selectedUsers.some((user) => user._id === member._id))
                        .map((member) => (
                          <li key={member._id}>
                            <button
                              type="button"
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                              onClick={() => handleSelectMember(member)}
                            >
                              {member.name}
                            </button>
                          </li>
                        ))
                    ) : (
                      <li className="block px-4 py-2">No users found</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 flex items-center justify-center text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSubmitting ? "Applying..." : "Apply Filters"}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-center text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
              onClick={handleClear}
            >
              Clear Filters
              <svg
                className="rtl:rotate-180 w-3.5 h-3.5 ms-2"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 10"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M1 5h12m0 0L9 1m4 4L9 9"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}