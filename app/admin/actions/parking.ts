'use server';

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { revalidatePath } from 'next/cache';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

export async function toggleParkingSpot(id: string, currentStatus: boolean) {
  try {
    const spot = await prisma.parkingSpot.findUnique({ where: { id } });
    if (!spot) throw new Error("Spot not found");
    const plate = spot.plateText || '不明な車両';

    await prisma.parkingSpot.update({
      where: { id },
      data: {
        isOccupied: !currentStatus,
        plateText: !currentStatus ? '(手動操作)' : null, // 満車にするなら手動操作、空車にするならリセット
      }
    });

    // 管理者による操作ログを残す
    await prisma.detectionLog.create({
      data: {
        detectedPlate: !currentStatus ? '(管理者による直接手動入庫)' : plate,
        status: !currentStatus 
          ? `入庫 (管理者による直接手動入庫) - ${spot.zone}ブロック ${spot.spotNumber}番` 
          : `出庫 (管理者による直接手動出庫) - ${spot.zone}ブロック ${spot.spotNumber}番`
      }
    });
    
    // 管理画面のキャッシュを更新
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle parking spot:', error);
    return { success: false, error: '更新に失敗しました' };
  }
}
