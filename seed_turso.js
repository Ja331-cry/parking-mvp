const { createClient } = require('@libsql/client');

const client = createClient({
  url: 'libsql://parking-db-jaaa.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQyNjI4MTgsImlkIjoiMDE5ZjZlNTgtZTMwMS03MmY0LWE5NzEtZTYzM2VlN2U3YjJmIiwia2lkIjoiZ0R5TXdyd05Fd0NsOVhJLXpIa0lfZ3BNODJFakQ5QXFCN1pmQ040WTk5TSIsInJpZCI6ImFkYzc5MzViLTMyNGQtNGI1OC04MDg4LWJhNTRhZTM5N2I4NyJ9.d_56tY9sCxUGB674_mPIRFQJwjt5tBe708zTQNFzLXrL7twM4ANJnqxs5tPHsfGPR46MAikOgY3dj7xSZ4pxDQ'
});

async function main() {
  console.log("Creating tables...");
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "RegisteredVehicle" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "studentId" TEXT NOT NULL,
      "licensePlate" TEXT NOT NULL UNIQUE,
      "grade" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "DetectionLog" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "detectedPlate" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "ParkingSpot" (
      "id" TEXT PRIMARY KEY,
      "zone" TEXT NOT NULL,
      "spotNumber" INTEGER NOT NULL,
      "isOccupied" BOOLEAN NOT NULL DEFAULT 0,
      "plateText" TEXT,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "ParkingSpot_zone_spotNumber_key" ON "ParkingSpot"("zone", "spotNumber");
  `);

  console.log("Tables created successfully.");

  // Seed parking spots
  const zones = ['A', 'B', 'C', 'D', 'E'];
  const spotsPerZone = 20;

  for (const zone of zones) {
    for (let i = 1; i <= spotsPerZone; i++) {
      const id = `${zone}${i}`;
      await client.execute({
        sql: `INSERT OR IGNORE INTO "ParkingSpot" ("id", "zone", "spotNumber", "isOccupied", "plateText", "updatedAt") VALUES (?, ?, ?, 0, NULL, CURRENT_TIMESTAMP)`,
        args: [id, zone, i]
      });
    }
  }

  // Seed sample vehicles
  await client.execute({
    sql: `INSERT OR IGNORE INTO "RegisteredVehicle" ("studentId", "licensePlate", "grade") VALUES (?, ?, ?)`,
    args: ['2201', '富山500あ1234', 3]
  });
  await client.execute({
    sql: `INSERT OR IGNORE INTO "RegisteredVehicle" ("studentId", "licensePlate", "grade") VALUES (?, ?, ?)`,
    args: ['2202', '金沢300い5678', 1]
  });

  console.log("Database seeded successfully.");
}

main().catch(console.error);
