import { useMemo, useState } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTimestamp(value) {
  if (!value) return null
  // Airtable dates can be ISO timestamps or YYYY-MM-DD strings
  const ts = value.includes('T') ? value : `${value}T00:00:00`
  const d   = new Date(ts)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDayHeader(date) {
  const today     = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString())     return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'short',
    day:     'numeric',
  })
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// ── Event metadata ─────────────────────────────────────────────────────────────

const SIGNAL_STATUS_EVENTS = {
  Accepted: { label: 'Signal accepted',  icon: '✅', tone: 'success' },
  Done:     { label: 'Signal closed',    icon: '◉',  tone: 'neutral' },
  Declined: { label: 'Signal declined',  icon: '✕',  tone: 'danger'  },
  Expired:  { label: 'Signal expired',   icon: '⏰', tone: 'warning' },
}

const TASK_STATUS_EVENTS = {
  'In Progress': { label: 'Task started',    icon: '🔄', tone: 'info'    },
  Done:          { label: 'Task completed',  icon: '✅', tone: 'success' },
  Blocked:       { label: 'Task blocked',    icon: '🚫', tone: 'danger'  },
}

// ── Event builder ─────────────────────────────────────────────────────────────

function buildEvents(signals, tasks, filter) {
  const events = []

  for (const signal of signals) {
    const createdAt = parseTimestamp(signal.createdAt)
    const updatedAt = parseTimestamp(signal.updatedAt)
    const isGmail   = signal.source === 'Gmail Inbound'

    if (createdAt) {
      events.push({
        id:          `${signal.id}-created`,
        timestamp:   createdAt,
        kind:        'signal',
        eventLabel:  isGmail ? 'Gmail signal detected' : 'Signal created',
        icon:        isGmail ? '📨' : '📋',
        tone:        'info',
        title:       signal.title,
        account:     signal.accountName || '',
        sourceBadge: isGmail ? 'Gmail' : 'Manual',
        priority:    signal.priority,
      })
    }

    // Status-change event: only emit if the signal has been actioned
    const statusMeta = SIGNAL_STATUS_EVENTS[signal.status]
    if (statusMeta && updatedAt) {
      const sameTime = createdAt && Math.abs(updatedAt.getTime() - createdAt.getTime()) < 5000
      if (!sameTime) {
        events.push({
          id:          `${signal.id}-status`,
          timestamp:   updatedAt,
          kind:        'signal',
          eventLabel:  statusMeta.label,
          icon:        statusMeta.icon,
          tone:        statusMeta.tone,
          title:       signal.title,
          account:     signal.accountName || '',
          sourceBadge: null,
          priority:    signal.priority,
        })
      }
    }
  }

  for (const task of tasks) {
    const createdAt = parseTimestamp(task.createdAt)
    const updatedAt = parseTimestamp(task.updatedAt)
    const context   = task.accountName || task.signalLabel || ''

    if (createdAt) {
      events.push({
        id:          `${task.id}-created`,
        timestamp:   createdAt,
        kind:        'task',
        eventLabel:  'Task created',
        icon:        '📋',
        tone:        'neutral',
        title:       task.title,
        account:     context,
        sourceBadge: null,
        priority:    null,
      })
    }

    const statusMeta = TASK_STATUS_EVENTS[task.status]
    if (statusMeta && updatedAt) {
      const sameTime = createdAt && Math.abs(updatedAt.getTime() - createdAt.getTime()) < 5000
      if (!sameTime) {
        events.push({
          id:          `${task.id}-status`,
          timestamp:   updatedAt,
          kind:        'task',
          eventLabel:  statusMeta.label,
          icon:        statusMeta.icon,
          tone:        statusMeta.tone,
          title:       task.title,
          account:     context,
          sourceBadge: null,
          priority:    null,
        })
      }
    }
  }

  // Apply kind filter
  const filtered = filter === 'all' ? events : events.filter((e) => e.kind === filter)

  // Sort newest first
  return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

function groupByDay(events) {
  const groups = []
  let currentDay   = null
  let currentGroup = null

  for (const event of events) {
    const dayKey = event.timestamp.toDateString()
    if (dayKey !== currentDay) {
      currentDay   = dayKey
      currentGroup = { day: formatDayHeader(event.timestamp), events: [] }
      groups.push(currentGroup)
    }
    currentGroup.events.push(event)
  }

  return groups
}

// ── Filter bar ────────────────────────────────────────────────────────────────

const FILTERS = [
  { id: 'all',    label: 'All activity' },
  { id: 'signal', label: 'Signals only' },
  { id: 'task',   label: 'Tasks only'   },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivityTimeline({ signals, tasks }) {
  const [filter, setFilter] = useState('all')

  const groups = useMemo(
    () => groupByDay(buildEvents(signals, tasks, filter)),
    [signals, tasks, filter],
  )

  const totalEvents = useMemo(
    () => buildEvents(signals, tasks, 'all').length,
    [signals, tasks],
  )

  return (
    <div className="view-stack">
      <header className="view-header">
        <div>
          <p className="eyebrow">Activity</p>
          <h1>Timeline</h1>
          <p className="view-header__copy">
            A chronological record of every signal and task event — detections, acceptances, completions, and more.
          </p>
        </div>
      </header>

      {/* Filter bar */}
      <div className="glass-card" style={{ padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="eyebrow" style={{ marginRight: '0.25rem' }}>Show:</span>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`btn ${filter === f.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.9rem' }}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {totalEvents} total events
          </span>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="glass-card">
          <p className="empty-copy">
            No activity yet. Signals and tasks will appear here as they're created and actioned.
          </p>
        </div>
      ) : (
        <div className="glass-card">
          <div className="timeline">
            {groups.map((group) => (
              <div key={group.day} className="timeline-group">
                <div className="timeline-day-header">
                  <span>{group.day}</span>
                </div>

                <div className="timeline-track">
                  {group.events.map((event) => (
                    <div key={event.id} className={`timeline-event timeline-event--${event.tone}`}>
                      <div className="timeline-event__line" />
                      <div className={`timeline-event__dot timeline-event__dot--${event.tone}`} />

                      <div className="timeline-event__content">
                        <div className="timeline-event__header">
                          <span className="timeline-event__icon">{event.icon}</span>
                          <strong className="timeline-event__label">{event.eventLabel}</strong>
                          <span style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {event.priority && (
                              <span className={`tone-pill tone-pill--${event.priority === 'P0' ? 'danger' : event.priority === 'P1' ? 'warning' : 'info'}`}>
                                {event.priority}
                              </span>
                            )}
                            {event.sourceBadge && (
                              <span className="tone-pill tone-pill--info" style={{ fontSize: '0.68rem' }}>
                                {event.sourceBadge}
                              </span>
                            )}
                          </span>
                          <span className="timeline-event__time">{formatTime(event.timestamp)}</span>
                        </div>

                        <p className="timeline-event__title">{event.title}</p>
                        {event.account && (
                          <small className="timeline-event__account">{event.account}</small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
