-- AlterTable
ALTER TABLE "document_version" ADD COLUMN     "file_hash" TEXT,
ADD COLUMN     "file_path" TEXT,
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mime_type" TEXT;

-- CreateTable
CREATE TABLE "document_access_log" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "user_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_access_log_pkey" PRIMARY KEY ("id")
);
