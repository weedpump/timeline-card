export class TranslationEngine {
  constructor(translations) {
    this.translations = translations; // { en-us: {...}, de: {...} }
    this.langCode = 'en-us'; // fallback
    this.active = translations['en-us']; // active translation table
  }

  // Loads translation object based on a language like 'de-DE'
  async load(lang) {
    const key = lang.toLowerCase();
    const short = key.substring(0, 2);

    this.active =
      this.translations[key] ||
      this.translations[short] ||
      this.translations['en-us'];

    this.langCode = key;
  }

  // e.g. t("status.open", { n: 5 })
  t(path, vars = {}) {
    const parts = path.split('.');
    let node = this.active;

    for (const p of parts) {
      if (!node[p]) return path;
      node = node[p];
    }

    if (typeof node === 'string') {
      return node.replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? `{${v}}`);
    }

    return node;
  }

  // Applies YAML state_map → then locale → then fallback
  getLocalizedState(entity_id, state, cfg) {
    // YAML override
    if (cfg?.state_map?.[state]) {
      return cfg.state_map[state];
    }

    // JSON translation
    const translated = this.t(`status.${state}`);
    if (translated !== `status.${state}`) {
      return translated;
    }

    return state;
  }
}
