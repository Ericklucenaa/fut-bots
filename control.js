// Painel do FUT Bots: configura os módulos, mostra o dashboard e conversa com o motor no Web App.
'use strict';
const { ladderDown, ladderUp, ladderPrev, net, fmt, norm, num, SPEEDS, RESTS, TRIES, RUNFOR, DEF, STRAT_KEYS, PRESETS, KIND, DAY, HOUR, riskLevel, THEMES, applyTheme, DEST, SELLHOW, FALLBACK, destName, fixCfg, MODS, GAL_DEF, REL_DEF, VERSION, DONATE_URL, REPO_URL } = FSB;
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ico = (id, cls = '') => `<svg class="${cls}"><use href="#i-${id}"/></svg>`;
const store = chrome.storage.local;
const WEBAPP = 'https://www.ea.com/ea-sports-fc/ultimate-team/web-app/';

// ---------- estado ----------
const st = {
  cfg: { ...DEF }, filters: [], alerts: {}, presets: [], events: [], bank: [], prices: {}, logs: [], reqs: [], schema: null,
  draft: { player: '', playerRating: null, sel: {} }, galCfg: { ...GAL_DEF }, relCfg: { ...REL_DEF }, galBuys: [],
};
const FIX = { cfg: v => ({ ...DEF, ...fixCfg(v || {}) }), galCfg: v => ({ ...GAL_DEF, ...(v || {}) }), relCfg: v => ({ ...REL_DEF, ...(v || {}) }) };
let status = null, tabId = null, page = 'home';
const saveCfg = () => store.set({ cfg: st.cfg });
const save = k => store.set({ [k]: st[k] });
const setTheme = () => applyTheme(document.documentElement, st.cfg.theme);

function toast(m, cls = '') {
  const t = $('toast'); t.textContent = m; t.className = 'toast ' + cls; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 4200);
}

// ---------- conversa com o Web App ----------
async function findTab() {
  const tabs = await chrome.tabs.query({ url: 'https://www.ea.com/*' });
  const t = tabs.find(x => /ultimate-team\/web-app/.test(x.url || ''));
  tabId = t ? t.id : null;
  return t;
}
async function send(msg) {
  if (!tabId && !(await findTab())) throw new Error('Abra o Web App do EA FC numa aba (e faça login).');
  let r;
  try { r = await chrome.tabs.sendMessage(tabId, msg); }
  catch { tabId = null; throw new Error('O bot não respondeu no Web App. Recarregue a aba do Web App (F5).'); }
  if (!r || !r.ok) throw new Error((r && r.error) || 'sem resposta');
  return r.data;
}
const modCmd = (mod, op, extra = {}) => send({ mod, op, ...extra });
const snipeCmd = (op, extra) => modCmd('snipe', op, extra);
async function act(btn, fn) {
  const old = btn && btn.innerHTML;
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  try { return await fn(); } catch (e) { toast(e.message, 'bad'); } finally { if (btn) { btn.disabled = false; btn.innerHTML = old; } }
}
async function poll() {
  try {
    if (!tabId) await findTab();
    status = tabId ? await send({ cmd: 'status' }) : null;
  } catch { status = null; }
  renderStatus();
}
setInterval(poll, 600);

// ---------- carregar ----------
store.get(null, r => {
  for (const k of Object.keys(st)) if (r[k] !== undefined) st[k] = FIX[k] ? FIX[k](r[k]) : r[k];
  setTheme(); buildStatic(); renderAll(); poll();
});
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== 'local') return;
  for (const [k, v] of Object.entries(ch)) if (k in st) st[k] = FIX[k] ? FIX[k](v.newValue) : v.newValue ?? (Array.isArray(st[k]) ? [] : k === 'schema' ? null : {});
  if (ch.logs) renderLog();
  if (ch.schema) renderFilterGrid();
  if (ch.filters) renderFilters();
  if (ch.cfg) { setTheme(); refreshInputs(); sync(); }
  if (ch.galCfg || ch.relCfg) { if (page === 'gal' || page === 'rel') renderPage(); syncBars(); }
  if (ch.events || ch.bank || ch.prices || ch.reqs || ch.galBuys) {
    renderRisk();
    if (page === 'home') renderHome(true);
    else if (!['sniper', 'gal', 'rel', 'settings', 'docs'].includes(page)) renderPage();
    else if (page === 'gal' && ch.galBuys && galUi.tab === 'pl') renderPage();
  }
});

// ---------- navegação ----------
const PAGES = {};   // páginas extras (control-mods.js)
const SNIPE_PAGES = ['sniper', 'mkt', 'strat', 'sim'];
for (const b of $('nav').querySelectorAll('button')) b.onclick = () => go(b.dataset.page);
document.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if (g) go(g.dataset.goto); });
function go(p) {
  page = p;
  for (const b of $('nav').querySelectorAll('button')) b.classList.toggle('on', b.dataset.page === p);
  for (const s of document.querySelectorAll('.page')) s.classList.toggle('on', s.id === 'p-' + p);
  $('barSnipe').hidden = !SNIPE_PAGES.includes(p);
  $('barGal').hidden = p !== 'gal';
  $('barRel').hidden = p !== 'rel';
  try { localStorage.setItem('futbots_page', p); } catch {}
  renderPage(); syncBars();
}

