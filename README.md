# Universo em Quadrinhos

Aplicação web para explorar, pesquisar e comparar heróis e vilões da Marvel, da DC e de outros universos, com visual inspirado em capas de HQ. Feita com HTML, CSS e JavaScript puro, sem backend, e publicada no GitHub Pages.

**Aplicação publicada:** <https://michael-xavier.github.io/Universo-em-Quadrinhos/>

**Repositório:** <https://github.com/Michael-xavier/Universo-em-Quadrinhos>

> O nome interno do código e das classes CSS (prefixo `hv-`) vem da primeira versão do projeto, chamada HeroVerse.

---

## Objetivo

Criar uma plataforma de catálogo de personagens em que o usuário consiga:

- descobrir personagens em uma página inicial com destaque rotativo e trilhos temáticos;
- pesquisar pelo nome (ou pelo nome verdadeiro, como "Bruce Wayne") e filtrar o catálogo;
- ver o perfil completo: biografia, aparência, trabalho, conexões e os seis atributos de poder;
- colocar dois personagens frente a frente em uma arena de comparação;
- guardar favoritos no próprio navegador.

O projeto também serve para praticar consumo de API com `fetch`, manipulação segura do DOM, tratamento de erros, responsividade e publicação.

## Funcionalidades

| Funcionalidade | Como funciona |
|---|---|
| **Destaque rotativo** | Banner com arte em tamanho grande, trocando a cada 5 segundos entre 9 personagens, nesta ordem: Batman, Homem-Aranha, Hal Jordan (nome com que a API registra o Lanterna Verde), Mulher-Maravilha, Homem de Ferro, Capitão América, Wolverine, Magneto e Justiceiro. Mostra editora, alinhamento, identidade, ocupação, primeira aparição e os seis atributos |
| **Trilhos** | Quatro faixas horizontais com rolagem e setas: **Populares** (16 maiores somas de atributos), **Heróis**, **Vilões** (16 cada, sem repetir os já exibidos em Populares) e **Seus favoritos** |
| **Catálogo** | Grade completa com 24 cards por vez e botão "Mostrar mais", aberta pelo botão **Catálogo** ou por "Explorar o catálogo completo" |
| **Busca** | Campo no cabeçalho. Filtra por nome ou nome verdadeiro, ignora acentos e maiúsculas, e coloca primeiro quem começa com o termo digitado |
| **Filtros** | Editora (Marvel, DC, outras), alinhamento (herói, vilão, neutro) e ordenação (maior poder total ou nome A–Z) |
| **Cards em formato de capa** | Etiqueta de editora, nome, "assinatura" de seis barrinhas (uma por atributo), nome verdadeiro, alinhamento, pontuação total e botões de perfil, favorito e comparação |
| **Perfil** | Janela com a arte do personagem ao fundo, seis barras segmentadas de atributos e abas Biografia, Aparência, Trabalho e Conexões |
| **Arena de confronto** | Escolha dois personagens e abra a comparação com barras espelhadas, selo "VS", destaque de quem leva vantagem em cada atributo, soma total e veredito |
| **Favoritos** | Adiciona e remove com um clique, em qualquer card; salvos no LocalStorage; aparecem no trilho "Seus favoritos" e na tela **Favoritos** |
| **Erros** | Indicador de carregamento, erros HTTP, falha de conexão, tempo esgotado, "nenhum resultado" e botão "Tentar novamente" |

**Navegação:** o cabeçalho tem **Início** (banner e trilhos), **Catálogo** (grade completa) e **Favoritos** (com contador). Pesquisar ou aplicar filtros também abre a grade.

## Identidade visual

- Tema escuro com cabeçalho vermelho, contornos pretos marcantes, sombras deslocadas e trama de pontos (*halftone*) amarela discreta ao fundo.
- Cores de apoio: amarelo, azul, ciano, verde, roxo e laranja, usadas para dar vida aos cards e às barras da comparação.
- Tipografia: **Bangers** nos títulos (com **Anton** de reserva) e **Barlow** no texto, todas hospedadas no próprio projeto (`assets/fonts/`).
- O visual está dividido em dois arquivos: `css/style.css` (estrutura e componentes) e `css/comic-reference.css` (camada de identidade em quadrinhos, carregada depois e que sobrescreve o anterior). Assim dá para ajustar o visual sem tocar na lógica em JavaScript.

## Tecnologias

- HTML5, CSS3 e JavaScript puro (Vanilla JS)
- Bootstrap 5.3.3 (via CDN, com verificação de integridade SRI)
- Fetch API
- LocalStorage
- GitHub Pages

Sem React, Angular, Vue, jQuery, Axios, Node.js, Express ou banco de dados.

## API utilizada

