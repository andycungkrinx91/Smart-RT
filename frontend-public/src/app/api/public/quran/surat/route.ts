import { NextResponse } from "next/server";

const EQURAN_BASE_URL = "https://equran.id/api/v2";

export async function GET() {
  try {
    const response = await fetch(`${EQURAN_BASE_URL}/surat`, {
      method: "GET",
      headers: { accept: "application/json" },
      next: { revalidate: 60 * 60 * 12 },
    });

    if (!response.ok) {
      return NextResponse.json({ message: "Failed to fetch surah list" }, { status: response.status });
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    const out = NextResponse.json(payload);
    out.headers.set("cache-control", "public, max-age=0, s-maxage=43200, stale-while-revalidate=43200");
    return out;
  } catch {
    return NextResponse.json({ message: "Quran service unavailable" }, { status: 502 });
  }
}