// ---------- campos do sniper ----------
const NUMS = { maxBuy: 200, minBuy: 0, sellPrice: 0, sellPct: 1, profitPct: 1, recheckMin: 2, maxBuys: 0, maxSpend: 0, waitMin: 200, waitMax: 200, dailyMax: 0 };
const PRICE = new Set(['maxBuy', 'minBuy', 'sellPrice']);
const fixPrice = (k, v) => !v ? (k === 'maxBuy' ? 200 : 0) : ladderDown(Math.max(k === 'maxBuy' ? 200 : 150, v));
const TOGGLES = ['rotate', 'useFilterMax', 'noLoss', 'rotateFilters'];
const DEST_ICO = { club: 'club', transfer: 'tl', keep: 'keep', sell: 'sell' };
function buildStatic() {
  $('ver').textContent = 'versão ' + VERSION;
  $('kofi').href = DONATE_URL; $('repo').href = REPO_URL;
  const opts = (o, f = v => v) => Object.entries(o).map(([v, t]) => `<option value="${v}">${esc(f(t))}</option>`).join('');
  $('dests').innerHTML = Object.entries(DEST).map(([k, d]) => `<button class="dest" data-v="${k}">${ico(DEST_ICO[k])}<b>${esc(d.name)}</b><small>${esc(d.hint)}</small></button>`).join('');
  $('sellHow').innerHTML = Object.entries(SELLHOW).map(([k, t]) => `<button data-v="${k}">${esc(t)}</button>`).join('');
  $('fallback').innerHTML = opts(FALLBACK);
  $('dests').onclick = e => { const b = e.target.closest('[data-v]'); if (!b || b.disabled) return; st.cfg.dest = b.dataset.v; dirtyPreset(); saveCfg(); sync(); };
  $('sellHow').onclick = e => { const b = e.target.closest('[data-v]'); if (!b || b.disabled) return; st.cfg.sellHow = b.dataset.v; dirtyPreset(); saveCfg(); sync(); };
  $('speed').innerHTML = opts(SPEEDS, s => s.name + (s.wait ? ` · ${(s.wait[0] / 1000).toFixed(1)}–${(s.wait[1] / 1000).toFixed(1)} s` : ''));
  $('runFor').innerHTML = opts(RUNFOR);
  $('tries').innerHTML = TRIES.map(t => `<button data-v="${t}">até ${t}</button>`).join('');
  $('rest').innerHTML = Object.entries(RESTS).map(([v, t]) => `<button data-v="${v}">${t}</button>`).join('');
  for (const [k, lo] of Object.entries(NUMS)) $(k).onchange = () => {
    let v = Math.max(lo, num($(k).value) || 0);
    if (PRICE.has(k)) v = fixPrice(k, v);
    st.cfg[k] = v; $(k).value = v; dirtyPreset(); saveCfg(); sync();
  };
  for (const b of document.querySelectorAll('#p-sniper [data-step]')) b.onclick = () => {
    const k = b.dataset.step, v = st.cfg[k] || 0;
    let n = +b.dataset.d > 0 ? ladderUp(v) : ladderPrev(v);
    if (k === 'maxBuy') n = Math.max(200, n); else if (n && n < 150) n = 0;
    st.cfg[k] = n; $(k).value = n; dirtyPreset(); saveCfg(); sync();
  };
  for (const k of TOGGLES) $(k).onchange = () => { st.cfg[k] = $(k).checked; dirtyPreset(); saveCfg(); sync(); };
  for (const k of ['fallback', 'speed']) $(k).onchange = () => { st.cfg[k] = $(k).value; dirtyPreset(); saveCfg(); sync(); };
  $('runFor').onchange = () => { st.cfg.runFor = +$('runFor').value; dirtyPreset(); saveCfg(); sync(); };
  $('tries').onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; st.cfg.tries = +b.dataset.v; dirtyPreset(); saveCfg(); sync(); };
  $('rest').onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; st.cfg.rest = b.dataset.v; dirtyPreset(); saveCfg(); sync(); };
  $('segMode').onclick = e => { const b = e.target.closest('button'); if (!b || running()) return; st.cfg.mode = b.dataset.v; dirtyPreset(); saveCfg(); sync(); };
  $('segRun').onclick = e => { const b = e.target.closest('button'); if (!b || running()) return; st.cfg.run = b.dataset.v; saveCfg(); sync(); };
  $('preset').onchange = () => applyPreset($('preset').value);
  $('go').onclick = () => act(null, async () => {
    if (running()) { await send({ cmd: 'stop' }); return; }
    await snipeCmd('start'); toast('Snipe iniciado no Web App.', 'good');
  });
  $('runStop').onclick = () => send({ cmd: 'stop' }).then(() => toast('Parando…'), e => toast(e.message, 'bad'));
  $('openWA').onclick = () => chrome.tabs.create({ url: WEBAPP });
  $('cYes').onclick = () => snipeCmd('confirm', { v: true }).catch(e => toast(e.message, 'bad'));
  $('cNo').onclick = () => snipeCmd('confirm', { v: false }).catch(e => toast(e.message, 'bad'));
  document.addEventListener('click', e => {
    const dl = e.target.closest('[data-logdl]'), cl = e.target.closest('[data-logclr]');
    if (dl) { const s = dl.dataset.logdl; download(`fut-bots-log-${s}.txt`, logsOf(s).map(l => `${new Date(l.t).toLocaleString('pt-BR')}  [${srcName(l.src)}] ${l.m}`).join('\r\n'), 'text/plain'); }
    if (cl) clearData('logs', cl.dataset.logclr === 'all' ? '' : cl.dataset.logclr);
  });
  buildFilterUi();
  if (typeof buildMods === 'function') buildMods();
}
const running = () => !!(status && status.snipe && status.snipe.running);
const busy = () => !!(status && status.owner);
function dirtyPreset() { if (st.cfg.preset) { st.cfg.preset = ''; renderPresetSelect(); } }
function refreshInputs() {
  for (const k of Object.keys(NUMS)) if (document.activeElement !== $(k)) $(k).value = st.cfg[k];
  for (const k of TOGGLES) $(k).checked = !!st.cfg[k];
  $('fallback').value = st.cfg.fallback; $('speed').value = st.cfg.speed; $('runFor').value = String(st.cfg.runFor);
}
function sync() {
  const c = st.cfg, run = running();
  for (const b of $('segMode').querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === c.mode);
  for (const b of $('segRun').querySelectorAll('button')) { b.classList.toggle('on', b.dataset.v === c.run); b.disabled = run; }
  for (const b of $('tries').querySelectorAll('button')) b.classList.toggle('on', +b.dataset.v === c.tries);
  for (const b of $('rest').querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === c.rest);
  const profit = c.mode === 'profit';
  $('fOffer').hidden = profit; $('tgFilterMax').hidden = profit;
  $('fProfit').hidden = $('fRecheck').hidden = !profit;
  $('fCustom').hidden = c.speed !== 'custom';
  $('maxBuy').disabled = c.useFilterMax || run;
  for (const b of $('dests').children) b.classList.toggle('on', b.dataset.v === c.dest);
  for (const b of $('sellHow').children) b.classList.toggle('on', b.dataset.v === c.sellHow);
  const sell = c.dest === 'sell';
  $('sellBox').hidden = !sell;
  $('fSellPrice').hidden = c.sellHow !== 'fixed'; $('fSellPct').hidden = c.sellHow !== 'margin';
  $('tgNoLoss').hidden = c.sellHow === 'margin';
  $('fallback').closest('.field').hidden = c.dest === 'keep';
  const ex = c.mode === 'price' ? c.maxBuy : 1000;
  const mp = ladderUp(Math.ceil(ex * (1 + c.sellPct / 100) / 0.95));
  $('sellHint').innerHTML = c.sellHow === 'margin' ? `Ex.: comprou por <b>${fmt(ex)}</b> → anuncia por <b>${fmt(mp)}</b> (recebe ${fmt(net(mp))} depois dos 5% do EA).`
    : c.sellHow === 'fixed' ? (c.sellPrice ? `Anuncia por <b>${fmt(c.sellPrice)}</b> e recebe <b>${fmt(net(c.sellPrice))}</b> depois dos 5% do EA.` : (c.mode === 'profit' ? 'Preço 0 = vende pelo preço de mercado que o bot conferiu.' : '<span class="warn">Defina o preço de venda.</span>'))
    : 'Usa o botão "Mais barato" do Paletools e anuncia logo abaixo do mais barato.';
  $('bLimit').textContent = c.maxBuys ? fmt(c.maxBuys) : '∞';
  $('bSell').textContent = destName(c);
  $('bSpeed').textContent = (SPEEDS[c.speed] || {}).name || '';
  renderGo(); renderRisk();
}
function renderGo() {
  const c = st.cfg, g = $('go');
  if (running()) {
    g.classList.add('stop'); g.disabled = false;
    g.textContent = status.stopping ? 'Parando…' : `Parar${status.snipe.S && status.snipe.S.offer ? ` · ofertando até ${fmt(status.snipe.S.offer)}` : ''}`;
    return;
  }
  g.classList.remove('stop');
  if (busy()) { g.disabled = true; g.textContent = `${(MODS[status.owner] || {}).name || 'Outro módulo'} está trabalhando…`; return; }
  g.disabled = false;
  const v = c.mode === 'profit' ? `com ${c.profitPct}% de lucro` : c.useFilterMax ? 'até o máx. do Web App' : `por ${fmt(c.maxBuy)}`;
  g.textContent = `${c.run === 'test' ? 'Testar' : c.run === 'assist' ? 'Snipar (assistido)' : 'Snipar'} ${v}`;
}

