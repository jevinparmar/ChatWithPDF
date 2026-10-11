import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  description,
}) {
  return (
    <div className="bg-white dark:bg-[#161920] border border-gray-200 dark:border-[#1F232B] rounded-2xl p-5 shadow-subtle transition-all duration-150">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </span>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {value}
        </span>
        {change && (
          <span
            className={`inline-flex items-center text-xs font-medium ${
              isPositive ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {change}
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          {description}
        </p>
      )}
    </div>
  );
}
