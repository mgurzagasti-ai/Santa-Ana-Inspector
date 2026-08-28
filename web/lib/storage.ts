import { promises as fs } from "fs";
import path from "path";
import { Pool, type QueryResultRow } from "pg";

export type CheckinType = "entrada" | "salida";

export type Inspector = {
  id: string;
  name: string;
  employeeCode: string;
  pin: string;
  active: boolean;
};

export type Checkin = {
  id: string;
  inspectorId: string;
  inspectorName: string;
  type: CheckinType;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  phoneId?: string;
  notes?: string;
};

export type TrackingPoint = {
  id: string;
  inspectorId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  phoneId?: string;
};

const dataDir = path.join(process.cwd(), "data");
const checkinsFile = path.join(dataDir, "checkins.json");
const inspectorsFile = path.join(dataDir, "inspectors.json");
const trackingFile = path.join(dataDir, "tracking.json");
const databaseUrl = [
  process.env.PG_POSTGRES_URL,
  process.env.PG_DATABASE_URL,
  process.env.POSTGRES_URL,
  process.env.DATABASE_URL
].find(isPostgresUrl);
const hasDatabase = Boolean(databaseUrl);

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
  pgSchemaReady?: Promise<void>;
};

const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl ? { rejectUnauthorized: false } : undefined
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

async function writeJson<T>(file: string, value: T) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}

async function ensureSchema() {
  if (!hasDatabase) return;

  globalForPg.pgSchemaReady ??= pool.query(`
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
  `).then(() => undefined);

  await globalForPg.pgSchemaReady;
}

function rowToInspector(row: QueryResultRow): Inspector {
  return {
    id: row.id,
    name: row.name,
    employeeCode: row.employee_code,
    pin: row.pin,
    active: row.active
  };
}

function rowToCheckin(row: QueryResultRow): Checkin {
  return {
    id: row.id,
    inspectorId: row.inspector_id,
    inspectorName: row.inspector_name,
    type: row.type as CheckinType,
    timestamp: new Date(row.timestamp).toISOString(),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracyMeters: row.accuracy_meters === null ? undefined : Number(row.accuracy_meters),
    phoneId: row.phone_id ?? undefined,
    notes: row.notes ?? undefined
  };
}

function rowToTrackingPoint(row: QueryResultRow): TrackingPoint {
  return {
    id: row.id,
    inspectorId: row.inspector_id,
    timestamp: new Date(row.timestamp).toISOString(),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracyMeters: row.accuracy_meters === null ? undefined : Number(row.accuracy_meters),
    phoneId: row.phone_id ?? undefined
  };
}

export async function getInspectors() {
  if (hasDatabase) {
    await ensureSchema();
    const result = await pool.query("SELECT * FROM inspectors ORDER BY name ASC");
    return result.rows.map(rowToInspector);
  }

  return readJson<Inspector[]>(inspectorsFile, []);
}

export async function authenticateInspector(employeeCode: string, pin: string) {
  const inspectors = await getInspectors();
  return inspectors.find(
    (item) =>
      item.active &&
      item.employeeCode.toLowerCase() === employeeCode.trim().toLowerCase() &&
      item.pin === pin.trim()
  );
}

export async function createInspector(input: Omit<Inspector, "id"> & { id?: string }) {
  const id = input.id?.trim() || crypto.randomUUID();
  const employeeCode = input.employeeCode.trim();
  const created: Inspector = {
    id,
    name: input.name.trim(),
    employeeCode,
    pin: input.pin.trim(),
    active: input.active
  };

  if (hasDatabase) {
    await ensureSchema();
    try {
      const result = await pool.query(
        `INSERT INTO inspectors (id, name, employee_code, pin, active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [created.id, created.name, created.employeeCode, created.pin, created.active]
      );
      return rowToInspector(result.rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("INSPECTOR_EXISTS");
      }
      throw error;
    }
  }

  const inspectors = await getInspectors();
  if (inspectors.some((item) => item.id === id || item.employeeCode.toLowerCase() === employeeCode.toLowerCase())) {
    throw new Error("INSPECTOR_EXISTS");
  }

  await writeJson(inspectorsFile, [created, ...inspectors]);
  return created;
}

export async function updateInspector(id: string, input: Partial<Omit<Inspector, "id">>) {
  const employeeCode = input.employeeCode?.trim();

  if (hasDatabase) {
    await ensureSchema();
    try {
      const result = await pool.query(
        `UPDATE inspectors
         SET name = COALESCE($2, name),
             employee_code = COALESCE($3, employee_code),
             pin = COALESCE(NULLIF($4, ''), pin),
             active = COALESCE($5, active),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, input.name?.trim(), employeeCode, input.pin?.trim(), input.active]
      );

      if (result.rowCount === 0) {
        throw new Error("INSPECTOR_NOT_FOUND");
      }

      return rowToInspector(result.rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("INSPECTOR_EXISTS");
      }
      throw error;
    }
  }

  const inspectors = await getInspectors();
  const index = inspectors.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error("INSPECTOR_NOT_FOUND");
  }

  if (
    employeeCode &&
    inspectors.some((item) => item.id !== id && item.employeeCode.toLowerCase() === employeeCode.toLowerCase())
  ) {
    throw new Error("INSPECTOR_EXISTS");
  }

  const updated: Inspector = {
    ...inspectors[index],
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(employeeCode !== undefined ? { employeeCode } : {}),
    ...(input.pin !== undefined && input.pin.trim() ? { pin: input.pin.trim() } : {}),
    ...(input.active !== undefined ? { active: input.active } : {})
  };

  const next = [...inspectors];
  next[index] = updated;
  await writeJson(inspectorsFile, next);
  return updated;
}

