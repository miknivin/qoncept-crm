"use client";

import React, { memo, useEffect, useMemo, useRef } from "react";

import {
  GetContactsByStageParams,
  useGetContactsByStageQuery,
} from "@/app/redux/api/pipelineApi";
import ShortSpinnerPrimary from "@/components/ui/loaders/ShortSpinnerPrimary";

import SortableContact from "./SortableContact";
import SortableStage from "./SortableStage";
import { useBoardActions, useStageView } from "./board/PipelineBoardProvider";
import { Contact, Stage } from "./types";

interface StageColumnProps {
  stage: Stage;
  pipelineId: string;
  filters: Omit<GetContactsByStageParams, "pipelineId" | "stageId" | "page" | "limit">;
  isFinalThree: boolean;
}

const normalizeContact = (contact: Contact): Contact => ({
  ...contact,
  assignedTo: contact.assignedTo?.map((entry) => ({
    ...entry,
    user: {
      _id: entry.user?._id ?? "",
      name: entry.user?.name ?? "",
      email: entry.user?.email ?? "",
    },
    time: new Date(entry.time).toISOString(),
  })),
});

function StageColumnComponent({ stage, pipelineId, filters, isFinalThree }: StageColumnProps) {
  const { contacts, meta } = useStageView(stage._id);
  const { hydrateStage, requestNextPage } = useBoardActions();

  const limit = 10;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const queryArgs = useMemo<GetContactsByStageParams>(
    () => ({
      pipelineId,
      stageId: stage._id,
      page: meta.page,
      limit,
      ...filters,
    }),
    [pipelineId, stage._id, meta.page, filters]
  );

  const { data, isFetching, isLoading } = useGetContactsByStageQuery(queryArgs, {
    skip: !pipelineId || !stage._id,
  });

  const latestSignatureRef = useRef<string>("");

  useEffect(() => {
    if (!data) return;

    const hydratedContacts = (data.contacts ?? []).map((c) => normalizeContact(c as unknown as Contact));
    const signature = `${meta.page}|${data.total}|${hydratedContacts.map((c) => c._id).join(",")}`;

    if (latestSignatureRef.current === signature) return;
    latestSignatureRef.current = signature;

    hydrateStage({
      stageId: stage._id,
      contacts: hydratedContacts,
      total: data.total,
      page: meta.page,
      limit,
    });
  }, [data, hydrateStage, limit, meta.page, stage._id]);

  const sortableData = useMemo(() => ({ stageId: stage._id }), [stage._id]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || isLoading || isFetching || !meta.hasMore || meta.isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        requestNextPage(stage._id);
      },
      { rootMargin: "300px 0px 300px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isFetching, isLoading, meta.hasMore, meta.isLoadingMore, requestNextPage, stage._id]);

  return (
    <SortableStage stage={stage} count={meta.totalCount} isFinalThree={isFinalThree}>
      {isLoading || (isFetching && contacts.length === 0) ? (
        <div className="flex justify-center py-10">
          <ShortSpinnerPrimary />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">No contacts</div>
      ) : (
        <div className="space-y-3 px-2 pt-2 pb-4">
          {contacts.map((contact) => (
            <SortableContact key={contact._id} contact={contact} data={sortableData} />
          ))}
        </div>
      )}

      <div ref={loadMoreRef} className="h-2" aria-hidden />
      {(isFetching || meta.isLoadingMore) && contacts.length > 0 && (
        <div className="py-3 text-center text-xs text-gray-500 dark:text-gray-400">Loading more...</div>
      )}
    </SortableStage>
  );
}

export default memo(StageColumnComponent);
