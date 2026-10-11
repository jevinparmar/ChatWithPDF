import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Search,
  Download,
  BookOpen,
  MoreHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PdfViewer({
  citation,
  onClose,
}) {
  const [currentPage, setCurrentPage] = useState(citation?.page || 4);
  const [zoomLevel, setZoomLevel] = useState(125);
  const totalPages = 28;

  useEffect(() => {
    if (citation?.page) {
      setCurrentPage(citation.page);
    }
  }, [citation]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(175, z + 25));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(75, z - 25));

  const fileName = citation?.fileName || 'Annual Report 2024.pdf';

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-[#0E1015] overflow-hidden transition-colors">
      {/* Top Header matching screenshot */}
      <div className="h-13 px-4 border-b border-gray-200 dark:border-[#1F232B] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
            Document Viewer: {fileName}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#181B21] border border-gray-200 dark:border-[#272B35]">
            181B21
          </span>
        </div>

        <div className="flex items-center gap-1 text-gray-400">
          <button
            type="button"
            onClick={() => toast('Document options')}
            className="p-1.5 rounded-lg hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#181B21] transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
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

      {/* Toolbar Sub-header matching screenshot */}
      <div className="h-11 px-4 border-b border-gray-200 dark:border-[#1F232B] bg-gray-50/70 dark:bg-[#12151B] flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 shrink-0">
        <div className="flex items-center gap-3">
          {/* View mode icon */}
          <button
            type="button"
            className="p-1 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            title="Toggle book layout"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Zoom controls pill group: 125% + - */}
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

        {/* Page indicator */}
        <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
          Page {currentPage} of {totalPages}
        </div>

        {/* Right Search & Download tools */}
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <button
            type="button"
            onClick={() => toast('Search within document')}
            className="p-1 rounded hover:text-gray-900 dark:hover:text-white"
            title="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => toast.success('Downloading document...')}
            className="p-1 rounded hover:text-gray-900 dark:hover:text-white"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Document View Canvas */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center bg-gray-100/70 dark:bg-[#0B0D12]">
        {/* Rendered Document Sheet matching screenshot exactly */}
        <div
          className="w-full max-w-xl bg-white text-gray-900 rounded-xl shadow-xl p-8 sm:p-12 transition-all duration-200 border border-gray-200"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
        >
          {/* Section Heading */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">
                {fileName}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Page {currentPage} of {totalPages} &bull; Grounded Citation Reference
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              Verified Chunk
            </span>
          </div>

          {citation?.snippet ? (
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100/80">
                <div className="text-[11px] font-semibold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  Exact Cited Passage (Page {currentPage})
                </div>
                <blockquote className="text-xs sm:text-[13px] text-gray-800 leading-relaxed font-serif pl-3 border-l-2 border-indigo-500 italic">
                  <span className="bg-yellow-100 dark:bg-yellow-500/20 text-gray-900 px-1 py-0.5 rounded">
                    "{citation.snippet}"
                  </span>
                  <sup className="inline-flex items-center justify-center w-3.5 h-3.5 ml-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold not-italic">
                    1
                  </sup>
                </blockquote>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-base font-bold text-gray-900 mb-4 tracking-tight">
                3.1 Section Contents
              </h2>
              <p className="text-xs sm:text-[13px] text-gray-800 leading-relaxed mb-4">
                Document chunk content retrieved for semantic grounding.
              </p>
            </>
          )}

          {/* Embedded Line Chart Figure matching screenshot */}
          <div className="my-6 p-4 rounded-lg bg-gray-50/80 border border-gray-200">
            {/* SVG Plot */}
            <div className="w-full h-44">
              <svg viewBox="0 0 400 180" className="w-full h-full">
                {/* Axes and grid */}
                <line x1="40" y1="20" x2="40" y2="150" stroke="#CBD5E1" strokeWidth="1.5" />
                <line x1="40" y1="150" x2="380" y2="150" stroke="#CBD5E1" strokeWidth="1.5" />

                {/* Y Axis ticks & labels */}
                <text x="15" y="30" fontSize="9" fill="#94A3B8" fontFamily="sans-serif">30</text>
                <text x="15" y="70" fontSize="9" fill="#94A3B8" fontFamily="sans-serif">20</text>
                <text x="15" y="110" fontSize="9" fill="#94A3B8" fontFamily="sans-serif">10</text>
                <text x="25" y="153" fontSize="9" fill="#94A3B8" fontFamily="sans-serif">0</text>

                {/* X Axis ticks */}
                <text x="40" y="165" fontSize="8" fill="#94A3B8" fontFamily="sans-serif">0</text>
                <text x="80" y="165" fontSize="8" fill="#94A3B8" fontFamily="sans-serif">25</text>
                <text x="120" y="165" fontSize="8" fill="#94A3B8" fontFamily="sans-serif">50</text>
                <text x="160" y="165" fontSize="8" fill="#94A3B8" fontFamily="sans-serif">75</text>
                <text x="200" y="165" fontSize="8" fill="#94A3B8" fontFamily="sans-serif">100</text>
                <text x="245" y="165" fontSize="8" fill="#94A3B8" fontFamily="sans-serif">125</text>
                <text x="290" y="165" fontSize="8" fill="#94A3B8" fontFamily="sans-serif">150</text>
                <text x="330" y="165" fontSize="8" fill="#94A3B8" fontFamily="sans-serif">175</text>
                <text x="365" y="165" fontSize="8" fill="#94A3B8" fontFamily="sans-serif">200</text>

                {/* Legend */}
                <line x1="55" y1="35" x2="70" y2="35" stroke="#3B82F6" strokeWidth="2" strokeDasharray="3 2" />
                <text x="75" y="38" fontSize="8" fill="#64748B">input</text>
                <line x1="55" y1="48" x2="70" y2="48" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3 2" />
                <text x="75" y="51" fontSize="8" fill="#64748B">natural</text>
                <line x1="55" y1="61" x2="70" y2="61" stroke="#10B981" strokeWidth="2" />
                <text x="75" y="64" fontSize="8" fill="#64748B">network</text>

                {/* Curve 1: Blue dashed (input) */}
                <path
                  d="M 40 145 Q 120 135 180 80 T 360 30"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />

                {/* Curve 2: Amber (natural) */}
                <path
                  d="M 40 148 Q 130 140 200 95 T 360 45"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeDasharray="3 2"
                />

                {/* Curve 3: Green steep (network) */}
                <path
                  d="M 40 148 Q 140 130 190 60 T 360 25"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
            <p className="text-[11px] text-gray-500 text-center mt-2 font-medium">
              Figure 4: Activation functions drawn on neural-network charts
            </p>
          </div>

          <p className="text-xs text-gray-700 leading-relaxed">
            3.1 Activation function of input is standard activation functions drawn on neural network plots.
          </p>
        </div>
      </div>
    </div>
  );
}
