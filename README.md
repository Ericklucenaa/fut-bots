# FUT Bots ⚽

Duas extensões **gratuitas e de código aberto** para o Chrome que automatizam tarefas repetitivas no **EA FC Ultimate Team Web App**, usando o Paletools.

| Bot | O que faz |
| --- | --- |
| [**Galeria Bot**](galeria-bot/) | Compra as cartas que faltam numa galeria do Paletools (até um preço máximo), lista no mais barato e passa para o próximo time. |
| [**Relist Bot**](relist-bot/) | Relista os itens da Lista de Transferências pelo preço mais barato do mercado. |

> ⚠️ **Aviso:** a EA proíbe automação no Web App. Usar estes bots pode levar a restrições ou banimento da sua conta. Use com moderação e **por sua conta e risco**. Este projeto não tem nenhuma ligação com a EA ou com o Paletools.

## Requisitos

- Google Chrome (ou outro navegador baseado em Chromium: Edge, Brave, Opera…)
- Paletools instalado e funcionando no Web App
- Web App em **português**: os bots procuram os botões pelo texto (ex.: "Comprar já", "Retirar vendidos")

## Instalação

1. Baixe o projeto: botão verde **Code → Download ZIP** e extraia (ou `git clone`).
2. Abra `chrome://extensions` no navegador.
3. Ative o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e selecione a pasta `galeria-bot` e/ou `relist-bot`.
5. Abra o [Web App](https://www.ea.com/ea-sports-fc/ultimate-team/web-app/). O painel do bot aparece na tela.

Para atualizar: baixe a versão nova, substitua a pasta e clique em ↻ na extensão em `chrome://extensions`.

## Galeria Bot

1. No Paletools, entre em **Gallery**, escolha a **Category** (liga) e o **Set** (time).
2. Configure o **preço máximo por carta** e, se quiser, o **gasto máximo total**.
3. Comece pelo **🧪 Modo teste**: faz todo o caminho, menos a compra, e mostra por quanto compraria.
4. Quando estiver confiante, use **⚡ Comprar de verdade** e clique em **Iniciar**.

Principais opções: comprar só o que falta, ir para o próximo time automaticamente, listar no mais barato com preço mínimo de proteção, limpar a Lista de Transferências quando encher, log completo e controle de lucro/perda (exportável em .txt e .csv). O botão **?** no painel abre um tutorial passo a passo.

O bot para sozinho (com um apito) se aparecer captcha, faltarem moedas ou a EA limitar o mercado.

## Relist Bot

Abra a **Lista de Transferências** e clique em iniciar. Opções:

- preço mínimo para listar (0 = sem mínimo)
- máximo de itens por rodada
- intervalo entre ações (ms)
- clicar em "Retirar vendidos"
- relistar os expirados
- listar os itens não atribuídos

## Contribuindo

Contribuições são bem-vindas! Abra uma *issue* para relatar bugs ou sugerir ideias, ou mande um *pull request*.

Se a EA mudar o layout do Web App e algum botão parar de ser encontrado, a correção normalmente está nas expressões regulares passadas para a função `find(...)` em `content.js`.

## Licença

[MIT](LICENSE): use, modifique e distribua à vontade, mantendo o crédito.
