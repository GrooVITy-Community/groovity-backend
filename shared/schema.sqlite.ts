import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = sqliteTable("events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  venue: text("venue").notNull(),
  imageUrl: text("image_url"),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
}).extend({
  id: z.string().uuid().optional(),
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export const registrations = sqliteTable("registrations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventId: text("event_id").notNull().references(() => events.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  regNumber: text("reg_number").notNull(),
  utr: text("utr").notNull(),
  paymentSsUrl: text("payment_ss_url"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertRegistrationSchema = createInsertSchema(registrations).omit({
  id: true,
  createdAt: true,
}).extend({
  id: z.string().uuid().optional(),
});

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrations.$inferSelect;

export const beats = sqliteTable("beats", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  previewUrl: text("preview_url"),
  fullUrl: text("full_url"),
});

export const insertBeatSchema = createInsertSchema(beats).omit({
  id: true,
}).extend({
  id: z.string().uuid().optional(),
});

export type InsertBeat = z.infer<typeof insertBeatSchema>;
export type Beat = typeof beats.$inferSelect;

export const beatOrders = sqliteTable("beat_orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  beatId: text("beat_id").notNull().references(() => beats.id),
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  paymentSsUrl: text("payment_ss_url"),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertBeatOrderSchema = createInsertSchema(beatOrders).omit({
  id: true,
  createdAt: true,
}).extend({
  id: z.string().uuid().optional(),
});

export type InsertBeatOrder = z.infer<typeof insertBeatOrderSchema>;
export type BeatOrder = typeof beatOrders.$inferSelect;
