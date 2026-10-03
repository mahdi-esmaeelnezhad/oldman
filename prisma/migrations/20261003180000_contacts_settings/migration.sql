-- CreateEnum
CREATE TYPE "device_setting_section" AS ENUM ('DEVICE', 'NETWORK', 'DISPLAY', 'SOUND', 'SECURITY', 'APPLICATIONS');

-- CreateTable
CREATE TABLE "device_contacts" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "contact_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_settings" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "section" "device_setting_section" NOT NULL,
    "value" JSONB NOT NULL,
    "writable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_contacts_device_id_idx" ON "device_contacts"("device_id");

-- CreateIndex
CREATE INDEX "device_contacts_device_id_display_name_idx" ON "device_contacts"("device_id", "display_name");

-- CreateIndex
CREATE UNIQUE INDEX "device_contacts_device_id_contact_id_key" ON "device_contacts"("device_id", "contact_id");

-- CreateIndex
CREATE INDEX "device_settings_device_id_idx" ON "device_settings"("device_id");

-- CreateIndex
CREATE INDEX "device_settings_device_id_section_idx" ON "device_settings"("device_id", "section");

-- CreateIndex
CREATE UNIQUE INDEX "device_settings_device_id_key_key" ON "device_settings"("device_id", "key");

-- AddForeignKey
ALTER TABLE "device_contacts" ADD CONSTRAINT "device_contacts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_settings" ADD CONSTRAINT "device_settings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;