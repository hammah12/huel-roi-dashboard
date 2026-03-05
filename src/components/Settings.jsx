import React, { useState, useEffect } from 'react';
import { getConfig, setConfig, testConnection, fetchPricingData } from '../utils/airtableSync';
import { updateDynamicPricing } from '../utils/calculations';

// ── Default product catalogue ──────────────────────────────────────────────
export const DEFAULT_PRODUCTS = [
    { name: 'Huel BE RTD', cogs: 1.42, defaultSrp: 4.99 },
    { name: 'Huel DG RTD', cogs: 0.77, defaultSrp: 3.49 },
];

export function loadProducts() {
    try {
        const saved = localStorage.getItem('huelProducts');
        return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
    } catch {
        return DEFAULT_PRODUCTS;
    }
}

export function saveProducts(products) {
    localStorage.setItem('huelProducts', JSON.stringify(products));
    // Sync into calculations module immediately
    const productMap = {};
    products.forEach(p => {
        productMap[p.name] = { cogs: Number(p.cogs), defaultSrp: Number(p.defaultSrp) };
    });
    updateDynamicPricing({}, productMap);
}

// ── Mini schema table component ───────────────────────────────────
function SchemaTable({ title, rows }) {
    return (
        <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--huel-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                {title}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                    <tr style={{ background: 'var(--huel-dark)', color: '#fff' }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Field</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? '#fff' : 'var(--huel-light-gray)' }}>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--huel-blue)' }}>{r[0]}</td>
                            <td style={{ padding: '6px 10px', color: 'var(--huel-mid-gray)' }}>{r[1]}</td>
                            <td style={{ padding: '6px 10px', color: 'var(--huel-dark)' }}>{r[2]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const PRICING_SEED = [
    ['DSD',                'RTM Price',          '2.39'],
    ['Distributor',        'RTM Price',          '2.52'],
    ['Direct to Retailer', 'RTM Price',          '2.85'],
    ['Wholesale',          'RTM Price',          '3.00'],
    ['Huel BE RTD',        'Product COGS',       '1.42'],
    ['Huel BE RTD',        'Product Default SRP','4.99'],
    ['Huel DG RTD',        'Product COGS',       '0.77'],
    ['Huel DG RTD',        'Product Default SRP','3.49'],
];

// ── Product Catalogue card ─────────────────────────────────────────────────
function ProductCatalogue({ onProductsUpdated }) {
    const [products, setProducts] = useState(loadProducts);
    const [saveMsg, setSaveMsg]   = useState(null);

    const update = (index, field, value) => {
        setProducts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
    };

    const addProduct = () => {
        setProducts(prev => [...prev, { name: '', cogs: '', defaultSrp: '' }]);
    };

    const removeProduct = (index) => {
        setProducts(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        const cleaned = products.filter(p => p.name.trim());
        if (!cleaned.length) {
            setSaveMsg({ type: 'error', text: 'At least one product is required.' });
            return;
        }
        saveProducts(cleaned);
        setProducts(cleaned);
        setSaveMsg({ type: 'success', text: 'Product catalogue saved.' });
        if (onProductsUpdated) onProductsUpdated(cleaned);
        setTimeout(() => setSaveMsg(null), 3000);
    };

    const inputStyle = {
        border: '1px solid var(--border-light)',
        padding: '5px 8px',
        fontFamily: 'Helvetica Neue, sans-serif',
        fontSize: '0.85rem',
        width: '100%',
    };

    return (
        <div className="glass-card">
            <div style={{ height: '3px', background: 'var(--huel-blue)', margin: '-1.5rem -1.5rem 1.5rem -1.5rem' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                <div>
                    <h2 style={{ color: 'var(--huel-dark)', margin: 0, marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>
                        Product Catalogue
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--huel-mid-gray)' }}>
                        Add or edit products here — changes appear immediately in the retailer form dropdown.
                    </p>
                </div>
                <button type="button" className="btn btn-primary" onClick={addProduct} style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', flexShrink: 0 }}>
                    + Add Product
                </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                <thead>
                    <tr>
                        {['Product Name', 'COGS ($)', 'Default SRP ($)', ''].map(h => (
                            <th key={h} style={{
                                padding: '6px 10px', textAlign: 'left',
                                fontSize: '0.7rem', fontFamily: 'Helvetica Neue', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                                color: 'var(--huel-mid-gray)', borderBottom: '2px solid var(--border-light)',
                            }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {products.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                            <td style={{ padding: '8px 10px', width: '50%' }}>
                                <input
                                    value={p.name}
                                    onChange={e => update(i, 'name', e.target.value)}
                                    placeholder="e.g. Huel Complete Meal RTD"
                                    style={inputStyle}
                                />
                            </td>
                            <td style={{ padding: '8px 10px', width: '20%' }}>
                                <input
                                    type="number"
                                    value={p.cogs}
                                    onChange={e => update(i, 'cogs', e.target.value)}
                                    placeholder="e.g. 1.42"
                                    step="0.01" min="0"
                                    style={inputStyle}
                                />
                            </td>
                            <td style={{ padding: '8px 10px', width: '20%' }}>
                                <input
                                    type="number"
                                    value={p.defaultSrp}
                                    onChange={e => update(i, 'defaultSrp', e.target.value)}
                                    placeholder="e.g. 4.99"
                                    step="0.01" min="0"
                                    style={inputStyle}
                                />
                            </td>
                            <td style={{ padding: '8px 10px', width: '10%', textAlign: 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => removeProduct(i)}
                                    style={{ background: 'none', border: 'none', color: 'var(--huel-pink)', cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1 }}
                                >
                                    ×
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {saveMsg && (
                <div style={{
                    marginBottom: '1rem', padding: '0.6rem 1rem', fontSize: '0.85rem',
                    borderLeft: `3px solid ${saveMsg.type === 'success' ? 'var(--huel-blue)' : 'var(--huel-pink)'}`,
                    background: 'var(--huel-light-gray)', color: 'var(--huel-dark)',
                }}>
                    {saveMsg.text}
                </div>
            )}

            <button type="button" className="btn btn-primary" onClick={handleSave}>
                Save Product Catalogue
            </button>
        </div>
    );
}

// ── Main Settings component ────────────────────────────────────────────────
export default function Settings({ onDataLoaded, onProductsUpdated }) {
    const [token,  setToken]  = useState('');
    const [baseId, setBaseId] = useState('');
    const [status, setStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const config = getConfig();
        if (config) {
            setToken(config.token);
            setBaseId(config.baseId);
            setIsConnected(true);
        }
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();

        if (!token && !baseId) {
            setConfig({ token: '', baseId: '' });
            setIsConnected(false);
            setStatus({ type: 'info', message: 'Airtable sync disabled. Data will save locally only.' });
            return;
        }

        if (!token || !baseId) {
            setStatus({ type: 'error', message: 'Please provide both your Personal Access Token and Base ID.' });
            return;
        }

        setConfig({ token, baseId });
        setIsLoading(true);
        setStatus({ type: 'info', message: 'Testing connection...' });

        try {
            const test = await testConnection();
            if (!test.success) {
                setStatus({ type: 'error', message: test.error });
                setIsConnected(false);
                setIsLoading(false);
                return;
            }

            const data = await fetchPricingData();
            if (data && (Object.keys(data.pricingTiers).length || Object.keys(data.products).length)) {
                updateDynamicPricing(data.pricingTiers, data.products);
                setStatus({ type: 'success', message: 'Connected! Live pricing loaded from your Airtable base.' });
                setIsConnected(true);
                if (onDataLoaded) onDataLoaded();
            } else {
                setStatus({ type: 'info', message: 'Connected, but no pricing data found in "Pricing Config" table yet. Using default values.' });
                setIsConnected(true);
            }
        } catch (err) {
            setStatus({ type: 'error', message: `Unexpected error: ${err.message}` });
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const statusBorder = { success: 'var(--huel-blue)', error: 'var(--huel-pink)', info: 'var(--huel-mid-gray)' };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ── Product Catalogue ─────────────────────────────── */}
            <ProductCatalogue onProductsUpdated={onProductsUpdated} />

            {/* ── Airtable Connection ───────────────────────────── */}
            <div className="glass-card">
                <div style={{ height: '3px', background: isConnected ? 'var(--huel-blue)' : 'var(--huel-mid-gray)', margin: '-1.5rem -1.5rem 1.5rem -1.5rem' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                    <div>
                        <h2 style={{ color: 'var(--huel-dark)', margin: 0, marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>
                            Airtable Connection
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.8rem' }}>
                            {isConnected
                                ? '● Connected — retailer profiles sync to Airtable on save'
                                : '○ Not connected — data saves locally only'}
                        </p>
                    </div>
                    {isConnected && (
                        <span style={{ background: 'var(--huel-green)', color: 'var(--huel-dark)', fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Live
                        </span>
                    )}
                </div>

                <form onSubmit={handleSave}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                        <div>
                            <label className="form-label">Personal Access Token</label>
                            <input type="password" value={token} onChange={e => setToken(e.target.value)} className="form-input" placeholder="pat••••••••••••••••" autoComplete="off" />
                            <small style={{ display: 'block', marginTop: '4px', fontSize: '0.72rem', color: 'var(--huel-mid-gray)' }}>
                                From airtable.com → Account → Developer Hub
                            </small>
                        </div>
                        <div>
                            <label className="form-label">Base ID</label>
                            <input type="text" value={baseId} onChange={e => setBaseId(e.target.value)} className="form-input" placeholder="appXXXXXXXXXXXXXX" autoComplete="off" />
                            <small style={{ display: 'block', marginTop: '4px', fontSize: '0.72rem', color: 'var(--huel-mid-gray)' }}>
                                From your base URL: airtable.com/<strong>appXXX</strong>/...
                            </small>
                        </div>
                    </div>

                    {status && (
                        <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', backgroundColor: 'var(--huel-light-gray)', borderLeft: `3px solid ${statusBorder[status.type]}`, fontSize: '0.875rem', color: 'var(--huel-dark)' }}>
                            {status.message}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Connecting...' : 'Save & Test Connection'}
                        </button>
                        {isConnected && (
                            <button type="button" className="btn btn-secondary" onClick={() => {
                                setConfig({ token: '', baseId: '' });
                                setToken(''); setBaseId('');
                                setIsConnected(false);
                                setStatus({ type: 'info', message: 'Disconnected. Running in offline mode.' });
                            }}>
                                Disconnect
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* ── Schema setup guide ───────────────────────────── */}
            <div className="glass-card">
                <button onClick={() => setShowGuide(!showGuide)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <h3 style={{ margin: 0, color: 'var(--huel-dark)', fontFamily: 'var(--font-heading)' }}>Airtable Base Setup Guide</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--huel-mid-gray)', fontFamily: 'var(--font-heading)' }}>{showGuide ? '▲ Hide' : '▼ Show'}</span>
                </button>

                {showGuide && (
                    <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
                        <p style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                            Create a new Airtable base with the three tables below. Field names must match exactly.
                        </p>
                        <SchemaTable title="Table 1 — Retailers" rows={[
                            ['Name',            'Single line text', 'Primary field. Retailer name.'],
                            ['Client Type',     'Single select',    'Vending | Airport Concessions | Food Service'],
                            ['Route to Market', 'Single select',    'DSD | Distributor | Direct to Retailer | Wholesale'],
                            ['Synced At',       'Date',             'Auto-set by the dashboard on each sync.'],
                        ]} />
                        <SchemaTable title="Table 2 — Products" rows={[
                            ['Retailer',               'Link to Retailers', 'Links each product to a retailer.'],
                            ['Product Name',           'Single select',     'Huel BE RTD | Huel DG RTD'],
                            ['Num Stores',             'Number',            'Integer.'],
                            ['Base Velocity',          'Number',            'Allow decimals (units/store/week).'],
                            ['SRP',                    'Currency',          'Retail shelf price.'],
                            ['Slotting Fixed',         'Currency',          'Fixed slotting fee.'],
                            ['Slotting Free Fill Qty', 'Number',            'Units (not $).'],
                            ['TPRs',                   'Currency',          'Annual TPR total.'],
                            ['Marketing',              'Currency',          'Annual marketing/ads spend.'],
                        ]} />
                        <SchemaTable title="Table 3 — Pricing Config" rows={[
                            ['Config Key', 'Single line text', 'Primary field. e.g. "DSD", "Huel BE RTD"'],
                            ['Type',       'Single select',    'RTM Price | Product COGS | Product Default SRP'],
                            ['Value',      'Number',           'Allow decimals.'],
                        ]} />
                        <div style={{ background: 'var(--huel-light-gray)', padding: '1rem', borderLeft: '3px solid var(--huel-blue)' }}>
                            <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--huel-dark)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                                Seed "Pricing Config" with these rows
                            </p>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <thead>
                                    <tr>
                                        {['Config Key', 'Type', 'Value'].map(h => (
                                            <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--huel-mid-gray)', fontWeight: 600 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {PRICING_SEED.map(([key, type, val], i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                            <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: 'var(--huel-blue)' }}>{key}</td>
                                            <td style={{ padding: '4px 8px', color: 'var(--huel-mid-gray)' }}>{type}</td>
                                            <td style={{ padding: '4px 8px', fontWeight: 700, color: 'var(--huel-dark)' }}>{val}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--huel-mid-gray)' }}>
                            Once seeded, updating a value in "Pricing Config" will be picked up the next time the dashboard connects — no code change needed.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
