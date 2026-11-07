// Abre o painel real no jsdom e exercita a página Meu clube.
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const REPO = require('path').join(__dirname, '..') + '/';
const html = fs.readFileSync(REPO + 'control.html', 'utf8').replace(/<script src=.*<\/script>/g, '');
const vc = new VirtualConsole(); const errs = [];
vc.on('jsdomError', e => { if (!/navigation/.test(e.message)) errs.push(e.message); });
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://x.test/control.html', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, d = w.document;
const saved = {}, sent = [];
const club = { t: Date.now(), pages: 1, partial: false, players: [
  { name: 'Marta', rating: 84, pos: 'MEI', untradeable: false, n: 1, key: 'marta|84|mei', def: 500, img: 'https://www.ea.com/x/flags/54.png' },
  { name: 'Pelé', rating: 90, pos: 'ATA', untradeable: true, n: 1, key: 'pelé|90|ata' },
  { name: 'Ana', rating: 70, pos: 'ZAG', untradeable: false, n: 2, key: 'ana|70|zag' },
  { name: 'Bia', rating: 60, pos: 'ZAG', untradeable: false, n: 1, key: 'bia|60|zag' },
  { name: 'Zico', rating: 80, pos: 'MEI', untradeable: false, n: 1, key: 'zico|80|mei', inSquad: true, def: 501, price: 3000 }] };
