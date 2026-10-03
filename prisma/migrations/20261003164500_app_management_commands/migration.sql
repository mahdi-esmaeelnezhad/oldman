-- CreateEnum
CREATE TYPE "device_app_state" AS ENUM ('ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "command_type" AS ENUM ('GET_DEVICE_INFO', 'GET_BATTERY', 'GET_STORAGE', 'CREATE_CONTACT', 'UPDATE_CONTACT', 'DELETE_CONTACT', 'GET_INSTALLED_APPS', 'INSTALL_APP', 'UNINSTALL_APP', 'ENABLE_APP', 'DISABLE_APP', 'GET_LOCATION', 'CREATE_GEOFENCE', 'UPDATE_GEOFENCE', 'DELETE_GEOFENCE', 'GET_SETTINGS', 'SET_SETTING');

-- CreateEnum
CREATE TYPE "command_status" AS ENUM ('PENDING', 'SENT', 'RECEIVED', 'EXECUTING', 'SUCCESS', 'FAILED', 'UNSUPPORTED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "capabilities" JSONB,
ADD COLUMN     "credential_hash" TEXT;

-- CreateTable
CREATE TABLE "device_apps" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "package_name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "version_name" TEXT,
    "icon_url" TEXT,
    "state" "device_app_state" NOT NULL DEFAULT 'ENABLED',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "can_uninstall" BOOLEAN NOT NULL DEFAULT true,
    "can_disable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_catalog_entries" (
    "id" UUID NOT NULL,
    "package_name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "version_name" TEXT,
    "icon_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_catalog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commands" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "type" "command_type" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "command_status" NOT NULL DEFAULT 'PENDING',
    "result_data" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "commands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_apps_device_id_idx" ON "device_apps"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_apps_device_id_package_name_key" ON "device_apps"("device_id", "package_name");

-- CreateIndex
CREATE UNIQUE INDEX "app_catalog_entries_package_name_key" ON "app_catalog_entries"("package_name");

-- CreateIndex
CREATE INDEX "commands_device_id_status_idx" ON "commands"("device_id", "status");

-- CreateIndex
CREATE INDEX "commands_family_id_idx" ON "commands"("family_id");

-- CreateIndex
CREATE INDEX "commands_created_by_idx" ON "commands"("created_by");

-- CreateIndex
CREATE INDEX "commands_expires_at_idx" ON "commands"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "devices_credential_hash_key" ON "devices"("credential_hash");

-- AddForeignKey
ALTER TABLE "device_apps" ADD CONSTRAINT "device_apps_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commands" ADD CONSTRAINT "commands_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commands" ADD CONSTRAINT "commands_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commands" ADD CONSTRAINT "commands_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
