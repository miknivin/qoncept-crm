import React from 'react';

interface ChipProps {
  text: string;
  onRemove: () => void;
  disabled?:boolean;
}

const Chip: React.FC<ChipProps> = ({ text, onRemove, disabled }) => {
  return (
    <span
      id={`badge-dismiss-${text}`}
      className="inline-flex items-center px-2 py-1 me-2 text-sm font-medium text-gray-800 bg-gray-100 rounded-sm dark:bg-gray-700 dark:text-gray-300"
      aria-description={`press enter to edit ${text}`}
    >
      {text}
      <button
        type="button"
        disabled={disabled || false}
        className="inline-flex items-center p-1 ms-2 text-sm text-gray-400 bg-transparent rounded-xs hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-gray-300"
        data-dismiss-target={`#badge-dismiss-${text}`}
        aria-label={`Remove ${text}`}
        onClick={onRemove}
      >
        <svg
          className="w-2 h-2"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 14 14"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
          />
        </svg>
        <span className="sr-only">Remove badge</span>
      </button>
    </span>
  );
};

export default Chip;