import React, { useState, useEffect } from 'react';
import { getSyncUrl, setSyncUrl, fetchPricingData } from '../utils/googleSheetsSync';
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
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const savedUrl = getSyncUrl();
        if (savedUrl) {
            setUrl(savedUrl);
            setIsConnected(true);
        }
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();

        if (!url) {
            setSyncUrl('');
            setIsConnected(false);
            setStatus({ type: 'info', message: 'Sync disabled. Data will save locally only.' });
            return;
        }

        setIsLoading(true);
        setStatus({ type: 'info', message: 'Testing Google Sheets connection...' });

        try {
            const data = await fetchPricingData();
            if (data && (Object.keys(data.pricingTiers || {}).length || Object.keys(data.products || {}).length)) {
                setSyncUrl(url);
                updateDynamicPricing(data.pricingTiers, data.products);
                setStatus({ type: 'success', message: 'Successfully connected to Google Sheet!' });
                setIsConnected(true);
                if (onDataLoaded) onDataLoaded();
            } else {
                setStatus({ type: 'error', message: 'Connected, but no valid pricing data found. Check your sheet tabs.' });
                setIsConnected(false);
            }
        } catch (err) {
            setStatus({ type: 'error', message: `Connection failed: ${err.message}` });
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <ProductCatalogue onProductsUpdated={onProductsUpdated} />

            <div className="glass-card">
                <div style={{ height: '3px', background: isConnected ? 'var(--huel-blue)' : 'var(--huel-mid-gray)', margin: '-1.5rem -1.5rem 1.5rem -1.5rem' }} />
                <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                    <h2 style={{ color: 'var(--huel-dark)', margin: 0, marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>
                        Google Sheets Connection
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: isConnected ? 'var(--huel-blue)' : 'var(--huel-mid-gray)' }}>
                        {isConnected ? '● Connected to live sheet' : '○ Not connected — local only'}
                    </p>
                </div>

                <form onSubmit={handleSave}>
                    <div className="form-group mb-4">
                        <label className="form-label">Google Apps Script Web App URL</label>
                        <input
                            type="url"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="form-input"
                            placeholder="https://script.google.com/macros/s/.../exec"
                        />
                        <small style={{ marginTop: '6px', display: 'block', color: 'var(--huel-mid-gray)' }}>
                            The URL generated when you deploy your Apps Script as a Web App.
                        </small>
                    </div>

                    {status && (
                        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8f8f8', borderLeft: `3px solid ${status.type === 'success' ? 'var(--huel-blue)' : 'var(--huel-pink)'}`, fontSize: '0.85rem' }}>
                            {status.message}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Syncing...' : 'Save & Test Connection'}
                        </button>
                        {isConnected && (
                            <button type="button" className="btn btn-secondary" onClick={() => {
                                setSyncUrl('');
                                setUrl('');
                                setIsConnected(false);
                                setStatus({ type: 'info', message: 'Disconnected.' });
                            }}>
                                Disconnect
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
