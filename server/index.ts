// --------------------
// LOAD ENV FIRST
// --------------------
import path from "path";
import dotenv from "dotenv";

// Always load .env from root
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
  override: true,
});

console.log("ENV LOADED:", {
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT,
  S3_BUCKET: process.env.S3_BUCKET,
});

// --------------------
// APP SETUP
// --------------------
import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

const app = express();

// Parse JSON
app.use(express.json());

// CORS — allow frontend
app.use(
  cors({
    origin: [
      "http://localhost:5173",         // local frontend
      "https://groovityclub.com",      // prod domain
      "https://www.groovityclub.com",
    ],
    credentials: true,
  })
);

// --------------------
// START SERVER
// --------------------
registerRoutes(app).then((server) => {
  const PORT = process.env.PORT || 5000;

  server.listen(PORT, () => {
    console.log(`🚀 Backend API running at http://localhost:${PORT}`);
  });
});
