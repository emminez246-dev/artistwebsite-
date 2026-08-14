"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { getDisplayName, setDisplayName } from "@/lib/display-name";

export default function JoinLiveGate({ children }: { children: (name: string) => React.ReactNode }) {
  const [name, setName] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setName(getDisplayName());
    setChecked(true);
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setDisplayName(trimmed);
    setName(trimmed);
  };

  if (!checked) return null;

  if (!name) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <Radio size={40} className="text-accent mb-4" />
        <h1 className="text-xl font-bold text-text mb-2">Join the live</h1>
        <p className="text-sm text-text-dim mb-6 max-w-xs">
          Pick a name so others can see your comments and likes. No account needed.
        </p>
        <form onSubmit={handleJoin} className="w-full max-w-xs space-y-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your name"
            maxLength={24}
            autoFocus
            className="input-field text-center"
          />
          <button type="submit" disabled={!input.trim()} className="btn-primary w-full disabled:opacity-50">
            Join Live
          </button>
        </form>
      </div>
    );
  }

  return <>{children(name)}</>;
}
