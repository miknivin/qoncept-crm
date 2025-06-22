import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Stage {
  _id: string;
  name: string;
  order: number;
  probability: number;
}

interface SortableStageProps {
  stage: Stage;
  count:number;
  isFinalThree: boolean; // New prop to indicate if stage is in the last three
}

function SortableStage({ stage, count=0, isFinalThree }: SortableStageProps) {
  const { attributes, setNodeRef, transform, transition } = useSortable({ id: `stage-${stage._id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: transform ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`mb-4 rounded border border-gray-200 p-4 dark:border-gray-700 hover:shadow-md sticky top-0 ${
        isFinalThree ? "bg-success-500 dark:bg-success-600" : "bg-white dark:bg-gray-800"
      }`}
      role="listitem"
      aria-label={`Stage: ${stage.name}`}
    >
      <div className="flex justify-center items-center flex-col">
        <h4 className={`font-medium text-lg ${isFinalThree ? "text-white dark:text-white" : "text-gray-800 dark:text-white/90"}`}>
          {stage.name}
        </h4>
        <p className="font-light text-xs">{count} contacts</p>
      </div>
    </div>
  );
}

export default SortableStage;