const AIRTABLE_API = 'https://api.airtable.com/v0'

const TABLES = {
  retailers: 'Retailers',
  products: 'Products',
  pricing: 'Pricing Config',
  placements: 'Placements Forecast',
  signals: 'Signals',
  tasks: 'Tasks',
}

const DEFAULT_PRICING_TIERS = {
  DSD: 2.39,
  Distributor: 2.52,
  'Direct to Retailer': 2.85,
  Wholesale: 3.0,
}

const DEFAULT_PRODUCTS = [
  { name: 'Huel BE RTD', cogs: 1.42, defaultSrp: 4.99 },
  { name: 'Huel DG RTD', cogs: 0.77, defaultSrp: 3.49 },
]

function getWriteProtectionEnabled() {
  return Boolean(process.env.APP_WRITE_TOKEN)
}

function getConfig() {
  const token = process.env.AIRTABLE_TOKEN
  const baseId = process.env.AIRTABLE_BASE_ID

  if (!token || !baseId) {
    throw new Error('Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID environment variable.')
  }

  return { token, baseId }
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function buildUrl(baseId, path, query = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return `${AIRTABLE_API}/${baseId}/${path}${queryString ? `?${queryString}` : ''}`
}

async function airtableRequest(path, { method = 'GET', body, query } = {}) {
  const { token, baseId } = getConfig()
  const response = await fetch(buildUrl(baseId, path, query), {
    method,
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let details = ''

    try {
      const errorBody = await response.json()
      details = errorBody?.error?.message || JSON.stringify(errorBody)
    } catch {
      details = await response.text()
    }

    const error = new Error(details || `Airtable request failed with status ${response.status}`)
    error.status = response.status
    throw error
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

async function fetchTableRecords(tableName, { view, allowMissing = false } = {}) {
  let offset
  const records = []

  try {
    do {
      const payload = await airtableRequest(encodeURIComponent(tableName), {
        query: {
          ...(view ? { view } : {}),
          ...(offset ? { offset } : {}),
          pageSize: 100,
        },
      })

      records.push(...(payload.records || []))
      offset = payload.offset
    } while (offset)
  } catch (error) {
    if (allowMissing && error.status === 404) {
      return []
    }

    throw error
  }

  return records
}

async function fetchTableMetadata() {
  const { token, baseId } = getConfig()
  const response = await fetch(`${AIRTABLE_API}/meta/bases/${baseId}/tables`, {
    headers: headers(token),
  })

  if (!response.ok) {
    let details = ''
    try {
      const errorBody = await response.json()
      details = errorBody?.error?.message || JSON.stringify(errorBody)
    } catch {
      details = await response.text()
    }

    throw new Error(details || 'Unable to read Airtable table metadata.')
  }

  return response.json()
}

async function batchCreate(tableName, records) {
  if (records.length === 0) {
    return []
  }

  const created = []

  for (let index = 0; index < records.length; index += 10) {
    const chunk = records.slice(index, index + 10)
    const payload = await airtableRequest(encodeURIComponent(tableName), {
      method: 'POST',
      body: {
        records: chunk.map((fields) => ({ fields })),
      },
    })
    created.push(...(payload.records || []))
  }

  return created
}

async function batchDelete(tableName, recordIds) {
  if (recordIds.length === 0) {
    return
  }

  for (let index = 0; index < recordIds.length; index += 10) {
    const chunk = recordIds.slice(index, index + 10)
    const { token, baseId } = getConfig()
    const searchParams = new URLSearchParams()
    chunk.forEach((recordId) => searchParams.append('records[]', recordId))
    const response = await fetch(`${AIRTABLE_API}/${baseId}/${encodeURIComponent(tableName)}?${searchParams.toString()}`, {
      method: 'DELETE',
      headers: headers(token),
    })

    if (!response.ok) {
      let details = ''
      try {
        const errorBody = await response.json()
        details = errorBody?.error?.message || JSON.stringify(errorBody)
      } catch {
        details = await response.text()
      }

      throw new Error(details || `Unable to delete records from ${tableName}`)
    }
  }
}

function formatDateValue(value) {
  if (!value) {
    return ''
  }

  return String(value).slice(0, 10)
}

function normalizeClientRecord(retailerRecord, retailerProducts = []) {
  const fields = retailerRecord.fields || {}

  return {
    id: retailerRecord.id,
    retailerName: fields.Name || '',
    clientType: fields['Client Type'] || 'Vending',
    pipelineStatus: fields['Pipeline Status'] || 'Prospect',
    forecastQuarter: fields['Forecast Quarter'] || '',
    rebate: String(fields.Rebate ?? ''),
    dealType: fields['Deal Type'] || 'standard',
    numMachines: String(fields['Num Machines'] ?? ''),
    machineCostPerUnit: String(fields['Machine Cost Per Unit'] ?? ''),
    revenueSharePct: String(fields['Revenue Share Pct'] ?? ''),
    revenueShareMin: String(fields['Revenue Share Minimum Monthly'] ?? ''),
    accountOwner: fields['Account Owner'] || '',
    priorityTier: fields['Priority Tier'] || 'Medium',
    winProbability: String(fields['Win Probability'] ?? ''),
    targetLaunchDate: formatDateValue(fields['Target Launch Date']),
    nextAction: fields['Next Action'] || '',
    nextActionDueDate: formatDateValue(fields['Next Action Due Date']),
    notes: fields.Notes || '',
    createdAt: fields['Created At'] || '',
    updatedAt: fields['Updated At'] || '',
    products: retailerProducts.map((productRecord) => {
      const productFields = productRecord.fields || {}
      return {
        id: productRecord.id,
        productName: productFields['Product Name'] || '',
        routeToMarket: productFields['Route to Market'] || 'DSD',
        numStores: String(productFields['Num Stores'] ?? ''),
        baseVelocity: String(productFields['Base Velocity'] ?? ''),
        srp: String(productFields.SRP ?? ''),
        slottingFixed: String(productFields['Slotting Fixed'] ?? ''),
        slottingFreeFillQty: String(productFields['Slotting Free Fill Qty'] ?? ''),
        tprs: String(productFields.TPRs ?? ''),
        marketing: String(productFields.Marketing ?? ''),
      }
    }),
  }
}

function normalizeSignalRecord(signalRecord, retailersById = new Map()) {
  const fields = signalRecord.fields || {}
  const retailerIds = fields.Retailer || []
  const linkedRetailer = retailerIds.length ? retailersById.get(retailerIds[0]) : null

  return {
    id: signalRecord.id,
    title: fields.Name || '',
    accountId: linkedRetailer?.id || retailerIds[0] || '',
    accountName: linkedRetailer?.retailerName || fields.Account || '',
    type: fields.Type || 'Commercial update',
    status: fields.Status || 'New',
    priority: fields.Priority || 'P2',
    source: fields.Source || 'Manual',
    dueDate: formatDateValue(fields['Due Date']),
    whyItMatters: fields['Why It Matters'] || '',
    owner: fields.Owner || '',
    createdAt: fields['Created At'] || '',
    updatedAt: fields['Updated At'] || '',
  }
}

function normalizeTaskRecord(taskRecord, retailersById = new Map()) {
  const fields = taskRecord.fields || {}
  const retailerIds = fields.Retailer || []
  const linkedRetailer = retailerIds.length ? retailersById.get(retailerIds[0]) : null

  return {
    id: taskRecord.id,
    title: fields.Name || '',
    accountId: linkedRetailer?.id || retailerIds[0] || '',
    accountName: linkedRetailer?.retailerName || fields.Account || '',
    signalLabel: fields.Signal || '',
    status: fields.Status || 'To Do',
    priority: fields.Priority || 'Medium',
    owner: fields.Owner || '',
    dueDate: formatDateValue(fields['Due Date']),
    notes: fields.Notes || '',
    createdAt: fields['Created At'] || '',
    updatedAt: fields['Updated At'] || '',
  }
}

function getRetailerFields(client) {
  return {
    Name: client.retailerName,
    'Client Type': client.clientType || 'Vending',
    'Pipeline Status': client.pipelineStatus || 'Prospect',
    'Route to Market': client.products?.length
      ? Array.from(new Set(client.products.map((product) => product.routeToMarket).filter(Boolean))).join(', ')
      : 'DSD',
    'Account Owner': client.accountOwner || '',
    'Priority Tier': client.priorityTier || 'Medium',
    'Win Probability': Number(client.winProbability) || 0,
    'Forecast Quarter': client.forecastQuarter || '',
    'Target Launch Date': client.targetLaunchDate || null,
    'Next Action': client.nextAction || '',
    'Next Action Due Date': client.nextActionDueDate || null,
    Notes: client.notes || '',
    Rebate: Number(client.rebate) || 0,
    'Deal Type': client.dealType || 'standard',
    'Num Machines': Number(client.numMachines) || 0,
    'Machine Cost Per Unit': Number(client.machineCostPerUnit) || 0,
    'Revenue Share Pct': Number(client.revenueSharePct) || 0,
    'Revenue Share Minimum Monthly': Number(client.revenueShareMin) || 0,
    'Created At': client.createdAt || new Date().toISOString(),
    'Updated At': new Date().toISOString(),
    'Synced At': new Date().toISOString().slice(0, 10),
  }
}

function getProductFields(product, retailerId) {
  return {
    Retailer: [retailerId],
    'Product Name': product.productName,
    'Route to Market': product.routeToMarket || 'DSD',
    'Num Stores': Number(product.numStores) || 0,
    'Base Velocity': Number(product.baseVelocity) || 0,
    SRP: Number(product.srp) || 0,
    'Slotting Fixed': Number(product.slottingFixed) || 0,
    'Slotting Free Fill Qty': Number(product.slottingFreeFillQty) || 0,
    TPRs: Number(product.tprs) || 0,
    Marketing: Number(product.marketing) || 0,
  }
}

function getPlacementFields(row) {
  return {
    Name: row.partner || '',
    Type: row.type || 'Vending',
    Q1: Number(row.Q1) || 0,
    Q2: Number(row.Q2) || 0,
    Q3: Number(row.Q3) || 0,
    Q4: Number(row.Q4) || 0,
  }
}

function getSignalFields(signal) {
  return {
    Name: signal.title,
    Retailer: signal.accountId ? [signal.accountId] : [],
    Account: signal.accountName || '',
    Type: signal.type || 'Commercial update',
    Status: signal.status || 'New',
    Priority: signal.priority || 'P2',
    Source: signal.source || 'Manual',
    'Due Date': signal.dueDate || null,
    'Why It Matters': signal.whyItMatters || '',
    Owner: signal.owner || '',
    'Created At': signal.createdAt || new Date().toISOString(),
    'Updated At': new Date().toISOString(),
  }
}

function getTaskFields(task) {
  return {
    Name: task.title,
    Retailer: task.accountId ? [task.accountId] : [],
    Account: task.accountName || '',
    Signal: task.signalLabel || '',
    Status: task.status || 'To Do',
    Priority: task.priority || 'Medium',
    Owner: task.owner || '',
    'Due Date': task.dueDate || null,
    Notes: task.notes || '',
    'Created At': task.createdAt || new Date().toISOString(),
    'Updated At': new Date().toISOString(),
  }
}

export async function fetchBootstrapData() {
  const metadata = await fetchTableMetadata()
  const availableTables = new Set((metadata.tables || []).map((table) => table.name))

  const [retailerRecords, productRecords, pricingRecords, placementRecords, signalRecords, taskRecords] = await Promise.all([
    availableTables.has(TABLES.retailers) ? fetchTableRecords(TABLES.retailers, { allowMissing: true }) : [],
    availableTables.has(TABLES.products) ? fetchTableRecords(TABLES.products, { allowMissing: true }) : [],
    availableTables.has(TABLES.pricing) ? fetchTableRecords(TABLES.pricing, { allowMissing: true }) : [],
    availableTables.has(TABLES.placements) ? fetchTableRecords(TABLES.placements, { allowMissing: true }) : [],
    availableTables.has(TABLES.signals) ? fetchTableRecords(TABLES.signals, { allowMissing: true }) : [],
    availableTables.has(TABLES.tasks) ? fetchTableRecords(TABLES.tasks, { allowMissing: true }) : [],
  ])

  const productsByRetailer = productRecords.reduce((accumulator, productRecord) => {
    const retailerIds = productRecord.fields?.Retailer || []
    retailerIds.forEach((retailerId) => {
      if (!accumulator.has(retailerId)) {
        accumulator.set(retailerId, [])
      }

      accumulator.get(retailerId).push(productRecord)
    })
    return accumulator
  }, new Map())

  const clients = retailerRecords
    .map((retailerRecord) => normalizeClientRecord(retailerRecord, productsByRetailer.get(retailerRecord.id) || []))
    .sort((left, right) => left.retailerName.localeCompare(right.retailerName))
  const retailersById = new Map(clients.map((client) => [client.id, client]))

  const pricingTiers = { ...DEFAULT_PRICING_TIERS }
  const productMap = new Map(DEFAULT_PRODUCTS.map((product) => [product.name, { ...product }]))

  pricingRecords.forEach((record) => {
    const fields = record.fields || {}
    const key = fields['Config Key']
    const value = Number(fields.Value)

    if (!key || Number.isNaN(value)) {
      return
    }

    if (fields.Type === 'RTM Price') {
      pricingTiers[key] = value
      return
    }

    if (!productMap.has(key)) {
      productMap.set(key, { name: key, cogs: 0, defaultSrp: 0 })
    }

    const product = productMap.get(key)
    if (fields.Type === 'Product COGS') {
      product.cogs = value
    } else if (fields.Type === 'Product Default SRP') {
      product.defaultSrp = value
    }
  })

  const placements = placementRecords.map((record) => ({
    id: record.id,
    partner: record.fields?.Name || '',
    type: record.fields?.Type || 'Vending',
    Q1: Number(record.fields?.Q1) || 0,
    Q2: Number(record.fields?.Q2) || 0,
    Q3: Number(record.fields?.Q3) || 0,
    Q4: Number(record.fields?.Q4) || 0,
  }))

  const signals = signalRecords
    .map((record) => normalizeSignalRecord(record, retailersById))
    .sort((left, right) => (right.createdAt || '').localeCompare(left.createdAt || ''))

  const tasks = taskRecords
    .map((record) => normalizeTaskRecord(record, retailersById))
    .sort((left, right) => (left.dueDate || '9999-12-31').localeCompare(right.dueDate || '9999-12-31'))

  return {
    clients,
    placements,
    signals,
    tasks,
    pricingTiers,
    products: Array.from(productMap.values()).sort((left, right) => left.name.localeCompare(right.name)),
  }
}

export async function createClient(client) {
  const retailerPayload = await airtableRequest(encodeURIComponent(TABLES.retailers), {
    method: 'POST',
    body: { fields: getRetailerFields(client) },
  })

  const retailerId = retailerPayload.id
  await batchCreate(TABLES.products, (client.products || []).map((product) => getProductFields(product, retailerId)))

  const bootstrap = await fetchBootstrapData()
  return bootstrap.clients.find((entry) => entry.id === retailerId)
}

export async function updateClient(clientId, client) {
  await airtableRequest(`${encodeURIComponent(TABLES.retailers)}/${clientId}`, {
    method: 'PATCH',
    body: { fields: getRetailerFields(client) },
  })

  const bootstrap = await fetchBootstrapData()
  const existingClient = bootstrap.clients.find((entry) => entry.id === clientId)
  const existingProductIds = (existingClient?.products || []).map((product) => product.id).filter(Boolean)

  await batchDelete(TABLES.products, existingProductIds)
  await batchCreate(TABLES.products, (client.products || []).map((product) => getProductFields(product, clientId)))

  const refreshed = await fetchBootstrapData()
  return refreshed.clients.find((entry) => entry.id === clientId)
}

export async function deleteClient(clientId) {
  const bootstrap = await fetchBootstrapData()
  const existingClient = bootstrap.clients.find((entry) => entry.id === clientId)
  const existingProductIds = (existingClient?.products || []).map((product) => product.id).filter(Boolean)

  await batchDelete(TABLES.products, existingProductIds)
  await airtableRequest(`${encodeURIComponent(TABLES.retailers)}/${clientId}`, { method: 'DELETE' })
}

export async function replacePlacements(rows) {
  const existingRows = await fetchTableRecords(TABLES.placements, { allowMissing: true })
  await batchDelete(TABLES.placements, existingRows.map((row) => row.id))
  await batchCreate(TABLES.placements, rows.map(getPlacementFields))
  const refreshed = await fetchBootstrapData()
  return refreshed.placements
}

export async function createSignal(signal) {
  const payload = await airtableRequest(encodeURIComponent(TABLES.signals), {
    method: 'POST',
    body: { fields: getSignalFields(signal) },
  })

  const refreshed = await fetchBootstrapData()
  return refreshed.signals.find((item) => item.id === payload.id)
}

export async function updateSignal(signalId, signal) {
  const payload = await airtableRequest(`${encodeURIComponent(TABLES.signals)}/${signalId}`, {
    method: 'PATCH',
    body: { fields: getSignalFields(signal) },
  })

  const refreshed = await fetchBootstrapData()
  return refreshed.signals.find((item) => item.id === payload.id)
}

export async function createTask(task) {
  const payload = await airtableRequest(encodeURIComponent(TABLES.tasks), {
    method: 'POST',
    body: { fields: getTaskFields(task) },
  })

  const refreshed = await fetchBootstrapData()
  return refreshed.tasks.find((item) => item.id === payload.id)
}

export async function updateTask(taskId, task) {
  const payload = await airtableRequest(`${encodeURIComponent(TABLES.tasks)}/${taskId}`, {
    method: 'PATCH',
    body: { fields: getTaskFields(task) },
  })

  const refreshed = await fetchBootstrapData()
  return refreshed.tasks.find((item) => item.id === payload.id)
}

export async function replaceProductCatalog(products) {
  const pricingRecords = await fetchTableRecords(TABLES.pricing, { allowMissing: true })
  const productRecordIds = pricingRecords
    .filter((record) => ['Product COGS', 'Product Default SRP'].includes(record.fields?.Type))
    .map((record) => record.id)

  await batchDelete(TABLES.pricing, productRecordIds)

  const nextRecords = products.flatMap((product) => ([
    {
      'Config Key': product.name,
      Type: 'Product COGS',
      Value: Number(product.cogs) || 0,
    },
    {
      'Config Key': product.name,
      Type: 'Product Default SRP',
      Value: Number(product.defaultSrp) || 0,
    },
  ]))

  await batchCreate(TABLES.pricing, nextRecords)
  const refreshed = await fetchBootstrapData()
  return refreshed.products
}

export async function fetchStatus() {
  const configPresent = Boolean(process.env.AIRTABLE_TOKEN && process.env.AIRTABLE_BASE_ID)

  if (!configPresent) {
    return {
      connected: false,
      projectMode: 'Airtable-first',
      message: 'Missing Airtable environment variables.',
      env: {
        AIRTABLE_TOKEN: Boolean(process.env.AIRTABLE_TOKEN),
        AIRTABLE_BASE_ID: Boolean(process.env.AIRTABLE_BASE_ID),
      },
      writeProtectionEnabled: getWriteProtectionEnabled(),
      schemaAudit: null,
    }
  }

  try {
    const metadata = await fetchTableMetadata()
    await airtableRequest(encodeURIComponent(TABLES.pricing), {
      query: { maxRecords: 1 },
    })

    const { buildSchemaAudit } = await import('./schema.js')

    return {
      connected: true,
      projectMode: 'Airtable-first',
      message: 'Airtable connection is healthy.',
      env: {
        AIRTABLE_TOKEN: true,
        AIRTABLE_BASE_ID: true,
      },
      writeProtectionEnabled: getWriteProtectionEnabled(),
      schemaAudit: buildSchemaAudit(metadata),
    }
  } catch (error) {
    return {
      connected: false,
      projectMode: 'Airtable-first',
      message: error.message,
      env: {
        AIRTABLE_TOKEN: true,
        AIRTABLE_BASE_ID: true,
      },
      writeProtectionEnabled: getWriteProtectionEnabled(),
      schemaAudit: null,
    }
  }
}
