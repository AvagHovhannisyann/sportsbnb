import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ReferralCode {
  id: string;
  code: string;
  uses_count: number;
  created_at: string;
}

interface ReferralCredit {
  id: string;
  credit_amount: number;
  is_used: boolean;
  created_at: string;
}

export const useReferrals = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [credits, setCredits] = useState<ReferralCredit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReferralData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch referral code
      const { data: codeData } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (codeData) {
        setReferralCode(codeData);
      }

      // Fetch credits
      const { data: creditData } = await supabase
        .from("referral_credits")
        .select("*")
        .or(`referrer_id.eq.${user.id},referee_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      setCredits(creditData || []);
    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  const generateCode = async () => {
    if (!user) return;

    try {
      // Codes are generated server-side (unique, collision-checked)
      const { data, error } = await supabase.rpc("get_or_create_referral_code");

      if (error) throw error;
      const row = data?.[0];
      if (!row) throw new Error("No code returned");
      setReferralCode({ ...row, uses_count: 0 });
      toast.success("Referral code generated!");
    } catch (error) {
      console.error("Error generating referral code:", error);
      toast.error("Failed to generate referral code");
    }
  };

  const copyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode.code);
      toast.success("Referral code copied to clipboard!");
    }
  };

  const shareLink = () => {
    if (referralCode) {
      const url = `${window.location.origin}/signup?ref=${referralCode.code}`;
      navigator.clipboard.writeText(url);
      toast.success("Referral link copied!");
    }
  };

  const totalCredits = credits
    .filter(c => !c.is_used)
    .reduce((sum, c) => sum + Number(c.credit_amount), 0);

  return {
    referralCode,
    credits,
    totalCredits,
    isLoading,
    generateCode,
    copyCode,
    shareLink,
  };
};
