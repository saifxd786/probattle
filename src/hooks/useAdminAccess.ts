import { useCallback, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AdminAccessStatus =
  | "checking"
  | "authorized"
  | "unauthorized"
  | "needs_login"
  | "error";

type AdminAccessResult = {
  status: AdminAccessStatus;
  errorMessage: string | null;
  retry: () => void;
};

/**
 * Admin role verification gate.
 *
 * Prevents infinite "Verifying..." screens by:
 * - enforcing a hard timeout
 * - exposing an explicit "error" state + retry
 */
export function useAdminAccess(params: {
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  timeoutMs?: number;
}): AdminAccessResult {
  const { user, session, authLoading, timeoutMs = 8000 } = params;

  const [status, setStatus] = useState<AdminAccessStatus>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // Avoid re-checking on every render for the same user.
  const lastCheckedUserIdRef = useRef<string | null>(null);
  const lastResultRef = useRef<AdminAccessStatus | null>(null);

  const retry = useCallback(() => {
    lastCheckedUserIdRef.current = null;
    lastResultRef.current = null;
    setErrorMessage(null);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (authLoading) return;

      // No user: redirect to login flow.
      if (!user) {
        setErrorMessage(null);
        setStatus("needs_login");
        return;
      }

      // If we already have a stable result for this user, reuse it.
      if (
        lastCheckedUserIdRef.current === user.id &&
        lastResultRef.current &&
        lastResultRef.current !== "checking"
      ) {
        setErrorMessage(null);
        setStatus(lastResultRef.current);
        return;
      }

      setStatus("checking");
      setErrorMessage(null);

      // Some browsers/runtimes may ignore AbortController on fetch. This hard timeout ensures
      // we never get stuck on "Verifying...".
      let finished = false;
      const hardTimeoutId = window.setTimeout(() => {
        if (cancelled || finished) return;
        setStatus("error");
        setErrorMessage(
          `Verification timed out after ${Math.round(timeoutMs / 1000)}s. Please retry.`,
        );
      }, timeoutMs + 250);

      try {
        // Prefer freshest token.
        const { data: sessionData, error: sessionErr } =
          await supabase.auth.getSession();
        if (sessionErr) {
          // If we cannot read session reliably, treat as needs_login.
          throw Object.assign(new Error("SESSION_READ_FAILED"), {
            code: "SESSION_READ_FAILED",
          });
        }

        const accessToken =
          sessionData.session?.access_token || session?.access_token;

        if (!accessToken) {
          setStatus("needs_login");
          lastCheckedUserIdRef.current = user.id;
          lastResultRef.current = "needs_login";
          return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(
          () => controller.abort(),
          timeoutMs,
        );

        const { data, error } = await supabase.functions.invoke(
          "admin-check-access",
          {
            body: {},
            // Use canonical header name to ensure gateways reliably forward it.
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          } as any,
        );

        window.clearTimeout(timeoutId);
        window.clearTimeout(hardTimeoutId);
        finished = true;

        if (cancelled) return;

        if (error) {
          // Supabase Functions errors can expose status in different shapes depending on runtime.
          const httpStatus =
            (error as any)?.context?.response?.status ??
            (error as any)?.context?.status ??
            (error as any)?.status;

          const message = String((error as any)?.message ?? "");

          // Some runtimes only include the status code in the message.
          const msgLower = message.toLowerCase();
          const msgStatusMatch = msgLower.match(/\b(401|403)\b/);
          const msgStatus = msgStatusMatch ? Number(msgStatusMatch[1]) : null;

          const statusCode =
            typeof httpStatus === "number" ? httpStatus : msgStatus;

          const looksUnauthorized =
            statusCode === 401 ||
            statusCode === 403 ||
            msgLower.includes("unauthorized") ||
            msgLower.includes("forbidden");

          if (looksUnauthorized) {
            setStatus("needs_login");
            lastCheckedUserIdRef.current = user.id;
            lastResultRef.current = "needs_login";
            return;
          }

          setStatus("error");
          setErrorMessage(
            "Could not verify admin access right now. Please retry.",
          );
          return;
        }

        const isAdmin = Boolean((data as any)?.isAdmin);
        const nextStatus: AdminAccessStatus = isAdmin
          ? "authorized"
          : "unauthorized";

        setStatus(nextStatus);
        lastCheckedUserIdRef.current = user.id;
        lastResultRef.current = nextStatus;
      } catch (err: any) {
        window.clearTimeout(hardTimeoutId);
        finished = true;
        if (cancelled) return;

        // AbortController timeout / fetch abort.
        if (err?.name === "AbortError") {
          setStatus("error");
          setErrorMessage(
            `Verification timed out after ${Math.round(timeoutMs / 1000)}s. Please retry.`,
          );
          return;
        }

        // Session not available / unstable.
        if (err?.code === "SESSION_READ_FAILED") {
          setStatus("needs_login");
          lastCheckedUserIdRef.current = user?.id ?? null;
          lastResultRef.current = "needs_login";
          return;
        }

        setStatus("error");
        setErrorMessage(
          "Unexpected error while verifying admin access. Please retry.",
        );
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, session, timeoutMs, nonce]);

  return { status, errorMessage, retry };
}