// ---------- status ao vivo ----------
let lastRunning = null;
function renderStatus() {
  const conn = $('conn');
  if (!status) {
    conn.className = 'conn bad'; $('connT').textContent = tabId ? 'Web App aberto, mas o bot não respondeu (aperte F5 nele)' : 'Web App não está aberto';
    $('openWA').hidden = !!tabId;
  } else {
    conn.className = 'conn ok';
    $('connT').textContent = status.onSearch ? 'Web App conectado · Pesquisar no Mercado' : status.gal && status.gal.gallery ? 'Web App conectado · Galeria aberta' : status.onTL ? 'Web App conectado · Lista de Transferências' : 'Web App conectado';
    $('openWA').hidden = true;
    $('hCoins').textContent = fmt(status.coins);
    const S = (status.snipe && status.snipe.S) || {};
    $('bBought').textContent = fmt(st.cfg.run === 'test' ? S.dry : S.bought); $('bLost').textContent = fmt(S.lost); $('bSpent').textContent = fmt(S.spent);
  }
  // o que está rodando
  const o = status && status.owner;
  $('runbox').hidden = !o;
  if (o) $('runT').textContent = `${(MODS[o] || {}).name || o}: ${status.what}${status.since ? ` · ${Math.max(0, Math.floor((Date.now() - status.since) / 6e4))} min` : ''}${status.stopping ? ' · parando…' : ''}`;
  for (const b of $('nav').querySelectorAll('button')) {
    const live = o && ((o === 'snipe' && b.dataset.page === 'sniper') || (o === 'gal' && b.dataset.page === 'gal') || (o === 'rel' && b.dataset.page === 'rel'));
    let dot = b.querySelector('.live');
    if (live && !dot) b.insertAdjacentHTML('beforeend', '<span class="live"></span>');
    if (!live && dot) dot.remove();
  }
  const p = status && status.snipe && status.snipe.pending;
  $('confirm').hidden = !p;
  if (p) { $('cName').textContent = p.name; $('cPrice').textContent = fmt(p.price); $('cLeft').textContent = `${p.left}s para decidir`; }
  const r = running();
  if (r !== lastRunning) { lastRunning = r; for (const el of document.querySelectorAll('#p-sniper input, #p-sniper select, #p-sniper .pills button, #p-sniper [data-step], #p-sniper .dest, #p-sniper .seg button')) if (!el.closest('.logcard')) el.disabled = r; if (!r) sync(); }
  renderGo(); renderRisk(); syncBars();
  if (page === 'home' && typeof renderHome === 'function') renderHome(true);
  if (page === 'gal' && typeof galLive === 'function') galLive();
}
function renderRisk() {
  const r = riskLevel(st.reqs, st.events), cap = st.cfg.dailyMax || 2000;
  const ring = (id, v, c) => { $(id).style.setProperty('--v', Math.min(100, v)); $(id).style.setProperty('--c', `var(--${c})`); };
  $('gReqV').textContent = fmt(r.d); $('gReqM').textContent = st.cfg.dailyMax ? `de ${fmt(st.cfg.dailyMax)}` : 'sem limite';
  ring('gReq', r.d / cap * 100, r.d / cap > 0.85 ? 'bad' : r.d / cap > 0.6 ? 'warn' : 'good');
  const mins = running() && status.snipe.S ? Math.floor((Date.now() - status.snipe.S.t0) / 6e4) : 0, mcap = st.cfg.runFor || 120;
  $('gMinV').textContent = mins; $('gMinM').textContent = st.cfg.runFor ? `de ${st.cfg.runFor}` : 'sem limite';
  ring('gMin', mins / mcap * 100, 'good');
  $('gRiskV').textContent = r.t; $('gRiskV').className = r.c; $('gRiskM').textContent = `${r.h}/hora`;
  ring('gRisk', r.v, r.c);
  $('riskWhy').textContent = r.why.join(' · ');
  $('hReq').textContent = fmt(r.d); $('hRisk').textContent = r.t; $('hRisk').className = r.c;
  $('hProfit').textContent = fmt(profitToday()); $('hProfit').className = profitToday() > 0 ? 'good' : profitToday() < 0 ? 'bad' : '';
}
// lucro de hoje: snipe (estimado no anúncio) + galeria (vendas confirmadas)
function profitToday() {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const sn = st.events.filter(e => e.kind === 'bought' && e.t >= +t0 && e.profit != null).reduce((s, e) => s + e.profit, 0);
  const gl = st.galBuys.filter(b => b.status === 'sold' && (b.soldAt || b.t) >= +t0).reduce((s, b) => s + net(b.sale) - b.buy, 0);
  return sn + gl;
}

// ---------- log ----------
const srcName = s => (MODS[s] || {}).name || 'Geral';
const logsOf = s => s && s !== 'all' ? st.logs.filter(l => (l.src || 'snipe') === s) : st.logs;
function renderLog() {
  for (const el of document.querySelectorAll('.log[data-src]')) {
    const s = el.dataset.src, all = s === 'all';
    const stick = el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
    el.innerHTML = logsOf(s).slice(-300).map(l => `<div class="${l.c}"><time>${new Date(l.t).toLocaleTimeString('pt-BR')}</time>${all ? `<span class="src">${srcName(l.src || 'snipe')}</span>` : ''}${esc(l.m)}</div>`).join('') || '<div class="empty">Nada por aqui ainda.</div>';
    if (stick) el.scrollTop = el.scrollHeight;
  }
}
async function clearData(what, src = '') {
  try { await send({ cmd: 'clear', what, src }); } catch {
    if (what === 'logs') st.logs = src ? st.logs.filter(l => (l.src || 'snipe') !== src) : [];
    else st[what] = what === 'prices' ? {} : [];
    save(what);
  }
  if (what === 'logs') { if (!src) st.logs = []; else st.logs = st.logs.filter(l => (l.src || 'snipe') !== src); renderLog(); }
}

