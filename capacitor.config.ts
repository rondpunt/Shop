import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'be.shopgo.kortrijk',
  appName: 'Shop&Go Kortrijk',
  webDir: 'dist',
  // Hot-reload vanuit Lovable preview tijdens dev. Verwijder/comment dit blok
  // vóór je een productie-APK bouwt, anders laadt de APK altijd de preview.
  // server: {
  //   url: 'https://026b6afd-cf2f-4531-b26b-dcf88271c2e8.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  android: {
    backgroundColor: '#FAF6F0',
  },
  ios: {
    backgroundColor: '#FAF6F0',
  },
};

export default config;
