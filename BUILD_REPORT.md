# Juris Academy — Build Report

**What it is:** a learning-simulator game that teaches how Juris Protocol's
Terra Classic money markets work, by playing through them. Single
self-contained HTML file, mobile-first, DOM/canvas hybrid. Private preview —
not deployed, not pushed.

**Deliverables**
- `index.html` (57,848 bytes) — the whole game, zero external resources
- `checks-headless.js` — headless suite (Node `vm` + stub DOM, family pattern)
- `BUILD_REPORT.md` — this file

## Hard rules (Steve's, enforced and machine-checked)

- **No real value.** Every balance is a clearly labeled SIM token
  (SIM-LUNC / SIM-USTC / SIM-JURIS). Nothing is purchasable, transferable,
  or redeemable.
- **No connection to the protocol.** The file contains no network code of
  any kind — the suite statically asserts the absence of `fetch(`,
  `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, wallet
  identifiers (`keplr`, `leap`, `cosmos`, `wallet`), any `http://` /
  `https://` string, and any external-resource markup (`<a `, `<img`,
  `<link`, `src=`). It makes zero outbound requests; the only persistence
  is `localStorage` progress on the player's own device.
- **Disclaimers on screen.** The exact string
  *"LEARNING SIMULATOR — play money only · Not connected to Juris Protocol · Not financial advice"*
  renders on the title screen, in a persistent banner visible on every
  screen, on the level-end screen, and on the final screen. The suite
  asserts all four placements plus the live DOM text of the banner and
  title copies.
- **Panel framing, printed in-game:** *"Identical mechanics, simulated
  locally, no real value."*

## Grounding — sources read (2026-10-27)

All from `docs.jurisprotocol.com` unless noted:

| Page | What was taken from it |
|---|---|
| `markets/overview/` | Money-market structure: pools per asset, suppliers vs margin-account borrowers, liquidation mechanism outline |
| `markets/lending/` | Supplying is separate from margin collateral; claimable interest is collected separately from withdrawals; rates are variable |
| `markets/borrowing/` | Margin account lifecycle: deposit collateral → borrow → contract checks the ratio; adding collateral / repaying improves the ratio; collateral withdrawal is ratio-tested |
| `markets/collateral-and-risk/` | **CCR formula**, the worked example ($300/$100 → CCR 3.0), `ccr_min`, the strict-below liquidation rule, **health factor = CCR ÷ ccr_min**, what changes exposure, liquidation fee + queue bid discount as separate amounts |
| `markets/rates-and-fees/` | **Supply APR ≈ Borrow APR × Utilization × (1 − protocol fee)** and the worked example (10% / 50% / 25% → 3.75%), index-based accrual by block height, settlement order, staking fraction splits the protocol portion |
| `markets/stable-balance/` | Stable balance = settlement reserve, taken first at settlement, remainder from collateral; it is **not** collateral and does not mint anything |
| `markets/liquidation-vault/` | The vault pools assets to participate in liquidations; liquidation repays debt in exchange for collateral |
| `markets/getting-started/` | Product entry points (lend / borrow / vault) |
| `participation/addresses/` | JURIS is a Terra Classic CW20 (identity verified; the address itself is deliberately **not** printed in the game — no connection means no contract references) |
| `participation/rewards/` | JURIS stakers receive shares of funded assets; 50% of Net Eligible DEX Revenue programme — mirrored at concept level only |
| `jurisprotocol.com` | Brand palette (navy `#132452`, Juris red `#CC051C`) and the official token mark (below) |

**Brand art:** the official Juris token mark (`juris-token.svg`, saved at
`~/workspace/juris-assets/juris-token.svg` — white glyph + `#CC051C`
accent) is embedded inline and drawn on a navy disc on the title screen.
The suite verifies both SVG path payloads match the saved file byte-for-byte.

## Parameter table — every number the player sees

| Parameter | Game uses | Source / status |
|---|---|---|
| Collateral ratio | CCR = collateral value ÷ borrowed value | **Real formula** — Collateral and risk |
| Health factor | HF = CCR ÷ minimum CCR; liquidatable below 1.00 | **Real formula** — Collateral and risk |
| Liquidation trigger | CCR **strictly below** minimum CCR | **Real rule** — Collateral and risk |
| Minimum CCR (`ccr_min`) | **1.50 (150%)** | **NOT PUBLISHED in their docs** — the docs define `ccr_min` as a contract setting without giving its current value. Simulator placeholder, labeled as such in-game |
| Supply APR formula | Borrow APR × Utilization × (1 − protocol fee fraction) | **Real formula** — Rates and fees |
| Borrow APR / Utilization / Protocol fee | 10% / 50% / 25% → Supply APR **3.75%** | **The docs' own worked example** — the docs explicitly state these are example inputs, not current market rates; the game repeats that caveat in the panel |
| Interest settlement order | Stable balance first, remainder deducted from margin collateral | **Real rule** — Stable balance; Rates and fees |
| Stable balance role | Settlement reserve; not collateral; one reserve per owner | **Real concept** — Stable balance |
| Liquidation flow | Liquidation Vault repays part of the debt, takes collateral in exchange, plus a fee and a bid discount | **Real flow** — Liquidation Vault; Collateral and risk |
| Liquidation cost | **10%** of the repaid amount (fee + discount combined) | **NOT PUBLISHED in their docs** — the docs confirm both charges exist as separate amounts but give no values. Simulator placeholder, labeled in-game |
| Liquidation size (close factor) | Repays **50%** of remaining debt per event | **NOT PUBLISHED in their docs.** Simulator placeholder, labeled in-game |
| Liquidation re-trigger guard | One liquidation per crossing; re-arms only after CCR recovers to 110% of minimum | Simulator fairness device (prevents per-tick repeat penalties); disclosed here, invisible to players |
| Collateral price | Simulated segment paths with seeded jitter | **Simplification** — the real protocol uses oracle prices (Collateral and risk) |
| Interest time scale | 1 second of play ≈ 10 days | **Simplification** — real accrual is index-based by block height, not calendar (Rates and fees) |
| Debt interest handling | Paid in SIM-USTC at settlement instead of compounding into debt | **Simplification** of index-based accrual + settlement |
| Settlement cadence | Every 10 seconds of play | Simulator pacing (settlement *order* is the real rule) |
| SIM-JURIS rewards (Level 5) | Drip for disciplined health + completion bonus | **Concept mirror only** — amounts invented for learning; the real mechanism is stakers sharing funded protocol revenue (Rewards) |
| Teaching pair | Supply/collateral SIM-LUNC, borrow SIM-USTC | Simulator choice — per-market parameters are not published in their docs |
| Borrow/withdraw ratio checks | Borrows and collateral withdrawals that would breach minimum CCR are rejected with the reason shown | **Real behavior** — Borrowing; Collateral and risk |
| Scoring / stars / starting balances / level timers | Game numbers | Pure game design; they affect no protocol mechanic |

