-- CreateTable
CREATE TABLE "rfq_attachment" (
    "id" TEXT NOT NULL,
    "rfq_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_path" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rfq_attachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "rfq_attachment" ADD CONSTRAINT "rfq_attachment_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfq_register"("id") ON DELETE CASCADE ON UPDATE CASCADE;
