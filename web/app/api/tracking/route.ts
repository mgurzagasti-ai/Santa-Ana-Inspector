import { NextResponse } from "next/server";
import { createTrackingPoint, getTrackingPoints } from "../../../lib/storage";

export const runtime = "nodejs";

export async function GET() {
  const tracking = await getTrackingPoints();
  return NextResponse.json({ tracking });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.inspectorId || typeof body.latitude !== "number" || typeof body.longitude !== "number") {
    return NextResponse.json(
      { error: "inspectorId, latitude y longitude son obligatorios" },
      { status: 400 }
    );
  }

  const point = await createTrackingPoint({
    inspectorId: String(body.inspectorId),
    timestamp: body.timestamp ? String(body.timestamp) : new Date().toISOString(),
    latitude: body.latitude,
    longitude: body.longitude,
    accuracyMeters: body.accuracyMeters,
    phoneId: body.phoneId ? String(body.phoneId) : undefined
  });

  return NextResponse.json({ point }, { status: 201 });
}
