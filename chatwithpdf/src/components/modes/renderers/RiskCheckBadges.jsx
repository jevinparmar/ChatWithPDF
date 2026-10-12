import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, FileText, Info } from 'lucide-react';

export default function RiskCheckBadges({ data }) {
  const parsed = typeof data === 'string' ? (() => {
    try { return JSON.parse(data); } catch (e) { return null; }
  })() : data;

  const risks = parsed?.risks || [];

  return (
    <div className="space-y-4 my-3">
      {/* Mandatory Legal Notice Banner */}
      <div className="rounded-xl p-3.5 bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block mb-0.5">Legal Disclaimer</span>
          This is an AI summary to help you read the document, not legal advice. Please consult a qualified lawyer for decisions.
        </div>
      </div>

      {/* Risks Table / Badge Cards */}
      <div className="space-y-2.5">
        {risks.map((item, idx) => {
          const levelLower = (item.level || '').toLowerCase();
          const isRed = levelLower.includes('red') || levelLower.includes('high');
          const isAmber = levelLower.includes('amber') || levelLower.includes('yellow') || levelLower.includes('medium');
          const isGreen = levelLower.includes('green') || levelLower.includes('low') || levelLower.includes('standard');

          const badgeColor = isRed
            ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/50'
            : isAmber
            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
            : 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border-teal-200 dark:border-teal-900/50';

          const cardBorder = isRed
            ? 'border-red-200/80 dark:border-red-950/60'
            : isAmber
            ? 'border-amber-200/80 dark:border-amber-950/60'
            : 'border-gray-200 dark:border-[#222733]';

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border bg-white dark:bg-[#11141C] shadow-2xs transition-all ${cardBorder}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                    {isRed ? 'High Risk' : isAmber ? 'Caution' : 'Standard'}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                    {item.clause}
                  </span>
                </div>

                {item.location && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-400">
                    <FileText className="w-3 h-3" />
                    {item.location}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {item.reason}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