export async function deleteInspector(id: string) {
  if (hasDatabase) {
    await ensureSchema();
    const result = await pool.query("DELETE FROM inspectors WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      throw new Error("INSPECTOR_NOT_FOUND");
    }

    return;
  }

  const inspectors = await getInspectors();
  const next = inspectors.filter((item) => item.id !== id);

  if (next.length === inspectors.length) {
    throw new Error("INSPECTOR_NOT_FOUND");
  }

  await writeJson(inspectorsFile, next);
}

export async function getCheckins() {
  if (hasDatabase) {
    await ensureSchema();
    const result = await pool.query("SELECT * FROM checkins ORDER BY timestamp DESC");
    return result.rows.map(rowToCheckin);
  }

  const checkins = await readJson<Checkin[]>(checkinsFile, []);
  return checkins.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function createCheckin(input: Omit<Checkin, "id" | "inspectorName"> & { inspectorName?: string }) {
  const inspectors = await getInspectors();
  const inspector = inspectors.find((item) => item.id === input.inspectorId || item.employeeCode === input.inspectorId);
  const created: Checkin = {
    ...input,
    id: crypto.randomUUID(),
    inspectorId: inspector?.id ?? input.inspectorId,
    inspectorName: inspector?.name ?? input.inspectorName ?? input.inspectorId
  };

  if (hasDatabase) {
    await ensureSchema();
    const result = await pool.query(
      `INSERT INTO checkins (
        id, inspector_id, inspector_name, type, timestamp, latitude, longitude, accuracy_meters, phone_id, notes
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        created.id,
        created.inspectorId,
        created.inspectorName,
        created.type,
        created.timestamp,
        created.latitude,
        created.longitude,
        created.accuracyMeters,
        created.phoneId,
        created.notes
      ]
    );
    return rowToCheckin(result.rows[0]);
  }

  const checkins = await getCheckins();
  await writeJson(checkinsFile, [created, ...checkins]);
  return created;
}

export async function getTrackingPoints() {
  if (hasDatabase) {
    await ensureSchema();
    const result = await pool.query("SELECT * FROM tracking_points ORDER BY timestamp DESC");
    return result.rows.map(rowToTrackingPoint);
  }

  const points = await readJson<TrackingPoint[]>(trackingFile, []);
  return points.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function createTrackingPoint(input: Omit<TrackingPoint, "id">) {
  const inspectors = await getInspectors();
  const inspector = inspectors.find((item) => item.id === input.inspectorId || item.employeeCode === input.inspectorId);
  const created: TrackingPoint = {
    ...input,
    id: crypto.randomUUID(),
    inspectorId: inspector?.id ?? input.inspectorId
  };

  if (hasDatabase) {
    await ensureSchema();
    const result = await pool.query(
      `INSERT INTO tracking_points (
        id, inspector_id, timestamp, latitude, longitude, accuracy_meters, phone_id
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        created.id,
        created.inspectorId,
        created.timestamp,
        created.latitude,
        created.longitude,
        created.accuracyMeters,
        created.phoneId
      ]
    );
    return rowToTrackingPoint(result.rows[0]);
  }

  const points = await getTrackingPoints();
  await writeJson(trackingFile, [created, ...points]);
  return created;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function isPostgresUrl(value?: string) {
  return Boolean(value?.startsWith("postgres://") || value?.startsWith("postgresql://"));
}
