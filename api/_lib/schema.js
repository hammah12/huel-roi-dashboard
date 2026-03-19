const TABLE_FIELD_TYPES = {
  Retailers: {
    Name: ['singleLineText'],
    'Client Type': ['singleSelect', 'singleLineText'],
    'Pipeline Status': ['singleSelect', 'singleLineText'],
    'Route to Market': ['singleSelect', 'singleLineText'],
    'Account Owner': ['singleLineText'],
    'Priority Tier': ['singleSelect', 'singleLineText'],
    'Win Probability': ['number'],
    'Forecast Quarter': ['singleSelect', 'singleLineText'],
    Rebate: ['number', 'currency'],
    'Deal Type': ['singleSelect', 'singleLineText'],
    'Num Machines': ['number'],
    'Machine Cost Per Unit': ['number', 'currency'],
    'Revenue Share Pct': ['number'],
    'Revenue Share Minimum Monthly': ['number', 'currency'],
    'Target Launch Date': ['date', 'singleLineText'],
    'Next Action': ['multilineText', 'singleLineText'],
    'Next Action Due Date': ['date', 'singleLineText'],
    Notes: ['multilineText', 'singleLineText'],
    'Created At': ['dateTime', 'singleLineText'],
    'Updated At': ['dateTime', 'singleLineText'],
    'Synced At': ['date'],
  },
  Products: {
    Retailer: ['multipleRecordLinks'],
    'Product Name': ['singleSelect', 'singleLineText'],
    'Route to Market': ['singleSelect', 'singleLineText'],
    'Num Stores': ['number'],
    'Base Velocity': ['number'],
    SRP: ['currency', 'number'],
    'Slotting Fixed': ['currency', 'number'],
    'Slotting Free Fill Qty': ['number'],
    TPRs: ['currency', 'number'],
    Marketing: ['currency', 'number'],
  },
  'Pricing Config': {
    'Config Key': ['singleLineText'],
    Type: ['singleSelect', 'singleLineText'],
    Value: ['number', 'currency'],
  },
  'Placements Forecast': {
    Name: ['singleLineText'],
    Type: ['singleSelect', 'singleLineText'],
    Q1: ['number'],
    Q2: ['number'],
    Q3: ['number'],
    Q4: ['number'],
  },
  Signals: {
    Name: ['singleLineText'],
    Retailer: ['multipleRecordLinks'],
    Account: ['singleLineText'],
    Type: ['singleLineText', 'singleSelect'],
    Status: ['singleSelect', 'singleLineText'],
    Priority: ['singleSelect', 'singleLineText'],
    Source: ['singleLineText', 'singleSelect'],
    'Due Date': ['date', 'singleLineText'],
    'Why It Matters': ['multilineText', 'singleLineText'],
    Owner: ['singleLineText'],
    'Created At': ['dateTime', 'singleLineText'],
    'Updated At': ['dateTime', 'singleLineText'],
  },
  Tasks: {
    Name: ['singleLineText'],
    Retailer: ['multipleRecordLinks'],
    Account: ['singleLineText'],
    Signal: ['singleLineText'],
    Status: ['singleSelect', 'singleLineText'],
    Priority: ['singleSelect', 'singleLineText'],
    Owner: ['singleLineText'],
    'Due Date': ['date', 'singleLineText'],
    Notes: ['multilineText', 'singleLineText'],
    'Created At': ['dateTime', 'singleLineText'],
    'Updated At': ['dateTime', 'singleLineText'],
  },
}

function buildTableAudit(table, expectedFields) {
  if (!table) {
    return {
      exists: false,
      missingFields: Object.keys(expectedFields),
      typeWarnings: [],
    }
  }

  const fieldsByName = new Map((table.fields || []).map((field) => [field.name, field]))
  const missingFields = []
  const typeWarnings = []

  Object.entries(expectedFields).forEach(([fieldName, allowedTypes]) => {
    const field = fieldsByName.get(fieldName)

    if (!field) {
      missingFields.push(fieldName)
      return
    }

    if (!allowedTypes.includes(field.type)) {
      typeWarnings.push({
        field: fieldName,
        currentType: field.type,
        recommendedTypes: allowedTypes,
      })
    }
  })

  return {
    exists: true,
    missingFields,
    typeWarnings,
  }
}

export function buildSchemaAudit(metadata = { tables: [] }) {
  const tablesByName = new Map((metadata.tables || []).map((table) => [table.name, table]))
  const tables = Object.fromEntries(
    Object.entries(TABLE_FIELD_TYPES).map(([tableName, expectedFields]) => [
      tableName,
      buildTableAudit(tablesByName.get(tableName), expectedFields),
    ]),
  )

  const totals = Object.values(tables).reduce((summary, table) => {
    summary.missingFields += table.missingFields.length
    summary.typeWarnings += table.typeWarnings.length
    if (!table.exists) {
      summary.missingTables += 1
    }
    return summary
  }, {
    missingTables: 0,
    missingFields: 0,
    typeWarnings: 0,
  })

  return {
    healthy: totals.missingTables === 0 && totals.missingFields === 0 && totals.typeWarnings === 0,
    totals,
    tables,
  }
}
