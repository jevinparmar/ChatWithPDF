import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Compass, FileText } from 'lucide-react';

function MindMapTreeNode({ node, level = 0 }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="relative pl-4 border-l-2 border-indigo-200 dark:border-indigo-900/50 my-1.5">
      <div className="flex items-center gap-2 group">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-md text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-[#1C202C] transition-colors"
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-600 shrink-0 ml-1.5" />
        )}

        <span className={`text-xs font-medium text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${
          level === 0 ? 'font-bold text-sm' : ''
        }`}>
          {node.name}
        </span>

        {node.location && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-[#1A1D27]">
            <FileText className="w-2.5 h-2.5" />
            {node.location}
          </span>
        )}
      </div>

      {hasChildren && isOpen && (
        <div className="space-y-1 mt-1">
          {node.children.map((child, idx) => (
            <MindMapTreeNode key={idx} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MindMapViewer({ data }) {
  const parsed = typeof data === 'string' ? (() => {
    try { return JSON.parse(data); } catch (e) { return null; }
  })() : data;

  if (!parsed) return null;

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-[#252936] bg-white dark:bg-[#12141C] p-5 shadow-xs my-3">
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-[#1E232E]">
        <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
          <Compass className="w-4 h-4" />
        </span>
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
          {parsed.title || 'Document Mind Map Outline'}
        </h4>
      </div>

      <div className="space-y-2">
        {parsed.children?.map((rootNode, idx) => (
          <MindMapTreeNode key={idx} node={rootNode} level={0} />
        ))}
      </div>
    </div>
  );
}
