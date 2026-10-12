import React from 'react';
import { useChat } from '../../hooks/useChat';
import { BookOpen } from 'lucide-react';

const LEVELS = [
  { id: 'very_simple', label: 'Very simple', title: '10-year-old level with analogies' },
  { id: 'simple', label: 'Simple', title: 'College student default' },
  { id: 'detailed', label: 'Detailed', title: 'Exam-ready with full technical terms' },
];

export default function ReadingLevelSelector() {
  const { readingLevel, setReadingLevel, activeMode } = useChat();

  if (activeMode !== 'student') return null;

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#161922] p-0.5 rounded-xl border border-gray-200 dark:border-[#222733] text-xs">
      <span className="hidden xl:inline-flex items-center gap-1 pl-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        Level:
      </span>
      {LEVELS.map((lvl) => {
        const isActive = readingLevel === lvl.id;
        return (
          <button
            key={lvl.id}
            type="button"
            onClick={() => setReadingLevel(lvl.id)}
            title={lvl.title}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
              isActive
                ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {lvl.label}
          </button>
        );
      })}
    </div>
  );
}
