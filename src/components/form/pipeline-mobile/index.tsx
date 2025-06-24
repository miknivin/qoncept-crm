/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import { useGetPipelineByIdQuery } from "@/app/redux/api/pipelineApi";
import ShortSpinnerPrimary from "@/components/ui/loaders/ShortSpinnerPrimary";
import { useFetchContactsWithLoading } from "@/hooks/useFetchContactsWithLoading";
import { toast } from "react-toastify";
import { useModal } from "@/hooks/useModal";
import PipelineOffCanvas from "@/components/ui/drawer/PipelineOffCanvas";
import Button from "@/components/ui/button/Button";
import FilterIcons from "@/components/ui/flowbiteIcons/Filter";
import MobileContactCard from "./MobileContactCard";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useBatchUpdateContactDragMutation } from "@/app/redux/api/contactApi";
import { get, set, del } from "idb-keyval";
import useAutoSave from "@/hooks/useAutoSave";

interface Tag {
  user: string;
  name: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface AssignedTo {
  user: User;
  time: string; // Use string for frontend to handle ISO date strings
}

interface Contact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  tag?:Tag;
  assignedTo?: AssignedTo[];
  probability?: number;
  stageId?: string;
}

interface Stage {
  _id: string;
  name: string;
  order: number;
  probability: number;
}

interface BatchUpdate {
  contactId: string;
  pipelineId: string;
  stageId: string;
  order: number;
  userId?: string;
}

const STORAGE_KEY = "mobile-pipeline-drag-updates";

