import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, Trash2, Copy, Download, Search, 
  AlertTriangle, CheckCircle, Info, Terminal, Sparkles, Filter 
} from "lucide-react";
import { Logger, LogEntry, LogLevel } from "@/lib/logger";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { tap as hapticTap, success as hapticSuccess } from "@/lib/haptics";

export const LogViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Load and subscribe to real-time logs
  useEffect(() => {
    setLogs([...Logger.getLogs()].reverse());

    const handleNewLog = (e: Event) => {
      const entry = (e as CustomEvent<LogEntry>).detail;
      setLogs((prev) => [entry, ...prev]);
    };

    const handleCleared = () => {
      setLogs([]);
      setSelectedLog(null);
    };

    window.addEventListener("shopgo_new_log", handleNewLog);
    window.addEventListener("shopgo_logs_cleared", handleCleared);

    return () => {
      window.removeEventListener("shopgo_new_log", handleNewLog);
      window.removeEventListener("shopgo_logs_cleared", handleCleared);
    };
  }, []);

  const handleClear = () => {
    hapticTap();
    Logger.clearLogs();
    toast.success("Logs succesvol gewist.");
  };

  const handleCopy = () => {
    hapticTap();
    try {
      const text = JSON.stringify(logs, null, 2);
      navigator.clipboard.writeText(text);
      hapticSuccess();
      toast.success("Logs gekopieerd naar klembord.");
    } catch {
      toast.error("Kopiëren mislukt.");
    }
  };

  const handleDownload = () => {
    hapticTap();
    try {
      const text = JSON.stringify(logs, null, 2);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shopgo_logs_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      hapticSuccess();
      toast.success("Logs gedownload.");
    } catch {
      toast.error("Download mislukt.");
    }
  };

  // Filter & Search
  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === "ALL" || log.level === filterLevel;
    const matchesSearch = 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesLevel && matchesSearch;
  });

  const getLevelStyles = (level: LogLevel) => {
    switch (level) {
      case "ERROR":
        return "bg-destructive/15 text-destructive border-destructive/20";
      case "WARN":
        return "bg-warning/15 text-warning border-warning/20";
      case "MARKETING":
        return "bg-amber-500/15 text-amber-500 border-amber-500/20";
      case "INFO":
        return "bg-primary/15 text-primary border-primary/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case "ERROR":
        return <AlertTriangle className="h-4.5 w-4.5" />;
      case "WARN":
        return <AlertTriangle className="h-4.5 w-4.5 text-warning" />;
      case "MARKETING":
        return <Sparkles className="h-4.5 w-4.5 text-amber-500" />;
      case "INFO":
        return <CheckCircle className="h-4.5 w-4.5 text-primary" />;
      default:
        return <Info className="h-4.5 w-4.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="-mx-4 min-h-[calc(100dvh-9rem)] bg-background px-4 pb-8">
      <PageHeader title="Systeem & Conversie Logs" hideBack />

      {/* Control Actions Panel */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCopy}
          className="flex-1 min-w-[100px] border-border bg-card/40 text-foreground text-xs font-semibold gap-1.5 h-10 rounded-xl"
        >
          <Copy className="h-3.5 w-3.5" />
          Kopiëren
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDownload}
          className="flex-1 min-w-[100px] border-border bg-card/40 text-foreground text-xs font-semibold gap-1.5 h-10 rounded-xl"
        >
          <Download className="h-3.5 w-3.5" />
          Download JSON
        </Button>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={handleClear}
          className="flex-1 min-w-[100px] text-xs font-semibold gap-1.5 h-10 rounded-xl"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Wissen
        </Button>
      </div>

      {/* Filter and Search controls */}
      <div className="card-soft mb-4 p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoeken in logboek..."
            className="pl-10 h-11 border-border bg-secondary/20 rounded-xl text-sm"
          />
        </div>

        {/* Level filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {(["ALL", "INFO", "WARN", "ERROR", "MARKETING"] as const).map((level) => (
            <button
              key={level}
              onClick={() => { hapticTap(); setFilterLevel(level); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                filterLevel === level
                  ? "bg-primary text-primary-foreground border-primary shadow-glow-mint"
                  : "bg-secondary/40 text-muted-foreground border-border/60 hover:bg-secondary/80"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="card-soft overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/40 bg-secondary/15 px-4 py-2.5">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Logboek ({filteredLogs.length} items)
          </span>
        </div>

        <div className="divide-y divide-border/40 max-h-[400px] overflow-y-auto font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground px-4 font-sans">
              Geen logs gevonden die voldoen aan het filter.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div 
                key={log.id} 
                onClick={() => { hapticTap(); setSelectedLog(selectedLog?.id === log.id ? null : log); }}
                className={`p-3.5 hover:bg-secondary/25 transition-colors cursor-pointer ${
                  selectedLog?.id === log.id ? "bg-secondary/40 border-l-2 border-primary" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${getLevelStyles(log.level)}`}>
                      {log.level}
                    </span>
                    <span className="font-bold text-foreground/90 uppercase text-[10px] tracking-wider px-1 bg-border/40 rounded text-muted-foreground">
                      {log.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-sans">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1.5 text-foreground leading-relaxed break-all font-sans">
                  {log.message}
                </div>

                {log.metadata && (
                  <div className="mt-1.5 text-[10px] text-primary/70 truncate">
                    Metadata: {JSON.stringify(log.metadata)}
                  </div>
                )}

                {selectedLog?.id === log.id && log.metadata && (
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-black/60 p-3 text-[10px] text-green-400 border border-border/40 max-w-full">
                    <code>{JSON.stringify(log.metadata, null, 2)}</code>
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LogViewer;
