import AnalyticsCharts from './AnalyticsCharts'
import { calculateROI } from '../utils/calculations'
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRelativeDayLabel,
  formatShortDate,
} from '../utils/formatters'
import {
  getAttentionQueue,
  getClientHealth,
  getClientLocations,
  getLaunchesInWindow,
  getOpportunityRanking,
  getWeightedPipelineMetrics,
} from '../utils/portfolio'

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

function RetailerCard({ record, onEdit, onDuplicate, onRemove }) {
  const { client, index } = record
  const roi = calculateROI(client)
  const health = getClientHealth(client)
  const locations = getClientLocations(client)
  const productNames = (client.products || []).map((product) => product.productName).join(' · ')

  return (
    <article className="retailer-card glass-card">
      <div className="retailer-card__header">
        <div>
          <div className="retailer-card__chips">
            <TonePill label={health.label} tone={health.tone} />
            <TonePill label={client.priorityTier} tone={client.priorityTier === 'High' ? 'danger' : 'neutral'} />
            {client.accountOwner && <TonePill label={client.accountOwner} tone="info" />}
          </div>
          <h3>{client.retailerName}</h3>
          <p className="retailer-card__meta">{client.clientType} · {locations} locations</p>
          <p className="retailer-card__products">{productNames || 'No products configured'}</p>
        </div>

        <div className="retailer-card__actions">
          <button type="button" className="btn btn-secondary" onClick={() => onEdit(index)}>Edit</button>
          <button type="button" className="btn btn-secondary" onClick={() => onDuplicate(index)}>Copy</button>
          <button type="button" className="btn btn-secondary btn-danger" onClick={() => onRemove(index)}>Delete</button>
        </div>
      </div>

      <div className="retailer-card__metrics">
        <div>
          <span>Year 1 revenue</span>
          <strong>{formatCurrency(roi.huel.year1GrossRevenue)}</strong>
        </div>
        <div>
          <span>EBITDA</span>
          <strong className={roi.huel.year1Ebitda >= 0 ? 'text-success' : 'text-danger'}>
            {formatCurrency(roi.huel.year1Ebitda)}
          </strong>
        </div>
        <div>
          <span>Trade rate</span>
          <strong>{formatPercent(roi.huel.tradeRatePercent)}</strong>
        </div>
        <div>
          <span>Breakeven</span>
          <strong>{roi.huel.breakevenMonths > 0 ? `${roi.huel.breakevenMonths.toFixed(1)} mo` : 'Immediate'}</strong>
        </div>
      </div>

      <div className="retailer-card__footer">
        <div>
          <p className="retailer-card__label">Next action</p>
          <strong>{client.nextAction || 'No next action captured'}</strong>
        </div>
        <div>
          <p className="retailer-card__label">Due</p>
          <strong>{client.nextActionDueDate ? formatRelativeDayLabel(client.nextActionDueDate) : 'No due date'}</strong>
        </div>
        <div>
          <p className="retailer-card__label">Launch date</p>
          <strong>{client.targetLaunchDate ? formatShortDate(client.targetLaunchDate) : 'Unscheduled'}</strong>
        </div>
      </div>
    </article>
  )
}

