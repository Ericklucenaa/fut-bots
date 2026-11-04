// Constantes e contas compartilhadas entre os motores no Web App e o painel de controle.
var FSB = (() => {
  const VERSION = '2.3.0';
  const DONATE_URL = 'https://ko-fi.com/ericklucena';
  const REPO_URL = 'https://github.com/Ericklucenaa/fut-bots';
  // módulos da extensão
  const MODS = { snipe: { name: 'Snipe', hint: 'busca e compra no Comprar já' }, gal: { name: 'Galeria', hint: 'completa as galerias do Paletools' }, rel: { name: 'Relist', hint: 'relista a Lista de Transferências' } };
  // Galeria: compra as cartas que faltam e lista no mais barato
  const GAL_DEF = { maxPrice: 4000, maxTotal: 0, qty: 5, autoQty: true, autoNext: true, maxSets: 0, respectSlots: true, list: true, minList: 0, cleanFull: true, cleanBetween: false, cleanEvery: 10, retries: 4, dryRun: true, delay: 900 };
  // Relist: relista expirados e não listados pelo mais barato
  const REL_DEF = { minPrice: 0, maxItems: 0, delay: 900, expired: true, unassigned: true, clearSold: true };
  // escada de preços do FUT
  const step = p => p < 1000 ? 50 : p < 10000 ? 100 : p < 50000 ? 250 : p < 100000 ? 500 : 1000;
  const ladderDown = p => Math.max(150, Math.floor(p / step(p)) * step(p));
  const ladderUp = p => p < 150 ? 150 : ladderDown(p) + step(ladderDown(p));
  const ladderPrev = p => p <= 150 ? 0 : ladderDown(p - 1);
  const net = v => Math.floor(v * 0.95);   // o EA fica com 5% da venda
  let LOC = 'pt-BR';
  const setLoc = l => { LOC = l || 'pt-BR'; };
  const loc = () => LOC;
  const fmt = n => n == null || !isFinite(n) ? '?' : Math.round(n).toLocaleString(LOC, { useGrouping: 'always' });
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const num = s => { const n = parseInt(String(s == null ? '' : s).replace(/[^\d]/g, ''), 10); return isNaN(n) ? null : n; };

  // velocidades: espera (ms) entre uma busca e a próxima
  const SPEEDS = {
    turbo: { name: 'Turbo', wait: [350, 800], hint: 'máxima — maior risco de limite do EA' },
    rapida: { name: 'Rápida', wait: [700, 1500] },
    normal: { name: 'Normal', wait: [1400, 2800] },
    lenta: { name: 'Lenta', wait: [3000, 6000] },
    custom: { name: 'Personalizada', wait: null },
  };
  const RESTS = { '15-45': '15s–45s', '30-60': '30s–1m', '30-120': '30s–2m', '60-120': '1m–2m', '60-180': '1m–3m', '120-240': '2m–4m' };
  const TRIES = [10, 15, 20, 25, 30, 40, 50, 75, 100];
  const RUNFOR = { 0: 'Sem limite', 15: '15 minutos', 30: '30 minutos', 60: '1 hora', 90: '1h30', 120: '2 horas', 180: '3 horas' };
  // destino da carta depois da compra
  const DEST = {
    club:     { icon: '🏠', name: 'Clube', hint: 'manda para o Meu Clube' },
    transfer: { icon: '📋', name: 'Lista de transf.', hint: 'só envia, sem anunciar' },
    keep:     { icon: '📥', name: 'Não atribuídos', hint: 'deixa onde está' },
    sell:     { icon: '💰', name: 'Vender', hint: 'anuncia no mercado' },
  };
  const SELLHOW = { paletools: 'Mais barato (Paletools)', fixed: 'Preço fixo', margin: '% sobre o que paguei' };
  const FALLBACK = { keep: 'Deixar nos não atribuídos', transfer: 'Enviar para a Lista de transf.' };
  const AFTER = { ...SELLHOW, club: 'Enviar ao clube', keep: 'Guardar (não atribuídos)', transfer: 'Lista de transf.' };
  const destName = c => c.dest === 'sell' ? 'Vender · ' + (SELLHOW[c.sellHow] || '').split(' (')[0] : (DEST[c.dest] || DEST.keep).name;
  // converte configurações antigas (autoSell + after) para o destino novo
  function fixCfg(c) {
    c = { ...c };
    if ('autoSell' in c || 'after' in c) {
      if (!c.dest) {
        const a = c.after || 'paletools';
        c.dest = !c.autoSell ? 'keep' : a === 'club' ? 'club' : a === 'keep' ? 'keep' : 'sell';
        if (c.dest === 'sell') c.sellHow = a === 'fixed' ? 'fixed' : 'paletools';
      }
      delete c.autoSell; delete c.after;
    }
    return c;
  }

  const DEF = {
    mode: 'price',                 // price = valor de oferta fixo | profit = % de lucro sobre o mercado
    maxBuy: 1000, minBuy: 0, useFilterMax: false, rotate: true,
    profitPct: 10, recheckMin: 10,
    dest: 'keep', sellHow: 'paletools', sellPrice: 0, sellPct: 10, noLoss: true, fallback: 'keep',
    maxBuys: 1, maxSpend: 0,
    speed: 'rapida', waitMin: 800, waitMax: 1600,
    runFor: 30, tries: 30, rest: '30-120', dailyMax: 1500,
    rotateFilters: false, sound: true, run: 'real',   // run: test | assist | real
    preset: '', theme: 'brasa',
  };
  // temas: dark = color-scheme; on = cor do texto em cima do degradê
  const T0 = { bg: '#0a0d13', bg1: '#10141c', bg2: '#161b26', bg3: '#1e2533', line: '#252d3c', line2: '#323c4f', tx: '#eef1f7', tx2: '#b9c1d1', mut: '#7f8aa1', good: '#3ee08f', warn: '#ffc548', bad: '#ff6b6b', tip: '#06080c', dark: true };
  const THEMES = {
    brasa:     { name: 'Brasa',      ...T0, a1: '#ff7a2f', a2: '#ff3d6e', on: '#1c0803' },
    neon:      { name: 'Neon',       ...T0, bg: '#07080f', bg1: '#0d0f1a', bg2: '#141728', bg3: '#1c2036', line: '#232842', line2: '#30375a', a1: '#22d3ee', a2: '#a855f7', on: '#05121a' },
    oceano:    { name: 'Oceano',     ...T0, bg: '#06101c', bg1: '#0b1726', bg2: '#112034', bg3: '#182a43', line: '#1f3350', line2: '#2b4468', tx2: '#b4c6dc', mut: '#7891ae', a1: '#38bdf8', a2: '#2563eb', on: '#03111f' },
    esmeralda: { name: 'Esmeralda',  ...T0, bg: '#06100c', bg1: '#0b1712', bg2: '#11201a', bg3: '#182b23', line: '#1f362c', line2: '#2b4a3d', tx2: '#b5cfc3', mut: '#7a9a8b', a1: '#34d399', a2: '#06b6d4', on: '#03140d', good: '#7ee8b5' },
    ouro:      { name: 'Ouro FUT',   ...T0, bg: '#0e0c07', bg1: '#15120b', bg2: '#1e1a10', bg3: '#282216', line: '#332b1b', line2: '#463b25', tx: '#f7f1e3', tx2: '#d4c9ae', mut: '#9a8f74', a1: '#f7cf5a', a2: '#e0892a', on: '#1f1402' },
    carmesim:  { name: 'Carmesim',   ...T0, bg: '#0f0709', bg1: '#170b0f', bg2: '#211116', bg3: '#2c171e', line: '#381e27', line2: '#4c2a35', tx2: '#d6bcc3', mut: '#a07f89', a1: '#ff5157', a2: '#c0135e', on: '#1d0306' },
    galaxia:   { name: 'Galáxia',    ...T0, bg: '#0b0814', bg1: '#110d1d', bg2: '#181329', bg3: '#211a37', line: '#2a2245', line2: '#3a305e', tx2: '#c6bddf', mut: '#8c82aa', a1: '#c084fc', a2: '#f472b6', on: '#1a0521' },
    matrix:    { name: 'Matrix',     ...T0, bg: '#030805', bg1: '#06100a', bg2: '#0a1810', bg3: '#0f2116', line: '#14301f', line2: '#1d442c', tx: '#dcffe8', tx2: '#9fd6b3', mut: '#5f9a75', a1: '#39ff88', a2: '#00b86b', on: '#021208', good: '#39ff88' },
    amoled:    { name: 'Preto AMOLED', ...T0, bg: '#000000', bg1: '#050505', bg2: '#0d0d0d', bg3: '#161616', line: '#1f1f1f', line2: '#2c2c2c', tip: '#000000', a1: '#ff7a2f', a2: '#ff3d6e', on: '#1c0803' },
    claro:     { name: 'Claro',      bg: '#f3f5f9', bg1: '#ffffff', bg2: '#eef1f6', bg3: '#e2e7ef', line: '#d8dee8', line2: '#c3ccd9', tx: '#131722', tx2: '#3a4356', mut: '#687287', good: '#0f9d5f', warn: '#b7740d', bad: '#d33a3a', tip: '#ffffff', dark: false, a1: '#f26419', a2: '#e0245e', on: '#ffffff' },
  };
  const theme = k => THEMES[k] || THEMES.brasa;
  // aplica num elemento (variáveis CSS --bg, --a1, ...)
  function applyTheme(el, k) {
    const t = theme(k);
    for (const [n, v] of Object.entries(t)) if (typeof v === 'string' && n !== 'name') el.style.setProperty('--' + n, v);
    el.style.colorScheme = t.dark ? 'dark' : 'light';
    return t;
  }
  const STRAT_KEYS = ['mode', 'maxBuy', 'minBuy', 'useFilterMax', 'rotate', 'profitPct', 'recheckMin', 'dest', 'sellHow', 'sellPrice', 'sellPct', 'noLoss', 'fallback',
    'maxBuys', 'maxSpend', 'speed', 'waitMin', 'waitMax', 'runFor', 'tries', 'rest', 'dailyMax', 'rotateFilters'];
  const PRESETS = [
    { id: 'b-cons', name: 'Conservadora', icon: '🛡', hint: 'lenta, poucas buscas, sem prejuízo', cfg: { speed: 'normal', tries: 15, rest: '60-180', dailyMax: 600, runFor: 30, rotate: true, noLoss: true } },
    { id: 'b-eq', name: 'Equilibrada', icon: '⚖', hint: 'rápida com descansos', cfg: { speed: 'rapida', tries: 30, rest: '30-120', dailyMax: 1200, runFor: 60, rotate: true, noLoss: true } },
    { id: 'b-agr', name: 'Agressiva', icon: '⚡', hint: 'turbo — mais chance de limite do EA', cfg: { speed: 'turbo', tries: 50, rest: '30-60', dailyMax: 2000, runFor: 60, rotate: true } },
    { id: 'b-gold', name: 'Ouro raro · 10%', icon: '🥇', hint: 'por lucro, revende no mais barato', cfg: { mode: 'profit', profitPct: 10, recheckMin: 10, dest: 'sell', sellHow: 'paletools', noLoss: true, maxBuys: 10 } },
    { id: 'b-chem', name: 'Consumíveis · 8%', icon: '🧪', hint: 'abra a aba Consumíveis da busca', cfg: { mode: 'profit', profitPct: 8, recheckMin: 15, dest: 'sell', sellHow: 'paletools', noLoss: true, maxBuys: 20 } },
    { id: 'b-sbc', name: 'Forragem DME', icon: '🧩', hint: 'compra barato e manda para o clube', cfg: { mode: 'price', dest: 'club', maxBuys: 11 } },
  ];
  const KIND = { bought: ['Comprada', 'good'], dry: ['Simulada', 'warn'], lost: ['Perdida', 'warn'], skip: ['Pulada', ''], fail: ['Falhou', 'bad'], timeout: ['Timeout', 'warn'], error: ['Erro', 'bad'], block: ['Bloqueio', 'bad'], stop: ['Parada', ''] };

  const DAY = 864e5, HOUR = 36e5;
  // risco: volume de buscas + problemas reais registrados
  function riskLevel(reqs, events) {
    const now = Date.now();
    const h = reqs.filter(t => now - t < HOUR).length, d = reqs.filter(t => now - t < DAY).length;
    const evIn = (k, ms) => events.filter(e => k.includes(e.kind) && now - e.t < ms).length;
    const blocks = evIn(['block'], DAY), trouble = evIn(['timeout', 'error'], HOUR);
    const why = [];
    if (blocks) why.push(`${blocks} bloqueio(s)/captcha em 24 h`);
    if (trouble >= 3) why.push(`${trouble} timeout(s)/erro(s) na última hora`);
    if (h > 150) why.push(`${h} buscas na última hora`);
    if (d > 800) why.push(`${d} buscas em 24 h`);
    if (blocks || h > 400 || d > 2000) return { t: 'Alto', c: 'bad', v: 100, h, d, why };
    if (trouble >= 3 || h > 200 || d > 1000) return { t: 'Médio', c: 'warn', v: 62, h, d, why };
    return { t: 'Baixo', c: 'good', v: Math.max(8, Math.min(40, h / 200 * 40)), h, d, why: why.length ? why : ['sem problemas registrados'] };
  }

  return { setLoc, loc, VERSION, DONATE_URL, REPO_URL, MODS, GAL_DEF, REL_DEF, step, ladderDown, ladderUp, ladderPrev, net, fmt, norm, num, SPEEDS, RESTS, TRIES, RUNFOR, AFTER, DEF, STRAT_KEYS, PRESETS, KIND, DAY, HOUR, riskLevel, THEMES, theme, applyTheme, DEST, SELLHOW, FALLBACK, destName, fixCfg };
})();
