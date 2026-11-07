// Painel do FUT Bots: Início, Galeria, Relist, Configurações e Como usar.
'use strict';

const owner = () => status && status.owner;
const saveGal = () => store.set({ galCfg: st.galCfg });
const saveRel = () => store.set({ relCfg: st.relCfg });

// ---------- barras de baixo (Galeria e Relist) ----------
function syncBars() {
  const o = owner(), g = st.galCfg;
  // Galeria
  const gs = status && status.gal, gal = gs && gs.gallery, G = (gs && gs.G) || {};
  $('gbSet').textContent = gal ? `${gal.set} · ${gal.sel}/${gal.req ?? '?'}` : 'abra a Gallery';
  $('gbLeft').textContent = gal ? (gal.toBuy ?? '?') : '–';
  $('gbBought').textContent = fmt(g.dryRun ? G.sim : G.bought); $('gbSpent').textContent = fmt(g.dryRun ? G.simSpent : G.spent);
  for (const b of $('gSegRun').children) { b.classList.toggle('on', (b.dataset.v === 'test') === !!g.dryRun); b.disabled = !!o; }
  const gg = $('gGo');
  if (o === 'gal') { gg.classList.add('stop'); gg.disabled = false; gg.textContent = status.stopping ? 'Parando…' : 'Parar'; }
  else { gg.classList.remove('stop'); gg.disabled = !!o; gg.textContent = o ? `${MODS[o].name} está trabalhando…` : g.dryRun ? 'Iniciar teste' : 'Iniciar compras'; }
  // Relist
  const R = (status && status.rel && status.rel.R) || {};
  $('rbListed').textContent = fmt(R.listed || 0); $('rbTotal').textContent = fmt(R.total || 0);
  $('rbMin').textContent = st.relCfg.minPrice ? fmt(st.relCfg.minPrice) : 'sem mínimo';
  const rg = $('rGo');
  if (o === 'rel') { rg.classList.add('stop'); rg.disabled = false; rg.textContent = status.stopping ? 'Parando…' : 'Parar'; }
  else { rg.classList.remove('stop'); rg.disabled = !!o; rg.textContent = o ? `${MODS[o].name} está trabalhando…` : 'Relistar agora'; }
}
function buildMods() {
  $('gSegRun').onclick = e => {
    const b = e.target.closest('button'); if (!b || owner()) return;
    const test = b.dataset.v === 'test';
    if (!test && st.galCfg.dryRun && !confirm('Comprar de verdade?\n\nO bot vai gastar moedas e listar as cartas. Teste antes no modo Teste.')) return;
    st.galCfg.dryRun = test; saveGal(); syncBars();
  };
  $('gGo').onclick = () => act(null, async () => {
    if (owner() === 'gal') { await send({ cmd: 'stop' }); return; }
    await modCmd('gal', 'start'); toast('Galeria iniciada no Web App.', 'good');
  });
  $('rGo').onclick = () => act(null, async () => {
    if (owner() === 'rel') { await send({ cmd: 'stop' }); return; }
    await modCmd('rel', 'start'); toast('Relist iniciado no Web App.', 'good');
  });
}

// ---------- opções em lista (número ou liga/desliga) ----------
// rows: [key, título, explicação, 'num' | 'sw', passo]
function optRows(prefix, cfg, rows) {
  return `<div class="opts">${rows.map(([k, t, h, type, stp]) => `<div class="opt"><div class="l"><b>${esc(t)}</b><span>${esc(h)}</span></div>${type === 'sw'
    ? `<label class="tg"><input type="checkbox" data-${prefix}="${k}" ${cfg[k] ? 'checked' : ''}><span></span></label>`
    : `<input type="number" data-${prefix}="${k}" value="${cfg[k]}" min="0" step="${stp || 1}">`}</div>`).join('')}</div>`;
}
function bindOpts(root, prefix, key, after = () => {}) {
  root.onchange = e => {
    const el = e.target.closest(`[data-${prefix}]`); if (!el) return;
    const k = el.dataset[prefix];
    st[key][k] = el.type === 'checkbox' ? el.checked : Math.max(0, num(el.value) || 0);
    if (k === 'delay') st[key][k] = Math.max(300, st[key][k]);
    if (el.type !== 'checkbox') el.value = st[key][k];
    store.set({ [key]: st[key] }); after(k);
  };
}

// ---------- INÍCIO ----------
let homeBuilt = false;
PAGES.home = () => { homeBuilt = false; renderHome(); };
function renderHome(live) {
  const el = $('p-home');
  if (!homeBuilt || !live) {
    homeBuilt = true;
    el.innerHTML = `
      <div class="ph"><div><h2>Início</h2><p>Os três módulos usam o mesmo Web App, um de cada vez. Deixe o Web App visível na outra janela enquanto eles trabalham.</p></div></div>
      <div class="grid">
        <div class="tiles">
          <div class="tile"><small>Moedas</small><b id="hmCoins">–</b><span id="hmConn">–</span></div>
          <div class="tile"><small>Lucro hoje</small><b id="hmProfit">0</b><span>Snipe (estimado) + Galeria (vendido)</span></div>
          <div class="tile"><small>Compras hoje</small><b id="hmBuys">0</b><span id="hmBuysS"></span></div>
          <div class="tile"><small>Buscas em 24 h</small><b id="hmReq">0</b><span id="hmRisk"></span></div>
        </div>
        <div class="mods">
          ${modCard('snipe', 'snipe', 'Sniper', 'Busca o seu filtro sem parar e compra no Comprar já até o seu preço.')}
          ${modCard('gal', 'gal', 'Galeria', 'Compra as cartas que faltam nas galerias do Paletools e lista no mais barato.')}
          ${modCard('rel', 'rel', 'Relist', 'Relista os expirados e os não listados da Lista de Transferências pelo mais barato.')}
        </div>
        <div class="card logcard"><div class="ch"><h3>Atividade</h3><div class="acts"><button class="link" data-logdl="all">baixar</button><button class="link" data-logclr="all">limpar</button></div></div>
          <div class="log" data-src="all"></div></div>
      </div>`;
    el.onclick = e => {
      const b = e.target.closest('[data-run]'); if (!b) return;
      const m = b.dataset.run;
      act(b, async () => {
        if (owner() === m) { await send({ cmd: 'stop' }); return; }
        await modCmd(m, 'start'); toast(`${MODS[m].name} iniciado no Web App.`, 'good');
      });
    };
    renderLog();
  }
  const o = owner();
  $('hmCoins').textContent = fmt(status ? status.coins : null);
  $('hmConn').textContent = status ? 'Web App conectado' : 'Web App fechado ou sem resposta';
  const pt = profitToday(); $('hmProfit').textContent = fmt(pt); $('hmProfit').className = pt > 0 ? 'good' : pt < 0 ? 'bad' : '';
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const sb = st.events.filter(e => e.kind === 'bought' && e.t >= +t0).length, gb = st.galBuys.filter(b => b.t >= +t0).length;
  $('hmBuys').textContent = fmt(sb + gb); $('hmBuysS').textContent = `${sb} no Snipe · ${gb} na Galeria`;
  const r = riskLevel(st.reqs, st.events); $('hmReq').textContent = fmt(r.d); $('hmRisk').innerHTML = `risco <strong style="font-weight:600" class="${r.c}">${r.t.toLowerCase()}</strong>`;
  for (const m of ['snipe', 'gal', 'rel']) {
    const card = $('mc-' + m), btn = card.querySelector('[data-run]');
    card.classList.toggle('live', o === m);
    btn.className = 'btn ' + (o === m ? '' : 'acc'); btn.disabled = !!o && o !== m;
    btn.textContent = o === m ? (status.stopping ? 'Parando…' : 'Parar') : m === 'snipe' ? (st.cfg.run === 'test' ? 'Testar' : 'Snipar') : m === 'gal' ? (st.galCfg.dryRun ? 'Testar' : 'Iniciar') : 'Relistar';
    $('ms-' + m).innerHTML = modState(m);
  }
}
const modCard = (m, icon, title, hint) => `<div class="mod" id="mc-${m}">
  <div class="mh"><span class="ico">${ico(icon)}</span><div><b>${title}</b><small>${esc(hint)}</small></div></div>
  <div class="state" id="ms-${m}"></div>
  <div class="row"><button class="btn" data-goto="${m === 'snipe' ? 'sniper' : m}">Abrir</button><button class="btn acc" data-run="${m}">Iniciar</button></div></div>`;
function modState(m) {
  const o = owner(), s = status;
  if (m === 'snipe') {
    const S = s && s.snipe && s.snipe.S;
    if (o === 'snipe' && S) return `<div class="nums"><div><small>Buscas</small><b>${fmt(S.searches)}</b></div><div><small>${st.cfg.run === 'test' ? 'Simuladas' : 'Compras'}</small><b>${fmt(st.cfg.run === 'test' ? S.dry : S.bought)}</b></div><div><small>Gasto</small><b>${fmt(S.spent)}</b></div></div>`;
    const c = st.cfg;
    return `${c.run === 'test' ? 'Teste' : c.run === 'assist' ? 'Assistido' : 'Automático'} · ${c.mode === 'profit' ? `${c.profitPct}% de lucro` : `oferta ${fmt(c.maxBuy)}`} · ${esc(destName(c))}<br><span class="mut">${s && s.onSearch ? 'Tela de busca aberta: pronto para snipar.' : 'Abra Transfer. → Pesquisar no Mercado no Web App.'}</span>`;
  }
  if (m === 'gal') {
    const gs = s && s.gal, g = gs && gs.gallery, G = gs && gs.G;
    if (o === 'gal' && G) return `<div class="nums"><div><small>${st.galCfg.dryRun ? 'Simuladas' : 'Compradas'}</small><b>${fmt(st.galCfg.dryRun ? G.sim : G.bought)}</b></div><div><small>Gasto</small><b>${fmt(st.galCfg.dryRun ? G.simSpent : G.spent)}</b></div><div><small>Times</small><b>${fmt(G.sets)}</b></div></div>`;
    if (g) return `<b>${esc(g.set)}</b>: ${g.sel}/${g.req ?? '?'} · faltam ${g.toBuy ?? '?'}<br><span class="mut">até ${fmt(st.galCfg.maxPrice)} por carta${st.galCfg.dryRun ? ' · modo teste' : ''}</span>`;
    return `Até ${fmt(st.galCfg.maxPrice)} por carta${st.galCfg.dryRun ? ' · modo teste' : ''}<br><span class="mut">Abra a Gallery do Paletools no Web App.</span>`;
  }
  const R = s && s.rel && s.rel.R;
  if (o === 'rel' && R) return `<div class="nums"><div><small>Listados</small><b>${fmt(R.listed)}</b></div><div><small>Tentados</small><b>${fmt(R.total)}</b></div></div>`;
  const rc = st.relCfg;
  return `${[rc.expired && 'expirados', rc.unassigned && 'não listados'].filter(Boolean).join(' e ') || 'nada marcado'}${rc.minPrice ? ` · mínimo ${fmt(rc.minPrice)}` : ''}<br><span class="mut">Abre a Lista de Transferências sozinho.</span>`;
}

