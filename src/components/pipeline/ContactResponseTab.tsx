
"use client";
import React, { useState } from "react";
import ContactResponseForm from "../form/contact-form/contact-response/ContactResponseForm";
import ContactResponseView from "./ContactResponseView";

interface Contact {
  _id: string;
  name?: string;
}

interface ContactResponseTabsProps {
  contact: Contact;
  onClose: () => void;
}

const ContactResponseTabs: React.FC<ContactResponseTabsProps> = ({ contact, onClose }) => {
  const [activeTab, setActiveTab] = useState("add-response");
  const [contactResponseId, setContactResponseId] = useState<string | undefined>(undefined);

  const handleUpdate = (responseId: string) => {
    setContactResponseId(responseId);
    setActiveTab("add-response");
  };

  return (
    <div>
      <ul className="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400">
        <li className="me-2">
          <button
            onClick={() => {
              setActiveTab("add-response");
              setContactResponseId(undefined);
            }}
            className={`inline-block p-4 rounded-t-lg ${
              activeTab === "add-response"
                ? "text-blue-600 bg-gray-100 active dark:bg-gray-800 dark:text-blue-500"
                : "hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            }`}
          >
            {contactResponseId ? "Update Response" : "Add Response"}
          </button>
        </li>
        <li className="me-2">
          <button
            onClick={() => {
              setActiveTab("view-responses");
              setContactResponseId(undefined);
            }}
            className={`inline-block p-4 rounded-t-lg ${
              activeTab === "view-responses"
                ? "text-blue-600 bg-gray-100 active dark:bg-gray-800 dark:text-blue-500"
                : "hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            }`}
          >
            View Responses
          </button>
        </li>
      </ul>

      <div className="p-4">
        {activeTab === "add-response" && (
          <ContactResponseForm
            contact={contact}
            onClose={onClose}
            isUpdate={!!contactResponseId}
            contactResponseId={contactResponseId}
          />
        )}
        {activeTab === "view-responses" && (
          <ContactResponseView contact={contact} onUpdate={handleUpdate} />
        )}
      </div>
    </div>
  );
};

export default ContactResponseTabs;