import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { calculateROI } from '../utils/calculations'
import {
  createEmptyForecastRow,
  loadForecastRows,
  QUARTERS,
  saveForecastRows,
} from '../utils/forecastStore'
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRelativeDayLabel,
  formatShortDate,
} from '../utils/formatters'
import {
  getClientHealth,
  getClientLocations,
  getDataCompleteness,
  getWinProbabilityRatio,
} from '../utils/portfolio'

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
  clientType: 'all',
  owner: 'all',
  priority: 'all',
  routeToMarket: 'all',
  health: 'all',
}

const STATUS_TO_QUARTER = {
  'Hot Pipeline': 'Q2',
  'High Interest': 'Q3',
  Prospect: 'Q4',
}

const QUARTER_LABELS = {
  Q1: 'Jan-Mar',
  Q2: 'Apr-Jun',
  Q3: 'Jul-Sep',
  Q4: 'Oct-Dec',
}

const TYPE_COLORS = {
  Vending: '#0056B3',
  Micromarket: '#8C8C8C',
  'Airport Concessions': '#D95C7A',
  'Food Service': '#6FBF7F',
}

const PRIORITY_ORDER = {
  High: 0,
  Medium: 1,
  Low: 2,
}

function TonePill({ label, tone = 'neutral' }) {
  return <span className={`tone-pill tone-pill--${tone}`}>{label}</span>
}

function SummaryCard({ label, value, sublabel, tone = 'neutral' }) {
  return (
    <article className="summary-card">
      <div className={`summary-card__accent summary-card__accent--${tone}`} />
      <p className="summary-card__label">{label}</p>
      <h3>{value}</h3>
      <p className="summary-card__sublabel">{sublabel}</p>
    </article>
  )
}

function TooltipCard({ active, payload, label, valueFormatter = formatNumber }) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((entry) => (
        <p key={entry.name}>
          <span style={{ color: entry.color }}>●</span> {entry.name}: {valueFormatter(entry.value)}
        </p>
      ))}
    </div>
  )
}

function getAssignedQuarter(client) {
  return client.forecastQuarter || STATUS_TO_QUARTER[client.pipelineStatus] || 'Q4'
}

function getPlacementCountLabel(value) {
  const numericValue = Number(value) || 0
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(numericValue)
}

function getLinkedRecord(row, clientRecords) {
  const normalizedPartner = row.partner?.trim().toLowerCase()

  if (!normalizedPartner) {
    return null
  }

  return clientRecords.find(({ client }) => client.retailerName?.trim().toLowerCase() === normalizedPartner) || null
}

function rowTotal(row) {
  return QUARTERS.reduce((sum, quarter) => sum + (Number(row[quarter]) || 0), 0)
}

function matchesManualRow(row, filters, clientRecords) {
  const linkedRecord = getLinkedRecord(row, clientRecords)
  const query = filters.search.trim().toLowerCase()
  const matchesSearch =
    !query ||
    Boolean(linkedRecord) ||
    row.partner?.toLowerCase().includes(query) ||
    row.type?.toLowerCase().includes(query)
  const matchesType = filters.clientType === 'all' || row.type === filters.clientType
  const matchesStatus = filters.status === 'all' || filters.status === 'Closed'

  if (!matchesSearch || !matchesType || !matchesStatus) {
    return false
  }

  if (linkedRecord) {
    return true
  }

  return (
    filters.owner === 'all' &&
    filters.priority === 'all' &&
    filters.routeToMarket === 'all' &&
    filters.health === 'all'
  )
}

