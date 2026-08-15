export type PredictionLevel = "high" | "medium" | "low";

/**
 * Predicts availability based on zone name and hour of the day.
 * Acts as a synthesized mock for historical data.
 */
export function getPredictiveAvailability(zoneName: string, totalBays: number, hourOfDay: number): PredictionLevel {
  const isShopping = /straat|markt|plein|laan/i.test(zoneName);
  let score = 100;
  
  if (isShopping) {
    if (hourOfDay >= 10 && hourOfDay <= 16) score -= 60; // Shopping peak
    else if (hourOfDay >= 17 && hourOfDay <= 21) score -= 20;
    else score += 20;
  } else {
    // Residential / Mixed
    if (hourOfDay >= 18 || hourOfDay <= 8) score -= 50; // Evening parking
    else score += 10;
  }
  
  // Add capacity influence
  if (totalBays > 10) score += 15;
  else if (totalBays < 5) score -= 15;
  
  // Deterministic noise based on name
  let hash = 0;
  for (let i = 0; i < zoneName.length; i++) {
    hash = ((hash << 5) - hash) + zoneName.charCodeAt(i);
    hash |= 0;
  }
  const noise = (Math.abs(hash) % 30) - 15;
  const finalScore = score + noise;
  
  if (finalScore >= 75) return "high";
  if (finalScore >= 45) return "medium";
  return "low";
}

export function getPredictionLabel(level: PredictionLevel): string {
  switch (level) {
    case "high": return "Grote kans";
    case "medium": return "Matige kans";
    case "low": return "Kleine kans";
  }
}
