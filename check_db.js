const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});

const adapter = new PrismaLibSql({
  url: env.DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN
});
const prisma = new PrismaClient({ adapter });

async function check() {
  const count = await prisma.parkingSpot.count();
  console.log(`Total parking spots: ${count}`);
}
check();
