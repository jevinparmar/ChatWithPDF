import React from 'react';

export default function StreamingCursor() {
  return (
    <span
      className="inline-block w-2 h-4 ml-1 bg-indigo-600 dark:bg-indigo-400 rounded-xs animate-cursor-blink align-middle"
      aria-hidden="true"
    />
  );
}
