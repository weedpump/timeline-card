// Icon Engine — extended, stateless, pure functions
// Covers full HA device_class + smart fallbacks

// Device Class → State → Icon mapping
const DEVICE_CLASS_MAP = {
  // Standard binary sensors
  battery: {
    on: 'mdi:battery-alert',
    off: 'mdi:battery',
    default: 'mdi:battery',
  },
  door: { open: 'mdi:door-open', closed: 'mdi:door-closed' },
  window: { open: 'mdi:window-open', closed: 'mdi:window-closed' },
  garage_door: { open: 'mdi:garage-open', closed: 'mdi:garage' },
  lock: { locked: 'mdi:lock', unlocked: 'mdi:lock-open-variant' },
  motion: { on: 'mdi:run', off: 'mdi:walk' },
  presence: { on: 'mdi:account', off: 'mdi:account-off' },
  occupancy: { on: 'mdi:home-account', off: 'mdi:home-outline' },
  opening: { on: 'mdi:door-open', off: 'mdi:door-closed' },
  problem: { on: 'mdi:alert-circle', off: 'mdi:check-circle' },
  safety: { on: 'mdi:alert', off: 'mdi:shield-check' },
  smoke: { on: 'mdi:smoke-detector-alert', off: 'mdi:smoke-detector' },
  gas: { on: 'mdi:gas-cylinder', off: 'mdi:gas-burner' },
  moisture: { on: 'mdi:water-alert', off: 'mdi:water-check' },
  vibration: { on: 'mdi:vibrate', off: 'mdi:vibrate-off' },
  connectivity: { on: 'mdi:wifi-check', off: 'mdi:wifi-off' },
  sound: { on: 'mdi:volume-high', off: 'mdi:volume-off' },
  cold: { on: 'mdi:snowflake-alert', off: 'mdi:snowflake' },
  heat: { on: 'mdi:fire', off: 'mdi:fire-off' },
  tamper: { on: 'mdi:shield-alert', off: 'mdi:shield-check' },

  // Numeric sensors
  temperature: { default: 'mdi:thermometer' },
  humidity: { default: 'mdi:water-percent' },
  pressure: { default: 'mdi:gauge' },
  energy: { default: 'mdi:flash' },
  power: { default: 'mdi:lightning-bolt' },
  power_factor: { default: 'mdi:sine-wave' },
  voltage: { default: 'mdi:lightning-bolt' },
  current: { default: 'mdi:current-ac' },
  apparent_power: { default: 'mdi:flash-triangle' },
  co: { default: 'mdi:molecule-co' },
  co2: { default: 'mdi:molecule-co2' },
  pm25: { default: 'mdi:weather-hazy' },
  pm10: { default: 'mdi:weather-hazy' },
  aqi: { default: 'mdi:air-filter' },
  illuminance: { default: 'mdi:brightness-6' },

  // Special devices
  battery_charging: { default: 'mdi:battery-charging' },
  update: { on: 'mdi:package-up', off: 'mdi:package-check' },
};

// Domain defaults
const DOMAIN_MAP = {
  lock: (state) => (state === 'locked' ? 'mdi:lock' : 'mdi:lock-open-variant'),

  binary_sensor: (state) => (state === 'on' ? 'mdi:eye' : 'mdi:eye-off'),

  sensor: () => 'mdi:information-outline',

  vacuum: () => 'mdi:robot-vacuum',

  person: (state) =>
    state === 'home' ? 'mdi:home' : 'mdi:account-arrow-right',

  light: (state) => (state === 'on' ? 'mdi:lightbulb-on' : 'mdi:lightbulb'),

  switch: (state) =>
    state === 'on' ? 'mdi:toggle-switch' : 'mdi:toggle-switch-off',

  climate: (state) => {
    if (state === 'heating') return 'mdi:radiator';
    if (state === 'cooling') return 'mdi:snowflake';
    if (state === 'drying') return 'mdi:water-percent';
    if (state === 'fan') return 'mdi:fan';
    return 'mdi:thermostat';
  },

  water_heater: (state) => {
    if (state === 'eco') return 'mdi:leaf';
    if (state === 'performance') return 'mdi:fire';
    return 'mdi:water-boiler';
  },

  alarm_control_panel: (state) => {
    if (state === 'armed_away') return 'mdi:shield-lock';
    if (state === 'armed_home') return 'mdi:shield-home';
    if (state === 'armed_night') return 'mdi:shield-moon';
    if (state === 'disarmed') return 'mdi:shield-off';
    if (state === 'triggered') return 'mdi:bell-alert';
    return 'mdi:shield';
  },

  media_player: (state) => {
    if (state === 'playing') return 'mdi:play-circle';
    if (state === 'paused') return 'mdi:pause-circle';
    return 'mdi:stop-circle';
  },
};

// Generic fallback icons
const GENERIC_STATES = {
  on: 'mdi:check-circle',
  off: 'mdi:circle-outline',
  open: 'mdi:arrow-up',
  closed: 'mdi:arrow-down',
  unknown: 'mdi:help-circle-outline',
};

export function getIconColor(cfg, state) {
  if (cfg?.icon_color_map?.[state]) return cfg.icon_color_map[state];
  if (cfg?.icon_color) return cfg.icon_color;
}

export function getIconForEntity(stateObj, cfg, forcedState) {
  if (!stateObj) return 'mdi:help-circle';

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

  // Device-class mapping (strong, HA-consistent)
  const dc = stateObj.attributes.device_class;
  if (dc && DEVICE_CLASS_MAP[dc]) {
    const map = DEVICE_CLASS_MAP[dc];
    return map[state] || map.default || 'mdi:help-circle';
  }

  // Domain defaults
  const domain = entity_id.split('.')[0];
  if (DOMAIN_MAP[domain]) {
    return DOMAIN_MAP[domain](state);
  }

  // Generic fallback
  if (GENERIC_STATES[state]) return GENERIC_STATES[state];

  return 'mdi:help-circle';
}
