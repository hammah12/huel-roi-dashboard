import { useEffect, useState } from 'react'
import AccountDetailPanel from './components/AccountDetailPanel'
import CommandCenter from './components/CommandCenter'
import DashboardOverview from './components/DashboardOverview'
import ClientForm from './components/ClientForm'
import MorningBriefing from './components/MorningBriefing'
import PlacementsForecast from './components/PlacementsForecast'
import PortfolioFilters from './components/PortfolioFilters'
import Settings from './components/Settings'
import { createEmptyClient, normalizeClient } from './utils/clientStore'
import { filterClients, getFilterOptions, SAVED_VIEW_PRESETS } from './utils/portfolio'
import {
  DEFAULT_PRODUCTS,
  toProductMap,
} from './utils/productCatalog'
import { updateDynamicPricing } from './utils/calculations'
import {
  createClient as createRemoteClient,
  createSignal as createRemoteSignal,
  createTask as createRemoteTask,
  deleteClient as deleteRemoteClient,
  fetchBootstrap,
  updateSignal as updateRemoteSignal,
  updateTask as updateRemoteTask,
  updateClient as updateRemoteClient,
} from './utils/apiClient'

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
  clientType: 'all',
  owner: 'all',
  priority: 'all',
  routeToMarket: 'all',
  health: 'all',
  attention: 'all',
  launchWindow: 'all',
}

