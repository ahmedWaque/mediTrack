// Security thresholds for inventory change detection
// These values are configurable without code changes

const SECURITY_CONFIG = {
  // Soft alert thresholds
  SOFT: {
    // Minimum quantity change to trigger soft alert (unit delta)
    MIN_QUANTITY_DELTA: 5,
    // Minimum percentage change to trigger soft alert (e.g., 20 = 20%)
    MIN_PERCENTAGE_CHANGE: 20
  },
  
  // Critical alert thresholds
  CRITICAL: {
    // Minimum quantity change to trigger critical alert (unit delta)
    MIN_QUANTITY_DELTA: 15,
    // Minimum percentage change to trigger critical alert (e.g., 40 = 40%)
    MIN_PERCENTAGE_CHANGE: 40
  }
};

/**
 * Calculates the alert level based on quantity changes
 * @param {number} oldQuantity - Previous quantity value
 * @param {number} newQuantity - New quantity value
 * @returns {string} - Alert level: 'normal', 'soft', or 'critical'
 */
const calculateAlertLevel = (oldQuantity, newQuantity) => {
  // Handle edge cases
  if (oldQuantity === null || oldQuantity === undefined) {
    return 'normal';
  }
  if (newQuantity === null || newQuantity === undefined) {
    return 'normal';
  }

  const oldQty = Number(oldQuantity);
  const newQty = Number(newQuantity);

  // Calculate absolute quantity delta (change)
  const quantityDelta = Math.abs(oldQty - newQty);

  // Calculate percentage change
  let percentageChange = 0;
  if (oldQty > 0) {
    percentageChange = Math.abs((quantityDelta / oldQty) * 100);
  } else if (newQty > 0) {
    // If old quantity was 0 and new is > 0, treat as 100% increase
    percentageChange = 100;
  }

  // Check for critical alert
  // Critical: Large quantity delta OR high percentage drop
  if (quantityDelta >= SECURITY_CONFIG.CRITICAL.MIN_QUANTITY_DELTA ||
      percentageChange >= SECURITY_CONFIG.CRITICAL.MIN_PERCENTAGE_CHANGE) {
    return 'critical';
  }

  // Check for soft alert
  // Soft: Moderate quantity delta OR moderate percentage change
  if (quantityDelta >= SECURITY_CONFIG.SOFT.MIN_QUANTITY_DELTA ||
      percentageChange >= SECURITY_CONFIG.SOFT.MIN_PERCENTAGE_CHANGE) {
    return 'soft';
  }

  // Default to normal
  return 'normal';
};

module.exports = {
  SECURITY_CONFIG,
  calculateAlertLevel
};


