'use client';

import { logout } from '../login/actions';

export default function LogoutButton() {
  const handleLogout = async () => {
    await logout();
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-neu shadow-neu active:shadow-neu-inner rounded-xl text-sm font-black text-slate-600 transition-all flex items-center gap-2"
    >
      ログアウト
    </button>
  );
}
