import React, { useState, useEffect } from 'react';

import { DEFAULT_PRODUCTS } from './Settings';

export default function ClientForm({ onSave, onCancel, initialData, availableProducts }) {
    const productList = availableProducts || DEFAULT_PRODUCTS;

    const emptyProduct = {
        productName: productList[0]?.name || 'Huel BE RTD',
        routeToMarket: 'DSD',
        numStores: '',
        baseVelocity: '',
        srp: '',
        slottingFixed: '',
        slottingFreeFillQty: '',
        tprs: '',
        marketing: '',
    };

    const [formData, setFormData] = useState({
        retailerName: '',
        clientType: 'Vending',
        rebate: '',
        dealType: 'standard',
        numMachines: '',
        machineCostPerUnit: '',
        revenueSharePct: '',
        revenueShareMin: '',
        products: [{ ...emptyProduct }]
    });

    useEffect(() => {
        if (initialData) {
            // Legacy: top-level routeToMarket — migrate down to each product
            const legacyRtm = initialData.routeToMarket || 'DSD';
            if (initialData.products) {
                setFormData({
                    dealType: 'standard',
                    numMachines: '',
                    machineCostPerUnit: '',
                    revenueSharePct: '',
                    revenueShareMin: '',
                    rebate: '',
                    ...initialData,
                    products: initialData.products.map(({ machineCostPerUnit: _mc, ...p }) => ({
                        ...p,
                        // If product doesn't have its own RTM yet, inherit from top-level
                        routeToMarket: p.routeToMarket || legacyRtm,
                    })),
                });
            } else {
                const { retailerName, routeToMarket: _rtm, clientType, ...productData } = initialData;
                setFormData({
                    retailerName,
                    clientType: clientType || 'Vending',
                    rebate: '',
                    dealType: 'standard',
                    numMachines: '',
                    machineCostPerUnit: '',
                    revenueSharePct: '',
                    revenueShareMin: '',
                    products: [{ routeToMarket: legacyRtm, ...productData }],
                });
            }
        }
    }, [initialData]);

    const handleGeneralChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleProductChange = (index, e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newProducts = [...prev.products];
            newProducts[index] = { ...newProducts[index], [name]: value };
            return { ...prev, products: newProducts };
        });
    };

    const addProduct = () => {
        setFormData(prev => ({ ...prev, products: [...prev.products, { ...emptyProduct }] }));
    };

    const removeProduct = (index) => {
        setFormData(prev => {
            const newProducts = prev.products.filter((_, i) => i !== index);
            return { ...prev, products: newProducts.length ? newProducts : [{ ...emptyProduct }] };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const isVending = formData.clientType === 'Vending';
    const isRevenueShare = isVending && formData.dealType === 'revenue_share';

    // Live weekly units preview
    const shortName = (name = '') => {
        const parts = name.split(' ');
        return parts.length > 1 ? parts.slice(1).join(' ') : name;
    };
    const liveWeeklyBreakdown = formData.products
        .map(p => ({
            label: shortName(p.productName) || p.productName,
            units: (Number(p.numStores) || 0) * (Number(p.baseVelocity) || 0),
        }))
        .filter(p => p.units > 0);
    const totalLiveWeekly = liveWeeklyBreakdown.reduce((s, p) => s + p.units, 0);

    // Toggle button style helper
    const toggleStyle = (active) => ({
        padding: '0.45rem 1rem',
        fontSize: '0.8rem',
        fontFamily: 'var(--font-heading)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        border: '1px solid var(--huel-blue)',
        cursor: 'pointer',
        transition: 'background 0.15s',
        background: active ? 'var(--huel-blue)' : 'transparent',
        color: active ? '#fff' : 'var(--huel-blue)',
    });

    return (
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Huel accent strip */}
            <div style={{ height: '3px', background: 'var(--huel-blue)', margin: '-1.5rem -1.5rem 1.5rem -1.5rem' }} />
            <h2 style={{ color: 'var(--huel-dark)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', fontFamily: 'var(--font-heading)' }}>
                {initialData ? 'Edit Retailer Configuration' : 'Add New Retailer Configuration'}
            </h2>

            <form onSubmit={handleSubmit}>
                {/* ── 1. General Information ──────────────────────────────────── */}
                <div className="form-group mb-6">
                    <h3 className="mb-4">1. General Information</h3>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label className="form-label">Retailer Name</label>
                            <input
                                type="text"
                                name="retailerName"
                                value={formData.retailerName}
                                onChange={handleGeneralChange}
                                className="form-input"
                                placeholder="e.g. Target"
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Client Type</label>
                            <select name="clientType" value={formData.clientType} onChange={handleGeneralChange} className="form-select">
                                <option value="Vending">Vending</option>
                                <option value="Airport Concessions">Airport Concessions</option>
                                <option value="Food Service">Food Service</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Partner Rebate (%)</label>
                            <input
                                type="number"
                                name="rebate"
                                value={formData.rebate}
                                onChange={handleGeneralChange}
                                className="form-input"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="e.g. 5"
                            />
                            <small style={{ display: 'block', marginTop: '4px', fontSize: '0.72rem', color: 'var(--huel-mid-gray)' }}>
                                % of Huel's gross revenue paid back to partner as a rebate.
                            </small>
                        </div>
                    </div>
                </div>

                {/* ── 2. Vending Deal Structure (only for Vending) ────────────── */}
                {isVending && (
                    <div className="mb-6" style={{ backgroundColor: 'var(--huel-light-gray)', padding: '1.5rem', border: '1px solid rgba(0,86,179,0.15)', borderLeft: '3px solid var(--huel-blue)' }}>
                        <h3 className="mb-4" style={{ margin: 0, marginBottom: '1.25rem', color: 'var(--huel-dark)', fontFamily: 'var(--font-heading)', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            2. Vending Deal Structure
                        </h3>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Deal Type</label>
                            <div style={{ display: 'flex', gap: 0 }}>
                                <button
                                    type="button"
                                    style={{ ...toggleStyle(formData.dealType === 'standard'), borderRight: 'none' }}
                                    onClick={() => setFormData(prev => ({ ...prev, dealType: 'standard' }))}
                                >
                                    Standard RTM
                                </button>
                                <button
                                    type="button"
                                    style={toggleStyle(formData.dealType === 'revenue_share')}
                                    onClick={() => setFormData(prev => ({ ...prev, dealType: 'revenue_share' }))}
                                >
                                    Revenue Share
                                </button>
                            </div>
                            <small style={{ display: 'block', marginTop: '6px', fontSize: '0.72rem', color: 'var(--huel-mid-gray)' }}>
                                {formData.dealType === 'standard'
                                    ? 'Huel earns revenue at the RTM unit price per case sold.'
                                    : 'Partner operates the machine; Huel earns the greater of the minimum guarantee or a % of retail sales.'}
                            </small>
                        </div>

                        {/* Number of machines + cost — always shown for vending */}
                        <div className="grid grid-cols-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
                            <div>
                                <label className="form-label">Number of Machines</label>
                                <input
                                    type="number"
                                    name="numMachines"
                                    value={formData.numMachines}
                                    onChange={handleGeneralChange}
                                    className="form-input"
                                    min="0"
                                    placeholder="e.g. 10"
                                />
                                <small style={{ display: 'block', marginTop: '4px', fontSize: '0.72rem', color: 'var(--huel-mid-gray)' }}>
                                    Total machines placed at this account.
                                </small>
                            </div>
                            <div>
                                <label className="form-label">Machine Cost per Unit ($)</label>
                                <input
                                    type="number"
                                    name="machineCostPerUnit"
                                    value={formData.machineCostPerUnit}
                                    onChange={handleGeneralChange}
                                    className="form-input"
                                    min="0"
                                    placeholder="e.g. 2500"
                                />
                                <small style={{ display: 'block', marginTop: '4px', fontSize: '0.72rem', color: 'var(--huel-mid-gray)' }}>
                                    Year 1 cost per machine (purchase or annual lease). Total capex = machines × cost.
                                </small>
                            </div>
                        </div>

                        {isRevenueShare && (
                            <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
                                <div>
                                    <label className="form-label">Monthly Minimum to Partner ($)</label>
                                    <input
                                        type="number"
                                        name="revenueShareMin"
                                        value={formData.revenueShareMin}
                                        onChange={handleGeneralChange}
                                        className="form-input"
                                        min="0"
                                        placeholder="e.g. 3000"
                                    />
                                    <small style={{ display: 'block', marginTop: '4px', fontSize: '0.72rem', color: 'var(--huel-mid-gray)' }}>
                                        Huel pays this to the partner monthly regardless of sales. Annualised (×12) in ROI.
                                    </small>
                                </div>
                                <div>
                                    <label className="form-label">Partner Sales Split (%)</label>
                                    <input
                                        type="number"
                                        name="revenueSharePct"
                                        value={formData.revenueSharePct}
                                        onChange={handleGeneralChange}
                                        className="form-input"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        placeholder="e.g. 40"
                                    />
                                    <small style={{ display: 'block', marginTop: '4px', fontSize: '0.72rem', color: 'var(--huel-mid-gray)' }}>
                                        Partner's share of retail sales. Huel pays the greater of this or the monthly minimum.
                                    </small>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── 3. Product Forecasts ─────────────────────────────────────── */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 style={{ margin: 0 }}>{isVending ? '3' : '2'}. Product Forecasts</h3>
                        <button type="button" onClick={addProduct} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                            + Add Product
                        </button>
                    </div>

                    {formData.products.map((product, index) => (
                        <div key={index} style={{ backgroundColor: 'var(--huel-light-gray)', padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', border: '1px solid rgba(0,0,0,0.07)' }}>
                            {formData.products.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeProduct(index)}
                                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Remove
                                </button>
                            )}

                            <h4 className="mb-4" style={{ color: 'var(--huel-dark)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.8rem' }}>Product Setup {index + 1}</h4>

                            {/* Row 1: Product · RTM · Locations */}
                            <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                <div>
                                    <label className="form-label">RTD Product</label>
                                    <select name="productName" value={product.productName} onChange={(e) => handleProductChange(index, e)} className="form-select">
                                        {productList.map(p => (
                                            <option key={p.name} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Route to Market</label>
                                    <select name="routeToMarket" value={product.routeToMarket || 'DSD'} onChange={(e) => handleProductChange(index, e)} className="form-select">
                                        <option value="DSD">DSD</option>
                                        <option value="Distributor">Distributor</option>
                                        <option value="Direct to Retailer">Direct to Retailer</option>
                                        <option value="Wholesale">Wholesale</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">{isVending ? 'Vending Locations' : 'Stores'}</label>
                                    <input
                                        type="number"
                                        name="numStores"
                                        value={product.numStores}
                                        onChange={(e) => handleProductChange(index, e)}
                                        className="form-input"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                            {/* Row 2: Velocity · SRP */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="form-label">Base Velocity (Units/Location/Wk)</label>
                                    <input
                                        type="number"
                                        name="baseVelocity"
                                        value={product.baseVelocity}
                                        onChange={(e) => handleProductChange(index, e)}
                                        className="form-input"
                                        step="0.1"
                                        min="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Retail SRP ($)</label>
                                    <input
                                        type="number"
                                        name="srp"
                                        value={product.srp}
                                        onChange={(e) => handleProductChange(index, e)}
                                        className="form-input"
                                        step="0.01"
                                        min="0"
                                        placeholder="e.g. 4.99"
                                    />
                                </div>
                            </div>

                            <h4 className="mb-4" style={{ color: 'var(--huel-mid-gray)', fontSize: '0.75rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trade Spend Profile — Annual</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Slotting Fixed Fee ($)</label>
                                    <input
                                        type="number"
                                        name="slottingFixed"
                                        value={product.slottingFixed}
                                        onChange={(e) => handleProductChange(index, e)}
                                        className="form-input"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Slotting Free Fill (Units)</label>
                                    <input
                                        type="number"
                                        name="slottingFreeFillQty"
                                        value={product.slottingFreeFillQty}
                                        onChange={(e) => handleProductChange(index, e)}
                                        className="form-input"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Total TPRs Spend ($)</label>
                                    <input
                                        type="number"
                                        name="tprs"
                                        value={product.tprs}
                                        onChange={(e) => handleProductChange(index, e)}
                                        className="form-input"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Total Marketing/Ads Spend ($)</label>
                                    <input
                                        type="number"
                                        name="marketing"
                                        value={product.marketing}
                                        onChange={(e) => handleProductChange(index, e)}
                                        className="form-input"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Live Weekly Units Preview ───────────────────────────── */}
                {totalLiveWeekly > 0 && (
                    <div style={{
                        background: 'rgba(0,86,179,0.05)',
                        border: '1px solid rgba(0,86,179,0.2)',
                        borderLeft: '3px solid var(--huel-blue)',
                        padding: '0.85rem 1.1rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{
                                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.06em', color: 'var(--huel-blue)',
                            }}>
                                Weekly Units
                            </span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--huel-dark)' }}>
                                {totalLiveWeekly % 1 === 0 ? totalLiveWeekly : totalLiveWeekly.toFixed(1)}
                            </span>
                        </div>
                        {liveWeeklyBreakdown.length > 1 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--huel-mid-gray)' }}>
                                {liveWeeklyBreakdown.map(p =>
                                    `${p.units % 1 === 0 ? p.units : p.units.toFixed(1)} ${p.label}`
                                ).join(' · ')}
                            </span>
                        )}
                    </div>
                )}

                <div className="flex justify-between mt-8" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                    <button type="button" onClick={onCancel} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                        Save Retailer Profile
                    </button>
                </div>
            </form>
        </div>
    );
}
