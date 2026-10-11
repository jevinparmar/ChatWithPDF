import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { useChat } from '../../hooks/useChat';

export default function SourceChip({ source }) {
  const { setActiveCitation, activeCitation } = useChat();

  const isCurrentActive =
    activeCitation?.documentId === source.documentId &&
    activeCitation?.page === source.page;

  return (
    <button
      type="button"
      onClick={() => setActiveCitation(source)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 border ${
        isCurrentActive
          ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20'
          : 'bg-white dark:bg-dark-card hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:border-indigo-200 dark:hover:border-indigo-800'
      } shadow-2xs group`}
      title="Click to view cited page and passage in PDF viewer"
    >
      <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
      <span className="truncate max-w-[140px] sm:max-w-[180px]">{source.fileName}</span>
      <span className="text-[11px] text-gray-400 dark:text-gray-500">·</span>
      <span className="font-semibold text-gray-900 dark:text-white">Page {source.page}</span>
      <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0 ml-0.5" />
    </button>
  );
}
