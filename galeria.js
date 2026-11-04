// Módulo Galeria — compra as cartas que faltam na galeria do Paletools e lista no mais barato.
// Fluxo por carta: Mercado -> Comprar já (se <= preço máximo) -> Listar no Mercado -> Mais barato -> Listar.
(() => {
  'use strict';
  if (window.__futGal) return;
  window.__futGal = true;
  const { fmt, norm, num, net } = FSB;
  const F = FUT, D = F.D, T = F.T;
  const { Stop, Limited, sleep, vis, find, click, pageText, dialogs, loading, leavesWithText, buyBtn, btnPrice, coins, rowBuyNow, closeDialog, confirmIfAsked } = F;
  const C = () => D.galCfg;
  const log = (m, c = '') => F.log(m, c, 'gal');
  const isRunning = () => F.run.owner === 'gal';
  const pause = (k = 1) => sleep((C().delay || 900) * k);
  // a galeria precisa de leituras espaçadas (cartas "estáveis" entre duas leituras)
  const waitFor = (fn, ms, what) => F.waitFor(fn, ms, what, 200);

  // ---------- galeria ----------
  function readGallery() {
    const t = pageText();
    if (!/players? to complete|cards selected/i.test(t)) return null;
    const req = num((t.match(/Requires\s+(\d+)/i) || [])[1]);
    const m = t.match(/(\d+)\s*\/\s*(\d+)\s*cards selected/i);
    const pts = num((t.match(/([\d.,]+)\s*points\s*\n?\s*\d+\s*\/\s*\d+\s*cards selected/i) || [])[1]);
    return { req: req || (m ? +m[2] : null), sel: m ? +m[1] : 0, pts };
  }
  function exactMercado(root = document) {
    return [...root.querySelectorAll('button, [role=button], div, span, a')]
      .filter(e => !F.mine(e) && T.market.test(norm(e.textContent)) && vis(e))
      .filter((e, _, arr) => !arr.some(o => o !== e && e.contains(o)));
  }
  const NOT_NAME = /^([A-Z]{2,4}\s?\d{1,2}|Missing.*|Collected.*|Include|Remove|points?|\W+)$/i;
  function cardName(tile, lines) {
    const ok = s => s && /[A-Za-zÀ-ÿ]{2,}/.test(s) && !NOT_NAME.test(s) && !T.market.test(s) && !T.pos.test(s) && !/[★*]\d|\d[ED]\d|\[/.test(s) && s.length < 40;
    let n = lines.find(ok);
    if (n) return n;
    // o nome pode ficar fora do bloco, logo acima dele: procura pelo texto que está ali na tela
    const r = tile.getBoundingClientRect();
    for (const y of [r.top + 14, r.top - 10, r.top - 24, r.top + 28]) {
      for (const el of document.elementsFromPoint(r.left + r.width / 2, y)) {
        if (F.mine(el)) continue;
        n = norm(el.innerText || '');
        if (n.includes('\n')) n = norm(el.innerText.split('\n')[0]);
        if (ok(n)) return n;
      }
    }
    for (const el of tile.querySelectorAll('[title], [alt], [aria-label]')) {
      n = norm(el.getAttribute('title') || el.getAttribute('alt') || el.getAttribute('aria-label'));
      if (ok(n)) return n;
    }
    for (const el of tile.querySelectorAll('*')) {
      if (el.children.length) continue;
      n = norm(el.textContent);
      if (ok(n)) return n;
    }
    return '';
  }
  // quantas cartas a galeria pede, quantas já estão selecionadas, quantas suas ainda não foram incluídas e quantas faltam comprar
  function galleryStatus() {
    const g = readGallery();
    if (!g) return null;
    const ownedUnsel = [...document.querySelectorAll('button, [role=button]')]
      .filter(b => vis(b) && !F.mine(b) && /^Include$/i.test(norm(b.textContent)))
      .filter(b => { let t = b; for (let i = 0; i < 8 && t.parentElement; i++) { t = t.parentElement; if (/Collected|Missing/i.test(t.innerText)) break; } return /Collected/i.test(t.innerText) && !/Missing/i.test(t.innerText); }).length;
    const missingTiles = galleryTiles().length;
    const toBuy = g.req ? Math.max(0, g.req - g.sel - ownedUnsel) : null;
    return { ...g, ownedUnsel, missingTiles, toBuy };
  }
  function galleryTiles() {
    return exactMercado().map(btn => {
      let tile = btn;
      while (tile.parentElement && tile.parentElement !== document.body && exactMercado(tile.parentElement).length === 1) tile = tile.parentElement;
      const lines = tile.innerText.split('\n').map(norm).filter(Boolean);
      const name = cardName(tile, lines);
      const rating = num(lines.find(l => /^\d{2}$/.test(l)));
      const missing = num((tile.innerText.match(/Missing\s*[·•-]?\s*([\d.,]+)\s*points/i) || [])[1]);
      // posições da carta (MD PD ATA…) diferenciam versões do mesmo jogador com o mesmo overall
      const posTokens = lines.filter(l => T.pos.test(l)).join(' ');
      const pos = tile.parentElement ? [...tile.parentElement.children].indexOf(tile) : -1;
      const key = name ? [name, rating, posTokens, missing].join('|') : 'pos' + pos + '|' + rating;
      return { btn, tile, name: name || 'carta #' + (pos + 1), rating, missing, key, isMissing: /Missing/i.test(tile.innerText) };
    }).filter(t => t.isMissing);
  }

  // ---------- mercado ----------
  // só linhas de leilão de verdade (o Paletools usa a mesma classe nas cartas da galeria)
  const rows = () => F.items().filter(r => !exactMercado(r).length && T.tlRow.test(r.innerText));
  const noResults = () => F.noResultsEl() || T.noResults.test(pageText());
  const wonText = () => T.won.test(pageText());
  const ownedPanel = () => !buyBtn() && ((!!find(T.listOnMarket) && !!find(T.sendToClub)) || T.boughtFor.test(pageText()));
  const itemIdent = (el, fb) => F.itemIdent(el, fb);

  async function buyFromResults(card, maxP) {
    await waitFor(() => !loading() && (rows().length || noResults() || buyBtn()), 45000, 'os resultados da busca');
    await pause(0.6);
    if (!rows().length && !buyBtn()) return { r: 'none' };
    // Tenta a oferta mais barata que caiba no limite; se alguém comprar antes, tenta a próxima mais barata
    // (até "ofertas por carta"), ignorando as que já tentou e as que aparecem como vendidas/expiradas.
    const TRIES = Math.max(1, C().retries || 1);
    const tried = new WeakSet(), triedSig = new Set();
    const sig = r => norm(r.innerText);
    let lastWhy = null, lastPrice = null;
    for (let attempt = 1; attempt <= TRIES; attempt++) {
      if (F.stopping()) throw new Stop('Parado por você.');
      let ident = itemIdent(null, card);
      const list = rows()
        .filter(r => !tried.has(r) && !triedSig.has(sig(r)) && !T.soldOrExpired.test(r.innerText))
        .map(r => ({ r, p: rowBuyNow(r) })).filter(x => x.p != null).sort((a, b) => a.p - b.p);
      if (rows().length && !list.length) break;
      if (list.length) {
        const best = list[0];
        if (best.p > maxP) return attempt === 1 ? { r: 'expensive', price: best.p } : { r: 'fail', why: `${lastWhy}; as outras ofertas passam do limite (${fmt(best.p)})`, price: best.p };
        tried.add(best.r); triedSig.add(sig(best.r));
        ident = itemIdent(best.r, card);
        if (attempt > 1) log(`   tentando outra oferta (${attempt}/${TRIES}): ${fmt(best.p)}…`);
        if (!best.r.classList.contains('selected') || attempt > 1) { click(best.r); await pause(0.6); }
      } else if (attempt > 1) break;
      const b = await waitFor(buyBtn, 6000);
      if (!b) { lastWhy = 'o botão Comprar já não apareceu'; continue; }
      const price = btnPrice(b); lastPrice = price;
      if (price == null) { lastWhy = 'não consegui ler o preço'; continue; }
      if (price > maxP) return attempt === 1 ? { r: 'expensive', price } : { r: 'fail', why: `${lastWhy}; a próxima oferta passa do limite (${fmt(price)})`, price };
      if (C().dryRun) return { r: 'dry', price, ident };

      const coinsBefore = coins();
      click(b);
      let okClicked = false;
      const res = await waitFor(() => {
        if (wonText()) return 'won';
        if (!okClicked) {
          const dlg = dialogs().pop();
          const ok = dlg && find(T.okBuy, { root: dlg });
          if (ok && !T.lostDialog.test(dlg.innerText)) { okClicked = true; click(ok); return null; }
        }
        if (T.lost.test(F.popupText())) return 'lost';
        return null;
      }, 10000);
      // A carta é sua quando o painel mostra as ações de dono ("Listar no Mercado…", "Enviar ao Meu Clube").
      // O saldo NÃO serve de prova sozinho: se uma carta sua vende no mesmo instante, o EA credita junto.
      if (res === 'won' || ownedPanel()) {
        const ownedOk = await waitFor(ownedPanel, 4000);
        const c = coins();
        if (ownedOk || (coinsBefore != null && c != null && coinsBefore - c >= price - 1)) {
          if (coinsBefore != null && c != null && coinsBefore - c < price - 1) log(`   (saldo ${fmt(coinsBefore)} → ${fmt(c)}: uma venda sua caiu junto com a compra)`);
          return { r: 'bought', price, ident };
        }
      }
      // fecha o aviso de erro e confere mais uma vez (às vezes a confirmação chega atrasada)
      const dlg = dialogs().pop();
      const ok = dlg && find(T.okClose, { root: dlg }); if (ok) { click(ok); await pause(0.5); }
      if (await waitFor(ownedPanel, 2500)) return { r: 'bought', price, ident };
      // Só tenta outra oferta quando o jogo DISSE que perdeu (alguém comprou antes). Sem essa mensagem,
      // a compra pode ter dado certo sem o bot perceber; tentar de novo compraria a mesma carta repetida.
      if (res !== 'lost') {
        const c = coins();
        log(`   ⚠ não consegui confirmar a compra (${fmt(price)}); saldo ${fmt(coinsBefore)} → ${fmt(c)}. Não vou tentar outra oferta para não comprar repetido — confira os não atribuídos.`, 'warn');
        return { r: 'fail', why: 'compra não confirmada (pode ter comprado; veja os não atribuídos)', price };
      }
      lastWhy = 'alguém comprou antes';
      log(`   ✖ ${lastWhy} (${fmt(price)}).`, 'warn');
      F.dismissNotifications();
      await pause(0.5);
    }
    return { r: 'fail', why: lastWhy || 'sem outra oferta dentro do limite', price: lastPrice };
  }

  // galeria aberta e com as cartas desenhadas: mesma quantidade de cartas em duas leituras seguidas
  let lastTileCount = -1, readyWhy = '';
  function galleryReady() {
    if (loading()) { readyWhy = 'tela carregando'; lastTileCount = -1; return false; }
    if (!readGallery()) { readyWhy = 'galeria não está aberta'; lastTileCount = -1; return false; }
    if (rows().length) { readyWhy = 'ainda na tela do mercado'; lastTileCount = -1; return false; }
    const tiles = exactMercado().length + [...document.querySelectorAll('button, [role=button]')].filter(b => vis(b) && !F.mine(b) && /^(Include|Remove)$/i.test(norm(b.textContent))).length;
    if (!tiles) { readyWhy = 'nenhuma carta na tela'; lastTileCount = -1; return false; }
    const stable = tiles === lastTileCount;
    lastTileCount = tiles;
    return stable;
  }
  async function waitGallery(ms = 60000) {
    const t0 = Date.now(); let told = false;
    lastTileCount = -1;
    return waitFor(() => {
      if (galleryReady()) return true;
      if (!told && Date.now() - t0 > 6000) { told = true; log(`   aguardando a galeria (${readyWhy})…`, 'warn'); }
      return false;
    }, ms, `a galeria (${readyWhy || 'carregar'})`);
  }
  async function backToGallery() {
    const end = Date.now() + 90000;
    let lastBack = 0, backs = 0;
    lastTileCount = -1;
    while (Date.now() < end) {
      if (F.stopping()) throw new Stop('Parado por você.');
      F.checkBlockers();
      if (galleryReady()) { await pause(); return; }
      // só aperta "voltar" de novo se a tela parou de carregar e continua no mercado
      const onMarket = !readGallery() && !loading();
      if (onMarket && backs < 4 && Date.now() - lastBack > 5000) {
        const back = [...document.querySelectorAll('.ut-navigation-button-control, button.btn-navigation, .ut-navigation-bar-view button')].find(b => vis(b) && !F.mine(b));
        if (back) click(back);
        else document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', key: '1', bubbles: true }));
        lastBack = Date.now(); backs++;
        if (backs > 1) log('   ainda carregando, apertei voltar de novo…', 'warn');
      }
      await sleep(400);
    }
    throw new Error('a galeria não voltou em 90 s');
  }

  // ---------- histórico (compras e vendas) ----------
  const SESSION = Date.now();
  const save = () => F.persist('galBuys', 'galSold');
  function addBuy(o) {
    const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), session: SESSION, ...o };
    D.galBuys.push(rec); save(); return rec;
  }
  // Lista de Transferências: itens vendidos viram "vendida" no histórico (casando nome + overall)
  function soldCounts() {
    const counts = {};
    for (const r of rows()) {
      const tx = norm(r.innerText);
      let m = tx.match(T.soldPrice);
      if (!m && r.classList.contains('won')) m = tx.match(T.bidPrice);
      const price = m && num(m[1]);
      if (!price) continue;
      const id = itemIdent(r), sg = `${id.name}|${id.rating}|${price}`;
      counts[sg] = (counts[sg] || 0) + 1;
    }
    return counts;
  }
  function applySales(counts) {
    let changed = false, n = 0;
    for (const [k, c] of Object.entries(counts)) {
      const seen = D.galSold[k] || 0;
      const [name, rating, price] = k.split('|');
      for (let i = seen; i < c; i++) {
        const rec = D.galBuys.filter(b => (b.status === 'listed' || b.status === 'unlisted') && b.name === name && String(b.rating) === rating).sort((a, b) => a.t - b.t)[0];
        if (!rec) {
          const e = D.events.filter(x => x.kind === 'bought' && (x.mod || 'snipe') === 'snipe' && x.sale && !x.soldAt && x.name === name && String(x.rating) === rating).sort((a, b) => a.t - b.t)[0];
          if (e) {
            e.soldAt = Date.now(); e.realSale = +price; e.profit = net(+price) - e.price; e.real = true; F.persist('events');
            F.log(`💰 Vendida: ${name} ${rating} por ${fmt(+price)} → ${e.profit >= 0 ? 'lucro' : 'prejuízo'} ${fmt(Math.abs(e.profit))} (já tirando 5% do EA).`, e.profit >= 0 ? 'good' : 'bad', 'snipe');
          }
          continue;
        }
        rec.status = 'sold'; rec.sale = +price; rec.soldAt = Date.now(); n++;
        const pl = net(+price) - rec.buy;
        log(`💰 Vendida: ${name} ${rating} por ${fmt(+price)} → ${pl >= 0 ? 'lucro' : 'prejuízo'} ${fmt(Math.abs(pl))} (já tirando 5% do EA).`, pl >= 0 ? 'good' : 'bad');
      }
      if (c !== seen) { D.galSold[k] = c; changed = true; }
    }
    for (const k of Object.keys(D.galSold)) if (!(k in counts)) { delete D.galSold[k]; changed = true; }
    if (changed || n) save();
    return n;
  }
  let lastSalesSig = null;
  function scanSales() {
    if (F.isBusy() || loading() || !F.onTransferList()) { lastSalesSig = null; return; }
    const counts = soldCounts();
    const sg = JSON.stringify(counts);
    if (sg !== lastSalesSig) { lastSalesSig = sg; return; }
    applySales(counts);
  }
  F.onReady(() => setInterval(() => { try { scanSales(); } catch {} }, 1500));
  // antes de qualquer "Retirar vendidos" (Relist, Ferramentas): registra as vendas para o lucro real
  F.hooks.beforeClearSold = async () => {
    let prev = null, counts = {};
    await F.waitFor(() => { counts = soldCounts(); const sg = JSON.stringify(counts); const ok = sg === prev; prev = sg; return ok; }, 6000, null, 300);
    applySales(counts);
  };

  // registra vendas, clica "Retirar vendidos" e depois "Envie não duplicado para o clube"
  async function cleanTransferList() {
    log('🧹 Limpando a Lista de Transferências…');
    await F.goToTransferList(log);
    let prev = null, counts = {};
    await waitFor(() => { counts = soldCounts(); const sg = JSON.stringify(counts); const okk = sg === prev; prev = sg; return okk; }, 8000);
    const n = applySales(counts);
    const sold = Object.values(counts).reduce((a, b) => a + b, 0);
    const clear = F.fastFind(T.clearSold);
    if (clear) {
      click(clear); await pause(); await confirmIfAsked();
      await waitFor(() => !F.fastFind(T.clearSold) || !Object.keys(soldCounts()).length, 10000);
      D.galSold = {}; save();
      log(`   retirei ${sold} vendido(s)${n ? `, ${n} registrado(s) no lucro` : ''}.`, 'good');
    } else log('   nenhum item vendido para retirar.');
    await pause();
    const send = find(T.sendNonDup);
    if (send) {
      click(send); await pause(); await confirmIfAsked();
      log('   enviei os não repetidos para o clube.', 'good');
    }
    await pause();
  }
  // volta para Início → Gallery e reabre o time em que estava
  async function goToGallery(setName) {
    if (!readGallery()) {
      const galleryEntry = () => {
        if (/^Paletools$/i.test(F.headerTitle())) return null;   // nunca usa o "Gallery" das configurações
        const t = leavesWithText(T.gallery).find(e => !e.closest('.ut-navigation-bar-view'));
        return t ? (t.closest('.tile, [class*="tile"], button, [role=button], a') || t) : null;
      };
      for (let tries = 0; tries < 3 && !readGallery(); tries++) {
        if (!galleryEntry()) {
          const home = [...document.querySelectorAll('.ut-tab-bar-item.icon-home')].find(vis)
            || F.navBtn(T.home) || leavesWithText(T.home)[0] || find(T.home);
          if (!home) throw new Stop('Não achei o menu Início. Abra a galeria e clique em Iniciar de novo.');
          log(`   voltando para Início${tries ? ' (de novo)' : ''}…`);
          click(home.closest('.ut-tab-bar-item, button, [role=button], a') || home);
          await waitFor(galleryEntry, 10000);
        }
        const g = galleryEntry();
        if (!g) continue;
        log('   abrindo a Gallery…');
        await pause(); click(g);
        if (await waitFor(readGallery, 12000)) break;
      }
      if (!readGallery()) throw new Stop('Não consegui voltar para a Gallery pelo Início. Abra a galeria e clique em Iniciar de novo.');
      await waitGallery(45000);
    }
    if (setName && currentSet() !== setName) {
      log(`   reabrindo ${setName}…`);
      const ok = await chooseSet(names => names.indexOf(setName));
      if (!ok) throw new Stop(`Não consegui reabrir ${setName} na galeria. Abra esse time e clique em Iniciar de novo.`);
      await waitSetLoaded(setName);
    }
  }
  async function cleanAndReturn(setName) {
    await cleanTransferList();
    await goToGallery(setName);
  }

  // ---------- troca de time (lista "Set" do Paletools) ----------
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ownText = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
  // nome do time pela frase "Requires 15 Al Fayha Men players to complete."
  const setFromRequires = () => { const m = pageText().match(/Requires\s+\d+\s+(.+?)\s+(?:Mens?|Womens?|Men's|Women's)?\s*players/i); return m ? norm(m[1]) : null; };
  function setControl() {
    const label = leavesWithText('Set').find(e => ownText(e) === 'Set');
    if (!label) return null;
    const lr = label.getBoundingClientRect();
    const nsel = [...document.querySelectorAll('select')].find(s => { if (!vis(s)) return false; const r = s.getBoundingClientRect(); return r.top >= lr.top && r.top - lr.bottom < 70 && r.left < lr.left + 60; });
    if (nsel) return { select: nsel, name: norm(nsel.selectedOptions[0]?.textContent) };
    const name = setFromRequires();
    if (!name) return null;
    const cand = leavesWithText(name).map(e => ({ e, r: e.getBoundingClientRect() }))
      .filter(({ r }) => r.top >= lr.top && r.top - lr.bottom < 70 && r.left < lr.left + 80 && r.right > lr.left)
      .sort((a, b) => a.r.top - b.r.top)[0];
    if (!cand) return null;
    let ctl = cand.e;
    for (let i = 0; i < 3 && ctl.parentElement && !ctl.parentElement.contains(label) && ctl.parentElement.getBoundingClientRect().height < 80; i++) ctl = ctl.parentElement;
    return { ctl, text: cand.e, name };
  }
  const currentSet = () => { const c = setControl(); return c ? c.name : setFromRequires(); };
  // abre a lista "Set" e escolhe um time: pick(nomes, índiceAtual) devolve o índice desejado (ou -1)
  async function chooseSet(pick) {
    const c = setControl();
    if (!c) throw new Error('não achei a lista "Set" na galeria');
    const cur = c.name;
    const nsel = c.select || [...document.querySelectorAll('select')].find(s => [...s.options].some(o => norm(o.textContent) === cur));
    if (nsel) {
      const opts = [...nsel.options].filter(o => !o.disabled && o.value !== '' && !/^Select a set/i.test(norm(o.textContent)));
      const names = opts.map(o => norm(o.textContent));
      const i = pick(names, names.indexOf(cur));
      if (i < 0 || i >= opts.length) return null;
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
      setter.call(nsel, opts[i].value);
      nsel.dispatchEvent(new Event('input', { bubbles: true }));
      nsel.dispatchEvent(new Event('change', { bubbles: true }));
      return names[i];
    }
    const findOpts = () => {
      const anchors = [...leavesWithText(cur).filter(e => !c.ctl.contains(e)), ...leavesWithText('Select a set to view its cards and grading.')];
      for (const a of anchors) {
        let item = a;
        for (let up = 0; up < 5 && item.parentElement; up++) {
          const list = item.parentElement;
          const its = [...list.children].filter(x => x.getClientRects().length && norm(x.innerText) && norm(x.innerText).length < 40);
          if (its.length >= 4 && list.getBoundingClientRect().height > 60) {
            const it = its.find(x => norm(x.innerText) === cur);
            const cls = x => String(x.className).replace(/\b(selected|active|focused|hover\w*)\b/g, '').trim();
            const real = it ? its.filter(x => x.tagName === it.tagName && cls(x) === cls(it) && !/^Select a set/i.test(norm(x.innerText))) : [];
            const idx = real.indexOf(it);
            if (idx >= 0 && real.length >= 4) return { items: real, idx };
          }
          item = list;
        }
      }
      return null;
    };
    click(c.ctl);
    let o = await waitFor(findOpts, 2500);
    if (!o) { click(c.text); o = await waitFor(findOpts, 3000); }
    if (!o) { const arrow = [...c.ctl.parentElement.querySelectorAll('*')].find(e => /^[▼▾⌄]$/.test(norm(e.textContent))); if (arrow) click(arrow); o = await waitFor(findOpts, 3000, 'abrir a lista de times'); }
    const names = o.items.map(x => norm(x.innerText.split('\n')[0]));
    const i = pick(names, o.idx);
    if (i < 0 || i >= o.items.length) { F.escKey(); click(c.ctl); return null; }
    o.items[i].scrollIntoView({ block: 'nearest' });
    await sleep(250);
    click(o.items[i]);
    return names[i];
  }
  const selectNextSet = () => chooseSet((names, cur) => cur + 1);
  async function waitSetLoaded(name) {
    const re = new RegExp('Requires\\s+\\d+\\s+' + escRe(name), 'i');
    lastTileCount = -1;
    await waitFor(() => re.test(pageText()) && galleryReady(), 45000, `a galeria do ${name} carregar`);
    await pause();
  }

  // ---------- execução ----------
  const G = { bought: 0, spent: 0, sets: 0, completed: 0, sim: 0, simSpent: 0, line: '', t0: 0 };
  async function galeria() {
    const done = new Set(), skip = new Set();
    let sinceClean = 0;
    Object.assign(G, { bought: 0, spent: 0, sets: 0, completed: 0, sim: 0, simSpent: 0, line: '', t0: Date.now() });
    F.changed();
    const cfg = C();
    try {
      if (!readGallery()) throw new Stop('Abra a tela da galeria (Gallery do Paletools) antes de iniciar.');
      log(`▶ Galeria: até ${fmt(cfg.maxPrice)} por carta${cfg.maxTotal ? `, no máximo ${fmt(cfg.maxTotal)} no total` : ''}${cfg.autoNext ? ', passando pelos próximos times' : ''}${cfg.dryRun ? ' — MODO TESTE (não compra)' : ''}.`, 'good');
      for (;;) {
        if (F.stopping()) throw new Stop('Parado por você.');
        lastTileCount = -1;
        await waitGallery();
        const setName = currentSet() || 'galeria';
        const st = galleryStatus();
        G.sets++;
        let target = cfg.qty;
        if (cfg.autoQty) {
          if (st.toBuy == null) throw new Stop('Não consegui ler quantas cartas a galeria pede. Desligue "Só o que falta" e defina a quantidade.');
          target = st.toBuy;
        } else if (cfg.respectSlots && st.toBuy != null) target = Math.min(target, st.toBuy);

        if (!target) {
          log(`■ ${setName}: já tem ${st.sel}${st.ownedUnsel ? ` (+${st.ownedUnsel} suas sem incluir)` : ''}/${st.req} — completo, pulando.`);
        } else {
          log(`■ ${setName}: pede ${st.req}, tem ${st.sel}${st.ownedUnsel ? ` (+${st.ownedUnsel} suas sem incluir — clique Include nelas)` : ''} → comprar ${target}.`);
          if (target > st.missingTiles) log(`   Atenção: só ${st.missingTiles} carta(s) faltando têm botão Mercado; pode não dar para completar.`, 'warn');
          let got = 0;
          while (got < target) {
           try {
            if (F.stopping()) throw new Stop('Parado por você.');
            const left = cfg.maxTotal ? cfg.maxTotal - G.spent : Infinity;
            if (left <= 0) throw new Stop(`Chegou no limite total de ${fmt(cfg.maxTotal)} moedas. Gasto: ${fmt(G.spent)}.`);
            lastTileCount = -1;
            await waitGallery();
            const tiles = galleryTiles().filter(t => !done.has(setName + '|' + t.key) && !skip.has(setName + '|' + t.key));
            if (!tiles.length) { log('   Não há mais cartas faltando que caibam nas regras neste time.', 'warn'); break; }
            const t = tiles[0], key = setName + '|' + t.key;
            log(`→ ${t.name} ${t.rating || ''} (+${fmt(t.missing)} pts): abrindo mercado…`);
            click(t.btn);
            await pause();
            let res;
            try { res = await buyFromResults(t, Math.min(cfg.maxPrice, left)); }
            catch (e) { if (e instanceof Stop || e instanceof Limited) throw e; res = { r: 'fail', why: e.message }; }

            if (res.r === 'none') { log('   ✖ não comprada: sem cartas à venda agora.', 'warn'); skip.add(key); }
            else if (res.r === 'expensive') { log(`   ✖ não comprada: a mais barata está ${fmt(res.price)}, acima do limite de ${fmt(Math.min(cfg.maxPrice, left))}. Indo para a próxima.`, 'warn'); skip.add(key); }
            else if (res.r === 'dry') { log(`   [teste] compraria por ${fmt(res.price)} (simulado, não conta como comprada).`, 'good'); done.add(key); got++; G.sim++; G.simSpent += res.price; }
            else if (res.r === 'fail') { log(`   ✖ não comprada: ${res.why}.`, 'bad'); skip.add(key); }
            else if (res.r === 'bought') {
              got++; G.bought++; G.spent += res.price; done.add(key); sinceClean++;
              log(`   ✔ ${res.ident.name} comprada por ${fmt(res.price)}.`, 'good');
              const rec = addBuy({ name: res.ident.name, rating: res.ident.rating, buy: res.price, status: 'unlisted', set: setName });
              if (cfg.list) {
                await pause();
                try {
                  const l = await F.listCheapest({ minBn: cfg.minList });
                  log(l.ok ? `   listada: inicial ${fmt(l.start)} / imediato ${fmt(l.bn)}.` : `   não listei: ${l.why}${l.keep ? ' (ficou nos não atribuídos)' : ''}.`, l.ok ? 'good' : 'warn');
                  if (l.ok) { rec.status = 'listed'; rec.listStart = l.start; rec.listBN = l.bn; rec.listedAt = Date.now(); save(); }
                  if (l.full) {
                    if (!cfg.cleanFull) throw new Stop('A Lista de Transferências está cheia. Limpe os vendidos (ou ligue "Limpar quando encher") e inicie de novo.');
                    log('   a carta ficou nos não atribuídos; liste depois pelo Relist.', 'warn');
                    await cleanAndReturn(setName);
                  }
                } catch (e) { if (e instanceof Stop || e instanceof Limited) throw e; log(`   não consegui listar: ${e.message}`, 'bad'); }
              }
            }
            if (cfg.cleanEvery && sinceClean >= cfg.cleanEvery && got < target) {
              log(`   ${sinceClean} compras desde a última limpeza: limpando a Lista de Transferências.`);
              await cleanAndReturn(setName); sinceClean = 0;
            }
            G.line = `${setName}: ${got}/${target} nesta galeria`; F.changed();
            await pause();
            await backToGallery();
           } catch (e) {
            if (!(e instanceof Limited)) throw e;
            await F.limitPause(e, log);
            await backToGallery().catch(err => { if (err instanceof Stop) throw err; });
           }
          }
          if (got >= target) { G.completed++; log(`   ${setName}: ${got}/${target} ${cfg.dryRun ? 'simuladas' : 'compradas'} — completo.`, 'good'); }
          else log(`   ${setName}: ${cfg.dryRun ? 'simuladas' : 'compradas'} ${got} de ${target}; ficaram ${target - got} sem comprar (caras demais ou sem oferta).`, 'warn');
        }

        if (!cfg.autoNext) break;
        if (cfg.maxSets && G.sets >= cfg.maxSets) { log(`Passou por ${G.sets} time(s), o limite que você definiu.`); break; }
        if (cfg.cleanBetween && !cfg.dryRun && sinceClean) { await cleanAndReturn(setName); sinceClean = 0; }
        const next = await selectNextSet();
        if (!next) { log('Era o último time desta categoria.'); break; }
        log(`Próximo time: ${next}…`);
        await waitSetLoaded(next);
      }
      log(`■ Fim: ${G.bought} carta(s) compradas de verdade, ${fmt(G.spent)} moedas${G.sim ? ` · ${G.sim} simuladas (${fmt(G.simSpent)})` : ''} · ${G.sets} time(s) vistos, ${G.completed} completados.`, 'good');
    } catch (e) {
      if (e instanceof Limited) e = new Stop(`O EA pediu calma: "${e.message}". Pare um tempo antes de continuar.`);
      const byUser = e instanceof Stop && /^Parado/.test(e.message);
      log((e instanceof Stop ? '■ ' : '⚠ Erro: ') + e.message, byUser ? 'warn' : 'bad');
      if (!byUser) F.beep(330, 600);
    } finally {
      G.line = ''; F.changed();
    }
  }

  // ---------- comandos do painel ----------
  // a leitura da galeria varre a página: no máximo a cada 1,5 s e nunca enquanto outro módulo trabalha
  let galC = null, galT = 0;
  function galCached() {
    if (F.run.owner && F.run.owner !== 'gal') return null;
    if (Date.now() - galT > 1500) {
      galT = Date.now();
      try { const g = galleryStatus(); galC = g ? { ...g, set: currentSet() || 'Galeria' } : null; } catch { galC = null; }
    }
    return galC;
  }
  function edit(m) {
    const b = D.galBuys.find(y => y.id === m.id);
    if (m.edit === 'sell' && b && m.sale) { b.status = 'sold'; b.sale = m.sale; b.soldAt = Date.now(); b.manual = true; }
    if (m.edit === 'undo' && b) { b.status = b.listBN ? 'listed' : 'unlisted'; delete b.sale; delete b.soldAt; }
    if (m.edit === 'del') D.galBuys = D.galBuys.filter(y => y.id !== m.id);
    if (m.edit === 'wipe') D.galBuys = D.galBuys.filter(y => !(y.t >= (m.from || 0) && y.t <= (m.to || Infinity)));
    save(); F.flush();
    return { ok: true };
  }
  F.mod('gal', {
    status: () => ({ running: isRunning(), G, gallery: galCached(), session: SESSION }),
    async cmd(m) {
      switch (m.op) {
        case 'start':
          if (F.isBusy()) throw new Error('Outro módulo está trabalhando. Pare ele antes.');
          if (!readGallery()) throw new Error('Abra a Gallery do Paletools no Web App (escolha a liga e o time) e clique em Iniciar.');
          F.task('gal', 'completando a galeria', galeria).catch(e => log('⚠ ' + e.message, 'bad'));
          await sleep(50); return F.status();
        case 'clean':
          if (F.isBusy()) throw new Error('Outro módulo está trabalhando. Pare ele antes.');
          F.task('gal', 'limpando a Lista de Transferências', async () => {
            try {
              const back = readGallery() ? currentSet() : null;
              await cleanTransferList();
              if (back) await goToGallery(back);
              log('🧹 Limpeza concluída.', 'good');
            } catch (e) { log((e instanceof Stop ? '■ ' : '⚠ Erro: ') + e.message, 'bad'); }
          }).catch(e => log('⚠ ' + e.message, 'bad'));
          await sleep(50); return F.status();
        case 'edit': return edit(m);
        default: throw new Error('comando desconhecido');
      }
    },
  });
})();
