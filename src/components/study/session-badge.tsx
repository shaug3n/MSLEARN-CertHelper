"use client";

import { useEffect, useState } from "react";

type SessionUser = {
  id: string;
  displayName: string;
};

export function SessionBadge({ onReady }: { onReady?: () => void }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      const response = await fetch("/api/session");
      const payload = await response.json();
      if (!ignore && response.ok) {
        setUser(payload.user);
        onReady?.();
      }
    }

    loadSession();
    return () => {
      ignore = true;
    };
  }, [onReady]);

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <span className="font-semibold text-slate-900">Session:</span>{" "}
      {user ? user.displayName : "Creating demo session..."}
    </div>
  );
}
