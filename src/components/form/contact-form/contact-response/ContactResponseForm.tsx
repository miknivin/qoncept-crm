"use client";
import React, { useState, useEffect } from "react";
import Button from "@/components/ui/button/Button";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";
import { useCreateContactResponseMutation, useUpdateContactResponseMutation, useGetContactResponseByIdQuery } from "@/app/redux/api/contactApi";
import { useCreateCalendarEventMutation } from "@/app/redux/api/contactApi";
import { toast } from "react-toastify";

interface Contact {
  _id: string;
  name?: string;
}

interface ContactResponseFormProps {
  contact: Contact;
  onClose: () => void;
  isUpdate?: boolean;
  contactResponseId?: string;
}

type ActivityType =
  | "HAD_CONVERSATION"
  | "CALLED_NOT_PICKED"
  | "CALLED_INVALID"
  | "CALLED_SWITCHED_OFF"
  | "WHATSAPP_COMMUNICATED"
  | "ONLINE_MEETING_SCHEDULED"
  | "OFFLINE_MEETING_SCHEDULED"
  | "ONLINE_MEETING_CONFIRMED"
  | "OFFLINE_MEETING_CONFIRMED"
  | "PROPOSAL_SHARED"
  | "PAYMENT_DONE_ADVANCE"
  | "PAYMENT_DONE_PENDING"
  | "FULL_PAYMENT_DONE"
  | "PAYMENT_DONE_MONTHLY"
  | "OTHER";

