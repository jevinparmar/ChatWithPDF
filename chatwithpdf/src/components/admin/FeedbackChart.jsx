import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

export default function FeedbackChart({ data = [] }) {
  const COLORS = ['#14B8A6', '#EF4444', '#9CA3AF'];

  return (
    <div className="w-full h-72 flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#181B21',
              borderColor: '#272B35',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '12px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom Legend */}
      <div className="flex items-center justify-center gap-4 text-xs font-medium text-gray-600 dark:text-gray-400">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color || COLORS[idx] }}
            />
            <span>{item.name}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
