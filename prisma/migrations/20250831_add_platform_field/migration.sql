-- AlterTable
ALTER TABLE "users" ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'telegram';

-- Update existing users to have telegram platform
UPDATE "users" SET "platform" = 'telegram' WHERE "platform" IS NULL;