import { useState } from 'react'

import { calculateROI } from '../utils/calculations'
import { ACTIVITY_TYPES, createEmptyActivity } from '../utils/clientStore'
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

function TonePill({ label, tone = 'neutral' }) {
  return <span className={`tone-pill tone-pill--${tone}`}>{label}</span>
}

function DetailMetric({ label, value, tone = '' }) {
  return (
    <div className="detail-metric">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  )
}

function getActivityTypeTone(type) {
  switch (type) {
    case 'Call': return 'info'
    case 'Email': return 'info'
    case 'Meeting': return 'success'
    case 'Sample sent': return 'success'
    case 'Pricing sent': return 'warning'
    case 'Contract': return 'success'
    default: return 'neutral'
  }
}

function formatActivityTimestamp(timestamp) {
  if (!timestamp) {
    return ''
  }

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) {
    return 'Just now'
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AccountDetailPanel({
  record,
  onClose,
  onEdit,
  onDuplicate,
  onRemove,
  onConvert,
  onUpdateClient,
}) {
  const [activityType, setActivityType] = useState('Note')
  const [activityNote, setActivityNote] = useState('')
  const [showAllActivities, setShowAllActivities] = useState(false)

  if (!record) {
    return null
  }

  const { client, index } = record
  const roi = calculateROI(client)
  const health = getClientHealth(client)
  const completeness = getDataCompleteness(client)
  const locations = getClientLocations(client)
  const probability = getWinProbabilityRatio(client)

  const activities = client.activities || []
  const contacts = client.contacts || []
  const sortedActivities = [...activities].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
  const visibleActivities = showAllActivities ? sortedActivities : sortedActivities.slice(0, 5)

  const handleLogActivity = (event) => {
    event.preventDefault()
    if (!activityNote.trim()) {
      return
    }

    const newActivity = createEmptyActivity(activityType)
    newActivity.note = activityNote.trim()

    onUpdateClient?.(index, {
      activities: [...activities, newActivity],
    })
    setActivityNote('')
    setActivityType('Note')
  }

  return (
    <div className="detail-panel-overlay" onClick={onClose} role="presentation">
      <aside className="detail-panel glass-card" onClick={(event) => event.stopPropagation()}>
        <div className="detail-panel__header">
          <div>
            <p className="eyebrow">Account detail</p>
            <h2>{client.retailerName}</h2>
            <div className="retailer-card__chips">
              <TonePill label={client.pipelineStatus} tone={client.pipelineStatus === 'Closed' ? 'success' : 'info'} />
              <TonePill label={health.label} tone={health.tone} />
              <TonePill label={client.priorityTier} tone={client.priorityTier === 'High' ? 'danger' : 'neutral'} />
              {client.accountOwner && <TonePill label={client.accountOwner} tone="info" />}
            </div>
          </div>

          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="detail-panel__actions">
          <button type="button" className="btn btn-primary" onClick={() => onEdit(index)}>
            Edit account
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onDuplicate(index)}>
            Duplicate
          </button>
          {client.pipelineStatus !== 'Closed' && (
            <button type="button" className="btn btn-secondary" onClick={() => onConvert(index)}>
              Mark closed
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-danger" onClick={() => onRemove(index)}>
            Delete
          </button>
        </div>

        <section className="detail-panel__section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Economics</p>
              <h3>Commercial snapshot</h3>
            </div>
          </div>

          <div className="detail-metrics-grid">
            <DetailMetric label="Locations" value={formatNumber(locations)} />
            <DetailMetric label="Win probability" value={formatPercent(probability)} />
            <DetailMetric label="Year 1 revenue" value={formatCompactCurrency(roi.huel.year1GrossRevenue)} />
            <DetailMetric
              label="Year 1 EBITDA"
              value={formatCompactCurrency(roi.huel.year1Ebitda)}
              tone={roi.huel.year1Ebitda >= 0 ? 'text-success' : 'text-danger'}
            />
            <DetailMetric label="Trade rate" value={formatPercent(roi.huel.tradeRatePercent)} />
            <DetailMetric
              label="Breakeven"
              value={roi.huel.breakevenMonths > 0 ? `${roi.huel.breakevenMonths.toFixed(1)} months` : 'Immediate'}
            />
          </div>
        </section>

        <section className="detail-panel__section detail-panel__section--two">
          <div className="detail-card">
            <p className="eyebrow">Workflow</p>
            <h3>What needs to happen next</h3>
            <div className="detail-list">
              <div>
                <span>Next action</span>
                <strong>{client.nextAction || 'No next action captured'}</strong>
              </div>
              <div>
                <span>Action due</span>
                <strong>{client.nextActionDueDate ? formatRelativeDayLabel(client.nextActionDueDate) : 'No due date'}</strong>
              </div>
              <div>
                <span>Launch date</span>
                <strong>{client.targetLaunchDate ? formatShortDate(client.targetLaunchDate) : 'Unscheduled'}</strong>
              </div>
              <div>
                <span>Forecast quarter</span>
                <strong>{client.forecastQuarter || 'Unassigned'}</strong>
              </div>
            </div>
          </div>

          <div className="detail-card">
            <p className="eyebrow">Data quality</p>
            <h3>Commercial completeness</h3>
            {completeness.missingCritical.length === 0 ? (
              <p className="empty-copy">This account has the key workflow inputs the dashboard expects.</p>
            ) : (
              <div className="detail-chip-list">
                {completeness.missingCritical.map((item) => (
                  <TonePill key={item} label={item} tone="warning" />
                ))}
              </div>
            )}
            <p className="detail-card__notes">
              Score: <strong>{Math.round(completeness.score * 100)}%</strong>
            </p>
          </div>
        </section>

        {/* Contacts Section */}
        <section className="detail-panel__section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Contacts</p>
              <h3>Key people on this account</h3>
            </div>
            <TonePill label={`${contacts.length} contacts`} tone={contacts.length ? 'info' : 'neutral'} />
          </div>

          {contacts.length === 0 ? (
            <p className="empty-copy">No contacts added yet. Edit the account to add buyer contacts.</p>
          ) : (
            <div className="contacts-grid">
              {contacts.map((contact) => (
                <div key={contact.id} className="contact-card">
                  <div className="contact-card__info">
                    <strong>{contact.name || 'Unnamed contact'}</strong>
                    {contact.title && <span className="contact-card__title">{contact.title}</span>}
                  </div>
                  <div className="contact-card__details">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="contact-card__link">
                        {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="contact-card__link">
                        {contact.email}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Activity Log Section */}
        <section className="detail-panel__section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Activity log</p>
              <h3>Interaction history</h3>
            </div>
            <TonePill label={`${activities.length} entries`} tone={activities.length ? 'info' : 'neutral'} />
          </div>

          <form className="activity-form" onSubmit={handleLogActivity}>
            <div className="activity-form__row">
              <select
                className="form-select activity-form__type"
                value={activityType}
                onChange={(event) => setActivityType(event.target.value)}
              >
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <input
                className="form-input activity-form__input"
                type="text"
                placeholder="What happened? e.g. &quot;Sent pricing deck, buyer wants 2-week trial&quot;"
                value={activityNote}
                onChange={(event) => setActivityNote(event.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={!activityNote.trim()}>
                Log
              </button>
            </div>
          </form>

          {sortedActivities.length === 0 ? (
            <p className="empty-copy">No activity logged yet. Use the form above to record calls, emails, meetings, and notes.</p>
          ) : (
            <>
              <div className="activity-timeline">
                {visibleActivities.map((activity) => (
                  <div key={activity.id} className="activity-timeline__item">
                    <div className="activity-timeline__marker">
                      <div className={`activity-timeline__dot activity-timeline__dot--${getActivityTypeTone(activity.type)}`} />
                      <div className="activity-timeline__line" />
                    </div>
                    <div className="activity-timeline__content">
                      <div className="activity-timeline__header">
                        <TonePill label={activity.type} tone={getActivityTypeTone(activity.type)} />
                        <small>{formatActivityTimestamp(activity.timestamp)}</small>
                      </div>
                      <p className="activity-timeline__note">{activity.note}</p>
                    </div>
                  </div>
                ))}
              </div>

              {sortedActivities.length > 5 && (
                <button
                  type="button"
                  className="btn btn-secondary activity-show-more"
                  onClick={() => setShowAllActivities((value) => !value)}
                >
                  {showAllActivities ? 'Show recent' : `Show all ${sortedActivities.length} entries`}
                </button>
              )}
            </>
          )}
        </section>

        <section className="detail-panel__section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Products</p>
              <h3>What drives the economics</h3>
            </div>
          </div>

          <div className="table-shell">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Route</th>
                  <th>Locations</th>
                  <th>Velocity</th>
                  <th>SRP</th>
                </tr>
              </thead>
              <tbody>
                {(client.products || []).map((product, productIndex) => (
                  <tr key={`${client.id}-${product.id || productIndex}`}>
                    <td><strong>{product.productName}</strong></td>
                    <td>{product.routeToMarket}</td>
                    <td>{formatNumber(product.numStores)}</td>
                    <td>{formatNumber(product.baseVelocity)} / week</td>
                    <td>{formatCurrency(product.srp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="detail-panel__section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Notes</p>
              <h3>Commercial context</h3>
            </div>
          </div>
          <p className="detail-card__notes">{client.notes || 'No commercial notes captured for this account yet.'}</p>
        </section>
      </aside>
    </div>
  )
}
