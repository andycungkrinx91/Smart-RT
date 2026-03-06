export type AudioMap = Record<string, string>

export type SurahSummary = {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
  tempatTurun: string
  arti: string
  deskripsi: string
  audioFull: AudioMap
}

export type AyahItem = {
  nomorAyat: number
  teksArab: string
  teksLatin: string
  teksIndonesia: string
  audio: AudioMap
}

export type RelatedSurah = {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
}

export type SurahDetail = SurahSummary & {
  ayat: AyahItem[]
  suratSelanjutnya: RelatedSurah | null
  suratSebelumnya: RelatedSurah | null
}

export type TafsirItem = {
  ayat: number
  teks: string
}
