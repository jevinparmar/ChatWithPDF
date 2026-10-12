import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Award, ChevronRight, HelpCircle, FileText } from 'lucide-react';

export default function QuizPlayer({ data, onCitationClick }) {
  // Support either parsed JSON object or stringified JSON
  const quiz = typeof data === 'string' ? (() => {
    try { return JSON.parse(data); } catch (e) { return null; }
  })() : data;

  const questions = quiz?.questions || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [questionIndex]: optionIndex }
  const [reviewed, setReviewed] = useState(false);
  const [wrongOnlyIndices, setWrongOnlyIndices] = useState(null);

  if (!questions || questions.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-gray-200 dark:border-[#272B35] bg-gray-50 dark:bg-[#14171F] text-xs text-gray-500">
        Quiz data could not be parsed into questions.
      </div>
    );
  }

  const activeQuestionList = wrongOnlyIndices !== null
    ? wrongOnlyIndices.map((i) => ({ ...questions[i], originalIdx: i }))
    : questions.map((q, i) => ({ ...q, originalIdx: i }));

  const currentQ = activeQuestionList[currentIndex];
  const originalQIndex = currentQ?.originalIdx ?? currentIndex;
  const selectedChoice = selectedAnswers[originalQIndex];
  const isAnswered = selectedChoice !== undefined;

  const handleSelectOption = (idx) => {
    if (isAnswered) return; // Prevent changing answer once selected
    setSelectedAnswers((prev) => ({
      ...prev,
      [originalQIndex]: idx,
    }));
  };

  const handleNext = () => {
    if (currentIndex < activeQuestionList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setReviewed(true);
    }
  };

  // Calculate score
  const totalAnswered = Object.keys(selectedAnswers).length;
  const correctCount = questions.reduce((acc, q, idx) => {
    return selectedAnswers[idx] === q.correctIndex ? acc + 1 : acc;
  }, 0);
  const percentage = Math.round((correctCount / questions.length) * 100);

  const wrongIndices = questions
    .map((q, idx) => (selectedAnswers[idx] !== q.correctIndex ? idx : null))
    .filter((idx) => idx !== null);

  const handleRetryWrong = () => {
    setWrongOnlyIndices(wrongIndices);
    setCurrentIndex(0);
    setReviewed(false);
  };

  const handleResetAll = () => {
    setSelectedAnswers({});
    setWrongOnlyIndices(null);
    setCurrentIndex(0);
    setReviewed(false);
  };

  // Summary / Final Score Screen
  if (reviewed) {
    return (
      <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/20 dark:from-[#131622] dark:via-[#10121A] dark:to-[#171424] p-5 sm:p-6 shadow-xs my-3 animate-in fade-in duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md mb-3">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            Quiz Completed!
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {quiz.title || 'Knowledge Self-Assessment'}
          </p>

          <div className="my-5 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {percentage}%
            </span>
            <span className="text-xs text-gray-500">
              ({correctCount} / {questions.length} correct)
            </span>
          </div>

          {wrongIndices.length > 0 && (
            <div className="w-full text-left my-3 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 mb-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                Areas to Review:
              </span>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                {wrongIndices.map((idx) => (
                  <li key={idx} className="truncate">
                    {questions[idx].question} ({questions[idx].location})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {wrongIndices.length > 0 && (
              <button
                type="button"
                onClick={handleRetryWrong}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Wrong Ones ({wrongIndices.length})
              </button>
            )}
            <button
              type="button"
              onClick={handleResetAll}
              className="px-4 py-2 rounded-xl text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Restart Entire Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-[#252936] bg-white dark:bg-[#12141C] p-4 sm:p-5 shadow-xs my-3">
      {/* Header with Title and Question Counter */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1E232E] pb-3 mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
            Interactive Quiz
          </span>
          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mt-1">
            {quiz.title || 'Document Quiz'}
          </h4>
        </div>
        <span className="text-xs font-mono text-gray-500">
          Question {currentIndex + 1} of {activeQuestionList.length}
        </span>
      </div>

      {/* Question Text */}
      <div className="mb-4">
        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
          {currentQ.question}
        </p>
        {currentQ.location && (
          <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-gray-400 font-mono">
            <FileText className="w-3 h-3" />
            Cited: {currentQ.location}
          </span>
        )}
      </div>

      {/* Options List */}
      <div className="space-y-2 mb-4">
        {currentQ.options.map((opt, optIdx) => {
          const isSelected = selectedChoice === optIdx;
          const isCorrect = optIdx === currentQ.correctIndex;
          
          let optionClasses = 'border-gray-200 dark:border-[#222733] hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-[#161922] text-gray-800 dark:text-gray-200';
          if (isAnswered) {
            if (isCorrect) {
              optionClasses = 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 font-medium';
            } else if (isSelected) {
              optionClasses = 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200';
            } else {
              optionClasses = 'opacity-60 border-gray-200 dark:border-[#222733] bg-gray-50 dark:bg-[#161922]/50 text-gray-500';
            }
          }

          return (
            <button
              key={optIdx}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelectOption(optIdx)}
              className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 transition-all cursor-pointer ${optionClasses}`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-[#202532] text-gray-600 dark:text-gray-400 text-xs font-semibold flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span>{opt}</span>
              </div>
              {isAnswered && isCorrect && (
                <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
              )}
              {isAnswered && isSelected && !isCorrect && (
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation Banner (Revealed after answering) */}
      {isAnswered && (
        <div className={`p-3.5 rounded-xl border text-xs leading-relaxed mb-4 animate-in fade-in duration-150 ${
          selectedChoice === currentQ.correctIndex
            ? 'bg-teal-50/60 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/40 text-teal-900 dark:text-teal-200'
            : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
        }`}>
          <span className="font-semibold block mb-1">
            {selectedChoice === currentQ.correctIndex ? '✅ Correct!' : '❌ Not quite right'}
          </span>
          <p>{currentQ.explanation}</p>
        </div>
      )}

      {/* Action / Next Button */}
      {isAnswered && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            <span>{currentIndex < activeQuestionList.length - 1 ? 'Next Question' : 'View Results'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
