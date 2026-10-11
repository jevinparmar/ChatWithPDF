import React from 'react';
import { formatDateTime } from '../../utils/formatDate';

export default function MessageBubble({ message }) {
  return (
    <div className="flex justify-end mb-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="max-w-[85%] sm:max-w-[75%] flex flex-col items-end">
        <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-indigo-600 text-white text-sm leading-relaxed shadow-subtle select-text whitespace-pre-wrap">
          {message.content}
        </div>
        {message.createdAt && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 mr-1">
            {formatDateTime(message.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}
