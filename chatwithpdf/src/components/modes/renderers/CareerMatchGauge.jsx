import React from 'react';
import { Award, CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function CareerMatchGauge({ data }) {
  const parsed = typeof data === 'string' ? (() => {
    try { return JSON.parse(data); } catch (e) { return null; }
  })() : data;

  if (!parsed) {
    return null;
  }

  // Handle Match Score data
  if (parsed.overall_score !== undefined) {
    const score = parsed.overall_score || 0;
    const breakdown = parsed.breakdown || [];
    const matched = parsed.matched_keywords || [];
    const missing = parsed.missing_keywords || [];

    const getScoreColor = (val) => {
      if (val >= 80) return 'text-teal-500';
      if (val >= 60) return 'text-amber-500';
      return 'text-pink-500';
    };

    return (
      <div className="rounded-2xl border border-pink-200 dark:border-pink-900/40 bg-white dark:bg-[#12141C] p-5 shadow-xs my-3">
        {/* Top Header & Gauge */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#1E232E]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-md bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400">
                <Award className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Resume & Job Match Score
              </h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Alignment evaluation against the target Job Description
            </p>
          </div>

          <div className="flex items-baseline gap-1 bg-pink-50/70 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800/40 px-4 py-2 rounded-2xl">
            <span className={`text-3xl font-black ${getScoreColor(score)}`}>
              {score}%
            </span>
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Match</span>
          </div>
        </div>

        {/* Category Breakdown Bars */}
        {breakdown.length > 0 && (
          <div className="my-4 space-y-2.5">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Category Breakdown
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {breakdown.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl border border-gray-100 dark:border-[#1E232E] bg-gray-50/50 dark:bg-[#161922]">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{item.category}</span>
                    <span className="font-bold text-pink-600 dark:text-pink-400">{item.score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, item.score)}%` }}
                    />
                  </div>
                  {item.notes && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                      {item.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matched vs Missing Keywords */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-[#1E232E]">
          <div>
            <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Matched Keywords ({matched.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {matched.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 mb-2">
              <XCircle className="w-3.5 h-3.5" />
              Missing / Desired Keywords ({missing.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle Resume Bullet Rewrites
  if (parsed.rewrites && Array.isArray(parsed.rewrites)) {
    return (
      <div className="space-y-3 my-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-pink-500" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            Resume Bullet Point Rewrites
          </h4>
        </div>
        <div className="space-y-3">
          {parsed.rewrites.map((r, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-gray-200 dark:border-[#222733] bg-white dark:bg-[#12141C] shadow-2xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Before */}
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#171A24] border border-gray-200 dark:border-gray-800">
                  <span className="font-semibold text-gray-400 uppercase text-[10px] block mb-1">
                    Original Bullet
                  </span>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed line-through decoration-red-400/60">
                    {r.original}
                  </p>
                </div>

                {/* After */}
                <div className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40">
                  <span className="font-semibold text-teal-700 dark:text-teal-400 uppercase text-[10px] block mb-1">
                    Achievement-Style Rewrite
                  </span>
                  <p className="text-teal-900 dark:text-teal-200 font-medium leading-relaxed">
                    {r.improved}
                  </p>
                </div>
              </div>

              {r.feedback && (
                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 italic">
                  💡 {r.feedback}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
