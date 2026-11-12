/* ==========================================================================
   home.js
   Página inicial no estilo "streaming": banner de destaque + trilhos
   horizontais (Populares, Heróis, Vilões e Favoritos).

   Não faz chamadas à API: usa a lista completa que o main.js já carregou
   (/all.json). Os cards dos trilhos são os mesmos do catálogo
   (Characters.createCard), então favoritar, comparar e abrir o perfil
   continuam funcionando pelos mesmos data-action.
   ========================================================================== */

const Home = (() => {
  const { h } = Utils;
  const RAIL_SIZE = 16;
  const SHORT_LABELS = { intelligence: "INT", strength: "FOR", speed: "VEL", durability: "DUR", power: "POD", combat: "COM" };

  // Personagens escolhidos para o banner, na ordem solicitada.
  // Os nomes são comparados com os dados recebidos da API.
  const FEATURED_NAMES = [
    ["Batman"],
    ["Spider-Man", "Spiderman"],
    ["Green Lantern", "Hal Jordan"],
    ["Wonder Woman"],
    ["Iron Man"],
    ["Captain America"],
    ["Wolverine"],
    ["Magneto"],
    ["Punisher"],
    ["Deadpool"],
    ["Harley Quinn"],
    ["Joker"],
    ["Ghost Rider"],
    ["Human Torch"],
    ["Ultron"],
    ["Doctor Doom"],
    ["Superman"],
    ["Thor"],
    ["Darkseid"],
    
  ];

  let featuredHeroes = [];
  let featuredIndex = 0;
  let rotationTimer = null;
  let byIdRef = new Map();

  const power = (hero) => Utils.totalPower(hero.powerstats);
  const hasArt = (hero) => Utils.safeImageUrl(hero.images?.lg).startsWith("https:");
  const byPower = (a, b) => power(b) - power(a) || a.name.localeCompare(b.name);

  /* ------------------------------------------------------------------
     BANNER PRINCIPAL
     ------------------------------------------------------------------ */
  function normalizeName(name) {
    return String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function getFeaturedHeroes(list) {
    return FEATURED_NAMES
      .map((aliases) => {
        const wanted = aliases.map(normalizeName);
        return list.find((hero) => wanted.includes(normalizeName(hero.name)) && hasArt(hero));
      })
      .filter(Boolean);
  }

  function stopRotation() {
    if (rotationTimer !== null) {
      window.clearInterval(rotationTimer);
      rotationTimer = null;
    }
  }

  function startRotation(list) {
    stopRotation();
    if (featuredHeroes.length < 2) return;

    rotationTimer = window.setInterval(() => {
      featuredIndex = (featuredIndex + 1) % featuredHeroes.length;
      renderBanner(list, featuredHeroes[featuredIndex]);
    }, 5000);
  }

  function describe(hero) {
    const bio = hero.biography || {};
    const parts = [];
    if (!Utils.isMissing(bio.fullName)) parts.push(`Identidade: ${Utils.display(bio.fullName)}.`);
    if (!Utils.isMissing(hero.work?.occupation)) parts.push(`Ocupação: ${Utils.display(hero.work.occupation)}.`);
    if (!Utils.isMissing(bio.firstAppearance)) parts.push(`Primeira aparição: ${Utils.display(bio.firstAppearance)}.`);
    return parts.length ? parts.join(" ") : `Soma de atributos: ${power(hero)} de 600.`;
  }

  function renderBanner(list, selectedHero = featuredHeroes[featuredIndex]) {
    const box = document.getElementById("hero-banner");
    const hero = selectedHero || list.find(hasArt);
    if (!box || !hero) return;

    const publisher = Utils.publisherInfo(hero.biography?.publisher);
    const alignment = Utils.alignmentInfo(hero.biography?.alignment);
    const displayName = hero.name;

    const art = Utils.createImage(hero.images?.lg, `Retrato de ${displayName}`, "hv-banner-art");
    art.loading = "eager";
    art.setAttribute("fetchpriority", "high");

    const stats = h("ul", { class: "hv-minis", "aria-label": "Atributos de poder" },
      Utils.STATS.map(({ key, label }) => h("li", { title: label }, [
        h("strong", { text: Number.isFinite(hero.powerstats?.[key]) ? String(hero.powerstats[key]) : "–" }),
        h("span", { text: SHORT_LABELS[key] })
      ])));

    box.replaceChildren(
      art,
      h("div", { class: "container hv-banner-inner" },
        h("div", { class: "hv-banner-copy" }, [
          h("h1", { class: "visually-hidden", text: "Universo em Quadrinhos" }),
          h("div", { class: "hv-tags" }, [
            h("span", { class: "hv-tag", text: publisher.label }),
            h("span", { class: `hv-tag hv-tag--${alignment.css}`, text: alignment.label })
          ]),
          h("h2", { class: "hv-banner-name", text: displayName }),
          h("p", { class: "hv-banner-text", text: describe(hero) }),
          stats,
          h("div", { class: "hv-banner-actions" }, [
            h("button", {
              type: "button", class: "btn btn-hv btn-lg",
              "data-action": "profile", "data-id": hero.id, text: "Ver detalhes"
            }),
            Characters.createFavoriteButton(hero.id, hero.name, false),
            Characters.createCompareButton(hero.id, hero.name, false)
          ])
        ]))
    );
    Characters.syncButtons();
  }

  /* ------------------------------------------------------------------
     TRILHOS
     ------------------------------------------------------------------ */
  function createRail({ id, title, note, heroes, emptyText }) {
    const track = h("div", { class: "hv-rail", id: `${id}-track`, tabindex: "-1" });
    fillTrack(track, heroes, emptyText);

    const scrollTrack = (direction) => {
      track.scrollBy({
        left: direction * track.clientWidth * 0.85,
        behavior: Utils.prefersReducedMotion() ? "auto" : "smooth"
      });
    };
    const arrow = (direction, label, symbol) => {
      const button = h("button", { type: "button", class: "hv-rail-arrow", "aria-label": label, text: symbol });
      button.addEventListener("click", () => scrollTrack(direction));
      return button;
    };

    return h("section", { class: "hv-rail-block", id, "aria-labelledby": `${id}-title` }, [
      h("div", { class: "container" }, [
        h("div", { class: "hv-rail-head" }, [
          h("div", {}, [
            h("h2", { class: "hv-rail-title", id: `${id}-title`, text: title }),
            note ? h("p", { class: "hv-rail-note", text: note }) : null
          ]),
          h("div", { class: "hv-rail-arrows" }, [
            arrow(-1, `Voltar em ${title}`, "‹"),
            arrow(1, `Avançar em ${title}`, "›")
          ])
        ])
      ]),
      h("div", { class: "container hv-rail-wrap" }, track)
    ]);
  }

  function fillTrack(track, heroes, emptyText) {
    if (heroes.length === 0) {
      track.replaceChildren(h("p", { class: "hv-rail-empty", text: emptyText || "Nada por aqui ainda." }));
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const hero of heroes) fragment.append(Characters.createCard(hero, { rail: true }));
    track.replaceChildren(fragment);
  }

  function favoriteHeroes() {
    return Favorites.getAll().map((id) => byIdRef.get(id)).filter(Boolean);
  }

  // Só o trilho de favoritos é refeito quando o usuário favorita algo
  function renderFavorites() {
    const track = document.getElementById("rail-favorites-track");
    if (!track) return;
    fillTrack(track, favoriteHeroes(), "Toque no ♡ de qualquer card para guardar personagens aqui.");
    Characters.syncButtons();
  }

  function render(list, byId) {
    byIdRef = byId;
    const container = document.getElementById("home-rails");
    if (!container) return;

    featuredHeroes = getFeaturedHeroes(list);
    featuredIndex = 0;
    renderBanner(list, featuredHeroes[featuredIndex]);
    startRotation(list);

    const sorted = [...list].sort(byPower);
    const popular = sorted.slice(0, RAIL_SIZE);
    const taken = new Set(popular.map((hero) => hero.id));
    const pickBy = (alignment) => sorted
      .filter((hero) => hero.biography?.alignment === alignment && !taken.has(hero.id))
      .slice(0, RAIL_SIZE);

    container.replaceChildren(
      createRail({ id: "rail-popular", title: "Populares", note: "Os personagens com maior soma de atributos.", heroes: popular }),
      createRail({ id: "rail-heroes", title: "Heróis", note: "Quem luta do lado certo.", heroes: pickBy("good") }),
      createRail({ id: "rail-villains", title: "Vilões", note: "Os nomes mais temidos do multiverso.", heroes: pickBy("bad") }),
      createRail({
        id: "rail-favorites", title: "Seus favoritos", note: "Guardados neste navegador.",
        heroes: favoriteHeroes(), emptyText: "Toque no ♡ de qualquer card para guardar personagens aqui."
      }),
      h("div", { class: "container hv-catalog-cta" }, [
        h("p", { text: "Procurando mais alguém? O catálogo tem centenas de personagens, com filtros por editora e alinhamento." }),
        h("button", { type: "button", class: "btn btn-hv btn-lg", "data-action": "catalog", text: "Explorar o catálogo completo" })
      ])
    );
    Characters.syncButtons();
  }

  return { render, renderFavorites };
})();
