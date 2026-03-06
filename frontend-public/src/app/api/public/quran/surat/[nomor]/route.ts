import { NextResponse } from "next/server";

const EQURAN_BASE_URL = "https://equran.id/api/v2";

function parseNomor(raw: string) {
  const nomor = Number(raw);
  if (!Number.isFinite(nomor)) return null;
  if (nomor < 1 || nomor > 114) return null;
  return nomor;
}

export async function GET(_req: Request, context: { params: Promise<{ nomor: string }> }) {
  const { nomor: nomorRaw } = await context.params;
  const nomor = parseNomor(nomorRaw);

  if (!nomor) {
    return NextResponse.json({ message: "Nomor surah tidak valid" }, { status: 400 });
  }

  try {
    const response = await fetch(`${EQURAN_BASE_URL}/surat/${nomor}`, {
      method: "GET",
      headers: { accept: "application/json" },
      next: { revalidate: 60 * 60 * 6 },
    });

    if (!response.ok) {
      return NextResponse.json({ message: "Failed to fetch surah detail" }, { status: response.status });
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    const out = NextResponse.json(payload);
    out.headers.set("cache-control", "public, max-age=0, s-maxage=21600, stale-while-revalidate=21600");
    return out;
  } catch {
    return NextResponse.json({ message: "Quran service unavailable" }, { status: 502 });
  }
}
