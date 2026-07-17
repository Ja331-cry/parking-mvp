const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const s = await prisma.parkingSpot.findFirst({ where: { zone: 'A', spotNumber: 7 } });
  console.log('DB STATUS:', s);
}

main().finally(() => prisma.$disconnect());
