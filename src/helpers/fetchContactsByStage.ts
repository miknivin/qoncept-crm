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
  businessName?:string;
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
  assignedTo?: string;
}

export async function fetchContactsByStage({
  pipelineId,
  stageId,
  keyword,
  source,
  assignedTo,
}: FetchContactsByStageParams): Promise<GetContactsResponse> {
  try {
    const response = await axios.get("/api/contacts/by-stage", {
      params: {
        pipelineId,
        stageId,
        ...(keyword && { keyword }),
        ...(source && { source }),
        ...(assignedTo && { assignedTo }),
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching contacts by stage:", error);
    throw new Error("Failed to fetch contacts");
  }
}