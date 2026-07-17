'use server';

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { revalidatePath } from 'next/cache';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

export async function processManualEntry(plateNumber: string) {
  try {
    if (!plateNumber || plateNumber.trim() === '') {
      return { success: false, error: 'ナンバープレートを入力してください' };
    }

    const cleanPlate = plateNumber.trim();

    // データベース照合ロジック
    const vehicles = await prisma.registeredVehicle.findMany();
    const registeredVehicle = vehicles.find(v =>
      cleanPlate.includes(v.licensePlate) || v.licensePlate.includes(cleanPlate)
    );

    let finalStatus = "";
    let isOk = false;
    let assignedSpot: string | null = null;

    if (registeredVehicle) {
      if (registeredVehicle.grade <= 2) {
        finalStatus = "NG (1・2年生の車両 - 管理者手動警告)";
      } else {
        finalStatus = "OK (管理者手動受付)";
        isOk = true;
      }
    } else {
      finalStatus = "NG (未登録 - 管理者手動警告)";
    }

    // --- 空き枠の割り当てロジック（全車両共通） ---
    const allEmptySpots = await prisma.parkingSpot.findMany({
      where: { isOccupied: false }
    });

    // カスタムソート: A1, B1.. E1 の次は A11, B11.. E11 となるようにする
    allEmptySpots.sort((a, b) => {
      const groupA = (a.spotNumber - 1) % 10;
      const groupB = (b.spotNumber - 1) % 10;
      if (groupA !== groupB) return groupA - groupB; // 1番台(1,11) -> 2番台(2,12) の順

      const sideA = a.spotNumber > 10 ? 1 : 0;
      const sideB = b.spotNumber > 10 ? 1 : 0;
      if (sideA !== sideB) return sideA - sideB; // 左側(1-10) -> 右側(11-20) の順

      return a.zone.localeCompare(b.zone); // A -> B -> C の順
    });

    const emptySpot = allEmptySpots[0];

    if (emptySpot) {
      await prisma.parkingSpot.update({
        where: { id: emptySpot.id },
        data: { 
          isOccupied: true,
          plateText: cleanPlate
        }
      });
      assignedSpot = `${emptySpot.zone}ブロック ${emptySpot.spotNumber}番`;
      finalStatus = `${finalStatus} - ${assignedSpot}へ案内`;
    } else {
      finalStatus = `${finalStatus.replace(' - 警告', '')} (満車のため入場不可)`;
      isOk = false;
    }

    // ログに記録
    await prisma.detectionLog.create({
      data: {
        detectedPlate: cleanPlate + " (手動)",
        status: finalStatus
      }
    });

    revalidatePath('/admin');
    
    return {
      success: true,
      isOk,
      status: finalStatus,
      assignedSpot,
      vehicle: registeredVehicle
    };

  } catch (error) {
    console.error('Manual Entry Error:', error);
    return { success: false, error: '処理中にエラーが発生しました' };
  }
}
