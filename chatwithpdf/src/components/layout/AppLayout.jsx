import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileDrawer from './MobileDrawer';

export default function AppLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // Determine page title for top bar
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/chat')) return 'Chat with Documents';
    if (path.startsWith('/documents/')) return 'Document Overview';
    if (path === '/dashboard') return 'Document Hub';
    if (path === '/settings') return 'Application Settings';
    if (path === '/admin') return 'Admin Analytics';
    return 'Chatwithpdf';
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-full shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top bar on mobile (and subtle on desktop) */}
        <header className="lg:hidden h-14 border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {getPageTitle()}
            </h1>
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="flex-1 h-full overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
