import React, { useState } from 'react';
import { Layers, RotateCw, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

export default function FlashcardDeck({ data, onCitationClick }) {
  const parsed = typeof data === 'string' ? (() => {
    try { return JSON.parse(data); } catch (e) { return null; }
  })() : data;

  const cards = parsed?.flashcards || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [statusMap, setStatusMap] = useState({}); // { [idx]: 'mastered' | 'review' }

  if (!cards || cards.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-gray-200 dark:border-[#272B35] bg-gray-50 dark:bg-[#14171F] text-xs text-gray-500">
        Flashcards data could not be parsed.
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const masteredCount = Object.values(statusMap).filter((s) => s === 'mastered').length;
  const reviewCount = Object.values(statusMap).filter((s) => s === 'review').length;

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const markStatus = (status) => {
    setStatusMap((prev) => ({
      ...prev,
      [currentIndex]: status,
    }));
    if (currentIndex < cards.length - 1) {
      handleNext();
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-[#252936] bg-white dark:bg-[#12141C] p-4 sm:p-5 shadow-xs my-3">
      {/* Top Deck Stats & Progress */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1E232E] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Layers className="w-4 h-4" />
          </span>
          <span className="text-xs font-semibold text-gray-900 dark:text-white">
            Flashcards Deck
          </span>
          <span className="text-[11px] font-mono text-gray-400">
            ({currentIndex + 1} / {cards.length})
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {masteredCount} Got it
          </span>
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            {reviewCount} Review
          </span>
        </div>
      </div>

      {/* Flip Card Container */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full min-h-[180px] sm:min-h-[220px] rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/20 via-white to-purple-50/10 dark:from-[#151824] dark:via-[#131520] dark:to-[#171424] p-6 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md select-none relative group"
      >
        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          <span>{isFlipped ? 'Answer / Explanation' : 'Question / Prompt'}</span>
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-xs normal-case group-hover:underline">
            <RotateCw className="w-3 h-3" />
            Click card to flip
          </span>
        </div>

        <div className="my-auto py-3">
          <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-relaxed text-center">
            {isFlipped ? currentCard.back : currentCard.front}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/60 text-xs">
          {currentCard.location ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-gray-400">
              <FileText className="w-3 h-3" />
              {currentCard.location}
            </span>
          ) : <span />}

          {statusMap[currentIndex] && (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
              statusMap[currentIndex] === 'mastered'
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
            }`}>
              {statusMap[currentIndex] === 'mastered' ? 'Mastered' : 'Needs Review'}
            </span>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between mt-4">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-xl border border-gray-200 dark:border-[#272B35] disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-[#1E232E] text-gray-700 dark:text-gray-300 transition-colors"
          title="Previous card"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => markStatus('review')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 transition-colors flex items-center gap-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Review again
          </button>
          <button
            type="button"
            onClick={() => markStatus('mastered')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Got it!
          </button>
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="p-2 rounded-xl border border-gray-200 dark:border-[#272B35] disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-[#1E232E] text-gray-700 dark:text-gray-300 transition-colors"
          title="Next card"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
