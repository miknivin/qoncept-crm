"use client";
import { RootState } from "@/app/redux/rootReducer";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";

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
  const [assignedTo, setAssignedTo] = useState("");

  // Source options with label-value pairs
  const sourceOptions = [
    { value: "facebook", label: "Facebook Leads" },
    { value: "whatsApp", label: "WhatsApp" },
    { value: "Excel file", label: "Excel file" },
    { value: "manual", label: "Manual" },
  ];

  // Initialize form state from query params
  useEffect(() => {
    const keyword = searchParams.get("keyword") || "";
    const source = searchParams.get("source") || "";
    const filterStr = searchParams.get("filter");
    let filter: { assignedTo?: string } = {};
    try {
      if (filterStr) filter = JSON.parse(filterStr);
    } catch (e) {
      console.error("Invalid filter param:", e);
    }
    const assignedTo = user?.role === "admin" ? filter.assignedTo || "" : "";

    setKeyword(keyword);
    setSource(source);
    setAssignedTo(assignedTo);
  }, [searchParams, user?.role]);

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
  }, [isOpen, onClose]);

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filter = {
      ...(user?.role === "admin" && assignedTo && { assignedTo }),
    };
    const query = new URLSearchParams();
    query.set("page", "1");
    query.set("limit", searchParams.get("limit") || "10");
    if (keyword) query.set("keyword", keyword);
    if (source) {
      // Find label for the source value
      const sourceLabel = sourceOptions.find((opt) => opt.value === source)?.label || source;
      query.set("source", sourceLabel);
    }
    if (Object.keys(filter).length) query.set("filter", JSON.stringify(filter));
    router.push(`?${query.toString()}`, { scroll: false });
  };

  // Clear filters
  const handleClear = () => {
    setKeyword("");
    setSource("");
    setAssignedTo("");
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
        className={`fixed top-0 right-0 z-[999] h-dvh p-4 overflow-y-auto transition-transform bg-white w-80 dark:bg-gray-800 ${
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
          data-drawer-hide="drawer-right-contact"
          aria-controls="drawer-right-contact"
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

          {user?.role === "admin" && (
            <div className="mb-4 relative">
              <label
                htmlFor="contact-user-search"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Search users
              </label>
              <input
                type="text"
                id="contact-user-search"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter user ID"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              />
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
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-center text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
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