/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { ResponseContact, useUpdateContactMutation, useGetContactResponsesQuery } from '@/app/redux/api/contactApi';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import VeryShortSpinnerPrimary from '@/components/ui/loaders/veryShortSpinnerPrimary';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import ContactResponseCard from './ContactResponseCard';

interface UpdateContactFormProps {
  contact: ResponseContact;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  businessName?: string;
}

const UpdateContactForm: React.FC<UpdateContactFormProps> = ({ contact }) => {
  const router = useRouter();
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation();
  const { data: responsesData, isLoading: isResponsesLoading, error: responsesError } = useGetContactResponsesQuery(contact._id);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    notes: '',
    businessName: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Pre-populate form with contact data
  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        notes: contact.notes || '',
        businessName: contact.businessName || '',
      });
    }
  }, [contact]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        id: contact._id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
        businessName: formData.businessName,
      };
      const result = await updateContact(payload).unwrap();
      if (result.success) {
        router.push('/contacts');
        toast.success('Contact updated successfully');
      }
    } catch (error: any) {
      console.error('Error updating contact:', error);
      const errorMessage = error.data?.message || 'Failed to update contact';
      const errorDetails = error?.data?.errors?.join(', ') || '';
      setError(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      toast.error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
    }
  };

  const handleResponseUpdate = (responseId: string) => {
    toast.info(`Update response with ID: ${responseId}`);
    // Example: router.push(`/contacts/${contact._id}/response/${responseId}/edit`);
  };

  return (
    <div className="space-y-6 sticky top-1 md:top-20">
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            required
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            required
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Phone
          </label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            required
          />
        </div>
        <div>
          <label
            htmlFor="businessName"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Business Name
          </label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            value={formData.businessName}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>
        <div>
          <label
            htmlFor="notes"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            rows={4}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={isUpdating}
          className="w-full h-11 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-brand-600 dark:hover:bg-brand-700 disabled:opacity-50"
        >
          {isUpdating ? 'Updating...' : 'Submit'}
        </button>
      </form>

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

export default UpdateContactForm;