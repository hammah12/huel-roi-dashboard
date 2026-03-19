import { useState } from 'react'

import {
  formatRelativeDayLabel,
  formatShortDate,
} from '../utils/formatters'

const EMPTY_SIGNAL = {
  title: '',
  accountId: '',
  accountName: '',
  type: 'Commercial update',
  status: 'New',
  priority: 'P2',
  source: 'Manual',
  dueDate: '',
  whyItMatters: '',
  owner: '',
}

const EMPTY_TASK = {
  title: '',
  accountId: '',
  accountName: '',
  signalLabel: '',
  status: 'To Do',
  priority: 'Medium',
  owner: '',
  dueDate: '',
  notes: '',
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

function getSignalTone(priority) {
  if (priority === 'P0') {
    return 'danger'
  }
  if (priority === 'P1') {
    return 'warning'
  }
  return 'info'
}

function getTaskTone(status) {
  if (status === 'Done') {
    return 'success'
  }
  if (status === 'Blocked') {
    return 'danger'
  }
  if (status === 'In Progress') {
    return 'warning'
  }
  return 'neutral'
}

export default function CommandCenter({
  clients,
  signals,
  tasks,
  onCreateSignal,
  onUpdateSignal,
  onCreateTask,
  onUpdateTask,
  onOpenAccount,
}) {
  const [signalDraft, setSignalDraft] = useState(EMPTY_SIGNAL)
  const [taskDraft, setTaskDraft] = useState(EMPTY_TASK)

  const todayQueue = [
    ...signals
      .filter((signal) => signal.status !== 'Done' && ['P0', 'P1'].includes(signal.priority))
      .map((signal) => ({
        id: `signal-${signal.id}`,
        kind: 'Signal',
        title: signal.title,
        subtitle: signal.accountName || 'No linked account',
        detail: signal.whyItMatters || signal.source,
        dueDate: signal.dueDate,
        tone: getSignalTone(signal.priority),
        actionLabel: signal.status === 'New' ? 'Accept' : 'Done',
        onAction: () => onUpdateSignal(signal.id, {
          ...signal,
          status: signal.status === 'New' ? 'Accepted' : 'Done',
        }),
      })),
    ...tasks
      .filter((task) => task.status !== 'Done')
      .map((task) => ({
        id: `task-${task.id}`,
        kind: 'Task',
        title: task.title,
        subtitle: task.accountName || task.signalLabel || 'General task',
        detail: task.notes || task.status,
        dueDate: task.dueDate,
        tone: getTaskTone(task.status),
        actionLabel: task.status === 'To Do' ? 'Start' : 'Done',
        onAction: () => onUpdateTask(task.id, {
          ...task,
          status: task.status === 'To Do' ? 'In Progress' : 'Done',
        }),
      })),
  ]
    .sort((left, right) => (left.dueDate || '9999-12-31').localeCompare(right.dueDate || '9999-12-31'))
    .slice(0, 10)

  const metrics = [
    {
      label: 'Open signals',
      value: signals.filter((signal) => signal.status !== 'Done').length,
      sublabel: `${signals.filter((signal) => signal.priority === 'P0').length} P0 items`,
      tone: signals.some((signal) => signal.priority === 'P0') ? 'danger' : 'info',
    },
    {
      label: 'Open tasks',
      value: tasks.filter((task) => task.status !== 'Done').length,
      sublabel: `${tasks.filter((task) => task.status === 'Blocked').length} blocked`,
      tone: tasks.some((task) => task.status === 'Blocked') ? 'danger' : 'info',
    },
    {
      label: 'Accounts with follow-up',
      value: clients.filter((client) => client.nextAction?.trim()).length,
      sublabel: `${clients.filter((client) => client.nextActionDueDate).length} have due dates`,
      tone: 'neutral',
    },
    {
      label: 'Accepted signals',
      value: signals.filter((signal) => signal.status === 'Accepted').length,
      sublabel: 'Ready for execution',
      tone: 'success',
    },
  ]

  const submitSignal = async (event) => {
    event.preventDefault()
    await onCreateSignal(signalDraft)
    setSignalDraft(EMPTY_SIGNAL)
  }

  const submitTask = async (event) => {
    event.preventDefault()
    await onCreateTask(taskDraft)
    setTaskDraft(EMPTY_TASK)
  }

  return (
    <div className="view-stack">
      <header className="view-header">
        <div>
          <p className="eyebrow">Commercial workflow</p>
          <h1>Command Center</h1>
          <p className="view-header__copy">
            This is the first integration slice from the sales command center: persistent signals, tasks, and a queue for commercial follow-through.
          </p>
        </div>
      </header>

      <section className="summary-grid summary-grid--four">
        {metrics.map((metric) => (
          <SummaryCard
            key={metric.label}
            label={metric.label}
            value={String(metric.value)}
            sublabel={metric.sublabel}
            tone={metric.tone}
          />
        ))}
      </section>

      <section className="dashboard-columns">
        <article className="glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Today queue</p>
              <h2>What the team should move next</h2>
            </div>
            <TonePill label={`${todayQueue.length} items`} tone={todayQueue.length ? 'warning' : 'success'} />
          </div>

          {todayQueue.length === 0 ? (
            <p className="empty-copy">No signals or tasks are currently queued.</p>
          ) : (
            <div className="queue-list">
              {todayQueue.map((item) => (
                <div key={item.id} className="queue-item">
                  <div>
                    <div className="queue-item__title-row">
                  <strong>{item.title}</strong>
                  <TonePill label={item.kind} tone="info" />
                    </div>
                    <p>{item.subtitle}</p>
                    <small>
                      {item.detail} · {item.dueDate ? formatRelativeDayLabel(item.dueDate) : 'No due date'}
                    </small>
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={item.onAction}>
                    {item.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Quick capture</p>
              <h2>Add a signal or task without leaving the dashboard</h2>
            </div>
          </div>

          <div className="command-center-forms">
            <form className="command-mini-form" onSubmit={submitSignal}>
              <h3>New signal</h3>
              <div className="form-grid form-grid--two">
                <input className="form-input" type="text" placeholder="Signal title" value={signalDraft.title} onChange={(event) => setSignalDraft((current) => ({ ...current, title: event.target.value }))} required />
                <select
                  className="form-select"
                  value={signalDraft.accountId}
                  onChange={(event) => {
                    const selectedClient = clients.find((client) => client.id === event.target.value)
                    setSignalDraft((current) => ({
                      ...current,
                      accountId: event.target.value,
                      accountName: selectedClient?.retailerName || '',
                    }))
                  }}
                >
                  <option value="">No linked account</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.retailerName}</option>
                  ))}
                </select>
                <input className="form-input" type="text" placeholder="Type" value={signalDraft.type} onChange={(event) => setSignalDraft((current) => ({ ...current, type: event.target.value }))} />
                <select className="form-select" value={signalDraft.priority} onChange={(event) => setSignalDraft((current) => ({ ...current, priority: event.target.value }))}>
                  <option value="P0">P0</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                </select>
                <input className="form-input" type="date" value={signalDraft.dueDate} onChange={(event) => setSignalDraft((current) => ({ ...current, dueDate: event.target.value }))} />
                <input className="form-input" type="text" placeholder="Owner" value={signalDraft.owner} onChange={(event) => setSignalDraft((current) => ({ ...current, owner: event.target.value }))} />
              </div>
              <textarea className="form-input form-input--textarea" rows="3" placeholder="Why this matters" value={signalDraft.whyItMatters} onChange={(event) => setSignalDraft((current) => ({ ...current, whyItMatters: event.target.value }))} />
              <button type="submit" className="btn btn-primary">Create signal</button>
            </form>

            <form className="command-mini-form" onSubmit={submitTask}>
              <h3>New task</h3>
              <div className="form-grid form-grid--two">
                <input className="form-input" type="text" placeholder="Task title" value={taskDraft.title} onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))} required />
                <select
                  className="form-select"
                  value={taskDraft.accountId}
                  onChange={(event) => {
                    const selectedClient = clients.find((client) => client.id === event.target.value)
                    setTaskDraft((current) => ({
                      ...current,
                      accountId: event.target.value,
                      accountName: selectedClient?.retailerName || '',
                    }))
                  }}
                >
                  <option value="">No linked account</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.retailerName}</option>
                  ))}
                </select>
                <input className="form-input" type="text" placeholder="Linked signal" value={taskDraft.signalLabel} onChange={(event) => setTaskDraft((current) => ({ ...current, signalLabel: event.target.value }))} />
                <select className="form-select" value={taskDraft.priority} onChange={(event) => setTaskDraft((current) => ({ ...current, priority: event.target.value }))}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <input className="form-input" type="date" value={taskDraft.dueDate} onChange={(event) => setTaskDraft((current) => ({ ...current, dueDate: event.target.value }))} />
                <input className="form-input" type="text" placeholder="Owner" value={taskDraft.owner} onChange={(event) => setTaskDraft((current) => ({ ...current, owner: event.target.value }))} />
              </div>
              <textarea className="form-input form-input--textarea" rows="3" placeholder="Notes" value={taskDraft.notes} onChange={(event) => setTaskDraft((current) => ({ ...current, notes: event.target.value }))} />
              <button type="submit" className="btn btn-primary">Create task</button>
            </form>
          </div>
        </article>
      </section>

      <section className="dashboard-columns">
        <article className="glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Signals</p>
              <h2>Inbound and commercial developments</h2>
            </div>
          </div>

          {/* Desktop table */}
          <div className="table-shell command-table-desktop">
            <table className="dashboard-table command-table">
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Account</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {signals.length === 0 ? (
                  <tr>
                    <td colSpan="6">Add the optional Airtable `Signals` table to start tracking commercial signals here.</td>
                  </tr>
                ) : signals.map((signal) => (
                  <tr key={signal.id}>
                    <td>
                      <strong>{signal.title}</strong>
                      <small>{signal.whyItMatters || signal.source}</small>
                    </td>
                    <td>
                      <button type="button" className="table-link-button" onClick={() => onOpenAccount(signal.accountId, signal.accountName)}>
                        {signal.accountName || 'Unlinked'}
                      </button>
                    </td>
                    <td>{signal.status}</td>
                    <td><TonePill label={signal.priority} tone={getSignalTone(signal.priority)} /></td>
                    <td>{signal.dueDate ? formatShortDate(signal.dueDate) : 'No date'}</td>
                    <td>
                      <button type="button" className="btn btn-secondary" onClick={() => onUpdateSignal(signal.id, { ...signal, status: signal.status === 'Done' ? 'Reviewing' : 'Done' })}>
                        {signal.status === 'Done' ? 'Reopen' : 'Done'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="command-card-list">
            {signals.length === 0 ? (
              <p className="empty-copy">Add the optional Airtable `Signals` table to start tracking commercial signals here.</p>
            ) : signals.map((signal) => (
              <div key={`card-${signal.id}`} className="command-card">
                <div className="command-card__header">
                  <strong>{signal.title}</strong>
                  <TonePill label={signal.priority} tone={getSignalTone(signal.priority)} />
                </div>
                {(signal.whyItMatters || signal.source) && (
                  <p className="command-card__detail">{signal.whyItMatters || signal.source}</p>
                )}
                <div className="command-card__meta">
                  <span className="command-card__meta-item">
                    <button type="button" className="table-link-button" onClick={() => onOpenAccount(signal.accountId, signal.accountName)}>
                      {signal.accountName || 'Unlinked'}
                    </button>
                  </span>
                  <span className="command-card__meta-item">{signal.status}</span>
                  <span className="command-card__meta-item">{signal.dueDate ? formatShortDate(signal.dueDate) : 'No date'}</span>
                </div>
                <div className="command-card__actions">
                  <button type="button" className="btn btn-secondary" onClick={() => onUpdateSignal(signal.id, { ...signal, status: signal.status === 'Done' ? 'Reviewing' : 'Done' })}>
                    {signal.status === 'Done' ? 'Reopen' : 'Done'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Tasks</p>
              <h2>Execution work tied to the portfolio</h2>
            </div>
          </div>

          {/* Desktop table */}
          <div className="table-shell command-table-desktop">
            <table className="dashboard-table command-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Account</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="6">Add the optional Airtable `Tasks` table to start managing commercial execution work here.</td>
                  </tr>
                ) : tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <strong>{task.title}</strong>
                      <small>{task.notes || task.signalLabel || 'No additional notes'}</small>
                    </td>
                    <td>
                      <button type="button" className="table-link-button" onClick={() => onOpenAccount(task.accountId, task.accountName)}>
                        {task.accountName || 'Unlinked'}
                      </button>
                    </td>
                    <td>{task.status}</td>
                    <td><TonePill label={task.priority} tone={task.priority === 'High' ? 'danger' : task.priority === 'Medium' ? 'warning' : 'neutral'} /></td>
                    <td>{task.dueDate ? formatShortDate(task.dueDate) : 'No date'}</td>
                    <td>
                      <button type="button" className="btn btn-secondary" onClick={() => onUpdateTask(task.id, { ...task, status: task.status === 'Done' ? 'To Do' : 'Done' })}>
                        {task.status === 'Done' ? 'Reopen' : 'Done'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="command-card-list">
            {tasks.length === 0 ? (
              <p className="empty-copy">Add the optional Airtable `Tasks` table to start managing commercial execution work here.</p>
            ) : tasks.map((task) => (
              <div key={`card-${task.id}`} className="command-card">
                <div className="command-card__header">
                  <strong>{task.title}</strong>
                  <TonePill label={task.priority} tone={task.priority === 'High' ? 'danger' : task.priority === 'Medium' ? 'warning' : 'neutral'} />
                </div>
                {(task.notes || task.signalLabel) && (
                  <p className="command-card__detail">{task.notes || task.signalLabel}</p>
                )}
                <div className="command-card__meta">
                  <span className="command-card__meta-item">
                    <button type="button" className="table-link-button" onClick={() => onOpenAccount(task.accountId, task.accountName)}>
                      {task.accountName || 'Unlinked'}
                    </button>
                  </span>
                  <span className="command-card__meta-item">{task.status}</span>
                  <span className="command-card__meta-item">{task.dueDate ? formatShortDate(task.dueDate) : 'No date'}</span>
                </div>
                <div className="command-card__actions">
                  <button type="button" className="btn btn-secondary" onClick={() => onUpdateTask(task.id, { ...task, status: task.status === 'Done' ? 'To Do' : 'Done' })}>
                    {task.status === 'Done' ? 'Reopen' : 'Done'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
