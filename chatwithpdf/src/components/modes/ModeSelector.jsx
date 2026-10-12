import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { MODE_METADATA, getModeMeta } from '../../utils/modeMeta';
import { useChat } from '../../hooks/useChat';
import toast from 'react-hot-toast';

export default function ModeSelector() {
  const { activeMode, setActiveMode } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentMeta = getModeMeta(activeMode);
  const modes = Object.values(MODE_METADATA);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMode = async (modeId) => {
    setIsOpen(false);
    if (modeId !== activeMode) {
      await setActiveMode(modeId);
      toast.success(`Switched to ${MODE_METADATA[modeId]?.name} mode`);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-[#222733] bg-white dark:bg-[#141722] hover:bg-gray-50 dark:hover:bg-[#1A1E2B] text-xs font-semibold text-gray-800 dark:text-gray-200 transition-colors shadow-2xs"
        title="Switch Mode"
      >
        <span className={`w-2.5 h-2.5 rounded-full ${currentMeta.dotClass} shadow-xs shrink-0`} />
        <span>{currentMeta.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-60 rounded-2xl bg-white dark:bg-[#141722] border border-gray-200 dark:border-[#252B3A] shadow-dropdown z-50 p-1.5 animate-in fade-in duration-100">
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Select Active Mode
          </div>
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = activeMode === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleSelectMode(mode.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C202C]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${mode.dotClass} shrink-0`} />
                  <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                  <div>
                    <span className="block font-medium">{mode.name}</span>
                    <span className="block text-[10px] text-gray-400 line-clamp-1">{mode.tagline}</span>
                  </div>
                </div>

                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
