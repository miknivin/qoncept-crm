'use client';

import React from 'react';
import TimelineItem from './TimeLineItem';
import { ResponseActivity } from './../../../app/redux/api/contactApi';

interface TimelineProps {
  activities?: ResponseActivity[];
}

const Timeline: React.FC<TimelineProps> = ({ activities }) => {
  return (
    <ol className="relative border-s border-gray-200 dark:border-gray-700">
      {activities&& activities.map((activity, index) => (
        <TimelineItem
          key={index}
          activity={activity}
        />
      ))}
    </ol>
  );
};

export default Timeline;