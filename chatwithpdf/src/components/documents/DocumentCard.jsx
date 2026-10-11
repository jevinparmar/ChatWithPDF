import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatFileSize } from '../../utils/formatFileSize';
import { formatDate } from '../../utils/formatDate';

export default function DocumentCard({ document }) {
  return (
    <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-5 shadow-subtle hover:border-indigo-200 dark:hover:border-indigo-900 transition-all duration-200 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <StatusBadge status={document.status} />
        </div>

        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {document.name}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
          {document.summary || 'Uploaded document parsed for semantic indexing.'}
        </p>
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formatFileSize(document.size)} · {document.pages || 1} pgs</span>
        <Link
          to={`/documents/${document.id}`}
          className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
        >
          View
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
