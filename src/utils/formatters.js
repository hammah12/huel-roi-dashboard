export function formatCurrency(value, options = {}) {
  const numericValue = Number(value) || 0
  const minimumFractionDigits = options.minimumFractionDigits ?? 0
  const maximumFractionDigits = options.maximumFractionDigits ?? minimumFractionDigits

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numericValue)
}

export function formatCompactCurrency(value) {
  const numericValue = Number(value) || 0

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(numericValue)
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value) || 0)
}

export function formatPercent(value, digits = 1) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value) || 0)
}

export function formatShortDate(value) {
  if (!value) {
    return 'Unscheduled'
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return 'Unscheduled'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function startOfDay(input = new Date()) {
  const date = new Date(input)
  date.setHours(0, 0, 0, 0)
  return date
}

export function daysFromToday(value, today = new Date()) {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const difference = startOfDay(date).getTime() - startOfDay(today).getTime()
  return Math.round(difference / (1000 * 60 * 60 * 24))
}

export function formatRelativeDayLabel(value, today = new Date()) {
  const days = daysFromToday(value, today)

  if (days === null) {
    return 'No date'
  }

  if (days === 0) {
    return 'Today'
  }

  if (days > 0) {
    return days === 1 ? 'In 1 day' : `In ${days} days`
  }

  const lateDays = Math.abs(days)
  return lateDays === 1 ? '1 day late' : `${lateDays} days late`
}
