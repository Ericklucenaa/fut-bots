// FUT Galeria Bot — compra as cartas que faltam na galeria do Paletools e lista no mais barato.
// Fluxo por carta: Mercado -> Comprar já (se <= preço máximo) -> Listar no Mercado -> Mais barato -> Listar.
(() => {
  'use strict';
  if (!/ultimate-team\/web-app/.test(location.pathname)) return;
  if (window.__fgb) return;
  window.__fgb = true;

  // ---------- configuração ----------
  const KEY = 'fgb_cfg_v1';
  const DEF = { maxPrice: 4000, maxTotal: 0, qty: 5, autoQty: true, autoNext: true, maxSets: 0, respectSlots: true, list: true, minList: 0, cleanFull: true, cleanBetween: false, cleanEvery: 10, retries: 4, dryRun: true, delay: 900 };
  let cfg = { ...DEF };
  try { cfg = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch {}
  const saveCfg = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {} };

  // ---------- utilitários ----------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const num = s => { const n = parseInt(String(s || '').replace(/[^\d]/g, ''), 10); return isNaN(n) ? null : n; };
  const fmt = n => n == null ? '?' : n.toLocaleString('pt-BR');
  const vis = el => {
    if (!el || !el.isConnected || !el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0;
  };
  let running = false, stopReq = false;
  class Stop extends Error {}

  // menor elemento visível cujo texto bate com a regex (prefere botões)
  // texto sem os rótulos de atalho do Paletools ("[KeyC]", "[ KeyQ ]"…), que grudam no texto dos botões
  const btnText = el => norm((el.textContent || '').replace(/\[\s*(Key|Digit|Numpad)?\w{0,12}\s*\]/g, ' '));
  function find(re, { root = document, buttonsFirst = true } = {}) {
    const all = [];
    if (buttonsFirst) {
      for (const el of root.querySelectorAll('button, [role=button], a')) if (vis(el) && re.test(btnText(el))) all.push(el);
      if (all.length) return all.sort((a, b) => a.getElementsByTagName('*').length - b.getElementsByTagName('*').length)[0];
    }
    for (const el of root.querySelectorAll('body *')) {
      if (el.children.length > 6) continue;
      if (vis(el) && re.test(btnText(el))) all.push(el);
    }
    return all.sort((a, b) => a.getElementsByTagName('*').length - b.getElementsByTagName('*').length)[0] || null;
  }
  const pageText = () => document.body ? document.body.innerText : '';
  // texto só de diálogos e notificações (não da página toda)
  const popupText = () => [...document.querySelectorAll('.ea-dialog-view, .view-modal-container, .ut-dialog, .Notification, .ut-notification-layer')]
    .filter(vis).map(d => d.innerText).join(' ');

  function click(el) {
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new MouseEvent('mousedown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o));
    el.dispatchEvent(new MouseEvent('mouseup', o));
    el.dispatchEvent(new MouseEvent('click', o));
  }

  // para o bot se aparecer captcha, limite do mercado ou falta de moedas
  function checkBlockers() {
    const t = popupText();
    if (/captcha|verifica[çc][ãa]o|n[ãa]o sou um rob[ôo]/i.test(t)) throw new Stop('Apareceu verificação (captcha). Resolva na página e inicie de novo.');
    if (/moedas insuficientes|n[ãa]o tem moedas|insufficient/i.test(t)) throw new Stop('Moedas insuficientes.');
    if (FULL_RE.test(t)) return;  // lista de transferências cheia: o bot limpa e segue
    if (/muitas (a[çc][õo]es|solicita)|limite.*(mercado|transfer)|acesso ao mercado|too many/i.test(t)) throw new Stop('O EA limitou o mercado (muitas ações). Pare um tempo antes de usar de novo.');
  }

  const FULL_RE = /lista de transfer[êe]ncias?[^.]{0,40}(cheia|lotada|completa|atingiu)|transfer list is full|n[ãa]o h[áa] (mais )?espa[çc]o|list is full/i;

  async function waitFor(fn, ms, what) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (stopReq) throw new Stop('Parado por você.');
      checkBlockers();
      let v; try { v = fn(); } catch { v = null; }
      if (v) return v;
      await sleep(200);
    }
    if (what) throw new Error('Tempo esgotado esperando ' + what);
    return null;
  }
  const pause = (k = 1) => sleep(cfg.delay * k);

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
      .filter(e => /^Mercado$/i.test(norm(e.textContent)) && vis(e))
      .filter((e, _, arr) => !arr.some(o => o !== e && e.contains(o)));
  }

  const NOT_NAME = /^([A-Z]{2,4}\s?\d{1,2}|Mercado|Missing.*|Collected.*|Include|Remove|GL|ZAG|LD|LE|VOL|MC|MEI|ME|MD|PE|PD|ATA|SA|points?|\W+)$/i;
  function cardName(tile, lines) {
    const ok = s => s && /[A-Za-zÀ-ÿ]{2,}/.test(s) && !NOT_NAME.test(s) && !/[★*]\d|\d[ED]\d|\[/.test(s) && s.length < 40;
    let n = lines.find(ok);
    if (n) return n;
    // o nome pode ficar fora do bloco, logo acima dele: procura pelo texto que está ali na tela
    const r = tile.getBoundingClientRect();
    for (const y of [r.top + 14, r.top - 10, r.top - 24, r.top + 28]) {
      for (const el of document.elementsFromPoint(r.left + r.width / 2, y)) {
        if (el === host || host.contains(el)) continue;
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
      .filter(b => vis(b) && /^Include$/i.test(norm(b.textContent)))
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
      const posTokens = lines.filter(l => /^(GL|ZAG|LD|LE|VOL|MC|MEI|ME|MD|PE|PD|ATA|SA)$/i.test(l)).join(' ');
      const pos = tile.parentElement ? [...tile.parentElement.children].indexOf(tile) : -1;
      const key = name ? [name, rating, posTokens, missing].join('|') : 'pos' + pos + '|' + rating;
      return { btn, tile, name: name || 'carta #' + (pos + 1), rating, missing, key, isMissing: /Missing/i.test(tile.innerText) };
    }).filter(t => t.isMissing);
  }

  // ---------- mercado ----------
  // só linhas de leilão de verdade (o Paletools usa a mesma classe nas cartas da galeria)
  const rows = () => [...document.querySelectorAll('.listFUTItem')]
    .filter(r => vis(r) && !exactMercado(r).length && /Comprar J[áa]|Pre[çc]o Inicial|Vendido|Lance|Buy Now|Start Price/i.test(r.innerText));
  const rowBuyNow = r => num((norm(r.innerText).match(/Comprar J[áa]:?\s*([\d.,]+)/i) || [])[1]);
  const buyBtn = () => find(/^Comprar j[áa] por\s*[\d.,]+/i);
  const btnPrice = b => num((norm(b.textContent).match(/Comprar j[áa] por\s*([\d.,]+)/i) || [])[1]);
  const noResults = () => document.querySelector('.ut-no-results-view') && vis(document.querySelector('.ut-no-results-view'))
    || /Nenhum resultado|No results/i.test(pageText());
  // só a mensagem de vitória da compra ("Vendido por" também aparece em ofertas vendidas para outra pessoa)
  const wonText = () => /Parab[ée]ns, voc[êe] ganhou|Congratulations, you (won|bought)/i.test(pageText());
  // painel do item com ações de dono (só aparece depois que a carta é sua)
  const ownedPanel = () => !buyBtn() && (
    (!!find(/^Listar no Mercado de Transfer[êe]ncias$/i) && !!find(/^Enviar (ao Meu Clube|para o Clube)$/i))
    || /Item comprado por\s*[\d.,]+/i.test(pageText()));
  // saldo de moedas no topo do Web App (para confirmar que a compra descontou)
  function coins() {
    for (const el of document.querySelectorAll('.view-navbar-currency-coins, .ut-navigation-bar-view .coins, [class*="currency-coins"]')) {
      if (!vis(el)) continue;
      const v = num(el.textContent); if (v != null) return v;
    }
    return null;
  }

  function itemIdent(el, fb) {
    const n = el && el.querySelector('.name'), r = el && el.querySelector('.rating');
    return { name: (n && norm(n.textContent)) || (fb && fb.name) || '?', rating: (r && num(r.textContent)) || (fb && fb.rating) || null };
  }

  async function buyFromResults(card, maxP = cfg.maxPrice) {
    await waitFor(() => !loading() && (rows().length || noResults() || buyBtn()), 45000, 'os resultados da busca');
    await pause(0.6);
    if (!rows().length && !buyBtn()) return { r: 'none' };

    // Tenta a oferta mais barata que caiba no limite; se alguém comprar antes, tenta a próxima mais barata
    // (até TRIES ofertas), ignorando as que já tentou e as que aparecem como vendidas/expiradas.
    const TRIES = Math.max(1, cfg.retries || 1);
    const tried = new WeakSet(), triedSig = new Set();
    const sig = r => norm(r.innerText);
    let lastWhy = null, lastPrice = null;
    for (let attempt = 1; attempt <= TRIES; attempt++) {
      if (stopReq) throw new Stop('Parado por você.');
      let ident = itemIdent(null, card);
      const list = rows()
        .filter(r => !tried.has(r) && !triedSig.has(sig(r)) && !/Vendido|Expirado|Expired|Sold/i.test(r.innerText))
        .map(r => ({ r, p: rowBuyNow(r) })).filter(x => x.p != null).sort((a, b) => a.p - b.p);
      if (rows().length && !list.length) break;                    // acabaram as ofertas desta busca
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
      if (cfg.dryRun) return { r: 'dry', price, ident };

      const coinsBefore = coins();
      click(b);
      let okClicked = false;
      const res = await waitFor(() => {
        if (wonText()) return 'won';
        if (!okClicked) {
          const dlg = [...document.querySelectorAll('.ea-dialog-view, .view-modal-container, .ut-dialog')].filter(vis).pop();
          const ok = dlg && find(/^(Ok|Sim|Confirmar|Comprar)$/i, { root: dlg });
          if (ok && !/j[áa] foi|expirou|n[ãa]o foi poss|already|no longer|lance (maior|superado)|outbid/i.test(dlg.innerText)) { okClicked = true; click(ok); return null; }
        }
        if (/j[áa] foi (vendido|comprado)|expirou|n[ãa]o est[áa] mais dispon|n[ãa]o foi poss[íi]vel|lance (maior|superado)|already sold|no longer|outbid|item.*(vendido|indispon)/i.test(popupText())) return 'lost';
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
      const dlg = [...document.querySelectorAll('.ea-dialog-view, .view-modal-container, .ut-dialog')].filter(vis).pop();
      const ok = dlg && find(/^(Ok|Fechar|Cancelar)$/i, { root: dlg }); if (ok) { click(ok); await pause(0.5); }
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
      await pause(0.5);
    }
    return { r: 'fail', why: lastWhy || 'sem outra oferta dentro do limite', price: lastPrice };
  }

  function priceInputs() {
    return [...document.querySelectorAll('input')].filter(i => vis(i) && /^[\d.,]*$/.test(i.value) && i.value !== '');
  }

  async function listCheapest() {
    const acc = await waitFor(() => find(/^Listar no Mercado de Transfer[êe]ncias$/i), 6000, '"Listar no Mercado de Transferências"');
    click(acc); await pause(0.7);
    const cheap = await waitFor(() => find(/^Mais barato$/i), 6000, 'o botão "Mais barato"');
    const before = priceInputs().map(i => i.value).join('|');
    click(cheap);
    // o Paletools pesquisa o mercado; espera os preços mudarem
    await waitFor(() => priceInputs().map(i => i.value).join('|') !== before, 12000);
    await pause(0.8);
    const vals = priceInputs().map(i => num(i.value));
    const buyNow = vals.length ? vals[vals.length - 1] : null, start = vals.length > 1 ? vals[vals.length - 2] : null;
    if (cfg.minList && buyNow != null && buyNow < cfg.minList) return { ok: false, why: `mais barato é ${fmt(buyNow)}, abaixo do seu mínimo ${fmt(cfg.minList)} (ficou na lista de não atribuídos)` };
    const lb = await waitFor(() => find(/^Listar para transfer[êe]ncia$/i), 5000, 'o botão "Listar para transferência"');
    click(lb);
    const out = await waitFor(() => FULL_RE.test(popupText()) ? 'full' : !vis(lb) ? 'ok' : null, 8000);
    if (out === 'full') {
      const dlg = [...document.querySelectorAll('.ea-dialog-view, .view-modal-container, .ut-dialog')].filter(vis).pop();
      const ok = dlg && find(/^(Ok|Fechar|Cancelar)$/i, { root: dlg }); if (ok) click(ok);
      return { ok: false, full: true, why: 'a Lista de Transferências está cheia' };
    }
    return { ok: true, start, buyNow };
  }

  // tela carregando (spinner / bloqueio de clique do Web App)
  // só os indicadores reais do Web App (classes genéricas tipo "loading" pegavam imagens/elementos fixos e travavam o bot)
  // se ficar mais de 8 s seguidos, considera que é um elemento fixo da página e ignora
  let loadingSince = 0;
  const loading = () => {
    const on = [...document.querySelectorAll('.ut-click-shield.showing, .loaderIcon, .ut-loading-spinner, .ut-loader')]
      .some(e => { if (!vis(e)) return false; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; });
    if (!on) { loadingSince = 0; return false; }
    if (!loadingSince) loadingSince = Date.now();
    return Date.now() - loadingSince < 8000;
  };

  // galeria aberta e com as cartas desenhadas: mesma quantidade de cartas em duas leituras seguidas
  let lastTileCount = -1, readyWhy = '';
  function galleryReady() {
    if (loading()) { readyWhy = 'tela carregando'; lastTileCount = -1; return false; }
    if (!readGallery()) { readyWhy = 'galeria não está aberta'; lastTileCount = -1; return false; }
    if (rows().length) { readyWhy = 'ainda na tela do mercado'; lastTileCount = -1; return false; }
    const tiles = exactMercado().length + [...document.querySelectorAll('button, [role=button]')].filter(b => vis(b) && /^(Include|Remove)$/i.test(norm(b.textContent))).length;
    if (!tiles) { readyWhy = 'nenhuma carta na tela'; lastTileCount = -1; return false; }
    const stable = tiles === lastTileCount;
    lastTileCount = tiles;
    return stable;
  }
  // espera a galeria e, se demorar, diz no log o que está esperando
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
      if (stopReq) throw new Stop('Parado por você.');
      checkBlockers();
      if (galleryReady()) { await pause(); return; }
      // só aperta "voltar" de novo se a tela parou de carregar e continua no mercado
      const onMarket = !readGallery() && !loading();
      if (onMarket && backs < 4 && Date.now() - lastBack > 5000) {
        const back = [...document.querySelectorAll('.ut-navigation-button-control, button.btn-navigation, .ut-navigation-bar-view button')].find(vis);
        if (back) click(back);
        else document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', key: '1', bubbles: true }));
        lastBack = Date.now(); backs++;
        if (backs > 1) log('   ainda carregando, apertei voltar de novo…', 'warn');
      }
      await sleep(400);
    }
    throw new Error('a galeria não voltou em 90 s');
  }

  // ---------- histórico (compras, vendas, log) ----------
  const DKEY = 'fgb_data_v1', LKEY = 'fgb_log_v1', TAX = 0.05;
  const SESSION = Date.now();
  let data = { buys: [], soldSeen: {} };
  try { data = { ...data, ...JSON.parse(localStorage.getItem(DKEY) || '{}') }; } catch {}
  const saveData = () => { try { localStorage.setItem(DKEY, JSON.stringify(data)); } catch {} };
  let logs = [];
  try { logs = JSON.parse(localStorage.getItem(LKEY) || '[]'); } catch {}
  let logT;
  const saveLogs = () => { clearTimeout(logT); logT = setTimeout(() => { logs = logs.slice(-8000); try { localStorage.setItem(LKEY, JSON.stringify(logs)); } catch {} }, 400); };
  function addBuy(o) {
    const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), session: SESSION, ...o };
    data.buys.push(rec); saveData(); return rec;
  }
  const net = v => Math.floor(v * (1 - TAX));  // o EA fica com 5% da venda

  // Lista de Transferências: itens vendidos viram "vendida" no histórico (casando nome + overall)
  const onTransferList = () => {
    const h = [...document.querySelectorAll('.ut-navigation-bar-view .title, .ut-navigation-bar-view h1')].find(vis);
    if (h && /^(Lista de Transfer[êe]ncias|Transfer List)$/i.test(norm(h.textContent))) return true;
    return !!(leavesWithText('Itens vendidos').length || leavesWithText('Itens não vend.').length || find(/^Retirar vendidos$/i));
  };
  function soldCounts() {
    const counts = {};
    for (const r of rows()) {
      const tx = norm(r.innerText);
      let m = tx.match(/Vendido(?: por)?:?\s*([\d.,]+)/i);
      if (!m && r.classList.contains('won')) m = tx.match(/Lance:?\s*([\d.,]+)/i);
      const price = m && num(m[1]);
      if (!price) continue;
      const id = itemIdent(r), sig = `${id.name}|${id.rating}|${price}`;
      counts[sig] = (counts[sig] || 0) + 1;
    }
    return counts;
  }
  function applySales(counts) {
    let changed = false, n = 0;
    for (const [k, c] of Object.entries(counts)) {
      const seen = data.soldSeen[k] || 0;
      const [name, rating, price] = k.split('|');
      for (let i = seen; i < c; i++) {
        const rec = data.buys.filter(b => (b.status === 'listed' || b.status === 'unlisted') && b.name === name && String(b.rating) === rating).sort((a, b) => a.t - b.t)[0];
        if (!rec) continue;
        rec.status = 'sold'; rec.sale = +price; rec.soldAt = Date.now(); n++;
        const pl = net(+price) - rec.buy;
        log(`💰 Vendida: ${name} ${rating} por ${fmt(+price)} → ${pl >= 0 ? 'lucro' : 'prejuízo'} ${fmt(Math.abs(pl))} (já tirando 5% do EA).`, pl >= 0 ? 'good' : 'bad');
      }
      if (c !== seen) { data.soldSeen[k] = c; changed = true; }
    }
    for (const k of Object.keys(data.soldSeen)) if (!(k in counts)) { delete data.soldSeen[k]; changed = true; }
    if (changed) saveData();
    return n;
  }
  let lastSalesSig = null;
  function scanSales() {
    if (running || loading() || !onTransferList()) { lastSalesSig = null; return; }
    const counts = soldCounts();
    // só conta quando duas leituras seguidas batem (lista terminou de carregar)
    const sig = JSON.stringify(counts);
    if (sig !== lastSalesSig) { lastSalesSig = sig; return; }
    applySales(counts);
  }
  setInterval(() => { try { scanSales(); } catch {} }, 1500);

  // ---------- navegação do Web App ----------
  const navBtn = re => [...document.querySelectorAll('.ut-tab-bar-item, .ut-tab-bar button, nav button, nav a')].find(b => vis(b) && re.test(norm(b.textContent)));
  async function goToTransferList() {
    if (onTransferList()) return;
    // 1) menu lateral "Transfer."
    const tileEl = () => {
      const known = [...document.querySelectorAll('.ut-tile-transfer-list, [class*="tile-transfer-list"]')].find(vis);
      if (known) return known;
      const t = leavesWithText('Lista de Transferências')[0] || find(/^Lista de Transfer[êe]ncias$/i, { buttonsFirst: false });
      return t ? (t.closest('.tile, [class*="tile"], button, [role=button]') || t) : null;
    };
    for (let tries = 0; tries < 3 && !tileEl(); tries++) {
      const nav = navBtn(/^Transfer/i) || leavesWithText('Transfer.')[0] || find(/^Transfer\.?$/i);
      if (!nav) throw new Error('não achei o menu "Transfer." na barra lateral');
      log(`   abrindo Transfer.${tries ? ' (de novo)' : ''}…`);
      click(nav.closest('.ut-tab-bar-item, button, [role=button], a') || nav);
      await waitFor(tileEl, 8000);
    }
    const tile = tileEl();
    if (!tile) throw new Error('a tela Transfer. não abriu');
    await pause();
    // 2) cartão "Lista de Transferências"
    for (let tries = 0; tries < 3 && !onTransferList(); tries++) {
      log(`   abrindo a Lista de Transferências${tries ? ' (de novo)' : ''}…`);
      const t = tileEl() || tile;
      click(t);
      if (await waitFor(onTransferList, 8000)) break;
      const title = t.querySelector && [...t.querySelectorAll('*')].find(e => /^Lista de Transfer[êe]ncias$/i.test(norm(e.textContent)) && !e.children.length);
      if (title) { click(title); if (await waitFor(onTransferList, 6000)) break; }
    }
    await waitFor(() => onTransferList() && !loading(), 20000, 'a Lista de Transferências abrir');
    await pause(1.5);
  }
  async function confirmIfAsked() {
    const dlg = await waitFor(() => [...document.querySelectorAll('.ea-dialog-view, .view-modal-container, .ut-dialog')].filter(vis).pop(), 2000);
    const ok = dlg && find(/^(Ok|Sim|Confirmar|Yes)$/i, { root: dlg });
    if (ok) { click(ok); await pause(); }
  }
  // registra vendas, clica "Retirar vendidos" e depois "Envie não duplicado para o clube"
  async function cleanTransferList() {
    log('🧹 Limpando a Lista de Transferências…');
    await goToTransferList();
    // espera a lista estabilizar e registra as vendas antes de retirar
    let prev = null, counts = {};
    await waitFor(() => { counts = soldCounts(); const sg = JSON.stringify(counts); const okk = sg === prev; prev = sg; return okk; }, 8000);
    const n = applySales(counts);
    const sold = Object.values(counts).reduce((a, b) => a + b, 0);
    const clear = find(/^Retirar vendidos$/i);
    if (clear) {
      click(clear); await pause(); await confirmIfAsked();
      await waitFor(() => !find(/^Retirar vendidos$/i) || !soldCounts() || !Object.keys(soldCounts()).length, 10000);
      data.soldSeen = {}; saveData();
      log(`   retirei ${sold} vendido(s)${n ? `, ${n} registrado(s) no lucro` : ''}.`, 'good');
    } else log('   nenhum item vendido para retirar.');
    await pause();
    const send = find(/^Envie n[ãa]o duplicados? para o clube$/i) || find(/^Enviar n[ãa]o duplicados? (para o|ao) clube$/i);
    if (send) {
      click(send); await pause(); await confirmIfAsked();
      log('   enviei os não repetidos para o clube.', 'good');
    }
    await pause();
  }
  // volta para Paletools → Gallery e reabre o time em que estava
  async function goToGallery(setName) {
    if (!readGallery()) {
      // caminho: Início → Gallery (o menu "Paletools" é a tela de configurações; não é por lá)
      const headerTitle = () => norm(([...document.querySelectorAll('.ut-navigation-bar-view .title, .ut-navigation-bar-view h1')].find(vis) || {}).textContent);
      const galleryEntry = () => {
        if (/^Paletools$/i.test(headerTitle())) return null;   // nunca usa o "Gallery" das configurações
        const t = [...leavesWithText('Gallery'), ...leavesWithText('Galeria')].find(e => !e.closest('.ut-navigation-bar-view'));
        return t ? (t.closest('.tile, [class*="tile"], button, [role=button], a') || t) : null;
      };
      for (let tries = 0; tries < 3 && !readGallery(); tries++) {
        if (!galleryEntry()) {
          const home = navBtn(/^In[íi]cio$/i) || leavesWithText('Início')[0] || find(/^In[íi]cio$/i);
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
      if (!readGallery()) throw new Stop('Não consegui voltar para a Gallery pelo Início. Abra a galeria e clique em Iniciar de novo (e me diga por onde você abre a Gallery).');
      await waitGallery(45000);
    }
    if (setName && currentSet() !== setName) {
      log(`   reabrindo ${setName}…`);
      const ok = await chooseSet((names, cur) => names.indexOf(setName));
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
  // elementos cujo texto direto é exatamente txt (percorre só os nós de texto: rápido)
  const leavesWithText = txt => {
    const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      if (norm(n.textContent) !== txt) continue;
      const e = n.parentElement;
      if (e && !out.includes(e) && vis(e)) out.push(e);
    }
    return out;
  };

  function setControl() {
    const label = leavesWithText('Set').find(e => ownText(e) === 'Set');
    if (!label) return null;
    const lr = label.getBoundingClientRect();
    // lista nativa logo abaixo do rótulo
    const nsel = [...document.querySelectorAll('select')].find(s => { if (!vis(s)) return false; const r = s.getBoundingClientRect(); return r.top >= lr.top && r.top - lr.bottom < 70 && r.left < lr.left + 60; });
    if (nsel) return { select: nsel, name: norm(nsel.selectedOptions[0]?.textContent) };
    const name = setFromRequires();
    if (!name) return null;
    // o texto do time que fica logo abaixo do rótulo "Set" (não o título do painel da direita)
    const cand = leavesWithText(name).map(e => ({ e, r: e.getBoundingClientRect() }))
      .filter(({ r }) => r.top >= lr.top && r.top - lr.bottom < 70 && r.left < lr.left + 80 && r.right > lr.left)
      .sort((a, b) => a.r.top - b.r.top)[0];
    if (!cand) return null;
    // sobe até a caixa do controle (sem englobar o rótulo)
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

    // 1) lista nativa (<select>), mesmo escondida atrás do visual do Paletools
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

    // 2) lista feita pelo Paletools: contêiner com várias opções iguais (mesma tag e classe) que inclui o time atual
    const findOpts = () => {
      const anchors = [...leavesWithText(cur).filter(e => !c.ctl.contains(e)), ...leavesWithText('Select a set to view its cards and grading.')];
      for (const a of anchors) {
        let item = a;
        for (let up = 0; up < 5 && item.parentElement; up++) {
          const list = item.parentElement;
          const items = [...list.children].filter(x => x.getClientRects().length && norm(x.innerText) && norm(x.innerText).length < 40);
          if (items.length >= 4 && list.getBoundingClientRect().height > 60) {
            const it = items.find(x => norm(x.innerText) === cur);
            const cls = x => String(x.className).replace(/\b(selected|active|focused|hover\w*)\b/g, '').trim();
            const real = it ? items.filter(x => x.tagName === it.tagName && cls(x) === cls(it) && !/^Select a set/i.test(norm(x.innerText))) : [];
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
    if (i < 0 || i >= o.items.length) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); click(c.ctl); return null; }
    o.items[i].scrollIntoView({ block: 'nearest' });
    await sleep(250);
    click(o.items[i]);
    return names[i];
  }
  // escolhe o time seguinte; devolve o nome dele, ou null se era o último
  const selectNextSet = () => chooseSet((names, cur) => cur + 1);

  async function waitSetLoaded(name) {
    const re = new RegExp('Requires\\s+\\d+\\s+' + escRe(name), 'i');
    lastTileCount = -1;
    await waitFor(() => re.test(pageText()) && galleryReady(), 45000, `a galeria do ${name} carregar`);
    await pause();
  }

  // ---------- execução ----------
  async function run() {
    running = true; stopReq = false; render();
    const done = new Set(), skip = new Set();
    let bought = 0, spent = 0, sets = 0, completed = 0, sim = 0, simSpent = 0, sinceClean = 0;
    $('kBought').textContent = '0'; $('kSpent').textContent = '0';
    try {
      if (!readGallery()) throw new Stop('Abra a tela da galeria (Gallery do Paletools) antes de iniciar.');
      log(`Início: até ${fmt(cfg.maxPrice)} por carta${cfg.maxTotal ? `, no máximo ${fmt(cfg.maxTotal)} no total` : ''}${cfg.autoNext ? ', passando pelos próximos times' : ''}${cfg.dryRun ? ' — MODO TESTE (não compra)' : ''}.`);
      for (;;) {
        if (stopReq) throw new Stop('Parado por você.');
        lastTileCount = -1;
        await waitGallery();
        const setName = currentSet() || 'galeria';
        const st = galleryStatus();
        sets++;
        let target = cfg.qty;
        if (cfg.autoQty) {
          if (st.toBuy == null) throw new Stop('Não consegui ler quantas cartas a galeria pede. Desligue "Comprar só o que falta" e defina a quantidade.');
          target = st.toBuy;
        } else if (cfg.respectSlots && st.toBuy != null) target = Math.min(target, st.toBuy);

        if (!target) {
          log(`■ ${setName}: já tem ${st.sel}${st.ownedUnsel ? ` (+${st.ownedUnsel} suas sem incluir)` : ''}/${st.req} — completo, pulando.`);
        } else {
          log(`■ ${setName}: pede ${st.req}, tem ${st.sel}${st.ownedUnsel ? ` (+${st.ownedUnsel} suas sem incluir — clique Include nelas)` : ''} → comprar ${target}.`);
          if (target > st.missingTiles) log(`   Atenção: só ${st.missingTiles} carta(s) faltando têm botão Mercado; pode não dar para completar.`, 'warn');
          let got = 0;
          while (got < target) {
            if (stopReq) throw new Stop('Parado por você.');
            const left = cfg.maxTotal ? cfg.maxTotal - spent : Infinity;
            if (left <= 0) throw new Stop(`Chegou no limite total de ${fmt(cfg.maxTotal)} moedas. Gasto: ${fmt(spent)}.`);
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
            catch (e) { if (e instanceof Stop) throw e; res = { r: 'fail', why: e.message }; }

            if (res.r === 'none') { log('   ✖ não comprada: sem cartas à venda agora.', 'warn'); skip.add(key); }
            else if (res.r === 'expensive') { log(`   ✖ não comprada: a mais barata está ${fmt(res.price)}, acima do limite de ${fmt(Math.min(cfg.maxPrice, left))}. Indo para a próxima.`, 'warn'); skip.add(key); }
            else if (res.r === 'dry') { log(`   [teste] compraria por ${fmt(res.price)} (simulado, não conta como comprada).`, 'good'); done.add(key); got++; sim++; simSpent += res.price; }
            else if (res.r === 'fail') { log(`   ✖ não comprada: ${res.why}.`, 'bad'); skip.add(key); }
            else if (res.r === 'bought') {
              got++; bought++; spent += res.price; done.add(key); sinceClean++;
              log(`   ✔ ${res.ident.name} comprada por ${fmt(res.price)}.`, 'good');
              const rec = addBuy({ name: res.ident.name, rating: res.ident.rating, buy: res.price, status: 'unlisted', set: setName });
              if (cfg.list) {
                await pause();
                try {
                  const l = await listCheapest();
                  log(l.ok ? `   listada: inicial ${fmt(l.start)} / imediato ${fmt(l.buyNow)}.` : `   não listei: ${l.why}.`, l.ok ? 'good' : 'warn');
                  if (l.ok) { rec.status = 'listed'; rec.listStart = l.start; rec.listBN = l.buyNow; rec.listedAt = Date.now(); saveData(); }
                  if (l.full) {
                    if (!cfg.cleanFull) throw new Stop('A Lista de Transferências está cheia. Limpe os vendidos (ou ligue "Limpar quando encher") e inicie de novo.');
                    log('   a carta ficou nos não atribuídos; liste depois pela tela de não atribuídos.', 'warn');
                    await cleanAndReturn(setName);
                  }
                } catch (e) { if (e instanceof Stop) throw e; log(`   não consegui listar: ${e.message}`, 'bad'); }
              }
            }
            if (cfg.cleanEvery && sinceClean >= cfg.cleanEvery && got < target) {
              log(`   ${sinceClean} compras desde a última limpeza: limpando a Lista de Transferências.`);
              await cleanAndReturn(setName); sinceClean = 0;
            }
            stats.textContent = `${setName}: ${got}/${target} nesta galeria`;
            $('kBought').textContent = bought; $('kSpent').textContent = fmt(spent);
            await pause();
            await backToGallery();
          }
          if (got >= target) { completed++; log(`   ${setName}: ${got}/${target} ${cfg.dryRun ? 'simuladas' : 'compradas'} — completo.`, 'good'); }
          else log(`   ${setName}: ${cfg.dryRun ? 'simuladas' : 'compradas'} ${got} de ${target}; ficaram ${target - got} sem comprar (caras demais ou sem oferta).`, 'warn');
        }

        if (!cfg.autoNext) break;
        if (cfg.maxSets && sets >= cfg.maxSets) { log(`Passou por ${sets} time(s), o limite que você definiu.`); break; }
        if (cfg.cleanBetween && !cfg.dryRun && sinceClean) { await cleanAndReturn(setName); sinceClean = 0; }
        const next = await selectNextSet();
        if (!next) { log('Era o último time desta categoria.'); break; }
        log(`Próximo time: ${next}…`);
        await waitSetLoaded(next);
      }
      log(`Fim: ${bought} carta(s) compradas de verdade, ${fmt(spent)} moedas${sim ? ` · ${sim} simuladas (${fmt(simSpent)})` : ''} · ${sets} time(s) vistos, ${completed} completados.`, 'good');
    } catch (e) {
      log(e instanceof Stop ? e.message : 'Erro: ' + e.message, e instanceof Stop && /Parado/.test(e.message) ? 'warn' : 'bad');
      if (!(e instanceof Stop && /Parado/.test(e.message))) beep();
    } finally {
      running = false; render();
    }
  }

  function beep() {
    try {
      const a = new AudioContext(), o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.value = 0.15;
      o.start(); setTimeout(() => { o.stop(); a.close(); }, 600);
    } catch {}
  }

  // ---------- painel ----------
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647';
  const sh = host.attachShadow({ mode: 'open' });
  sh.innerHTML = `
  <style>
    :host{all:initial}
    *{box-sizing:border-box}
    .root{--bg:#0f141c;--bg2:#161d28;--bg3:#1d2633;--line:#263142;--tx:#e9eef6;--mut:#8d9ab0;--acc:#3ee08f;--acc2:#22c3e6;--good:#3ee08f;--warn:#ffc548;--bad:#ff6b6b;
      font:13px/1.4 "Segoe UI Variable","Segoe UI",system-ui,sans-serif;color:var(--tx)}
    button{font:inherit;color:inherit;border:0;cursor:pointer;background:none}
    button:disabled{opacity:.4;cursor:default}
    .good{color:var(--good)}.warn{color:var(--warn)}.bad{color:var(--bad)}
    .hint{font-size:11.5px;color:var(--mut)}

    /* painel */
    .p{width:372px;background:linear-gradient(180deg,#141b26 0%,var(--bg) 100%);border:1px solid var(--line);border-radius:18px;
       box-shadow:0 18px 50px #000b,0 0 0 1px #ffffff08 inset;overflow:hidden}
    .h{display:flex;align-items:center;gap:10px;padding:12px 12px 12px 14px;cursor:move;user-select:none;border-bottom:1px solid var(--line)}
    .logo{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:16px;background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 4px 14px #3ee08f40}
    .ttl{flex:1;min-width:0}.ttl b{display:block;font-size:14px;letter-spacing:.2px}.ttl span{font-size:11.5px;color:var(--mut)}
    .pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:var(--bg3);color:var(--mut);white-space:nowrap}
    .pill.run{background:#3ee08f22;color:var(--good)}.pill.test{background:#ffc54822;color:var(--warn)}
    .ib{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:var(--mut);font-size:14px}
    .ib:hover{background:var(--bg3);color:var(--tx)}
    .body{padding:12px 14px 14px;display:grid;gap:12px}

    /* cartão de status */
    .status{background:var(--bg2);border:1px solid var(--line);border-radius:14px;padding:12px}
    .s1{display:flex;align-items:center;gap:12px}
    .ring{--v:0;width:54px;height:54px;border-radius:50%;flex:none;display:grid;place-items:center;
      background:conic-gradient(var(--acc) calc(var(--v)*1%),var(--bg3) 0)}
    .ring i{width:42px;height:42px;border-radius:50%;background:var(--bg2);display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:700}
    .sname{font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ssub{font-size:12px;color:var(--mut);margin-top:2px}
    .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}
    .kpi{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:6px 8px}
    .kpi small{display:block;font-size:10.5px;color:var(--mut);text-transform:uppercase;letter-spacing:.4px}
    .kpi b{font-size:14px;font-variant-numeric:tabular-nums}

    /* modo + iniciar */
    .seg{display:grid;grid-template-columns:1fr 1fr;background:var(--bg2);border:1px solid var(--line);border-radius:11px;padding:3px}
    .seg button{padding:7px;border-radius:8px;font-weight:600;color:var(--mut)}
    .seg button.on[data-mode=test]{background:#ffc54822;color:var(--warn)}
    .seg button.on[data-mode=real]{background:#3ee08f22;color:var(--good)}
    .go{width:100%;padding:12px;border-radius:12px;font-size:14.5px;font-weight:700;color:#04221a;
      background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 8px 22px #22c3e630;transition:transform .08s}
    .go:active{transform:scale(.98)}
    .go.stop{background:linear-gradient(135deg,#ff6b6b,#ff9f6b);color:#2a0606;box-shadow:0 8px 22px #ff6b6b30}

    /* abas de opções */
    .tabs{display:flex;gap:4px;border-bottom:1px solid var(--line)}
    .tabs button{padding:7px 10px;color:var(--mut);font-weight:600;border-bottom:2px solid transparent;margin-bottom:-1px}
    .tabs button.on{color:var(--tx);border-color:var(--acc)}
    .pane{display:none;gap:10px}.pane.on{display:grid}
    .opt{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .opt .l b{display:block;font-weight:600;font-size:13px}.opt .l span{font-size:11.5px;color:var(--mut)}
    .num{display:flex;align-items:center;background:var(--bg);border:1px solid var(--line);border-radius:9px;overflow:hidden;flex:none}
    .num button{width:26px;height:30px;color:var(--mut);font-size:15px}.num button:hover{background:var(--bg3);color:var(--tx)}
    .num input{width:70px;height:30px;border:0;background:transparent;color:var(--tx);text-align:center;font:inherit;font-variant-numeric:tabular-nums;-moz-appearance:textfield}
    .num input::-webkit-inner-spin-button{display:none}
    .num:has(input:disabled){opacity:.5}
    .sw{appearance:none;-webkit-appearance:none;width:38px;height:22px;border-radius:99px;background:var(--bg3);position:relative;cursor:pointer;flex:none;transition:background .15s;margin:0;border:1px solid var(--line)}
    .sw::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#c9d2e0;transition:transform .15s}
    .sw:checked{background:var(--acc);border-color:var(--acc)}.sw:checked::after{transform:translateX(16px);background:#04221a}
    .sw:disabled{opacity:.45;cursor:default}

    /* atividade */
    .acthead{display:flex;align-items:center;justify-content:space-between}
    .acthead b{font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:.5px}
    .links{display:flex;gap:4px}
    .chip{padding:5px 9px;border-radius:8px;background:var(--bg2);border:1px solid var(--line);font-size:12px;font-weight:600}
    .chip:hover{background:var(--bg3)}
    .log{background:var(--bg);border:1px solid var(--line);border-radius:11px;height:132px;overflow:auto;padding:6px 9px;font-size:12px;white-space:pre-wrap}
    .log div{padding:2px 0;border-bottom:1px solid #ffffff06}
    .foot{display:flex;justify-content:space-between;font-size:11.5px;color:var(--mut)}
    ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:#2a3546;border-radius:8px}

    /* minimizado */
    .mini{display:none;align-items:center;gap:8px;padding:8px 14px 8px 8px;border-radius:99px;background:var(--bg);border:1px solid var(--line);box-shadow:0 10px 30px #000a;cursor:grab;user-select:none}
    .mini .logo{width:26px;height:26px;font-size:14px}
    .min .p{display:none}.min .mini{display:flex}

    /* janela de relatório */
    .ov{position:fixed;inset:0;background:#05080ccc;backdrop-filter:blur(3px);display:none;align-items:center;justify-content:center}
    .ov.open{display:flex}
    .win{background:var(--bg);border:1px solid var(--line);border-radius:18px;width:min(960px,calc(100vw - 32px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;box-shadow:0 20px 60px #000c}
    .wh{display:flex;gap:6px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line);flex-wrap:wrap}
    .wh .tab{padding:7px 14px;border-radius:9px;color:var(--mut);font-weight:600}
    .wh .tab.on{background:var(--bg3);color:var(--tx)}
    .wh .x{margin-left:auto}
    .flt{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 16px;border-bottom:1px solid var(--line);color:var(--mut)}
    select,input[type=datetime-local]{background:var(--bg2);color:var(--tx);border:1px solid var(--line);border-radius:8px;padding:6px 8px;font:inherit;color-scheme:dark}
    .wb{overflow:auto;padding:14px 16px;flex:1}
    .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-bottom:12px}
    .card{background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:10px 12px}
    .card .k{font-size:11.5px;color:var(--mut)}.card .v{font-size:19px;font-weight:700;margin-top:3px;font-variant-numeric:tabular-nums}
    table{width:100%;border-collapse:collapse;font-size:12.5px}
    th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);white-space:nowrap}
    th{color:var(--mut);font-weight:600;position:sticky;top:0;background:var(--bg)}
    td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
    td button{padding:3px 8px;font-size:11.5px;background:var(--bg3);border-radius:6px}
    .full{height:calc(100vh - 230px);margin:0;font:12px/1.5 ui-monospace,Consolas,monospace}

    /* tutorial */
    .tour{position:fixed;inset:0;display:none}
    .tour.open{display:block}
    .tour .shade{position:fixed;inset:0;background:#05080cb8}
    .spot{position:fixed;border-radius:12px;box-shadow:0 0 0 9999px #05080cc4,0 0 0 2px var(--acc),0 0 24px 4px #3ee08f55;transition:all .25s ease;pointer-events:none}
    .tip{position:fixed;width:330px;background:var(--bg);border:1px solid var(--line);border-radius:16px;padding:16px;box-shadow:0 20px 50px #000c;transition:top .25s ease,left .25s ease}
    .tclose{position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:var(--mut);font-size:14px}
    .tclose:hover{background:var(--bg3);color:var(--tx)}
    .tip h3{padding-right:28px}
    .tip .stepn{font-size:11px;font-weight:700;color:var(--acc);text-transform:uppercase;letter-spacing:.6px}
    .tip h3{margin:4px 0 6px;font-size:16px}
    .tip p{margin:0 0 8px;color:#c6cfdd;font-size:13px}
    .tip ul{margin:0 0 8px 18px;padding:0;color:#c6cfdd;font-size:12.5px}.tip li{margin:3px 0}
    .tip .nav{display:flex;align-items:center;gap:8px;margin-top:12px}
    .dots{display:flex;gap:4px;flex:1}.dots i{width:6px;height:6px;border-radius:50%;background:var(--bg3)}.dots i.on{background:var(--acc);width:16px;border-radius:6px}
    .btn{padding:7px 12px;border-radius:9px;font-weight:600;background:var(--bg3)}
    .btn.pri{background:linear-gradient(135deg,var(--acc),var(--acc2));color:#04221a}
    .skip{color:var(--mut);font-size:12px;padding:4px}
  </style>
  <div class="root" id="root">
    <div class="p" id="panel">
      <div class="h" id="drag">
        <div class="logo">⚽</div>
        <div class="ttl"><b>Galeria Bot</b><span>Paletools · EA FC</span></div>
        <span class="pill" id="pill">Parado</span>
        <button class="ib" id="help" title="Tutorial">?</button>
        <button class="ib" id="minBtn" title="Minimizar">–</button>
      </div>
      <div class="body">
        <div class="status" id="statusCard">
          <div class="s1">
            <div class="ring" id="ring"><i id="ringTxt">–</i></div>
            <div style="min-width:0;flex:1">
              <div class="sname" id="sname">Abra a Gallery</div>
              <div class="ssub" id="gal">Paletools → Gallery, escolha a liga e o time.</div>
            </div>
          </div>
          <div class="kpis">
            <div class="kpi"><small>Faltam</small><b id="kFalta">–</b></div>
            <div class="kpi"><small>Comprou</small><b id="kBought">0</b></div>
            <div class="kpi"><small>Gasto</small><b id="kSpent">0</b></div>
          </div>
          <div class="hint" id="stats" style="margin-top:8px;min-height:15px"></div>
        </div>

        <div class="seg" id="modeSeg"><button data-mode="test">🧪 Modo teste</button><button data-mode="real">⚡ Comprar de verdade</button></div>
        <button class="go" id="go">Iniciar</button>

        <div id="optsBox">
          <div class="tabs" id="tabs">
            <button data-p="buy" class="on">Compra</button><button data-p="teams">Times</button><button data-p="sell">Venda</button><button data-p="adv">Ajustes</button>
          </div>
          <div style="padding-top:10px">
            <div class="pane on" data-p="buy">
              <div class="opt"><div class="l"><b>Preço máximo por carta</b><span>Acima disso, pula a carta</span></div>
                <div class="num"><button data-step="maxPrice" data-d="-100">−</button><input type="number" id="maxPrice" min="200" step="100"><button data-step="maxPrice" data-d="100">+</button></div></div>
              <div class="opt"><div class="l"><b>Gasto máximo total</b><span>0 = sem limite</span></div>
                <div class="num"><button data-step="maxTotal" data-d="-1000">−</button><input type="number" id="maxTotal" min="0" step="1000"><button data-step="maxTotal" data-d="1000">+</button></div></div>
              <div class="opt"><div class="l"><b>Só o que falta</b><span>Compra o necessário p/ completar</span></div><input type="checkbox" class="sw" id="autoQty"></div>
              <div class="opt"><div class="l"><b>Quantidade</b><span>Usada com “Só o que falta” desligado</span></div>
                <div class="num"><button data-step="qty" data-d="-1">−</button><input type="number" id="qty" min="1" step="1"><button data-step="qty" data-d="1">+</button></div></div>
            </div>
            <div class="pane" data-p="teams">
              <div class="opt"><div class="l"><b>Ir para o próximo time</b><span>Ao terminar; pula os completos</span></div><input type="checkbox" class="sw" id="autoNext"></div>
              <div class="opt"><div class="l"><b>Máximo de times</b><span>0 = até o fim da liga</span></div>
                <div class="num"><button data-step="maxSets" data-d="-1">−</button><input type="number" id="maxSets" min="0" step="1"><button data-step="maxSets" data-d="1">+</button></div></div>
            </div>
            <div class="pane" data-p="sell">
              <div class="opt"><div class="l"><b>Listar no mais barato</b><span>Logo depois de comprar</span></div><input type="checkbox" class="sw" id="list"></div>
              <div class="opt"><div class="l"><b>Não listar abaixo de</b><span>0 = aceita qualquer preço</span></div>
                <div class="num"><button data-step="minList" data-d="-100">−</button><input type="number" id="minList" min="0" step="100"><button data-step="minList" data-d="100">+</button></div></div>
              <div class="opt"><div class="l"><b>Limpar quando encher</b><span>Retira vendidos e envia não repetidos ao clube</span></div><input type="checkbox" class="sw" id="cleanFull"></div>
              <div class="opt"><div class="l"><b>Limpar a cada N compras</b><span>Retira vendidos com frequência · 0 = desliga</span></div>
                <div class="num"><button data-step="cleanEvery" data-d="-1">−</button><input type="number" id="cleanEvery" min="0" step="1"><button data-step="cleanEvery" data-d="1">+</button></div></div>
              <div class="opt"><div class="l"><b>Limpar ao trocar de time</b><span>Faz a limpeza entre um time e outro</span></div><input type="checkbox" class="sw" id="cleanBetween"></div>
              <div class="opt"><div class="l"><b>Limpar a lista agora</b><span>E volta para a galeria, se estava nela</span></div><button class="chip" id="cleanNow">🧹 Limpar</button></div>
            </div>
            <div class="pane" data-p="adv">
              <div class="opt"><div class="l"><b>Pausa entre ações</b><span>Em milissegundos</span></div>
                <div class="num"><button data-step="delay" data-d="-100">−</button><input type="number" id="delay" min="300" step="100"><button data-step="delay" data-d="100">+</button></div></div>
              <div class="opt"><div class="l"><b>Ofertas por carta</b><span>Se alguém comprar antes, tenta a próxima mais barata</span></div>
                <div class="num"><button data-step="retries" data-d="-1">−</button><input type="number" id="retries" min="1" step="1"><button data-step="retries" data-d="1">+</button></div></div>
              <div class="opt"><div class="l"><b>Respeitar vagas</b><span>Com quantidade manual</span></div><input type="checkbox" class="sw" id="respectSlots"></div>
              <div class="opt"><div class="l"><b>Ver o tutorial de novo</b><span>Explica cada parte</span></div><button class="chip" id="help2">Abrir</button></div>
            </div>
          </div>
        </div>

        <div id="actBox" style="display:grid;gap:6px">
          <div class="acthead"><b>Atividade</b><div class="links"><button class="chip" id="openLog">📜 Log</button><button class="chip" id="openPl">💰 Lucro</button></div></div>
          <div class="log" id="log"></div>
        </div>
        <div class="foot"><span id="sessPl">Sessão: —</span><span id="clock"></span></div>
      </div>
    </div>
    <div class="mini" id="mini"><div class="logo">⚽</div><b id="miniTxt">Galeria Bot</b></div>

    <div class="ov" id="ov">
      <div class="win">
        <div class="wh"><button class="tab" data-tab="pl">💰 Lucro / perda</button><button class="tab" data-tab="log">📜 Log</button><button class="ib x" id="close" title="Fechar">✕</button></div>
        <div class="flt">
          Período
          <select id="per">
            <option value="session">Esta sessão (desde que abriu o Web App)</option>
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="all">Todas as sessões</option>
            <option value="custom">Personalizado…</option>
          </select>
          <span id="custom" style="display:none">de <input type="datetime-local" id="from"> até <input type="datetime-local" id="to"></span>
          <span style="flex:1"></span>
          <button class="chip" id="dl">⬇ Baixar</button>
          <button class="chip" id="wipe">Apagar</button>
        </div>
        <div class="wb" id="wb"></div>
      </div>
    </div>

    <div class="tour" id="tour">
      <div class="shade" id="shade"></div>
      <div class="spot" id="spot"></div>
      <div class="tip" id="tip">
        <button class="tclose" id="tClose" title="Fechar tutorial (Esc)">✕</button>
        <div class="stepn" id="tStep"></div>
        <h3 id="tTitle"></h3>
        <div id="tBody"></div>
        <div class="nav"><div class="dots" id="tDots"></div><button class="skip" id="tSkip">Fechar tutorial</button><button class="btn" id="tPrev">Voltar</button><button class="btn pri" id="tNext">Próximo</button></div>
      </div>
    </div>
  </div>`;
  document.documentElement.appendChild(host);
  const $ = id => sh.getElementById(id);
  const stats = $('stats');

  // opções ligadas ao cfg
  for (const k of Object.keys(DEF)) {
    const el = $(k); if (!el) continue;
    if (el.type === 'checkbox') el.checked = !!cfg[k]; else el.value = cfg[k];
    el.addEventListener('change', () => { cfg[k] = el.type === 'checkbox' ? el.checked : Math.max(0, +el.value || 0); saveCfg(); render(); });
  }
  sh.querySelectorAll('[data-step]').forEach(b => b.onclick = () => {
    const el = $(b.dataset.step); if (el.disabled) return;
    el.value = Math.max(+el.min || 0, (+el.value || 0) + +b.dataset.d);
    el.dispatchEvent(new Event('change'));
  });
  sh.querySelectorAll('#modeSeg button').forEach(b => b.onclick = () => {
    if (running) return;
    if (b.dataset.mode === 'real' && cfg.dryRun && !confirm('Comprar de verdade?\n\nO bot vai gastar moedas e listar as cartas. Recomendo testar antes no Modo teste.')) return;
    cfg.dryRun = b.dataset.mode === 'test'; saveCfg(); render();
  });
  const showPane = p => {
    sh.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
    sh.querySelectorAll('.pane').forEach(x => x.classList.toggle('on', x.dataset.p === p));
  };
  sh.querySelectorAll('#tabs button').forEach(b => b.onclick = () => showPane(b.dataset.p));
  $('go').onclick = () => { if (running) stopReq = true; else run(); };
  $('cleanNow').onclick = async () => {
    if (running) return;
    running = true; stopReq = false; render();
    try {
      const back = readGallery() ? currentSet() : null;
      await cleanTransferList();
      if (back) await goToGallery(back);
      log('🧹 Limpeza concluída.', 'good');
    } catch (e) { log((e instanceof Stop ? '' : 'Erro: ') + e.message, 'bad'); beep(); }
    finally { running = false; render(); }
  };

  // minimizar e arrastar (posição lembrada)
  const POSKEY = 'fgb_pos_v1';
  const setMin = m => {
    $('root').classList.toggle('min', m);
    try { localStorage.setItem('fgb_min', m ? '1' : ''); } catch {}
    if (host.style.left) requestAnimationFrame(() => { const q = host.getBoundingClientRect(); placeHost(q.left, q.top); });
  };
  $('minBtn').onclick = e => { e.stopPropagation(); setMin(true); };

  try { if (localStorage.getItem('fgb_min')) setMin(true); } catch {}
  function placeHost(x, y) {
    const w = host.offsetWidth, h = host.offsetHeight;
    x = Math.min(Math.max(8, x), innerWidth - w - 8); y = Math.min(Math.max(8, y), innerHeight - h - 8);
    host.style.left = x + 'px'; host.style.top = y + 'px'; host.style.right = 'auto'; host.style.bottom = 'auto';
  }
  try { const p = JSON.parse(localStorage.getItem(POSKEY) || 'null'); if (p) requestAnimationFrame(() => placeHost(p.x, p.y)); } catch {}
  // arrastar pelo topo do painel ou pela bolinha minimizada; na bolinha, um clique sem arrastar abre o painel
  function makeDraggable(handle, onClick) {
    handle.addEventListener('mousedown', e => {
      if (e.button !== 0 || (e.target.closest('button') && handle.contains(e.target.closest('button')))) return;
      const r = host.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top, sx = e.clientX, sy = e.clientY;
      let moved = false;
      const mv = ev => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
        moved = true; placeHost(ev.clientX - dx, ev.clientY - dy);
      };
      const up = () => {
        removeEventListener('mousemove', mv); removeEventListener('mouseup', up);
        if (moved) savePos(); else if (onClick) onClick();
      };
      addEventListener('mousemove', mv); addEventListener('mouseup', up); e.preventDefault();
    });
  }
  const savePos = () => { const q = host.getBoundingClientRect(); try { localStorage.setItem(POSKEY, JSON.stringify({ x: q.left, y: q.top })); } catch {} };
  makeDraggable($('drag'));
  makeDraggable($('mini'), () => setMin(false));
  addEventListener('resize', () => { if (host.style.left) { const q = host.getBoundingClientRect(); placeHost(q.left, q.top); } });

  function log(msg, cls = '') {
    const e = { t: Date.now(), s: SESSION, m: msg, c: cls };
    logs.push(e); saveLogs();
    const d = document.createElement('div'); if (cls) d.className = cls;
    const tm = document.createElement('span'); tm.className = 'hint'; tm.textContent = new Date(e.t).toLocaleTimeString('pt-BR') + '  ';
    d.append(tm, msg);
    const L = $('log'); L.appendChild(d); while (L.children.length > 300) L.firstChild.remove(); L.scrollTop = L.scrollHeight;
    if (ovTab === 'log' && $('ov').classList.contains('open')) renderReport();
  }

  // ---------- janela de relatório ----------
  let ovTab = 'pl';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dt = t => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  const toLocalInput = t => new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  function range() {
    const v = $('per').value, now = Date.now(), day = 86400000;
    if (v === 'session') return [SESSION, Infinity, 'sessao'];
    if (v === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); return [d.getTime(), Infinity, 'hoje']; }
    if (v === '7d') return [now - 7 * day, Infinity, '7dias'];
    if (v === '30d') return [now - 30 * day, Infinity, '30dias'];
    if (v === 'custom') {
      const a = $('from').value ? new Date($('from').value).getTime() : 0, b = $('to').value ? new Date($('to').value).getTime() : Infinity;
      return [a, b, 'personalizado'];
    }
    return [0, Infinity, 'tudo'];
  }
  const inRange = t => { const [a, b] = range(); return t >= a && t <= b; };
  const plOf = b => b.status === 'sold' ? net(b.sale) - b.buy : null;
  const money = (v, sign) => { if (v == null) return '—'; const c = sign ? (v > 0 ? 'good' : v < 0 ? 'bad' : '') : ''; return `<span class="${c}">${sign && v > 0 ? '+' : ''}${fmt(v)}</span>`; };
  const ST = { sold: 'vendida', listed: 'listada', unlisted: 'não listada' };

  function renderReport() {
    sh.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === ovTab));
    $('custom').style.display = $('per').value === 'custom' ? '' : 'none';
    const W = $('wb');
    if (ovTab === 'log') {
      const L = logs.filter(e => inRange(e.t));
      W.innerHTML = `<div class="log full">${L.length ? L.map(e => `<div class="${e.c || ''}">${dt(e.t)}  ${esc(e.m)}</div>`).join('') : '<div class="hint">Nada no log neste período.</div>'}</div>`;
      const f = W.firstChild; f.scrollTop = f.scrollHeight;
      return;
    }
    const B = data.buys.filter(b => inRange(b.t)).sort((a, b) => b.t - a.t);
    const sold = B.filter(b => b.status === 'sold'), open = B.filter(b => b.status !== 'sold');
    const spent = B.reduce((a, b) => a + b.buy, 0);
    const got = sold.reduce((a, b) => a + net(b.sale), 0);
    const realized = sold.reduce((a, b) => a + plOf(b), 0);
    const openCost = open.reduce((a, b) => a + b.buy, 0);
    const potential = open.filter(b => b.listBN).reduce((a, b) => a + net(b.listBN) - b.buy, 0);
    const wins = sold.filter(b => plOf(b) > 0).length;
    W.innerHTML = `
      <div class="cards">
        <div class="card"><div class="k">Compradas</div><div class="v">${B.length}</div></div>
        <div class="card"><div class="k">Gasto em compras</div><div class="v">${fmt(spent)}</div></div>
        <div class="card"><div class="k">Vendidas</div><div class="v">${sold.length}${sold.length ? ` <span class="hint">(${wins} no lucro)</span>` : ''}</div></div>
        <div class="card"><div class="k">Recebido (−5% EA)</div><div class="v">${fmt(got)}</div></div>
        <div class="card"><div class="k">Lucro / perda realizado</div><div class="v">${money(realized, true)}</div></div>
        <div class="card"><div class="k">Ainda não vendidas</div><div class="v">${open.length} <span class="hint">(custo ${fmt(openCost)})</span></div></div>
        <div class="card"><div class="k">Se vender as listadas pelo imediato</div><div class="v">${money(potential, true)}</div></div>
      </div>
      <p class="hint" style="margin:0 0 10px">As vendas são detectadas quando você abre a <b>Lista de Transferências</b> no Web App (itens vendidos). Se alguma venda não for reconhecida, use “marcar venda”. O período é pela data da compra.</p>
      ${B.length ? `<table><thead><tr><th>Compra</th><th>Jogador</th><th class="n">Pago</th><th class="n">Listada (imediato)</th><th class="n">Vendida por</th><th class="n">Lucro / perda</th><th>Situação</th><th></th></tr></thead><tbody>
      ${B.map(b => `<tr><td>${dt(b.t)}</td><td>${esc(b.name)} ${b.rating || ''}</td><td class="n">${fmt(b.buy)}</td><td class="n">${b.listBN ? fmt(b.listBN) : '—'}</td><td class="n">${b.sale ? fmt(b.sale) : '—'}</td><td class="n">${money(plOf(b), true)}</td><td>${ST[b.status] || b.status}${b.soldAt ? ' · ' + dt(b.soldAt) : ''}</td>
        <td>${b.status === 'sold' ? `<button data-undo="${b.id}">desfazer</button>` : `<button data-sell="${b.id}">marcar venda</button>`} <button data-del="${b.id}" title="Tirar do histórico">✕</button></td></tr>`).join('')}
      </tbody></table>` : '<div class="hint">Nenhuma compra registrada neste período.</div>'}`;
    W.querySelectorAll('[data-sell]').forEach(x => x.onclick = () => {
      const b = data.buys.find(y => y.id === x.dataset.sell);
      const v = num(prompt(`Por quanto ${b.name} foi vendida? (valor cheio, antes dos 5% do EA)`, b.listBN || ''));
      if (!v) return; b.status = 'sold'; b.sale = v; b.soldAt = Date.now(); b.manual = true; saveData(); renderReport();
    });
    W.querySelectorAll('[data-undo]').forEach(x => x.onclick = () => {
      const b = data.buys.find(y => y.id === x.dataset.undo); b.status = b.listBN ? 'listed' : 'unlisted'; delete b.sale; delete b.soldAt; saveData(); renderReport();
    });
    W.querySelectorAll('[data-del]').forEach(x => x.onclick = () => {
      if (!confirm('Tirar esta compra do histórico?')) return; data.buys = data.buys.filter(y => y.id !== x.dataset.del); saveData(); renderReport();
    });
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
  const openReport = tab => { ovTab = tab; $('ov').classList.add('open'); renderReport(); };
  $('openLog').onclick = () => openReport('log');
  $('openPl').onclick = () => openReport('pl');
  $('close').onclick = () => $('ov').classList.remove('open');
  $('ov').onclick = e => { if (e.target === $('ov')) $('ov').classList.remove('open'); };
  sh.querySelectorAll('.tab').forEach(b => b.onclick = () => { ovTab = b.dataset.tab; renderReport(); });
  $('per').onchange = () => {
    if ($('per').value === 'custom' && !$('from').value) { $('from').value = toLocalInput(Date.now() - 86400000); $('to').value = toLocalInput(Date.now()); }
    renderReport();
  };
  $('from').onchange = $('to').onchange = renderReport;
  $('dl').onclick = () => {
    const tag = range()[2];
    if (ovTab === 'log') {
      download(`galeria-bot-log-${tag}-${stamp()}.txt`, logs.filter(e => inRange(e.t)).map(e => `${new Date(e.t).toLocaleString('pt-BR')}  ${e.m}`).join('\r\n'), 'text/plain;charset=utf-8');
    } else {
      const head = 'Data da compra;Jogador;Overall;Pago;Listada inicial;Listada imediato;Vendida por;Recebido (-5%);Lucro/perda;Situação;Data da venda';
      const lines = data.buys.filter(b => inRange(b.t)).sort((a, b) => a.t - b.t).map(b => [new Date(b.t).toLocaleString('pt-BR'), b.name, b.rating ?? '', b.buy, b.listStart ?? '', b.listBN ?? '', b.sale ?? '', b.sale ? net(b.sale) : '', plOf(b) ?? '', ST[b.status] || b.status, b.soldAt ? new Date(b.soldAt).toLocaleString('pt-BR') : ''].map(v => String(v).replace(/;/g, ',')).join(';'));
      download(`galeria-bot-lucro-${tag}-${stamp()}.csv`, [head, ...lines].join('\r\n'), 'text/csv;charset=utf-8');
    }
  };
  $('wipe').onclick = () => {
    if (ovTab === 'log') {
      if (!confirm('Apagar o log do período escolhido?')) return;
      logs = logs.filter(e => !inRange(e.t)); saveLogs();
    } else {
      if (!confirm('Apagar as compras do período escolhido do histórico de lucro?')) return;
      data.buys = data.buys.filter(b => !inRange(b.t)); saveData();
    }
    renderReport();
  };
  function render() {
    const go = $('go');
    go.classList.toggle('stop', running);
    go.textContent = running ? '■  Parar' : cfg.dryRun ? '▶  Iniciar teste' : '▶  Iniciar compras';
    sh.querySelectorAll('#modeSeg button').forEach(b => { b.classList.toggle('on', (b.dataset.mode === 'test') === !!cfg.dryRun); b.disabled = running; });
    $('qty').disabled = !!cfg.autoQty; $('respectSlots').disabled = !!cfg.autoQty; $('maxSets').disabled = !cfg.autoNext;
    if (!cfg.autoQty) $('qty').value = cfg.qty;
    const pill = $('pill');
    pill.className = 'pill' + (running ? (cfg.dryRun ? ' test' : ' run') : '');
    pill.textContent = running ? (cfg.dryRun ? 'Testando' : 'Rodando') : cfg.dryRun ? 'Teste' : 'Parado';
  }

  // status da galeria aberta + lucro da sessão
  function refreshStatus() {
    const g = galleryStatus();
    if (cfg.autoQty && !running) $('qty').value = g && g.toBuy != null ? g.toBuy : '';
    if (g) {
      const set = currentSet() || 'Galeria';
      $('sname').textContent = set;
      const pct = g.req ? Math.min(100, Math.round(g.sel / g.req * 100)) : 0;
      $('ring').style.setProperty('--v', pct);
      $('ringTxt').textContent = `${g.sel}/${g.req ?? '?'}`;
      $('kFalta').textContent = g.toBuy ?? '?';
      $('gal').textContent = g.toBuy === 0 ? 'Completa ✓' : `${g.missingTiles} faltando com botão Mercado` + (g.ownedUnsel ? ` · ${g.ownedUnsel} sua(s) sem incluir` : '');
    } else if (!running) {
      $('sname').textContent = 'Abra a Gallery';
      $('gal').textContent = 'Paletools → Gallery, escolha a liga e o time.';
      $('ring').style.setProperty('--v', 0); $('ringTxt').textContent = '–'; $('kFalta').textContent = '–';
    }
    const S = data.buys.filter(b => b.t >= SESSION && b.status === 'sold');
    const pl = S.reduce((a, b) => a + net(b.sale) - b.buy, 0);
    $('sessPl').innerHTML = 'Lucro da sessão: ' + (S.length ? `<span class="${pl >= 0 ? 'good' : 'bad'}">${pl >= 0 ? '+' : ''}${fmt(pl)}</span> (${S.length} venda${S.length > 1 ? 's' : ''})` : 'sem vendas ainda');
    $('clock').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    $('miniTxt').textContent = running ? `${$('pill').textContent} · ${$('kBought').textContent} compradas` : g ? `${currentSet() || 'Galeria'} · ${g.sel}/${g.req ?? '?'}` : 'Galeria Bot';
  }
  setInterval(() => { try { refreshStatus(); } catch {} }, 1500);

  // ---------- tutorial ----------
  const TOUR = [
    { t: 'Bem-vindo ao Galeria Bot 👋', b: `<p>Ele completa as galerias do Paletools para você:</p>
        <ul><li>abre o <b>Mercado</b> de cada carta que falta</li><li>compra no <b>Comprar já</b> se couber no seu preço</li><li>lista no <b>mais barato</b> do mercado</li><li>e passa para o <b>próximo time</b></li></ul>
        <p>Leva 1 minuto. Use os botões ou as setas ← → do teclado.</p>` },
    { el: () => { const c = setControl(); return c && (c.ctl || c.select); }, t: 'Abra a galeria',
      b: '<p>No Paletools, entre em <b>Gallery</b>, escolha a <b>Category</b> (a liga) e o <b>Set</b> (o time). O bot começa pelo time que estiver aberto aqui.</p>',
      miss: '<p class="hint">A galeria não está aberta agora: vá em Paletools → Gallery.</p>' },
    { el: () => $('statusCard'), t: 'Status da galeria',
      b: '<p>O anel mostra quantas cartas o time já tem selecionadas (ex.: <b>7/15</b>).</p><ul><li><b>Faltam</b>: quantas o bot vai comprar para completar</li><li><b>Comprou</b> e <b>Gasto</b>: a rodada atual</li></ul>' },
    { el: () => $('modeSeg'), t: 'Teste ou de verdade',
      b: '<p><b>🧪 Modo teste</b> faz todo o caminho, menos a compra: só mostra por quanto compraria. Comece sempre por ele.</p><p><b>⚡ Comprar de verdade</b> gasta moedas e lista as cartas.</p>' },
    { el: () => $('maxPrice').closest('.opt'), pane: 'buy', t: 'Preço máximo por carta',
      b: '<p>Se a carta mais barata do mercado passar desse valor, o bot pula ela. O preço é conferido duas vezes antes de comprar: na lista e no botão.</p>' },
    { el: () => $('maxTotal').closest('.opt'), pane: 'buy', t: 'Limite total',
      b: '<p>Teto de moedas para a rodada inteira, somando todos os times. Quando chegar nele, o bot para. <b>0</b> = sem limite.</p>' },
    { el: () => $('autoQty').closest('.opt'), pane: 'buy', t: 'Só o que falta',
      b: '<p>Ligado, o bot calcula sozinho quantas cartas faltam: pede 15, tem 7 → compra 8.</p><p>Cartas que você já tem mas não incluiu também contam. Clique em <b>Include</b> nelas para não gastar à toa.</p>' },
    { el: () => $('autoNext').closest('.pane'), pane: 'teams', t: 'Próximo time',
      b: '<p>Ao terminar um time, ele escolhe o próximo da lista <b>Set</b> e <b>pula os que já estão completos</b>, até o fim da liga ou até o máximo de times que você definir.</p>' },
    { el: () => $('list').closest('.pane'), pane: 'sell', t: 'Venda automática',
      b: '<p>Depois de comprar, ele faz <b>Listar no Mercado → Mais barato → Listar</b>.</p><p><b>Não listar abaixo de</b> protege contra prejuízo: se o mais barato do mercado estiver abaixo, a carta fica nos não atribuídos para você decidir.</p><p><b>Limpar quando encher</b>: se a Lista de Transferências lotar, ele registra as vendas, clica em <b>Retirar vendidos</b>, envia os não repetidos ao clube e volta para a galeria. Também dá para limpar na hora no botão 🧹.</p>' },
    { el: () => $('go'), t: 'Iniciar e parar',
      b: '<p>Com a galeria aberta, clique em <b>Iniciar</b>. O mesmo botão vira <b>Parar</b>.</p><p>Ele também para sozinho, com um apito, se aparecer captcha, faltarem moedas ou o EA limitar o mercado.</p>' },
    { el: () => $('actBox'), t: 'Atividade, log e lucro',
      b: '<p>Aqui aparece cada passo do bot.</p><ul><li><b>📜 Log</b>: histórico completo, por período, para ver ou baixar (.txt)</li><li><b>💰 Lucro</b>: compras, vendas e lucro por sessão, dia ou período personalizado (.csv)</li></ul><p>As vendas entram quando você abre a <b>Lista de Transferências</b> no Web App.</p>' },
    { el: () => $('drag'), t: 'Tudo pronto ✅',
      b: '<p>Arraste o painel pelo topo, minimize no <b>–</b> e abra este tutorial de novo no <b>?</b>.</p><p style="color:var(--warn);font-size:12px">O EA proíbe automação no Web App. Use com moderação e por sua conta e risco.</p>' },
  ];
  let tourI = 0;
  const tourOpen = () => $('tour').classList.contains('open');
  function tourShow(i) {
    tourI = Math.max(0, Math.min(TOUR.length - 1, i));
    const s = TOUR[tourI];
    setMin(false); $('ov').classList.remove('open');
    if (s.pane) showPane(s.pane);
    $('tour').classList.add('open');
    let el = null; try { el = s.el ? s.el() : null; } catch {}
    $('tStep').textContent = `Passo ${tourI + 1} de ${TOUR.length}`;
    $('tTitle').textContent = s.t;
    $('tBody').innerHTML = s.b + (!el && s.miss ? s.miss : '');
    $('tDots').innerHTML = TOUR.map((_, k) => `<i class="${k === tourI ? 'on' : ''}"></i>`).join('');
    $('tPrev').style.visibility = tourI ? 'visible' : 'hidden';
    $('tNext').textContent = tourI === TOUR.length - 1 ? 'Concluir' : 'Próximo';
    requestAnimationFrame(() => placeTour(el));
  }
  function placeTour(el) {
    const spot = $('spot'), tip = $('tip'), shade = $('shade'), tw = 330, gap = 16;
    if (!el || !el.getClientRects().length) {
      spot.style.display = 'none'; shade.style.display = 'block';
      tip.style.left = (innerWidth - tw) / 2 + 'px'; tip.style.top = Math.max(20, (innerHeight - tip.offsetHeight) / 2) + 'px';
      return;
    }
    const r = el.getBoundingClientRect(), pad = 6, th = tip.offsetHeight;
    shade.style.display = 'none'; spot.style.display = 'block';
    Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    let x, y;
    if (r.left - tw - gap > 8) { x = r.left - tw - gap; y = r.top + r.height / 2 - th / 2; }
    else if (r.right + gap + tw < innerWidth - 8) { x = r.right + gap; y = r.top + r.height / 2 - th / 2; }
    else { x = r.left; y = r.bottom + gap + th < innerHeight ? r.bottom + gap : r.top - gap - th; }
    tip.style.left = Math.min(innerWidth - tw - 8, Math.max(8, x)) + 'px';
    tip.style.top = Math.min(innerHeight - th - 8, Math.max(8, y)) + 'px';
  }
  const tourEnd = () => { $('tour').classList.remove('open'); showPane('buy'); try { localStorage.setItem('fgb_tour_done', '1'); } catch {} };
  $('tNext').onclick = () => tourI === TOUR.length - 1 ? tourEnd() : tourShow(tourI + 1);
  $('tPrev').onclick = () => tourShow(tourI - 1);
  $('tSkip').onclick = tourEnd;
  $('tClose').onclick = tourEnd;
  $('help').onclick = e => { e.stopPropagation(); tourShow(0); };
  $('help2').onclick = () => tourShow(0);
  addEventListener('keydown', e => {
    if (!tourOpen()) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') $('tNext').click();
    else if (e.key === 'ArrowLeft') $('tPrev').click();
    else if (e.key === 'Escape') tourEnd();
    else return;
    e.preventDefault(); e.stopPropagation();
  }, true);
  addEventListener('resize', () => { if (tourOpen()) tourShow(tourI); });

  render();
  refreshStatus();
  log('Pronto. Comece pelo Modo teste para conferir.');
  try { if (!localStorage.getItem('fgb_tour_done')) setTimeout(() => tourShow(0), 1500); } catch {}
})();
