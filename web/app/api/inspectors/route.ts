import { NextResponse } from "next/server";
import { getInspectors } from "../../../lib/storage";

export async function GET() {
  const inspectors = await getInspectors();
  return NextResponse.json({ inspectors: inspectors.map(({ pin, ...inspector }) => inspector) });
}
