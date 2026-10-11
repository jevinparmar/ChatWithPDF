import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Sun, Moon, LayoutDashboard, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import Button from '../ui/Button';

export default function Navbar({ showNavLinks = true }) {
  const { isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 dark:border-dark-border bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-subtle group-hover:bg-indigo-700 transition-colors">
            <FileText className="w-5 h-5" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-gray-900 dark:text-white">
            Chat<span className="text-indigo-600 dark:text-indigo-400">with</span>pdf
          </span>
        </Link>

        {/* Center links on landing */}
        {showNavLinks && (
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              How it works
            </a>
            <a href="#citations" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Citations
            </a>
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button size="sm" variant="outline" icon={LayoutDashboard} className="hidden sm:inline-flex">
                  Dashboard
                </Button>
              </Link>
              <Link to="/chat">
                <Button size="sm" variant="primary" icon={MessageSquare}>
                  Chat Now
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button size="sm" variant="ghost">
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" variant="primary">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
