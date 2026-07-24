'use client';

import { useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toggleParkingSpot } from './actions/parking';

type ParkingSpot = {
  id: string;
  zone: string;
  spotNumber: number;
  isOccupied: boolean;
  plateText: string | null;
  updatedAt: Date;
};

export default function AdminParkingMap({ spots }: { spots: ParkingSpot[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    // 3秒ごとに画面のデータを最新に更新（自動リロード）
    const interval = setInterval(() => {
      router.refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [router]);

  const handleToggle = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      await toggleParkingSpot(id, currentStatus);
    });
  };

  const zones = ['A', 'B', 'C', 'D', 'E'];
  const totalSpots = spots.length;
  const occupiedSpots = spots.filter(s => s.isOccupied).length;
  const waitingSpots = spots.filter(s => !s.isOccupied && s.plateText).length;
  const availableSpots = totalSpots - occupiedSpots - waitingSpots;

  return (
    <div className="bg-neu shadow-neu border-none rounded-[2rem] p-6 sm:p-8 mb-10 overflow-hidden relative">
      <div className="mb-8 flex justify-between items-center flex-wrap gap-4 border-b border-white/20 pb-4">
        <h2 className="text-xl font-black text-slate-700 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
          駐車場マップ管理（手動操作）
        </h2>
        <div className="flex gap-4">
          <div className="bg-neu shadow-neu-inner rounded-xl px-4 py-2">
            <span className="text-xs font-black text-emerald-600">空車: {availableSpots} 台</span>
          </div>
          <div className="bg-neu shadow-neu-inner rounded-xl px-4 py-2">
            <span className="text-xs font-black text-amber-500">入庫待ち: {waitingSpots} 台</span>
          </div>
          <div className="bg-neu shadow-neu-inner rounded-xl px-4 py-2">
            <span className="text-xs font-black text-rose-500">満車: {occupiedSpots} 台</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-6 font-medium">
        枠をクリックすると、強制的に「入庫（満車）」と「出庫（空車）」を切り替えることができます。
        {isPending && <span className="ml-3 text-indigo-600 font-bold animate-pulse">更新中...</span>}
      </p>

      {/* 駐車場マップUI */}
      <div className="bg-neu rounded-3xl p-6 shadow-neu-inner overflow-x-auto relative w-full">
        <div className="flex gap-4 justify-center min-w-max relative z-10 mx-auto">
          {zones.map(zone => {
            const zoneSpots = spots.filter(s => s.zone === zone).sort((a, b) => a.spotNumber - b.spotNumber);
            
            // 左側と右側に分ける
            const leftColumn = zoneSpots.slice(0, 10);
            const rightColumn = zoneSpots.slice(10, 20);

            const renderSpot = (spot: ParkingSpot & { plateText?: string | null }, isLeft: boolean) => {
              const isWaiting = !spot.isOccupied && spot.plateText;
              
              const getDurationString = (date: Date) => {
                const diffMs = Date.now() - new Date(date).getTime();
                const diffMins = Math.floor(diffMs / 60000);
                if (diffMins < 60) return `${diffMins}分`;
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                return `${hours}時間${mins}分`;
              };

              return (
                <button 
                  key={spot.id}
                  onClick={() => handleToggle(spot.id, spot.isOccupied)}
                  disabled={isPending}
                  title={spot.isOccupied ? `満車: ${spot.plateText || '不明'}\n駐車時間: ${getDurationString(spot.updatedAt)}\n(クリックで出庫)` : isWaiting ? `入庫待ち: ${spot.plateText} - クリックで強制入庫` : `空車 - クリックで手動入庫`}
                  className={`w-12 h-8 mb-1 rounded-md transition-all duration-300 flex items-center justify-center text-[9px] font-black cursor-pointer relative overflow-hidden active:scale-95
                    ${spot.isOccupied 
                      ? 'bg-neu shadow-neu-sm text-rose-500 hover:shadow-neu' // 満車
                      : isWaiting
                        ? 'bg-amber-50 shadow-neu text-amber-500 hover:shadow-neu animate-pulse' // 入庫待ち
                        : 'bg-neu shadow-neu-inner-sm text-emerald-500 hover:shadow-neu-inner' // 空車
                    }
                    ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
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
                    <span className="flex items-center gap-1">
                      <span className="text-[8px] opacity-70">{zone}{spot.spotNumber}</span>
                      <span className="text-xs">空</span>
                    </span>
                  )}
                </button>
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
    </div>
  );
}
