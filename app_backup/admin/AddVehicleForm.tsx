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
    <form id="add-vehicle-form" action={handleSubmit} className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-white mb-8">
      <h2 className="text-xl font-extrabold mb-6 text-slate-800 flex items-center gap-2">
        <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        新規車両の登録
      </h2>
      {error && <div className="mb-6 text-rose-600 text-sm bg-rose-50 border border-rose-100 p-4 rounded-xl font-medium flex items-center gap-2">
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        {error}
      </div>}
      <div className="flex flex-col md:flex-row gap-5 items-end">
        <div className="w-full">
          <label htmlFor="studentId" className="block text-sm font-bold text-slate-700 mb-2">学籍番号</label>
          <input type="text" id="studentId" name="studentId" required className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm font-medium" placeholder="例: 1234567" />
        </div>
        <div className="w-full">
          <label htmlFor="licensePlate" className="block text-sm font-bold text-slate-700 mb-2">ナンバープレート</label>
          <input type="text" id="licensePlate" name="licensePlate" required className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm font-medium" placeholder="例: 富山500あ1234" />
        </div>
        <div className="w-full md:w-32 shrink-0">
          <label htmlFor="grade" className="block text-sm font-bold text-slate-700 mb-2">学年</label>
          <select id="grade" name="grade" required className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm font-medium appearance-none cursor-pointer">
            <option value="1">1年</option>
            <option value="2">2年</option>
            <option value="3">3年</option>
            <option value="4">4年</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl hover:from-indigo-500 hover:to-blue-500 disabled:opacity-70 transition-all shadow-lg shadow-indigo-500/30 whitespace-nowrap active:scale-[0.98]">
          {loading ? '登録中...' : '登録する'}
        </button>
      </div>
    </form>
  );
}
