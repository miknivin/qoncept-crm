import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
// import ShuffleIcon from "../ui/flowbiteIcons/Shuffle";

interface Stage {
  _id: string;
  name: string;
  order: number;
  probability: number;
}

interface SortableStageProps {
  stage: Stage;
  count:number;
  isFinalThree: boolean; 
}

function SortableStage({ stage, count=0, isFinalThree }: SortableStageProps) {
  const { attributes, setNodeRef, transform, transition } = useSortable({ id: `stage-${stage._id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: transform ? 0.8 : 1,
  };

  const showShuffleButton = ["not connected", "not interested", "response await"].some((keyword) =>
    stage.name.toLowerCase().includes(keyword)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`mb-4 rounded border  border-gray-200 p-4 dark:border-gray-700 hover:shadow-md sticky top-0 ${
        isFinalThree ? "bg-success-500 dark:bg-success-600" : "bg-white dark:bg-gray-800"
      }`}
      role="listitem"
      aria-label={`Stage: ${stage.name}`}
    >
      <div className="flex justify-center items-center flex-col relative">
        <h4 className={`font-medium text-lg ${isFinalThree ? "text-white dark:text-white" : "text-gray-800 dark:text-white/90"}`}>
          {stage.name}
        </h4>
        <p className="font-light text-xs">{count} contacts</p>
        {showShuffleButton && (
          <div></div>
          // <button
          //   type="button"
          //   className="p-2 rounded-full absolute top-[-5px] right-0 text-xs font-medium text-center inline-flex items-center text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          // >
          //   <ShuffleIcon />
          // </button>
        )}

      </div>
    </div>
  );
}

export default SortableStage;