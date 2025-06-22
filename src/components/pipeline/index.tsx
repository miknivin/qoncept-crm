/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import { useGetPipelineByIdQuery } from "@/app/redux/api/pipelineApi";
import ShortSpinnerPrimary from "@/components/ui/loaders/ShortSpinnerPrimary";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableStage from "./SortableStage";
import SortableContact from "./SortableContact";
import { fetchContactsByStage } from "@/helpers/fetchContactsByStage";
import ContactDragOverlay from "./ContactDragOverlay";
import { get, set, del } from "idb-keyval";
import Swal from "sweetalert2";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { useBatchUpdateContactDragMutation } from "@/app/redux/api/contactApi";
import { useModal } from "@/hooks/useModal";
import PipelineOffCanvas from "@/components/ui/drawer/PipelineOffCanvas";
import Button from "@/components/ui/button/Button";
import FilterIcons from "@/components/ui/flowbiteIcons/Filter";
import { useFetchContacts } from "@/hooks/useFetchContacts";
import { Tag } from "@/app/models/Contact";

interface Contact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  tag?:Tag
  businessName?: string;
  probability?: number;
}

interface Stage {
  _id: string;
  name: string;
  order: number;
  probability: number;
}

interface ContactQueryState {
  data?: { contacts: Contact[] };
  error?: any;
  isLoading: boolean;
}

interface BatchUpdate {
  contactId: string;
  pipelineId: string;
  stageId: string;
  order: number;
  userId?: string;
}

const STORAGE_KEY = "pipeline-drag-updates";

