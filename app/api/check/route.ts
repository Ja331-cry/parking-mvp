import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
// 【追加】データベースを操作するためのツールを読み込む
import { prisma } from '@/lib/prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json({ error: '画像がありません' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const base64Image = Buffer.from(bytes).toString('base64');

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = "この画像から車のナンバープレートの文字を読み取り、「富山500あ1234」のようなスペースやハイフン（-）のない連続した文字列のみを出力してください。ナンバーにハイフンが含まれているように見えても、出力文字列からはハイフンを絶対に除外してください。ナンバープレートが写っていない、または読み取れない場合は、必ず「読取不可」という4文字のみを出力してください。それ以外の説明文や謝罪文は一切不要です。";

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: file.type
                }
            }
        ]);

        let detectedPlate = result.response.text().trim().replace(/-/g, '');
        let finalStatus = "";
        let isOk = false;
        let assignedSpot: string | null = null;

        // AIが指示を無視して長文を返した場合や、読取不可の場合は統一する
        if (detectedPlate.includes("読取不可") || detectedPlate.length > 15 || detectedPlate === "") {
            detectedPlate = "読取不可";
            finalStatus = "NG (読取エラー)";
        } else {
            // --- ここからデータベース照合ロジック ---
            const vehicles = await prisma.registeredVehicle.findMany();

            const registeredVehicle = vehicles.find(v =>
                detectedPlate.includes(v.licensePlate) || v.licensePlate.includes(detectedPlate)
            );

            if (registeredVehicle) {
                if (registeredVehicle.grade <= 2) {
                    finalStatus = "NG (1・2年生の車両 - 警告)";
                } else {
                    finalStatus = "OK (登録済)";
                    isOk = true;
                }
            } else {
                finalStatus = "NG (未登録 - 警告)";
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
                        isOccupied: false,
                        plateText: detectedPlate 
                    }
                });
                assignedSpot = `${emptySpot.zone}ブロック ${emptySpot.spotNumber}番`;
                finalStatus = `${finalStatus} - ${assignedSpot}へ案内`;
            } else {
                finalStatus = `${finalStatus.replace(' - 警告', '')} (満車のため入場不可)`;
                isOk = false;
            }
        }

        const finalDetectedPlate = detectedPlate || "不明";

        // --- 直近のログと同じナンバーなら履歴に追加しない（重複防止） ---
        const lastLog = await prisma.detectionLog.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        if (!lastLog || lastLog.detectedPlate !== finalDetectedPlate) {
            await prisma.detectionLog.create({
                data: {
                    detectedPlate: finalDetectedPlate,
                    status: finalStatus
                }
            });
        }

        return NextResponse.json({
            detectedPlate,
            status: finalStatus,
            isOk,
            assignedSpot
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: '解析エラーが発生しました' }, { status: 500 });
    }
}