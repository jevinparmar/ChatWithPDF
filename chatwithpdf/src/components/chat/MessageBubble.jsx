import React from 'react';
import { User } from 'lucide-react';
import { formatDateTime } from '../../utils/formatDate';

export default function MessageBubble({ message }) {
  return (
    <div className="w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="w-full rounded-2xl bg-white dark:bg-[#181B21] border border-gray-200 dark:border-[#272B35] p-4 sm:p-5 shadow-2xs">
        {/* User Card Header */}
        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-[#2A2F3B] flex items-center justify-center text-gray-700 dark:text-gray-300">
            <User className="w-3 h-3" />
          </div>
          <span>User</span>
          {message.createdAt && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
              {formatDateTime(message.createdAt)}
            </span>
          )}
        </div>

        {/* User Question Text */}
        <p className="text-xs sm:text-sm text-gray-900 dark:text-gray-200 leading-relaxed font-normal whitespace-pre-wrap pl-7">
          {message.content}
        </p>
      </div>
    </div>
  );
}
