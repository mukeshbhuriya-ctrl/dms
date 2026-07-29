-- CreateTable
CREATE TABLE "machine_master" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "machine_number" TEXT NOT NULL,
    "machine_name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "model_no" TEXT,
    "serial_number" TEXT,
    "make" TEXT,
    "mfg_year" TEXT,
    "specifications" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_master_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "machine_master_company_id_machine_number_key" ON "machine_master"("company_id", "machine_number");

-- AddForeignKey
ALTER TABLE "machine_master" ADD CONSTRAINT "machine_master_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
