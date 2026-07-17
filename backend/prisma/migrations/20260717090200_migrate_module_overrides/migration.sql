-- AlterTable
ALTER TABLE "user" DROP COLUMN "custom_modules";

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN "custom_modules" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "user_settings" ADD COLUMN "restricted_modules" TEXT[] DEFAULT ARRAY[]::TEXT[];
