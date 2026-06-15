-- CreateTable
CREATE TABLE "instruments_master" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "equipment_desc" TEXT NOT NULL,
    "make" TEXT,
    "range" TEXT,
    "serial_no" TEXT NOT NULL,
    "frequency" TEXT,
    "required_accuracy" TEXT,
    "least_count" TEXT,
    "certificate_no" TEXT,
    "calibration_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instruments_master_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instruments_master_serial_no_key" ON "instruments_master"("serial_no");

-- CreateIndex
CREATE INDEX "instruments_master_type_idx" ON "instruments_master"("type");
