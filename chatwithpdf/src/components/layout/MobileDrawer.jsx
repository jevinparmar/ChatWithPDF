import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Sidebar from './Sidebar';

export default function MobileDrawer({ isOpen, onClose }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative z-10 w-72 max-w-[80vw] h-full bg-white dark:bg-dark-card shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
        <div className="absolute top-3.5 right-3.5 z-20">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-hover"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="h-full">
          <Sidebar onItemClick={onClose} isDrawer={true} />
        </div>
      </div>
    </div>
  );
}
