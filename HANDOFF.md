# Juris Academy — Handoff Notes

## What this is
A learning-simulator game that teaches beginners how Juris Protocol's lending/borrowing works, by playing it with play money: supply → borrow → health factor → liquidation defense → full cycle. 5 short levels, a one-question checkpoint between levels, stars per level.

## Hard rules baked in (do not remove)
- **Play money only.** All balances are SIM tokens. No real value anywhere.
- **No connection to the protocol.** The game contains zero network calls, zero wallet code, no links into the live app. Fully standalone by design.
- **Disclaimers stay.** "LEARNING SIMULATOR — play money only · Not connected to Juris Protocol · Not financial advice" appears on the title screen, on a banner on every screen, and on the end screens. The test suite fails if these strings or the no-network rule are broken.

## Files
- `index.html` — the entire game in one file. No dependencies, no build step. Host it anywhere static (your site, GitHub Pages, Vercel, Netlify) or just open it in a browser.
- `checks-headless.js` — headless test suite (`node checks-headless.js`). Run it after any change; it verifies the disclaimers, the no-network rule, the mechanics math, and that every level is completable.
- `BUILD_REPORT.md` — the grounding record: every mechanic and number traced to the Juris docs page it came from, plus the simplifications list.

## Numbers your team should review first
Three parameters are NOT published in the Juris docs, so the game uses clearly-labeled **SIMULATOR PLACEHOLDER** values (the label shows in-game where players see them):
- Minimum collateral ratio (game: 1.50)
- Liquidation fee / bid discount (game: 10% combined)
- Close factor — share repaid per liquidation (game: 50%)

Drop in the real values and the game matches your live parameters. Everything else — the health-factor formula (CCR ÷ minimum CCR), liquidation only when CCR falls strictly below the minimum, the supply-APR relationship (incl. the docs' 3.75% worked example), and settlement taking the stable balance before collateral — is implemented exactly as your docs describe.

## One open design choice (your call)
The checkpoint quiz between levels is currently **skippable**: stars and the next level unlock when the player hits the level goal, and "Back to level map" walks past the question (it only gates the final graduation flag). If you'd rather the quiz be required to advance, that's a small change in the level-end flow — it was left open deliberately so your team can decide.

## Continuing the build
It's one plain HTML file (canvas + DOM, vanilla JS). Any dev can extend it: new levels follow the same pattern as the existing five, and the checks file shows how to add a test per mechanic. Branding (colours, token mark) came from jurisprotocol.com.

Built for the Juris team to own: host it, change it, ship it.
