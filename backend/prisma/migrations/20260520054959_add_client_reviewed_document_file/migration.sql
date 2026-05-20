-- CreateTable
CREATE TABLE "client_reviewed_document_file" (
    "id" TEXT NOT NULL,
    "transmission_document_id" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_reviewed_document_file_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "client_reviewed_document_file" ADD CONSTRAINT "client_reviewed_document_file_transmission_document_id_fkey" FOREIGN KEY ("transmission_document_id") REFERENCES "transmission_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
