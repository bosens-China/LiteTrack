-- AlterTable
ALTER TABLE "access_logs"
ADD COLUMN "visitor_id" TEXT,
ADD COLUMN "session_id" TEXT,
ADD COLUMN "device_type" TEXT,
ADD COLUMN "browser" TEXT,
ADD COLUMN "os" TEXT;

-- CreateTable
CREATE TABLE "daily_visitors" (
    "id" SERIAL NOT NULL,
    "site_id" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_daily_visitors" (
    "id" SERIAL NOT NULL,
    "site_id" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_daily_visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_read_progress" (
    "id" SERIAL NOT NULL,
    "site_id" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "max_depth" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_read_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_visitors_site_id_date_visitor_id_key" ON "daily_visitors"("site_id", "date", "visitor_id");

-- CreateIndex
CREATE INDEX "daily_visitors_site_id_date_idx" ON "daily_visitors"("site_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "page_daily_visitors_site_id_path_date_visitor_id_key" ON "page_daily_visitors"("site_id", "path", "date", "visitor_id");

-- CreateIndex
CREATE INDEX "page_daily_visitors_site_id_path_date_idx" ON "page_daily_visitors"("site_id", "path", "date");

-- CreateIndex
CREATE UNIQUE INDEX "page_read_progress_site_id_path_date_visitor_id_key" ON "page_read_progress"("site_id", "path", "date", "visitor_id");

-- CreateIndex
CREATE INDEX "page_read_progress_site_id_path_date_idx" ON "page_read_progress"("site_id", "path", "date");

-- AddForeignKey
ALTER TABLE "daily_visitors" ADD CONSTRAINT "daily_visitors_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_daily_visitors" ADD CONSTRAINT "page_daily_visitors_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_read_progress" ADD CONSTRAINT "page_read_progress_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
