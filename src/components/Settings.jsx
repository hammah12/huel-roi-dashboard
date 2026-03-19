import { useEffect, useState } from 'react'

import { fetchBootstrap, fetchStatus, getWriteToken, saveProductCatalog, setWriteToken } from '../utils/apiClient'
import { updateDynamicPricing } from '../utils/calculations'
import { DEFAULT_PRODUCTS, toProductMap } from '../utils/productCatalog'

const EMPTY_PRODUCT = { name: '', cogs: 0, defaultSrp: 0 }

const RETAILER_SCHEMA = [
  ['Name', 'Single line text', 'Primary field for the retailer or account name'],
  ['Client Type', 'Single select', 'Vending | Micromarket | Airport Concessions | Food Service'],
  ['Pipeline Status', 'Single select', 'Closed | Hot Pipeline | High Interest | Prospect'],
  ['Route to Market', 'Single line text', 'Top-level summary only; per-product RTM lives in Products'],
  ['Account Owner', 'Single line text', 'Commercial owner responsible for the deal'],
  ['Priority Tier', 'Single select', 'High | Medium | Low'],
  ['Win Probability', 'Number', 'Store as a whole number from 0 to 100'],
  ['Forecast Quarter', 'Single select', 'Q1 | Q2 | Q3 | Q4'],
  ['Rebate', 'Number', 'Retailer rebate percentage'],
  ['Deal Type', 'Single select', 'standard | revenue_share'],
  ['Num Machines', 'Number', 'Machine count for vending deals'],
  ['Machine Cost Per Unit', 'Currency', 'Capex per machine'],
  ['Revenue Share Pct', 'Number', 'Partner share percentage'],
  ['Revenue Share Minimum Monthly', 'Currency', 'Monthly minimum partner payout'],
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

const PLACEMENTS_SCHEMA = [
  ['Name', 'Single line text', 'Partner or retailer name'],
  ['Type', 'Single select', 'Vending | Micromarket | Airport Concessions | Food Service'],
  ['Q1', 'Number', 'Confirmed placements for Q1'],
  ['Q2', 'Number', 'Confirmed placements for Q2'],
  ['Q3', 'Number', 'Confirmed placements for Q3'],
  ['Q4', 'Number', 'Confirmed placements for Q4'],
]

const SIGNALS_SCHEMA = [
  ['Name', 'Single line text', 'Signal title or subject'],
  ['Retailer', 'Link to another record', 'Optional linked retailer record for reliable drill-in'],
  ['Account', 'Single line text', 'Related retailer or account name'],
  ['Type', 'Single select', 'Commercial update | Buyer reply | Margin risk | Launch blocker | Inbound interest'],
  ['Status', 'Single select', 'New | Reviewing | Accepted | Snoozed | Done'],
  ['Priority', 'Single select', 'P0 | P1 | P2 | P3'],
  ['Source', 'Single line text', 'Manual, Gmail, Slack, Airtable note, etc.'],
  ['Due Date', 'Date', 'When the signal needs attention'],
  ['Why It Matters', 'Long text', 'Commercial context'],
  ['Owner', 'Single line text', 'Who should handle it'],
  ['Created At', 'Date with time', 'App-generated timestamp'],
  ['Updated At', 'Date with time', 'App-generated timestamp'],
]

const TASKS_SCHEMA = [
  ['Name', 'Single line text', 'Task title'],
  ['Retailer', 'Link to another record', 'Optional linked retailer record for reliable drill-in'],
  ['Account', 'Single line text', 'Related retailer or account name'],
  ['Signal', 'Single line text', 'Optional linked signal label'],
  ['Status', 'Single select', 'To Do | In Progress | Blocked | Done'],
  ['Priority', 'Single select', 'High | Medium | Low'],
  ['Owner', 'Single line text', 'Task owner'],
  ['Due Date', 'Date', 'Execution due date'],
  ['Notes', 'Long text', 'Operational context'],
  ['Created At', 'Date with time', 'App-generated timestamp'],
  ['Updated At', 'Date with time', 'App-generated timestamp'],
]

function StatusNotice({ notice }) {
  if (!notice) {
    return null
  }

  return <div className={`status-notice status-notice--${notice.tone}`}>{notice.message}</div>
}

function TonePill({ label, tone = 'neutral' }) {
  return <span className={`tone-pill tone-pill--${tone}`}>{label}</span>
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
  const [products, setProducts] = useState(DEFAULT_PRODUCTS)
  const [notice, setNotice] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadCatalog() {
      try {
        const data = await fetchBootstrap()
        setProducts(data.products?.length ? data.products : DEFAULT_PRODUCTS)
      } catch (error) {
        setNotice({ tone: 'error', message: error.message })
      }
    }

    loadCatalog()
  }, [])

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

    setIsSaving(true)

    void saveProductCatalog(cleanedProducts)
      .then((result) => {
        const nextProducts = result.products?.length ? result.products : cleanedProducts
        setProducts(nextProducts)
        updateDynamicPricing({}, toProductMap(nextProducts))
        onProductsUpdated?.(nextProducts)
        setNotice({ tone: 'success', message: 'Shared Airtable product catalogue saved.' })
      })
      .catch((error) => {
        setNotice({ tone: 'error', message: error.message })
      })
      .finally(() => {
        setIsSaving(false)
      })
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
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save catalogue'}
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
  const [status, setStatus] = useState(null)
  const [notice, setNotice] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [writeToken, setWriteTokenInput] = useState('')

  useEffect(() => {
    setWriteTokenInput(getWriteToken())
    void refreshStatus()
  }, [])

  const refreshStatus = async () => {
    try {
      const nextStatus = await fetchStatus()
      setStatus(nextStatus)
    } catch (error) {
      setStatus({
        connected: false,
        projectMode: 'Airtable-first',
        message: error.message,
        env: {
          AIRTABLE_TOKEN: false,
          AIRTABLE_BASE_ID: false,
        },
      })
    }
  }

  const handleRefreshPricing = async () => {
    setIsRefreshing(true)
    setNotice({ tone: 'info', message: 'Refreshing shared Airtable settings...' })

    try {
      const data = await fetchBootstrap()
      const products = data.products?.length ? data.products : DEFAULT_PRODUCTS
      updateDynamicPricing(data.pricingTiers || {}, toProductMap(products))
      onProductsUpdated?.(products)
      await refreshStatus()
      setNotice({ tone: 'success', message: 'Airtable settings refreshed from the server.' })
    } catch (error) {
      setNotice({ tone: 'error', message: error.message })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSaveWriteToken = () => {
    setWriteToken(writeToken)
    setNotice({
      tone: 'success',
      message: writeToken.trim()
        ? 'Write token saved in this browser session.'
        : 'Browser write token cleared.',
    })
  }

  return (
    <div className="view-stack settings-layout">
      <header className="view-header">
        <div>
          <p className="eyebrow">Operations setup</p>
          <h1>Settings</h1>
          <p className="view-header__copy">
            Airtable is now the source of truth for production data. The browser no longer stores Airtable credentials or owns the
            canonical portfolio state.
          </p>
        </div>
      </header>

      <section className="settings-grid">
        <article className="glass-card settings-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Airtable sync</p>
              <h2>Server-side connection and pricing refresh</h2>
              <p className="view-header__copy">
                Vercel API routes read Airtable credentials from environment variables and expose shared data to the app.
              </p>
            </div>

            <span className={`tone-pill tone-pill--${status?.connected ? 'success' : 'danger'}`}>
              {status?.connected ? 'Connected' : 'Needs attention'}
            </span>
          </div>

          <StatusNotice notice={notice || (status ? { tone: status.connected ? 'success' : 'error', message: status.message } : null)} />

          <div className="settings-actions">
            <button type="button" className="btn btn-primary" onClick={handleRefreshPricing} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing...' : 'Refresh shared settings'}
            </button>
          </div>
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
              <span>Project mode</span>
              <strong>{status?.projectMode || 'Airtable-first'}</strong>
            </div>
            <div className="status-panel__item">
              <span>Airtable token</span>
              <strong>{status?.env?.AIRTABLE_TOKEN ? 'Present' : 'Missing'}</strong>
            </div>
            <div className="status-panel__item">
              <span>Airtable base ID</span>
              <strong>{status?.env?.AIRTABLE_BASE_ID ? 'Present' : 'Missing'}</strong>
            </div>
            <div className="status-panel__item">
              <span>Connection message</span>
              <strong>{status?.message || 'Checking connection...'}</strong>
            </div>
            <div className="status-panel__item">
              <span>Write protection</span>
              <strong>{status?.writeProtectionEnabled ? 'Enabled' : 'Off'}</strong>
            </div>
            <div className="status-panel__item">
              <span>Schema audit</span>
              <strong>
                {status?.schemaAudit?.healthy
                  ? 'Healthy'
                  : status?.schemaAudit
                    ? 'Needs cleanup'
                    : 'Unavailable'}
              </strong>
            </div>
          </div>
        </article>
      </section>

      <section className="settings-grid">
        <article className="glass-card settings-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Write access</p>
              <h2>Optional app-level protection</h2>
              <p className="view-header__copy">
                If `APP_WRITE_TOKEN` is configured on Vercel, enter it here so this browser session can create and edit records.
              </p>
            </div>
            <span className={`tone-pill tone-pill--${status?.writeProtectionEnabled ? 'warning' : 'neutral'}`}>
              {status?.writeProtectionEnabled ? 'Protected' : 'Open'}
            </span>
          </div>

          <div className="form-grid form-grid--two">
            <label className="field-group">
              <span className="form-label">Browser write token</span>
              <input
                className="form-input"
                type="password"
                value={writeToken}
                onChange={(event) => setWriteTokenInput(event.target.value)}
                placeholder={status?.writeProtectionEnabled ? 'Enter shared write token' : 'Not required unless protection is enabled'}
              />
            </label>
          </div>

          <div className="settings-actions">
            <button type="button" className="btn btn-primary" onClick={handleSaveWriteToken}>
              Save browser token
            </button>
          </div>
        </article>

        <article className="glass-card settings-panel status-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Schema audit</p>
              <h2>How close the Airtable base is to the recommended model</h2>
            </div>
          </div>

          {status?.schemaAudit ? (
            <>
              <div className="status-panel__grid">
                <div className="status-panel__item">
                  <span>Missing tables</span>
                  <strong>{status.schemaAudit.totals.missingTables}</strong>
                </div>
                <div className="status-panel__item">
                  <span>Missing fields</span>
                  <strong>{status.schemaAudit.totals.missingFields}</strong>
                </div>
                <div className="status-panel__item">
                  <span>Type mismatches</span>
                  <strong>{status.schemaAudit.totals.typeWarnings}</strong>
                </div>
              </div>

              <div className="schema-audit-list">
                {Object.entries(status.schemaAudit.tables).map(([tableName, audit]) => (
                  <div key={tableName} className="schema-audit-card">
                    <div className="schema-audit-card__header">
                      <strong>{tableName}</strong>
                      <span className={`tone-pill tone-pill--${audit.missingFields.length || audit.typeWarnings.length || !audit.exists ? 'warning' : 'success'}`}>
                        {audit.exists ? 'Present' : 'Missing'}
                      </span>
                    </div>
                    {!audit.exists && <p className="empty-copy">This table is missing from the Airtable base.</p>}
                    {audit.missingFields.length > 0 && (
                      <p className="detail-card__notes">Missing fields: {audit.missingFields.join(', ')}</p>
                    )}
                    {audit.typeWarnings.length > 0 && (
                      <div className="detail-chip-list">
                        {audit.typeWarnings.map((warning) => (
                          <TonePill
                            key={`${tableName}-${warning.field}`}
                            label={`${warning.field}: ${warning.currentType}`}
                            tone="warning"
                          />
                        ))}
                      </div>
                    )}
                    {audit.exists && audit.missingFields.length === 0 && audit.typeWarnings.length === 0 && (
                      <p className="empty-copy">This table matches the app&apos;s expected shape.</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-copy">Schema audit is unavailable until the Airtable connection succeeds.</p>
          )}
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
            <SchemaTable title="Placements Forecast table" rows={PLACEMENTS_SCHEMA} />
            <SchemaTable title="Signals table" rows={SIGNALS_SCHEMA} />
            <SchemaTable title="Tasks table" rows={TASKS_SCHEMA} />
          </div>
        )}
      </section>
    </div>
  )
}
