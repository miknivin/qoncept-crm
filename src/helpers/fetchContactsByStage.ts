import axios from "axios";

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Tag {
  user: string;
  name: string;
}

interface AssignedTo {
  user: User;
  time: string;
}

interface Contact {
  assignedTo?: AssignedTo[];
  _id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  businessName?: string;
  source?: string;
  user?: { name: string; email: string };
  tags: Tag[];
  pipelinesActive: Array<{ pipeline_id: string; stage_id: string; order: number }>;
  createdAt: Date;
  updatedAt: Date;
  probability?: number;
}

export interface GetContactsResponse {
  contacts: Contact[];
}

interface FetchContactsByStageParams {
  pipelineId: string;
  stageId: string;
  keyword?: string;
  source?: string;
  startDate?: string; // Updated to string | undefined
  endDate?: string;   // Updated to string | undefined
  assignedTo?: string;
}

export async function fetchContactsByStage({
  pipelineId,
  stageId,
  keyword,
  source,
  startDate,
  endDate,
  assignedTo,
}: FetchContactsByStageParams): Promise<GetContactsResponse> {
  try {
    // Validate dates before including them in the request
    const params: { [key: string]: string } = {
      pipelineId,
      stageId,
    };
    if (keyword) params.keyword = keyword;
    if (source) params.source = source;
    if (assignedTo) params.assignedTo = assignedTo;
    if (startDate && !isNaN(Date.parse(startDate))) params.startDate = startDate;
    if (endDate && !isNaN(Date.parse(endDate))) params.endDate = endDate;

    const response = await axios.get("/api/contacts/by-stage", {
      params,
      withCredentials: true,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching contacts by stage:", error);
    throw new Error("Failed to fetch contacts");
  }
}