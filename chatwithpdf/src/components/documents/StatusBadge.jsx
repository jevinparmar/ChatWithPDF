import React from 'react';
import Badge from '../ui/Badge';
import { Loader2 } from 'lucide-react';

export default function StatusBadge({ status }) {
  const norm = (status || '').toLowerCase();

  if (norm === 'ready') {
    return (
      <Badge variant="success" dot size="sm">
        Ready
      </Badge>
    );
  }

  if (norm === 'processing') {
    return (
      <Badge variant="warning" size="sm" className="gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin text-amber-600 dark:text-amber-400" />
        Processing
      </Badge>
    );
  }

  if (norm === 'failed') {
    return (
      <Badge variant="error" dot size="sm">
        Failed
      </Badge>
    );
  }

  return (
    <Badge variant="neutral" size="sm">
      {status || 'Unknown'}
    </Badge>
  );
}
