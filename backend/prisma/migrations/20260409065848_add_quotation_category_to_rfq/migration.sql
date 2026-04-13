-- AlterTable
ALTER TABLE "rfq_register" ADD COLUMN     "quotation_category" TEXT NOT NULL DEFAULT 'Core',
ADD COLUMN     "type_serial_no" INTEGER NOT NULL DEFAULT 1;
