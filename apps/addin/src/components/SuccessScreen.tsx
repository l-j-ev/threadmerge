interface Props {
  sentAt: string;
  onMergeAnother: () => void;
}

export function SuccessScreen({ sentAt, onMergeAnother }: Props) {
  const sentDate = new Date(sentAt).toLocaleString('en-GB');

  return (
    <div className="text-center py-8">
      <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
        <svg
          className="w-6 h-6 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h2 className="text-base font-semibold text-gray-900 mb-1">
        Merged email sent
      </h2>
      <p className="text-xs text-gray-500 mb-1">{sentDate}</p>
      <p className="text-xs text-gray-500 mb-6">
        The merged thread has been delivered. An audit log entry has been recorded.
      </p>

      <button
        onClick={onMergeAnother}
        className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded hover:bg-brand-600"
      >
        Merge another pair
      </button>
    </div>
  );
}