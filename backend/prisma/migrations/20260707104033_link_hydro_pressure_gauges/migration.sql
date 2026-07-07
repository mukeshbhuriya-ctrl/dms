-- AlterTable
ALTER TABLE "hydrostatic_test_item" ADD COLUMN     "pg1_instrument_id" TEXT,
ADD COLUMN     "pg2_instrument_id" TEXT;

-- AddForeignKey
ALTER TABLE "hydrostatic_test_item" ADD CONSTRAINT "hydrostatic_test_item_pg1_instrument_id_fkey" FOREIGN KEY ("pg1_instrument_id") REFERENCES "instruments_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hydrostatic_test_item" ADD CONSTRAINT "hydrostatic_test_item_pg2_instrument_id_fkey" FOREIGN KEY ("pg2_instrument_id") REFERENCES "instruments_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;
