# Build Week demo script — 2:55 maximum

Target recording length: **2:48**, leaving seven seconds of safety below the three-minute limit. Use only the bundled synthetic documents. Keep the terminal, Codex task, and viewer pre-opened; increase text size before recording.

## 0:00–0:16 — Hook

**On screen:** Three fixture filenames, then Codex.

**Voiceover:**

> Tax software usually gives you an answer. LazyTax gives you the evidence to trust it. We turned Codex into a local, verifiable tax workspace for one fictional Indian taxpayer.

## 0:16–0:34 — Invoke the real plugin

**On screen:** Type the canonical prompt with `$verify-tax-return`. Briefly show the installed LazyTax plugin and four MCP tools.

**Voiceover:**

> LazyTax is a real installable Codex and ChatGPT plugin: one verification skill, a local MCP server, a deterministic tax engine, and no tax-portal credentials. These three documents are synthetic and contain no real PII.

## 0:34–1:03 — Find the conflict

**On screen:** Run normalization and the first reconciliation. Zoom in on the salary conflict and its source references.

**Voiceover:**

> GPT‑5.6 orchestrates the workflow and explains the evidence, while typed local tools preserve every source line. The Form 16-like record reports eighteen lakh rupees. The AIS-like record reports eighteen lakh forty thousand because of this separately listed bonus. LazyTax refuses to guess.

## 1:03–1:18 — Human approval gate

**On screen:** Show the pause. Enter: “For this synthetic demo, confirm salary at INR 1,840,000.”

**Voiceover:**

> A consequential discrepancy requires an explicit human decision. I confirm the synthetic amount, and that decision becomes part of the proof trail.

## 1:18–1:49 — Deterministic result

**On screen:** Run comparison; show the new- and old-regime outputs and assumptions.

**Voiceover:**

> The model never calculates tax. Versioned deterministic code combines the confirmed salary, eighteen thousand five hundred in interest, and forty-five thousand in short-term gains. For this narrow demo profile, estimated tax is one lakh seventy-two thousand three hundred twenty-eight under the new regime—two lakh six thousand two hundred eighty-four lower than the old estimate.

## 1:49–2:10 — Proof, not a black box

**On screen:** Open the evidence viewer. Click Evidence, Calculation, then Audit trail.

**Voiceover:**

> Every material number links back to a document and stable line ID. The Tax Proof Pack carries the evidence index, the user-confirmed resolution, both calculations, assumptions, and a SHA-256 integrity hash.

## 2:10–2:30 — Honest boundary and privacy

**On screen:** Show the synthetic badge and boundary card; briefly show the local stdio configuration.

**Voiceover:**

> The MVP is deliberately local and synthetic-only. It has no filing tool, makes no portal call, and does not calculate a refund or balance due. Tax-credit lines remain in the input and are explicitly warned and excluded from this engine version.

## 2:30–2:48 — Why Codex and close

**On screen:** Fast cuts of a dated Codex session, typed schemas/tests, then return to viewer hero.

**Voiceover:**

> Codex helped build the plugin, MCP contracts, deterministic engine, fixtures, golden tests, and evals. GPT‑5.6 is the reasoning interface; code supplies the proof. LazyTax shows that Codex can move beyond coding into high-stakes life workflows—without asking users to trust a black box.

## 2:48–2:55 — End card buffer

**On screen:**

> LazyTax — every number has a source.  
> Synthetic Build Week demo · not tax advice · no filing

No additional voiceover.

## Recording checklist

- Keep the final cut at or below 2:55.
- Record one continuous working path; remove waits, installs, and dependency downloads.
- Make source IDs and numeric results legible at normal playback speed.
- Do not show notifications, secrets, local user paths, or unrelated browser tabs.
- Do not show real taxpayer data or third-party logos.
- Show the Codex session ID only if it is the session submitted through `/feedback` and contains no secrets or PII.
- Ensure narration says **estimated tax**, not tax payable, refund, completed return, or filed return.
- Include captions and voiceover audio.
