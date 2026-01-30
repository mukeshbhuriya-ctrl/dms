/*
  Warnings:

  - Added the required column `code` to the `job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `equipement_name` to the `job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tag_number` to the `job` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "job" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "equipement_name" TEXT NOT NULL,
ADD COLUMN     "project_id" TEXT NOT NULL,
ADD COLUMN     "tag_number" TEXT NOT NULL;