## Curriculum (5 levels + checkpoint quiz after each)

1. **Supply** — supply SIM-LUNC, watch interest tick at the docs' 3.75%
   example supply APR; goal: supply ≥ 5,000 and earn ≥ 60.
2. **Borrow** — margin account: deposit collateral, borrow against it;
   the borrow cap (collateral ÷ minimum CCR) is enforced exactly like the
   contract check; goal: borrow ≥ 200 with CCR ≥ 2.00.
3. **Health Factor** — live price swings move CCR/HF; top up or repay to
   defend; 60-second survival with HF above 1.00. The docs' own example
   ($300/$100 → CCR 3.00) is reproduced in the test suite.
4. **Liquidation Defense** — a 45-second storm. A passive player *is*
   liquidated (verified by the suite: twice, ending poorer but solvent)
   and continues; active defense avoids it entirely. The vault's take —
   repaid debt + fee/discount — is itemized in the log.
5. **Full Cycle** — supply → collateral → borrow → fund stable balance →
   settlements (reserve first, collateral second — both branches verified)
   → repay in full → withdraw; checklist UI, JURIS concept rewards,
   150-second timer.

Each level opens with a plain-language explainer card using the docs'
own terminology (margin account, CCR, health factor, stable balance,
Liquidation Vault), and ends with a one-question checkpoint quiz —
wrong answers get a note and a retry, no punishment; progression is
gated on the correct answer. Stars (1–3 per level) score speed and
discipline; progress persists in `localStorage`; any finished level can
be replayed from the map. The final screen lists the five concepts
learned and repeats the disclaimer.

## Verification — checks-headless.js

**67 checks, 0 failures, across 3 consecutive full runs** (plus the
iterative runs during development). Coverage:

- Static: disclaimer in all four placements (markup regions + rendered
  DOM), zero network/wallet/external-resource strings in the entire file,
  both real Juris SVG paths embedded exactly, brand palette present,
  placeholder labeling present (≥3 `SIMULATOR PLACEHOLDER` tags), the
  docs-example caveat printed, supply APR constant = 0.0375 exactly.
- Level gating: Level 2 locked until Level 1 + quiz are done; quiz
  wrong-answer rejection and no-proceed-on-wrong; correct answer via a
  real button dispatch.
- Level 1 completed by scripted button taps; interest accrual within the
  expected band for 5,000 × 3.75% at the stated time compression.
- Level 2: no-collateral borrow refused; max-borrow formula; a borrow
  that would breach minimum CCR rejected with an on-screen explanation —
  then a clean completion at CCR exactly 2.50.
- Health math: position responses (price drop ↓, top-up ↑, repay ↑) and
  the docs' worked example CCR = 3.00 reproduced to 1e-6.
- Liquidation: no trigger at CCR 1.502, trigger at 1.498 (strictly
  below), exactly 50% of debt repaid, collateral seized = repaid × 1.10
  ÷ price, and **one penalty per crossing** (12 further underwater ticks
  add no second penalty).
- Level 3: scripted defender survives the full 60 s, zero liquidations,
  price path verified to actually swing (min < $0.085 from $0.10).
- Level 4: passive run liquidated ≥ 1 (with the log line) and finishes
  solvent-but-poorer; defended run finishes with zero liquidations.
- Level 5: settlement amount matches Borrow APR math; stable balance is
  drained **before** collateral, and collateral is touched only for the
  exact remainder at the live price; full-cycle completion, scoring,
  graduation screen, `finished` progress with stars on all 5 levels.
- Persistence: progress (stars + finished state) survives a reload with
  the same storage; finished levels remain replayable.
- Markup integrity: all 53 element ids the script queries exist in the
  static HTML (checked separately, since the stub DOM auto-creates ids).

## Known limitations (honest list)

- One documented interface nuance is taught but not used as the primary
  display: the LuncSwapFun interface labels *raw CCR* as "Health". The
  game shows CCR and the docs-defined health factor side by side and
  says so in the Level 3 explainer.
- The real protocol supports baskets of collateral assets and multiple
  margin accounts per owner; the simulator uses one account and one
  collateral asset to keep the first lesson clean. The docs' "one stable
  reserve shared across an owner's accounts" point is stated in the
  Level 5 explainer's source page summary in-game text scope — the sim
  has a single account, so the sharing is described, not simulated.
- Vault share tokens / redemption queues (the depositor side of the
  Liquidation Vault) are out of scope: the vault appears in its
  borrower-facing role, as in the docs' liquidation flow.
