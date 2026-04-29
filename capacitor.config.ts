import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.baurp.mastervpn",
  appName: "Master VPN",
  webDir: "dist",
  server: {
    url: "https://d673ad03-4945-403e-966c-0042466b09b3.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
};

export default config;
