export const FORECAST_STORAGE_KEY = 'placementsForecast'

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

export function normalizeForecastRow(row = {}) {
  return {
    id: row.id || Date.now().toString(),
    partner: row.partner || '',
    type: row.type || 'Vending',
    Q1: Number(row.Q1) || 0,
    Q2: Number(row.Q2) || 0,
    Q3: Number(row.Q3) || 0,
    Q4: Number(row.Q4) || 0,
  }
}

export function loadForecastRows() {
  try {
    const saved = localStorage.getItem(FORECAST_STORAGE_KEY)
    return saved ? JSON.parse(saved).map(normalizeForecastRow) : []
  } catch {
    return []
  }
}

export function saveForecastRows(rows) {
  const normalized = rows.map(normalizeForecastRow)
  localStorage.setItem(FORECAST_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export function createEmptyForecastRow() {
  return normalizeForecastRow({ id: Date.now().toString() })
}
