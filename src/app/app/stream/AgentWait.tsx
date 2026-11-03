"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isAgentTagged } from "@/domain/agent";

const EVERY = 2000;
const GIVE_UP = 90000;

// The AI works after the send has answered, so after each send this refreshes the page until its reply or card shows up.
// The "Agent is writing…" bubble in the feed is drawn from the stream itself (see StreamView).
export function AgentWait() {
  const router = useRouter();
  const mark = useRef<HTMLSpanElement>(null);
  const [round, setRound] = useState<{ tagged: boolean; msgs: number; cards: number } | null>(null);

  useEffect(() => {
    const form = mark.current?.closest("form");
    if (!form) return;
    const count = (sel: string) => document.querySelectorAll(sel).length;
    const onSubmit = () => {
      const body = form.querySelector<HTMLTextAreaElement>("textarea[name=body]")?.value ?? "";
      if (!body.trim()) return;
      setRound({ tagged: isAgentTagged(body), msgs: count("article.mail"), cards: count(".agent-card") });
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  useEffect(() => {
    if (!round) return;
    const started = Date.now();
    const stop = () => { clearInterval(timer); setRound(null); };
    const timer = setInterval(() => {
      const c = (sel: string) => document.querySelectorAll(sel).length;
      // Own message, then the agent's reply (tagged), or a new card.
      const replied = round.tagged ? c("article.mail") >= round.msgs + 2 : false;
      if (replied || c(".agent-card") > round.cards) {
        stop();
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      } else if (Date.now() - started > (round.tagged ? GIVE_UP : 20000)) stop();
      else router.refresh();
    }, EVERY);
    return () => clearInterval(timer);
  }, [round, router]);

  return <span ref={mark} hidden />;
}
