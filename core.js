// Núcleo compartilhado pelos módulos (Snipe, Galeria e Relist) dentro do EA FC Web App.
// Aqui ficam: estado salvo, utilitários de tela, textos do Web App, venda, Lista de Transferências,
// log/eventos e a trava que impede dois módulos de mexerem no Web App ao mesmo tempo.
var FUT = (() => {
  'use strict';
  const { norm, num, fmt, net, DEF, GAL_DEF, REL_DEF, DAY } = FSB;

  // ---------- estado salvo (chrome.storage.local, compartilhado com o painel) ----------
  // O painel é dono de: cfg, filters, alerts, presets, draft, galCfg, relCfg.
  // O motor (aqui) é dono de: events, bank, prices, logs, reqs, schema, galBuys, galSold.
  const store = chrome.storage.local;
  const D = {
    cfg: { ...DEF }, filters: [], alerts: {}, galCfg: { ...GAL_DEF }, relCfg: { ...REL_DEF },
    events: [], bank: [], prices: {}, logs: [], reqs: [], galBuys: [], galSold: {},
  };
  const PANEL_KEYS = ['cfg', 'filters', 'alerts', 'galCfg', 'relCfg'];
  const fixAll = (k, v) => k === 'cfg' ? { ...DEF, ...FSB.fixCfg(v || {}) } : k === 'galCfg' ? { ...GAL_DEF, ...(v || {}) } : k === 'relCfg' ? { ...REL_DEF, ...(v || {}) } : v;
  const listeners = [];
  const onChange = fn => listeners.push(fn);
  const alive = () => { try { return !!chrome.runtime.id; } catch { return false; } };
  let ready = false;
  const whenReady = [];
  store.get(null, r => {
    for (const k of Object.keys(D)) if (r[k] !== undefined) D[k] = fixAll(k, r[k]);
    migrateOld(r);
    ready = true;
    whenReady.splice(0).forEach(f => { try { f(); } catch {} });
    listeners.forEach(f => { try { f(PANEL_KEYS); } catch {} });
  });
  const onReady = f => ready ? f() : whenReady.push(f);
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local') return;
    const keys = PANEL_KEYS.filter(k => ch[k]);
    for (const k of keys) D[k] = fixAll(k, ch[k].newValue) ?? (Array.isArray(D[k]) ? [] : {});
    if (keys.length) listeners.forEach(f => { try { f(keys); } catch {} });
  });
  // dados das extensões antigas (Galeria Bot e Relist Bot guardavam no localStorage do Web App)
  function migrateOld(r) {
    if (r.migrated) return;
    const o = { migrated: Date.now() };
    const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
    const gc = read('fgb_cfg_v1'), gd = read('fgb_data_v1'), rc = read('frb_cfg_v1');
    if (gc && !r.galCfg) o.galCfg = D.galCfg = { ...GAL_DEF, ...gc };
    if (gd && !r.galBuys) { o.galBuys = D.galBuys = gd.buys || []; o.galSold = D.galSold = gd.soldSeen || {}; }
    if (rc && !r.relCfg) o.relCfg = D.relCfg = { ...REL_DEF, ...rc };
    try { store.set(o); } catch {}
  }
  const dirty = new Set(); let flushT;
  function persist(...keys) { keys.forEach(k => dirty.add(k)); clearTimeout(flushT); flushT = setTimeout(flush, 350); }
  function flush() {
    if (!alive()) return;
    D.events = D.events.slice(-5000); D.bank = D.bank.slice(-3000); D.logs = D.logs.slice(-4000); D.galBuys = D.galBuys.slice(-5000);
    const now = Date.now(); D.reqs = D.reqs.filter(t => now - t < DAY);
    for (const k of Object.keys(D.prices)) D.prices[k] = D.prices[k].slice(-500);
    const o = {};
    for (const k of dirty) o[k] = D[k];
    dirty.clear();
    try { store.set(o); } catch {}
  }

  // ---------- utilitários ----------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
  const vis = el => {
    if (!el || !el.isConnected || !el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0;
  };
  let host = null;
  const setHost = h => { host = h; };
  const mine = el => !!(host && el && host.contains(el));
  // texto sem os rótulos de atalho do Paletools ("[KeyC]", "[ KeyQ ]"…), que grudam no texto dos botões
  const btnText = el => norm((el.textContent || '').replace(/\[\s*(Key|Digit|Numpad)?\w{0,12}\s*\]/g, ' '));
  const fewest = l => l.sort((a, b) => a.getElementsByTagName('*').length - b.getElementsByTagName('*').length)[0] || null;
  // menor elemento visível cujo texto bate com a regex (prefere botões)
  function find(re, { root = document, deep = true, buttonsFirst = true } = {}) {
    if (buttonsFirst) {
      const btns = [...root.querySelectorAll('button, [role=button], a')].filter(el => !mine(el) && vis(el) && re.test(btnText(el)));
      if (btns.length || !deep) return fewest(btns);
    }
    return fewest([...root.querySelectorAll('body *')].filter(el => el.children.length <= 6 && !mine(el) && vis(el) && re.test(btnText(el))));
  }
  const fastFind = re => find(re, { deep: false });
  function click(el) {
    const r0 = el.getBoundingClientRect();
    if (r0.bottom < 0 || r0.top > innerHeight || r0.right < 0 || r0.left > innerWidth) el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new MouseEvent('mousedown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o));
    el.dispatchEvent(new MouseEvent('mouseup', o));
    el.dispatchEvent(new MouseEvent('click', o));
  }
  const pageText = () => document.body ? document.body.innerText : '';
  const dialogs = () => [...document.querySelectorAll('.ea-dialog-view, .view-modal-container, .ut-dialog')].filter(vis);
  const popupText = () => [...dialogs(), ...document.querySelectorAll('.Notification, .ut-notification-layer')].filter(vis).map(d => d.innerText).join(' ');
  // tela carregando; se ficar mais de 8 s seguidos, é um elemento fixo da página e é ignorado
  let loadingSince = 0;
  const loading = () => {
    const on = [...document.querySelectorAll('.ut-click-shield.showing, .loaderIcon, .ut-loading-spinner, .ut-loader')]
      .some(e => { if (!vis(e)) return false; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; });
    if (!on) { loadingSince = 0; return false; }
    if (!loadingSince) loadingSince = Date.now();
    return Date.now() - loadingSince < 8000;
  };
  // elementos cujo texto direto é exatamente txt, ou bate com a regex txt (só nós de texto: rápido)
  function leavesWithText(txt) {
    const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const match = txt instanceof RegExp ? s => txt.test(s) : s => s === txt;
    for (let n; (n = w.nextNode());) {
      if (!match(norm(n.textContent))) continue;
      const e = n.parentElement;
      if (e && !out.includes(e) && !mine(e) && vis(e)) out.push(e);
    }
    return out;
  }

  class Stop extends Error {}     // encerra o módulo
  class Soft extends Error {}     // falha de tela: o módulo se recupera e continua
  class Limited extends Error {}  // aviso do EA pedindo calma
  const snip = t => norm(t || '').slice(0, 160);

  // ---------- textos do Web App (pt / en / es) ----------
  // Os módulos acham botões e telas pelo texto. Se algo não for encontrado no seu idioma, é aqui que se ajusta.
  const BUYNOW = 'Comprar j[áa]|Buy Now|Comprar ya|C[óo]mpralo ya';
  const T = {
    search: /^(Pesquisar|Search|Buscar)$/i,
    reset: /^(Redefinir|Reset|Restablecer|Reiniciar|Limpar)$/i,
    market: /^(Mercado|Market|Transfer Market|Search Market|Mercado de fichajes|Mercado de transferencias)$/i,
    row: new RegExp(`${BUYNOW}|Pre[çc]o Inicial|Precio (de salida|inicial)|Start Price`, 'i'),
    tlRow: new RegExp(`${BUYNOW}|Pre[çc]o Inicial|Precio (de salida|inicial)|Start Price|Vendido|Sold|Lance|Bid|Puja`, 'i'),
    rowBuyNow: new RegExp(`(?:${BUYNOW}):?\\s*([\\d.,]+)`, 'i'),
    buyBtn: new RegExp(`^(?:${BUYNOW})(?:\\s*(?:por|for))?\\s*[\\d.,]+$`, 'i'),
    btnPrice: new RegExp(`(?:${BUYNOW})(?:\\s*(?:por|for))?\\s*([\\d.,]+)`, 'i'),
    soldOrExpired: /Vendido|Expirado|Caducado|Expired|Sold/i,
    sold: /Vendido|Sold/i,
    expired: /Expirado|Caducado|Expired/i,
    onSale: new RegExp(`Pre[çc]o Inicial|Start Price|Precio (de salida|inicial)|${BUYNOW}`, 'i'),
    soldPrice: /(?:Vendido(?: por)?|Sold(?: for)?):?\s*([\d.,]+)/i,
    bidPrice: /(?:Lance|Bid|Puja|Current Bid|Puja actual|Lance atual):?\s*([\d.,]+)/i,
    noResults: /Nenhum resultado|No results|No hay resultados|Sin resultados|Ning[úu]n resultado/i,
    won: /Parab[ée]ns, voc[êe] ganhou|Congratulations, you (won|bought)|(Enhorabuena|Felicidades|Felicitaciones)[^.]{0,30}(ganado|ganaste|comprado|compraste)/i,
    boughtFor: /(?:Item comprado por|Item bought for|Bought for|Objeto comprado por|Art[íi]culo comprado por)\s*[\d.,]+/i,
    listOnMarket: /^(Listar no Mercado de Transfer[êe]ncias|List on (the )?Transfer Market|(Anunciar|Poner|Listar|Vender) en (el )?mercado( de (fichajes|transferencias|transferibles))?)$/i,
    relist: /^(Listar item novamente|Listar no Mercado de Transfer[êe]ncias|Re-?list Item|List on (the )?Transfer Market|Volver a (anunciar|listar)|(Anunciar|Poner|Listar|Vender) en (el )?mercado( de (fichajes|transferencias|transferibles))?)$/i,
    sendToTL: /^(Enviar (para|à|a) (a )?Lista de Transfer[êe]ncias|Send to (the )?Transfer List|Enviar a (la )?lista de (transferibles|transferencias))$/i,
    sendToClub: /^(Enviar (ao Meu Clube|para o Clube)|Send to (My )?Club|Enviar (a|al) (mi )?club)$/i,
    cheapest: /^(Mais barato|Cheapest|M[áa]s barato|Min(imum)? BIN|Find Min(imum)?( BIN| Price)?)$/i,
    listForTransfer: /^(Listar para (a )?transfer[êe]ncia|List for Transfer|List Item|Listar para transferencia|Anunciar( para transferencia)?|Poner en venta)$/i,
    okBuy: /^(Ok|Sim|Confirmar|Comprar|Yes|Confirm|Buy|Aceptar|S[íi])$/i,
    okClose: /^(Ok|Fechar|Cancelar|Close|Cancel|Aceptar|Cerrar)$/i,
    okYes: /^(Ok|Sim|Confirmar|Yes|Confirm|Aceptar|S[íi])$/i,
    // "alguém comprou antes" — inclui o aviso do FC 27: "Status do lance alterado, os dados do leilão serão atualizados."
    lost: /status do lance alterado|dados do leil[ãa]o ser[ãa]o atualizados|bid status (has )?changed|auction data will be (updated|refreshed)|estado de la puja (ha )?cambiado|datos de la subasta se (actualizar[áa]n)|j[áa] foi (vendido|comprado)|expirou|n[ãa]o est[áa] mais dispon|n[ãa]o foi poss[íi]vel|lance (maior|superado)|item.*(vendido|indispon)|already sold|no longer|outbid|ya (se )?ha vendido|ya fue (vendido|comprado)|ya no est[áa] disponible|no se pudo|caduc|superad/i,
    lostDialog: /j[áa] foi|expirou|n[ãa]o foi poss|lance (maior|superado)|already|no longer|outbid|ya (se )?ha|ya fue|caduc|superad|no se pudo|no es posible|status do lance alterado/i,
    captcha: /captcha|verifica[çc][ãa]o de seguran|n[ãa]o sou um rob[ôo]|i'?m not a robot|no soy un robot|verify (that )?you/i,
    noCoins: /moedas insuficientes|n[ãa]o tem moedas|insufficient (funds|coins)|not enough coins|monedas insuficientes|no tienes (suficientes )?monedas/i,
    tooMany: /muitas (a[çc][õo]es|solicita[çc][õo]es)|acesso ao mercado[^.]{0,40}(bloquead|restrit|suspens|negad)|too many (actions|requests)|market access[^.]{0,40}(blocked|restricted|suspended|denied)|temporarily (blocked|restricted)|demasiadas (acciones|solicitudes)|acceso al mercado[^.]{0,40}(bloquead|restringid|suspendid)/i,
    full: /lista de transfer[êe]ncias?[^.]{0,40}(cheia|lotada|completa|atingiu)|transfer list is full|list is full|n[ãa]o h[áa] (mais )?espa[çc]o|lista de (transferibles|transferencias)[^.]{0,40}(llena|completa)|no hay (m[áa]s )?espacio/i,
    unassigned: /itens? n[ãa]o atribu[íi]dos?[^.]{0,60}(antes|limite|m[áa]ximo)|unassigned (items|pile)[^.]{0,60}(before|limit|maximum|full)|no asignados?[^.]{0,60}(antes|l[íi]mite|m[áa]ximo)/i,
    // Lista de Transferências e navegação
    transferList: /^(Lista de Transfer[êe]ncias|Transfer List|Lista de transferibles|Lista de transferencias)$/i,
    soldItems: /^(Itens vendidos|Itens não vend\.|Sold Items|Unsold Items|Objetos vendidos|Art[íi]culos vendidos|No vendidos|Objetos no vendidos)$/i,
    clearSold: /^(Retirar vendidos|Clear Sold|Quitar vendidos|Borrar vendidos|Eliminar vendidos)$/i,
    sendNonDup: /^(Envie|Enviar|Send)\s+(n[ãa]o|non?)[-\s]?dup\S*\s+.*\bclu(b|be)\b/i,
    transfersNav: /^(Transfer\.?|Transfers|Transferencias|Fichajes)$/i,
    home: /^(In[íi]cio|Home)$/i,
    gallery: /^(Gallery|Galeria|Galer[íi]a)$/i,
    // posições (pt / en / es), para diferenciar versões da mesma carta
    comparePrice: /^(Comparar pre[çc]o|Compare Price|Comparar precio)$/i,
    unassignedTile: /^(Itens n[ãa]o atribu[íi]dos|N[ãa]o atribu[íi]dos|Unassigned( Items)?|Objetos sin asignar|Objetos no asignados|No asignados)$/i,
    claimAll: /^(Resgatar tudo|Resgatar todas?|Reivindicar tudo|Reivindicar todas?|Coletar tudo|Claim All|Collect All|Reclamar todo|Recoger todo|Reclamar todas)$/i,
    claimOne: /^(Resgatar|Reivindicar|Coletar|Resgatar recompensas?|Claim|Collect|Claim Rewards?|Reclamar|Recoger|Reclamar recompensas?)$/i,
    objectives: /^(Objetivos|Objectives)$/i,
    pos: /^(GL|GOL|ZAG|LD|LE|VOL|MC|MEI|ME|MD|PE|PD|ATA|SA|GK|CB|LB|RB|LWB|RWB|CDM|CM|CAM|LM|RM|LW|RW|ST|CF|POR|DFC|LI|CAD|CAI|MCD|MCO|MI|EI|ED|DC|SD)$/i,
  };

  // ---------- execução: um módulo por vez ----------
  const run = { owner: null, what: '', stopReq: false, since: 0 };
  const isBusy = () => !!run.owner;
  const stopping = () => run.stopReq;
  // roda fn como dono do Web App; recusa se outro módulo já estiver trabalhando
  async function task(owner, what, fn) {
    if (run.owner) throw new Error(`${FSB.MODS[run.owner] ? FSB.MODS[run.owner].name : 'Outro módulo'} está trabalhando (${run.what}). Pare ele antes.`);
    Object.assign(run, { owner, what, stopReq: false, since: Date.now() });
    changed();
    try { return await fn(); } finally { Object.assign(run, { owner: null, what: '', stopReq: false, since: 0 }); flush(); changed(); }
  }
  const stop = () => { if (run.owner) run.stopReq = true; changed(); };
  const ticks = [];
  const onTick = f => ticks.push(f);
  const changed = () => ticks.forEach(f => { try { f(); } catch {} });

  // para em captcha / falta de moedas / não atribuídos demais; aviso de limite vira Limited
  function checkBlockers() {
    const t = popupText();
    const cap = document.querySelector('iframe[src*="captcha"], iframe[title*="captcha" i], #funcaptcha');
    if (!t && !cap) return;
    if (cap || T.captcha.test(t)) throw new Stop('Apareceu verificação (captcha). Resolva na página e inicie de novo.');
    if (T.noCoins.test(t)) throw new Stop('Moedas insuficientes.');
    if (T.unassigned.test(t)) throw new Stop('Itens não atribuídos demais: resolva os não atribuídos e inicie de novo.');
    if (T.full.test(t)) return;   // lista cheia: quem chamou decide
    if (T.tooMany.test(t)) throw new Limited(snip(t));
  }
  async function waitFor(fn, ms, what, every = 40) {
    const end = Date.now() + ms;
    for (let i = 0; Date.now() < end; i++) {
      if (run.stopReq) throw new Stop('Parado por você.');
      if (every >= 150 || i % 4 === 0) checkBlockers();
      let v; try { v = fn(); } catch { v = null; }
      if (v) return v;
      await sleep(every);
    }
    if (what) throw new Error('Tempo esgotado esperando ' + what);
    return null;
  }
  async function idle(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (run.stopReq) throw new Stop('Parado por você.'); await sleep(Math.min(100, end - Date.now())); }
  }
  function closeDialog() {
    const d = dialogs().pop();
    if (!d) return false;
    const ok = find(T.okClose, { root: d }) || [...d.querySelectorAll('button')].filter(vis).pop();
    if (ok) click(ok);
    return !!ok;
  }
  async function confirmIfAsked(ms = 2000) {
    const dlg = await waitFor(() => dialogs().pop(), ms);
    const ok = dlg && find(T.okYes, { root: dlg });
    if (ok) { click(ok); await sleep(500); }
  }
  const escKey = () => { for (const t of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(t, { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })); };
  // fecha os avisos do canto (ex.: "Status do lance alterado") para não confundir a próxima ação
  function dismissNotifications() {
    for (const n of document.querySelectorAll('.Notification')) {
      if (!vis(n)) continue;
      const x = n.querySelector('.closeButton, .close, button'); if (x) click(x);
    }
  }

  // ---------- leitura da tela ----------
  const items = () => [...document.querySelectorAll('.listFUTItem')].filter(r => vis(r) && !mine(r));
  const rowBuyNow = r => num((norm(r.innerText).match(T.rowBuyNow) || [])[1]);
  // pela classe do botão (rápido) ou pelo texto ("Comprar já por 1.000" / "Buy Now for 1,000")
  const buyBtn = () => [...document.querySelectorAll('button.buyButton')].find(b => vis(b) && num(b.textContent) != null) || find(T.buyBtn, { deep: false });
  const btnPrice = b => num((norm(b.textContent).match(T.btnPrice) || [])[1]) ?? num(b.textContent);
  const noResultsEl = () => { const n = document.querySelector('.ut-no-results-view'); return !!(n && vis(n)); };
  // painel do item com ações de dono (só aparece depois que a carta é sua)
  const ownedPanel = () => !buyBtn() && ((!!fastFind(T.listOnMarket) && !!fastFind(T.sendToClub)) || T.boughtFor.test(popupText()));
  function coins() {
    for (const el of document.querySelectorAll('.view-navbar-currency-coins, .ut-navigation-bar-view .coins, [class*="currency-coins"]')) {
      if (!vis(el) || mine(el)) continue;
      const v = num(el.textContent); if (v != null) return v;
    }
    return null;
  }
  function itemIdent(el, fb) {
    if (!el) return { name: (fb && fb.name) || '?', rating: (fb && fb.rating) || null };
    // siglas de liga/nação/clube que o Web App (ou o Paletools) mostra no item: "BEL 1", "ING 2", "LIB", "SUD"
    const abbr = s => /^[A-ZÀ-Ý]{2,3}( ?\d)?$|^[A-ZÀ-Ý]{4} ?\d$/.test(s);
    const okName = s => !!s && /[A-Za-zÀ-ÿ]{2,}/.test(s) && !/\d{3,}/.test(s) && !abbr(s) && !T.pos.test(s) && !T.tlRow.test(s);
    const r = el.querySelector('.rating, .playerOverview .rating, .ut-item-rating');
    const tagged = [...el.querySelectorAll('.player-name, .ut-item-name, .itemName, .name')].map(e => norm(e.textContent));
    const lines = (el.innerText || '').split('\n').map(norm).filter(Boolean);
    const name = tagged.find(okName) || lines.find(okName) || (fb && fb.name) || '?';
    const rating = (r && num(r.textContent)) || num(lines.find(l => /^\d{2}$/.test(l) && +l >= 40) || '') || (fb && fb.rating) || null;
    return { name, rating };
  }
  const headerTitle = () => norm(([...document.querySelectorAll('.ut-navigation-bar-view .title, .ut-navigation-bar-view h1')].find(vis) || {}).textContent);

  // ---------- venda (Listar no Mercado → Mais barato → Listar) ----------
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  function setInput(inp, v, { blur = true } = {}) {
    inp.focus();
    valueSetter.call(inp, v ? String(v) : '');
    for (const t of ['input', 'change', 'keyup']) inp.dispatchEvent(new Event(t, { bubbles: true }));
    if (blur) inp.blur();
  }
  const searchView = () => [...document.querySelectorAll('.ut-market-search-filters-view')].find(vis) || null;
  const priceInputs = () => { const sv = searchView(); return [...document.querySelectorAll('input')].filter(i => !mine(i) && vis(i) && !(sv && sv.contains(i)) && /^[\d.,]*$/.test(i.value) && i.value !== ''); };
  async function openListing(re = T.listOnMarket) {
    const acc = await waitFor(() => fastFind(re), 6000, '"Listar no Mercado de Transferências"');
    click(acc);
    await waitFor(() => priceInputs().length >= 2 || fastFind(T.listForTransfer), 3000);
    await sleep(150);
  }
  async function confirmListing() {
    const lb = await waitFor(() => fastFind(T.listForTransfer), 5000, 'o botão "Listar para transferência"');
    click(lb);
    const out = await waitFor(() => T.full.test(popupText()) ? 'full' : !vis(lb) ? 'ok' : null, 8000);
    if (out === 'full') { closeDialog(); return 'full'; }
    return out ? 'ok' : 'unknown';
  }
  // Paletools está ativo? (ele coloca o menu "Paletools" no Web App)
  let ptT = 0, ptOn = false;
  function paletoolsActive() {
    if (Date.now() - ptT > 30000) { ptT = Date.now(); ptOn = [...document.querySelectorAll('.ut-tab-bar-item, nav button, nav a, .ut-tab-bar button')].some(e => !mine(e) && /^Paletools$/i.test(norm(e.textContent))); }
    return ptOn;
  }
  // Menor preço pela própria extensão: abre "Comparar preço" do item, lê as ofertas e volta.
  async function cheapestOwn(accRe, reselect) {
    const cmp = await waitFor(() => fastFind(T.comparePrice), 5000, null, 150);
    if (!cmp) return { err: 'não achei o botão "Comparar preço" do item' };
    const before = new Set(items());
    click(cmp);
    const fresh = () => items().filter(r => !before.has(r) && T.row.test(r.innerText));
    const got = await waitFor(() => {
      if (loading()) return null;
      if (fresh().length) return 'rows';
      if (noResultsEl() || T.noResults.test(popupText())) return 'none';
      return null;
    }, 12000, null, 150);
    let min = null, n = 0;
    if (got === 'rows') {
      await sleep(400);
      const ps = fresh().filter(r => !T.soldOrExpired.test(r.innerText)).map(rowBuyNow).filter(p => p != null);
      n = ps.length; if (ps.length) min = Math.min(...ps);
    }
    // volta para o item
    const back = [...document.querySelectorAll('.ut-navigation-button-control, button.btn-navigation')].find(b => vis(b) && !mine(b));
    if (back) click(back);
    if (!(await waitFor(() => !loading() && fastFind(accRe), 6000, null, 150)) && reselect) { await reselect(); await waitFor(() => fastFind(accRe), 5000, null, 150); }
    return { min, n, none: got !== 'rows' };
  }
  // minBn: não lista abaixo disso · buy + noLoss: não lista se der prejuízo depois dos 5%
  // fonte do preço (cfg.priceSrc): auto = Paletools se estiver ativo, senão a própria extensão · own · paletools
  async function listCheapest({ minBn = 0, buy = null, noLoss = false, accRe = T.listOnMarket, reselect = null } = {}) {
    const src = D.cfg.priceSrc || 'auto';
    if (src === 'own' || (src === 'auto' && !paletoolsActive())) {
      const c = await cheapestOwn(accRe, reselect);
      if (c.err) return { ok: false, why: c.err };
      if (c.min == null) return { ok: false, keep: true, why: 'ninguém está vendendo essa carta agora (sem preço de referência)' };
      const bn = FSB.ladderPrev(c.min) >= 200 ? FSB.ladderPrev(c.min) : c.min;   // um degrau abaixo do mais barato
      if (minBn && bn < minBn) return { ok: false, keep: true, bn, why: `o mais barato é ${fmt(c.min)}, abaixo do seu mínimo de ${fmt(minBn)}` };
      if (noLoss && buy != null && net(bn) <= buy) return { ok: false, keep: true, bn, why: `o mais barato é ${fmt(c.min)} (dá prejuízo depois dos 5% do EA)` };
      if (!fastFind(accRe)) return { ok: false, why: 'não consegui voltar para o item depois de comparar o preço' };
      return listFixed(bn, accRe);
    }
    await openListing(accRe);
    const cheap = await waitFor(() => fastFind(T.cheapest) || find(T.cheapest), 6000, 'o botão "Mais barato" (o Paletools está ativo?)');
    const before = priceInputs().map(i => i.value).join('|');
    click(cheap);
    // o Paletools pesquisa o mercado; espera os preços mudarem. Se o mais barato for igual ao preço que já
    // estava no campo (comum no relist), nada muda: termina quando a pesquisa acaba, sem esperar 12 s à toa.
    const t0 = Date.now(); let sawLoad = false;
    await waitFor(() => {
      if (loading()) { sawLoad = true; return null; }
      if (priceInputs().map(i => i.value).join('|') !== before) return true;
      return (sawLoad && Date.now() - t0 > 800) || Date.now() - t0 > 3500;
    }, 12000);
    await sleep(200);
    const vals = priceInputs().map(i => num(i.value));
    const bn = vals.length ? vals[vals.length - 1] : null, start = vals.length > 1 ? vals[vals.length - 2] : null;
    if (minBn && bn != null && bn < minBn) return { ok: false, keep: true, bn, why: `o mais barato é ${fmt(bn)}, abaixo do seu mínimo de ${fmt(minBn)}` };
    if (noLoss && buy != null && bn != null && net(bn) <= buy) return { ok: false, keep: true, bn, why: `o mais barato é ${fmt(bn)} (dá prejuízo depois dos 5% do EA)` };
    const r = await confirmListing();
    if (r === 'full') return { ok: false, full: true, why: 'a Lista de Transferências está cheia' };
    if (r !== 'ok') return { ok: false, why: 'o anúncio não foi confirmado' };
    return { ok: true, bn, start };
  }
  async function listFixed(price, accRe = T.listOnMarket) {
    await openListing(accRe);
    const ins = await waitFor(() => { const i = priceInputs(); return i.length >= 2 ? i : null; }, 5000, 'os campos de preço');
    const bn = FSB.ladderDown(price), start = FSB.ladderPrev(bn) || 150;
    setInput(ins[ins.length - 2], start); await sleep(60);
    setInput(ins[ins.length - 1], bn); await sleep(150);
    const r = await confirmListing();
    if (r === 'full') return { ok: false, full: true, why: 'a Lista de Transferências está cheia' };
    return { ok: true, bn, start };
  }

  // ---------- Lista de Transferências ----------
  const navBtn = re => [...document.querySelectorAll('.ut-tab-bar-item, .ut-tab-bar button, nav button, nav a')].find(b => vis(b) && !mine(b) && re.test(norm(b.textContent)));
  const onTransferList = () => T.transferList.test(headerTitle()) || !!(leavesWithText(T.soldItems).length || fastFind(T.clearSold));
  async function goToTransferList(log = () => {}) {
    if (onTransferList()) return;
    const tileEl = () => {
      const known = [...document.querySelectorAll('.ut-tile-transfer-list, [class*="tile-transfer-list"]')].find(vis);
      if (known) return known;
      const t = leavesWithText(T.transferList)[0];
      return t ? (t.closest('.tile, [class*="tile"], button, [role=button]') || t) : null;
    };
    for (let tries = 0; tries < 3 && !tileEl(); tries++) {
      const nav = [...document.querySelectorAll('.ut-tab-bar-item.icon-transfer')].find(vis)
        || navBtn(/^(Transfer|Fichajes)/i) || leavesWithText(T.transfersNav)[0] || find(T.transfersNav);
      if (!nav) throw new Stop('Não achei o menu "Transfer." na barra lateral do Web App.');
      log(`   abrindo Transfer.${tries ? ' (de novo)' : ''}…`);
      click(nav.closest('.ut-tab-bar-item, button, [role=button], a') || nav);
      await waitFor(tileEl, 8000, null, 200);
    }
    const tile = tileEl();
    if (!tile) throw new Error('a tela Transfer. não abriu');
    await sleep(700);
    for (let tries = 0; tries < 3 && !onTransferList(); tries++) {
      log(`   abrindo a Lista de Transferências${tries ? ' (de novo)' : ''}…`);
      const t = tileEl() || tile;
      click(t);
      if (await waitFor(onTransferList, 8000, null, 200)) break;
      const title = t.querySelector && [...t.querySelectorAll('*')].find(e => T.transferList.test(norm(e.textContent)) && !e.children.length);
      if (title) { click(title); if (await waitFor(onTransferList, 6000, null, 200)) break; }
    }
    await waitFor(() => onTransferList() && !loading(), 20000, 'a Lista de Transferências abrir', 200);
    await sleep(1200);
  }
  // "Retirar vendidos": as moedas já caíram na conta, só tira os itens da lista
  const hooks = {};
  async function clearSold(log = () => {}) {
    const b = fastFind(T.clearSold);
    if (!b) return 0;
    if (hooks.beforeClearSold) { try { await hooks.beforeClearSold(); } catch {} }
    const n = items().filter(r => T.sold.test(r.innerText)).length;
    click(b); await sleep(800);
    await confirmIfAsked();
    await waitFor(() => !loading() && !fastFind(T.clearSold), 10000, null, 200);
    log(`🧹 Retirei os vendidos${n ? ` (${n})` : ''}.`, 'good');
    await sleep(600);
    return n || 1;
  }

  // ---------- aviso de limite do EA: pausa e continua (3 avisos em 15 min = para) ----------
  const limitHits = [];
  async function limitPause(e, logf) {
    const now = Date.now();
    while (limitHits.length && now - limitHits[0] > 15 * 6e4) limitHits.shift();
    limitHits.push(now);
    ev('block', { why: 'aviso do EA: ' + e.message });
    if (limitHits.length >= 3) throw new Stop(`O EA limitou o mercado 3 vezes em 15 min. Pare um bom tempo. Aviso: "${e.message}"`);
    const s = rndInt(90, 180) * limitHits.length;
    logf(`   ⏸ aviso do EA: "${e.message}" — pausando ${s}s e continuando (${limitHits.length}/3)…`, 'warn');
    for (let k = 0; k < 4 && dialogs().length; k++) { closeDialog(); await sleep(200); }
    dismissNotifications();
    await idle(s * 1000);
  }
  // lista de proteção: nomes que nunca são vendidos nem relistados
  const blocked = name => { const n = norm(name || '').toLowerCase(); return !!n && (D.cfg.block || []).some(b => b && n.includes(String(b).toLowerCase())); };

  // ---------- log, eventos, banca ----------
  let logSrc = '';
  function log(m, c = '', src = run.owner || logSrc) { D.logs.push({ t: Date.now(), m, c, src: src || '' }); persist('logs'); changed(); }
  function ev(kind, o = {}) { const e = { t: Date.now(), kind, mod: run.owner || 'snipe', ...o }; D.events.push(e); persist('events'); return e; }
  function sampleBank() {
    const c = coins(); if (c == null) return;
    const last = D.bank[D.bank.length - 1];
    if (!last || last.c !== c || Date.now() - last.t > 10 * 6e4) { D.bank.push({ t: Date.now(), c }); persist('bank'); }
  }
  setInterval(() => { try { if (alive() && ready) sampleBank(); } catch {} }, 60000);
  function beep(f = 880, ms = 250) {
    if (!D.cfg.sound) return;
    try {
      const a = new AudioContext(), o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination); o.frequency.value = f; g.gain.value = 0.15;
      o.start(); setTimeout(() => { o.stop(); a.close(); }, ms);
    } catch {}
  }

  // ---------- módulos e mensagens do painel ----------
  const mods = {};
  const mod = (name, api) => { mods[name] = api; };
  // a leitura da Lista de Transferências varre a página: no máximo 1x por segundo e nunca durante o snipe
  let tlCache = false, tlT = 0;
  const onTLCached = () => {
    if (run.owner === 'snipe') return false;
    if (Date.now() - tlT > 1000) { tlT = Date.now(); try { tlCache = onTransferList(); } catch { tlCache = false; } }
    return tlCache;
  };
  function status() {
    const o = { owner: run.owner, what: run.what, since: run.since, stopping: run.stopReq, coins: coins(), url: location.href, onSearch: !!searchView(), onTL: onTLCached() };
    for (const [k, m] of Object.entries(mods)) { try { o[k] = m.status ? m.status() : null; } catch { o[k] = null; } }
    return o;
  }
  // comandos (do painel ou do widget)
  async function command(m) {
    if (m.cmd === 'status') return status();
    if (m.cmd === 'stop') { stop(); return status(); }
    if (m.cmd === 'clear') {
      if (m.what === 'logs') D.logs = m.src ? D.logs.filter(l => l.src !== m.src) : [];
      if (m.what === 'events') D.events = [];
      if (m.what === 'prices') D.prices = {};
      persist(m.what); changed(); return { ok: true };
    }
    const M = mods[m.mod];
    if (!M || !M.cmd) throw new Error('comando desconhecido');
    return M.cmd(m);
  }
  chrome.runtime.onMessage.addListener((m, _s, reply) => {
    if (!m || (!m.cmd && !m.mod)) return false;
    command(m).then(data => reply({ ok: true, data }), e => reply({ ok: false, error: e.message }));
    return true;
  });

  return {
    D, store, persist, flush, onChange, onReady, alive,
    sleep, rnd, rndInt, vis, setHost, mine, btnText, find, fastFind, click, pageText, dialogs, popupText, loading, leavesWithText,
    Stop, Soft, Limited, snip, T, run, task, stop, isBusy, stopping, onTick, changed,
    checkBlockers, waitFor, idle, closeDialog, confirmIfAsked, escKey, dismissNotifications,
    items, rowBuyNow, buyBtn, btnPrice, noResultsEl, ownedPanel, coins, itemIdent, headerTitle,
    setInput, searchView, priceInputs, openListing, confirmListing, listCheapest, listFixed,
    navBtn, onTransferList, goToTransferList, clearSold, hooks, limitPause, blocked, paletoolsActive, cheapestOwn,
    log, ev, sampleBank, beep, mod, status, command,
  };
})();