export default function DashboardOverview({
  clientRecords,
  totalCount,
  hasActiveFilters,
  onEdit,
  onDuplicate,
  onRemove,
}) {
  const clients = clientRecords.map((record) => record.client)
  const liveRecords = clientRecords.filter((record) => record.client.pipelineStatus === 'Closed')
  const liveClients = liveRecords.map((record) => record.client)
  const pipelineClients = clients.filter((client) => client.pipelineStatus !== 'Closed')

  const liveRevenue = liveClients.reduce((sum, client) => sum + calculateROI(client).huel.year1GrossRevenue, 0)
  const liveEbitda = liveClients.reduce((sum, client) => sum + calculateROI(client).huel.year1Ebitda, 0)
  const weightedPipeline = getWeightedPipelineMetrics(clients)
  const launchesNext30 = getLaunchesInWindow(clients).length
  const attentionQueue = getAttentionQueue(clients).slice(0, 6)
  const opportunityRanking = getOpportunityRanking(clients).slice(0, 8)

  const liveFootprint = liveClients.reduce((sum, client) => sum + getClientLocations(client), 0)
  const liveUnits = liveClients.reduce((sum, client) => sum + calculateROI(client).huel.annualUnits / 12, 0)
  const healthCounts = liveClients.reduce((counts, client) => {
    const health = getClientHealth(client).label
    counts[health] = (counts[health] || 0) + 1
    return counts
  }, {})

  const unitMix = Array.from(new Set(liveClients.flatMap((client) => (client.products || []).map((product) => product.productName))))
    .map((productName) => ({
      productName,
      monthlyUnits: liveClients.reduce((sum, client) => (
        sum + (client.products || [])
          .filter((product) => product.productName === productName)
          .reduce((productSum, product) => productSum + ((Number(product.numStores) || 0) * (Number(product.baseVelocity) || 0)), 0)
      ), 0),
    }))
    .sort((left, right) => right.monthlyUnits - left.monthlyUnits)

  const summaryCards = [
    {
      label: 'Live Revenue',
      value: formatCompactCurrency(liveRevenue),
      sublabel: `${liveClients.length} live accounts`,
      tone: 'info',
    },
    {
      label: 'Live EBITDA',
      value: formatCompactCurrency(liveEbitda),
      sublabel: `${formatPercent(liveRevenue > 0 ? liveEbitda / liveRevenue : 0)} margin`,
      tone: liveEbitda >= 0 ? 'success' : 'danger',
    },
    {
      label: 'Weighted Pipeline Revenue',
      value: formatCompactCurrency(weightedPipeline.weightedRevenue),
      sublabel: `${pipelineClients.length} weighted deals`,
      tone: 'info',
    },
    {
      label: 'Weighted Pipeline EBITDA',
      value: formatCompactCurrency(weightedPipeline.weightedEbitda),
      sublabel: `${formatCompactCurrency(weightedPipeline.rawEbitda)} raw upside`,
      tone: weightedPipeline.weightedEbitda >= 0 ? 'success' : 'danger',
    },
    {
      label: 'Deals Requiring Action',
      value: formatNumber(attentionQueue.length),
      sublabel: attentionQueue.length ? 'Overdue, incomplete, or under water' : 'No urgent actions',
      tone: attentionQueue.length ? 'danger' : 'success',
    },
    {
      label: 'Launches In Next 30 Days',
      value: formatNumber(launchesNext30),
      sublabel: launchesNext30 ? 'Upcoming launches are on the clock' : 'No launches due soon',
      tone: launchesNext30 ? 'warning' : 'neutral',
    },
  ]

  const sortedLiveRecords = [...liveRecords].sort((left, right) => (
    calculateROI(right.client).huel.year1GrossRevenue - calculateROI(left.client).huel.year1GrossRevenue
  ))

  return (
    <div className="view-stack">
      <header className="view-header">
        <div>
          <p className="eyebrow">Portfolio command centre</p>
          <h1>Commercial Dashboard</h1>
          <p className="view-header__copy">
            {clients.length} visible accounts out of {totalCount}.{' '}
            {hasActiveFilters ? 'Metrics below are based on the filtered portfolio.' : 'Metrics below reflect the full portfolio.'}
          </p>
        </div>
      </header>

      <section className="summary-grid summary-grid--six">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <section className="dashboard-columns">
        <article className="glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Action queue</p>
              <h2>What needs attention this week</h2>
            </div>
            <TonePill label={`${attentionQueue.length} items`} tone={attentionQueue.length ? 'danger' : 'success'} />
          </div>

          {attentionQueue.length === 0 ? (
            <p className="empty-copy">No overdue actions or unhealthy live accounts in the current view.</p>
          ) : (
            <div className="queue-list">
              {attentionQueue.map(({ client, attention, health, roi }) => (
                <div key={`${client.retailerName}-${attention.kind}`} className="queue-item">
                  <div>
                    <div className="queue-item__title-row">
                      <strong>{client.retailerName}</strong>
                      <TonePill label={health.label} tone={health.tone} />
                    </div>
                    <p>{attention.label} · {attention.detail}</p>
                    <small>
                      {client.accountOwner || 'Unassigned'} · {client.priorityTier} priority · EBITDA {formatCompactCurrency(roi.huel.year1Ebitda)}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onEdit(clientRecords.find((record) => record.client === client)?.index)}
                  >
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
              <p className="eyebrow">Pipeline ranking</p>
              <h2>Where weighted upside is strongest</h2>
            </div>
            <TonePill label={`${opportunityRanking.length} deals`} tone="info" />
          </div>

          {opportunityRanking.length === 0 ? (
            <p className="empty-copy">No pipeline deals in the current view.</p>
          ) : (
            <div className="table-shell">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Owner</th>
                    <th>Priority</th>
                    <th>Win %</th>
                    <th>Weighted EBITDA</th>
                    <th>Launch</th>
                    <th>Forecast</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunityRanking.map(({ client, weightedEbitda, health, completeness }) => (
                    <tr key={client.retailerName}>
                      <td>
                        <strong>{client.retailerName}</strong>
                        <small>{health.label}{completeness.missingCritical.length ? ` · Missing ${completeness.missingCritical.length}` : ''}</small>
                      </td>
                      <td>{client.accountOwner || 'Unassigned'}</td>
                      <td>{client.priorityTier}</td>
                      <td>{client.winProbability || '0'}%</td>
                      <td className={weightedEbitda >= 0 ? 'text-success' : 'text-danger'}>
                        {formatCurrency(weightedEbitda)}
                      </td>
                      <td>{client.targetLaunchDate ? formatShortDate(client.targetLaunchDate) : 'Unscheduled'}</td>
                      <td>{client.forecastQuarter || 'Unassigned'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-columns">
        <article className="glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Live footprint</p>
              <h2>Commercial base already in market</h2>
            </div>
          </div>

          <div className="split-metrics">
            <div>
              <span>Total live locations</span>
              <strong>{formatNumber(liveFootprint)}</strong>
            </div>
            <div>
              <span>Monthly units</span>
              <strong>{formatNumber(liveUnits)}</strong>
            </div>
            <div>
              <span>Healthy live accounts</span>
              <strong>{formatNumber(healthCounts.Healthy || 0)}</strong>
            </div>
            <div>
              <span>Watch + at risk</span>
              <strong>{formatNumber((healthCounts.Watch || 0) + (healthCounts['At Risk'] || 0))}</strong>
            </div>
          </div>
        </article>

        <article className="glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SKU mix</p>
              <h2>Where monthly volume is concentrated</h2>
            </div>
          </div>

          {unitMix.length === 0 ? (
            <p className="empty-copy">No live unit mix to show yet.</p>
          ) : (
            <div className="mix-list">
              {unitMix.map((item) => (
                <div key={item.productName} className="mix-list__item">
                  <span>{item.productName}</span>
                  <strong>{formatNumber(item.monthlyUnits)} / month</strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <AnalyticsCharts clients={clients} />

      <section className="view-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Retailer breakdown</p>
            <h2>Live account cards with workflow context</h2>
          </div>
          <TonePill label={`${liveRecords.length} live`} tone="success" />
        </div>

        {sortedLiveRecords.length === 0 ? (
          <div className="glass-card empty-state">
            <h3>No live accounts in the current view</h3>
            <p>Add or convert a retailer to see the live portfolio breakdown.</p>
          </div>
        ) : (
          <div className="retailer-grid">
            {sortedLiveRecords.map((record) => (
              <RetailerCard
                key={`${record.index}-${record.client.retailerName}`}
                record={record}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
