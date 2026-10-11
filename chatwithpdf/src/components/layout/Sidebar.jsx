import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldCheck,
  Plus,
  LogOut,
  Sun,
  Moon,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useChat } from '../../hooks/useChat';
import Button from '../ui/Button';

export default function Sidebar({ onItemClick }) {
  const { user, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { createSession } = useChat();
  const navigate = useNavigate();

  const handleNewChat = async () => {
    try {
      const session = await createSession();
      if (onItemClick) onItemClick();
      navigate(`/chat/${session.id}`);
    } catch (e) {
      navigate('/chat');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Chat AI', path: '/chat', icon: MessageSquare },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Admin Insights', path: '/admin', icon: ShieldCheck });
  }

  return (
    <aside className="w-64 h-full bg-white dark:bg-dark-card border-r border-gray-100 dark:border-dark-border flex flex-col justify-between shrink-0 transition-colors">
      <div>
        {/* Logo header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100 dark:border-dark-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-subtle">
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-semibold text-base tracking-tight text-gray-900 dark:text-white">
              Chat<span className="text-indigo-600 dark:text-indigo-400">with</span>pdf
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Action Button */}
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            variant="primary"
            icon={Plus}
            className="w-full justify-center shadow-xs"
          >
            New Chat
          </Button>
        </div>

        {/* Navigation list */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onItemClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-hover hover:text-gray-900 dark:hover:text-gray-200'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User profile footer */}
      <div className="p-3 border-t border-gray-100 dark:border-dark-border">
        <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-dark-bg/60 border border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-2.5 min-w-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'User'}
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-gray-200 dark:ring-dark-border"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                {user?.name?.[0] || 'U'}
              </div>
            )}
            <div className="min-w-0 truncate">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                {user?.name || 'Account'}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {user?.email || 'user@test.com'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-card transition-colors shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
