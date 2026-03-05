import React, { useState, useEffect } from 'react';
import { getSyncUrl as getGSheetsUrl, setSyncUrl as setGSheetsUrl, fetchPricingData as fetchGSheetsPricing } from '../utils/googleSheetsSync';
import { getConfig as getAirtableConfig, setConfig as setAirtableConfig, testConnection as testAirtable, fetchPricingData as fetchAirtablePricing } from '../utils/airtableSync';
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

// ── Product Catalogue Card ─────────────────────────────────────────────────
function ProductCatalogue({ onProductsUpdated }) {
    const [products, setProducts] = useState(loadProducts);
    const [saveMsg, setSaveMsg] = useState(null);

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
                        Settings for default SKU costs and MSRP. Changes reflect immediately in calculations.
                    </p>
                </div>
                <button type="button" className="btn btn-primary" onClick={addProduct} style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
                    + Add Product
                </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                <thead>
                    <tr>
                        {['Product Name', 'COGS ($)', 'Default SRP ($)', ''].map(h => (
                            <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--huel-mid-gray)', borderBottom: '2px solid var(--border-light)' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {products.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '8px 10px' }}><input value={p.name} onChange={e => update(i, 'name', e.target.value)} style={inputStyle} /></td>
                            <td style={{ padding: '8px 10px' }}><input type="number" value={p.cogs} onChange={e => update(i, 'cogs', e.target.value)} style={inputStyle} step="0.01" /></td>
                            <td style={{ padding: '8px 10px' }}><input type="number" value={p.defaultSrp} onChange={e => update(i, 'defaultSrp', e.target.value)} style={inputStyle} step="0.01" /></td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <button type="button" onClick={() => removeProduct(i)} style={{ background: 'none', border: 'none', color: 'var(--huel-pink)', cursor: 'pointer', fontWeight: 700 }}>×</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {saveMsg && <div style={{ marginBottom: '1rem', padding: '0.6rem 1rem', background: '#f5f5f5', borderLeft: '3px solid var(--huel-blue)', fontSize: '0.85rem' }}>{saveMsg.text}</div>}

            <button type="button" className="btn btn-primary" onClick={handleSave}>Save Catalogue</button>
        </div>
    );
}

// ── Main Settings Component ────────────────────────────────────────────────
export default function Settings({ onDataLoaded, onProductsUpdated }) {
    // GSheets state
    const [gsUrl, setGsUrl] = useState('');
    const [gsStatus, setGsStatus] = useState(null);
    const [isGsLoading, setIsGsLoading] = useState(false);
    const [isGsConnected, setIsGsConnected] = useState(false);

    // Airtable state
    const [atToken, setAtToken] = useState('');
    const [atBaseId, setAtBaseId] = useState('');
    const [atStatus, setAtStatus] = useState(null);
    const [isAtLoading, setIsAtLoading] = useState(false);
    const [isAtConnected, setIsAtConnected] = useState(false);

    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        const savedGsUrl = getGSheetsUrl();
        if (savedGsUrl) {
            setGsUrl(savedGsUrl);
            setIsGsConnected(true);
        }

        const atConfig = getAirtableConfig();
        if (atConfig) {
            setAtToken(atConfig.token);
            setAtBaseId(atConfig.baseId);
            setIsAtConnected(true);
        }
    }, [getGSheetsUrl, getAirtableConfig]);

    const handleGsSave = async (e) => {
        e.preventDefault();
        if (!gsUrl) {
            setGSheetsUrl('');
            setIsGsConnected(false);
            setGsStatus({ type: 'info', message: 'Sync disabled.' });
            return;
        }
        setIsGsLoading(true);
        setGsStatus({ type: 'info', message: 'Testing connection...' });
        try {
            const data = await fetchGSheetsPricing();
            if (data) {
                setGSheetsUrl(gsUrl);
                updateDynamicPricing(data.pricingTiers, data.products);
                setGsStatus({ type: 'success', message: 'Connected to Google Sheets!' });
                setIsGsConnected(true);
                if (onDataLoaded) onDataLoaded();
            } else {
                setGsStatus({ type: 'error', message: 'Failed to fetch data.' });
            }
        } catch (err) {
            setGsStatus({ type: 'error', message: err.message });
        } finally { setIsGsLoading(false); }
    };

    const handleAtSave = async (e) => {
        e.preventDefault();
        if (!atToken || !atBaseId) {
            setAirtableConfig({ token: '', baseId: '' });
            setIsAtConnected(false);
            setAtStatus({ type: 'info', message: 'Sync disabled.' });
            return;
        }
        setIsAtLoading(true);
        setAtStatus({ type: 'info', message: 'Testing connection...' });
        try {
            setAirtableConfig({ token: atToken, baseId: atBaseId });
            const test = await testAirtable();
            if (test.success) {
                const data = await fetchAirtablePricing();
                if (data) updateDynamicPricing(data.pricingTiers, data.products);
                setAtStatus({ type: 'success', message: 'Connected to Airtable!' });
                setIsAtConnected(true);
                if (onDataLoaded) onDataLoaded();
            } else {
                setAtStatus({ type: 'error', message: test.error });
            }
        } catch (err) {
            setAtStatus({ type: 'error', message: err.message });
        } finally { setIsAtLoading(false); }
    };

    const statusStyle = (type) => ({
        marginBottom: '1rem', padding: '0.75rem', background: '#f8f8f8',
        borderLeft: `3px solid ${type === 'success' ? 'var(--huel-blue)' : 'var(--huel-pink)'}`,
        fontSize: '0.85rem'
    });

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <ProductCatalogue onProductsUpdated={onProductsUpdated} />

            {/* Google Sheets Section */}
            <div className="glass-card">
                <div style={{ height: '3px', background: isGsConnected ? 'var(--huel-blue)' : 'var(--huel-mid-gray)', margin: '-1.5rem -1.5rem 1.5rem -1.5rem' }} />
                <h3 className="mb-4">Google Sheets Connection</h3>
                <form onSubmit={handleGsSave}>
                    <div className="form-group mb-4">
                        <label className="form-label">Apps Script Web App URL</label>
                        <input type="url" value={gsUrl} onChange={e => setGsUrl(e.target.value)} className="form-input" placeholder="https://script.google.com/..." />
                    </div>
                    {gsStatus && <div style={statusStyle(gsStatus.type)}>{gsStatus.message}</div>}
                    <button type="submit" className="btn btn-primary" disabled={isGsLoading}>{isGsLoading ? 'Connecting...' : 'Save & Test'}</button>
                </form>
            </div>

            {/* Airtable Section */}
            <div className="glass-card">
                <div style={{ height: '3px', background: isAtConnected ? 'var(--huel-blue)' : 'var(--huel-mid-gray)', margin: '-1.5rem -1.5rem 1.5rem -1.5rem' }} />
                <h3 className="mb-4">Airtable Connection</h3>
                <form onSubmit={handleAtSave}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="form-label">Personal Access Token</label>
                            <input type="password" value={atToken} onChange={e => setAtToken(e.target.value)} className="form-input" placeholder="pat..." />
                        </div>
                        <div>
                            <label className="form-label">Base ID</label>
                            <input type="text" value={atBaseId} onChange={e => setAtBaseId(e.target.value)} className="form-input" placeholder="app..." />
                        </div>
                    </div>
                    {atStatus && <div style={statusStyle(atStatus.type)}>{atStatus.message}</div>}
                    <button type="submit" className="btn btn-primary" disabled={isAtLoading}>{isAtLoading ? 'Connecting...' : 'Save & Test'}</button>
                </form>
            </div>

            {/* Schema Guide */}
            <div className="glass-card">
                <button onClick={() => setShowGuide(!showGuide)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                    <h3 style={{ margin: 0 }}>{showGuide ? '▲' : '▼'} Airtable Base Setup Guide</h3>
                </button>
                {showGuide && (
                    <div style={{ marginTop: '1.25rem' }}>
                        <SchemaTable title="Table: Retailers" rows={[['Name', 'Text', 'Primary'], ['Client Type', 'Select', 'Vending | Airport | Food Service'], ['Synced At', 'Date', 'Auto']]} />
                        <SchemaTable title="Table: Products" rows={[['Retailer', 'Link', 'Linked to Retailers'], ['Product Name', 'Select', 'Huel BE RTD | Huel DG RTD'], ['Num Stores', 'Number', ''], ['Base Velocity', 'Number', '']]} />
                    </div>
                )}
            </div>
        </div>
    );
}
