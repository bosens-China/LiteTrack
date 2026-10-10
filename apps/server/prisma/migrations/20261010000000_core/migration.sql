-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "githubId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteToken" (
    "id" SERIAL NOT NULL,
    "siteId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" SERIAL NOT NULL,
    "siteId" INTEGER NOT NULL,
    "visitorId" TEXT NOT NULL,
    "currentSessionId" TEXT,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "siteId" INTEGER NOT NULL,
    "visitorId" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL,
    "entryPath" TEXT NOT NULL,
    "referrerDomain" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageviewEvent" (
    "id" SERIAL NOT NULL,
    "siteId" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PageviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Site_userId_domain_key" ON "Site"("userId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "SiteToken_token_key" ON "SiteToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_siteId_visitorId_key" ON "Visitor"("siteId", "visitorId");

-- CreateIndex
CREATE INDEX "Session_siteId_startedAt_idx" ON "Session"("siteId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_siteId_id_key" ON "Session"("siteId", "id");

-- CreateIndex
CREATE INDEX "PageviewEvent_siteId_receivedAt_idx" ON "PageviewEvent"("siteId", "receivedAt");

-- CreateIndex
CREATE INDEX "PageviewEvent_siteId_path_receivedAt_idx" ON "PageviewEvent"("siteId", "path", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PageviewEvent_siteId_eventId_key" ON "PageviewEvent"("siteId", "eventId");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteToken" ADD CONSTRAINT "SiteToken_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageviewEvent" ADD CONSTRAINT "PageviewEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageviewEvent" ADD CONSTRAINT "PageviewEvent_siteId_sessionId_fkey" FOREIGN KEY ("siteId", "sessionId") REFERENCES "Session"("siteId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