// ---------- filtro ----------
function buildFilterUi() {
  $('fRead').onclick = () => act($('fRead'), async () => { await snipeCmd('schema'); toast('Filtros do Web App lidos.', 'good'); });
  $('fCapture').onclick = () => act($('fCapture'), async () => {
    const f = await snipeCmd('capture');
    st.draft = { player: f.player, playerRating: null, sel: {} };
    f.ctls.forEach((t, i) => { if (isVal(i, t)) st.draft.sel[i] = t; });
    if (!st.schema || !st.schema.ctls.length) st.draft.raw = f.ctls;
    if (f.maxBuy) { st.cfg.maxBuy = fixPrice('maxBuy', f.maxBuy); st.cfg.mode = 'price'; }
    if (f.minBuy || f.maxBuy) st.cfg.minBuy = f.minBuy ? fixPrice('minBuy', f.minBuy) : 0;
    if (f.maxBuy || f.minBuy) { saveCfg(); refreshInputs(); sync(); }
    save('draft'); renderFilterGrid(); toast(`Filtro copiado do Web App${f.maxBuy ? ` (oferta ${fmt(f.maxBuy)})` : ''}.`, 'good');
  });
  $('fClear').onclick = () => { st.draft = { player: '', playerRating: null, sel: {} }; save('draft'); renderFilterGrid(); };
  $('fApply').onclick = () => act($('fApply'), async () => { await snipeCmd('apply', { filter: draftFilter('rascunho') }); toast('Filtro aplicado no Web App.', 'good'); });
  $('pSearch').onclick = () => act($('pSearch'), async () => {
    const q = norm($('pName').value);
    if (q.length < 3) throw new Error('Digite pelo menos 3 letras do nome.');
    const list = await snipeCmd('players', { q });
    if (!list.length) throw new Error('Nenhum jogador encontrado com esse nome.');
    $('pSugg').innerHTML = list.map((p, i) => `<button data-i="${i}">${esc(p.name)}<b>${p.rating || ''}</b></button>`).join('');
    $('pSugg').onclick = e => { const b = e.target.closest('button'); if (!b) return; const p = list[+b.dataset.i]; st.draft.player = p.name; st.draft.playerRating = p.rating; save('draft'); renderFilterGrid(); $('pSugg').innerHTML = ''; };
  });
  $('pName').onchange = () => { st.draft.player = norm($('pName').value); st.draft.playerRating = null; save('draft'); renderFilterGrid(); };
  $('fSave').onclick = () => {
    const f = draftFilter(norm($('fName').value) || describe(draftFilter('')) || 'Filtro ' + (st.filters.length + 1));
    const c = st.cfg;
    Object.assign(f, { id: 'f' + Date.now().toString(36), on: true, maxBuy: c.mode === 'price' && !c.useFilterMax ? c.maxBuy : 0,
      minBuy: c.minBuy || 0, mode: c.mode, profitPct: c.profitPct,
      dest: c.dest, sellHow: c.sellHow, sellPrice: c.sellPrice, sellPct: c.sellPct, fallback: c.fallback });
    st.filters.push(f); save('filters'); $('fName').value = ''; renderFilters(); toast(`Filtro "${f.name}" salvo.`, 'good');
  };
}
// t é um valor escolhido (está nas opções da caixa i), e não o nome padrão da caixa
function isVal(i, t) { const c = st.schema && st.schema.ctls[i]; return !!(t && c && c.options.includes(t)); }
function draftFilter(name) {
  const d = st.draft, n = st.schema ? st.schema.ctls.length : (d.raw || []).length;
  const ctls = st.schema ? st.schema.ctls.map((_, i) => d.sel[i] || '') : (d.raw || []).slice();
  return { name, player: d.player || '', playerRating: d.playerRating || null, ctls: ctls.length ? ctls : new Array(n).fill('') };
}
function describe(f) {
  const sc = st.schema && st.schema.ctls || [];
  const parts = [f.player ? `${f.player}${f.playerRating ? ' ' + f.playerRating : ''}` : '', ...(f.ctls || []).filter((t, i) => t && (sc.length ? isVal(i, t) : true))];
  return parts.filter(Boolean).join(' · ') || 'qualquer jogador';
}
function renderFilterGrid() {
  $('pName').value = st.draft.player || '';
  const g = $('fGrid'), sc = st.schema;
  if (!sc || !sc.ctls.length) {
    g.innerHTML = `<div class="empty" style="grid-column:1/-1">Abra <b>Transfer. → Pesquisar no Mercado</b> no Web App e clique em <b>Ler do Web App</b> para montar o filtro aqui (qualidade, raridade, posição, estilos, nação, liga, clube…).${st.draft.raw ? '<br>Um filtro copiado da tela já está pronto para salvar.' : ''}</div>`;
    return;
  }
  g.innerHTML = sc.ctls.map((c, i) => `<div class="fc"><small>${esc(c.label)}</small><select data-i="${i}" class="${st.draft.sel[i] ? 'set' : ''}"><option value="">Qualquer</option>${c.options.map(o => `<option${st.draft.sel[i] === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`).join('');
  g.onchange = e => { const s = e.target.closest('select'); if (!s) return; if (s.value) st.draft.sel[s.dataset.i] = s.value; else delete st.draft.sel[s.dataset.i]; s.className = s.value ? 'set' : ''; save('draft'); };
}
function renderFilters() {
  $('flist').innerHTML = st.filters.length ? st.filters.map(f => `
    <div class="fi" data-id="${f.id}">
      <input type="checkbox" ${f.on ? 'checked' : ''} title="Usar ao alternar filtros">
      <div class="n"><b>${esc(f.name)}</b><span>${esc(describe(f))}${f.mode === 'profit' ? ` · lucro ${f.profitPct}%` : ''}${f.minBuy ? ` · mín. ${fmt(f.minBuy)}` : ''}${f.dest ? ` · ${destName(f)}` : ''}</span></div>
      <input type="number" value="${f.maxBuy || ''}" placeholder="oferta" title="Valor de oferta deste filtro (vazio = o do painel)">
      <button data-a="use" title="Aplicar no Web App">▶</button><button data-a="edit" title="Carregar no editor">✎</button><button data-a="del" title="Apagar">✕</button>
    </div>`).join('') : '<div class="empty">Nenhum filtro salvo. Monte um ao lado e clique em Salvar filtro.</div>';
}
function loadFilterValues(f) {
  const c = st.cfg;
  if (f.mode) c.mode = f.mode;
  if (f.maxBuy) { c.maxBuy = f.maxBuy; c.mode = 'price'; c.useFilterMax = false; }
  if (f.minBuy != null) c.minBuy = f.minBuy;
  if (f.profitPct) c.profitPct = f.profitPct;
  if (f.dest) Object.assign(c, { dest: f.dest, sellHow: f.sellHow || c.sellHow, sellPrice: f.sellPrice || 0, sellPct: f.sellPct || c.sellPct, fallback: f.fallback || c.fallback });
  saveCfg(); refreshInputs(); sync();
}
$('flist').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const f = st.filters.find(x => x.id === b.closest('.fi').dataset.id); if (!f) return;
  if (b.dataset.a === 'del') { if (!confirm(`Apagar o filtro "${f.name}"?`)) return; st.filters = st.filters.filter(x => x !== f); save('filters'); renderFilters(); }
  if (b.dataset.a === 'edit') {
    st.draft = { player: f.player, playerRating: f.playerRating, sel: {} };
    (f.ctls || []).forEach((t, i) => { if (isVal(i, t)) st.draft.sel[i] = t; });
    if (!st.schema || !st.schema.ctls.length) st.draft.raw = f.ctls;
    save('draft'); renderFilterGrid(); $('fName').value = f.name; loadFilterValues(f);
    toast(`"${f.name}" carregado no editor.`, 'good');
  }
  if (b.dataset.a === 'use') act(b, async () => { await snipeCmd('apply', { filter: f }); loadFilterValues(f); toast(`"${f.name}" aplicado no Web App.`, 'good'); });
});
$('flist').addEventListener('change', e => {
  const f = st.filters.find(x => x.id === e.target.closest('.fi').dataset.id); if (!f) return;
  if (e.target.type === 'checkbox') f.on = e.target.checked;
  else { const v = num(e.target.value); f.maxBuy = v ? fixPrice('maxBuy', v) : 0; e.target.value = f.maxBuy || ''; }
  save('filters');
});

// ---------- estratégias ----------
const allPresets = () => [...PRESETS, ...st.presets];
function renderPresetSelect() {
  $('preset').innerHTML = '<option value="">Estratégia: personalizada</option>' +
    `<optgroup label="Prontas">${PRESETS.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</optgroup>` +
    (st.presets.length ? `<optgroup label="Minhas">${st.presets.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</optgroup>` : '');
  $('preset').value = allPresets().some(p => p.id === st.cfg.preset) ? st.cfg.preset : '';
}
function applyPreset(id) {
  const p = allPresets().find(x => x.id === id);
  st.cfg.preset = p ? p.id : '';
  if (p) st.cfg = { ...DEF, ...fixCfg({ ...st.cfg, ...p.cfg }), preset: p.id };
  saveCfg(); refreshInputs(); renderPresetSelect(); sync();
  if (p) toast(`Estratégia "${p.name}" carregada.`, 'good');
  if (page === 'strat') renderPage();
}

// ---------- gráfico de linha (uma série, crosshair + tooltip) ----------
const dfmt = t => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
function lineChart(el, pts, { label = '', yfmt = fmt, extra = () => '' } = {}) {
  if (pts.length < 2) { el.innerHTML = `<div class="empty">Ainda não há dados suficientes para o gráfico${label ? ' de ' + esc(label) : ''}.</div>`; return; }
  const W = 760, H = 230, L = 64, R = 14, Tp = 12, B = 26;
  const xs = pts.map(p => p.t), ys = pts.map(p => p.v);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const pad = (y1 - y0) * 0.08; y0 -= pad; y1 += pad;
  const X = t => L + (t - x0) / Math.max(1, x1 - x0) * (W - L - R);
  const Y = v => Tp + (1 - (v - y0) / (y1 - y0)) * (H - Tp - B);
  const grid = [0, 0.5, 1].map(f => { const v = y0 + (y1 - y0) * f; return `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:var(--line)"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" style="fill:var(--mut)" font-size="11">${esc(yfmt(v))}</text>`; }).join('');
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
  const last = pts[pts.length - 1];
  el.innerHTML = `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
    ${grid}
    <text x="${L}" y="${H - 7}" style="fill:var(--mut)" font-size="11">${esc(dfmt(x0))}</text>
    <text x="${W - R}" y="${H - 7}" style="fill:var(--mut)" font-size="11" text-anchor="end">${esc(dfmt(x1))}</text>
    <path d="${d}" fill="none" style="stroke:var(--a1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${X(last.t)}" cy="${Y(last.v)}" r="4" style="fill:var(--a1);stroke:var(--bg1)" stroke-width="2"/>
    <line class="xh" y1="${Tp}" y2="${H - B}" style="stroke:var(--mut)" stroke-dasharray="3 3" visibility="hidden"/>
    <circle class="hd" r="5" style="fill:var(--a1);stroke:var(--bg1)" stroke-width="2" visibility="hidden"/>
    <rect x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent" class="hit"/>
  </svg><div class="tip"></div></div>`;
  const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = svg.querySelector('.xh'), hd = svg.querySelector('.hd'), hit = svg.querySelector('.hit');
  hit.addEventListener('mousemove', e => {
    const r = svg.getBoundingClientRect(), vx = (e.clientX - r.left) / r.width * W;
    let best = pts[0]; for (const p of pts) if (Math.abs(X(p.t) - vx) < Math.abs(X(best.t) - vx)) best = p;
    const cx = X(best.t), cy = Y(best.v);
    xh.setAttribute('x1', cx); xh.setAttribute('x2', cx); xh.setAttribute('visibility', 'visible');
    hd.setAttribute('cx', cx); hd.setAttribute('cy', cy); hd.setAttribute('visibility', 'visible');
    tip.innerHTML = `<b>${esc(yfmt(best.v))}</b>${esc(dfmt(best.t))}${extra(best)}`;
    tip.style.display = 'block'; tip.style.left = (cx / W * r.width) + 'px'; tip.style.top = (cy / H * r.height) + 'px';
  });
  hit.addEventListener('mouseleave', () => { tip.style.display = 'none'; xh.setAttribute('visibility', 'hidden'); hd.setAttribute('visibility', 'hidden'); });
}

// ---------- páginas ----------
const dash = { period: '7', kind: '', filter: '', mod: '', mkt: '', sim: null };
const pct = v => v == null || !isFinite(v) ? '–' : (v * 100).toFixed(1).replace('.', ',') + '%';
const sum = (a, f) => a.reduce((s, x) => s + (f(x) || 0), 0);
const tagOf = k => KIND[k] ? `<span class="tag ${KIND[k][1]}">${KIND[k][0]}</span>` : esc(k);
function periodFrom() {
  const d = +dash.period;
  if (!d) return 0;
  if (d === 1) { const t = new Date(); t.setHours(0, 0, 0, 0); return +t; }
  return Date.now() - d * DAY;
}
const periodSel = () => `<select id="period" style="width:130px">${[['1', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['0', 'Tudo']].map(([v, t]) => `<option value="${v}"${dash.period === v ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
const bindPeriod = () => { const p = $('period'); if (p) p.onchange = () => { dash.period = p.value; renderPage(); }; };
function stats(evs) {
  const bought = evs.filter(e => e.kind === 'bought'), lost = evs.filter(e => e.kind === 'lost'), dry = evs.filter(e => e.kind === 'dry');
  const withP = bought.filter(e => e.profit != null), dryP = dry.filter(e => e.profit != null);
  return {
    bought, lost, dry,
    spent: sum(bought, e => e.price), profit: sum(withP, e => e.profit), roi: withP.length ? sum(withP, e => e.profit) / sum(withP, e => e.price) : null,
    hit: bought.length + lost.length ? bought.length / (bought.length + lost.length) : null,
    dryProfit: sum(dryP, e => e.profit), dryRoi: dryP.length ? sum(dryP, e => e.profit) / sum(dryP, e => e.price) : null,
  };
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// compras da galeria no formato do histórico
const galEvents = () => st.galBuys.map(b => ({ t: b.t, kind: 'bought', mod: 'gal', name: b.name, rating: b.rating, price: b.buy, sale: b.sale || b.listBN || null, profit: b.status === 'sold' ? net(b.sale) - b.buy : null, filter: b.set, why: b.status === 'sold' ? 'vendida' : b.status === 'listed' ? 'listada' : 'não listada' }));

function renderPage() {
  const from = periodFrom(), evs = st.events.filter(e => e.t >= from);
  if (page === 'sniper') return;
  if (PAGES[page]) return PAGES[page]();
  const el = $('p-' + page);
  if (page === 'dash') {
    const s = stats(evs), bank = st.bank.filter(b => b.t >= from), c = status ? status.coins : (st.bank.length ? st.bank[st.bank.length - 1].c : null);
    const bankD = bank.length > 1 ? bank[bank.length - 1].c - bank[0].c : null;
    const r = riskLevel(st.reqs, st.events);
    const inc = evs.filter(e => ['timeout', 'error', 'block', 'fail'].includes(e.kind));
    const byF = {};
    for (const e of evs) if (['bought', 'dry', 'lost'].includes(e.kind)) (byF[e.filter || '—'] = byF[e.filter || '—'] || []).push(e);
    const cnt = k => evs.filter(e => e.kind === k).length;
    const gb = st.galBuys.filter(b => b.t >= from), gs = gb.filter(b => b.status === 'sold'), gpl = sum(gs, b => net(b.sale) - b.buy);
    el.innerHTML = `
      <div class="ph"><div><h2>Dashboard</h2><p>Banca, lucro e saúde da conta somando os módulos.</p></div><span class="flex"></span>${periodSel()}</div>
      <div class="grid">
        <div class="tiles">
          <div class="tile"><small>Moedas agora</small><b>${fmt(c)}</b><span>${bankD == null ? 'banca sem histórico ainda' : `no período: <b class="${bankD >= 0 ? 'good' : 'bad'}">${bankD >= 0 ? '+' : ''}${fmt(bankD)}</b>`}</span></div>
          <div class="tile"><small>Snipe · lucro estimado</small><b class="${s.profit >= 0 ? 'good' : 'bad'}">${fmt(s.profit)}</b><span>no preço anunciado, já sem os 5%</span></div>
          <div class="tile"><small>Snipe · ROI</small><b>${pct(s.roi)}</b><span>${fmt(s.bought.length)} compras · ${fmt(s.spent)} gastas</span></div>
          <div class="tile"><small>Snipe · acerto</small><b>${pct(s.hit)}</b><span>${s.lost.length} perdida(s) para outros</span></div>
          <div class="tile"><small>Galeria · lucro realizado</small><b class="${gpl >= 0 ? 'good' : 'bad'}">${fmt(gpl)}</b><span>${gs.length} vendida(s) de ${gb.length} comprada(s)</span></div>
          <div class="tile"><small>Carteira virtual (teste)</small><b class="${s.dryProfit >= 0 ? 'good' : 'bad'}">${fmt(s.dryProfit)}</b><span>${s.dry.length} simulada(s) · ROI ${pct(s.dryRoi)}</span></div>
        </div>
        <div class="g2">
          <div class="card"><div class="ch"><h3>Evolução da banca</h3></div><div id="cBank"></div></div>
          <div class="card"><div class="ch"><h3>Saúde e risco</h3><span class="tag ${r.c}">${r.t}</span></div>
            <div class="riskwhy">${esc(r.why.join(' · '))}</div>
            <table>${[['Buscas (24 h)', r.d], ['Buscas (última hora)', r.h], ['Perdidas para outros', s.lost.length], ['Timeouts', cnt('timeout')], ['Falhas', cnt('fail')], ['Erros', cnt('error')], ['Bloqueios / captcha', cnt('block')]].map(([a, b]) => `<tr><td>${a}</td><td class="r">${fmt(b)}</td></tr>`).join('')}</table>
          </div>
        </div>
        <div class="g2">
          <div class="card"><div class="ch"><h3>Snipe por filtro</h3></div>
            ${Object.keys(byF).length ? `<div class="tbl"><table><tr><th>Filtro</th><th class="r">Compras</th><th class="r">Gasto</th><th class="r">Lucro est.</th><th class="r">ROI</th><th class="r">Acerto</th><th class="r">Simuladas</th><th class="r">Projetado</th></tr>
              ${Object.entries(byF).map(([f, a]) => { const x = stats(a); return `<tr><td>${esc(f)}</td><td class="r">${x.bought.length}</td><td class="r">${fmt(x.spent)}</td><td class="r ${x.profit >= 0 ? 'good' : 'bad'}">${fmt(x.profit)}</td><td class="r">${pct(x.roi)}</td><td class="r">${pct(x.hit)}</td><td class="r">${x.dry.length}</td><td class="r">${fmt(x.dryProfit)}</td></tr>`; }).join('')}
            </table></div>` : '<div class="empty">Sem compras do Snipe no período.</div>'}
          </div>
          <div class="card"><div class="ch"><h3>Últimos problemas</h3><button class="link" data-goto="hist">ver tudo</button></div>
            ${inc.length ? `<div class="tbl" style="max-height:260px"><table>${inc.slice(-12).reverse().map(e => `<tr><td>${esc(dfmt(e.t))}</td><td>${tagOf(e.kind)}</td><td>${esc(e.why || '')}</td></tr>`).join('')}</table></div>` : '<div class="empty">Nenhum problema no período.</div>'}
          </div>
        </div>
      </div>`;
    bindPeriod();
    lineChart($('cBank'), bank.map(b => ({ t: b.t, v: b.c })), { label: 'banca' });
  } else if (page === 'hist') {
    const all = [...st.events.map(e => ({ ...e, mod: e.mod || 'snipe' })), ...galEvents()].filter(e => e.t >= from).sort((a, b) => a.t - b.t);
    const filters = [...new Set(all.map(e => e.filter).filter(Boolean))];
    const list = all.filter(e => (!dash.kind || e.kind === dash.kind) && (!dash.filter || e.filter === dash.filter) && (!dash.mod || e.mod === dash.mod)).slice(-800).reverse();
    el.innerHTML = `
      <div class="ph"><div><h2>Histórico</h2><p>Tudo o que os módulos compraram, perderam ou pularam.</p></div></div>
      <div class="flt" style="margin-bottom:12px">
        <select id="hMod" style="width:150px"><option value="">Todos os módulos</option><option value="snipe"${dash.mod === 'snipe' ? ' selected' : ''}>Snipe</option><option value="gal"${dash.mod === 'gal' ? ' selected' : ''}>Galeria</option></select>
        <select id="hKind" style="width:170px"><option value="">Todos os resultados</option>${Object.entries(KIND).map(([k, [t]]) => `<option value="${k}"${dash.kind === k ? ' selected' : ''}>${t}</option>`).join('')}</select>
        <select id="hFilter" style="width:200px"><option value="">Todos os filtros / times</option>${filters.map(f => `<option${dash.filter === f ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select>
        ${periodSel()}<span class="riskwhy">${list.length} registro(s)</span><span class="flex"></span>
        <button class="btn" id="hCsv">Exportar CSV</button><button class="btn danger" id="hClr">Apagar histórico do Snipe</button></div>
      <div class="card"><div class="tbl" style="max-height:calc(100vh - 290px)">${list.length ? `<table>
        <tr><th>Quando</th><th>Módulo</th><th>Resultado</th><th>Jogador</th><th class="r">Preço</th><th class="r">Venda</th><th class="r">Lucro</th><th>Filtro / time</th><th>Detalhe</th></tr>
        ${list.map(e => `<tr><td>${esc(dfmt(e.t))}</td><td>${srcName(e.mod)}</td><td>${tagOf(e.kind)}</td><td>${esc(e.name ? `${e.name} ${e.rating || ''}` : '')}</td><td class="r">${e.price ? fmt(e.price) : ''}</td><td class="r">${e.sale ? fmt(e.sale) : ''}</td><td class="r ${e.profit > 0 ? 'good' : e.profit < 0 ? 'bad' : ''}">${e.profit != null ? fmt(e.profit) : ''}</td><td>${esc(e.filter || '')}</td><td>${esc(e.why || '')}</td></tr>`).join('')}
      </table>` : '<div class="empty">Nada registrado com esses filtros.</div>'}</div></div>`;
    bindPeriod();
    $('hMod').onchange = () => { dash.mod = $('hMod').value; renderPage(); };
    $('hKind').onchange = () => { dash.kind = $('hKind').value; renderPage(); };
    $('hFilter').onchange = () => { dash.filter = $('hFilter').value; renderPage(); };
    $('hCsv').onclick = () => {
      const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
      const lines = [['data', 'modulo', 'resultado', 'jogador', 'overall', 'preco', 'venda', 'lucro', 'filtro', 'detalhe'].join(';'),
        ...list.slice().reverse().map(e => [new Date(e.t).toLocaleString('pt-BR'), srcName(e.mod), KIND[e.kind] ? KIND[e.kind][0] : e.kind, e.name, e.rating, e.price, e.sale, e.profit, e.filter, e.why].map(q).join(';'))];
      download('fut-bots-historico.csv', lines.join('\r\n'), 'text/csv');
    };
    $('hClr').onclick = () => { if (confirm('Apagar todo o histórico do Snipe (compras e ocorrências)? O lucro da Galeria fica na página Galeria.')) clearData('events'); };
  } else if (page === 'mkt') {
    const keys = Object.keys(st.prices);
    if (!keys.includes(dash.mkt)) dash.mkt = keys[0] || '';
    const all = st.prices[dash.mkt] || [], pts = all.filter(p => p.t >= from), vals = pts.map(p => p.p), lastP = all[all.length - 1];
    const day = all.filter(p => Date.now() - p.t < DAY).map(p => p.p);
    el.innerHTML = `
      <div class="ph"><div><h2>Mercado</h2><p>Menor preço visto por filtro, coletado enquanto o Snipe busca.</p></div><span class="flex"></span>
        <select id="mKey" style="width:240px">${keys.length ? keys.map(k => `<option${k === dash.mkt ? ' selected' : ''}>${esc(k)}</option>`).join('') : '<option value="">(sem dados ainda)</option>'}</select>
        ${periodSel()}<button class="btn acc" id="mCheck">Conferir o preço do filtro da tela</button></div>
      <div class="grid">
        <div class="tiles">
          <div class="tile"><small>Último preço</small><b>${lastP ? fmt(lastP.p) : '–'}</b><span>${lastP ? esc(dfmt(lastP.t)) + ' · ' + esc(lastP.s || '') : 'sem cotação'}</span></div>
          <div class="tile"><small>Menor no período</small><b>${vals.length ? fmt(Math.min(...vals)) : '–'}</b></div>
          <div class="tile"><small>Média no período</small><b>${vals.length ? fmt(sum(vals, v => v) / vals.length) : '–'}</b></div>
          <div class="tile"><small>Variação 24 h</small><b>${day.length > 1 ? pct(day[day.length - 1] / day[0] - 1) : '–'}</b><span>${lastP && Date.now() - lastP.t > HOUR ? 'cotação com mais de 1 h, pode estar desatualizada' : ''}</span></div>
        </div>
        <div class="card"><div class="ch"><h3>Menor preço · ${esc(dash.mkt || '—')}</h3></div><div id="cPrice"></div>
          <div class="riskwhy">Menor oferta vista em cada busca do Snipe e nas conferências de mercado.</div></div>
        <div class="card"><div class="ch"><div><h3>Alerta de preço</h3><p>Som e aviso no log quando aparecer por até esse valor.</p></div></div>
          <div class="row"><b>${esc(dash.mkt || 'este filtro')}</b> por até
          <input type="number" id="mAlert" style="width:140px" value="${st.alerts[dash.mkt] || ''}" placeholder="moedas" ${dash.mkt ? '' : 'disabled'}><span class="riskwhy">vazio = sem alerta</span></div></div>
      </div>`;
    bindPeriod();
    lineChart($('cPrice'), pts.map(p => ({ t: p.t, v: p.p, s: p.s })), { label: 'preço', extra: p => p.s ? `<br><span style="color:var(--mut)">${esc(p.s)}</span>` : '' });
    $('mKey').onchange = () => { dash.mkt = $('mKey').value; renderPage(); };
    $('mAlert').onchange = () => { const v = num($('mAlert').value); if (v) st.alerts[dash.mkt] = v; else delete st.alerts[dash.mkt]; save('alerts'); };
    $('mCheck').onclick = () => act($('mCheck'), async () => {
      const r = await snipeCmd('priceCheck', { name: 'Filtro da tela' });
      dash.mkt = 'Filtro da tela';
      toast(r.price ? `Preço de mercado: ${fmt(r.price)}` : 'Ninguém vendendo esse filtro agora.', r.price ? 'good' : 'warn');
    });
  } else if (page === 'sim') {
    const c = st.cfg;
    const sv = dash.sim || (dash.sim = { buy: c.maxBuy, sell: c.sellPrice || ladderUp(Math.ceil(c.maxBuy / 0.95 * 1.1)), budget: c.maxSpend || 50000, pct: c.profitPct });
    const tax = Math.ceil(sv.sell * 0.05), recv = net(sv.sell), pl = recv - sv.buy, roi = sv.buy ? pl / sv.buy : null;
    let be = ladderDown(Math.max(200, sv.buy)); while (net(be) <= sv.buy) be = ladderUp(be);
    const n = sv.buy ? Math.floor(sv.budget / sv.buy) : 0, maxFor = ladderDown(net(sv.sell) / (1 + sv.pct / 100));
    const warn = [];
    if (sv.buy > sv.budget) warn.push('o preço de compra passa do orçamento');
    if (pl <= 0) warn.push(`dá prejuízo: precisa vender por pelo menos ${fmt(be)}`);
    if (sv.sell && ladderDown(sv.sell) !== sv.sell) warn.push(`${fmt(sv.sell)} não é um preço válido no FUT (vira ${fmt(ladderDown(sv.sell))})`);
    el.innerHTML = `
      <div class="ph"><div><h2>Simulador</h2><p>Lucro, taxa do EA e orçamento antes de gastar moedas.</p></div></div>
      <div class="grid">
        <div class="card"><div class="three">
          <div class="field"><label>Preço de compra</label><input type="number" id="sBuy" value="${sv.buy}"></div>
          <div class="field"><label>Preço de venda</label><input type="number" id="sSell" value="${sv.sell}"></div>
          <div class="field"><label>Orçamento</label><input type="number" id="sBud" value="${sv.budget}"></div>
          <div class="field"><label>Lucro desejado (%)</label><input type="number" id="sPct" value="${sv.pct}"></div>
        </div><div class="row"><button class="btn acc" id="sUse">Usar no Sniper (compra + venda por preço fixo)</button></div></div>
        <div class="tiles">
          <div class="tile"><small>Taxa do EA (5%)</small><b>${fmt(tax)}</b></div>
          <div class="tile"><small>Você recebe</small><b>${fmt(recv)}</b></div>
          <div class="tile"><small>Lucro por carta</small><b class="${pl >= 0 ? 'good' : 'bad'}">${fmt(pl)}</b><span>ROI ${pct(roi)}</span></div>
          <div class="tile"><small>Ponto de equilíbrio</small><b>${fmt(be)}</b><span>menor venda sem prejuízo</span></div>
          <div class="tile"><small>Cartas no orçamento</small><b>${fmt(n)}</b><span>${fmt(n * sv.buy)} usadas</span></div>
          <div class="tile"><small>Lucro se vender todas</small><b class="${pl >= 0 ? 'good' : 'bad'}">${fmt(n * pl)}</b></div>
          <div class="tile"><small>Oferta máx. para ${sv.pct}%</small><b>${fmt(maxFor)}</b><span>vendendo a ${fmt(sv.sell)}</span></div>
        </div>
        ${warn.length ? `<div class="card warn">${esc(warn.join(' · '))}</div>` : '<div class="card good">Operação com lucro e dentro do orçamento.</div>'}
        <div class="riskwhy">Para testar uma estratégia sem gastar, use o modo <b>Teste</b> do Sniper: ele faz as buscas reais, mas só registra o que compraria (Dashboard → Carteira virtual).</div>
      </div>`;
    const upd = () => { sv.buy = num($('sBuy').value) || 0; sv.sell = num($('sSell').value) || 0; sv.budget = num($('sBud').value) || 0; sv.pct = num($('sPct').value) || 0; renderPage(); };
    for (const id of ['sBuy', 'sSell', 'sBud', 'sPct']) $(id).onchange = upd;
    $('sUse').onclick = () => {
      Object.assign(st.cfg, { mode: 'price', maxBuy: fixPrice('maxBuy', sv.buy), sellPrice: fixPrice('sellPrice', sv.sell), dest: 'sell', sellHow: 'fixed', preset: '' });
      saveCfg(); refreshInputs(); renderPresetSelect(); sync(); toast(`Sniper: compra até ${fmt(st.cfg.maxBuy)}, vende por ${fmt(st.cfg.sellPrice)}.`, 'good');
    };
  } else if (page === 'strat') {
    const card = (p, mine) => `<div class="preset ${st.cfg.preset === p.id ? 'on' : ''}"><b>${esc(p.name)}</b><span>${esc(p.hint || describeCfg(p.cfg))}</span>
      <div class="row"><button class="btn sm acc" data-load="${p.id}">Carregar</button>${mine ? `<button class="btn sm" data-del="${p.id}">Apagar</button>` : ''}</div></div>`;
    el.innerHTML = `
      <div class="ph"><div><h2>Estratégias</h2><p>Configurações prontas do Sniper. Os filtros ficam em "Filtros salvos".</p></div><span class="flex"></span>
        <input type="text" id="psName" placeholder="Nome (ex.: Jogadores 83–89)" style="width:260px"><button class="btn acc" id="psSave">Salvar a configuração atual</button></div>
      <div class="grid">
        <div class="card"><div class="ch"><h3>Prontas</h3></div><div class="pgrid">${PRESETS.map(p => card(p, false)).join('')}</div></div>
        <div class="card"><div class="ch"><h3>Minhas</h3></div>${st.presets.length ? `<div class="pgrid">${st.presets.map(p => card(p, true)).join('')}</div>` : '<div class="empty">Ajuste oferta, venda e ritmo no Sniper e salve aqui para reutilizar.</div>'}</div>
        <div class="riskwhy">Uma estratégia guarda oferta, modo (preço/lucro), destino, limites, velocidade, tempo, buscas por rodada e descanso.</div>
      </div>`;
    el.onclick = e => {
      const l = e.target.closest('[data-load]'), d = e.target.closest('[data-del]');
      if (l) applyPreset(l.dataset.load);
      if (d && confirm('Apagar essa estratégia?')) { st.presets = st.presets.filter(p => p.id !== d.dataset.del); if (st.cfg.preset === d.dataset.del) st.cfg.preset = ''; save('presets'); saveCfg(); renderPresetSelect(); renderPage(); }
    };
    $('psSave').onclick = () => {
      const name = norm($('psName').value); if (!name) return toast('Dê um nome para a estratégia.', 'warn');
      const c = {}; for (const k of STRAT_KEYS) c[k] = st.cfg[k];
      const p = { id: 'u' + Date.now().toString(36), name, cfg: c };
      st.presets.push(p); st.cfg.preset = p.id; save('presets'); saveCfg(); renderPresetSelect(); renderPage(); toast(`Estratégia "${name}" salva.`, 'good');
    };
  }
}
function describeCfg(c) {
  return [c.mode === 'profit' ? `lucro ${c.profitPct}%` : 'por preço', c.speed && (SPEEDS[c.speed] || {}).name, destName(c), c.maxBuys ? `até ${c.maxBuys} compras` : ''].filter(Boolean).join(' · ');
}

function renderAll() {
  refreshInputs(); renderPresetSelect(); renderFilterGrid(); renderFilters(); renderLog(); sync();
  let p = 'home'; try { p = localStorage.getItem('futbots_page') || 'home'; } catch {}
  go($('p-' + p) ? p : 'home');
}
setInterval(() => { if (page === 'dash') renderPage(); }, 15000);
