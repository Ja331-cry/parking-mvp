'use client';

import { useEffect, useState } from 'react';

type ParkingSpot = {
  id: string;
  zone: string;
  spotNumber: number;
  isOccupied: boolean;
  plateText: string | null;
};

export default function ParkingMap() {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpots = async () => {
      try {
        const res = await fetch('/api/parking');
        const data = await res.json();
        if (data.success) {
          setSpots(data.spots);
        }
      } catch (err) {
        console.error('Failed to fetch parking spots:', err);
      } finally {
        setLoading(false);
      }
    };
    
    // 初回取得
    fetchSpots();

    // 3秒ごとにDBの最新状況を取得（ポーリング）
    const intervalId = setInterval(fetchSpots, 3000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return <div className="animate-pulse bg-slate-200 h-64 rounded-2xl w-full flex items-center justify-center text-slate-500 font-bold">マップを読み込み中...</div>;
  }

  // ゾーンごとにグループ化
  const zones = ['A', 'B', 'C', 'D', 'E'];
  const totalSpots = spots.length;
  const occupiedSpots = spots.filter(s => s.isOccupied).length;
  const availableSpots = totalSpots - occupiedSpots;

  return (
    <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700 w-full overflow-hidden relative">

      <div className="mb-6">
        <h2 className="text-2xl font-black text-white tracking-tight mb-2">大駐車場（南側）</h2>
        <div className="flex gap-6">
          <div className="bg-slate-800/50 rounded-xl px-4 py-2 border border-slate-700">
            <p className="text-sm font-medium text-slate-400 mb-1">空車</p>
            <p className="text-3xl font-black text-emerald-400">{availableSpots} <span className="text-base text-slate-500 font-medium">台</span></p>
          </div>
          <div className="bg-slate-800/50 rounded-xl px-4 py-2 border border-slate-700">
            <p className="text-sm font-medium text-slate-400 mb-1">駐車中</p>
            <p className="text-3xl font-black text-slate-300">{occupiedSpots} <span className="text-base text-slate-500 font-medium">台</span></p>
          </div>
        </div>
      </div>

      {/* 駐車場マップUI */}
      <div className="bg-slate-800 rounded-2xl p-4 border-4 border-slate-700 overflow-x-auto shadow-inner relative w-full">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-400 via-slate-800 to-slate-900 pointer-events-none"></div>
        <div className="flex gap-4 justify-center min-w-max relative z-10 mx-auto">
          {zones.map(zone => {
            const zoneSpots = spots.filter(s => s.zone === zone).sort((a, b) => a.spotNumber - b.spotNumber);
            
            // 左側と右側に分ける
            const leftColumn = zoneSpots.slice(0, 10);
            const rightColumn = zoneSpots.slice(10, 20);

            const renderSpot = (spot: ParkingSpot, isLeft: boolean) => (
              <div 
                key={spot.id}
                className={`w-12 h-6 border-2 transition-all duration-500 flex items-center justify-center text-[9px] font-bold relative overflow-hidden
                  ${spot.isOccupied 
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 shadow-[inset_0_0_8px_rgba(244,63,94,0.15)]' 
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_8px_rgba(16,185,129,0.15)]'
                  }
                  ${isLeft ? 'border-r-0' : 'border-l-0'}
                `}
                style={{
                  borderTopColor: spot.spotNumber % 10 === 1 ? (spot.isOccupied ? 'rgba(244,63,94,0.4)' : 'rgba(16,185,129,0.4)') : 'transparent',
                }}
              >
                {!spot.isOccupied ? (
                  <span className="flex items-center gap-1 drop-shadow-sm">
                    <span className="text-[8px] opacity-70">{zone}{spot.spotNumber}</span>
                    <span className="text-xs font-black">空</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 drop-shadow-md">
                    <span className="text-[8px] opacity-70">{zone}{spot.spotNumber}</span>
                    <span className="text-xs font-black">満</span>
                  </span>
                )}
              </div>
            );

            return (
              <div key={zone} className="flex flex-col items-center">
                <div className="bg-slate-900 border border-slate-700 text-white font-black px-4 py-1.5 rounded-lg mb-4 text-xs shadow-xl tracking-wider">
                  {zone} BLOCK
                </div>
                
                <div className="flex gap-2 p-1 rounded-lg relative">
                  {/* 左列 */}
                  <div className="flex flex-col">
                    {leftColumn.map(spot => renderSpot(spot, true))}
                    <div className="w-12 border-t-2 border-white"></div>
                  </div>

                  {/* 中央の通路 */}
                  <div className="w-6 flex flex-col justify-center items-center">
                    <div className="h-full w-0.5 border-l-[3px] border-dashed border-yellow-500/70"></div>
                  </div>

                  {/* 右列 */}
                  <div className="flex flex-col">
                    {rightColumn.map(spot => renderSpot(spot, false))}
                    <div className="w-12 border-t-2 border-white"></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center text-sm">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-500/20 border border-emerald-400 rounded-sm"></div>
            <span className="text-slate-400 font-medium">空車</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-600 border border-slate-500 rounded-sm"></div>
            <span className="text-slate-400 font-medium">満車</span>
          </div>
        </div>
      </div>
    </div>
  );
}
