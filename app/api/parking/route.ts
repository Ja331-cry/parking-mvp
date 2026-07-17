import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 駐車枠データを取得
    let spots = await prisma.parkingSpot.findMany({
      orderBy: [
        { zone: 'asc' },
        { spotNumber: 'asc' }
      ]
    });

    // もしデータが空なら、初期データを自動生成（シード）
    if (spots.length === 0) {
      console.log('駐車場データを初期化します...');
      const zones = ['A', 'B', 'C', 'D', 'E'];
      const spotsPerZone = 20;

      for (const zone of zones) {
        for (let i = 1; i <= spotsPerZone; i++) {
          await prisma.parkingSpot.create({
            data: {
              zone,
              spotNumber: i,
              isOccupied: false,
            }
          });
        }
      }

      // 再取得
      spots = await prisma.parkingSpot.findMany({
        orderBy: [
          { zone: 'asc' },
          { spotNumber: 'asc' }
        ]
      });
    }

    return NextResponse.json({ success: true, spots });
  } catch (error) {
    console.error('API /api/parking GET Error:', error);
    return NextResponse.json(
      { success: false, error: '駐車場のデータ取得に失敗しました。' },
      { status: 500 }
    );
  }
}
