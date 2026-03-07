const STORAGE_KEY = 'huelDataStatus'

const DEFAULT_STATUS = {
  pricing: {
    source: 'Local catalogue',
    lastSuccessAt: null,
    lastError: null,
  },
  clientSync: {
    target: null,
    lastSuccessAt: null,
    lastError: null,
  },
}

function readStatus() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : DEFAULT_STATUS
  } catch {
    return DEFAULT_STATUS
  }
}

function writeStatus(status) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
  return status
}

export function getDataStatus() {
  const stored = readStatus()

  return {
    pricing: { ...DEFAULT_STATUS.pricing, ...stored.pricing },
    clientSync: { ...DEFAULT_STATUS.clientSync, ...stored.clientSync },
  }
}

export function markPricingFetchSuccess(source) {
  const status = getDataStatus()
  return writeStatus({
    ...status,
    pricing: {
      source,
      lastSuccessAt: new Date().toISOString(),
      lastError: null,
    },
  })
}

export function markPricingFetchFailure(source, error) {
  const status = getDataStatus()
  return writeStatus({
    ...status,
    pricing: {
      ...status.pricing,
      source: source || status.pricing.source,
      lastError: error || 'Unknown error',
    },
  })
}

export function markClientSyncSuccess(target) {
  const status = getDataStatus()
  return writeStatus({
    ...status,
    clientSync: {
      target,
      lastSuccessAt: new Date().toISOString(),
      lastError: null,
    },
  })
}

export function markClientSyncFailure(target, error) {
  const status = getDataStatus()
  return writeStatus({
    ...status,
    clientSync: {
      ...status.clientSync,
      target: target || status.clientSync.target,
      lastError: error || 'Unknown error',
    },
  })
}