w.fetch = async u => /players\.json/.test(u) ? { ok: true, json: async () => ({ Players: [{ id: 500, f: 'Marta', l: 'Vieira', c: 'Marta', r: 84 }, { id: 212831, f: 'Alisson', l: 'Becker', c: 'Alisson', r: 87 }] }) } : { ok: true, text: async () => 'fut_guid = "G"; fut_year = "2027";' };
w.confirm = () => true;
w.chrome = {
  runtime: { id: 'x', getURL: s => s, getManifest: () => ({ version: '2.5.0' }), onMessage: { addListener() {} } },
  tabs: { query: async () => [{ id: 1, url: 'https://www.ea.com/ultimate-team/web-app/' }], sendMessage: async (id, m) => { if (m.cmd !== 'status') sent.push(m); return { ok: true, data: { owner: null, coins: 1000, club: { R: {} } } }; } },
  storage: { local: { get: (k, cb) => setTimeout(() => cb({ club, cfg: { lang: 'pt' } }), 5), set: o => Object.assign(saved, o) }, onChanged: { addListener() {} } },
};
w.eval(['i18n.js', 'lib.js', 'players.js', 'control.js', 'control-mods.js'].map(f => fs.readFileSync(REPO + f, 'utf8')).join(';') + ';window.__t = { go, setLang, clubTable, st };');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FALHOU:', m); } };
const $ = id => d.getElementById(id), rows = () => [...$('cRows').querySelectorAll('tr')];
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
(async () => {
  await tick(200);
  w.__t.go('club'); await tick();
  ok($('p-club').classList.contains('on') && $('cScan'), 'página abre');
  ok(rows().length === 4, 'mostra só negociáveis por padrão: ' + rows().length);
  ok(rows()[0].textContent.includes('Marta'), 'ordena por nota');
  ok($('cSell').disabled, 'sem seleção não vende');
  $('cAll').click(); await tick();
  ok($('cSelN').textContent === '4', 'seleciona filtradas sem o time ativo: ' + $('cSelN').textContent);
  $('cTrade').value = ''; $('cTrade').dispatchEvent(new w.Event('input')); await tick();
  ok(rows().length === 5, 'filtro Todas');
  $('cQ').value = 'mar'; $('cQ').dispatchEvent(new w.Event('input')); await tick();
  ok(rows().length === 1, 'busca por nome');
  $('cQ').value = ''; $('cQ').dispatchEvent(new w.Event('input'));
  $('cSell').click(); await tick(100);
  let m = sent.pop();
  ok(m && m.mod === 'club' && m.op === 'sell' && m.items.length === 3 && !m.price, 'manda venda no mais barato: ' + JSON.stringify(m));
  ok(m.items.find(i => i.key === 'ana|70|zag').n === 2, 'quantidade da repetida');
  $('cHow').querySelector('[data-v=fixed]').click(); await tick();
  ok(!$('cFixed').hidden && $('cMinF').hidden, 'mostra preço fixo');
  $('cSell').click(); await tick(100);
  ok(!sent.length, 'preço vazio não vende');
  $('cPrice').value = '1234'; $('cPrice').dispatchEvent(new w.Event('change')); await tick();
  ok(String($('cPrice').value) === '1200', 'preço vai para a escada');
  $('cMode').querySelector('[data-v=real]').click(); await tick();
  ok(saved.clubCfg && saved.clubCfg.dryRun === false, 'muda para de verdade');
  $('cTL').click(); await tick(100);
  m = sent.pop();
  ok(m && m.op === 'toTL', 'manda enviar à lista');
  d.querySelector('[data-nav=tl]').click(); await tick(100);
  m = sent.pop();
  ok(m && m.op === 'goto' && m.where === 'tl', 'Ir para');
  $('cPriceBtn').click(); await tick(100);
  m = sent.pop();
  ok(m && m.op === 'price' && m.items.every(i => i.n === 1), 'manda buscar preço: ' + JSON.stringify(m));
  ok(d.querySelector('#cRows tr td:nth-child(6)').textContent.trim() === '–', 'coluna de preço vazia');
  w.__t.go('tools'); await tick();
  ok(!/Proteção/.test(d.getElementById('p-tools').textContent) && !d.getElementById('blockList'), 'Proteção removida');
  w.__t.go('docs'); await tick();
  ok(/Buscar menor preço/.test(d.getElementById('p-docs').textContent) && !/proteç|protegid/i.test(d.getElementById('p-docs').textContent), 'Como usar atualizado');
  w.__t.go('club'); await tick();
  club.players[0].buy = 300; club.players[0].price = 1000;
  w.__t.clubTable();
  const r0 = rows().find(r => r.textContent.includes('Marta')).textContent;
  ok(/300/.test(r0) && /1\.000/.test(r0) && /650/.test(r0), 'mostra compra, venda e lucro: ' + r0);
  ok(rows().find(r => r.textContent.includes('Marta')).querySelector('td.good'), 'lucro em verde');
  const flagged = d.querySelector('#cRows tr .pic img');
  ok(!/flags/.test([...d.querySelectorAll('#cRows .pic img')].map(i => i.getAttribute('src')).join()), 'ignora bandeira já salva');
  ok(rows().find(r => r.textContent.includes('Marta')).querySelector('.fc.q-gold'), 'carta dourada');
  ok(rows().find(r => r.textContent.includes('Zico')).textContent.includes('No time'), 'marca o time ativo');
  d.querySelector('[data-rule=idle]').click(); await tick();
  ok(!rows().some(r => r.textContent.includes('Zico')) && String($('cSquad').value) === 'out', 'regra de paradas');
  d.querySelector('[data-rule=clear]').click(); await tick();
  $('cTrade').value = ''; $('cTrade').dispatchEvent(new w.Event('input')); await tick();
  let csv = ''; w.Blob = function (p) { csv = p.join(''); }; w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
  $('cCsv').click(); await tick();
  ok(/Marta/.test(csv) && /Lucro/.test(csv), 'exporta CSV');
  rows().find(r => r.textContent.includes('Zico')).querySelector('[data-row=snipe]').click(); await tick();
  ok(w.__t.st.draft.player === 'Zico' && w.__t.st.cfg.maxBuy === 2900 && $('p-sniper').classList.contains('on'), 'abre o Sniper pronto: ' + w.__t.st.cfg.maxBuy);
  w.__t.go('club'); await tick();
  rows().find(r => r.textContent.includes('Zico')).querySelector('[data-row=watch]').click(); await tick();
  ok($('p-watch').classList.contains('on') && $('wRows').textContent.includes('Zico'), 'acompanhar pelo clube');
  w.__t.st.priceHist[501] = [{ t: 1, v: 100 }, { t: 2, v: 120 }];
  w.__t.go('watch'); await tick();
  ok($('wChart').querySelector('svg'), 'gráfico do histórico');
  w.__t.st.tl = { t: Date.now(), items: [{ id: 1, def: 500, name: 'Marta', rating: 84, buy: 1000, state: 'sold', bin: 2000, bid: 2000, left: 0 }, { id: 2, def: 501, name: 'Zico', rating: 80, buy: 0, state: 'active', bin: 500, bid: 0, left: 300 }] };
  w.__t.st.sales = [{ k: '1', t: Date.now(), name: 'Marta', rating: 84, buy: 1000, sale: 2000, def: 500 }];
  w.__t.go('tl'); await tick();
  ok(/Vendida/.test($('tRows').textContent) && /900/.test($('tSales').textContent), 'página Transferências');
  ok(/900/.test($('tTiles').textContent), 'lucro real nos totais');
  w.__t.go('dash'); await tick();
  ok(/Vendas · lucro real/.test($('p-dash').textContent) && /900/.test($('p-dash').textContent), 'Dashboard com lucro real');
  w.__t.go('settings'); await tick();
  ok($('setNotify') && $('setTrack'), 'opções nas Configurações');
  w.__t.go('club'); await tick();
  w.__t.setLang('en'); await tick(80);
  ok(d.querySelector('#p-club h2').textContent === 'My club', 'tradução: ' + d.querySelector('#p-club h2').textContent);
  console.log(`passou ${pass}, falhou ${fail}`, errs.slice(0, 5));
  process.exit(fail || errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
