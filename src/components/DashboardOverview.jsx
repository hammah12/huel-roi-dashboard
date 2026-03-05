import React, { useState } from 'react';
import { calculateROI } from '../utils/calculations';
import AnalyticsCharts from './AnalyticsCharts';

function DashboardCard({ client, index, isEditMode, onEdit, onDuplicate, onRemove }) {
    const roi = calculateROI(client);
    const { huel, retailer } = roi;

    const productsList = client.products || [client];
    const productNames = productsList.map(p => p.productName).join(', ');
    const totalStores  = productsList.reduce((sum, p) => sum + (Number(p.numStores) || 0), 0);
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
    const formatPercent  = (val) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(val);

    // Breakeven bar: cap at 24 months for visual scale
    const breakevenCapped = Math.min(huel.breakevenMonths, 24);
    const breakevenPct    = Math.round((breakevenCapped / 24) * 100);
    const isHealthy       = huel.breakevenMonths <= 12 || huel.breakevenMonths === 0;

    // Vending-specific: revenue share deal?
    const isRevenueShare = huel.isRevenueShare;

    return (
        <div className="glass-card">
            {/* Colour accent strip at top */}
            <div className="kpi-card-accent" style={{ background: isHealthy ? 'var(--huel-green)' : 'var(--huel-pink)' }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                <div>
                    <h3 style={{ color: 'var(--huel-dark)', margin: 0, marginBottom: '4px' }}>
                        {client.retailerName}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {client.clientType || 'Vending'} · {client.routeToMarket}
                        </span>
                        {isRevenueShare && (
                            <span style={{
                                fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px',
                                background: 'var(--huel-blue)', color: '#fff',
                                textTransform: 'uppercase', letterSpacing: '0.04em'
                            }}>
                                Rev Share
                            </span>
                        )}
                    </div>
                </div>
                {isEditMode && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }} onClick={() => onEdit(index)}>Edit</button>
                        <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }} onClick={() => onDuplicate(index)}>Copy</button>
                        <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', color: 'var(--huel-pink)' }} onClick={() => onRemove(index)}>Delete</button>
                    </div>
                )}
            </div>

            {/* Core metrics */}
            <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div>
                    <p className="form-label" style={{ marginBottom: '2px' }}>Product(s)</p>
                    <p className="font-bold" style={{ color: 'var(--huel-dark)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{productNames}</p>

                    <p className="form-label" style={{ marginBottom: '2px' }}>{client.clientType === 'Vending' ? 'Vending Locations' : 'Stores'}</p>
                    <p className="font-bold" style={{ color: 'var(--huel-dark)', marginBottom: '0.75rem' }}>{totalStores.toLocaleString()}</p>

                    <p className="form-label" style={{ marginBottom: '2px' }}>Weekly Units</p>
                    <p className="font-bold" style={{ color: 'var(--huel-dark)', marginBottom: '2px' }}>{totalWeeklyUnits % 1 === 0 ? totalWeeklyUnits : totalWeeklyUnits.toFixed(1)}</p>
                    {weeklyUnitBreakdown.length > 1 && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--huel-mid-gray)', marginBottom: '0.75rem' }}>{weeklyBreakdownStr}</p>
                    )}
                    {weeklyUnitBreakdown.length === 1 && <div style={{ marginBottom: '0.75rem' }} />}

                    <p className="form-label" style={{ marginBottom: '2px' }}>Trade Rate</p>
                    <p className="font-bold" style={{ color: 'var(--huel-dark)' }}>{formatPercent(huel.tradeRatePercent)}</p>
                </div>

                <div>
                    <p className="form-label" style={{ marginBottom: '2px' }}>Yr 1 Gross Revenue</p>
                    <p className="font-bold" style={{ color: 'var(--huel-dark)', marginBottom: '0.75rem' }}>{formatCurrency(huel.year1GrossRevenue)}</p>

                    <p className="form-label" style={{ marginBottom: '2px' }}>Yr 1 Gross Profit</p>
                    <p className="font-bold text-success" style={{ marginBottom: '0.75rem' }}>{formatCurrency(huel.year1GrossProfit)}</p>

                    <p className="form-label" style={{ marginBottom: '2px' }}>Yr 1 EBITDA</p>
                    <p className={`font-bold ${huel.year1Ebitda >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(huel.year1Ebitda)}
                    </p>
                </div>
            </div>

            {/* Vending Revenue Share detail panel */}
            {isRevenueShare && (
                <div style={{
                    background: 'rgba(0,86,179,0.06)',
                    border: '1px solid rgba(0,86,179,0.2)',
                    borderLeft: '3px solid var(--huel-blue)',
                    padding: '0.65rem 0.85rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.78rem',
                }}>
                    <div style={{ fontWeight: 700, color: 'var(--huel-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem', marginBottom: '6px' }}>
                        Revenue Share Deal
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--huel-dark)' }}>
                        <span>Min to Partner</span>
                        <span style={{ fontWeight: 700 }}>{formatCurrency(huel.revenueShareMinMonthly)}/mo · {formatCurrency(huel.revenueShareMin)}/yr</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--huel-dark)' }}>
                        <span>Partner Split</span>
                        <span style={{ fontWeight: 700 }}>{(huel.revenueSharePct * 100).toFixed(0)}% of retail sales</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--huel-dark)', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(0,86,179,0.15)' }}>
                        <span>Partner Payout (Yr 1)</span>
                        <span style={{ fontWeight: 700, color: 'var(--huel-pink)' }}>−{formatCurrency(huel.totalPartnerPayout)}</span>
                    </div>
                </div>
            )}

            {/* Vending machine cost pill (shown when machine cost > 0) */}
            {huel.totalMachineCost > 0 && (
                <div style={{ background: 'var(--huel-light-gray)', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Machine Cost ({totalMachineLocations} loc.)
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--huel-pink)' }}>
                        −{formatCurrency(huel.totalMachineCost)}
                    </span>
                </div>
            )}

            {/* Retailer margin pill */}
            <div style={{ background: 'var(--huel-light-gray)', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Retailer Margin</span>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--huel-dark)' }}>{formatPercent(retailer.marginPercent)}</span>
            </div>

            {/* Breakeven visual bar */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Breakeven</span>
                    <span className={`font-bold ${isHealthy ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.875rem' }}>
                        {huel.breakevenMonths > 0 ? `${huel.breakevenMonths.toFixed(1)} mo` : 'Immediate'}
                    </span>
                </div>
                <div className="breakeven-bar-track">
                    <div
                        className="breakeven-bar-fill"
                        style={{
                            width: `${breakevenPct}%`,
                            background: isHealthy ? 'var(--huel-blue)' : 'var(--huel-pink)'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--huel-mid-gray)' }}>0</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--huel-mid-gray)' }}>24 mo</span>
                </div>
            </div>
        </div>
    );
}

