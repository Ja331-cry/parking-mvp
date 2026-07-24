'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';

interface HourlyData {
  hour: string;
  entryCount: number;
  exitCount: number;
}

interface AnalyticsDashboardProps {
  averageDurationMinutes: number;
  busiestHour: string;
  busiestExitHour: string;
  hourlyData: HourlyData[];
}

export default function AnalyticsDashboard({
  averageDurationMinutes,
  busiestHour,
  busiestExitHour,
  hourlyData
}: AnalyticsDashboardProps) {
  
  const formatDuration = (minutes: number) => {
    if (minutes === 0) return 'データなし';
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    if (h > 0) {
      return `${h}時間 ${m}分`;
    }
    return `${m}分`;
  };

  // グラフの色を動的に設定（一番混んでいる時間を強調）
  const maxEntryCount = Math.max(...hourlyData.map(d => d.entryCount), 0);

  return (
    <div className="flex flex-col gap-10">
      {/* 統計情報カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neu shadow-neu rounded-[2rem] p-8 flex flex-col justify-center items-center text-center transition-transform hover:-translate-y-1">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-neu-inner-sm">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-slate-500 font-bold text-sm mb-2">平均駐車時間</h3>
          <p className="text-3xl lg:text-4xl font-black text-slate-800">{formatDuration(averageDurationMinutes)}</p>
        </div>

        <div className="bg-neu shadow-neu rounded-[2rem] p-8 flex flex-col justify-center items-center text-center transition-transform hover:-translate-y-1">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4 shadow-neu-inner-sm">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-slate-500 font-bold text-sm mb-2">一番入庫が多い時間帯</h3>
          <p className="text-3xl lg:text-4xl font-black text-slate-800">{busiestHour}</p>
        </div>

        <div className="bg-neu shadow-neu rounded-[2rem] p-8 flex flex-col justify-center items-center text-center transition-transform hover:-translate-y-1">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-neu-inner-sm">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-slate-500 font-bold text-sm mb-2">一番出庫が多い時間帯</h3>
          <p className="text-3xl lg:text-4xl font-black text-slate-800">{busiestExitHour}</p>
        </div>
      </div>

      {/* グラフ */}
      <div className="bg-neu shadow-neu rounded-[2rem] p-6 lg:p-8">
        <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2 mb-8">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          時間帯別の入出庫数
        </h3>
        
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={hourlyData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="hour" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                dx={-10}
              />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="entryCount" name="入庫数" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              <Bar dataKey="exitCount" name="出庫数" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
