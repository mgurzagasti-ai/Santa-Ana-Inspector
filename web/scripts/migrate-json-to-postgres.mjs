import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const databaseUrl = [
  process.env.PG_POSTGRES_URL,
  process.env.PG_DATABASE_URL,
  process.env.POSTGRES_URL,
  process.env.DATABASE_URL
].find((value) => value?.startsWith("postgres://") || value?.startsWith("postgresql://"));

if (!databaseUrl) {
  console.error("Falta una URL Postgres valida: PG_POSTGRES_URL, PG_DATABASE_URL, POSTGRES_URL o DATABASE_URL.");
  process.exit(1);
}

const dataDir = path.join(process.cwd(), "data");
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function readJson(fileName) {
  try {
    const raw = await fs.readFile(path.join(dataDir, fileName), "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inspectors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      employee_code TEXT NOT NULL UNIQUE,
      pin TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      inspector_id TEXT NOT NULL,
      inspector_name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('entrada', 'salida')),
      timestamp TIMESTAMPTZ NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      accuracy_meters DOUBLE PRECISION,
      phone_id TEXT,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS checkins_timestamp_idx ON checkins (timestamp DESC);
    CREATE INDEX IF NOT EXISTS checkins_inspector_id_idx ON checkins (inspector_id);

    CREATE TABLE IF NOT EXISTS tracking_points (
      id TEXT PRIMARY KEY,
      inspector_id TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      accuracy_meters DOUBLE PRECISION,
      phone_id TEXT
    );

    CREATE INDEX IF NOT EXISTS tracking_timestamp_idx ON tracking_points (timestamp DESC);
    CREATE INDEX IF NOT EXISTS tracking_inspector_id_idx ON tracking_points (inspector_id);
  `);
}

async function migrateInspectors() {
  const inspectors = await readJson("inspectors.json");

  for (const inspector of inspectors) {
    await pool.query(
      `INSERT INTO inspectors (id, name, employee_code, pin, active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (employee_code) DO UPDATE
       SET name = EXCLUDED.name,
           pin = EXCLUDED.pin,
           active = EXCLUDED.active,
           updated_at = NOW()`,
      [
        inspector.id || randomUUID(),
        inspector.name,
        inspector.employeeCode,
        inspector.pin,
        inspector.active ?? true
      ]
    );
  }

  return inspectors.length;
}

async function resolveInspectorId(value) {
  const result = await pool.query("SELECT id FROM inspectors WHERE id = $1 OR employee_code = $1 LIMIT 1", [value]);
  return result.rows[0]?.id ?? value;
}

async function migrateCheckins() {
  const checkins = await readJson("checkins.json");

  for (const checkin of checkins) {
    const inspectorId = await resolveInspectorId(checkin.inspectorId);
    await pool.query(
      `INSERT INTO checkins (
        id, inspector_id, inspector_name, type, timestamp, latitude, longitude, accuracy_meters, phone_id, notes
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        checkin.id || randomUUID(),
        inspectorId,
        checkin.inspectorName || checkin.inspectorId,
        checkin.type,
        checkin.timestamp,
        checkin.latitude,
        checkin.longitude,
        checkin.accuracyMeters,
        checkin.phoneId,
        checkin.notes
      ]
    );
  }

  return checkins.length;
}

async function migrateTracking() {
  const points = await readJson("tracking.json");

  for (const point of points) {
    const inspectorId = await resolveInspectorId(point.inspectorId);
    await pool.query(
      `INSERT INTO tracking_points (
        id, inspector_id, timestamp, latitude, longitude, accuracy_meters, phone_id
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        point.id || randomUUID(),
        inspectorId,
        point.timestamp,
        point.latitude,
        point.longitude,
        point.accuracyMeters,
        point.phoneId
      ]
    );
  }

  return points.length;
}

try {
  await ensureSchema();
  const inspectorCount = await migrateInspectors();
  const checkinCount = await migrateCheckins();
  const trackingCount = await migrateTracking();

  console.log(`Migracion lista: ${inspectorCount} inspectores, ${checkinCount} marcas, ${trackingCount} puntos GPS.`);
} finally {
  await pool.end();
}
