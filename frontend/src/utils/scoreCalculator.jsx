// src/utils/scoreCalculator.js
export const computeScore = (item) => {
  // Min values from original Python DataFrame for scaling
  const MIN_VALUES = {
    'Total Premium': 0.0,
    'Coverage Premium Amount': 0.0,
    'Comission Amount': 0.0,
    'Limit': 0.0,
    'Comission %': 1.0,
  };

  // Max values from original Python DataFrame for scaling
  const MAX_VALUES = {
    'Total Premium': 1.016666e+07,
    'Coverage Premium Amount': 9.497513e+06,
    'Comission Amount': 1.595200e+06,
    'Limit': 3.857328e+08,
    'Comission %': 20.0,
  };

  // Optimized weights (from the Python analysis - Iteration 3's best result)
  // These keys match the '_normalized' column names in Python, 
  // and will be used to map to the raw values from 'item'
  const OPTIMIZED_WEIGHTS = {
    'Total Premium_normalized': 0.0500,
    'Coverage Premium Amount_normalized': 0.0500,
    'Comission Amount_normalized': 0.0500,
    'Limit_normalized': 0.2178,
    'Comission %_normalized': 0.6322,
  };

  let weightedScore = 0;
  const breakdown = {};
  const normalizedBreakdown = {};

  // Define mapping from Python column names to expected Javascript item properties
  // You should ensure your 'item' object contains these properties.
  const columnMapping = {
    'Total Premium': 'totalPremium',
    'Coverage Premium Amount': 'coveragePremiumAmount',
    'Comission Amount': 'comissionAmount',
    'Limit': 'limit',
    'Comission %': 'comissionPercent',
  };

  // Iterate over the columns used in the priority score
  for (const pyColName in columnMapping) {
    const jsPropName = columnMapping[pyColName];
    const normalizedPyColName = `${pyColName}_normalized`;

    // Get raw value from item, default to 0 if not present
    const rawValue = item[jsPropName] || 0;

    const min = MIN_VALUES[pyColName];
    const max = MAX_VALUES[pyColName];
    const weight = OPTIMIZED_WEIGHTS[normalizedPyColName];

    let normalizedValue;
    if (max - min === 0) {
      normalizedValue = 0; // Avoid division by zero if all values are identical
    } else {
      normalizedValue = (rawValue - min) / (max - min);
    }
    // Clamp normalized value between 0 and 1
    normalizedValue = Math.max(0, Math.min(1, normalizedValue));

    const weightedComponent = normalizedValue * weight;

    weightedScore += weightedComponent;
    breakdown[jsPropName] = weightedComponent; // Store the weighted component
    normalizedBreakdown[`${jsPropName}Normalized`] = normalizedValue; // Store normalized value
  }

  // The final score will be between 0 and 1, as it's a weighted sum of normalized values.
  // The original code had a clamping to 10-99, but based on the Python analysis,
  // the score is expected to be in the 0-1 range.
  const value = weightedScore;

  return {
    value,
    breakdown: { ...breakdown, ...normalizedBreakdown }
  };
};