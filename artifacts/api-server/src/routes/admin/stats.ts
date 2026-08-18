import { Router, type IRouter } from "express";
import { db, usersTable, accountsTable, activityLogsTable, appsTable } from "@workspace/db";
import { desc, count, gte, eq, and, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { ListActivityQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// Dashboard stats
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    [{ totalUsers }],
    [{ newUsersToday }],
    [{ newUsersThisWeek }],
    [{ activeToday }],
    [{ totalApps }],
    providerRows,
    appRows,
    trendRows,
  ] = await Promise.all([
    db.select({ totalUsers: count() }).from(usersTable),
    db.select({ newUsersToday: count() }).from(usersTable).where(gte(usersTable.createdAt, todayStart)),
    db.select({ newUsersThisWeek: count() }).from(usersTable).where(gte(usersTable.createdAt, weekStart)),
    db.select({ activeToday: count() }).from(usersTable).where(gte(usersTable.lastLoginAt, todayStart)),
    db.select({ totalApps: count() }).from(appsTable),
    db
      .select({ provider: accountsTable.provider, cnt: count() })
      .from(accountsTable)
      .groupBy(accountsTable.provider)
      .orderBy(desc(count())),
    db
      .select({ appId: usersTable.primaryAppId, cnt: count() })
      .from(usersTable)
      .where(sql`${usersTable.primaryAppId} IS NOT NULL`)
      .groupBy(usersTable.primaryAppId)
      .orderBy(desc(count()))
      .limit(5),
    db
      .select({
        date: sql<string>`DATE(${usersTable.createdAt})::text`,
        cnt: count(),
      })
      .from(usersTable)
      .where(gte(usersTable.createdAt, twoWeeksAgo))
      .groupBy(sql`DATE(${usersTable.createdAt})`)
      .orderBy(sql`DATE(${usersTable.createdAt})`),
  ]);

  // Get app names for breakdown
  const appIds = appRows.map((r) => r.appId).filter(Boolean) as string[];
  const apps =
    appIds.length > 0
      ? await db
          .select({ id: appsTable.id, name: appsTable.name })
          .from(appsTable)
          .where(inArray(appsTable.id, appIds))
      : [];
  const appMap = new Map(apps.map((a) => [a.id, a.name]));

  res.json({
    totalUsers: Number(totalUsers),
    newUsersToday: Number(newUsersToday),
    newUsersThisWeek: Number(newUsersThisWeek),
    activeToday: Number(activeToday),
    totalApps: Number(totalApps),
    providerBreakdown: providerRows.map((r) => ({
      provider: r.provider,
      count: Number(r.cnt),
    })),
    appBreakdown: appRows.map((r) => ({
      appId: r.appId ?? "",
      appName: r.appId ? (appMap.get(r.appId) ?? "Unknown") : "Unknown",
      count: Number(r.cnt),
    })),
    registrationsTrend: trendRows.map((r) => ({
      date: r.date,
      count: Number(r.cnt),
    })),
  });
});

// Activity logs
router.get("/admin/activity", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ListActivityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, appId, limit = 50 } = parsed.data;
  const conditions = [];
  if (userId) conditions.push(eq(activityLogsTable.userId, userId));
  if (appId) conditions.push(eq(activityLogsTable.appId, appId));

  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(limit);

  // Enrich with user/app info
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const appIds = [...new Set(logs.map((l) => l.appId).filter(Boolean))] as string[];

  const [users, apps] = await Promise.all([
    userIds.length > 0
      ? db
          .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name })
          .from(usersTable)
          .where(inArray(usersTable.id, userIds))
      : Promise.resolve([]),
    appIds.length > 0
      ? db
          .select({ id: appsTable.id, name: appsTable.name })
          .from(appsTable)
          .where(inArray(appsTable.id, appIds))
      : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const appMap = new Map(apps.map((a) => [a.id, a.name]));

  res.json(
    logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userEmail: l.userId ? (userMap.get(l.userId)?.email ?? null) : null,
      userName: l.userId ? (userMap.get(l.userId)?.name ?? null) : null,
      appId: l.appId,
      appName: l.appId ? (appMap.get(l.appId) ?? null) : null,
      eventType: l.eventType,
      provider: l.provider,
      ipAddress: l.ipAddress,
      geoCountry: l.geoCountry,
      geoCity: l.geoCity,
      userAgent: l.userAgent,
      createdAt: l.createdAt.toISOString(),
    })),
  );
});

export default router;
