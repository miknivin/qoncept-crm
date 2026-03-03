"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { DragEndEvent, DragStartEvent, UniqueIdentifier } from "@dnd-kit/core";
import { toast } from "react-toastify";

import { usePipelineDragSyncApi } from "@/app/redux/features/pipelineBoard/usePipelineDragSyncApi";

import { BoardState, Contact, DragSyncEvent, DragSyncSnapshot, DragSyncUpdate, Stage } from "../types";
import { boardReducer, initialBoardState } from "./boardReducer";
import { selectStageView } from "./boardSelectors";
import { applyMove, applyReorder, deriveChangedOrders, resolveDropTarget } from "./dragTransforms";
import { useDragSyncWorker } from "./useDragSyncWorker";

interface PipelineStageInput {
  _id: string;
  name: string;
  order: number;
  probability?: number;
}

interface StageHydrateInput {
  stageId: string;
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
}

interface PipelineBoardContextValue {
  state: BoardState;
  activeContact: Contact | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  hydrateStage: (input: StageHydrateInput) => void;
  requestNextPage: (stageId: string) => void;
}

interface PipelineBoardProviderProps {
  pipelineId: string;
  pipelineStages?: PipelineStageInput[];
  children: React.ReactNode;
}

const PipelineBoardContext = createContext<PipelineBoardContextValue | null>(null);

const normalizeStages = (stages: PipelineStageInput[] | undefined): Stage[] => {
  if (!stages?.length) return [];
  return stages
    .map((stage) => ({
      _id: stage._id,
      name: stage.name,
      order: stage.order,
      probability: stage.probability ?? 0,
    }))
    .sort((a, b) => a.order - b.order);
};

const parseContactId = (id: UniqueIdentifier | null | undefined): string | null => {
  if (!id) return null;
  const value = String(id);
  return value.startsWith("contact-") ? value.replace("contact-", "") : null;
};

const buildSnapshot = (state: BoardState, stageIds: string[]): DragSyncSnapshot => {
  const contactsByStage: Record<string, Contact[]> = {};
  const stageMetaById: Record<string, BoardState["stageMetaById"][string]> = {};

  for (const stageId of stageIds) {
    contactsByStage[stageId] = [...(state.contactsByStage[stageId] ?? [])];
    const meta = state.stageMetaById[stageId];
    if (meta) stageMetaById[stageId] = { ...meta };
  }

  return {
    contactsByStage,
    stageMetaById,
  };
};

const createSyncEvents = (updates: DragSyncUpdate[]): DragSyncEvent[] => {
  const now = Date.now();
  return updates.map((update, index) => ({
    opId: `${now}-${index}-${update.contactId}-${update.stageId}`,
    update,
    createdAt: now,
  }));
};

export function PipelineBoardProvider({ pipelineId, pipelineStages, children }: PipelineBoardProviderProps) {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState);
  const { executeBatchUpdate, executeBatchUpdateKeepAlive } = usePipelineDragSyncApi();
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const stages = normalizeStages(pipelineStages);
    dispatch({ type: "INIT_STAGES", payload: { stages } });
  }, [pipelineStages]);

  const hydrateStage = useCallback((input: StageHydrateInput) => {
    dispatch({ type: "STAGE_HYDRATED", payload: input });
  }, []);

  const requestNextPage = useCallback((stageId: string) => {
    dispatch({ type: "LOAD_NEXT_PAGE_REQUESTED", payload: { stageId } });
  }, []);

  useDragSyncWorker({
    pipelineId,
    queue: state.pendingSyncQueue,
    dispatch,
    executeBatchUpdate,
    executeBatchUpdateKeepAlive,
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const contactId = parseContactId(event.active.id);
    dispatch({ type: "DRAG_STARTED", payload: { contactId } });
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) {
        dispatch({ type: "DRAG_ENDED" });
        return;
      }

      const previousState = stateRef.current;
      const resolved = resolveDropTarget({
        activeId: active.id,
        overId: over.id,
        activeStageId: active.data.current?.stageId,
        contactsByStage: previousState.contactsByStage,
      });

      if (!resolved) {
        dispatch({ type: "DRAG_ENDED" });
        return;
      }

      const {
        sourceStageId,
        destinationStageId,
        sourceIndex,
        destinationIndex,
      } = resolved;

      if (sourceStageId === destinationStageId && sourceIndex === destinationIndex) {
        dispatch({ type: "DRAG_ENDED" });
        return;
      }

      const previousByStage = previousState.contactsByStage;
      const nextByStage = { ...previousByStage };
      const changedStageIds =
        sourceStageId === destinationStageId
          ? [sourceStageId]
          : [sourceStageId, destinationStageId];

      if (sourceStageId === destinationStageId) {
        const reordered = applyReorder({
          contacts: previousByStage[sourceStageId] ?? [],
          sourceIndex,
          destinationIndex,
        });

        nextByStage[sourceStageId] = reordered;

        dispatch({
          type: "CONTACT_REORDERED",
          payload: { stageId: sourceStageId, contacts: reordered },
        });
      } else {
        const moved = applyMove({
          sourceContacts: previousByStage[sourceStageId] ?? [],
          destinationContacts: previousByStage[destinationStageId] ?? [],
          sourceIndex,
          destinationIndex,
        });

        nextByStage[sourceStageId] = moved.sourceContacts;
        nextByStage[destinationStageId] = moved.destinationContacts;

        dispatch({
          type: "CONTACT_MOVED",
          payload: {
            sourceStageId,
            destinationStageId,
            sourceContacts: moved.sourceContacts,
            destinationContacts: moved.destinationContacts,
          },
        });
      }

      const updates = deriveChangedOrders({
        pipelineId,
        previousByStage,
        nextByStage,
        stageIds: changedStageIds,
      });

      if (updates.length > 0) {
        const snapshot = buildSnapshot(previousState, changedStageIds);
        const events = createSyncEvents(updates);

        dispatch({
          type: "SYNC_ENQUEUED",
          payload: {
            events,
            snapshot,
          },
        });
      }

      dispatch({ type: "DRAG_ENDED" });
    },
    [pipelineId]
  );

  useEffect(() => {
    if (state.syncStatus !== "error" || !state.lastSyncError) return;
    toast.error("Pipeline sync failed. Latest changes were reverted.");
  }, [state.lastSyncError, state.syncStatus]);

  const activeContact = useMemo(() => {
    if (!state.activeDragContactId) return null;

    for (const contacts of Object.values(state.contactsByStage)) {
      const found = contacts.find((contact) => contact._id === state.activeDragContactId);
      if (found) return found;
    }

    return null;
  }, [state.activeDragContactId, state.contactsByStage]);

  const value = useMemo(
    () => ({
      state,
      activeContact,
      handleDragStart,
      handleDragEnd,
      hydrateStage,
      requestNextPage,
    }),
    [activeContact, handleDragEnd, handleDragStart, hydrateStage, requestNextPage, state]
  );

  return <PipelineBoardContext.Provider value={value}>{children}</PipelineBoardContext.Provider>;
}

export function usePipelineBoardContext() {
  const context = useContext(PipelineBoardContext);
  if (!context) {
    throw new Error("usePipelineBoardContext must be used within PipelineBoardProvider");
  }
  return context;
}

export function useBoardActions() {
  const { handleDragStart, handleDragEnd, hydrateStage, requestNextPage } = usePipelineBoardContext();
  return {
    handleDragStart,
    handleDragEnd,
    hydrateStage,
    requestNextPage,
  };
}

export function useStageView(stageId: string) {
  const { state } = usePipelineBoardContext();
  return useMemo(() => selectStageView(state, stageId), [state, stageId]);
}
