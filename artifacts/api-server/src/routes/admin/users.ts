import { Router, type IRouter } from "express";
import { db, usersTable, accountsTable, activityLogsTable, appsTable } from "@workspace/db";
import { eq, ilike, and, desc, count, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { UpdateUserBody, UpdateUserParams, GetUserParams, DeleteUserParams, ListUsersQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// List users
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, appId, search, role, status } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(usersTable.email, `%${search}%`),
        ilike(usersTable.name, `%${search}%`),
      )!,
    );
  }
  if (role) conditions.push(eq(usersTable.role, role));
  if (status) conditions.push(eq(usersTable.status, status));
  if (appId) conditions.push(eq(usersTable.primaryAppId, appId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [users, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(usersTable)
      .where(whereClause)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(usersTable).where(whereClause),
  ]);

  const userIds = users.map((u) => u.id);

  // Get connected providers for each user
  const accounts =
    userIds.length > 0
      ? await db
          .select({ userId: accountsTable.userId, provider: accountsTable.provider })
          .from(accountsTable)
          .where(sql`${accountsTable.userId} = ANY(${userIds}::uuid[])`)
      : [];

  // Get app names for primary app
  const appIds = [...new Set(users.map((u) => u.primaryAppId).filter(Boolean))] as string[];
  const apps =
    appIds.length > 0
      ? await db
          .select({ id: appsTable.id, name: appsTable.name })
          .from(appsTable)
          .where(sql`${appsTable.id} = ANY(${appIds}::uuid[])`)
      : [];
  const appMap = new Map(apps.map((a) => [a.id, a.name]));

  const providerMap = new Map<string, string[]>();
  for (const acc of accounts) {
    const list = providerMap.get(acc.userId) ?? [];
    list.push(acc.provider);
    providerMap.set(acc.userId, list);
  }

  const result = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    role: u.role,
    status: u.status,
    verificationLevel: u.verificationLevel,
    connectedProviders: providerMap.get(u.id) ?? [],
    primaryAppId: u.primaryAppId,
    primaryAppName: u.primaryAppId ? (appMap.get(u.primaryAppId) ?? null) : null,
    geoCountry: u.geoCountry,
    geoCity: u.geoCity,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }));

  res.json({ users: result, total: Number(total), page, limit });
});

// Get single user
router.get("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [accounts, recentLogs, [primaryApp]] = await Promise.all([
    db.select().from(accountsTable).where(eq(accountsTable.userId, user.id)),
    db
      .select()
      .from(activityLogsTable)
      .where(eq(activityLogsTable.userId, user.id))
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(10),
    user.primaryAppId
      ? db.select({ name: appsTable.name }).from(appsTable).where(eq(appsTable.id, user.primaryAppId)).limit(1)
      : Promise.resolve([null]),
  ]);

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    verificationLevel: user.verificationLevel,
    connectedProviders: accounts.map((a) => a.provider),
    primaryAppId: user.primaryAppId,
    primaryAppName: primaryApp?.name ?? null,
    geoCountry: user.geoCountry,
    geoCity: user.geoCity,
    ipAddress: user.ipAddress,
    deviceType: user.deviceType,
    browser: user.browser,
    os: user.os,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    accounts: accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      providerEmail: a.providerEmail,
      providerName: a.providerName,
      createdAt: a.createdAt.toISOString(),
    })),
    recentActivity: recentLogs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userEmail: user.email,
      userName: user.name,
      appId: l.appId,
      appName: null,
      eventType: l.eventType,
      provider: l.provider,
      ipAddress: l.ipAddress,
      geoCountry: l.geoCountry,
      geoCity: l.geoCity,
      userAgent: l.userAgent,
      createdAt: l.createdAt.toISOString(),
    })),
  });
});

// Update user
router.patch("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.role !== undefined) updateData.role = body.data.role;
  if (body.data.status !== undefined) updateData.status = body.data.status;

  const [updated] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const accounts = await db
    .select({ provider: accountsTable.provider })
    .from(accountsTable)
    .where(eq(accountsTable.userId, updated.id));

  res.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    avatarUrl: updated.avatarUrl,
    role: updated.role,
    status: updated.status,
    verificationLevel: updated.verificationLevel,
    connectedProviders: accounts.map((a) => a.provider),
    primaryAppId: updated.primaryAppId,
    primaryAppName: null,
    geoCountry: updated.geoCountry,
    geoCity: updated.geoCity,
    lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

// Delete user
router.delete("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
