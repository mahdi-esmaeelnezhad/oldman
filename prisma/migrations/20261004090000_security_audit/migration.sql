-- CreateEnum
CREATE TYPE "audit_action" AS ENUM (
  'COMMAND_CREATED',
  'COMMAND_CANCELLED',
  'COMMAND_COMPLETED',
  'COMMAND_EXPIRED',
  'ENROLLMENT_CREATED',
  'DEVICE_ENROLLED',
  'GEOFENCE_CREATED',
  'GEOFENCE_UPDATED',
  'GEOFENCE_DELETED',
  'MEMBER_INVITED'
);

-- CreateEnum
CREATE TYPE "audit_status" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'DENIED');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "device_id" UUID,
    "command_id" UUID,
    "action" "audit_action" NOT NULL,
    "result" TEXT,
    "status" "audit_status" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_family_id_created_at_idx" ON "audit_logs"("family_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_device_id_created_at_idx" ON "audit_logs"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_command_id_idx" ON "audit_logs"("command_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "commands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
