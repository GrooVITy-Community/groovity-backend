import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import * as pgSchema from "@shared/schema";
import * as sqliteSchema from "@shared/schema.sqlite";

import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;
let schema: any;

// --------------------
// POSTGRES (AWS RDS)
// --------------------
if (process.env.DATABASE_URL) {
  schema = pgSchema;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // required for AWS
  });

  await client.connect();

  db = drizzle(client, { schema });

  console.log("🔥 Connected to AWS RDS PostgreSQL");
} else {

  // --------------------
  // SQLITE (LOCAL)
  // --------------------
  schema = sqliteSchema;

  const sqlite = new Database(path.join(__dirname, "dev.sqlite"));
  sqlite.pragma("journal_mode = WAL");

  db = drizzle(sqlite, { schema });

  console.log("✓ Using SQLite database");
}

export { db };

export const {
  events,
  registrations,
  beats,
  beatOrders,
  insertEventSchema,
  insertRegistrationSchema,
  insertBeatSchema,
  insertBeatOrderSchema,
} = schema;
