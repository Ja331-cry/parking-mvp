'use server';

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { revalidatePath } from 'next/cache';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

export async function addVehicle(formData: FormData) {
  const studentId = formData.get('studentId')?.toString();
  const licensePlate = formData.get('licensePlate')?.toString();
  const gradeStr = formData.get('grade')?.toString();

  if (!studentId || !licensePlate || !gradeStr) {
    throw new Error('学籍番号、ナンバー、学年は必須です');
  }

  const grade = parseInt(gradeStr, 10);

  try {
    await prisma.registeredVehicle.create({
      data: {
        studentId,
        licensePlate,
        grade,
      },
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      throw new Error('このナンバーはすでに登録されています');
    }
    throw new Error('登録に失敗しました');
  }
}

export async function deleteVehicle(id: number) {
  try {
    await prisma.registeredVehicle.delete({
      where: { id },
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error(error);
    throw new Error('削除に失敗しました');
  }
}
