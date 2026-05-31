"use client";

import { useEffect, useState } from "react";

import type { GuideState } from "./types";

export function useGuide(guideId: string) {
  const [guide, setGuide] = useState<GuideState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadGuide() {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/guides/${guideId}`);
      const payload = await response.json();

      if (ignore) return;
      setLoading(false);

      if (!response.ok) {
        setError(payload.error ?? "Guide not found.");
        return;
      }

      setGuide(payload.guide);
    }

    loadGuide();
    return () => {
      ignore = true;
    };
  }, [guideId]);

  return { error, guide, loading, setGuide };
}
