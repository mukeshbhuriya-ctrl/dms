-- CreateTable
CREATE TABLE "weld_stage_modification_request" (
    "id" TEXT NOT NULL,
    "weld_joint_id" TEXT NOT NULL,
    "stage_name" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weld_stage_modification_request_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "weld_stage_modification_request" ADD CONSTRAINT "weld_stage_modification_request_weld_joint_id_fkey" FOREIGN KEY ("weld_joint_id") REFERENCES "weld_joint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weld_stage_modification_request" ADD CONSTRAINT "weld_stage_modification_request_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weld_stage_modification_request" ADD CONSTRAINT "weld_stage_modification_request_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
