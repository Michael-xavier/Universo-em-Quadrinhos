/* ==========================================================================
   main.js
   O "maestro" do projeto: guarda o estado da tela, trata a busca, os filtros,
   a navegação (Explorar / Favoritos) e todos os cliques dos botões.
   ========================================================================== */

(() => {
  const PAGE_SIZE = 24;     // quantos cards aparecem por vez
  const MIN_QUERY = 2;
  const MAX_QUERY = 40;
  // Letras (com acento), números, espaço e . ' ’ - ! & ( )
  const QUERY_PATTERN = /^[\p{L}\p{N}\s.'’\-!&()]+$/u;

  // Tudo que muda na tela fica neste objeto
  const state = {
    all: [],               // lista completa vinda da API
    byId: new Map(),       // id -> personagem (acesso rápido)
    searchIndex: new Map(),// id -> texto normalizado para pesquisa
    view: "explore",       // "explore" ou "favorites"
    catalog: false,        // true = mostra a grade completa (em vez dos trilhos da página inicial)
    query: "",
    publisher: "all",
    alignment: "all",
    sort: "power",
    visible: PAGE_SIZE,
    loaded: false,
    loading: false
  };

  const $ = (id) => document.getElementById(id);
  const el = {};

  /* ------------------------------------------------------------------
     CARREGAR A LISTA (endpoint /all.json)
     ------------------------------------------------------------------ */
  function setControlsDisabled(disabled) {
    [el.input, el.searchButton, el.publisher, el.alignment, el.sort].forEach((control) => {
      control.disabled = disabled;
    });
    el.searchButton.textContent = disabled ? "Carregando…" : "Pesquisar";
  }

  async function loadCharacters() {
    if (state.loading) return;
    state.loading = true;
    setControlsDisabled(true);
    el.grid.replaceChildren();
    el.loadMoreWrap.hidden = true;
    Utils.showLoading(el.status, "Carregando personagens da API…");

    try {
      const list = await Api.getAll();
      state.all = list;
      state.byId = new Map(list.map((hero) => [hero.id, hero]));
      state.searchIndex = new Map(list.map((hero) => [
        hero.id,
        Utils.normalizeText(`${hero.name} ${Utils.isMissing(hero.biography?.fullName) ? "" : hero.biography.fullName}`)
      ]));
      state.loaded = true;
      setControlsDisabled(false);
      render();
      Compare.renderTray(state.byId);
    } catch (error) {
      Utils.showMessage(el.status, {
        kind: "error",
        title: "Não foi possível carregar os personagens",
        text: error.userMessage || "Ocorreu um erro inesperado. Tente novamente.",
        actionLabel: "Tentar novamente",
        onAction: loadCharacters
      });
    } finally {
      state.loading = false;
    }
  }

  /* ------------------------------------------------------------------
     FILTRAR, ORDENAR E DESENHAR
     ------------------------------------------------------------------ */
  function getList() {
    if (state.view === "favorites") {
      return Favorites.getAll().map((id) => state.byId.get(id)).filter(Boolean);
    }

    const query = Utils.normalizeText(state.query);

    const list = state.all.filter((hero) => {
      if (query && !state.searchIndex.get(hero.id).includes(query)) return false;
      if (state.publisher !== "all" && Utils.publisherInfo(hero.biography?.publisher).group !== state.publisher) return false;
      if (state.alignment !== "all" && hero.biography?.alignment !== state.alignment) return false;
      return true;
    });

    list.sort((a, b) => {
      if (state.sort === "name") return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
      // Com busca ativa, quem COMEÇA com o texto digitado aparece primeiro
      if (query) {
        const rankA = Utils.normalizeText(a.name).startsWith(query) ? 0 : 1;
        const rankB = Utils.normalizeText(b.name).startsWith(query) ? 0 : 1;
        if (rankA !== rankB) return rankA - rankB;
      }
      return Utils.totalPower(b.powerstats) - Utils.totalPower(a.powerstats) || a.name.localeCompare(b.name);
    });
    return list;
  }

  function hasActiveFilters() {
    return state.query !== "" || state.publisher !== "all" || state.alignment !== "all" || state.sort !== "power";
  }

  function plural(count) {
    return `${count} ${count === 1 ? "personagem" : "personagens"}`;
  }

  function render() {
    if (!state.loaded) return;

    const isFavorites = state.view === "favorites";
    // Página inicial = trilhos estilo streaming. Busca, filtros, catálogo e favoritos usam a grade.
    const isHome = !isFavorites && !state.catalog && !hasActiveFilters();
    document.body.classList.toggle("is-home", isHome);
    el.rails.hidden = !isHome;
    // Na tela de favoritos escondemos o banner e os filtros
    el.hero.hidden = isFavorites;
    el.filters.hidden = isFavorites;
    el.resetButton.hidden = !hasActiveFilters();
    updateNav();

    if (isHome) {
      Utils.clear(el.status);
      el.grid.replaceChildren();
      el.loadMoreWrap.hidden = true;
      Home.render(state.all, state.byId);
      return;
    }

    const list = getList();

    // Título e texto de apoio
    if (isFavorites) {
      el.title.textContent = "Meus favoritos";
      el.note.textContent = list.length ? `${plural(list.length)} salvos neste navegador.` : "";
    } else if (state.query) {
      el.title.textContent = `Resultados para “${state.query}”`;
      el.note.textContent = plural(list.length);
    } else if (hasActiveFilters()) {
      el.title.textContent = "Personagens";
      el.note.textContent = plural(list.length);
    } else {
      el.title.textContent = "Catálogo completo";
      el.note.textContent = "Todos os personagens, do maior poder total ao menor.";
    }

    // Nenhum resultado
    if (list.length === 0) {
      el.grid.replaceChildren();
      el.loadMoreWrap.hidden = true;

      if (isFavorites) {
        Utils.showMessage(el.status, {
          kind: "empty",
          title: "Você ainda não tem favoritos",
          text: "Use o botão ♡ nos cards ou no perfil para guardar personagens aqui.",
          actionLabel: "Explorar personagens",
          onAction: () => setView("explore")
        });
      } else {
        Utils.showMessage(el.status, {
          kind: "empty",
          title: state.query
            ? `Nenhum personagem encontrado para “${state.query}”`
            : "Nenhum personagem com esses filtros",
          text: "Confira a grafia ou busque só um pedaço do nome, por exemplo “spider”.",
          actionLabel: "Limpar busca e filtros",
          onAction: resetFilters
        });
      }
      return;
    }

    Utils.clear(el.status);
    Characters.renderGrid(el.grid, list.slice(0, state.visible));
    updateLoadMore(list.length);
  }

  function updateLoadMore(total) {
    const remaining = total - state.visible;
    el.loadMoreWrap.hidden = remaining <= 0;
    if (remaining > 0) el.loadMore.textContent = `Mostrar mais (${remaining} restantes)`;
  }

  function loadMore() {
    const list = getList();
    const from = state.visible;
    state.visible += PAGE_SIZE;
    Characters.renderGrid(el.grid, list.slice(from, state.visible), { append: true });
    updateLoadMore(list.length);
  }

  /* ------------------------------------------------------------------
     BUSCA (com validação)
     ------------------------------------------------------------------ */
  function validateQuery(raw) {
    const value = raw.trim().replace(/\s+/g, " ");
    if (value === "") return { valid: false, message: "Digite o nome de um personagem para pesquisar." };
    if (value.length < MIN_QUERY) return { valid: false, message: `Digite pelo menos ${MIN_QUERY} caracteres.` };
    if (value.length > MAX_QUERY) return { valid: false, message: `Use no máximo ${MAX_QUERY} caracteres.` };
    if (!QUERY_PATTERN.test(value)) {
      return { valid: false, message: "Use apenas letras, números, espaços e os símbolos . ' - ! & ( )." };
    }
    return { valid: true, value };
  }

  function showFeedback(message) {
    el.feedback.textContent = message;
    el.input.setAttribute("aria-invalid", message ? "true" : "false");
    el.input.classList.toggle("is-invalid", Boolean(message));
  }

  function onSearchSubmit(event) {
    event.preventDefault();
    if (!state.loaded || state.loading) return;

    const result = validateQuery(el.input.value);
    if (!result.valid) {
      showFeedback(result.message);
      el.input.focus();
      return;
    }

    showFeedback("");
    state.query = result.value;
    state.view = "explore";
    state.catalog = false;
    state.visible = PAGE_SIZE;
    updateNav();
    render();
    scrollToResults();
  }

  function scrollToResults() {
    el.results.scrollIntoView({ behavior: Utils.prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }

  function resetFilters() {
    state.catalog = false;
    state.query = "";
    state.publisher = "all";
    state.alignment = "all";
    state.sort = "power";
    state.visible = PAGE_SIZE;
    el.input.value = "";
    el.publisher.value = "all";
    el.alignment.value = "all";
    el.sort.value = "power";
    showFeedback("");
    render();
  }

  function onFilterChange() {
    state.publisher = el.publisher.value;
    state.alignment = el.alignment.value;
    state.sort = el.sort.value;
    state.visible = PAGE_SIZE;
    render();
  }

  /* ------------------------------------------------------------------
     NAVEGAÇÃO E CONTADORES
     ------------------------------------------------------------------ */
  function setView(view) {
    state.view = view;
    state.visible = PAGE_SIZE;
    updateNav();
    render();
    window.scrollTo({ top: 0, behavior: Utils.prefersReducedMotion() ? "auto" : "smooth" });
  }

  function currentSection() {
    if (state.view === "favorites") return "favorites";
    return state.catalog || hasActiveFilters() ? "catalog" : "home";
  }

  function updateNav() {
    const section = currentSection();
    document.querySelectorAll(".hv-nav-btn").forEach((button) => {
      const key = button.dataset.action === "catalog" ? "catalog" : button.dataset.view === "favorites" ? "favorites" : "home";
      const active = key === section;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function updateFavoritesCount() {
    const count = Favorites.count();
    el.favCount.textContent = String(count);
    el.favCount.hidden = count === 0;
  }

  /* ------------------------------------------------------------------
     CLIQUES DOS BOTÕES (delegação de eventos)
     Um único "ouvinte" no documento descobre qual botão foi clicado
     olhando o atributo data-action.
     ------------------------------------------------------------------ */
  function openCatalog() {
    state.catalog = true;
    state.view = "explore";
    state.visible = PAGE_SIZE;
    render();
    window.scrollTo({ top: 0, behavior: Utils.prefersReducedMotion() ? "auto" : "smooth" });
  }

  function goHome() {
    state.view = "explore";
    resetFilters();
    window.scrollTo({ top: 0, behavior: Utils.prefersReducedMotion() ? "auto" : "smooth" });
  }

  function toggleFavorite(id, name) {
    const result = Favorites.toggle(id);
    Utils.toast(result.added ? `${name} foi adicionado aos favoritos.` : `${name} foi removido dos favoritos.`);
    if (!result.saved) {
      Utils.toast("Não foi possível salvar no navegador. Os favoritos valem só até fechar a página.");
    }
  }

  function toggleCompare(id) {
    if (Compare.toggle(id) === "full") {
      Utils.toast("Você já escolheu 2 personagens. Remova um deles na barra inferior para trocar.");
    }
  }

  function onDocumentClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled) return;

    const id = Number(button.dataset.id);
    switch (button.dataset.action) {
      case "catalog": openCatalog(); break;
      case "profile": Characters.openProfile(id); break;
      case "favorite": toggleFavorite(id, button.dataset.name); break;
      case "compare": toggleCompare(id); break;
      case "compare-remove": Compare.remove(id); break;
      case "compare-clear": Compare.clear(); break;
      case "compare-open": Compare.open(state.byId); break;
      default: break;
    }
  }

  /* ------------------------------------------------------------------
     INICIALIZAÇÃO
     ------------------------------------------------------------------ */
  function init() {
    Object.assign(el, {
      hero: $("hero"),
      form: $("search-form"),
      input: $("search-input"),
      searchButton: $("search-button"),
      feedback: $("search-feedback"),
      results: $("results"),
      title: $("results-title"),
      note: $("results-note"),
      filters: $("filters"),
      publisher: $("filter-publisher"),
      alignment: $("filter-alignment"),
      sort: $("filter-sort"),
      resetButton: $("reset-button"),
      status: $("status-area"),
      grid: $("characters-grid"),
      loadMoreWrap: $("load-more-wrap"),
      loadMore: $("load-more"),
      favCount: $("fav-count"),
      rails: $("home-rails")
    });

    el.form.addEventListener("submit", onSearchSubmit);
    el.input.addEventListener("input", () => showFeedback(""));
    [el.publisher, el.alignment, el.sort].forEach((select) => select.addEventListener("change", onFilterChange));
    el.resetButton.addEventListener("click", resetFilters);
    el.loadMore.addEventListener("click", loadMore);
    document.querySelectorAll(".hv-nav-btn[data-view]").forEach((button) => {
      button.addEventListener("click", () => (button.dataset.view === "explore" ? goHome() : setView(button.dataset.view)));
    });
    document.addEventListener("click", onDocumentClick);

    document.addEventListener("favorites:changed", () => {
      updateFavoritesCount();
      if (state.view === "favorites") render();
      else {
        if (!state.catalog && !hasActiveFilters()) Home.renderFavorites();
        Characters.syncButtons();
      }
    });
    document.addEventListener("compare:changed", () => {
      Compare.renderTray(state.byId);
      Characters.syncButtons();
    });

    updateFavoritesCount();
    loadCharacters();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
