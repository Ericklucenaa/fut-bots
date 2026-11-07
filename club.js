// Módulo Clube — lê os jogadores do clube e, com as cartas escolhidas no painel, busca o menor preço do mercado,
// vende (preço fixo ou mais barato) ou envia para a Lista de Transferências. Também leva o Web App até a tela pedida. Tudo roda quando você pede.
(() => {
  'use strict';
  if (window.__futClub) return;
  window.__futClub = true;
  const { fmt, norm } = FSB;
  const F = FUT, D = F.D, T = F.T;
  const { Stop, Limited, sleep, vis, click, closeDialog, dialogs, fastFind, loading } = F;
  const C = () => D.clubCfg;
  const log = (m, c = '') => F.log(m, c, 'club');
  const pause = (k = 1) => sleep((C().delay || 900) * k * (0.8 + Math.random() * 0.4));
  const waitFor = (fn, ms, what) => F.waitFor(fn, ms, what, 150);
  const R = { done: 0, total: 0, line: '' };
  const MAX_PAGES = 200;

  // ---------- leitura das linhas ----------
  function readRow(r) {
    const id = F.itemIdent(r);
    const lines = (r.innerText || '').split('\n').map(norm).filter(Boolean);
    const pos = (norm((r.querySelector('.position') || {}).textContent) || lines.find(l => T.pos.test(l)) || '').toUpperCase();
    const untradeable = [...r.querySelectorAll('.untradeable, [class*="untradeable"]')].some(vis);
    // a foto da própria carta é a mais exata (cartas especiais têm imagem diferente da carta base)
    const pic = r.querySelector('img[src*="portraits"]');
    const img = pic && /^https:\/\/www\.ea\.com\//.test(pic.src) ? pic.src : '';
    return { name: id.name, rating: id.rating, pos, untradeable, img, key: `${id.name}|${id.rating}|${pos}`.toLowerCase() };
  }
  const pageSig = () => F.items().map(r => norm(r.innerText)).join('¦');
  const nextBtn = () => [...document.querySelectorAll('button.pagination.next, .pagination.next, .paginated-item-list .next')]
    .find(b => vis(b) && !F.mine(b) && !b.disabled && !b.classList.contains('disabled')) || fastFind(T.nextPage);
  // 'next' = mudou de página · 'end' = não há próxima · 'stuck' = clicou e a página não mudou
  async function nextPage() {
    const b = nextBtn();
    if (!b) return 'end';
    const sig = pageSig();
    click(b);
    return (await waitFor(() => !loading() && F.items().length && pageSig() !== sig, 12000)) ? 'next' : 'stuck';
  }

  // ---------- dados do Web App: preço pago e identificação exata de cada carta ----------
  const fold = s => norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  async function enrich() {
    let list;
    try {
      if (!(await F.pageCall('ping', {}, 1500))) throw new Error('Web App ainda carregando');
      list = await F.pageCall('club', {}, 60000);
    }
    catch (e) { log(`   não li os preços de compra (${e.message}); a busca de preço será pelas telas, mais lenta.`, 'warn'); return; }
    const pool = new Map();
    for (const c of list) { const k = `${fold(c.name)}|${c.rating}`; if (!pool.has(k)) pool.set(k, []); pool.get(k).push(c); }
    // o nome da lista pode ser só o sobrenome: sem par exato, procura com a mesma nota
    const take = p => {
      const exact = pool.get(`${fold(p.name)}|${p.rating}`);
      if (exact && exact.length) return exact.shift();
      const n = fold(p.name);
      for (const [k, v] of pool) {
        if (!v.length) continue;
        const [name, r] = k.split('|');
        if (+r === p.rating && (name.endsWith(n) || n.endsWith(name))) return v.shift();
      }
      return null;
    };
    let inSquad = new Set();
    try { inSquad = new Set(await F.pageCall('squad', {}, 15000)); }
    catch (e) { log(`   não li o time ativo (${e.message}).`, 'warn'); }
    let hit = 0;
    for (const p of D.club.players) { const c = take(p); if (c) { p.def = c.def; p.buy = c.buy; p.inSquad = inSquad.has(c.id); hit++; } }
    F.persist('club');
    log(`   dados do Web App: ${hit} de ${D.club.players.length} carta(s) identificadas.`, hit ? 'good' : 'warn');
  }

  // ---------- analisar o clube ----------
  async function scan() {
    Object.assign(R, { done: 0, total: 0, line: '' });
    log('▶ Clube: lendo todos os jogadores…', 'good');
    await F.goToClub(log);
    const map = new Map();
    const old = new Map(((D.club && D.club.players) || []).map(p => [p.key, p]));
    let pages = 0, partial = true;
    const keep = () => { D.club = { t: Date.now(), pages, partial, players: [...map.values()] }; F.persist('club'); };
    try {
      for (;;) {
        await waitFor(() => !loading() && F.items().length, 15000, 'a lista do clube');
        await pause(0.4);
        for (const r of F.items()) {
          const p = readRow(r), o = map.get(p.key);
          if (o) { o.n++; o.untradeable = o.untradeable && p.untradeable; R.done++; continue; }
          const was = old.get(p.key) || {};
          map.set(p.key, { ...p, n: 1, price: was.price, none: was.none, priceT: was.priceT, def: was.def, buy: was.buy }); R.done++;
        }
        pages++;
        R.line = `${R.done} jogador(es) · página ${pages}`; F.changed();
        if (pages >= MAX_PAGES) { log(`   parei em ${MAX_PAGES} páginas.`, 'warn'); break; }
        const nx = await nextPage();
        if (nx === 'end') { partial = false; break; }
        if (nx === 'stuck') { log('   a próxima página não abriu; a lista pode estar incompleta.', 'warn'); break; }
        await pause(0.8);
      }
    } finally { keep(); }
    await enrich();
    log(`■ Clube: ${R.done} jogador(es) em ${pages} página(s)${partial ? ' (lista incompleta)' : ''}.`, partial ? 'warn' : 'good');
  }

  // ---------- ação em uma carta ----------
  const selectedKey = () => { const s = F.items().find(x => x.classList.contains('selected')); return s ? readRow(s).key : null; };
  async function selectRow(row, key) {
    click(row);
    // só age depois de ver a carta certa selecionada: o painel do item não pode ser o da carta anterior
    if (!(await waitFor(() => selectedKey() === key, 3000))) return false;
    await pause(0.6);
    return true;
  }
  async function one(row, id, op, price, test) {
    const sell = op === 'sell';
    if (id.untradeable) return { skip: 'é inegociável' };
    if (!(await selectRow(row, id.key))) return { ok: false, why: 'não consegui selecionar a carta' };
    const btn = await waitFor(() => fastFind(op === 'toTL' ? T.sendToTL : T.listOnMarket), 5000);
    if (!btn || btn.disabled || btn.classList.contains('disabled')) return { ok: false, why: 'o botão não apareceu (carta inegociável ou no time ativo?)' };
    if (test) return { ok: true, test: true };
    const reselect = async () => {
      const r = F.items().find(x => readRow(x).key === id.key);
      if (!r || !(await selectRow(r, id.key))) throw new Error('a carta saiu da lista');
    };
    if (op === 'price') {
      countReq();
      const c = await F.cheapestOwn(T.listOnMarket, null);   // o preço já foi lido: não precisa reabrir a carta
      return c.err ? { ok: false, why: c.err } : { ok: true, min: c.min, none: c.min == null };
    }
    if (sell) {
      const l = price ? await F.listFixed(price, T.listOnMarket) : await F.listCheapest({ minBn: C().minPrice, accRe: T.listOnMarket, reselect });
      if (l.ok && l.confirmed === false) return { ...l, ok: false, why: 'o anúncio não foi confirmado (confira a Lista de Transferências)' };
      return l;
    }
    click(btn);
    await waitFor(() => !vis(btn) || dialogs().length, 5000);
    if (T.full.test(F.popupText())) { closeDialog(); return { ok: false, full: true, why: 'a Lista de Transferências está cheia' }; }
    if (dialogs().length) { const t = F.snip(dialogs().pop().innerText); closeDialog(); return { ok: false, why: t }; }
    return { ok: true };
  }
  // histórico: até 60 pontos por carta e 400 cartas
  function addHist(def, v) {
    if (!def || v == null) return;
    const h = D.priceHist, a = h[def] || (h[def] = []);
    a.push({ t: Date.now(), v });
    if (a.length > 60) a.splice(0, a.length - 60);
    const keys = Object.keys(h);
    if (keys.length > 400) { keys.sort((x, y) => h[x][h[x].length - 1].t - h[y][h[y].length - 1].t); delete h[keys[0]]; }
    F.persist('priceHist');
  }
  function setPrice(key, min) {
    const p = D.club && D.club.players.find(x => x.key === key);
    if (!p) return;
    Object.assign(p, { price: min, none: min == null, priceT: Date.now() });
    addHist(p.def, min);
    F.persist('club');
  }
  const countReq = () => { D.reqs.push(Date.now()); F.persist('reqs'); };
  // uma busca; na busca precisa, procura de novo abaixo do menor preço até 3 vezes (a 1ª página pode não ter o menor)
  async function marketMin(def, deep) {
    countReq();
    let r = await F.pageCall('price', { def });
    for (let k = 0; deep && r.min != null && k < 3; k++) {
      const max = FSB.ladderPrev(r.min);
      if (max < 150) break;
      await F.idle(F.rnd(700, 1200));
      checkDaily(); countReq();
      const r2 = await F.pageCall('price', { def, max });
      if (r2.min == null) break;
      r = r2;
    }
    return r;
  }
  // a busca de preço conta como busca no mercado e respeita o limite de 24 h das configurações
  function checkDaily() {
    const max = D.cfg.dailyMax, now = Date.now();
    if (max && D.reqs.filter(t => now - t < FSB.DAY).length >= max) throw new Stop(`Cheguei ao limite de ${fmt(max)} buscas em 24 h (Sniper → Ritmo e limites).`);
  }
  function forget(key) {
    const list = D.club && D.club.players, p = list && list.find(x => x.key === key);
    if (!p) return;
    if (--p.n <= 0) list.splice(list.indexOf(p), 1);
    F.persist('club');
  }

  // ---------- menor preço direto no Web App, sem abrir telas ----------
  const FRESH_MS = 10 * 6e4;
  async function fastPrices(items) {
    const list = items.map(i => (D.club.players || []).find(p => p.key === i.key)).filter(Boolean);
    const now = Date.now(), todo = list.filter(p => !(p.priceT && now - p.priceT < FRESH_MS));
    const fresh = list.length - todo.length;
    const direct = todo.filter(p => p.def), slow = todo.filter(p => !p.def);
    Object.assign(R, { done: 0, total: todo.length, line: '' });
    log(`▶ Clube: buscar o menor preço, ${todo.length} carta(s)${fresh ? ` (${fresh} já buscada(s) nos últimos 10 min)` : ''}.`, 'good');
    const sp = FSB.SPEEDS[D.cfg.speed] || FSB.SPEEDS.rapida, wait = sp.wait || [D.cfg.waitMin, D.cfg.waitMax];
    let bad = 0;
    for (let i = 0; i < direct.length; i++) {
      const p = direct[i], name = `${p.name} ${p.rating || ''}`.trim();
      if (F.stopping()) throw new Stop('Parado por você.');
      checkDaily();
      try {
        const r = await marketMin(p.def, C().deep);
        setPrice(p.key, r.min); R.done++;
        log(`   ✔ ${name}: ${r.min == null ? 'ninguém vendendo agora' : `menor preço ${fmt(r.min)}`}.`, 'good');
      } catch (e) {
        if (e instanceof Stop) throw e;
        if (e.status === 458) { F.notify('FUT Bots', 'Apareceu verificação (captcha) no Web App.'); throw new Stop('Apareceu verificação (captcha). Resolva na página e inicie de novo.'); }
        if (e.status === 401) throw new Stop('A sessão do Web App expirou. Entre de novo.');
        if ([426, 429, 512, 521].includes(e.status)) { await F.limitPause(new Limited(`código ${e.status}`), log); i--; continue; }
        if (e.status == null) {   // a ponte não funcionou: segue pelas telas
          log(`   ${e.message}: seguindo pelas telas, mais lento.`, 'warn');
          slow.push(...direct.slice(i));
          break;
        }
        bad++; log(`   ✖ ${name}: ${e.message} (código ${e.status}).`, 'bad');
      }
      R.line = `${R.done} de ${R.total}`; F.changed();
      await F.idle(F.rnd(wait[0], wait[1]));
    }
    if (slow.length) await batch('price', slow.map(p => ({ key: p.key, n: 1 })), 0);
    else log(`■ Clube: ${R.done} de ${R.total} preço(s) buscado(s)${bad ? `, ${bad} com falha` : ''}.`, bad ? 'warn' : 'good');
  }

  // ---------- vender / enviar as cartas escolhidas ----------
  // Cada carta é tentada uma vez. Ao sair do clube as cartas seguintes sobem de página, por isso até 3 passadas.
  async function batch(op, items, price) {
    const sell = op === 'sell', pricing = op === 'price', test = !pricing && !!C().dryRun;
    const left = new Map(items.map(i => [i.key, i.n || 1]));
    const remaining = () => [...left.values()].reduce((a, b) => a + b, 0);
    Object.assign(R, { done: 0, total: remaining(), line: '' });
    const what = pricing ? 'buscar o menor preço' : sell ? (price ? `vender por ${fmt(price)}` : 'vender no mais barato') : 'enviar para a Lista de Transferências';
    log(`▶ Clube: ${what}, ${R.total} carta(s)${test ? ' (modo teste: nada será vendido nem movido)' : ''}.`, 'good');
    let full = false, bad = 0, skipped = 0;
    // a busca de preço entra e sai da carta: se o Web App voltar para o começo, continua de onde dá
    for (let pass = 0; pass < (pricing ? 40 : 3) && remaining() && !full; pass++) {
      const startLeft = remaining();
      await F.goToClub(log);
      for (let p = 0; p < MAX_PAGES; p++) {
        let restart = false;
        for (;;) {
          if (F.stopping()) throw new Stop('Parado por você.');
          await waitFor(() => !loading(), 20000, 'a tela carregar');
          const row = F.items().find(r => left.get(readRow(r).key) > 0);
          if (!row) break;
          const id = readRow(row), name = `${id.name} ${id.rating || ''}`.trim();
          if (pricing) checkDaily();
          left.set(id.key, left.get(id.key) - 1);
          let res;
          try { res = await one(row, id, op, price, test); }
          catch (e) {
            if (e instanceof Limited) { left.set(id.key, left.get(id.key) + 1); await F.limitPause(e, log); restart = true; break; }
            if (e instanceof Stop) throw e;
            res = { ok: false, why: e.message };
          }
          if (res.skip) { skipped++; log(`   🔒 ${name}: ${res.skip}, deixei no clube.`, 'warn'); }
          else if (pricing && res.ok) { R.done++; setPrice(id.key, res.min); log(`   ✔ ${name}: ${res.none ? 'ninguém vendendo agora' : `menor preço ${fmt(res.min)}`}.`, 'good'); }
          else if (res.test) { R.done++; log(`   [teste] ${name}: ${sell ? 'venderia' : 'enviaria para a Lista de Transferências'}.`, 'good'); }
          else if (res.ok) {
            R.done++; forget(id.key);
            log(`   ✔ ${name} ${sell ? `listada por ${fmt(res.bn)}` : '→ Lista de Transferências'}.`, 'good');
            await waitFor(() => !loading() && (!row.isConnected || !vis(row)), 4000);
          } else {
            bad++; log(`   ✖ ${name}: ${res.why}.`, res.keep ? 'warn' : 'bad'); closeDialog();
            if (res.full) { full = true; break; }
          }
          R.line = `${R.done} de ${R.total}`; F.changed();
          await pause(pricing ? 1.5 : 0.6);
        }
        if (restart) { await F.goToClub(log); p = -1; continue; }
        if (full || !remaining()) break;
        if ((await nextPage()) !== 'next') break;
        await pause(0.8);
      }
      if (remaining() === startLeft) break;
    }
    if (remaining() && !full) log(`   ${remaining()} carta(s) não encontrada(s) no clube. Analise o clube de novo.`, 'warn');
    log(`■ Clube: ${R.done} de ${R.total} carta(s)${test ? ' simuladas' : ' concluídas'}${bad ? `, ${bad} com falha` : ''}${skipped ? `, ${skipped} ignorada(s)` : ''}.`, bad ? 'warn' : 'good');
  }

  // ---------- Lista de Transferências e vendas reais ----------
  async function syncTL() {
    const list = await F.pageCall('tl', {}, 15000);
    D.tl = { t: Date.now(), items: list };
    F.persist('tl');
    const seen = new Set(D.sales.map(s => s.k));
    let n = 0;
    for (const i of list) {
      const k = String(i.trade || i.id);
      if (i.state !== 'sold' || !i.bid || seen.has(k)) continue;
      D.sales.push({ k, t: Date.now(), name: i.name, rating: i.rating, def: i.def, buy: i.buy, sale: i.bid });
      n++;
      F.notify('Carta vendida', `${i.name} ${i.rating}: ${fmt(i.bid)} (lucro ${fmt(FSB.net(i.bid) - i.buy)})`);
    }
    if (n) { F.persist('sales'); log(`💰 ${n} venda(s) nova(s) registrada(s).`, 'good'); }
    F.changed();
    return list;
  }
  // antes de retirar os vendidos: guarda as vendas, senão o Web App apaga esses dados
  const prevHook = F.hooks.beforeClearSold;
  F.hooks.beforeClearSold = async () => {
    try { await syncTL(); } catch {}
    if (prevHook) await prevHook();
  };

  // ---------- lista de acompanhamento ----------
  let watchAt = 0;
  async function checkWatch() {
    const list = D.watch || [];
    log(`▶ Acompanhar: conferindo ${list.length} jogador(es).`, 'good');
    for (const w of list) {
      if (F.stopping()) throw new Stop('Parado por você.');
      checkDaily();
      const r = await marketMin(w.def, false);
      D.watchRes[w.def] = { p: r.min, t: Date.now() };
      addHist(w.def, r.min);
      F.persist('watchRes');
      if (r.min != null && w.target && r.min <= w.target) {
        log(`   🔔 ${w.name}: ${fmt(r.min)}, no seu alvo de ${fmt(w.target)}.`, 'good');
        F.notify('Preço no alvo', `${w.name}: ${fmt(r.min)} (alvo ${fmt(w.target)})`);
      }
      await F.idle(F.rnd(1500, 3000));
    }
    log('■ Acompanhar: conferido.', 'good');
  }
  // só roda com o Web App livre; acompanhar fica desligado por padrão e nunca passa de 1 vez a cada 10 min
  let salesAt = Date.now();
  F.onReady(() => setInterval(() => {
    if (!F.alive() || F.isBusy() || !/ultimate-team\/web-app/.test(location.pathname)) return;
    const now = Date.now();
    if (D.cfg.trackSales && now - salesAt > 5 * 6e4) { salesAt = now; syncTL().catch(() => {}); }
    if (D.cfg.watchOn && (D.watch || []).length && now - watchAt > Math.max(10, D.cfg.watchMin || 15) * 6e4) {
      watchAt = now;
      run('acompanhando preços', checkWatch);
    }
  }, 30000));

  // ---------- ir para uma tela ----------
  async function goTo(where) {
    if (where === 'home') await F.goHome();
    else if (where === 'club') await F.goToClub(log);
    else if (where === 'market') await F.goToMarket(log);
    else if (where === 'tl') await F.goToTransferList(log);
    else if (where === 'unassigned') {
      if (!F.hooks.goToUnassigned || !(await F.hooks.goToUnassigned())) { log('   não há nada nos não atribuídos.', 'warn'); return; }
    } else throw new Error('tela desconhecida');
    log('■ Pronto: tela aberta no Web App.', 'good');
  }

  const run = (what, fn) => {
    if (F.isBusy()) throw new Error('Outro módulo está trabalhando. Pare ele antes.');
    F.task('club', what, async () => {
      try { await fn(); }
      catch (e) {
        if (e instanceof Limited) e = new Stop(`O EA pediu calma: "${e.message}".`);
        const byUser = e instanceof Stop && /^Parado/.test(e.message);
        log((e instanceof Stop ? '■ ' : '⚠ Erro: ') + e.message, byUser ? 'warn' : 'bad');
        if (!byUser) F.beep(330, 600);
      } finally { R.line = ''; F.changed(); }
    }).catch(e => log('⚠ ' + e.message, 'bad'));
  };
  F.mod('club', {
    status: () => ({ running: F.run.owner === 'club', R }),
    async cmd(m) {
      if (m.op === 'start' || m.op === 'scan') run('analisando o clube', scan);
      else if (m.op === 'sell' || m.op === 'toTL' || m.op === 'price') {
        if (!Array.isArray(m.items) || !m.items.length) throw new Error('Selecione pelo menos uma carta.');
        const price = m.op === 'sell' && m.price ? FSB.ladderDown(+m.price) : 0;
        run({ sell: 'vendendo cartas do clube', toTL: 'enviando cartas para a Lista de Transferências', price: 'buscando o menor preço' }[m.op], () => m.op === 'price' ? fastPrices(m.items) : batch(m.op, m.items, price));
      } else if (m.op === 'goto') run('abrindo a tela pedida', () => goTo(m.where));
      else if (m.op === 'tl') { if (F.isBusy()) throw new Error('Outro módulo está trabalhando. Pare ele antes.'); await syncTL(); }
      else if (m.op === 'watch') { watchAt = Date.now(); run('acompanhando preços', checkWatch); }
      else throw new Error('comando desconhecido');
      await sleep(50); return F.status();
    },
  });
})();
