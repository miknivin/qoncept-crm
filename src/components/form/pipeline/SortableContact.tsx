"use client";
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PhoneIcon from "@/components/ui/flowbiteIcons/Phone";
import EmailIcon from "@/components/ui/flowbiteIcons/Email";
import TagIcon from "@/components/ui/flowbiteIcons/TagIcon";

interface Contact {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
//   pipelinesActive?: Array<{
//   pipeline_id: string;
//   stage_id: string;
//   order: number;
// }>;
}

interface SortableContactProps {
  contact: Contact;
  data: { stageId: string };
}

function SortableContact({ contact, data }: SortableContactProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: `contact-${contact._id}`,
    data,
  });
//console.log(contact,'contact');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: transform ? 0.8 : 1,
  };

  const stopPropagation = (event: React.MouseEvent | React.TouchEvent) => {
   // console.log("stopped");
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePhoneClick = () => {
    //console.log("phone clicked");
    if (contact.phone) {
      window.location.href = `tel:${contact.phone}`;
    }
  };

  const handleEmailClick = () => {
    if (contact.email) {
      window.location.href = `mailto:${contact.email}`;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="mb-2 rounded-md border border-gray-200 bg-white py-2 px-3 dark:border-gray-700 dark:bg-gray-800 hover:shadow-sm"
      role="listitem"
      aria-label={`Contact: ${contact.name || "Unnamed"}`}
    >
      <div className="flex justify-start items-start flex-col">
        {/* Draggable area */}
        <div {...listeners} className="w-full cursor-move text-left">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {contact.name || "Unnamed"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {contact.phone || "No phno"}
          </p>
        </div>
        {/* Button group - no drag listeners */}
        <div
          className="inline-flex rounded-md shadow-xs my-2"
          role="group"
          onMouseDown={stopPropagation}
          onTouchStart={stopPropagation}
        >
          <button
            type="button"
            onClick={handlePhoneClick}
            className={`inline-flex items-center px-2 py-2 text-sm font-medium text-gray-900 bg-transparent border border-gray-900 rounded-s-lg hover:bg-gray-900 hover:text-white focus:z-10 focus:ring-2 focus:ring-gray-500 focus:bg-gray-900 focus:text-white dark:border-white dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:bg-gray-700 ${
              !contact.phone ? "opacity-50 cursor-not-allowed" : ""
            }`}
            aria-label={`Call ${contact.name || "contact"}`}
          >
            <PhoneIcon />
          </button>
          <button
            type="button"
            role="button"
            onClick={handleEmailClick}
            disabled={!contact.email}
            className={`inline-flex items-center px-2 py-2 text-sm font-medium text-gray-900 bg-transparent border-t border-b border-gray-900 hover:bg-gray-900 hover:text-white focus:z-10 focus:ring-2 focus:ring-gray-500 focus:bg-gray-900 focus:text-white dark:border-white dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:bg-gray-700 ${
              !contact.email ? "opacity-50 cursor-not-allowed" : ""
            }`}
            aria-label={`Email ${contact.name || "contact"}`}
          >
            <EmailIcon />
          </button>
          <button
            type="button"
            role="button"
            className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-900 bg-transparent border border-gray-900 rounded-e-lg hover:bg-gray-900 hover:text-white focus:z-10 focus:ring-2 focus:ring-gray-500 focus:bg-gray-900 focus:text-white dark:border-white dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:bg-gray-700"
            aria-label={`View tags for ${contact.name || "contact"}`}
          >
            <TagIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

export default SortableContact;