import React from 'react';
import { Sparkles } from 'lucide-react';

const DEFAULT_QUESTIONS = [
  'What is the standard refund policy and processing timeline?',
  'What are the core collaboration hours for remote employees?',
  'Explain the vector retrieval and chunking architecture.',
  'What encryption standards are enforced for SOC2 compliance?',
];

export default function SuggestedQuestions({ onSelectQuestion, questions = DEFAULT_QUESTIONS }) {
  return (
    <div className="w-full max-w-xl mx-auto py-6">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        <span>Suggested Questions</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {questions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectQuestion(q)}
            className="text-left p-3 rounded-xl bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-hover border border-gray-100 dark:border-dark-border hover:border-indigo-200 dark:hover:border-indigo-900 transition-all text-xs font-medium text-gray-700 dark:text-gray-300 shadow-2xs hover:shadow-subtle group leading-relaxed"
          >
            <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              "{q}"
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