export default function PipelineBody({ pipelineId }: { pipelineId: string }) {
  const { data, error, isLoading } = useGetPipelineByIdQuery(pipelineId, { skip: !pipelineId });
  const { isOpen: isFilterOpen, openModal: openFilter, closeModal: closeFilter } = useModal();
  const [batchUpdateContactDrag] = useBatchUpdateContactDragMutation();
  const [localStages, setLocalStages] = useState<Stage[]>(data?.pipeline?.stages || []);
  const [localContacts, setLocalContacts] = useState<{
    [stageId: string]: Contact[];
  }>({});
  const { contactQueries } = useFetchContacts(pipelineId, localStages);
  
  const [draggedContact, setDraggedContact] = useState<Contact | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<BatchUpdate[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
// const { contactQueries } = useFetchContacts(pipelineId, localStages);
  // Sync localStages when data changes
  useEffect(() => {
    if (data?.pipeline?.stages) {
      setLocalStages(data.pipeline.stages);
    }
  }, [data]);


  useEffect(() => {
    const newContacts: typeof localContacts = {};
    localStages.forEach((stage) => {
      const query = contactQueries[stage._id];
      if (stage._id && query?.data?.contacts && !query.isLoading && !query.error) {
        newContacts[stage?._id] = query.data.contacts.map((contact) => ({
          _id: contact._id,
          name: contact.name || "Unnamed",
          email: contact.email || "No email",
          businessName:contact?.businessName||"Nil",
          tags: contact.tags || [],
          phone: contact.phone || "No ph no",
          probability:contact.probability||50
        }));
      }
    });
    setLocalContacts(newContacts);
  }, [contactQueries, localStages]);

  // IndexedDB helpers
  const saveUpdatesToIndexedDB = async (updates: BatchUpdate[]) => {
    await set(STORAGE_KEY, updates);
    setHasUnsavedChanges(updates.length > 0);
  };

  const getUpdatesFromIndexedDB = async (): Promise<BatchUpdate[]> => {
    return (await get(STORAGE_KEY)) || [];
  };

  const clearIndexedDB = async () => {
    await del(STORAGE_KEY);
    setHasUnsavedChanges(false);
  };

  // Load pending updates from IndexedDB on mount
  useEffect(() => {
    const loadUpdates = async () => {
      const updates = await getUpdatesFromIndexedDB();
      setPendingUpdates(updates);
      setHasUnsavedChanges(updates.length > 0);
    };
    loadUpdates();
  }, []);

  // Autosave every 8 seconds
  useEffect(() => {
    const timer = setInterval(async () => {
      if (pendingUpdates.length > 0 && !isSaving) {
        await saveToBackend();
      }
    }, 8000);

    return () => clearInterval(timer);
  }, [pendingUpdates, isSaving]);

  const saveToBackend = async () => {
    if (pendingUpdates.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      await batchUpdateContactDrag({ updates: pendingUpdates }).unwrap();
      await clearIndexedDB();
      setPendingUpdates([]);
      toast.success("Contact updates saved successfully");
    } catch (error) {
      toast.error("Failed to save contact updates");
    } finally {
      setIsSaving(false);
    }
  };

  // Merge new updates with existing ones, keeping only the latest per contact
  const mergeUpdates = (newUpdates: BatchUpdate[], prevUpdates: BatchUpdate[]): BatchUpdate[] => {
    const updateMap = new Map<string, BatchUpdate>();

    // Add previous updates
    prevUpdates.forEach((update) => {
      const key = `${update.contactId}-${update.pipelineId}-${update.stageId}`;
      updateMap.set(key, update);
    });

    // Add new updates, overwriting duplicates
    newUpdates.forEach((update) => {
      const key = `${update.contactId}-${update.pipelineId}-${update.stageId}`;
      updateMap.set(key, update);
    });

    return Array.from(updateMap.values());
  };

  // Handle navigation warnings
  useEffect(() => {
    const handleBeforePopState = async () => {
      console.log('before pop');
      
      if (hasUnsavedChanges) {
        const result = await Swal.fire({
          title: "Unsaved Changes",
          text: "You have unsaved contact changes. Do you want to save them before leaving?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Save",
          cancelButtonText: "Discard",
        });

        if (result.isConfirmed) {
          await saveToBackend();
          return true;
        } else {
          await clearIndexedDB();
          setPendingUpdates([]);
          return true;
        }
      }
      return true;
    };

    // Track route changes via pathname/searchParams
    const handleRouteChange = async () => {
      if (hasUnsavedChanges) {
        const result = await Swal.fire({
          title: "Unsaved Changes",
          text: "You have unsaved contact changes. Do you want to save them before leaving?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Save",
          cancelButtonText: "Discard",
        });

        if (result.isConfirmed) {
          await saveToBackend();
        } else {
          await clearIndexedDB();
          setPendingUpdates([]);
        }
      }
    };

    // Handle browser back/forward
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = async (event) => {
      event.preventDefault();
      const canNavigate = await handleBeforePopState();
      if (canNavigate) {
        window.history.back();
      } else {
        window.history.pushState(null, "", window.location.href);
      }
    };

    // Handle client-side navigation
    const previousPath = pathname + searchParams.toString();
    return () => {
      if (previousPath !== pathname + searchParams.toString()) {
        handleRouteChange();
      }
      window.onpopstate = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, pathname, searchParams]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => {
    if (event.active.id.startsWith("contact-")) {
      const contactId = event.active.id.replace("contact-", "");
      const stageId = event.active.data.current?.stageId;
      const contact = localContacts[stageId]?.find((c) => c._id === contactId);
      if (contact) {
        setDraggedContact(contact);
      }
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    setDraggedContact(null); // Clear the dragged contact

    if (!over) return;

    // Stage drag-and-drop (client-side only)
    if (active.id.startsWith("stage-")) {
      const stageId = active.id.replace("stage-", "");
      if (stageId !== over.id.replace("stage-", "")) {
        const oldIndex = localStages.findIndex((stage) => stage._id === stageId);
        const newIndex = localStages.findIndex((stage) => stage._id === over.id.replace("stage-", ""));
        const newStages = [...localStages];
        const [movedStage] = newStages.splice(oldIndex, 1);
        newStages.splice(newIndex, 0, movedStage);
        const updatedStages = newStages.map((stage, index) => ({
          ...stage,
          order: index + 1,
        }));
        setLocalStages(updatedStages);
      }
    }
    // Contact drag-and-drop
    else if (active.id.startsWith("contact-")) {
      const contactId = active.id.replace("contact-", "");
      const sourceStageId = active.data.current?.stageId;
      const destinationStageId = over.id.startsWith("stage-")
        ? over.id.replace("stage-", "")
        : over.data.current?.stageId;

      if (!destinationStageId) return;

      // Within same stage (reorder, client-side with backend update)
      if (sourceStageId === destinationStageId) {
        const contacts = [...(localContacts[sourceStageId] || [])];
        const oldIndex = contacts.findIndex((contact) => contact._id === contactId);
        const newIndex = over.id.startsWith("contact-")
          ? contacts.findIndex((contact) => contact._id === over.id.replace("contact-", ""))
          : contacts.length; // Dropped on stage
        if (oldIndex !== newIndex && newIndex !== -1) {
          const [movedContact] = contacts.splice(oldIndex, 1);
          contacts.splice(newIndex, 0, movedContact);
          setLocalContacts({ ...localContacts, [sourceStageId]: contacts });

          // Update order for all contacts in the stage
          const updates = contacts.map((contact, index) => ({
            contactId: contact._id,
            pipelineId,
            stageId: sourceStageId,
            order: index + 1,
            // userId: authContext?.userId, // Uncomment if auth context is available
          }));
          const mergedUpdates = mergeUpdates(updates, pendingUpdates);
          setPendingUpdates(mergedUpdates);
          saveUpdatesToIndexedDB(mergedUpdates);
        }
      }
      // Between stages (move, save to backend)
      else {
        const sourceContacts = [...(localContacts[sourceStageId] || [])];
        const destContacts = [...(localContacts[destinationStageId] || [])];
        const contactIndex = sourceContacts.findIndex((contact) => contact._id === contactId);
        if (contactIndex !== -1) {
          const [movedContact] = sourceContacts.splice(contactIndex, 1);
          const newIndex = over.id.startsWith("contact-")
            ? destContacts.findIndex((contact) => contact._id === over.id.replace("contact-", ""))
            : destContacts.length; // Dropped on stage
          destContacts.splice(newIndex !== -1 ? newIndex : destContacts.length, 0, movedContact);
          setLocalContacts({
            ...localContacts,
            [sourceStageId]: sourceContacts,
            [destinationStageId]: destContacts,
          });

          // Update order for destination stage contacts
          const updates = destContacts.map((contact, index) => ({
            contactId: contact._id,
            pipelineId,
            stageId: destinationStageId,
            order: index + 1,
            // userId: authContext?.userId, // Uncomment if auth context is available
          }));
          const mergedUpdates = mergeUpdates(updates, pendingUpdates);
          setPendingUpdates(mergedUpdates);
          saveUpdatesToIndexedDB(mergedUpdates);
        }
      }
    }
  };

  return (
    <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 overflow-hidden">
      <div className="mx-auto w-full text-center">
        {isLoading && (
          <div className="flex justify-center">
            <ShortSpinnerPrimary />
          </div>
        )}
        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 sm:text-base">
            Error: {(error as any).data?.error || "Failed to fetch pipeline"}
          </p>
        )}
        {!isLoading && !error && !data?.pipeline && (
          <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Pipeline not found
          </p>
        )}
        {!isLoading && !error && data?.pipeline && (
          <>
            <div className="flex justify-between my-2">
              <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl pt-2">
                {data.pipeline.name}
              </h3>
              <div className="flex gap-3 items-center">
                <Button size="sm" variant="outline" endIcon={<FilterIcons />} onClick={() => openFilter()}>
                  Filter
                </Button>
                {pendingUpdates.length > 0 && (
                  <button
                    type="button"
                    className={`text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 h-fit py-2.5 me-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={saveToBackend}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
              )}
              </div>
             
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 sm:text-base max-w-[70vw]">
              {localStages.length === 0 ? (
                <p className="text-center">No stages available</p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div
                    role="list"
                    className="flex flex-nowrap gap-4 overflow-x-auto pb-4 w-full mt-10 min-h-[70dvh]"
                  >
                    {[...localStages]
                      ?.sort((a, b) => a.order - b.order)
                      .map((stage, index, array) => (
                        <div
                          key={stage._id}
                          id={`stage-${stage._id}`}
                          className="mb-4 min-w-[250px] rounded border border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-auto"
                          role="group"
                          aria-label={`Stage: ${stage.name}`}
                        >
                          <SortableStage stage={stage} count={localContacts[stage._id]?.length || 0} isFinalThree={index >= array.length - 3}/>
                          <div className="mx-2 mt-2 drop-target">
                            {contactQueries[stage._id]?.isLoading ? (
                              <div className="flex justify-center my-2">
                                <ShortSpinnerPrimary />
                              </div>
                            ) : contactQueries[stage._id]?.error ? (
                              <p className="text-xs text-red-500 dark:text-red-400">
                                Error loading contacts
                              </p>
                            ) : (
                              <div role="list" className="space-y-2">
                                {(localContacts[stage._id] || []).map((contact) => (
                                  <SortableContact
                                    key={contact._id}
                                    contact={contact}
                                    data={{ stageId: stage._id || "" }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                  <DragOverlay>
                    {draggedContact ? (
                      <ContactDragOverlay contact={draggedContact} />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </>
        )}
      </div>
      <PipelineOffCanvas isOpen={isFilterOpen} onClose={closeFilter} />
    </div>
  );
}