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
    <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer font-black bg-neu px-5 py-2.5 rounded-xl shadow-neu active:shadow-neu-inner transition-all select-none">
      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={isWarningOnly}
          onChange={handleChange}
          disabled={isPending}
          className="peer appearance-none w-5 h-5 bg-neu shadow-neu-inner rounded focus:outline-none transition-all cursor-pointer"
        />
        <svg className="absolute w-4 h-4 left-0.5 top-0.5 text-rose-500 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
      </div>
      <span className={isWarningOnly ? "text-rose-600" : ""}>警告（NG）のみ表示</span>
    </label>
  );
}
