// Widget no Web App: mostra o que está rodando, inicia/para o módulo escolhido e abre o painel.
(() => {
  'use strict';
  if (window.__futWidget) return;
  window.__futWidget = true;
  const { fmt, MODS } = FSB;
  const F = FUT, D = F.D;
  const POS = 'futbots_pos_v1', MOD = 'futbots_mod_v1';
  let pick = 'snipe';
  try { pick = localStorage.getItem(MOD) || 'snipe'; } catch {}

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:2147483646';
  F.setHost(host);
  const sh = host.attachShadow({ mode: 'open' });
  sh.innerHTML = `
<style>
  :host{all:initial}*{box-sizing:border-box}
  .w{font:12.5px/1.35 "Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;color:var(--tx);background:color-mix(in srgb,var(--bg1) 94%,transparent);
     border:1px solid var(--line2);border-radius:12px;box-shadow:0 14px 36px #0009;width:292px;backdrop-filter:blur(8px);overflow:hidden}
  .top{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 11px;cursor:move;user-select:none;border-bottom:1px solid var(--line)}
  .mark{width:20px;height:20px;border-radius:5px;display:block}
  .top b{flex:1;font-size:12.5px;letter-spacing:.1px}
  .dot{width:8px;height:8px;border-radius:50%;background:var(--mut)}.dot.on{background:var(--good);box-shadow:0 0 0 3px color-mix(in srgb,var(--good) 25%,transparent)}.dot.test{background:var(--warn)}
  button{font:inherit;color:inherit;border:0;cursor:pointer;border-radius:7px;padding:5px 9px;background:var(--bg3)}
  button:hover{background:var(--line2)}
  button:disabled{opacity:.45;cursor:default}
  .ic{width:26px;height:26px;padding:0;display:grid;place-items:center;background:none;color:var(--mut)}.ic:hover{color:var(--tx);background:var(--bg3)}
  .body{padding:9px 11px 10px;display:grid;gap:8px}
  .seg{display:grid;grid-template-columns:repeat(3,1fr);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:2px;gap:2px}
  .seg button{background:none;color:var(--mut);font-weight:600;padding:4px 0}
  .seg button.on{background:var(--bg3);color:var(--tx)}
  .seg button.run::after{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--good);margin-left:5px;vertical-align:1px}
  .row{display:flex;gap:8px;align-items:center}
  .k{flex:1;display:flex;gap:10px;color:var(--mut);font-size:11.5px;min-width:0;white-space:nowrap;overflow:hidden}.k b{color:var(--tx);font-variant-numeric:tabular-nums}
  .go{background:var(--a1);color:var(--on);font-weight:700;padding:6px 14px}
  .go:hover{background:var(--a1);filter:brightness(1.08)}
  .go.stop{background:var(--bg3);color:var(--tx);border:1px solid var(--line2)}
  .last{color:var(--mut);font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .last.good{color:var(--good)}.last.warn{color:var(--warn)}.last.bad{color:var(--bad)}
  .cf{display:flex;gap:6px;align-items:center;background:color-mix(in srgb,var(--good) 10%,transparent);border:1px solid color-mix(in srgb,var(--good) 35%,transparent);border-radius:8px;padding:6px 8px}
  .cf[hidden]{display:none}.cf span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.yes{background:var(--good);color:#04221a;font-weight:700}
  .min .body{display:none}.min .top{border-bottom:0}.min .w{width:auto}
</style>
<div class="w" id="w">
  <div class="top" id="drag"><img class="mark" src="${chrome.runtime.getURL('icons/icon32.png')}" alt=""><b id="title">FUT Bots</b><span class="dot" id="dot"></span>
    <button class="ic" id="open" title="Abrir o painel"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg></button>
    <button class="ic" id="min" title="Minimizar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 12h12"/></svg></button></div>
  <div class="body">
    <div class="seg" id="seg">${Object.entries(MODS).map(([k, m]) => `<button data-m="${k}">${m.name}</button>`).join('')}</div>
    <div class="row"><div class="k" id="k"></div><button class="go" id="go">Iniciar</button></div>
    <div class="cf" id="cf" hidden><span id="cfT"></span><button class="yes" id="cfY">Comprar</button><button id="cfN">Pular</button></div>
    <div class="last" id="last">pronto</div>
  </div>
</div>`;
  const $ = id => sh.getElementById(id);
  const paint = () => FSB.applyTheme(host, D.cfg.theme);
  paint();
  F.onChange(keys => { if (keys.includes('cfg')) paint(); soon(); });

  const owner = () => F.run.owner;
  const st = () => F.status();
  function render() {
    if (!$('go')) return;
    const s = st(), o = owner();
    const shown = o || pick;
    for (const b of $('seg').children) { b.classList.toggle('on', b.dataset.m === shown); b.classList.toggle('run', b.dataset.m === o); b.disabled = !!o && b.dataset.m !== o; }
    const test = shown === 'snipe' ? D.cfg.run === 'test' : shown === 'gal' ? D.galCfg.dryRun : false;
    $('dot').className = 'dot' + (o ? (test ? ' test' : ' on') : '');
    $('go').classList.toggle('stop', !!o);
    $('go').textContent = o ? (F.run.stopReq ? 'Parando…' : 'Parar') : shown === 'snipe' ? (D.cfg.run === 'test' ? 'Testar' : 'Snipar') : shown === 'gal' ? (D.galCfg.dryRun ? 'Testar' : 'Iniciar') : 'Relistar';
    let k = '';
    if (shown === 'snipe' && s.snipe) { const S = s.snipe.S; k = `<span>Buscas <b>${fmt(S.searches)}</b></span><span>Compras <b>${fmt(D.cfg.run === 'test' ? S.dry : S.bought)}</b></span><span>Gasto <b>${fmt(S.spent)}</b></span>`; }
    if (shown === 'gal' && s.gal) { const G = s.gal.G, g = s.gal.gallery; k = g ? `<span><b>${g.sel}/${g.req ?? '?'}</b> ${escH(g.set)}</span><span>Faltam <b>${g.toBuy ?? '?'}</b></span>` : `<span>Compras <b>${fmt(G.bought)}</b></span><span>Gasto <b>${fmt(G.spent)}</b></span>`; }
    if (shown === 'rel' && s.rel) k = `<span>Listados <b>${fmt(s.rel.R.listed)}</b></span><span>${s.onTL ? 'na Lista de Transf.' : 'abre a Lista sozinho'}</span>`;
    $('k').innerHTML = k;
    const p = s.snipe && s.snipe.pending;
    $('cf').hidden = !p;
    if (p) $('cfT').textContent = `${p.name} · ${fmt(p.price)} · ${p.left}s`;
    const L = D.logs, l = L[L.length - 1];
    const line = (o === 'snipe' && s.snipe.S.last) || (o === 'gal' && s.gal.G.line) || (o === 'rel' && s.rel.R.line) || '';
    $('last').textContent = line || (l ? l.m : 'pronto');
    $('last').className = 'last ' + (line ? '' : (l && l.c) || '');
  }
  const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let rT = 0;
  const soon = () => { if (!rT) rT = setTimeout(() => { rT = 0; try { render(); } catch {} }, 200); };
  F.onTick(soon);

  $('seg').onclick = e => { const b = e.target.closest('[data-m]'); if (!b || owner()) return; pick = b.dataset.m; try { localStorage.setItem(MOD, pick); } catch {} render(); };
  // os mesmos comandos que o painel manda
  $('go').onclick = async () => {
    if (owner()) F.stop();
    else { try { await F.command({ mod: pick, op: 'start' }); } catch (e) { F.log('⚠ ' + e.message, 'bad', pick); } }
    render();
  };
  $('open').onclick = e => { e.stopPropagation(); try { chrome.runtime.sendMessage({ type: 'openControl' }); } catch {} };
  $('cfY').onclick = () => F.command({ mod: 'snipe', op: 'confirm', v: true });
  $('cfN').onclick = () => F.command({ mod: 'snipe', op: 'confirm', v: false });
  const setMin = m => { $('w').classList.toggle('min', m); try { localStorage.setItem(POS + '_min', m ? '1' : ''); } catch {} };
  $('min').onclick = e => { e.stopPropagation(); setMin(!$('w').classList.contains('min')); };
  try { if (localStorage.getItem(POS + '_min')) setMin(true); } catch {}

  // arrastar pelo topo
  $('drag').addEventListener('mousedown', e => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const r = host.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    const mv = ev2 => { host.style.left = Math.max(0, Math.min(innerWidth - r.width, ev2.clientX - dx)) + 'px'; host.style.top = Math.max(0, Math.min(innerHeight - r.height, ev2.clientY - dy)) + 'px'; host.style.bottom = 'auto'; };
    const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); try { localStorage.setItem(POS, JSON.stringify({ x: host.style.left, y: host.style.top })); } catch {} };
    addEventListener('mousemove', mv); addEventListener('mouseup', up); e.preventDefault();
  });
  // duplo clique no topo abre/fecha
  $('drag').addEventListener('dblclick', e => { if (!e.target.closest('button')) setMin(!$('w').classList.contains('min')); });

  const active = () => /ultimate-team\/web-app/.test(location.pathname);
  function mount() {
    if (active() && !host.isConnected && document.body) {
      document.body.appendChild(host);
      try { const p = JSON.parse(localStorage.getItem(POS) || 'null'); if (p) { host.style.left = p.x; host.style.top = p.y; host.style.bottom = 'auto'; } } catch {}
    } else if (!active() && host.isConnected && !owner()) host.remove();
  }
  setInterval(mount, 1500); mount();
  F.onReady(render);
  setInterval(() => { try { if (host.isConnected) render(); } catch {} }, 1000);
})();