export default function MobilePipelineBody({ pipelineId }: { pipelineId: string }) {
  const { data, error, isLoading: isPipelineLoading } = useGetPipelineByIdQuery(pipelineId, { skip: !pipelineId });
  const { isOpen: isFilterOpen, openModal: openFilter, closeModal: closeFilter } = useModal();
  const [batchUpdateContactDrag, { isLoading: isBatchUpdating }] = useBatchUpdateContactDragMutation();
  const [localStages, setLocalStages] = useState<Stage[]>([]);
  const [localContacts, setLocalContacts] = useState<Contact[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_STAGE|| "682da76db5aab2e983c88636");
  const [pendingUpdates, setPendingUpdates] = useState<BatchUpdate[]>([]);
  const { contactQueries, isLoading: isContactsLoading, refetch } = useFetchContactsWithLoading(pipelineId, localStages);

  // Sync localStages when data changes
  useEffect(() => {
    if (data?.pipeline?.stages) {
      setLocalStages(data.pipeline.stages);
    }
  }, [data]);

  // Aggregate contacts from all stages or filter by selected stage
useEffect(() => {
  const newContacts: Contact[] = [];
  localStages.forEach((stage) => {
    const query = contactQueries[stage._id];
    if (stage._id && query?.data?.contacts && !query.isLoading && !query.error) {
      const stageContacts = query.data.contacts.map((contact) => ({
        _id: contact._id,
        name: contact.name || "Unnamed",
        email: contact.email || "No email",
        businessName: contact.businessName || "Nil",
        phone: contact.phone || "No phone",
        assignedTo: contact?.assignedTo || [],
        probability: contact.probability || 50,
        stageId: stage._id,
        tags: contact.tags || [],
      }));
      if (selectedStage === "all" || selectedStage === stage._id) {
        newContacts.push(...stageContacts);
      }
    }
  });

  // Sort contacts
  setLocalContacts(
    newContacts.sort((a, b) => {
      if (selectedStage === "all") {
        // Find the stage for each contact
        const stageA = localStages.find((stage) => stage._id === a.stageId);
        const stageB = localStages.find((stage) => stage._id === b.stageId);
        // Compare stage orders
        const stageOrderA = stageA ? stageA.order : Number.MAX_SAFE_INTEGER;
        const stageOrderB = stageB ? stageB.order : Number.MAX_SAFE_INTEGER;
        // Sort by stage order first
        if (stageOrderA !== stageOrderB) {
          return stageOrderA - stageOrderB;
        }
        // If in the same stage, maintain order within the stage
        const indexA = contactQueries[a.stageId!]?.data?.contacts.findIndex((c) => c._id === a._id) || 0;
        const indexB = contactQueries[b.stageId!]?.data?.contacts.findIndex((c) => c._id === b._id) || 0;
        return indexA - indexB;
      } else {
        // For a specific stage, sort by index within that stage
        const indexA = contactQueries[a.stageId!]?.data?.contacts.findIndex((c) => c._id === a._id) || 0;
        const indexB = contactQueries[b.stageId!]?.data?.contacts.findIndex((c) => c._id === b._id) || 0;
        return indexA - indexB;
      }
    })
  );
}, [contactQueries, localStages, selectedStage]);

  // Load pending updates from IndexedDB on mount
  useEffect(() => {
    const loadUpdates = async () => {
      const updates = (await get(STORAGE_KEY)) || [];
      setPendingUpdates(updates);
    };
    loadUpdates();
  }, []);

  // Autosave every 5 seconds


  // IndexedDB helpers
  const saveUpdatesToIndexedDB = async (updates: BatchUpdate[]) => {
    await set(STORAGE_KEY, updates);
  };

  const clearIndexedDB = async () => {
    await del(STORAGE_KEY);
  };

  // Merge new updates with existing ones, keeping only the latest per contact
  const mergeUpdates = (newUpdates: BatchUpdate[], prevUpdates: BatchUpdate[]): BatchUpdate[] => {
    const updateMap = new Map<string, BatchUpdate>();

    prevUpdates.forEach((update) => {
      const key = `${update.contactId}-${update.pipelineId}-${update.stageId}`;
      updateMap.set(key, update);
    });

    newUpdates.forEach((update) => {
      const key = `${update.contactId}-${update.pipelineId}-${update.stageId}`;
      updateMap.set(key, update);
    });

    return Array.from(updateMap.values());
  };

  const saveToBackend = async () => {
    if (pendingUpdates.length === 0 || isBatchUpdating) return;
    try {
      await batchUpdateContactDrag({ updates: pendingUpdates }).unwrap();
      await clearIndexedDB();
      setPendingUpdates([]);
      toast.success("Updates saved successfully");
      await refetch();
    } catch (error) {
      console.error("Failed to save updates:", error);
      toast.error("Failed to save updates");
    }
  };

  useAutoSave(pendingUpdates, isBatchUpdating, saveToBackend, 5000);
  const handleStageChange = (contactId: string, newStageId: string) => {
    const contact = localContacts.find((c) => c._id === contactId);
    if (!contact) return;

    const newContacts = localContacts.map((c) =>
      c._id === contactId ? { ...c, stageId: newStageId } : c
    );
    setLocalContacts(newContacts);

    const update: BatchUpdate = {
      contactId,
      pipelineId,
      stageId: newStageId,
      order: newContacts.findIndex((c) => c._id === contactId) + 1,
    };

    const mergedUpdates = mergeUpdates([update], pendingUpdates);
    setPendingUpdates(mergedUpdates);
    saveUpdatesToIndexedDB(mergedUpdates);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const contactId = active.id.replace("contact-", "");
    const oldIndex = localContacts.findIndex((contact) => contact._id === contactId);
    const newIndex = localContacts.findIndex((contact) => contact._id === over.id.replace("contact-", ""));

    if (oldIndex !== newIndex && newIndex !== -1) {
      const newContacts = [...localContacts];
      const [movedContact] = newContacts.splice(oldIndex, 1);
      newContacts.splice(newIndex, 0, movedContact);
      setLocalContacts(newContacts);

      const updates = newContacts.map((contact, index) => ({
        contactId: contact._id,
        pipelineId,
        stageId: contact.stageId!,
        order: index + 1,
      }));

      const mergedUpdates = mergeUpdates(updates, pendingUpdates);
      setPendingUpdates(mergedUpdates);
      saveUpdatesToIndexedDB(mergedUpdates);

      try {
        await batchUpdateContactDrag({ updates: mergedUpdates }).unwrap();
        toast.success("Contact order updated successfully");
        setPendingUpdates([]);
        await clearIndexedDB();
      } catch (error) {
        console.error("Failed to update contact order:", error);
        toast.error("Failed to update contact order");
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  return (
    <div className="min-h-screen rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mx-auto w-full relative">
        {(isPipelineLoading || isContactsLoading) && (
          <div className="flex justify-center">
            <ShortSpinnerPrimary />
          </div>
        )}
        {error && (
          <p className="text-sm text-red-500 dark:text-red-400">
            Error: {(error as any).data?.error || "Failed to fetch pipeline"}
          </p>
        )}
        {!isPipelineLoading && !isContactsLoading && !error && !data?.pipeline && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pipeline not found
          </p>
        )}
        {!isPipelineLoading && !isContactsLoading && !error && data?.pipeline && (
          <>
            <div className="flex flex-col md:flex-row sm:items-center sm:justify-between gap-4 mb-6 p-3 sticky top-16 z-99 bg-white dark:border-gray-800 rounded-xl dark:bg-gray-900">
            <div className="flex justify-between flex-nowrap">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {data.pipeline.name}
                <p className="text-xs">{`(${localContacts.length || "0"} Contacts)`}</p>
              </h3>
              {pendingUpdates.length > 0 && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={saveToBackend}
                    disabled={isBatchUpdating}
                    className={`${isBatchUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isBatchUpdating ? "Saving..." : "Save"}
                  </Button>
                )}
            </div>
            
              <div className="flex gap-3 items-center">
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="all">All Stages</option>
                  {[...localStages]
                    .sort((a, b) => a.order - b.order)
                    .map((stage) => (
                      <option key={stage._id} value={stage._id}>
                        {stage.name}
                      </option>
                    ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  endIcon={<FilterIcons />}
                  onClick={openFilter}
                >
                  Filter
                </Button>
                
              </div>
            </div>
            <div className="space-y-4 px-3">
              {localContacts.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  No contacts available
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localContacts.map(contact => `contact-${contact._id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {localContacts.map((contact) => (
                      <MobileContactCard
                        key={contact._id}
                        contact={contact}
                        selectedStageFromParent={selectedStage}
                        stages={localStages}
                        pipelineId={pipelineId}
                        onStageChange={handleStageChange}
                      />
                    ))}
                  </SortableContext>
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