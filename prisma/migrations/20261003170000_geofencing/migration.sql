-- CreateEnum
CREATE TYPE "location_permission_status" AS ENUM ('UNKNOWN', 'PROMPT', 'GRANTED', 'DENIED');

-- CreateEnum
CREATE TYPE "geofence_event_type" AS ENUM ('ENTERED', 'EXITED');

-- CreateEnum
CREATE TYPE "family_notification_type" AS ENUM ('GEOFENCE_ENTERED', 'GEOFENCE_EXITED');

-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "last_latitude" DOUBLE PRECISION,
ADD COLUMN     "last_location_at" TIMESTAMP(3),
ADD COLUMN     "last_longitude" DOUBLE PRECISION,
ADD COLUMN     "location_permission" "location_permission_status" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "location_service_enabled" BOOLEAN;

-- CreateTable
CREATE TABLE "geofences" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius_meters" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_event_type" "geofence_event_type",
    "last_event_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geofences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geofence_events" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "geofence_id" UUID NOT NULL,
    "type" "geofence_event_type" NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geofence_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_notifications" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "device_id" UUID,
    "geofence_id" UUID,
    "geofence_event_id" UUID,
    "type" "family_notification_type" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "family_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "geofences_device_id_idx" ON "geofences"("device_id");

-- CreateIndex
CREATE INDEX "geofences_family_id_idx" ON "geofences"("family_id");

-- CreateIndex
CREATE INDEX "geofences_enabled_idx" ON "geofences"("enabled");

-- CreateIndex
CREATE INDEX "geofence_events_geofence_id_occurred_at_idx" ON "geofence_events"("geofence_id", "occurred_at");

-- CreateIndex
CREATE INDEX "geofence_events_family_id_occurred_at_idx" ON "geofence_events"("family_id", "occurred_at");

-- CreateIndex
CREATE INDEX "geofence_events_device_id_occurred_at_idx" ON "geofence_events"("device_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "family_notifications_geofence_event_id_key" ON "family_notifications"("geofence_event_id");

-- CreateIndex
CREATE INDEX "family_notifications_family_id_created_at_idx" ON "family_notifications"("family_id", "created_at");

-- CreateIndex
CREATE INDEX "family_notifications_device_id_created_at_idx" ON "family_notifications"("device_id", "created_at");

-- AddForeignKey
ALTER TABLE "geofences" ADD CONSTRAINT "geofences_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geofences" ADD CONSTRAINT "geofences_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geofences" ADD CONSTRAINT "geofences_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geofence_events" ADD CONSTRAINT "geofence_events_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geofence_events" ADD CONSTRAINT "geofence_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geofence_events" ADD CONSTRAINT "geofence_events_geofence_id_fkey" FOREIGN KEY ("geofence_id") REFERENCES "geofences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_notifications" ADD CONSTRAINT "family_notifications_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_notifications" ADD CONSTRAINT "family_notifications_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_notifications" ADD CONSTRAINT "family_notifications_geofence_id_fkey" FOREIGN KEY ("geofence_id") REFERENCES "geofences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_notifications" ADD CONSTRAINT "family_notifications_geofence_event_id_fkey" FOREIGN KEY ("geofence_event_id") REFERENCES "geofence_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
