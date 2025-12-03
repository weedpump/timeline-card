// Icon Engine — standalone, stateless, pure functions

// Device Class → State → Icon mapping
const DEVICE_CLASS_MAP = {
  lock:       { locked: "mdi:lock", unlocked: "mdi:lock-open-variant" },
  door:       { open: "mdi:door-open", closed: "mdi:door-closed" },
  window:     { open: "mdi:window-open", closed: "mdi:window-closed" },
  motion:     { on: "mdi:run", off: "mdi:walk" },
  presence:   { on: "mdi:account", off: "mdi:account-off" },
  occupancy:  { on: "mdi:home-account", off: "mdi:home-outline" },
  battery:    { default: "mdi:battery" },
  temperature:{ default: "mdi:thermometer" },
  humidity:   { default: "mdi:water-percent" },
  garage_door:{ open: "mdi:garage-open", closed: "mdi:garage" },
};

// Domain defaults
const DOMAIN_MAP = {
  lock: state => state === "locked" ? "mdi:lock" : "mdi:lock-open-variant",
  binary_sensor: state => state === "on" ? "mdi:eye" : "mdi:eye-off",
  sensor: () => "mdi:information-outline",
  vacuum: () => "mdi:robot-vacuum",
  person: state => state === "home" ? "mdi:home" : "mdi:account-arrow-right",
  light: state => state === "on" ? "mdi:lightbulb-on" : "mdi:lightbulb",
  switch: state => state === "on" ? "mdi:toggle-switch" : "mdi:toggle-switch-off",
};

// Generic fallback icons
const GENERIC_STATES = {
  on: "mdi:check-circle",
  off: "mdi:circle-outline",
  open: "mdi:arrow-up",
  closed: "mdi:arrow-down",
  unknown: "mdi:help-circle-outline",
};

export function getIconColor(cfg, state) {
  if (cfg?.icon_color_map?.[state]) return cfg.icon_color_map[state];
  if (cfg?.icon_color) return cfg.icon_color;
  return "white";
}

export function getIconForEntity(stateObj, cfg, forcedState) {
  if (!stateObj) return "mdi:help-circle";

  const entity_id = stateObj.entity_id;
  const state = forcedState ?? stateObj.state;

  // YAML: icon per state
  if (cfg?.icon_map?.[state]) return cfg.icon_map[state];

  // YAML: static icon
  if (cfg?.icon) return cfg.icon;

  // YAML: icon_map default fallback
  if (cfg?.icon_map?.default) return cfg.icon_map.default;

  // HA native icon
  if (stateObj?.attributes?.icon) return stateObj.attributes.icon;

  // Device class mapping
  const dc = stateObj.attributes.device_class;
  if (dc && DEVICE_CLASS_MAP[dc]) {
    const map = DEVICE_CLASS_MAP[dc];
    return map[state] || map.default || "mdi:help-circle";
  }

  // Domain defaults
  const domain = entity_id.split(".")[0];
  if (DOMAIN_MAP[domain]) {
    return DOMAIN_MAP[domain](state);
  }

  // Generic fallback
  if (GENERIC_STATES[state]) return GENERIC_STATES[state];

  return "mdi:help-circle";
}
