# Publicação na Chrome Web Store

Tudo o que o formulário da loja pede, pronto para copiar e colar.

## Arquivos

| O quê | Arquivo |
| --- | --- |
| Pacote da extensão | `fut-bots-v2.3.0-loja.zip` (anexado na release v2.2.0) |
| Ícone da loja (128×128) | `icons/icon128.png` |
| Capturas de tela (1280×800) | `store/1-inicio.png` … `store/5-temas.png` |
| Bloco promocional pequeno (440×280) | `store/promo-440x280.png` |
| Bloco promocional grande (1400×560) | `store/marquee-1400x560.png` |
| Política de privacidade (URL) | https://github.com/Ericklucenaa/fut-bots/blob/main/PRIVACIDADE.md |

## Ficha da loja

**Nome:** FUT Bots

**Resumo (até 132 caracteres):**
Sniper, Galeria e Relist para o EA FC Ultimate Team Web App, num painel só. Grátis e de código aberto.

**Categoria:** Ferramentas (ou Diversão)

**Idioma:** Português (Brasil)

**Descrição:**

```
O FUT Bots junta três ferramentas para o EA FC Ultimate Team Web App, controladas por um painel próprio que abre numa janela separada.

SNIPER
• Repete a busca do Mercado com o seu filtro e compra no Comprar já o que aparecer até o seu preço.
• Oferta por preço fixo ou por % de lucro sobre o preço de mercado.
• Modos Teste (não compra), Assistido (você confirma) e Automático.
• Depois de comprar: manda para o clube, para a Lista de Transferências, deixa nos não atribuídos ou vende.
• Filtros salvos, estratégias prontas, limites de compras, gasto, tempo e buscas por dia.

GALERIA (Paletools)
• Compra as cartas que faltam numa galeria do Paletools, até o preço máximo que você definir.
• Lista no mais barato, passa para o próximo time e limpa a Lista de Transferências quando enche.
• Lucro e vendas por período, com exportação em CSV.

RELIST
• Retira os vendidos e anuncia de novo os expirados e os não listados pelo "Mais barato", respeitando o seu preço mínimo.

PAINEL
• Início com moedas, lucro do dia e o que cada módulo está fazendo.
• Dashboard de banca, lucro e risco; histórico; gráfico de preços; simulador de lucro com a taxa de 5% do EA.
• 10 temas.
• Só um módulo trabalha por vez, para eles não se atrapalharem.

Requisitos: EA FC Web App em português, inglês ou espanhol. A Galeria e a venda no "Mais barato" usam o Paletools.

Privacidade: tudo fica no seu computador. A extensão não coleta nem envia seus dados.

Código aberto (MIT): https://github.com/Ericklucenaa/fut-bots

Aviso: a EA proíbe automação no Web App. Usar esta extensão pode levar a restrições no mercado ou banimento da conta. Use com moderação e por sua conta e risco. O FUT Bots não tem ligação com a Electronic Arts nem com o Paletools.
```

**Site / página inicial:** https://github.com/Ericklucenaa/fut-bots
**URL de suporte:** https://github.com/Ericklucenaa/fut-bots/issues

## Aba "Práticas de privacidade"

**Finalidade única:**
```
Ajudar o usuário a usar o EA FC Ultimate Team Web App: buscar e comprar cartas no mercado (Sniper), completar galerias do Paletools (Galeria) e relistar itens da Lista de Transferências (Relist), tudo controlado por um painel da própria extensão.
```

**Justificativa de `storage`:**
```
Guarda no computador do usuário as configurações (filtros, preços, regras, tema) e o histórico de compras, vendas e preços que aparecem no painel.
```

**Justificativa de `tabs`:**
```
Localiza a aba do EA FC Web App para o painel enviar comandos aos módulos e ler o status, e traz para frente a janela do painel quando o usuário clica no ícone.
```

**Justificativa da permissão de host (`https://www.ea.com/*`):**
```
Os módulos rodam dentro do EA FC Ultimate Team Web App (www.ea.com), lendo a tela e clicando nos botões do mercado, da galeria e da Lista de Transferências.
```

**Código remoto:** Não, não uso código remoto.

**Uso de dados:** não marque nenhuma categoria de dados coletados e marque as três declarações:
- não vendo nem transfiro dados a terceiros fora dos casos permitidos;
- não uso nem transfiro dados para fins não relacionados à finalidade única;
- não uso nem transfiro dados para avaliar crédito ou conceder empréstimos.

## Passo a passo no painel do desenvolvedor

1. https://chrome.google.com/webstore/devconsole → **Novo item** → envie `fut-bots-v2.3.0-loja.zip`.
2. **Ficha da loja:** cole nome, resumo e descrição; envie o ícone, as 5 capturas e os blocos promocionais; escolha a categoria e o idioma.
3. **Práticas de privacidade:** cole a finalidade única e as justificativas, marque "sem código remoto" e as declarações de uso de dados, e cole o link da política de privacidade.
4. **Distribuição:** Pública (ou "Não listada", para só quem tiver o link poder instalar), em todos os países.
5. **Enviar para revisão.**

Depois de aprovada, mude o link de instalação no README para o da loja. Quem instalar pela loja recebe as versões novas sozinho: a cada atualização, aumente a versão no `manifest.json`, gere o ZIP e envie em **Pacote → Enviar nova versão**.
