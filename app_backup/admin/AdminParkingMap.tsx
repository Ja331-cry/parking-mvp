'use client';

import { useTransition } from 'react';
import { toggleParkingSpot } from './actions/parking';

type ParkingSpot = {
  id: string;
  zone: string;
  spotNumber: number;
  isOccupied: boolean;
  plateText: string | null;
};

export default function AdminParkingMap({ spots }: { spots: ParkingSpot[] }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      await toggleParkingSpot(id, currentStatus);
    });
  };

  const zones = ['A', 'B', 'C', 'D', 'E'];
  const totalSpots = spots.length;
  const occupiedSpots = spots.filter(s => s.isOccupied).length;
  const availableSpots = totalSpots - occupiedSpots;

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white p-6 sm:p-8 mb-10 overflow-hidden relative">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
          駐車場マップ管理（手動操作）
        </h2>
        <div className="flex gap-4">
          <div className="bg-emerald-50 rounded-lg px-3 py-1.5 border border-emerald-100">
            <span className="text-xs font-bold text-emerald-600">空車: {availableSpots} 台</span>
          </div>
          <div className="bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200">
            <span className="text-xs font-bold text-slate-600">満車: {occupiedSpots} 台</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-6 font-medium">
        枠をクリックすると、強制的に「入庫（満車）」と「出庫（空車）」を切り替えることができます。
        {isPending && <span className="ml-3 text-indigo-600 font-bold animate-pulse">更新中...</span>}
      </p>

      {/* 駐車場マップUI */}
      <div className="bg-slate-800 rounded-2xl p-4 border-4 border-slate-700 overflow-x-auto shadow-inner relative w-full">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-400 via-slate-800 to-slate-900 pointer-events-none"></div>
        <div className="flex gap-4 justify-center min-w-max relative z-10 mx-auto">
          {zones.map(zone => {
            const zoneSpots = spots.filter(s => s.zone === zone).sort((a, b) => a.spotNumber - b.spotNumber);
            
            // 左側と右側に分ける
            const leftColumn = zoneSpots.slice(0, 10);
            const rightColumn = zoneSpots.slice(10, 20);

            const renderSpot = (spot: ParkingSpot & { plateText?: string | null }, isLeft: boolean) => (
              <button 
                key={spot.id}
                onClick={() => handleToggle(spot.id, spot.isOccupied)}
                disabled={isPending}
                title={spot.isOccupied ? `満車: ${spot.plateText || '不明'} - クリックで出庫` : `空車 - クリックで手動入庫`}
                className={`w-12 h-6 border-2 transition-all duration-200 flex items-center justify-center text-[9px] font-bold cursor-pointer relative overflow-hidden
                  ${spot.isOccupied 
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 shadow-[inset_0_0_8px_rgba(244,63,94,0.15)]' 
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 shadow-[inset_0_0_8px_rgba(16,185,129,0.15)]'
                  }
                  ${isLeft ? 'border-r-0' : 'border-l-0'} 
                  ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
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
              </button>
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
    </div>
  );
}
