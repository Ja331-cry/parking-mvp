'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const password = formData.get('password')?.toString();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error('サーバーの環境変数 ADMIN_PASSWORD が設定されていません。');
  }

  if (password === adminPassword) {
    // ログイン成功: Cookieを発行 (1日間有効)
    const cookieStore = await cookies();
    cookieStore.set('admin_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
    
  } else {
    throw new Error('パスワードが間違っています');
  }
  
  // 成功時のリダイレクトは try/catch ブロック外またはfinallyで処理されるか、
  // エラーがスローされなかった場合に実行します
  redirect('/admin');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_auth');
  redirect('/login');
}
