import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Download,
  FileText,
  Copy,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { documentApi } from '../../api';
import { getFileFormatMeta } from '../../utils/fileIcons';
import { useChat } from '../../hooks/useChat';

export default function PdfViewer({
  citation,
  onClose,
}) {
  const { sendMessage } = useChat();
  const [currentPage, setCurrentPage] = useState(citation?.page || 1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [extractedDoc, setExtractedDoc] = useState(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPos, setSelectionPos] = useState(null);

  const fileName = citation?.fileName || 'Document Viewer';
  const isPdf = !fileName || fileName.toLowerCase().endsWith('.pdf');
  const meta = getFileFormatMeta(fileName);
  const IconComponent = meta.icon;

  useEffect(() => {
    if (citation?.page) {
      setCurrentPage(citation.page);
    }
  }, [citation?.page]);

  // If non-PDF file, fetch full parsed text and sections
  useEffect(() => {
    let isMounted = true;
    if (!isPdf && citation?.documentId) {
      setIsLoadingContent(true);
      documentApi
        .getDocumentContent(citation.documentId)
        .then((data) => {
          if (isMounted) setExtractedDoc(data);
        })
        .catch((err) => {
          console.error('Failed to load document content:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoadingContent(false);
        });
    } else {
      setExtractedDoc(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isPdf, citation?.documentId]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(175, z + 25));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(75, z - 25));

  const token = localStorage.getItem('token') || '';
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fileUrl = citation?.documentId
    ? `${baseURL}/api/documents/${citation.documentId}/file?token=${encodeURIComponent(token)}#page=${currentPage}&zoom=${zoomLevel}`
    : null;

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
      toast.success('Opening file...');
    } else {
      toast.error('Document file not available');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied text to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMouseUp = () => {
    const sel = window.getSelection();
    const str = sel?.toString()?.trim();
    if (str && str.length > 3) {
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectedText(str);
        setSelectionPos({
          top: Math.max(10, rect.top - 46),
          left: Math.max(10, rect.left + rect.width / 2 - 120),
        });
      } catch (e) {
        setSelectedText('');
        setSelectionPos(null);
      }
    } else {
      setSelectedText('');
      setSelectionPos(null);
    }
  };

  const displayLocLabel =
    citation?.locationLabel ||
    (citation?.locationType === 'slide'
      ? `Slide ${currentPage}`
      : citation?.locationType === 'sheet'
      ? `Sheet ${currentPage}`
      : citation?.locationType === 'section'
      ? `Section ${currentPage}`
      : `Page ${currentPage}`);

  // Highlight helper for non-PDF text
  const renderHighlightedText = (text, snippet) => {
    if (!text) return null;
    if (!snippet || snippet.length < 5) {
      return <div className="whitespace-pre-wrap leading-relaxed">{text}</div>;
    }

    // Try finding snippet or words
    const cleanSnippet = snippet.replace(/\.\.\.$/, '').trim();
    const idx = text.toLowerCase().indexOf(cleanSnippet.toLowerCase());

    if (idx !== -1) {
      const before = text.slice(0, idx);
      const match = text.slice(idx, idx + cleanSnippet.length);
      const after = text.slice(idx + cleanSnippet.length);

      return (
        <div className="whitespace-pre-wrap leading-relaxed">
          {before}
          <mark className="bg-amber-200 dark:bg-amber-900/60 dark:text-amber-100 text-gray-900 px-1 py-0.5 rounded font-medium shadow-xs border border-amber-300 dark:border-amber-700">
            {match}
          </mark>
          {after}
        </div>
      );
    }

    return <div className="whitespace-pre-wrap leading-relaxed">{text}</div>;
  };

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-[#0E1015] overflow-hidden transition-colors">
      {/* Top Header */}
      <div className="h-13 px-4 border-b border-gray-200 dark:border-[#1F232B] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <IconComponent className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
            {fileName}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 shrink-0">
            {displayLocLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-400">
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#181B21] transition-colors"
            title="Download or open original file"
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
          {/* Step controls */}
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#202530] text-gray-500 dark:text-gray-400"
            title="Previous location"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-medium px-1 text-gray-700 dark:text-gray-300">
            {displayLocLabel}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#202530] text-gray-500 dark:text-gray-400"
            title="Next location"
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
            title="Zoom in / increase font"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-[#202530] text-gray-500 dark:text-gray-400"
            title="Zoom out / decrease font"
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
              Exact Cited Passage ({displayLocLabel})
            </span>
            <button
              type="button"
              onClick={() => handleCopy(citation.snippet)}
              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-serif pl-2.5 border-l-2 border-indigo-500">
            "{citation.snippet}"
          </p>
        </div>
      )}

      {/* Document View Canvas */}
      <div className="flex-1 overflow-hidden p-2 bg-gray-100/70 dark:bg-[#0B0D12] flex flex-col">
        {isPdf ? (
          fileUrl ? (
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
          )
        ) : (
          /* Non-PDF Text Viewer with Highlighting & Selection Helper */
          <div
            onMouseUp={handleMouseUp}
            className="flex-1 rounded-xl border border-gray-200 dark:border-[#1F232B] bg-white dark:bg-[#14171E] overflow-y-auto p-5 shadow-xs relative"
          >
            {/* Floating Selection Helper Popup */}
            {selectionPos && selectedText && (
              <div
                style={{ top: `${selectionPos.top}px`, left: `${selectionPos.left}px` }}
                className="fixed z-50 flex items-center gap-1 p-1 bg-white dark:bg-[#181B24] border border-gray-200 dark:border-[#272B35] rounded-xl shadow-dropdown text-xs animate-in fade-in zoom-in-95"
              >
                <button
                  type="button"
                  onClick={() => {
                    sendMessage(`Explain this passage simply: "${selectedText}"`);
                    setSelectedText('');
                    setSelectionPos(null);
                  }}
                  className="px-2.5 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-semibold"
                >
                  Explain this
                </button>
                <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
                <button
                  type="button"
                  onClick={() => {
                    sendMessage(`Simplify this passage in everyday words: "${selectedText}"`);
                    setSelectedText('');
                    setSelectionPos(null);
                  }}
                  className="px-2.5 py-1 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
                >
                  Simplify
                </button>
                <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
                <button
                  type="button"
                  onClick={() => {
                    sendMessage(`Give a real-life analogy or practical example for this: "${selectedText}"`);
                    setSelectedText('');
                    setSelectionPos(null);
                  }}
                  className="px-2.5 py-1 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
                >
                  Give example
                </button>
              </div>
            )}

            {isLoadingContent ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Loading document text...</span>
              </div>
            ) : extractedDoc?.sections?.length > 0 ? (
              <div
                className="space-y-6"
                style={{ fontSize: `${(zoomLevel / 100) * 13}px` }}
              >
                {extractedDoc.sections.map((sec, idx) => {
                  const isCurrentSection =
                    sec.page === currentPage ||
                    (citation?.locationLabel && sec.label === citation.locationLabel);

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl transition-all duration-200 border ${
                        isCurrentSection
                          ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xs ring-1 ring-indigo-500/10'
                          : 'border-gray-100 dark:border-[#1F232B] bg-gray-50/30 dark:bg-[#181B22]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200/60 dark:border-[#272C38]">
                        <span className="font-semibold text-xs text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                          {sec.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(sec.text)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                          title="Copy section text"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-gray-800 dark:text-gray-200 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                        {renderHighlightedText(sec.text, citation?.snippet)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <FileText className="w-10 h-10 mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-xs">No extracted text found for this document.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

