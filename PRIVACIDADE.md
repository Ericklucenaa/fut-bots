# Política de privacidade do FUT Bots

Última atualização: 4 de novembro de 2026

O FUT Bots é uma extensão do Chrome gratuita e de código aberto que ajuda a usar o EA FC Ultimate Team Web App.

## O que a extensão guarda

Tudo fica **somente no seu computador**, no armazenamento local do Chrome (`chrome.storage.local`):

- suas configurações (filtros, preços, estratégias, tema, regras da Galeria e do Relist);
- o histórico do que os módulos fizeram (compras, vendas, preços vistos no mercado, log);
- o saldo de moedas lido na tela do Web App, para o gráfico de banca.

Você pode apagar esses dados a qualquer momento em **Configurações → Limpar dados** ou removendo a extensão.

## O que a extensão NÃO faz

- Não coleta, não vende e não envia seus dados para nenhum servidor do desenvolvedor ou de terceiros.
- Não lê nem guarda seu e-mail, senha ou login da EA.
- Não usa cookies de rastreamento, anúncios ou análise de uso.
- Não executa código baixado da internet.

## Conexões de rede

- A extensão só age nas páginas de `https://www.ea.com/` (o Web App), clicando e lendo a tela como você faria.
- Quem instala pelo GitHub (fora da Chrome Web Store) tem o painel consultando `api.github.com` para saber se existe uma versão mais nova. Essa consulta não envia nenhum dado seu.

## Permissões

| Permissão | Para quê |
| --- | --- |
| `storage` | Guardar configurações e histórico no seu computador. |
| `tabs` | Encontrar a aba do Web App para o painel conversar com ela e abrir o painel numa janela. |
| Acesso a `https://www.ea.com/*` | Rodar os módulos dentro do Web App. |

## Contato

Dúvidas ou problemas: abra uma issue em https://github.com/Ericklucenaa/fut-bots/issues

O FUT Bots não tem ligação com a Electronic Arts nem com o Paletools.
