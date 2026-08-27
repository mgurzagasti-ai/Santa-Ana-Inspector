import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const source = process.env.COLECTIVOS_API_URL;

  if (!source) {
    return NextResponse.json({
      status: "pendiente",
      message: "Configurar COLECTIVOS_API_URL para consultar la API existente de colectivos.",
      query: Object.fromEntries(new URL(request.url).searchParams.entries())
    });
  }

  const url = new URL(source);
  const current = new URL(request.url);
  current.searchParams.forEach((value, key) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: process.env.COLECTIVOS_API_TOKEN
      ? { Authorization: `Bearer ${process.env.COLECTIVOS_API_TOKEN}` }
      : undefined,
    cache: "no-store"
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
