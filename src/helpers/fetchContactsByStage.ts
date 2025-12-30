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
  startDate?: string;
  endDate?: string;
  assignedTo?: string;
  activities?: { value: string; isNot: boolean }[]; // ← NEW: Activity filter
}

export async function fetchContactsByStage({
  pipelineId,
  stageId,
  keyword,
  source,
  startDate,
  endDate,
  assignedTo,
  activities,
}: FetchContactsByStageParams): Promise<GetContactsResponse> {
  try {
    const params: { [key: string]: string } = {
      pipelineId,
      stageId,
    };

    if (keyword) params.keyword = keyword;
    if (source) params.source = source;
    if (assignedTo) params.assignedTo = assignedTo;

    // Validate and add dates
    if (startDate && !isNaN(Date.parse(startDate))) {
      params.startDate = startDate;
    }
    if (endDate && !isNaN(Date.parse(endDate))) {
      params.endDate = endDate;
    }

    // ← NEW: Add activities as JSON string if present
    if (activities && activities.length > 0) {
      params.activities = JSON.stringify(activities);
    }

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