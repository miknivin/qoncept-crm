import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import MobilePipelineBody from "@/components/form/pipeline-mobile";

export const metadata: Metadata = {
  title: "Qoncept CRM",
  description: "View and manage your CRM pipelines",
};

export default async function Pipelines({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; 

  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Pipelines" />
      <MobilePipelineBody pipelineId={id} />
    </div>
  );
}