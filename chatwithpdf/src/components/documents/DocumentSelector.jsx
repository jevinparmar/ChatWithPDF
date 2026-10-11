import React, { useState, useRef, useEffect } from 'react';
import { FileText, Plus, X, Check, ChevronDown } from 'lucide-react';
import { useDocuments } from '../../hooks/useDocuments';

export default function DocumentSelector({
  selectedIds = [],
  onChange,
}) {
  const { documents } = useDocuments();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const readyDocuments = documents.filter((d) => d.status === 'ready');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleRemove = (e, id) => {
    e.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
  };

  return (
    <div className="flex items-center flex-wrap gap-2" ref={dropdownRef}>
      {/* Selected chips */}
      {selectedIds.map((id) => {
        const doc = documents.find((d) => d.id === id);
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50 shadow-2xs max-w-[180px] truncate"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{doc?.name || 'Document'}</span>
            <button
              type="button"
              onClick={(e) => handleRemove(e, id)}
              className="p-0.5 rounded hover:bg-indigo-200/50 dark:hover:bg-indigo-800/50 text-indigo-500 hover:text-indigo-800 dark:hover:text-white"
              aria-label="Remove document"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}

      {/* Add Document Dropdown button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-dark-card dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add document</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border shadow-dropdown z-40 p-1.5 animate-in fade-in zoom-in-95">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 py-1">
              Select knowledge sources
            </p>
            {readyDocuments.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 p-2 text-center">
                No ready documents. Upload documents in Dashboard.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {readyDocuments.map((doc) => {
                  const isSelected = selectedIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleToggle(doc.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{doc.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
