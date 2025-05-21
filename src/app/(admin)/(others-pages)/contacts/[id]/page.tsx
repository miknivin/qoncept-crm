import { Metadata } from "next";
import React from "react";
import ContactByIdHeader from "@/components/page-components/ContactByIdHeader";
import ContactByIdWrapper from "@/components/contact/ContactByIdWrapper";

export const metadata: Metadata = {
  title: "Qoncept CRM",
  description: "",
};

export default async function Contacts({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Extract id from params

  return (
    <div>
      <ContactByIdHeader contactId={id} />
      <ContactByIdWrapper contactId={id} />
    </div>
  );
}