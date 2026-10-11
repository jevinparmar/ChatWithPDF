import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 shadow-subtle">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">404</h1>
      <h2 className="text-xl font-semibold mb-3">Page not found</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-8">
        The document or link you are trying to reach does not exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link to="/">
          <Button variant="outline" size="md">
            Go to Landing
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button variant="primary" size="md" icon={ArrowLeft}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
