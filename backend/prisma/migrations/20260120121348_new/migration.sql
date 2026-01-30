/*
  Warnings:

  - You are about to drop the `permission` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[empid]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mobile]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `empid` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "permission" DROP CONSTRAINT "permission_role_id_fkey";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "empid" TEXT NOT NULL,
ADD COLUMN     "mobile" TEXT;

-- DropTable
DROP TABLE "permission";

-- CreateIndex
CREATE UNIQUE INDEX "user_empid_key" ON "user"("empid");

-- CreateIndex
CREATE UNIQUE INDEX "user_mobile_key" ON "user"("mobile");
