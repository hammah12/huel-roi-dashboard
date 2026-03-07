import { useEffect, useState } from 'react'

import { PRICING_TIERS, calculateROI } from '../utils/calculations'
import {
  CLIENT_TYPES,
  FORECAST_QUARTERS,
  PIPELINE_STATUSES,
  PRIORITY_TIERS,
  createEmptyClient,
  createEmptyProduct,
  defaultWinProbability,
  normalizeClient,
} from '../utils/clientStore'
import { formatCompactCurrency, formatNumber, formatPercent } from '../utils/formatters'
import { getClientHealth, getDataCompleteness } from '../utils/portfolio'
import { DEFAULT_PRODUCTS } from '../utils/productCatalog'

function buildInitialState(initialData, productList) {
  if (initialData) {
    return normalizeClient(initialData, productList)
  }

  return createEmptyClient(productList)
}

export default function ClientForm({ onSave, onCancel, initialData, availableProducts }) {
  const productList = availableProducts?.length ? availableProducts : DEFAULT_PRODUCTS
  const [formData, setFormData] = useState(() => buildInitialState(initialData, productList))

  useEffect(() => {
    setFormData(buildInitialState(initialData, productList))
  }, [initialData, productList])

  const isVending = formData.clientType === 'Vending'
  const isRevenueShare = isVending && formData.dealType === 'revenue_share'

  const handleGeneralChange = (event) => {
    const { name, value } = event.target

    setFormData((currentFormData) => {
      if (name === 'pipelineStatus') {
        const previousDefault = defaultWinProbability(currentFormData.pipelineStatus)
        const shouldResetProbability =
          currentFormData.winProbability === '' ||
          Number(currentFormData.winProbability) === previousDefault

        return {
          ...currentFormData,
          pipelineStatus: value,
          winProbability: shouldResetProbability
            ? String(defaultWinProbability(value))
            : currentFormData.winProbability,
        }
      }

      return { ...currentFormData, [name]: value }
    })
  }

  const handleProductChange = (index, event) => {
    const { name, value } = event.target

    setFormData((currentFormData) => ({
      ...currentFormData,
      products: currentFormData.products.map((product, productIndex) => (
        productIndex === index ? { ...product, [name]: value } : product
      )),
    }))
  }

  const addProduct = () => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      products: [...currentFormData.products, createEmptyProduct(productList)],
    }))
  }

  const removeProduct = (index) => {
    setFormData((currentFormData) => {
      const nextProducts = currentFormData.products.filter((_, productIndex) => productIndex !== index)
      return {
        ...currentFormData,
        products: nextProducts.length ? nextProducts : [createEmptyProduct(productList)],
      }
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave(formData)
  }

  const roi = calculateROI(formData)
  const weightedRevenue = roi.huel.year1GrossRevenue * ((Number(formData.winProbability) || 0) / 100)
  const weightedEbitda = roi.huel.year1Ebitda * ((Number(formData.winProbability) || 0) / 100)
  const health = getClientHealth(formData)
  const completeness = getDataCompleteness(formData)
  const weeklyUnits = formData.products.reduce((sum, product) => (
    sum + ((Number(product.numStores) || 0) * (Number(product.baseVelocity) || 0))
  ), 0)

  return (
    <div className="form-layout">
      <div className="form-layout__main glass-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Deal builder</p>
            <h1>{initialData ? 'Update retailer configuration' : 'Create retailer configuration'}</h1>
            <p className="view-header__copy">
              Capture workflow context and economics in one record so the dashboard can rank and track the deal properly.
            </p>
          </div>
        </div>

        <form className="client-form" onSubmit={handleSubmit}>
          <section className="glass-card section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Account basics</p>
                <h2>Who the deal is and where it sits</h2>
              </div>
            </div>

            <div className="form-grid form-grid--two">
              <label className="field-group">
                <span className="form-label">Retailer / account</span>
                <input
                  className="form-input"
                  type="text"
                  name="retailerName"
                  value={formData.retailerName}
                  onChange={handleGeneralChange}
                  placeholder="e.g. SFO Airport"
                  required
                />
              </label>

              <label className="field-group">
                <span className="form-label">Account owner</span>
                <input
                  className="form-input"
                  type="text"
                  name="accountOwner"
                  value={formData.accountOwner}
                  onChange={handleGeneralChange}
                  placeholder="Commercial owner"
                />
              </label>

              <label className="field-group">
                <span className="form-label">Pipeline status</span>
                <select className="form-select" name="pipelineStatus" value={formData.pipelineStatus} onChange={handleGeneralChange}>
                  {PIPELINE_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label className="field-group">
                <span className="form-label">Client type</span>
                <select className="form-select" name="clientType" value={formData.clientType} onChange={handleGeneralChange}>
                  {CLIENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label className="field-group">
                <span className="form-label">Priority tier</span>
                <select className="form-select" name="priorityTier" value={formData.priorityTier} onChange={handleGeneralChange}>
                  {PRIORITY_TIERS.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </label>

              <label className="field-group">
                <span className="form-label">Partner rebate (%)</span>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  name="rebate"
                  value={formData.rebate}
                  onChange={handleGeneralChange}
                />
              </label>
            </div>
          </section>

          <section className="glass-card section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Workflow signals</p>
                <h2>What makes the deal actionable</h2>
              </div>
              <ToneBadge label={health.label} tone={health.tone} />
            </div>

            <div className="form-grid form-grid--three">
              <label className="field-group">
                <span className="form-label">Win probability (%)</span>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  name="winProbability"
                  value={formData.winProbability}
                  onChange={handleGeneralChange}
                />
              </label>

              <label className="field-group">
                <span className="form-label">Forecast quarter</span>
                <select className="form-select" name="forecastQuarter" value={formData.forecastQuarter} onChange={handleGeneralChange}>
                  <option value="">Unassigned</option>
                  {FORECAST_QUARTERS.map((quarter) => (
                    <option key={quarter} value={quarter}>{quarter}</option>
                  ))}
                </select>
              </label>

              <label className="field-group">
                <span className="form-label">Target launch date</span>
                <input
                  className="form-input"
                  type="date"
                  name="targetLaunchDate"
                  value={formData.targetLaunchDate}
                  onChange={handleGeneralChange}
                />
              </label>
            </div>

            <div className="form-grid form-grid--two">
              <label className="field-group">
                <span className="form-label">Next action</span>
                <input
                  className="form-input"
                  type="text"
                  name="nextAction"
                  value={formData.nextAction}
                  onChange={handleGeneralChange}
                  placeholder="e.g. pricing review with distributor"
                />
              </label>

              <label className="field-group">
                <span className="form-label">Next action due date</span>
                <input
                  className="form-input"
                  type="date"
                  name="nextActionDueDate"
                  value={formData.nextActionDueDate}
                  onChange={handleGeneralChange}
                />
              </label>
            </div>

            <label className="field-group">
              <span className="form-label">Commercial notes</span>
              <textarea
                className="form-input form-input--textarea"
                name="notes"
                value={formData.notes}
                onChange={handleGeneralChange}
                placeholder="What matters commercially, operationally, or politically on this account?"
                rows="4"
              />
            </label>

            {completeness.missingCritical.length > 0 && formData.pipelineStatus !== 'Closed' && (
              <div className="inline-warning">
                Missing for pipeline quality: {completeness.missingCritical.join(', ')}
              </div>
            )}
          </section>

          {isVending && (
            <section className="glass-card section-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Deal structure</p>
                  <h2>Vending economics</h2>
                </div>
              </div>

              <div className="toggle-row">
                <button
                  type="button"
                  className={`toggle-button ${formData.dealType === 'standard' ? 'is-active' : ''}`}
                  onClick={() => setFormData((currentFormData) => ({ ...currentFormData, dealType: 'standard' }))}
                >
                  Standard RTM
                </button>
                <button
                  type="button"
                  className={`toggle-button ${formData.dealType === 'revenue_share' ? 'is-active' : ''}`}
                  onClick={() => setFormData((currentFormData) => ({ ...currentFormData, dealType: 'revenue_share' }))}
                >
                  Revenue Share
                </button>
              </div>

              <div className="form-grid form-grid--two">
                <label className="field-group">
                  <span className="form-label">Number of machines</span>
                  <input className="form-input" type="number" min="0" name="numMachines" value={formData.numMachines} onChange={handleGeneralChange} />
                </label>

                <label className="field-group">
                  <span className="form-label">Machine cost per unit ($)</span>
                  <input className="form-input" type="number" min="0" name="machineCostPerUnit" value={formData.machineCostPerUnit} onChange={handleGeneralChange} />
                </label>
              </div>

              {isRevenueShare && (
                <div className="form-grid form-grid--two">
                  <label className="field-group">
                    <span className="form-label">Monthly minimum to partner ($)</span>
                    <input className="form-input" type="number" min="0" name="revenueShareMin" value={formData.revenueShareMin} onChange={handleGeneralChange} />
                  </label>

                  <label className="field-group">
                    <span className="form-label">Partner sales split (%)</span>
                    <input className="form-input" type="number" min="0" max="100" step="0.1" name="revenueSharePct" value={formData.revenueSharePct} onChange={handleGeneralChange} />
                  </label>
                </div>
              )}
            </section>
          )}

          <section className="glass-card section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Product forecasts</p>
                <h2>What drives the economics</h2>
              </div>
              <button type="button" className="btn btn-primary" onClick={addProduct}>
                + Add Product
              </button>
            </div>

            <div className="product-stack">
              {formData.products.map((product, index) => (
                <div key={`${product.productName}-${index}`} className="product-card">
                  <div className="product-card__header">
                    <div>
                      <p className="eyebrow">Product {index + 1}</p>
                      <h3>{product.productName}</h3>
                    </div>
                    {formData.products.length > 1 && (
                      <button type="button" className="btn btn-secondary btn-danger" onClick={() => removeProduct(index)}>
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="form-grid form-grid--three">
                    <label className="field-group">
                      <span className="form-label">RTD product</span>
                      <select className="form-select" name="productName" value={product.productName} onChange={(event) => handleProductChange(index, event)}>
                        {productList.map((option) => (
                          <option key={option.name} value={option.name}>{option.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="field-group">
                      <span className="form-label">Route to market</span>
                      <select className="form-select" name="routeToMarket" value={product.routeToMarket} onChange={(event) => handleProductChange(index, event)}>
                        {Object.keys(PRICING_TIERS).map((routeToMarket) => (
                          <option key={routeToMarket} value={routeToMarket}>{routeToMarket}</option>
                        ))}
                      </select>
                    </label>

                    <label className="field-group">
                      <span className="form-label">{isVending ? 'Locations' : 'Stores'}</span>
                      <input className="form-input" type="number" min="0" name="numStores" value={product.numStores} onChange={(event) => handleProductChange(index, event)} required />
                    </label>
                  </div>

                  <div className="form-grid form-grid--two">
                    <label className="field-group">
                      <span className="form-label">Base velocity (units/location/week)</span>
                      <input className="form-input" type="number" min="0" step="0.1" name="baseVelocity" value={product.baseVelocity} onChange={(event) => handleProductChange(index, event)} required />
                    </label>

                    <label className="field-group">
                      <span className="form-label">Retail SRP ($)</span>
                      <input className="form-input" type="number" min="0" step="0.01" name="srp" value={product.srp} onChange={(event) => handleProductChange(index, event)} />
                    </label>
                  </div>

                  <div className="form-grid form-grid--two">
                    <label className="field-group">
                      <span className="form-label">Slotting fixed fee ($)</span>
                      <input className="form-input" type="number" min="0" name="slottingFixed" value={product.slottingFixed} onChange={(event) => handleProductChange(index, event)} />
                    </label>

                    <label className="field-group">
                      <span className="form-label">Slotting free fill (units)</span>
                      <input className="form-input" type="number" min="0" name="slottingFreeFillQty" value={product.slottingFreeFillQty} onChange={(event) => handleProductChange(index, event)} />
                    </label>

                    <label className="field-group">
                      <span className="form-label">Total TPRs spend ($)</span>
                      <input className="form-input" type="number" min="0" name="tprs" value={product.tprs} onChange={(event) => handleProductChange(index, event)} />
                    </label>

                    <label className="field-group">
                      <span className="form-label">Total marketing spend ($)</span>
                      <input className="form-input" type="number" min="0" name="marketing" value={product.marketing} onChange={(event) => handleProductChange(index, event)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save retailer profile
            </button>
          </div>
        </form>
      </div>

      <aside className="form-layout__sidebar">
        <article className="glass-card snapshot-card">
          <p className="eyebrow">Deal snapshot</p>
          <h2>{formData.retailerName || 'Unnamed account'}</h2>

          <div className="split-metrics">
            <div>
              <span>Weekly units</span>
              <strong>{formatNumber(weeklyUnits)}</strong>
            </div>
            <div>
              <span>Health</span>
              <strong>{health.label}</strong>
            </div>
            <div>
              <span>Raw revenue</span>
              <strong>{formatCompactCurrency(roi.huel.year1GrossRevenue)}</strong>
            </div>
            <div>
              <span>Weighted revenue</span>
              <strong>{formatCompactCurrency(weightedRevenue)}</strong>
            </div>
            <div>
              <span>Raw EBITDA</span>
              <strong className={roi.huel.year1Ebitda >= 0 ? 'text-success' : 'text-danger'}>
                {formatCompactCurrency(roi.huel.year1Ebitda)}
              </strong>
            </div>
            <div>
              <span>Weighted EBITDA</span>
              <strong className={weightedEbitda >= 0 ? 'text-success' : 'text-danger'}>
                {formatCompactCurrency(weightedEbitda)}
              </strong>
            </div>
          </div>

          <div className="snapshot-card__footer">
            <p>Trade rate: <strong>{formatPercent(roi.huel.tradeRatePercent)}</strong></p>
            <p>Breakeven: <strong>{roi.huel.breakevenMonths > 0 ? `${roi.huel.breakevenMonths.toFixed(1)} months` : 'Immediate'}</strong></p>
          </div>
        </article>
      </aside>
    </div>
  )
}

function ToneBadge({ label, tone }) {
  return <span className={`tone-pill tone-pill--${tone}`}>{label}</span>
}
