const CLIENT_TYPES = ['Vending', 'Micromarket', 'Airport Concessions', 'Food Service']
const PIPELINE_STATUSES = ['Closed', 'Hot Pipeline', 'High Interest', 'Prospect']
const PRIORITY_TIERS = ['High', 'Medium', 'Low']
const FORECAST_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const ROUTE_TO_MARKETS = ['DSD', 'Distributor', 'Direct to Retailer', 'Wholesale']
const PLACEMENT_TYPES = CLIENT_TYPES
const SIGNAL_STATUSES = ['New', 'Reviewing', 'Accepted', 'Snoozed', 'Done']
const SIGNAL_PRIORITIES = ['P0', 'P1', 'P2', 'P3']
const TASK_STATUSES = ['To Do', 'In Progress', 'Blocked', 'Done']
const TASK_PRIORITIES = ['High', 'Medium', 'Low']

function createValidationError(message) {
  const error = new Error(message)
  error.status = 400
  return error
}

function requireString(value, label) {
  const nextValue = String(value || '').trim()

  if (!nextValue) {
    throw createValidationError(`${label} is required.`)
  }

  return nextValue
}

function validateEnum(value, allowedValues, label, fallback = '') {
  const nextValue = String(value || fallback || '').trim()

  if (!nextValue) {
    return ''
  }

  if (!allowedValues.includes(nextValue)) {
    throw createValidationError(`${label} must be one of: ${allowedValues.join(', ')}.`)
  }

  return nextValue
}

function validateNumber(value, label, {
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  precision = null,
  fallback = 0,
} = {}) {
  const numericValue = value === '' || value === null || value === undefined ? fallback : Number(value)

  if (Number.isNaN(numericValue)) {
    throw createValidationError(`${label} must be numeric.`)
  }

  if (numericValue < min || numericValue > max) {
    throw createValidationError(`${label} must be between ${min} and ${max}.`)
  }

  if (precision === 0) {
    return Math.round(numericValue)
  }

  if (typeof precision === 'number') {
    return Number(numericValue.toFixed(precision))
  }

  return numericValue
}

function validateDate(value, label) {
  const nextValue = String(value || '').trim()

  if (!nextValue) {
    return ''
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextValue)) {
    throw createValidationError(`${label} must use YYYY-MM-DD format.`)
  }

  return nextValue
}

function normalizeProduct(product = {}) {
  return {
    id: String(product.id || ''),
    productName: requireString(product.productName, 'Product name'),
    routeToMarket: validateEnum(product.routeToMarket, ROUTE_TO_MARKETS, 'Route to market', 'DSD'),
    numStores: validateNumber(product.numStores, 'Locations', { min: 0, precision: 0 }),
    baseVelocity: validateNumber(product.baseVelocity, 'Base velocity', { min: 0, precision: 2 }),
    srp: validateNumber(product.srp, 'Retail SRP', { min: 0, precision: 2 }),
    slottingFixed: validateNumber(product.slottingFixed, 'Slotting fixed fee', { min: 0, precision: 2 }),
    slottingFreeFillQty: validateNumber(product.slottingFreeFillQty, 'Slotting free fill', { min: 0, precision: 0 }),
    tprs: validateNumber(product.tprs, 'TPRs spend', { min: 0, precision: 2 }),
    marketing: validateNumber(product.marketing, 'Marketing spend', { min: 0, precision: 2 }),
  }
}

