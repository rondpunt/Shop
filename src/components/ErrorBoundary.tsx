import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
     
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ error: null });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-elevated">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-base font-bold">Er ging iets mis</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            De app is hersteld zonder dat je sessie verloren ging. Tik om opnieuw te laden.
          </p>
          <button
            onClick={this.reset}
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-glow-green"
          >
            <RefreshCw className="h-4 w-4" /> Opnieuw laden
          </button>
        </div>
      </div>
    );
  }
}
