-- AlterTable
ALTER TABLE "rfq_register" ADD COLUMN     "po_date" TIMESTAMP(3),
ADD COLUMN     "po_no" TEXT,
ADD COLUMN     "po_remark" TEXT,
ADD COLUMN     "po_value" DOUBLE PRECISION;
