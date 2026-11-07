// Banco de jogadores e fotos do painel. Vem do próprio Web App do EA (players.json e portraits/<id>.png):
// funciona sem o Web App aberto e sem depender de site de terceiros. Se não carregar, o painel segue sem fotos.
var PDB = (() => {
  const WEB = 'https://www.ea.com/ea-sports-fc/ultimate-team/web-app/';
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  let base = '', list = [], index = new Map(), pending = null;

  function build(data) {
    const seen = new Set(), out = [], idx = new Map();
    for (const p of [...(data.LegendsPlayers || []), ...(data.Players || [])]) {
      if (!p || !p.id || seen.has(p.id)) continue;
      seen.add(p.id);
      const full = [p.f, p.l].filter(Boolean).join(' ');
      const e = { id: p.id, name: p.c || full, full, r: p.r || 0, q: fold(`${p.c || ''} ${full}`) };
      out.push(e);
      // nomes que o Web App pode mostrar na carta: apelido, sobrenome, nome completo e "A. Sobrenome"
      const initial = p.f && p.l ? `${p.f[0]}. ${p.l}` : '';
      for (const k of new Set([p.c, p.l, full, initial].map(fold).filter(Boolean))) {
        if (!idx.has(k)) idx.set(k, []);
        idx.get(k).push(e);
      }
    }
    list = out; index = idx;
  }
  async function fetchAll() {
    const html = await (await fetch(WEB, { cache: 'no-cache' })).text();
    const guid = (html.match(/fut_guid\s*=\s*"([^"]+)"/) || [])[1], year = (html.match(/fut_year\s*=\s*"([^"]+)"/) || [])[1];
    if (!guid || !year) throw new Error('Web App sem fut_guid/fut_year');
    const root = `${WEB}content/${guid}/${year}/fut/items/`;
    const r = await fetch(root + 'web/players.json');
    if (!r.ok) throw new Error('players.json ' + r.status);
    build(await r.json());
    base = root + 'images/mobile/portraits/';
    return true;
  }
  const load = () => pending || (pending = fetchAll().catch(() => { pending = null; return false; }));
  const ready = () => list.length > 0;
  const portrait = id => base && id ? `${base}${id}.png` : '';
  // mais parecidos primeiro: começa com o texto, depois a maior nota
  function search(q, limit = 30) {
    const s = fold(q);
    if (s.length < 3) return [];
    const starts = e => e.q.startsWith(s) || e.q.includes(' ' + s);
    return list.filter(e => e.q.includes(s)).sort((a, b) => starts(b) - starts(a) || b.r - a.r).slice(0, limit);
  }
  // jogador de uma carta: mesma nota primeiro; cartas especiais têm nota diferente, então vale a mais próxima
  function find(name, rating) {
    const c = index.get(fold(name));
    if (!c) return null;
    return [...c].sort((a, b) => Math.abs(a.r - rating) - Math.abs(b.r - rating))[0];
  }
  return { load, ready, portrait, search, find };
})();
