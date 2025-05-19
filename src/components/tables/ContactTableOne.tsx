"use client";
import React, { useState, useEffect } from "react";
import Badge from "../ui/badge/Badge";
import { useGetContactsQuery, ResponseContact } from "@/app/redux/api/contactApi";
import BasicPagination from "../ui/pagination/BasicPagination";
import ShortSpinnerPrimary from "../ui/loaders/ShortSpinnerPrimary";
import Select from "../form/Select";
import { ChevronDownIcon } from "@/icons";
import EditIcon from "../ui/flowbiteIcons/EditIcon";
import { toast } from "react-toastify";
import AddToPipelineIcon from "../ui/flowbiteIcons/AddToPipeline";
import AddTagIcon from "../ui/flowbiteIcons/AddTag";
import DeleteIcon from "../ui/flowbiteIcons/Delete";
import { checkBoxClass } from "@/constants/classnames";
import { Modal } from "../ui/modal";
import AddToPipelineForm from "../form/contact-form/AddToPipelineForm";
import { useModal } from "@/hooks/useModal";
import { useSearchParams, useRouter } from "next/navigation";

interface FilterParams {
  assignedTo?: string;
  pipelineNames?: string[];
  tags?: string[];
}

const ContactTableOne: React.FC = () => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const { isOpen, openModal, closeModal } = useModal();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [params, setParams] = useState<{
    page: number;
    limit: number;
    keyword: string;
    filter: FilterParams;
  }>({
    page: 1,
    limit: 10,
    keyword: "",
    filter: {},
  });

  // Initialize params from query parameters on mount
  useEffect(() => {
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Validate page and limit
    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const validLimit = isNaN(limit) || !["10", "15", "25", "50"].includes(limit.toString())
      ? 10
      : limit;

    setParams((prev) => ({
      ...prev,
      page: validPage,
      limit: validLimit,
    }));
  }, [searchParams]);

  // Update URL query params when page or limit changes
  useEffect(() => {
    const query = new URLSearchParams();
    query.set("page", params.page.toString());
    query.set("limit", params.limit.toString());
    if (params.keyword) query.set("keyword", params.keyword);

    router.push(`?${query.toString()}`, { scroll: false });
  }, [params.page, params.limit, params.keyword, router]);

  const { data, error, isLoading } = useGetContactsQuery(params);

  const options = [
    { value: "10", label: "10" },
    { value: "15", label: "15" },
    { value: "25", label: "25" },
    { value: "50", label: "50" },
  ];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams((prev) => ({ ...prev, keyword: e.target.value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const handlePrevPage = () => {
    if (params.page > 1) {
      setParams((prev) => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const handleNextPage = () => {
    if (data?.pagination.totalPages && params.page < data.pagination.totalPages) {
      setParams((prev) => ({ ...prev, page: params.page + 1 }));
    }
  };

  const handleCheckboxChange = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allContactIds = data?.contacts?.map((contact) => contact._id) || [];
      setSelectedContacts(allContactIds);
    } else {
      setSelectedContacts([]);
    }
  };

  const handleAddToPipeline = () => {
    if (selectedContacts.length > 0) {
      openModal();
    } else {
      toast.error("Please select at least one contact");
    }
  };

  const handleLimitChange = (value: string) => {
    setParams((prev) => ({ ...prev, limit: parseInt(value), page: 1 }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getErrorMessage = (error: any): string => {
    if (!error) return "Unknown error";
    if ("status" in error) {
      return `Error ${error.status}: ${JSON.stringify(error.data) || "Unknown error"}`;
    }
    return error.message || "Unknown error";
  };

  const isButtonGroupDisabled = selectedContacts.length === 0;
  const isAllSelected =
    (data?.contacts?.length ?? 0) > 0 &&
    data?.contacts?.every((contact) => selectedContacts.includes(contact._id));

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-4 px-5 py-3 flex gap-3 justify-between">
        <input
          type="text"
          placeholder="Search contacts..."
          value={params.keyword}
          onChange={handleSearch}
          className="w-full max-w-xl rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <div className="relative flex gap-3">
          <div className="inline-flex rounded-md shadow-xs" role="group">
            <button
              type="button"
              onClick={handleAddToPipeline}
              disabled={isButtonGroupDisabled}
              className={`px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-s-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white ${
                isButtonGroupDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <AddToPipelineIcon />
            </button>
            <button
              type="button"
              disabled={isButtonGroupDisabled}
              className={`px-4 py-2 text-sm font-medium text-gray-900 bg-white border-t border-b border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white ${
                isButtonGroupDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <AddTagIcon />
            </button>
            <button
              type="button"
              disabled={isButtonGroupDisabled}
              className={`px-4 py-2 text-sm font-medium text-gray-900 bg-red-600 border border-gray-200 rounded-e-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-red-800 dark:border-red-700 dark:text-white dark:hover:text-white dark:hover:bg-red-700 dark:focus:ring-blue-500 dark:focus:text-white ${
                isButtonGroupDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <DeleteIcon />
            </button>
          </div>
          <Select
            options={options}
            defaultValue="10"
            placeholder="Items per page"
            onChange={handleLimitChange}
            className="dark:bg-dark-900"
          />
          <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
            <ChevronDownIcon />
          </span>
        </div>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-5 py-3 w-12">
                <input
                  type="checkbox"
                  className={`${checkBoxClass}`}
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </th>
              <th scope="col" className="px-5 py-3">
                Contact
              </th>
              <th scope="col" className="px-5 py-3">
                Phone number
              </th>
              <th scope="col" className="px-5 py-3">
                Tags
              </th>
              <th scope="col" className="px-5 py-3">
                Notes
              </th>
              <th scope="col" className="px-5 py-3">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={6} className="px-5 py-4 text-center">
                  <div className="w-full flex justify-center">
                    <ShortSpinnerPrimary />
                  </div>
                </td>
              </tr>
            )}
            {error && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={6} className="px-5 py-4 text-center text-red-500">
                  {getErrorMessage(error)}
                </td>
              </tr>
            )}
            {!isLoading && !error && data?.contacts?.length === 0 && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={6} className="px-5 py-4 text-center">
                  No contacts found
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              data?.contacts?.map((contact: ResponseContact) => (
                <tr
                  key={contact._id}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200"
                >
                  <td className="px-5 py-4 w-12">
                    <input
                      type="checkbox"
                      className={`${checkBoxClass}`}
                      checked={selectedContacts.includes(contact._id)}
                      onChange={() => handleCheckboxChange(contact._id)}
                    />
                  </td>
                  <th
                    scope="row"
                    className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="block font-medium text-gray-800 text-sm dark:text-white/90">
                          {contact.name}
                        </span>
                        <span className="block text-gray-500 text-xs dark:text-gray-400">
                          {contact.email}
                        </span>
                      </div>
                    </div>
                  </th>
                  <td className="px-5 py-4">{contact.phone}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.length > 0 ? (
                        contact.tags.map((tag, index) => (
                          <Badge key={index} size="sm" color="info">
                            {tag.name}
                          </Badge>
                        ))
                      ) : (
                        <span>None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="max-w-36 line-clamp-3">
                      {contact.notes || "No notes"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap">
                      <button
                        onClick={() => toast.success("Edit clicked (implement functionality)")}
                        type="button"
                        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-2.5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                      >
                        <EditIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {data?.pagination && (
        <div className="px-5 py-3 text-gray-800 dark:text-white/90 flex justify-between items-center">
          <div className="text-sm">
            Page {data.pagination.page} of {data.pagination.totalPages} (
            {data.pagination.total} contacts)
          </div>
          <BasicPagination
            currentPage={params.page}
            totalPages={data.pagination.totalPages}
            onPageChange={handlePageChange}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
          />
        </div>
      )}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] p-6 lg:p-10">
        <AddToPipelineForm selectedContacts={selectedContacts} onClose={closeModal} />
      </Modal>
    </div>
  );
};

export default ContactTableOne;