**Superhero API (Akabab)**: <https://github.com/akabab/superhero-api>

É uma versão limpa e mantida pela comunidade da [superheroapi.com](https://superheroapi.com/). São arquivos JSON estáticos, **gratuitos e sem token**, servidos pelo CDN jsDelivr com versão fixa (`@0.3.0`). Há um endereço reserva no GitHub Pages do próprio projeto, usado automaticamente se o CDN falhar.

- Base principal: `https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api`
- Base reserva: `https://akabab.github.io/superhero-api/api`
- 563 personagens, com ids de 1 a 731 (existem lacunas).

> **Importante:** essa API **não tem endpoint de busca**. A pesquisa é feita no navegador: a lista completa (`all.json`) é baixada uma vez e filtrada com JavaScript.

## Endpoints consumidos

Sete endpoints distintos, cada um com efeito visível na interface:

| Endpoint | Onde aparece na tela |
|---|---|
| `GET /all.json` | Banner, trilhos, cards do catálogo, busca, filtros e favoritos |
| `GET /id/{id}.json` | Arte grande, nome e fundo do perfil |
| `GET /powerstats/{id}.json` | Barras de atributos do perfil e arena de comparação |
| `GET /biography/{id}.json` | Aba Biografia, editora, alinhamento e nome verdadeiro |
| `GET /appearance/{id}.json` | Aba Aparência (altura, peso, olhos, cabelo...) |
| `GET /work/{id}.json` | Aba Trabalho (ocupação e base de atuação) |
| `GET /connections/{id}.json` | Aba Conexões (grupos e parentes) |

A página inicial **não faz chamadas extras**: o banner e os trilhos reaproveitam a lista já carregada em `/all.json`.

Ao abrir um perfil, as seis últimas chamadas acontecem em paralelo. Cada bloco da janela tem **seu próprio** carregamento e tratamento de erro: se uma chamada falhar, as outras seções continuam funcionando. Na arena, são duas chamadas a `/powerstats/{id}.json`, uma para cada personagem.

## Estrutura do projeto

```
HeroVerse/
├── index.html
├── README.md
├── css/
│   ├── style.css             estrutura, componentes e responsividade
│   └── comic-reference.css   identidade visual em quadrinhos (sobrescreve o anterior)
├── js/
│   ├── utils.js        funções de apoio (criar elementos com segurança, formatar dados)
│   ├── api.js          único arquivo que usa fetch: erros, tempo limite, cache
│   ├── favorites.js    favoritos e LocalStorage
│   ├── characters.js   cards e perfil completo
│   ├── compare.js      seleção e arena de comparação
│   ├── home.js         banner rotativo e trilhos da página inicial
│   └── main.js         estado da tela, busca, filtros, navegação e eventos
└── assets/
    ├── fonts/          Bangers, Anton e Barlow (.woff2)
    └── images/         favicon e imagem reserva
```

A **ordem dos scripts** no `index.html` importa: `utils` → `api` → `favorites` → `characters` → `compare` → `home` → `main`.

## Como executar

**No VS Code (recomendado)**

1. Abra a pasta do projeto no VS Code (*File > Open Folder*).
2. Instale a extensão **Live Server** (Ritwick Dey).
3. Clique com o botão direito em `index.html` e escolha **Open with Live Server**.
4. O navegador abre em `http://127.0.0.1:5500`.

> O Live Server tenta recarregar a página automaticamente usando um script que a política de segurança (CSP) do projeto bloqueia. É esperado ver um aviso de CSP no Console e o recarregamento automático não funcionar. Basta apertar **F5**.

**Alternativa sem extensão** (com Python instalado): na pasta do projeto, rode `python -m http.server 8000` e acesse `http://localhost:8000`.

Precisa de internet, porque os dados e o Bootstrap vêm de CDN.

## Segurança

O projeto não tem backend, então a segurança é feita no próprio código:

| Risco | O que foi feito |
|---|---|
| **XSS** (código injetado via dados da API ou da busca) | Nenhum `innerHTML` no código. Todo conteúdo entra com `textContent`/`append`, tratado como texto |
| **Entrada do usuário** | Busca validada: 2 a 40 caracteres, só letras, números, espaço e `. ' - ! & ( )` |
| **Imagens externas** | Só são aceitas URLs `https` dos domínios `cdn.jsdelivr.net` e `akabab.github.io`. Qualquer outra vira imagem reserva. A mesma regra vale para a arte de fundo do perfil |
| **Ids na URL** | O id é validado como número inteiro antes de montar a requisição |
| **Bootstrap adulterado** | CSS e JS carregados com **SRI** (`integrity`) e `crossorigin` |
| **Recursos não autorizados** | **Content Security Policy** no `<meta>`: scripts, estilos, imagens e conexões só dos domínios necessários; fontes só do próprio projeto (`font-src 'self'`) |
| **Dados da API alterados sem aviso** | Versão do CDN fixa (`@0.3.0`) |
| **LocalStorage adulterado** | Só guarda ids de personagens e tudo é revalidado na leitura (JSON quebrado, tipos errados, ids absurdos) |
| **Privacidade** | Nenhum dado pessoal coletado; sem cookies e sem rastreadores. As fontes são hospedadas no próprio projeto, então o navegador não contata serviços de fontes |
| **Links externos** | `rel="noopener noreferrer"`; `Referrer-Policy` configurada como `no-referrer` |
| **Segredos** | Não há token nem chave: nada sensível no código |

**Limitação conhecida:** o GitHub Pages não permite configurar cabeçalhos HTTP, então proteções como `frame-ancestors` (contra clickjacking) não podem ser aplicadas por aqui. Numa hospedagem com controle de cabeçalhos, valeria adicioná-las.

## Acessibilidade e responsividade

- Layout fluido com Bootstrap: o catálogo usa 2 colunas no celular, 3 no tablet e 4 no computador; os trilhos rolam na horizontal e as setas ‹ › ficam ocultas em telas de toque; ajustes específicos para telas de até 767 px, 420 px e 380 px
- Link "Pular para os personagens", contorno de foco bem visível, rótulos `aria-*` nos botões e setas, e mensagens de status anunciadas por leitores de tela
- Barras de atributo com `role="progressbar"`, sempre acompanhadas do número, então a informação não depende só de cor
- Animações e transições CSS reduzidas para quem ativa "reduzir movimento" no sistema

## Como publicar no GitHub Pages

1. Crie um repositório **público** no GitHub (aqui, `Universo-em-Quadrinhos`), sem README inicial.
2. No terminal, dentro da pasta do projeto:
   ```bash
   git init
   git add .
   git commit -m "Universo em Quadrinhos: versão final"
   git branch -M main
   git remote add origin https://github.com/Michael-xavier/Universo-em-Quadrinhos.git
   git push -u origin main
   ```
3. No GitHub: **Settings > Pages > Build and deployment**. Em *Source*, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)** e clique em **Save**.
4. Aguarde 1 a 2 minutos. O endereço será `https://michael-xavier.github.io/Universo-em-Quadrinhos/`.



