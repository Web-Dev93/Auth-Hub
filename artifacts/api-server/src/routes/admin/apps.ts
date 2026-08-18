import { Router, type IRouter } from "express";
import { db, appsTable, usersTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { requireAdmin } from "../../lib/auth";
import { CreateAppBody, UpdateAppBody, GetAppParams, UpdateAppParams, DeleteAppParams, RotateAppKeyParams } from "@workspace/api-zod";

const router: IRouter = Router();

function generateClientId(): string {
  return "ah_" + randomBytes(16).toString("hex");
}

function generateClientSecret(): string {
  return randomBytes(32).toString("hex");
}

// List apps
router.get("/admin/apps", requireAdmin, async (_req, res): Promise<void> => {
  const apps = await db.select().from(appsTable).orderBy(appsTable.createdAt);

  // Count users per app
  const userCounts = await db
    .select({ appId: usersTable.primaryAppId, cnt: count() })
    .from(usersTable)
    .groupBy(usersTable.primaryAppId);

  const countMap = new Map(userCounts.map((r) => [r.appId, Number(r.cnt)]));

  res.json(
    apps.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
      clientId: a.clientId,
      enabledProviders: a.enabledProviders,
      requestedScopes: a.requestedScopes,
      widgetColor: a.widgetColor,
      logoUrl: a.logoUrl,
      userCount: countMap.get(a.id) ?? 0,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
  );
});

// Create app
router.post("/admin/apps", requireAdmin, async (req, res): Promise<void> => {
  const body = CreateAppBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const clientId = generateClientId();
  const clientSecret = generateClientSecret();

  const [app] = await db
    .insert(appsTable)
    .values({
      name: body.data.name,
      url: body.data.url,
      clientId,
      clientSecret,
      enabledProviders: body.data.enabledProviders ?? ["google"],
      requestedScopes: (body.data.requestedScopes as Record<string, unknown>) ?? {},
      widgetColor: body.data.widgetColor ?? null,
      logoUrl: body.data.logoUrl ?? null,
    })
    .returning();

  res.status(201).json({
    id: app.id,
    name: app.name,
    url: app.url,
    clientId: app.clientId,
    clientSecret: app.clientSecret,
    enabledProviders: app.enabledProviders,
    requestedScopes: app.requestedScopes,
    widgetColor: app.widgetColor,
    logoUrl: app.logoUrl,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  });
});

// Get app
router.get("/admin/apps/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = GetAppParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [app] = await db
    .select()
    .from(appsTable)
    .where(eq(appsTable.id, params.data.id))
    .limit(1);

  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  const [{ cnt }] = await db
    .select({ cnt: count() })
    .from(usersTable)
    .where(eq(usersTable.primaryAppId, app.id));

  res.json({
    id: app.id,
    name: app.name,
    url: app.url,
    clientId: app.clientId,
    enabledProviders: app.enabledProviders,
    requestedScopes: app.requestedScopes,
    widgetColor: app.widgetColor,
    logoUrl: app.logoUrl,
    userCount: Number(cnt),
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  });
});

// Update app
router.patch("/admin/apps/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateAppParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateAppBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.name !== undefined) updateData.name = body.data.name;
  if (body.data.url !== undefined) updateData.url = body.data.url;
  if (body.data.enabledProviders !== undefined) updateData.enabledProviders = body.data.enabledProviders;
  if (body.data.requestedScopes !== undefined) updateData.requestedScopes = body.data.requestedScopes;
  if (body.data.widgetColor !== undefined) updateData.widgetColor = body.data.widgetColor;
  if (body.data.logoUrl !== undefined) updateData.logoUrl = body.data.logoUrl;

  const [updated] = await db
    .update(appsTable)
    .set(updateData)
    .where(eq(appsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  res.json({
    id: updated.id,
    name: updated.name,
    url: updated.url,
    clientId: updated.clientId,
    enabledProviders: updated.enabledProviders,
    requestedScopes: updated.requestedScopes,
    widgetColor: updated.widgetColor,
    logoUrl: updated.logoUrl,
    userCount: 0,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// Delete app
router.delete("/admin/apps/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteAppParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(appsTable)
    .where(eq(appsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  res.sendStatus(204);
});

// Rotate API key
router.post("/admin/apps/:id/rotate-key", requireAdmin, async (req, res): Promise<void> => {
  const params = RotateAppKeyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const newSecret = generateClientSecret();
  const [updated] = await db
    .update(appsTable)
    .set({ clientSecret: newSecret })
    .where(eq(appsTable.id, params.data.id))
    .returning({ clientId: appsTable.clientId, clientSecret: appsTable.clientSecret });

  if (!updated) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  res.json({ clientId: updated.clientId, clientSecret: updated.clientSecret });
});

export default router;
