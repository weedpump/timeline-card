export class TranslationEngine {
  constructor(translations) {
    this.translations = translations; // { en: {...}, de: {...} }
    this.langCode = "en";             // fallback
    this.active = translations.en;    // active translation table
  }

  // Loads translation object based on a language like 'de-DE'
  async load(lang) {
    const short = lang.toLowerCase().substring(0, 2);
    this.langCode = short;
    this.active = this.translations[short] || this.translations.en;
  }

  // e.g. t("status.open", { n: 5 })
  t(path, vars = {}) {
    const parts = path.split(".");
    let node = this.active;

    for (const p of parts) {
      if (!node[p]) return path;
      node = node[p];
    }

    if (typeof node === "string") {
      return node.replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? `{${v}}`);
    }

    return node;
  }

  // Applies YAML status_map → then locale → then fallback
  getLocalizedState(entity_id, state, cfg) {
    // YAML override
    if (cfg?.status_map?.[state]) {
      return cfg.status_map[state];
    }

    // JSON translation
    const translated = this.t(`status.${state}`);
    if (translated !== `status.${state}`) {
      return translated;
    }

    return state;
  }
}
