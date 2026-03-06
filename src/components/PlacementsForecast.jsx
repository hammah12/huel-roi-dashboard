import React, { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import { calculateROI } from '../utils/calculations';

const TYPES = ['Vending', 'Micromarket', 'Airport Concessions', 'Food Service'];

const TYPE_COLORS = {
    'Vending':             '#0056B3',
    'Micromarket':         '#7b4fbf',
    'Airport Concessions': '#D95C7A',
    'Food Service':        '#6BBF7F',
};

const PIPELINE_STATUS_CONFIG = {
    'Hot Pipeline':  { label: 'Hot Pipeline',  bg: '#D95C7A',  color: '#fff' },
    'High Interest': { label: 'High Interest', bg: '#0056B3',  color: '#fff' },
    'Prospect':      { label: 'Prospect',      bg: '#888888',  color: '#fff' },
};

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const QUARTER_LABELS = {
    Q1: 'Jan – Mar',
    Q2: 'Apr – Jun',
    Q3: 'Jul – Sep',
    Q4: 'Oct – Dec',
};

// ── Styles ─────────────────────────────────────────────────────────────────
const thStyle = (align, width) => ({
    padding: '0.6rem 0.75rem',
    textAlign: align,
    width,
    fontSize: '0.7rem',
    fontFamily: 'Helvetica Neue, sans-serif',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--huel-mid-gray)',
    borderBottom: '2px solid var(--border-light)',
    whiteSpace: 'nowrap',
});

const tdStyle = (align) => ({
    padding: '0.65rem 0.75rem',
    textAlign: align,
    fontSize: '0.875rem',
    fontFamily: 'Helvetica Neue, sans-serif',
    verticalAlign: 'middle',
});

const fmtCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

