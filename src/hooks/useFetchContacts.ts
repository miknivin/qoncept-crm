import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchContactsByStage, GetContactsResponse } from "@/helpers/fetchContactsByStage";

interface ContactQueryState {
  data?: GetContactsResponse;
  isLoading: boolean;
  error?: unknown;
}

export const useFetchContacts = (
  pipelineId: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  localStages: Array<{ _id: string; [key: string]: any }>
) => {
  const searchParams = useSearchParams();
  const [contactQueries, setContactQueries] = useState<{ [stageId: string]: ContactQueryState }>({});

  useEffect(() => {
    if (!pipelineId || !localStages.length) {
      setContactQueries({});
      return;
    }

    const fetchContacts = async () => {
      const queries: { [stageId: string]: ContactQueryState } = {};

      // Initialize loading state for each stage
      localStages.forEach((stage) => {
        if (stage._id) {
          queries[stage._id] = { isLoading: true };
        }
      });
      setContactQueries(queries);

      // Fetch contacts for each stage with filters
      await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        localStages.map(async (stage: any) => {
          if (!stage._id) return;
          try {
            const filters = {
              keyword: searchParams.get("keyword") || undefined,
              source: searchParams.get("source") || undefined,
              assignedTo: searchParams.get("assignedTo") || undefined,
            };
            // Call fetchContactsByStage with a single object argument
            const data = await fetchContactsByStage({
              pipelineId,
              stageId: stage._id,
              ...filters,
            });
            console.log(data);
            
            setContactQueries((prev) => ({
              ...prev,
              [stage._id]: { data, isLoading: false },
            }));
          } catch (error) {
            setContactQueries((prev) => ({
              ...prev,
              [stage._id]: { error, isLoading: false },
            }));
          }
        })
      );
    };

    fetchContacts();
  }, [localStages, pipelineId, searchParams]);

  return { contactQueries };
};