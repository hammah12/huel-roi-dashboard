import React, { useState } from 'react';
import { calculateROI } from '../utils/calculations';
import AnalyticsCharts from './AnalyticsCharts';

// ── Client types (shared across components) ──────────────────────────────────
const CLIENT_TYPES = ['Vending', 'Micromarket', 'Airport Concessions', 'Food Service'];

// ── Filter config ─────────────────────────────────────────────────────────────
const FILTERS = [
    { key: 'all',      label: 'All' },
    { key: 'live',     label: 'Live',     match: ['Closed'] },
    { key: 'pipeline', label: 'Pipeline', match: ['Hot Pipeline', 'High Interest', 'Prospect'] },
];

// ── Shared formatters ─────────────────────────────────────────────────────────
const fmtCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
const fmtPercent = (val) =>
    new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(val);

// ── Helpers ───────────────────────────────────────────────────────────────────

// Number of physical locations for a client (max numStores across products)
const getClientLocations = (client) => {
    const products = client.products || [client];
    return Math.max(...products.map(p => Number(p.numStores) || 0), 0);
};

// Pipeline status badge config
const STATUS_CONFIG = {
    'Closed':        { label: 'Live',         bg: '#1a7f4b', color: '#fff' },
    'Hot Pipeline':  { label: 'Hot Pipeline',  bg: 'var(--huel-pink)', color: '#fff' },
    'High Interest': { label: 'High Interest', bg: 'var(--huel-blue)', color: '#fff' },
    'Prospect':      { label: 'Prospect',      bg: '#888', color: '#fff' },
};

