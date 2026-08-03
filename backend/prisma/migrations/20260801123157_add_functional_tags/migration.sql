-- AlterTable
ALTER TABLE "user" ADD COLUMN     "functional_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
