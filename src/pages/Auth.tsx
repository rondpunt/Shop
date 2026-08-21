import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SGLogo } from "@/components/SGLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const emailSchema = z.string().trim().email("Geldig e-mailadres vereist").max(255);
const codeSchema = z.string().trim().length(6, "Code moet 6 cijfers zijn");

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedRedirect = params.get("redirect") || "/";
  const redirect = requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : "/";
  const { session } = useAuth();
  
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate(redirect, { replace: true });
  }, [session, navigate, redirect]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === "SUPABASE_AUTH_SUCCESS" && event.data?.session) {
        const sess = event.data.session;
        supabase.auth.setSession({
          access_token: sess.access_token,
          refresh_token: sess.refresh_token
        }).then(({ error }) => {
          if (error) {
            toast.error("Google-sessie koppeling mislukt", { description: error.message });
          } else {
            toast.success("Succesvol ingelogd met Google");
            navigate(redirect, { replace: true });
          }
        });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate, redirect]);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          skipBrowserRedirect: true,
        }
      });
      if (error) throw error;
      if (data?.url) {
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(data.url, "GoogleLogin", `width=${width},height=${height},left=${left},top=${top}`);
      }
    } catch (err) {
      toast.error("Google Inloggen Mislukt", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailParsed = emailSchema.safeParse(email);
    if (!emailParsed.success) return toast.error(emailParsed.error.issues[0].message);

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailParsed.data,
      });
      
      if (error) throw error;
      
      toast.success("Code verstuurd", { description: "Kijk in je mailbox voor de code." });
      setStep("code");
    } catch (err) {
      toast.error("Fout bij versturen", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeParsed = codeSchema.safeParse(code);
    if (!codeParsed.success) return toast.error(codeParsed.error.issues[0].message);

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: codeParsed.data,
        type: "email",
      });
      
      if (error) throw error;
      
      toast.success("Succesvol ingelogd");
      navigate(redirect, { replace: true });
    } catch (err) {
      toast.error("Fout bij inloggen", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-card font-sans text-card-foreground">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-safe pt-safe">
        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="mb-8 flex items-center gap-4 pl-2">
            <SGLogo size={62} className="drop-shadow-[0_5px_14px_hsl(var(--primary)/0.35)]" />
            <div>
              <h1 className="text-3xl font-extrabold leading-none tracking-normal text-card-foreground">
                Shop&Go
              </h1>
              <p className="mt-1 text-[17px] text-muted-foreground">Kortrijk parkeer-reminder</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-deep bg-card px-6 py-6 shadow-elevated">
            {step === "email" ? (
              <div className="space-y-6">
                <Button 
                  type="button" 
                  onClick={handleGoogle} 
                  disabled={loading}
                  className="h-[52px] w-full rounded-xl bg-[#EA4335] text-base font-bold text-white shadow-md hover:bg-[#D93025]"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Inloggen met Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-deep/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Of via e-mail</span>
                  </div>
                </div>

                <form onSubmit={handleSendCode} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-muted-foreground">E-mailadres</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      inputMode="email" 
                      autoComplete="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="jij@voorbeeld.be" 
                      required 
                      className="h-[52px] rounded-xl border-deep bg-deep px-4 text-[18px] text-white placeholder:text-white/58" 
                    />
                  </div>
                  
                  <Button type="submit" className="h-[52px] w-full rounded-xl bg-primary text-base font-extrabold text-primary-foreground shadow-glow-mint hover:bg-primary/90" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Stuur inlogcode
                  </Button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-muted-foreground">Bevestigingscode</Label>
                  <Input 
                    id="code" 
                    type="text" 
                    inputMode="numeric" 
                    pattern="[0-9]*" 
                    autoComplete="one-time-code"
                    value={code} 
                    onChange={(e) => setCode(e.target.value)} 
                    placeholder="123456" 
                    required 
                    className="h-[52px] rounded-xl border-deep bg-deep px-4 text-center text-[22px] tracking-widest text-white placeholder:text-white/58" 
                  />
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    We hebben een code gestuurd naar <br/><span className="font-bold text-white">{email}</span>
                  </p>
                </div>
                
                <Button type="submit" className="h-[52px] w-full rounded-xl bg-primary text-base font-extrabold text-primary-foreground shadow-glow-mint hover:bg-primary/90" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Inloggen
                </Button>

                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-muted-foreground hover:text-white"
                  onClick={() => setStep("email")}
                  disabled={loading}
                >
                  Terug naar e-mail
                </Button>
              </form>
            )}
          </div>

          <div className="mt-6 space-y-3 text-center">
            <Link
              to="/"
              className="inline-block text-[17px] font-extrabold text-primary underline-offset-4 hover:underline"
            >
              Doorgaan zonder account →
            </Link>
            <p className="px-2 text-[13px] leading-relaxed text-muted-foreground">
              Een account is alleen nodig voor sync & back-up. Timer, locatie, notitie en foto werken
              ook zonder account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
