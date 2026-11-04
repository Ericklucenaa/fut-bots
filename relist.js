// Módulo Relist — relista os itens da Lista de Transferências (expirados e não listados) pelo mais barato do Paletools.
(() => {
  'use strict';
  if (window.__futRel) return;
  window.__futRel = true;
  const { fmt } = FSB;
  const F = FUT, D = F.D, T = F.T;
  const { Stop, Limited, sleep, click, closeDialog } = F;
  const C = () => D.relCfg;
  const log = (m, c = '') => F.log(m, c, 'rel');
  const pause = k => sleep((C().delay || 900) * (k || 1) * (0.8 + Math.random() * 0.4));
  const waitFor = (fn, ms, what) => F.waitFor(fn, ms, what, 150);

  const ident = r => { const id = F.itemIdent(r); return `${id.name} ${id.rating || ''}`.trim(); };
  // vendidos e anúncios ativos ficam de fora; entram os expirados e os itens disponíveis (sem anúncio)
  function isCandidate(r) {
    const t = r.innerText;
    if (F.blocked(F.itemIdent(r).name)) return false;   // lista de proteção
    if (T.sold.test(t)) return false;
    if (T.expired.test(t)) return C().expired;
    if (T.onSale.test(t)) return false;   // ainda à venda
    return C().unassigned;
  }
  async function relistItem(row) {
    click(row); await pause(0.8);
    if (!(await waitFor(() => F.fastFind(T.relist), 6000))) return { ok: false, why: 'não apareceu "Listar no Mercado de Transferências" / "Listar item novamente"' };
    return F.listCheapest({ minBn: C().minPrice, accRe: T.relist, reselect: async () => { click(row); await pause(0.8); } });
  }

  const R = { listed: 0, total: 0, line: '' };
  async function relist() {
    Object.assign(R, { listed: 0, total: 0, line: '' }); F.changed();
    const cfg = C();
    const failed = {};   // nome → quantas vezes falhou (para não ficar tentando o mesmo item)
    try {
      log('▶ Relist: relistando a Lista de Transferências pelo mais barato.', 'good');
      await F.goToTransferList(log);
      if (cfg.clearSold) await F.clearSold(log);
      let clearedOnFull = false;
      for (;;) {
        if (F.stopping()) throw new Stop('Parado por você.');
        if (cfg.maxItems && R.listed >= cfg.maxItems) { log(`Cheguei ao limite de ${cfg.maxItems} item(ns).`); break; }
        await waitFor(() => !F.loading(), 30000, 'a tela carregar');
        const cand = F.items().filter(isCandidate);
        const seen = {};
        const row = cand.find(r => { const k = ident(r); seen[k] = (seen[k] || 0) + 1; return seen[k] > (failed[k] || 0); });
        if (!row) break;
        const name = ident(row);
        R.total++;
        log(`→ ${name}: listando…`);
        let res;
        try { res = await relistItem(row); }
        catch (e) {
          if (e instanceof Limited) { R.total--; await F.limitPause(e, log); await F.goToTransferList(log); continue; }
          if (e instanceof Stop) throw e;
          res = { ok: false, why: e.message };
        }
        if (res.ok) { R.listed++; log(`   ✔ listado por ${fmt(res.bn)}.`, 'good'); }
        else {
          failed[name] = (failed[name] || 0) + 1;
          log(`   ✖ não listado: ${res.why}.`, res.keep ? 'warn' : 'bad');
          closeDialog();
          if (res.full) {
            // lista cheia: retira os vendidos uma vez e tenta de novo
            failed[name]--;
            if (clearedOnFull || !cfg.clearSold || !(await F.clearSold(log))) break;
            clearedOnFull = true;
          }
        }
        R.line = `${R.listed} listado(s) de ${R.total}`; F.changed();
        await pause(1.2);
      }
      if (cfg.clearSold) await F.clearSold(log);
      log(`■ Fim: ${R.listed} de ${R.total} item(ns) listados.`, 'good');
    } catch (e) {
      if (e instanceof Limited) e = new Stop(`O EA pediu calma: "${e.message}". Espere um pouco antes de continuar.`);
      const byUser = e instanceof Stop && /^Parado/.test(e.message);
      log((e instanceof Stop ? '■ ' : '⚠ Erro: ') + e.message + ` (${R.listed} listado(s))`, byUser ? 'warn' : 'bad');
      if (!byUser) F.beep(330, 600);
    } finally {
      R.line = ''; F.changed();
    }
  }

  F.mod('rel', {
    status: () => ({ running: F.run.owner === 'rel', R }),
    async cmd(m) {
      if (m.op !== 'start') throw new Error('comando desconhecido');
      if (F.isBusy()) throw new Error('Outro módulo está trabalhando. Pare ele antes.');
      F.task('rel', 'relistando', relist).catch(e => log('⚠ ' + e.message, 'bad'));
      await sleep(50); return F.status();
    },
  });
})();
