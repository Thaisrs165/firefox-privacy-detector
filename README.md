# Privacy Detector

Extensão para Mozilla Firefox desenvolvida para a disciplina de Cibersegurança do Insper. O projeto observa atividades relacionadas à privacidade durante a navegação, apresenta um relatório por página e permite bloquear domínios definidos pelo usuário.

## Funcionalidades

- Detecção de conexões com domínios de terceiros.
- Contagem de cookies definidos durante o carregamento da página.
- Classificação dos cookies em primeira ou terceira parte e sessão ou persistentes.
- Identificação de chaves em `localStorage`, `sessionStorage` e bancos `IndexedDB`.
- Detecção de parâmetros de rastreamento em URLs.
- Identificação de possíveis cadeias de bounce tracking.
- Detecção de operações de leitura ou exportação de canvas.
- Identificação de possíveis sinais de hijacking ou hook, incluindo:
  - conexões WebSocket e EventSource com terceiros;
  - polling persistente por `fetch` ou `XMLHttpRequest`;
  - alteração posterior de objetos globais monitorados.
- Pontuação de privacidade de 0 a 100 acompanhada das deduções aplicadas.
- Blocklist personalizada para bloquear requisições destinadas a domínios escolhidos pelo usuário.

## Estrutura do projeto

```text
firefox-privacy-detector/
├── background/
│   └── background.js
├── content/
│   ├── content.js
│   └── page-monitor.js
├── popup/
│   ├── popup.css
│   ├── popup.html
│   └── popup.js
├── evidencias/
│   ├── duckduckgo/
│   ├── mercado-livre/
│   ├── uol/
│   └── wikipedia/
├── manifest.json
└── README.md
```

- `background/background.js`: acompanha requisições, respostas, redirecionamentos, cookies, parâmetros de rastreamento e bloqueios por aba.
- `content/page-monitor.js`: executa no contexto principal da página e monitora canvas, APIs de rede e alterações em objetos globais.
- `content/content.js`: coleta o armazenamento do documento e encaminha os sinais do contexto da página para o background.
- `popup/`: apresenta os resultados, calcula o score e gerencia a blocklist.
- `evidencias/`: contém os arquivos HAR e os prints utilizados na validação.

## Instalação temporária no Firefox

1. Baixe ou clone este repositório.
2. Abra o Firefox.
3. Digite `about:debugging` na barra de endereços.
4. Selecione **Este Firefox**.
5. Clique em **Carregar extensão temporária**.
6. Selecione o arquivo `manifest.json` na raiz do projeto.

A extensão permanecerá instalada até o Firefox ser encerrado. Depois de modificar algum arquivo, volte ao `about:debugging` e clique em **Recarregar**.

## Como utilizar

1. Carregue a extensão pelo `about:debugging`.
2. Abra uma página HTTP ou HTTPS.
3. Atualize a página para iniciar uma nova coleta.
4. Aguarde alguns segundos para que os recursos sejam carregados.
5. Abra o popup do Privacy Detector.
6. Use a rolagem para consultar todos os indicadores e a pontuação.

Os dados são mantidos separadamente por aba e removidos do armazenamento local quando a aba é fechada.

## Blocklist personalizada

Na seção **Blocklist personalizada**, informe somente o domínio, por exemplo:

```text
example.com
```

Também são aceitos endereços completos, que são normalizados para o hostname. Quando um domínio está na lista, a extensão bloqueia requisições para ele e para seus subdomínios. O contador de bloqueios é apresentado no popup.

## Metodologia da pontuação

Toda página começa com 100 pontos. As deduções são limitadas por categoria para impedir que apenas um indicador determine todo o resultado.

| Categoria | Regra de dedução | Limite |
|---|---:|---:|
| Domínios de terceiros | 2 pontos por domínio | 20 |
| Cookies de risco | 3 pontos por cookie de terceira parte e 1 por cookie persistente | 20 |
| Armazenamento HTML5 | 2 pontos por chave ou banco detectado | 10 |
| Rastreamento por navegação | 2 pontos por parâmetro e 10 por bounce tracking | 20 |
| Canvas fingerprinting | 15 pontos quando detectado | 15 |
| Hijacking/hook | 5 pontos por indicador | 15 |

Classificação final:

| Pontuação | Classificação |
|---:|---|
| 80 a 100 | Boa privacidade |
| 60 a 79 | Privacidade moderada |
| 40 a 59 | Atenção necessária |
| 0 a 39 | Privacidade crítica |

A pontuação representa uma heurística explicável para comparação entre páginas. Ela não constitui uma certificação de segurança e não deve ser interpretada como equivalente à metodologia do Blacklight.

## Permissões

- `tabs`: identifica a aba ativa e associa o relatório à página correta.
- `storage`: guarda temporariamente os resultados e a blocklist personalizada.
- `webRequest`: observa requisições, respostas e redirecionamentos.
- `webRequestBlocking`: cancela requisições destinadas aos domínios da blocklist.
- `<all_urls>`: permite analisar páginas e recursos carregados em diferentes origens.

## Validação

A extensão foi validada nas páginas de teste do DuckDuckGo Privacy Test Pages e nos seguintes sites reais:

- Wikipédia;
- UOL;
- Mercado Livre.

Para cada site real, a pasta `evidencias/` contém:

- arquivo HAR exportado do Firefox DevTools;
- prints do relatório apresentado pela extensão;
- resultado do Blacklight;
- resultado do uBlock Origin.

Os testes do DuckDuckGo incluem Tracker Reporting, Tracker Blocking, Storage Blocking, Storage Partitioning, Query Parameters, Bounce Tracking, Canvas Fingerprinting e indicadores de hijacking/hook.

## Limitações

- A determinação do domínio-base utiliza uma lista reduzida de sufixos multinível e não uma implementação completa da Public Suffix List.
- A contagem de cookies considera cabeçalhos `Set-Cookie` observados durante a coleta. Cookies preexistentes ou criados exclusivamente por `document.cookie` podem não aparecer.
- Cookies repetidos com o mesmo domínio, caminho e nome são deduplicados.
- O armazenamento HTML5 é coletado no documento principal no início do carregamento e após dois segundos; alterações posteriores e dados de iframes podem não ser observados.
- Uma operação de leitura de canvas é tratada como sinal de possível fingerprinting, embora usos legítimos de canvas também possam gerar o alerta.
- WebSocket, EventSource, polling e alterações globais são indicadores comportamentais, não prova definitiva de ataque.
- Diferenças em relação ao Blacklight e ao uBlock Origin são esperadas porque as ferramentas utilizam escopos, listas, tempos de coleta e critérios de classificação diferentes.

## Tecnologias

- Firefox WebExtensions
- Manifest V3
- JavaScript
- HTML
- CSS