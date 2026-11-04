// Módulo Ferramentas — organiza os não atribuídos, manda os não repetidos da Lista de Transferências para o clube,
// retira os vendidos e resgata recompensas. Cada ação roda uma vez, quando você pede.
(() => {
  'use strict';
  if (window.__futTools) return;
  window.__futTools = true;
  const { fmt, norm } = FSB;
  const F = FUT, D = F.D, T = F.T;
  const { Stop, Limited, sleep, vis, find, fastFind, click, dialogs, closeDialog, confirmIfAsked, loading, leavesWithText } = F;
  const log = (m, c = '') => F.log(m, c, 'tools');
  const pause = (k = 1) => sleep(800 * k * (0.8 + Math.random() * 0.4));
  const waitFor = (fn, ms, what) => F.waitFor(fn, ms, what, 150);
  const R = { done: 0, total: 0, line: '' };

  // ---------- navegação ----------
  async function goHome() {
    const home = [...document.querySelectorAll('.ut-tab-bar-item.icon-home')].find(vis) || F.navBtn(T.home) || leavesWithText(T.home)[0];
    if (!home) throw new Stop('Não achei o menu Início do Web App.');
    click(home.closest('.ut-tab-bar-item, button, [role=button], a') || home);
    await waitFor(() => !loading(), 10000); await pause();
  }
  const onUnassigned = () => T.unassignedTile.test(F.headerTitle());
  async function goToUnassigned() {
    if (onUnassigned()) return true;
    await goHome();
    const tile = await waitFor(() => { const t = leavesWithText(T.unassignedTile).find(e => !e.closest('.ut-navigation-bar-view')); return t ? (t.closest('.tile, [class*="tile"], button, [role=button]') || t) : null; }, 6000);
    if (!tile) return false;   // o Web App só mostra o quadro quando há itens
    click(tile);
    await waitFor(() => onUnassigned() && !loading(), 15000, 'a tela de não atribuídos abrir');
    await pause(1.2);
    return true;
  }

  // ---------- não atribuídos ----------
  // não repetidos → clube (se ligado) · repetidos → Lista de transf. | vender no mais barato | deixar
  async function unassigned() {
    const cfg = D.cfg, dup = cfg.uaDup || 'tl';
    Object.assign(R, { done: 0, total: 0, line: '' });
    log(`▶ Não atribuídos: ${cfg.uaClub ? 'não repetidos → clube' : 'não repetidos ficam'} · repetidos → ${{ tl: 'Lista de transf.', sell: 'vender no mais barato', keep: 'ficam' }[dup]}.`, 'good');
    if (!(await goToUnassigned())) { log('   não há nada nos não atribuídos.', 'good'); return; }
    const failed = {}, seen = {};
    for (let guard = 0; guard < 120; guard++) {
      if (F.stopping()) throw new Stop('Parado por você.');
      await waitFor(() => !loading(), 20000);
      const list = F.items();
      if (!list.length) break;
      // próximo item ainda não tratado (pula os que já falharam)
      const cnt = {};
      const row = list.find(r => { const k = F.itemIdent(r).name; cnt[k] = (cnt[k] || 0) + 1; return cnt[k] > (failed[k] || 0) + (seen[k] || 0); });
      if (!row) break;
      const id = F.itemIdent(row), name = `${id.name} ${id.rating || ''}`.trim();
      R.total++;
      if (F.blocked(id.name)) { log(`   🔒 ${name}: protegido, deixei onde está.`); seen[id.name] = (seen[id.name] || 0) + 1; continue; }
      click(row); await pause(0.7);
      const club = await waitFor(() => fastFind(T.sendToClub), 4000);
      const dupItem = !club || club.disabled || club.classList.contains('disabled');
      try {
        if (!dupItem) {
          if (!cfg.uaClub) { seen[id.name] = (seen[id.name] || 0) + 1; continue; }
          click(club); await waitFor(() => !vis(club) || dialogs().length, 4000); closeDialog();
          R.done++; log(`   ✔ ${name} → clube.`, 'good');
        } else if (dup === 'tl') {
          const b = await waitFor(() => fastFind(T.sendToTL), 3000);
          if (!b || b.disabled) { failed[id.name] = (failed[id.name] || 0) + 1; log(`   ✖ ${name}: não deu para mandar para a Lista de transf. (cheia?)`, 'warn'); if (T.full.test(F.popupText())) { closeDialog(); break; } continue; }
          click(b); await waitFor(() => !vis(b) || dialogs().length, 4000);
          if (T.full.test(F.popupText())) { closeDialog(); log('   a Lista de Transferências está cheia; parei aqui.', 'warn'); break; }
          closeDialog(); R.done++; log(`   ✔ ${name} (repetida) → Lista de transf.`, 'good');
        } else if (dup === 'sell') {
          const l = await F.listCheapest({ minBn: 0, reselect: async () => { click(row); await pause(0.7); } });
          if (l.ok) { R.done++; log(`   ✔ ${name} (repetida) listada por ${fmt(l.bn)}.`, 'good'); }
          else { failed[id.name] = (failed[id.name] || 0) + 1; log(`   ✖ ${name}: não listei (${l.why}).`, 'warn'); closeDialog(); if (l.full) break; }
        } else { seen[id.name] = (seen[id.name] || 0) + 1; }
      } catch (e) {
        if (e instanceof Limited) { R.total--; await F.limitPause(e, log); await goToUnassigned(); continue; }
        if (e instanceof Stop) throw e;
        failed[id.name] = (failed[id.name] || 0) + 1; log(`   ✖ ${name}: ${e.message}`, 'warn'); closeDialog();
      }
      R.line = `${R.done} de ${R.total}`; F.changed();
      await pause(0.6);
    }
    log(`■ Não atribuídos: ${R.done} item(ns) organizados.`, 'good');
  }

  // ---------- Lista de Transferências ----------
  async function tlToClub() {
    log('▶ Lista de Transferências: enviando os não repetidos para o clube…', 'good');
    await F.goToTransferList(log);
    const b = find(T.sendNonDup);
    if (!b) { log('   não achei o botão de enviar os não repetidos (talvez não haja nenhum).', 'warn'); return; }
    click(b); await pause(); await confirmIfAsked();
    await waitFor(() => !loading(), 10000);
    log('■ Enviei os não repetidos para o clube.', 'good');
  }
  async function clearSoldNow() {
    log('▶ Lista de Transferências: retirando os vendidos…', 'good');
    await F.goToTransferList(log);
    const n = await F.clearSold(log);
    if (!n) log('   nenhum item vendido para retirar.');
  }

  // ---------- recompensas (experimental) ----------
  async function claim() {
    log('▶ Recompensas: procurando recompensas para resgatar…', 'good');
    let got = 0;
    const press = async () => {
      for (let k = 0; k < 25; k++) {
        if (F.stopping()) throw new Stop('Parado por você.');
        const b = fastFind(T.claimAll) || fastFind(T.claimOne);
        if (!b || b.disabled) break;
        click(b); got++; await pause(0.8);
        await confirmIfAsked(1500);
        for (let i = 0; i < 3 && dialogs().length; i++) { closeDialog(); await sleep(300); }
      }
    };
    await press();
    // tela de Objetivos
    const obj = [...document.querySelectorAll('.ut-tab-bar-item')].find(e => vis(e) && T.objectives.test(norm(e.textContent))) || F.navBtn(T.objectives) || leavesWithText(T.objectives)[0];
    if (obj) {
      click(obj.closest('.ut-tab-bar-item, button, [role=button], a') || obj);
      await waitFor(() => !loading(), 12000); await pause(1.5);
      await press();
      // abas dos objetivos (Temporada, Eventos…): passa por cada uma
      const tabs = [...document.querySelectorAll('.ut-tab-bar-view button, .tab-menu button, [role=tab]')].filter(e => vis(e) && !F.mine(e)).slice(0, 8);
      for (const t of tabs) { click(t); await waitFor(() => !loading(), 8000); await pause(); await press(); }
    }
    log(got ? `■ Resgatei ${got} recompensa(s).` : '■ Não achei recompensas para resgatar.', 'good');
  }

  const run = (what, fn) => {
    if (F.isBusy()) throw new Error('Outro módulo está trabalhando. Pare ele antes.');
    F.task('tools', what, async () => {
      try { await fn(); }
      catch (e) {
        if (e instanceof Limited) e = new Stop(`O EA pediu calma: "${e.message}".`);
        const byUser = e instanceof Stop && /^Parado/.test(e.message);
        log((e instanceof Stop ? '■ ' : '⚠ Erro: ') + e.message, byUser ? 'warn' : 'bad');
      } finally { R.line = ''; F.changed(); }
    }).catch(e => log('⚠ ' + e.message, 'bad'));
  };
  F.mod('tools', {
    status: () => ({ running: F.run.owner === 'tools', R }),
    async cmd(m) {
      if (m.op === 'unassigned') run('organizando os não atribuídos', unassigned);
      else if (m.op === 'tlToClub') run('enviando não repetidos ao clube', tlToClub);
      else if (m.op === 'clearSold') run('retirando os vendidos', clearSoldNow);
      else if (m.op === 'claim') run('resgatando recompensas', claim);
      else throw new Error('comando desconhecido');
      await sleep(50); return F.status();
    },
  });
})();
