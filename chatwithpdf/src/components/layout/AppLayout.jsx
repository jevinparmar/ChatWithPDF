import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Settings,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import Sidebar from './Sidebar';
import MobileDrawer from './MobileDrawer';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

export default function AppLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-light-bg dark:bg-[#0B0D12] text-gray-900 dark:text-gray-100 transition-colors selection:bg-indigo-500/20">
      {/* Top Navbar matching screenshot */}
      <header className="h-14 border-b border-gray-200 dark:border-[#1F232B] bg-white dark:bg-[#0E1015] px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 transition-colors">
        {/* Left Section: Logo + Project Dropdown + All Docs */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile hamburger menu */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#181B21]"
            aria-label="Open mobile navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo with Glowing Gradient Squircle */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-xs group-hover:opacity-95 transition-opacity">
              <span className="w-2.5 h-2.5 rounded-xs bg-white/90 rotate-45" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-gray-900 dark:text-white">
              Chatwithpdf
            </span>
          </Link>

          {/* Project Pill Dropdown */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#181B21] border border-gray-200 dark:border-[#272B35] hover:bg-gray-200 dark:hover:bg-[#20242D] transition-colors"
            >
              <span>Project</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {isProjectDropdownOpen && (
              <div
                className="absolute left-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-[#181B21] border border-gray-200 dark:border-[#272B35] shadow-dropdown z-50 py-1 text-xs"
                onClick={() => setIsProjectDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 font-semibold text-gray-400 uppercase text-[10px]">
                  Workspace
                </div>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30"
                >
                  Current Workspace
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full text-left px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20242D]"
                >
                  Manage Knowledge
                </button>
              </div>
            )}
          </div>

          {/* All Docs Link */}
          <Link
            to="/dashboard"
            className="hidden sm:inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            All Docs
          </Link>
        </div>

        {/* Right Section: User Profile Avatar, Name, Settings, Theme Toggle */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/settings"
            className="flex items-center gap-2 group text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'User'}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-gray-200 dark:ring-[#272B35]"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                {user?.name?.[0] || 'A'}
              </div>
            )}
            <span className="hidden md:inline font-medium">Avatar</span>
          </Link>

          <Link
            to="/settings"
            className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </Link>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#181B21] transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main App Layout: Slim Left Navigation Rail + Workspace Canvas */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop Slim Left Navigation Rail */}
        <div className="hidden lg:flex h-full shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Slide-in Drawer */}
        <MobileDrawer isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />

        {/* Dynamic page content */}
        <main className="flex-1 h-full overflow-y-auto min-w-0 bg-light-bg dark:bg-[#0B0D12]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
