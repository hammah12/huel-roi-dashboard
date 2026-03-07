export const CLIENT_STORAGE_KEY = 'huelClients'

export const CLIENT_TYPES = ['Vending', 'Micromarket', 'Airport Concessions', 'Food Service']
export const PIPELINE_STATUSES = ['Closed', 'Hot Pipeline', 'High Interest', 'Prospect']
export const PRIORITY_TIERS = ['High', 'Medium', 'Low']
export const FORECAST_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

const WIN_PROBABILITY_DEFAULTS = {
  Closed: 100,
  'Hot Pipeline': 75,
  'High Interest': 50,
  Prospect: 25,
}

function stringifyValue(value) {
  if (value === undefined || value === null) {
    return ''
  }

  return String(value)
}

function clampProbability(value, fallback) {
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) {
    return String(fallback)
  }

  return String(Math.max(0, Math.min(100, Math.round(numericValue))))
}

export function defaultWinProbability(status) {
  return WIN_PROBABILITY_DEFAULTS[status] ?? WIN_PROBABILITY_DEFAULTS.Prospect
}

export function createEmptyProduct(availableProducts = []) {
  return {
    productName: availableProducts[0]?.name || 'Huel BE RTD',
    routeToMarket: 'DSD',
    numStores: '',
    baseVelocity: '',
    srp: '',
    slottingFixed: '',
    slottingFreeFillQty: '',
    tprs: '',
    marketing: '',
  }
}

function normalizeProduct(product = {}, legacyRouteToMarket = 'DSD', availableProducts = []) {
  return {
    productName: product.productName || availableProducts[0]?.name || 'Huel BE RTD',
    routeToMarket: product.routeToMarket || legacyRouteToMarket || 'DSD',
    numStores: stringifyValue(product.numStores),
    baseVelocity: stringifyValue(product.baseVelocity),
    srp: stringifyValue(product.srp),
    slottingFixed: stringifyValue(product.slottingFixed),
    slottingFreeFillQty: stringifyValue(product.slottingFreeFillQty),
    tprs: stringifyValue(product.tprs),
    marketing: stringifyValue(product.marketing),
  }
}

export function normalizeClient(client = {}, availableProducts = [], now = new Date().toISOString()) {
  const legacyRouteToMarket = client.routeToMarket || 'DSD'
  const products = client.products?.length
    ? client.products.map((product) => normalizeProduct(product, legacyRouteToMarket, availableProducts))
    : [normalizeProduct(client, legacyRouteToMarket, availableProducts)]

  const createdAt = client.createdAt || now
  const hasManualProbability = client.winProbability !== undefined && client.winProbability !== null && client.winProbability !== ''

  return {
    retailerName: client.retailerName || '',
    clientType: client.clientType || 'Vending',
    pipelineStatus: client.pipelineStatus || 'Prospect',
    forecastQuarter: client.forecastQuarter || '',
    rebate: stringifyValue(client.rebate),
    dealType: client.dealType || 'standard',
    numMachines: stringifyValue(client.numMachines),
    machineCostPerUnit: stringifyValue(client.machineCostPerUnit),
    revenueSharePct: stringifyValue(client.revenueSharePct),
    revenueShareMin: stringifyValue(client.revenueShareMin),
    accountOwner: client.accountOwner || '',
    priorityTier: client.priorityTier || 'Medium',
    winProbability: hasManualProbability
      ? clampProbability(client.winProbability, defaultWinProbability(client.pipelineStatus))
      : String(defaultWinProbability(client.pipelineStatus)),
    targetLaunchDate: client.targetLaunchDate || '',
    nextAction: client.nextAction || '',
    nextActionDueDate: client.nextActionDueDate || '',
    notes: client.notes || '',
    createdAt,
    updatedAt: client.updatedAt || createdAt,
    products,
  }
}

export function loadClients(availableProducts = []) {
  try {
    const saved = localStorage.getItem(CLIENT_STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : []
    const normalized = parsed.map((client) => normalizeClient(client, availableProducts))
    localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(normalized))
    return normalized
  } catch {
    return []
  }
}

export function saveClients(clients, availableProducts = [], updatedIndexes = null) {
  const now = new Date().toISOString()
  const updatedIndexSet = updatedIndexes ? new Set(updatedIndexes) : null

  const normalized = clients.map((client, index) => normalizeClient({
    ...client,
    createdAt: client.createdAt || now,
    updatedAt:
      updatedIndexSet === null || updatedIndexSet.has(index)
        ? now
        : client.updatedAt || client.createdAt || now,
  }, availableProducts, now))

  localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export function createEmptyClient(availableProducts = []) {
  return normalizeClient({
    retailerName: '',
    clientType: 'Vending',
    pipelineStatus: 'Prospect',
    priorityTier: 'Medium',
    winProbability: defaultWinProbability('Prospect'),
    products: [createEmptyProduct(availableProducts)],
  }, availableProducts)
}
