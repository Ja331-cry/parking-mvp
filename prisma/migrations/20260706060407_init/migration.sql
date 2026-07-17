-- CreateTable
CREATE TABLE "RegisteredVehicle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "RegisteredVehicle_licensePlate_key" ON "RegisteredVehicle"("licensePlate");
