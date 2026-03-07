import { useEffect, useState } from 'react'

import {
  fetchPricingData,
  getConfig,
  setConfig,
  testConnection,
} from '../utils/airtableSync'
import { updateDynamicPricing } from '../utils/calculations'
import { getDataStatus } from '../utils/dataStatus'
import {
  DEFAULT_PRODUCTS,
  loadProducts,
  mergeRemoteProducts,
  saveProducts,
} from '../utils/productCatalog'

const EMPTY_PRODUCT = { name: '', cogs: '', defaultSrp: '' }

const RETAILER_SCHEMA = [
  ['Name', 'Single line text', 'Primary field for the retailer or account name'],
  ['Client Type', 'Single select', 'Vending | Micromarket | Airport Concessions | Food Service'],
  ['Route to Market', 'Single line text', 'Top-level summary only; per-product RTM lives in Products'],
  ['Account Owner', 'Single line text', 'Commercial owner responsible for the deal'],
  ['Priority Tier', 'Single select', 'High | Medium | Low'],
  ['Win Probability', 'Number', 'Store as a whole number from 0 to 100'],
  ['Forecast Quarter', 'Single select', 'Q1 | Q2 | Q3 | Q4'],
  ['Target Launch Date', 'Date', 'Planned launch date for pipeline tracking'],
  ['Next Action', 'Long text', 'Next commercial step'],
  ['Next Action Due Date', 'Date', 'Due date for the next action'],
  ['Notes', 'Long text', 'Commercial notes and context'],
  ['Created At', 'Date with time', 'ISO timestamp from the app'],
  ['Updated At', 'Date with time', 'ISO timestamp from the app'],
  ['Synced At', 'Date', 'Date stamp for the most recent sync'],
]

const PRODUCT_SCHEMA = [
  ['Retailer', 'Link to another record', 'Links each SKU row back to Retailers'],
  ['Product Name', 'Single select', 'SKU name used in the dashboard catalogue'],
  ['Route to Market', 'Single select', 'DSD | Distributor | Direct to Retailer | Wholesale'],
  ['Num Stores', 'Number', 'Store, location, or machine count for this product row'],
  ['Base Velocity', 'Number', 'Units per location per week'],
  ['SRP', 'Currency', 'Retail selling price'],
  ['Slotting Fixed', 'Currency', 'One-time slotting fee'],
  ['Slotting Free Fill Qty', 'Number', 'Free-fill units for launch'],
  ['TPRs', 'Currency', 'Total temporary price reduction spend'],
  ['Marketing', 'Currency', 'Total marketing spend attached to the SKU'],
]

const PRICING_SCHEMA = [
  ['Config Key', 'Single line text', 'Route-to-market name or product name'],
  ['Type', 'Single select', 'RTM Price | Product COGS | Product Default SRP'],
  ['Value', 'Number', 'Numeric value used by the pricing engine'],
]

