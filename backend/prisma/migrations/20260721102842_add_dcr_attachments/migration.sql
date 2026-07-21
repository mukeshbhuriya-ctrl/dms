-- CreateTable
CREATE TABLE "dcr_attachment" (
    "id" TEXT NOT NULL,
    "dcr_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_path" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dcr_attachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "dcr_attachment" ADD CONSTRAINT "dcr_attachment_dcr_id_fkey" FOREIGN KEY ("dcr_id") REFERENCES "dcr"("id") ON DELETE CASCADE ON UPDATE CASCADE;
