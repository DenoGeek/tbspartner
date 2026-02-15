"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiClient } from "@/lib/api";

export interface PartnerUser {
  username: string;
  phone_no: string | null;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  partner_type: string | null;
  referral_code: string | null;
}

interface PartnerUserContextValue {
  user: PartnerUser | null;
  partnerType: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const PartnerUserContext = createContext<PartnerUserContextValue | null>(null);

export function PartnerUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PartnerUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await apiClient.get<PartnerUser>("/api/v1/accounts/user/");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const partnerType = user?.partner_type ?? null;

  return (
    <PartnerUserContext.Provider
      value={{ user, partnerType, loading, refetch: fetchUser }}
    >
      {children}
    </PartnerUserContext.Provider>
  );
}

export function usePartnerUser(): PartnerUserContextValue {
  const ctx = useContext(PartnerUserContext);
  if (!ctx) {
    throw new Error("usePartnerUser must be used within PartnerUserProvider");
  }
  return ctx;
}
