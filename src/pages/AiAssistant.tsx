import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useDataSource } from "@/hooks/useDataSource";
import { useReminderPref } from "@/hooks/useReminderPref";
import { ensureNotificationPermission, scheduleSessionAlarms } from "@/lib/notifications";
import { SHOPGO_DURATION_SEC } from "@/lib/format";
import { toast } from "sonner";
import { 
  Bot, 
  Sparkles, 
  Send, 
  HelpCircle, 
  Car, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  BookOpen,
  HelpCircle as InfoIcon
} from "lucide-react";

type ChatMessage = {
  id: string;
  sender: "user" | "bot";
  text: string;
};

type ParsedParkingResult = {
  matchedStreet: string | null;
  matchedZoneId: string | null;
  matchedCarDescription: string | null;
  matchedPlate: string | null;
  explanation: string;
};

const getAiHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Meld je eerst aan om de AI-parkeerassistent te gebruiken.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
};

const CHAT_PRESETS = [
  { text: "Hoe werkt live sensordata?", label: "Sensoren" },
  { text: "Waar zijn vrije plaatsen?", label: "Vrije plaatsen" },
  { text: "Hoe navigeer ik naar een locatie?", label: "Navigatie" },
  { text: "Hoe werkt mijn timer?", label: "Mijn timer" }
];

