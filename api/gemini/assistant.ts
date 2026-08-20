import { GoogleGenAI, Type } from "@google/genai";
import { fail, readJsonBody, requireUser } from "../_shared.js";

const spots = [
  ["grote-markt", "Grote Markt"], ["leiestraat", "Leiestraat"], ["korte-steenstraat", "Korte Steenstraat"],
  ["lange-steenstraat", "Lange Steenstraat"], ["doorniksestraat", "Doorniksestraat"], ["doorniksewijk", "Doorniksewijk"],
  ["rijselsestraat", "Rijselsestraat"], ["graanmarkt", "Graanmarkt"], ["vlasmarkt", "Vlasmarkt"],
  ["houtmarkt", "Houtmarkt"], ["schouwburgplein", "Schouwburgplein"], ["veemarkt", "Veemarkt"],
  ["noordstraat", "Noordstraat"], ["groeningestraat", "Groeningestraat"], ["olv-straat", "Onze-Lieve-Vrouwestraat"],
  ["sint-amandsplein", "Sint-Amandsplein"],
].map(([id, name]) => ({ id, name }));

const cleanText = (value: unknown, max = 1200) => String(value ?? "").trim().slice(0, max);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await requireUser(req);
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw Object.assign(new Error("AI is tijdelijk niet beschikbaar"), { statusCode: 503 });

    const body = await readJsonBody(req);
    const mode = body?.mode === "parse" ? "parse" : "chat";
    const text = cleanText(body?.text);
    if (!text) return res.status(400).json({ error: "Vraag ontbreekt" });

    const ai = new GoogleGenAI({ apiKey: key });

    if (mode === "parse") {
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
        contents: `Gebruiker: ${text}`,
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
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ success: true, data: JSON.parse(response.text || "{}") });
    }

    const history = Array.isArray(body?.history) ? body.history.slice(-10) : [];
    const contents = history.map((h: any) => ({
      role: h?.role === "assistant" ? "model" : "user",
      parts: [{ text: cleanText(h?.content, 900) }],
    })).filter((item: any) => item.parts[0].text.length > 0);
    contents.push({ role: "user", parts: [{ text }] });

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: `Je bent de beknopte AI-parkeerassistent van Shop&Go Kortrijk. Antwoord in Belgisch Nederlands. Leg uit dat Shop&Go maximaal 30 minuten gratis is tijdens de geldende uren en dat officiële borden/regels ter plaatse altijd voorrang hebben. Gebruik nooit verzonnen live parkeerdata; de app toont officiële Parko-sensordata apart. Houd antwoorden mobiel en praktisch.`,
      },
    });
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ success: true, text: response.text || "" });
  } catch (error) {
    return fail(res, error);
  }
}
