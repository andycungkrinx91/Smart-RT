import { NextResponse } from "next/server";

const HADITH_API_BASE_URL = "https://hadeethenc.com/api/v1";

export async function GET() {
  try {
    const response = await fetch(`${HADITH_API_BASE_URL}/categories/roots/?language=id`, {
      method: "GET",
      headers: { accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      return NextResponse.json({ message: "Gagal mengambil kategori utama" }, { status: response.status });
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ message: "Layanan Hadist tidak tersedia" }, { status: 502 });
  }
}
