'use client';

import React from 'react';
import { ResponseActivity } from './../../../app/redux/api/contactApi';
interface TimelineItemProps {
  activity: ResponseActivity;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ activity }) => {
  
  const formatTime = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInMs = now.getTime() - activityDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInHours < 1) return 'just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInHours / 24)} day${diffInHours >= 48 ? 's' : ''} ago`;
  };

  const getActionText = (activity: ResponseActivity) => {
    switch (activity.action) {
      case 'CONTACT_CREATED':
        return `${activity?.user?.name || "NIVIN"} created contact `;
      case 'NOTE_ADDED':
        return `${activity?.user?.name || "NIVIN"} added a note`;
      case 'PIPELINE_STAGE_UPDATED':
        return `${activity?.user?.name || "NIVIN"} updated pipeline stage to ${activity.details.stage || 'unknown'}`;
      default:
        return `${activity?.user?.name || "NIVIN"} performed ${activity.action}`;
    }
  };

  return (
    <li className="mb-10 ms-6">
      <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
        <svg
          className="w-6 h-6 text-gray-800 dark:text-white"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width={24}
          height={24}
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M8.5 11.5 11 14l4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </span>
      <div className="items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-xs sm:flex dark:bg-gray-700 dark:border-gray-600">
        <time className="mb-1 text-xs font-normal text-gray-400 sm:order-last sm:mb-0">
          {formatTime(activity.createdAt)}
        </time>
        <div className="text-sm font-normal text-gray-500 dark:text-gray-300">
          {getActionText(activity)}
          {activity.action === 'NOTE_ADDED' && (
            <div className="p-3 text-xs italic font-normal text-gray-500 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 mt-3">
              {activity.details.note as string}
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

export default TimelineItem;