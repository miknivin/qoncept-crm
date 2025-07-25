'use client';

import React from 'react';
import { ResponseActivity } from './../../../app/redux/api/contactApi';

interface TimelineItemProps {
  activity: ResponseActivity;
}

// Helper function to format camelCase to space-separated words
const formatKey = (key: string): string => {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
};

// Helper function to format values (strings, arrays, objects)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatValue = (value: any, indent: number = 0): string => {
  const indentStr = '  '.repeat(indent);
  if (typeof value === 'string' || typeof value === 'number' || value === null) {
    return `${value}`; // No quotes for strings
  } else if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value.map((item) => `${indentStr}- ${formatValue(item, indent + 1)}`).join('\n');
  } else if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    return entries
      .map(([key, val]) => `${indentStr}${formatKey(key)}: ${formatValue(val, indent + 1)}`)
      .join('\n');
  }
  return `${value}`;
};

// Helper function to format the details object based on action type
const formatDetails = (activity: ResponseActivity): string => {
  const { action, details } = activity;
  switch (action) {
    case 'CONTACT_CREATED':
      return formatValue(details.updatedFields);
    case 'NOTE_ADDED':
    case 'NOTE_UPDATED':
      return details.newNotes ? formatValue(details.newNotes) : 'No note provided';
    case 'ASSIGNED_TO_UPDATED':
      return `user ids: ${formatValue(details.userIds)}\nassign type: ${details.assignType}`;
    case 'TAG_ADDED':
      return `added tags: ${formatValue(details.addedTags)}`;
    case 'TAG_REMOVED':
      return `removed tags: ${formatValue(details.removedTags)}`;
    case 'CONTACT_UPDATED':
      return `field: ${details.field}\nold value: ${details.oldValue}\nnew value: ${details.newValue}`;
    case 'PIPELINE_ADDED':
      return `pipeline id: ${details.pipelineId}\nstage id: ${details.stageId}`;
    default:
      return formatValue(details);
  }
};

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
        return `${activity?.user?.name || 'NIVIN'} created contact`;
      case 'NOTE_ADDED':
        return `${activity?.user?.name || 'NIVIN'} added a note`;
      case 'NOTE_UPDATED':
        return `${activity?.user?.name || 'NIVIN'} updated a note`;
      case 'PIPELINE_ADDED':
        return `${activity?.user?.name || 'NIVIN'} added to pipeline`;
      case 'PIPELINE_STAGE_UPDATED':
        return `${activity?.user?.name || 'NIVIN'} updated pipeline stage to ${activity.details.stage || 'unknown'}`;
      case 'ASSIGNED_TO_UPDATED':
        return `${activity?.user?.name || 'NIVIN'} updated assignment`;
      case 'TAG_ADDED':
        return `${activity?.user?.name || 'NIVIN'} added tag`;
      case 'TAG_REMOVED':
        return `${activity?.user?.name || 'NIVIN'} removed tag`;
      case 'CONTACT_UPDATED':
        return `${activity?.user?.name || 'NIVIN'} updated contact`;
      default:
        return `${activity?.user?.name || 'NIVIN'} performed ${activity.action}`;
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
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-xs grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 dark:bg-gray-700 dark:border-gray-600">
        <time className="mb-1 text-xs font-normal text-gray-400 sm:mb-0 sm:col-start-2">
          {formatTime(activity.createdAt)}
        </time>
        <div className="text-sm font-normal text-gray-500 dark:text-gray-300 sm:col-start-1 sm:row-start-1">
          {getActionText(activity)}
          {activity.action !== 'PIPELINE_ADDED' && activity.action !== 'CONTACT_CREATED' && activity.details && (
            <div
              id="details"
              className="p-3 text-xs italic font-normal text-gray-500 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 mt-3"
            >
              <pre className='whitespace-break-spaces'>{formatDetails(activity)}</pre>
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

export default TimelineItem;