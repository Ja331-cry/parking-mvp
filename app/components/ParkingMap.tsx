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
  const waitingSpots = spots.filter(s => !s.isOccupied && s.plateText).length;
  const availableSpots = totalSpots - occupiedSpots - waitingSpots;

  return (
    <div className="bg-neu rounded-[2rem] p-6 shadow-neu w-full overflow-hidden relative">

      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-700 tracking-tight mb-4">大駐車場（南側）</h2>
        <div className="flex gap-6">
          <div className="bg-neu shadow-neu-inner rounded-2xl px-5 py-3">
            <p className="text-sm font-black text-slate-500 mb-1">空車</p>
            <p className="text-3xl font-black text-emerald-500">{availableSpots} <span className="text-base text-slate-400 font-bold">台</span></p>
          </div>
          <div className="bg-neu shadow-neu-inner rounded-2xl px-5 py-3">
            <p className="text-sm font-black text-slate-500 mb-1">入庫待ち</p>
            <p className="text-3xl font-black text-amber-500">{waitingSpots} <span className="text-base text-slate-400 font-bold">台</span></p>
          </div>
          <div className="bg-neu shadow-neu-inner rounded-2xl px-5 py-3">
            <p className="text-sm font-black text-slate-500 mb-1">駐車中</p>
            <p className="text-3xl font-black text-slate-600">{occupiedSpots} <span className="text-base text-slate-400 font-bold">台</span></p>
          </div>
        </div>
      </div>

      {/* 駐車場マップUI */}
      <div className="bg-neu rounded-3xl p-6 shadow-neu-inner overflow-x-auto relative w-full mb-4">
        <div className="flex gap-4 justify-center min-w-max relative z-10 mx-auto">
          {zones.map(zone => {
            const zoneSpots = spots.filter(s => s.zone === zone).sort((a, b) => a.spotNumber - b.spotNumber);
            
            // 左側と右側に分ける
            const leftColumn = zoneSpots.slice(0, 10);
            const rightColumn = zoneSpots.slice(10, 20);

            const renderSpot = (spot: ParkingSpot, isLeft: boolean) => {
              const isWaiting = !spot.isOccupied && spot.plateText;
              
              return (
                <div 
                  key={spot.id}
                  className={`w-12 h-8 mb-1 rounded-md transition-all duration-500 flex items-center justify-center text-[9px] font-black relative overflow-hidden
                    ${spot.isOccupied 
                      ? 'bg-neu shadow-neu-sm text-rose-500' // 車が止まっている（出っ張る）
                      : isWaiting
                        ? 'bg-amber-50 shadow-neu text-amber-500 animate-pulse' // 入庫待ち
                        : 'bg-neu shadow-neu-inner-sm text-emerald-500' // 空車（へこむ）
                    }
                  `}
                >
                  {spot.isOccupied ? (
                    <span className="flex items-center gap-1">
                      <span className="text-[8px] opacity-70">{zone}{spot.spotNumber}</span>
                      <span className="text-xs">満</span>
                    </span>
                  ) : isWaiting ? (
                    <span className="flex items-center gap-1">
                      <span className="text-[8px] opacity-70 text-amber-600">{zone}{spot.spotNumber}</span>
                      <span className="text-xs text-amber-500">待</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 drop-shadow-sm">
                      <span className="text-[8px] opacity-70">{zone}{spot.spotNumber}</span>
                      <span className="text-xs">空</span>
                    </span>
                  )}
                </div>
              );
            };

            return (
              <div key={zone} className="flex flex-col items-center">
                <div className="bg-neu shadow-neu text-slate-600 font-black px-5 py-2 rounded-xl mb-6 text-xs tracking-wider">
                  {zone} BLOCK
                </div>
                
                <div className="flex gap-3 relative">
                  {/* 左列 */}
                  <div className="flex flex-col">
                    {leftColumn.map(spot => renderSpot(spot, true))}
                  </div>

                  {/* 中央の通路 */}
                  <div className="w-8 flex flex-col justify-center items-center bg-neu shadow-neu-inner rounded-xl mx-1">
                  </div>

                  {/* 右列 */}
                  <div className="flex flex-col">
                    {rightColumn.map(spot => renderSpot(spot, false))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-between items-center text-sm font-black text-slate-500 px-4">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-neu shadow-neu-inner-sm rounded-md text-emerald-500 flex items-center justify-center text-[10px]">空</div>
            <span>空車</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-amber-50 shadow-neu rounded-md text-amber-500 flex items-center justify-center text-[10px]">待</div>
            <span>入庫待ち</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-neu shadow-neu-sm rounded-md text-rose-500 flex items-center justify-center text-[10px]">満</div>
            <span>満車</span>
          </div>
        </div>
      </div>
    </div>
  );
}
