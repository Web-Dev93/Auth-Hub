import { Router, type IRouter } from "express";
import passport from "passport";
import { db, usersTable, accountsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Initiate Google OAuth
router.get("/auth/google", passport.authenticate("google", {
  scope: ["openid", "profile", "email"],
}));

// Google OAuth callback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/?error=auth_failed",
  }),
  (_req, res): void => {
    res.redirect("/");
  },
);

// Get current user
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

  // Get connected providers
  const accounts = await db
    .select({ provider: accountsTable.provider })
    .from(accountsTable)
    .where(eq(accountsTable.userId, user.id));

  const connectedProviders = accounts.map((a) => a.provider);

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    verificationLevel: user.verificationLevel,
    connectedProviders,
    createdAt: user.createdAt.toISOString(),
  });
});

// Logout
router.post("/auth/logout", (req, res): void => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    res.json({ success: true });
  });
});

export default router;
