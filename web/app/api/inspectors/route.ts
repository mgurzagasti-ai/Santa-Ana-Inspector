import { NextResponse } from "next/server";
import type { Inspector } from "../../../lib/storage";
import { createInspector, deleteInspector, getInspectors, updateInspector } from "../../../lib/storage";

export const runtime = "nodejs";

function publicInspector(inspector: Inspector) {
  return {
    id: inspector.id,
    name: inspector.name,
    employeeCode: inspector.employeeCode,
    active: inspector.active
  };
}

export async function GET() {
  const inspectors = await getInspectors();
  return NextResponse.json({ inspectors: inspectors.map(publicInspector) });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      employeeCode?: string;
      pin?: string;
      active?: boolean;
    };

    if (!body.name?.trim() || !body.employeeCode?.trim() || !body.pin?.trim()) {
      return NextResponse.json({ error: "Nombre, legajo y clave son obligatorios" }, { status: 400 });
    }

    const inspector = await createInspector({
      name: body.name,
      employeeCode: body.employeeCode,
      pin: body.pin,
      active: body.active ?? true
    });
    return NextResponse.json({ inspector: publicInspector(inspector) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INSPECTOR_EXISTS") {
      return NextResponse.json({ error: "Ya existe un inspector con ese legajo" }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo crear el inspector" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      employeeCode?: string;
      pin?: string;
      active?: boolean;
    };

    if (!body.id?.trim() || !body.name?.trim() || !body.employeeCode?.trim()) {
      return NextResponse.json({ error: "Inspector, nombre y legajo son obligatorios" }, { status: 400 });
    }

    const inspector = await updateInspector(body.id, {
      name: body.name,
      employeeCode: body.employeeCode,
      pin: body.pin,
      active: body.active ?? true
    });
    return NextResponse.json({ inspector: publicInspector(inspector) });
  } catch (error) {
    if (error instanceof Error && error.message === "INSPECTOR_EXISTS") {
      return NextResponse.json({ error: "Ya existe un inspector con ese legajo" }, { status: 409 });
    }

    if (error instanceof Error && error.message === "INSPECTOR_NOT_FOUND") {
      return NextResponse.json({ error: "Inspector no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ error: "No se pudo actualizar el inspector" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Inspector requerido" }, { status: 400 });
    }

    await deleteInspector(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INSPECTOR_NOT_FOUND") {
      return NextResponse.json({ error: "Inspector no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ error: "No se pudo eliminar el inspector" }, { status: 500 });
  }
}
