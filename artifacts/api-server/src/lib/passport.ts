import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db, usersTable, accountsTable, activityLogsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { logger } from "./logger";
import { getGeoInfo } from "./geo";

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
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL,
        passReqToCallback: true,
      },
      async (req, _accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email from Google profile"), undefined);
          }

          const name = profile.displayName || email;
          const avatarUrl = profile.photos?.[0]?.value ?? null;

          // Geo from request IP
          const ip = (req.ip || req.socket?.remoteAddress || "").replace("::ffff:", "");
          const geo = await getGeoInfo(ip);

          // Check if user already exists by email
          const [existingUser] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email))
            .limit(1);

          // Admin email: either set explicitly via env var, or first-ever user
          const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
          const isAdminEmail = adminEmail && email.toLowerCase() === adminEmail;

          let userId: string;

          if (existingUser) {
            // If this is the designated admin email, always ensure admin role
            const updateData: Record<string, unknown> = {
              lastLoginAt: new Date(),
              geoCountry: geo.country ?? existingUser.geoCountry,
              geoCity: geo.city ?? existingUser.geoCity,
              ipAddress: ip || existingUser.ipAddress,
            };
            if (isAdminEmail && existingUser.role !== "admin") {
              updateData.role = "admin";
            }
            await db
              .update(usersTable)
              .set(updateData)
              .where(eq(usersTable.id, existingUser.id));
            userId = existingUser.id;
          } else {
            // Check if this is the first user (should be admin) OR designated admin email
            const [{ value: userCount }] = await db
              .select({ value: count() })
              .from(usersTable);

            const role = (userCount === 0 || isAdminEmail) ? "admin" : "user";

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
                lastLoginAt: new Date(),
              })
              .returning();

            userId = newUser.id;
          }

          // Upsert the Google account link
          const [existingAccount] = await db
            .select()
            .from(accountsTable)
            .where(eq(accountsTable.providerAccountId, profile.id))
            .limit(1);

          if (!existingAccount) {
            await db.insert(accountsTable).values({
              userId,
              provider: "google",
              providerAccountId: profile.id,
              providerEmail: email,
              providerName: name,
              profileData: profile._json as Record<string, unknown>,
            });
          }

          // Log the event
          await db.insert(activityLogsTable).values({
            userId,
            eventType: existingUser ? "login" : "register",
            provider: "google",
            ipAddress: ip || null,
            geoCountry: geo.country ?? null,
            geoCity: geo.city ?? null,
            userAgent: req.headers["user-agent"] ?? null,
          });

          return done(null, { id: userId });
        } catch (err) {
          logger.error({ err }, "Google OAuth strategy error");
          return done(err as Error, undefined);
        }
      },
    ),
  );
}
