-- AlterTable
ALTER TABLE "material_heat_chart" ADD COLUMN     "production_group_id" TEXT,
ADD COLUMN     "qc_group_id" TEXT;

-- AlterTable
ALTER TABLE "material_heat_chart_item" ADD COLUMN     "action_by_id" TEXT,
ADD COLUMN     "is_current" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parent_item_id" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "employee_group" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_employee_group" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "employee_group_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_employee_group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_group_company_id_name_group_type_key" ON "employee_group"("company_id", "name", "group_type");

-- CreateIndex
CREATE UNIQUE INDEX "user_employee_group_user_id_employee_group_id_key" ON "user_employee_group"("user_id", "employee_group_id");

-- AddForeignKey
ALTER TABLE "employee_group" ADD CONSTRAINT "employee_group_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_employee_group" ADD CONSTRAINT "user_employee_group_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_employee_group" ADD CONSTRAINT "user_employee_group_employee_group_id_fkey" FOREIGN KEY ("employee_group_id") REFERENCES "employee_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_heat_chart" ADD CONSTRAINT "material_heat_chart_production_group_id_fkey" FOREIGN KEY ("production_group_id") REFERENCES "employee_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_heat_chart" ADD CONSTRAINT "material_heat_chart_qc_group_id_fkey" FOREIGN KEY ("qc_group_id") REFERENCES "employee_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