// ---------- GALERIA ----------
const galUi = { tab: 'buy', opt: 'buy', per: 'session', from: '', to: '' };
const GAL_OPTS = {
  buy: [['maxPrice', 'Preço máximo por carta', 'Acima disso, pula a carta', 'num', 100], ['maxTotal', 'Gasto máximo total', '0 = sem limite', 'num', 1000],
    ['autoQty', 'Só o que falta', 'Compra o necessário para completar o time', 'sw'], ['qty', 'Quantidade por time', 'Usada com "Só o que falta" desligado', 'num'], ['respectSlots', 'Respeitar as vagas', 'Com quantidade manual, nunca passa do que falta', 'sw']],
  teams: [['autoNext', 'Ir para o próximo time', 'Ao terminar, abre o próximo da lista Set e pula os completos', 'sw'], ['maxSets', 'Máximo de times', '0 = até o fim da liga', 'num']],
  sell: [['list', 'Listar no mais barato', 'Logo depois de comprar (Paletools → Mais barato)', 'sw'], ['minList', 'Não listar abaixo de', '0 = aceita qualquer preço; abaixo disso fica nos não atribuídos', 'num', 100],
    ['cleanFull', 'Limpar quando encher', 'Retira vendidos e envia os não repetidos ao clube', 'sw'], ['cleanEvery', 'Limpar a cada N compras', '0 = desliga', 'num'], ['cleanBetween', 'Limpar ao trocar de time', 'Faz a limpeza entre um time e outro', 'sw']],
  adv: [['delay', 'Pausa entre ações (ms)', 'Mínimo 300', 'num', 100], ['retries', 'Ofertas por carta', 'Se alguém comprar antes, tenta a próxima mais barata', 'num']],
};
PAGES.gal = () => {
  const el = $('p-gal');
  el.innerHTML = `
    <div class="ph"><div><h2>Galeria</h2><p>Compra as cartas que faltam numa galeria do Paletools (até o seu preço) e lista no mais barato. Abra Paletools → Gallery no Web App e escolha a liga e o time.</p></div></div>
    <div class="tabs" id="galTabs"><button data-t="buy">Comprar</button><button data-t="pl">Lucro e vendas</button></div>
    <div id="galBody" style="padding-top:14px"></div>`;
  $('galTabs').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; galUi.tab = b.dataset.t; PAGES.gal(); };
  for (const b of $('galTabs').children) b.classList.toggle('on', b.dataset.t === galUi.tab);
  if (galUi.tab === 'pl') return galProfit();
  $('galBody').innerHTML = `
    <div class="cols">
      <div class="colmain">
        <div class="card">
          <div class="galhead"><div class="galring" id="gRing"><b id="gRingT">–</b></div>
            <div style="flex:1;min-width:0"><h4 id="gSet">Abra a Gallery</h4><p id="gSub">Paletools → Gallery, escolha a liga e o time.</p></div></div>
          <div class="tiles">
            <div class="tile"><small>Faltam comprar</small><b id="gLeft">–</b><span id="gLeftS"></span></div>
            <div class="tile"><small id="gBoughtL">Compradas</small><b id="gBought">0</b><span>nesta rodada</span></div>
            <div class="tile"><small>Gasto</small><b id="gSpent">0</b><span id="gLine"></span></div>
          </div>
        </div>
        <div class="card">
          <div class="ch"><div><h3>Regras</h3><p>Valem para a próxima vez que você clicar em Iniciar.</p></div><button class="btn sm" id="gClean">Limpar a Lista de Transf. agora</button></div>
          <div class="tabs" id="gOptTabs"><button data-o="buy">Compra</button><button data-o="teams">Times</button><button data-o="sell">Venda</button><button data-o="adv">Ajustes</button></div>
          <div id="gOpts"></div>
        </div>
      </div>
      <div class="colside">
        <div class="card"><div class="ch"><h3>Lucro da galeria</h3><button class="link" id="gSeePl">ver tudo</button></div><div id="gPlMini"></div></div>
        <div class="card logcard"><div class="ch"><h3>Log da Galeria</h3><div class="acts"><button class="link" data-logdl="gal">baixar</button><button class="link" data-logclr="gal">limpar</button></div></div>
          <div class="log" data-src="gal"></div></div>
      </div>
    </div>`;
  const drawOpts = () => {
    for (const b of $('gOptTabs').children) b.classList.toggle('on', b.dataset.o === galUi.opt);
    $('gOpts').innerHTML = optRows('g', st.galCfg, GAL_OPTS[galUi.opt]);
    const q = $('gOpts').querySelector('[data-g=qty]'), rs = $('gOpts').querySelector('[data-g=respectSlots]'), ms = $('gOpts').querySelector('[data-g=maxSets]');
    if (q) q.disabled = !!st.galCfg.autoQty; if (rs) rs.disabled = !!st.galCfg.autoQty; if (ms) ms.disabled = !st.galCfg.autoNext;
  };
  $('gOptTabs').onclick = e => { const b = e.target.closest('[data-o]'); if (!b) return; galUi.opt = b.dataset.o; drawOpts(); };
  bindOpts($('gOpts'), 'g', 'galCfg', k => { if (['autoQty', 'autoNext'].includes(k)) drawOpts(); syncBars(); });
  drawOpts();
  $('gClean').onclick = () => act($('gClean'), async () => { await modCmd('gal', 'clean'); toast('Limpando a Lista de Transferências no Web App…', 'good'); });
  $('gSeePl').onclick = () => { galUi.tab = 'pl'; PAGES.gal(); };
  const B = st.galBuys, sold = B.filter(b => b.status === 'sold'), pl = sum(sold, b => net(b.sale) - b.buy);
  $('gPlMini').innerHTML = `<div class="tiles"><div class="tile"><small>Lucro realizado</small><b class="${pl >= 0 ? 'good' : 'bad'}">${fmt(pl)}</b><span>${sold.length} vendida(s)</span></div><div class="tile"><small>Ainda não vendidas</small><b>${B.length - sold.length}</b><span>custo ${fmt(sum(B.filter(b => b.status !== 'sold'), b => b.buy))}</span></div></div>
    <div class="riskwhy">As vendas entram quando você (ou o Relist) abre a Lista de Transferências no Web App.</div>`;
  renderLog(); galLive();
};
function galLive() {
  if (!$('gRing')) return;
  const gs = status && status.gal, g = gs && gs.gallery, G = (gs && gs.G) || {}, test = st.galCfg.dryRun;
  if (g) {
    const p = g.req ? Math.min(100, Math.round(g.sel / g.req * 100)) : 0;
    $('gRing').style.setProperty('--v', p); $('gRingT').textContent = `${g.sel}/${g.req ?? '?'}`;
    $('gSet').textContent = g.set;
    $('gSub').textContent = g.toBuy === 0 ? 'Completa.' : `${g.missingTiles} faltando com botão Mercado${g.ownedUnsel ? ` · ${g.ownedUnsel} sua(s) sem incluir (clique Include nelas)` : ''}`;
    $('gLeft').textContent = g.toBuy ?? '?'; $('gLeftS').textContent = g.pts ? `${fmt(g.pts)} pontos` : '';
  } else {
    $('gRing').style.setProperty('--v', 0); $('gRingT').textContent = '–';
    $('gSet').textContent = status ? 'Abra a Gallery' : 'Web App fechado';
    $('gSub').textContent = 'Paletools → Gallery, escolha a liga e o time.'; $('gLeft').textContent = '–'; $('gLeftS').textContent = '';
  }
  $('gBoughtL').textContent = test ? 'Simuladas' : 'Compradas';
  $('gBought').textContent = fmt(test ? G.sim : G.bought); $('gSpent').textContent = fmt(test ? G.simSpent : G.spent);
  $('gLine').textContent = G.line || '';
}
// período da página de lucro
function galRange() {
  const v = galUi.per, now = Date.now(), day = 864e5;
  if (v === 'session') return [status && status.gal ? status.gal.session : now - 6 * 36e5, Infinity];
  if (v === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); return [+d, Infinity]; }
  if (v === '7d') return [now - 7 * day, Infinity];
  if (v === '30d') return [now - 30 * day, Infinity];
  if (v === 'custom') return [galUi.from ? +new Date(galUi.from) : 0, galUi.to ? +new Date(galUi.to) : Infinity];
  return [0, Infinity];
}
const GST = { sold: 'vendida', listed: 'listada', unlisted: 'não listada' };
function galProfit() {
  const [a, z] = galRange();
  const B = st.galBuys.filter(b => b.t >= a && b.t <= z).sort((x, y) => y.t - x.t);
  const sold = B.filter(b => b.status === 'sold'), open = B.filter(b => b.status !== 'sold');
  const plOf = b => b.status === 'sold' ? net(b.sale) - b.buy : null;
  const money = v => v == null ? '—' : `<span class="${v > 0 ? 'good' : v < 0 ? 'bad' : ''}">${v > 0 ? '+' : ''}${fmt(v)}</span>`;
  const potential = open.filter(b => b.listBN).reduce((s, b) => s + net(b.listBN) - b.buy, 0);
  $('galBody').innerHTML = `
    <div class="flt" style="margin-bottom:12px">
      <select id="gPer" style="width:240px">${[['session', 'Desde que abri o Web App'], ['today', 'Hoje'], ['7d', 'Últimos 7 dias'], ['30d', 'Últimos 30 dias'], ['all', 'Tudo'], ['custom', 'Personalizado…']].map(([v, t]) => `<option value="${v}"${galUi.per === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
      <span id="gCustom" ${galUi.per === 'custom' ? '' : 'hidden'}>de <input type="datetime-local" id="gFrom" value="${galUi.from}"> até <input type="datetime-local" id="gTo" value="${galUi.to}"></span>
      <span class="flex"></span><button class="btn" id="gCsv">Exportar CSV</button><button class="btn danger" id="gWipe">Apagar o período</button></div>
    <div class="grid">
      <div class="tiles">
        <div class="tile"><small>Compradas</small><b>${B.length}</b><span>${fmt(sum(B, b => b.buy))} gastas</span></div>
        <div class="tile"><small>Vendidas</small><b>${sold.length}</b><span>${sold.filter(b => plOf(b) > 0).length} no lucro</span></div>
        <div class="tile"><small>Recebido (−5% do EA)</small><b>${fmt(sum(sold, b => net(b.sale)))}</b></div>
        <div class="tile"><small>Lucro realizado</small><b>${money(sum(sold, plOf))}</b></div>
        <div class="tile"><small>Ainda não vendidas</small><b>${open.length}</b><span>custo ${fmt(sum(open, b => b.buy))}</span></div>
        <div class="tile"><small>Se vender as listadas</small><b>${money(potential)}</b><span>pelo preço imediato</span></div>
      </div>
      <div class="card"><div class="tbl" style="max-height:calc(100vh - 420px)">${B.length ? `<table>
        <tr><th>Compra</th><th>Jogador</th><th>Time</th><th class="r">Pago</th><th class="r">Listada</th><th class="r">Vendida por</th><th class="r">Lucro</th><th>Situação</th><th></th></tr>
        ${B.map(b => `<tr><td>${esc(dfmt(b.t))}</td><td>${esc(b.name)} ${b.rating || ''}</td><td>${esc(b.set || '')}</td><td class="r">${fmt(b.buy)}</td><td class="r">${b.listBN ? fmt(b.listBN) : '—'}</td><td class="r">${b.sale ? fmt(b.sale) : '—'}</td><td class="r">${money(plOf(b))}</td><td>${GST[b.status] || b.status}${b.soldAt ? ' · ' + esc(dfmt(b.soldAt)) : ''}</td>
          <td style="white-space:nowrap">${b.status === 'sold' ? `<button data-e="undo" data-id="${b.id}">desfazer</button>` : `<button data-e="sell" data-id="${b.id}">marcar venda</button>`} <button data-e="del" data-id="${b.id}" title="Tirar do histórico">✕</button></td></tr>`).join('')}
      </table>` : '<div class="empty">Nenhuma compra da galeria neste período.</div>'}</div></div>
      <div class="riskwhy">As vendas são reconhecidas quando a Lista de Transferências é aberta no Web App (itens vendidos). Se alguma não for, use "marcar venda". O período é pela data da compra.</div>
    </div>`;
  $('gPer').onchange = () => {
    galUi.per = $('gPer').value;
    if (galUi.per === 'custom' && !galUi.from) { const iso = t => new Date(t - new Date(t).getTimezoneOffset() * 6e4).toISOString().slice(0, 16); galUi.from = iso(Date.now() - 864e5); galUi.to = iso(Date.now()); }
    galProfit();
  };
  if ($('gFrom')) { $('gFrom').onchange = () => { galUi.from = $('gFrom').value; galProfit(); }; $('gTo').onchange = () => { galUi.to = $('gTo').value; galProfit(); }; }
  const edit = async m => {
    try { await modCmd('gal', 'edit', m); }
    catch {   // Web App fechado: edita direto
      const b = st.galBuys.find(y => y.id === m.id);
      if (m.edit === 'sell' && b) Object.assign(b, { status: 'sold', sale: m.sale, soldAt: Date.now(), manual: true });
      if (m.edit === 'undo' && b) { b.status = b.listBN ? 'listed' : 'unlisted'; delete b.sale; delete b.soldAt; }
      if (m.edit === 'del') st.galBuys = st.galBuys.filter(y => y.id !== m.id);
      if (m.edit === 'wipe') st.galBuys = st.galBuys.filter(y => !(y.t >= m.from && y.t <= (m.to ?? Infinity)));
      save('galBuys');
    }
    setTimeout(() => { if (page === 'gal' && galUi.tab === 'pl') galProfit(); }, 300);
  };
  $('galBody').onclick = e => {
    const b = e.target.closest('[data-e]'); if (!b) return;
    const rec = st.galBuys.find(y => y.id === b.dataset.id); if (!rec) return;
    if (b.dataset.e === 'sell') { const v = num(prompt(`Por quanto ${rec.name} foi vendida? (valor cheio, antes dos 5% do EA)`, rec.listBN || '')); if (v) edit({ edit: 'sell', id: rec.id, sale: v }); }
    if (b.dataset.e === 'undo') edit({ edit: 'undo', id: rec.id });
    if (b.dataset.e === 'del' && confirm('Tirar esta compra do histórico?')) edit({ edit: 'del', id: rec.id });
  };
  $('gWipe').onclick = () => { if (confirm('Apagar as compras da galeria deste período?')) edit({ edit: 'wipe', from: a, to: z === Infinity ? null : z }); };
  $('gCsv').onclick = () => {
    const head = 'Data da compra;Jogador;Overall;Time;Pago;Listada inicial;Listada imediato;Vendida por;Recebido (-5%);Lucro/perda;Situação;Data da venda';
    const lines = B.slice().reverse().map(b => [new Date(b.t).toLocaleString(FSB.loc()), b.name, b.rating ?? '', b.set || '', b.buy, b.listStart ?? '', b.listBN ?? '', b.sale ?? '', b.sale ? net(b.sale) : '', plOf(b) ?? '', GST[b.status] || b.status, b.soldAt ? new Date(b.soldAt).toLocaleString(FSB.loc()) : ''].map(v => String(v).replace(/;/g, ',')).join(';'));
    download('fut-bots-galeria-lucro.csv', [head, ...lines].join('\r\n'), 'text/csv');
  };
}

// ---------- RELIST ----------
PAGES.rel = () => {
  const el = $('p-rel');
  el.innerHTML = `
    <div class="ph"><div><h2>Relist</h2><p>Abre a Lista de Transferências, retira os vendidos e anuncia de novo os itens parados pelo "Mais barato" do Paletools.</p></div></div>
    <div class="cols">
      <div class="colmain">
        <div class="card"><div class="ch"><div><h3>O que relistar</h3><p>Anúncios ativos e vendidos nunca são mexidos.</p></div></div>
          ${optRows('r', st.relCfg, [['expired', 'Expirados', 'Itens cujo anúncio acabou sem venda', 'sw'], ['unassigned', 'Não listados', 'Itens parados na Lista de Transferências sem anúncio', 'sw'], ['clearSold', 'Retirar vendidos', 'Clica em "Retirar vendidos" antes e depois (as moedas já caíram)', 'sw']])}
        </div>
        <div class="card"><div class="ch"><div><h3>Limites</h3></div></div>
          ${optRows('r', st.relCfg, [['minPrice', 'Preço mínimo para listar', 'Se o mais barato estiver abaixo, o item fica parado · 0 = sem mínimo', 'num', 50], ['maxItems', 'Máximo de itens por rodada', '0 = todos', 'num'], ['delay', 'Pausa entre ações (ms)', 'Mínimo 300', 'num', 100]])}
        </div>
        <div class="riskwhy">Dica: com a Galeria ou o Snipe vendendo no mais barato, rode o Relist de vez em quando para reanunciar o que expirou e registrar as vendas da Galeria.</div>
      </div>
      <div class="colside">
        <div class="card logcard"><div class="ch"><h3>Log do Relist</h3><div class="acts"><button class="link" data-logdl="rel">baixar</button><button class="link" data-logclr="rel">limpar</button></div></div>
          <div class="log" data-src="rel"></div></div>
      </div>
    </div>`;
  bindOpts(el, 'r', 'relCfg', () => syncBars());
  renderLog();
};

// ---------- FERRAMENTAS ----------
PAGES.tools = () => {
  const el = $('p-tools'), c = st.cfg, busyO = owner();
  const dis = busyO ? 'disabled' : '';
  el.innerHTML = `
    <div class="ph"><div><h2>Ferramentas</h2><p>Ações de uma vez só para organizar o clube e as listas. Cada uma roda quando você clica.</p></div></div>
    <div class="cols">
      <div class="colmain">
        <div class="card"><div class="ch"><div><h3>Não atribuídos</h3><p>Abre os não atribuídos e organiza item por item.</p></div><button class="btn acc" data-op="unassigned" ${dis}>Organizar agora</button></div>
          <div class="opts">
            <div class="opt"><div class="l"><b>Não repetidos vão para o clube</b><span>Cartas que você ainda não tem</span></div><label class="tg"><input type="checkbox" id="uaClub" ${c.uaClub ? 'checked' : ''}><span></span></label></div>
            <div class="opt"><div class="l"><b>Repetidos</b><span>Cartas que já estão no clube</span></div>
              <div class="seg" id="uaDup"><button data-v="tl">Lista de transf.</button><button data-v="sell">Vender no mais barato</button><button data-v="keep">Deixar</button></div></div>
          </div>
        </div>
        <div class="card"><div class="ch"><div><h3>Lista de Transferências</h3><p>Ações rápidas na lista.</p></div></div>
          <div class="row"><button class="btn" data-op="tlToClub" ${dis}>Enviar não repetidos ao clube</button><button class="btn" data-op="clearSold" ${dis}>Retirar vendidos (e registrar o lucro)</button><button class="btn" data-goto="rel">Relistar…</button></div>
        </div>
        <div class="card"><div class="ch"><div><h3>Recompensas</h3><p>Procura botões de resgatar na tela atual e em Objetivos. Experimental: me avise se não achar alguma.</p></div><button class="btn" data-op="claim" ${dis}>Resgatar recompensas</button></div></div>
      </div>
      <div class="colside">
        <div class="card logcard"><div class="ch"><h3>Log das Ferramentas</h3><div class="acts"><button class="link" data-logdl="tools">baixar</button><button class="link" data-logclr="tools">limpar</button></div></div>
          <div class="log" data-src="tools"></div></div>
      </div>
    </div>`;
  const segSync = () => { for (const b of $('uaDup').children) b.classList.toggle('on', b.dataset.v === (st.cfg.uaDup || 'tl')); };
  segSync();
  $('uaDup').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; st.cfg.uaDup = b.dataset.v; saveCfg(); segSync(); };
  $('uaClub').onchange = () => { st.cfg.uaClub = $('uaClub').checked; saveCfg(); };
  el.onclick = e => {
    const b = e.target.closest('[data-op]'); if (!b || b.disabled) return;
    act(b, async () => { await modCmd('tools', b.dataset.op); toast('Ferramenta iniciada no Web App.', 'good'); });
  };
  renderLog();
};

// ---------- MEU CLUBE ----------
const saveClub = () => store.set({ clubCfg: st.clubCfg });
const clubUi = { q: '', qual: '', trade: 'yes', pos: '', min: '', max: '', squad: '', gain: '', sel: new Set(), sort: 'rating' };
const qualOf = r => r >= 75 ? 'gold' : r >= 65 ? 'silver' : 'bronze';
const clubProfit = p => p.price ? net(p.price) - (p.buy || 0) : null;
const clubAll = () => (st.club && st.club.players) || [];
function clubRows() {
  const u = clubUi, q = norm(u.q).toLowerCase();
  return clubAll().filter(p => (!q || p.name.toLowerCase().includes(q)) && (!u.qual || qualOf(p.rating) === u.qual)
    && (!u.pos || p.pos === u.pos) && (!u.min || p.rating >= +u.min) && (!u.max || p.rating <= +u.max)
    && (!u.trade || (u.trade === 'yes') === !p.untradeable)
    && (!u.squad || (u.squad === 'in') === !!p.inSquad) && (u.gain === '' || (clubProfit(p) ?? -Infinity) >= +u.gain))
    .sort((a, b) => (u.sort === 'price' ? (b.price || 0) - (a.price || 0) : u.sort === 'buy' ? (b.buy || 0) - (a.buy || 0) : u.sort === 'profit' ? (clubProfit(b) ?? -Infinity) - (clubProfit(a) ?? -Infinity) || 0 : 0) || (b.rating || 0) - (a.rating || 0) || a.name.localeCompare(b.name));
}
const clubPic = p => { if (/portraits/.test(p.img || '')) return p.img; const e = (p.def && { id: p.def }) || PDB.find(p.name, p.rating); return e ? PDB.portrait(e.id) : ''; };
// carta desenhada pela extensão: cor pela qualidade, com nota e posição
const miniCard = p => `<span class="fc q-${qualOf(p.rating)}" data-notr><b>${esc(p.rating)}</b><i>${esc(p.pos || '')}</i>${playerPic(clubPic(p), p.name)}</span>`;
const clubPicked = () => clubAll().filter(p => clubUi.sel.has(p.key));
const clubCount = () => clubPicked().reduce((a, p) => a + (p.n || 1), 0);
function clubTable() {
  if (!$('cRows')) return;
  const keys = new Set(clubAll().map(p => p.key));
  for (const k of clubUi.sel) if (!keys.has(k)) clubUi.sel.delete(k);
  const all = clubAll(), rows = clubRows(), c = st.club;
  const sel = $('cPos'), cur = clubUi.pos;
  sel.innerHTML = `<option value="">${tr('Todas as posições')}</option>` + [...new Set(all.map(p => p.pos).filter(Boolean))].sort().map(p => `<option value="${esc(p)}"${p === cur ? ' selected' : ''}>${esc(p)}</option>`).join('');
  $('cInfo').textContent = c ? `${fmt(all.reduce((a, p) => a + (p.n || 1), 0))} ${tr('jogadores')} · ${new Date(c.t).toLocaleString(FSB.loc())}${c.partial ? ' · ' + tr('lista incompleta') : ''}` : tr('Ainda não analisado');
  $('cRows').innerHTML = rows.map(p => {
    const lock = p.untradeable, pr = clubProfit(p);
    return `<tr><td><input type="checkbox" data-k="${esc(p.key)}" ${clubUi.sel.has(p.key) ? 'checked' : ''} ${lock ? 'disabled' : ''}></td><td class="r">${esc(p.rating)}</td><td data-notr><div class="pl">${miniCard(p)}<span>${esc(p.name)}${p.n > 1 ? ` ×${p.n}` : ''}</span></div></td><td data-notr>${esc(p.pos)}</td><td class="r">${p.buy ? fmt(p.buy) : '<span class="mut">–</span>'}</td><td class="r"${p.priceT ? ` title="${esc(new Date(p.priceT).toLocaleString(FSB.loc()))}"` : ''}>${p.price ? `<b>${fmt(p.price)}</b>` : p.none ? `<span class="mut">${tr('sem oferta')}</span>` : '<span class="mut">–</span>'}</td><td class="r ${pr > 0 ? 'good' : pr < 0 ? 'bad' : ''}">${pr == null ? '<span class="mut">–</span>' : fmt(pr)}</td><td>${p.untradeable ? `<span class="tag">${tr('Inegociável')}</span>` : p.inSquad ? `<span class="tag warn">${tr('No time')}</span>` : `<span class="tag good">${tr('Negociável')}</span>`}</td><td class="acts2"><button data-row="snipe" data-k="${esc(p.key)}" title="${tr('Snipar este jogador')}">${ico('snipe')}</button>${p.def ? `<button data-row="watch" data-k="${esc(p.key)}" title="${tr('Acompanhar e ver o gráfico')}">${ico('market')}</button>` : ''}</td></tr>`;
  }).join('') || `<tr><td colspan="9"><div class="empty">${tr(c ? 'Nenhuma carta com esses filtros.' : 'Clique em Analisar clube para listar seus jogadores.')}</div></td></tr>`;
  clubLive();
}
function clubLive() {
  if (!$('cSell')) return;
  const o = owner(), n = clubCount(), R = status && status.club && status.club.R, cfg = st.clubCfg;
  $('cSelN').textContent = fmt(n);
  const priced = clubPicked().filter(p => p.price), est = priced.reduce((a, p) => a + net(p.price) * (p.n || 1), 0);
  const gain = priced.reduce((a, p) => a + clubProfit(p) * (p.n || 1), 0);
  $('cEst').textContent = priced.length ? `${tr('Valor estimado')}: ${fmt(est)} · ${tr('Lucro estimado')}: ${fmt(gain)} (${tr('já tirando os 5% do EA')})` : '';
  $('cPriceBtn').disabled = !!o || !n;
  $('cProg').textContent = o === 'club' && R && R.line ? R.line : '';
  for (const b of $('cMode').children) { b.classList.toggle('on', (b.dataset.v === 'test') === !!cfg.dryRun); b.disabled = !!o; }
  for (const b of $('cHow').children) { b.classList.toggle('on', b.dataset.v === cfg.how); b.disabled = !!o; }
  $('cFixed').hidden = cfg.how !== 'fixed'; $('cMinF').hidden = cfg.how === 'fixed';
  $('cScan').disabled = !!o;
  $('cSell').disabled = $('cTL').disabled = !!o || !n;
  $('cSell').textContent = tr(cfg.dryRun ? 'Testar venda' : 'Vender selecionadas');
  $('cTL').textContent = tr(cfg.dryRun ? 'Testar envio' : 'Enviar para a Lista de Transferências');
  for (const b of document.querySelectorAll('#p-club [data-nav]')) b.disabled = !!o;
}
// abre o Sniper com o jogador e um degrau abaixo do menor preço
function clubSnipe(p) {
  const e = PDB.find(p.name, p.rating);
  st.draft = { player: e ? e.name : p.name, playerRating: p.rating, sel: {}, prices: null };
  save('draft');
  if (p.price) { st.cfg.mode = 'price'; st.cfg.maxBuy = ladderPrev(p.price) || p.price; saveCfg(); refreshInputs(); sync(); }
  go('sniper'); renderFilterGrid();
  toast(`${p.name}: filtro pronto no Sniper.`, 'good');
}
async function clubPrices() {
  const list = clubPicked();
  if (list.length > 20 && !confirm(L(`Buscar o preço de ${list.length} cartas? Cada carta é uma busca no mercado e leva alguns segundos.`, `Look up ${list.length} cards? Each card is one market search and takes a few seconds.`, `¿Buscar el precio de ${list.length} cartas? Cada carta es una búsqueda en el mercado y tarda unos segundos.`))) return;
  await modCmd('club', 'price', { items: list.map(p => ({ key: p.key, n: 1 })) });
  toast('Ferramenta iniciada no Web App.', 'good');
}
async function clubRun(op) {
  const cfg = st.clubCfg, n = clubCount();
  const items = clubPicked().map(p => ({ key: p.key, n: p.n || 1 }));
  const fixed = op === 'sell' && cfg.how === 'fixed';
  if (fixed && !(cfg.price >= 200)) { toast('Informe um preço de venda de pelo menos 200.', 'bad'); return; }
  if (!cfg.dryRun) {
    const what = op === 'toTL' ? L(`Enviar ${n} carta(s) para a Lista de Transferências?`, `Send ${n} card(s) to the Transfer List?`, `¿Enviar ${n} carta(s) a la lista de transferibles?`)
      : fixed ? L(`Vender ${n} carta(s) por ${fmt(cfg.price)} cada?`, `Sell ${n} card(s) for ${fmt(cfg.price)} each?`, `¿Vender ${n} carta(s) por ${fmt(cfg.price)} cada una?`)
      : L(`Vender ${n} carta(s) no mais barato do mercado?`, `Sell ${n} card(s) at the lowest market price?`, `¿Vender ${n} carta(s) al precio más bajo del mercado?`);
    if (!confirm(what)) return;
  }
  await modCmd('club', op, { items, price: fixed ? cfg.price : 0 });
  toast('Ferramenta iniciada no Web App.', 'good');
}
PAGES.club = () => {
  const el = $('p-club'), u = clubUi, cfg = st.clubCfg;
  el.innerHTML = `
    <div class="ph"><div><h2>Meu clube</h2><p>Lê os jogadores do seu clube. Depois selecione as cartas e venda ou envie para a Lista de Transferências. O bot abre as telas sozinho.</p></div></div>
    <div class="cols">
      <div class="colmain">
        <div class="card">
          <div class="ch"><div><h3>Jogadores</h3><p id="cInfo" data-notr></p></div><button class="btn acc" id="cScan">Analisar clube</button></div>
          <div class="clubf">
            <input type="text" id="cQ" placeholder="Buscar jogador" value="${esc(u.q)}">
            <select id="cQual"><option value="">Todas as qualidades</option><option value="gold">Ouro</option><option value="silver">Prata</option><option value="bronze">Bronze</option></select>
            <select id="cPos"></select>
            <select id="cTrade"><option value="yes">Negociáveis</option><option value="no">Inegociáveis</option><option value="">Todas</option></select>
            <input type="number" id="cMin" placeholder="Geral mín." min="1" max="99" value="${esc(u.min)}">
            <input type="number" id="cMax" placeholder="Geral máx." min="1" max="99" value="${esc(u.max)}">
            <select id="cSquad"><option value="">Com e sem time</option><option value="out">Fora do time ativo</option><option value="in">No time ativo</option></select>
            <input type="number" id="cGain" placeholder="Lucro mín." step="50" value="${esc(u.gain)}">
          </div>
          <div class="row"><button class="btn sm" id="cAll">Selecionar as filtradas</button><button class="btn sm" id="cNone">Limpar seleção</button><span class="flex"></span><button class="btn sm" data-rule="gain">Só com lucro</button><button class="btn sm" data-rule="cheap">Bronzes e pratas</button><button class="btn sm" data-rule="idle">Paradas de maior valor</button><button class="btn sm" data-rule="clear">Limpar filtros</button><button class="btn sm" id="cCsv">Exportar CSV</button></div>
          <div class="tbl clubt"><table><thead><tr><th></th><th class="r">Nota</th><th>Jogador</th><th>Posição</th><th class="r sortable" data-sort="buy" title="Último valor pago por essa carta. Vazio em cartas de pacote ou recompensa.">Comprei</th><th class="r sortable" data-sort="price" title="Menor preço atual do mercado">Venda</th><th class="r sortable" data-sort="profit" title="Venda menos os 5% do EA, menos o que você pagou">Lucro</th><th>Status</th><th></th></tr></thead><tbody id="cRows"></tbody></table></div>
        </div>
      </div>
      <div class="colside">
        <div class="card">
          <div class="ch"><div><h3>Ação</h3><p><b id="cSelN">0</b> <span>selecionada(s)</span></p></div></div>
          <button class="btn acc" id="cPriceBtn" title="Pergunta o preço direto ao Web App, sem abrir telas. Cada carta conta como uma busca no mercado.">Buscar menor preço</button>
          <label class="tg"><input type="checkbox" id="cDeep" ${cfg.deep ? 'checked' : ''}><span></span>Busca precisa <small>até 4 buscas por carta</small></label>
          <div class="riskwhy" id="cEst" data-notr></div>
          <div class="seg run" id="cMode"><button data-v="test">Teste</button><button data-v="real">De verdade</button></div>
          <div class="field"><label>Preço de venda</label><div class="seg" id="cHow"><button data-v="cheapest">Mais barato</button><button data-v="fixed">Preço fixo</button></div></div>
          <div class="field" id="cFixed"><label>Comprar já de cada carta</label><input type="number" id="cPrice" min="200" step="50" value="${cfg.price || ''}"></div>
          <div class="field" id="cMinF"><label>Não vender abaixo de <i title="0 = aceita qualquer preço">?</i></label><input type="number" id="cMinP" min="0" step="50" value="${cfg.minPrice || 0}"></div>
          <button class="go" id="cSell">Vender selecionadas</button>
          <button class="btn" id="cTL">Enviar para a Lista de Transferências</button>
          <div class="riskwhy" id="cProg" data-notr></div>
          <div class="riskwhy">O mais barato segue Configurações → Menor preço do mercado (Paletools, se estiver ativo).</div>
        </div>
        <div class="card"><div class="ch"><div><h3>Ir para</h3><p>Abre a tela no Web App.</p></div></div>
          <div class="row wrap">
            <button class="btn sm" data-nav="home">Início</button><button class="btn sm" data-nav="club">Jogadores do clube</button><button class="btn sm" data-nav="market">Pesquisar no Mercado</button><button class="btn sm" data-nav="tl">Lista de Transferências</button><button class="btn sm" data-nav="unassigned">Não atribuídos</button>
          </div></div>
        <div class="card logcard"><div class="ch"><h3>Log do Clube</h3><div class="acts"><button class="link" data-logdl="club">baixar</button><button class="link" data-logclr="club">limpar</button></div></div>
          <div class="log" data-src="club"></div></div>
      </div>
    </div>`;
  $('cQual').value = u.qual; $('cTrade').value = u.trade; $('cSquad').value = u.squad;
  const bind = (id, k) => { $(id).oninput = () => { u[k] = $(id).value; clubTable(); }; };
  bind('cQ', 'q'); bind('cQual', 'qual'); bind('cPos', 'pos'); bind('cTrade', 'trade'); bind('cMin', 'min'); bind('cMax', 'max'); bind('cSquad', 'squad'); bind('cGain', 'gain');
  $('cRows').onchange = e => { const k = e.target.dataset.k; if (!k) return; if (e.target.checked) u.sel.add(k); else u.sel.delete(k); clubLive(); };
  $('cAll').onclick = () => { for (const p of clubRows()) if (!p.untradeable && !p.inSquad) u.sel.add(p.key); clubTable(); };
  $('cNone').onclick = () => { u.sel.clear(); clubTable(); };
  // regras prontas: só preenchem os filtros; a venda continua sendo você quem confirma
  el.querySelector('.clubf').parentElement.addEventListener('click', e => {
    const b = e.target.closest('[data-rule]'); if (!b) return;
    Object.assign(u, { qual: '', squad: '', gain: '', min: '', max: '', trade: 'yes', sort: 'rating' });
    if (b.dataset.rule === 'gain') { u.gain = '1'; u.sort = 'profit'; }
    if (b.dataset.rule === 'cheap') u.max = '74';
    if (b.dataset.rule === 'idle') { u.squad = 'out'; u.sort = 'price'; }
    for (const [id, k] of [['cQual', 'qual'], ['cSquad', 'squad'], ['cGain', 'gain'], ['cMin', 'min'], ['cMax', 'max'], ['cTrade', 'trade']]) $(id).value = u[k];
    clubTable();
  });
  $('cCsv').onclick = () => {
    const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const lines = [['Jogador', 'Nota', 'Posição', 'Comprei', 'Venda', 'Lucro', 'Negociável', 'No time ativo'].map(q).join(';'),
      ...clubRows().map(p => [p.name, p.rating, p.pos, p.buy || '', p.price || '', clubProfit(p) ?? '', p.untradeable ? 'não' : 'sim', p.inSquad ? 'sim' : 'não'].map(q).join(';'))];
    download('fut-bots-clube.csv', '\ufeff' + lines.join('\r\n'), 'text/csv');
  };
  $('cRows').onclick = e => {
    const b = e.target.closest('[data-row]'); if (!b) return;
    const p = clubAll().find(x => x.key === b.dataset.k); if (!p) return;
    if (b.dataset.row === 'snipe') clubSnipe(p);
    else { watchUi.def = p.def; addWatch({ id: p.def, name: p.name, r: p.rating }); go('watch'); }
  };
  $('cDeep').onchange = () => { st.clubCfg.deep = $('cDeep').checked; saveClub(); };
  $('cScan').onclick = () => act($('cScan'), async () => { await modCmd('club', 'scan'); toast('Ferramenta iniciada no Web App.', 'good'); });
  $('cPriceBtn').onclick = () => act(null, clubPrices);
  el.querySelector('.clubt thead').onclick = e => { const k = e.target.dataset.sort; if (!k) return; u.sort = u.sort === k ? 'rating' : k; clubTable(); };
  $('cSell').onclick = () => act(null, () => clubRun('sell'));
  $('cTL').onclick = () => act(null, () => clubRun('toTL'));
  $('cMode').onclick = e => {
    const b = e.target.closest('[data-v]'); if (!b || owner()) return;
    const test = b.dataset.v === 'test';
    if (!test && st.clubCfg.dryRun && !confirm('Agir de verdade?\n\nO bot vai vender ou mover as cartas selecionadas. Teste antes no modo Teste.')) return;
    st.clubCfg.dryRun = test; saveClub(); clubLive();
  };
  $('cHow').onclick = e => { const b = e.target.closest('[data-v]'); if (!b || owner()) return; st.clubCfg.how = b.dataset.v; saveClub(); clubLive(); };
  $('cPrice').onchange = () => { st.clubCfg.price = ladderDown(+$('cPrice').value || 0); $('cPrice').value = st.clubCfg.price; saveClub(); };
  $('cMinP').onchange = () => { st.clubCfg.minPrice = Math.max(0, +$('cMinP').value || 0); saveClub(); };
  el.querySelector('.row.wrap').onclick = e => { const b = e.target.closest('[data-nav]'); if (b) act(b, async () => { await modCmd('club', 'goto', { where: b.dataset.nav }); }); };
  clubTable(); renderLog();
};

// ---------- TRANSFERÊNCIAS ----------
const TL_ST = { active: ['À venda', 'good'], sold: ['Vendida', 'good'], expired: ['Expirada', 'warn'], inactive: ['Não listada', ''], other: ['Outro', ''] };
const tlCard = i => miniCard({ ...i, pos: '', def: i.def });
function tlTable() {
  if (!$('tRows')) return;
  const items = (st.tl && st.tl.items) || [], t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const pl = from => sum(st.sales.filter(x => x.t >= from), x => net(x.sale) - x.buy);
  const count = s => items.filter(i => i.state === s).length;
  $('tTiles').innerHTML = [['À venda', count('active')], ['Expiradas', count('expired')], ['Vendidas na lista', count('sold')]].map(([a, b]) => `<div class="tile"><small>${tr(a)}</small><b>${fmt(b)}</b></div>`).join('')
    + [['Lucro real hoje', pl(+t0)], ['Lucro real 7 dias', pl(Date.now() - 7 * DAY)], ['Lucro real total', pl(0)]].map(([a, b]) => `<div class="tile"><small>${tr(a)}</small><b class="${b >= 0 ? 'good' : 'bad'}">${fmt(b)}</b></div>`).join('');
  $('tInfo').textContent = st.tl ? `${tr('Atualizada')}: ${new Date(st.tl.t).toLocaleString(FSB.loc())}` : tr('Clique em Atualizar para ler a lista.');
  $('tRows').innerHTML = items.map(i => {
    const price = i.state === 'sold' ? i.bid : i.bin, g = price ? net(price) - i.buy : null, s = TL_ST[i.state] || TL_ST.other;
    return `<tr><td data-notr><div class="pl">${tlCard(i)}<span>${esc(i.name)}</span></div></td><td><span class="tag ${s[1]}">${tr(s[0])}</span></td><td class="r">${i.buy ? fmt(i.buy) : '–'}</td><td class="r">${price ? fmt(price) : '–'}</td><td class="r ${g > 0 ? 'good' : g < 0 ? 'bad' : ''}">${g == null ? '–' : fmt(g)}</td><td class="r">${i.left > 0 ? `${Math.ceil(i.left / 60)} min` : ''}</td></tr>`;
  }).join('') || `<tr><td colspan="6"><div class="empty">${tr('Nada na lista.')}</div></td></tr>`;
  $('tSales').innerHTML = st.sales.slice(-200).reverse().map(x => { const g = net(x.sale) - x.buy; return `<tr><td>${esc(dfmt(x.t))}</td><td data-notr>${esc(x.name)} ${esc(x.rating)}</td><td class="r">${x.buy ? fmt(x.buy) : '–'}</td><td class="r">${fmt(x.sale)}</td><td class="r ${g > 0 ? 'good' : g < 0 ? 'bad' : ''}">${fmt(g)}</td></tr>`; }).join('') || `<tr><td colspan="5"><div class="empty">${tr('Nenhuma venda registrada ainda.')}</div></td></tr>`;
}
PAGES.tl = () => {
  $('p-tl').innerHTML = `
    <div class="ph"><div><h2>Transferências</h2><p>A Lista de Transferências sem sair do painel, com o lucro real de cada venda (já tirando os 5% do EA).</p></div><span class="flex"></span><button class="btn acc" id="tRef">Atualizar</button></div>
    <div class="grid">
      <div class="tiles" id="tTiles"></div>
      <div class="g2">
        <div class="card"><div class="ch"><div><h3>Lista agora</h3><p id="tInfo" data-notr></p></div></div>
          <div class="tbl tlt"><table><thead><tr><th>Jogador</th><th>Situação</th><th class="r">Comprei</th><th class="r">Preço</th><th class="r">Lucro</th><th class="r">Resta</th></tr></thead><tbody id="tRows"></tbody></table></div></div>
        <div class="card"><div class="ch"><h3>Vendas registradas</h3></div>
          <div class="tbl tlt"><table><thead><tr><th>Quando</th><th>Jogador</th><th class="r">Comprei</th><th class="r">Vendi</th><th class="r">Lucro</th></tr></thead><tbody id="tSales"></tbody></table></div></div>
      </div>
    </div>`;
  $('tRef').onclick = () => act($('tRef'), () => modCmd('club', 'tl'));
  tlTable();
  if (status && !owner()) modCmd('club', 'tl').catch(() => {});
};

// ---------- ACOMPANHAR ----------
const watchUi = { def: null };
function addWatch(p, target = 0) {
  if (!p.id || st.watch.some(w => w.def === p.id)) return;
  st.watch.push({ def: p.id, name: p.name, rating: p.r, target });
  save('watch');
}
function watchTable() {
  if (!$('wRows')) return;
  $('wRows').innerHTML = st.watch.map(w => {
    const r = st.watchRes[w.def] || {}, hit = r.p != null && w.target && r.p <= w.target;
    return `<tr class="${watchUi.def === w.def ? 'on' : ''}" data-d="${w.def}"><td data-notr><div class="pl">${playerPic(PDB.portrait(w.def), w.name)}<span>${esc(w.name)}</span></div></td><td class="r">${esc(w.rating)}</td><td class="r"><input type="number" data-t="${w.def}" min="0" step="50" value="${w.target || ''}" placeholder="0"></td><td class="r">${r.p != null ? `<b>${fmt(r.p)}</b>` : '–'}${hit ? ` <span class="tag good">${tr('no alvo')}</span>` : ''}</td><td>${r.t ? esc(dfmt(r.t)) : ''}</td><td class="acts2"><button data-x="${w.def}" title="${tr('Remover')}">✕</button></td></tr>`;
  }).join('') || `<tr><td colspan="6"><div class="empty">${tr('Busque um jogador acima para acompanhar.')}</div></td></tr>`;
  const w = st.watch.find(x => x.def === watchUi.def), h = (st.priceHist[watchUi.def] || []);
  const hist = Object.keys(st.priceHist).length;
  $('wTitle').textContent = w ? w.name : (hist ? tr('Selecione um jogador') : tr('Histórico de preço'));
  if (watchUi.def) lineChart($('wChart'), h, { label: 'preço' }); else $('wChart').innerHTML = `<div class="empty">${tr('Clique num jogador para ver o histórico. Cada busca de preço gera um ponto.')}</div>`;
  const last = h.slice(-8).reverse();
  $('wPts').innerHTML = last.map(p => `<tr><td>${esc(dfmt(p.t))}</td><td class="r">${fmt(p.v)}</td></tr>`).join('');
}
PAGES.watch = () => {
  const c = st.cfg;
  $('p-watch').innerHTML = `
    <div class="ph"><div><h2>Acompanhar</h2><p>Avisa quando um jogador chega no preço que você quer e guarda o histórico de preço.</p></div></div>
    <div class="cols">
      <div class="colmain">
        <div class="card"><div class="ch"><div><h3>Jogadores</h3><p>Cada jogador é uma busca no mercado a cada conferência.</p></div><button class="btn acc" id="wNow">Conferir agora</button></div>
          <input type="text" id="wQ" placeholder="Buscar jogador (3 letras)">
          <div class="sugg" id="wSugg" data-notr></div>
          <div class="tbl"><table><thead><tr><th>Jogador</th><th class="r">Nota</th><th class="r">Alvo</th><th class="r">Último preço</th><th>Quando</th><th></th></tr></thead><tbody id="wRows"></tbody></table></div>
        </div>
        <div class="card"><div class="ch"><h3 id="wTitle" data-notr></h3></div><div id="wChart"></div>
          <div class="tbl"><table><tbody id="wPts"></tbody></table></div></div>
      </div>
      <div class="colside">
        <div class="card"><div class="ch"><h3>Conferência automática</h3></div>
          <label class="tg"><input type="checkbox" id="wOn" ${c.watchOn ? 'checked' : ''}><span></span>Conferir sozinho <small>desligado por padrão</small></label>
          <div class="field"><label>Intervalo em minutos (mínimo 10)</label><input type="number" id="wMin" min="10" value="${c.watchMin}"></div>
          <div class="riskwhy">Só roda com o Web App aberto e livre, e respeita o limite de buscas em 24 h. Mais jogadores e intervalos curtos aumentam o risco de limite do EA.</div>
        </div>
      </div>
    </div>`;
  $('wOn').onchange = () => { st.cfg.watchOn = $('wOn').checked; saveCfg(); };
  $('wMin').onchange = () => { st.cfg.watchMin = Math.max(10, +$('wMin').value || 15); $('wMin').value = st.cfg.watchMin; saveCfg(); };
  $('wNow').onclick = () => act($('wNow'), async () => { if (!st.watch.length) throw new Error('Busque um jogador acima para acompanhar.'); await modCmd('club', 'watch'); toast('Ferramenta iniciada no Web App.', 'good'); });
  let tq;
  $('wQ').oninput = () => { clearTimeout(tq); tq = setTimeout(() => {
    const list = PDB.search($('wQ').value, 12);
    $('wSugg').classList.toggle('pics', list.length > 0);
    $('wSugg').innerHTML = list.map((p, i) => `<button data-i="${i}">${playerPic(PDB.portrait(p.id), p.name)}<span>${esc(p.name)}<small>#${p.id}</small></span><b>${p.r}</b></button>`).join('');
    $('wSugg').onclick = e => { const b = e.target.closest('button'); if (!b) return; const p = list[+b.dataset.i]; watchUi.def = p.id; addWatch(p); $('wSugg').innerHTML = ''; $('wQ').value = ''; watchTable(); };
  }, 180); };
  $('wRows').onclick = e => {
    const x = e.target.closest('[data-x]');
    if (x) { st.watch = st.watch.filter(w => w.def !== +x.dataset.x); save('watch'); watchTable(); return; }
    if (e.target.closest('input')) return;
    const r = e.target.closest('[data-d]'); if (r) { watchUi.def = +r.dataset.d; watchTable(); }
  };
  $('wRows').onchange = e => { const k = e.target.dataset.t; if (!k) return; const w = st.watch.find(v => v.def === +k); if (w) { w.target = ladderDown(+e.target.value || 0) * (+e.target.value > 0 ? 1 : 0); save('watch'); } };
  watchTable();
};

