// server/routes.ts
import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { upload } from "./middleware/upload";
import { adminAuth } from "./middleware/auth";
import { uploadToS3 } from "./s3";
import { insertRegistrationSchema, insertBeatOrderSchema } from "../shared/schema";
import { fromError } from "zod-validation-error";

export async function registerRoutes(app: Express) {
  /* GET EVENTS */
  app.get("/api/events", async (_req, res) => {
    try {
      const all = await storage.getAllEvents();
      res.json(all);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  /* CREATE REGISTRATION */
  // accepts multipart/form-data with file field "payment_ss"
  app.post("/api/registrations", upload.single("payment_ss"), async (req, res) => {
    try {
      // Accept flexible incoming names:
      const incoming = {
        eventId: req.body.event_id ?? req.body.eventId ?? req.body.event,
        name: req.body.name ?? req.body.fullName ?? req.body.full_name,
        email: req.body.email,
        phone: req.body.phone,
        regNumber: req.body.reg_number ?? req.body.regNumber ?? req.body.regNumber,
        utr: req.body.utr ?? req.body.utr_id ?? null,
      };

      const parsed = insertRegistrationSchema.safeParse(incoming);
      if (!parsed.success) {
        return res.status(400).json({ message: `Validation error: ${fromError(parsed.error).toString()}` });
      }

      let paymentSsUrl: string | undefined = undefined;
      if (req.file) {
        // use eventId from parsed data if available, fallback to unknown
        const eventIdForPath = parsed.success ? parsed.data.eventId : incoming.eventId;
        const uploaded = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, eventIdForPath);
        if (!uploaded.success) {
          return res.status(500).json({ message: uploaded.error || "Failed to upload payment screenshot" });
        }
        paymentSsUrl = uploaded.url;
      }

      // pass paymentSsUrl explicitly to storage
      const created = await storage.createRegistration({ ...parsed.data, paymentSsUrl: paymentSsUrl ?? null });
      res.status(201).json(created);
    } catch (err) {
      console.error("Error creating registration:", err);
      res.status(500).json({ message: "Failed to create registration" });
    }
  });

  /* GET REGISTRATIONS (ADMIN) */
  app.get("/api/admin/registrations", adminAuth, async (_req, res) => {
    try {
      const all = await storage.getAllRegistrations();
      res.json(all);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  /* GET BEATS */
  app.get("/api/beats", async (_req, res) => {
    try {
      const beats = await storage.getAllBeats();
      res.json(beats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch beats" });
    }
  });

  /* BEAT PURCHASE */
  app.post("/api/beats/:beatId/purchase", async (req, res) => {
    try {
      const beatId = req.params.beatId;
      const { buyerName, buyerEmail, buyerPhone } = req.body;

      const order = await storage.createBeatOrder({
        beatId,
        buyerName,
        buyerEmail,
        buyerPhone,
        paymentSsUrl: null,
      });

      res.status(201).json(order);
    } catch (err) {
      console.error("Beat purchase error:", err);
      res.status(500).json({ message: "Failed to process order" });
    }
  });

  return createServer(app);
}