function App() {
  const [availableProducts, setAvailableProducts] = useState(DEFAULT_PRODUCTS)
  const [clients, setClients] = useState([])
  const [signals, setSignals] = useState([])
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState('dashboard')
  const [editingClientIndex, setEditingClientIndex] = useState(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [activeSavedView, setActiveSavedView] = useState('all')
  const [selectedClientIds, setSelectedClientIds] = useState([])
  const [detailClientId, setDetailClientId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filtersVisible, setFiltersVisible] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setLoadError('')
      try {
        const data = await fetchBootstrap()
        const products = data.products?.length ? data.products : DEFAULT_PRODUCTS
        updateDynamicPricing(data.pricingTiers || {}, toProductMap(products))
        setAvailableProducts(products)
        const nextClients = (data.clients || []).map((client) => normalizeClient(client, products))
        setClients(nextClients)
        setSignals(data.signals || [])
        setTasks(data.tasks || [])
        setSelectedClientIds((currentIds) => currentIds.filter((clientId) => nextClients.some((client) => client.id === clientId)))
        setDetailClientId((currentId) => (nextClients.some((client) => client.id === currentId) ? currentId : ''))
      } catch (error) {
        console.warn('Bootstrap fetch failed', error)
        setLoadError(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSaveClient = async (clientData) => {
    const payload = normalizeClient(clientData, availableProducts)

    try {
      if (editingClientIndex !== null) {
        const existingClient = clients[editingClientIndex]
        const result = await updateRemoteClient(existingClient.id, payload)
        setClients((currentClients) => currentClients.map((client, index) => (
          index === editingClientIndex ? normalizeClient(result.client, availableProducts) : client
        )))
        setDetailClientId(result.client.id)
      } else {
        const result = await createRemoteClient(payload)
        const nextClient = normalizeClient(result.client, availableProducts)
        setClients((currentClients) => [...currentClients, nextClient])
        setDetailClientId(nextClient.id)
      }

      setView('dashboard')
      setEditingClientIndex(null)
    } catch (error) {
      window.alert(`Unable to save client: ${error.message}`)
    }
  }

  const handleEditClient = (index) => {
    setEditingClientIndex(index)
    setView('add_client')
    setDetailClientId('')
    setMobileNavOpen(false)
  }

  const handleOpenDetail = (index) => {
    const nextClient = clients[index]
    if (!nextClient) {
      return
    }

    setDetailClientId(nextClient.id)
  }

  const handleDuplicateClient = (index) => {
    const duplicated = createEmptyClient(availableProducts)
    const source = clients[index]
    void handleSaveClient({
      ...duplicated,
      ...source,
      id: '',
      products: (source.products || []).map((product) => ({ ...product, id: '' })),
      retailerName: `${source.retailerName} (Copy)`,
      createdAt: '',
      updatedAt: '',
    })
  }

  const handleRemoveClient = async (index) => {
    if (!window.confirm('Are you sure you want to remove this retailer profile?')) {
      return
    }

    try {
      await deleteRemoteClient(clients[index].id)
      setClients((currentClients) => currentClients.filter((_, clientIndex) => clientIndex !== index))
      setSelectedClientIds((currentIds) => currentIds.filter((clientId) => clientId !== clients[index].id))
      if (detailClientId === clients[index].id) {
        setDetailClientId('')
      }
    } catch (error) {
      window.alert(`Unable to delete client: ${error.message}`)
    }
  }

  const handleConvertLead = async (index) => {
    const nextClient = {
      ...clients[index],
      pipelineStatus: 'Closed',
      winProbability: '100',
    }

    try {
      const result = await updateRemoteClient(nextClient.id, nextClient)
      setClients((currentClients) => currentClients.map((client, clientIndex) => (
        clientIndex === index ? normalizeClient(result.client, availableProducts) : client
      )))
      setDetailClientId(result.client.id)
    } catch (error) {
      window.alert(`Unable to convert lead: ${error.message}`)
    }
  }

  const handleUpdateClient = async (index, updates) => {
    const nextClient = { ...clients[index], ...updates }

    try {
      const result = await updateRemoteClient(nextClient.id, nextClient)
      setClients((currentClients) => currentClients.map((client, clientIndex) => (
        clientIndex === index ? normalizeClient(result.client, availableProducts) : client
      )))
      setDetailClientId(result.client.id)
    } catch (error) {
      window.alert(`Unable to update client: ${error.message}`)
    }
  }

  const handleCancel = () => {
    setView('dashboard')
    setEditingClientIndex(null)
  }

  const handleFilterChange = (field, value) => {
    setFilters((currentFilters) => ({ ...currentFilters, [field]: value }))
    setActiveSavedView('custom')
  }

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setActiveSavedView('all')
  }

  const handleApplySavedView = (savedViewId) => {
    const nextView = SAVED_VIEW_PRESETS.find((item) => item.id === savedViewId)
    if (!nextView) {
      return
    }

    setFilters(nextView.filters)
    setActiveSavedView(nextView.id)
  }

  const handleToggleClientSelection = (clientId) => {
    setSelectedClientIds((currentIds) => (
      currentIds.includes(clientId)
        ? currentIds.filter((id) => id !== clientId)
        : [...currentIds, clientId]
    ))
  }

  const handleClearSelection = () => {
    setSelectedClientIds([])
  }

  const handleBulkUpdate = async (updates) => {
    const nextIds = selectedClientIds

    if (nextIds.length === 0) {
      return
    }

    try {
      const results = await Promise.all(nextIds.map(async (clientId) => {
        const existingClient = clients.find((client) => client.id === clientId)

        if (!existingClient) {
          return null
        }

        const nextClient = {
          ...existingClient,
          ...updates,
          ...(updates.pipelineStatus === 'Closed' ? { winProbability: '100' } : {}),
        }

        const result = await updateRemoteClient(clientId, nextClient)
        return normalizeClient(result.client, availableProducts)
      }))

      const resultMap = new Map(results.filter(Boolean).map((client) => [client.id, client]))
      setClients((currentClients) => currentClients.map((client) => resultMap.get(client.id) || client))
      setSelectedClientIds([])
    } catch (error) {
      window.alert(`Unable to update selected accounts: ${error.message}`)
    }
  }

  const handleCreateSignal = async (signalDraft) => {
    try {
      const result = await createRemoteSignal(signalDraft)
      setSignals((currentSignals) => [result.signal, ...currentSignals])
    } catch (error) {
      window.alert(`Unable to create signal: ${error.message}`)
    }
  }

  const handleUpdateSignal = async (signalId, nextSignal) => {
    try {
      const result = await updateRemoteSignal(signalId, nextSignal)
      setSignals((currentSignals) => currentSignals.map((signal) => (
        signal.id === signalId ? result.signal : signal
      )))
    } catch (error) {
      window.alert(`Unable to update signal: ${error.message}`)
    }
  }

  const handleCreateTask = async (taskDraft) => {
    try {
      const result = await createRemoteTask(taskDraft)
      setTasks((currentTasks) => [...currentTasks, result.task].sort((left, right) => (
        (left.dueDate || '9999-12-31').localeCompare(right.dueDate || '9999-12-31')
      )))
    } catch (error) {
      window.alert(`Unable to create task: ${error.message}`)
    }
  }

  const handleUpdateTask = async (taskId, nextTask) => {
    try {
      const result = await updateRemoteTask(taskId, nextTask)
      setTasks((currentTasks) => currentTasks
        .map((task) => (task.id === taskId ? result.task : task))
        .sort((left, right) => (left.dueDate || '9999-12-31').localeCompare(right.dueDate || '9999-12-31')))
    } catch (error) {
      window.alert(`Unable to update task: ${error.message}`)
    }
  }

  const handleOpenAccount = (accountId, accountName = '') => {
    const matchingIndex = clients.findIndex((client) => (
      (accountId && client.id === accountId) || (!accountId && client.retailerName === accountName)
    ))
    if (matchingIndex >= 0) {
      handleOpenDetail(matchingIndex)
    }
  }

  const filteredClients = filterClients(clients, filters)
  const filteredRecords = clients
    .map((client, index) => ({ client, index }))
    .filter(({ client }) => filteredClients.includes(client))

  const filterOptions = getFilterOptions(clients)
  const hasActiveFilters = Object.entries(filters).some(([, value]) => value !== '' && value !== 'all')
  const liveCount = clients.filter((client) => client.pipelineStatus === 'Closed').length
  const pipelineCount = clients.length - liveCount
  const openSignalCount = signals.filter((signal) => signal.status !== 'Done').length
  const showFilters = view === 'dashboard' || view === 'placements'
  const detailRecord = clients
    .map((client, index) => ({ client, index }))
    .find(({ client }) => client.id === detailClientId) || null

  const navigation = [
    { id: 'dashboard', label: 'Dashboard Overview', meta: `${liveCount} live` },
    { id: 'command_center', label: 'Command Center', meta: `${openSignalCount} open` },
    { id: 'add_client', label: '+ Add New Retailer', meta: 'Deal builder' },
    { id: 'placements', label: 'Placements Forecast', meta: `${pipelineCount} pipeline` },
    { id: 'settings', label: 'Settings', meta: 'Airtable + catalogue' },
  ]

  return (
    <div className="app-shell">
      <button
        type="button"
        className={`sidebar-overlay ${mobileNavOpen ? 'is-visible' : ''}`}
        aria-label="Close navigation"
        onClick={() => setMobileNavOpen(false)}
      />

      <aside className={`sidebar ${mobileNavOpen ? 'is-open' : ''}`}>
        <div className="brand-block">
          <div className="brand-mark">H</div>
          <div>
            <h1>Huel ROI</h1>
            <p>Commercial strategy cockpit</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav__button ${view === item.id ? 'is-active' : ''}`}
              onClick={() => {
                setView(item.id)
                setMobileNavOpen(false)
              }}
            >
              <span>{item.label}</span>
              <small>{item.meta}</small>
            </button>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="mobile-topbar">
          <button
            type="button"
            className="nav-toggle"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="mobile-topbar__brand">
            <div className="brand-mark brand-mark--small">H</div>
            <div>
              <strong>Huel ROI</strong>
              <small>Commercial ops</small>
            </div>
          </div>
        </header>

        {showFilters && (
          <div className="portfolio-filters">
            <div className="filter-toggle-bar">
              <div className="filter-toggle-bar__left">
                <p className="eyebrow">Portfolio Filters</p>
                <span className="meta-pill">
                  {filteredClients.length} of {clients.length}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFiltersVisible((v) => !v)}
              >
                {filtersVisible ? 'Hide filters' : 'Show filters'}
              </button>
            </div>

            {filtersVisible && (
              <PortfolioFilters
                filters={filters}
                filteredCount={filteredClients.length}
                totalCount={clients.length}
                options={filterOptions}
                savedViews={SAVED_VIEW_PRESETS}
                activeSavedView={activeSavedView}
                onApplySavedView={handleApplySavedView}
                onChange={handleFilterChange}
                onClear={handleClearFilters}
              />
            )}
          </div>
        )}

        <main className="main-content">
          {isLoading && (
            <div className="glass-card">
              <p className="eyebrow">Loading</p>
              <h2>Syncing shared Airtable data</h2>
              <p className="view-header__copy">We are loading clients, products, and pricing from the shared production data source.</p>
            </div>
          )}

          {!isLoading && loadError && (
            <div className="glass-card">
              <p className="eyebrow">Connection issue</p>
              <h2>Unable to load Airtable data</h2>
              <p className="view-header__copy">{loadError}</p>
            </div>
          )}

          {!isLoading && !loadError && view === 'dashboard' && (
            <>
              <MorningBriefing
                clients={clients}
                signals={signals}
                tasks={tasks}
                onOpenAccount={handleOpenAccount}
                clientRecords={filteredRecords}
              />
              <DashboardOverview
                clientRecords={filteredRecords}
                totalCount={clients.length}
                hasActiveFilters={hasActiveFilters}
                onEdit={handleEditClient}
                onOpenDetail={handleOpenDetail}
                onDuplicate={handleDuplicateClient}
                onRemove={handleRemoveClient}
                onBulkUpdate={handleBulkUpdate}
                selectedClientIds={selectedClientIds}
                onToggleClientSelection={handleToggleClientSelection}
                onClearSelection={handleClearSelection}
              />
            </>
          )}

          {!isLoading && !loadError && view === 'command_center' && (
            <CommandCenter
              clients={clients}
              signals={signals}
              tasks={tasks}
              onCreateSignal={handleCreateSignal}
              onUpdateSignal={handleUpdateSignal}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onOpenAccount={handleOpenAccount}
            />
          )}

          {!isLoading && !loadError && view === 'add_client' && (
            <ClientForm
              onSave={handleSaveClient}
              onCancel={handleCancel}
              initialData={editingClientIndex !== null ? clients[editingClientIndex] : null}
              availableProducts={availableProducts}
            />
          )}

          {!isLoading && !loadError && view === 'placements' && (
            <PlacementsForecast
              clientRecords={filteredRecords}
              totalCount={clients.length}
              filters={filters}
              hasActiveFilters={hasActiveFilters}
              onConvert={handleConvertLead}
              onEdit={handleEditClient}
              onUpdateClient={handleUpdateClient}
            />
          )}

          {!isLoading && view === 'settings' && (
            <Settings
              onProductsUpdated={(products) => setAvailableProducts(products)}
            />
          )}
        </main>
      </div>

      <AccountDetailPanel
        record={detailRecord}
        onClose={() => setDetailClientId('')}
        onEdit={handleEditClient}
        onDuplicate={handleDuplicateClient}
        onRemove={handleRemoveClient}
        onConvert={handleConvertLead}
        onUpdateClient={handleUpdateClient}
      />
    </div>
  )
}

export default App
