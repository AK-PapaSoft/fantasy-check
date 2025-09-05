-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "tgUserId" BIGINT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'uk',
    "tz" TEXT NOT NULL DEFAULT 'Europe/Brussels',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'sleeper',
    "providerUsername" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leagues" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'sleeper',
    "providerLeagueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'nfl',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_leagues" (
    "userId" INTEGER NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "user_leagues_pkey" PRIMARY KEY ("userId","leagueId")
);

-- CreateTable
CREATE TABLE "matchups_cache" (
    "leagueId" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matchups_cache_pkey" PRIMARY KEY ("leagueId","week")
);

-- CreateTable
CREATE TABLE "alert_prefs" (
    "userId" INTEGER NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "pregame" BOOLEAN NOT NULL DEFAULT true,
    "scoring" BOOLEAN NOT NULL DEFAULT true,
    "waivers" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "alert_prefs_pkey" PRIMARY KEY ("userId","leagueId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_tgUserId_key" ON "users"("tgUserId");

-- CreateIndex
CREATE UNIQUE INDEX "providers_userId_provider_key" ON "providers"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_providerLeagueId_key" ON "leagues"("providerLeagueId");

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_leagues" ADD CONSTRAINT "user_leagues_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_leagues" ADD CONSTRAINT "user_leagues_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups_cache" ADD CONSTRAINT "matchups_cache_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_prefs" ADD CONSTRAINT "alert_prefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_prefs" ADD CONSTRAINT "alert_prefs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;