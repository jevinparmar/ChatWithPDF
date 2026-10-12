import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  Download,
  Bookmark,
  BookmarkCheck,
  Printer,
  FileCode,
  FileText,
  AlertTriangle,
  Info,
} from 'lucide-react';
import SourceChip from './SourceChip';
import StreamingCursor from './StreamingCursor';
import QuizPlayer from '../modes/renderers/QuizPlayer';
import FlashcardDeck from '../modes/renderers/FlashcardDeck';
import RiskCheckBadges from '../modes/renderers/RiskCheckBadges';
import CareerMatchGauge from '../modes/renderers/CareerMatchGauge';
import MindMapViewer from '../modes/renderers/MindMapViewer';
import { downloadMarkdown, downloadDocx, printContent } from '../../utils/exportUtils';
import { useLibraryStore } from '../../store/libraryStore';
import { useChat } from '../../hooks/useChat';
import toast from 'react-hot-toast';

export default function AIMessage({
  message,
  isStreaming = false,
  onRegenerate,
}) {
  const [copied, setCopied] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const { submitFeedback, setActiveCitation, selectedDocumentIds, activeMode } = useChat();
  const { saveItem } = useLibraryStore();

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToLibrary = () => {
    saveItem({
      title: message.actionId ? `Generated ${message.actionId}` : 'Document Study Notes',
      type: message.outputType || 'notes',
      content: message.content,
      fileName: message.sources?.[0]?.fileName || 'Study Document',
      mode: activeMode,
    });
    setSavedToLibrary(true);
    toast.success('Saved to Study Library', { icon: '📚' });
  };

  const handleFeedback = (rating) => {
    if (!message.id) return;
    submitFeedback(message.id, rating);
    toast.success(rating === 'up' ? 'Feedback recorded!' : 'Feedback recorded.');
  };

  const handleCitationClick = (pageNum) => {
    const found = message.sources?.find((s) => s.page === pageNum);
    if (found) {
      setActiveCitation(found);
    } else {
      setActiveCitation({
        documentId: selectedDocumentIds[0] || 'doc-1',
        fileName: 'Document.pdf',
        page: pageNum,
        snippet: `Location Page ${pageNum}`,
      });
    }
  };

  // Detect output type or parse JSON content for rich widgets
  let parsedJson = null;
  if (message.outputType && message.outputType !== 'markdown') {
    try {
      parsedJson = typeof message.content === 'object' ? message.content : JSON.parse(message.content);
    } catch (e) {
      parsedJson = null;
    }
  } else if (typeof message.content === 'string' && message.content.trim().startsWith('{')) {
    try {
      const candidate = JSON.parse(message.content);
      if (candidate.questions || candidate.flashcards || candidate.risks || candidate.overall_score || candidate.children) {
        parsedJson = candidate;
      }
    } catch (e) {
      parsedJson = null;
    }
  }

  // Custom markdown components to handle tables, quotes, and clean natural citations
  const markdownComponents = {
    p: ({ children }) => (
      <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-3">
        {children}
      </p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-3 pl-4 border-l-2 border-indigo-500 text-gray-800 dark:text-gray-200 italic text-xs sm:text-sm font-normal">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="w-full overflow-x-auto my-3 rounded-xl border border-gray-200 dark:border-[#222733]">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-[#222733] text-left text-xs">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 bg-gray-50 dark:bg-[#181B24] font-semibold text-gray-900 dark:text-white">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 border-t border-gray-100 dark:border-[#1E232E] text-gray-700 dark:text-gray-300">
        {children}
      </td>
    ),
    code: ({ children }) => {
      const text = String(children);
      const detailedMatch = text.match(/Source:\s*([^,\]]+),\s*page\s*(\d+)/i);
      if (detailedMatch) {
        const docName = detailedMatch[1].trim();
        const pageNum = parseInt(detailedMatch[2], 10);
        return (
          <button
            type="button"
            onClick={() => handleCitationClick(pageNum)}
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs mx-1 transition-transform active:scale-95 cursor-pointer"
            title={`View ${docName} page ${pageNum}`}
          >
            ({docName}, Page {pageNum})
          </button>
        );
      }
      return (
        <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#202530] text-indigo-600 dark:text-indigo-400 font-mono text-xs">
          {children}
        </code>
      );
    },
  };

  const formattedContent = (typeof message.content === 'string' ? message.content : '')
    .replace(/\[Source:\s*([^,\]]+),\s*page\s*(\d+)\]/gi, '`Source: $1, page $2`')
    .replace(/\[Source:\s*Page\s*(\d+)\]/gi, '`Source: Page $1`');

  return (
    <div className="w-full mb-6 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="w-full">
        {/* Assistant Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <span className="w-2 h-2 rounded-xs bg-white/90 rotate-45" />
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">
              Assistant
            </span>
            {message.wasCached && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40">
                ⚡ Instant Cache
              </span>
            )}
          </div>

          {/* Action buttons */}
          {!isStreaming && (
            <div className="flex items-center gap-1 text-gray-400 relative">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded-md hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1E232C] transition-colors"
                title="Copy text"
                aria-label="Copy"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleSaveToLibrary}
                className={`p-1 rounded-md transition-colors ${
                  savedToLibrary
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1E232C]'
                }`}
                title="Save to Study Library"
                aria-label="Save to library"
              >
                {savedToLibrary ? <BookmarkCheck className="w-3.5 h-3.5 text-indigo-500" /> : <Bookmark className="w-3.5 h-3.5" />}
              </button>

              {/* Download / Export Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-1 rounded-md hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1E232C] transition-colors"
                  title="Download / Export"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {showExportMenu && (
                  <div
                    className="absolute right-0 mt-1 w-40 rounded-xl bg-white dark:bg-[#181B24] border border-gray-200 dark:border-[#272B35] shadow-dropdown z-30 py-1 text-xs"
                    onClick={() => setShowExportMenu(false)}
                  >
                    <button
                      type="button"
                      onClick={() => downloadMarkdown('ChatWithPDF', message.content)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[#202530]"
                    >
                      <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Markdown (.md)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadDocx('ChatWithPDF', message.content)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[#202530]"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span>Word (.docx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => printContent('Study Notes', message.content)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[#202530]"
                    >
                      <Printer className="w-3.5 h-3.5 text-gray-500" />
                      <span>Print / PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="p-1 rounded-md hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1E232C] transition-colors"
                  title="Regenerate"
                  aria-label="Regenerate"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="h-3 w-px bg-gray-200 dark:bg-[#272B35] mx-0.5" />

              <button
                type="button"
                onClick={() => handleFeedback('up')}
                className={`p-1 rounded-md transition-colors ${
                  message.feedback === 'up'
                    ? 'text-teal-500 bg-teal-50 dark:bg-teal-950/40'
                    : 'hover:text-teal-500 hover:bg-gray-100 dark:hover:bg-[#1E232C]'
                }`}
                title="Thumbs up"
                aria-label="Thumbs up"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleFeedback('down')}
                className={`p-1 rounded-md transition-colors ${
                  message.feedback === 'down'
                    ? 'text-red-500 bg-red-50 dark:bg-red-950/40'
                    : 'hover:text-red-500 hover:bg-gray-100 dark:hover:bg-[#1E232C]'
                }`}
                title="Thumbs down"
                aria-label="Thumbs down"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="pl-7">
          {/* Specialized Interactive Renderers */}
          {parsedJson?.questions ? (
            <QuizPlayer data={parsedJson} onCitationClick={handleCitationClick} />
          ) : parsedJson?.flashcards ? (
            <FlashcardDeck data={parsedJson} onCitationClick={handleCitationClick} />
          ) : parsedJson?.risks ? (
            <RiskCheckBadges data={parsedJson} />
          ) : parsedJson?.overall_score !== undefined || parsedJson?.rewrites ? (
            <CareerMatchGauge data={parsedJson} />
          ) : parsedJson?.children ? (
            <MindMapViewer data={parsedJson} />
          ) : (
            <div className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-normal">
              <ReactMarkdown components={markdownComponents}>{formattedContent}</ReactMarkdown>
              {isStreaming && <StreamingCursor />}
            </div>
          )}

          {/* Legal Notice if Legal Mode Active */}
          {activeMode === 'legal' && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>This is an AI summary to help you read the document, not legal advice. Please consult a qualified lawyer for decisions.</span>
            </div>
          )}

          {/* Citation Chips at bottom */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Sources:
              </span>
              {message.sources.map((src, idx) => (
                <SourceChip key={idx} source={src} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
