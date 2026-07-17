'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState } from 'react';

export default function VehicleSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const q = searchParams.get('q') || '';
  const [query, setQuery] = useState(q);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchQuery = formData.get('q') as string;
    const params = new URLSearchParams(searchParams);
    if (searchQuery) {
      params.set('q', searchQuery);
    } else {
      params.delete('q');
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full sm:w-auto relative gap-2">
      <div className="relative">
        <input
          type="text"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="学籍番号かナンバーで検索"
          className="w-full sm:w-64 bg-neu shadow-neu-inner px-5 py-2.5 rounded-xl text-sm font-black text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all pr-12"
        />
        <button 
          type="submit" 
          disabled={isPending}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-500 transition-colors bg-neu shadow-neu active:shadow-neu-inner rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </button>
      </div>
      {searchParams.get('q') && (
        <button
          type="button"
          onClick={() => {
            setQuery('');
            const params = new URLSearchParams(searchParams);
            params.delete('q');
            startTransition(() => router.push(`?${params.toString()}`));
          }}
          className="px-4 py-2 text-rose-500 bg-neu shadow-neu active:shadow-neu-inner text-sm font-black transition-colors rounded-xl flex items-center justify-center shrink-0"
        >
          クリア
        </button>
      )}
    </form>
  );
}