export default function AiAssistant() {
  const navigate = useNavigate();
  const { startSession, cars, activeSession } = useDataSource();
  const { prefs } = useReminderPref();

  // Smart Start Parser States
  const [smartInput, setSmartInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedParkingResult | null>(null);

  // Chatbot States
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hoi! Ik ben Sparky, je intelligente Shop & Go parkeerassistent voor Kortrijk. Vraag me over parkeerregels, sensoren, of vertel me waar je staat en ik stel je timer in!"
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // AI Smart Start: Parse conversational input
  const handleSmartParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartInput.trim() || parsing) return;

    setParsing(true);
    setParseResult(null);

    try {
      const response = await fetch("/api/gemini/assistant", {
        method: "POST",
        headers: await getAiHeaders(),
        body: JSON.stringify({ mode: "parse", text: smartInput })
      });

      if (!response.ok) throw new Error("Kon invoer niet analyseren.");
      const result = await response.json();
      
      if (result.success && result.data) {
        setParseResult(result.data);
        toast.success("Locatie succesvol geanalyseerd!");
      } else {
        throw new Error(result.error || "Geen resultaat.");
      }
    } catch (error: any) {
      toast.error("Fout bij AI analyse", { description: error.message });
    } finally {
      setParsing(false);
    }
  };

  // Confirm and start the timer based on parsed values
  const handleSmartStartTimer = async () => {
    if (!parseResult || !parseResult.matchedZoneId) return;

    try {
      const startedAt = new Date();
      const endsAt = new Date(startedAt.getTime() + SHOPGO_DURATION_SEC * 1000);

      const remindBeforeMin = prefs.remindBeforeMin || 5;
      const granted = remindBeforeMin > 0 ? await ensureNotificationPermission() : false;

      // Find matched car by plate or description, or use default
      let selectedCarId: string | null = null;
      if (parseResult.matchedPlate) {
        const found = cars.find(
          (c) => c.plate?.toLowerCase().replace(/[^a-z0-9]/g, "") === 
                 parseResult.matchedPlate?.toLowerCase().replace(/[^a-z0-9]/g, "")
        );
        if (found) selectedCarId = found.id;
      }
      
      if (!selectedCarId && cars.length > 0) {
        const defaultCar = cars.find((c) => c.is_default) || cars[0];
        selectedCarId = defaultCar.id;
      }

      const streetName = parseResult.matchedStreet || "Shop&Go Zone";
      const session = await startSession({
        car_id: selectedCarId,
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
        lat: null,
        lng: null,
        address: `${streetName}, Kortrijk`,
        spot_id: `parko:${parseResult.matchedZoneId}`
      });

      if (granted && remindBeforeMin > 0) {
        await scheduleSessionAlarms({
          sessionId: session.id,
          endsAt,
          remindBeforeMin,
          locationLabel: streetName
        });
      }

      toast.success("Timer succesvol gestart!", {
        description: `Je timer voor ${streetName} loopt.`
      });

      // Clear the inputs
      setSmartInput("");
      setParseResult(null);

      // Navigate to home to show countdown
      navigate("/");
    } catch (e: any) {
      toast.error("Sessie kon niet worden gestart", { description: e.message });
    }
  };

  // AI Chat Bot: Handle conversational question
  const handleSendMessage = async (textToSend?: string) => {
    const question = textToSend || chatInput;
    if (!question.trim() || chatLoading) return;

    if (!textToSend) setChatInput("");

    const userMsgId = `user_${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, sender: "user", text: question }
    ];
    setMessages(newMessages);
    setChatLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.sender === "bot" ? "assistant" : "user",
        content: m.text
      }));

      const response = await fetch("/api/gemini/assistant", {
        method: "POST",
        headers: await getAiHeaders(),
        body: JSON.stringify({ mode: "chat", text: question, history })
      });

      if (!response.ok) throw new Error("Fout bij ophalen van antwoord.");
      const result = await response.json();

      if (result.success && result.text) {
        setMessages([
          ...newMessages,
          { id: `bot_${Date.now()}`, sender: "bot", text: result.text }
        ]);
      } else {
        throw new Error(result.error || "Geen antwoord.");
      }
    } catch (error: any) {
      setMessages([
        ...newMessages,
        { 
          id: `err_${Date.now()}`, 
          sender: "bot", 
          text: `Sorry, ik kon je vraag momenteel niet beantwoorden: ${error.message}` 
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="app-page-panel space-y-6">
      <PageHeader 
        title="AI Parkeerassistent" 
        subtitle="Vraag Sparky om advies of laat je timer slim instellen" 
        hideBack 
      />

      {/* active-session warning */}
      {activeSession && (
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 text-xs font-semibold flex items-center justify-between">
          <span className="text-white">⏱ Er loopt momenteel al een actieve parkeersessie.</span>
          <button 
            type="button"
            onClick={() => navigate("/")} 
            className="text-primary underline hover:opacity-80"
          >
            Bekijk timer →
          </button>
        </div>
      )}

      {/* 1. AI Smart Start Panel */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-card-foreground">AI Smart Start</h2>
            <p className="text-[11px] text-muted-foreground">Vertel in je eigen woorden waar je staat</p>
          </div>
        </div>

        <form onSubmit={handleSmartParse} className="space-y-3">
          <textarea
            id="smart-park-input"
            rows={2}
            value={smartInput}
            onChange={(e) => setSmartInput(e.target.value)}
            placeholder="Bijv: 'Ik sta geparkeerd in de Lange Steenstraat met mijn rode Golf 1-ABC-123'"
            className="w-full rounded-xl border border-border bg-slate-50 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground leading-tight">
              AI herkent automatisch de straat, zone en wagen.
            </span>
            <button
              type="submit"
              disabled={parsing || !smartInput.trim() || !!activeSession}
              className="btn-pill-primary flex min-h-[38px] items-center gap-2 px-4 py-1.5 text-xs font-bold"
            >
              {parsing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyseren...
                </>
              ) : (
                <>Analyseer Locatie</>
              )}
            </button>
          </div>
        </form>

        {/* Smart Start Result Card */}
        {parseResult && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-fade-in">
            <div className="flex items-start gap-2 text-xs">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="font-bold text-slate-900 leading-snug">Locatie gedetecteerd!</p>
                <p className="text-slate-700 text-xs">{parseResult.explanation}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg bg-white p-3 text-xs shadow-sm border border-slate-100">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">📍 Locatie</span>
                <span className="font-semibold text-slate-800">{parseResult.matchedStreet || "Onbekende straat"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">🚗 Wagen</span>
                <span className="font-semibold text-slate-800">
                  {parseResult.matchedCarDescription || "Standaardvoertuig"} 
                  {parseResult.matchedPlate && ` (${parseResult.matchedPlate})`}
                </span>
              </div>
            </div>

            {parseResult.matchedZoneId ? (
              <button
                type="button"
                onClick={handleSmartStartTimer}
                disabled={!!activeSession}
                className="btn-pill-primary w-full py-2.5 text-sm font-bold shadow-glow-mint flex items-center justify-center gap-2"
              >
                <Clock className="h-4 w-4" /> Start 30 min timer op {parseResult.matchedStreet}!
              </button>
            ) : (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive font-semibold">
                Niet gelukt om een geldige Shop & Go zone in Kortrijk te koppelen. Probeer een andere beschrijving.
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. AI Interactive Chat Panel */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col h-[380px]">
        <div className="mb-2 flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-card-foreground">AI Parkeerassistent</h2>
            <p className="text-[11px] text-muted-foreground">Stel je vraag over Shop & Go Kortrijk</p>
          </div>
        </div>

        {/* Preset quick buttons */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CHAT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleSendMessage(preset.text)}
              disabled={chatLoading}
              className="rounded-full border border-border bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-primary/40 hover:bg-slate-100 transition-base shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Chat window */}
        <div className="flex-1 overflow-y-auto border-y border-slate-100 py-3 my-2 space-y-3 min-h-[160px] pr-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-normal ${
                  m.sender === "user"
                    ? "bg-primary text-primary-foreground font-semibold rounded-br-none"
                    : "bg-slate-100 text-slate-800 rounded-bl-none"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Sparky typt...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Text Input Row */}
        <div className="flex gap-2 pt-1 shrink-0">
          <input
            id="chat-input-field"
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type je vraag hier..."
            disabled={chatLoading}
            className="flex-1 rounded-xl border border-border bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={chatLoading || !chatInput.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-50 transition-base shrink-0"
            aria-label="Verstuur"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* 3. Educational & Smart-City Details ("ed." requirement) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Educatieve Gids & Smart City Kortrijk
          </h2>
        </div>

        <div className="grid gap-2.5">
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-soft">
            <h3 className="text-xs font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Hoe werken de Shop & Go sensoren?
            </h3>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              In elke parkeervak ligt een slimme, draadloze sensor (magnetometer) ingebed in de grond. 
              Zodra een auto over de sensor parkeert, verandert het magnetische veld en registreert de sensor de aankomst. 
              Er start automatisch een timer van 30 minuten in het stedelijke controlecentrum. Er is GEEN parkeerschijf of ticket nodig!
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 shadow-soft">
            <h3 className="text-xs font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Waarom is de tijd beperkt tot 30 minuten?
            </h3>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              De Shop & Go plaatsen zijn speciaal ontworpen om een hoge <strong>rotatie</strong> te garanderen. 
              Dit zorgt ervoor dat er altijd een parkeerplek vrij is dichtbij lokale Kortrijkse handelaars (zoals bakkers, apothekers of krantenwinkels) voor snelle boodschappen. 
              Hierdoor is er minder zoekverkeer, wat ook beter is voor het milieu!
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 shadow-soft">
            <h3 className="text-xs font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Zijn er uitzonderingen voor minder mobielen?
            </h3>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Raadpleeg voor regels en uitzonderingen altijd de officiële borden ter plaatse. Deze app toont
              uitsluitend live sensordata en kan geen lokale verkeersregels vervangen.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
