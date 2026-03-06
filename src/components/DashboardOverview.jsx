import React, { useState } from 'react';
import { calculateROI } from '../utils/calculations';
import AnalyticsCharts from './AnalyticsCharts';

function DashboardCard({ client, index, isEditMode, onEdit, onDuplicate, onRemove }) {
    const roi = calculateROI(client);
    const { huel, retailer } = roi;

    const productsList = client.products || [client];
    const productNames = productsList.map(p => p.productName).join(', ');
    const totalStores = productsList.reduce((sum, p) => sum + (Number(p.numStores) || 0), 0);
    const totalMachineLocations = huel.numMachines || (client.clientType === 'Vending' ? totalStores : 0);

    // Weekly unit assumptions per product, e.g. "7 BE RTD · 14 DG RTD"
    // Short name = everything after the first word ("Huel "), or full name if no space
    const shortName = (name = '') => {
        const parts = name.split(' ');
        return parts.length > 1 ? parts.slice(1).join(' ') : name;
    };
    const weeklyUnitBreakdown = productsList
        .map(p => {
            const units = (Number(p.numStores) || 0) * (Number(p.baseVelocity) || 0);
            const label = shortName(p.productName);
            return { units, label };
        })
        .filter(p => p.units > 0);
    const totalWeeklyUnits = weeklyUnitBreakdown.reduce((s, p) => s + p.units, 0);
    const weeklyBreakdownStr = weeklyUnitBreakdown.map(p => `${p.units % 1 === 0 ? p.units : p.units.toFixed(1)} ${p.label}`).join(' · ');

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
    const formatPercent = (val) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(val);

    // Breakeven bar: cap at 24 months for visual scale
    const breakevenCapped = Math.min(huel.breakevenMonths, 24);
    const breakevenPct = Math.round((breakevenCapped / 24) * 100);
    const isHealthy = huel.breakevenMonths <= 12 || huel.breakevenMonths === 0;

    // Vending-specific: revenue share deal?
    const isRevenueShare = huel.isRevenueShare;

    // Pipeline status badge config
    const statusConfig = {
        'Closed':        { label: 'Closed', bg: '#1a7f4b', color: '#fff' },
        'Hot Pipeline':  { label: 'Hot Pipeline', bg: 'var(--huel-pink)', color: '#fff' },
        'High Interest': { label: 'High Interest', bg: 'var(--huel-blue)', color: '#fff' },
        'Prospect':      { label: 'Prospect', bg: '#888', color: '#fff' },
    };
    const statusBadge = statusConfig[client.pipelineStatus] || null;

    // Reusable stat row style
    const statRow = { marginBottom: '0.85rem' };
    const statLabel = { marginBottom: '2px' };

    return (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
            {/* Colour accent strip */}
            <div className="kpi-card-accent" style={{ background: isHealthy ? 'var(--huel-green)' : 'var(--huel-pink)' }} />

            {/* ── Header ───────────────────────────────────────────────── */}
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
                {/* Type · Rev Share · Pipeline Status badges */}
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
                {/* Products as a subtle tag line */}
                <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: 'var(--huel-dark)', fontWeight: 600 }}>
                    {productNames}
                </p>
            </div>

            {/* ── Core metrics (2 col) ─────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem', marginBottom: '1rem' }}>

                {/* Left — volume stats */}
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

                    {/* Monthly Units + Trade Rate side by side */}
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <div>
                            <p className="form-label" style={statLabel}>Monthly Units</p>
                            <p className="font-bold" style={{ color: 'var(--huel-dark)' }}>{Math.round((huel.annualUnits || 0) / 12).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="form-label" style={statLabel}>Trade Rate</p>
                            <p className="font-bold" style={{ color: 'var(--huel-dark)' }}>{formatPercent(huel.tradeRatePercent)}</p>
                        </div>
                    </div>
                </div>

                {/* Right — financials */}
                <div>
                    <div style={statRow}>
                        <p className="form-label" style={statLabel}>Yr 1 Revenue</p>
                        <p className="font-bold" style={{ color: 'var(--huel-dark)', fontSize: '1.05rem' }}>{formatCurrency(huel.year1GrossRevenue)}</p>
                    </div>

                    <div style={statRow}>
                        <p className="form-label" style={statLabel}>Gross Profit</p>
                        <p className="font-bold text-success" style={{ fontSize: '1.05rem' }}>{formatCurrency(huel.year1GrossProfit)}</p>
                    </div>

                    <div>
                        <p className="form-label" style={statLabel}>EBITDA</p>
                        <p className={`font-bold ${huel.year1Ebitda >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1.05rem' }}>
                            {formatCurrency(huel.year1Ebitda)}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Revenue Share detail panel ───────────────────────────── */}
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
                        <span style={{ fontWeight: 700 }}>{formatCurrency(huel.revenueShareMinMonthly)}/mo · {formatCurrency(huel.revenueShareMin)}/yr</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--huel-dark)', marginBottom: '3px' }}>
                        <span>Partner Split</span>
                        <span style={{ fontWeight: 700 }}>{(huel.revenueSharePct * 100).toFixed(0)}% of retail sales</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--huel-dark)', marginTop: '5px', paddingTop: '5px', borderTop: '1px solid rgba(0,86,179,0.15)' }}>
                        <span>Partner Payout (Yr 1)</span>
                        <span style={{ fontWeight: 700, color: 'var(--huel-pink)' }}>−{formatCurrency(huel.totalPartnerPayout)}</span>
                    </div>
                </div>
            )}

            {/* ── Footer strip: machine cost · retailer margin · breakeven ─ */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

                {/* Machine cost row (conditional) */}
                {huel.totalMachineCost > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Machine Cost ({totalMachineLocations} units)
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--huel-pink)' }}>
                            −{formatCurrency(huel.totalMachineCost)}
                        </span>
                    </div>
                )}

                {/* Rebate row (conditional) */}
                {huel.totalRebate > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Partner Rebate ({formatPercent(huel.rebatePct)})
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--huel-pink)' }}>
                            −{formatCurrency(huel.totalRebate)}
                        </span>
                    </div>
                )}

                {/* Retailer margin + breakeven on one row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Retailer Margin
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--huel-dark)' }}>
                        {formatPercent(retailer.marginPercent)}
                    </span>
                </div>

                {/* Breakeven bar */}
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

// Filter options for the retailer breakdown
const FILTERS = [
    { key: 'all',      label: 'All' },
    { key: 'live',     label: 'Live',    match: ['Closed'] },
    { key: 'pipeline', label: 'Pipeline', match: ['Hot Pipeline', 'High Interest', 'Prospect'] },
];

export default function DashboardOverview({ clients, onEdit, onDuplicate, onRemove }) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
    const formatPercent = (val) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(val);

    // Aggregate calculations
    const totalRevenue = clients.reduce((sum, c) => sum + calculateROI(c).huel.year1GrossRevenue, 0);
    const totalProfit = clients.reduce((sum, c) => sum + calculateROI(c).huel.year1GrossProfit, 0);
    const totalTrade = clients.reduce((sum, c) => sum + calculateROI(c).huel.totalTradeExpenses, 0);
    const totalEbitda = clients.reduce((sum, c) => sum + calculateROI(c).huel.year1Ebitda, 0);
    const portfolioEbitdaPct = totalRevenue > 0 ? totalEbitda / totalRevenue : 0;

    const kpiCards = [
        { label: 'Yr 1 Gross Revenue', value: formatCurrency(totalRevenue), accent: 'var(--huel-blue)', valueClass: '' },
        { label: 'Yr 1 Gross Profit', value: formatCurrency(totalProfit), accent: 'var(--huel-green)', valueClass: 'text-success' },
        { label: 'Total Trade Spend', value: formatCurrency(totalTrade), accent: 'var(--huel-pink)', valueClass: 'text-danger' },
        { label: 'Portfolio EBITDA', value: `${formatCurrency(totalEbitda)} (${formatPercent(portfolioEbitdaPct)})`, accent: totalEbitda >= 0 ? 'var(--huel-blue)' : 'var(--huel-pink)', valueClass: totalEbitda >= 0 ? 'text-success' : 'text-danger' },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 style={{ marginBottom: '4px' }}>Master Dashboard</h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--huel-mid-gray)' }}>
                        {clients.length} retailer{clients.length !== 1 ? 's' : ''} · Year 1 forecast
                    </p>
                </div>
                <button
                    className={`btn ${isEditMode ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setIsEditMode(!isEditMode)}
                >
                    {isEditMode ? 'Done' : 'Edit Retailers'}
                </button>
            </div>

            {/* 4-up KPI cards */}
            <div className="grid grid-cols-4 mb-8">
                {kpiCards.map((kpi) => (
                    <div key={kpi.label} className="glass-card" style={{ padding: '1.25rem' }}>
                        <div className="kpi-card-accent" style={{ background: kpi.accent }} />
                        <p className="form-label" style={{ marginBottom: '6px' }}>{kpi.label}</p>
                        <p className={`font-bold ${kpi.valueClass}`} style={{ fontSize: '1.25rem', color: 'var(--huel-dark)' }}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Annual Units by Type breakdown */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="glass-card">
                    <div className="kpi-card-accent" style={{ background: 'var(--huel-blue)' }} />
                    <h3 style={{ marginBottom: '1.25rem', color: 'var(--huel-dark)', fontFamily: 'var(--font-heading)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Monthly Units by Type
                    </h3>
                    <div className="grid grid-cols-1" style={{ gap: '1rem' }}>
                        {['Vending', 'Airport Concessions', 'Food Service'].map(type => {
                            const unitsForType = clients
                                .filter(c => (c.clientType || 'Vending') === type)
                                .reduce((sum, c) => sum + (calculateROI(c).huel.annualUnits || 0), 0);
                            return (
                                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                                    <span className="form-label" style={{ margin: 0 }}>{type}</span>
                                    <span className="font-bold" style={{ fontSize: '1.1rem', color: 'var(--huel-dark)' }}>
                                        {Math.round(unitsForType / 12).toLocaleString()}
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
                        {(clients.length > 0 ? Array.from(new Set(clients.flatMap(c => (c.products || [c]).map(p => p.productName)))) : []).map(prodName => {
                            const unitsForProd = clients.reduce((sum, c) => {
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
                    </div>
                </div>
            </div>

            <AnalyticsCharts clients={clients} />

            {/* ── Retailer Breakdown header + filter bar ─────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0 }}>Retailer Breakdown</h2>
                <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border-light)' }}>
                    {FILTERS.map((f, i) => {
                        const count = f.key === 'all'
                            ? clients.length
                            : clients.filter(c => (f.match || []).includes(c.pipelineStatus || 'Prospect')).length;
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

            {(() => {
                const filter = FILTERS.find(f => f.key === activeFilter);
                const visibleClients = activeFilter === 'all'
                    ? clients
                    : clients.filter(c => (filter.match || []).includes(c.pipelineStatus || 'Prospect'));

                return visibleClients.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        {clients.length === 0
                            ? <><h2>No Retailers Added Yet</h2><p>Get started by adding a new retailer configuration.</p></>
                            : <p style={{ color: 'var(--huel-mid-gray)' }}>No accounts match this filter.</p>
                        }
                    </div>
                ) : (
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {visibleClients.map((client) => {
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
                );
            })()}
        </div>
    );
}
