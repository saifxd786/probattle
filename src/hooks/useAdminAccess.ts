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
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          } as any,
        );

        window.clearTimeout(timeoutId);

        if (cancelled) return;

        if (error) {
          const httpStatus = (error as any)?.context?.response?.status;
          if (httpStatus === 401) {
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
