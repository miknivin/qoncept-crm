import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PipelineHeader from "@/components/page-components/PipelineHeader";
import PipelineTableOne from "@/components/tables/PipelineTableOne";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Qoncept CRM",
  description:"",
};

export default function Pipelines() {
  return (
    <div>
      <PageBreadcrumb pageTitle="pipelines"/>
      <PipelineHeader/>
      <div className="space-y-6">
          <PipelineTableOne />
      </div>
    </div>
  );
}
