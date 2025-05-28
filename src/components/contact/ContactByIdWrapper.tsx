'use client';

import React from 'react';

import UpdateContactForm from '@/components/form/contact-form/UpdateForm';
import Timeline from '@/components/ui/timeline/TimeLine';
import { useGetContactByIdQuery } from '@/app/redux/api/contactApi';

interface ContactByIdWrapperProps {
  contactId: string;
}

export default function ContactByIdWrapper({ contactId }: ContactByIdWrapperProps) {
  const { data, error, isLoading } = useGetContactByIdQuery(contactId);

  if (isLoading) return <div>Loading...</div>;
  if (error || !data?.success) return <div>Error loading contact</div>;

  const contact = data.data;
  console.log(contact,'contact');
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-7 p-6">
      <div>
        <UpdateContactForm contact={contact} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Activity Timeline
        </h2>
        <Timeline
          activities={
            contact.activities
          }
        />
      </div>
    </div>
  );
}