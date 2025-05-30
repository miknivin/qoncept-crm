'use client';

import React, { useState, useEffect } from 'react';
import { ResponseContact, useUpdateContactMutation } from '@/app/redux/api/contactApi';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Chip from '@/components/ui/chips/Chip';

interface UpdateContactFormProps {
  contact: ResponseContact;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tags: { name: string; user?: any }[];
}

const UpdateContactForm: React.FC<UpdateContactFormProps> = ({ contact }) => {
  const router = useRouter();
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation();
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    notes: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState('');

  // Pre-populate form with contact data
  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        notes: contact.notes || '',
        tags: contact.tags,
      });
    }
  }, [contact]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagAdd = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      setTagError('Tag cannot be empty');
      return;
    }
    if (formData.tags.some((t) => t.name === trimmedTag)) {
      setTagError('Tag already exists');
      return;
    }
    // Backend will set the user field for tags
    setFormData((prev) => ({
      ...prev,
      tags: [...prev.tags, { name: trimmedTag, user: '' }], // user will be set in backend
    }));
    setTagInput('');
    setTagError('');
  };

  const handleTagRemove = (tagName: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t.name !== tagName),
    }));
    setTagError('');
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Remove user field from tags before sending, as backend will set it
      const payload = {
        id: contact._id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
        tags: formData.tags.map((tag) => ({ name: tag.name })), // Send only name
      };
      const result = await updateContact(payload).unwrap();
      if (result.success) {
        router.push('/contacts');
        toast.success('Contact updated successfully');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error updating contact:', error);
      const errorMessage = error.data?.message || 'Failed to update contact';
      const errorDetails = error?.data?.errors?.join(', ') || '';
      toast.error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6 sticky top-1 md:top-20">
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
          htmlFor="tags"
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
        >
          Tags (Optional)
        </label>
        <div
          className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus-within:border-brand-800"
          role="group"
          aria-label="Enter tags"
        >
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map((tag) => (
              <Chip key={tag.name} text={tag.name} onRemove={() => handleTagRemove(tag.name)} />
            ))}
          </div>
          <input
            id="tags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagInput.trim()) {
                e.preventDefault();
                handleTagAdd(tagInput);
              }
            }}
            onBlur={() => {
              if (tagInput.trim()) {
                handleTagAdd(tagInput);
              }
            }}
            placeholder="Add a tag..."
            className="w-full outline-none text-sm text-gray-800 bg-transparent placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30"
            aria-label="Add new tag"
          />
          {tagError && <p className="text-red-500 text-sm mt-1">{tagError}</p>}
        </div>
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
      <button
        type="submit"
        disabled={isUpdating}
        className="w-full h-11 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-brand-600 dark:hover:bg-brand-700 disabled:opacity-50"
      >
        {isUpdating ? 'Updating...' : 'Submit'}
      </button>
    </form>
  );
};

export default UpdateContactForm;