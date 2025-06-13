"use client";
import React, { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PhoneIcon from "@/components/ui/flowbiteIcons/Phone";
import EmailIcon from "@/components/ui/flowbiteIcons/Email";
import NotesIcon from "@/components/ui/flowbiteIcons/Notes";
import { useUpdateProbabilityMutation } from "@/app/redux/api/contactApi";
import VeryShortSpinnerPrimary from "./../../ui/loaders/veryShortSpinnerPrimary";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import QRCodeModalContent from "@/components/qr-code/QRCodeModalContent";
import NotesAndTagsForm from "./NotesAndTagForm";

interface Tag {
  user: string;
  name: string;
}

interface Contact {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?:string;
  probability?: number;
  notes?: string;
  tags?: Tag[];
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

  const [probability, setProbability] = useState(contact.probability?.toString() || "50");
  const [updateProbability, { isLoading }] = useUpdateProbabilityMutation();
  const { isOpen: isQRModalOpen, openModal: openQRModal, closeModal: closeQRModal } = useModal();
  const { isOpen: isNotesModalOpen, openModal: openNotesModal, closeModal: closeNotesModal } = useModal();

  useEffect(() => {
    setProbability(contact.probability?.toString() || "50");
  }, [contact.probability]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: transform ? 0.8 : 1,
  };

  const stopPropagation = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePhoneClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (contact.phone) {
      window.open(`https://wa.me/${contact.phone}?text=Hy`, '_blank');
    }
  };

  const handleEmailClick = () => {
    if (contact.email) {
      window.location.href = `mailto:${contact.email}`;
    }
  };

  const handleProbabilitySlide = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProbability(e.target.value);
  };

  const handleProbabilityChange = async () => {
    try {
      await updateProbability({
        id: contact._id,
        probability: parseInt(probability),
      }).unwrap();
    } catch (error) {
      console.error("Failed to update probability:", error);
      setProbability(contact.probability?.toString() || "50");
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
        <div {...listeners} className="w-full cursor-move text-left">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {contact.name || "Unnamed"}
          </p>
          <p className="text-xs text-gray-500 line-clamp-2 dark:text-gray-400">
            {contact.businessName || "Nil"}
          </p>
          <a href={`tel:${contact.phone}`} className="text-xs underline text-gray-500 line-clamp-2 dark:text-gray-400">
            {contact.phone || "Nil"}
          </a>
          {
            contact?.tags && contact.tags.length > 0 && (
              contact.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm dark:bg-gray-700 dark:text-blue-400 border border-blue-400"
                >
                  {tag.name}
                </span>
              ))
            )
            }
          
        </div>
        <div className="flex flex-col justify-start items-start w-full">
          <div
            className="inline-flex rounded-md shadow-xs my-2"
            role="group"
            onMouseDown={stopPropagation}
            onTouchStart={stopPropagation}
          >
            <button
              type="button"
              onClick={handlePhoneClick}
              onContextMenu={(e) => {
                e.preventDefault();
                if (contact.phone) {
                  openQRModal();
                }
              }}
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
              onClick={openNotesModal}
              className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-900 bg-transparent border border-gray-900 rounded-e-lg hover:bg-gray-900 hover:text-white focus:z-10 focus:ring-2 focus:ring-gray-500 focus:bg-gray-900 focus:text-white dark:border-white dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:bg-gray-700"
              aria-label={`View notes and tags for ${contact.name || "contact"}`}
            >
              <NotesIcon />
            </button>
          </div>
          <div className="flex justify-between flex-row-reverse items-center gap-3 w-full">
            <label
              htmlFor={`probability-range-${contact._id}`}
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              {isLoading ? <VeryShortSpinnerPrimary /> : probability + "%"}
            </label>
            <input
              id={`probability-range-${contact._id}`}
              type="range"
              min="0"
              max="100"
              value={probability}
              onChange={handleProbabilitySlide}
              onMouseUp={handleProbabilityChange}
              onTouchEnd={handleProbabilityChange}
              disabled={isLoading}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        </div>
      </div>
      <Modal isOpen={isQRModalOpen} onClose={closeQRModal} className="max-w-[400px] p-6">
        <QRCodeModalContent contact={contact} onClose={closeQRModal} />
      </Modal>
      <Modal isOpen={isNotesModalOpen} onClose={closeNotesModal} className="max-w-[400px] p-6">
        <NotesAndTagsForm contact={contact} onClose={closeNotesModal} />
      </Modal>
    </div>
  );
}

export default SortableContact;