import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Tag } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatFileSize } from '../../utils/formatFileSize';
import { getFileFormatMeta } from '../../utils/fileIcons';

export default function DocumentCard({ document }) {
  const meta = getFileFormatMeta(document.fileName || document.name);
  const IconComponent = meta.icon;

  const getLocLabel = () => {
    const loc = document.locationType || 'page';
    const count = document.pages || 1;
    if (loc === 'slide') return `${count} slide${count > 1 ? 's' : ''}`;
    if (loc === 'sheet') return `${count} sheet${count > 1 ? 's' : ''}`;
    if (loc === 'section') return `${count} sec`;
    return `${count} pg${count > 1 ? 's' : ''}`;
  };

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-5 shadow-subtle hover:border-indigo-200 dark:hover:border-indigo-900 transition-all duration-200 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.colorClass}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5">
            {document.role && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {document.role.replace('_', ' ')}
              </span>
            )}
            <StatusBadge status={document.status} />
          </div>
        </div>

        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {document.name}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
          {document.summary || 'Uploaded document parsed for semantic indexing.'}
        </p>
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formatFileSize(document.size)} · {getLocLabel()}</span>
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

