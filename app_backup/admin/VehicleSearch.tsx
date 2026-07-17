'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState } from 'react';

export default function VehicleSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2 items-center">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        <input
          type="text"
          placeholder="学籍番号・ナンバー"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 shadow-sm font-medium w-48 transition-all focus:w-56"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm hover:bg-slate-200 transition-colors font-bold shadow-sm active:scale-[0.98]"
      >
        検索
      </button>
      {searchParams.get('q') && (
        <button
          type="button"
          onClick={() => {
            setQuery('');
            const params = new URLSearchParams(searchParams);
            params.delete('q');
            startTransition(() => router.push(`?${params.toString()}`));
          }}
          className="px-3 py-2 text-rose-600 hover:text-rose-800 text-sm font-bold transition-colors bg-rose-50 hover:bg-rose-100 rounded-xl"
        >
          クリア
        </button>
      )}
    </form>
  );
}
