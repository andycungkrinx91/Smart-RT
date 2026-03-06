import { NextResponse } from "next/server";

const HADITH_API_BASE_URL = "https://hadeethenc.com/api/v1";

export const dynamic = "force-static";

export async function GET() {
  try {
    const response = await fetch(`${HADITH_API_BASE_URL}/categories/list/?language=id`, {
      method: "GET",
      headers: { accept: "application/json" },
      next: { revalidate: 86400 }, // 24 hours
    });

    if (!response.ok) {
      return NextResponse.json({ message: "Gagal mengambil daftar kategori" }, { status: response.status });
    }

    const data = await response.json();
    
    // API returns array directly, wrap in data object for consistency
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ message: "Layanan Hadist tidak tersedia" }, { status: 502 });
  }
}
