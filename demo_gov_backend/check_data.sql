-- Check if FY2025 demo data exists
SELECT
    COUNT(*) as total_records,
    fiscal_year
FROM fsfvi_data
WHERE government_id = 'demo_government'
GROUP BY fiscal_year;

-- Show all FY2025 data
SELECT
    component_type,
    observed_value,
    benchmark_value,
    ROUND((observed_value - benchmark_value) / benchmark_value * 100, 1) AS performance_gap_pct,
    ROUND(financial_allocation_usd / 1000000, 0) AS allocation_millions_usd,
    ROUND(financial_allocation_usd / 1200000000.0 * 100, 1) AS pct_of_total_budget
FROM fsfvi_data
WHERE government_id = 'demo_government'
  AND fiscal_year = 2025
ORDER BY financial_allocation_usd DESC;
