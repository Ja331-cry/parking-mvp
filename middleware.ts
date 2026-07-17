import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('admin_auth');
  
  // 管理者認証のクッキーがない場合は /login にリダイレクト
  if (!authCookie || authCookie.value !== 'true') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

// /admin 配下のすべてのパスに対してこのミドルウェアを実行する
export const config = {
  matcher: ['/admin/:path*'],
};
