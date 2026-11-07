/* ==========================================================================
   api.js
   Único arquivo que conversa com a internet. Todos os outros pedem dados
   para ele, e ele cuida de: fetch, tempo limite, erros HTTP, falhas de
   conexão e cache.

   API usada: Superhero API (Akabab) — arquivos JSON estáticos, sem token.
   Endpoints consumidos:
     /all.json                 lista completa (home, busca, favoritos)
     /id/{id}.json             dados do personagem (nome e imagem do perfil)
     /biography/{id}.json      aba Biografia
     /powerstats/{id}.json     barras de atributos e comparação
     /appearance/{id}.json     aba Aparência
     /work/{id}.json           aba Trabalho
     /connections/{id}.json    aba Conexões
   ========================================================================== */

const Api = (() => {
  // Versão fixa (@0.3.0): os dados não mudam sem a gente saber.
  // Se o CDN falhar, tentamos o GitHub Pages do próprio projeto.
  const BASE_URLS = [
    "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api",
    "https://akabab.github.io/superhero-api/api"
  ];
  const TIMEOUT_MS = 15000;
  const MAX_ID = 9999;

  const cache = new Map();

  // Erro com uma mensagem pronta para mostrar ao usuário
  class ApiError extends Error {
    constructor(type, userMessage, status = null) {
      super(userMessage);
      this.name = "ApiError";
      this.type = type; // "http" | "network" | "timeout" | "parse" | "input"
      this.status = status;
      this.userMessage = userMessage;
    }
  }

  function messageForStatus(status) {
    if (status === 404) return "Esse conteúdo não foi encontrado na API (erro 404).";
    if (status === 429) return "Muitas requisições em pouco tempo (erro 429). Aguarde um instante e tente de novo.";
    if (status >= 500) return `O servidor da API está com problemas (erro ${status}). Tente novamente em alguns minutos.`;
    return `A API respondeu com um erro inesperado (código ${status}).`;
  }

  // Uma tentativa em UM endereço
  async function requestOnce(baseUrl, path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/${path}`, { signal: controller.signal });

      // fetch() só dá erro em falha de rede. Erros HTTP (404, 500...) precisamos checar aqui.
      if (!response.ok) {
        throw new ApiError("http", messageForStatus(response.status), response.status);
      }

      try {
        return await response.json();
      } catch {
        throw new ApiError("parse", "A API devolveu dados em um formato inesperado.");
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error.name === "AbortError") {
        throw new ApiError("timeout", "A API demorou demais para responder. Tente novamente.");
      }
      throw new ApiError("network", "Não foi possível conectar à API. Verifique sua conexão com a internet.");
    } finally {
      clearTimeout(timer);
    }
  }

  // Tenta cada endereço da lista até um funcionar
  async function fetchJson(path) {
    if (cache.has(path)) return cache.get(path);

    let lastError = null;
    for (const baseUrl of BASE_URLS) {
      try {
        const data = await requestOnce(baseUrl, path);
        cache.set(path, data);
        return data;
      } catch (error) {
        lastError = error;
        // 404 significa "esse arquivo não existe": tentar outro servidor não adianta
        if (error.type === "http" && error.status === 404) break;
      }
    }
    throw lastError;
  }

  // Valida o id ANTES de montar a URL (nunca confiar em dados de fora)
  function checkId(id) {
    if (!Number.isInteger(id) || id < 1 || id > MAX_ID) {
      throw new ApiError("input", "Identificador de personagem inválido.");
    }
    return id;
  }

  // Garante que os itens da lista têm o formato esperado
  function sanitizeList(data) {
    if (!Array.isArray(data)) {
      throw new ApiError("parse", "A API devolveu dados em um formato inesperado.");
    }
    return data.filter(
      (hero) => hero && Number.isInteger(hero.id) && typeof hero.name === "string" && hero.name.trim() !== ""
    );
  }

  return {
    ApiError,
    async getAll() {
      return sanitizeList(await fetchJson("all.json"));
    },
    getById: async (id) => fetchJson(`id/${checkId(id)}.json`),
    getBiography: async (id) => fetchJson(`biography/${checkId(id)}.json`),
    getPowerstats: async (id) => fetchJson(`powerstats/${checkId(id)}.json`),
    getAppearance: async (id) => fetchJson(`appearance/${checkId(id)}.json`),
    getWork: async (id) => fetchJson(`work/${checkId(id)}.json`),
    getConnections: async (id) => fetchJson(`connections/${checkId(id)}.json`)
  };
})();
