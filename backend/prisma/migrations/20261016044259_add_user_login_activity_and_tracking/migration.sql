-- AlterTable
ALTER TABLE "user" ADD COLUMN     "last_activity_at" TIMESTAMP(3),
ADD COLUMN     "last_login_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_login_activity" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT,
    "employee_id" TEXT NOT NULL,
    "user_name" TEXT,
    "department_id" TEXT,
    "department_name" TEXT,
    "role_names" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "login_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logout_at" TIMESTAMP(3),
    "session_duration" INTEGER,
    "status" TEXT NOT NULL,
    "failure_reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_login_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_login_activity_company_id_login_at_idx" ON "user_login_activity"("company_id", "login_at" DESC);

-- CreateIndex
CREATE INDEX "user_login_activity_company_id_user_id_idx" ON "user_login_activity"("company_id", "user_id");

-- CreateIndex
CREATE INDEX "user_login_activity_company_id_status_idx" ON "user_login_activity"("company_id", "status");

-- CreateIndex
CREATE INDEX "user_login_activity_company_id_department_id_idx" ON "user_login_activity"("company_id", "department_id");

-- AddForeignKey
ALTER TABLE "user_login_activity" ADD CONSTRAINT "user_login_activity_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_login_activity" ADD CONSTRAINT "user_login_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
