import { answerLink } from "./actions";
import type { MessageKey } from "@/lib/messages";

// Asks whether a risk is about the suggested activity: yes, no, or another one.
export function LinkAsk({ t, riskId, guess, tasks }: { t: (k: MessageKey) => string; riskId: string; guess: { id: string; title: string }; tasks: { id: string; title: string }[] }) {
  return (
    <section className="surface rk-card" aria-label={t("risks.linkedTask")}>
      <p>{t("risks.linkAsk").replace("{title}", guess.title)}</p>
      <div className="rk-actions">
        <form action={answerLink}><input type="hidden" name="id" value={riskId} /><input type="hidden" name="linkedTaskId" value={guess.id} /><button type="submit" className="act act-primary">{t("risks.linkYes")}</button></form>
        <form action={answerLink}><input type="hidden" name="id" value={riskId} /><button type="submit" className="act">{t("risks.linkNo")}</button></form>
        <form action={answerLink}><input type="hidden" name="id" value={riskId} /><select name="linkedTaskId" className="rk-in" aria-label={t("risks.linkOther")} required defaultValue=""><option value="" disabled>{t("risks.linkOther")}</option>{tasks.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select> <button type="submit" className="act">{t("risks.linkSave")}</button></form>
      </div>
    </section>
  );
}