export function validateClientPayload(client = {}) {
  const normalizedProducts = Array.isArray(client.products) ? client.products.filter(Boolean).map(normalizeProduct) : []

  if (normalizedProducts.length === 0) {
    throw createValidationError('At least one product configuration is required.')
  }

  return {
    id: String(client.id || ''),
    retailerName: requireString(client.retailerName, 'Retailer / account'),
    clientType: validateEnum(client.clientType, CLIENT_TYPES, 'Client type', 'Vending'),
    pipelineStatus: validateEnum(client.pipelineStatus, PIPELINE_STATUSES, 'Pipeline status', 'Prospect'),
    forecastQuarter: validateEnum(client.forecastQuarter, FORECAST_QUARTERS, 'Forecast quarter') || '',
    rebate: validateNumber(client.rebate, 'Partner rebate', { min: 0, max: 100, precision: 2 }),
    dealType: client.dealType === 'revenue_share' ? 'revenue_share' : 'standard',
    numMachines: validateNumber(client.numMachines, 'Number of machines', { min: 0, precision: 0 }),
    machineCostPerUnit: validateNumber(client.machineCostPerUnit, 'Machine cost per unit', { min: 0, precision: 2 }),
    revenueSharePct: validateNumber(client.revenueSharePct, 'Revenue share percentage', { min: 0, max: 100, precision: 2 }),
    revenueShareMin: validateNumber(client.revenueShareMin, 'Revenue share minimum monthly', { min: 0, precision: 2 }),
    accountOwner: String(client.accountOwner || '').trim(),
    priorityTier: validateEnum(client.priorityTier, PRIORITY_TIERS, 'Priority tier', 'Medium'),
    winProbability: validateNumber(client.winProbability, 'Win probability', { min: 0, max: 100, precision: 0 }),
    targetLaunchDate: validateDate(client.targetLaunchDate, 'Target launch date'),
    nextAction: String(client.nextAction || '').trim(),
    nextActionDueDate: validateDate(client.nextActionDueDate, 'Next action due date'),
    notes: String(client.notes || '').trim(),
    createdAt: String(client.createdAt || ''),
    updatedAt: String(client.updatedAt || ''),
    products: normalizedProducts,
  }
}

export function validatePlacementsPayload(rows = []) {
  if (!Array.isArray(rows)) {
    throw createValidationError('Placements payload must be an array.')
  }

  return rows.map((row, index) => ({
    id: String(row.id || ''),
    partner: requireString(row.partner, `Placement partner ${index + 1}`),
    type: validateEnum(row.type, PLACEMENT_TYPES, `Placement type ${index + 1}`, 'Vending'),
    Q1: validateNumber(row.Q1, `Q1 placements ${index + 1}`, { min: 0, precision: 0 }),
    Q2: validateNumber(row.Q2, `Q2 placements ${index + 1}`, { min: 0, precision: 0 }),
    Q3: validateNumber(row.Q3, `Q3 placements ${index + 1}`, { min: 0, precision: 0 }),
    Q4: validateNumber(row.Q4, `Q4 placements ${index + 1}`, { min: 0, precision: 0 }),
  }))
}

export function validateProductCatalogPayload(products = []) {
  if (!Array.isArray(products) || products.length === 0) {
    throw createValidationError('Product catalogue must include at least one product.')
  }

  const seenNames = new Set()

  return products.map((product, index) => {
    const name = requireString(product.name, `Product ${index + 1} name`)

    if (seenNames.has(name.toLowerCase())) {
      throw createValidationError(`Duplicate product name: ${name}.`)
    }

    seenNames.add(name.toLowerCase())

    return {
      name,
      cogs: validateNumber(product.cogs, `${name} COGS`, { min: 0, precision: 2 }),
      defaultSrp: validateNumber(product.defaultSrp, `${name} default SRP`, { min: 0, precision: 2 }),
    }
  })
}

export function validateSignalPayload(signal = {}) {
  return {
    id: String(signal.id || ''),
    accountId: String(signal.accountId || '').trim(),
    title: requireString(signal.title, 'Signal title'),
    accountName: String(signal.accountName || '').trim(),
    type: requireString(signal.type || 'Commercial update', 'Signal type'),
    status: validateEnum(signal.status, SIGNAL_STATUSES, 'Signal status', 'New'),
    priority: validateEnum(signal.priority, SIGNAL_PRIORITIES, 'Signal priority', 'P2'),
    source: String(signal.source || 'Manual').trim(),
    dueDate: validateDate(signal.dueDate, 'Signal due date'),
    whyItMatters: String(signal.whyItMatters || '').trim(),
    owner: String(signal.owner || '').trim(),
    createdAt: String(signal.createdAt || ''),
    updatedAt: String(signal.updatedAt || ''),
  }
}

export function validateTaskPayload(task = {}) {
  return {
    id: String(task.id || ''),
    accountId: String(task.accountId || '').trim(),
    title: requireString(task.title, 'Task title'),
    accountName: String(task.accountName || '').trim(),
    signalLabel: String(task.signalLabel || '').trim(),
    status: validateEnum(task.status, TASK_STATUSES, 'Task status', 'To Do'),
    priority: validateEnum(task.priority, TASK_PRIORITIES, 'Task priority', 'Medium'),
    owner: String(task.owner || '').trim(),
    dueDate: validateDate(task.dueDate, 'Task due date'),
    notes: String(task.notes || '').trim(),
    createdAt: String(task.createdAt || ''),
    updatedAt: String(task.updatedAt || ''),
  }
}
