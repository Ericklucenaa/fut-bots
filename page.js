// Ponte com o Web App: roda na própria página para usar os mesmos serviços das telas Clube e Comparar preço.
// Só faz leituras (clube e preços). Comprar, vender e mover continuam pelos botões da tela.
(() => {
  'use strict';
  if (window.__futPage) return;
  window.__futPage = true;

  // o Web App avisa o fim de cada pedido por observe(); aqui isso vira uma Promise
  const call = (obs, ms = 15000) => new Promise((res, rej) => {
    const ctx = {};
    const t = setTimeout(() => rej(new Error('o Web App não respondeu')), ms);
    obs.observe(ctx, (o, r) => { clearTimeout(t); try { o.unobserve(ctx); } catch {} res(r); });
  });
  const fail = r => Object.assign(new Error('o Web App recusou o pedido'), { status: r && r.status });
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function club() {
    const out = [], seen = new Set();
    for (let page = 0; page < 60; page++) {
      const c = new UTSearchCriteriaDTO();
      c.type = SearchType.PLAYER; c.count = 91; c.offset = out.length;
      const r = await call(services.Club.search(c));
      if (!r.success || !r.response) throw fail(r);
      const items = r.response.items || [];
      let fresh = 0;
      for (const i of items) {
        if (seen.has(i.id)) continue;
        seen.add(i.id); fresh++;
        const s = i.getStaticData ? i.getStaticData() : {};
        out.push({ id: i.id, def: i.definitionId, name: s.name || '', rating: i.rating, buy: i.lastSalePrice || 0 });
      }
      if (r.response.retrievedAll || !fresh) break;
      await sleep(350);
    }
    return out;
  }
  // igual ao botão Comparar preço: mesma carta (defId), cache limpo, primeira página de ofertas
  // max: só ofertas até esse valor (usado na busca precisa)
  async function price({ def, max }) {
    const c = new UTSearchCriteriaDTO();
    services.Item.clearTransferMarketCache();
    c.defId = [def]; c.type = SearchType.PLAYER;
    if (max) c.maxBuy = max;
    const r = await call(services.Item.searchTransferMarket(c, 1));
    if (!r.success || !r.data) throw fail(r);
    const ps = (r.data.items || []).map(i => i.getAuctionData().buyNowPrice).filter(p => p > 0);
    return { min: ps.length ? Math.min(...ps) : null, n: ps.length };
  }
  // ids das cartas do time ativo
  async function squad() {
    const r = await call(services.Squad.requestSquadById(services.Squad.getActiveSquadId()));
    if (!r.success || !r.data || !r.data.squad) throw fail(r);
    return r.data.squad.getPlayers().map(p => p.item && p.item.id).filter(Boolean);
  }
  const yes = (a, m) => typeof a[m] === 'function' && a[m]();
  // Lista de Transferências inteira, com a situação de cada anúncio
  async function tl() {
    const r = await call(services.Item.requestTransferItems());
    if (!r.success || !r.response) throw fail(r);
    return (r.response.items || []).map(i => {
      const a = i.getAuctionData(), s = i.getStaticData ? i.getStaticData() : {};
      const state = yes(a, 'isSold') ? 'sold' : yes(a, 'isExpired') ? 'expired' : yes(a, 'isActiveTrade') ? 'active' : yes(a, 'isInactive') ? 'inactive' : 'other';
      return { id: i.id, trade: a.tradeId || 0, def: i.definitionId, name: s.name || '', rating: i.rating, buy: i.lastSalePrice || 0, state, bin: a.buyNowPrice || 0, bid: a.currentBid || 0, left: yes(a, 'isActiveTrade') && a.getSecondsRemaining ? a.getSecondsRemaining() : 0 };
    });
  }
  const OPS = { ping: async () => typeof services !== 'undefined' && !!services.Club, club, price, squad, tl };

  addEventListener('message', async e => {
    const d = e.data;
    if (e.source !== window || !d || d.__futBots !== 'req' || !OPS[d.op]) return;
    const reply = o => window.postMessage({ __futBots: 'res', id: d.id, ...o }, location.origin);
    try { reply({ ok: true, data: await OPS[d.op](d.args || {}) }); }
    catch (err) { reply({ ok: false, error: err.message, status: err.status }); }
  });
})();