const ContactResponseForm: React.FC<ContactResponseFormProps> = ({ contact, onClose, isUpdate = false, contactResponseId }) => {
  const { data: responseData, isLoading: isResponseLoading } = useGetContactResponseByIdQuery(
    { contactId: contact._id, responseId: contactResponseId! },
    { skip: !isUpdate || !contactResponseId }
  );

  const [activity, setActivity] = useState<ActivityType>("HAD_CONVERSATION");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [minDate, setMinDate] = useState("");
  const [createContactResponse, { isLoading: isContactLoading }] = useCreateContactResponseMutation();
  const [updateContactResponse, { isLoading: isUpdateLoading }] = useUpdateContactResponseMutation();
  const [createCalendarEvent, { isLoading: isEventLoading }] = useCreateCalendarEventMutation();

  const activityOptions: ActivityType[] = [
    "HAD_CONVERSATION",
    "CALLED_NOT_PICKED",
    "CALLED_INVALID",
    "CALLED_SWITCHED_OFF",
    "WHATSAPP_COMMUNICATED",
    "ONLINE_MEETING_SCHEDULED",
    "OFFLINE_MEETING_SCHEDULED",
    "ONLINE_MEETING_CONFIRMED",
    "OFFLINE_MEETING_CONFIRMED",
    "PROPOSAL_SHARED",
    "PAYMENT_DONE_ADVANCE",
    "PAYMENT_DONE_PENDING",
    "FULL_PAYMENT_DONE",
    "PAYMENT_DONE_MONTHLY",
    "OTHER",
  ];

  const meetingActivities: ActivityType[] = [
    "ONLINE_MEETING_SCHEDULED",
    "OFFLINE_MEETING_SCHEDULED",
    "ONLINE_MEETING_CONFIRMED",
    "OFFLINE_MEETING_CONFIRMED",
  ];

  const requiresDate = meetingActivities.includes(activity);
  const isLoading = isContactLoading || isEventLoading || isUpdateLoading;

  useEffect(() => {
    const now = new Date();

    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000; // in milliseconds
    const istDate = new Date(now.getTime() + istOffset);

    // Format to 'YYYY-MM-DDTHH:MM'
    const offsetMinutes = now.getTimezoneOffset(); // subtract to get local time
    const localDate = new Date(istDate.getTime() - offsetMinutes * 60000);
    const localFormatted = localDate.toISOString().slice(0, 16);

    setMinDate(localFormatted);
  }, []);
  // Pre-fill form with response data in update mode
useEffect(() => {
  if (isUpdate && responseData?.data) {
    console.log("responseData.data:", responseData.data); // Debugging
    setActivity(responseData.data.activity || "HAD_CONVERSATION");
    setNote(responseData.data.note || "");
    if (responseData.data.meetingScheduledDate) {
      const meetingDate = new Date(responseData.data.meetingScheduledDate);
      if (!isNaN(meetingDate.getTime())) {
        setDate(meetingDate.toISOString().slice(0, 16));
      } else {
        console.warn("Invalid meetingScheduledDate:", responseData.data.meetingScheduledDate);
        setDate("");
      }
    } else {
      setDate("");
    }
  }
}, [isUpdate, responseData]);

  const handleActivityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newActivity = e.target.value as ActivityType;
    setActivity(newActivity);
    if (!meetingActivities.includes(newActivity)) {
      setDate("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!activity) {
      setError("Please select an activity");
      return;
    }

    if (requiresDate && !date) {
      setError("Please select a date for the meeting");
      return;
    }

    try {
      let contactResponseIdForEvent = contactResponseId;

      // Handle create or update contact response
      if (isUpdate && contactResponseId) {
        await updateContactResponse({
          contactId: contact._id,
          responseId: contactResponseId,
          meetingScheduledDate:date,
          activity,
          note,
        }).unwrap();
      } else {
        const contactResponseResult = await createContactResponse({
          contactId: contact._id,
          meetingScheduledDate:date,
          activity,
          note,
        }).unwrap();
        contactResponseIdForEvent = contactResponseResult.id;
      }

      // Create calendar event only for new contact responses with meeting activities
      if (!isUpdate && requiresDate && date && contactResponseIdForEvent) {
        await createCalendarEvent({
          title: activity,
          start: new Date(date).toISOString(),
          end: new Date(date).toISOString(),
          allDay: false,
          extendedProps: { calendar: "Primary" },
          contactResponse: contactResponseIdForEvent,
        }).unwrap();
      }

      // Reset form
      setActivity("HAD_CONVERSATION");
      setNote("");
      setDate("");
      onClose();
      toast.success(isUpdate ? "Successfully updated" : "Successfully added");
    } catch (err) {
      console.error("Failed to process contact response or calendar event:", err);
      const errorMessage =
        (err as { data?: { message?: string } }).data?.message ||
        (err as Error).message ||
        `Failed to ${isUpdate ? "update" : "create"} contact response or calendar event`;
      setError(errorMessage);
    }
  };

  if (isUpdate && isResponseLoading) {
    return (
      <div className="text-center text-gray-700 dark:text-gray-400">
        <p>Loading response data...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg text-start font-semibold text-gray-900 dark:text-white">
        {isUpdate ? "Update Response" : "Add Response"} for {contact.name || "Contact"}
      </h2>

      <div>
        <label
          htmlFor="activity"
          className="mb-1.5 block text-start text-sm font-medium text-gray-700 dark:text-gray-400"
        >
          Activity
        </label>
        <select
          id="activity"
          value={activity}
          onChange={handleActivityChange}
          className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          required
          aria-label="Select activity"
        >
          <option value="" disabled>
            Select an activity
          </option>
          {activityOptions.map((option) => (
            <option key={option} value={option}>
              {option.replace(/_/g, " ").toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {requiresDate && (
        <div>
          <label
            htmlFor="date"
            className="mb-1.5 block text-start text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Meeting Date
          </label>
          <input
            type="datetime-local"
            id="date"
            value={date}
            min={minDate}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            required
            aria-label="Select meeting date"
          />
        </div>
      )}

      <div>
        <label
          htmlFor="note"
          className="mb-1.5 block text-start text-sm font-medium text-gray-700 dark:text-gray-400"
        >
          Note
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add note..."
          className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          rows={4}
          maxLength={1000}
          aria-label="Add note"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex justify-end space-x-2">
        <Button type="button" onClick={onClose} variant="outline">
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? <ShortSpinnerDark /> : isUpdate ? "Update Response" : "Save Response"}
        </Button>
      </div>
    </form>
  );
};

export default ContactResponseForm;