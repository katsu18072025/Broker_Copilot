# Summary of Weighted Priority Score Optimization Efforts

## Objective
Our objective was to create a **'Weighted Priority Score'** with a distribution as close as possible to a normal distribution.
* **Ideal Skewness:** $0$
* **Ideal Kurtosis:** $3$

---

## Exploration of Approaches

We explored four distinct approaches to achieve this distribution.

### 1. Initial Attempt (Simple Average - No Weights)
* **Method:** Baseline calculation with no specific optimization.
* **Skewness:** $7.5506$
* **Kurtosis:** $76.2494$
* **Conclusion:** This baseline distribution was highly right-skewed and extremely leptokurtic.

### 2. Programmatic Optimization (No Constraints)
* **Objective Function:** $\text{abs}(\text{skewness}) + \text{abs}(\text{kurtosis} - 3)$
* **Constraint:** No minimum weight constraints.
* **Optimized Weights:**
    * Total Premium_normalized: $\approx 0.0000$
    * Coverage Premium Amount_normalized: $\approx 0.0000$
    * Comission Amount_normalized: $\approx 0.0000$
    * Limit_normalized: $0.3137$
    * Comission %_normalized: $0.6863$
* **Stats:** Skewness: $-1.6643$ | Kurtosis: $5.8817$
* **Conclusion:** This significantly reduced kurtosis but resulted in a notable negative skew. The optimizer effectively eliminated three features by assigning near-zero weights.

### 3. Programmatic Optimization (Weighted Objective + Constraints)
* **Objective Function:** $\text{abs}(\text{skewness}) \times 0.7 + \text{abs}(\text{kurtosis} - 3) \times 0.3$
* **Constraint:** Minimum weight of $0.05$ per feature.
* **Optimized Weights:**
    * Total Premium_normalized: $0.0500$
    * Coverage Premium Amount_normalized: $0.0500$
    * Comission Amount_normalized: $0.0500$
    * Limit_normalized: $0.2178$
    * Comission %_normalized: $0.6322$
* **Stats:** Skewness: $-1.1004$ | Kurtosis: $7.0485$
* **Conclusion:** Improved skewness (moving closer to 0) compared to the previous attempt. Kurtosis increased slightly, but the constraints successfully ensured all features contributed.

### 4. Programmatic Optimization (Shapiro-Wilk)
* **Objective Function:** $1 - \text{p\_value (Shapiro-Wilk)}$
* **Constraint:** Minimum weight of $0.05$.
* **Optimized Weights:**
    * All features reverted to equal weighting ($0.2000$).
* **Stats:** Skewness: $7.5506$ | Kurtosis: $76.2494$
* **Conclusion:** Under the imposed constraints, this method reverted to the baseline equal weighting, resulting in a highly non-normal distribution.

---

## Comparative Summary

| Attempt | Approach | Skewness | Kurtosis | Key Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Simple Average | 7.55 | 76.25 | Highly right-skewed baseline. |
| **2** | Opt (No Constraints) | -1.66 | 5.88 | Reduced kurtosis, but negative skew and dropped features. |
| **3** | **Opt (Weighted + Min Constraints)** | **-1.10** | **7.05** | **Best balance of normality and feature inclusion.** |
| **4** | Opt (Shapiro-Wilk) | 7.55 | 76.25 | Reverted to baseline; poor results. |

---

## Best Achieved Distribution

The best result was obtained from the **third optimization attempt**. This approach balanced normality metrics with the business requirement that all features must contribute to the score.

### Methodology
* **Objective:** $\text{abs}(\text{skewness}) \times 0.7 + \text{abs}(\text{kurtosis} - 3) \times 0.3$
* **Constraints:** Minimum weight of $0.05$ for Premium and Commission Amount fields.

### Final Statistical Properties
* **Skewness:** $-1.1004$ (Target: $0$)
* **Kurtosis:** $7.0485$ (Target: $3$)

### Final Optimized Weights
```json
{
  "Total Premium_normalized": 0.0500,
  "Coverage Premium Amount_normalized": 0.0500,
  "Comission Amount_normalized": 0.0500,
  "Limit_normalized": 0.2178,
  "Comission %_normalized": 0.6322
}