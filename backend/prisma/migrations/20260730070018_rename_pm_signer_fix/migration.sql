/*
  Warnings:

  - You are about to drop the column `customerId` on the `preventive_maintenance_plan` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `preventive_maintenance_schedule` table. All the data in the column will be lost.
  - You are about to drop the `preventive_maintenance_plan_preparers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "preventive_maintenance_plan" DROP CONSTRAINT "preventive_maintenance_plan_customerId_fkey";

-- DropForeignKey
ALTER TABLE "preventive_maintenance_plan_preparers" DROP CONSTRAINT "preventive_maintenance_plan_preparers_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "preventive_maintenance_plan_preparers" DROP CONSTRAINT "preventive_maintenance_plan_preparers_user_id_fkey";

-- DropForeignKey
ALTER TABLE "preventive_maintenance_schedule" DROP CONSTRAINT "preventive_maintenance_schedule_companyId_fkey";

-- AlterTable
ALTER TABLE "preventive_maintenance_plan" DROP COLUMN "customerId";

-- AlterTable
ALTER TABLE "preventive_maintenance_schedule" DROP COLUMN "companyId";

-- DropTable
DROP TABLE "preventive_maintenance_plan_preparers";

-- CreateTable
CREATE TABLE "preventive_maintenance_plan_signer" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preventive_maintenance_plan_signer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "preventive_maintenance_plan_signer_plan_id_user_id_key" ON "preventive_maintenance_plan_signer"("plan_id", "user_id");

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plan_signer" ADD CONSTRAINT "preventive_maintenance_plan_signer_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "preventive_maintenance_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plan_signer" ADD CONSTRAINT "preventive_maintenance_plan_signer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
