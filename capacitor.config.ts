/**
 * Konfigurasi Capacitor Android Mobile untuk AIRLOG Desa Kalikayen (Klaster K4)
 * Digunakan untuk membungkus aplikasi web Vite + React menjadi aplikasi Native Android (.apk).
 *
 * Cara membuat proyek Android & APK:
 *   npm run mobile:setup
 *   npm run mobile:sync
 *   npm run mobile:open
 */
const config = {
  appId: 'id.kalikayen.airlog',
  appName: 'AIRLOG Kalikayen',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Geolocation: {
      permissions: ['location'],
    },
    SystemBars: {
      style: 'DARK',
    },
  },
};

export default config;
