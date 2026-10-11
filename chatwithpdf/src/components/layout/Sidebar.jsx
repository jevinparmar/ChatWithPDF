import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  HelpCircle,
  Plus,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';

export default function Sidebar({ onItemClick, isDrawer = false }) {
  const { user, isAdmin, logout } = useAuth();
  const { createSession } = useChat();

  const navItems = [
    { name: 'Chat', path: '/chat', icon: MessageSquare },
    { name: 'Documents', path: '/dashboard', icon: FileText },
    { name: 'Overview', path: '/dashboard#overview', icon: LayoutDashboard },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Admin', path: '/admin', icon: ShieldCheck });
  }

  // If used in mobile drawer, render full width expanded list
  if (isDrawer) {
    return (
      <aside className="w-full h-full bg-white dark:bg-[#12151B] flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-[#202530]">
            <span className="font-semibold text-sm">Chatwithpdf</span>
          </div>

          <button
            type="button"
            onClick={async () => {
              const session = await createSession();
              if (onItemClick) onItemClick();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 mb-4 rounded-xl bg-indigo-600 text-white text-xs font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1E27]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
            <NavLink
              to="/settings"
              onClick={onItemClick}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1E27]"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </NavLink>
          </nav>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-[#202530] flex items-center justify-between text-xs">
          <span className="truncate text-gray-500">{user?.email}</span>
          <button
            type="button"
            onClick={logout}
            className="text-gray-400 hover:text-red-500 p-1"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // Desktop slim rail (matches screenshot exactly)
  return (
    <aside className="w-14 h-full bg-white dark:bg-[#0E1015] border-r border-gray-200 dark:border-[#1F232B] flex flex-col justify-between py-4 items-center shrink-0 z-20 transition-colors">
      {/* Top Nav Icons */}
      <div className="flex flex-col items-center gap-3 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.name}
              className={({ isActive }) =>
                `w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-gray-100 dark:bg-[#1E232C] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2E3542]'
                    : 'text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#181B21]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Nav Icons */}
      <div className="flex flex-col items-center gap-3 w-full">
        <button
          type="button"
          onClick={() => alert('Chatwithpdf Document Q&A v1.0. All answers are grounded in uploaded files.')}
          title="Help & Documentation"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#181B21] transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <NavLink
          to="/settings"
          title="Settings"
          className={({ isActive }) =>
            `w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              isActive
                ? 'bg-gray-100 dark:bg-[#1E232C] text-gray-900 dark:text-white'
                : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#181B21]'
            }`
          }
        >
          <Settings className="w-4 h-4" />
        </NavLink>
      </div>
    </aside>
  );
}
