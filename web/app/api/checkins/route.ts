import { NextResponse } from "next/server";
import { createCheckin, getCheckins } from "../../../lib/storage";

export async function GET() {
  const checkins = await getCheckins();
  return NextResponse.json({ checkins });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.inspectorId || !body.type || typeof body.latitude !== "number" || typeof body.longitude !== "number") {
    return NextResponse.json(
      { error: "inspectorId, type, latitude y longitude son obligatorios" },
      { status: 400 }
    );
  }

  if (body.type !== "entrada" && body.type !== "salida") {
    return NextResponse.json({ error: "type debe ser entrada o salida" }, { status: 400 });
  }

  const checkin = await createCheckin({
    inspectorId: String(body.inspectorId),
    type: body.type,
    timestamp: body.timestamp ? String(body.timestamp) : new Date().toISOString(),
    latitude: body.latitude,
    longitude: body.longitude,
    accuracyMeters: body.accuracyMeters,
    phoneId: body.phoneId ? String(body.phoneId) : undefined,
    notes: body.notes ? String(body.notes) : undefined
  });

  return NextResponse.json({ checkin }, { status: 201 });
}
