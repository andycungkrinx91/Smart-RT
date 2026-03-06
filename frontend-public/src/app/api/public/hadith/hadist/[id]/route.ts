import { NextResponse } from "next/server";

const HADITH_API_BASE_URL = "https://hadeethenc.com/api/v1";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const response = await fetch(`${HADITH_API_BASE_URL}/hadeeths/one/?language=id&id=${id}`, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ message: "Gagal mengambil detail hadist" }, { status: response.status });
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ message: "Layanan Hadist tidak tersedia" }, { status: 502 });
  }
}
