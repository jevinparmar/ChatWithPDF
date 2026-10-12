import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Check, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { useDocuments } from '../../hooks/useDocuments';
import { getFileFormatMeta } from '../../utils/fileIcons';

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

  const handleToggleAll = () => {
    if (selectedIds.length === readyDocuments.length) {
      onChange([]);
    } else {
      onChange(readyDocuments.map((d) => d.id));
    }
  };

  const handleRemove = (e, id) => {
    e.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
  };

  const allSelected = readyDocuments.length > 0 && selectedIds.length === readyDocuments.length;

  return (
    <div className="flex items-center flex-wrap gap-1.5" ref={dropdownRef}>
      {/* Selected chips */}
      {selectedIds.map((id) => {
        const doc = documents.find((d) => d.id === id);
        const fileName = doc?.name || 'Document';
        const meta = getFileFormatMeta(fileName);
        const IconComponent = meta.icon;

        return (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-[#1A1D27] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#272B35] shadow-2xs max-w-[170px] truncate"
          >
            <IconComponent className={`w-3.5 h-3.5 shrink-0 ${meta.colorClass}`} />
            <span className="truncate">{fileName}</span>
            <button
              type="button"
              onClick={(e) => handleRemove(e, id)}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-white"
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
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white hover:bg-gray-50 dark:bg-[#141722] dark:hover:bg-[#1A1E2B] border border-gray-200 dark:border-[#222733] transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Files ({selectedIds.length})</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-1.5 w-72 rounded-2xl bg-white dark:bg-[#141722] border border-gray-200 dark:border-[#252B3A] shadow-dropdown z-50 p-2 animate-in fade-in duration-100">
            <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100 dark:border-[#1E232E] mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Knowledge Files
              </span>
              {readyDocuments.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {allSelected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                  <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
                </button>
              )}
            </div>

            {readyDocuments.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 p-3 text-center">
                No ready documents. Upload files from Documents tab.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {readyDocuments.map((doc) => {
                  const isSelected = selectedIds.includes(doc.id);
                  const meta = getFileFormatMeta(doc.name);
                  const Icon = meta.icon;

                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleToggle(doc.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-left transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C202C]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.colorClass}`} />
                        <span className="truncate">{doc.name}</span>
                        {doc.role && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-gray-100 dark:bg-gray-800 text-gray-500">
                            {doc.role}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" />}
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
