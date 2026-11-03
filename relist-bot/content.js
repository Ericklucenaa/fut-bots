(() => {
  'use strict';
  if (window.__frbLoaded) return;
  window.__frbLoaded = true;

  // ---------- utilidades ----------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const num = s => { const n = parseInt(String(s || '').replace(/[^\d]/g, ''), 10); return isNaN(n) ? null : n; };
  const fmt = n => n == null ? '?' : n.toLocaleString('pt-BR');
  const vis = el => {
    if (!el || !el.isConnected || !el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0;
  };
  // texto sem os rótulos de atalho do Paletools ("[KeyC]")
  const btnText = el => norm((el.textContent || '').replace(/\[\s*(Key|Digit|Numpad)?\w{0,12}\s*\]/g, ' '));
  let host = null;
  const mine = el => host && host.contains(el);

  function find(re, { root = document } = {}) {
    const pick = list => list.sort((a, b) => a.getElementsByTagName('*').length - b.getElementsByTagName('*').length)[0] || null;
    const btns = [...root.querySelectorAll('button, [role=button], a')].filter(el => !mine(el) && vis(el) && re.test(btnText(el)));
    if (btns.length) return pick(btns);
    return pick([...root.querySelectorAll('body *')].filter(el => el.children.length <= 6 && !mine(el) && vis(el) && re.test(btnText(el))));
  }
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
  const pageText = () => document.body ? document.body.innerText : '';
  const dialogs = () => [...document.querySelectorAll('.ea-dialog-view, .view-modal-container, .ut-dialog')].filter(vis);
  const popupText = () => dialogs().map(d => d.innerText).join('\n');

  const loading = () => [...document.querySelectorAll('.ut-click-shield.showing, .loaderIcon, .ut-loading-spinner')]
    .some(e => { if (!vis(e)) return false; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; });

  let running = false, stopReq = false;
  class Stop extends Error {}
  const FULL_RE = /lista de transfer[êe]ncias est[áa] cheia|transfer list is full/i;

  function checkBlockers() {
    const t = popupText() + '\n' + (document.querySelector('iframe[src*="captcha"], iframe[title*="captcha" i], #funcaptcha') ? 'captcha' : '');
    if (/captcha|verifica[çc][ãa]o de seguran/i.test(t)) throw new Stop('Apareceu uma verificação (captcha). Resolva e clique em Iniciar de novo.');
    if (/muitas (solicita|a[çc][õo]es)|too many|limite tempor/i.test(t)) throw new Stop('O EA limitou as ações por agora. Espere um pouco antes de continuar.');
  }
  async function waitFor(fn, ms = 10000, what = '') {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (stopReq) throw new Stop('Parado por você.');
      checkBlockers();
      let v = null; try { v = fn(); } catch (_e) { v = null; }
      if (v) return v;
      await sleep(200);
    }
    if (what) throw new Error('Tempo esgotado esperando ' + what);
    return null;
  }
  const pause = k => sleep(cfg.delay * (k || 1) * (0.8 + Math.random() * 0.4));

  // ---------- configuração / log ----------
  const CFG_KEY = 'frb_cfg_v1', LOG_KEY = 'frb_log_v1', POS_KEY = 'frb_pos_v1', MIN_KEY = 'frb_min';
  const DEF = { minPrice: 0, maxItems: 0, delay: 900, expired: true, unassigned: true, clearSold: true };
  let cfg = { ...DEF };
  try { cfg = { ...DEF, ...JSON.parse(localStorage.getItem(CFG_KEY) || '{}') }; } catch (_e) {}
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (_e) {} };
  let logs = [];
  try { logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (_e) {}
  function log(m, c = '') {
    logs.push({ t: Date.now(), m, c });
    if (logs.length > 2000) logs = logs.slice(-2000);
    try { localStorage.setItem(LOG_KEY, JSON.stringify(logs)); } catch (_e) {}
    renderLog();
  }

  // ---------- lista de transferências ----------
  const onTransferList = () => {
    const title = document.querySelector('.ut-navigation-bar-view .title');
    return (title && /Lista de Transfer[êe]ncias|Transfer List/i.test(title.textContent)) || !!find(/^(Retirar vendidos|Clear Sold)$/i);
  };
  async function goToTransferList() {
    if (onTransferList()) return;
    log('Abrindo a Lista de Transferências…');
    const nav = [...document.querySelectorAll('.ut-tab-bar-item')].find(e => vis(e) && /^Transf/i.test(norm(e.textContent)));
    if (!nav) throw new Stop('Não achei o menu "Transfer.". Abra a Lista de Transferências e clique em Iniciar.');
    click(nav); await pause(1.5);
    const tile = await waitFor(() => document.querySelector('.ut-tile-transfer-list') || find(/^(Lista de Transfer[êe]ncias|Transfer List)$/i), 15000, 'o quadro "Lista de Transferências"');
    click(tile);
    await waitFor(() => !loading() && onTransferList(), 20000, 'abrir a Lista de Transferências');
    await pause(1.5);
  }

  const rows = () => [...document.querySelectorAll('.listFUTItem')].filter(r => vis(r) && !mine(r));
  const ident = r => {
    const n = r.querySelector('.name'), rt = r.querySelector('.rating');
    return norm((n ? n.textContent : r.innerText.split('\n')[0]) + ' ' + (rt ? rt.textContent : ''));
  };
  // vendidos e anúncios ativos ficam de fora; entram os expirados e os itens disponíveis (sem anúncio)
  function isCandidate(r) {
    const t = r.innerText;
    if (/Vendido|Sold/i.test(t)) return false;
    if (/Expirado|Expired/i.test(t)) return cfg.expired;
    if (/Pre[çc]o Inicial|Start Price|Comprar J[áa]|Buy Now/i.test(t)) return false;   // ainda à venda
    return cfg.unassigned;
  }

  const LIST_BTN = /^(Listar item novamente|Listar no Mercado de Transfer[êe]ncias|Re-?list Item|List on Transfer Market)$/i;
  function priceInputs() {
    return [...document.querySelectorAll('input')].filter(i => !mine(i) && vis(i) && /^[\d.,]*$/.test(i.value) && i.value !== '');
  }
  function closeDialog() {
    const d = dialogs().pop();
    const ok = d && find(/^(Ok|Fechar|Cancelar|Close)$/i, { root: d });
    if (ok) click(ok);
  }

  // lista um item: abre "Listar…", clica "Mais barato" e confirma "Listar para transferência"
  async function relistItem(row) {
    click(row); await pause(0.8);
    const acc = await waitFor(() => find(LIST_BTN), 6000);
    if (!acc) return { ok: false, why: 'não apareceu "Listar no Mercado de Transferências" / "Listar item novamente"' };
    const before = priceInputs().map(i => i.value).join('|');
    click(acc); await pause(0.7);
    const cheap = await waitFor(() => find(/^(Mais barato|Cheapest)$/i), 6000);
    if (!cheap) return { ok: false, why: 'não achei o botão "Mais barato" (o Paletools está ativo?)' };
    const before2 = priceInputs().map(i => i.value).join('|') || before;
    click(cheap);
    await waitFor(() => !loading() && priceInputs().map(i => i.value).join('|') !== before2, 12000);
    await pause(0.8);
    const vals = priceInputs().map(i => num(i.value));
    const buyNow = vals.length ? vals[vals.length - 1] : null;
    if (cfg.minPrice && buyNow != null && buyNow < cfg.minPrice) return { ok: false, keep: true, why: `mais barato é ${fmt(buyNow)}, abaixo do seu mínimo de ${fmt(cfg.minPrice)}` };
    const lb = await waitFor(() => find(/^(Listar para (a )?transfer[êe]ncia|List for Transfer)$/i), 5000);
    if (!lb) return { ok: false, why: 'não achei o botão "Listar para transferência"' };
    click(lb);
    const out = await waitFor(() => FULL_RE.test(popupText()) ? 'full' : !vis(lb) ? 'ok' : null, 8000);
    if (out === 'full') { closeDialog(); return { ok: false, full: true, why: 'a Lista de Transferências está cheia' }; }
    if (!out) return { ok: false, why: 'o anúncio não foi confirmado' };
    return { ok: true, buyNow };
  }

  // "Retirar vendidos": tira da lista os itens já vendidos (as moedas já caíram na conta)
  async function clearSold() {
    if (!cfg.clearSold) return false;
    const b = find(/^(Retirar vendidos|Clear Sold)$/i);
    if (!b) return false;
    const n = rows().filter(r => /Vendido|Sold/i.test(r.innerText)).length;
    click(b); await pause(1);
    const d = dialogs().pop();
    const yes = d && find(/^(Sim|Ok|Confirmar|Yes)$/i, { root: d });
    if (yes) { click(yes); await pause(1); }
    await waitFor(() => !loading() && !find(/^(Retirar vendidos|Clear Sold)$/i), 8000);
    log(`🧹 Retirei os vendidos${n ? ` (${n})` : ''}.`, 'good');
    await pause(1);
    return true;
  }

  async function run() {
    running = true; stopReq = false; render();
    let listed = 0, total = 0;
    const failed = {};   // nome → quantas vezes falhou (para não ficar tentando o mesmo item)
    try {
      log('▶ Iniciando a relistagem.', 'good');
      await goToTransferList();
      await clearSold();
      let clearedOnFull = false;
      for (;;) {
        if (stopReq) throw new Stop('Parado por você.');
        if (cfg.maxItems && listed >= cfg.maxItems) { log(`Cheguei ao limite de ${cfg.maxItems} item(ns).`); break; }
        await waitFor(() => !loading(), 30000, 'a tela carregar');
        const cand = rows().filter(isCandidate);
        const seen = {};
        const row = cand.find(r => { const k = ident(r); seen[k] = (seen[k] || 0) + 1; return seen[k] > (failed[k] || 0); });
        if (!row) break;
        const name = ident(row);
        total++;
        log(`→ ${name}: listando…`);
        let res;
        try { res = await relistItem(row); }
        catch (e) { if (e instanceof Stop) throw e; res = { ok: false, why: e.message }; }
        if (res.ok) { listed++; log(`   ✔ listado por ${fmt(res.buyNow)}.`, 'good'); }
        else {
          failed[name] = (failed[name] || 0) + 1;
          log(`   ✖ não listado: ${res.why}.`, res.keep ? 'warn' : 'bad');
          closeDialog();
          if (res.full) {
            // lista cheia: retira os vendidos uma vez e tenta de novo
            failed[name]--;
            if (clearedOnFull || !(await clearSold())) break;
            clearedOnFull = true;
          }
        }
        stat.textContent = `${listed} listado(s)`;
        await pause(1.2);
      }
      await clearSold();
      log(`■ Fim: ${listed} de ${total} item(ns) listados.`, 'good');
    } catch (e) {
      log((e instanceof Stop ? '■ ' : '⚠ Erro: ') + e.message + ` (${listed} listado(s))`, e instanceof Stop ? 'warn' : 'bad');
    } finally {
      running = false; stopReq = false; render();
    }
  }

  // ---------- painel ----------
  host = document.createElement('div');
  host.style.cssText = 'position:fixed;z-index:2147483646;right:16px;bottom:16px;';
  const sh = host.attachShadow({ mode: 'open' });
  sh.innerHTML = `
<style>
  *{box-sizing:border-box;font-family:system-ui,Segoe UI,Roboto,sans-serif}
  .p{width:300px;background:#12161f;color:#e7ecf3;border:1px solid #2a3242;border-radius:14px;box-shadow:0 10px 30px #0008;overflow:hidden}
  .h{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#1a2030;cursor:grab;user-select:none}
  .h b{flex:1;font-size:14px}
  .st{font-size:11px;color:#8fa0b8}
  .x{background:none;border:0;color:#8fa0b8;font-size:16px;cursor:pointer;padding:0 4px}
  .b{padding:12px;display:grid;gap:10px}
  label{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#b8c4d6;gap:8px}
  input[type=number]{width:90px;background:#0c1017;border:1px solid #2a3242;color:#e7ecf3;border-radius:8px;padding:5px 7px;font-size:12px}
  .go{border:0;border-radius:10px;padding:10px;font-weight:700;font-size:14px;cursor:pointer;background:linear-gradient(90deg,#22c58b,#1fa3d6);color:#06121a}
  .go.stop{background:#e2475b;color:#fff}
  .log{height:150px;overflow:auto;background:#0c1017;border:1px solid #222a38;border-radius:8px;padding:6px;font:11px/1.45 ui-monospace,Consolas,monospace;white-space:pre-wrap}
  .good{color:#4fe0a6}.warn{color:#f3c55b}.bad{color:#ff7a8a}
  .row{display:flex;gap:6px}.row button{flex:1;background:#1f2738;color:#b8c4d6;border:1px solid #2a3242;border-radius:8px;padding:5px;font-size:11px;cursor:pointer}
  .mini{display:none;padding:9px 14px;background:linear-gradient(90deg,#22c58b,#1fa3d6);color:#06121a;font-weight:700;border-radius:999px;cursor:grab;user-select:none;box-shadow:0 6px 18px #0007;font-size:13px}
  .min .p{display:none}.min .mini{display:block}
</style>
<div id="w">
  <div class="mini" id="mini">♻ Relist</div>
  <div class="p">
    <div class="h" id="drag"><b>♻ FUT Relist Bot</b><span class="st" id="stat">parado</span><button class="x" id="min" title="Minimizar">–</button></div>
    <div class="b">
      <label>Preço mínimo para listar (0 = sem mínimo)<input type="number" id="minPrice" min="0" step="50"></label>
      <label>Máx. de itens por rodada (0 = todos)<input type="number" id="maxItems" min="0"></label>
      <label>Intervalo entre ações (ms)<input type="number" id="delay" min="300" step="100"></label>
      <label>Clicar em "Retirar vendidos"<input type="checkbox" id="clearSold"></label>
      <label>Relistar os expirados<input type="checkbox" id="expired"></label>
      <label>Listar os itens disponíveis (não atribuídos)<input type="checkbox" id="unassigned"></label>
      <button class="go" id="go">Iniciar</button>
      <div class="log" id="log"></div>
      <div class="row"><button id="dl">Baixar log</button><button id="clr">Limpar log</button></div>
    </div>
  </div>
</div>`;
  const $ = id => sh.getElementById(id);
  const stat = $('stat');
  for (const k of ['minPrice', 'maxItems', 'delay']) { $(k).value = cfg[k]; $(k).onchange = () => { cfg[k] = Math.max(0, num($(k).value) || 0); if (k === 'delay') cfg.delay = Math.max(300, cfg.delay); $(k).value = cfg[k]; saveCfg(); }; }
  for (const k of ['clearSold', 'expired', 'unassigned']) { $(k).checked = cfg[k]; $(k).onchange = () => { cfg[k] = $(k).checked; saveCfg(); }; }
  $('go').onclick = () => { if (running) { stopReq = true; stat.textContent = 'parando…'; } else run(); };
  $('clr').onclick = () => { logs = []; try { localStorage.removeItem(LOG_KEY); } catch (_e) {} renderLog(); };
  $('dl').onclick = () => {
    const txt = logs.map(l => new Date(l.t).toLocaleString('pt-BR') + '  ' + l.m).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
    a.download = 'fut-relist-log.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  function render() {
    $('go').textContent = running ? 'Parar' : 'Iniciar';
    $('go').classList.toggle('stop', running);
    if (!running) stat.textContent = 'parado';
    else if (stat.textContent === 'parado') stat.textContent = 'rodando…';
  }
  function renderLog() {
    const el = $('log'); if (!el) return;
    const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    el.innerHTML = logs.slice(-200).map(l => `<div class="${l.c}">${new Date(l.t).toLocaleTimeString('pt-BR')} ${esc(l.m)}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  }

  // arrastar (painel e bolinha minimizada) e minimizar
  function placeHost(x, y) {
    const r = host.getBoundingClientRect();
    host.style.left = Math.max(0, Math.min(innerWidth - r.width, x)) + 'px';
    host.style.top = Math.max(0, Math.min(innerHeight - r.height, y)) + 'px';
    host.style.right = host.style.bottom = 'auto';
  }
  const savePos = () => { try { localStorage.setItem(POS_KEY, JSON.stringify({ x: parseFloat(host.style.left), y: parseFloat(host.style.top) })); } catch (_e) {} };
  function makeDraggable(handle, onClick) {
    handle.addEventListener('mousedown', e => {
      if (e.button !== 0 || e.target.closest('button')) return;
      const r = host.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top, sx = e.clientX, sy = e.clientY;
      let moved = false;
      const mv = ev => { if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return; moved = true; placeHost(ev.clientX - dx, ev.clientY - dy); };
      const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); if (moved) savePos(); else if (onClick) onClick(); };
      addEventListener('mousemove', mv); addEventListener('mouseup', up); e.preventDefault();
    });
  }
  function setMin(v) {
    $('w').classList.toggle('min', v);
    try { localStorage.setItem(MIN_KEY, v ? '1' : ''); } catch (_e) {}
    if (host.style.left) requestAnimationFrame(() => placeHost(parseFloat(host.style.left), parseFloat(host.style.top)));
  }
  makeDraggable($('drag'));
  makeDraggable($('mini'), () => setMin(false));
  $('min').onclick = () => setMin(true);

  // só aparece no Web App do Ultimate Team
  const active = () => /ultimate-team\/web-app/.test(location.pathname);
  function mount() {
    if (active() && !host.isConnected) {
      document.body.appendChild(host);
      try { const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); if (p) requestAnimationFrame(() => placeHost(p.x, p.y)); } catch (_e) {}
      try { if (localStorage.getItem(MIN_KEY)) setMin(true); } catch (_e) {}
    } else if (!active() && host.isConnected && !running) host.remove();
  }
  setInterval(mount, 1500); mount();
  render(); renderLog();
})();
