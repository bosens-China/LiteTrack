-- AlterTable
ALTER TABLE "access_logs" ADD COLUMN     "language" TEXT,
ADD COLUMN     "utm_campaign" TEXT,
ADD COLUMN     "utm_medium" TEXT,
ADD COLUMN     "utm_source" TEXT;

-- CreateTable
CREATE TABLE "page_durations" (
    "id" SERIAL NOT NULL,
    "site_id" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "visitor_id" TEXT,
    "duration" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_durations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_durations_site_id_path_date_idx" ON "page_durations"("site_id", "path", "date");

-- AddForeignKey
ALTER TABLE "page_durations" ADD CONSTRAINT "page_durations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
