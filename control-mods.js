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
        <div class="card"><div class="ch"><div><h3>Proteção</h3><p>Nomes que nunca são vendidos nem relistados (Relist e Ferramentas). Um por linha; vale parte do nome.</p></div></div>
          <textarea id="blockList" rows="5" placeholder="Ex.: Vinícius Júnior">${esc((c.block || []).join('\n'))}</textarea>
        </div>
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
  $('blockList').onchange = () => { st.cfg.block = $('blockList').value.split('\n').map(x => x.trim()).filter(Boolean); saveCfg(); toast('Feito.', 'good'); };
  el.onclick = e => {
    const b = e.target.closest('[data-op]'); if (!b || b.disabled) return;
    act(b, async () => { await modCmd('tools', b.dataset.op); toast('Ferramenta iniciada no Web App.', 'good'); });
  };
  renderLog();
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
    <div class="ph"><div><h2>How to use</h2><p>Three tools for the EA FC Ultimate Team Web App, controlled from here.</p></div></div>
    <h3>First things first</h3>
    <ol>
      <li>Keep the <b>Web App open and visible</b> in the other window. This panel opens in a separate window for exactly that reason: if the Web App is minimized or in a hidden tab, Chrome slows the tools down.</li>
      <li>Only the Gallery needs <b>Paletools</b> (the Gallery screen is theirs). Sniper, Relist and Tools work without it: the lowest price is found by the extension itself (Settings → Lowest market price).</li>
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
    <p>When someone buys first ("Bid status changed…"), the Sniper tries the next offer and keeps searching, without stopping. EA limit warnings pause sniping for a few minutes; three warnings in 15 minutes stop it for good.</p>
    <h3>Gallery</h3>
    <ol>
      <li>In the Web App, open <b>Paletools → Gallery</b>, pick the <b>Category</b> (league) and the <b>Set</b> (team).</li>
      <li>On the Gallery page, check the max price per card and the rules (next team, selling, cleanup).</li>
      <li>Start with <b>Test</b>: it does the whole route except buying. Then switch to <b>Buy for real</b>.</li>
    </ol>
    <p>Cards you own but have not included count as yours: click <b>Include</b> on them to avoid wasting coins. Profit shows up in <b>Gallery → Profit and sales</b> when the Transfer List is opened.</p>
    <h3>Relist</h3>
    <p>Click <b>Relist now</b> from any Web App screen. It opens the Transfer List, clears sold items and relists expired and unlisted items at the "Cheapest" price, respecting your minimum price.</p>
    <h3>Tools</h3>
    <p>One-off actions: sort the <b>unassigned</b> pile (non-duplicates to the club; duplicates to the transfer list or for sale), send non-duplicates from the Transfer List to the club, clear sold items while recording profit, claim rewards, and a <b>protection</b> list of names that are never sold.</p>
    <h3>Shortcuts</h3>
    <p>In the Web App: <b>Alt+Shift+S</b> Snipe, <b>Alt+Shift+G</b> Gallery, <b>Alt+Shift+R</b> Relist (start or stop), <b>Alt+Shift+X</b> stop everything. In assisted mode, <b>Enter</b> buys and <b>Esc</b> skips.</p>
    <h3>The tools stop on their own when</h3>
    <p>A captcha shows up, coins run out, the unassigned pile fills up, the Transfer List is full (the Gallery can clean up and continue), or they reach the limits you set. EA limit warnings pause any tool for a few minutes; three warnings in 15 minutes stop it for good.</p>
    <h3>Coming from the old extensions</h3>
    <p>Remove <b>FUT Galeria Bot</b>, <b>FUT Relist Bot</b> and <b>FUT Snipe Bot</b> in <code>chrome://extensions</code> so they do not run alongside this one. To bring over Snipe data, export the backup there before removing it and import it in Settings.</p>
    <p class="riskwhy">EA prohibits automation on the Web App. Using these tools can lead to transfer market restrictions or a ban. Use in moderation and at your own risk.</p>
    <p class="riskwhy">FUT Bots is free and open source (MIT). <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">Code on GitHub</a> · <a href="${DONATE_URL}" target="_blank" rel="noopener noreferrer">Support on Ko-fi</a></p>
  </div>` : I18N.get() === 'es' ? `<div class="docs">
    <div class="ph"><div><h2>Cómo usar</h2><p>Tres herramientas para la Web App de EA FC Ultimate Team, controladas desde aquí.</p></div></div>
    <h3>Antes que nada</h3>
    <ol>
      <li>Deja la <b>Web App abierta y visible</b> en la otra ventana. Este panel se abre en una ventana aparte justamente por eso: si la Web App queda minimizada o en una pestaña oculta, Chrome ralentiza los módulos.</li>
      <li>Solo la Galería necesita <b>Paletools</b> (la pantalla Gallery es suya). El Sniper, el Relist y las Herramientas funcionan sin él: el precio más bajo lo calcula la propia extensión (Ajustes → Precio más bajo del mercado).</li>
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
    <p>Cuando alguien compra antes ("El estado de la puja ha cambiado…"), el Sniper prueba la siguiente oferta y sigue buscando, sin detenerse. Los avisos de límite de EA pausan el snipe unos minutos; tres avisos en 15 minutos lo detienen del todo.</p>
    <h3>Galería</h3>
    <ol>
      <li>En la Web App, abre <b>Paletools → Gallery</b>, elige la <b>Category</b> (liga) y el <b>Set</b> (equipo).</li>
      <li>En la página Galería, revisa el precio máximo por carta y las reglas (siguiente equipo, venta, limpieza).</li>
      <li>Empieza por <b>Prueba</b>: hace todo el recorrido menos la compra. Después cambia a <b>Comprar de verdad</b>.</li>
    </ol>
    <p>Las cartas que ya tienes pero no incluiste cuentan como tuyas: haz clic en <b>Include</b> en ellas para no gastar de más. La ganancia aparece en <b>Galería → Ganancias y ventas</b> cuando se abre la lista de transferibles.</p>
    <h3>Relist</h3>
    <p>Haz clic en <b>Relistar ahora</b> desde cualquier pantalla de la Web App. Abre la lista de transferibles, retira los vendidos y vuelve a publicar los caducados y los no publicados al "Más barato", respetando tu precio mínimo.</p>
    <h3>Herramientas</h3>
    <p>Acciones puntuales: organizar los <b>no asignados</b> (no repetidos al club; repetidos a la lista de transf. o a la venta), enviar los no repetidos de la lista de transferibles al club, retirar los vendidos registrando la ganancia, reclamar recompensas y una lista de <b>protección</b> con nombres que nunca se venden.</p>
    <h3>Atajos</h3>
    <p>En la Web App: <b>Alt+Shift+S</b> Snipe, <b>Alt+Shift+G</b> Galería, <b>Alt+Shift+R</b> Relist (inicia o detiene), <b>Alt+Shift+X</b> detiene todo. En modo asistido, <b>Enter</b> compra y <b>Esc</b> salta.</p>
    <h3>Los módulos se detienen solos cuando</h3>
    <p>Aparece un captcha, faltan monedas, los no asignados se llenan, la lista de transferibles está llena (la Galería puede limpiar y seguir), o llegan a los límites que definiste. Los avisos de límite de EA pausan cualquier módulo unos minutos; tres avisos en 15 minutos lo detienen del todo.</p>
    <h3>Si vienes de las extensiones antiguas</h3>
    <p>Quita <b>FUT Galeria Bot</b>, <b>FUT Relist Bot</b> y <b>FUT Snipe Bot</b> en <code>chrome://extensions</code> para que no funcionen junto con esta. Para traer los datos del Snipe, exporta la copia allí antes de quitarlo e impórtala en Ajustes.</p>
    <p class="riskwhy">EA prohíbe la automatización en la Web App. Usar estos módulos puede llevar a restricciones en el mercado o a un baneo. Úsalos con moderación y bajo tu propio riesgo.</p>
    <p class="riskwhy">FUT Bots es gratis y de código abierto (MIT). <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">Código en GitHub</a> · <a href="${DONATE_URL}" target="_blank" rel="noopener noreferrer">Apoyar en Ko-fi</a></p>
  </div>` : `<div class="docs">
    <div class="ph"><div><h2>Como usar</h2><p>Três ferramentas para o EA FC Ultimate Team Web App, controladas daqui.</p></div></div>
    <h3>Antes de tudo</h3>
    <ol>
      <li>Deixe o <b>Web App aberto e visível</b> na outra janela. Este painel abre numa janela separada justamente para isso: se o Web App ficar minimizado ou numa aba escondida, o Chrome desacelera os módulos.</li>
      <li>Só a Galeria precisa do <b>Paletools</b> (a tela Gallery é dele). O Sniper, o Relist e as Ferramentas funcionam sem ele: o menor preço é calculado pela própria extensão (Configurações → Menor preço do mercado).</li>
      <li>Só um módulo trabalha por vez. Enquanto um roda, os outros esperam (o topo do painel mostra quem está trabalhando e tem o botão <b>Parar</b>).</li>
      <li>No Web App há um widget pequeno com os três módulos: dá para iniciar, parar e abrir este painel por ele.</li>
    </ol>
    <h3>Sniper</h3>
    <ol>
      <li>No Web App, abra <b>Transfer. → Pesquisar no Mercado</b> (jogadores ou consumíveis).</li>
      <li>No Sniper, clique em <b>Ler do Web App</b> e monte o filtro, ou monte direto no Web App e use <b>Copiar da tela</b>. Ao clicar em <b>Snipar</b>, o filtro do painel é aplicado no Web App; se nada estiver escolhido no painel, vale o que está na tela.</li>
      <li>Defina o <b>valor de oferta</b> (ou <b>% de lucro</b>), o que fazer <b>depois de comprar</b> e o ritmo.</li>
      <li>Escolha <b>Teste</b>, <b>Assistido</b> ou <b>Automático</b> na barra de baixo e clique em <b>Snipar</b>.</li>
    </ol>
    <p>As listas do filtro (raridades, eventos, ligas) se atualizam sozinhas: opções novas entram quando aparecem no Web App, e o Sniper lê as listas de novo a cada 12 h.</p>
    <p>Quando alguém compra antes ("Status do lance alterado…"), o Sniper tenta a próxima oferta e volta a buscar, sem parar. Avisos de limite do EA pausam o snipe por alguns minutos; três avisos em 15 minutos param de vez.</p>
    <h3>Galeria</h3>
    <ol>
      <li>No Web App, abra <b>Paletools → Gallery</b>, escolha a <b>Category</b> (liga) e o <b>Set</b> (time).</li>
      <li>Na página Galeria, confira o preço máximo por carta e as regras (próximo time, venda, limpeza).</li>
      <li>Comece pelo <b>Teste</b>: ele faz todo o caminho menos a compra. Depois troque para <b>Comprar de verdade</b>.</li>
    </ol>
    <p>Cartas que você já tem mas não incluiu contam como suas: clique em <b>Include</b> nelas para não gastar à toa. O lucro aparece em <b>Galeria → Lucro e vendas</b> quando a Lista de Transferências é aberta.</p>
    <h3>Relist</h3>
    <p>Clique em <b>Relistar agora</b> de qualquer tela do Web App. Ele abre a Lista de Transferências, retira os vendidos e anuncia de novo os expirados e os não listados pelo "Mais barato", respeitando o seu preço mínimo.</p>
    <h3>Ferramentas</h3>
    <p>Ações de uma vez: organizar os <b>não atribuídos</b> (não repetidos para o clube; repetidos para a Lista de transf. ou à venda), enviar os não repetidos da Lista de Transferências ao clube, retirar os vendidos registrando o lucro, resgatar recompensas e uma lista de <b>proteção</b> com nomes que nunca são vendidos.</p>
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
