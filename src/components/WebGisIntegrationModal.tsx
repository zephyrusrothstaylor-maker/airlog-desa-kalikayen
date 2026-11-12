import { useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Globe,
  Layers,
  Smartphone,
  X,
} from 'lucide-react';

interface WebGisIntegrationModalProps {
  facilityCount: number;
  webgisUrl: string;
  onSaveWebgisUrl: (url: string) => void;
  onExportGeoJson: () => void;
  onTriggerPwaInstall: () => void;
  onClose: () => void;
}

export function WebGisIntegrationModal({
  facilityCount,
  webgisUrl,
  onSaveWebgisUrl,
  onExportGeoJson,
  onTriggerPwaInstall,
  onClose,
}: WebGisIntegrationModalProps) {
  const [activeSection, setActiveSection] = useState<'webgis' | 'mobile'>('webgis');
  const [customWebgisUrl, setCustomWebgisUrl] = useState(webgisUrl);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const appOrigin =
    typeof window !== 'undefined' && window.location.origin.startsWith('http')
      ? window.location.origin
      : 'https://si-air-kalikayen.vercel.app';

  const geojsonApiUrl = `${appOrigin}/api/geojson`;
  const deepLinkReportUrl = `${appOrigin}/?action=lapor`;

  const leafletSnippet = `// Integrasi Layer Real-Time AIRLOG ke WebGIS Leaflet (Desa Kalikayen)
fetch('${geojsonApiUrl}')
  .then((res) => res.json())
  .then((geojsonData) => {
    const airlogLayer = L.geoJSON(geojsonData, {
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 8,
          fillColor: feature.properties.warna_simbol || '#334DAF',
          color: '#091F5C',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.bindPopup(\`
          <div style="min-width:220px;font-family:sans-serif;">
            <strong style="color:#091F5C;">[\${p.kode_titik}] \${p.nama_sarana}</strong><br/>
            <small>\${p.dusun} (RT \${p.rt}/RW \${p.rw}) • \${p.jenis_sarana}</small>
            <hr style="margin:6px 0;border:0;border-top:1px solid #D0E4FE;"/>
            <div><b>Kondisi:</b> <span style="color:\${p.warna_simbol};font-weight:bold;">\${p.kondisi_fisik}</span></div>
            <div><b>Kualitas Air:</b> \${p.kualitas_air} (\${p.ketersediaan_musiman})</div>
            <div><b>KK Pemanfaat:</b> \${p.jumlah_kk_pemanfaat} KK</div>
            <div><b>Catatan:</b> \${p.catatan_kerusakan}</div>
            <div style="margin-top:8px;">
              <a href="\${p.link_lapor_airlog}" target="_blank"
                 style="display:inline-block;background:#334DAF;color:#fff;padding:5px 10px;border-radius:99px;text-decoration:none;font-size:11px;font-weight:bold;">
                Laporkan / Update Kondisi di AIRLOG
              </a>
            </div>
          </div>
        \`);
      },
    }).addTo(map);
  });`;

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // Ignore clipboard errors
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#091F5C]/65 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[32px] bg-[#F9FBFF] p-5 shadow-float sm:rounded-[32px] sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D0E4FE] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D0E4FE] text-[#091F5C]">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#091F5C]">
                Integrasi WebGIS & Deployment Mobile (AIRLOG)
              </h2>
              <p className="text-xs text-[#7096D1]">
                Portal Informasi Air Desa Kalikayen • GeoJSON, Leaflet & APK Android
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full bg-[#E8F2FE] p-2 text-[#091F5C] hover:bg-[#D0E4FE]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section Switcher Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#E8F2FE] p-1.5">
          <button
            type="button"
            onClick={() => setActiveSection('webgis')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-extrabold transition ${
              activeSection === 'webgis'
                ? 'bg-[#091F5C] text-white shadow-xs'
                : 'text-[#091F5C] hover:bg-[#D0E4FE]'
            }`}
          >
            <Globe className="h-4 w-4" />
            1. Integrasi WebGIS
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('mobile')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-extrabold transition ${
              activeSection === 'mobile'
                ? 'bg-[#091F5C] text-white shadow-xs'
                : 'text-[#091F5C] hover:bg-[#D0E4FE]'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            2. Deploy Mobile (APK & PWA)
          </button>
        </div>

        {activeSection === 'webgis' ? (
          <div className="mt-4 space-y-4 text-xs text-[#091F5C]">
            {/* 1. Export GeoJSON File for WebGIS / QGIS / GitHub Pages */}
            <div className="rounded-2xl border border-[#D0E4FE] bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="inline-block rounded-full bg-[#D0E4FE] px-2.5 py-0.5 text-[10px] font-extrabold text-[#091F5C]">
                    Standar Data Spasial WGS84 (EPSG:4326)
                  </span>
                  <h3 className="mt-1 text-sm font-extrabold text-[#091F5C]">
                    A. Unduh Layer GeoJSON untuk WebGIS & QGIS ({facilityCount} Titik)
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[#7096D1]">
                    Format <code className="font-mono font-bold text-[#334DAF]">.geojson</code> siap pakai untuk dimasukkan ke layer peta WebGIS Desa (Leaflet) maupun diolah di QGIS.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onExportGeoJson}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#334DAF] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#091F5C]"
                >
                  <FileJson className="h-4 w-4" />
                  Unduh File .GeoJSON
                </button>
              </div>
            </div>

            {/* 2. Live GeoJSON API Endpoint & Leaflet Code */}
            <div className="rounded-2xl border border-[#D0E4FE] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-[#334DAF]" />
                  <h3 className="text-sm font-extrabold text-[#091F5C]">
                    B. Endpoint API Live GeoJSON (Sinkronisasi Otomatis ke WebGIS)
                  </h3>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  CORS Enabled (*)
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#7096D1]">
                WebGIS Desa Kalikayen (walaupun di-host terpisah di GitHub Pages) dapat memanggil URL ini agar setiap laporan kerusakan baru di AIRLOG otomatis muncul secara <em>real-time</em> di peta WebGIS:
              </p>

              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#D0E4FE] bg-[#E8F2FE] px-3 py-2">
                <code className="truncate font-mono text-[11px] font-bold text-[#091F5C]">
                  {geojsonApiUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void copyText('api', geojsonApiUrl)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#334DAF] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#091F5C]"
                >
                  {copiedKey === 'api' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedKey === 'api' ? 'Tersalin' : 'Salin URL'}
                </button>
              </div>

              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#091F5C]">
                    Kode Integrasi Leaflet.js untuk Peta WebGIS Desa:
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyText('leaflet', leafletSnippet)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#E8F2FE] px-2.5 py-1 text-[11px] font-bold text-[#334DAF] hover:bg-[#D0E4FE]"
                  >
                    {copiedKey === 'leaflet' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copiedKey === 'leaflet' ? 'Kode Tersalin!' : 'Salin Kode Leaflet'}
                  </button>
                </div>
                <pre className="max-h-40 overflow-x-auto rounded-xl bg-[#091F5C] p-3 font-mono text-[10px] leading-relaxed text-[#D0E4FE]">
                  {leafletSnippet}
                </pre>
              </div>
            </div>

            {/* 3. Deep Link & Portal WebGIS URL Config */}
            <div className="rounded-2xl border border-[#D0E4FE] bg-white p-4 shadow-xs">
              <h3 className="text-sm font-extrabold text-[#091F5C]">
                C. Tautan Balik (Deep-Link) & URL Portal WebGIS Utama
              </h3>
              <p className="mt-0.5 text-[11px] text-[#7096D1]">
                Pasang tautan ini pada tombol <strong>&quot;Lapor Kerusakan Air&quot;</strong> di menu navigasi WebGIS atau QR Code Papan Informasi Desa agar langsung membuka form pelaporan AIRLOG:
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#D0E4FE] bg-[#E8F2FE] px-3 py-2">
                <code className="truncate font-mono text-[11px] font-bold text-[#091F5C]">
                  {deepLinkReportUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void copyText('deeplink', deepLinkReportUrl)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#334DAF] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#091F5C]"
                >
                  {copiedKey === 'deeplink' ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedKey === 'deeplink' ? 'Tersalin' : 'Salin Link'}
                </button>
              </div>

              <div className="mt-3 border-t border-[#E8F2FE] pt-3">
                <label className="mb-1 block text-[11px] font-bold text-[#091F5C]">
                  Tautan Portal WebGIS Desa Kalikayen (Opsional):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customWebgisUrl}
                    onChange={(e) => setCustomWebgisUrl(e.target.value)}
                    placeholder="https://username.github.io/webgis-kalikayen/"
                    className="flex-1 rounded-xl border border-[#D0E4FE] bg-[#F9FBFF] px-3 py-2 text-xs text-[#091F5C]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onSaveWebgisUrl(customWebgisUrl.trim());
                      void copyText('saved', customWebgisUrl.trim());
                    }}
                    className="rounded-xl bg-[#091F5C] px-4 py-2 text-xs font-bold text-white hover:bg-[#334DAF]"
                  >
                    {copiedKey === 'saved' ? 'Tersimpan!' : 'Simpan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-xs text-[#091F5C]">
            {/* Opsi 1: Native Android APK via Capacitor */}
            <div className="rounded-2xl border border-[#D0E4FE] bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                    Rekomendasi Sosialisasi Warga & RT/RW • Opsi A Aktif
                  </span>
                  <h3 className="mt-1 text-sm font-extrabold text-[#091F5C]">
                    Opsi A: Unduh & Install File .APK Android Native (Capacitor)
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#7096D1]">
                    Aplikasi telah dikemas menjadi <strong>Native Android (<code className="font-mono text-[#091F5C]">id.kalikayen.airlog</code>)</strong> dan siap diunduh sebagai file <strong><code className="font-mono text-[#091F5C]">AIRLOG-Desa-Kalikayen.apk</code></strong> untuk dibagikan ke Grup WhatsApp RT/RW Desa Kalikayen:
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="https://uwntlfrttdwyucmtsdpq.supabase.co/storage/v1/object/public/apk-releases/AIRLOG-Desa-Kalikayen.apk"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#091F5C] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#334DAF]"
                  >
                    <Download className="h-4 w-4 text-[#D0E4FE]" />
                    Unduh AIRLOG-Desa-Kalikayen.apk (4.3 MB)
                  </a>
                  <a
                    href="https://github.com/zephyrusrothstaylor-maker/airlog-desa-kalikayen"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#D0E4FE] bg-[#E8F2FE] px-3.5 py-2 text-xs font-bold text-[#091F5C] hover:bg-[#D0E4FE]"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-[#334DAF]" />
                    Repositori GitHub
                  </a>
                </div>
              </div>

              <div className="mt-3 space-y-2 rounded-xl bg-[#E8F2FE] p-3 font-mono text-[11px] text-[#091F5C]">
                <div>
                  <span className="font-sans font-bold text-[#334DAF]">
                    • Link Unduh Langsung .APK Cloud (Bisa Dibagikan di Grup WhatsApp Warga/Perangkat Desa):
                  </span>
                  <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5">
                    <span className="truncate text-[10px] font-bold text-[#091F5C]">
                      https://uwntlfrttdwyucmtsdpq.supabase.co/storage/v1/object/public/apk-releases/AIRLOG-Desa-Kalikayen.apk
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void copyText(
                          'apklink',
                          'https://uwntlfrttdwyucmtsdpq.supabase.co/storage/v1/object/public/apk-releases/AIRLOG-Desa-Kalikayen.apk'
                        )
                      }
                      className="shrink-0 rounded-md bg-[#334DAF] px-2 py-1 font-sans text-[10px] font-bold text-white hover:bg-[#091F5C]"
                    >
                      {copiedKey === 'apklink' ? 'Tersalin!' : 'Salin Link APK'}
                    </button>
                  </div>
                </div>
                <div className="border-t border-[#D0E4FE] pt-2">
                  <span className="font-sans font-bold text-[#334DAF]">
                    • Perintah Sinkronisasi & Build Lokal (Folder android/ sudah terpasang):
                  </span>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-[#091F5C] p-2 text-[10px] text-[#D0E4FE]">
{`npm run mobile:sync
npm run mobile:open`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Opsi 2: PWA Mobile Web Install */}
            <div className="rounded-2xl border border-[#D0E4FE] bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="inline-block rounded-full bg-[#D0E4FE] px-2.5 py-0.5 text-[10px] font-extrabold text-[#091F5C]">
                    Tanpa Download File APK • Android & iPhone
                  </span>
                  <h3 className="mt-1 text-sm font-extrabold text-[#091F5C]">
                    Opsi 2: Install Langsung dari Browser HP (PWA Mobile)
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[#7096D1]">
                    Buka link <strong>https://si-air-kalikayen.vercel.app</strong> di Google Chrome (Android) atau Safari (iPhone), lalu pasang langsung ke Layar Utama HP.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTriggerPwaInstall();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#334DAF] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#091F5C]"
                >
                  <Download className="h-4 w-4" />
                  Pasang PWA Sekarang
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-[#D0E4FE] pt-3.5">
          {customWebgisUrl ? (
            <a
              href={customWebgisUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#334DAF] hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Buka Portal WebGIS Desa Kalikayen
            </a>
          ) : (
            <span className="text-[11px] text-[#7096D1]">
              Portal Informasi Air Desa Kalikayen • Aplikasi AIRLOG
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#E8F2FE] px-5 py-2 text-xs font-bold text-[#091F5C] hover:bg-[#D0E4FE]"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
