// src/hooks/useEventForm.ts
import { useState, useEffect } from "react";
import { ICalendarEvent } from './../components/calendar/Calendar';



interface EventFormState {
  eventTitle: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLevel: string;
  errors: { title?: string; startDate?: string; level?: string };
}

export const useEventForm = (selectedEvent: ICalendarEvent | null) => {
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("");
  const [errors, setErrors] = useState<EventFormState["errors"]>({});

  // Populate form fields when editing an event
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (selectedEvent) {
      const startDate = selectedEvent.start ? new Date(selectedEvent.start) : null;
      const formattedStart = startDate && !isNaN(startDate.getTime())
        ? startDate.toISOString().split("T")[0]
        : today;

      const endDate = selectedEvent.end ? new Date(selectedEvent.end) : null;
      const formattedEnd = endDate && !isNaN(endDate.getTime())
        ? endDate.toISOString().split("T")[0]
        : "";

      setEventTitle(selectedEvent.title || "");
      setEventStartDate(formattedStart);
      setEventEndDate(formattedEnd);
      setEventLevel(selectedEvent.extendedProps.calendar || "");
      setErrors({});
    } else {
      resetForm();
    }
  }, [selectedEvent]);

  const resetForm = () => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("");
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: EventFormState["errors"] = {};
    if (!eventTitle) newErrors.title = "Event title is required";
    if (!eventStartDate) newErrors.startDate = "Start date is required";
    if (!eventLevel) newErrors.level = "Event color is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    eventTitle,
    setEventTitle,
    eventStartDate,
    setEventStartDate,
    eventEndDate,
    setEventEndDate,
    eventLevel,
    setEventLevel,
    errors,
    validateForm,
    resetForm,
  };
};