-- CreateTable
CREATE TABLE "drawing_version" (
    "id" TEXT NOT NULL,
    "document_master_id" TEXT NOT NULL,
    "version_no" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_path" TEXT,
    "file_hash" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drawing_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drawing_activity" (
    "id" TEXT NOT NULL,
    "document_master_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drawing_activity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "drawing_version" ADD CONSTRAINT "drawing_version_document_master_id_fkey" FOREIGN KEY ("document_master_id") REFERENCES "document_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_version" ADD CONSTRAINT "drawing_version_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_activity" ADD CONSTRAINT "drawing_activity_document_master_id_fkey" FOREIGN KEY ("document_master_id") REFERENCES "document_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_activity" ADD CONSTRAINT "drawing_activity_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
