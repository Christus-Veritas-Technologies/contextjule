"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import * as ipc from "./ipc";

/**
 * Licence state, shared by every window.
 *
 * The app unlocks on `active` or on `offline_grace` — a cached licence inside
 * its window. Anything else shows the key screen. Re-validation happens once a
 * day in the background and never blocks a launch: the cached answer is good
 * enough to open with, and a revocation takes effect on the next check.
 */
const REVALIDATE_EVERY_MS = 24 * 60 * 60 * 1000;

interface LicenseContextValue {
  state: ipc.LicenseState;
  loading: boolean;
  unlocked: boolean;
  error: string | null;
  activate: (key: string) => Promise<boolean>;
  deactivate: () => Promise<void>;
  revalidate: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextValue | null>(null);

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ipc.LicenseState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const revalidated = useRef(false);

  useEffect(() => {
    let cancelled = false;

    ipc
      .licenseGet()
      .then((initial) => {
        if (cancelled) return;
        setState(initial);

        // Launch is never gated on the network. If the cached answer is stale
        // we refresh it behind the app, and a revocation lands on the next run.
        if (revalidated.current) return;
        const last = initial.lastValidatedAt ? Date.parse(initial.lastValidatedAt) : 0;
        if (initial.licenseKey && Date.now() - last > REVALIDATE_EVERY_MS) {
          revalidated.current = true;
          ipc.licenseValidate().then((fresh) => !cancelled && setState(fresh)).catch(() => {});
        }
      })
      .catch(() => !cancelled && setState(null));

    return () => {
      cancelled = true;
    };
  }, []);

  const activate = useCallback(async (key: string) => {
    setError(null);
    try {
      setState(await ipc.licenseActivate(key));
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    }
  }, []);

  const deactivate = useCallback(async () => {
    setState(await ipc.licenseDeactivate());
  }, []);

  const revalidate = useCallback(async () => {
    setState(await ipc.licenseValidate());
  }, []);

  const value = useMemo<LicenseContextValue>(() => {
    const current = state ?? {
      status: "unlicensed" as const,
      licenseKey: null,
      licenseKeyInstanceId: null,
      email: null,
      activationsUsed: null,
      activationsLimit: null,
      expiresAt: null,
      lastValidatedAt: null,
    };
    return {
      state: current,
      loading: state === null,
      unlocked: current.status === "active" || current.status === "offline_grace",
      error,
      activate,
      deactivate,
      revalidate,
    };
  }, [state, error, activate, deactivate, revalidate]);

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export function useLicense(): LicenseContextValue {
  const value = useContext(LicenseContext);
  if (!value) throw new Error("useLicense must be used inside <LicenseProvider>");
  return value;
}

/** One line under the key field, in the customer's terms. */
export function licenseMessage(status: ipc.LicenseState["status"]): string {
  switch (status) {
    case "active":
      return "Licensed. Thank you.";
    case "offline_grace":
      return "Offline. Running on a cached licence.";
    case "expired":
      return "This key has expired.";
    case "revoked":
      return "This key was revoked — a refund or chargeback, usually.";
    case "limit_reached":
      return "Every activation on this key is in use. Free one up first.";
    case "invalid":
      return "That key was not recognised.";
    default:
      return "Enter the key from your purchase email.";
  }
}
