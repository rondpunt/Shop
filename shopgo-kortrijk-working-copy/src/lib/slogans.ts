// Speelse slogans, doelpubliek vrouwen 35-50.
// Mix NL/EN, Sex&City + Friends + universele winks.
// Geen pure cultuur-quotes die je moet kennen om te begrijpen.

export type SloganState =
  | "near"        // vrije plek < 200 m
  | "mid"         // 200–600 m
  | "far"         // > 600 m
  | "none"        // niets vrij
  | "noLoc"       // GPS niet beschikbaar
  | "active";     // sessie loopt

const POOLS: Record<SloganState, string[]> = {
  near: [
    "Just around the corner, darling.",
    "Pivot! Pivot! Een plek vlakbij.",
    "Your spot is waiting. Pumps optional.",
    "Iconisch dichtbij.",
    "Couldn't be closer if it tried.",
    "Hello, gorgeous parking.",
  ],
  mid: [
    "How you doin'? Een plekje verderop.",
    "Worth the walk. Echt waar.",
    "Catwalk gegarandeerd onderweg.",
    "Stretch those legs, you fabulous thing.",
    "Een korte wandeling, een lange shopdag.",
  ],
  far: [
    "Een eindje stappen — maar gegarandeerd.",
    "Take the scenic route, schat.",
    "Coffee onderweg? Aanrader.",
  ],
  none: [
    "Even niets vrij, schat. Try again in a sec.",
    "We're on a break! Probeer zo opnieuw.",
    "Adem in, adem uit. Refresh in 30s.",
  ],
  noLoc: [
    "Tik op de locatie om vrije plekken te zien.",
    "Eerst even waar-je-bent — dan magie.",
  ],
  active: [
    "Have fun. I'll be here. ",
    "Tijd om te shoppen — ik tel mee.",
    "Go get 'em, gorgeous.",
    "Geniet. Ik hou de tijd in de gaten.",
  ],
};

/**
 * Pick a slogan deterministically per app-open + state.
 * Same slogan blijft tijdens één sessie (geen flikkering),
 * verandert bij volgende app-open of bij state-wissel.
 */
export const pickSlogan = (state: SloganState): string => {
  const pool = POOLS[state];
  if (!pool || pool.length === 0) return "";
  // Seed = day-of-year + state — varieert per dag, stabiel binnen dag.
  const now = new Date();
  const seed =
    now.getFullYear() * 1000 +
    Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000
    ) +
    state.charCodeAt(0);
  return pool[seed % pool.length];
};
