import React, { useEffect, useState } from 'react';
import {
  Users,
  FileText,
  MessageSquare,
  ThumbsDown,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '../api';
import StatCard from '../components/admin/StatCard';
import UsageChart from '../components/admin/UsageChart';
import FeedbackChart from '../components/admin/FeedbackChart';
import Skeleton from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';
import { formatDate } from '../utils/formatDate';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminApi.getStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/40 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Control Plane</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            System Insights &amp; Governance
          </h1>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          change="+14% MoM"
          icon={Users}
        />
        <StatCard
          title="Indexed Files"
          value={stats.totalDocuments.toLocaleString()}
          change="+8% this week"
          icon={FileText}
        />
        <StatCard
          title="Queries Served"
          value={stats.totalQuestions.toLocaleString()}
          change="+24% peak"
          icon={MessageSquare}
        />
        <StatCard
          title="Satisfaction"
          value={`${stats.satisfactionRate}%`}
          change="+1.8%"
          icon={TrendingUp}
        />
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 shadow-subtle">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Questions Handled Per Day
          </h3>
          <UsageChart data={stats.questionsPerDay} />
        </div>

        <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 shadow-subtle">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Response Quality &amp; User Feedback
          </h3>
          <FeedbackChart data={stats.feedbackBreakdown} />
        </div>
      </div>

      {/* Recent Users Table */}
      <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 shadow-subtle space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Recent Active Users
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-dark-bg/60 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-dark-border">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Documents</th>
                <th className="py-3 px-4">Questions</th>
                <th className="py-3 px-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
              {stats.recentUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={u.role === 'admin' ? 'indigo' : 'neutral'} size="sm">
                      {u.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{u.documents}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{u.questions}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{formatDate(u.joined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Downvoted Answers Inspection List */}
      <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 shadow-subtle space-y-4">
        <div className="flex items-center gap-2">
          <ThumbsDown className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Downvoted Responses for Review ({stats.downvotedAnswers.length})
          </h3>
        </div>

        <div className="space-y-3">
          {stats.downvotedAnswers.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-red-100 dark:border-red-950/60 bg-red-50/40 dark:bg-red-950/20 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between text-gray-500">
                <span>By {item.userEmail} · Ref: {item.documentName}</span>
                <span>{formatDate(item.date)}</span>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">
                Q: "{item.question}"
              </p>
              <p className="text-gray-700 dark:text-gray-300 italic">
                A: "{item.answer}"
              </p>
              <div className="pt-2 border-t border-red-200/50 dark:border-red-900/40 text-red-700 dark:text-red-300 font-medium">
                Issue Reported: {item.reason}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
