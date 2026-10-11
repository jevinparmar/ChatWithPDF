import React from 'react';

export default function Skeleton({ className = '', variant = 'rect' }) {
  const variantStyles = {
    rect: 'rounded-xl',
    circle: 'rounded-full',
    text: 'rounded-md h-4',
  };

  return (
    <div
      className={`animate-pulse bg-gray-200/80 dark:bg-dark-border/70 ${variantStyles[variant] || ''} ${className}`}
    />
  );
}