// ---------- CONFIGURAÇÕES ----------
PAGES.settings = () => {
  const el = $('p-settings');
  el.innerHTML = `
    <div class="ph"><div><h2>Configurações</h2><p>Aparência, som e os seus dados.</p></div></div>
    <div class="grid" style="max-width:860px">
      <div class="card"><div class="ch"><div><h3>Tema</h3><p>Vale para o painel e para o widget do Web App.</p></div></div>
        <div class="themes" id="themes">${Object.entries(THEMES).map(([k, t]) => `<button class="theme${st.cfg.theme === k ? ' on' : ''}" data-th="${k}">
          <div class="sw" style="background:${t.bg1}"><i style="background:${t.a1}"></i><i style="background:${t.a2}"></i><i style="background:${t.bg3}"></i><i style="background:${t.tx}"></i></div><b>${esc(t.name)}</b></button>`).join('')}</div>
      </div>
      <div class="card"><div class="ch"><h3>Geral</h3></div>
        <label class="tg"><input type="checkbox" id="setSound" ${st.cfg.sound ? 'checked' : ''}><span></span>Som ao comprar, nos alertas e quando um módulo para sozinho</label>
        <label class="tg"><input type="checkbox" id="setNotify" ${st.cfg.notify ? 'checked' : ''}><span></span>Notificações do Windows <small>carta vendida, preço no alvo, captcha e avisos do EA</small></label>
        <label class="tg"><input type="checkbox" id="setTrack" ${st.cfg.trackSales ? 'checked' : ''}><span></span>Conferir vendas a cada 5 min <small>lê a Lista de Transferências, não é busca no mercado</small></label>
        <label class="tg"><input type="checkbox" id="setKeys" ${st.cfg.keys ? 'checked' : ''}><span></span>Atalhos de teclado no Web App <small>Alt+Shift+S Snipe · Alt+Shift+G Galeria · Alt+Shift+R Relist · Alt+Shift+X parar · Enter/Esc no modo assistido</small></label>
      </div>
      <div class="card"><div class="ch"><div><h3>Menor preço do mercado</h3><p>Usado na venda do Sniper, na Galeria, no Relist e nas Ferramentas.</p></div></div>
        <div class="field fb"><select id="setPriceSrc">
          <option value="auto"${st.cfg.priceSrc === 'auto' ? ' selected' : ''}>Automático (Paletools se estiver ativo, senão a extensão)</option>
          <option value="own"${st.cfg.priceSrc === 'own' ? ' selected' : ''}>Sempre pela extensão (sem Paletools)</option>
          <option value="paletools"${st.cfg.priceSrc === 'paletools' ? ' selected' : ''}>Sempre pelo Paletools</option>
        </select></div>
        <div class="riskwhy">Pela extensão: abre "Comparar preço" do item, vê a oferta mais barata e anuncia um degrau abaixo. Funciona sem o Paletools.</div>
      </div>
      <div class="card"><div class="ch"><div><h3>Backup</h3><p>Configurações, filtros, estratégias, históricos e preços num arquivo .json. Importar substitui os dados atuais.</p></div></div>
        <div class="row"><button class="btn" id="bkExp">Exportar backup</button><label class="btn">Importar backup<input type="file" id="bkImp" accept=".json" hidden></label></div>
        <div class="riskwhy">${L('Vindo do antigo <b>FUT Snipe Bot</b>? Exporte o backup nele (Configurações → Exportar) e importe aqui: filtros, estratégias e histórico vêm junto. Os dados do Galeria Bot e do Relist Bot são trazidos sozinhos na primeira vez que o Web App abre com esta extensão.', 'Coming from the old <b>FUT Snipe Bot</b>? Export the backup there (Settings → Export) and import it here: filters, strategies and history come along. Galeria Bot and Relist Bot data are brought over automatically the first time the Web App opens with this extension.', '¿Vienes del antiguo <b>FUT Snipe Bot</b>? Exporta la copia allí (Configuración → Exportar) e impórtala aquí: filtros, estrategias e historial vienen juntos. Los datos del Galeria Bot y del Relist Bot se traen solos la primera vez que la Web App se abre con esta extensión.')}</div>
      </div>
      <div class="card"><div class="ch"><h3>Limpar dados</h3></div>
        <div class="row"><button class="btn danger" data-clr="logs">Limpar o log</button><button class="btn danger" data-clr="events">Apagar o histórico do Snipe</button><button class="btn danger" data-clr="prices">Apagar os preços</button><button class="btn danger" data-clr="gal">Apagar o lucro da Galeria</button></div>
      </div>
    </div>`;
  $('setSound').onchange = () => { st.cfg.sound = $('setSound').checked; saveCfg(); };
  $('setNotify').onchange = () => { st.cfg.notify = $('setNotify').checked; saveCfg(); };
  $('setTrack').onchange = () => { st.cfg.trackSales = $('setTrack').checked; saveCfg(); };
  $('setKeys').onchange = () => { st.cfg.keys = $('setKeys').checked; saveCfg(); };
  $('setPriceSrc').onchange = () => { st.cfg.priceSrc = $('setPriceSrc').value; saveCfg(); toast('Feito.', 'good'); };
  $('themes').onclick = e => { const b = e.target.closest('[data-th]'); if (!b) return; st.cfg.theme = b.dataset.th; saveCfg(); setTheme(); for (const x of $('themes').children) x.classList.toggle('on', x === b); toast(`Tema ${THEMES[b.dataset.th].name}.`, 'good'); };
  $('bkExp').onclick = () => store.get(null, all => download(`fut-bots-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(all), 'application/json'));
  $('bkImp').onchange = async () => {
    const f = $('bkImp').files[0]; if (!f) return;
    try {
      const all = JSON.parse((await f.text()).replace(/^﻿/, ''));
      if (!all || typeof all !== 'object') throw 0;
      if (!confirm('Substituir os dados atuais pelo backup?')) return;
      const keep = await store.get(['migrated']);
      await store.clear(); await store.set({ ...keep, ...all }); location.reload();
    } catch { toast('Arquivo de backup inválido.', 'bad'); }
  };
  el.onclick = e => {
    const b = e.target.closest('[data-clr]'); if (!b || !confirm('Tem certeza?')) return;
    if (b.dataset.clr === 'gal') modCmd('gal', 'edit', { edit: 'wipe', from: 0, to: null }).catch(() => { st.galBuys = []; save('galBuys'); }).then(() => toast('Feito.', 'good'));
    else clearData(b.dataset.clr).then(() => toast('Feito.', 'good'));
  };
};

// ---------- COMO USAR (um texto por idioma) ----------
PAGES.docs = () => {
  const html = I18N.get() === 'en' ? `<div class="docs">
    <div class="ph"><div><h2>How to use</h2><p>Tools for the EA FC Ultimate Team Web App, controlled from here.</p></div></div>
    <h3>First things first</h3>
    <ol>
      <li>Keep the <b>Web App open and visible</b> in the other window. This panel opens in a separate window for exactly that reason: if the Web App is minimized or in a hidden tab, Chrome slows the tools down.</li>
      <li>Only the Gallery needs <b>Paletools</b> (the Gallery screen is theirs). Sniper, Relist, My club and Tools work without it: the lowest price is found by the extension itself (Settings → Lowest market price).</li>
      <li>Only one tool works at a time. While one runs, the others wait (the top of the panel shows who is working and has a <b>Stop</b> button).</li>
      <li>The Web App shows a small widget with the three tools: you can start, stop and open this panel from it.</li>
      <li>The panel language can be changed with the <b>PT / EN / ES</b> buttons at the top. Activity log messages that are not translated yet stay in Portuguese.</li>
    </ol>
    <h3>Sniper</h3>
    <ol>
      <li>In the Web App, open <b>Transfers → Search the Transfer Market</b> (players or consumables).</li>
      <li>In the Sniper, click <b>Read from Web App</b> and build the filter, or build it in the Web App and use <b>Copy from screen</b>. When you click <b>Snipe</b>, the panel filter is applied to the Web App; if nothing is picked in the panel, the on-screen filter is used.</li>
      <li>Set the <b>offer price</b> (or <b>% profit</b>), what to do <b>after buying</b> and the pace.</li>
      <li>Pick <b>Test</b>, <b>Assisted</b> or <b>Automatic</b> in the bottom bar and click <b>Snipe</b>.</li>
    </ol>
    <p>The filter lists (rarities, events, leagues) update themselves: new options are added when they appear in the Web App, and the Sniper re-reads the lists every 12 h.</p>
    <p>When someone buys first ("Bid status changed…"), the Sniper does not try the next card in the list (it is an old result): it goes back and runs a fresh search, without stopping. EA limit warnings pause sniping for a few minutes; three warnings in 15 minutes stop it for good.</p>
    <h3>Gallery</h3>
    <ol>
      <li>In the Web App, open <b>Paletools → Gallery</b>, pick the <b>Category</b> (league) and the <b>Set</b> (team).</li>
      <li>On the Gallery page, check the max price per card and the rules (next team, selling, cleanup).</li>
      <li>Start with <b>Test</b>: it does the whole route except buying. Then switch to <b>Buy for real</b>.</li>
    </ol>
    <p>Cards you own but have not included count as yours: click <b>Include</b> on them to avoid wasting coins. Profit shows up in <b>Gallery → Profit and sales</b> when the Transfer List is opened.</p>
    <h3>Relist</h3>
    <p>Click <b>Relist now</b> from any Web App screen. It opens the Transfer List, clears sold items and relists expired and unlisted items at the "Cheapest" price, respecting your minimum price.</p>
    <h3>My club</h3>
    <ol>
      <li>Click <b>Analyze club</b>: the bot reads every player, with photo, status and the last price paid for each card (<b>Bought</b>). Pack or reward cards have no such value.</li>
      <li>Filter and select the cards, or use <b>Select filtered</b>. Untradeable cards cannot be selected.</li>
      <li><b>Find lowest price</b> asks the Web App directly, without opening screens. It fills <b>Sale</b> (current lowest price) and <b>Profit</b> (sale minus the 5% EA tax, minus what you paid). Click a column title to sort. This lookup never sells or moves anything.</li>
      <li>Each card counts as one market search and follows the 24 h limit and the Sniper speed. Cards looked up in the last 10 minutes are skipped.</li>
      <li>To sell, choose <b>Lowest price</b> (follows Settings → Lowest market price) or <b>Fixed price</b> and click <b>Sell selected</b>, or use <b>Send to Transfer List</b>.</li>
      <li>Selling and sending start in <b>Test</b>: the bot opens each card and checks the buttons without selling or moving anything. Switch to <b>For real</b> when the log looks right.</li>
    </ol>
    <p><b>Go to</b> opens a screen in the Web App (Home, Club players, Search the Transfer Market, Transfer List, Unassigned). The actions also open the screens they need on their own.</p>
    <p>The table also shows who is in the <b>active squad</b>. Use the filters and ready-made rules (<b>Profit only</b>, <b>Bronze and silver</b>, <b>Idle, highest value</b>), export to <b>CSV</b>, open the <b>Sniper</b> with the player ready, or watch the price with the row buttons. <b>Precise search</b> looks for cheaper offers beyond the first page and uses up to 4 searches per card.</p>
    <h3>Transfers</h3>
    <p>Shows the Transfer List without opening screens and records each sale with its <b>real profit</b>. The total also appears on the Dashboard, separate from the modules.</p>
    <h3>Watch</h3>
    <p>Search for a player, set a <b>target</b> and use <b>Check now</b>, or turn on <b>Check on its own</b> (10 minutes minimum). When the price reaches the target, a Windows notification appears. Click a player to see the price chart.</p>
    <h3>Tools</h3>
    <p>One-off actions: sort the <b>unassigned</b> pile (non-duplicates to the club; duplicates to the transfer list or for sale), send non-duplicates from the Transfer List to the club, clear sold items while recording profit, and claim rewards.</p>
    <h3>Shortcuts</h3>
    <p>In the Web App: <b>Alt+Shift+S</b> Snipe, <b>Alt+Shift+G</b> Gallery, <b>Alt+Shift+R</b> Relist (start or stop), <b>Alt+Shift+X</b> stop everything. In assisted mode, <b>Enter</b> buys and <b>Esc</b> skips.</p>
    <h3>The tools stop on their own when</h3>
    <p>A captcha shows up, coins run out, the unassigned pile fills up, the Transfer List is full (the Gallery can clean up and continue), or they reach the limits you set. EA limit warnings pause any tool for a few minutes; three warnings in 15 minutes stop it for good.</p>
    <h3>Coming from the old extensions</h3>
    <p>Remove <b>FUT Galeria Bot</b>, <b>FUT Relist Bot</b> and <b>FUT Snipe Bot</b> in <code>chrome://extensions</code> so they do not run alongside this one. To bring over Snipe data, export the backup there before removing it and import it in Settings.</p>
    <p class="riskwhy">EA prohibits automation on the Web App. Using these tools can lead to transfer market restrictions or a ban. Use in moderation and at your own risk.</p>
    <p class="riskwhy">FUT Bots is free and open source (MIT). <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">Code on GitHub</a> · <a href="${DONATE_URL}" target="_blank" rel="noopener noreferrer">Support on Ko-fi</a></p>
  </div>` : I18N.get() === 'es' ? `<div class="docs">
    <div class="ph"><div><h2>Cómo usar</h2><p>Herramientas para la Web App de EA FC Ultimate Team, controladas desde aquí.</p></div></div>
    <h3>Antes que nada</h3>
    <ol>
      <li>Deja la <b>Web App abierta y visible</b> en la otra ventana. Este panel se abre en una ventana aparte justamente por eso: si la Web App queda minimizada o en una pestaña oculta, Chrome ralentiza los módulos.</li>
      <li>Solo la Galería necesita <b>Paletools</b> (la pantalla Gallery es suya). El Sniper, el Relist, Mi club y las Herramientas funcionan sin él: el precio más bajo lo calcula la propia extensión (Ajustes → Precio más bajo del mercado).</li>
      <li>Solo trabaja un módulo a la vez. Mientras uno funciona, los demás esperan (arriba del panel se ve quién está trabajando y está el botón <b>Detener</b>).</li>
      <li>En la Web App hay un widget pequeño con los tres módulos: desde él puedes iniciar, detener y abrir este panel.</li>
      <li>El idioma del panel se cambia con los botones <b>PT / EN / ES</b> de arriba. Los mensajes del log que todavía no están traducidos quedan en portugués.</li>
    </ol>
    <h3>Sniper</h3>
    <ol>
      <li>En la Web App, abre <b>Transferencias → Buscar en el Mercado</b> (jugadores o consumibles).</li>
      <li>En el Sniper, haz clic en <b>Leer de la Web App</b> y arma el filtro, o ármalo en la Web App y usa <b>Copiar de la pantalla</b>. Al hacer clic en <b>Snipear</b>, el filtro del panel se aplica en la Web App; si no hay nada elegido en el panel, vale el de la pantalla.</li>
      <li>Define el <b>valor de oferta</b> (o el <b>% de ganancia</b>), qué hacer <b>después de comprar</b> y el ritmo.</li>
      <li>Elige <b>Prueba</b>, <b>Asistido</b> o <b>Automático</b> en la barra de abajo y haz clic en <b>Snipear</b>.</li>
    </ol>
    <p>Las listas del filtro (rarezas, eventos, ligas) se actualizan solas: las opciones nuevas entran cuando aparecen en la Web App, y el Sniper vuelve a leer las listas cada 12 h.</p>
    <p>Cuando alguien compra antes ("El estado de la puja ha cambiado…"), el Sniper no intenta la siguiente carta de la lista (es un resultado viejo): vuelve y hace una búsqueda nueva, sin detenerse. Los avisos de límite de EA pausan el snipe unos minutos; tres avisos en 15 minutos lo detienen del todo.</p>
    <h3>Galería</h3>
    <ol>
      <li>En la Web App, abre <b>Paletools → Gallery</b>, elige la <b>Category</b> (liga) y el <b>Set</b> (equipo).</li>
      <li>En la página Galería, revisa el precio máximo por carta y las reglas (siguiente equipo, venta, limpieza).</li>
      <li>Empieza por <b>Prueba</b>: hace todo el recorrido menos la compra. Después cambia a <b>Comprar de verdad</b>.</li>
    </ol>
    <p>Las cartas que ya tienes pero no incluiste cuentan como tuyas: haz clic en <b>Include</b> en ellas para no gastar de más. La ganancia aparece en <b>Galería → Ganancias y ventas</b> cuando se abre la lista de transferibles.</p>
    <h3>Relist</h3>
    <p>Haz clic en <b>Relistar ahora</b> desde cualquier pantalla de la Web App. Abre la lista de transferibles, retira los vendidos y vuelve a publicar los caducados y los no publicados al "Más barato", respetando tu precio mínimo.</p>
    <h3>Mi club</h3>
    <ol>
      <li>Haz clic en <b>Analizar club</b>: el bot lee todos los jugadores, con foto, estado y el último valor pagado por cada carta (<b>Comprada</b>). Las cartas de sobres o recompensas no tienen ese valor.</li>
      <li>Filtra y selecciona las cartas, o usa <b>Seleccionar las filtradas</b>. Las cartas no negociables no se pueden seleccionar.</li>
      <li><b>Buscar precio más bajo</b> pregunta directamente a la Web App, sin abrir pantallas. Rellena <b>Venta</b> (precio más bajo actual) y <b>Ganancia</b> (venta menos el 5% de EA, menos lo que pagaste). Haz clic en el título de una columna para ordenar. Esta búsqueda no vende ni mueve nada.</li>
      <li>Cada carta cuenta como una búsqueda en el mercado y respeta el límite de 24 h y la velocidad del Sniper. Las cartas buscadas en los últimos 10 minutos se omiten.</li>
      <li>Para vender, elige <b>Más barato</b> (sigue Ajustes → Precio más bajo del mercado) o <b>Precio fijo</b> y haz clic en <b>Vender seleccionadas</b>, o usa <b>Enviar a la lista de transferibles</b>.</li>
      <li>La venta y el envío empiezan en <b>Prueba</b>: el bot abre cada carta y comprueba los botones sin vender ni mover nada. Cambia a <b>De verdad</b> cuando el log esté bien.</li>
    </ol>
    <p><b>Ir a</b> abre una pantalla en la Web App (Inicio, Jugadores del club, Buscar en el Mercado, Lista de transferibles, No asignados). Las acciones también abren solas las pantallas que necesitan.</p>
    <p>La tabla también muestra quién está en el <b>equipo activo</b>. Usa los filtros y las reglas listas (<b>Solo con ganancia</b>, <b>Bronces y platas</b>, <b>Paradas de mayor valor</b>), exporta en <b>CSV</b>, abre el <b>Sniper</b> con el jugador listo o sigue el precio con los botones de la fila. <b>Búsqueda precisa</b> busca ofertas más baratas más allá de la primera página y usa hasta 4 búsquedas por carta.</p>
    <h3>Transferencias</h3>
    <p>Muestra la lista de transferibles sin abrir pantallas y guarda cada venta con su <b>ganancia real</b>. El total también aparece en el Panel, separado de los módulos.</p>
    <h3>Seguir</h3>
    <p>Busca un jugador, define un <b>objetivo</b> y usa <b>Comprobar ahora</b>, o activa <b>Comprobar solo</b> (mínimo 10 minutos). Cuando el precio llega al objetivo, aparece una notificación de Windows. Haz clic en un jugador para ver el gráfico de precios.</p>
    <h3>Herramientas</h3>
    <p>Acciones puntuales: ordenar los <b>no asignados</b> (no repetidos al club; repetidos a la lista de transferibles o a la venta), enviar los no repetidos de la lista de transferibles al club, retirar los vendidos registrando la ganancia y reclamar recompensas.</p>
    <h3>Atajos</h3>
    <p>En la Web App: <b>Alt+Shift+S</b> Snipe, <b>Alt+Shift+G</b> Galería, <b>Alt+Shift+R</b> Relist (inicia o detiene), <b>Alt+Shift+X</b> detiene todo. En modo asistido, <b>Enter</b> compra y <b>Esc</b> salta.</p>
    <h3>Los módulos se detienen solos cuando</h3>
    <p>Aparece un captcha, faltan monedas, los no asignados se llenan, la lista de transferibles está llena (la Galería puede limpiar y seguir), o llegan a los límites que definiste. Los avisos de límite de EA pausan cualquier módulo unos minutos; tres avisos en 15 minutos lo detienen del todo.</p>
    <h3>Si vienes de las extensiones antiguas</h3>
    <p>Quita <b>FUT Galeria Bot</b>, <b>FUT Relist Bot</b> y <b>FUT Snipe Bot</b> en <code>chrome://extensions</code> para que no funcionen junto con esta. Para traer los datos del Snipe, exporta la copia allí antes de quitarlo e impórtala en Ajustes.</p>
    <p class="riskwhy">EA prohíbe la automatización en la Web App. Usar estos módulos puede llevar a restricciones en el mercado o a un baneo. Úsalos con moderación y bajo tu propio riesgo.</p>
    <p class="riskwhy">FUT Bots es gratis y de código abierto (MIT). <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">Código en GitHub</a> · <a href="${DONATE_URL}" target="_blank" rel="noopener noreferrer">Apoyar en Ko-fi</a></p>
  </div>` : `<div class="docs">
    <div class="ph"><div><h2>Como usar</h2><p>Ferramentas para o EA FC Ultimate Team Web App, controladas daqui.</p></div></div>
    <h3>Antes de tudo</h3>
    <ol>
      <li>Deixe o <b>Web App aberto e visível</b> na outra janela. Este painel abre numa janela separada justamente para isso: se o Web App ficar minimizado ou numa aba escondida, o Chrome desacelera os módulos.</li>
      <li>Só a Galeria precisa do <b>Paletools</b> (a tela Gallery é dele). O Sniper, o Relist, o Meu clube e as Ferramentas funcionam sem ele: o menor preço é calculado pela própria extensão (Configurações → Menor preço do mercado).</li>
      <li>Só um módulo trabalha por vez. Enquanto um roda, os outros esperam (o topo do painel mostra quem está trabalhando e tem o botão <b>Parar</b>).</li>
      <li>No Web App há um widget pequeno com os três módulos: dá para iniciar, parar e abrir este painel por ele.</li>
    </ol>
    <h3>Sniper</h3>
    <ol>
      <li>No Web App, abra <b>Transfer. → Pesquisar no Mercado</b> (jogadores ou consumíveis).</li>
      <li>Para escolher um jogador, digite 3 letras do nome no Sniper: a lista aparece com foto, ID e nota, mesmo com o Web App fechado.</li>
      <li>No Sniper, clique em <b>Ler do Web App</b> e monte o filtro, ou monte direto no Web App e use <b>Copiar da tela</b>. Ao clicar em <b>Snipar</b>, o filtro do painel é aplicado no Web App; se nada estiver escolhido no painel, vale o que está na tela.</li>
      <li>Defina o <b>valor de oferta</b> (ou <b>% de lucro</b>), o que fazer <b>depois de comprar</b> e o ritmo.</li>
      <li>Escolha <b>Teste</b>, <b>Assistido</b> ou <b>Automático</b> na barra de baixo e clique em <b>Snipar</b>.</li>
    </ol>
    <p>As listas do filtro (raridades, eventos, ligas) se atualizam sozinhas: opções novas entram quando aparecem no Web App, e o Sniper lê as listas de novo a cada 12 h.</p>
    <p>Quando alguém compra antes ("Status do lance alterado…"), o Sniper não tenta a próxima carta da lista (é um resultado velho): volta e faz uma pesquisa nova, sem parar. Avisos de limite do EA pausam o snipe por alguns minutos; três avisos em 15 minutos param de vez.</p>
    <h3>Galeria</h3>
    <ol>
      <li>No Web App, abra <b>Paletools → Gallery</b>, escolha a <b>Category</b> (liga) e o <b>Set</b> (time).</li>
      <li>Na página Galeria, confira o preço máximo por carta e as regras (próximo time, venda, limpeza).</li>
      <li>Comece pelo <b>Teste</b>: ele faz todo o caminho menos a compra. Depois troque para <b>Comprar de verdade</b>.</li>
    </ol>
    <p>Cartas que você já tem mas não incluiu contam como suas: clique em <b>Include</b> nelas para não gastar à toa. O lucro aparece em <b>Galeria → Lucro e vendas</b> quando a Lista de Transferências é aberta.</p>
    <h3>Relist</h3>
    <p>Clique em <b>Relistar agora</b> de qualquer tela do Web App. Ele abre a Lista de Transferências, retira os vendidos e anuncia de novo os expirados e os não listados pelo "Mais barato", respeitando o seu preço mínimo.</p>
    <h3>Meu clube</h3>
    <ol>
      <li>Clique em <b>Analisar clube</b>: o bot lê todos os jogadores, com foto, status e o último valor pago por cada carta (<b>Comprei</b>). Cartas de pacote ou recompensa ficam sem esse valor.</li>
      <li>Filtre e selecione as cartas, ou use <b>Selecionar as filtradas</b>. Cartas inegociáveis não podem ser selecionadas.</li>
      <li><b>Buscar menor preço</b> pergunta o preço direto ao Web App, sem abrir telas. Preenche <b>Venda</b> (menor preço atual) e <b>Lucro</b> (venda menos os 5% do EA, menos o que você pagou). Clique no título da coluna para ordenar. Essa busca não vende nem move nada.</li>
      <li>Cada carta conta como uma busca no mercado e respeita o limite de 24 h e a velocidade do Sniper. Cartas buscadas nos últimos 10 minutos são puladas.</li>
      <li>Para vender, escolha <b>Mais barato</b> (segue Configurações → Menor preço do mercado) ou <b>Preço fixo</b> e clique em <b>Vender selecionadas</b>, ou use <b>Enviar para a Lista de Transferências</b>.</li>
      <li>A venda e o envio começam em <b>Teste</b>: o bot abre cada carta e confere os botões sem vender nem mover nada. Mude para <b>De verdade</b> quando o log estiver certo.</li>
    </ol>
    <p><b>Ir para</b> abre uma tela no Web App (Início, Jogadores do clube, Pesquisar no Mercado, Lista de Transferências, Não atribuídos). As ações também abrem sozinhas as telas de que precisam.</p>
    <p>A tabela também mostra quem está no <b>time ativo</b>. Use os filtros e as regras prontas (<b>Só com lucro</b>, <b>Bronzes e pratas</b>, <b>Paradas de maior valor</b>), exporte em <b>CSV</b>, abra o <b>Sniper</b> já com o jogador ou acompanhe o preço pelos botões da linha. A opção <b>Busca precisa</b> procura ofertas mais baratas além da primeira página e usa até 4 buscas por carta.</p>
    <h3>Transferências</h3>
    <p>Mostra a Lista de Transferências sem abrir telas e guarda cada venda com o <b>lucro real</b>. O total também aparece no Dashboard, separado dos módulos.</p>
    <h3>Acompanhar</h3>
    <p>Busque um jogador, defina um <b>alvo</b> e use <b>Conferir agora</b>, ou ligue <b>Conferir sozinho</b> (mínimo de 10 minutos). Quando o preço chega no alvo, aparece uma notificação do Windows. Clique num jogador para ver o gráfico de preço.</p>
    <h3>Ferramentas</h3>
    <p>Ações de uma vez: organizar os <b>não atribuídos</b> (não repetidos para o clube; repetidos para a Lista de transf. ou para venda), enviar os não repetidos da Lista de Transferências ao clube, retirar os vendidos registrando o lucro e resgatar recompensas.</p>
    <h3>Atalhos</h3>
    <p>No Web App: <b>Alt+Shift+S</b> Snipe, <b>Alt+Shift+G</b> Galeria, <b>Alt+Shift+R</b> Relist (inicia ou para), <b>Alt+Shift+X</b> para tudo. No modo assistido, <b>Enter</b> compra e <b>Esc</b> pula.</p>
    <h3>Os módulos param sozinhos quando</h3>
    <p>Aparece captcha, faltam moedas, os não atribuídos enchem, a Lista de Transferências lota (a Galeria pode limpar e seguir), ou chegam nos limites que você definiu. Avisos de limite do EA pausam qualquer módulo por alguns minutos; três avisos em 15 minutos param de vez.</p>
    <h3>Vindo das extensões antigas</h3>
    <p>Remova o <b>FUT Galeria Bot</b>, o <b>FUT Relist Bot</b> e o <b>FUT Snipe Bot</b> em <code>chrome://extensions</code> para não rodarem junto com esta. Para trazer os dados do Snipe, exporte o backup nele antes de remover e importe em Configurações.</p>
    <p class="riskwhy">A EA proíbe automação no Web App. Usar estes módulos pode levar a restrição no mercado ou banimento. Use com moderação e por sua conta e risco.</p>
    <p class="riskwhy">FUT Bots é grátis e de código aberto (MIT). <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">Código no GitHub</a> · <a href="${DONATE_URL}" target="_blank" rel="noopener noreferrer">Apoiar no Ko-fi</a></p>
  </div>`;
  $('p-docs').innerHTML = html.replace('<div class="docs">', '<div class="docs" data-notr>');
};
