import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Bookmark,
  Highlighter,
  ExternalLink,
} from 'lucide-react';
import Button from '../ui/Button';

export default function PdfViewer({
  citation,
  onClose,
}) {
  const [currentPage, setCurrentPage] = useState(citation?.page || 1);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    if (citation?.page) {
      setCurrentPage(citation.page);
    }
  }, [citation]);

  if (!citation) return null;

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    setCurrentPage((p) => p + 1);
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(180, z + 15));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(70, z - 15));
  const handleResetZoom = () => setZoomLevel(100);

  return (
    <div className="h-full flex flex-col bg-gray-100/90 dark:bg-dark-card border-l border-gray-200 dark:border-dark-border transition-colors">
      {/* Top Header */}
      <div className="h-14 px-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 truncate max-w-[260px] sm:max-w-xs">
          <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
            {citation.fileName}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-card p-0.5 mr-2">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-hover"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 px-1.5 select-none">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-hover"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
            title="Close viewer"
            aria-label="Close PDF viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pagination Bar */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-dark-border bg-gray-50/70 dark:bg-dark-card/50 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-dark-hover disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page <span className="font-semibold text-gray-900 dark:text-white">{currentPage}</span>
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-dark-hover"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
          <Bookmark className="w-3.5 h-3.5" />
          Cited Reference
        </span>
      </div>

      {/* Main Document Content Canvas with Highlighted Citation */}
      <div className="flex-1 overflow-auto p-4 flex flex-col items-center">
        {/* Highlighted Passage Banner */}
        <div className="w-full max-w-xl mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 shadow-subtle animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1.5">
            <Highlighter className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Exact Cited Passage (Page {citation.page})</span>
          </div>
          <p className="text-xs text-amber-950 dark:text-amber-100 font-serif italic leading-relaxed pl-6 border-l-2 border-amber-400 dark:border-amber-500">
            "{citation.snippet}"
          </p>
        </div>

        {/* Rendered Document Sheet */}
        <div
          className="w-full max-w-xl bg-white dark:bg-[#15181E] border border-gray-200 dark:border-dark-border rounded-xl shadow-lg p-8 sm:p-12 transition-all duration-200"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
        >
          {/* Document Header representation */}
          <div className="border-b border-gray-200 dark:border-dark-border pb-4 mb-6 flex justify-between items-center text-xs text-gray-400 dark:text-gray-500">
            <span className="font-mono uppercase">{citation.fileName}</span>
            <span>Page {currentPage}</span>
          </div>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Section {currentPage}.2: Document Provisions &amp; Policy Details
          </h2>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            All registered transactions and regulatory protocols outlined herein are subject to periodic audit verification. In order to uphold compliance integrity across organizational divisions, procedural checkpoints must be documented systematically.
          </p>

          {/* Highlighted snippet embedded in the sheet */}
          <div className="my-5 p-3.5 rounded-lg bg-yellow-100/80 dark:bg-yellow-900/40 border-l-4 border-yellow-500 text-sm text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
            {citation.snippet}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Submissions received past the standard review deadline are transferred to secondary review queues. The administrative department retains authority to enforce auxiliary safety thresholds where deemed appropriate.
          </p>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            For escalations regarding document terms or to request expedited determinations, contact the oversight committee via authenticated channels.
          </p>

          <div className="mt-8 pt-4 border-t border-gray-100 dark:border-dark-border flex justify-between items-center text-[11px] text-gray-400">
            <span>Confidential &amp; Proprietary</span>
            <span>Ref: {citation.documentId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
