/* ==========================================================================
   favorites.js
   Guarda os favoritos no LocalStorage do navegador.

   O que salvamos: SOMENTE os números (ids) dos personagens, por exemplo [70, 620].
   Nenhum dado pessoal é coletado.

   SEGURANÇA: o usuário pode editar o LocalStorage pelo DevTools. Por isso,
   ao ler, validamos tudo: tem que ser uma lista de números inteiros válidos.
   ========================================================================== */

const Favorites = (() => {
  const STORAGE_KEY = "heroverse:favorites";

  function isValidId(value) {
    return Number.isInteger(value) && value > 0 && value < 10000;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return [...new Set(parsed.filter(isValidId))];
    } catch {
      // JSON quebrado ou LocalStorage bloqueado: começamos com lista vazia
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      return true;
    } catch {
      return false; // armazenamento cheio ou bloqueado (modo privado, por exemplo)
    }
  }

  function notify() {
    document.dispatchEvent(new CustomEvent("favorites:changed"));
  }

  let ids = load();

  return {
    getAll: () => [...ids],
    count: () => ids.length,
    has: (id) => ids.includes(id),

    // Adiciona se não existe, remove se já existe
    toggle(id) {
      if (!isValidId(id)) return { added: false, saved: false };
      const added = !ids.includes(id);
      ids = added ? [...ids, id] : ids.filter((item) => item !== id);
      const saved = save();
      notify();
      return { added, saved };
    }
  };
})();