## Decisões de projeto

- **Sem módulos ES nem frameworks:** scripts clássicos em ordem fixa, mais simples de entender e de depurar.
- **Criação de elementos com a função `h()`** (em `utils.js`) em vez de montar HTML em texto: é o que garante a proteção contra XSS.
- **Delegação de eventos:** um único ouvinte de clique (`main.js`) trata todos os botões, identificados por `data-action`. Por isso os cards dos trilhos e do catálogo funcionam do mesmo jeito.
- **Cards reutilizados:** `home.js` usa o mesmo `Characters.createCard` do catálogo, sem duplicar código.
- **Cache em memória** no `api.js`: perfis e comparações já vistos não são baixados de novo.
- **Fontes locais:** a CSP não permite CDN de fontes, então Bangers, Anton e Barlow ficam em `assets/fonts/`, o que também evita dependência externa de tipografia.
- **CSS em duas camadas:** a identidade de quadrinhos fica separada da estrutura, e a lógica em JavaScript não depende dela.

## Limitações e possíveis melhorias

- O destaque rotativo troca sozinho a cada 5 segundos e ainda não tem botão de pausa nem pausa ao passar o mouse. Também não leva em conta a preferência "reduzir movimento", porque a troca é feita por JavaScript.
- O botão **Catálogo** mantém a busca e os filtros que estiverem ativos. Para ver todos os personagens, use "Limpar busca e filtros".
- A busca é feita só pelo nome do personagem e pelo nome verdadeiro, e a API não oferece busca própria.
- Os dados dependem de um serviço mantido pela comunidade, que pode ficar indisponível. Por isso o tratamento de erros é parte central do projeto.

## Licença

Este projeto é distribuído sob a licença **MIT**. O texto completo está no arquivo [LICENSE](LICENSE).

A licença cobre o código do projeto. Os dados da API, os personagens e as imagens pertencem aos seus respectivos detentores, e as fontes seguem a SIL Open Font License.

## Créditos e aviso

Projeto acadêmico, sem fins lucrativos. Dados da [Superhero API (Akabab)](https://github.com/akabab/superhero-api), derivada da [superheroapi.com](https://superheroapi.com/). Interface construída com [Bootstrap](https://getbootstrap.com/). Fontes Bangers, Anton e Barlow, licenciadas sob a SIL Open Font License. Personagens e imagens pertencem a seus respectivos detentores (Marvel, DC e outros).