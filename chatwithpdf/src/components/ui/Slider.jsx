import React from 'react';

export default function Slider({
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  label,
  unit = '',
  description,
  id,
}) {
  const sliderId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between mb-2">
        <div>
          {label && (
            <label
              htmlFor={sliderId}
              className="text-sm font-medium text-gray-900 dark:text-gray-200"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          )}
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        id={sliderId}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
      />
      <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500 mt-1">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}
