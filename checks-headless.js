'use strict';
/* Juris Academy — headless checks. Loads the page's real <script> against
   a stub DOM (same pattern as the Luna games suites) and drives the game
   through its window.JA test API plus real button dispatches.
   No network. Usage: node checks-headless.js [page.html] */
const fs = require('fs'); const vm = require('vm');

const PAGE = process.argv[2] || '/home/hatch/workspace/juris-academy/index.html';
const SVG_FILE = '/home/hatch/workspace/juris-assets/juris-token.svg';
const DISCLAIMER = 'LEARNING SIMULATOR — play money only · Not connected to Juris Protocol · Not financial advice';

let pass = 0, fail = 0;
function check(name, cond, detail){
  if (cond){ pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}
function info(msg){ console.log('  ..  ' + msg); }
const approx = (a, b, tol) => Math.abs(a - b) <= (tol || 0.01);

function loadPage(path, sharedStore){
  const html = fs.readFileSync(path, 'utf8');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]);
  const src = blocks.sort((a, b) => b.length - a.length)[0];
  const scriptObj = new vm.Script(src);
  const gradStub = { addColorStop(){} };
  const textCalls = [];
  const ctxStub = { fillStyle:'', strokeStyle:'', lineWidth:1, lineCap:'', globalAlpha:1,
    font:'', textAlign:'', textBaseline:'',
    save(){}, restore(){}, beginPath(){}, closePath(){}, moveTo(){}, lineTo(){},
    arc(){}, ellipse(){}, rect(){}, fill(){}, stroke(){},
    fillRect(){}, clearRect(){}, strokeRect(){},
    fillText(t){ textCalls.push(String(t)); }, strokeText(){}, drawImage(){},
    createLinearGradient(){ return gradStub; }, createRadialGradient(){ return gradStub; }, setTransform(){} };
  const els = {};
  function makeEl(id){
    const ls = {};
    const el = { id, style: {}, value: '', disabled: false, className: '', onclick: null,
      width: 0, height: 0, children: [], dataset: {}, _text: '', _html: '',
      classList: { _s: new Set(),
        add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); },
        toggle(c, f){ if (f === undefined) f = !this._s.has(c); f ? this._s.add(c) : this._s.delete(c); },
        contains(c){ return this._s.has(c); } },
      addEventListener(t, fn){ (ls[t] = ls[t] || []).push(fn); },
      removeEventListener(){},
      dispatch(t, ev){ for (const fn of (ls[t] || [])) fn(ev || {}); if (t === 'click' && typeof el.onclick === 'function') el.onclick(ev || {}); },
      appendChild(c){ el.children.push(c); return c; },
      querySelectorAll(){ return []; },
      getBoundingClientRect(){ return { width: 100, height: 40, left: 0, top: 0, right: 100, bottom: 40 }; },
      setPointerCapture(){}, releasePointerCapture(){},
      getContext(){ return ctxStub; } };
    Object.defineProperty(el, 'textContent', {
      get(){ return el._text; }, set(v){ el._text = String(v); } });
    Object.defineProperty(el, 'innerHTML', {
      get(){ return el._html; }, set(v){ el._html = String(v); el.children.length = 0; } });
    return el;
  }
  const store = sharedStore || {};
  let rafCb = null;
  const winLs = {}, docLs = {};
  const documentStub = { hidden: false,
    getElementById(id){ return els[id] || (els[id] = makeEl(id)); },
    createElement(t){ return makeEl(t); },
    addEventListener(t, fn){ (docLs[t] = docLs[t] || []).push(fn); },
    querySelectorAll(){ return []; } };
  const sandbox = { console, setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: { getItem(k){ return k in store ? store[k] : null; }, setItem(k, v){ store[k] = String(v); }, removeItem(k){ delete store[k]; } },
    document: documentStub,
    navigator: {}, location: { href: 'about:blank' }, devicePixelRatio: 1,
    requestAnimationFrame(cb){ rafCb = cb; return 1; },
    addEventListener(t, fn){ (winLs[t] = winLs[t] || []).push(fn); } };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  scriptObj.runInContext(sandbox);
  return { JA: sandbox.JA, els, html, store, texts: textCalls };
}

