"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UsePurchasedSequencesResult {
  purchasedIds: Set<number>;
  isLoading: boolean;
  isLoggedIn: boolean;
  hasPurchased: (sequenceId: number) => boolean;
}

export function usePurchasedSequences(): UsePurchasedSequencesResult {
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function loadPurchases() {
      const supabase = createClient();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoggedIn(true);

      const { data: purchases } = await supabase
        .from("purchases")
        .select("sequence_ids")
        .eq("user_id", user.id);

      if (purchases) {
        const ids = new Set<number>();
        purchases.forEach((p: { sequence_ids: number[] }) => {
          p.sequence_ids.forEach((id) => ids.add(id));
        });
        setPurchasedIds(ids);
      }

      setIsLoading(false);
    }

    loadPurchases();
  }, []);

  const hasPurchased = (sequenceId: number): boolean => {
    return purchasedIds.has(sequenceId);
  };

  return {
    purchasedIds,
    isLoading,
    isLoggedIn,
    hasPurchased,
  };
}
