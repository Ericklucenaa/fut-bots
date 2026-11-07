// Simulação do Web App para testar o módulo Clube (lista paginada, painel do item, venda e envio).
const fs = require('fs');
const { JSDOM } = require('jsdom');
const REPO = require('path').join(__dirname, '..') + '/';

function boot({ club, selectDelay = 0, filtersFirst = false, api = null }) {
  const dom = new JSDOM('<!doctype html><body><div id="tabs"></div><div id="view"></div></body>', { runScripts: 'outside-only', url: 'https://www.ea.com/ea-sports-fc/ultimate-team/web-app/', pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  w.Element.prototype.getClientRects = function () { return this.isConnected ? [{}] : []; };
  w.getComputedStyle = () => ({ visibility: 'visible', display: 'block', opacity: '1' });
  w.PointerEvent = w.MouseEvent;
  Object.defineProperty(w.HTMLElement.prototype, 'innerText', { get() { const t = []; const walk = n => { for (const c of n.childNodes) { if (c.nodeType === 3) { if (c.textContent.trim()) t.push(c.textContent.trim()); } else walk(c); } }; walk(this); return t.join('\n'); } });
  w.Element.prototype.scrollIntoView = () => {};
  const data = {};
  const sim = { club: club.map(c => ({ ...c })), page: 0, sold: [], tl: [], size: 5, screen: 'other', clicks: [], notes: [], list: [] };
  w.chrome = { runtime: { id: 'x', onMessage: { addListener() {} }, getURL: s => s, sendMessage: async m => { sim.notes.push(m); } }, storage: { local: { get: (k, cb) => cb({ cfg: {}, clubCfg: { delay: 1, dryRun: true } }), set: o => Object.assign(data, o) }, onChanged: { addListener() {} } } };
    const mk = (tag, cls, txt, on) => { const e = d.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (on) e.addEventListener('click', on); return e; };
  const view = d.getElementById('view');
  const tabs = d.getElementById('tabs');
  tabs.append(mk('button', 'ut-tab-bar-item icon-home', 'Início', () => { sim.screen = 'home'; view.innerHTML = ''; }));
  tabs.append(mk('button', 'ut-tab-bar-item icon-club', 'Clube', hub));
  function hub() { sim.screen = 'hub'; view.innerHTML = ''; view.append(mk('div', 'tile players-tile', null, filtersFirst ? filters : () => { sim.page = 0; list(); })); view.firstChild.append(mk('h1', '', 'Jogadores')); }
  function filters() { sim.screen = 'filters'; view.innerHTML = ''; view.append(mk('button', '', 'Redefinir', () => {})); view.append(mk('button', '', 'Pesquisar', () => { sim.page = 0; list(); })); }
  let selected = null;
  function list() {
    sim.screen = 'list'; view.innerHTML = ''; selected = null;
    const pg = sim.club.slice(sim.page * sim.size, (sim.page + 1) * sim.size);
    const ul = mk('div', 'paginated-item-list');
    for (const c of pg) {
      const r = mk('div', 'listFUTItem', null, () => pick(c, r));
      const flag = mk('img'); flag.src = 'https://www.ea.com/x/flags/54.png'; r.append(flag);
      if (c.portrait) { const f = mk('img'); f.src = 'https://www.ea.com/x/portraits/' + c.portrait + '.png'; r.append(f); }
      r.append(mk('span', 'rating', String(c.rating)), mk('span', 'position', c.pos), mk('span', 'name', c.name));
      if (c.untradeable) r.append(mk('span', 'untradeable'));
      ul.append(r);
    }
    view.append(ul);
    if ((sim.page + 1) * sim.size < sim.club.length) view.append(mk('button', 'pagination next', 'Próximo', () => { sim.page++; list(); }));
    view.append(mk('div', 'detail'));
  }
  function pick(c, r) {
    const paint = () => {
      for (const x of d.querySelectorAll('.listFUTItem.selected')) x.classList.remove('selected');
      r.classList.add('selected'); selected = c;
      const det = d.querySelector('.detail'); det.innerHTML = '';
      if (c.noButtons) return;
      det.append(mk('button', '', 'Listar no Mercado de Transferências', () => listing(c)));
      det.append(mk('button', '', 'Enviar para a Lista de Transferências', () => { if (sim.tlFull) { popup('A Lista de Transferências está cheia'); return; } sim.tl.push(c.name); remove(c); }));
      det.append(mk('button', '', 'Venda Rápida', () => { sim.clicks.push('QUICKSELL ' + c.name); }));
      det.append(mk('button', '', 'Comparar preço', () => compare(c)));
    };
    if (selectDelay) setTimeout(paint, selectDelay); else paint();
  }
  function compare(c) {
    sim.compares = (sim.compares || 0) + 1; view.innerHTML = '';
    if (c.market) for (const p of c.market) { const r = mk('div', 'listFUTItem'); r.append(mk('span', '', 'Comprar já: ' + p.toLocaleString('pt-BR'))); view.append(r); }
    else view.append(mk('div', 'ut-no-results-view', 'Nenhum resultado'));
    view.append(mk('button', 'ut-navigation-button-control', '<', () => { if (sim.resetOnBack) sim.page = 0; list(); }));
  }
  function popup(t) { const p = mk('div', 'ut-dialog', null); p.append(mk('p', '', t), mk('button', '', 'Ok', () => p.remove())); d.body.append(p); }
  function listing(c) {
    const det = d.querySelector('.detail');
    const a = mk('input'), b = mk('input'); a.value = '150'; b.value = '10000'; det.append(a, b);
    det.append(mk('button', '', 'Mais barato', () => { a.value = '500'; b.value = '550'; }));
    det.append(mk('button', '', 'Listar para transferência', () => { sim.sold.push({ name: selected.name, bn: +b.value, start: +a.value }); remove(selected); }));
  }
  function remove(c) { sim.club.splice(sim.club.indexOf(c), 1); if (sim.page * sim.size >= sim.club.length && sim.page) sim.page--; list(); }
  // postMessage com source (o jsdom não preenche)
  w.postMessage = m => setTimeout(() => w.dispatchEvent(new w.MessageEvent('message', { data: JSON.parse(JSON.stringify(m)), source: w })), 0);
  if (api) {
    const obs = fn => ({ observe(ctx, cb) { setTimeout(() => cb({ unobserve() {} }, fn()), api.lag || 5); } });
    w.UTSearchCriteriaDTO = function () {}; w.SearchType = { PLAYER: 'player' };
    w.services = {
      Club: { search: c => obs(() => { const all = sim.club.map((x, i) => ({ id: i + 1, definitionId: 1000 + i, rating: x.rating, lastSalePrice: x.buy || 0, getStaticData: () => ({ name: x.apiName || x.name }) })); return { success: true, response: { items: all.slice(c.offset, c.offset + c.count), retrievedAll: c.offset + c.count >= all.length } }; }) },
      Squad: { getActiveSquadId: () => 1, requestSquadById: () => obs(() => ({ success: true, data: { squad: { getPlayers: () => [{ item: { id: 1 } }, { item: { id: 3 } }, {}] } } })) },
      Item: { requestTransferItems: () => obs(() => { sim.tlReads = (sim.tlReads || 0) + 1; return { success: true, response: { items: sim.list.map(x => ({ id: x.id, definitionId: x.id, rating: 80, lastSalePrice: x.buy || 0, getStaticData: () => ({ name: x.name }), getAuctionData: () => ({ tradeId: x.trade, buyNowPrice: x.bin || 0, currentBid: x.bid || 0, isSold: () => x.state === 'sold', isExpired: () => x.state === 'expired', isActiveTrade: () => x.state === 'active', isInactive: () => x.state === 'inactive', getSecondsRemaining: () => 600 }) })) } }; }), clearTransferMarketCache() { sim.cacheClears = (sim.cacheClears || 0) + 1; }, searchTransferMarket: c => obs(() => { sim.apiCalls = (sim.apiCalls || 0) + 1; if (api.failAt === sim.apiCalls) return { success: false, status: api.failStatus }; const x = sim.club[c.defId[0] - 1000]; sim.maxes = (sim.maxes || []).concat(c.maxBuy || 0); return { success: true, data: { items: (x.market || []).filter(p => !c.maxBuy || p <= c.maxBuy).slice(0, x.pageSize || 99).map(p => ({ getAuctionData: () => ({ buyNowPrice: p }) })) } }; }) },
    };
    w.eval(fs.readFileSync(REPO + 'page.js', 'utf8'));
  }
  for (const f of ['i18n.js', 'lib.js', 'core.js', 'relist.js', 'tools.js', 'club.js']) w.eval(fs.readFileSync(REPO + f, 'utf8'));
  const F = w.eval('FUT');
  return { w, d, F, sim, data };
}
const until = async (F, ms = 60000) => { const t = Date.now(); await new Promise(r => setTimeout(r, 80)); while (F.run.owner && Date.now() - t < ms) await new Promise(r => setTimeout(r, 30)); };
const mkClub = n => Array.from({ length: n }, (_, i) => ({ name: 'Jogador' + String.fromCharCode(65 + i), rating: 60 + i, pos: i % 2 ? 'ATA' : 'ZAG' }));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FALHOU:', m); } };
const logs = F => F.D.logs.map(l => l.m).join('\n');

(async () => {
  for (const filtersFirst of [false, true]) {
    const club = mkClub(12); club[1].untradeable = true;
    const { F, sim, data } = boot({ club, filtersFirst });
    await new Promise(r => setTimeout(r, 30));
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    const c = F.D.club;
    ok(c && c.players.length === 12 && !c.partial && c.pages === 3, 'scan 12 jogadores/3 páginas ' + JSON.stringify(c && { n: c.players.length, p: c.pages, partial: c.partial }) + logs(F));
    ok(c.players.find(p => p.name === 'JogadorB').untradeable === true, 'detecta inegociável');
    ok(c.players.filter(p => p.untradeable).length === 1, 'só 1 inegociável');
    ok(c.players[0].pos === 'ZAG' && c.players[0].rating === 60, 'lê posição e nota');
  }
  { // teste: não muda nada
    const { F, sim } = boot({ club: mkClub(12) });
    await new Promise(r => setTimeout(r, 30));
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    const keys = F.D.club.players.filter(p => ['JogadorA', 'JogadorG', 'JogadorL'].includes(p.name)).map(p => ({ key: p.key, n: 1 }));
    await F.command({ mod: 'club', op: 'sell', items: keys, price: 1000 }); await until(F);
    ok(sim.sold.length === 0 && sim.club.length === 12, 'modo teste não vende');
    ok(/\[teste\] JogadorL/.test(logs(F)), 'teste alcança a última página\n' + logs(F));
  }
  { // venda real preço fixo em páginas diferentes
    const { F, sim } = boot({ club: mkClub(12) });
    await new Promise(r => setTimeout(r, 30));
    F.D.clubCfg.dryRun = false;
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    const names = ['JogadorA', 'JogadorB', 'JogadorF', 'JogadorG', 'JogadorL'];
    const keys = F.D.club.players.filter(p => names.includes(p.name)).map(p => ({ key: p.key, n: 1 }));
    await F.command({ mod: 'club', op: 'sell', items: keys, price: 1234 }); await until(F);
    ok(sim.sold.length === 5 && sim.sold.every(s => names.includes(s.name)), 'vende só as 5 escolhidas: ' + JSON.stringify(sim.sold) + '\n' + logs(F));
    ok(sim.sold.every(s => s.bn === 1200 && s.start === 1100), 'preço na escada (1200/1100): ' + JSON.stringify(sim.sold[0]));
    ok(sim.club.length === 7 && F.D.club.players.length === 7, 'clube atualizado');
    ok(!sim.clicks.length, 'nunca clica em Venda Rápida');
  }
  { // mais barato (Paletools) + mínimo
    const { F, sim, w } = boot({ club: mkClub(6) });
    await new Promise(r => setTimeout(r, 30));
    F.D.clubCfg.dryRun = false; F.D.cfg.priceSrc = 'paletools';
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    const keys = F.D.club.players.slice(0, 2).map(p => ({ key: p.key, n: 1 }));
    await F.command({ mod: 'club', op: 'sell', items: keys, price: 0 }); await until(F);
    ok(sim.sold.length === 2 && sim.sold.every(s => s.bn === 550), 'vende pelo Mais barato: ' + JSON.stringify(sim.sold) + '\n' + logs(F));
    F.D.clubCfg.minPrice = 1000;
    const k2 = F.D.club.players.slice(0, 1).map(p => ({ key: p.key, n: 1 }));
    await F.command({ mod: 'club', op: 'sell', items: k2, price: 0 }); await until(F);
    ok(sim.sold.length === 2, 'respeita o mínimo: ' + JSON.stringify(sim.sold));
  }
  { // enviar para a lista + proteção + inegociável + sem botão + lista cheia
    const club = mkClub(12); club[2].untradeable = true; club[3].noButtons = true;
    const { F, sim } = boot({ club });
    await new Promise(r => setTimeout(r, 30));
    F.D.clubCfg.dryRun = false;
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    const names = ['JogadorA', 'JogadorC', 'JogadorD', 'JogadorK'];
    const keys = F.D.club.players.filter(p => names.includes(p.name)).map(p => ({ key: p.key, n: 1 }));
    await F.command({ mod: 'club', op: 'toTL', items: keys }); await until(F);
    ok(sim.tl.join() === 'JogadorA,JogadorK', 'envia só as permitidas: ' + sim.tl + '\n' + logs(F));
    sim.tlFull = true;
    const k2 = F.D.club.players.filter(p => ['JogadorB', 'JogadorF', 'JogadorG'].includes(p.name)).map(p => ({ key: p.key, n: 1 }));
    await F.command({ mod: 'club', op: 'toTL', items: k2 }); await until(F);
    ok(sim.tl.length === 2 && /cheia/.test(logs(F)), 'para na lista cheia\n' + logs(F));
    ok(F.D.logs.filter(l => /Lista de Transferências está cheia/.test(l.m)).length === 1, 'tenta só uma vez com a lista cheia');
  }
  { // seleção atrasada: nunca vende a carta anterior
    const { F, sim } = boot({ club: mkClub(6), selectDelay: 300 });
    await new Promise(r => setTimeout(r, 30));
    F.D.clubCfg.dryRun = false;
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    const keys = F.D.club.players.filter(p => ['JogadorB', 'JogadorD'].includes(p.name)).map(p => ({ key: p.key, n: 1 }));
    await F.command({ mod: 'club', op: 'sell', items: keys, price: 500 }); await until(F);
    ok(sim.sold.map(s => s.name).sort().join() === 'JogadorB,JogadorD', 'seleção atrasada vende as certas: ' + JSON.stringify(sim.sold));
  }
  { // parar no meio
    const { F, sim } = boot({ club: mkClub(12) });
    await new Promise(r => setTimeout(r, 30));
    F.D.clubCfg.dryRun = false; F.D.clubCfg.delay = 200;
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    const keys = F.D.club.players.map(p => ({ key: p.key, n: 1 }));
    await F.command({ mod: 'club', op: 'toTL', items: keys });
    await new Promise(r => setTimeout(r, 3500)); F.stop(); await until(F);
    ok(sim.tl.length < 12, 'parar interrompe (' + sim.tl.length + ')');
    ok(/Parado por você/.test(logs(F)), 'log de parada');
  }
  for (const resetOnBack of [false, true]) { // menor preço, em cartas de várias páginas
    const club = mkClub(12); club[0].market = [1500, 900, 1100]; club[6].market = [4000]; club[7].noButtons = true; club[11].market = [10000, 200000];
    const { F, sim } = boot({ club });
    sim.resetOnBack = resetOnBack;
    await new Promise(r => setTimeout(r, 30));
    F.D.clubCfg.delay = 1;
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    const names = ['JogadorA', 'JogadorG', 'JogadorH', 'JogadorJ', 'JogadorL'];
    const keys = F.D.club.players.filter(p => names.includes(p.name)).map(p => ({ key: p.key, n: 1 }));
    const req0 = F.D.reqs.length;
    await F.command({ mod: 'club', op: 'price', items: keys }); await until(F);
    const by = n => F.D.club.players.find(p => p.name === n);
    ok(by('JogadorA').price === 900, 'menor de 3 ofertas: ' + by('JogadorA').price + '\n' + logs(F));
    ok(by('JogadorG').price === 4000 && by('JogadorL').price === 10000, 'preços em outras páginas');
    ok(by('JogadorJ').none === true && by('JogadorJ').price == null, 'sem oferta');
    ok(by('JogadorH').price == null && /JogadorH/.test(logs(F)), 'sem botão registra falha');
    ok(sim.sold.length === 0 && sim.tl.length === 0 && sim.club.length === 12, 'buscar preço não vende nada');
    ok(F.D.reqs.length - req0 === 4, 'conta as buscas: ' + (F.D.reqs.length - req0));
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    ok(F.D.club.players.find(p => p.name === 'JogadorA').price === 900, 'nova análise mantém o preço');
  }
  { // limite diário
    const club = mkClub(6); club.forEach(c => { c.market = [500]; });
    const { F, sim } = boot({ club });
    await new Promise(r => setTimeout(r, 30));
    F.D.cfg.dailyMax = 2; F.D.reqs.push(Date.now());
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    const keys = F.D.club.players.map(p => ({ key: p.key, n: 1 }));
    await F.command({ mod: 'club', op: 'price', items: keys }); await until(F);
    ok(sim.compares === 1 && /limite de 2 buscas/.test(logs(F)), 'para no limite de 24 h: ' + sim.compares + '\n' + logs(F));
  }
  { // caminho rápido: compra, venda, lucro e nenhuma tela aberta
    const club = mkClub(12); club[0].market = [1500, 900]; club[0].buy = 300; club[3].apiName = 'A. JogadorD'; club[3].market = [700]; club[5].market = [];
    const { F, sim } = boot({ club, api: {} });
    await new Promise(r => setTimeout(r, 30));
    F.D.cfg.speed = 'custom'; F.D.cfg.waitMin = 10; F.D.cfg.waitMax = 20;
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    const by = n => F.D.club.players.find(p => p.name === n);
    ok(by('JogadorA').buy === 300 && by('JogadorA').def === 1000, 'lê compra e definição: ' + JSON.stringify(by('JogadorA')) + logs(F));
    ok(by('JogadorD').def === 1003, 'casa nome abreviado');
    ok(F.D.club.players.every(p => p.def), 'todas identificadas');
    const keys = ['JogadorA', 'JogadorD', 'JogadorF'].map(n => ({ key: by(n).key, n: 1 }));
    const scr = sim.screen, r0 = F.D.reqs.length; sim.compares = 0;
    const t0 = Date.now();
    await F.command({ mod: 'club', op: 'price', items: keys }); await until(F);
    console.log('  3 cartas em', Date.now() - t0, 'ms');
    ok(by('JogadorA').price === 900 && by('JogadorD').price === 700 && by('JogadorF').none === true, 'preços pela ponte\n' + logs(F));
    ok(!sim.compares && sim.screen === scr && !/abrindo/.test(F.D.logs.slice(-5).map(l => l.m).join()), 'não abre telas');
    ok(sim.cacheClears === 3 && F.D.reqs.length - r0 === 3, 'limpa cache e conta buscas');
    await F.command({ mod: 'club', op: 'price', items: keys }); await until(F);
    ok(sim.apiCalls === 3 && /3 já buscada/.test(logs(F)), 'pula buscas recentes');
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    ok(by('JogadorA').price === 900 && by('JogadorA').buy === 300, 'nova análise mantém');
  }
  { // limite do EA: pausa e tenta de novo; captcha para
    const club = mkClub(4); club.forEach(c => { c.market = [500]; });
    const { F, sim } = boot({ club, api: { failAt: 2, failStatus: 458 } });
    await new Promise(r => setTimeout(r, 30));
    F.D.cfg.speed = 'custom'; F.D.cfg.waitMin = 10; F.D.cfg.waitMax = 20;
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    await F.command({ mod: 'club', op: 'price', items: F.D.club.players.map(p => ({ key: p.key, n: 1 })) }); await until(F);
    ok(sim.apiCalls === 2 && /captcha/.test(logs(F)), 'captcha para na hora\n' + logs(F));
  }
  { // sem a ponte: cai para as telas
    const club = mkClub(4); club.forEach(c => { c.market = [500]; });
    const { F, sim } = boot({ club });
    await new Promise(r => setTimeout(r, 30));
    await F.command({ mod: 'club', op: 'scan' }); await until(F, 90000);
    ok(/não li os preços de compra/.test(logs(F)), 'avisa sem a ponte\n' + logs(F));
  }
  { // a bandeira nunca vira foto; o retrato sim
    const club = mkClub(3); club[1].portrait = 777;
    const { F } = boot({ club });
    await new Promise(r => setTimeout(r, 30));
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    ok(F.D.club.players[0].img === '', 'não usa a bandeira: ' + F.D.club.players[0].img);
    ok(/portraits\/777/.test(F.D.club.players[1].img), 'usa o retrato');
  }
  { // time ativo
    const { F } = boot({ club: mkClub(4), api: {} });
    await new Promise(r => setTimeout(r, 30));
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    ok(F.D.club.players.filter(p => p.inSquad).map(p => p.name).join() === 'JogadorA,JogadorC', 'marca o time ativo');
  }
  { // busca precisa: desce até achar a oferta escondida
    const club = mkClub(2); club[0].market = [5000, 4000, 3000, 2000]; club[0].pageSize = 1;
    const { F, sim } = boot({ club, api: {} });
    await new Promise(r => setTimeout(r, 30));
    F.D.cfg.speed = 'custom'; F.D.cfg.waitMin = 5; F.D.cfg.waitMax = 6; F.D.clubCfg.deep = true;
    await F.command({ mod: 'club', op: 'scan' }); await until(F);
    const p = F.D.club.players[0], r0 = F.D.reqs.length;
    await F.command({ mod: 'club', op: 'price', items: [{ key: p.key, n: 1 }] }); await until(F, 15000);
    ok(F.D.club.players[0].price === 2000, 'acha a mais barata: ' + F.D.club.players[0].price + ' ' + sim.maxes);
    ok(F.D.reqs.length - r0 === 4, 'conta todas as buscas: ' + (F.D.reqs.length - r0));
    ok(F.D.priceHist[p.def].length === 1 && F.D.priceHist[p.def][0].v === 2000, 'guarda no histórico');
  }
  { // vendas reais: registra uma vez e notifica
    const { F, sim } = boot({ club: mkClub(2), api: {} });
    await new Promise(r => setTimeout(r, 30));
    sim.list = [{ id: 1, trade: 11, name: 'Vendida', buy: 1000, bid: 2000, bin: 2000, state: 'sold' }, { id: 2, trade: 12, name: 'Ativa', bin: 500, state: 'active' }, { id: 3, trade: 13, name: 'Vencida', state: 'expired' }];
    await F.command({ mod: 'club', op: 'tl' });
    await F.command({ mod: 'club', op: 'tl' });
    ok(F.D.sales.length === 1 && F.D.sales[0].sale === 2000 && F.D.sales[0].buy === 1000, 'registra a venda uma vez: ' + JSON.stringify(F.D.sales));
    ok(F.D.tl.items.map(i => i.state).join() === 'sold,active,expired', 'situações da lista');
    ok(sim.notes.length === 1 && /Vendida/.test(sim.notes[0].body) && /900/.test(sim.notes[0].body), 'notifica com o lucro: ' + JSON.stringify(sim.notes));
    F.D.cfg.notify = false; sim.list[0].trade = 99;
    await F.command({ mod: 'club', op: 'tl' });
    ok(sim.notes.length === 1, 'respeita notificações desligadas');
  }
  { // relist não abre telas se não há nada a fazer
    const { F, sim } = boot({ club: mkClub(2), api: {} });
    await new Promise(r => setTimeout(r, 30));
    sim.list = [{ id: 2, trade: 12, name: 'Ativa', bin: 500, state: 'active' }];
    await F.command({ mod: 'rel', op: 'start' }); await until(F, 15000);
    ok(/Nada para relistar/.test(logs(F)) && sim.screen === 'other', 'relist pula sem abrir telas\n' + logs(F));
  }
  { // acompanhar: avisa no alvo
    const club = mkClub(3); club[0].market = [900]; club[1].market = [5000];
    const { F, sim } = boot({ club, api: {} });
    await new Promise(r => setTimeout(r, 30));
    F.D.watch = [{ def: 1000, name: 'Barato', rating: 80, target: 1000 }, { def: 1001, name: 'Caro', rating: 80, target: 1000 }];
    await F.command({ mod: 'club', op: 'watch' }); await until(F, 20000);
    ok(F.D.watchRes[1000].p === 900 && F.D.watchRes[1001].p === 5000, 'guarda os preços');
    ok(sim.notes.length === 1 && /Barato/.test(sim.notes[0].body), 'só avisa quem chegou no alvo: ' + JSON.stringify(sim.notes));
  }
  { // navegação
    const { F, sim } = boot({ club: mkClub(6) });
    await new Promise(r => setTimeout(r, 30));
    await F.command({ mod: 'club', op: 'goto', where: 'club' }); await until(F);
    ok(sim.screen === 'list', 'Ir para clube');
    await F.command({ mod: 'club', op: 'goto', where: 'home' }); await until(F);
    ok(sim.screen === 'home', 'Ir para início');
  }
  console.log(`passou ${pass}, falhou ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
