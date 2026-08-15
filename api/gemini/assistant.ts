import { GoogleGenAI, Type } from "@google/genai";

const spots = [
  ["grote-markt", "Grote Markt"], ["leiestraat", "Leiestraat"], ["korte-steenstraat", "Korte Steenstraat"],
  ["lange-steenstraat", "Lange Steenstraat"], ["doorniksestraat", "Doorniksestraat"], ["doorniksewijk", "Doorniksewijk"],
  ["rijselsestraat", "Rijselsestraat"], ["graanmarkt", "Graanmarkt"], ["vlasmarkt", "Vlasmarkt"],
  ["houtmarkt", "Houtmarkt"], ["schouwburgplein", "Schouwburgplein"], ["veemarkt", "Veemarkt"],
  ["noordstraat", "Noordstraat"], ["groeningestraat", "Groeningestraat"], ["olv-straat", "Onze-Lieve-Vrouwestraat"],
  ["sint-amandsplein", "Sint-Amandsplein"],
].map(([id, name]) => ({ id, name }));

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: "GEMINI_API_KEY is niet ingesteld" });
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { mode = "chat", text = "", history = [] } = body;

    if (mode === "parse") {
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
        contents: `Gebruiker: ${String(text)}`,
        config: {
          systemInstruction: `Je bent de parkeerparser voor Shop&Go Kortrijk. Match alleen tegen deze locaties: ${JSON.stringify(spots)}. Geef nooit verzonnen realtime beschikbaarheid. Extract straat, zone-id, auto-omschrijving en nummerplaat indien genoemd. Antwoord in helder Belgisch Nederlands.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchedStreet: { type: Type.STRING, nullable: true },
              matchedZoneId: { type: Type.STRING, nullable: true },
              matchedCarDescription: { type: Type.STRING, nullable: true },
              matchedPlate: { type: Type.STRING, nullable: true },
              explanation: { type: Type.STRING },
            },
            required: ["explanation"],
          },
        },
      });
      return res.status(200).json({ success: true, data: JSON.parse(response.text || "{}") });
    }

    const contents = Array.isArray(history)
      ? history.slice(-12).map((h: any) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: String(h.content || "") }] }))
      : [];
    contents.push({ role: "user", parts: [{ text: String(text) }] });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: `Je bent de beknopte AI-parkeerassistent van Shop&Go Kortrijk. Antwoord in Belgisch Nederlands. Leg uit dat Shop&Go maximaal 30 minuten gratis is tijdens de geldende uren en dat officiële borden/regels ter plaatse altijd voorrang hebben. Gebruik nooit verzonnen live parkeerdata; de app toont officiële Parko-sensordata apart. Houd antwoorden mobiel en praktisch.`,
      },
    });
    return res.status(200).json({ success: true, text: response.text || "" });
  } catch (error: any) {
    console.error("Gemini function failed", error);
    return res.status(500).json({ success: false, error: error?.message || "AI tijdelijk niet beschikbaar" });
  }
}
