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
  console.log('called');
  
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
      const activitiesParam = searchParams.get("activities");
      console.log(activitiesParam,'activityparam');
      
      let activities: { value: string; isNot: boolean }[] | undefined = undefined;
      if (activitiesParam) {
        try {
          const parsed = JSON.parse(activitiesParam);
          console.log(parsed,'parsed');
          
          if (Array.isArray(parsed)) {
            activities = parsed;
          }
        } catch (e) {
          console.error("Invalid activities param:", e);
        }
      }
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
              startDate:searchParams.get("startDate") || undefined,
              endDate:searchParams.get("endDate") || undefined,
              activities,
            };
            // Call fetchContactsByStage with a single object argument
            const data = await fetchContactsByStage({
              pipelineId,
              stageId: stage._id,
              ...filters,
            });
            //console.log(data);
            
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