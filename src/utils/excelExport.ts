import {
  FACILITY_CATEGORY_LABELS,
  PHYSICAL_CONDITION_LABELS,
  SEASONAL_AVAILABILITY_LABELS,
  WATER_CLARITY_LABELS,
  type Dusun,
  type WaterFacility,
} from '../types/inventory';

export async function exportInventoryToExcel(
  facilities: WaterFacility[],
  dusunList: Dusun[],
  villageName = 'Desa'
): Promise<void> {
  const XLSX = await import('xlsx');

  const summaryRows = dusunList.map((dusun, index) => {
    const items = facilities.filter((f) => f.dusun_id === dusun.id);
    const baik = items.filter((f) => f.condition === 'berfungsi_baik').length;
    const rusakRingan = items.filter((f) => f.condition === 'rusak_ringan').length;
    const rusakBerat = items.filter((f) => f.condition === 'rusak_berat').length;
    const kering = items.filter((f) => f.condition === 'kering').length;
    const kkTerlayani = items.reduce((sum, f) => sum + (f.beneficiary_kk || 0), 0);

    return {
      No: index + 1,
      'Kode Dusun': dusun.code,
      'Nama Dusun': dusun.name,
      'Kepala Dusun (Kasun)': dusun.head_name ?? '-',
      'Kontak Kasun': dusun.head_phone ?? '-',
      'Total KK Dusun': dusun.total_kk,
      'Jumlah Titik Air': items.length,
      'Berfungsi Baik': baik,
      'Rusak Ringan': rusakRingan,
      'Rusak Berat': rusakBerat,
      'Kering Musiman': kering,
      'Estimasi KK Pemanfaat': kkTerlayani,
    };
  });

  const detailRows = facilities.map((item, index) => ({
    No: index + 1,
    'Kode Titik': item.code,
    'Nama Fasilitas / Sumber Air': item.name,
    Dusun: item.dusun_name ?? '-',
    RT: item.rt ?? '-',
    RW: item.rw ?? '-',
    'Jenis Fasilitas': FACILITY_CATEGORY_LABELS[item.category],
    'Kondisi Fisik': PHYSICAL_CONDITION_LABELS[item.condition],
    'Kualitas Air': WATER_CLARITY_LABELS[item.water_clarity],
    'Ketersediaan Musiman': SEASONAL_AVAILABILITY_LABELS[item.seasonal_availability],
    'Catatan Kondisi / Kerusakan': item.condition_notes ?? '-',
    'KK Pemanfaat': item.beneficiary_kk,
    Latitude: item.latitude,
    Longitude: item.longitude,
    'Elevasi (mdpl)': item.elevation_m ?? '-',
    'Tahun Dibangun': item.built_year ?? '-',
    'Sumber Dana': item.funding_source ?? '-',
    'Penanggung Jawab / Pengelola': item.manager_name ?? '-',
    'No. HP Pengelola': item.manager_phone ?? '-',
    'Patokan Lokasi': item.address_detail ?? '-',
    'Pemeriksa Terakhir': item.last_inspected_by,
    'Tanggal Periksa': new Date(item.last_inspected_at).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  }));

  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 15 },
    { wch: 16 },
    { wch: 15 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Rekapitulasi Dusun');

  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  detailSheet['!cols'] = [
    { wch: 5 },
    { wch: 16 },
    { wch: 32 },
    { wch: 20 },
    { wch: 6 },
    { wch: 6 },
    { wch: 26 },
    { wch: 16 },
    { wch: 15 },
    { wch: 20 },
    { wch: 42 },
    { wch: 14 },
    { wch: 13 },
    { wch: 13 },
    { wch: 14 },
    { wch: 15 },
    { wch: 22 },
    { wch: 26 },
    { wch: 16 },
    { wch: 35 },
    { wch: 22 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Daftar Titik Air');

  const dateStamp = new Date().toISOString().slice(0, 10);
  const safeVillage = villageName.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `Inventaris_Air_${safeVillage}_${dateStamp}.xlsx`);
}
