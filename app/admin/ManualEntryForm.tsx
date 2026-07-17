'use client';

import { useState, useTransition } from 'react';
import { processManualEntry } from './actions/manualEntry';

export default function ManualEntryForm() {
  const [plate, setPlate] = useState('');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ isOk: boolean; status: string; assignedSpot: string | null; error?: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim()) return;

    setResult(null);
    startTransition(async () => {
      const res = await processManualEntry(plate);
      if (!res.success) {
        setResult({ isOk: false, status: res.error || 'エラーが発生しました', assignedSpot: null, error: res.error });
      } else {
        setResult({
          isOk: res.isOk ?? false,
          status: res.status ?? '',
          assignedSpot: res.assignedSpot ?? null,
        });
      }
      setPlate('');
      
      // 10秒後に結果をクリア
      setTimeout(() => {
        setResult(null);
      }, 10000);
    });
  };

  return (
    <div className="bg-neu shadow-neu p-6 sm:p-8 rounded-[2rem] mb-10 overflow-hidden">
      <h2 className="text-xl font-black text-slate-700 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        手動入庫受付
      </h2>
      <p className="text-slate-500 text-sm mb-6">カメラが読み取れない場合などに、手動でナンバーを入力して空き枠を割り当てます。</p>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-black text-slate-700 mb-2" htmlFor="plateText">
            車のナンバー (例: 品川500あ1234)
          </label>
          <input
            id="plateText"
            type="text"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="手入力でナンバーを入力"
            className="w-full bg-neu shadow-neu-inner px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-slate-700"
            disabled={isPending}
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !plate.trim()}
          className="w-full sm:w-auto px-8 py-3.5 bg-neu shadow-neu active:shadow-neu-inner rounded-xl font-black text-indigo-600 transition-all disabled:opacity-50 whitespace-nowrap flex items-center justify-center shrink-0 h-[48px]"
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2"></div>
              処理中...
            </>
          ) : (
            '受付・割当を実行'
          )}
        </button>
      </form>

      {/* 判定・割当結果表示 */}
      {result && (
        <div className={`mt-6 p-6 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300 shadow-neu-inner ${
          result.isOk ? 'bg-neu text-emerald-600' : 'bg-neu text-rose-600'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            {result.isOk ? (
              <div className="w-8 h-8 rounded-full shadow-neu flex items-center justify-center text-emerald-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full shadow-neu flex items-center justify-center text-rose-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </div>
            )}
            <h3 className="text-lg font-black tracking-wide">
              {result.isOk ? '受付完了（登録車両）' : '受付不可'}
            </h3>
          </div>
          
          <p className="font-bold mb-4 ml-11 text-slate-600">
            判定結果: {result.status}
          </p>

          {result.assignedSpot && (
            <div className={`ml-11 mt-4 rounded-[2rem] p-6 shadow-neu text-center`}>
              <p className={`font-black text-sm mb-2 ${result.isOk ? 'text-emerald-500' : 'text-rose-500'}`}>ドライバーへの案内</p>
              <div className={`text-4xl font-black tracking-widest text-slate-700`}>
                {result.assignedSpot}
              </div>
              <p className={`font-bold text-xs mt-3 ${result.isOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                ※下部のマップの該当箇所が自動的に満車に更新されました。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
