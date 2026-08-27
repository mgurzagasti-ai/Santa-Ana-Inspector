import { promises as fs } from "fs";
import path from "path";

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

const dataDir = path.join(process.cwd(), "data");
const checkinsFile = path.join(dataDir, "checkins.json");
const inspectorsFile = path.join(dataDir, "inspectors.json");

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

export async function getInspectors() {
  return readJson<Inspector[]>(inspectorsFile, []);
}

export async function getCheckins() {
  const checkins = await readJson<Checkin[]>(checkinsFile, []);
  return checkins.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function createCheckin(input: Omit<Checkin, "id" | "inspectorName"> & { inspectorName?: string }) {
  const inspectors = await getInspectors();
  const inspector = inspectors.find((item) => item.id === input.inspectorId || item.employeeCode === input.inspectorId);
  const checkins = await getCheckins();
  const created: Checkin = {
    ...input,
    id: crypto.randomUUID(),
    inspectorId: inspector?.id ?? input.inspectorId,
    inspectorName: inspector?.name ?? input.inspectorName ?? input.inspectorId
  };
  await writeJson(checkinsFile, [created, ...checkins]);
  return created;
}