// ── LeadCard ─────────────────────────────────────────────────────────────────
function LeadCard({ client, index, isEditMode, onEdit, onRemove, onConvert }) {
    const roi = calculateROI(client);
    const { huel } = roi;

    const productsList = client.products || [client];
    const productNames = productsList.map(p => p.productName).join(', ');
    const totalStores = getClientLocations(client);
    const statusBadge = STATUS_CONFIG[client.pipelineStatus] || STATUS_CONFIG['Prospect'];

    return (
        <div
            className="glass-card"
            style={{
                padding: '1rem 1.25rem',
                borderTop: '3px solid var(--border-light)',
            }}
        >
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                <div>
                    <h3 style={{ margin: 0, marginBottom: '4px', fontSize: '0.95rem', color: 'var(--huel-dark)' }}>
                        {client.retailerName}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {client.clientType || 'Vending'}
                        </span>
                        <span style={{
                            fontSize: '0.65rem', fontWeight: 700,
                            padding: '2px 8px',
                            background: statusBadge.bg, color: statusBadge.color,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                            {statusBadge.label}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--huel-mid-gray)' }}>
                            {productNames}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => onConvert(index)}
                    style={{
                        padding: '0.4rem 1rem',
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: '#1a7f4b',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        flexShrink: 0,
                        marginLeft: '0.75rem',
                    }}
                >
                    Convert →
                </button>
            </div>

            {/* Stats row */}
            <div style={{
                display: 'flex',
                gap: '1.5rem',
                borderTop: '1px solid var(--border-light)',
                paddingTop: '0.65rem',
                alignItems: 'center',
                flexWrap: 'wrap',
            }}>
                <div>
                    <p className="form-label" style={{ margin: '0 0 2px' }}>Locations</p>
                    <p className="font-bold" style={{ color: 'var(--huel-dark)', margin: 0 }}>
                        {totalStores.toLocaleString()}
                    </p>
                </div>
                <div>
                    <p className="form-label" style={{ margin: '0 0 2px' }}>Est. Yr 1 Revenue</p>
                    <p className="font-bold" style={{ color: 'var(--huel-dark)', margin: 0 }}>
                        {fmtCurrency(huel.year1GrossRevenue)}
                    </p>
                </div>
                <div>
                    <p className="form-label" style={{ margin: '0 0 2px' }}>Est. EBITDA</p>
                    <p className={`font-bold ${huel.year1Ebitda >= 0 ? 'text-success' : 'text-danger'}`} style={{ margin: 0 }}>
                        {fmtCurrency(huel.year1Ebitda)}
                    </p>
                </div>
                <div>
                    <p className="form-label" style={{ margin: '0 0 2px' }}>Trade Rate</p>
                    <p className="font-bold" style={{ color: 'var(--huel-dark)', margin: 0 }}>
                        {fmtPercent(huel.tradeRatePercent)}
                    </p>
                </div>

                {isEditMode && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}
                            onClick={() => onEdit(index)}
                        >Edit</button>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', color: 'var(--huel-pink)' }}
                            onClick={() => onRemove(index)}
                        >Delete</button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── DashboardCard ─────────────────────────────────────────────────────────────
function DashboardCard({ client, index, isEditMode, onEdit, onDuplicate, onRemove }) {
    const roi = calculateROI(client);
    const { huel, retailer } = roi;

    const productsList = client.products || [client];
    const productNames = productsList.map(p => p.productName).join(', ');
    const totalStores = productsList.reduce((sum, p) => sum + (Number(p.numStores) || 0), 0);
    const totalMachineLocations = huel.numMachines || (client.clientType === 'Vending' ? totalStores : 0);

    const shortName = (name = '') => {
        const parts = name.split(' ');
        return parts.length > 1 ? parts.slice(1).join(' ') : name;
    };
    const weeklyUnitBreakdown = productsList
        .map(p => ({
            units: (Number(p.numStores) || 0) * (Number(p.baseVelocity) || 0),
            label: shortName(p.productName),
        }))
        .filter(p => p.units > 0);
    const totalWeeklyUnits = weeklyUnitBreakdown.reduce((s, p) => s + p.units, 0);
    const weeklyBreakdownStr = weeklyUnitBreakdown.map(p => `${p.units % 1 === 0 ? p.units : p.units.toFixed(1)} ${p.label}`).join(' · ');

    const breakevenCapped = Math.min(huel.breakevenMonths, 24);
    const breakevenPct = Math.round((breakevenCapped / 24) * 100);
    const isHealthy = huel.breakevenMonths <= 12 || huel.breakevenMonths === 0;
    const isRevenueShare = huel.isRevenueShare;

    const statusBadge = STATUS_CONFIG[client.pipelineStatus] || null;

    const statRow = { marginBottom: '0.85rem' };
    const statLabel = { marginBottom: '2px' };

    return (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div className="kpi-card-accent" style={{ background: isHealthy ? 'var(--huel-green)' : 'var(--huel-pink)' }} />

            {/* Header */}
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ color: 'var(--huel-dark)', margin: 0, marginBottom: '5px' }}>
                        {client.retailerName}
                    </h3>
                    {isEditMode && (
                        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }} onClick={() => onEdit(index)}>Edit</button>
                            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }} onClick={() => onDuplicate(index)}>Copy</button>
                            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', color: 'var(--huel-pink)' }} onClick={() => onRemove(index)}>Delete</button>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {client.clientType || 'Vending'}
                    </span>
                    {isRevenueShare && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', background: 'var(--huel-blue)', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Rev Share
                        </span>
                    )}
                    {statusBadge && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', background: statusBadge.bg, color: statusBadge.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {statusBadge.label}
                        </span>
                    )}
                </div>
                <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: 'var(--huel-dark)', fontWeight: 600 }}>
                    {productNames}
                </p>
            </div>

            {/* Core metrics (2 col) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem', marginBottom: '1rem' }}>
                <div>
                    <div style={statRow}>
                        <p className="form-label" style={statLabel}>{client.clientType === 'Vending' ? 'Locations' : 'Stores'}</p>
                        <p className="font-bold" style={{ color: 'var(--huel-dark)' }}>{totalStores.toLocaleString()}</p>
                    </div>
                    <div style={statRow}>
                        <p className="form-label" style={statLabel}>Weekly Units</p>
                        <p className="font-bold" style={{ color: 'var(--huel-dark)', marginBottom: '2px' }}>
                            {totalWeeklyUnits % 1 === 0 ? totalWeeklyUnits.toLocaleString() : totalWeeklyUnits.toFixed(1)}
                        </p>
                        {weeklyUnitBreakdown.length > 1 && (
                            <p style={{ fontSize: '0.68rem', color: 'var(--huel-mid-gray)', margin: 0 }}>{weeklyBreakdownStr}</p>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <div>
                            <p className="form-label" style={statLabel}>Monthly Units</p>
                            <p className="font-bold" style={{ color: 'var(--huel-dark)' }}>{Math.round((huel.annualUnits || 0) / 12).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="form-label" style={statLabel}>Trade Rate</p>
                            <p className="font-bold" style={{ color: 'var(--huel-dark)' }}>{fmtPercent(huel.tradeRatePercent)}</p>
                        </div>
                    </div>
                </div>
                <div>
                    <div style={statRow}>
                        <p className="form-label" style={statLabel}>Yr 1 Revenue</p>
                        <p className="font-bold" style={{ color: 'var(--huel-dark)', fontSize: '1.05rem' }}>{fmtCurrency(huel.year1GrossRevenue)}</p>
                    </div>
                    <div style={statRow}>
                        <p className="form-label" style={statLabel}>Gross Profit</p>
                        <p className="font-bold text-success" style={{ fontSize: '1.05rem' }}>{fmtCurrency(huel.year1GrossProfit)}</p>
                    </div>
                    <div>
                        <p className="form-label" style={statLabel}>EBITDA</p>
                        <p className={`font-bold ${huel.year1Ebitda >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1.05rem' }}>
                            {fmtCurrency(huel.year1Ebitda)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Revenue share detail panel */}
            {isRevenueShare && (
                <div style={{
                    background: 'rgba(0,86,179,0.05)',
                    border: '1px solid rgba(0,86,179,0.18)',
                    borderLeft: '3px solid var(--huel-blue)',
                    padding: '0.65rem 0.85rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.78rem',
                }}>
                    <div style={{ fontWeight: 700, color: 'var(--huel-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.68rem', marginBottom: '6px' }}>
                        Revenue Share Deal
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--huel-dark)', marginBottom: '3px' }}>
                        <span>Min to Partner</span>
                        <span style={{ fontWeight: 700 }}>{fmtCurrency(huel.revenueShareMinMonthly)}/mo · {fmtCurrency(huel.revenueShareMin)}/yr</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--huel-dark)', marginBottom: '3px' }}>
                        <span>Partner Split</span>
                        <span style={{ fontWeight: 700 }}>{(huel.revenueSharePct * 100).toFixed(0)}% of retail sales</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--huel-dark)', marginTop: '5px', paddingTop: '5px', borderTop: '1px solid rgba(0,86,179,0.15)' }}>
                        <span>Partner Payout (Yr 1)</span>
                        <span style={{ fontWeight: 700, color: 'var(--huel-pink)' }}>−{fmtCurrency(huel.totalPartnerPayout)}</span>
                    </div>
                </div>
            )}

            {/* Footer strip */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {huel.totalMachineCost > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Machine Cost ({totalMachineLocations} units)
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--huel-pink)' }}>
                            −{fmtCurrency(huel.totalMachineCost)}
                        </span>
                    </div>
                )}
                {huel.totalRebate > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Partner Rebate ({fmtPercent(huel.rebatePct)})
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--huel-pink)' }}>
                            −{fmtCurrency(huel.totalRebate)}
                        </span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Retailer Margin
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--huel-dark)' }}>
                        {fmtPercent(retailer.marginPercent)}
                    </span>
                </div>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Breakeven</span>
                        <span className={`font-bold ${isHealthy ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.82rem' }}>
                            {huel.breakevenMonths > 0 ? `${huel.breakevenMonths.toFixed(1)} mo` : 'Immediate'}
                        </span>
                    </div>
                    <div className="breakeven-bar-track">
                        <div className="breakeven-bar-fill" style={{ width: `${breakevenPct}%`, background: isHealthy ? 'var(--huel-blue)' : 'var(--huel-pink)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.62rem', color: 'var(--huel-mid-gray)' }}>0</span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--huel-mid-gray)' }}>24 mo</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DashboardOverview({ clients, onEdit, onDuplicate, onRemove, onConvert }) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');

    // Split into live vs leads
    const liveClients  = clients.filter(c => c.pipelineStatus === 'Closed');
    const leadClients  = clients.filter(c => c.pipelineStatus !== 'Closed');

    // Filter-aware client set for KPI cards
    const filteredForKPI = activeFilter === 'live'
        ? liveClients
        : activeFilter === 'pipeline'
        ? leadClients
        : clients;

    // KPI aggregates (filter-aware)
    const totalRevenue = filteredForKPI.reduce((sum, c) => sum + calculateROI(c).huel.year1GrossRevenue, 0);
    const totalProfit  = filteredForKPI.reduce((sum, c) => sum + calculateROI(c).huel.year1GrossProfit,  0);
    const totalTrade   = filteredForKPI.reduce((sum, c) => sum + calculateROI(c).huel.totalTradeExpenses, 0);
    const totalEbitda  = filteredForKPI.reduce((sum, c) => sum + calculateROI(c).huel.year1Ebitda,       0);
    const portfolioEbitdaPct = totalRevenue > 0 ? totalEbitda / totalRevenue : 0;

    // KPI label suffix so user knows what the numbers represent
    const kpiLabel = activeFilter === 'live' ? '(Live)' : activeFilter === 'pipeline' ? '(Pipeline)' : '(All)';

    const kpiCards = [
        { label: `Yr 1 Gross Revenue ${kpiLabel}`, value: fmtCurrency(totalRevenue),  accent: 'var(--huel-blue)',  valueClass: '' },
        { label: `Yr 1 Gross Profit ${kpiLabel}`,  value: fmtCurrency(totalProfit),   accent: 'var(--huel-green)', valueClass: 'text-success' },
        { label: `Total Trade Spend ${kpiLabel}`,   value: fmtCurrency(totalTrade),    accent: 'var(--huel-pink)',  valueClass: 'text-danger' },
        {
            label: `Portfolio EBITDA ${kpiLabel}`,
            value: `${fmtCurrency(totalEbitda)} (${fmtPercent(portfolioEbitdaPct)})`,
            accent: totalEbitda >= 0 ? 'var(--huel-blue)' : 'var(--huel-pink)',
            valueClass: totalEbitda >= 0 ? 'text-success' : 'text-danger'
        },
    ];

    // Location summary — ALWAYS from live (Closed) clients only
    const totalLiveLocations    = liveClients.reduce((sum, c) => sum + getClientLocations(c), 0);
    const vendingLocations      = liveClients.filter(c => (c.clientType || 'Vending') === 'Vending').reduce((sum, c) => sum + getClientLocations(c), 0);
    const micromarketLocations  = liveClients.filter(c => c.clientType === 'Micromarket').reduce((sum, c) => sum + getClientLocations(c), 0);
    const concessionLocations   = liveClients.filter(c => c.clientType === 'Airport Concessions').reduce((sum, c) => sum + getClientLocations(c), 0);

    const locationCards = [
        { label: 'Total Live Locations',  value: totalLiveLocations,   accent: '#1a7f4b' },
        { label: 'Vending Locations',     value: vendingLocations,      accent: 'var(--huel-blue)' },
        { label: 'Micromarket Locations', value: micromarketLocations,  accent: '#7b4fbf' },
        { label: 'Concession Locations',  value: concessionLocations,   accent: 'var(--huel-pink)' },
    ];

    // What to show in retailer breakdown section
    const showLiveSection  = activeFilter === 'all' || activeFilter === 'live';
    const showLeadsSection = activeFilter === 'all' || activeFilter === 'pipeline';

    return (
        <div>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 style={{ marginBottom: '4px' }}>Master Dashboard</h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--huel-mid-gray)' }}>
                        {liveClients.length} live · {leadClients.length} in pipeline
                    </p>
                </div>
                <button
                    className={`btn ${isEditMode ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setIsEditMode(!isEditMode)}
                >
                    {isEditMode ? 'Done' : 'Edit Retailers'}
                </button>
            </div>

            {/* ── Location Summary (always live data) ────────────────────── */}
            <div style={{ marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--huel-mid-gray)', marginBottom: '0.6rem' }}>
                    Live Footprint
                </p>
            </div>
            <div className="grid grid-cols-4 mb-8">
                {locationCards.map((card) => (
                    <div key={card.label} className="glass-card" style={{ padding: '1rem 1.25rem' }}>
                        <div className="kpi-card-accent" style={{ background: card.accent }} />
                        <p className="form-label" style={{ marginBottom: '4px', fontSize: '0.65rem' }}>{card.label}</p>
                        <p className="font-bold" style={{ fontSize: '2rem', color: 'var(--huel-dark)', marginBottom: '2px', lineHeight: 1 }}>
                            {card.value.toLocaleString()}
                        </p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            locations
                        </p>
                    </div>
                ))}
            </div>

            {/* ── KPI Cards (filter-aware) ────────────────────────────────── */}
            <div className="grid grid-cols-4 mb-8">
                {kpiCards.map((kpi) => (
                    <div key={kpi.label} className="glass-card" style={{ padding: '1.25rem' }}>
                        <div className="kpi-card-accent" style={{ background: kpi.accent }} />
                        <p className="form-label" style={{ marginBottom: '6px' }}>{kpi.label}</p>
                        <p className={`font-bold ${kpi.valueClass}`} style={{ fontSize: '1.25rem', color: 'var(--huel-dark)' }}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Monthly Units Breakdown ─────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="glass-card">
                    <div className="kpi-card-accent" style={{ background: 'var(--huel-blue)' }} />
                    <h3 style={{ marginBottom: '1.25rem', color: 'var(--huel-dark)', fontFamily: 'var(--font-heading)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Monthly Units by Type
                    </h3>
                    <div className="grid grid-cols-1" style={{ gap: '1rem' }}>
                        {CLIENT_TYPES.map(type => {
                            const unitsForType = liveClients
                                .filter(c => (c.clientType || 'Vending') === type)
                                .reduce((sum, c) => sum + (calculateROI(c).huel.annualUnits || 0), 0);
                            return (
                                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                                    <span className="form-label" style={{ margin: 0 }}>{type}</span>
                                    <span className="font-bold" style={{ fontSize: '1.1rem', color: unitsForType > 0 ? 'var(--huel-dark)' : 'var(--huel-mid-gray)' }}>
                                        {unitsForType > 0 ? Math.round(unitsForType / 12).toLocaleString() : '—'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="glass-card">
                    <div className="kpi-card-accent" style={{ background: 'var(--huel-green)' }} />
                    <h3 style={{ marginBottom: '1.25rem', color: 'var(--huel-dark)', fontFamily: 'var(--font-heading)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Monthly Units by Product
                    </h3>
                    <div className="grid grid-cols-1" style={{ gap: '1rem' }}>
                        {(liveClients.length > 0
                            ? Array.from(new Set(liveClients.flatMap(c => (c.products || [c]).map(p => p.productName))))
                            : []
                        ).map(prodName => {
                            const unitsForProd = liveClients.reduce((sum, c) => {
                                const products = c.products || [c];
                                return sum + products
                                    .filter(p => p.productName === prodName)
                                    .reduce((s, p) => s + (Number(p.numStores) || 0) * (Number(p.baseVelocity) || 0) * 52, 0);
                            }, 0);
                            return (
                                <div key={prodName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                                    <span className="form-label" style={{ margin: 0 }}>{prodName}</span>
                                    <span className="font-bold" style={{ fontSize: '1.1rem', color: 'var(--huel-dark)' }}>
                                        {Math.round(unitsForProd / 12).toLocaleString()}
                                    </span>
                                </div>
                            );
                        })}
                        {liveClients.length === 0 && (
                            <p style={{ color: 'var(--huel-mid-gray)', fontSize: '0.85rem' }}>No live accounts yet.</p>
                        )}
                    </div>
                </div>
            </div>

            <AnalyticsCharts clients={liveClients} />

            {/* ── Retailer Breakdown header + filter bar ──────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0 }}>Retailer Breakdown</h2>
                <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border-light)' }}>
                    {FILTERS.map((f, i) => {
                        const count = f.key === 'all'
                            ? clients.length
                            : f.key === 'live'
                            ? liveClients.length
                            : leadClients.length;
                        const isActive = activeFilter === f.key;
                        return (
                            <button
                                key={f.key}
                                onClick={() => setActiveFilter(f.key)}
                                style={{
                                    padding: '0.4rem 0.9rem',
                                    fontSize: '0.75rem',
                                    fontFamily: 'var(--font-heading)',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    border: 'none',
                                    borderRight: i < FILTERS.length - 1 ? '1px solid var(--border-light)' : 'none',
                                    cursor: 'pointer',
                                    background: isActive ? 'var(--huel-dark)' : 'transparent',
                                    color: isActive ? '#fff' : 'var(--huel-mid-gray)',
                                    transition: 'background 0.15s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                }}
                            >
                                {f.label}
                                <span style={{
                                    fontSize: '0.65rem',
                                    padding: '1px 5px',
                                    background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--huel-light-gray)',
                                    color: isActive ? '#fff' : 'var(--huel-mid-gray)',
                                    fontWeight: 700,
                                }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {clients.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <h2>No Retailers Added Yet</h2>
                    <p>Get started by adding a new retailer configuration.</p>
                </div>
            ) : (
                <>
                    {/* ── Live accounts ─────────────────────────────────────── */}
                    {showLiveSection && (
                        <>
                            {activeFilter === 'all' && liveClients.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1a7f4b', margin: 0 }}>
                                        Live Accounts
                                    </p>
                                    <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                                    <span style={{ fontSize: '0.68rem', color: 'var(--huel-mid-gray)' }}>{liveClients.length}</span>
                                </div>
                            )}
                            {liveClients.length === 0 && activeFilter !== 'all' ? (
                                <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', marginBottom: '1.5rem' }}>
                                    <p style={{ color: 'var(--huel-mid-gray)' }}>No live accounts yet.</p>
                                </div>
                            ) : (
                                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: leadClients.length > 0 && showLeadsSection ? '2.5rem' : 0 }}>
                                    {liveClients.map((client) => {
                                        const index = clients.indexOf(client);
                                        return (
                                            <DashboardCard
                                                key={index}
                                                index={index}
                                                client={client}
                                                isEditMode={isEditMode}
                                                onEdit={onEdit}
                                                onDuplicate={onDuplicate}
                                                onRemove={onRemove}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Leads section ─────────────────────────────────────── */}
                    {showLeadsSection && leadClients.length > 0 && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <p style={{ fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--huel-mid-gray)', margin: 0 }}>
                                    Pipeline Leads
                                </p>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                                <span style={{
                                    fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px',
                                    background: 'var(--huel-light-gray)', color: 'var(--huel-mid-gray)',
                                }}>
                                    {leadClients.length} {leadClients.length === 1 ? 'account' : 'accounts'} — click Convert → to move to Live
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {leadClients.map((client) => {
                                    const index = clients.indexOf(client);
                                    return (
                                        <LeadCard
                                            key={index}
                                            index={index}
                                            client={client}
                                            isEditMode={isEditMode}
                                            onEdit={onEdit}
                                            onRemove={onRemove}
                                            onConvert={onConvert}
                                        />
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {showLeadsSection && leadClients.length === 0 && activeFilter === 'pipeline' && (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                            <p style={{ color: 'var(--huel-mid-gray)' }}>No pipeline leads. Add an account with a pipeline status to see it here.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
