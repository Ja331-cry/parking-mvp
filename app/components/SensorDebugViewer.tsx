'use client';

import { useState, useEffect } from 'react';

type SensorState = {
  message: string;
  timestamp: number;
  zone: string;
  spotNumber: number;
};

export default function SensorDebugViewer() {
  const [state, setState] = useState<SensorState | null>(null);

  useEffect(() => {
    // 0.5秒おきに状態ファイルを読み込む
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/sensor-state.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setState(data);
        }
      } catch (e) {
        // 無視
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (!state) return null;

  // 10秒以上更新がない場合は通信が切れているとみなして非表示
  if (Date.now() - state.timestamp > 10000) {
    return null;
  }

  // 状態に応じた色分け
  const isParked = state.message.includes('★★★ 駐車認識済み ★★★');
  const isDetecting = state.message.includes('駐車判定中');
  
  let statusColor = 'text-gray-500';
  let bgColor = 'bg-neu';
  
  if (isParked) {
    statusColor = 'text-red-500 font-bold';
  } else if (isDetecting) {
    statusColor = 'text-indigo-500 font-bold';
    bgColor = 'bg-indigo-50';
  }

  return (
    <div className={`fixed bottom-6 right-6 p-4 rounded-2xl shadow-neu z-50 transition-all ${bgColor}`}>
      <div className="flex flex-col gap-1">
        <div className="text-xs text-gray-500 font-semibold tracking-wider flex items-center justify-between">
          <span>SENSOR DEBUG</span>
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px]">
            {state.zone}{state.spotNumber}
          </span>
        </div>
        <div className={`text-sm font-bold ${statusColor}`}>
          {state.message}
        </div>
      </div>
    </div>
  );
}
