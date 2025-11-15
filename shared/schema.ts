// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* EVENTS TABLE */
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  venue: text("venue").notNull(),
  imageUrl: text("image_url"),

  // existing paid flag + price
  isPaid: integer("is_paid").notNull().default(0),
  price: integer("price"),

  // NEW payment fields (optional — only used for paid events)
  upiId: text("upi_id"),
  accountNumber: text("account_number"),
  ifsc: text("ifsc"),
  qrUrl: text("qr_url"),
});

export const insertEventSchema = createInsertSchema(events).omit({ id: true }).extend({
  id: z.string().uuid().optional(),
});

export type Event = typeof events.$inferSelect;

/* REGISTRATIONS TABLE */
export const registrations = pgTable("registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),

  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  regNumber: text("reg_number").notNull(),

  utr: text("utr"),
  paymentSsUrl: text("payment_ss_url"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRegistrationSchema = createInsertSchema(registrations)
  .omit({ id: true, createdAt: true })
  .extend({
    id: z.string().uuid().optional(),
  });

export type Registration = typeof registrations.$inferSelect;

/* BEATS TABLE (FINAL + MATCHES YOUR DB) */
export const beats = pgTable("beats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  title: text("title").notNull(),
  artist: text("artist").notNull(),

  price: integer("price").notNull(),

  previewUrl: text("preview_url").notNull(),     // CDN audio link
  thumbnailUrl: text("thumbnail_url").notNull(), // CDN image link
});

export const insertBeatSchema = createInsertSchema(beats).omit({ id: true }).extend({
  id: z.string().uuid().optional(),
});

export type Beat = typeof beats.$inferSelect;

/* BEAT ORDERS */
export const beatOrders = pgTable("beat_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  beatId: varchar("beat_id").notNull().references(() => beats.id),

  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerPhone: text("buyer_phone").notNull(),

  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});


export const insertBeatOrderSchema = createInsertSchema(beatOrders)
  .omit({ id: true, createdAt: true })
  .extend({ id: z.string().uuid().optional() });

export type BeatOrder = typeof beatOrders.$inferSelect;
