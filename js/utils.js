/* ==========================================================================
   utils.js
   Funções de apoio usadas pelos outros arquivos.

   REGRA DE SEGURANÇA DO PROJETO:
   Nenhum dado vindo da API (ou digitado pelo usuário) é inserido na página
   com innerHTML. Usamos sempre textContent / append, que tratam o conteúdo
   como TEXTO e nunca como código. Isso evita ataques de XSS.
   ========================================================================== */

const Utils = (() => {
  const PLACEHOLDER_IMAGE = "assets/images/placeholder.svg";
  const NOT_INFORMED = "Não informado";

  // Só aceitamos imagens que venham destes domínios (a API só usa o primeiro)
  const ALLOWED_IMAGE_HOSTS = ["cdn.jsdelivr.net", "akabab.github.io"];

  // Os seis atributos de poder, na ordem em que aparecem na tela
  const STATS = [
    { key: "intelligence", label: "Inteligência" },
    { key: "strength", label: "Força" },
    { key: "speed", label: "Velocidade" },
    { key: "durability", label: "Durabilidade" },
    { key: "power", label: "Poder" },
    { key: "combat", label: "Combate" }
  ];

  const ALIGNMENTS = new Map([
    ["good", { label: "Herói", css: "good" }],
    ["bad", { label: "Vilão", css: "bad" }],
    ["neutral", { label: "Neutro", css: "neutral" }]
  ]);

  const GENDERS = new Map([
    ["Male", "Masculino"],
    ["Female", "Feminino"]
  ]);

  /* ------------------------------------------------------------------
     Criação de elementos HTML (sem innerHTML)
     Exemplo: h("p", { class: "texto", text: nome })
     ------------------------------------------------------------------ */
  function h(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);

    for (const [name, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (name === "class") node.className = value;
      else if (name === "text") node.textContent = value;
      else node.setAttribute(name, value === true ? "" : String(value));
    }

    for (const child of [].concat(children)) {
      if (child !== null && child !== undefined && child !== false) node.append(child);
    }
    return node;
  }

  /* ------------------------------------------------------------------
     Tratamento de texto e valores ausentes
     ------------------------------------------------------------------ */

  // "Iron Man" -> "iron man" | "Mulher-Maravilha" -> "mulher-maravilha" (sem acentos)
  function normalizeText(text) {
    return String(text ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  // A API usa "-", "" e até a palavra "null" para dados que não existem
  function isMissing(value) {
    if (value === null || value === undefined) return true;
    if (Array.isArray(value)) return value.length === 0 || value.every(isMissing);
    const text = String(value).trim().toLowerCase();
    return text === "" || text === "-" || text === "null";
  }

  function display(value) {
    if (isMissing(value)) return NOT_INFORMED;
    if (Array.isArray(value)) return value.filter((v) => !isMissing(v)).join(", ");
    return String(value).trim();
  }

  // A API manda medidas assim: ["6'8", "203 cm"] ou ["-", "0 cm"] (quando não existe)
  function isMeasureMissing(text) {
    const t = String(text ?? "").trim().toLowerCase();
    return t === "" || t.startsWith("-") || /^0(\.0+)?\s*(cm|kg|lb|m|tons?)?$/.test(t);
  }

  function formatMeasure(pair) {
    if (!Array.isArray(pair)) return NOT_INFORMED;
    const [imperial, metric] = pair;
    const hasImperial = !isMeasureMissing(imperial);
    const hasMetric = !isMeasureMissing(metric);
    if (hasMetric && hasImperial) return `${metric} (${imperial})`;
    if (hasMetric) return String(metric);
    if (hasImperial) return String(imperial);
    return NOT_INFORMED;
  }

  function formatGender(value) {
    return GENDERS.get(value) ?? display(value);
  }

  function alignmentInfo(value) {
    return ALIGNMENTS.get(value) ?? { label: "Alinhamento não informado", css: "unknown" };
  }

  // Agrupa as editoras para o filtro: marvel, dc ou other
  function publisherInfo(value) {
    if (isMissing(value)) return { label: "Editora não informada", group: "other" };
    const name = String(value).trim();
    if (name === "Marvel Comics") return { label: "Marvel", group: "marvel" };
    if (name === "DC Comics") return { label: "DC", group: "dc" };
    return { label: name, group: "other" };
  }

  function totalPower(stats) {
    if (!stats) return 0;
    return STATS.reduce((sum, { key }) => sum + (Number.isFinite(stats[key]) ? stats[key] : 0), 0);
  }

  // Separa textos como "A, B; C (x, y)" respeitando o que está dentro de parênteses
  function splitList(text, separators = ",;\n") {
    if (isMissing(text)) return [];
    const items = [];
    let current = "";
    let depth = 0;
    for (const char of String(text)) {
      if (char === "(") depth++;
      if (char === ")") depth = Math.max(0, depth - 1);
      if (depth === 0 && separators.includes(char)) {
        items.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    items.push(current);
    return items.map((item) => item.trim()).filter((item) => !isMissing(item));
  }

  /* ------------------------------------------------------------------
     Imagens
     ------------------------------------------------------------------ */

  // Só devolve a URL se for HTTPS e de um domínio permitido
  function safeImageUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" && ALLOWED_IMAGE_HOSTS.includes(parsed.hostname)) {
        return parsed.href;
      }
    } catch {
      /* URL inválida: cai no retorno padrão abaixo */
    }
    return PLACEHOLDER_IMAGE;
  }

  function createImage(url, alt, className) {
    const img = h("img", { class: className, alt, loading: "lazy", decoding: "async" });
    // Se a imagem falhar ao carregar, troca por uma imagem reserva
    img.addEventListener("error", () => {
      if (!img.src.endsWith(PLACEHOLDER_IMAGE)) img.src = PLACEHOLDER_IMAGE;
    });
    img.src = safeImageUrl(url);
    return img;
  }

  /* ------------------------------------------------------------------
     Barra de progresso de atributo (0 a 100)
     ------------------------------------------------------------------ */
  function createBar(value, label, extraClass = "") {
    const valid = Number.isFinite(value);
    const fill = h("div", {
      class: `progress-bar hv-bar ${extraClass}`.trim(),
      role: "progressbar",
      "aria-label": label,
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-valuenow": valid ? value : null
    });
    fill.style.width = "0%";

    const target = valid ? Math.min(Math.max(value, 0), 100) : 0;
    // Dois requestAnimationFrame garantem que a animação de preenchimento aconteça
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.width = `${target}%`;
    }));

    return h("div", { class: "progress hv-track" }, fill);
  }

  /* ------------------------------------------------------------------
     Estados da tela: carregando, erro, vazio
     ------------------------------------------------------------------ */
  function showLoading(container, message = "Carregando…") {
    container.replaceChildren(
      h("div", { class: "hv-loading", role: "status" }, [
        h("span", { class: "spinner-border spinner-border-sm text-danger", "aria-hidden": "true" }),
        h("span", { text: message })
      ])
    );
  }

  function showMessage(container, { kind = "info", title, text, actionLabel, onAction }) {
    const box = h("div", {
      class: `hv-notice hv-notice--${kind}`,
      role: kind === "error" ? "alert" : "status"
    }, [
      h("p", { class: "hv-notice-title", text: title }),
      text ? h("p", { class: "hv-notice-text", text }) : null
    ]);

    if (actionLabel && typeof onAction === "function") {
      const button = h("button", { type: "button", class: "btn btn-hv btn-sm mt-2", text: actionLabel });
      button.addEventListener("click", () => {
        button.disabled = true; // evita cliques repetidos enquanto carrega
        onAction();
      });
      box.append(button);
    }
    container.replaceChildren(box);
  }

  function clear(container) {
    container.replaceChildren();
  }

  function toast(message) {
    const area = document.getElementById("toast-area");
    if (!area) return;
    const item = h("div", { class: "hv-toast", text: message });
    area.append(item);
    setTimeout(() => item.remove(), 3500);
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  return {
    STATS, h, normalizeText, isMissing, display, formatMeasure, formatGender,
    alignmentInfo, publisherInfo, totalPower, splitList, safeImageUrl, createImage,
    createBar, showLoading, showMessage, clear, toast, prefersReducedMotion
  };
})();
