"use client";
import { IUser } from "@/app/models/User";
import { useGetTeamMembersQuery } from "@/app/redux/api/userApi";
import { useEffect, useRef, useState } from "react";
import Chip from "../chips/Chip";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/rootReducer";
import DateRangePickerUi from "../date/DateRangePicker";
import { format } from "date-fns";

interface OffCanvasProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PipelineOffCanvas({ isOpen, onClose }: OffCanvasProps) {
  const offCanvasRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.user);
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<IUser[]>([]);
  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [source, setSource] = useState(searchParams.get("source") || "");
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const { data: teamMembersData, isLoading } = useGetTeamMembersQuery({
    page: 1,
    limit: 10,
    search: searchQuery,
  });

  const teamMembers: IUser[] = teamMembersData?.users || [];

  useEffect(() => {
    setKeyword(searchParams.get("keyword") || "");
    setSource(searchParams.get("source") || "");
    // Initialize startDate and endDate from searchParams
    setStartDate(searchParams.get("startDate") || null);
    setEndDate(searchParams.get("endDate") || null);
    const assignedTo = searchParams.get("assignedTo");
    if (assignedTo && teamMembers.length > 0) {
      const user = teamMembers.find((member) => member._id === assignedTo);
      if (user && !selectedUsers.some((u) => u._id === user._id)) {
        setSelectedUsers([user]);
      }
    }
  }, [searchParams, teamMembers]);

  // Handle closing the off-canvas
  useEffect(() => {
    const handleDrawerHide = () => {
      onClose();
    };

    const closeButton = document.querySelector('[data-drawer-hide="drawer-right-example"]');
    if (closeButton) {
      closeButton.addEventListener("click", handleDrawerHide);
    }

    return () => {
      if (closeButton) {
        closeButton.removeEventListener("click", handleDrawerHide);
      }
    };
  }, [onClose]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        offCanvasRef.current &&
        !offCanvasRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        onClose();
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsDropdownOpen(e.target.value.length > 0);
  };

  const handleSelectMember = (member: IUser) => {
    if (!selectedUsers.some((user) => user._id === member._id)) {
      setSelectedUsers([member]); // Allow only one user for assignedTo
    }
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  const handleRemoveUser = (userId: string | undefined) => {
    if (userId) {
      setSelectedUsers(selectedUsers.filter((user) => user._id !== userId));
      const params = new URLSearchParams(searchParams);
      params.delete("assignedTo");
      router.push(`?${params.toString()}`);
    }
  };

  const handleApplyFilters = () => {
    if (keyword && keyword.length < 2) {
      setKeywordError("Keyword must be at least 2 characters long");
      return;
    }
    setKeywordError(null);

    const params = new URLSearchParams(searchParams);
    if (keyword) {
      params.set("keyword", keyword);
    } else {
      params.delete("keyword");
    }
    if (source) {
      params.set("source", source);
    } else {
      params.delete("source");
    }
    if (selectedUsers.length > 0 && selectedUsers[0]._id) {
      params.set("assignedTo", selectedUsers[0]._id);
    } else {
      params.delete("assignedTo");
    }
    if (startDate) {
      const formattedStartDate = new Date(startDate);
      params.set("startDate", format(formattedStartDate, "yyyy-MM-dd"));
    } else {
      params.delete("startDate");
    }
    if (endDate) {
      const formattedEndDate = new Date(endDate);
      params.set("endDate", format(formattedEndDate, "yyyy-MM-dd"));
    } else {
      params.delete("endDate");
    }
    router.push(`?${params.toString()}`);
    onClose();
  };

  const handleClearFilters = () => {
    setKeyword("");
    setSource("");
    setSelectedUsers([]);
    setKeywordError(null);
    setStartDate(null);
    setEndDate(null);
    const params = new URLSearchParams(searchParams);
    params.delete("keyword");
    params.delete("source");
    params.delete("assignedTo");
    params.delete("startDate");
    params.delete("endDate");
    router.push(`?${params.toString()}`);
  };

  const handleApply = (dates: { startDate: string | null; endDate: string | null }) => {
    // Update URL with new startDate and endDate
    const params = new URLSearchParams(searchParams);
    params.delete("startDate");
    params.delete("endDate");
    if (dates.startDate) {
      params.set("startDate", format(new Date(dates.startDate), "yyyy-MM-dd"));
    }
    if (dates.endDate) {
      params.set("endDate", format(new Date(dates.endDate), "yyyy-MM-dd"));
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <>
      {

isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 transition-opacity"
          aria-hidden="true"
        />
      )}
      <div
        ref={offCanvasRef}
        id="drawer-right-example"
        className={`fixed top-0 right-0 z-[999] h-dvh p-4 overflow-y-auto transition-transform bg-white w-80 dark:bg-gray-800 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        tabIndex={-1}
        aria-labelledby="drawer-right-label"
      >
        <h5
          id="drawer-right-label"
          className="inline-flex items-center mb-4 text-base mt-7 font-semibold text-gray-500 dark:text-gray-400"
        >
          Filter Options
        </h5>
        <button
          type="button"
          data-drawer-hide="drawer-right-example"
          aria-controls="drawer-right-example"
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
          <span className="sr-only">Close menu</span>
        </button>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Filter contacts by source, assigned user, or other criteria.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }}>
          <div>
            <label
              htmlFor="default-search"
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
                id="default-search"
                className="block w-full p-2.5 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Search by name, email, notes..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              {keywordError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{keywordError}</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="countries"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Select source
            </label>
            <select
              id="countries"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">Choose a source</option>
              <option value="facebook">Facebook Leads</option>
              <option value="whatsApp">WhatsApp</option>
              <option value="Excel file">Excel</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div className="mb-4">
            <DateRangePickerUi
              onApply={handleApply}
              label="Select date range"
              placeholder="Select date range"
              startDate={startDate}
              endDate={endDate}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
            />
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
              />
              {selectedUsers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedUsers.map((user) =>
                    user.name && user._id ? (
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
              className="px-4 py-2 flex items-center justify-center text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-center text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
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