export default function PlacementsForecast({
  clientRecords,
  totalCount,
  filters = DEFAULT_FILTERS,
  hasActiveFilters,
  onConvert,
  onEdit,
  onUpdateClient,
}) {
  const [manualRows, setManualRows] = useState(() => loadForecastRows())
  const [isEditingPlanner, setIsEditingPlanner] = useState(false)

  const persistRows = (nextRows) => {
    setManualRows(saveForecastRows(nextRows))
  }

  const addManualRow = () => {
    persistRows([...manualRows, createEmptyForecastRow()])
  }

  const updateManualRow = (id, field, value) => {
    persistRows(manualRows.map((row) => (
      row.id === id ? { ...row, [field]: QUARTERS.includes(field) ? Number(value) || 0 : value } : row
    )))
  }

  const removeManualRow = (id) => {
    persistRows(manualRows.filter((row) => row.id !== id))
  }

  const clients = clientRecords.map((record) => record.client)
  const pipelineRows = clientRecords
    .filter(({ client }) => client.pipelineStatus !== 'Closed')
    .map((record) => {
      const roi = calculateROI(record.client)
      const probability = getWinProbabilityRatio(record.client)
      const health = getClientHealth(record.client)
      const completeness = getDataCompleteness(record.client)

      return {
        ...record,
        roi,
        health,
        completeness,
        quarter: getAssignedQuarter(record.client),
        locations: getClientLocations(record.client),
        weightedPlacements: getClientLocations(record.client) * probability,
        weightedRevenue: roi.huel.year1GrossRevenue * probability,
        weightedEbitda: roi.huel.year1Ebitda * probability,
        probability,
      }
    })
    .sort((left, right) => {
      if (right.weightedEbitda !== left.weightedEbitda) {
        return right.weightedEbitda - left.weightedEbitda
      }

      return PRIORITY_ORDER[left.client.priorityTier] - PRIORITY_ORDER[right.client.priorityTier]
    })

  const activeManualRows = manualRows.filter((row) => matchesManualRow(row, filters, clientRecords))
  const plannerRows = isEditingPlanner ? manualRows : activeManualRows
  const missingInputRows = pipelineRows.filter(({ completeness }) => completeness.missingCritical.length > 0)

  const confirmedPlacements = activeManualRows.reduce((sum, row) => sum + rowTotal(row), 0)
  const weightedPipelinePlacements = pipelineRows.reduce((sum, row) => sum + row.weightedPlacements, 0)
  const weightedPipelineRevenue = pipelineRows.reduce((sum, row) => sum + row.weightedRevenue, 0)
  const weightedPipelineEbitda = pipelineRows.reduce((sum, row) => sum + row.weightedEbitda, 0)
  const rawPipelinePlacements = pipelineRows.reduce((sum, row) => sum + row.locations, 0)
  const rawPipelineRevenue = pipelineRows.reduce((sum, row) => sum + row.roi.huel.year1GrossRevenue, 0)

  const placementChartData = QUARTERS.map((quarter) => ({
    quarter,
    label: `${quarter} (${QUARTER_LABELS[quarter]})`,
    Raw: pipelineRows
      .filter((row) => row.quarter === quarter)
      .reduce((sum, row) => sum + row.locations, 0),
    Weighted: pipelineRows
      .filter((row) => row.quarter === quarter)
      .reduce((sum, row) => sum + row.weightedPlacements, 0),
  }))

  const revenueChartData = QUARTERS.map((quarter) => ({
    quarter,
    label: `${quarter} (${QUARTER_LABELS[quarter]})`,
    'Raw Revenue': pipelineRows
      .filter((row) => row.quarter === quarter)
      .reduce((sum, row) => sum + row.roi.huel.year1GrossRevenue, 0),
    'Weighted Revenue': pipelineRows
      .filter((row) => row.quarter === quarter)
      .reduce((sum, row) => sum + row.weightedRevenue, 0),
  }))

  const manualChartData = QUARTERS.map((quarter) => ({
    quarter,
    label: `${quarter} (${QUARTER_LABELS[quarter]})`,
    Confirmed: activeManualRows.reduce((sum, row) => sum + (Number(row[quarter]) || 0), 0),
  }))

  const summaryCards = [
    {
      label: 'Confirmed Placements',
      value: formatNumber(confirmedPlacements),
      sublabel: `${activeManualRows.length} confirmed planner rows`,
      tone: confirmedPlacements > 0 ? 'success' : 'neutral',
    },
    {
      label: 'Weighted Pipeline Placements',
      value: getPlacementCountLabel(weightedPipelinePlacements),
      sublabel: `${formatNumber(rawPipelinePlacements)} raw pipeline placements`,
      tone: pipelineRows.length ? 'info' : 'neutral',
    },
    {
      label: 'Weighted Pipeline Revenue',
      value: formatCompactCurrency(weightedPipelineRevenue),
      sublabel: `${formatCompactCurrency(rawPipelineRevenue)} raw revenue upside`,
      tone: pipelineRows.length ? 'info' : 'neutral',
    },
    {
      label: 'Weighted Pipeline EBITDA',
      value: formatCompactCurrency(weightedPipelineEbitda),
      sublabel: `${pipelineRows.length} pipeline deals in view`,
      tone: weightedPipelineEbitda >= 0 ? 'success' : 'danger',
    },
  ]

  return (
    <div className="view-stack">
      <header className="view-header">
        <div>
          <p className="eyebrow">Pipeline timing</p>
          <h1>Placements Forecast</h1>
          <p className="view-header__copy">
            {clients.length} visible accounts out of {totalCount}.{' '}
            {hasActiveFilters
              ? 'Raw and weighted views below reflect only the filtered portfolio.'
              : 'Use this page to compare confirmed placements against weighted pipeline timing.'}
          </p>
        </div>
      </header>

      <section className="summary-grid summary-grid--four">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <section className="chart-grid">
        <article className="glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Quarterly placements</p>
              <h2>Raw versus weighted pipeline placement timing</h2>
            </div>
          </div>

          {pipelineRows.length === 0 ? (
            <p className="empty-copy">No pipeline deals are visible in the current filter set.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={placementChartData}>
                <CartesianGrid stroke="#ece7df" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fill: '#7a7a7a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7a7a7a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipCard valueFormatter={getPlacementCountLabel} />} />
                <Bar dataKey="Raw" fill="#8C8C8C" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Weighted" fill="#0056B3" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          <p className="chart-note">
            Weighted placements multiply each account footprint by its current win probability.
          </p>
        </article>

        <article className="glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Quarterly revenue</p>
              <h2>Revenue exposure by forecast quarter</h2>
            </div>
          </div>

          {pipelineRows.length === 0 ? (
            <p className="empty-copy">No pipeline revenue is visible in the current filter set.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueChartData}>
                <CartesianGrid stroke="#ece7df" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fill: '#7a7a7a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompactCurrency} tick={{ fill: '#7a7a7a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipCard valueFormatter={formatCurrency} />} />
                <Bar dataKey="Raw Revenue" fill="#D95C7A" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Weighted Revenue" fill="#0056B3" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          <p className="chart-note">
            Forecast quarter remains the authoritative placement signal. Target launch date supports execution tracking.
          </p>
        </article>
      </section>

      <section className="dashboard-columns">
        <article className="glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Missing inputs</p>
              <h2>Pipeline records that still need commercial detail</h2>
            </div>
            <TonePill label={`${missingInputRows.length} flagged`} tone={missingInputRows.length ? 'warning' : 'success'} />
          </div>

          {missingInputRows.length === 0 ? (
            <p className="empty-copy">All visible pipeline records have the required workflow inputs.</p>
          ) : (
            <div className="warning-list">
              {missingInputRows.map(({ client, completeness, health, index }) => (
                <div key={`${client.retailerName}-warning`} className="warning-item">
                  <div>
                    <div className="queue-item__title-row">
                      <strong>{client.retailerName}</strong>
                      <TonePill label={health.label} tone={health.tone} />
                    </div>
                    <p>{completeness.missingCritical.join(', ')}</p>
                    <small>
                      {client.accountOwner || 'Unassigned'} · {client.priorityTier} priority · due {formatRelativeDayLabel(client.nextActionDueDate)}
                    </small>
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={() => onEdit?.(index)}>
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Confirmed planner</p>
              <h2>Manual confirmed placements by quarter</h2>
            </div>
            <TonePill label={`${activeManualRows.length} rows`} tone={activeManualRows.length ? 'info' : 'neutral'} />
          </div>

          {activeManualRows.length === 0 ? (
            <p className="empty-copy">No confirmed planner rows match the current filter set.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={manualChartData}>
                <CartesianGrid stroke="#ece7df" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fill: '#7a7a7a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7a7a7a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipCard valueFormatter={formatNumber} />} />
                <Bar dataKey="Confirmed" fill="#6FBF7F" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          <p className="chart-note">
            Use the confirmed planner for accounts already committed outside the pipeline list.
          </p>
        </article>
      </section>

      <section className="view-section">
        <article className="glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Pipeline execution</p>
              <h2>Opportunity ranking with execution detail</h2>
            </div>
            <TonePill label={`${pipelineRows.length} deals`} tone={pipelineRows.length ? 'info' : 'neutral'} />
          </div>

          {pipelineRows.length === 0 ? (
            <p className="empty-copy">No pipeline deals match the current filters.</p>
          ) : (
            <div className="table-shell">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Owner</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Win %</th>
                    <th>Raw EBITDA</th>
                    <th>Weighted EBITDA</th>
                    <th>Launch</th>
                    <th>Forecast</th>
                    <th>Missing</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pipelineRows.map((row) => (
                    <tr key={row.client.retailerName}>
                      <td>
                        <strong>{row.client.retailerName}</strong>
                        <small>
                          {row.client.clientType} · {formatNumber(row.locations)} locations · {row.health.label}
                        </small>
                      </td>
                      <td>{row.client.accountOwner || 'Unassigned'}</td>
                      <td>
                        <TonePill
                          label={row.client.priorityTier}
                          tone={row.client.priorityTier === 'High' ? 'danger' : row.client.priorityTier === 'Low' ? 'neutral' : 'warning'}
                        />
                      </td>
                      <td>{row.client.pipelineStatus}</td>
                      <td>{formatPercent(row.probability, 0)}</td>
                      <td className={row.roi.huel.year1Ebitda >= 0 ? 'text-success' : 'text-danger'}>
                        {formatCurrency(row.roi.huel.year1Ebitda)}
                      </td>
                      <td className={row.weightedEbitda >= 0 ? 'text-success' : 'text-danger'}>
                        {formatCurrency(row.weightedEbitda)}
                      </td>
                      <td>{formatShortDate(row.client.targetLaunchDate)}</td>
                      <td>
                        <div className="quarter-picker">
                          {QUARTERS.map((quarter) => (
                            <button
                              key={`${row.client.retailerName}-${quarter}`}
                              type="button"
                              className={`quarter-picker__button ${row.quarter === quarter ? 'is-active' : ''}`}
                              onClick={() => onUpdateClient?.(row.index, { forecastQuarter: quarter })}
                            >
                              {quarter}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td>
                        {row.completeness.missingCritical.length === 0 ? (
                          <span className="table-tag">Ready</span>
                        ) : (
                          row.completeness.missingCritical.map((field) => (
                            <span key={`${row.client.retailerName}-${field}`} className="table-tag">
                              {field}
                            </span>
                          ))
                        )}
                        <div className="table-note">
                          {row.client.nextAction || 'No next action'} · {formatRelativeDayLabel(row.client.nextActionDueDate)}
                        </div>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => onEdit?.(row.index)}>
                            Edit
                          </button>
                          <button type="button" className="btn btn-primary" onClick={() => onConvert?.(row.index)}>
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="view-section">
        <article className="glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Confirmed manual planner</p>
              <h2>Maintain quarter-level committed placements</h2>
              <p className="view-header__copy">
                {hasActiveFilters && !isEditingPlanner
                  ? 'Planner totals and charts honor the active filters. Turn on edit mode to manage the full confirmed schedule.'
                  : 'Use this grid for confirmed placements that should not sit in pipeline status.'}
              </p>
            </div>

            <div className="planner-toolbar">
              {isEditingPlanner && (
                <button type="button" className="btn btn-secondary" onClick={addManualRow}>
                  Add row
                </button>
              )}
              <button
                type="button"
                className={`btn ${isEditingPlanner ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsEditingPlanner((currentValue) => !currentValue)}
              >
                {isEditingPlanner ? 'Done editing' : 'Edit planner'}
              </button>
            </div>
          </div>

          {plannerRows.length === 0 ? (
            <p className="empty-copy">No confirmed planner rows are available yet.</p>
          ) : (
            <div className="table-shell">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th>Type</th>
                    {QUARTERS.map((quarter) => (
                      <th key={`planner-${quarter}`}>{quarter}</th>
                    ))}
                    <th>Total</th>
                    {isEditingPlanner && <th />}
                  </tr>
                </thead>
                <tbody>
                  {plannerRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {isEditingPlanner ? (
                          <input
                            className="form-input"
                            type="text"
                            value={row.partner}
                            onChange={(event) => updateManualRow(row.id, 'partner', event.target.value)}
                            placeholder="Retail partner"
                          />
                        ) : (
                          <>
                            <strong>{row.partner || 'Unnamed partner'}</strong>
                            <small>{getLinkedRecord(row, clientRecords) ? 'Linked to portfolio account' : 'Manual planner row'}</small>
                          </>
                        )}
                      </td>
                      <td>
                        {isEditingPlanner ? (
                          <select
                            className="form-select"
                            value={row.type}
                            onChange={(event) => updateManualRow(row.id, 'type', event.target.value)}
                          >
                            {Object.keys(TYPE_COLORS).map((type) => (
                              <option key={`${row.id}-${type}`} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <TonePill label={row.type} tone="info" />
                        )}
                      </td>
                      {QUARTERS.map((quarter) => (
                        <td key={`${row.id}-${quarter}`}>
                          {isEditingPlanner ? (
                            <input
                              className="form-input"
                              type="number"
                              min="0"
                              value={row[quarter]}
                              onChange={(event) => updateManualRow(row.id, quarter, event.target.value)}
                            />
                          ) : (
                            <strong>{formatNumber(row[quarter])}</strong>
                          )}
                        </td>
                      ))}
                      <td>
                        <strong>{formatNumber(rowTotal(row))}</strong>
                      </td>
                      {isEditingPlanner && (
                        <td>
                          <button type="button" className="btn btn-secondary btn-danger" onClick={() => removeManualRow(row.id)}>
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
