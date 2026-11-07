/* ==========================================================================
   characters.js
   Tudo que desenha personagens na tela: os cards da grade e o perfil completo.

   Os botões dos cards NÃO têm código próprio de clique. Eles só carregam
   atributos data-action e data-id, e o main.js trata todos os cliques de
   uma vez (técnica chamada "delegação de eventos").
   ========================================================================== */

const Characters = (() => {
  const { h } = Utils;

  // Cada abertura de perfil recebe um número. Se o usuário abrir outro perfil
  // antes do anterior terminar de carregar, a resposta antiga é descartada.
  let profileToken = 0;

  /* ------------------------------------------------------------------
     CARDS DA GRADE
     ------------------------------------------------------------------ */

  // Seis barrinhas que formam a "assinatura" de atributos do personagem
  function createSignature(stats) {
    const wrap = h("div", { class: "hv-sig", "aria-hidden": "true" });
    for (const { key } of Utils.STATS) {
      const value = Number.isFinite(stats?.[key]) ? stats[key] : 0;
      const bar = h("span", { class: "hv-sig-bar" });
      bar.style.height = `${Math.max(value, 4)}%`;
      wrap.append(bar);
    }
    return wrap;
  }

  function createTags(hero) {
    const alignment = Utils.alignmentInfo(hero.biography?.alignment);
    return h("div", { class: "hv-tags" }, [
      h("span", { class: `hv-tag hv-tag--${alignment.css}`, text: alignment.css === "unknown" ? "Indefinido" : alignment.label }),
      h("span", { class: "hv-tag hv-tag--power", text: `${Utils.totalPower(hero.powerstats)} pts` })
    ]);
  }

  function createFavoriteButton(id, name, compact) {
    return h("button", {
      type: "button",
      class: compact ? "btn btn-outline-light btn-sm hv-fav-btn hv-fav-btn--compact" : "btn btn-outline-light hv-fav-btn",
      "data-action": "favorite",
      "data-id": id,
      "data-name": name,
      "data-compact": compact ? "1" : "0"
    });
  }

  function createCompareButton(id, name, small) {
    return h("button", {
      type: "button",
      class: small ? "btn btn-outline-light btn-sm hv-compare-btn" : "btn btn-outline-light hv-compare-btn",
      "data-action": "compare",
      "data-id": id,
      "data-name": name
    });
  }

  // rail = true -> item de trilho horizontal (largura fixa); false -> coluna da grade
  function createCard(hero, { rail = false } = {}) {
    const fullName = hero.biography?.fullName;
    const publisher = Utils.publisherInfo(hero.biography?.publisher);
    const image = Utils.createImage(hero.images?.md, `Retrato de ${hero.name}`, "hv-card-img");

    return h("div", { class: rail ? "hv-rail-item" : "col-6 col-md-4 col-lg-3" },
      h("article", { class: "hv-card" }, [
        h("div", { class: "hv-card-media" }, [
          image,
          h("span", { class: "hv-card-pub", text: publisher.label }),
          h("h3", { class: "hv-card-name", text: hero.name }),
          createSignature(hero.powerstats)
        ]),
        h("div", { class: "hv-card-body" }, [
          h("p", {
            class: "hv-card-real",
            text: Utils.isMissing(fullName) ? "Nome verdadeiro não informado" : fullName
          }),
          createTags(hero),
          h("div", { class: "hv-card-actions" }, [
            h("button", {
              type: "button",
              class: "btn btn-hv btn-sm hv-profile-btn",
              "data-action": "profile",
              "data-id": hero.id,
              text: "Ver perfil"
            }),
            createFavoriteButton(hero.id, hero.name, true),
            createCompareButton(hero.id, hero.name, true)
          ])
        ])
      ])
    );
  }

  // append = true  -> adiciona ao final (botão "Mostrar mais")
  // append = false -> limpa a grade e desenha tudo de novo
  function renderGrid(container, heroes, { append = false } = {}) {
    const fragment = document.createDocumentFragment();
    for (const hero of heroes) fragment.append(createCard(hero));
    if (append) container.append(fragment);
    else container.replaceChildren(fragment);
    syncButtons(); // deixa os botões de favorito e comparar com o texto certo
  }

  /* ------------------------------------------------------------------
     ESTADO DOS BOTÕES (favoritar / comparar)
     ------------------------------------------------------------------ */
  function updateFavoriteButton(button, active) {
    const compact = button.dataset.compact === "1";
    const name = button.dataset.name;
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("is-active", active);
    button.textContent = (active ? "♥" : "♡") + (compact ? "" : active ? " Nos favoritos" : " Favoritar");
    button.setAttribute("aria-label", active ? `Remover ${name} dos favoritos` : `Adicionar ${name} aos favoritos`);
    button.title = active ? "Remover dos favoritos" : "Adicionar aos favoritos";
  }

  function updateCompareButton(button, active) {
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("is-active", active);
    button.textContent = active ? "✓ Na comparação" : "Comparar";
    button.setAttribute("aria-label", active
      ? `Remover ${button.dataset.name} da comparação`
      : `Adicionar ${button.dataset.name} à comparação`);
  }

  // Atualiza TODOS os botões visíveis (cards e perfil) de acordo com o estado atual
  function syncButtons() {
    document.querySelectorAll('button[data-action="favorite"]').forEach((button) => {
      updateFavoriteButton(button, Favorites.has(Number(button.dataset.id)));
    });
    document.querySelectorAll('button[data-action="compare"]').forEach((button) => {
      updateCompareButton(button, Compare.has(Number(button.dataset.id)));
    });
  }

  /* ------------------------------------------------------------------
     PERFIL COMPLETO (modal)
     Cada bloco do perfil usa o SEU PRÓPRIO endpoint e tem seu próprio
     indicador de carregamento e tratamento de erro.
     ------------------------------------------------------------------ */

  // Carrega uma seção: mostra "carregando", chama a API, desenha ou mostra erro.
  function loadSection(container, token, loader, render) {
    const run = async () => {
      Utils.showLoading(container, "Carregando…");
      try {
        const data = await loader();
        if (token !== profileToken) return; // usuário já abriu outro perfil
        container.replaceChildren();
        render(data, container);
      } catch (error) {
        if (token !== profileToken) return;
        Utils.showMessage(container, {
          kind: "error",
          title: "Não foi possível carregar esta seção",
          text: error.userMessage || "Ocorreu um erro inesperado.",
          actionLabel: "Tentar novamente",
          onAction: run
        });
      }
    };
    return run();
  }

  // Lista de pares "rótulo: valor"
  function createFacts(rows) {
    const list = h("dl", { class: "hv-facts" });
    for (const [label, value] of rows) {
      list.append(h("div", { class: "hv-fact" }, [
        h("dt", { text: label }),
        h("dd", { text: value })
      ]));
    }
    return list;
  }

  function createTabs() {
    const tabs = [
      { id: "bio", label: "Biografia" },
      { id: "appearance", label: "Aparência" },
      { id: "work", label: "Trabalho" },
      { id: "connections", label: "Conexões" }
    ];

    const nav = h("ul", { class: "nav nav-tabs hv-tabs", role: "tablist" });
    const content = h("div", { class: "tab-content hv-tab-content" });
    const panes = {};

    tabs.forEach((tab, index) => {
      const first = index === 0;
      nav.append(h("li", { class: "nav-item", role: "presentation" },
        h("button", {
          type: "button",
          class: `nav-link${first ? " active" : ""}`,
          id: `tab-${tab.id}`,
          "data-bs-toggle": "tab",
          "data-bs-target": `#pane-${tab.id}`,
          role: "tab",
          "aria-controls": `pane-${tab.id}`,
          "aria-selected": String(first),
          text: tab.label
        })
      ));

      const pane = h("div", {
        class: `tab-pane fade${first ? " show active" : ""}`,
        id: `pane-${tab.id}`,
        role: "tabpanel",
        "aria-labelledby": `tab-${tab.id}`,
        tabindex: "0"
      });
      content.append(pane);
      panes[tab.id] = pane;
    });

    return { nav, content, panes };
  }

  /* ----- Renderizadores de cada seção ----- */

  function renderFigure(hero, container) {
    container.append(Utils.createImage(hero.images?.lg, `Retrato de ${hero.name}`, "hv-profile-img"));
    // A mesma imagem, borrada, vira o fundo do perfil (CSSOM: compatível com a CSP)
    document.querySelector("#profile-modal .modal-content")
      ?.style.setProperty("--hv-art", `url("${Utils.safeImageUrl(hero.images?.lg)}")`);

    document.getElementById("profile-title-modal").textContent = hero.name;

    const actions = h("div", { class: "hv-profile-actions" }, [
      createFavoriteButton(hero.id, hero.name, false),
      createCompareButton(hero.id, hero.name, false)
    ]);
    container.append(actions);
    syncButtons();
  }

  function renderStats(stats, container) {
    for (const { key, label } of Utils.STATS) {
      const value = stats?.[key];
      const hasValue = Number.isFinite(value);
      container.append(h("div", { class: "hv-stat" }, [
        h("div", { class: "hv-stat-line" }, [
          h("span", { text: label }),
          h("strong", { text: hasValue ? String(value) : "N/D" })
        ]),
        Utils.createBar(value, label)
      ]));
    }
    container.append(h("p", {
      class: "hv-stat-total",
      text: `Soma dos atributos: ${Utils.totalPower(stats)} de 600`
    }));
  }

  function renderBiography(bio, container, tagsBox) {
    const alignment = Utils.alignmentInfo(bio.alignment);
    const publisher = Utils.publisherInfo(bio.publisher);

    // As etiquetas do topo do perfil também vêm deste endpoint
    tagsBox.replaceChildren(
      Utils.isMissing(bio.fullName) ? null : h("p", { class: "hv-profile-real", text: Utils.display(bio.fullName) }),
      h("span", { class: "hv-tag", text: publisher.label }),
      h("span", { class: `hv-tag hv-tag--${alignment.css}`, text: alignment.label })
    );

    const alterEgos = Utils.isMissing(bio.alterEgos) || bio.alterEgos === "No alter egos found."
      ? "Nenhum registrado"
      : Utils.display(bio.alterEgos);

    container.append(createFacts([
      ["Nome verdadeiro", Utils.display(bio.fullName)],
      ["Alter egos", alterEgos],
      ["Apelidos", Utils.display(bio.aliases)],
      ["Local de nascimento", Utils.display(bio.placeOfBirth)],
      ["Primeira aparição", Utils.display(bio.firstAppearance)],
      ["Editora", publisher.label],
      ["Alinhamento", alignment.label]
    ]));
  }

  function renderAppearance(data, container) {
    container.append(createFacts([
      ["Gênero", Utils.formatGender(data.gender)],
      ["Raça", Utils.display(data.race)],
      ["Altura", Utils.formatMeasure(data.height)],
      ["Peso", Utils.formatMeasure(data.weight)],
      ["Cor dos olhos", Utils.display(data.eyeColor)],
      ["Cor do cabelo", Utils.display(data.hairColor)]
    ]));
  }

  function renderWork(data, container) {
    container.append(createFacts([
      ["Ocupação", Utils.display(data.occupation)],
      ["Base de atuação", Utils.display(data.base)]
    ]));
  }

  function renderConnections(data, container) {
    const groups = Utils.splitList(data.groupAffiliation, ",;\n");
    const relatives = Utils.splitList(data.relatives, ";\n");

    container.append(h("h3", { class: "hv-subtitle", text: "Grupos e afiliações" }));
    if (groups.length === 0) {
      container.append(h("p", { class: "text-secondary", text: "Nenhum grupo registrado." }));
    } else {
      container.append(h("ul", { class: "hv-chips" }, groups.map((group) => h("li", { text: group }))));
    }

    container.append(h("h3", { class: "hv-subtitle", text: "Parentes e aliados" }));
    if (relatives.length === 0) {
      container.append(h("p", { class: "text-secondary", text: "Nenhum parente registrado." }));
    } else {
      container.append(h("ul", { class: "hv-list" }, relatives.map((person) => h("li", { text: person }))));
    }
  }

  /* ----- Abre o perfil ----- */
  function openProfile(id) {
    const token = ++profileToken;
    const modalElement = document.getElementById("profile-modal");
    const body = document.getElementById("profile-body");
    document.getElementById("profile-title-modal").textContent = "Carregando perfil…";
    document.querySelector("#profile-modal .modal-content")?.style.removeProperty("--hv-art");

    const figureBox = h("div", { class: "hv-profile-figure" });
    const statsBox = h("div", { class: "hv-stats" });
    const tagsBox = h("div", { class: "hv-tags hv-tags--profile" });
    const { nav, content, panes } = createTabs();

    body.replaceChildren(
      h("div", { class: "row g-4" }, [
        h("div", { class: "col-md-5 col-lg-4" }, [figureBox]),
        h("div", { class: "col-md-7 col-lg-8" }, [
          tagsBox,
          h("section", { class: "hv-panel", "aria-labelledby": "stats-title" }, [
            h("h3", { class: "hv-panel-title", id: "stats-title", text: "Atributos de poder" }),
            statsBox
          ]),
          nav,
          content
        ])
      ])
    );

    bootstrap.Modal.getOrCreateInstance(modalElement).show();

    // Um endpoint para cada parte da tela:
    loadSection(figureBox, token, () => Api.getById(id), (hero, box) => renderFigure(hero, box));          // /id/{id}.json
    loadSection(statsBox, token, () => Api.getPowerstats(id), renderStats);                                // /powerstats/{id}.json
    loadSection(panes.bio, token, () => Api.getBiography(id), (data, box) => renderBiography(data, box, tagsBox)); // /biography/{id}.json
    loadSection(panes.appearance, token, () => Api.getAppearance(id), renderAppearance);                   // /appearance/{id}.json
    loadSection(panes.work, token, () => Api.getWork(id), renderWork);                                     // /work/{id}.json
    loadSection(panes.connections, token, () => Api.getConnections(id), renderConnections);                // /connections/{id}.json
  }

  return { renderGrid, syncButtons, openProfile, createCard, createFavoriteButton, createCompareButton };
})();
