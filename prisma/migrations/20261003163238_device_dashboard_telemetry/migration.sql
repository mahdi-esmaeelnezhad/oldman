-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "battery_charging" BOOLEAN,
ADD COLUMN     "battery_level_percent" INTEGER,
ADD COLUMN     "is_device_owner" BOOLEAN,
ADD COLUMN     "storage_available_bytes" BIGINT,
ADD COLUMN     "storage_total_bytes" BIGINT;