// ── Main Component ──────────────────────────────────────────────────────────
export default function PlacementsForecast({ clients = [], onConvert }) {
    const [rows, setRows] = useState(() => {
        const saved = localStorage.getItem('placementsForecast');
        return saved ? JSON.parse(saved) : [];
    });

    const [isEditing, setIsEditing] = useState(false);
    const [pipelineFilter, setPipelineFilter] = useState('all');

    const persist = (newRows) => {
        setRows(newRows);
        localStorage.setItem('placementsForecast', JSON.stringify(newRows));
    };

    const addRow = () => {
        persist([...rows, {
            id: Date.now().toString(),
            partner: '',
            type: 'Vending',
            Q1: 0, Q2: 0, Q3: 0, Q4: 0,
        }]);
    };

    const updateRow = (id, field, value) => {
        persist(rows.map(r =>
            r.id === id
                ? { ...r, [field]: QUARTERS.includes(field) ? (Number(value) || 0) : value }
                : r
        ));
    };

    const removeRow = (id) => persist(rows.filter(r => r.id !== id));

    // ── Pipeline leads (non-Closed clients) ──────────────────────────────
    const leadClients = clients.filter(c => c.pipelineStatus !== 'Closed');

    const PIPELINE_STATUS_ORDER = ['Hot Pipeline', 'High Interest', 'Prospect'];
    const sortedLeads = [...leadClients].sort((a, b) => {
        const ai = PIPELINE_STATUS_ORDER.indexOf(a.pipelineStatus ?? 'Prospect');
        const bi = PIPELINE_STATUS_ORDER.indexOf(b.pipelineStatus ?? 'Prospect');
        return ai - bi;
    });

    const filteredLeads = pipelineFilter === 'all'
        ? sortedLeads
        : sortedLeads.filter(c => c.pipelineStatus === pipelineFilter);

    // Forecast quarter for a lead (from placementsForecast rows)
    const getForecastQuarter = (clientName) => {
        const row = rows.find(r => r.partner?.toLowerCase() === clientName?.toLowerCase());
        if (!row) return null;
        const bestQ = QUARTERS.reduce((best, q) => (!best || (row[q] || 0) > (row[best] || 0) ? q : best), null);
        return bestQ && row[bestQ] > 0 ? bestQ : null;
    };

    // ── Derived data ──────────────────────────────────────────────────────
    const rowTotal = (r) => QUARTERS.reduce((s, q) => s + (r[q] || 0), 0);
    const annualTotal = rows.reduce((s, r) => s + rowTotal(r), 0);

    const maxQVal = Math.max(
        1,
        ...rows.flatMap(r => QUARTERS.map(q => r[q] || 0))
    );

    const chartData = QUARTERS.map(q => {
        const point = { quarter: `${q}\n${QUARTER_LABELS[q]}`, q };
        TYPES.forEach(t => {
            point[t] = rows.filter(r => r.type === t).reduce((s, r) => s + (r[q] || 0), 0);
        });
        point.total = rows.reduce((s, r) => s + (r[q] || 0), 0);
        return point;
    });

    const qTotals = QUARTERS.map(q => rows.reduce((s, r) => s + (r[q] || 0), 0));

    // Pipeline filter pill counts
    const pipelineStatusCounts = PIPELINE_STATUS_ORDER.reduce((acc, status) => {
        acc[status] = leadClients.filter(c => c.pipelineStatus === status).length;
        return acc;
    }, {});

    return (
        <div>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '4px' }}>Placements Forecast</h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--huel-mid-gray)' }}>
                        {rows.length} partner{rows.length !== 1 ? 's' : ''} · {annualTotal} total placements planned
                        {leadClients.length > 0 && ` · ${leadClients.length} lead${leadClients.length !== 1 ? 's' : ''} in pipeline`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {isEditing && (
                        <button className="btn btn-primary" onClick={addRow}>
                            + Add Partner
                        </button>
                    )}
                    <button
                        className={`btn ${isEditing ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setIsEditing(v => !v)}
                    >
                        {isEditing ? 'Done' : 'Edit Forecast'}
                    </button>
                </div>
            </div>

            {/* ── Pipeline Leads Section ─────────────────────────────────── */}
            {leadClients.length > 0 && (
                <div style={{ marginBottom: '2.5rem' }}>
                    {/* Section header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1rem' }}>Pipeline Leads</h2>
                            <span style={{
                                fontSize: '0.65rem', fontWeight: 700,
                                padding: '3px 9px',
                                background: 'var(--huel-dark)', color: '#fff',
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>
                                {leadClients.length} account{leadClients.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Status filter pills */}
                        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border-light)' }}>
                            {[{ key: 'all', label: 'All', count: leadClients.length }, ...PIPELINE_STATUS_ORDER.map(s => ({ key: s, label: s, count: pipelineStatusCounts[s] }))].map((item, i, arr) => {
                                const isActive = pipelineFilter === item.key;
                                const cfg = PIPELINE_STATUS_CONFIG[item.key];
                                return (
                                    <button
                                        key={item.key}
                                        onClick={() => setPipelineFilter(item.key)}
                                        style={{
                                            padding: '0.3rem 0.7rem',
                                            fontSize: '0.7rem',
                                            fontFamily: 'var(--font-heading)',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.04em',
                                            border: 'none',
                                            borderRight: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none',
                                            cursor: 'pointer',
                                            background: isActive ? (cfg?.bg || 'var(--huel-dark)') : 'transparent',
                                            color: isActive ? (cfg?.color || '#fff') : 'var(--huel-mid-gray)',
                                            transition: 'background 0.15s',
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                        }}
                                    >
                                        {item.label}
                                        {item.count > 0 && (
                                            <span style={{
                                                fontSize: '0.6rem', padding: '1px 4px',
                                                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--huel-light-gray)',
                                                color: isActive ? '#fff' : 'var(--huel-mid-gray)',
                                            }}>
                                                {item.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Lead cards table */}
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Helvetica Neue, sans-serif' }}>
                            <thead>
                                <tr style={{ background: 'var(--huel-light-gray)' }}>
                                    <th style={thStyle('left', '22%')}>Account</th>
                                    <th style={thStyle('left', '12%')}>Status</th>
                                    <th style={thStyle('left', '12%')}>Type</th>
                                    <th style={thStyle('center', '9%')}>Locations</th>
                                    <th style={thStyle('right', '14%')}>Est. Yr 1 Rev</th>
                                    <th style={thStyle('right', '14%')}>Est. EBITDA</th>
                                    <th style={thStyle('center', '9%')}>Forecast Q</th>
                                    <th style={thStyle('center', '8%')} />
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.map((client, i) => {
                                    const globalIndex = clients.indexOf(client);
                                    const roi = calculateROI(client);
                                    const { huel } = roi;
                                    const products = client.products || [client];
                                    const locations = Math.max(...products.map(p => Number(p.numStores) || 0), 0);
                                    const statusCfg = PIPELINE_STATUS_CONFIG[client.pipelineStatus] || PIPELINE_STATUS_CONFIG['Prospect'];
                                    const typeBg = TYPE_COLORS[client.clientType] || TYPE_COLORS['Vending'];
                                    const forecastQ = getForecastQuarter(client.retailerName);
                                    const isPositiveEbitda = huel.year1Ebitda >= 0;

                                    return (
                                        <tr
                                            key={globalIndex}
                                            style={{
                                                borderBottom: '1px solid var(--border-light)',
                                                background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.013)',
                                                transition: 'background 0.1s',
                                            }}
                                        >
                                            {/* Account name */}
                                            <td style={{ ...tdStyle('left'), fontWeight: 600, color: 'var(--huel-dark)' }}>
                                                {client.retailerName}
                                            </td>

                                            {/* Pipeline status */}
                                            <td style={tdStyle('left')}>
                                                <span style={{
                                                    fontSize: '0.62rem', fontWeight: 700,
                                                    padding: '2px 7px',
                                                    background: statusCfg.bg, color: statusCfg.color,
                                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {statusCfg.label}
                                                </span>
                                            </td>

                                            {/* Client type */}
                                            <td style={tdStyle('left')}>
                                                <span style={{
                                                    fontSize: '0.62rem', fontWeight: 700,
                                                    padding: '2px 7px',
                                                    background: typeBg, color: '#fff',
                                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {client.clientType || 'Vending'}
                                                </span>
                                            </td>

                                            {/* Locations */}
                                            <td style={{ ...tdStyle('center'), fontWeight: 700, color: 'var(--huel-dark)' }}>
                                                {locations.toLocaleString()}
                                            </td>

                                            {/* Est. Revenue */}
                                            <td style={{ ...tdStyle('right'), fontWeight: 700, color: 'var(--huel-dark)' }}>
                                                {fmtCurrency(huel.year1GrossRevenue)}
                                            </td>

                                            {/* Est. EBITDA */}
                                            <td style={{
                                                ...tdStyle('right'),
                                                fontWeight: 700,
                                                color: isPositiveEbitda ? '#1a7f4b' : '#D95C7A',
                                            }}>
                                                {fmtCurrency(huel.year1Ebitda)}
                                            </td>

                                            {/* Forecast quarter */}
                                            <td style={{ ...tdStyle('center') }}>
                                                {forecastQ ? (
                                                    <span style={{
                                                        fontSize: '0.72rem', fontWeight: 700,
                                                        padding: '2px 8px',
                                                        background: 'rgba(0,86,179,0.1)',
                                                        color: 'var(--huel-blue)',
                                                        letterSpacing: '0.03em',
                                                    }}>
                                                        {forecastQ}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--border-light)', fontSize: '0.9rem' }}>—</span>
                                                )}
                                            </td>

                                            {/* Convert button */}
                                            <td style={{ ...tdStyle('center'), paddingRight: '0.85rem' }}>
                                                <button
                                                    onClick={() => onConvert && onConvert(globalIndex)}
                                                    title="Mark as closed and move to live dashboard"
                                                    style={{
                                                        padding: '0.3rem 0.75rem',
                                                        fontSize: '0.68rem',
                                                        fontFamily: 'var(--font-heading)',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                        background: '#1a7f4b',
                                                        color: '#fff',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap',
                                                        transition: 'opacity 0.15s',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                                >
                                                    Close Deal →
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                            {/* Summary footer */}
                            <tfoot>
                                <tr style={{ background: 'rgba(0,0,0,0.03)', borderTop: '2px solid var(--border-light)' }}>
                                    <td colSpan={4} style={{ ...tdStyle('left'), fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--huel-mid-gray)' }}>
                                        Pipeline Total ({filteredLeads.length} account{filteredLeads.length !== 1 ? 's' : ''})
                                    </td>
                                    <td style={{ ...tdStyle('right'), fontWeight: 800, color: 'var(--huel-dark)' }}>
                                        {fmtCurrency(filteredLeads.reduce((s, c) => s + calculateROI(c).huel.year1GrossRevenue, 0))}
                                    </td>
                                    <td style={{
                                        ...tdStyle('right'),
                                        fontWeight: 800,
                                        color: filteredLeads.reduce((s, c) => s + calculateROI(c).huel.year1Ebitda, 0) >= 0 ? '#1a7f4b' : '#D95C7A',
                                    }}>
                                        {fmtCurrency(filteredLeads.reduce((s, c) => s + calculateROI(c).huel.year1Ebitda, 0))}
                                    </td>
                                    <td colSpan={2} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Explanatory note */}
                    <p style={{ fontSize: '0.72rem', color: 'var(--huel-mid-gray)', marginTop: '0.6rem', fontStyle: 'italic' }}>
                        Click <strong>Close Deal →</strong> to mark an account as live — it will appear in the main dashboard. The forecast entry above will remain.
                    </p>
                </div>
            )}

            {leadClients.length === 0 && (
                <div style={{
                    marginBottom: '2rem',
                    padding: '1.25rem 1.5rem',
                    background: 'var(--huel-light-gray)',
                    border: '1px dashed var(--border-light)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--huel-mid-gray)' }}>
                        No pipeline leads yet. Add a retailer with a pipeline status (Hot Pipeline, High Interest, or Prospect) to track them here.
                    </span>
                </div>
            )}

            {/* ── KPI Quarter Cards ────────────────────────────────────── */}
            <div style={{ marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--huel-mid-gray)', marginBottom: '0.6rem' }}>
                    Placement Forecast
                </p>
            </div>
            <div className="grid grid-cols-4 mb-8">
                {QUARTERS.map((q, i) => (
                    <div key={q} className="glass-card" style={{ padding: '1.25rem' }}>
                        <div className="kpi-card-accent" style={{ background: 'var(--huel-blue)' }} />
                        <p className="form-label" style={{ marginBottom: '4px' }}>
                            {q} <span style={{ fontWeight: 400, textTransform: 'none' }}>· {QUARTER_LABELS[q]}</span>
                        </p>
                        <p className="font-bold" style={{ fontSize: '1.75rem', color: 'var(--huel-dark)', marginBottom: '2px' }}>
                            {qTotals[i]}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--huel-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            new placements
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Summary Bar Chart ─────────────────────────────────────── */}
            {rows.length > 0 && (
                <div className="glass-card mb-8">
                    <h3 style={{ marginBottom: '1.5rem' }}>New Placements by Quarter & Type</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} barGap={4} barCategoryGap="35%">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                            <XAxis
                                dataKey="q"
                                tick={{ fontFamily: 'Helvetica Neue', fontSize: 11, fill: 'var(--huel-mid-gray)' }}
                                axisLine={false} tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontFamily: 'Helvetica Neue', fontSize: 11, fill: 'var(--huel-mid-gray)' }}
                                axisLine={false} tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ fontFamily: 'Helvetica Neue', fontSize: 12, border: '1px solid var(--border-light)', borderRadius: 0 }}
                                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                            />
                            <Legend wrapperStyle={{ fontFamily: 'Helvetica Neue', fontSize: 11, paddingTop: '1rem' }} />
                            {TYPES.map(type => (
                                <Bar key={type} dataKey={type} fill={TYPE_COLORS[type]} radius={0}>
                                    <LabelList
                                        dataKey={type}
                                        position="top"
                                        formatter={v => v > 0 ? v : ''}
                                        style={{ fontSize: 10, fill: 'var(--huel-dark)', fontFamily: 'Helvetica Neue', fontWeight: 600 }}
                                    />
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── Gantt Table ───────────────────────────────────────────── */}
            <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Partner Gantt — Placements by Quarter</h3>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {TYPES.map(t => (
                            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--huel-mid-gray)' }}>
                                <div style={{ width: 10, height: 10, background: TYPE_COLORS[t], flexShrink: 0 }} />
                                {t}
                            </div>
                        ))}
                    </div>
                </div>

                {rows.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--huel-mid-gray)' }}>
                        <p style={{ marginBottom: '0.5rem' }}>No partners added yet.</p>
                        <p style={{ fontSize: '0.85rem' }}>Click <strong>Edit Forecast → + Add Partner</strong> to build your pipeline.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Helvetica Neue, sans-serif' }}>
                            <thead>
                                <tr>
                                    <th style={thStyle('left', '28%')}>Partner</th>
                                    <th style={thStyle('left', '16%')}>Type</th>
                                    {QUARTERS.map(q => (
                                        <th key={q} style={thStyle('center', '11%')}>
                                            <div>{q}</div>
                                            <div style={{ fontWeight: 400, fontSize: '0.62rem', opacity: 0.7, textTransform: 'none', letterSpacing: 0 }}>
                                                {QUARTER_LABELS[q]}
                                            </div>
                                        </th>
                                    ))}
                                    <th style={thStyle('center', '9%')}>Yr Total</th>
                                    {isEditing && <th style={thStyle('center', '4%')} />}
                                </tr>
                            </thead>

                            <tbody>
                                {rows.map((row, i) => {
                                    const total = rowTotal(row);
                                    const color = TYPE_COLORS[row.type] || TYPE_COLORS['Vending'];

                                    return (
                                        <tr
                                            key={row.id}
                                            style={{
                                                borderBottom: '1px solid var(--border-light)',
                                                background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                                            }}
                                        >
                                            {/* Partner name */}
                                            <td style={tdStyle('left')}>
                                                {isEditing ? (
                                                    <input
                                                        value={row.partner}
                                                        onChange={e => updateRow(row.id, 'partner', e.target.value)}
                                                        placeholder="e.g. Hudson News"
                                                        style={{ border: '1px solid var(--border-light)', padding: '5px 8px', width: '100%', fontFamily: 'Helvetica Neue', fontSize: '0.85rem' }}
                                                    />
                                                ) : (
                                                    <span style={{ fontWeight: 600, color: 'var(--huel-dark)' }}>
                                                        {row.partner || <em style={{ color: 'var(--huel-mid-gray)', fontWeight: 400 }}>Unnamed</em>}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Type */}
                                            <td style={tdStyle('left')}>
                                                {isEditing ? (
                                                    <select
                                                        value={row.type}
                                                        onChange={e => updateRow(row.id, 'type', e.target.value)}
                                                        style={{ border: '1px solid var(--border-light)', padding: '5px 6px', fontFamily: 'Helvetica Neue', fontSize: '0.8rem' }}
                                                    >
                                                        {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                ) : (
                                                    <span style={{
                                                        fontSize: '0.65rem', fontWeight: 700,
                                                        padding: '2px 7px',
                                                        background: color, color: '#fff',
                                                        textTransform: 'uppercase', letterSpacing: '0.04em',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {row.type}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Q1–Q4 cells */}
                                            {QUARTERS.map(q => {
                                                const count = row[q] || 0;
                                                const barPct = count > 0 ? Math.max(12, Math.round((count / maxQVal) * 100)) : 0;

                                                return (
                                                    <td key={q} style={{ ...tdStyle('center'), minWidth: '80px' }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                value={count || ''}
                                                                min="0"
                                                                onChange={e => updateRow(row.id, q, e.target.value)}
                                                                style={{
                                                                    width: '60px', border: '1px solid var(--border-light)',
                                                                    padding: '5px 6px', textAlign: 'center',
                                                                    fontFamily: 'Helvetica Neue', fontSize: '0.85rem',
                                                                }}
                                                            />
                                                        ) : count > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                                <div style={{
                                                                    height: '6px',
                                                                    width: `${barPct}%`,
                                                                    minWidth: '20px',
                                                                    background: color,
                                                                    opacity: 0.85,
                                                                }} />
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--huel-dark)' }}>
                                                                    {count}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: 'var(--border-light)', fontSize: '0.9rem' }}>—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {/* Row total */}
                                            <td style={{
                                                ...tdStyle('center'),
                                                fontWeight: 700,
                                                color: total > 0 ? 'var(--huel-dark)' : 'var(--huel-mid-gray)',
                                                background: total > 0 ? 'rgba(0,86,179,0.05)' : 'transparent',
                                                borderLeft: '1px solid var(--border-light)',
                                            }}>
                                                {total || '—'}
                                            </td>

                                            {isEditing && (
                                                <td style={tdStyle('center')}>
                                                    <button
                                                        onClick={() => removeRow(row.id)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--huel-pink)', cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1 }}
                                                    >
                                                        ×
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}

                                {/* ── Totals row ── */}
                                <tr style={{ background: 'var(--huel-dark)' }}>
                                    <td
                                        colSpan={2}
                                        style={{ ...tdStyle('left'), color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                                    >
                                        Total Placements
                                    </td>
                                    {QUARTERS.map((q, i) => (
                                        <td key={q} style={{
                                            ...tdStyle('center'),
                                            fontWeight: 800,
                                            fontSize: '1rem',
                                            color: qTotals[i] > 0 ? 'var(--huel-green)' : 'rgba(255,255,255,0.25)',
                                        }}>
                                            {qTotals[i]}
                                        </td>
                                    ))}
                                    <td style={{
                                        ...tdStyle('center'),
                                        fontWeight: 800,
                                        fontSize: '1.1rem',
                                        color: 'var(--huel-green)',
                                        borderLeft: '1px solid rgba(255,255,255,0.1)',
                                    }}>
                                        {annualTotal}
                                    </td>
                                    {isEditing && <td />}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
