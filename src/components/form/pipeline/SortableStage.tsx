import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Stage {
  _id: string;
  name: string;
  order: number;
  probability: number;
}

function SortableStage({ stage }: { stage: Stage }) {
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
      // {...listeners}
      className="mb-4 rounded border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md sticky top-0"
      role="listitem"
      aria-label={`Stage: ${stage.name}`}
    >
      <div className="flex justify-center items-center">
        <h4 className="font-medium text-gray-800 dark:text-white/90 text-lg">{stage.name}</h4>

      </div>
    </div>
  );
}

export default SortableStage;