import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Download,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  }, [citation?.page]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(175, z + 25));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(75, z - 25));

  const fileName = citation?.fileName || 'Document Viewer';
  const token = localStorage.getItem('token') || '';
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fileUrl = citation?.documentId
    ? `${baseURL}/api/documents/${citation.documentId}/file?token=${encodeURIComponent(token)}#page=${currentPage}&zoom=${zoomLevel}`
    : null;

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
      toast.success('Opening file in new tab...');
    } else {
      toast.error('Document file not available');
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-[#0E1015] overflow-hidden transition-colors">
      {/* Top Header */}
      <div className="h-13 px-4 border-b border-gray-200 dark:border-[#1F232B] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
            {fileName}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
            Page {currentPage}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-400">
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#181B21] transition-colors"
            title="Open / Download PDF"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#181B21] transition-colors"
            title="Close viewer"
            aria-label="Close viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toolbar Sub-header */}
      <div className="h-11 px-4 border-b border-gray-200 dark:border-[#1F232B] bg-gray-50/70 dark:bg-[#12151B] flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 shrink-0">
        <div className="flex items-center gap-2">
          {/* Page step controls */}
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#202530] text-gray-500 dark:text-gray-400"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-medium px-1 text-gray-700 dark:text-gray-300">
            Page {currentPage}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#202530] text-gray-500 dark:text-gray-400"
            title="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center border border-gray-200 dark:border-[#272B35] rounded-lg bg-white dark:bg-[#181B21] px-1 py-0.5">
          <span className="px-2 text-xs font-medium select-none text-gray-700 dark:text-gray-300">
            {zoomLevel}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-[#202530] text-gray-500 dark:text-gray-400"
            title="Zoom in"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-[#202530] text-gray-500 dark:text-gray-400"
            title="Zoom out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cited Passage Highlight Card */}
      {citation?.snippet && (
        <div className="p-3 mx-3 my-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              Exact Cited Passage (Page {currentPage})
            </span>
            <span className="text-[10px] font-medium text-gray-400">
              Semantic Chunk
            </span>
          </div>
          <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-serif pl-2.5 border-l-2 border-indigo-500">
            "{citation.snippet}"
          </p>
        </div>
      )}

      {/* Real Document View Canvas */}
      <div className="flex-1 overflow-hidden p-2 bg-gray-100/70 dark:bg-[#0B0D12] flex flex-col">
        {fileUrl ? (
          <iframe
            key={`${citation?.documentId}-${currentPage}-${zoomLevel}`}
            src={fileUrl}
            className="w-full flex-1 rounded-xl border border-gray-200 dark:border-[#1F232B] bg-white shadow-xs"
            title={fileName}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <FileText className="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium">Select a source citation to view its document.</p>
          </div>
        )}
      </div>
    </div>
  );
}
