// Curated Shop & Go locations in Kortrijk. This list is maintained by hand
// and is NOT exhaustive — every entry carries a verification level so the UI
// can be honest about the source.

export type Verification = "official" | "manual" | "unverified";

export type ShopGoSpot = {
  id: string;
  name: string;
  street: string;
  lat: number;
  lng: number;
  bays: number; // approximate
  verification: Verification;
  sourceNote?: string;
};

export const VERIFICATION_LABEL: Record<Verification, string> = {
  official: "Officiële bron bevestigd",
  manual: "Handmatig toegevoegd",
  unverified: "Niet geverifieerd",
};

export const SHOPGO_SPOTS: ShopGoSpot[] = [
  { id: "grote-markt", name: "Grote Markt", street: "Grote Markt", lat: 50.8275, lng: 3.2647, bays: 8, verification: "manual" },
  { id: "leiestraat", name: "Leiestraat", street: "Leiestraat", lat: 50.8268, lng: 3.2632, bays: 6, verification: "manual" },
  { id: "korte-steenstraat", name: "Korte Steenstraat", street: "Korte Steenstraat", lat: 50.8262, lng: 3.2638, bays: 4, verification: "manual" },
  { id: "lange-steenstraat", name: "Lange Steenstraat", street: "Lange Steenstraat", lat: 50.8255, lng: 3.2630, bays: 5, verification: "manual" },
  { id: "doorniksestraat", name: "Doorniksestraat", street: "Doorniksestraat", lat: 50.8240, lng: 3.2660, bays: 7, verification: "manual" },
  { id: "doorniksewijk", name: "Doorniksewijk", street: "Doorniksewijk", lat: 50.8215, lng: 3.2685, bays: 6, verification: "manual" },
  { id: "rijselsestraat", name: "Rijselsestraat", street: "Rijselsestraat", lat: 50.8248, lng: 3.2608, bays: 5, verification: "manual" },
  { id: "budastraat", name: "Budastraat", street: "Budastraat", lat: 50.8290, lng: 3.2635, bays: 4, verification: "unverified" },
  { id: "voorstraat", name: "Voorstraat", street: "Voorstraat", lat: 50.8285, lng: 3.2670, bays: 4, verification: "unverified" },
  { id: "graanmarkt", name: "Graanmarkt", street: "Graanmarkt", lat: 50.8278, lng: 3.2660, bays: 6, verification: "manual" },
  { id: "vlasmarkt", name: "Vlasmarkt", street: "Vlasmarkt", lat: 50.8272, lng: 3.2655, bays: 5, verification: "manual" },
  { id: "houtmarkt", name: "Houtmarkt", street: "Houtmarkt", lat: 50.8258, lng: 3.2655, bays: 5, verification: "manual" },
  { id: "sint-maartenskerkhof", name: "Sint-Maartenskerkhof", street: "Sint-Maartenskerkhof", lat: 50.8270, lng: 3.2670, bays: 3, verification: "unverified" },
  { id: "schouwburgplein", name: "Schouwburgplein", street: "Schouwburgplein", lat: 50.8252, lng: 3.2670, bays: 4, verification: "manual" },
  { id: "veemarkt", name: "Veemarkt", street: "Veemarkt", lat: 50.8298, lng: 3.2650, bays: 6, verification: "manual" },
  { id: "overbekeplein", name: "Overbekeplein", street: "Overbekeplein", lat: 50.8235, lng: 3.2690, bays: 4, verification: "unverified" },
  { id: "wandelingstraat", name: "Wandelingstraat", street: "Wandelingstraat", lat: 50.8225, lng: 3.2645, bays: 4, verification: "unverified" },
  { id: "noordstraat", name: "Noordstraat", street: "Noordstraat", lat: 50.8265, lng: 3.2615, bays: 5, verification: "manual" },
  { id: "zwevegemsestraat", name: "Zwevegemsestraat", street: "Zwevegemsestraat", lat: 50.8285, lng: 3.2705, bays: 5, verification: "unverified" },
  { id: "burgemeester-reynaertstraat", name: "Reynaertstraat", street: "Burgemeester Reynaertstraat", lat: 50.8295, lng: 3.2680, bays: 4, verification: "unverified" },
  { id: "groeningestraat", name: "Groeningestraat", street: "Groeningestraat", lat: 50.8232, lng: 3.2670, bays: 4, verification: "manual" },
  { id: "magdalenastraat", name: "Magdalenastraat", street: "Magdalenastraat", lat: 50.8268, lng: 3.2685, bays: 3, verification: "unverified" },
  { id: "sint-jansstraat", name: "Sint-Jansstraat", street: "Sint-Jansstraat", lat: 50.8262, lng: 3.2622, bays: 3, verification: "unverified" },
  { id: "onze-lieve-vrouwestraat", name: "O.L.V.-straat", street: "Onze-Lieve-Vrouwestraat", lat: 50.8285, lng: 3.2645, bays: 4, verification: "manual" },
  { id: "lekkerbeetstraat", name: "Lekkerbeetstraat", street: "Lekkerbeetstraat", lat: 50.8280, lng: 3.2625, bays: 3, verification: "unverified" },
  { id: "sint-amandsplein", name: "Sint-Amandsplein", street: "Sint-Amandsplein", lat: 50.8278, lng: 3.2680, bays: 4, verification: "manual" },
];

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
