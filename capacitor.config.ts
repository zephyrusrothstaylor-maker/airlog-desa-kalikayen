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
  },
};

export default config;
