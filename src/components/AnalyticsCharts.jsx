import React from 'react';
import { calculateROI } from '../utils/calculations';
import {
    BarChart, Bar, LabelList,
    XAxis, YAxis,
    CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
    ScatterChart, Scatter, ZAxis,
    PieChart, Pie, Cell,
    ReferenceLine
} from 'recharts';

// ── Huel brand palette ────────────────────────────────────────────
// C.greenBar = readable darker green for bar fills & legends
// C.green    = light mint, used for backgrounds only
const C = { blue: '#0056B3', green: '#E1F8E0', greenBar: '#6BBF7F', pink: '#D95C7A', gray: '#8C8C8C', dark: '#0B0B0B', light: '#F5F5F5' };
const SEG_COLORS = [C.blue, C.pink, C.gray, '#4a90d9'];

const formatK = (val) => Math.abs(val) >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`;
const formatUnits = (val) => Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toLocaleString();
const fmtPct = (val) => `${(val * 100).toFixed(1)}%`;
const axisStyle = { fill: '#8C8C8C', fontSize: 11, fontFamily: 'Helvetica, Arial, sans-serif' };
const legendStyle = { paddingTop: '12px', fontSize: '0.75rem', fontFamily: 'Helvetica' };

// Shared dark tooltip ─────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, formatter }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: C.dark, padding: '10px 14px', color: '#FFF', fontFamily: 'Helvetica', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <p style={{ fontWeight: 700, marginBottom: '6px', color: C.green }}>{label}</p>
            {payload.map((entry, i) => (
                <p key={i} style={{ color: '#FFF', margin: '2px 0' }}>
                    <span style={{ color: entry.color, marginRight: 6 }}>■</span>
                    {entry.name}: {formatter ? formatter(entry.value, entry.name) : `$${entry.value.toLocaleString()}`}
                </p>
            ))}
        </div>
    );
};

const ScatterTooltipContent = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
        <div style={{ background: C.dark, padding: '10px 14px', color: '#FFF', fontFamily: 'Helvetica', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <p style={{ fontWeight: 700, marginBottom: '6px', color: C.green }}>{d.name}</p>
            <p style={{ color: '#FFF', margin: '2px 0' }}>Stores: {d.x.toLocaleString()}</p>
            <p style={{ color: '#FFF', margin: '2px 0' }}>Gross Margin: {fmtPct(d.y)}</p>
            <p style={{ color: '#FFF', margin: '2px 0' }}>Revenue: ${d.z.toLocaleString()}</p>
        </div>
    );
};

// ── Helper: group clients by a field ─────────────────────────────
function groupBy(clients, field) {
    const map = {};
    clients.forEach(client => {
        const key = client[field] || 'Unknown';
        const roi = calculateROI(client);
        if (!map[key]) map[key] = { name: key, Revenue: 0, 'Gross Profit': 0, 'Trade Spend': 0, count: 0 };
        map[key].Revenue += roi.huel.year1GrossRevenue;
        map[key]['Gross Profit'] += roi.huel.year1GrossProfit;
        map[key]['Trade Spend'] += roi.huel.totalTradeExpenses;
        map[key].count += 1;
    });
    return Object.values(map).map(d => ({
        ...d,
        Revenue: Math.round(d.Revenue),
        'Gross Profit': Math.round(d['Gross Profit']),
        'Trade Spend': Math.round(d['Trade Spend']),
    }));
}

// ── Section header ────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
        <div style={{ width: '3px', height: '18px', background: C.blue, flexShrink: 0 }} />
        <h2 style={{ margin: 0, fontSize: '1rem', fontFamily: 'Helvetica Neue, Arial, sans-serif', color: C.dark, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</h2>
    </div>
);

// ─────────────────────────────────────────────────────────────────
export default function AnalyticsCharts({ clients }) {
    if (clients.length === 0) return null;

    // ── Per-retailer data ─────────────────────────────────────────
    const revenueData = clients.map(client => {
        const roi = calculateROI(client);
        return {
            name: client.retailerName,
            Revenue: Math.round(roi.huel.year1GrossRevenue),
            'Gross Profit': Math.round(roi.huel.year1GrossProfit),
        };
    });

    const tradeData = clients.map(client => {
        const prods = client.products || [client];
        const sf = Math.round(prods.reduce((s, p) => s + (Number(p.slottingFixed) || 0), 0));
        const ff = Math.round(prods.reduce((s, p) => s + (Number(p.slottingFreeFillQty) || 0) * 2.85, 0));
        const tp = Math.round(prods.reduce((s, p) => s + (Number(p.tprs) || 0), 0));
        const mk = Math.round(prods.reduce((s, p) => s + (Number(p.marketing) || 0), 0));
        return {
            name: client.retailerName,
            'Slotting Fixed': sf,
            'Free Fill': ff,
            'TPRs': tp,
            'Marketing': mk,
            '_total': sf + ff + tp + mk,
        };
    });

    // ── Segment data ──────────────────────────────────────────────
    const byClientType = groupBy(clients, 'clientType');
    const byRTM = groupBy(clients, 'routeToMarket');

    // ── Efficiency scatter: stores (x) vs gross margin % (y), bubble = revenue ──
    const scatterData = clients.map(client => {
        const roi = calculateROI(client);
        const prods = client.products || [client];
        const totalStores = prods.reduce((s, p) => s + (Number(p.numStores) || 0), 0);
        const marginPct = roi.huel.year1GrossRevenue > 0
            ? roi.huel.year1GrossProfit / roi.huel.year1GrossRevenue
            : 0;
        return {
            name: client.retailerName,
            x: totalStores,
            y: Math.round(marginPct * 1000) / 1000,  // 3dp for scatter
            z: Math.round(roi.huel.year1GrossRevenue),
        };
    });

    // ── Pie: revenue share by client type ────────────────────────
    const totalRev = byClientType.reduce((s, d) => s + d.Revenue, 0);
    const pieData = byClientType.map(d => ({ name: d.name, value: d.Revenue }));

    // ── Units by product aggregate ────────────────────────────────
    const unitsByProduct = Array.from(new Set(clients.flatMap(c => (c.products || [c]).map(p => p.productName))))
        .map(prodName => {
            const units = clients.reduce((sum, c) => {
                const products = c.products || [c];
                return sum + products
                    .filter(p => p.productName === prodName)
                    .reduce((s, p) => s + (Number(p.numStores) || 0) * (Number(p.baseVelocity) || 0) * 52, 0);
            }, 0);
            return { name: prodName, Units: Math.round(units) };
        })
        .sort((a, b) => b.Units - a.Units);

    return (
        <div style={{ marginBottom: '2rem' }}>

            {/* ── Row 1: Per-retailer ──────────────────────────── */}
            <SectionLabel>Per Retailer</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.25rem', color: C.dark }}>Revenue vs Gross Profit</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueData} margin={{ top: 22, right: 10, left: 0, bottom: 5 }} barGap={4}>
                            <CartesianGrid strokeDasharray="0" vertical={false} stroke={C.light} />
                            <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={formatK} tick={axisStyle} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: C.light }} />
                            <Legend wrapperStyle={legendStyle} />
                            <Bar dataKey="Revenue" fill={C.blue} radius={[2, 2, 0, 0]}>
                                <LabelList dataKey="Revenue" position="top" formatter={formatK} style={{ fontSize: 10, fill: C.dark, fontFamily: 'Helvetica', fontWeight: 600 }} />
                            </Bar>
                            <Bar dataKey="Gross Profit" fill={C.greenBar} radius={[2, 2, 0, 0]}>
                                <LabelList dataKey="Gross Profit" position="top" formatter={formatK} style={{ fontSize: 10, fill: C.dark, fontFamily: 'Helvetica', fontWeight: 600 }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.25rem', color: C.dark }}>Trade Spend Mix</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={tradeData} margin={{ top: 22, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="0" vertical={false} stroke={C.light} />
                            <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={formatK} tick={axisStyle} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: C.light }} />
                            <Legend wrapperStyle={legendStyle} />
                            <Bar dataKey="Slotting Fixed" stackId="a" fill={C.blue} />
                            <Bar dataKey="Free Fill" stackId="a" fill={C.gray} />
                            <Bar dataKey="TPRs" stackId="a" fill={C.pink} />
                            <Bar dataKey="Marketing" stackId="a" fill={C.greenBar} radius={[2, 2, 0, 0]} />
                            {/* Transparent bar carries the stack total label */}
                            <Bar dataKey="_total" stackId="b" fill="transparent" legendType="none">
                                <LabelList dataKey="_total" position="top" formatter={formatK} style={{ fontSize: 10, fill: C.dark, fontFamily: 'Helvetica', fontWeight: 600 }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Row 2: Segment breakdown ─────────────────────── */}
            <SectionLabel>By Segment</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                {/* Client type horizontal bar */}
                <div className="glass-card" style={{ gridColumn: 'span 2' }}>
                    <h3 style={{ marginBottom: '0.5rem', color: C.dark }}>Revenue & Profit by Client Type</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>Aggregated across all retailers of each type</p>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={byClientType} layout="vertical" margin={{ top: 4, right: 70, left: 8, bottom: 4 }} barGap={4}>
                            <CartesianGrid strokeDasharray="0" horizontal={false} stroke={C.light} />
                            <XAxis type="number" tickFormatter={formatK} tick={axisStyle} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={120} />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: C.light }} />
                            <Legend wrapperStyle={legendStyle} />
                            <Bar dataKey="Revenue" fill={C.blue} radius={[0, 2, 2, 0]}>
                                <LabelList dataKey="Revenue" position="right" formatter={formatK} style={{ fontSize: 10, fill: C.dark, fontFamily: 'Helvetica', fontWeight: 600 }} />
                            </Bar>
                            <Bar dataKey="Gross Profit" fill={C.greenBar} radius={[0, 2, 2, 0]}>
                                <LabelList dataKey="Gross Profit" position="right" formatter={formatK} style={{ fontSize: 10, fill: C.dark, fontFamily: 'Helvetica', fontWeight: 600 }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue share donut */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '0.25rem', color: C.dark }}>Revenue Share</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>By client type</p>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <Pie
                                data={pieData}
                                cx="50%" cy="46%"
                                innerRadius={52} outerRadius={78}
                                paddingAngle={3}
                                dataKey="value"
                                label={false}
                            >
                                {pieData.map((_, i) => <Cell key={i} fill={SEG_COLORS[i % SEG_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(val) => [`$${val.toLocaleString()} (${totalRev > 0 ? Math.round(val / totalRev * 100) : 0}%)`, 'Revenue']} contentStyle={{ background: C.dark, border: 'none', color: '#FFF', fontFamily: 'Helvetica', fontSize: '0.8rem' }} />
                            <Legend
                                layout="horizontal"
                                verticalAlign="bottom"
                                align="center"
                                iconType="circle"
                                iconSize={8}
                                formatter={(value, entry) => {
                                    const pct = totalRev > 0 ? Math.round(entry.payload.value / totalRev * 100) : 0;
                                    return <span style={{ fontSize: '0.7rem', color: C.dark, fontFamily: 'Helvetica' }}>{value} {pct}%</span>;
                                }}
                                wrapperStyle={{ paddingTop: '6px', lineHeight: '1.6' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Row 3: Product Units & Efficiency ────────────── */}
            <SectionLabel>Product Units & Efficiency</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                {/* Units by product horizontal bar */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '0.5rem', color: C.dark }}>Annual Units by Product</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>Total forecasted units per SKU</p>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={unitsByProduct} layout="vertical" margin={{ top: 4, right: 70, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="0" horizontal={false} stroke={C.light} />
                            <XAxis type="number" tickFormatter={formatUnits} tick={axisStyle} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={110} />
                            <Tooltip content={<ChartTooltip formatter={(val) => val.toLocaleString()} />} cursor={{ fill: C.light }} />
                            <Bar dataKey="Units" fill={C.greenBar} radius={[0, 2, 2, 0]}>
                                <LabelList dataKey="Units" position="right" formatter={formatUnits} style={{ fontSize: 10, fill: C.dark, fontFamily: 'Helvetica', fontWeight: 600 }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Efficiency scatter: stores vs gross margin */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '0.5rem', color: C.dark }}>Deal Efficiency</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>Stores vs Gross Margin % — bubble size = revenue</p>
                    <ResponsiveContainer width="100%" height={240}>
                        <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="0" stroke={C.light} />
                            <XAxis type="number" dataKey="x" name="Stores" tick={axisStyle} axisLine={false} tickLine={false} label={{ value: 'Stores', position: 'insideBottom', offset: -2, fill: C.gray, fontSize: 10, fontFamily: 'Helvetica' }} />
                            <YAxis type="number" dataKey="y" name="Margin" tickFormatter={fmtPct} tick={axisStyle} axisLine={false} tickLine={false} />
                            <ZAxis type="number" dataKey="z" range={[60, 400]} />
                            <ReferenceLine y={0.3} stroke={C.gray} strokeDasharray="4 4" label={{ value: '30% threshold', position: 'right', fill: C.gray, fontSize: 9, fontFamily: 'Helvetica' }} />
                            <Tooltip content={<ScatterTooltipContent />} cursor={{ fill: C.light }} />
                            <Scatter data={scatterData} fill={C.blue} fillOpacity={0.75} />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

            </div>
        </div>
    );
}