function formatTimestamp(value) {
  if (!value) {
    return 'Not yet'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Not yet'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function StatusNotice({ notice }) {
  if (!notice) {
    return null
  }

  return <div className={`status-notice status-notice--${notice.tone}`}>{notice.message}</div>
}

function SchemaTable({ title, rows }) {
  return (
    <div className="schema-table">
      <div className="schema-table__header">
        <p className="eyebrow">{title}</p>
      </div>

      <div className="table-shell">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([field, type, notes]) => (
              <tr key={`${title}-${field}`}>
                <td><strong>{field}</strong></td>
                <td>{type}</td>
                <td>{notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProductCatalogue({ onProductsUpdated }) {
  const [products, setProducts] = useState(() => loadProducts())
  const [notice, setNotice] = useState(null)

  const updateRow = (index, field, value) => {
    setProducts((currentProducts) => currentProducts.map((product, productIndex) => (
      productIndex === index ? { ...product, [field]: value } : product
    )))
  }

  const addRow = () => {
    setProducts((currentProducts) => [...currentProducts, { ...EMPTY_PRODUCT }])
  }

  const removeRow = (index) => {
    setProducts((currentProducts) => currentProducts.filter((_, productIndex) => productIndex !== index))
  }

  const handleSave = () => {
    const cleanedProducts = products
      .filter((product) => product.name.trim())
      .map((product) => ({
        name: product.name.trim(),
        cogs: Number(product.cogs) || 0,
        defaultSrp: Number(product.defaultSrp) || 0,
      }))

    if (cleanedProducts.length === 0) {
      setNotice({ tone: 'error', message: 'Add at least one product before saving the catalogue.' })
      return
    }

    saveProducts(cleanedProducts)
    setProducts(cleanedProducts)
    onProductsUpdated?.(cleanedProducts)
    setNotice({ tone: 'success', message: 'Product catalogue saved. ROI calculations now use the updated defaults.' })
  }

  return (
    <section className="glass-card settings-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Product catalogue</p>
          <h2>Keep SKU cost and SRP assumptions aligned</h2>
          <p className="view-header__copy">
            Local catalogue values are the fallback. Airtable refreshes can merge in remote SKU pricing when available.
          </p>
        </div>

        <div className="settings-actions">
          <button type="button" className="btn btn-secondary" onClick={addRow}>
            Add product
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save catalogue
          </button>
        </div>
      </div>

      <StatusNotice notice={notice} />

      <div className="table-shell">
        <table className="dashboard-table product-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>COGS</th>
              <th>Default SRP</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={`${product.name || 'product'}-${index}`}>
                <td>
                  <input
                    className="form-input"
                    type="text"
                    value={product.name}
                    onChange={(event) => updateRow(index, 'name', event.target.value)}
                    placeholder={DEFAULT_PRODUCTS[index]?.name || 'New product'}
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={product.cogs}
                    onChange={(event) => updateRow(index, 'cogs', event.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={product.defaultSrp}
                    onChange={(event) => updateRow(index, 'defaultSrp', event.target.value)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-secondary btn-danger"
                    onClick={() => removeRow(index)}
                    disabled={products.length === 1}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function Settings({ onProductsUpdated }) {
  const [token, setToken] = useState('')
  const [baseId, setBaseId] = useState('')
  const [notice, setNotice] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dataStatus, setDataStatus] = useState(() => getDataStatus())

  useEffect(() => {
    const config = getConfig()
    if (!config) {
      return
    }

    setToken(config.token)
    setBaseId(config.baseId)
  }, [])

  const refreshStatus = () => {
    setDataStatus(getDataStatus())
  }

  const applyRemotePricing = (data) => {
    if (!data) {
      return
    }

    updateDynamicPricing(data.pricingTiers, data.products)

    if (data.products && Object.keys(data.products).length > 0) {
      const mergedProducts = mergeRemoteProducts(loadProducts(), data.products)
      saveProducts(mergedProducts)
      onProductsUpdated?.(mergedProducts)
    }
  }

  const handleSaveAndTest = async (event) => {
    event.preventDefault()

    if (!token || !baseId) {
      setConfig({ token: '', baseId: '' })
      setNotice({
        tone: 'warning',
        message: 'Airtable credentials cleared. The dashboard will keep using the local catalogue until you reconnect.',
      })
      refreshStatus()
      return
    }

    setIsTesting(true)
    setNotice({ tone: 'info', message: 'Testing Airtable connection and refreshing pricing...' })

    try {
      setConfig({ token, baseId })

      const result = await testConnection()
      if (!result.success) {
        setNotice({ tone: 'error', message: result.error })
        refreshStatus()
        return
      }

      const pricing = await fetchPricingData()
      applyRemotePricing(pricing)
      refreshStatus()
      setNotice({
        tone: 'success',
        message: pricing
          ? 'Airtable connected. Pricing has been refreshed and the catalogue was updated where remote SKU data exists.'
          : 'Airtable connected, but no pricing rows were returned.',
      })
    } catch (error) {
      setNotice({ tone: 'error', message: error.message })
      refreshStatus()
    } finally {
      setIsTesting(false)
    }
  }

  const handleRefreshPricing = async () => {
    if (!token || !baseId) {
      setNotice({ tone: 'warning', message: 'Enter an Airtable token and base ID before refreshing pricing.' })
      return
    }

    setIsRefreshing(true)
    setNotice({ tone: 'info', message: 'Refreshing pricing from Airtable...' })

    try {
      setConfig({ token, baseId })
      const pricing = await fetchPricingData()

      if (!pricing) {
        setNotice({ tone: 'error', message: 'Pricing refresh failed. Check the Airtable setup guide below.' })
        refreshStatus()
        return
      }

      applyRemotePricing(pricing)
      refreshStatus()
      setNotice({ tone: 'success', message: 'Pricing refreshed from Airtable.' })
    } catch (error) {
      setNotice({ tone: 'error', message: error.message })
      refreshStatus()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleClearConfig = () => {
    setConfig({ token: '', baseId: '' })
    setToken('')
    setBaseId('')
    setNotice({
      tone: 'warning',
      message: 'Saved Airtable credentials removed. Existing local data remains available.',
    })
    refreshStatus()
  }

  const isConfigured = Boolean(token && baseId)

  return (
    <div className="view-stack settings-layout">
      <header className="view-header">
        <div>
          <p className="eyebrow">Operations setup</p>
          <h1>Settings</h1>
          <p className="view-header__copy">
            Airtable is the only sync target in this build. Pricing can refresh from Airtable, and retailer sync writes the
            expanded workflow fields required by the commercial dashboard.
          </p>
        </div>
      </header>

      <section className="settings-grid">
        <article className="glass-card settings-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Airtable sync</p>
              <h2>Connection and pricing refresh</h2>
              <p className="view-header__copy">
                Save credentials once, then use Airtable as the source of truth for dynamic RTM pricing and synced retailer records.
              </p>
            </div>

            <span className={`tone-pill tone-pill--${isConfigured ? 'success' : 'neutral'}`}>
              {isConfigured ? 'Configured' : 'Not configured'}
            </span>
          </div>

          <form className="client-form" onSubmit={handleSaveAndTest}>
            <div className="form-grid form-grid--two">
              <label className="field-group">
                <span className="form-label">Personal access token</span>
                <input
                  className="form-input"
                  type="password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="pat..."
                />
              </label>

              <label className="field-group">
                <span className="form-label">Base ID</span>
                <input
                  className="form-input"
                  type="text"
                  value={baseId}
                  onChange={(event) => setBaseId(event.target.value)}
                  placeholder="app..."
                />
              </label>
            </div>

            <StatusNotice notice={notice} />

            <div className="settings-actions">
              <button type="submit" className="btn btn-primary" disabled={isTesting}>
                {isTesting ? 'Testing...' : 'Save and test'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleRefreshPricing} disabled={isRefreshing}>
                {isRefreshing ? 'Refreshing...' : 'Refresh pricing'}
              </button>
              <button type="button" className="btn btn-secondary btn-danger" onClick={handleClearConfig}>
                Clear credentials
              </button>
            </div>
          </form>
        </article>

        <article className="glass-card settings-panel status-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Data status</p>
              <h2>What the app last heard from Airtable</h2>
            </div>
          </div>

          <div className="status-panel__grid">
            <div className="status-panel__item">
              <span>Pricing source</span>
              <strong>{dataStatus.pricing.source || 'Local catalogue'}</strong>
            </div>
            <div className="status-panel__item">
              <span>Last pricing refresh</span>
              <strong>{formatTimestamp(dataStatus.pricing.lastSuccessAt)}</strong>
            </div>
            <div className="status-panel__item">
              <span>Last pricing error</span>
              <strong>{dataStatus.pricing.lastError || 'None recorded'}</strong>
            </div>
            <div className="status-panel__item">
              <span>Last client sync target</span>
              <strong>{dataStatus.clientSync.target || 'Not yet synced'}</strong>
            </div>
            <div className="status-panel__item">
              <span>Last client sync</span>
              <strong>{formatTimestamp(dataStatus.clientSync.lastSuccessAt)}</strong>
            </div>
            <div className="status-panel__item">
              <span>Last sync error</span>
              <strong>{dataStatus.clientSync.lastError || 'None recorded'}</strong>
            </div>
          </div>
        </article>
      </section>

      <ProductCatalogue onProductsUpdated={onProductsUpdated} />

      <section className="glass-card settings-panel">
        <button type="button" className="schema-toggle" onClick={() => setShowGuide((isOpen) => !isOpen)}>
          <span>
            <p className="eyebrow">Airtable schema</p>
            <h2>Base setup guide</h2>
          </span>
          <strong>{showGuide ? 'Hide guide' : 'Show guide'}</strong>
        </button>

        {showGuide && (
          <div className="schema-grid">
            <SchemaTable title="Retailers table" rows={RETAILER_SCHEMA} />
            <SchemaTable title="Products table" rows={PRODUCT_SCHEMA} />
            <SchemaTable title="Pricing Config table" rows={PRICING_SCHEMA} />
          </div>
        )}
      </section>
    </div>
  )
}
