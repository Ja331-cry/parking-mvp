'use client';

import { logout } from '../login/actions';

export default function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="text-sm font-medium text-gray-600 hover:text-gray-900 bg-white px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
    >
      ログアウト
    </button>
  );
}
