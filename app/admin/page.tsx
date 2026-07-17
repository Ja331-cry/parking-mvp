import { PrismaClient } from '@prisma/client';
import AddVehicleForm from './AddVehicleForm';
import DeleteButton from './DeleteButton';
import LogoutButton from './LogoutButton';
import VehicleSearch from './VehicleSearch';
import LogFilter from './LogFilter';
import AdminParkingMap from './AdminParkingMap';
import ManualEntryForm from './ManualEntryForm';
import SensorDebugViewer from '../components/SensorDebugViewer';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminPage(props: {
  searchParams?: Promise<{ q?: string; warningOnly?: string; tab?: string; logType?: string }>;
}) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || '';
  const warningOnly = searchParams?.warningOnly === 'true';
  const currentTab = searchParams?.tab || 'map';
  const logType = searchParams?.logType || 'all'; // 'all', 'entry', 'exit'

  const vehicles = await prisma.registeredVehicle.findMany({
    where: q ? {
      OR: [
        { studentId: { contains: q } },
        { licensePlate: { contains: q } }
      ]
    } : undefined,
    orderBy: { createdAt: 'desc' }
  });

  const logWhere: any = {};
  if (warningOnly) {
    logWhere.status = { contains: 'NG' };
  }
  if (logType === 'entry') {
    logWhere.NOT = { status: { contains: '出庫' } };
  } else if (logType === 'exit') {
    logWhere.status = { ...logWhere.status, contains: '出庫' }; // If warningOnly is also true, this combines them
  }

  const logs = await prisma.detectionLog.findMany({
    where: Object.keys(logWhere).length > 0 ? logWhere : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  let spots = await prisma.parkingSpot.findMany({
    orderBy: [
      { zone: 'asc' },
      { spotNumber: 'asc' }
    ]
  });

  // もしデータが空なら、初期データを自動生成（シード）
  if (spots.length === 0) {
    console.log('駐車場データを初期化します (AdminPage)...');
    const zones = ['A', 'B', 'C', 'D', 'E'];
    const spotsPerZone = 20;

    const spotsData = [];
    for (const zone of zones) {
      for (let i = 1; i <= spotsPerZone; i++) {
        spotsData.push({
          zone,
          spotNumber: i,
          isOccupied: false,
        });
      }
    }
    
    await prisma.parkingSpot.createMany({
      data: spotsData
    });

    // 再取得
    spots = await prisma.parkingSpot.findMany({
      orderBy: [
        { zone: 'asc' },
        { spotNumber: 'asc' }
      ]
    });
  }

  return (
    <div className="min-h-screen bg-neu py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">

      <div className="max-w-5xl mx-auto relative z-10">
        <header className="mb-10 flex justify-between items-start md:items-center flex-col md:flex-row gap-6 bg-neu p-6 rounded-[2rem] shadow-neu">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-neu rounded-[1.25rem] shadow-neu-sm flex items-center justify-center shrink-0 text-indigo-500">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">管理者ダッシュボード</h1>
              <p className="text-slate-500 mt-1 font-medium text-sm">駐車場システムの登録車両データとログを管理</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <a href="/" className="text-indigo-600 hover:text-indigo-800 font-bold text-sm flex items-center gap-1.5 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              検知システムへ
            </a>
            <LogoutButton />
          </div>
        </header>

        {/* タブナビゲーション */}
        <div className="flex gap-4 mb-8">
          <a 
            href="/admin?tab=map" 
            className={`px-6 py-4 font-black text-sm rounded-2xl transition-all ${currentTab === 'map' ? 'bg-neu shadow-neu-inner text-indigo-600' : 'bg-neu shadow-neu text-slate-500 hover:shadow-neu-inner'}`}
          >
            🗺️ 駐車場マップ管理
          </a>
          <a 
            href="/admin?tab=manage" 
            className={`px-6 py-4 font-black text-sm rounded-2xl transition-all ${currentTab === 'manage' ? 'bg-neu shadow-neu-inner text-indigo-600' : 'bg-neu shadow-neu text-slate-500 hover:shadow-neu-inner'}`}
          >
            📋 車両・ログ管理
          </a>
        </div>

        {currentTab === 'map' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ManualEntryForm />
            <AdminParkingMap spots={spots} />
          </div>
        )}

        {currentTab === 'manage' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-10">
            <AddVehicleForm />

            <div className="bg-neu shadow-neu rounded-[2rem] overflow-hidden mb-10 p-6">
          <div className="py-4 flex justify-between items-center flex-wrap gap-4">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              登録車両一覧 
              <span className="text-sm font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full ml-2 shadow-sm border border-indigo-100">{vehicles.length} 件</span>
            </h2>
            <VehicleSearch />
          </div>
          
          {vehicles.length === 0 ? (
            <div className="p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 text-slate-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
              </div>
              <p className="text-slate-500 font-medium">
                {q ? '検索条件に一致する車両はありません。' : '登録されている車両はありません。'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200/50 text-xs uppercase tracking-wider text-slate-500 font-black">
                    <th className="px-4 py-4">ID</th>
                    <th className="px-4 py-4">学籍番号</th>
                    <th className="px-4 py-4">学年</th>
                    <th className="px-4 py-4">ナンバープレート</th>
                    <th className="px-4 py-4">登録日時</th>
                    <th className="px-4 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="group border-b border-slate-200/30">
                      <td className="px-4 py-5 text-slate-400 font-mono text-xs">{vehicle.id}</td>
                      <td className="px-4 py-5 font-black text-slate-700">{vehicle.studentId}</td>
                      <td className="px-4 py-5">
                        <span className="bg-neu shadow-neu-inner-sm text-indigo-600 px-3 py-1 rounded-full text-xs font-black">
                          {vehicle.grade}年
                        </span>
                      </td>
                      <td className="px-4 py-5 font-black text-slate-700 font-mono">{vehicle.licensePlate}</td>
                      <td className="px-4 py-5 text-slate-500 font-medium">
                        {new Date(vehicle.createdAt).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-4 py-5 text-right opacity-50 group-hover:opacity-100 transition-opacity">
                        <DeleteButton id={vehicle.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-neu shadow-neu rounded-[2rem] overflow-hidden p-6">
          <div className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                入出庫・操作ログ 
                <span className="text-sm font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full ml-2 shadow-sm border border-indigo-100">最新50件</span>
              </h2>
              <div className="flex gap-4">
                <a href={`/admin?tab=manage&logType=all${warningOnly ? '&warningOnly=true' : ''}`} className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${logType === 'all' ? 'bg-neu shadow-neu-inner text-indigo-600' : 'bg-neu shadow-neu text-slate-600 hover:shadow-neu-inner'}`}>すべて</a>
                <a href={`/admin?tab=manage&logType=entry${warningOnly ? '&warningOnly=true' : ''}`} className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${logType === 'entry' ? 'bg-neu shadow-neu-inner text-indigo-600' : 'bg-neu shadow-neu text-slate-600 hover:shadow-neu-inner'}`}>入庫のみ</a>
                <a href={`/admin?tab=manage&logType=exit${warningOnly ? '&warningOnly=true' : ''}`} className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${logType === 'exit' ? 'bg-neu shadow-neu-inner text-indigo-600' : 'bg-neu shadow-neu text-slate-600 hover:shadow-neu-inner'}`}>出庫のみ</a>
              </div>
            </div>
            <LogFilter />
          </div>
          
          {logs.length === 0 ? (
            <div className="p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 text-slate-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              </div>
              <p className="text-slate-500 font-medium">
                {warningOnly ? '警告の履歴はありません。' : '履歴はありません。'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200/50 text-xs uppercase tracking-wider text-slate-500 font-black">
                    <th className="px-4 py-4">ID</th>
                    <th className="px-4 py-4">検知ナンバー</th>
                    <th className="px-4 py-4">判定結果</th>
                    <th className="px-4 py-4">検知日時</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {logs.map((log) => {
                    const isOk = log.status.includes('OK');
                    return (
                      <tr key={log.id} className="border-b border-slate-200/30">
                        <td className="px-4 py-5 text-slate-400 font-mono text-xs">{log.id}</td>
                        <td className="px-4 py-5 font-black text-slate-700 font-mono text-lg">{log.detectedPlate}</td>
                        <td className="px-4 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black shadow-neu-inner-sm ${
                            isOk ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {isOk ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                            )}
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-slate-500 font-medium">
                          {new Date(log.createdAt).toLocaleString('ja-JP')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </div>
        )}
      </div>
      <SensorDebugViewer />
    </div>
  );
}
