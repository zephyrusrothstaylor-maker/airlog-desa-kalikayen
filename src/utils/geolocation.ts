import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  elevation_m: number | null;
  accuracy_m: number;
}

export function isValidIndonesianCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -11.5 &&
    lat <= 6.5 &&
    lng >= 94.5 &&
    lng <= 141.5
  );
}

async function captureNativeGpsPosition(): Promise<GeoCoordinates> {
  try {
    const permStatus = await Geolocation.checkPermissions();
    if (permStatus.location !== 'granted' && permStatus.coarseLocation !== 'granted') {
      const req = await Geolocation.requestPermissions();
      if (req.location !== 'granted' && req.coarseLocation !== 'granted') {
        throw new Error('Izin akses lokasi ditolak. Aktifkan izin GPS aplikasi di Pengaturan HP.');
      }
    }

    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    return {
      latitude: Number(pos.coords.latitude.toFixed(6)),
      longitude: Number(pos.coords.longitude.toFixed(6)),
      elevation_m: pos.coords.altitude !== null ? Number(pos.coords.altitude.toFixed(1)) : null,
      accuracy_m: Math.round(pos.coords.accuracy),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.toLowerCase().includes('denied') || message.includes('ditolak')) {
      throw new Error('Izin akses lokasi ditolak. Aktifkan izin GPS aplikasi di Pengaturan HP.');
    }
    if (message.toLowerCase().includes('timeout')) {
      throw new Error('Waktu pencarian sinyal GPS habis. Pastikan GPS aktif dan coba di area terbuka.');
    }
    throw new Error(message || 'Gagal mengambil koordinat GPS dari perangkat.');
  }
}

export async function captureCurrentGpsPosition(): Promise<GeoCoordinates> {
  if (Capacitor.isNativePlatform()) {
    return captureNativeGpsPosition();
  }

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Perangkat ini tidak mendukung fitur GPS / Geolocation.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = Number(pos.coords.latitude.toFixed(6));
        const longitude = Number(pos.coords.longitude.toFixed(6));
        const elevation_m =
          pos.coords.altitude !== null ? Number(pos.coords.altitude.toFixed(1)) : null;
        const accuracy_m = Math.round(pos.coords.accuracy);

        resolve({
          latitude,
          longitude,
          elevation_m,
          accuracy_m,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Izin akses lokasi ditolak. Mohon aktifkan izin GPS di browser HP Anda.'));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('Waktu pencarian sinyal GPS habis. Coba di area terbuka.'));
        } else {
          reject(new Error('Gagal mendapatkan titik koordinat GPS dari perangkat.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });
}