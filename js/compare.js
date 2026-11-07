/* ==========================================================================
   compare.js
   Seleção de 2 personagens e comparação dos atributos lado a lado.

   A seleção fica só na memória (não vai para o LocalStorage): ao recarregar
   a página, a comparação recomeça do zero.

   Endpoint usado ao comparar: /powerstats/{id}.json (um para cada personagem).
   ========================================================================== */

const Compare = (() => {
  const { h } = Utils;
  const MAX = 2;

  let selected = [];
  let token = 0; // descarta respostas antigas se o usuário abrir outra comparação

  function notify() {
    document.dispatchEvent(new CustomEvent("compare:changed"));
  }

  /* ------------------------------------------------------------------
     Seleção
     ------------------------------------------------------------------ */
  function has(id) {
    return selected.includes(id);
  }

  // Devolve "added", "removed" ou "full" (já tem 2 escolhidos)
  function toggle(id) {
    if (has(id)) {
      selected = selected.filter((item) => item !== id);
      notify();
      return "removed";
    }
    if (selected.length >= MAX) return "full";
    selected = [...selected, id];
    notify();
    return "added";
  }

  function remove(id) {
    selected = selected.filter((item) => item !== id);
    notify();
  }

  function clear() {
    selected = [];
    notify();
  }

  /* ------------------------------------------------------------------
     Barra fixa no rodapé com os escolhidos
     ------------------------------------------------------------------ */
  function createSlot(hero, id) {
    if (!hero) {
      return h("div", { class: "hv-slot hv-slot--empty" },
        h("span", { text: "Escolha mais um personagem" }));
    }
    return h("div", { class: "hv-slot" }, [
      Utils.createImage(hero.images?.xs, "", "hv-slot-img"),
      h("span", { class: "hv-slot-name", text: hero.name }),
      h("button", {
        type: "button",
        class: "btn-close hv-slot-remove",
        "data-action": "compare-remove",
        "data-id": id,
        "aria-label": `Remover ${hero.name} da comparação`
      })
    ]);
  }

  function renderTray(byId) {
    const tray = document.getElementById("compare-tray");
    tray.hidden = selected.length === 0;
    document.body.classList.toggle("has-tray", selected.length > 0);
    if (selected.length === 0) {
      tray.replaceChildren();
      return;
    }

    const ready = selected.length === MAX;
    const slots = [0, 1].map((index) => {
      const id = selected[index];
      return createSlot(id === undefined ? null : byId.get(id), id);
    });

    tray.replaceChildren(
      h("div", { class: "container hv-tray-inner" }, [
        h("div", { class: "hv-slots" }, slots),
        h("div", { class: "hv-tray-actions" }, [
          h("button", {
            type: "button",
            class: "btn btn-hv",
            "data-action": "compare-open",
            disabled: ready ? null : "",
            text: "Comparar agora"
          }),
          h("button", {
            type: "button",
            class: "btn btn-outline-light",
            "data-action": "compare-clear",
            text: "Limpar"
          })
        ])
      ])
    );
  }

  /* ------------------------------------------------------------------
     Janela de comparação
     ------------------------------------------------------------------ */
  function createHeroHeader(hero, side) {
    const fullName = hero.biography?.fullName;
    const alignment = Utils.alignmentInfo(hero.biography?.alignment);
    return h("div", { class: `cmp-hero cmp-hero--${side}` }, [
      Utils.createImage(hero.images?.md, `Retrato de ${hero.name}`, "cmp-img"),
      h("h3", { class: "cmp-name", text: hero.name }),
      h("p", { class: "cmp-real", text: Utils.isMissing(fullName) ? " " : fullName }),
      h("div", { class: "hv-tags justify-content-center" }, [
        h("span", { class: "hv-tag", text: Utils.publisherInfo(hero.biography?.publisher).label }),
        h("span", { class: `hv-tag hv-tag--${alignment.css}`, text: alignment.label })
      ])
    ]);
  }

  function createCell(name, value, state, side) {
    const hasValue = Number.isFinite(value);
    return h("div", { class: `cmp-cell cmp-cell--${side}${state ? ` is-${state}` : ""}` }, [
      h("span", { class: "cmp-value", text: hasValue ? String(value) : "N/D" }),
      Utils.createBar(value, name)
    ]);
  }

  function render(container, heroA, heroB, statsA, statsB) {
    let winsA = 0;
    let winsB = 0;

    const rows = Utils.STATS.map(({ key, label }) => {
      const a = Number.isFinite(statsA?.[key]) ? statsA[key] : null;
      const b = Number.isFinite(statsB?.[key]) ? statsB[key] : null;
      let stateA = "";
      let stateB = "";
      if (a !== null && b !== null && a !== b) {
        if (a > b) { winsA++; stateA = "winner"; stateB = "loser"; }
        else { winsB++; stateA = "loser"; stateB = "winner"; }
      }
      return h("div", { class: "cmp-row" }, [
        h("div", { class: "cmp-label", text: label }),
        h("div", { class: "cmp-pair" }, [
          createCell(`${label} de ${heroA.name}`, a, stateA, "a"),
          createCell(`${label} de ${heroB.name}`, b, stateB, "b")
        ])
      ]);
    });

    const totalA = Utils.totalPower(statsA);
    const totalB = Utils.totalPower(statsB);

    let verdict = "Empate: os dois têm o mesmo número de atributos mais altos.";
    if (winsA > winsB) verdict = `${heroA.name} leva vantagem em ${winsA} de 6 atributos.`;
    if (winsB > winsA) verdict = `${heroB.name} leva vantagem em ${winsB} de 6 atributos.`;

    container.replaceChildren(
      h("div", { class: "cmp-head" }, [
        createHeroHeader(heroA, "a"),
        h("div", { class: "cmp-vs", "aria-hidden": "true", text: "VS" }),
        createHeroHeader(heroB, "b")
      ]),
      h("div", { class: "cmp-rows" }, rows),
      h("div", { class: "cmp-total" }, [
        h("div", { class: "cmp-label", text: "Soma dos atributos" }),
        h("div", { class: "cmp-pair" }, [
          h("strong", { class: totalA > totalB ? "is-winner-text" : "", text: String(totalA) }),
          h("strong", { class: totalB > totalA ? "is-winner-text" : "", text: String(totalB) })
        ])
      ]),
      h("p", { class: "cmp-verdict", text: verdict })
    );
  }

  async function open(byId) {
    if (selected.length !== MAX) return;
    const [idA, idB] = selected;
    const heroA = byId.get(idA);
    const heroB = byId.get(idB);
    if (!heroA || !heroB) return;

    const myToken = ++token;
    const body = document.getElementById("compare-body");
    bootstrap.Modal.getOrCreateInstance(document.getElementById("compare-modal")).show();

    const load = async () => {
      Utils.showLoading(body, "Buscando os atributos dos dois personagens…");
      try {
        // Duas chamadas ao endpoint /powerstats/{id}.json ao mesmo tempo
        const [statsA, statsB] = await Promise.all([Api.getPowerstats(idA), Api.getPowerstats(idB)]);
        if (myToken !== token) return;
        render(body, heroA, heroB, statsA, statsB);
      } catch (error) {
        if (myToken !== token) return;
        Utils.showMessage(body, {
          kind: "error",
          title: "Não foi possível comparar os personagens",
          text: error.userMessage || "Ocorreu um erro inesperado.",
          actionLabel: "Tentar novamente",
          onAction: load
        });
      }
    };
    load();
  }

  return { has, toggle, remove, clear, renderTray, open };
})();
