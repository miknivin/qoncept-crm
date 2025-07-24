/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { RootState } from "@/app/redux/rootReducer";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import Chip from "../chips/Chip";
import { IUser } from "@/app/models/User";
import { useGetTeamMembersQuery } from "@/app/redux/api/userApi";
import ArrowRightIcon from "../flowbiteIcons/ArrowRight";
import { format, parse, isValid } from "date-fns";
import DateRangePickerUi from "../date/DateRangePicker";
import { useGetPipelineByIdQuery } from "@/app/redux/api/pipelineApi";

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
  const [assignedTo, setAssignedTo] = useState<{ userId: string; isNot: boolean }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<IUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [updatedAtStartDate, setUpdatedAtStartDate] = useState<string | null>(null);
  const [updatedAtEndDate, setUpdatedAtEndDate] = useState<string | null>(null);
  const [stage, setStage] = useState("");
  const [isNot, setIsNot] = useState(false); // State for "Not" checkbox
  const [hasUserInteracted, setHasUserInteracted] = useState(false); // Track user interaction

  const { data: pipelineData, isLoading: isPipelineLoading } = useGetPipelineByIdQuery(
    process.env.NEXT_PUBLIC_DEFAULT_PIPELINE || ""
  );
  const stages = pipelineData?.pipeline?.stages || [];

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
    const stageParam = searchParams.get("stage") || "";
    const source = sourceOptions.find((opt) => opt.label === sourceParam || opt.value === sourceParam)?.value || "";
    const filterStr = searchParams.get("filter");
    let filter: { 
      assignedTo?: { userId: string; isNot: boolean }[]; 
      createdAt?: { startDate: string; endDate: string }; 
      updatedAt?: { startDate: string; endDate: string }; 
      stage?: string 
    } = {};
    try {
      if (filterStr) {
        filter = JSON.parse(filterStr);
        console.log({ filterStr, filter, action: "parsed filter in useEffect" });
      }
    } catch (e) {
      console.error("Invalid filter param:", e);
    }
    const assignedTo = user.role === "admin" && Array.isArray(filter.assignedTo) ? filter.assignedTo : [];
    // Parse dates to ensure consistent format (M/d/yyyy for display)
    const startDate = filter.createdAt?.startDate 
      ? format(parse(filter.createdAt.startDate, "yyyy-MM-dd", new Date()), "M/d/yyyy") 
      : null;
    const endDate = filter.createdAt?.endDate 
      ? format(parse(filter.createdAt.endDate, "yyyy-MM-dd", new Date()), "M/d/yyyy") 
      : null;
    const updatedAtStartDate = filter.updatedAt?.startDate 
      ? format(parse(filter.updatedAt.startDate, "yyyy-MM-dd", new Date()), "M/d/yyyy") 
      : null;
    const updatedAtEndDate = filter.updatedAt?.endDate 
      ? format(parse(filter.updatedAt.endDate, "yyyy-MM-dd", new Date()), "M/d/yyyy") 
      : null;
    const stage = filter.stage || stageParam || "";

    setKeyword(keyword);
    setSource(source);
    setStage(stage);
    setStartDate(startDate);
    setEndDate(endDate);
    setUpdatedAtStartDate(updatedAtStartDate);
    setUpdatedAtEndDate(updatedAtEndDate);

    // Only update assignedTo and selectedUsers if the user hasn't interacted
    if (!hasUserInteracted) {
      setAssignedTo(assignedTo);
      if (Array.isArray(assignedTo) && assignedTo.length > 0 && teamMembers.length > 0) {
        const selected = teamMembers.filter((member) =>
          assignedTo.some((a) => a.userId === member._id)
        );
        setSelectedUsers(selected);
        console.log({ selected, assignedTo, teamMembers, action: "set selectedUsers in useEffect" });
      } else {
        setSelectedUsers([]);
        console.log({ assignedTo, teamMembers, action: "set empty selectedUsers in useEffect" });
      }
    }
  }, [searchParams, user, teamMembers, hasUserInteracted]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsDropdownOpen(e.target.value.length > 0);
  };

  const handleSelectMember = (member: IUser) => {
    if (member._id && !selectedUsers.some((user) => user._id === member._id)) {
      setSelectedUsers([...selectedUsers, member]);
      setAssignedTo([...assignedTo, { userId: member._id, isNot }]);
      setHasUserInteracted(true); // Mark user interaction
      console.log({ selectedUser: member, isNot, selectedUsers: [...selectedUsers, member], assignedTo: [...assignedTo, { userId: member._id, isNot }], action: "handleSelectMember" });
    }
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  const handleRemoveUser = (userId: string | undefined) => {
    if (userId) {
      setSelectedUsers(selectedUsers.filter((user) => user._id !== userId));
      setAssignedTo(assignedTo.filter((a) => a.userId !== userId));
      setHasUserInteracted(true); // Mark user interaction
      console.log({ userId, action: "handleRemoveUser" });
    }
  };

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        offCanvasRef.current &&
        !offCanvasRef.current.contains(event.target as Node) &&
        isOpen &&
        !isSubmitting
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, isSubmitting]);

  // Handle date range selection from DateRangePickerUi
  const handleApplyCreatedAt = (dates: { startDate: string | null; endDate: string | null }) => {
    setStartDate(dates.startDate);
    setEndDate(dates.endDate);
  };

  const handleApplyUpdatedAt = (dates: { startDate: string | null; endDate: string | null }) => {
    setUpdatedAtStartDate(dates.startDate);
    setUpdatedAtEndDate(dates.endDate);
  };

  const isValidDate = (dateStr: string | null, formatStr: string): boolean => {
    if (!dateStr) return false;
    try {
      const parsedDate = parse(dateStr, formatStr, new Date());
      return isValid(parsedDate);
    } catch {
      return false;
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      console.log({ startDate, endDate, updatedAtStartDate, updatedAtEndDate, stage, assignedTo, action: "handleSubmit start" });
      const filter: { 
        assignedTo?: { userId: string; isNot: boolean }[]; 
        createdAt?: { startDate: string; endDate: string }; 
        updatedAt?: { startDate: string; endDate: string }; 
        stage?: string 
      } = {
        ...(user?.role === "admin" && assignedTo.length > 0 && { assignedTo }),
        ...(startDate && endDate && isValidDate(startDate, "M/d/yyyy") && isValidDate(endDate, "M/d/yyyy") && {
          createdAt: {
            startDate: format(parse(startDate, "M/d/yyyy", new Date()), "yyyy-MM-dd"),
            endDate: format(parse(endDate, "M/d/yyyy", new Date()), "yyyy-MM-dd"),
          },
        }),
        ...(updatedAtStartDate && updatedAtEndDate && isValidDate(updatedAtStartDate, "M/d/yyyy") && isValidDate(updatedAtEndDate, "M/d/yyyy") && {
          updatedAt: {
            startDate: format(parse(updatedAtStartDate, "M/d/yyyy", new Date()), "yyyy-MM-dd"),
            endDate: format(parse(updatedAtEndDate, "M/d/yyyy", new Date()), "yyyy-MM-dd"),
          },
        }),
        ...(stage && { stage }),
      };
      const query = new URLSearchParams();
      query.set("page", "1");
      query.set("limit", searchParams.get("limit") || "10");
      if (keyword) query.set("keyword", keyword);
      if (source) {
        const sourceLabel = sourceOptions.find((opt) => opt.value === source)?.label || source;
        query.set("source", sourceLabel);
      }
      if (stage) {
        const stageName = stages.find((s) => s._id === stage)?.name || stage;
        query.set("stage", stageName);
      }
      if (Object.keys(filter).length > 0) {
        query.set("filter", JSON.stringify(filter));
      }
      console.log({ filter, query: query.toString(), action: "before router.push" });
      router.push(`?${query.toString()}`, { scroll: false });
      onClose();
    } catch (error) {
      console.error("Failed to apply filters:", error);
    } finally {
      console.log({ isSubmitting, action: "finally block" });
      setIsSubmitting(false);
    }
  };

  // Clear filters
  const handleClear = () => {
    setKeyword("");
    setSource("");
    setStage("");
    setAssignedTo([]);
    setSelectedUsers([]);
    setStartDate(null);
    setEndDate(null);
    setUpdatedAtStartDate(null);
    setUpdatedAtEndDate(null);
    setIsNot(true); // Reset to default
    setHasUserInteracted(false); // Reset interaction flag
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
          Filter contacts by source, stage, assigned user, date range, or other criteria.
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
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="mb-4">
            <DateRangePickerUi
              onApply={handleApplyCreatedAt}
              label="Select date range (Created at)"
              placeholder="Select date range"
              startDate={startDate}
              endDate={endDate}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
            />
          </div>
          <div className="mb-4">
            <DateRangePickerUi
              onApply={handleApplyUpdatedAt}
              label="Select date range (Updated at)"
              placeholder="Select date range"
              startDate={updatedAtStartDate}
              endDate={updatedAtEndDate}
              setStartDate={setUpdatedAtStartDate}
              setEndDate={setUpdatedAtEndDate}
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="contact-stage"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Select stage
            </label>
            <select
              id="contact-stage"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              disabled={isSubmitting || isPipelineLoading}
            >
              <option value="">Choose a stage</option>
              {stages.map((stage) => (
                <option key={stage._id} value={stage._id}>
                  {stage.name}
                </option>
              ))}
            </select>
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
              disabled={isSubmitting}
            >
              <option value="">Choose a source</option>
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {user && user.role === "admin" && (
            <div className="mb-4 relative">
              <div className="flex justify-between mb-2">
                <label
                  htmlFor="simple-search"
                  className="block text-sm font-medium text-gray-900 dark:text-white"
                >
                  Search users
                </label>
                <label className="inline-flex items-center cursor-pointer">
                  <span className="me-1 text-sm font-medium text-gray-900 dark:text-gray-300">
                    Not
                  </span>
                  <input
                    type="checkbox"
                    checked={isNot}
                    className="sr-only peer"
                    onChange={(e) => setIsNot(e.target.checked)}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600" />
                </label>
              </div>
              <input
                type="text"
                id="simple-search"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Search users"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsDropdownOpen(searchQuery.length > 0)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                disabled={isSubmitting}
              />
              {selectedUsers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedUsers.map((user) =>
                    user._id && user.name ? (
                      <Chip
                        key={user._id}
                        text={user.name}
                        onRemove={() => handleRemoveUser(user._id)}
                        disabled={isSubmitting}
                        isNot={assignedTo.find((a) => a.userId === user._id)?.isNot || false}
                      />
                    ) : null
                  )}
                </div>
              )}
              {isDropdownOpen && (
                <div
                  id="dropdownDivider"
                  className="z-50 absolute mt-1 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-full dark:bg-gray-700 dark:divide-gray-600"
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
                              disabled={isSubmitting}
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
              disabled={isSubmitting}
            >
              Clear Filters
              <ArrowRightIcon />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}