-- CreateTable: User
CREATE TABLE "User" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "pin"       TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- Drop old single-user tables
DROP TABLE IF EXISTS "Attempt";
DROP TABLE IF EXISTS "ModuleProgress";

-- CreateTable: Attempt (with userId)
CREATE TABLE "Attempt" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "moduleSlug" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "isCorrect"  BOOLEAN NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Attempt_userId_moduleSlug_idx" ON "Attempt"("userId", "moduleSlug");

ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: ModuleProgress (with userId)
CREATE TABLE "ModuleProgress" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "lastScore"   INTEGER,
    "attempts"    INTEGER NOT NULL DEFAULT 0,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModuleProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModuleProgress_userId_slug_key" ON "ModuleProgress"("userId", "slug");
CREATE INDEX "ModuleProgress_userId_idx" ON "ModuleProgress"("userId");

ALTER TABLE "ModuleProgress" ADD CONSTRAINT "ModuleProgress_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
