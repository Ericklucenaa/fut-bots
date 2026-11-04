// Módulo Snipe — repete a busca do Mercado com o filtro e compra no "Comprar já" o que aparecer até o limite.
(() => {
  'use strict';
  if (window.__futSnipe) return;
  window.__futSnipe = true;
  const { ladderDown, ladderUp, ladderPrev, step, net, fmt, norm, num, SPEEDS, DAY } = FSB;
  const F = FUT, D = F.D, T = F.T;
  const { Stop, Soft, Limited, sleep, rnd, rndInt, vis, find, fastFind, click, dialogs, loading, waitFor, idle, closeDialog, escKey, dismissNotifications, mine, btnText, setInput, searchView, snip } = F;
  const pause = (k = 1) => sleep(450 * k * (0.8 + Math.random() * 0.4));
  const log = (m, c = '') => F.log(m, c, 'snipe');
  const isRunning = () => F.run.owner === 'snipe' && F.run.what === 'snipando';

  // ---------- tela de busca ----------
  const searchRoot = () => { const v = searchView(); return v ? (v.closest('.ut-navigation-container-view, .ut-content') || v) : null; };
  function priceFilters() {
    const v = searchView(); if (!v) return null;
    const ins = [...new Set(v.querySelectorAll('.search-prices input, .price-filter input'))].filter(vis);
    if (ins.length < 4) return null;
    return { bidMin: ins[0], bidMax: ins[1], binMin: ins[2], binMax: ins[3] };
  }
  // os 4 valores de preço do filtro (lance mín./máx., compre já mín./máx.); 0 = vazio
  const PKEYS = ['bidMin', 'bidMax', 'binMin', 'binMax'];
  function readPrices() {
    const pf = priceFilters(); if (!pf) return null;
    const o = {}; PKEYS.forEach(k => { o[k] = num(pf[k].value) || 0; }); return o;
  }
  async function writePrices(p) {
    if (!p) return;
    const pf = priceFilters(); if (!pf) return;
    for (const k of PKEYS) { const v = p[k] || 0; if ((num(pf[k].value) || 0) !== v) { setInput(pf[k], v || ''); await sleep(60); } }
  }
  let searchBtnCache = null;
  const searchBtn = () => {
    if (searchBtnCache && vis(searchBtnCache)) return searchBtnCache;
    const root = searchRoot(); if (!root) return null;
    return (searchBtnCache = [...root.querySelectorAll('button.call-to-action')].find(b => vis(b) && T.search.test(btnText(b))) || find(T.search, { root, deep: false }));
  };
  let curMin = null;  // mínimo do filtro salvo em uso (null = o do painel)
  function rotationValues(maxP) {
    const base = (curMin != null ? curMin : D.cfg.minBuy) || 0;
    const cap = Math.max(ladderDown(maxP * 0.5), base), out = [base];
    for (let p = base ? ladderUp(base) : 200; p <= cap && p < maxP && out.length < 14; p += step(p)) out.push(p);
    if (out.length < 2 && base && ladderUp(base) < maxP) out.push(ladderUp(base));
    return out;
  }
  let lastMin = -1;
  function nextMin(maxP) {
    const rot = rotationValues(maxP);
    if (!D.cfg.rotate || rot.length < 2) return rot[0];
    let v; do { v = rot[Math.floor(Math.random() * rot.length)]; } while (v === lastMin);
    return (lastMin = v);
  }
  const backBtn = () => [...document.querySelectorAll('.ut-navigation-button-control, button.btn-navigation')].find(b => vis(b) && !mine(b));
  async function backToSearch() {
    for (let i = 0; i < 6; i++) {
      if (searchView() && !loading()) return;
      for (let k = 0; k < 3 && dialogs().length; k++) { closeDialog(); await sleep(150); }
      if (i >= 2) escKey();
      dismissNotifications();
      const back = backBtn();
      if (back) click(back);
      if (await waitFor(() => searchView() && !loading(), i < 3 ? 4000 : 7000)) return;
    }
    throw new Soft('Não consegui voltar para a tela "Pesquisar no Mercado".');
  }
  // depois de qualquer falha: fecha tudo e volta para a pesquisa
  async function recover() {
    for (let k = 0; k < 4 && dialogs().length; k++) { closeDialog(); await sleep(200); }
    dismissNotifications();
    await idle(rnd(600, 1200));
    await backToSearch();
  }

  // ---------- filtros (nome do jogador + texto de cada caixa: Qualidade, Raridade, Posição…) ----------
  const filterControls = () => { const v = searchView(); return v ? [...v.querySelectorAll('.ut-search-filter-control')].filter(vis) : []; };
  const ctlRow = c => c.querySelector('.ut-search-filter-control--row') || c;
  const ctlText = c => norm((c.querySelector('.ut-search-filter-control--row .label, .label') || ctlRow(c)).textContent);
  const ctlOptions = c => [...new Set([...c.querySelectorAll('li, .with-icon')].map(li => norm(li.textContent)).filter(t => t && t.length < 50))];
  const playerInput = () => { const v = searchView(); return v ? [...v.querySelectorAll('.ut-player-search-control input, input.ut-text-input-control')].find(vis) : null; };
  const playerList = () => [...document.querySelectorAll('.ut-player-search-control .playerResultsList button, .playerResultsList button')].filter(vis);
  const playerOpt = b => ({ name: norm((b.querySelector('.btn-text') || b).textContent), rating: num((b.querySelector('.btn-subtext') || {}).textContent) });
  function captureFilter() {
    if (!searchView()) throw new Error('Abra Transfer. → Pesquisar no Mercado no Web App.');
    const pi = playerInput(), pr = readPrices();
    return { player: pi ? norm(pi.value) : '', ctls: filterControls().map(ctlText), prices: pr,
      minBuy: (pr && pr.binMin) || 0, maxBuy: (pr && pr.binMax) || 0 };
  }
  async function resetFilter() {
    const root = searchRoot();
    const b = root && [...root.querySelectorAll('button')].find(x => vis(x) && !mine(x) && RESET.test(btnText(x)));
    if (!b) return false;
    const before = filterControls().map(ctlText).join('|');
    click(b);
    await waitFor(() => filterControls().map(ctlText).join('|') !== before, 1500);
    await sleep(150);
    return true;
  }
  const RESET = /^(Redefinir|Reset|Restablecer|Reiniciar)$/i;
  // item "Qualquer" da lista (aparece abreviado, ex.: "Qualq.")
  const ANY = /^(qualq|qualquer|any|cualq|cualquiera|todos|todas|all)\b/i;
  const STD = ['Qualidade', 'Raridade', 'Posição', 'Estilos de entrosamento', 'Nação', 'Liga', 'Clube', 'Estilos de jogo'];
  async function openOptions(c) {
    let opts = ctlOptions(c);
    if (opts.length >= 2) return opts;
    click(ctlRow(c)); await waitFor(() => ctlOptions(c).length >= 2, 1200);
    opts = ctlOptions(c); click(ctlRow(c)); await sleep(150);
    return opts;
  }
  // volta uma caixa para "Qualquer" (quando o botão Redefinir não existe ou não funcionou)
  async function clearCtl(c) {
    const x = [...c.querySelectorAll('button, span, i, div')].find(e => vis(e) && !e.children.length && /^[×✕✖xX]$/.test(norm(e.textContent)))
      || [...c.querySelectorAll('[class*="clear"], [class*="Clear"], [class*="remove"]')].find(vis);
    if (x) { const before = ctlText(c); click(x); if (await waitFor(() => ctlText(c) !== before, 1200)) { await sleep(200); return; } }
    click(ctlRow(c));
    const any = await waitFor(() => [...c.querySelectorAll('li, .with-icon')].find(li => vis(li) && ANY.test(norm(li.textContent))), 1500);
    if (any) { click(any); await sleep(250); } else click(ctlRow(c));
  }
  // ---------- listas do filtro (schema) ----------
  let schema = null;
  F.store.get(['schema'], r => { schema = r.schema || null; });
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.schema) schema = ch.schema.newValue || null; });
  // a lista guardada só vale se a tela tem as mesmas caixas (Atletas x Consumíveis têm caixas diferentes)
  const schemaFits = () => !!(schema && schema.ctls && schema.ctls.length === filterControls().length);
  // o texto mostrado na caixa i é um valor escolhido? (true / false / null = não sei)
  const isPicked = (i, shown) => schemaFits() && schema.ctls[i] ? (schema.ctls[i].options.includes(shown) && shown !== schema.ctls[i].label) : null;
  function saveSchema(sc) { schema = sc; try { F.store.set({ schema: sc }); } catch {} }
  const listNew = (label, n) => `${label}: ${n.slice(0, 6).join(', ')}${n.length > 6 ? ` +${n.length - 6}` : ''}`;
  // Acha opções novas (eventos de raridade novos etc.) sempre que as listas aparecem na tela, sem clicar em nada.
  function scanNewOptions() {
    if (F.isBusy() || !schemaFits()) return;
    const found = [];
    filterControls().forEach((c, i) => {
      const opts = ctlOptions(c).filter(o => !ANY.test(o));
      if (opts.length < 2) return;
      const known = new Set(schema.ctls[i].options), fresh = opts.filter(o => !known.has(o));
      if (!fresh.length) return;
      schema.ctls[i].options = [...opts, ...schema.ctls[i].options.filter(o => !opts.includes(o))];
      found.push(listNew(schema.ctls[i].label, fresh));
    });
    if (found.length) { saveSchema({ ...schema, t: Date.now() }); log(`🆕 Opções novas no filtro → ${found.join(' · ')}`, 'good'); }
  }
  setInterval(() => { try { if (F.alive() && searchView()) scanNewOptions(); } catch {} }, 3000);

  // lê as caixas do filtro (nome + opções) para o painel montar os seus próprios menus
  async function readSchema() {
    await backToSearch();
    const cur = captureFilter();
    await resetFilter();
    const out = [];
    const cs = filterControls();
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      const all = await openOptions(c);
      const opts = all.filter(o => !ANY.test(o));
      const shown = ctlText(c);
      // se a caixa mostra um valor escolhido (ex.: "Prata") em vez do nome, usa o nome padrão da posição
      const picked = opts.includes(shown) || ANY.test(shown);
      out.push({ label: picked ? (STD[i] || `Filtro ${i + 1}`) : shown, def: picked ? '' : shown, options: opts });
    }
    const now = filterControls().map(ctlText);
    if (cur.player || cur.ctls.some((t, i) => t !== now[i])) await applyFilter({ ...cur, name: 'anterior' }, { reset: false });
    await writePrices(cur.prices);   // o Redefinir apaga os preços: devolve o que estava na tela
    // avisa o que é novo desde a última leitura
    if (schema && schema.ctls && schema.ctls.length === out.length) {
      const news = out.map((c, i) => { const k = new Set(schema.ctls[i].options); const n = c.options.filter(o => !k.has(o)); return n.length ? listNew(c.label, n) : ''; }).filter(Boolean);
      if (news.length) log(`🆕 Opções novas no filtro → ${news.join(' · ')}`, 'good');
    }
    const sc = { t: Date.now(), ctls: out };
    saveSchema(sc);
    return sc;
  }
  async function suggestPlayers(q) {
    await backToSearch();
    const inp = playerInput();
    if (!inp) throw new Error('Não achei o campo do nome do jogador.');
    setInput(inp, '', { blur: false }); await sleep(120);
    setInput(inp, q, { blur: false });
    const l = await waitFor(() => playerList().length ? playerList() : null, 5000);
    const res = (l || []).map(playerOpt);
    setInput(inp, ''); await sleep(100);
    return res;
  }
  async function pickPlayer(name, rating) {
    const inp = playerInput();
    if (!inp) throw new Stop('Não achei o campo do nome do jogador no filtro.');
    setInput(inp, '', { blur: false }); await sleep(150);
    setInput(inp, name, { blur: false });
    const opts = await waitFor(() => playerList().length ? playerList() : null, 6000);
    if (!opts) throw new Stop(`O Web App não sugeriu nenhum jogador para "${name}".`);
    const same = opts.filter(b => playerOpt(b).name.toLowerCase() === name.toLowerCase());
    const exact = same.find(b => !rating || playerOpt(b).rating === rating) || same[0];
    click(exact || opts[0]); await pause(0.8);
  }
  // f = { name, player, playerRating, ctls: [texto desejado por caixa ou ''] }
  // a tela já está com esse filtro?
  function filterMatches(f) {
    const cur = filterControls().map(ctlText), want = f.ctls || [];
    const pi = playerInput(), pv = pi ? norm(pi.value).toLowerCase() : '';
    if ((f.player || '').toLowerCase() !== pv) return false;
    if (want.length !== cur.length) return false;
    return want.every((w, i) => w ? cur[i] === w : isPicked(i, cur[i]) === false);
  }
  async function applyFilter(f, { reset = true } = {}) {
    await backToSearch();
    if (schemaFits() && filterMatches(f)) { await writePrices(f.prices); return false; }
    const resetOk = reset ? await resetFilter() : true;
    const defs = filterControls().map(ctlText);
    if (f.player) await pickPlayer(f.player, f.playerRating);
    else { const pi = playerInput(); if (pi && norm(pi.value)) { setInput(pi, ''); await sleep(150); } }
    for (let i = 0; i < (f.ctls || []).length; i++) {
      const want = f.ctls[i];
      const c = filterControls()[i];
      if (!want) {
        if (!c) continue;
        const shown = ctlText(c);
        let picked = isPicked(i, shown);
        if (picked == null && !resetOk) picked = (await openOptions(c)).filter(x => !ANY.test(x)).includes(shown);
        if (picked) await clearCtl(c);
        continue;
      }
      if (want === defs[i] || (c && ctlText(c) === want)) continue;
      if (!c) throw new Stop(`O filtro "${f.name || ''}" não bate com a tela (caixa ${i + 1} sumiu).`);
      click(ctlRow(c)); await sleep(350);
      const opt = await waitFor(() => [...c.querySelectorAll('li, .with-icon')].find(li => vis(li) && norm(li.textContent) === want), 3000);
      if (!opt) { click(ctlRow(c)); throw new Stop(`Não achei a opção "${want}" no filtro.`); }
      click(opt); await pause(0.6);
    }
    await writePrices(f.prices);
  }

  // ---------- resultados e compra ----------
  const rows = () => F.items().filter(r => T.row.test(r.innerText));
  const { rowBuyNow, buyBtn, btnPrice, noResultsEl, ownedPanel, coins, itemIdent } = F;

  // uma busca com os preços dados; devolve 'rows' | 'none' | null (sem resposta)
  async function doSearch(minP, maxP) {
    await backToSearch();
    const f = priceFilters();
    if (!f) throw new Soft('Os campos de preço do filtro não apareceram.');
    if (num(f.binMax.value) !== (maxP || null)) setInput(f.binMax, maxP || '');
    if (num(f.binMin.value) !== (minP || null)) setInput(f.binMin, minP || '');
    const sb = searchBtn();
    if (!sb) throw new Soft('Não achei o botão "Pesquisar".');
    await sleep(30);
    click(sb);
    countRequest();
    const t0 = Date.now();
    return waitFor(() => {
      if (searchView() || loading()) return null;
      if (rows().length) return 'rows';
      if (noResultsEl()) return 'none';
      if (Date.now() - t0 > 1500 && T.noResults.test(F.pageText())) return 'none';
      return null;
    }, 15000);
  }

  async function priceCheck() {
    let best = null, max = 0;
    for (let i = 0; i < 5; i++) {
      const got = await doSearch(0, max);
      if (got !== 'rows') break;
      const ps = rows().map(rowBuyNow).filter(p => p != null);
      if (!ps.length) break;
      best = Math.min(...ps);
      if (best <= 200) break;
      max = ladderPrev(best);
      await idle(rnd(900, 1600));
    }
    return best;
  }

  // Compra a oferta mais barata que caiba no limite. Uma tentativa só: se alguém comprar antes (ou a oferta sumir),
  // não tenta a carta de baixo, que já é uma oferta velha; volta e faz uma pesquisa nova.
  async function buyFromResults(maxP) {
    const tried = new WeakSet();
    let lastWhy = null;
    for (let attempt = 1; attempt <= 1; attempt++) {
      const list = rows().filter(r => !tried.has(r) && !T.soldOrExpired.test(r.innerText))
        .map(r => ({ r, p: rowBuyNow(r) })).filter(x => x.p != null && x.p <= maxP).sort((a, b) => a.p - b.p);
      if (!list.length) return attempt === 1 ? { r: 'none' } : { r: 'lost', why: lastWhy };
      const best = list[0]; tried.add(best.r);
      const ident = itemIdent(best.r);
      if (!best.r.classList.contains('selected')) click(best.r);
      const b = await waitFor(() => { const x = buyBtn(); return x && btnPrice(x) === best.p ? x : null; }, 2500)
        || await waitFor(buyBtn, 800);
      if (!b) { lastWhy = 'o botão Comprar já não apareceu'; continue; }
      const price = btnPrice(b);
      if (price == null || price > maxP) { lastWhy = `preço ${fmt(price)} fora do limite`; continue; }
      if (D.cfg.run === 'test') return { r: 'dry', price, ident };
      if (D.cfg.run === 'assist') {
        const ok = await askConfirm(ident, price);
        if (!ok) { ev('skip', { name: ident.name, rating: ident.rating, price, why: 'você pulou (modo assistido)' }); return { r: 'skip', ident }; }
        if (!vis(b)) { lastWhy = 'a oferta sumiu enquanto você confirmava'; continue; }
      }

      const coinsBefore = coins();
      dismissNotifications();
      // só contam os avisos que surgirem depois deste clique (um aviso antigo na tela não pode decidir esta compra)
      const oldN = new Set([...document.querySelectorAll('.Notification')].filter(vis));
      const freshText = () => [...dialogs(), ...[...document.querySelectorAll('.Notification')].filter(n => vis(n) && !oldN.has(n))].map(d => d.innerText).join(' ');
      click(b);
      let okClicked = false;
      const res = await waitFor(() => {
        const pt = freshText();
        if (T.lost.test(pt)) return 'lost';
        if (T.won.test(pt) || T.boughtFor.test(pt)) return 'won';
        if (!okClicked) {
          const dlg = dialogs().pop();
          const ok = dlg && find(T.okBuy, { root: dlg, deep: false });
          if (ok && !T.lost.test(dlg.innerText)) { okClicked = true; click(ok); return null; }
        }
        if (coinsBefore != null) { const v = coins(); if (v != null && coinsBefore - v >= price - 1) return 'coins'; }
        if (!buyBtn() && fastFind(T.listOnMarket) && fastFind(T.sendToClub)) return 'won';
        return null;
      }, 4500);
      if (res === 'lost') {
        lastWhy = 'alguém comprou antes';
        log(`   ✖ ${lastWhy} (${ident.name} ${fmt(price)}) — voltando para pesquisar de novo…`, 'warn');
        ev('lost', { name: ident.name, rating: ident.rating, price, why: lastWhy });
        closeDialog(); dismissNotifications();
        await sleep(120);
        continue;
      }
      // sem mensagem clara: o saldo decide (caiu o valor da carta = comprou)
      if (res === 'won' || res === 'coins') return { r: 'bought', price, ident, byCoins: res === 'coins' };
      const c = await waitFor(() => { const v = coins(); return coinsBefore != null && v != null && coinsBefore - v >= price - 1 ? v : null; }, 800);
      if (c != null || ownedPanel()) return { r: 'bought', price, ident, byCoins: true };
      const seenTxt = snip(freshText());
      lastWhy = (coinsBefore == null ? 'sem confirmação (não consegui ler o saldo)' : 'sem confirmação e o saldo não mudou') + (seenTxt ? ` [tela: "${seenTxt}"]` : '');
      log(`   ✖ ${ident.name} ${fmt(price)}: ${lastWhy}; contando como perdida e pesquisando de novo.`, 'warn');
      ev('lost', { name: ident.name, rating: ident.rating, price, why: lastWhy });
      closeDialog(); dismissNotifications();
      return { r: 'lost', why: lastWhy };
    }
    if (lastWhy && !/alguém comprou/.test(lastWhy)) log(`   ✖ ${lastWhy} — voltando para pesquisar de novo…`, 'warn');
    return { r: 'lost', why: lastWhy || 'sem oferta' };
  }

  // ---------- depois de comprar ----------
  // destino do filtro salvo em uso (se ele tiver um) ou o do painel
  let curDest = null;
  const A = () => curDest && curDest.dest ? { ...D.cfg, ...curDest } : D.cfg;
  async function toTransferList() {
    const b = await waitFor(() => fastFind(T.sendToTL), 3000);
    if (!b || b.disabled) return false;
    click(b);
    await waitFor(() => !vis(b) || dialogs().length, 3000);
    if (T.full.test(F.popupText())) { closeDialog(); return false; }
    closeDialog();
    return true;
  }
  async function afterBuy(res, market) {
    const a = A();
    const out = { profit: null, sale: null, why: '' };
    // plano B: quando o destino escolhido não deu certo
    const planB = async why => {
      if (a.fallback === 'transfer' && await toTransferList().catch(() => false)) { out.why = `${why}; foi para a Lista de transf.`; log(`   ${why}; enviei para a Lista de Transferências.`, 'warn'); }
      else { out.why = `${why}; ficou nos não atribuídos`; log(`   ${why}; ficou nos não atribuídos.`, 'warn'); }
      return out;
    };
    try {
      if (a.dest === 'keep') { out.why = 'guardada nos não atribuídos'; log('   ficou nos não atribuídos.'); return out; }
      if (a.dest === 'club') {
        const b = await waitFor(() => fastFind(T.sendToClub), 4000);
        if (!b || b.disabled) return planB('não deu para mandar ao clube (repetida?)');
        click(b);
        await waitFor(() => !vis(b) || dialogs().length, 3000); closeDialog();
        out.why = 'enviada ao clube'; log('   enviada para o clube.', 'good'); return out;
      }
      if (a.dest === 'transfer') {
        if (await toTransferList()) { out.why = 'enviada para a Lista de transf.'; log('   enviada para a Lista de Transferências.', 'good'); return out; }
        out.why = 'não deu para enviar à Lista de transf. (cheia?); ficou nos não atribuídos'; log('   não consegui enviar para a Lista de Transferências (cheia?); ficou nos não atribuídos.', 'warn'); return out;
      }
      // vender
      let l;
      if (a.sellHow === 'fixed' || a.sellHow === 'margin') {
        const p = a.sellHow === 'margin' ? ladderUp(Math.ceil(res.price * (1 + (a.sellPct || 10) / 100) / 0.95)) : (a.sellPrice || market);
        if (!p) return planB('sem preço de venda definido');
        if (a.sellHow === 'fixed' && a.noLoss && net(ladderDown(p)) <= res.price) return planB(`vender por ${fmt(p)} dá prejuízo depois dos 5% do EA`);
        l = await F.listFixed(p);
      } else l = await F.listCheapest({ buy: res.price, noLoss: a.noLoss });
      if (!l.ok) {
        if (l.full) { await planB('a Lista de Transferências está cheia'); throw new Stop('A Lista de Transferências está cheia. Retire os vendidos (ou rode o Relist) e inicie de novo.'); }
        return planB('não listei: ' + l.why);
      }
      out.sale = l.bn; out.profit = net(l.bn) - res.price; out.why = `listada por ${fmt(l.bn)}`;
      log(`   listada por ${fmt(l.bn)} → lucro estimado ${fmt(out.profit)}.`, out.profit >= 0 ? 'good' : 'warn');
      return out;
    } catch (e) {
      if (e instanceof Stop) throw e;
      return planB('erro depois da compra: ' + e.message);
    }
  }

  // ---------- registro ----------
  let curFilter = 'Filtro da tela';
  const ev = (kind, o = {}) => F.ev(kind, { mod: 'snipe', filter: curFilter, ...o });
  function countRequest() { D.reqs.push(Date.now()); S.searches++; F.persist('reqs'); F.changed(); }
  const lastAlert = {};
  function samplePrice(p, src) {
    if (p == null) return;
    const arr = D.prices[curFilter] || (D.prices[curFilter] = []);
    const last = arr[arr.length - 1], now = Date.now();
    if (last && now - last.t < 6e4) { if (p < last.p) { last.p = p; last.s = src; } }
    else arr.push({ t: now, p, s: src });
    F.persist('prices');
    const a = D.alerts[curFilter];
    if (a && p <= a && now - (lastAlert[curFilter] || 0) > 5 * 6e4) {
      lastAlert[curFilter] = now;
      log(`🔔 Alerta: ${curFilter} apareceu por ${fmt(p)} (seu alerta: ≤ ${fmt(a)}).`, 'warn');
      F.beep(1200, 400);
    }
  }

  // ---------- modo assistido (responde pelo widget ou pelo painel) ----------
  let pending = null;
  function askConfirm(ident, price) {
    return new Promise(resolve => {
      const until = Date.now() + 10000;
      pending = { name: `${ident.name} ${ident.rating || ''}`.trim(), price, until, resolve };
      F.beep(1000, 150); F.changed();
      const iv = setInterval(() => { if (!pending || Date.now() > until || F.stopping()) { clearInterval(iv); answer(false); } else F.changed(); }, 250);
    });
  }
  function answer(v) { if (!pending) return; const p = pending; pending = null; p.resolve(v); F.changed(); }

  // ---------- execução ----------
  const S = { searches: 0, bought: 0, spent: 0, profit: 0, dry: 0, lost: 0, t0: 0, offer: null, warnedMax: false, last: '' };
  const waits = () => D.cfg.speed === 'custom' ? [D.cfg.waitMin, Math.max(D.cfg.waitMin, D.cfg.waitMax)] : (SPEEDS[D.cfg.speed] || SPEEDS.rapida).wait;
  const restRange = () => (D.cfg.rest || '30-120').split('-').map(Number);
  const lim = () => D.cfg.maxBuys ? (D.cfg.run === 'test' ? S.dry : S.bought) >= D.cfg.maxBuys : false;
  const fatal = e => e instanceof Stop;

  // filtro montado no painel (rascunho); null = usar o que está na tela do Web App
  async function panelFilter() {
    const r = await F.store.get(['draft', 'schema']);
    const d = r.draft, sc = r.schema;
    if (!d || !sc || !sc.ctls || !sc.ctls.length) return null;
    const ctls = sc.ctls.map((_, i) => (d.sel && d.sel[i]) || '');
    if (!d.player && !ctls.some(Boolean)) return null;   // nada escolhido no painel: respeita o filtro da tela
    const desc = [d.player ? `${d.player}${d.playerRating ? ' ' + d.playerRating : ''}` : '', ...ctls.filter(Boolean)].filter(Boolean).join(' · ');
    return { name: desc || 'Filtro do painel', player: d.player || '', playerRating: d.playerRating || null, ctls };
  }
  async function snipe() {
    const cfg = D.cfg;
    Object.assign(S, { searches: 0, bought: 0, spent: 0, profit: 0, dry: 0, lost: 0, t0: Date.now(), offer: null, warnedMax: false, last: '' });
    F.changed();
    const market = {};
    try {
      if (!searchView()) {
        if (rows().length || noResultsEl()) await backToSearch();
        else throw new Stop('Abra Transfer. → Pesquisar no Mercado, monte o seu filtro e clique em Snipar.');
      }
      if (!(await waitFor(priceFilters, 5000))) throw new Stop('Não achei os campos de preço do filtro (Lance / Comprar já).');
      if (cfg.dest === 'sell' && cfg.sellHow === 'fixed' && !cfg.sellPrice && cfg.mode !== 'profit') throw new Stop('Defina o preço de venda (Após comprar → Vender → Preço fixo).');
      const fl = cfg.rotateFilters ? D.filters.filter(f => f.on) : [];
      if (cfg.rotateFilters && !fl.length) throw new Stop('Marque pelo menos um filtro salvo ou desligue "Alternar filtros".');
      // listas do filtro com mais de 12 h (ou nunca lidas): lê de novo para pegar raridades novas
      if (!fl.length && (!schema || Date.now() - (schema.t || 0) > 12 * 36e5)) {
        log('   atualizando as listas do filtro (raridades e eventos novos)…');
        try { await readSchema(); } catch (e) { if (fatal(e)) throw e; log(`   não consegui atualizar as listas (${e.message}); sigo assim mesmo.`, 'warn'); }
      }
      // sem "Alternar filtros": vale o filtro montado no painel; se não tiver nada escolhido lá, vale o da tela
      let baseName = 'Filtro da tela';
      if (!fl.length) {
        const pf = await panelFilter();
        if (pf) {
          baseName = pf.name;
          for (let k = 1; ; k++) {
            try { const changed = await applyFilter(pf); log(changed === false ? `🔎 Filtro do painel (já estava na tela): ${pf.name}` : `🔎 Filtro do painel aplicado: ${pf.name}`); break; }
            catch (e) { if (fatal(e) || k >= 3) throw e; log(`   não consegui aplicar o filtro (${e.message}); tentando de novo…`, 'warn'); await recover().catch(() => {}); }
          }
        } else log('   nada escolhido no filtro do painel: uso o filtro que está na tela do Web App.');
      }
      const runName = { test: 'TESTE (não compra)', assist: 'ASSISTIDO', real: 'AUTOMÁTICO' }[cfg.run];
      log(`▶ Snipe ${runName} · ${cfg.mode === 'profit' ? `por lucro (${cfg.profitPct}%)` : 'por preço'} · ${(SPEEDS[cfg.speed] || {}).name || ''}${fl.length ? ` · ${fl.length} filtro(s)` : ''}${cfg.maxBuys ? ` · até ${cfg.maxBuys} compra(s)` : ''} · após comprar: ${FSB.destName(cfg)}.`, 'good');

      let fi = -1, fails = 0, limitHits = [];
      for (let block = 0; ; block++) {
        let cur = null;
        curFilter = baseName; curMin = null; curDest = null;
        if (fl.length) {
          fi = (fi + 1) % fl.length; cur = fl[fi]; curFilter = cur.name; curMin = cur.minBuy != null ? cur.minBuy : null; curDest = cur.dest ? { dest: cur.dest, sellHow: cur.sellHow, sellPrice: cur.sellPrice, sellPct: cur.sellPct, fallback: cur.fallback } : null;
          if (block === 0 || fl.length > 1) {
            log(`🔎 Filtro: ${cur.name}`);
            for (let k = 1; ; k++) {
              try { await applyFilter(cur); break; }
              catch (e) { if (fatal(e) || k >= 3) throw e; log(`   não consegui aplicar o filtro (${e.message}); tentando de novo…`, 'warn'); await recover().catch(() => {}); }
            }
          }
        }
        const key = cur ? cur.id : 'tela';
        const n = rndInt(Math.ceil(cfg.tries * 0.6), cfg.tries);
        for (let i = 0; i < n; i++) {
          try {
            if (F.stopping()) throw new Stop('Parado por você.');
            if (lim()) throw new Stop(`Pronto: chegou no limite de ${cfg.maxBuys} compra(s).`);
            if (cfg.runFor && Date.now() - S.t0 >= cfg.runFor * 6e4) throw new Stop('Pronto: passou o tempo programado.');
            if (cfg.dailyMax && D.reqs.filter(t => Date.now() - t < DAY).length >= cfg.dailyMax) throw new Stop(`Parei: ${fmt(cfg.dailyMax)} buscas em 24 h (seu limite diário).`);
            const left = cfg.maxSpend ? cfg.maxSpend - S.spent : Infinity;
            if (left < 200) throw new Stop(`Pronto: chegou no limite de gasto (${fmt(S.spent)}).`);

            let maxP;
            if (cfg.mode === 'profit') {
              const m = market[key];
              if (!m || Date.now() - m.t > cfg.recheckMin * 6e4) {
                log('   💹 conferindo o preço de mercado…');
                const p = await priceCheck();
                market[key] = { t: Date.now(), p };
                if (!p) log('   ninguém vendendo esse filtro agora; tento de novo depois.', 'warn');
                else { samplePrice(p, 'mercado'); log(`   mercado: ${fmt(p)} → oferta até ${fmt(ladderDown(net(p) / (1 + cfg.profitPct / 100)))}.`); }
                await idle(rnd(...waits()));
                continue;
              }
              if (!m.p) { market[key] = null; await idle(rnd(...waits())); continue; }
              maxP = ladderDown(net(m.p) / (1 + cfg.profitPct / 100));
            } else if (cur && cur.maxBuy) maxP = ladderDown(cur.maxBuy);
            else if (cfg.useFilterMax) {
              const f = priceFilters();
              maxP = f && num(f.binMax.value);
              if (!maxP) throw new Stop('Preencha "Comprar já máx." no filtro da tela (ou desligue "Usar o máximo do filtro").');
            } else maxP = ladderDown(cfg.maxBuy);
            maxP = Math.min(maxP, left);
            if (maxP < 200) throw new Stop('O valor de oferta ficou abaixo de 200.');
            S.offer = maxP;

            const got = await doSearch(nextMin(maxP), maxP);
            if (!got) { log('   a busca não respondeu; tentando de novo.', 'warn'); ev('timeout', { why: 'a busca não respondeu em 15 s', price: maxP }); }
            else if (got === 'rows') {
              const seen = rows().map(rowBuyNow).filter(p => p != null);
              if (seen.length) samplePrice(Math.min(...seen), 'busca');
              if (!S.warnedMax && seen.some(p => p > maxP)) { S.warnedMax = true; log(`   ⚠ a busca trouxe ofertas acima de ${fmt(maxP)}: o "Comprar já máx." não foi aplicado no filtro. Continuo comprando só até ${fmt(maxP)}.`, 'warn'); }
              const res = await buyFromResults(maxP);
              if (res.r === 'dry') {
                const a = A(), estSale = a.dest !== 'sell' ? null : a.sellHow === 'fixed' && a.sellPrice ? a.sellPrice : a.sellHow === 'margin' ? ladderUp(Math.ceil(res.price * (1 + (a.sellPct || 10) / 100) / 0.95)) : (market[key] && market[key].p) || null;
                const est = estSale ? net(estSale) - res.price : null;
                S.dry++;
                log(`[teste] ${res.ident.name} ${res.ident.rating || ''}: compraria por ${fmt(res.price)}${est != null ? ` (lucro projetado ${fmt(est)})` : ''}.`, 'good'); F.beep(660, 120);
                ev('dry', { name: res.ident.name, rating: res.ident.rating, price: res.price, sale: estSale, profit: est, why: `oferta até ${fmt(maxP)}` });
              } else if (res.r === 'bought') {
                S.bought++; S.spent += res.price;
                log(`✔ ${res.ident.name} ${res.ident.rating || ''} comprada por ${fmt(res.price)}!${res.byCoins ? ' (confirmada pelo saldo)' : ''}`, 'good'); F.beep();
                const rec = ev('bought', { name: res.ident.name, rating: res.ident.rating, price: res.price });
                const a = await afterBuy(res, market[key] && market[key].p);
                Object.assign(rec, { sale: a.sale, profit: a.profit, why: a.why });
                if (a.profit != null) S.profit += a.profit;
                F.persist('events'); F.sampleBank();
              } else if (res.r === 'lost') S.lost++;
              else if (res.r === 'skip') log(`   pulada por você: ${res.ident.name}.`);
            }
            if (got) fails = 0;
            F.changed();
            await idle(rnd(...waits()));
          } catch (e) {
            if (e instanceof Limited) {
              limitHits = limitHits.filter(t => Date.now() - t < 15 * 6e4); limitHits.push(Date.now());
              ev('block', { why: 'aviso do EA: ' + e.message });
              if (limitHits.length >= 3) throw new Stop(`O EA limitou o mercado 3 vezes em 15 min. Pare um bom tempo. Aviso: "${e.message}"`);
              const s = rndInt(90, 180) * limitHits.length;
              log(`   ⏸ aviso do EA: "${e.message}" — pausando ${s}s e continuando (${limitHits.length}/3)…`, 'warn');
              S.last = `pausa ${s}s (aviso do EA)`; F.changed();
              for (let k = 0; k < 4 && dialogs().length; k++) { closeDialog(); await sleep(200); }
              dismissNotifications();
              await idle(s * 1000); S.last = '';
              await recover().catch(e2 => { if (fatal(e2)) throw e2; });
              continue;
            }
            if (fatal(e)) throw e;
            fails++;
            log(`   ⚠ ${e.message} — voltando para a pesquisa e continuando (${fails}/8)…`, 'warn');
            ev('error', { why: e.message + ' (recuperado)' });
            if (fails >= 8) throw new Stop('Falhou 8 vezes seguidas sem conseguir voltar para a pesquisa. Abra o filtro e clique em Snipar de novo.');
            try { await recover(); } catch (e2) { if (fatal(e2)) throw e2; await idle(2000 * fails); }
          }
        }
        const [a, b] = restRange(), s = rndInt(a, b);
        log(`   ☕ descansando ${s}s (${fmt(S.searches)} buscas nesta sessão)…`);
        S.last = `descansando ${s}s`; F.changed();
        await idle(s * 1000);
        S.last = '';
      }
    } catch (e) {
      if (e instanceof Limited) e = new Stop(`O EA limitou o mercado. Aviso: "${e.message}"`);
      const ok = e instanceof Stop && /^(Parado|Pronto)/.test(e.message);
      if (!ok) ev(e instanceof Stop ? (/captcha|limitou o mercado|moedas insuficientes/i.test(e.message) ? 'block' : 'stop') : 'error', { why: e.message });
      log((e instanceof Stop ? '■ ' : '⚠ Erro: ') + e.message, ok ? 'good' : 'bad');
      if (!ok) F.beep(330, 600);
      log(`   sessão: ${fmt(S.searches)} buscas, ${S.bought} compra(s), ${S.lost} perdida(s), ${fmt(S.spent)} gastas, lucro estimado ${fmt(S.profit)}.`);
    } finally {
      S.last = ''; answer(false); F.changed();
    }
  }

  // ---------- comandos do painel ----------
  const start = () => { if (!F.isBusy()) F.task('snipe', 'snipando', snipe).catch(e => log('⚠ ' + e.message, 'bad')); };
  const tool = (what, fn) => F.task('snipe', what, fn);
  F.mod('snipe', {
    start, answer,
    status: () => ({ running: isRunning(), S, pending: pending ? { name: pending.name, price: pending.price, left: Math.max(0, Math.ceil((pending.until - Date.now()) / 1000)) } : null }),
    async cmd(m) {
      switch (m.op) {
        case 'start': if (F.isBusy()) throw new Error('Outro módulo está trabalhando. Pare ele antes.'); start(); await sleep(50); return F.status();
        case 'confirm': answer(!!m.v); return F.status();
        case 'capture': return captureFilter();
        case 'schema': return tool('lendo o filtro', readSchema);
        case 'players': return tool('procurando jogador', () => suggestPlayers(m.q));
        case 'apply': return tool('aplicando o filtro', async () => { await applyFilter(m.filter); return { ok: true }; });
        case 'priceCheck': return tool('conferindo o preço', async () => { curFilter = m.name || 'Filtro da tela'; const p = await priceCheck(); if (p) samplePrice(p, 'mercado'); return { price: p }; });
        default: throw new Error('comando desconhecido');
      }
    },
  });
})();
