'use client';

import { useState } from 'react';
import { deleteVehicle } from './actions';

export default function DeleteButton({ id }: { id: number }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('この車両データを削除してもよろしいですか？')) {
      return;
    }
    setLoading(true);
    try {
      await deleteVehicle(id);
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleDelete} 
      disabled={loading} 
      className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-md text-sm transition-colors disabled:opacity-50"
    >
      {loading ? '削除中...' : '削除'}
    </button>
  );
}
