# ⚽ FUT Galeria Bot

Extensão **gratuita e de código aberto** para o Chrome que completa as galerias do **Paletools** no **EA FC Ultimate Team Web App** para você.

Para cada carta que falta na galeria, o bot:

1. abre o **Mercado** da carta;
2. compra no **Comprar já** se o preço couber no seu limite;
3. lista a carta no **mais barato** do mercado;
4. passa para a próxima carta e, no fim, para o **próximo time**.

> ⚠️ **Aviso importante:** a EA proíbe automação no Web App. Usar este bot pode levar a restrições no mercado ou até ao banimento da sua conta. Use com moderação e **por sua conta e risco**. Este projeto não tem nenhuma ligação com a EA nem com o Paletools.

---

## 📋 O que você precisa

- **Google Chrome** no computador (também funciona no Edge, Brave, Opera e outros baseados em Chromium)
- **Paletools** instalado e funcionando no Web App
- Web App em **português, inglês ou espanhol** (o painel do bot é em português)
- Moedas na conta, claro 😄

---

## 🔧 Passo 1: instalar a extensão

1. **Baixe o bot:** clique no botão verde **Code** no topo desta página e depois em **Download ZIP**.
2. **Extraia o ZIP:** clique com o botão direito no arquivo baixado → **Extrair tudo**. Vai aparecer uma pasta (ex.: `fut-galeria-bot-main`). Guarde-a num lugar fixo, como `Documentos`: **se apagar ou mover a pasta, a extensão para de funcionar.**
3. **Abra as extensões do Chrome:** digite `chrome://extensions` na barra de endereço e aperte Enter.
4. **Ative o Modo do desenvolvedor:** chave no canto superior direito da página.
5. Clique em **Carregar sem compactação** e selecione a pasta que você extraiu (a que tem o arquivo `manifest.json` dentro).
6. Pronto! O **FUT Galeria Bot** aparece na lista de extensões. Se quiser, clique no ícone de quebra-cabeça 🧩 do Chrome e fixe o bot.

> 💡 Se aparecer o erro "Manifesto ausente", você selecionou a pasta errada. Entre na pasta extraída até achar a que tem o `manifest.json` e selecione essa.

---

## 🚀 Passo 2: abrir o bot no Web App

