-- AlterTable
ALTER TABLE "po" ALTER COLUMN "po_doc_url" DROP NOT NULL;

-- CreateTable
CREATE TABLE "po_attachment_history" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "po_id" TEXT NOT NULL,
    "po_attachments" JSONB NOT NULL DEFAULT '[]',
    "revision" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "po_attachment_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "po_attachment_history" ADD CONSTRAINT "po_attachment_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_attachment_history" ADD CONSTRAINT "po_attachment_history_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "po"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
