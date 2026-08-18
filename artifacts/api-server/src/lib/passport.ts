import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as DiscordStrategy } from "passport-discord";
import MicrosoftStrategy from "passport-microsoft";
import { UAParser } from "ua-parser-js";
import { db, usersTable, accountsTable, activityLogsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { logger } from "./logger";
import { getGeoInfo } from "./geo";
import type { Request } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      id: string;
    }
  }
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    done(null, user ?? null);
  } catch (err) {
    done(err, null);
  }
});

// ─── Shared upsert helper ──────────────────────────────────────────────────

interface UpsertOptions {
  req: Request;
  provider: string;
  providerAccountId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  providerEmail?: string;
  profileData?: Record<string, unknown>;
}

async function upsertOAuthUser(opts: UpsertOptions): Promise<{ id: string }> {
  const { req, provider, providerAccountId, email, name, avatarUrl, providerEmail, profileData } = opts;

  const ip = (req.ip || (req.socket as { remoteAddress?: string })?.remoteAddress || "").replace("::ffff:", "");
  const geo = await getGeoInfo(ip);

  const uaParser = new UAParser(req.headers["user-agent"] ?? "");
  const browser = uaParser.getBrowser().name ?? null;
  const os = uaParser.getOS().name ?? null;
  const deviceType = uaParser.getDevice().type ?? "desktop";

  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const isAdminEmail = adminEmail && email.toLowerCase() === adminEmail;

  let userId: string;

  if (existingUser) {
    const updateData: Record<string, unknown> = {
      lastLoginAt: new Date(),
      geoCountry: geo.country ?? existingUser.geoCountry,
      geoCity: geo.city ?? existingUser.geoCity,
      ipAddress: ip || existingUser.ipAddress,
      browser: browser ?? existingUser.browser,
      os: os ?? existingUser.os,
      deviceType: deviceType ?? existingUser.deviceType,
    };
    // Refresh avatar if we have one from provider
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    if (isAdminEmail && existingUser.role !== "admin") updateData.role = "admin";

    await db.update(usersTable).set(updateData).where(eq(usersTable.id, existingUser.id));
    userId = existingUser.id;
  } else {
    const [{ value: userCount }] = await db.select({ value: count() }).from(usersTable);
    const role = userCount === 0 || isAdminEmail ? "admin" : "user";

    const [newUser] = await db
      .insert(usersTable)
      .values({
        email,
        name,
        avatarUrl,
        role,
        geoCountry: geo.country ?? null,
        geoCity: geo.city ?? null,
        ipAddress: ip || null,
        browser: browser ?? null,
        os: os ?? null,
        deviceType: deviceType ?? null,
        lastLoginAt: new Date(),
      })
      .returning();

    userId = newUser.id;
  }

  // Upsert provider account link
  const [existingAccount] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.providerAccountId, providerAccountId))
    .limit(1);

  if (!existingAccount) {
    await db.insert(accountsTable).values({
      userId,
      provider,
      providerAccountId,
      providerEmail: providerEmail ?? email,
      providerName: name,
      profileData: profileData ?? {},
    });
  }

  // Log the event
  await db.insert(activityLogsTable).values({
    userId,
    eventType: existingUser ? "login" : "register",
    provider,
    ipAddress: ip || null,
    geoCountry: geo.country ?? null,
    geoCity: geo.city ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });

  return { id: userId };
}

// ─── Google ────────────────────────────────────────────────────────────────

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  logger.warn("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — Google OAuth disabled");
} else {
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;

  passport.use(
    new GoogleStrategy(
      { clientID: googleClientId, clientSecret: googleClientSecret, callbackURL, passReqToCallback: true },
      async (req, _at, _rt, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email from Google profile"), undefined);
          const result = await upsertOAuthUser({
            req,
            provider: "google",
            providerAccountId: profile.id,
            email,
            name: profile.displayName || email,
            avatarUrl: profile.photos?.[0]?.value ?? null,
            profileData: profile._json as Record<string, unknown>,
          });
          return done(null, result);
        } catch (err) {
          logger.error({ err }, "Google OAuth error");
          return done(err as Error, undefined);
        }
      },
    ),
  );
}

// ─── Facebook ─────────────────────────────────────────────────────────────

const fbAppId = process.env.FACEBOOK_APP_ID;
const fbAppSecret = process.env.FACEBOOK_APP_SECRET;

if (!fbAppId || !fbAppSecret) {
  logger.warn("FACEBOOK_APP_ID or FACEBOOK_APP_SECRET not set — Facebook OAuth disabled");
} else {
  const callbackURL =
    process.env.FACEBOOK_CALLBACK_URL ||
    `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/facebook/callback`;

  passport.use(
    new FacebookStrategy(
      {
        clientID: fbAppId,
        clientSecret: fbAppSecret,
        callbackURL,
        profileFields: ["id", "emails", "displayName", "photos"],
        passReqToCallback: true,
      },
      async (req, _at, _rt, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email from Facebook profile"), undefined);
          const result = await upsertOAuthUser({
            req,
            provider: "facebook",
            providerAccountId: profile.id,
            email,
            name: profile.displayName || email,
            avatarUrl: profile.photos?.[0]?.value ?? null,
            profileData: { id: profile.id, displayName: profile.displayName },
          });
          return done(null, result);
        } catch (err) {
          logger.error({ err }, "Facebook OAuth error");
          return done(err as Error, undefined);
        }
      },
    ),
  );
}

