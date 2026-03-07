import { CLIENT_TYPES, PIPELINE_STATUSES, PRIORITY_TIERS } from '../utils/clientStore'

const HEALTH_OPTIONS = ['Healthy', 'Watch', 'At Risk']

export default function PortfolioFilters({
  filters,
  filteredCount,
  totalCount,
  options,
  onChange,
  onClear,
}) {
  return (
    <section className="portfolio-filters">
      <div className="portfolio-filters__header">
        <div>
          <p className="eyebrow">Portfolio Filters</p>
          <h2>Search the portfolio the way commercial ops actually works</h2>
        </div>

        <div className="portfolio-filters__meta">
          <span className="meta-pill">
            {filteredCount} of {totalCount} accounts
          </span>
          <button type="button" className="btn btn-secondary" onClick={onClear}>
            Clear filters
          </button>
        </div>
      </div>

      <div className="filters-grid">
        <label className="filter-field filter-field--search">
          <span className="filter-field__label">Search</span>
          <input
            className="form-input"
            type="search"
            value={filters.search}
            placeholder="Retailer, owner, note, product"
            onChange={(event) => onChange('search', event.target.value)}
          />
        </label>

        <label className="filter-field">
          <span className="filter-field__label">Status</span>
          <select
            className="form-select"
            value={filters.status}
            onChange={(event) => onChange('status', event.target.value)}
          >
            <option value="all">All statuses</option>
            {PIPELINE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-field__label">Client type</span>
          <select
            className="form-select"
            value={filters.clientType}
            onChange={(event) => onChange('clientType', event.target.value)}
          >
            <option value="all">All types</option>
            {CLIENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-field__label">Owner</span>
          <select
            className="form-select"
            value={filters.owner}
            onChange={(event) => onChange('owner', event.target.value)}
          >
            <option value="all">All owners</option>
            {options.owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-field__label">Priority</span>
          <select
            className="form-select"
            value={filters.priority}
            onChange={(event) => onChange('priority', event.target.value)}
          >
            <option value="all">All priorities</option>
            {PRIORITY_TIERS.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-field__label">Route to market</span>
          <select
            className="form-select"
            value={filters.routeToMarket}
            onChange={(event) => onChange('routeToMarket', event.target.value)}
          >
            <option value="all">All routes</option>
            {options.routeToMarkets.map((routeToMarket) => (
              <option key={routeToMarket} value={routeToMarket}>
                {routeToMarket}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-field__label">Health</span>
          <select
            className="form-select"
            value={filters.health}
            onChange={(event) => onChange('health', event.target.value)}
          >
            <option value="all">All health states</option>
            {HEALTH_OPTIONS.map((health) => (
              <option key={health} value={health}>
                {health}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
