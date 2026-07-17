'use client';

import { useTransition } from 'react';
import { deleteVehicle } from './actions';

export default function DeleteButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!window.confirm('この車両データを削除してもよろしいですか？')) {
      return;
    }
    
    startTransition(async () => {
      try {
        await deleteVehicle(id);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isPending}
      title="この車両登録を削除"
      className="p-2 text-rose-500 bg-neu shadow-neu active:shadow-neu-inner rounded-xl transition-all disabled:opacity-50"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
    </button>
  );
}
