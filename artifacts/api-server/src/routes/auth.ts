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

// ─── Helper: register login + link routes for a provider ───────────────────
type ProviderRouteConfig = {
  loginScope?: string[];
  authorizeScope?: string[];
};

function addProviderRoutes(provider: string, cfg: ProviderRouteConfig = {}): void {
  // Login initiation
  router.get(`/auth/${provider}`, (req, res, next) => {
    if (!passport._strategy(provider)) {
      res.status(503).json({ error: `${provider} OAuth not configured` });
      return;
    }
    passport.authenticate(provider, { scope: cfg.loginScope })(req, res, next);
  });

  // Shared callback — handles both login and account-link flows.
  // When linking, session.linkingUserId is set before OAuth so the strategy
  // attaches the account to the existing user, and session.linkingRedirect
  // tells this handler where to redirect afterwards.
  router.get(
    `/auth/${provider}/callback`,
    passport.authenticate(provider, { failureRedirect: "/login?error=auth_failed" }),
    (req, res): void => {
      const sess = req.session as { linkingRedirect?: string };
      const target = sess.linkingRedirect ?? "/";
      delete sess.linkingRedirect;
      res.redirect(target);
    },
  );

  // Link initiation — stores user ID + post-link redirect in session,
  // then goes through the same OAuth flow as login (same registered callbackURL).
  router.get(`/auth/${provider}/link`, requireAuth, (req, res, next) => {
    if (!passport._strategy(provider)) {
      res.redirect("/profile?error=provider_not_configured");
      return;
    }
    const sess = req.session as { linkingUserId?: string; linkingRedirect?: string };
    sess.linkingUserId = req.user!.id;
    sess.linkingRedirect = "/profile?linked=true";
    passport.authenticate(provider, { scope: cfg.loginScope })(req, res, next);
  });
}

// ─── Google ────────────────────────────────────────────────────────────────
addProviderRoutes("google", { loginScope: ["openid", "profile", "email"] });

// ─── Facebook ─────────────────────────────────────────────────────────────
addProviderRoutes("facebook", { loginScope: ["email"] });

// ─── GitHub ───────────────────────────────────────────────────────────────
addProviderRoutes("github", { loginScope: ["user:email"] });

// ─── Discord ──────────────────────────────────────────────────────────────
addProviderRoutes("discord");

// ─── Microsoft ────────────────────────────────────────────────────────────
addProviderRoutes("microsoft");

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
