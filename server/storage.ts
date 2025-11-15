// server/storage.ts
import { db } from "./db";
import {
  events,
  registrations,
  beats,
  beatOrders,
} from "../shared/schema";
import { eq } from "drizzle-orm";


export const storage = {
  /* -------------------------------------------
   * EVENTS
   * ----------------------------------------- */
  async getAllEvents() {
    try {
      const rows = await db.select().from(events);

      const mapped = await Promise.all(
        rows.map(async (e) => {
          const regs = await db
            .select()
            .from(registrations)
            .where(eq(registrations.eventId, e.id));

          return {
            id: e.id,
            title: e.title,
            description: e.description,
            date: e.date,
            venue: e.venue,
            imageUrl: e.imageUrl ?? e.image_url ?? null,
            isPaid: e.isPaid === 1 || e.is_paid === 1,
            price: e.price ?? null,

            // payment fields (nullable) — returned in snake_case for frontend ease
            upi_id: e.upiId ?? e.upi_id ?? null,
            account_number: e.accountNumber ?? e.account_number ?? null,
            ifsc: e.ifsc ?? null,
            qr_url: e.qrUrl ?? e.qr_url ?? null,

            registrationCount: regs.length,
          };
        })
      );

      return mapped;
    } catch (err) {
      console.error("storage.getAllEvents error:", err);
      throw err;
    }
  },


  /* -------------------------------------------
   * REGISTRATIONS
   * ----------------------------------------- */
  async createRegistration(data) {
    try {
      // data is expected to have: eventId, name, email, phone, regNumber, utr, paymentSsUrl
      const insert = {
        eventId: data.eventId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        regNumber: data.regNumber,
        utr: data.utr ?? null,
        paymentSsUrl: data.paymentSsUrl ?? null,
      };

      const result = await db.insert(registrations).values(insert).returning();
      return result[0];
    } catch (err) {
      console.error("storage.createRegistration error:", err);
      throw err;
    }
  },

  /* -------------------------------------------
   * BEATS (FIXED)
   * ----------------------------------------- */
  async getAllBeats() {
    const rows = await db.select().from(beats);

    return rows.map((b) => ({
      id: b.id,
      title: b.title,
      artist: b.artist,
      price: b.price,
      preview_url: b.previewUrl ?? b.preview_url ?? null,
      thumbnail_url: b.thumbnailUrl ?? b.thumbnail_url ?? null,
    }));
  },

  async getBeatById(id) {
    const row = await db
      .select()
      .from(beats)
      .where(eq(beats.id, id));

    return row[0] ?? null;
  },

  /* -------------------------------------------
   * BEAT ORDERS
   * ----------------------------------------- */
  async createBeatOrder(data) {
    try {
      const insert = {
        beatId: data.beatId,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        buyerPhone: data.buyerPhone,
        paymentSsUrl: null, // no screenshot for beats
        status: "pending",
      };

      const result = await db.insert(beatOrders).values(insert).returning();
      return result[0];
    } catch (err) {
      console.error("storage.createBeatOrder error:", err);
      throw err;
    }
  },
};
