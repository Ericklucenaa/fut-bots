// Testa o players.js com o players.json real do EA e a busca com foto no painel.
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const REPO = require('path').join(__dirname, '..') + '/';
const db = JSON.parse(fs.readFileSync(process.argv[2] || __dirname + '/players-fixture.json', 'utf8'));
const html = fs.readFileSync(REPO + 'control.html', 'utf8').replace(/<script src=.*<\/script>/g, '');
const vc = new VirtualConsole(); const errs = []; vc.on('jsdomError', e => errs.push(e.message));
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://x.test/control.html', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, d = w.document;
const club = { t: Date.now(), pages: 1, partial: false, players: [
  { name: 'Alisson', rating: 87, pos: 'GOL', n: 1, key: 'a', img: '' },
  { name: 'Katoto', rating: 86, pos: 'ATA', n: 1, key: 'b', img: '' },
  { name: 'Nome Que Não Existe', rating: 70, pos: 'ZAG', n: 1, key: 'c', img: '' },
  { name: 'Especial', rating: 90, pos: 'MC', n: 1, key: 'd', img: 'https://www.ea.com/x/portraits/999.png' }] };
const GUID = 'ABC', Y = '2027';
w.fetch = async u => /players\.json/.test(u) ? { ok: u.includes(`content/${GUID}/${Y}/fut/items/web/`), status: 200, json: async () => db } : { ok: true, text: async () => `window.fut_guid = "${GUID}";\nwindow.fut_year = "${Y}";` };
const sent = [];
w.chrome = { runtime: { id: 'x', getURL: s => s, getManifest: () => ({ version: '2.5.0' }), onMessage: { addListener() {} } },
  tabs: { query: async () => [], sendMessage: async (i, m) => { sent.push(m); return { ok: true, data: [] }; } },
  storage: { local: { get: (k, cb) => setTimeout(() => cb({ club, cfg: { lang: 'pt' } }), 5), set() {} }, onChanged: { addListener() {} } } };
w.eval(['i18n.js', 'lib.js', 'players.js', 'control.js', 'control-mods.js'].map(f => fs.readFileSync(REPO + f, 'utf8')).join(';') + ';window.__t = { go, PDB };');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FALHOU:', m); } };
const tick = (ms = 60) => new Promise(r => setTimeout(r, ms));
(async () => {
  await tick(500);
  const P = w.__t.PDB;
  ok(P.ready(), 'banco carregou');
  const a = P.search('aliss');
  console.log('aliss:', a.slice(0, 4).map(e => `${e.name} #${e.id} ${e.r}`).join(' | '));
  ok(a[0] && a[0].id === 212831 && a[0].r === 87, 'Alisson em primeiro');
  ok(P.find('Alisson', 87).id === 212831, 'acha pelo nome e nota');
  ok(P.find('Alisson', 95).id === 212831, 'carta especial pega a nota mais próxima');
  ok(P.search('joao felix').length > 0 || P.search('félix').length > 0, 'busca ignora acentos');
  ok(P.portrait(212831).endsWith(`content/${GUID}/${Y}/fut/items/images/mobile/portraits/212831.png`), 'URL da foto');
  w.__t.go('club'); await tick();
  const imgs = [...d.querySelectorAll('#cRows .pic img')].map(i => i.getAttribute('src'));
  console.log('fotos:', imgs.length);
  ok(imgs.some(s => s.endsWith('/212831.png')), 'foto do Alisson na tabela');
  ok(imgs.some(s => s.endsWith('/999.png')), 'prefere a foto da carta');
  ok([...d.querySelectorAll('#cRows .pic')].some(p => !p.querySelector('img') && p.textContent === 'N'), 'sem foto mostra a inicial');
  const im = d.querySelector('#cRows .pic img'); im.dispatchEvent(new w.Event('error')); await tick();
  ok(!im.isConnected, 'imagem quebrada some');
  w.__t.go('sniper'); await tick();
  const n = d.getElementById('pName'); n.value = 'aliss'; n.dispatchEvent(new w.Event('input')); await tick(320);
  const s = d.getElementById('pSugg');
  ok(s.classList.contains('pics') && s.querySelectorAll('button').length > 2 && s.querySelector('img'), 'sugestões com foto ao digitar');
  ok(/#212831/.test(s.querySelector('button').textContent), 'mostra o ID: ' + s.querySelector('button').textContent);
  s.querySelector('button').click(); await tick();
  ok(d.getElementById('pName').value === 'Alisson' && !s.children.length, 'escolher preenche o filtro');
  console.log(`passou ${pass}, falhou ${fail}`, errs.slice(0, 4));
  process.exit(fail || errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
