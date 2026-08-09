export type DeviceId = "ios" | "android" | "windows" | "macos" | "linux" | "android-tv";
export type ConnectionAppId = "happ" | "incy";

export type DownloadOption = {
  label: string;
  url: string;
  note?: string;
};

export type DeviceOption = {
  id: DeviceId;
  name: string;
  shortName: string;
  icon: string;
  hint: string;
  recommendedApp: ConnectionAppId;
};

export type ConnectionApp = {
  id: ConnectionAppId;
  name: string;
  mark: string;
  description: string;
  officialUrl: string;
  docsUrl?: string;
  downloads: Record<DeviceId, DownloadOption[]>;
};

export const DEVICE_OPTIONS: DeviceOption[] = [
  { id: "ios", name: "iPhone / iPad", shortName: "iOS / iPadOS", icon: "◉", hint: "App Store", recommendedApp: "happ" },
  { id: "android", name: "Android", shortName: "Android", icon: "◆", hint: "Google Play или APK", recommendedApp: "happ" },
  { id: "windows", name: "Windows", shortName: "Windows", icon: "▦", hint: "Установщик для x64", recommendedApp: "incy" },
  { id: "macos", name: "macOS", shortName: "macOS", icon: "●", hint: "App Store или DMG", recommendedApp: "happ" },
  { id: "linux", name: "Linux", shortName: "Linux", icon: "⌘", hint: "DEB, RPM или Arch", recommendedApp: "incy" },
  { id: "android-tv", name: "Android TV", shortName: "Android TV", icon: "▰", hint: "Google Play для ТВ", recommendedApp: "happ" },
];

export const CONNECTION_APPS: Record<ConnectionAppId, ConnectionApp> = {
  happ: {
    id: "happ",
    name: "Happ",
    mark: "H",
    description: "Универсальный клиент с простым импортом подписки и поддержкой мобильных и настольных платформ.",
    officialUrl: "https://www.happ.su/main",
    downloads: {
      ios: [
        { label: "Скачать в App Store", url: "https://apps.apple.com/us/app/happ-proxy-utility/id6504287215", note: "iPhone и iPad" },
        { label: "TestFlight для РФ", url: "https://testflight.apple.com/join/1bKEcMub", note: "Официальная тестовая сборка" },
      ],
      android: [
        { label: "Скачать в Google Play", url: "https://play.google.com/store/apps/details?id=com.happproxy" },
        { label: "Скачать APK", url: "https://github.com/Happ-proxy/happ-android/releases/latest/download/Happ.apk", note: "Официальный GitHub" },
      ],
      windows: [
        { label: "Скачать для Windows", url: "https://github.com/Happ-proxy/happ-desktop/releases/latest/download/setup-Happ.x64.exe", note: "Windows x64" },
      ],
      macos: [
        { label: "Скачать в App Store", url: "https://apps.apple.com/us/app/happ-proxy-utility/id6504287215" },
        { label: "Скачать DMG", url: "https://github.com/Happ-proxy/happ-desktop/releases/latest/download/Happ.macOS.universal.dmg", note: "Universal" },
      ],
      linux: [
        { label: "Скачать DEB", url: "https://github.com/Happ-proxy/happ-desktop/releases/latest/download/Happ.linux.x64.deb" },
        { label: "Скачать RPM", url: "https://github.com/Happ-proxy/happ-desktop/releases/latest/download/Happ.linux.x64.rpm" },
        { label: "Скачать для Arch", url: "https://github.com/Happ-proxy/happ-desktop/releases/latest/download/Happ.linux.x64.pkg.tar.zst" },
      ],
      "android-tv": [
        { label: "Открыть Google Play", url: "https://play.google.com/store/apps/details?id=com.happproxy", note: "Android TV" },
        { label: "Скачать APK", url: "https://github.com/Happ-proxy/happ-android/releases/latest/download/Happ.apk" },
      ],
    },
  },
  incy: {
    id: "incy",
    name: "INCY",
    mark: "I",
    description: "Современный клиент с официальными сборками для телефонов, компьютеров и телевизоров.",
    officialUrl: "https://incy.cc/",
    docsUrl: "https://docs.incy.cc/",
    downloads: {
      ios: [
        { label: "Скачать в App Store", url: "https://apps.apple.com/us/app/incy/id6756943388", note: "iPhone и iPad" },
      ],
      android: [
        { label: "Скачать в Google Play", url: "https://play.google.com/store/apps/details?id=llc.itdev.incy&hl=ru" },
        { label: "Скачать APK", url: "https://github.com/INCY-DEV/incy-platforms/releases/latest/download/Incy.apk", note: "Официальный GitHub" },
      ],
      windows: [
        { label: "Скачать установщик", url: "https://github.com/INCY-DEV/incy-platforms/releases/latest/download/incy-windows-setup.exe", note: "Windows x64" },
        { label: "Portable-версия", url: "https://github.com/INCY-DEV/incy-platforms/releases/latest/download/incy-windows-portable.zip" },
      ],
      macos: [
        { label: "Скачать в App Store", url: "https://apps.apple.com/us/app/incy/id6756943388" },
        { label: "DMG для Apple Silicon", url: "https://github.com/INCY-DEV/incy-platforms/releases/latest/download/incy-macos-arm64.dmg" },
        { label: "DMG для Intel", url: "https://github.com/INCY-DEV/incy-platforms/releases/latest/download/incy-macos-intel.dmg" },
      ],
      linux: [
        { label: "Скачать DEB", url: "https://github.com/INCY-DEV/incy-platforms/releases/latest/download/incy-linux-x64.deb", note: "Linux x64" },
        { label: "Скачать RPM", url: "https://github.com/INCY-DEV/incy-platforms/releases/latest/download/incy-linux-x64.rpm" },
        { label: "Скачать для Arch", url: "https://github.com/INCY-DEV/incy-platforms/releases/latest/download/incy-linux-x64.pkg.tar.zst" },
        { label: "DEB для ARM64", url: "https://github.com/INCY-DEV/incy-platforms/releases/latest/download/incy-linux-arm64.deb" },
      ],
      "android-tv": [
        { label: "Открыть Google Play", url: "https://play.google.com/store/apps/details?id=llc.itdev.incy&hl=ru", note: "Android TV" },
        { label: "Скачать APK", url: "https://github.com/INCY-DEV/incy-platforms/releases/latest/download/Incy.apk" },
      ],
    },
  },
};

export function getDevice(deviceId: DeviceId) {
  return DEVICE_OPTIONS.find((device) => device.id === deviceId) ?? DEVICE_OPTIONS[0];
}
