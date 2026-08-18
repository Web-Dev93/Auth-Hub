import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// This table is managed by connect-pg-simple for express-session
// We define it here just for reference, but the actual table creation
// is handled by connect-pg-simple's own CREATE TABLE statement.
export const sessionsTable = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire", { withTimezone: true }).notNull(),
});
