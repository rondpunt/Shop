import { fail, getAdminClient, readJsonBody, requireUser } from "../_shared.js";
import { isAllowedSpotId } from "../_spots.js";

type StartTimerResult =
  | {
      ok: true;
      session: {
        id: string;
        spotId: string;
        startedAt: string;
        endsAt: string;
        endedAt: string | null;
      };
      usage: {
        used: number;
        limit: number;
        remaining: number | null;
        isPremium: boolean;
      };
    }
  | {
      ok: false;
      code: "PAYWALL";
      paywall: {
        reason: string;
        freeLimit: number;
        used: number;
        message: string;
      };
      usage: {
        used: number;
        limit: number;
        remaining: number;
        isPremium: boolean;
      };
    };

const mapRpcError = (error: { message?: string; code?: string }) => {
  const message = String(error.message || "");
  if (message.includes("Authentication required")) {
    return Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  if (message.includes("Invalid spotId")) {
    return Object.assign(new Error("Invalid spotId"), { statusCode: 400 });
  }
  if (message.includes("Rate limit exceeded")) {
    return Object.assign(new Error("Too many requests"), { statusCode: 429 });
  }
  return Object.assign(new Error("Could not start timer"), { statusCode: 500 });
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const user = await requireUser(req);
    const body = await readJsonBody(req);
    const spotId = typeof body.spotId === "string" ? body.spotId.trim() : "";

    if (!spotId || !isAllowedSpotId(spotId)) {
      return res.status(400).json({ error: "Invalid spotId" });
    }

    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin.rpc("start_timer_session", {
      _user_id: user.id,
      _spot_id: spotId,
    });

    if (error) throw mapRpcError(error);

    const result = data as StartTimerResult | null;
    if (!result || typeof result !== "object") {
      throw Object.assign(new Error("Invalid timer response"), { statusCode: 500 });
    }

    if (result.ok === false && result.code === "PAYWALL") {
      return res.status(402).json({
        code: "PAYWALL",
        paywall: result.paywall,
        usage: result.usage,
      });
    }

    if (result.ok !== true || !result.session) {
      throw Object.assign(new Error("Invalid timer response"), { statusCode: 500 });
    }

    return res.status(200).json({
      session: result.session,
      usage: result.usage,
    });
  } catch (error) {
    return fail(res, error);
  }
}
