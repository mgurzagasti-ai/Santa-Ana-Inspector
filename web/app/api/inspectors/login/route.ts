import { NextResponse } from "next/server";
import { authenticateInspector } from "../../../../lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { employeeCode?: string; pin?: string };

  if (!body.employeeCode?.trim() || !body.pin?.trim()) {
    return NextResponse.json({ error: "Legajo y clave son obligatorios" }, { status: 400 });
  }

  const inspector = await authenticateInspector(body.employeeCode, body.pin);
  if (!inspector) {
    return NextResponse.json({ error: "Legajo o clave incorrectos" }, { status: 401 });
  }

  return NextResponse.json({
    inspector: {
      id: inspector.id,
      name: inspector.name,
      employeeCode: inspector.employeeCode,
      active: inspector.active
    }
  });
}
