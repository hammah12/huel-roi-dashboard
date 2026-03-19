import { calculateROI, getPrimaryRouteToMarket, getProductsList } from './calculations'
import { daysFromToday } from './formatters'

const HEALTH_SORT_ORDER = {
  'At Risk': 0,
  Watch: 1,
  Healthy: 2,
}

const PRIORITY_SORT_ORDER = {
  High: 0,
  Medium: 1,
  Low: 2,
}

export const SAVED_VIEW_PRESETS = [
  {
    id: 'all',
    label: 'All accounts',
    description: 'Full portfolio',
    filters: {
      search: '',
      status: 'all',
      clientType: 'all',
      owner: 'all',
      priority: 'all',
      routeToMarket: 'all',
      health: 'all',
      attention: 'all',
      launchWindow: 'all',
    },
  },
  {
    id: 'hot_pipeline',
    label: 'Hot pipeline',
    description: 'Highest-likelihood pipeline',
    filters: {
      search: '',
      status: 'Hot Pipeline',
      clientType: 'all',
      owner: 'all',
      priority: 'all',
      routeToMarket: 'all',
      health: 'all',
      attention: 'all',
      launchWindow: 'all',
    },
  },
  {
    id: 'needs_action',
    label: 'Needs action',
    description: 'Overdue or incomplete',
    filters: {
      search: '',
      status: 'all',
      clientType: 'all',
      owner: 'all',
      priority: 'all',
      routeToMarket: 'all',
      health: 'all',
      attention: 'needs_action',
      launchWindow: 'all',
    },
  },
  {
    id: 'launches_30',
    label: 'Launches in 30d',
    description: 'Upcoming launches',
    filters: {
      search: '',
      status: 'all',
      clientType: 'all',
      owner: 'all',
      priority: 'all',
      routeToMarket: 'all',
      health: 'all',
      attention: 'all',
      launchWindow: '30',
    },
  },
  {
    id: 'at_risk_live',
    label: 'At-risk live',
    description: 'Closed accounts needing attention',
    filters: {
      search: '',
      status: 'Closed',
      clientType: 'all',
      owner: 'all',
      priority: 'all',
      routeToMarket: 'all',
      health: 'At Risk',
      attention: 'all',
      launchWindow: 'all',
    },
  },
]

export function getClientLocations(client) {
  return Math.max(...getProductsList(client).map((product) => Number(product?.numStores) || 0), 0)
}

export function getClientRouteToMarket(client) {
  return getPrimaryRouteToMarket(client)
}

export function getWinProbabilityRatio(client) {
  return Math.max(0, Math.min(100, Number(client?.winProbability) || 0)) / 100
}

export function getDataCompleteness(client) {
  const missingCritical = []

  if (client.pipelineStatus !== 'Closed') {
    if (client.winProbability === '' || client.winProbability === null || client.winProbability === undefined) {
      missingCritical.push('Win probability')
    }
    if (!client.nextAction?.trim()) {
      missingCritical.push('Next action')
    }
    if (!client.targetLaunchDate) {
      missingCritical.push('Target launch date')
    }
  }

  return {
    missingCritical,
    score: missingCritical.length === 0 ? 1 : Math.max(0, 1 - missingCritical.length / 3),
  }
}

export function getClientHealth(client) {
  const roi = calculateROI(client)
  const completeness = getDataCompleteness(client)
  const probability = Number(client.winProbability) || 0

  if (client.pipelineStatus !== 'Closed') {
    if (roi.huel.year1Ebitda < 0 || completeness.missingCritical.length > 0 || probability < 40) {
      return { label: 'At Risk', tone: 'danger' }
    }

    if (roi.huel.breakevenMonths > 12 || roi.huel.tradeRatePercent > 0.25 || probability < 70) {
      return { label: 'Watch', tone: 'warning' }
    }

    return { label: 'Healthy', tone: 'success' }
  }

  if (roi.huel.year1Ebitda < 0 || roi.huel.breakevenMonths > 18 || roi.huel.tradeRatePercent > 0.3) {
    return { label: 'At Risk', tone: 'danger' }
  }

  if (roi.huel.breakevenMonths > 12 || roi.huel.tradeRatePercent > 0.25) {
    return { label: 'Watch', tone: 'warning' }
  }

  return { label: 'Healthy', tone: 'success' }
}

export function getAttentionReason(client, today = new Date()) {
  const roi = calculateROI(client)
  const completeness = getDataCompleteness(client)
  const nextActionOffset = daysFromToday(client.nextActionDueDate, today)

  if (nextActionOffset !== null && nextActionOffset < 0) {
    return {
      kind: 'overdue_action',
      priority: 0,
      label: 'Overdue action',
      detail: client.nextAction || 'Follow up with account',
    }
  }

  if (
    client.pipelineStatus !== 'Closed' &&
    client.priorityTier === 'High' &&
    completeness.missingCritical.length > 0
  ) {
    return {
      kind: 'missing_pipeline_inputs',
      priority: 1,
      label: 'High-priority gap',
      detail: completeness.missingCritical.join(', '),
    }
  }

  if (client.pipelineStatus === 'Closed' && roi.huel.year1Ebitda < 0) {
    return {
      kind: 'negative_ebitda',
      priority: 2,
      label: 'Negative EBITDA',
      detail: 'Year 1 EBITDA is below zero',
    }
  }

  if (client.pipelineStatus === 'Closed' && roi.huel.breakevenMonths > 12) {
    return {
      kind: 'long_breakeven',
      priority: 3,
      label: 'Long breakeven',
      detail: `${roi.huel.breakevenMonths.toFixed(1)} months`,
    }
  }

  if (client.pipelineStatus === 'Closed' && roi.huel.tradeRatePercent > 0.25) {
    return {
      kind: 'high_trade_rate',
      priority: 4,
      label: 'High trade rate',
      detail: `${Math.round(roi.huel.tradeRatePercent * 100)}% of revenue`,
    }
  }

  return null
}

