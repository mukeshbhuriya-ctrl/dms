-- AlterTable
ALTER TABLE "document_version" ADD COLUMN     "original_filename" TEXT;

-- CreateTable
CREATE TABLE "document_file" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_hash" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_file_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "document_file" ADD CONSTRAINT "document_file_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "document_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;
