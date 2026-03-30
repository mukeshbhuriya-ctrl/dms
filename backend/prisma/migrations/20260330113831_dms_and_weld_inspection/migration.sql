-- DropForeignKey
ALTER TABLE "document_master" DROP CONSTRAINT "document_master_document_type_id_fkey";

-- AlterTable
ALTER TABLE "document_master" ADD COLUMN     "serial_no" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "document_type_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "group_document" ADD COLUMN     "actual_due_days" INTEGER;

-- AlterTable
ALTER TABLE "job" ALTER COLUMN "project_id" DROP NOT NULL,
ALTER COLUMN "code" DROP NOT NULL;

-- AlterTable
ALTER TABLE "transmission" ADD COLUMN     "client_archive_url" TEXT;

-- CreateTable
CREATE TABLE "document_activity" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "group_document_id" TEXT,
    "transmission_id" TEXT,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "remarks" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimator" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mediator" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mediator_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "document_master" ADD CONSTRAINT "document_master_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_activity" ADD CONSTRAINT "document_activity_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_activity" ADD CONSTRAINT "document_activity_group_document_id_fkey" FOREIGN KEY ("group_document_id") REFERENCES "group_document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_activity" ADD CONSTRAINT "document_activity_transmission_id_fkey" FOREIGN KEY ("transmission_id") REFERENCES "transmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_activity" ADD CONSTRAINT "document_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimator" ADD CONSTRAINT "estimator_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediator" ADD CONSTRAINT "mediator_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
