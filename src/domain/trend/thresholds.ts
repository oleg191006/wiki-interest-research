export const MATERIAL_CHANGE = 0.05; // smaller changes are called "flat" even if significant
export const FLAT_BAND = 0.1; // CI inside +-10% => "flat"
export const LOW_VOLUME = 50; // median human views per day
export const VERY_LOW_VOLUME = 10;
export const CONSISTENT_SHARE = 2 / 3; // share of months that must agree with the direction
export const BOT_DESKTOP_SHIFT = 0.15; // desktop-share shift beyond the edition's own shift
export const SPIKE_MULTIPLE = 3;
export const SPIKE_MIN_VIEWS = 20;
export const SPIKE_HALF_WINDOW = 14; // 29-day centered median = 14 days on each side
export const BOOTSTRAP_ITERATIONS = 5000;
export const MAX_CONFIDENCE_POINTS = 3; // each warning subtracts points; 3 = high, 2 = medium, less = low
