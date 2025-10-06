/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { ResponseContact, useGetContactResponsesQuery } from '@/app/redux/api/contactApi';
import { toast } from 'react-toastify';
import VeryShortSpinnerPrimary from '@/components/ui/loaders/veryShortSpinnerPrimary';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import ContactResponseCard from './ContactResponseCard';

interface ReadOnlyContactDisplayProps {
  contact: ResponseContact;
}

interface ContactData {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  businessName?: string;
}

const ReadOnlyContactDisplay: React.FC<ReadOnlyContactDisplayProps> = ({ contact }) => {
  const [contactData, setContactData] = useState<ContactData>({
    name: '',
    email: '',
    phone: '',
    notes: '',
    businessName: '',
  });
  const { data: responsesData, isLoading: isResponsesLoading, error: responsesError } = useGetContactResponsesQuery(contact._id);

  // Pre-populate contact data
  useEffect(() => {
    if (contact) {
      setContactData({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        notes: contact.notes || '',
        businessName: contact.businessName || '',
      });
    }
  }, [contact]);

  const handleResponseUpdate = (responseId: string) => {
    toast.info(`Update response with ID: ${responseId}`);
    // Example: router.push(`/contacts/${contact._id}/response/${responseId}/edit`);
  };

  return (
    <div className="space-y-6 sticky top-1 md:top-20">
      <div>
        <label
          htmlFor="name"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
        >
          Name
        </label>
        <div
          id="name"
          className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          {contactData.name}
        </div>
      </div>
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
        >
          Email
        </label>
        <div
          id="email"
          className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          {contactData.email}
        </div>
      </div>
      <div>
        <label
          htmlFor="phone"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
        >
          Phone
        </label>
        <div
          id="phone"
          className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          {contactData.phone}
        </div>
      </div>
      <div>
        <label
          htmlFor="businessName"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
        >
          Business Name
        </label>
        <div
          id="businessName"
          className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          {contactData.businessName || 'N/A'}
        </div>
      </div>
      <div>
        <label
          htmlFor="notes"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
        >
          Notes
        </label>
        <div
          id="notes"
          className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          {contactData.notes || 'N/A'}
        </div>
      </div>

      {/* Contact Responses Section */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-start text-gray-900 dark:text-white mb-4">
          Contact Activity History
        </h2>
        {isResponsesLoading ? (
          <div className="flex justify-center">
            <VeryShortSpinnerPrimary />
          </div>
        ) : responsesError ? (
          <p className="text-red-500 text-sm">
            Failed to load contact responses: {(responsesError as any)?.data?.message || 'Unknown error'}
          </p>
        ) : responsesData && responsesData.length > 0 ? (
          <Swiper
            modules={[Navigation, Pagination]}
            spaceBetween={24}
            slidesPerView={1}
            breakpoints={{
              768: {
                slidesPerView: 2,
              },
            }}
            pagination={{ clickable: true }}
            className="mySwiper"
          >
            {responsesData.map((response) => (
              <SwiperSlide key={response._id}>
                <ContactResponseCard
                  response={response}
                  onUpdate={handleResponseUpdate}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No activity history available for this contact.
          </p>
        )}
      </div>
    </div>
  );
};

export default ReadOnlyContactDisplay;