// ─── GitHub ───────────────────────────────────────────────────────────────

const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

if (!githubClientId || !githubClientSecret) {
  logger.warn("GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not set — GitHub OAuth disabled");
} else {
  const callbackURL =
    process.env.GITHUB_CALLBACK_URL ||
    `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/github/callback`;

  passport.use(
    new GitHubStrategy(
      { clientID: githubClientId, clientSecret: githubClientSecret, callbackURL, passReqToCallback: true },
      async (req: Request, _at: string, _rt: string, profile: { id: string; displayName: string; emails?: { value: string }[]; photos?: { value: string }[]; _json: unknown }, done: (err: Error | null | undefined, user?: { id: string }) => void) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email from GitHub profile — ensure email is public or grant email scope"), undefined);
          const result = await upsertOAuthUser({
            req,
            provider: "github",
            providerAccountId: profile.id,
            email,
            name: profile.displayName || email,
            avatarUrl: profile.photos?.[0]?.value ?? null,
            profileData: profile._json as Record<string, unknown>,
          });
          return done(null, result);
        } catch (err) {
          logger.error({ err }, "GitHub OAuth error");
          return done(err as Error, undefined);
        }
      },
    ),
  );
}

// ─── Discord ──────────────────────────────────────────────────────────────

const discordClientId = process.env.DISCORD_CLIENT_ID;
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;

if (!discordClientId || !discordClientSecret) {
  logger.warn("DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET not set — Discord OAuth disabled");
} else {
  const callbackURL =
    process.env.DISCORD_CALLBACK_URL ||
    `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/discord/callback`;

  passport.use(
    new DiscordStrategy(
      {
        clientID: discordClientId,
        clientSecret: discordClientSecret,
        callbackURL,
        scope: ["identify", "email"],
        passReqToCallback: true,
      },
      async (req: Request, _at: string, _rt: string, profile: { id: string; username: string; email?: string; avatar?: string }, done: (err: Error | null | undefined, user?: { id: string }) => void) => {
        try {
          const email = profile.email;
          if (!email) return done(new Error("No email from Discord profile"), undefined);
          const avatarUrl = profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null;
          const result = await upsertOAuthUser({
            req,
            provider: "discord",
            providerAccountId: profile.id,
            email,
            name: profile.username,
            avatarUrl,
            profileData: { id: profile.id, username: profile.username },
          });
          return done(null, result);
        } catch (err) {
          logger.error({ err }, "Discord OAuth error");
          return done(err as Error, undefined);
        }
      },
    ),
  );
}

// ─── Microsoft ────────────────────────────────────────────────────────────

const msClientId = process.env.MICROSOFT_CLIENT_ID;
const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET;

if (!msClientId || !msClientSecret) {
  logger.warn("MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET not set — Microsoft OAuth disabled");
} else {
  const callbackURL =
    process.env.MICROSOFT_CALLBACK_URL ||
    `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/microsoft/callback`;

  passport.use(
    // @ts-expect-error passport-microsoft has loose typings
    new MicrosoftStrategy(
      {
        clientID: msClientId,
        clientSecret: msClientSecret,
        callbackURL,
        scope: ["user.read"],
        tenant: process.env.MICROSOFT_TENANT_ID || "common",
        passReqToCallback: true,
      },
      async (req: Request, _at: string, _rt: string, profile: { id: string; displayName: string; emails?: { value: string }[]; photos?: { value: string }[]; _json: unknown }, done: (err: Error | null | undefined, user?: { id: string }) => void) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email from Microsoft profile"), undefined);
          const result = await upsertOAuthUser({
            req,
            provider: "microsoft",
            providerAccountId: profile.id,
            email,
            name: profile.displayName || email,
            avatarUrl: profile.photos?.[0]?.value ?? null,
            profileData: profile._json as Record<string, unknown>,
          });
          return done(null, result);
        } catch (err) {
          logger.error({ err }, "Microsoft OAuth error");
          return done(err as Error, undefined);
        }
      },
    ),
  );
}

// Exported list of currently enabled providers (for the /auth/providers endpoint)
export function getEnabledProviders(): string[] {
  const providers: string[] = [];
  if (googleClientId && googleClientSecret) providers.push("google");
  if (fbAppId && fbAppSecret) providers.push("facebook");
  if (githubClientId && githubClientSecret) providers.push("github");
  if (discordClientId && discordClientSecret) providers.push("discord");
  if (msClientId && msClientSecret) providers.push("microsoft");
  return providers;
}

export default passport;
