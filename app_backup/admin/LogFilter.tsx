'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export default function LogFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const isWarningOnly = searchParams.get('warningOnly') === 'true';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams);
    if (e.target.checked) {
      params.set('warningOnly', 'true');
    } else {
      params.delete('warningOnly');
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer font-bold bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={isWarningOnly}
          onChange={handleChange}
          disabled={isPending}
          className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 checked:bg-rose-500 checked:border-rose-500 transition-all cursor-pointer"
        />
        <svg className="absolute w-5 h-5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
      </div>
      <span className={isWarningOnly ? "text-rose-600" : ""}>警告（NG）の履歴のみ表示</span>
    </label>
  );
}
