'use client';

import { ContactResponseItem } from '@/app/redux/api/contactApi';
import React from 'react';

interface ContactResponseCardProps {
  response: ContactResponseItem;
  onUpdate: (responseId: string) => void;
}

const ContactResponseCard: React.FC<ContactResponseCardProps> = ({ response, onUpdate }) => {
  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 text-start h-full">
      <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        {response.activity.replace(/_/g, ' ').toLowerCase()}
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
  );
};

export default ContactResponseCard;