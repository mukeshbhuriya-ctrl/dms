/*
  Warnings:

  - You are about to drop the column `custom_modules` on the `user_settings` table. All the data in the column will be lost.
  - You are about to drop the column `restricted_modules` on the `user_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "role" ADD COLUMN     "identifier" TEXT,
ADD COLUMN     "is_system_role" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "policies" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "user_roles" ADD COLUMN     "custom_policies" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "user_settings" DROP COLUMN "custom_modules",
DROP COLUMN "restricted_modules";
