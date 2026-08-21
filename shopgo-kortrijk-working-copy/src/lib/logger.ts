// High-fidelity Logging Engine for Shop&Go Kortrijk
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "MARKETING";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  metadata?: Record<string, any>;
}

const MAX_LOGS = 200;
const STORAGE_KEY = "shopgo_application_logs";

export class Logger {
  private static getStoredLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to read logs from localStorage", e);
      return [];
    }
  }

  private static saveLogs(logs: LogEntry[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
    } catch (e) {
      console.error("Failed to save logs to localStorage", e);
    }
  }

  static log(level: LogLevel, category: string, message: string, metadata?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const id = `log_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    const newEntry: LogEntry = {
      id,
      timestamp,
      level,
      category,
      message,
      metadata,
    };

    // Output to developer console
    const consoleMsg = `[${level}] [${category}] ${message}`;
    if (level === "ERROR") {
      console.error(consoleMsg, metadata || "");
    } else if (level === "WARN") {
      console.warn(consoleMsg, metadata || "");
    } else {
      console.log(consoleMsg, metadata || "");
    }

    // Persist to rolling window
    const logs = this.getStoredLogs();
    logs.push(newEntry);
    this.saveLogs(logs);

    // Dispatch custom event for real-time log viewers
    window.dispatchEvent(new CustomEvent("shopgo_new_log", { detail: newEntry }));
  }

  static debug(category: string, message: string, metadata?: Record<string, any>) {
    this.log("DEBUG", category, message, metadata);
  }

  static info(category: string, message: string, metadata?: Record<string, any>) {
    this.log("INFO", category, message, metadata);
  }

  static warn(category: string, message: string, metadata?: Record<string, any>) {
    this.log("WARN", category, message, metadata);
  }

  static error(category: string, message: string, metadata?: Record<string, any>) {
    this.log("ERROR", category, message, metadata);
  }

  static marketing(category: string, message: string, metadata?: Record<string, any>) {
    this.log("MARKETING", category, message, metadata);
  }

  static getLogs(): LogEntry[] {
    return this.getStoredLogs();
  }

  static clearLogs() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent("shopgo_logs_cleared"));
      this.info("SYSTEM", "Logs cleared by user.");
    } catch (e) {
      console.error("Failed to clear logs", e);
    }
  }
}
