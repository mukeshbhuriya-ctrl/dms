-- AlterTable
ALTER TABLE "dish_end_inspection_instrument" ADD COLUMN     "instrument_id" TEXT;

-- AlterTable
ALTER TABLE "final_inspection_instrument" ADD COLUMN     "instrument_id" TEXT;

-- AddForeignKey
ALTER TABLE "dish_end_inspection_instrument" ADD CONSTRAINT "dish_end_inspection_instrument_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_inspection_instrument" ADD CONSTRAINT "final_inspection_instrument_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;