1. Abra o [EA FC Web App](https://www.ea.com/ea-sports-fc/ultimate-team/web-app/) e faça login.
2. O painel **Galeria Bot** aparece sozinho na tela. Se não aparecer, recarregue a página (F5).
3. Na primeira vez, um **tutorial interativo** mostra cada parte do painel. Use as setas ← → do teclado para avançar. Para ver de novo, clique no **?** no topo do painel.

**Dicas do painel:** arraste pelo topo para mudar de lugar e clique no **–** para minimizar.

---

## 🖼️ Passo 3: abrir a galeria no Paletools

1. No Web App, abra o menu do Paletools e entre em **Gallery**.
2. Escolha a **Category** (a liga) e o **Set** (o time) por onde quer começar.
3. Confira o painel do bot: o anel mostra quantas cartas o time já tem (ex.: **7/15**) e **Faltam** mostra quantas ele vai comprar.

> 💡 Tem cartas no clube que ainda não foram incluídas na galeria? Clique em **Include** nelas antes de começar, para o bot não comprar o que você já tem.

---

## ⚙️ Passo 4: configurar

As opções ficam em quatro abas no painel. Tudo é salvo automaticamente.

### Aba **Compra**
| Opção | O que faz |
| --- | --- |
| **Preço máximo por carta** | Se a carta mais barata do mercado custar mais que isso, o bot pula ela. O preço é conferido duas vezes antes de comprar. |
| **Gasto máximo total** | Teto de moedas para a rodada inteira, somando todos os times. Ao chegar nele, o bot para. `0` = sem limite. |
| **Só o que falta** | O bot calcula sozinho quanto comprar (ex.: o time pede 15, você tem 7 → compra 8). **Recomendado deixar ligado.** |
| **Quantidade** | Quantas cartas comprar por time, usada só com "Só o que falta" desligado. |

### Aba **Times**
| Opção | O que faz |
| --- | --- |
| **Ir para o próximo time** | Ao terminar um time, passa para o próximo da lista e pula os que já estão completos. |
| **Máximo de times** | Quantos times completar por rodada. `0` = vai até o fim da liga. |

### Aba **Venda**
| Opção | O que faz |
| --- | --- |
| **Listar no mais barato** | Logo depois de comprar, faz **Listar no Mercado → Mais barato → Listar**. |
| **Não listar abaixo de** | Proteção contra prejuízo: se o mais barato do mercado estiver abaixo desse valor, a carta fica nos não atribuídos para você decidir. `0` = aceita qualquer preço. |
| **Limpar quando encher** | Se a Lista de Transferências lotar, o bot registra as vendas, clica em **Retirar vendidos**, envia os não repetidos ao clube e volta para a galeria. |
| **Limpar a cada N compras** | Faz essa limpeza com frequência. `0` = desligado. |
| **Limpar ao trocar de time** | Faz a limpeza entre um time e outro. |
| **🧹 Limpar** | Faz a limpeza na hora. |

### Aba **Ajustes**
| Opção | O que faz |
| --- | --- |
| **Pausa entre ações** | Tempo de espera entre cada clique, em milissegundos. Valores maiores são mais lentos, mas mais seguros. |
| **Ofertas por carta** | Se alguém comprar a carta antes de você, quantas vezes tentar a próxima mais barata. |
| **Respeitar vagas** | Com quantidade manual, não compra mais do que as vagas livres do time. |

---

## ▶️ Passo 5: testar e rodar

1. **Comece sempre pelo 🧪 Modo teste.** Ele faz todo o caminho, menos a compra, e mostra no log por quanto compraria cada carta. Nenhuma moeda é gasta.
2. Clique em **Iniciar** e acompanhe a seção **Atividade**.
3. Se estiver tudo certo, clique em **Parar**, mude para **⚡ Comprar de verdade** e clique em **Iniciar** de novo.

O bot **para sozinho, com um apito**, quando:
- aparece um **captcha** (resolva e clique em Iniciar de novo);
- as **moedas acabam** ou o **gasto máximo total** é atingido;
- a EA **limita o mercado** temporariamente (espere um tempo antes de voltar).

---

## 📊 Log e lucro

- **📜 Log:** histórico completo de tudo que o bot fez, filtrado por período. Dá para baixar em `.txt`.
- **💰 Lucro:** compras, vendas e lucro por sessão, por dia ou por período personalizado. Dá para baixar em `.csv`.

As vendas são registradas quando você abre a **Lista de Transferências** no Web App. Se alguma venda não for reconhecida, use **marcar venda** na tela de lucro.

---

## ❓ Problemas comuns

| Problema | Solução |
| --- | --- |
| O painel não aparece | Recarregue a página (F5). Confira em `chrome://extensions` se a extensão está ativada. |
| "Abra a Gallery" fica aparecendo | Abra Paletools → **Gallery** e escolha a liga e o time. |
| O bot não acha os botões | Confira se o Web App está em português, inglês ou espanhol e se o Paletools está funcionando. Se continuar, abra uma [issue](../../issues) dizendo o idioma e o texto do botão que o bot não achou. |
| Pula todas as cartas | O **preço máximo por carta** está baixo demais para o mercado atual. |
| Pede captcha com frequência | Aumente a **pausa entre ações** e faça intervalos entre as rodadas. |

---

## 🔄 Como atualizar

1. Baixe a versão nova (**Code → Download ZIP**) e extraia.
2. Substitua os arquivos da pasta antiga pelos novos.
3. Em `chrome://extensions`, clique no ↻ do FUT Galeria Bot e recarregue o Web App.

Suas configurações e o histórico de lucro são mantidos.

---

## ☕ Apoie o projeto

O FUT Galeria Bot é e vai continuar sendo **grátis**. Se ele te ajudou e você quiser apoiar o desenvolvimento, qualquer valor é bem-vindo:

[![Apoie no Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/ericklucena)

A doação é totalmente opcional e não libera nenhuma função extra.

---

## 🤝 Contribuindo

Achou um bug ou tem uma ideia? Abra uma [issue](../../issues). Quer melhorar o código? Mande um *pull request*!

Os textos que o bot procura no Web App (botões, telas e mensagens) ficam todos no dicionário `T`, no começo do [`content.js`](content.js), com versões em português, inglês e espanhol. Se a EA mudar algum texto ou você quiser adicionar outro idioma, é só ajustar ali.

## 📄 Licença

[MIT](LICENSE): use, modifique e distribua à vontade, mantendo o crédito.
