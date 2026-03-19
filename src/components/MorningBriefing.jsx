import { useState } from 'react'

import { calculateROI } from '../utils/calculations'
import {
  formatCompactCurrency,
  formatNumber,
  formatRelativeDayLabel,
  formatShortDate,
} from '../utils/formatters'
import {
  getAttentionQueue,
  getLaunchesInWindow,
  getWeightedPipelineMetrics,
} from '../utils/portfolio'

function TonePill({ label, tone = 'neutral' }) {
  return <span className={`tone-pill tone-pill--${tone}`}>{label}</span>
}

export default function MorningBriefing({ clients, signals, tasks, onOpenAccount, clientRecords }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + 7)
  const endOfWeekStr = endOfWeek.toISOString().slice(0, 10)

  const attentionQueue = getAttentionQueue(clients)
  const overdueItems = attentionQueue.filter((item) => item.attention.kind === 'overdue_action')
  const tasksDueToday = tasks.filter((task) => task.status !== 'Done' && task.dueDate === todayStr)
  const tasksDueWeek = tasks.filter((task) => task.status !== 'Done' && task.dueDate && task.dueDate >= todayStr && task.dueDate <= endOfWeekStr)
  const launchesThisWeek = getLaunchesInWindow(clients, 7)
  const launchesNext30 = getLaunchesInWindow(clients, 30)
  const pipelineMetrics = getWeightedPipelineMetrics(clients)
  const liveClients = clients.filter((client) => client.pipelineStatus === 'Closed')
  const liveRevenue = liveClients.reduce((sum, client) => sum + calculateROI(client).huel.year1GrossRevenue, 0)
  const openSignals = signals.filter((signal) => signal.status !== 'Done')
  const p0Signals = openSignals.filter((signal) => signal.priority === 'P0')
  const blockedTasks = tasks.filter((task) => task.status === 'Blocked')

  const urgentCount = overdueItems.length + p0Signals.length + blockedTasks.length

  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const dayLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <section className="morning-briefing glass-card">
      <div className="morning-briefing__header">
        <div>
          <p className="eyebrow">Daily briefing</p>
          <h2>{greeting} — {dayLabel}</h2>
        </div>
        <div className="morning-briefing__header-actions">
          {urgentCount > 0 && <TonePill label={`${urgentCount} urgent`} tone="danger" />}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsCollapsed((value) => !value)}
          >
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="briefing-metrics">
            <div className="briefing-metric">
              <span>Overdue actions</span>
              <strong className={overdueItems.length > 0 ? 'text-danger' : ''}>{formatNumber(overdueItems.length)}</strong>
            </div>
            <div className="briefing-metric">
              <span>Tasks due today</span>
              <strong className={tasksDueToday.length > 0 ? 'text-danger' : ''}>{formatNumber(tasksDueToday.length)}</strong>
            </div>
            <div className="briefing-metric">
              <span>Tasks this week</span>
              <strong>{formatNumber(tasksDueWeek.length)}</strong>
            </div>
            <div className="briefing-metric">
              <span>Launches this week</span>
              <strong className={launchesThisWeek.length > 0 ? '' : ''}>{formatNumber(launchesThisWeek.length)}</strong>
            </div>
            <div className="briefing-metric">
              <span>Live revenue</span>
              <strong>{formatCompactCurrency(liveRevenue)}</strong>
            </div>
            <div className="briefing-metric">
              <span>Weighted pipeline</span>
              <strong>{formatCompactCurrency(pipelineMetrics.weightedRevenue)}</strong>
            </div>
          </div>

          {(overdueItems.length > 0 || tasksDueToday.length > 0 || p0Signals.length > 0 || blockedTasks.length > 0 || launchesThisWeek.length > 0) && (
            <div className="briefing-action-items">
              {overdueItems.slice(0, 3).map(({ client, attention }) => (
                <div key={`overdue-${client.retailerName}`} className="briefing-action-item briefing-action-item--danger">
                  <div>
                    <div className="queue-item__title-row">
                      <strong>{client.retailerName}</strong>
                      <TonePill label="Overdue" tone="danger" />
                    </div>
                    <p>{attention.detail}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onOpenAccount(client.id, client.retailerName)}
                  >
                    Open
                  </button>
                </div>
              ))}

              {p0Signals.slice(0, 2).map((signal) => (
                <div key={`p0-${signal.id}`} className="briefing-action-item briefing-action-item--danger">
                  <div>
                    <div className="queue-item__title-row">
                      <strong>{signal.title}</strong>
                      <TonePill label="P0 Signal" tone="danger" />
                    </div>
                    <p>{signal.accountName || 'Unlinked'} · {signal.whyItMatters || signal.source}</p>
                  </div>
                </div>
              ))}

              {tasksDueToday.slice(0, 3).map((task) => (
                <div key={`today-${task.id}`} className="briefing-action-item briefing-action-item--warning">
                  <div>
                    <div className="queue-item__title-row">
                      <strong>{task.title}</strong>
                      <TonePill label="Due today" tone="warning" />
                    </div>
                    <p>{task.accountName || 'General'} · {task.notes || task.status}</p>
                  </div>
                </div>
              ))}

              {blockedTasks.slice(0, 2).map((task) => (
                <div key={`blocked-${task.id}`} className="briefing-action-item briefing-action-item--danger">
                  <div>
                    <div className="queue-item__title-row">
                      <strong>{task.title}</strong>
                      <TonePill label="Blocked" tone="danger" />
                    </div>
                    <p>{task.accountName || 'General'} · {task.notes || 'No notes'}</p>
                  </div>
                </div>
              ))}

              {launchesThisWeek.slice(0, 2).map((client) => (
                <div key={`launch-${client.retailerName}`} className="briefing-action-item briefing-action-item--info">
                  <div>
                    <div className="queue-item__title-row">
                      <strong>{client.retailerName}</strong>
                      <TonePill label="Launching" tone="info" />
                    </div>
                    <p>Launch date: {formatShortDate(client.targetLaunchDate)}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onOpenAccount(client.id, client.retailerName)}
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}

          {overdueItems.length === 0 && tasksDueToday.length === 0 && p0Signals.length === 0 && blockedTasks.length === 0 && launchesThisWeek.length === 0 && (
            <p className="briefing-all-clear">All clear — no overdue actions, blocked tasks, or urgent signals today.</p>
          )}
        </>
      )}
    </section>
  )
}
