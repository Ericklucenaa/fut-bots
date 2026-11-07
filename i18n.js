// Idiomas do FUT Bots: português (original), inglês e espanhol.
// Os textos do painel são escritos em português; aqui fica a tradução de cada um.
// tr(texto) traduz um texto; trLog(texto) traduz as mensagens mais comuns do log.
// Para corrigir uma tradução, ache a linha com o texto em português e mude o inglês/espanhol ao lado.
var I18N = (() => {
  // [português, inglês, espanhol]
  const W = [
    // ---------- geral ----------
    ['Início', 'Home', 'Inicio'], ['Sniper', 'Sniper', 'Sniper'], ['Mercado', 'Market', 'Mercado'], ['Estratégias', 'Strategies', 'Estrategias'],
    ['Simulador', 'Simulator', 'Simulador'], ['Galeria', 'Gallery', 'Galería'], ['Relist', 'Relist', 'Relist'], ['Dashboard', 'Dashboard', 'Panel'],
    ['Histórico', 'History', 'Historial'], ['Configurações', 'Settings', 'Ajustes'], ['Como usar', 'How to use', 'Cómo usar'], ['Snipe', 'Snipe', 'Snipe'],
    ['Paletools', 'Paletools', 'Paletools'], ['Geral', 'General', 'General'],
    ['Grátis e de código aberto', 'Free and open source', 'Gratis y de código abierto'],
    ['Se o FUT Bots te ajuda, um café ajuda o projeto a continuar.', 'If FUT Bots helps you, a coffee helps keep the project going.', 'Si FUT Bots te ayuda, un café ayuda a que el proyecto siga.'],
    ['Apoiar no Ko-fi', 'Support on Ko-fi', 'Apoyar en Ko-fi'], ['Código-fonte no GitHub', 'Source code on GitHub', 'Código fuente en GitHub'],
    ['Moedas', 'Coins', 'Monedas'], ['Lucro hoje', 'Profit today', 'Ganancia hoy'], ['Buscas 24 h', 'Searches 24 h', 'Búsquedas 24 h'], ['Risco', 'Risk', 'Riesgo'],
    ['Baixo', 'Low', 'Bajo'], ['Médio', 'Medium', 'Medio'], ['Alto', 'High', 'Alto'], ['baixo', 'low', 'bajo'], ['médio', 'medium', 'medio'], ['alto', 'high', 'alto'],
    ['Abrir Web App', 'Open Web App', 'Abrir Web App'], ['Parar', 'Stop', 'Detener'], ['Parando…', 'Stopping…', 'Deteniendo…'],
    ['procurando o Web App…', 'looking for the Web App…', 'buscando la Web App…'],
    ['Web App não está aberto', 'Web App is not open', 'La Web App no está abierta'],
    ['Web App aberto, mas o bot não respondeu (aperte F5 nele)', 'Web App is open but the bot did not respond (press F5 on it)', 'La Web App está abierta pero el bot no respondió (pulsa F5 en ella)'],
    ['Web App conectado', 'Web App connected', 'Web App conectada'], ['Pesquisar no Mercado', 'Search the Transfer Market', 'Buscar en el Mercado'],
    ['Galeria aberta', 'Gallery open', 'Galería abierta'], ['Lista de Transferências', 'Transfer List', 'Lista de transferibles'],
    ['Web App fechado ou sem resposta', 'Web App closed or not responding', 'Web App cerrada o sin respuesta'],
    ['Abrir', 'Open', 'Abrir'], ['Iniciar', 'Start', 'Iniciar'], ['Testar', 'Test', 'Probar'], ['Snipar', 'Snipe', 'Snipear'], ['Relistar', 'Relist', 'Relistar'],
    ['baixar', 'download', 'descargar'], ['limpar', 'clear', 'borrar'], ['detalhes', 'details', 'detalles'], ['ver tudo', 'see all', 'ver todo'],
    ['Nada por aqui ainda.', 'Nothing here yet.', 'Nada por aquí todavía.'], ['Qualquer', 'Any', 'Cualquiera'], ['moedas', 'coins', 'monedas'],
    ['Hoje', 'Today', 'Hoy'], ['7 dias', '7 days', '7 días'], ['30 dias', '30 days', '30 días'], ['Tudo', 'All', 'Todo'],
    ['Teste', 'Test', 'Prueba'], ['Assistido', 'Assisted', 'Asistido'], ['Automático', 'Automatic', 'Automático'],
    ['Oferta encontrada', 'Offer found', 'Oferta encontrada'], ['Comprar', 'Buy', 'Comprar'], ['Pular', 'Skip', 'Saltar'],
    ['aleatório', 'random', 'aleatorio'], ['Apagar', 'Delete', 'Borrar'], ['Carregar', 'Load', 'Cargar'], ['Minhas', 'Mine', 'Mías'], ['Prontas', 'Ready-made', 'Listas'],
    // o que cada módulo está fazendo
    ['snipando', 'sniping', 'snipeando'], ['completando a galeria', 'completing the gallery', 'completando la galería'],
    ['limpando a Lista de Transferências', 'clearing the Transfer List', 'limpiando la lista de transferibles'], ['relistando', 'relisting', 'relistando'],
    ['lendo o filtro', 'reading the filter', 'leyendo el filtro'], ['procurando jogador', 'looking up player', 'buscando jugador'],
    ['aplicando o filtro', 'applying the filter', 'aplicando el filtro'], ['conferindo o preço', 'checking the price', 'revisando el precio'],
    ['parando…', 'stopping…', 'deteniendo…'],
    // ---------- início ----------
    ['Os três módulos usam o mesmo Web App, um de cada vez. Deixe o Web App visível na outra janela enquanto eles trabalham.', 'The three tools share the same Web App, one at a time. Keep the Web App visible in the other window while they work.', 'Los tres módulos usan la misma Web App, uno a la vez. Deja la Web App visible en la otra ventana mientras trabajan.'],
    ['Snipe (estimado) + Galeria (vendido)', 'Snipe (estimated) + Gallery (sold)', 'Snipe (estimado) + Galería (vendido)'],
    ['Compras hoje', 'Buys today', 'Compras hoy'], ['Buscas em 24 h', 'Searches in 24 h', 'Búsquedas en 24 h'], ['risco', 'risk', 'riesgo'],
    ['Busca o seu filtro sem parar e compra no Comprar já até o seu preço.', 'Searches your filter nonstop and buys with Buy Now up to your price.', 'Busca tu filtro sin parar y compra con Comprar ya hasta tu precio.'],
    ['Compra as cartas que faltam nas galerias do Paletools e lista no mais barato.', 'Buys the missing cards in Paletools galleries and lists them at the cheapest price.', 'Compra las cartas que faltan en las galerías de Paletools y las publica al precio más bajo.'],
    ['Relista os expirados e os não listados da Lista de Transferências pelo mais barato.', 'Relists expired and unlisted Transfer List items at the cheapest price.', 'Vuelve a publicar los caducados y los no publicados de la lista de transferibles al precio más bajo.'],
    ['Atividade', 'Activity', 'Actividad'], ['Buscas', 'Searches', 'Búsquedas'], ['Compras', 'Buys', 'Compras'], ['Gasto', 'Spent', 'Gastado'],
    ['Simuladas', 'Simulated', 'Simuladas'], ['Compradas', 'Bought', 'Compradas'], ['Times', 'Teams', 'Equipos'], ['Listados', 'Listed', 'Publicados'], ['Tentados', 'Tried', 'Intentados'],
    ['Tela de busca aberta: pronto para snipar.', 'Search screen open: ready to snipe.', 'Pantalla de búsqueda abierta: listo para snipear.'],
    ['Abra Transfer. → Pesquisar no Mercado no Web App.', 'Open Transfers → Search the Transfer Market in the Web App.', 'Abre Transferencias → Buscar en el Mercado en la Web App.'],
    ['Abra a Gallery do Paletools no Web App.', 'Open the Paletools Gallery in the Web App.', 'Abre la Gallery de Paletools en la Web App.'],
    ['Abre a Lista de Transferências sozinho.', 'Opens the Transfer List on its own.', 'Abre la lista de transferibles por sí solo.'],
    ['expirados e não listados', 'expired and unlisted', 'caducados y no publicados'], ['expirados', 'expired', 'caducados'], ['não listados', 'unlisted', 'no publicados'], ['nada marcado', 'nothing selected', 'nada marcado'],
    ['modo teste', 'test mode', 'modo prueba'],
    // ---------- sniper ----------
    ['Repete a busca do Mercado com o seu filtro e compra no Comprar já tudo o que aparecer até o seu preço.', 'Repeats the market search with your filter and buys with Buy Now everything that shows up at or below your price.', 'Repite la búsqueda del Mercado con tu filtro y compra con Comprar ya todo lo que aparezca hasta tu precio.'],
    ['Filtro', 'Filter', 'Filtro'], ['Monte aqui ou copie o que estiver na tela de busca do Web App.', 'Build it here or copy what is on the Web App search screen.', 'Créalo aquí o copia lo que esté en la pantalla de búsqueda de la Web App.'],
    ['Ler do Web App', 'Read from Web App', 'Leer de la Web App'], ['Copiar da tela', 'Copy from screen', 'Copiar de la pantalla'], ['Limpar', 'Clear', 'Limpiar'], ['Aplicar no Web App', 'Apply to Web App', 'Aplicar en la Web App'],
    ['Lê as caixas de filtro do Web App (abra Pesquisar no Mercado, de jogadores ou consumíveis)', 'Reads the Web App filter boxes (open Search the Transfer Market, players or consumables)', 'Lee las casillas de filtro de la Web App (abre Buscar en el Mercado, jugadores o consumibles)'],
    ['Copia o que está selecionado no Web App agora', 'Copies what is selected in the Web App right now', 'Copia lo que está seleccionado en la Web App ahora'],
    ['Jogador (deixe vazio para qualquer um)', 'Player (leave empty for any)', 'Jugador (déjalo vacío para cualquiera)'], ['Buscar', 'Search', 'Buscar'],
    ['Nome do filtro (ex.: Ouros raros Premier League)', 'Filter name (e.g. Rare golds Premier League)', 'Nombre del filtro (ej.: Oros raros Premier League)'], ['Salvar filtro', 'Save filter', 'Guardar filtro'],
    ['Oferta', 'Offer', 'Oferta'], ['Até quanto o bot paga por carta.', 'The most the bot pays per card.', 'Lo máximo que el bot paga por carta.'],
    ['Por preço', 'By price', 'Por precio'], ['% de lucro', '% profit', '% de ganancia'], ['Valor mínimo do filtro', 'Filter minimum', 'Valor mínimo del filtro'],
    ['Comprar já mín. da busca (0 = qualquer)', 'Search Buy Now min. (0 = any)', 'Comprar ya mín. de la búsqueda (0 = cualquiera)'], ['Valor de oferta', 'Offer price', 'Valor de oferta'],
    ['Comprar já máx.: o bot nunca compra acima disso', 'Buy Now max.: the bot never buys above this', 'Comprar ya máx.: el bot nunca compra por encima de esto'],
    ['Lucro desejado (%)', 'Target profit (%)', 'Ganancia deseada (%)'], ['Reconferir o mercado a cada (min)', 'Recheck the market every (min)', 'Revisar el mercado cada (min)'],
    ['Variar o valor mínimo', 'Vary the minimum price', 'Variar el valor mínimo'], ['evita o cache de buscas iguais', 'avoids cached identical searches', 'evita la caché de búsquedas iguales'],
    ['Usar o máximo digitado no Web App', 'Use the max typed in the Web App', 'Usar el máximo escrito en la Web App'],
    ['Depois de comprar', 'After buying', 'Después de comprar'], ['Para onde a carta vai.', 'Where the card goes.', 'A dónde va la carta.'],
    ['Clube', 'Club', 'Club'], ['manda para o Meu Clube', 'sends to My Club', 'la envía a Mi Club'], ['Lista de transf.', 'Transfer list', 'Lista de transf.'], ['só envia, sem anunciar', 'just sends it, no listing', 'solo la envía, sin publicar'],
    ['Não atribuídos', 'Unassigned', 'No asignados'], ['deixa onde está', 'leaves it there', 'la deja donde está'], ['Vender', 'Sell', 'Vender'], ['anuncia no mercado', 'lists it on the market', 'la publica en el mercado'],
    ['Como vender', 'How to sell', 'Cómo vender'], ['Mais barato (Paletools)', 'Cheapest (Paletools)', 'Más barato (Paletools)'], ['Mais barato', 'Cheapest', 'Más barato'], ['Preço fixo', 'Fixed price', 'Precio fijo'],
    ['% sobre o que paguei', '% over what I paid', '% sobre lo que pagué'], ['Preço de venda (Comprar já)', 'Sale price (Buy Now)', 'Precio de venta (Comprar ya)'],
    ['No modo % de lucro, 0 = vende pelo preço de mercado', 'In % profit mode, 0 = sells at the market price', 'En modo % de ganancia, 0 = vende al precio de mercado'],
    ['Lucro sobre o que paguei (%)', 'Profit over what I paid (%)', 'Ganancia sobre lo que pagué (%)'],
    ['Já desconta os 5% do EA. Ex.: pagou 1.000 com 10% → anuncia por 1.200', 'Already accounts for the EA 5% tax. E.g. paid 1,000 at 10% → lists for 1,200', 'Ya descuenta el 5% de EA. Ej.: pagaste 1.000 con 10% → publica por 1.200'],
    ['Não vender com prejuízo', 'Never sell at a loss', 'No vender con pérdida'],
    ['se o preço − 5% do EA não cobrir o que paguei, usa o plano B', 'if price − EA 5% does not cover what I paid, uses plan B', 'si el precio − 5% de EA no cubre lo que pagué, usa el plan B'],
    ['Se não der certo', 'If it fails', 'Si no funciona'], ['Repetida no clube, lista cheia, venda com prejuízo ou botão que não apareceu', 'Duplicate in club, full list, sale at a loss or missing button', 'Repetida en el club, lista llena, venta con pérdida o botón que no apareció'],
    ['Deixar nos não atribuídos', 'Leave in unassigned', 'Dejar en no asignados'], ['Enviar para a Lista de transf.', 'Send to the transfer list', 'Enviar a la lista de transf.'],
    ['Defina o preço de venda.', 'Set the sale price.', 'Define el precio de venta.'],
    ['Preço 0 = vende pelo preço de mercado que o bot conferiu.', 'Price 0 = sells at the market price the bot checked.', 'Precio 0 = vende al precio de mercado que el bot revisó.'],
    ['Usa o botão "Mais barato" do Paletools e anuncia logo abaixo do mais barato.', 'Uses the Paletools "Cheapest" button and lists just below the cheapest.', 'Usa el botón "Más barato" de Paletools y publica justo por debajo del más barato.'],
    ['Ritmo e limites', 'Pace and limits', 'Ritmo y límites'], ['Quanto o bot busca, por quanto tempo e quando descansa.', 'How much the bot searches, for how long and when it rests.', 'Cuánto busca el bot, por cuánto tiempo y cuándo descansa.'],
    ['Carregar uma estratégia', 'Load a strategy', 'Cargar una estrategia'], ['Estratégia: personalizada', 'Strategy: custom', 'Estrategia: personalizada'],
    ['Limite de compras', 'Buy limit', 'Límite de compras'], ['0 = sem limite', '0 = no limit', '0 = sin límite'], ['Velocidade', 'Speed', 'Velocidad'], ['Rodar por', 'Run for', 'Ejecutar por'],
    ['Máx. de moedas gastas', 'Max. coins spent', 'Máx. de monedas gastadas'], ['Limite de buscas em 24 h', 'Search limit in 24 h', 'Límite de búsquedas en 24 h'],
    ['Espera entre buscas (ms)', 'Wait between searches (ms)', 'Espera entre búsquedas (ms)'], ['Buscas por rodada', 'Searches per round', 'Búsquedas por ronda'], ['Descanso entre rodadas', 'Rest between rounds', 'Descanso entre rondas'],
    ['Turbo', 'Turbo', 'Turbo'], ['Rápida', 'Fast', 'Rápida'], ['Normal', 'Normal', 'Normal'], ['Lenta', 'Slow', 'Lenta'], ['Personalizada', 'Custom', 'Personalizada'],
    ['Sem limite', 'No limit', 'Sin límite'], ['15 minutos', '15 minutes', '15 minutos'], ['30 minutos', '30 minutes', '30 minutos'], ['1 hora', '1 hour', '1 hora'], ['1h30', '1h30', '1h30'],
    ['2 horas', '2 hours', '2 horas'], ['3 horas', '3 hours', '3 horas'],
    ['Buscas 24 h', 'Searches 24 h', 'Búsquedas 24 h'], ['Minutos', 'Minutes', 'Minutos'], ['sem limite', 'no limit', 'sin límite'],
    ['sem problemas registrados', 'no problems recorded', 'sin problemas registrados'],
    ['Filtros salvos', 'Saved filters', 'Filtros guardados'], ['Alternar', 'Rotate', 'Alternar'], ['Usar ao alternar filtros', 'Use when rotating filters', 'Usar al alternar filtros'],
    ['Valor de oferta deste filtro (vazio = o do painel)', 'Offer price for this filter (empty = the panel one)', 'Valor de oferta de este filtro (vacío = el del panel)'],
    ['Aplicar no Web App', 'Apply to Web App', 'Aplicar en la Web App'], ['Carregar no editor', 'Load in editor', 'Cargar en el editor'],
    ['Nenhum filtro salvo. Monte um ao lado e clique em Salvar filtro.', 'No saved filters. Build one on the left and click Save filter.', 'Ningún filtro guardado. Crea uno al lado y haz clic en Guardar filtro.'],
    ['Log do Snipe', 'Snipe log', 'Log del Snipe'], ['Compras', 'Buys', 'Compras'], ['Limite', 'Limit', 'Límite'], ['Perdidas', 'Lost', 'Perdidas'], ['Depois', 'After', 'Después'],
    ['oferta', 'offer', 'oferta'], ['preço', 'price', 'precio'],
    ['até o máx. do Web App', 'up to the Web App max', 'hasta el máx. de la Web App'],
    // ---------- mercado / estratégias / simulador ----------
    ['Menor preço visto por filtro, coletado enquanto o Snipe busca.', 'Lowest price seen per filter, collected while Snipe searches.', 'Precio más bajo visto por filtro, recogido mientras el Snipe busca.'],
    ['Conferir o preço do filtro da tela', 'Check the price of the on-screen filter', 'Revisar el precio del filtro en pantalla'], ['(sem dados ainda)', '(no data yet)', '(sin datos todavía)'],
    ['Último preço', 'Last price', 'Último precio'], ['sem cotação', 'no quote', 'sin cotización'], ['Menor no período', 'Lowest in period', 'Mínimo del período'], ['Média no período', 'Average in period', 'Promedio del período'],
    ['Variação 24 h', 'Change 24 h', 'Variación 24 h'], ['cotação com mais de 1 h, pode estar desatualizada', 'quote older than 1 h, may be outdated', 'cotización con más de 1 h, puede estar desactualizada'],
    ['Menor oferta vista em cada busca do Snipe e nas conferências de mercado.', 'Lowest offer seen in each Snipe search and market check.', 'Oferta más baja vista en cada búsqueda del Snipe y en las revisiones de mercado.'],
    ['Alerta de preço', 'Price alert', 'Alerta de precio'], ['Som e aviso no log quando aparecer por até esse valor.', 'Sound and log notice when it shows up at or below this price.', 'Sonido y aviso en el log cuando aparezca hasta este valor.'],
    ['este filtro', 'this filter', 'este filtro'], ['por até', 'for up to', 'por hasta'], ['vazio = sem alerta', 'empty = no alert', 'vacío = sin alerta'],
    ['Configurações prontas do Sniper. Os filtros ficam em "Filtros salvos".', 'Ready-made Sniper settings. Filters live in "Saved filters".', 'Configuraciones listas del Sniper. Los filtros están en "Filtros guardados".'],
    ['Nome (ex.: Jogadores 83–89)', 'Name (e.g. Players 83–89)', 'Nombre (ej.: Jugadores 83–89)'], ['Salvar a configuração atual', 'Save current settings', 'Guardar la configuración actual'],
    ['Ajuste oferta, venda e ritmo no Sniper e salve aqui para reutilizar.', 'Tune offer, selling and pace in the Sniper and save here to reuse.', 'Ajusta oferta, venta y ritmo en el Sniper y guarda aquí para reutilizar.'],
    ['Uma estratégia guarda oferta, modo (preço/lucro), destino, limites, velocidade, tempo, buscas por rodada e descanso.', 'A strategy stores offer, mode (price/profit), destination, limits, speed, time, searches per round and rest.', 'Una estrategia guarda oferta, modo (precio/ganancia), destino, límites, velocidad, tiempo, búsquedas por ronda y descanso.'],
    ['Conservadora', 'Conservative', 'Conservadora'], ['lenta, poucas buscas, sem prejuízo', 'slow, few searches, no losses', 'lenta, pocas búsquedas, sin pérdidas'],
    ['Equilibrada', 'Balanced', 'Equilibrada'], ['rápida com descansos', 'fast with breaks', 'rápida con descansos'], ['Agressiva', 'Aggressive', 'Agresiva'],
    ['turbo — mais chance de limite do EA', 'turbo — higher chance of EA limits', 'turbo — más probabilidad de límite de EA'], ['Ouro raro · 10%', 'Rare gold · 10%', 'Oro raro · 10%'],
    ['por lucro, revende no mais barato', 'by profit, resells at the cheapest', 'por ganancia, revende al más barato'], ['Consumíveis · 8%', 'Consumables · 8%', 'Consumibles · 8%'],
    ['abra a aba Consumíveis da busca', 'open the Consumables search tab', 'abre la pestaña Consumibles de la búsqueda'], ['Forragem DME', 'SBC fodder', 'Relleno de SBC'],
    ['compra barato e manda para o clube', 'buys cheap and sends to club', 'compra barato y envía al club'],
    ['Lucro, taxa do EA e orçamento antes de gastar moedas.', 'Profit, EA tax and budget before spending coins.', 'Ganancia, impuesto de EA y presupuesto antes de gastar monedas.'],
    ['Preço de compra', 'Buy price', 'Precio de compra'], ['Preço de venda', 'Sale price', 'Precio de venta'], ['Orçamento', 'Budget', 'Presupuesto'],
    ['Usar no Sniper (compra + venda por preço fixo)', 'Use in Sniper (buy + sell at fixed price)', 'Usar en el Sniper (compra + venta a precio fijo)'],
    ['Taxa do EA (5%)', 'EA tax (5%)', 'Impuesto de EA (5%)'], ['Você recebe', 'You receive', 'Recibes'], ['Lucro por carta', 'Profit per card', 'Ganancia por carta'],
    ['Ponto de equilíbrio', 'Break-even', 'Punto de equilibrio'], ['menor venda sem prejuízo', 'lowest sale without loss', 'venta mínima sin pérdida'], ['Cartas no orçamento', 'Cards in budget', 'Cartas en el presupuesto'],
    ['Lucro se vender todas', 'Profit if all sell', 'Ganancia si vendes todas'], ['Operação com lucro e dentro do orçamento.', 'Profitable and within budget.', 'Operación con ganancia y dentro del presupuesto.'],
    ['o preço de compra passa do orçamento', 'the buy price exceeds the budget', 'el precio de compra supera el presupuesto'],
    // ---------- galeria ----------
    ['Compra as cartas que faltam numa galeria do Paletools (até o seu preço) e lista no mais barato. Abra Paletools → Gallery no Web App e escolha a liga e o time.', 'Buys the missing cards of a Paletools gallery (up to your price) and lists them at the cheapest. Open Paletools → Gallery in the Web App and pick the league and team.', 'Compra las cartas que faltan en una galería de Paletools (hasta tu precio) y las publica al más barato. Abre Paletools → Gallery en la Web App y elige la liga y el equipo.'],
    ['Comprar', 'Buy', 'Comprar'], ['Lucro e vendas', 'Profit and sales', 'Ganancias y ventas'], ['Abra a Gallery', 'Open the Gallery', 'Abre la Gallery'], ['Web App fechado', 'Web App closed', 'Web App cerrada'],
    ['Paletools → Gallery, escolha a liga e o time.', 'Paletools → Gallery, pick the league and team.', 'Paletools → Gallery, elige la liga y el equipo.'], ['Completa.', 'Complete.', 'Completa.'],
    ['Faltam comprar', 'Left to buy', 'Faltan por comprar'], ['nesta rodada', 'this run', 'en esta ronda'], ['Regras', 'Rules', 'Reglas'],
    ['Valem para a próxima vez que você clicar em Iniciar.', 'Apply the next time you click Start.', 'Se aplican la próxima vez que hagas clic en Iniciar.'],
    ['Limpar a Lista de Transf. agora', 'Clear the transfer list now', 'Limpiar la lista de transf. ahora'], ['Compra', 'Buying', 'Compra'], ['Venda', 'Selling', 'Venta'], ['Ajustes', 'Tweaks', 'Ajustes'],
    ['Preço máximo por carta', 'Max price per card', 'Precio máximo por carta'], ['Acima disso, pula a carta', 'Above this, skips the card', 'Por encima de esto, salta la carta'],
    ['Gasto máximo total', 'Max total spend', 'Gasto máximo total'], ['Só o que falta', 'Only what is missing', 'Solo lo que falta'], ['Compra o necessário para completar o time', 'Buys what is needed to complete the team', 'Compra lo necesario para completar el equipo'],
    ['Quantidade por time', 'Amount per team', 'Cantidad por equipo'], ['Usada com "Só o que falta" desligado', 'Used with "Only what is missing" off', 'Se usa con "Solo lo que falta" apagado'],
    ['Respeitar as vagas', 'Respect open slots', 'Respetar las plazas'], ['Com quantidade manual, nunca passa do que falta', 'With a manual amount, never exceeds what is missing', 'Con cantidad manual, nunca supera lo que falta'],
    ['Ir para o próximo time', 'Go to the next team', 'Ir al siguiente equipo'], ['Ao terminar, abre o próximo da lista Set e pula os completos', 'When done, opens the next one in the Set list and skips completed ones', 'Al terminar, abre el siguiente de la lista Set y salta los completos'],
    ['Máximo de times', 'Max teams', 'Máximo de equipos'], ['0 = até o fim da liga', '0 = until the end of the league', '0 = hasta el final de la liga'],
    ['Listar no mais barato', 'List at the cheapest', 'Publicar al más barato'], ['Logo depois de comprar (Paletools → Mais barato)', 'Right after buying (Paletools → Cheapest)', 'Justo después de comprar (Paletools → Más barato)'],
    ['Não listar abaixo de', 'Do not list below', 'No publicar por debajo de'], ['0 = aceita qualquer preço; abaixo disso fica nos não atribuídos', '0 = any price; below it the card stays unassigned', '0 = cualquier precio; por debajo se queda en no asignados'],
    ['Limpar quando encher', 'Clear when full', 'Limpiar cuando se llene'], ['Retira vendidos e envia os não repetidos ao clube', 'Clears sold items and sends non-duplicates to the club', 'Retira los vendidos y envía los no repetidos al club'],
    ['Limpar a cada N compras', 'Clear every N buys', 'Limpiar cada N compras'], ['0 = desliga', '0 = off', '0 = apagado'], ['Limpar ao trocar de time', 'Clear when switching teams', 'Limpiar al cambiar de equipo'],
    ['Faz a limpeza entre um time e outro', 'Cleans up between one team and the next', 'Hace la limpieza entre un equipo y otro'],
    ['Pausa entre ações (ms)', 'Pause between actions (ms)', 'Pausa entre acciones (ms)'], ['Mínimo 300', 'Minimum 300', 'Mínimo 300'],
    ['Ofertas por carta', 'Offers per card', 'Ofertas por carta'], ['Se alguém comprar antes, tenta a próxima mais barata', 'If someone buys first, tries the next cheapest', 'Si alguien compra antes, intenta la siguiente más barata'],
    ['Lucro da galeria', 'Gallery profit', 'Ganancia de la galería'], ['Lucro realizado', 'Realized profit', 'Ganancia realizada'], ['Ainda não vendidas', 'Not sold yet', 'Aún no vendidas'],
    ['As vendas entram quando você (ou o Relist) abre a Lista de Transferências no Web App.', 'Sales are recorded when you (or Relist) open the Transfer List in the Web App.', 'Las ventas se registran cuando tú (o el Relist) abres la lista de transferibles en la Web App.'],
    ['Log da Galeria', 'Gallery log', 'Log de la Galería'], ['Desde que abri o Web App', 'Since I opened the Web App', 'Desde que abrí la Web App'], ['Últimos 7 dias', 'Last 7 days', 'Últimos 7 días'],
    ['Últimos 30 dias', 'Last 30 days', 'Últimos 30 días'], ['Personalizado…', 'Custom…', 'Personalizado…'], ['de', 'from', 'de'], ['até', 'to', 'hasta'],
    ['Exportar CSV', 'Export CSV', 'Exportar CSV'], ['Apagar o período', 'Delete the period', 'Borrar el período'], ['Vendidas', 'Sold', 'Vendidas'],
    ['Recebido (−5% do EA)', 'Received (−5% EA)', 'Recibido (−5% de EA)'], ['Se vender as listadas', 'If listed ones sell', 'Si se venden las publicadas'], ['pelo preço imediato', 'at the Buy Now price', 'al precio de Comprar ya'],
    ['Compra', 'Buying', 'Compra'], ['Jogador', 'Player', 'Jugador'], ['Time', 'Team', 'Equipo'], ['Pago', 'Paid', 'Pagado'], ['Listada', 'Listed', 'Publicada'], ['Vendida por', 'Sold for', 'Vendida por'],
    ['Lucro', 'Profit', 'Ganancia'], ['Situação', 'Status', 'Estado'], ['vendida', 'sold', 'vendida'], ['listada', 'listed', 'publicada'], ['não listada', 'not listed', 'no publicada'],
    ['desfazer', 'undo', 'deshacer'], ['marcar venda', 'mark sold', 'marcar venta'], ['Tirar do histórico', 'Remove from history', 'Quitar del historial'],
    ['Nenhuma compra da galeria neste período.', 'No gallery buys in this period.', 'Ninguna compra de la galería en este período.'],
    ['As vendas são reconhecidas quando a Lista de Transferências é aberta no Web App (itens vendidos). Se alguma não for, use "marcar venda". O período é pela data da compra.', 'Sales are detected when the Transfer List is opened in the Web App (sold items). If one is missed, use "mark sold". The period is by purchase date.', 'Las ventas se detectan cuando se abre la lista de transferibles en la Web App (objetos vendidos). Si alguna no se detecta, usa "marcar venta". El período es por fecha de compra.'],
    ['Iniciar teste', 'Start test', 'Iniciar prueba'], ['Iniciar compras', 'Start buying', 'Iniciar compras'], ['Comprar de verdade', 'Buy for real', 'Comprar de verdad'], ['Faltam', 'Missing', 'Faltan'], ['abra a Gallery', 'open the Gallery', 'abre la Gallery'],
    // ---------- relist ----------
    ['Abre a Lista de Transferências, retira os vendidos e anuncia de novo os itens parados pelo "Mais barato" do Paletools.', 'Opens the Transfer List, clears sold items and relists idle items at the Paletools "Cheapest" price.', 'Abre la lista de transferibles, retira los vendidos y vuelve a publicar los objetos parados al "Más barato" de Paletools.'],
    ['O que relistar', 'What to relist', 'Qué relistar'], ['Anúncios ativos e vendidos nunca são mexidos.', 'Active listings and sold items are never touched.', 'Los anuncios activos y vendidos nunca se tocan.'],
    ['Expirados', 'Expired', 'Caducados'], ['Itens cujo anúncio acabou sem venda', 'Items whose listing ended unsold', 'Objetos cuyo anuncio terminó sin venta'], ['Não listados', 'Unlisted', 'No publicados'],
    ['Itens parados na Lista de Transferências sem anúncio', 'Items sitting in the Transfer List without a listing', 'Objetos parados en la lista de transferibles sin anuncio'], ['Retirar vendidos', 'Clear sold', 'Retirar vendidos'],
    ['Clica em "Retirar vendidos" antes e depois (as moedas já caíram)', 'Clicks "Clear sold" before and after (coins are already credited)', 'Hace clic en "Retirar vendidos" antes y después (las monedas ya se acreditaron)'],
    ['Limites', 'Limits', 'Límites'], ['Preço mínimo para listar', 'Minimum listing price', 'Precio mínimo para publicar'],
    ['Se o mais barato estiver abaixo, o item fica parado · 0 = sem mínimo', 'If the cheapest is below it, the item stays put · 0 = no minimum', 'Si el más barato está por debajo, el objeto se queda parado · 0 = sin mínimo'],
    ['Máximo de itens por rodada', 'Max items per run', 'Máximo de objetos por ronda'], ['0 = todos', '0 = all', '0 = todos'],
    ['Dica: com a Galeria ou o Snipe vendendo no mais barato, rode o Relist de vez em quando para reanunciar o que expirou e registrar as vendas da Galeria.', 'Tip: with Gallery or Snipe selling at the cheapest, run Relist now and then to relist what expired and record Gallery sales.', 'Consejo: con la Galería o el Snipe vendiendo al más barato, ejecuta el Relist de vez en cuando para volver a publicar lo caducado y registrar las ventas de la Galería.'],
    ['Log do Relist', 'Relist log', 'Log del Relist'], ['Relistar agora', 'Relist now', 'Relistar ahora'], ['Mínimo', 'Minimum', 'Mínimo'], ['sem mínimo', 'no minimum', 'sin mínimo'],
    // ---------- dashboard / histórico ----------
    ['Banca, lucro e saúde da conta somando os módulos.', 'Coins, profit and account health across all tools.', 'Monedas, ganancias y salud de la cuenta sumando los módulos.'],
    ['Moedas agora', 'Coins now', 'Monedas ahora'], ['banca sem histórico ainda', 'no balance history yet', 'sin historial de monedas todavía'], ['no período:', 'in period:', 'en el período:'],
    ['Snipe · lucro estimado', 'Snipe · estimated profit', 'Snipe · ganancia estimada'], ['no preço anunciado, já sem os 5%', 'at the listed price, minus the 5%', 'al precio publicado, ya sin el 5%'],
    ['Snipe · ROI', 'Snipe · ROI', 'Snipe · ROI'], ['Snipe · acerto', 'Snipe · hit rate', 'Snipe · acierto'], ['Galeria · lucro realizado', 'Gallery · realized profit', 'Galería · ganancia realizada'],
    ['Carteira virtual (teste)', 'Virtual wallet (test)', 'Cartera virtual (prueba)'], ['Evolução da banca', 'Coin balance over time', 'Evolución de las monedas'], ['Saúde e risco', 'Health and risk', 'Salud y riesgo'],
    ['Buscas (24 h)', 'Searches (24 h)', 'Búsquedas (24 h)'], ['Buscas (última hora)', 'Searches (last hour)', 'Búsquedas (última hora)'], ['Perdidas para outros', 'Lost to others', 'Perdidas ante otros'],
    ['Timeouts', 'Timeouts', 'Timeouts'], ['Falhas', 'Failures', 'Fallos'], ['Erros', 'Errors', 'Errores'], ['Bloqueios / captcha', 'Blocks / captcha', 'Bloqueos / captcha'],
    ['Snipe por filtro', 'Snipe by filter', 'Snipe por filtro'], ['Lucro est.', 'Est. profit', 'Ganancia est.'], ['Acerto', 'Hit rate', 'Acierto'], ['Projetado', 'Projected', 'Proyectado'],
    ['Sem compras do Snipe no período.', 'No Snipe buys in this period.', 'Sin compras del Snipe en el período.'], ['Últimos problemas', 'Latest problems', 'Últimos problemas'],
    ['Nenhum problema no período.', 'No problems in this period.', 'Ningún problema en el período.'],
    ['Ainda não há dados suficientes para o gráfico de banca.', 'Not enough data for the balance chart yet.', 'Todavía no hay datos suficientes para el gráfico de monedas.'],
    ['Ainda não há dados suficientes para o gráfico de preço.', 'Not enough data for the price chart yet.', 'Todavía no hay datos suficientes para el gráfico de precios.'],
    ['Tudo o que os módulos compraram, perderam ou pularam.', 'Everything the tools bought, lost or skipped.', 'Todo lo que los módulos compraron, perdieron o saltaron.'],
    ['Todos os módulos', 'All tools', 'Todos los módulos'], ['Todos os resultados', 'All results', 'Todos los resultados'], ['Todos os filtros / times', 'All filters / teams', 'Todos los filtros / equipos'],
    ['Apagar histórico do Snipe', 'Delete Snipe history', 'Borrar historial del Snipe'], ['Quando', 'When', 'Cuándo'], ['Módulo', 'Tool', 'Módulo'], ['Resultado', 'Result', 'Resultado'],
    ['Preço', 'Price', 'Precio'], ['Filtro / time', 'Filter / team', 'Filtro / equipo'], ['Detalhe', 'Detail', 'Detalle'], ['Nada registrado com esses filtros.', 'Nothing recorded with these filters.', 'Nada registrado con estos filtros.'],
    ['Comprada', 'Bought', 'Comprada'], ['Simulada', 'Simulated', 'Simulada'], ['Perdida', 'Lost', 'Perdida'], ['Pulada', 'Skipped', 'Saltada'], ['Falhou', 'Failed', 'Falló'],
    ['Timeout', 'Timeout', 'Timeout'], ['Erro', 'Error', 'Error'], ['Bloqueio', 'Block', 'Bloqueo'], ['Parada', 'Stopped', 'Detenida'],
    ['alguém comprou antes', 'someone bought first', 'alguien compró antes'], ['a busca não respondeu em 15 s', 'the search did not respond in 15 s', 'la búsqueda no respondió en 15 s'],
    ['Filtro da tela', 'On-screen filter', 'Filtro de la pantalla'], ['Filtro do painel', 'Panel filter', 'Filtro del panel'], ['qualquer jogador', 'any player', 'cualquier jugador'],
    ['guardada nos não atribuídos', 'kept in unassigned', 'guardada en no asignados'], ['enviada ao clube', 'sent to club', 'enviada al club'], ['enviada para a Lista de transf.', 'sent to the transfer list', 'enviada a la lista de transf.'],
    ['você pulou (modo assistido)', 'you skipped it (assisted mode)', 'la saltaste (modo asistido)'],
    // ---------- configurações ----------
    ['Aparência, som e os seus dados.', 'Appearance, sound and your data.', 'Apariencia, sonido y tus datos.'], ['Tema', 'Theme', 'Tema'],
    ['Vale para o painel e para o widget do Web App.', 'Applies to the panel and the Web App widget.', 'Se aplica al panel y al widget de la Web App.'],
    ['Som ao comprar, nos alertas e quando um módulo para sozinho', 'Sound on buys, alerts and when a tool stops on its own', 'Sonido al comprar, en las alertas y cuando un módulo se detiene solo'],
    ['Backup', 'Backup', 'Copia de seguridad'], ['Configurações, filtros, estratégias, históricos e preços num arquivo .json. Importar substitui os dados atuais.', 'Settings, filters, strategies, history and prices in a .json file. Importing replaces the current data.', 'Configuración, filtros, estrategias, historiales y precios en un archivo .json. Importar reemplaza los datos actuales.'],
    ['Exportar backup', 'Export backup', 'Exportar copia'], ['Importar backup', 'Import backup', 'Importar copia'], ['Limpar dados', 'Clear data', 'Borrar datos'], ['Limpar o log', 'Clear the log', 'Borrar el log'],
    ['Apagar o histórico do Snipe', 'Delete Snipe history', 'Borrar el historial del Snipe'], ['Apagar os preços', 'Delete prices', 'Borrar los precios'], ['Apagar o lucro da Galeria', 'Delete Gallery profit', 'Borrar las ganancias de la Galería'],
    ['Idioma', 'Language', 'Idioma'],
    ['Brasa', 'Ember', 'Brasa'], ['Neon', 'Neon', 'Neón'], ['Oceano', 'Ocean', 'Océano'], ['Esmeralda', 'Emerald', 'Esmeralda'], ['Ouro FUT', 'FUT Gold', 'Oro FUT'], ['Carmesim', 'Crimson', 'Carmesí'],
    ['Galáxia', 'Galaxy', 'Galaxia'], ['Matrix', 'Matrix', 'Matrix'], ['Preto AMOLED', 'AMOLED Black', 'Negro AMOLED'], ['Claro', 'Light', 'Claro'],
    // ---------- versão nova ----------
    ['O que mudou', 'What changed', 'Qué cambió'], ['Baixar', 'Download', 'Descargar'], ['Recarregar', 'Reload', 'Recargar'],
    // ---------- meu clube (v2.5) ----------
    ['Meu clube', 'My club', 'Mi club'], ['Nota', 'Rating', 'Media'], ['Log do Clube', 'Club log', 'Log del Club'], ['Analisar clube', 'Analyze club', 'Analizar club'], ['Jogadores', 'Players', 'Jugadores'],
    ['Lê os jogadores do seu clube. Depois selecione as cartas e venda ou envie para a Lista de Transferências. O bot abre as telas sozinho.', 'Reads the players in your club. Then select cards and sell them or send them to the Transfer List. The bot opens the screens on its own.', 'Lee los jugadores de tu club. Luego selecciona las cartas y véndelas o envíalas a la lista de transferibles. El bot abre las pantallas solo.'],
    ['Buscar jogador', 'Search player', 'Buscar jugador'], ['Todas as qualidades', 'All qualities', 'Todas las calidades'], ['Todas as posições', 'All positions', 'Todas las posiciones'], ['Ouro', 'Gold', 'Oro'], ['Prata', 'Silver', 'Plata'], ['Bronze', 'Bronze', 'Bronce'],
    ['Negociáveis', 'Tradeable', 'Negociables'], ['Inegociáveis', 'Untradeable', 'No negociables'], ['Todas', 'All', 'Todas'], ['Negociável', 'Tradeable', 'Negociable'], ['Inegociável', 'Untradeable', 'No negociable'],
    ['Geral mín.', 'Min rating', 'Media mín.'], ['Geral máx.', 'Max rating', 'Media máx.'], ['Jogador', 'Player', 'Jugador'], ['Posição', 'Position', 'Posición'], ['Status', 'Status', 'Estado'],
    ['Selecionar as filtradas', 'Select filtered', 'Seleccionar las filtradas'], ['Limpar seleção', 'Clear selection', 'Limpiar selección'], ['Ação', 'Action', 'Acción'], ['selecionada(s)', 'selected', 'seleccionada(s)'],
    ['De verdade', 'For real', 'De verdad'], ['Preço de venda', 'Sale price', 'Precio de venta'], ['Comprar já de cada carta', 'Buy Now for each card', 'Compra ya de cada carta'],
    ['Não vender abaixo de', 'Do not sell below', 'No vender por debajo de'], ['0 = aceita qualquer preço', '0 = accepts any price', '0 = acepta cualquier precio'],
    ['Vender selecionadas', 'Sell selected', 'Vender seleccionadas'], ['Testar venda', 'Test sale', 'Probar venta'], ['Testar envio', 'Test sending', 'Probar envío'], ['Enviar para a Lista de Transferências', 'Send to Transfer List', 'Enviar a la lista de transferibles'],
    ['O mais barato segue Configurações → Menor preço do mercado (Paletools, se estiver ativo).', 'The lowest price follows Settings → Lowest market price (Paletools, if active).', 'El más barato sigue Ajustes → Precio más bajo del mercado (Paletools, si está activo).'],
    ['Ir para', 'Go to', 'Ir a'], ['Abre a tela no Web App.', 'Opens the screen in the Web App.', 'Abre la pantalla en la Web App.'], ['Jogadores do clube', 'Club players', 'Jugadores del club'],
    ['jogadores', 'players', 'jugadores'], ['lista incompleta', 'incomplete list', 'lista incompleta'], ['Ainda não analisado', 'Not analyzed yet', 'Aún sin analizar'],
    ['Nenhuma carta com esses filtros.', 'No cards with these filters.', 'Ninguna carta con estos filtros.'], ['Clique em Analisar clube para listar seus jogadores.', 'Click Analyze club to list your players.', 'Haz clic en Analizar club para listar tus jugadores.'],
    ['Informe um preço de venda de pelo menos 200.', 'Enter a sale price of at least 200.', 'Indica un precio de venta de al menos 200.'],
    ['Agir de verdade?\n\nO bot vai vender ou mover as cartas selecionadas. Teste antes no modo Teste.', 'Act for real?\n\nThe bot will sell or move the selected cards. Try Test mode first.', '¿Actuar de verdad?\n\nEl bot venderá o moverá las cartas seleccionadas. Prueba antes en modo Prueba.'],
    ['analisa o clube e vende as cartas escolhidas', 'analyzes the club and sells the chosen cards', 'analiza el club y vende las cartas elegidas'], ['analisando o clube', 'analyzing the club', 'analizando el club'], ['vendendo cartas do clube', 'selling club cards', 'vendiendo cartas del club'],
    ['enviando cartas para a Lista de Transferências', 'sending cards to the Transfer List', 'enviando cartas a la lista de transferibles'], ['abrindo a tela pedida', 'opening the requested screen', 'abriendo la pantalla pedida'],
    ['Menor preço', 'Lowest price', 'Precio más bajo'], ['Buscar menor preço', 'Find lowest price', 'Buscar precio más bajo'], ['sem oferta', 'no offers', 'sin ofertas'], ['Ordenar por preço', 'Sort by price', 'Ordenar por precio'],
    ['Pergunta o preço direto ao Web App, sem abrir telas. Cada carta conta como uma busca no mercado.', 'Asks the Web App for the price directly, without opening screens. Each card counts as one market search.', 'Pregunta el precio directamente a la Web App, sin abrir pantallas. Cada carta cuenta como una búsqueda en el mercado.'],
    ['Valor estimado', 'Estimated value', 'Valor estimado'], ['já tirando os 5% do EA', 'after the 5% EA tax', 'ya descontado el 5% de EA'], ['buscando o menor preço', 'looking up the lowest price', 'buscando el precio más bajo'],
    ['Comprei', 'Bought', 'Comprada'], ['Venda', 'Sale', 'Venta'], ['Lucro', 'Profit', 'Ganancia'], ['Lucro estimado', 'Estimated profit', 'Ganancia estimada'], ['Menor preço atual do mercado', 'Current lowest market price', 'Precio más bajo actual del mercado'],
    ['Último valor pago por essa carta. Vazio em cartas de pacote ou recompensa.', 'Last price paid for this card. Empty for pack or reward cards.', 'Último valor pagado por esta carta. Vacío en cartas de sobres o recompensas.'], ['Venda menos os 5% do EA, menos o que você pagou', 'Sale minus the 5% EA tax, minus what you paid', 'Venta menos el 5% de EA, menos lo que pagaste'],
    ['Com e sem time', 'In and out of squad', 'Con y sin equipo'], ['Fora do time ativo', 'Not in active squad', 'Fuera del equipo activo'], ['No time ativo', 'In active squad', 'En el equipo activo'], ['No time', 'In squad', 'En equipo'], ['Lucro mín.', 'Min profit', 'Ganancia mín.'],
    ['Só com lucro', 'Profit only', 'Solo con ganancia'], ['Bronzes e pratas', 'Bronze and silver', 'Bronces y platas'], ['Paradas de maior valor', 'Idle, highest value', 'Paradas de mayor valor'], ['Limpar filtros', 'Clear filters', 'Limpiar filtros'], ['Exportar CSV', 'Export CSV', 'Exportar CSV'],
    ['Busca precisa', 'Precise search', 'Búsqueda precisa'], ['até 4 buscas por carta', 'up to 4 searches per card', 'hasta 4 búsquedas por carta'], ['Snipar este jogador', 'Snipe this player', 'Snipear este jugador'], ['Acompanhar e ver o gráfico', 'Watch and see the chart', 'Seguir y ver el gráfico'],
    ['Transferências', 'Transfers', 'Transferencias'], ['A Lista de Transferências sem sair do painel, com o lucro real de cada venda (já tirando os 5% do EA).', 'The Transfer List without leaving the panel, with the real profit of each sale (after the 5% EA tax).', 'La lista de transferibles sin salir del panel, con la ganancia real de cada venta (ya descontado el 5% de EA).'],
    ['Atualizar', 'Refresh', 'Actualizar'], ['Atualizada', 'Updated', 'Actualizada'], ['Clique em Atualizar para ler a lista.', 'Click Refresh to read the list.', 'Haz clic en Actualizar para leer la lista.'], ['Lista agora', 'List now', 'Lista ahora'], ['Vendas registradas', 'Recorded sales', 'Ventas registradas'], ['Situação', 'State', 'Situación'], ['Preço', 'Price', 'Precio'], ['Resta', 'Left', 'Resta'], ['Quando', 'When', 'Cuándo'], ['Vendi', 'Sold for', 'Vendida'],
    ['À venda', 'On sale', 'En venta'], ['Vendida', 'Sold', 'Vendida'], ['Expirada', 'Expired', 'Caducada'], ['Não listada', 'Not listed', 'Sin publicar'], ['Outro', 'Other', 'Otro'], ['Expiradas', 'Expired', 'Caducadas'], ['Vendidas na lista', 'Sold in list', 'Vendidas en la lista'], ['Lucro real hoje', 'Real profit today', 'Ganancia real hoy'], ['Lucro real 7 dias', 'Real profit 7 days', 'Ganancia real 7 días'], ['Lucro real total', 'Real profit total', 'Ganancia real total'],
    ['Nada na lista.', 'Nothing in the list.', 'Nada en la lista.'], ['Nenhuma venda registrada ainda.', 'No sales recorded yet.', 'Aún no hay ventas registradas.'], ['Vendas · lucro real', 'Sales · real profit', 'Ventas · ganancia real'],
    ['Acompanhar', 'Watch', 'Seguir'], ['Avisa quando um jogador chega no preço que você quer e guarda o histórico de preço.', 'Alerts you when a player reaches your price and keeps the price history.', 'Avisa cuando un jugador llega al precio que quieres y guarda el historial de precios.'], ['Cada jogador é uma busca no mercado a cada conferência.', 'Each player is one market search per check.', 'Cada jugador es una búsqueda en el mercado por comprobación.'], ['Conferir agora', 'Check now', 'Comprobar ahora'], ['Buscar jogador (3 letras)', 'Search player (3 letters)', 'Buscar jugador (3 letras)'],
    ['Alvo', 'Target', 'Objetivo'], ['Último preço', 'Last price', 'Último precio'], ['no alvo', 'on target', 'en objetivo'], ['Remover', 'Remove', 'Quitar'], ['Busque um jogador acima para acompanhar.', 'Search for a player above to watch.', 'Busca un jugador arriba para seguirlo.'], ['Selecione um jogador', 'Select a player', 'Selecciona un jugador'], ['Histórico de preço', 'Price history', 'Historial de precios'], ['Clique num jogador para ver o histórico. Cada busca de preço gera um ponto.', 'Click a player to see the history. Each price lookup adds a point.', 'Haz clic en un jugador para ver el historial. Cada búsqueda de precio añade un punto.'],
    ['Conferência automática', 'Automatic check', 'Comprobación automática'], ['Conferir sozinho', 'Check on its own', 'Comprobar solo'], ['desligado por padrão', 'off by default', 'desactivado por defecto'], ['Intervalo em minutos (mínimo 10)', 'Interval in minutes (minimum 10)', 'Intervalo en minutos (mínimo 10)'], ['Só roda com o Web App aberto e livre, e respeita o limite de buscas em 24 h. Mais jogadores e intervalos curtos aumentam o risco de limite do EA.', 'Only runs with the Web App open and free, and follows the 24 h search limit. More players and short intervals raise the risk of an EA limit.', 'Solo funciona con la Web App abierta y libre, y respeta el límite de búsquedas en 24 h. Más jugadores e intervalos cortos aumentan el riesgo de límite de EA.'],
    ['Notificações do Windows', 'Windows notifications', 'Notificaciones de Windows'], ['carta vendida, preço no alvo, captcha e avisos do EA', 'card sold, price on target, captcha and EA warnings', 'carta vendida, precio en objetivo, captcha y avisos de EA'], ['Conferir vendas a cada 5 min', 'Check sales every 5 min', 'Comprobar ventas cada 5 min'], ['lê a Lista de Transferências, não é busca no mercado', 'reads the Transfer List, not a market search', 'lee la lista de transferibles, no es búsqueda en el mercado'],
    ['acompanhando preços', 'watching prices', 'siguiendo precios'],
    // ---------- ferramentas (v2.4) ----------
    ['Ferramentas', 'Tools', 'Herramientas'], ['Clube', 'Club', 'Club'], ['organiza o clube e as listas', 'organizes the club and lists', 'organiza el club y las listas'],
    ['Ações de uma vez só para organizar o clube e as listas. Cada uma roda quando você clica.', 'One-off actions to organize the club and lists. Each one runs when you click it.', 'Acciones puntuales para organizar el club y las listas. Cada una se ejecuta cuando haces clic.'],
    ['Abre os não atribuídos e organiza item por item.', 'Opens the unassigned pile and sorts it item by item.', 'Abre los no asignados y los organiza objeto por objeto.'], ['Organizar agora', 'Organize now', 'Organizar ahora'],
    ['Não repetidos vão para o clube', 'Non-duplicates go to the club', 'Los no repetidos van al club'], ['Cartas que você ainda não tem', 'Cards you do not own yet', 'Cartas que aún no tienes'],
    ['Repetidos', 'Duplicates', 'Repetidos'], ['Cartas que já estão no clube', 'Cards already in the club', 'Cartas que ya están en el club'], ['Vender no mais barato', 'Sell at the cheapest', 'Vender al más barato'], ['Deixar', 'Leave', 'Dejar'],
    ['Ações rápidas na lista.', 'Quick actions on the list.', 'Acciones rápidas en la lista.'], ['Enviar não repetidos ao clube', 'Send non-duplicates to club', 'Enviar no repetidos al club'],
    ['Retirar vendidos (e registrar o lucro)', 'Clear sold (and record profit)', 'Retirar vendidos (y registrar la ganancia)'], ['Relistar…', 'Relist…', 'Relistar…'], ['Recompensas', 'Rewards', 'Recompensas'],
    ['Procura botões de resgatar na tela atual e em Objetivos. Experimental: me avise se não achar alguma.', 'Looks for claim buttons on the current screen and in Objectives. Experimental: let us know if it misses one.', 'Busca botones de reclamar en la pantalla actual y en Objetivos. Experimental: avísanos si se le escapa alguna.'],
    ['Resgatar recompensas', 'Claim rewards', 'Reclamar recompensas'], 
    ['Ex.: Vinícius Júnior', 'E.g. Vinícius Júnior', 'Ej.: Vinícius Júnior'], ['Log das Ferramentas', 'Tools log', 'Log de las Herramientas'], ['Ferramenta iniciada no Web App.', 'Tool started in the Web App.', 'Herramienta iniciada en la Web App.'],
    ['Atalhos de teclado no Web App', 'Keyboard shortcuts in the Web App', 'Atajos de teclado en la Web App'],
    ['Alt+Shift+S Snipe · Alt+Shift+G Galeria · Alt+Shift+R Relist · Alt+Shift+X parar · Enter/Esc no modo assistido', 'Alt+Shift+S Snipe · Alt+Shift+G Gallery · Alt+Shift+R Relist · Alt+Shift+X stop · Enter/Esc in assisted mode', 'Alt+Shift+S Snipe · Alt+Shift+G Galería · Alt+Shift+R Relist · Alt+Shift+X detener · Enter/Esc en modo asistido'],
    ['Menor preço do mercado', 'Lowest market price', 'Precio más bajo del mercado'], ['Usado na venda do Sniper, na Galeria, no Relist e nas Ferramentas.', 'Used for Sniper selling, Gallery, Relist and Tools.', 'Se usa en la venta del Sniper, la Galería, el Relist y las Herramientas.'],
    ['Automático (Paletools se estiver ativo, senão a extensão)', 'Automatic (Paletools if active, otherwise the extension)', 'Automático (Paletools si está activo, si no la extensión)'],
    ['Sempre pela extensão (sem Paletools)', 'Always by the extension (no Paletools)', 'Siempre por la extensión (sin Paletools)'], ['Sempre pelo Paletools', 'Always by Paletools', 'Siempre por Paletools'],
    ['Pela extensão: abre "Comparar preço" do item, vê a oferta mais barata e anuncia um degrau abaixo. Funciona sem o Paletools.', 'By the extension: opens the item "Compare Price", finds the cheapest offer and lists one step below. Works without Paletools.', 'Por la extensión: abre "Comparar precio" del objeto, ve la oferta más barata y publica un escalón por debajo. Funciona sin Paletools.'],
    ['Anuncia logo abaixo do mais barato do mercado (pelo Paletools, se estiver ativo, ou pela busca da própria extensão).', 'Lists just below the cheapest on the market (via Paletools if active, or the extension own search).', 'Publica justo por debajo del más barato del mercado (con Paletools si está activo, o con la búsqueda de la propia extensión).'],
    ['Snipe · lucro realizado', 'Snipe · realized profit', 'Snipe · ganancia realizada'], ['vendas entram ao abrir a Lista de Transf.', 'sales are recorded when the Transfer List opens', 'las ventas se registran al abrir la lista de transf.'],
    ['organizando os não atribuídos', 'organizing unassigned', 'organizando los no asignados'], ['enviando não repetidos ao clube', 'sending non-duplicates to club', 'enviando no repetidos al club'],
    ['retirando os vendidos', 'clearing sold items', 'retirando los vendidos'], ['resgatando recompensas', 'claiming rewards', 'reclamando recompensas'],
    // ---------- widget ----------
    ['Abrir o painel', 'Open the panel', 'Abrir el panel'], ['Minimizar', 'Minimize', 'Minimizar'], ['pronto', 'ready', 'listo'],
    ['na Lista de Transf.', 'on the Transfer List', 'en la lista de transf.'], ['abre a Lista sozinho', 'opens the list itself', 'abre la lista solo'],
  ];
  // textos com números ou nomes no meio: [regex, inglês, espanhol]
  const P = [
    [/^(.+) gastas$/, '$1 spent', '$1 gastadas'], [/^(.+) pontos$/, '$1 points', '$1 puntos'], [/^(\d+) registro\(s\)$/, '$1 record(s)', '$1 registro(s)'],
    [/^(\d+) no Snipe$/, '$1 in Snipe', '$1 en el Snipe'], [/^(\d+) na Galeria$/, '$1 in Gallery', '$1 en la Galería'], [/^(\d+) simulada\(s\)$/, '$1 simulated', '$1 simulada(s)'],
    [/^(\d+) vendida\(s\) de (\d+) comprada\(s\)$/, '$1 sold of $2 bought', '$1 vendida(s) de $2 comprada(s)'], [/^(\d+) vendida\(s\)$/, '$1 sold', '$1 vendida(s)'],
    [/^(.+) usadas$/, '$1 used', '$1 usadas'], [/^(\d+)\/hora$/, '$1/hour', '$1/hora'], [/^(\d+) compras$/, '$1 buys', '$1 compras'],
    [/^(\d+) faltando com botão Mercado$/, '$1 missing with a Market button', '$1 faltantes con botón Mercado'],
    [/^(\d+) sua\(s\) sem incluir \(clique Include nelas\)$/, '$1 of yours not included (click Include on them)', '$1 tuya(s) sin incluir (haz clic en Include)'],
    [/^(\d+) perdida\(s\) para outros$/, '$1 lost to others', '$1 perdida(s) ante otros'], [/^(\d+) no lucro$/, '$1 in profit', '$1 con ganancia'],
    [/^custo (.+)$/, 'cost $1', 'costo $1'], [/^de (\d[\d.,]*)$/, 'of $1', 'de $1'], [/^até (\d+)$/, 'up to $1', 'hasta $1'], [/^até (.+) por carta$/, 'up to $1 per card', 'hasta $1 por carta'],
    [/^Até (.+) por carta$/, 'Up to $1 per card', 'Hasta $1 por carta'], [/^mínimo (.+)$/, 'minimum $1', 'mínimo $1'],
    [/^listada por (.+)$/, 'listed for $1', 'publicada por $1'], [/^oferta até (.+)$/, 'offer up to $1', 'oferta hasta $1'], [/^oferta (\d.*)$/, 'offer $1', 'oferta $1'],
    [/^(\d+)% de lucro$/, '$1% profit', '$1% de ganancia'], [/^lucro (\d+)%$/, '$1% profit', 'ganancia $1%'], [/^mín\. (.+)$/, 'min. $1', 'mín. $1'],
    [/^vendendo a (.+)$/, 'selling at $1', 'vendiendo a $1'], [/^Oferta máx\. para (\d+)%$/, 'Max offer for $1%', 'Oferta máx. para $1%'],
    [/^Menor preço · (.+)$/, 'Lowest price · $1', 'Precio más bajo · $1'], [/^ROI (.+)$/, 'ROI $1', 'ROI $1'], [/^versão (.+)$/, 'version $1', 'versión $1'],
    [/^até (\d+) compras$/, 'up to $1 buys', 'hasta $1 compras'], [/^(\d+) bloqueio\(s\)\/captcha em 24 h$/, '$1 block(s)/captcha in 24 h', '$1 bloqueo(s)/captcha en 24 h'],
    [/^(\d+) timeout\(s\)\/erro\(s\) na última hora$/, '$1 timeout(s)/error(s) in the last hour', '$1 timeout(s)/error(s) en la última hora'],
    [/^(\d+) buscas na última hora$/, '$1 searches in the last hour', '$1 búsquedas en la última hora'], [/^(\d+) buscas em 24 h$/, '$1 searches in 24 h', '$1 búsquedas en 24 h'],
    [/^(\d+) min$/, '$1 min', '$1 min'], [/^(.+)s para decidir$/, '$1s to decide', '$1 s para decidir'],
    [/^(Snipar|Testar|Snipar \(assistido\)) por (.+)$/, (m, a, b) => `${{ 'Snipar': 'Snipe', 'Testar': 'Test', 'Snipar (assistido)': 'Snipe (assisted)' }[a]} for ${b}`, (m, a, b) => `${{ 'Snipar': 'Snipear', 'Testar': 'Probar', 'Snipar (assistido)': 'Snipear (asistido)' }[a]} por ${b}`],
    [/^(Snipar|Testar|Snipar \(assistido\)) com (\d+)% de lucro$/, (m, a, b) => `${{ 'Snipar': 'Snipe', 'Testar': 'Test', 'Snipar (assistido)': 'Snipe (assisted)' }[a]} at ${b}% profit`, (m, a, b) => `${{ 'Snipar': 'Snipear', 'Testar': 'Probar', 'Snipar (assistido)': 'Snipear (asistido)' }[a]} con ${b}% de ganancia`],
    [/^(Snipar|Testar|Snipar \(assistido\)) até o máx\. do Web App$/, (m, a) => `${{ 'Snipar': 'Snipe', 'Testar': 'Test', 'Snipar (assistido)': 'Snipe (assisted)' }[a]} up to the Web App max`, (m, a) => `${{ 'Snipar': 'Snipear', 'Testar': 'Probar', 'Snipar (assistido)': 'Snipear (asistido)' }[a]} hasta el máx. de la Web App`],
    [/^Parar · ofertando até (.+)$/, 'Stop · offering up to $1', 'Detener · ofertando hasta $1'],
    [/^(Snipe|Galeria|Relist|Outro módulo) está trabalhando…$/, (m, a) => `${a === 'Galeria' ? 'Gallery' : a === 'Outro módulo' ? 'Another tool' : a} is working…`, (m, a) => `${a === 'Galeria' ? 'La Galería' : a === 'Outro módulo' ? 'Otro módulo' : 'El ' + a} está trabajando…`],
    [/^(Snipe|Galeria|Relist) iniciad[oa] no Web App\.$/, (m, a) => `${a === 'Galeria' ? 'Gallery' : a} started in the Web App.`, (m, a) => `${a === 'Galeria' ? 'Galería iniciada' : a + ' iniciado'} en la Web App.`],
    [/^Filtro "(.+)" salvo\.$/, 'Filter "$1" saved.', 'Filtro "$1" guardado.'], [/^"(.+)" carregado no editor\.$/, '"$1" loaded in the editor.', '"$1" cargado en el editor.'],
    [/^"(.+)" aplicado no Web App\.$/, '"$1" applied to the Web App.', '"$1" aplicado en la Web App.'], [/^Estratégia "(.+)" carregada\.$/, 'Strategy "$1" loaded.', 'Estrategia "$1" cargada.'],
    [/^Estratégia "(.+)" salva\.$/, 'Strategy "$1" saved.', 'Estrategia "$1" guardada.'], [/^Tema (.+)\.$/, (m, a) => `Theme ${tr(a)}.`, (m, a) => `Tema ${tr(a)}.`],
    [/^Filtro copiado do Web App \(oferta (.+)\)\.$/, 'Filter copied from the Web App (offer $1).', 'Filtro copiado de la Web App (oferta $1).'],
    [/^Filtro copiado do Web App \((.+)\)\.$/, 'Filter copied from the Web App ($1).', 'Filtro copiado de la Web App ($1).'],
    [/^Preço de mercado: (.+)$/, 'Market price: $1', 'Precio de mercado: $1'], [/^Sniper: compra até (.+), vende por (.+)\.$/, 'Sniper: buys up to $1, sells for $2.', 'Sniper: compra hasta $1, vende por $2.'],
    [/^dá prejuízo: precisa vender por pelo menos (.+)$/, 'loses money: needs to sell for at least $1', 'da pérdida: necesita vender por al menos $1'],
    [/^(.+) não é um preço válido no FUT \(vira (.+)\)$/, '$1 is not a valid FUT price (becomes $2)', '$1 no es un precio válido en FUT (queda en $2)'],
    [/^Galeria → Lucro e vendas$/, 'Gallery → Profit and sales', 'Galería → Ganancias y ventas'],
    [/^faltam (.+)$/, '$1 missing', 'faltan $1'], [/^(\d+) venda\(s\) confirmada\(s\)$/, '$1 confirmed sale(s)', '$1 venta(s) confirmada(s)'], [/^: (\d+)\/(\S+)$/, ': $1/$2', ': $1/$2'],
    [/^Apagar o filtro "(.+)"\?$/, 'Delete the filter "$1"?', '¿Borrar el filtro "$1"?'],
    [/^Por quanto (.+) foi vendida\? \(valor cheio, antes dos 5% do EA\)$/, 'How much did $1 sell for? (full amount, before the EA 5% tax)', '¿Por cuánto se vendió $1? (valor completo, antes del 5% de EA)'],
    [/^(.+): (\d+)\/(\d+|\?) nesta galeria$/, '$1: $2/$3 in this gallery', '$1: $2/$3 en esta galería'],
    [/^(\d+) listado\(s\) de (\d+)$/, '$1 listed of $2', '$1 publicado(s) de $2'],
    [/^pausa (\d+)s \(aviso do EA\)$/, 'pause $1s (EA warning)', 'pausa $1 s (aviso de EA)'], [/^descansando (\d+)s$/, 'resting $1s', 'descansando $1 s'],
  ];
  const WORDS = [
    ['Filtro copiado do Web App.', 'Filter copied from the Web App.', 'Filtro copiado de la Web App.'], ['Filtros do Web App lidos.', 'Web App filters read.', 'Filtros de la Web App leídos.'],
    ['Filtro aplicado no Web App.', 'Filter applied to the Web App.', 'Filtro aplicado en la Web App.'], ['Feito.', 'Done.', 'Hecho.'], ['Parando…', 'Stopping…', 'Deteniendo…'],
    ['Snipe iniciado no Web App.', 'Snipe started in the Web App.', 'Snipe iniciado en la Web App.'], ['Galeria iniciada no Web App.', 'Gallery started in the Web App.', 'Galería iniciada en la Web App.'],
    ['Relist iniciado no Web App.', 'Relist started in the Web App.', 'Relist iniciado en la Web App.'], ['Limpando a Lista de Transferências no Web App…', 'Clearing the Transfer List in the Web App…', 'Limpiando la lista de transferibles en la Web App…'],
    ['Ninguém vendendo esse filtro agora.', 'Nobody is selling this filter right now.', 'Nadie está vendiendo este filtro ahora.'], ['Dê um nome para a estratégia.', 'Give the strategy a name.', 'Ponle un nombre a la estrategia.'],
    ['Arquivo de backup inválido.', 'Invalid backup file.', 'Archivo de copia no válido.'], ['Digite pelo menos 3 letras do nome.', 'Type at least 3 letters of the name.', 'Escribe al menos 3 letras del nombre.'],
    ['Nenhum jogador encontrado com esse nome.', 'No player found with that name.', 'Ningún jugador encontrado con ese nombre.'],
    ['Abra o Web App do EA FC numa aba (e faça login).', 'Open the EA FC Web App in a tab (and log in).', 'Abre la Web App de EA FC en una pestaña (e inicia sesión).'],
    ['O bot não respondeu no Web App. Recarregue a aba do Web App (F5).', 'The bot did not respond in the Web App. Reload the Web App tab (F5).', 'El bot no respondió en la Web App. Recarga la pestaña de la Web App (F5).'],
    ['Outro módulo está trabalhando. Pare ele antes.', 'Another tool is working. Stop it first.', 'Otro módulo está trabajando. Detenlo primero.'],
    ['Filtro do painel limpo: o Sniper vai usar o filtro da tela do Web App.', 'Panel filter cleared: the Sniper will use the Web App on-screen filter.', 'Filtro del panel borrado: el Sniper usará el filtro de la pantalla de la Web App.'],
    ['Abra a Gallery do Paletools no Web App (escolha a liga e o time) e clique em Iniciar.', 'Open the Paletools Gallery in the Web App (pick the league and team) and click Start.', 'Abre la Gallery de Paletools en la Web App (elige la liga y el equipo) y haz clic en Iniciar.'],
    ['Abra Transfer. → Pesquisar no Mercado, monte o seu filtro e clique em Snipar.', 'Open Transfers → Search the Transfer Market, set your filter and click Snipe.', 'Abre Transferencias → Buscar en el Mercado, arma tu filtro y haz clic en Snipear.'],
    ['Apagar o filtro', 'Delete the filter', 'Borrar el filtro'], ['Tem certeza?', 'Are you sure?', '¿Seguro?'], ['Apagar essa estratégia?', 'Delete this strategy?', '¿Borrar esta estrategia?'],
    ['Tirar esta compra do histórico?', 'Remove this buy from history?', '¿Quitar esta compra del historial?'], ['Apagar as compras da galeria deste período?', 'Delete gallery buys from this period?', '¿Borrar las compras de la galería de este período?'],
    ['Substituir os dados atuais pelo backup?', 'Replace the current data with the backup?', '¿Reemplazar los datos actuales por la copia?'],
    ['Apagar todo o histórico do Snipe (compras e ocorrências)? O lucro da Galeria fica na página Galeria.', 'Delete the entire Snipe history (buys and events)? Gallery profit stays on the Gallery page.', '¿Borrar todo el historial del Snipe (compras y eventos)? Las ganancias de la Galería quedan en la página Galería.'],
    ['Comprar de verdade?\n\nO bot vai gastar moedas e listar as cartas. Teste antes no modo Teste.', 'Buy for real?\n\nThe bot will spend coins and list the cards. Try Test mode first.', '¿Comprar de verdad?\n\nEl bot gastará monedas y publicará las cartas. Prueba antes el modo Prueba.'],
  ];
  // mensagens do log (motores escrevem em português)
  const LP = [
    // Meu clube
    [/^▶ Clube: lendo todos os jogadores…$/, '▶ Club: reading all players…', '▶ Club: leyendo todos los jugadores…'],
    [/^ {3}abrindo Clube( \(de novo\))?…$/, '   opening Club$1…', '   abriendo Club$1…'], [/^ {3}abrindo Jogadores…$/, '   opening Players…', '   abriendo Jugadores…'],
    [/^■ Clube: (\d+) jogador\(es\) em (\d+) página\(s\)(.*)\.$/, '■ Club: $1 player(s) on $2 page(s)$3.', '■ Club: $1 jugador(es) en $2 página(s)$3.'],
    [/^ {3}dados do Web App: (\d+) de (\d+) carta\(s\) identificadas\.$/, '   Web App data: $1 of $2 card(s) identified.', '   datos de la Web App: $1 de $2 carta(s) identificadas.'],
    [/^▶ Clube: buscar o menor preço, (\d+) carta\(s\)(.*)\.$/, '▶ Club: find lowest price, $1 card(s)$2.', '▶ Club: buscar el precio más bajo, $1 carta(s)$2.'],
    [/^ {3}✔ (.+): menor preço (.+)\.$/, '   ✔ $1: lowest price $2.', '   ✔ $1: precio más bajo $2.'], [/^ {3}✔ (.+): ninguém vendendo agora\.$/, '   ✔ $1: no one selling now.', '   ✔ $1: nadie vendiendo ahora.'],
    [/^■ Clube: (\d+) de (\d+) preço\(s\) buscado\(s\)(.*)\.$/, '■ Club: $1 of $2 price(s) found$3.', '■ Club: $1 de $2 precio(s) buscado(s)$3.'],
    [/^ {3}\[teste\] (.+): venderia\.$/, '   [test] $1: would sell.', '   [prueba] $1: vendería.'], [/^ {3}\[teste\] (.+): enviaria para a Lista de Transferências\.$/, '   [test] $1: would send to the Transfer List.', '   [prueba] $1: enviaría a la lista de transferibles.'],
    [/^ {3}✔ (.+) listada por (.+)\.$/, '   ✔ $1 listed for $2.', '   ✔ $1 publicada por $2.'], [/^ {3}✔ (.+) → Lista de Transferências\.$/, '   ✔ $1 → Transfer List.', '   ✔ $1 → lista de transferibles.'],
    [/^■ Pronto: tela aberta no Web App\.$/, '■ Done: screen open in the Web App.', '■ Listo: pantalla abierta en la Web App.'],
    [/^💰 (\d+) venda\(s\) nova\(s\) registrada\(s\)\.$/, '💰 $1 new sale(s) recorded.', '💰 $1 venta(s) nueva(s) registrada(s).'],
    [/^▶ Acompanhar: conferindo (\d+) jogador\(es\)\.$/, '▶ Watch: checking $1 player(s).', '▶ Seguir: comprobando $1 jugador(es).'], [/^■ Acompanhar: conferido\.$/, '■ Watch: checked.', '■ Seguir: comprobado.'],
    [/^ {3}🔔 (.+): (.+), no seu alvo de (.+)\.$/, '   🔔 $1: $2, at your target of $3.', '   🔔 $1: $2, en tu objetivo de $3.'],
    [/^■ Nada para relistar: todos os anúncios estão ativos\.$/, '■ Nothing to relist: all listings are active.', '■ Nada que relistar: todos los anuncios están activos.'],
    [/^▶ Snipe (TESTE \(não compra\)|ASSISTIDO|AUTOMÁTICO) · (.*)$/, (m, a, b) => `▶ Snipe ${{ 'TESTE (não compra)': 'TEST (no buying)', 'ASSISTIDO': 'ASSISTED', 'AUTOMÁTICO': 'AUTOMATIC' }[a]} · ${b.split(' · ').map(x => (tr(x.replace(/^por lucro \((\d+)%\)$/, '$1% de lucro').replace(/^por preço$/, 'Por preço'))).replace(/^após comprar: (.+)$/, (q, d) => `${tr('Depois')}: ${tr(d)}`)).join(' · ')}`, (m, a, b) => `▶ Snipe ${{ 'TESTE (não compra)': 'PRUEBA (no compra)', 'ASSISTIDO': 'ASISTIDO', 'AUTOMÁTICO': 'AUTOMÁTICO' }[a]} · ${b.split(' · ').map(x => (tr(x.replace(/^por lucro \((\d+)%\)$/, '$1% de lucro').replace(/^por preço$/, 'Por preço'))).replace(/^após comprar: (.+)$/, (q, d) => `${tr('Depois')}: ${tr(d)}`)).join(' · ')}`],
    [/^✔ (.+) comprada por (.+?)!( \(confirmada pelo saldo\))?$/, (m, a, b, c) => `✔ ${a} bought for ${b}!${c ? ' (confirmed by balance)' : ''}`, (m, a, b, c) => `✔ ${a} comprada por ${b}!${c ? ' (confirmada por el saldo)' : ''}`],
    [/^ {3}✖ alguém comprou antes \((.+)\) — voltando para pesquisar de novo…$/, '   ✖ someone bought first ($1) — searching again…', '   ✖ alguien compró antes ($1) — buscando de nuevo…'],
    [/^ {3}✖ o botão Comprar já não apareceu — voltando para pesquisar de novo…$/, '   ✖ the Buy Now button did not show up — searching again…', '   ✖ el botón Comprar ya no apareció — buscando de nuevo…'],
    [/^ {3}✖ preço (.+) fora do limite — voltando para pesquisar de novo…$/, '   ✖ price $1 over the limit — searching again…', '   ✖ precio $1 fuera del límite — buscando de nuevo…'],
    [/^ {3}✖ a oferta sumiu enquanto você confirmava — voltando para pesquisar de novo…$/, '   ✖ the offer disappeared while you were confirming — searching again…', '   ✖ la oferta desapareció mientras confirmabas — buscando de nuevo…'],
    [/^ {3}listada por (.+) → lucro estimado (.+)\.$/, '   listed for $1 → estimated profit $2.', '   publicada por $1 → ganancia estimada $2.'],
    [/^ {3}☕ descansando (\d+)s \((.+) buscas nesta sessão\)…$/, '   ☕ resting $1s ($2 searches this session)…', '   ☕ descansando $1 s ($2 búsquedas en esta sesión)…'],
    [/^🔎 Filtro do painel aplicado: (.+)$/, '🔎 Panel filter applied: $1', '🔎 Filtro del panel aplicado: $1'], [/^🔎 Filtro do painel \(já estava na tela\): (.+)$/, '🔎 Panel filter (already on screen): $1', '🔎 Filtro del panel (ya estaba en pantalla): $1'],
    [/^🔎 Filtro: (.+)$/, '🔎 Filter: $1', '🔎 Filtro: $1'], [/^🆕 Opções novas no filtro → (.+)$/, '🆕 New filter options → $1', '🆕 Opciones nuevas en el filtro → $1'],
    [/^ {3}nada escolhido no filtro do painel: uso o filtro que está na tela do Web App\.$/, '   nothing picked in the panel filter: using the Web App on-screen filter.', '   nada elegido en el filtro del panel: uso el filtro de la pantalla de la Web App.'],
    [/^ {3}atualizando as listas do filtro \(raridades e eventos novos\)…$/, '   updating filter lists (new rarities and events)…', '   actualizando las listas del filtro (rarezas y eventos nuevos)…'],
    [/^\[teste\] (.+): compraria por (.+?)( \(lucro projetado (.+)\))?\.$/, (m, a, b, c, d) => `[test] ${a}: would buy for ${b}${c ? ` (projected profit ${d})` : ''}.`, (m, a, b, c, d) => `[prueba] ${a}: compraría por ${b}${c ? ` (ganancia proyectada ${d})` : ''}.`],
    [/^■ Parado por você\.$/, '■ Stopped by you.', '■ Detenido por ti.'], [/^■ Pronto: (.+)$/, '■ Done: $1', '■ Listo: $1'],
    [/^ {3}sessão: (.+) buscas, (\d+) compra\(s\), (\d+) perdida\(s\), (.+) gastas, lucro estimado (.+)\.$/, '   session: $1 searches, $2 buy(s), $3 lost, $4 spent, estimated profit $5.', '   sesión: $1 búsquedas, $2 compra(s), $3 perdida(s), $4 gastadas, ganancia estimada $5.'],
    [/^ {3}ficou nos não atribuídos\.$/, '   left in unassigned.', '   quedó en no asignados.'], [/^ {3}enviada para o clube\.$/, '   sent to the club.', '   enviada al club.'],
    [/^ {3}enviada para a Lista de Transferências\.$/, '   sent to the Transfer List.', '   enviada a la lista de transferibles.'],
    [/^ {3}💹 conferindo o preço de mercado…$/, '   💹 checking the market price…', '   💹 revisando el precio de mercado…'],
    [/^ {3}mercado: (.+) → oferta até (.+)\.$/, '   market: $1 → offer up to $2.', '   mercado: $1 → oferta hasta $2.'],
    [/^ {3}⏸ aviso do EA: "(.+)" — pausando (\d+)s e continuando \((\d)\/3\)…$/, '   ⏸ EA warning: "$1" — pausing $2s and continuing ($3/3)…', '   ⏸ aviso de EA: "$1" — pausando $2 s y continuando ($3/3)…'],
    [/^▶ Galeria: (.+)$/, '▶ Gallery: $1', '▶ Galería: $1'], [/^→ (.+) \(\+(.+) pts\): abrindo mercado…$/, '→ $1 (+$2 pts): opening market…', '→ $1 (+$2 pts): abriendo mercado…'],
    [/^ {3}✔ (.+) comprada por (.+)\.$/, '   ✔ $1 bought for $2.', '   ✔ $1 comprada por $2.'], [/^ {3}listada: inicial (.+) \/ imediato (.+)\.$/, '   listed: start $1 / buy now $2.', '   publicada: inicial $1 / inmediato $2.'],
    [/^■ (.+): pede (\d+), tem (\d+)(.*) → comprar (\d+)\.$/, '■ $1: needs $2, has $3$4 → buy $5.', '■ $1: pide $2, tiene $3$4 → comprar $5.'],
    [/^ {3}✖ não comprada: sem cartas à venda agora\.$/, '   ✖ not bought: no cards for sale right now.', '   ✖ no comprada: no hay cartas a la venta ahora.'],
    [/^▶ Relist: relistando a Lista de Transferências pelo mais barato\.$/, '▶ Relist: relisting the Transfer List at the cheapest.', '▶ Relist: relistando la lista de transferibles al más barato.'],
    [/^→ (.+): listando…$/, '→ $1: listing…', '→ $1: publicando…'], [/^ {3}✔ listado por (.+)\.$/, '   ✔ listed for $1.', '   ✔ publicado por $1.'],
    [/^■ Fim: (\d+) de (\d+) item\(ns\) listados\.$/, '■ Done: $1 of $2 item(s) listed.', '■ Fin: $1 de $2 objeto(s) publicados.'], [/^🧹 Retirei os vendidos( \((\d+)\))?\.$/, '🧹 Cleared sold items$1.', '🧹 Retiré los vendidos$1.'],
    [/^💰 Vendida: (.+)$/, '💰 Sold: $1', '💰 Vendida: $1'],
    [/^▶ Não atribuídos: (.+)$/, '▶ Unassigned: $1', '▶ No asignados: $1'], [/^ {3}✔ (.+) → clube\.$/, '   ✔ $1 → club.', '   ✔ $1 → club.'],
    [/^ {3}✔ (.+) \(repetida\) → Lista de transf\.$/, '   ✔ $1 (duplicate) → transfer list.', '   ✔ $1 (repetida) → lista de transf.'],
    [/^ {3}✔ (.+) \(repetida\) listada por (.+)\.$/, '   ✔ $1 (duplicate) listed for $2.', '   ✔ $1 (repetida) publicada por $2.'],
    [/^■ Não atribuídos: (\d+) item\(ns\) organizados\.$/, '■ Unassigned: $1 item(s) organized.', '■ No asignados: $1 objeto(s) organizados.'],
    [/^ {3}não há nada nos não atribuídos\.$/, '   nothing in unassigned.', '   no hay nada en no asignados.'], [/^ {3}🔒 (.+): protegido, deixei onde está\.$/, '   🔒 $1: protected, left it there.', '   🔒 $1: protegido, lo dejé donde está.'],
    [/^■ Enviei os não repetidos para o clube\.$/, '■ Sent non-duplicates to the club.', '■ Envié los no repetidos al club.'],
    [/^■ Resgatei (\d+) recompensa\(s\)\.$/, '■ Claimed $1 reward(s).', '■ Reclamé $1 recompensa(s).'], [/^■ Não achei recompensas para resgatar\.$/, '■ No rewards found to claim.', '■ No encontré recompensas para reclamar.'], [/^🔔 Alerta: (.+)$/, '🔔 Alert: $1', '🔔 Alerta: $1'],
  ];
  const IDX = { en: 1, es: 2 };
  const maps = { en: new Map(), es: new Map() };
  for (const r of [...W, ...WORDS]) { maps.en.set(r[0], r[1]); maps.es.set(r[0], r[2]); }
  let lang = 'pt';
  const LOCALES = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
  const NAMES = { pt: 'Português', en: 'English', es: 'Español' };
  function detect() {
    const n = (navigator.language || 'pt').toLowerCase();
    return n.startsWith('pt') ? 'pt' : n.startsWith('es') ? 'es' : 'en';
  }
  const get = () => lang;
  const set = l => { lang = IDX[l] || l === 'pt' ? l : 'pt'; };
  function one(s) {
    if (lang === 'pt' || !s) return s;
    const m = maps[lang], hit = m.get(s);
    if (hit !== undefined) return hit;
    for (const p of P) if (p[0].test(s)) return s.replace(p[0], p[IDX[lang]]);
    return null;
  }
  // traduz um texto; se não achar inteiro, tenta pedaço por pedaço (separados por " · ")
  function tr(s) {
    if (lang === 'pt' || s == null) return s;
    const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0], core = s.trim();
    if (!core) return s;
    let r = one(core);
    if (r == null && core.includes(' · ')) {
      const parts = core.split(' · '), out = parts.map(x => one(x));
      if (out.some(x => x != null)) r = parts.map((x, i) => out[i] ?? x).join(' · ');
    }
    return r == null ? s : lead + r + trail;
  }
  function trLog(s) {
    if (lang === 'pt' || !s) return s;
    for (const p of LP) if (p[0].test(s)) return s.replace(p[0], p[IDX[lang]]);
    return tr(s);
  }
  // escolhe o texto pronto de cada idioma: L('pt', 'en', 'es')
  const L = (pt, en, es) => lang === 'en' ? en : lang === 'es' ? es : pt;

  // ---------- tradutor da página (o painel) ----------
  // Troca os textos da tela pelo idioma escolhido, inclusive os que o painel desenha depois.
  // Áreas com dados do jogo (filtros, nomes de jogadores, log) ficam de fora: marque com data-notr.
  const orig = new WeakMap(), origAttr = new WeakMap();
  const ATTRS = ['placeholder', 'title', 'aria-label', 'label'];
  let busy = false;
  const skip = el => !el || el.closest('[data-notr], script, style, svg');
  function doText(n) {
    const p = n.parentElement; if (skip(p)) return;
    const cur = n.nodeValue;
    let o = orig.get(n);
    if (o === undefined || (o.tr !== cur)) o = { pt: cur };   // o painel mudou o texto: guarda o novo original
    const t = tr(o.pt);
    o.tr = t; orig.set(n, o);
    if (t !== cur) n.nodeValue = t;
  }
  function doAttrs(el) {
    if (skip(el)) return;
    let m = origAttr.get(el); if (!m) { m = {}; origAttr.set(el, m); }
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a), o = m[a];
      const base = o && o.tr === cur ? o.pt : cur;
      const t = tr(base); m[a] = { pt: base, tr: t };
      if (t !== cur) el.setAttribute(a, t);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1 || skip(root)) return;
    doAttrs(root);
    for (const el of root.querySelectorAll('*')) if (!skip(el)) doAttrs(el);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) doText(n);
  }
  function install(root = document.body) {
    walk(root);
    new MutationObserver(ms => {
      if (busy) return;
      busy = true;
      try {
        for (const m of ms) {
          if (m.type === 'characterData') doText(m.target);
          else if (m.type === 'attributes') doAttrs(m.target);
          else for (const n of m.addedNodes) walk(n);
        }
      } finally { busy = false; }
    }).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  const retranslate = (root = document.body) => { busy = true; try { walk(root); } finally { busy = false; } };
  return { tr, trLog, L, get, set, detect, install, retranslate, LOCALES, NAMES };
})();
