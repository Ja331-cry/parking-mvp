import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const { zone, spotNumber, action } = await request.json();

    if (!zone || !spotNumber || !action) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 });
    }

    // 指定された駐車枠を探す
    const spot = await prisma.parkingSpot.findUnique({
      where: {
        zone_spotNumber: {
          zone: zone,
          spotNumber: spotNumber
        }
      }
    });

    if (!spot) {
      return NextResponse.json({ error: '指定された駐車枠が見つかりません' }, { status: 404 });
    }

    // 駐車（PARKED）か、出庫（EMPTY）かに応じてDBを更新
    const isOccupied = action === 'PARKED';
    
    // AI側でナンバーが既に登録されている場合はそれを維持（予約完了）し、空だった場合のみ不正駐車扱いにする
    let newPlateText = spot.plateText;
    if (isOccupied && !newPlateText) {
      newPlateText = '(別車両検知)';
    } else if (!isOccupied) {
      // 出庫シグナルが来た場合
      if (spot.isOccupied) {
        // もともと車が停まっていたなら、本当の出庫なので情報をクリア
        newPlateText = null;
      } else {
        // 車が停まっていない状態（入庫待ち中）での空車シグナルはノイズなので、予約情報を維持する
        newPlateText = spot.plateText;
      }
    }

    await prisma.parkingSpot.update({
      where: { id: spot.id },
      data: {
        isOccupied: isOccupied,
        plateText: newPlateText
      }
    });

    // ログも残す
    let logStatus = "";
    if (isOccupied) {
      if (spot.plateText) {
        logStatus = `入庫確定 (予約車両) - ${zone}ブロック ${spotNumber}番`;
      } else {
        logStatus = `不正入庫 (別車両) - ${zone}ブロック ${spotNumber}番`;
      }
    } else {
      logStatus = `出庫 (センサー検知) - ${zone}ブロック ${spotNumber}番`;
    }

    await prisma.detectionLog.create({
      data: {
        detectedPlate: isOccupied ? (spot.plateText || '(別車両検知)') : (spot.plateText || '不明な車両'),
        status: logStatus
      }
    });

    // 画面を自動更新させるためにキャッシュをクリア
    revalidatePath('/');
    revalidatePath('/admin');

    return NextResponse.json({ success: true, message: `Spot ${zone}${spotNumber} updated to ${action}` });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
