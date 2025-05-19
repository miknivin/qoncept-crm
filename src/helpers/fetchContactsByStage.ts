import axios from "axios";

interface Contact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  user?: { name: string; email: string };
  tags: Array<{ user: { name: string; email: string }; name: string }>;
  pipelinesActive: Array<{ pipeline_id: string; stage_id: string }>;
  createdAt: Date;
  updatedAt: Date;
}

interface GetContactsResponse {
  contacts: Contact[];
}

export async function fetchContactsByStage(pipelineId: string, stageId: string): Promise<GetContactsResponse> {
  try {
    const response = await axios.get("/api/contacts/by-stage", {
      params: { pipelineId, stageId },
      withCredentials: true,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching contacts by stage:", error);
    throw "Failed to fetch contacts";
  }
}