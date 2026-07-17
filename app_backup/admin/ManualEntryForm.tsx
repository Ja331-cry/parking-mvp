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
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-8">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          手動入庫受付
        </h2>
        <p className="text-slate-500 text-sm mt-1">カメラが読み取れない場合などに、手動でナンバーを入力して空き枠を割り当てます。</p>
      </div>
      
      <div className="p-6">
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="plateInput" className="block text-sm font-bold text-slate-700 mb-1">
              ナンバープレート入力
            </label>
            <input
              id="plateInput"
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="例: 富山500あ1234"
              className="block w-full rounded-lg border-slate-300 bg-slate-50 border px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-blue-500 shadow-sm transition-colors"
              disabled={isPending}
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !plate.trim()}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                処理中...
              </>
            ) : (
              '受付・割当を実行'
            )}
          </button>
        </form>

        {/* 判定・割当結果表示 */}
        {result && (
          <div className={`mt-6 p-6 rounded-xl border-2 animate-in fade-in slide-in-from-top-2 duration-300 ${
            result.isOk ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {result.isOk ? (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
              )}
              <h3 className={`text-lg font-bold ${result.isOk ? 'text-emerald-800' : 'text-rose-800'}`}>
                {result.isOk ? '受付完了（登録車両）' : '受付不可'}
              </h3>
            </div>
            
            <p className={`font-medium mb-4 ml-11 ${result.isOk ? 'text-emerald-700' : 'text-rose-700'}`}>
              判定結果: {result.status}
            </p>

            {result.assignedSpot && (
              <div className={`ml-11 mt-4 bg-white rounded-lg p-5 border shadow-sm text-center ${result.isOk ? 'border-emerald-100' : 'border-rose-100'}`}>
                <p className={`font-bold text-sm mb-1 ${result.isOk ? 'text-emerald-600' : 'text-rose-600'}`}>ドライバーへの案内</p>
                <div className={`text-3xl font-black tracking-wider ${result.isOk ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {result.assignedSpot}
                </div>
                <p className={`font-medium text-sm mt-2 ${result.isOk ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ※下部のマップの該当箇所が自動的に満車に更新されました。
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