function region(html, id){
  const i = html.indexOf('id="' + id + '"');
  if (i < 0) return '';
  const j = html.indexOf('id="screen', i + 10);
  return html.slice(i, j > 0 ? j : undefined);
}

(async () => {
/* ---------- 1. static: disclaimers, zero connection, brand ---------- */
console.log('== static / disclaimers / zero-connection / brand ==');
let env;
try { env = loadPage(PAGE); check('page script parses and boots', !!env.JA); }
catch (e){ check('page script parses and boots', false, e.message); process.exit(1); }
{
  const h = env.html;
  const occurrences = h.split(DISCLAIMER).length - 1;
  check('exact disclaimer string appears in title + banner + end + final markup (>=4)', occurrences >= 4, 'found ' + occurrences);
  check('disclaimer present in the title screen region', region(h, 'screenTitle').includes(DISCLAIMER));
  check('disclaimer present in the level-end screen region', region(h, 'screenEnd').includes(DISCLAIMER));
  check('disclaimer present in the final screen region', region(h, 'screenFinal').includes(DISCLAIMER));
  const banned = ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource',
    'keplr', 'leap', 'cosmos', 'wallet', 'http://', 'https://', '<a ', '<img', '<link', 'src='];
  const found = banned.filter(b => h.toLowerCase().includes(b.toLowerCase()));
  check('zero network / wallet / external-resource code anywhere in the file', found.length === 0, 'found: ' + found.join(', '));
  const svg = fs.readFileSync(SVG_FILE, 'utf8');
  const paths = [...svg.matchAll(/d="([^"]+)"/g)].map(m => m[1]);
  check('real Juris token SVG loaded for comparison (2 paths)', paths.length === 2, 'paths=' + paths.length);
  check('both real Juris mark paths are embedded in the game (exact match)',
    paths.every(p => h.includes(p)));
  check('Juris palette sampled: navy #132452 + red #CC051C in theme',
    h.includes('#132452') && h.includes('#CC051C'));
  check('"Identical mechanics, simulated locally, no real value" framing printed in the panel',
    h.includes('Identical mechanics, simulated locally, no real value'));
  check('placeholder honesty: ccr_min + liquidation values labeled SIMULATOR PLACEHOLDER',
    (h.match(/SIMULATOR PLACEHOLDER/g) || []).length >= 3);
  check('docs example honesty: "example inputs, not current market rates" stated',
    h.includes('example inputs, not current market rates'));
  check('boots to the title screen', env.JA.screen() === 'title');
  check('persistent banner renders the disclaimer', env.els.simBanner.textContent === DISCLAIMER);
  check('title disclaimer renders the disclaimer', env.els.titleDisclaimer.textContent === DISCLAIMER);
  check('params: supply APR is the docs worked example 3.75%', approx(env.JA.PARAMS.SUPPLY_APR, 0.0375, 1e-9),
    'SUPPLY_APR=' + env.JA.PARAMS.SUPPLY_APR);
  check('level 2 is locked before level 1 is done',
    env.JA.startLevel(2) === false && env.JA.screen() === 'title');
}

/* ---------- 2. level 1: supply, interest, quiz gate ---------- */
console.log('== level 1: supply & interest ==');
{
  const e = env;
  check('level 1 starts', e.JA.startLevel(1) === true && e.JA.screen() === 'game');
  const labels = e.JA.actionLabels();
  check('supply buttons are wired with real labels', labels.some(l => l.includes('Supply 2,500 SIM-LUNC')), labels.join(' | '));
  e.JA.clickAction(1); e.JA.clickAction(1); /* two × Supply 2,500 via real button dispatch */
  let st = e.JA.state();
  check('two button taps supplied 5,000 SIM-LUNC', st.supplied === 5000, 'supplied=' + st.supplied);
  for (let i = 0; i < 16; i++) e.JA.step(1);
  st = e.JA.state();
  check('interest accrues at the docs supply APR (5,000 × 3.75%, 1s≈10d)', st.earned >= 60 && st.earned < 95, 'earned=' + st.earned.toFixed(2));
  check('level 1 goal met → level-end screen', st.done === true && e.JA.screen() === 'end', 'done=' + st.done + ' screen=' + e.JA.screen());
  check('stars recorded + level 2 unlocked in progress',
    (e.JA.progress().stars[1] || 0) >= 1 && e.JA.progress().unlocked === 2);
  check('level-end screen shows stars', /★/.test(e.els.endStars.textContent), e.els.endStars.textContent);
  e.JA.proceedFromEnd();
  check('checkpoint quiz opens after level end', e.JA.screen() === 'quiz' && e.JA.quizLevel() === 1);
  const wrong = e.JA.answer(1);
  check('wrong quiz answer is rejected without punishment', wrong === false && e.JA.screen() === 'quiz');
  check('cannot proceed past the quiz on a wrong answer', e.JA.proceedFromQuiz() === false && e.JA.screen() === 'quiz');
  /* answer correctly via a REAL option-button dispatch (option 0 is correct) */
  e.els.quizOpts.children[0].dispatch('click');
  check('correct quiz answer unlocks the continue button', e.els.btnQuizNext.style.display === 'block');
  check('proceed after correct answer returns to the map', e.JA.proceedFromQuiz() === true && e.JA.screen() === 'title');
}

/* ---------- 3. level 2: borrow cap mirrors the contract check ---------- */
console.log('== level 2: collateral & borrow limits ==');
{
  const e = env;
  check('level 2 starts (unlocked by level 1)', e.JA.startLevel(2) === true);
  e.JA.act('borrow', 100);
  let st = e.JA.state();
  check('borrow with no collateral is refused', st.debt === 0);
  e.JA.act('deposit', 2500);
  st = e.JA.state();
  check('max borrow = collateral value ÷ minimum CCR', approx(st.maxBorrow, 250 / 1.5, 0.5), 'maxBorrow=' + st.maxBorrow.toFixed(2));
  e.JA.act('borrow', 100);
  const okBorrow = e.JA.act('borrow', 100); /* post-borrow CCR would be 1.25 < 1.50 */
  st = e.JA.state();
  check('borrow that would breach minimum CCR is rejected like the contract check', okBorrow === false && st.debt === 100, 'debt=' + st.debt);
  check('rejection is explained on screen', /Rejected/.test(e.els.actMsg.textContent), e.els.actMsg.textContent);
  e.JA.toTitle();
  /* clean completion run */
  e.JA.startLevel(2);
  e.JA.act('deposit', 5000); e.JA.act('borrow', 100); e.JA.act('borrow', 100);
  st = e.JA.state();
  check('borrowing 200 against 5,000 @ $0.10 gives CCR exactly 2.50', approx(st.ccr, 2.5, 1e-6), 'ccr=' + st.ccr);
  check('level 2 goal met (borrowed ≥200 with CCR ≥ 2.00)', st.done === true && e.JA.screen() === 'end');
  e.JA.proceedFromEnd(); e.JA.answer(0); e.JA.proceedFromQuiz();
  check('level 3 unlocked after level 2 + quiz', e.JA.progress().unlocked === 3 && e.JA.screen() === 'title');
}

/* ---------- 4. health-factor math (docs example + responses) ---------- */
console.log('== health factor math ==');
{
  const e = env;
  e.JA.startLevel(3);
  let st = e.JA.state();
  check('opening position: CCR 2.50, health factor 1.67', approx(st.ccr, 2.5, 1e-6) && approx(st.hf, 2.5 / 1.5, 1e-4), 'ccr=' + st.ccr + ' hf=' + st.hf);
  e.JA.debugSet({ collateral: 3000, debt: 100 }); e.JA.setPrice(0.10);
  st = e.JA.state();
  check('docs worked example reproduced: $300 collateral / $100 debt → CCR 3.00', approx(st.ccr, 3.0, 1e-6), 'ccr=' + st.ccr);
  e.JA.setPrice(0.08);
  const dropped = e.JA.state();
  check('a price drop lowers CCR and health factor', dropped.ccr < st.ccr && dropped.hf < st.hf, 'ccr ' + st.ccr.toFixed(2) + '→' + dropped.ccr.toFixed(2));
  e.JA.act('topup', 1000);
  const topped = e.JA.state();
  check('topping up collateral raises the ratio', topped.ccr > dropped.ccr, 'ccr→' + topped.ccr.toFixed(2));
  e.JA.act('repay', 50);
  const repaid = e.JA.state();
  check('repaying debt raises the ratio', repaid.ccr > topped.ccr, 'ccr→' + repaid.ccr.toFixed(2));
  e.JA.toTitle();
}

/* ---------- 5. level 3 scripted survival ---------- */
console.log('== level 3: scripted survival ==');
{
  const e = env;
  e.JA.startLevel(3);
  let minPrice = 1, guard = 0;
  while (guard++ < 400){
    const st = e.JA.state();
    if (st.done || st.failed) break;
    if (st.price < minPrice) minPrice = st.price;
    if (st.hf !== null && st.hf < 1.45){
      if (st.purseUstc >= 50 && st.debt > 100) e.JA.act('repay', 50);
      else if (st.purseLunc >= 1000) e.JA.act('topup', 1000);
    }
    e.JA.step(0.25);
  }
  const st = e.JA.state();
  check('the simulated price really swung (min < $0.085)', minPrice < 0.085, 'minPrice=' + minPrice.toFixed(4));
  check('scripted player survives 60s with no liquidation', st.done === true && st.liquidations === 0,
    'done=' + st.done + ' failed=' + st.failed + ' liq=' + st.liquidations + ' elapsed=' + st.elapsed.toFixed(0));
  check('health stayed above the danger line (minHF ≥ 1.00)', st.minHF === null || st.minHF >= 1.0, 'minHF=' + st.minHF);
  e.JA.proceedFromEnd(); e.JA.answer(0); e.JA.proceedFromQuiz();
  check('level 4 unlocked', e.JA.progress().unlocked === 4);
}

/* ---------- 6. liquidation: exact threshold, penalty once ---------- */
console.log('== liquidation threshold & single penalty ==');
{
  const e = env;
  e.JA.startLevel(4);
  e.JA.debugSet({ collateral: 6000, debt: 300, purseLunc: 0, purseUstc: 0 });
  e.JA.setPrice(0.0751); /* CCR = 450.6/300 = 1.502, just above the line */
  check('just above minimum CCR: no liquidation', e.JA.checkLiquidation() === false && e.JA.state().liquidations === 0,
    'ccr=' + e.JA.state().ccr);
  e.JA.setPrice(0.0749); /* CCR = 449.4/300 = 1.498, strictly below */
  check('strictly below minimum CCR: liquidation triggers', e.JA.checkLiquidation() === true);
  let st = e.JA.state();
  const expectSeize = Math.min(6000, (150 * 1.10) / 0.0749);
  check('liquidation repays 50% of debt', approx(st.debt, 150, 1e-6), 'debt=' + st.debt);
  check('collateral seized = repaid × (1 + 10% cost) at current price', approx(st.collateral, 6000 - expectSeize, 1.5),
    'collateral=' + st.collateral.toFixed(1) + ' expected≈' + (6000 - expectSeize).toFixed(1));
  check('exactly one liquidation event so far', st.liquidations === 1);
  /* keep the position underwater: the penalty must NOT re-fire per tick */
  e.JA.debugSet({ collateral: 1000, debt: 300 }); e.JA.setPrice(0.10); /* CCR 0.33, still below */
  for (let i = 0; i < 12; i++) e.JA.step(0.25);
  st = e.JA.state();
  check('penalty applies once per crossing — no per-tick machine gun', st.liquidations === 1, 'liquidations=' + st.liquidations);
  e.JA.toTitle();
}

/* ---------- 7. level 4 storm: liquidation happens, still survivable --- */
console.log('== level 4: storm round ==');
{
  const e = env;
  /* Run A — passive: the storm MUST liquidate an idle player (the lesson),
     and the position continues poorer rather than ending the game. */
  e.JA.startLevel(4);
  let guard = 0;
  while (guard++ < 300){
    const st = e.JA.state();
    if (st.done || st.failed) break;
    e.JA.step(0.25);
  }
  let st = e.JA.state();
  const sawLiqLog = st.log.some(l => l.includes('LIQUIDATION'));
  check('passive player gets liquidated by the storm (the lesson lands)', st.liquidations >= 1 && sawLiqLog,
    'liquidations=' + st.liquidations);
  check('after liquidation the run continues poorer, not game-over', st.done === true && st.collateral > 0 && st.collateral < 6000,
    'done=' + st.done + ' failed=' + st.failed + ' collateral=' + st.collateral.toFixed(0));
  e.JA.proceedFromEnd(); e.JA.answer(0); e.JA.proceedFromQuiz();
  check('level 5 unlocked', e.JA.progress().unlocked === 5);
  /* Run B — active defense: reacting in the danger zone avoids liquidation. */
  e.JA.startLevel(4);
  guard = 0;
  while (guard++ < 300){
    const s2 = e.JA.state();
    if (s2.done || s2.failed) break;
    if (s2.hf !== null && s2.hf < 1.20){
      if (s2.purseUstc >= 100) e.JA.act('repay', 100);
      else if (s2.purseLunc >= 2500) e.JA.act('topup', 2500);
      else if (s2.purseUstc >= 50) e.JA.act('repay', 50);
    }
    e.JA.step(0.25);
  }
  st = e.JA.state();
  check('active defense survives the storm with no liquidation', st.done === true && st.liquidations === 0,
    'done=' + st.done + ' failed=' + st.failed + ' (' + (st.failReason || '') + ') liquidations=' + st.liquidations);
  e.JA.toTitle();
}

/* ---------- 8. settlement order + level 5 full cycle ---------- */
console.log('== level 5: settlement order & full cycle ==');
{
  const e = env;
  e.JA.startLevel(5);
  e.JA.act('supply', 2500); e.JA.act('supply', 2500);
  e.JA.act('deposit', 2500); e.JA.act('deposit', 2500);
  e.JA.act('borrow', 100); e.JA.act('borrow', 100);
  e.JA.act('fundstable', 50);
  let st = e.JA.state();
  check('cycle tasks so far: supplied, deposited, borrowed, funded all ticked',
    st.tasks.supplied && st.tasks.deposited && st.tasks.borrowed && st.tasks.funded);
  const collBefore = st.collateral, stableBefore = st.stable;
  const due = e.JA.settleNow();
  st = e.JA.state();
  check('settlement charges borrow interest (200 × 10% × 100d/365 ≈ 5.48)', approx(due, 200 * 0.10 * 100 / 365, 0.02), 'due=' + due.toFixed(3));
  check('settlement pays from the stable balance FIRST', approx(st.stable, stableBefore - due, 0.01) && approx(st.collateral, collBefore, 1e-9),
    'stable ' + stableBefore + '→' + st.stable.toFixed(2) + ', collateral ' + collBefore + '→' + st.collateral);
  e.JA.debugSet({ stable: 1 });
  const priceNow = e.JA.state().price;
  const due2 = e.JA.settleNow();
  st = e.JA.state();
  const expectColl = collBefore - (due2 - 1) / priceNow;
  check('when the reserve runs short, the remainder comes out of collateral', approx(st.collateral, expectColl, 1.5),
    'collateral=' + st.collateral.toFixed(1) + ' expected≈' + expectColl.toFixed(1));
  e.JA.act('repayall', 0);
  e.JA.act('withdrawall', 0);
  st = e.JA.state();
  check('full cycle completes: repaid in full + collateral withdrawn', st.done === true && st.tasks.repaid && st.tasks.withdrawn,
    'done=' + st.done + ' debt=' + st.debt + ' collateral=' + st.collateral);
  check('level 5 scored with stars', st.score > 0 && st.stars >= 1, 'score=' + st.score + ' stars=' + st.stars);
  e.JA.proceedFromEnd(); e.JA.answer(0);
  check('final quiz proceeds to the graduation screen', e.JA.proceedFromQuiz() === true && e.JA.screen() === 'final');
  check('progress marked finished with stars on all 5 levels',
    e.JA.progress().finished === true && Object.keys(e.JA.progress().stars).length === 5,
    JSON.stringify(e.JA.progress().stars));
}

/* ---------- 9. persistence across a reload ---------- */
console.log('== persistence ==');
{
  const e2 = loadPage(PAGE, env.store);
  const p = e2.JA.progress();
  check('progress survives a reload (stars + finished)', p.finished === true && Object.keys(p.stars).length === 5);
  check('total stars render on the title after reload', /\(5\/15\)|\(\d+\/15\)/.test(e2.els.totalStars.textContent) && totalOf(p) >= 5,
    e2.els.totalStars.textContent);
  function totalOf(pr){ let t = 0; for (const k in pr.stars) t += pr.stars[k]; return t; }
  check('all levels replayable after finishing (level 1 starts)', e2.JA.startLevel(1) === true);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
})();
