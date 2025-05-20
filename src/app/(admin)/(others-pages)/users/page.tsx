import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PipelineHeader from "@/components/page-components/PipelineHeader";
import PipelineTableOne from "@/components/tables/PipelineTableOne";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Qoncept CRM",
  description:"",
};

export default function Users() {
  return (
    <div>
      <PageBreadcrumb pageTitle="users"/>
      <PipelineHeader/>
      <div className="space-y-6">
          <PipelineTableOne />
      </div>
    </div>
  );
}
