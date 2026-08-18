import { Router, type IRouter } from "express";
import passport from "passport";
import { db, usersTable, accountsTable, activityLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getEnabledProviders } from "../lib/passport";

const router: IRouter = Router();

// ─── Provider list ─────────────────────────────────────────────────────────
router.get("/auth/providers", (_req, res): void => {
  res.json(getEnabledProviders());
});

// ─── Google ────────────────────────────────────────────────────────────────
router.get("/auth/google", passport.authenticate("google", { scope: ["openid", "profile", "email"] }));

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login?error=auth_failed" }),
  (_req, res): void => { res.redirect("/"); },
);

// ─── Facebook ─────────────────────────────────────────────────────────────
router.get("/auth/facebook", (req, res, next) => {
  const strategy = passport._strategy("facebook");
  if (!strategy) { res.status(503).json({ error: "Facebook OAuth not configured" }); return; }
  passport.authenticate("facebook", { scope: ["email"] })(req, res, next);
});

router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login?error=auth_failed" }),
  (_req, res): void => { res.redirect("/"); },
);

// ─── GitHub ───────────────────────────────────────────────────────────────
router.get("/auth/github", (req, res, next) => {
  const strategy = passport._strategy("github");
  if (!strategy) { res.status(503).json({ error: "GitHub OAuth not configured" }); return; }
  passport.authenticate("github", { scope: ["user:email"] })(req, res, next);
});

router.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login?error=auth_failed" }),
  (_req, res): void => { res.redirect("/"); },
);

// ─── Discord ──────────────────────────────────────────────────────────────
router.get("/auth/discord", (req, res, next) => {
  const strategy = passport._strategy("discord");
  if (!strategy) { res.status(503).json({ error: "Discord OAuth not configured" }); return; }
  passport.authenticate("discord")(req, res, next);
});

router.get(
  "/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/login?error=auth_failed" }),
  (_req, res): void => { res.redirect("/"); },
);

// ─── Microsoft ────────────────────────────────────────────────────────────
router.get("/auth/microsoft", (req, res, next) => {
  const strategy = passport._strategy("microsoft");
  if (!strategy) { res.status(503).json({ error: "Microsoft OAuth not configured" }); return; }
  passport.authenticate("microsoft")(req, res, next);
});

router.get(
  "/auth/microsoft/callback",
  passport.authenticate("microsoft", { failureRedirect: "/login?error=auth_failed" }),
  (_req, res): void => { res.redirect("/"); },
);

// ─── Current user (full profile) ───────────────────────────────────────────
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.id))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const accounts = await db
    .select({
      id: accountsTable.id,
      provider: accountsTable.provider,
      providerEmail: accountsTable.providerEmail,
      providerName: accountsTable.providerName,
      createdAt: accountsTable.createdAt,
    })
    .from(accountsTable)
    .where(eq(accountsTable.userId, user.id))
    .orderBy(accountsTable.createdAt);

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    verificationLevel: user.verificationLevel,
    connectedProviders: accounts.map((a) => a.provider),
    accounts: accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      providerEmail: a.providerEmail,
      providerName: a.providerName,
      createdAt: a.createdAt?.toISOString() ?? null,
    })),
    geoCountry: user.geoCountry,
    geoCity: user.geoCity,
    ipAddress: user.ipAddress,
    browser: user.browser,
    os: user.os,
    deviceType: user.deviceType,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

// ─── Own activity log (non-admin) ──────────────────────────────────────────
router.get("/auth/me/activity", requireAuth, async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);

  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.userId, req.user!.id))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(limit);

  res.json(
    logs.map((l) => ({
      id: l.id,
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

// ─── Logout ───────────────────────────────────────────────────────────────
router.post("/auth/logout", (req, res): void => {
  req.logout((err) => {
    if (err) { res.status(500).json({ error: "Logout failed" }); return; }
    res.json({ success: true });
  });
});

export default router;
