-- CreateTable
CREATE TABLE "qc_group" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qc_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_qc_group" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "qc_group_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_qc_group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qc_group_company_id_name_key" ON "qc_group"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "user_qc_group_user_id_qc_group_id_key" ON "user_qc_group"("user_id", "qc_group_id");

-- AddForeignKey
ALTER TABLE "qc_group" ADD CONSTRAINT "qc_group_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_qc_group" ADD CONSTRAINT "user_qc_group_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_qc_group" ADD CONSTRAINT "user_qc_group_qc_group_id_fkey" FOREIGN KEY ("qc_group_id") REFERENCES "qc_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
