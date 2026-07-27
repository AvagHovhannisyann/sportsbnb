import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CURRENCIES, COUNTRY_CURRENCY_MAP } from "@/lib/currencies";

export { CURRENCIES, COUNTRY_CURRENCY_MAP } from "@/lib/currencies";

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  isLoading: boolean;
  detectedCurrency: string | null;
}
/**
 * There was a `formatPrice` here and it is gone. Nothing imported it, and it
 * was a loaded gun:
 *
 *   new Intl.NumberFormat(locale, { style: "currency", currency })
 *     .format(amount)
 *
 * `amount` is `price_per_hour`, stored in Armenian dram. That call relabels
 * without converting — there is no FX layer in this app to convert with — so a
 * 13,000 dram pitch renders as "$13,000" to anyone whose currency is dollars,
 * and the default here is USD unless the timezone happens to be one of
 * seventeen in a hardcoded map. That is roughly a 400x overstatement on the
 * number the entire booking decision turns on.
 *
 * It is not hypothetical: `src/lib/pricing.ts` carries a long comment about
 * having had exactly this bug and fixing it, which is the version every price
 * on screen now goes through. Leaving a second, broken formatter in the
 * codebase for someone to wire up later is how that gets undone. If display
 * currency is ever wanted for real it needs rates, a staleness policy, and the
 * charge still shown in the currency it will settle in — see docs/handover.md.
 */

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [currency, setCurrencyState] = useState<string>("USD");
  const [detectedCurrency, setDetectedCurrency] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-detect currency based on user's location
  useEffect(() => {
    const detectCurrency = async () => {
      try {
        // Try to get user's country from timezone or IP
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Map common timezones to countries
        const timezoneCountryMap: Record<string, string> = {
          "Asia/Yerevan": "AM",
          "Europe/Moscow": "RU",
          "Europe/London": "GB",
          "Europe/Paris": "FR",
          "Europe/Berlin": "DE",
          "America/New_York": "US",
          "America/Los_Angeles": "US",
          "America/Chicago": "US",
          "Asia/Tokyo": "JP",
          "Asia/Seoul": "KR",
          "Asia/Shanghai": "CN",
          "Asia/Kolkata": "IN",
          "Asia/Dubai": "AE",
          "Europe/Istanbul": "TR",
          "Asia/Tbilisi": "GE",
          "America/Sao_Paulo": "BR",
          "America/Toronto": "CA",
          "Australia/Sydney": "AU",
        };

        const countryCode = timezoneCountryMap[timezone];
        if (countryCode && COUNTRY_CURRENCY_MAP[countryCode]) {
          setDetectedCurrency(COUNTRY_CURRENCY_MAP[countryCode]);
        }
      } catch (error) {
        console.error("Error detecting currency:", error);
      }
    };

    detectCurrency();
  }, []);

  // Load user's preferred currency from profile
  useEffect(() => {
    const loadCurrency = async () => {
      setIsLoading(true);
      
      // Check profile for saved preference
      if (profile) {
        const savedCurrency = (profile as any).preferred_currency;
        if (savedCurrency && CURRENCIES[savedCurrency]) {
          setCurrencyState(savedCurrency);
          setIsLoading(false);
          return;
        }
      }

      // Fall back to detected currency or USD
      if (detectedCurrency) {
        setCurrencyState(detectedCurrency);
      }
      
      setIsLoading(false);
    };

    loadCurrency();
  }, [profile, detectedCurrency]);

  // Save currency preference to profile
  const setCurrency = async (newCurrency: string) => {
    setCurrencyState(newCurrency);
    
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ preferred_currency: newCurrency })
          .eq("user_id", user.id);
      } catch (error) {
        console.error("Error saving currency preference:", error);
      }
    }
    
    // Also save to localStorage for non-logged-in users
    localStorage.setItem("preferred_currency", newCurrency);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        isLoading,
        detectedCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