export function getAttentionQueue(clients) {
  return clients
    .map((client) => ({
      client,
      roi: calculateROI(client),
      attention: getAttentionReason(client),
      health: getClientHealth(client),
    }))
    .filter((item) => item.attention)
    .sort((left, right) => {
      const priorityDifference = left.attention.priority - right.attention.priority
      if (priorityDifference !== 0) {
        return priorityDifference
      }

      return HEALTH_SORT_ORDER[left.health.label] - HEALTH_SORT_ORDER[right.health.label]
    })
}

export function getWeightedPipelineMetrics(clients) {
  return clients
    .filter((client) => client.pipelineStatus !== 'Closed')
    .reduce((totals, client) => {
      const roi = calculateROI(client)
      const probability = getWinProbabilityRatio(client)
      const placements = getClientLocations(client)

      totals.rawRevenue += roi.huel.year1GrossRevenue
      totals.rawEbitda += roi.huel.year1Ebitda
      totals.weightedRevenue += roi.huel.year1GrossRevenue * probability
      totals.weightedEbitda += roi.huel.year1Ebitda * probability
      totals.rawPlacements += placements
      totals.weightedPlacements += placements * probability
      totals.count += 1

      return totals
    }, {
      rawRevenue: 0,
      rawEbitda: 0,
      weightedRevenue: 0,
      weightedEbitda: 0,
      rawPlacements: 0,
      weightedPlacements: 0,
      count: 0,
    })
}

export function getLaunchesInWindow(clients, days = 30, today = new Date()) {
  return clients.filter((client) => {
    const offset = daysFromToday(client.targetLaunchDate, today)
    return offset !== null && offset >= 0 && offset <= days
  })
}

export function filterClients(clients, filters) {
  const query = filters.search.trim().toLowerCase()

  return clients.filter((client) => {
    const health = getClientHealth(client).label
    const routeToMarket = getClientRouteToMarket(client)
    const attention = getAttentionReason(client)
    const launchOffset = daysFromToday(client.targetLaunchDate)
    const matchesSearch = !query || [
      client.retailerName,
      client.accountOwner,
      client.notes,
      client.nextAction,
      ...getProductsList(client).map((product) => product.productName),
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query))

    const matchesStatus = filters.status === 'all' || client.pipelineStatus === filters.status
    const matchesClientType = filters.clientType === 'all' || client.clientType === filters.clientType
    const matchesOwner = filters.owner === 'all' || client.accountOwner === filters.owner
    const matchesPriority = filters.priority === 'all' || client.priorityTier === filters.priority
    const matchesRouteToMarket = filters.routeToMarket === 'all' || routeToMarket === filters.routeToMarket
    const matchesHealth = filters.health === 'all' || health === filters.health
    const matchesAttention = filters.attention === 'all' || Boolean(attention)
    const matchesLaunchWindow = filters.launchWindow === 'all' || (
      launchOffset !== null && launchOffset >= 0 && launchOffset <= Number(filters.launchWindow)
    )

    return (
      matchesSearch &&
      matchesStatus &&
      matchesClientType &&
      matchesOwner &&
      matchesPriority &&
      matchesRouteToMarket &&
      matchesHealth &&
      matchesAttention &&
      matchesLaunchWindow
    )
  })
}

export function getOpportunityRanking(clients) {
  return clients
    .filter((client) => client.pipelineStatus !== 'Closed')
    .map((client) => {
      const roi = calculateROI(client)
      const probability = getWinProbabilityRatio(client)

      return {
        client,
        roi,
        weightedRevenue: roi.huel.year1GrossRevenue * probability,
        weightedEbitda: roi.huel.year1Ebitda * probability,
        health: getClientHealth(client),
        completeness: getDataCompleteness(client),
      }
    })
    .sort((left, right) => {
      if (right.weightedEbitda !== left.weightedEbitda) {
        return right.weightedEbitda - left.weightedEbitda
      }

      const priorityDifference =
        PRIORITY_SORT_ORDER[left.client.priorityTier] - PRIORITY_SORT_ORDER[right.client.priorityTier]
      if (priorityDifference !== 0) {
        return priorityDifference
      }

      return right.weightedRevenue - left.weightedRevenue
    })
}

export function getFilterOptions(clients) {
  return {
    owners: Array.from(new Set(clients.map((client) => client.accountOwner).filter(Boolean))).sort(),
    routeToMarkets: Array.from(new Set(clients.map((client) => getClientRouteToMarket(client)).filter(Boolean))).sort(),
  }
}
