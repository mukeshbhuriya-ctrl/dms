-- AlterTable
ALTER TABLE "user" ADD COLUMN     "custom_modules" TEXT[] DEFAULT ARRAY[]::TEXT[];
