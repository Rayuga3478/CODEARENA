-- AlterTable
ALTER TABLE "TestCase" ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;
