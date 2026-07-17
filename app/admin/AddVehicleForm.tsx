'use client';

import { useState } from 'react';
import { addVehicle } from './actions';

export default function AddVehicleForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setLoading(true);
    try {
      await addVehicle(formData);
      const form = document.getElementById('add-vehicle-form') as HTMLFormElement;
      if (form) form.reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form id="add-vehicle-form" action={handleSubmit} className="bg-neu shadow-neu p-8 sm:p-10 rounded-[2rem] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 shadow-neu-sm"></div>
      <h2 className="text-xl font-black mb-6 text-slate-800 flex items-center gap-2">
        <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        新規車両の登録
      </h2>
      {error && <div className="mb-6 text-rose-600 text-sm bg-rose-50 border border-rose-100 p-4 rounded-xl font-medium flex items-center gap-2">
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        {error}
      </div>}
      <div className="flex flex-col md:flex-row gap-5 items-end">
        <div className="w-full">
          <label className="block text-sm font-black text-slate-700 mb-2" htmlFor="studentId">
            学籍番号
          </label>
          <input 
            type="text" 
            id="studentId"
            name="studentId" 
            required 
            placeholder="例: 24A1234"
            className="w-full bg-neu shadow-neu-inner px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-slate-700"
          />
        </div>
        <div className="w-full">
          <label className="block text-sm font-black text-slate-700 mb-2" htmlFor="licensePlate">
            ナンバープレート (ひらがな・数字)
          </label>
          <input 
            type="text" 
            id="licensePlate"
            name="licensePlate" 
            required 
            placeholder="例: 品川500あ1234"
            className="w-full bg-neu shadow-neu-inner px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-slate-700"
          />
        </div>
        <div className="w-full md:w-32 shrink-0">
          <label className="block text-sm font-black text-slate-700 mb-2" htmlFor="grade">
            学年 (1〜4)
          </label>
          <input 
            type="number" 
            id="grade"
            name="grade" 
            min="1" max="4" required 
            placeholder="3"
            className="w-full bg-neu shadow-neu-inner px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-slate-700"
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full sm:w-auto px-8 py-3.5 bg-neu shadow-neu active:shadow-neu-inner rounded-xl font-black text-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
        >
          {loading ? '登録中...' : '登録する'}
        </button>
      </div>
    </form>
  );
}
