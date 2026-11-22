import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { isShareCancelledError } from './fileSave';
import {
  FACILITY_CATEGORY_LABELS,
  PHYSICAL_CONDITION_LABELS,
  WATER_CLARITY_LABELS,
  type Dusun,
  type WaterFacility,
} from '../types/inventory';

/**
 * Menormalkan nomor telepon Indonesia (08..., +62..., 62...) menjadi format wa.me yang valid.
 */
export function formatIndonesiaPhoneForWa(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

/**
 * Membentuk tautan WhatsApp (https://wa.me/...) yang aman untuk nomor HP pengelola atau Kadus.
 */
export function buildWhatsappChatUrl(
  rawPhone: string | null | undefined,
  prefillText?: string
): string | null {
  const normalized = formatIndonesiaPhoneForWa(rawPhone);
  if (!normalized) return null;
  const base = `https://wa.me/${normalized}`;
  return prefillText ? `${base}?text=${encodeURIComponent(prefillText)}` : base;
}

/**
 * Membentuk URL Google Maps ke koordinat titik sumber air untuk navigasi lapangan.
 */
export function buildGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/**
 * Menyusun ringkasan laporan satu titik fasilitas air agar siap dikirim ke Grup WA Desa.
 */
export function buildFacilityReportText(facility: WaterFacility): string {
  const mapsUrl = buildGoogleMapsUrl(facility.latitude, facility.longitude);
  const notes = facility.condition_notes?.trim() || '-';
  return [
    '*LAPORAN KONDISI SARANA AIR - AIRLOG DESA KALIKAYEN*',
    `• Titik Air: [${facility.code}] ${facility.name}`,
    `• Wilayah: ${facility.dusun_name ?? 'Desa Kalikayen'} (RT ${facility.rt ?? '-'} / RW ${facility.rw ?? '-'})`,
    `• Jenis: ${FACILITY_CATEGORY_LABELS[facility.category]}`,
    `• Kondisi: ${PHYSICAL_CONDITION_LABELS[facility.condition]} (${WATER_CLARITY_LABELS[facility.water_clarity]})`,
    `• Penerima Manfaat: ${facility.beneficiary_kk} KK`,
    `• Catatan: ${notes}`,
    `• Pemeriksa: ${facility.last_inspected_by}`,
    `• Lokasi Peta: ${mapsUrl}`,
  ].join('\n');
}

/**
 * Menyusun ringkasan kondisi seluruh sarana air Desa Kalikayen per wilayah dusun untuk laporan WA.
 */
export function buildVillageRecapText(facilities: WaterFacility[], dusunList: Dusun[]): string {
  const baik = facilities.filter((f) => f.condition === 'berfungsi_baik').length;
  const ringan = facilities.filter((f) => f.condition === 'rusak_ringan').length;
  const berat = facilities.filter((f) => f.condition === 'rusak_berat').length;
  const kering = facilities.filter((f) => f.condition === 'kering').length;
  const totalKk = facilities.reduce((sum, f) => sum + (f.beneficiary_kk || 0), 0);

  const dusunLines = dusunList.map((d) => {
    const items = facilities.filter((f) => f.dusun_id === d.id);
    const bermasalah = items.filter((f) => f.condition !== 'berfungsi_baik').length;
    return `- ${d.name}: ${items.length} titik (${bermasalah} perlu perhatian)`;
  });

  return [
    '*REKAP SARANA AIR BERSIH DESA KALIKAYEN (AIRLOG)*',
    `Total Titik Terdata: ${facilities.length} lokasi (${totalKk} KK terdampak/terlayani)`,
    `• Berfungsi Baik: ${baik}`,
    `• Rusak Ringan: ${ringan}`,
    `• Rusak Berat: ${berat}`,
    `• Kering Musiman: ${kering}`,
    '',
    '*Rincian Per Dusun:*',
    ...dusunLines,
  ].join('\n');
}

/**
 * Membagikan teks laporan menggunakan native Share sheet Android atau menyalin ke clipboard di web.
 */
export async function shareTextReport(
  title: string,
  text: string
): Promise<'shared' | 'copied' | 'cancelled'> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title,
        text,
        dialogTitle: title,
      });
      return 'shared';
    } catch (err) {
      if (isShareCancelledError(err)) {
        return 'cancelled';
      }
      throw err;
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch {
      // Lanjutkan ke penyalinan clipboard jika dialog dibatalkan atau ditolak browser
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return 'copied';
  }

  throw new Error('Perangkat tidak mendukung fitur berbagi atau salin teks.');
}
