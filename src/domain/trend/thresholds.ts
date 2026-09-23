export const MATERIAL_CHANGE = 0.05; // smaller changes are called "flat" even if significant
export const FLAT_BAND = 0.1; // CI inside +-10% => "flat"
export const BOOTSTRAP_ITERATIONS = 5000;
export const MAX_CONFIDENCE_POINTS = 3; // each warning subtracts points; 3 = high, 2 = medium, less = low
