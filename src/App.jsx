import { useEffect, useState } from 'react'
import DashboardOverview from './components/DashboardOverview'
import ClientForm from './components/ClientForm'
import PlacementsForecast from './components/PlacementsForecast'
import PortfolioFilters from './components/PortfolioFilters'
import Settings from './components/Settings'
import {
  fetchPricingData as fetchAirtablePricing,
  getConfig as getAirtableConfig,
  syncClientToAirtable,
} from './utils/airtableSync'
import { createEmptyClient, loadClients, saveClients } from './utils/clientStore'
import { markPricingFetchFailure } from './utils/dataStatus'
import { filterClients, getFilterOptions } from './utils/portfolio'
import {
  loadProducts,
  mergeRemoteProducts,
  toProductMap,
} from './utils/productCatalog'
import { updateDynamicPricing } from './utils/calculations'

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
  clientType: 'all',
  owner: 'all',
  priority: 'all',
  routeToMarket: 'all',
  health: 'all',
}

function App() {
  const [availableProducts, setAvailableProducts] = useState(() => {
    const products = loadProducts()
    updateDynamicPricing({}, toProductMap(products))
    return products
  })
  const [clients, setClients] = useState(() => loadClients(loadProducts()))
  const [view, setView] = useState('dashboard')
  const [editingClientIndex, setEditingClientIndex] = useState(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  useEffect(() => {
    async function loadPricing() {
      if (!getAirtableConfig()) {
        return
      }

      try {
        const data = await fetchAirtablePricing()
        if (!data) {
          return
        }

        updateDynamicPricing(data.pricingTiers, data.products)
        if (data.products) {
          setAvailableProducts((currentProducts) => mergeRemoteProducts(currentProducts, data.products))
        }
      } catch (error) {
        console.warn('Airtable fetch failed', error)
        markPricingFetchFailure('Airtable', error.message)
      }
    }

    loadPricing()
  }, [])

  const persistClients = (nextClients, updatedIndexes = null) => {
    const savedClients = saveClients(nextClients, availableProducts, updatedIndexes)
    setClients(savedClients)
    return savedClients
  }

  const handleSaveClient = async (clientData) => {
    let nextClients
    let updatedIndexes

    if (editingClientIndex !== null) {
      nextClients = [...clients]
      nextClients[editingClientIndex] = clientData
      updatedIndexes = [editingClientIndex]
    } else {
      nextClients = [...clients, clientData]
      updatedIndexes = [nextClients.length - 1]
    }

    const savedClients = persistClients(nextClients, updatedIndexes)
    const savedClient = editingClientIndex !== null
      ? savedClients[editingClientIndex]
      : savedClients[savedClients.length - 1]

    setView('dashboard')
    setEditingClientIndex(null)

    if (getAirtableConfig()) {
      await syncClientToAirtable(savedClient)
    }
  }

  const handleEditClient = (index) => {
    setEditingClientIndex(index)
    setView('add_client')
    setMobileNavOpen(false)
  }

  const handleDuplicateClient = (index) => {
    const duplicated = createEmptyClient(availableProducts)
    const source = clients[index]
    const nextClients = [
      ...clients,
      {
        ...duplicated,
        ...source,
        retailerName: `${source.retailerName} (Copy)`,
        createdAt: '',
        updatedAt: '',
      },
    ]

    persistClients(nextClients, [nextClients.length - 1])
  }

  const handleRemoveClient = (index) => {
    if (!window.confirm('Are you sure you want to remove this retailer profile?')) {
      return
    }

    const nextClients = clients.filter((_, clientIndex) => clientIndex !== index)
    persistClients(nextClients, [])
  }

  const handleConvertLead = (index) => {
    const nextClients = [...clients]
    nextClients[index] = {
      ...nextClients[index],
      pipelineStatus: 'Closed',
      winProbability: '100',
    }
    persistClients(nextClients, [index])
  }

  const handleUpdateClient = (index, updates) => {
    const nextClients = [...clients]
    nextClients[index] = { ...nextClients[index], ...updates }
    persistClients(nextClients, [index])
  }

  const handleCancel = () => {
    setView('dashboard')
    setEditingClientIndex(null)
  }

  const handleFilterChange = (field, value) => {
    setFilters((currentFilters) => ({ ...currentFilters, [field]: value }))
  }

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  const filteredClients = filterClients(clients, filters)
  const filteredRecords = clients
    .map((client, index) => ({ client, index }))
    .filter(({ client }) => filteredClients.includes(client))

  const filterOptions = getFilterOptions(clients)
  const hasActiveFilters = Object.entries(filters).some(([, value]) => value !== '' && value !== 'all')
  const liveCount = clients.filter((client) => client.pipelineStatus === 'Closed').length
  const pipelineCount = clients.length - liveCount
  const showFilters = view === 'dashboard' || view === 'placements'

  const navigation = [
    { id: 'dashboard', label: 'Dashboard Overview', meta: `${liveCount} live` },
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
          <PortfolioFilters
            filters={filters}
            filteredCount={filteredClients.length}
            totalCount={clients.length}
            options={filterOptions}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
          />
        )}

        <main className="main-content">
          {view === 'dashboard' && (
            <DashboardOverview
              clientRecords={filteredRecords}
              totalCount={clients.length}
              hasActiveFilters={hasActiveFilters}
              onEdit={handleEditClient}
              onDuplicate={handleDuplicateClient}
              onRemove={handleRemoveClient}
            />
          )}

          {view === 'add_client' && (
            <ClientForm
              onSave={handleSaveClient}
              onCancel={handleCancel}
              initialData={editingClientIndex !== null ? clients[editingClientIndex] : null}
              availableProducts={availableProducts}
            />
          )}

          {view === 'placements' && (
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

          {view === 'settings' && (
            <Settings
              onProductsUpdated={(products) => setAvailableProducts(products)}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
