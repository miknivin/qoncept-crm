/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React from "react";
import { useGetContactResponsesQuery } from "@/app/redux/api/contactApi";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

interface Contact {
  _id: string;
  name?: string;
}

interface ContactResponseViewProps {
  contact: Contact;
  onUpdate: (contactResponseId: string) => void;
}

const ContactResponseView: React.FC<ContactResponseViewProps> = ({ contact, onUpdate }) => {
  const { data, isLoading, error } = useGetContactResponsesQuery(contact._id);

  if (isLoading) {
    return (
      <div className="text-center text-gray-700 dark:text-gray-400">
        <p>Loading responses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 dark:text-red-400">
        <p>Error loading responses: {(error as any).data?.message || "Unknown error"}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-700 dark:text-gray-400">
        <p>No responses found for {contact.name || "Contact"}.</p>
      </div>
    );
  }

  // Group responses into pairs for 2x2 grid in laptop view
  const groupedResponses = [];
  for (let i = 0; i < data.length; i += 4) {
    groupedResponses.push(data.slice(i, i + 4));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-start text-gray-900 dark:text-white">
        Responses for {contact.name || "Contact"}
      </h2>
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={24}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        className="mySwiper"
      >
        {groupedResponses.map((group, index) => (
          <SwiperSlide key={index}>
            <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-6">
              {group.map((response) => (
                <div
                  key={response._id}
                  className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 text-start h-full"
                >
                  <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {response.activity.replace(/_/g, " ").toLowerCase()}
                  </h5>
                  {response.note && (
                    <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">
                      {response.note}
                    </p>
                  )}
                  {response.meetingScheduledDate && (
                    <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">
                     Meeting: {new Date(response.meetingScheduledDate).toLocaleString()}
                    </p>
                  )}
                  <p className="mb-3 text-sm text-gray-500 dark:text-gray-600">
                    Created: {new Date(response.createdAt).toLocaleString()}
                  </p>
                  <button
                    type="button"
                    onClick={() => onUpdate(response._id)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                  >
                    Update
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
              ))}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ContactResponseView;