export default function DashboardOverview({ clients, onEdit, onDuplicate, onRemove }) {
    const [isEditMode, setIsEditMode] = useState(false);
    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
    const formatPercent  = (val) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(val);

    // Aggregate calculations
    const totalRevenue = clients.reduce((sum, c) => sum + calculateROI(c).huel.year1GrossRevenue, 0);
    const totalProfit  = clients.reduce((sum, c) => sum + calculateROI(c).huel.year1GrossProfit,  0);
    const totalTrade   = clients.reduce((sum, c) => sum + calculateROI(c).huel.totalTradeExpenses, 0);
    const totalEbitda  = clients.reduce((sum, c) => sum + calculateROI(c).huel.year1Ebitda,        0);
    const portfolioEbitdaPct = totalRevenue > 0 ? totalEbitda / totalRevenue : 0;

    const kpiCards = [
        { label: 'Yr 1 Gross Revenue', value: formatCurrency(totalRevenue), accent: 'var(--huel-blue)',  valueClass: '' },
        { label: 'Yr 1 Gross Profit',  value: formatCurrency(totalProfit),  accent: 'var(--huel-green)', valueClass: 'text-success' },
        { label: 'Total Trade Spend',  value: formatCurrency(totalTrade),   accent: 'var(--huel-pink)',  valueClass: 'text-danger' },
        { label: 'Portfolio EBITDA',   value: `${formatCurrency(totalEbitda)} (${formatPercent(portfolioEbitdaPct)})`, accent: totalEbitda >= 0 ? 'var(--huel-blue)' : 'var(--huel-pink)', valueClass: totalEbitda >= 0 ? 'text-success' : 'text-danger' },
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

            <AnalyticsCharts clients={clients} />

            <h2 className="mb-4">Retailer Breakdown</h2>

            {clients.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <h2>No Retailers Added Yet</h2>
                    <p>Get started by adding a new retailer configuration to see the ROI projections here.</p>
                </div>
            ) : (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {clients.map((client, index) => (
                        <DashboardCard
                            key={index}
                            index={index}
                            client={client}
                            isEditMode={isEditMode}
                            onEdit={onEdit}
                            onDuplicate={onDuplicate}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
