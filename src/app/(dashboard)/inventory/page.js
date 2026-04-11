// src/app/(dashboard)/inventory/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// ─── CSS ───
const INV_CSS = `
  @keyframes ivSlideUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ivScaleIn  { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
  @keyframes ivFadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes ivSpin     { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes ivFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes ivPulse    { 0%,100%{opacity:1} 50%{opacity:.65} }
  @keyframes ivBarFill  { from{width:0} to{width:var(--fill)} }

  .iv-glass {
    background: rgba(255,255,255,.04);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 18px;
    transition: all .3s cubic-bezier(.4,0,.2,1);
  }
  .iv-glass:hover {
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.11);
  }
  .iv-stat:hover { transform: translateY(-4px); box-shadow: 0 20px 48px rgba(0,0,0,.35); }
  .iv-stat:hover .iv-stat-icon { transform: scale(1.12) rotate(6deg); }
  .iv-btn { transition: all .22s ease; cursor: pointer; }
  .iv-btn:hover { transform: translateY(-1px); }
  .iv-btn:active { transform: translateY(0) scale(.98); }
  .iv-row { transition: background .2s ease; }
  .iv-row:hover { background: rgba(255,255,255,.04) !important; }
  .iv-overlay { animation: ivFadeIn .25s ease; }
  .iv-modal { animation: ivScaleIn .3s cubic-bezier(.4,0,.2,1); }

  .iv-input {
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 12px;
    padding: 11px 14px;
    color: white; font-size: 14px;
    width: 100%; outline: none;
    transition: all .22s ease;
  }
  .iv-input::placeholder { color: rgba(255,255,255,.28); }
  .iv-input:focus {
    border-color: rgba(20,184,166,.5);
    background: rgba(255,255,255,.07);
    box-shadow: 0 0 0 3px rgba(20,184,166,.12);
  }
  .iv-input:disabled {
    opacity: .5; cursor: not-allowed;
  }
  .iv-select {
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 12px;
    padding: 11px 14px;
    color: white; font-size: 14px;
    width: 100%; outline: none;
    appearance: none; cursor: pointer;
    transition: all .22s ease;
  }
  .iv-select option { background: #1a1f35; color: white; }
  .iv-select:focus {
    border-color: rgba(20,184,166,.5);
    box-shadow: 0 0 0 3px rgba(20,184,166,.12);
  }
  .iv-label {
    display: block; font-size: 11px; font-weight: 700;
    color: rgba(255,255,255,.45);
    margin-bottom: 5px;
    text-transform: uppercase; letter-spacing: .7px;
  }
  .iv-search {
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px;
    padding: 10px 14px 10px 40px;
    color: white; font-size: 14px;
    width: 100%; outline: none;
    transition: all .22s ease;
  }
  .iv-search::placeholder { color: rgba(255,255,255,.28); }
  .iv-search:focus {
    border-color: rgba(20,184,166,.4);
    background: rgba(255,255,255,.07);
    box-shadow: 0 0 0 3px rgba(20,184,166,.1);
  }

  /* number input spinners */
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }

  @media(max-width:768px) {
    .iv-stat:hover { transform: none; }
    .iv-stat:hover .iv-stat-icon { transform: none; }
    .iv-glass:hover { transform: none; }
  }
`;

// ─── Categories ───
const CATEGORIES = [
  { value: 'PARTS', label: 'Parts', icon: '⚙️' },
  { value: 'ACCESSORIES', label: 'Accessories', icon: '🔧' },
  { value: 'FLUIDS', label: 'Fluids & Oils', icon: '🛢️' },
  { value: 'FILTERS', label: 'Filters', icon: '🔲' },
  { value: 'ELECTRICAL', label: 'Electrical', icon: '⚡' },
  { value: 'BODY', label: 'Body Parts', icon: '🚗' },
  { value: 'TYRES', label: 'Tyres & Wheels', icon: '🛞' },
  { value: 'TOOLS', label: 'Tools', icon: '🔨' },
  { value: 'OTHER', label: 'Other', icon: '📦' },
];

const catIcon = (c) => CATEGORIES.find(x => x.value === c)?.icon || '📦';

const stockStatus = (p) => {
  if (p.quantity === 0) return { label: 'Out of Stock', bg: 'rgba(239,68,68,.12)', border: 'rgba(239,68,68,.2)', color: '#fca5a5', icon: '❌' };
  if (p.quantity <= p.minStockLevel) return { label: 'Low Stock', bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.2)', color: '#fcd34d', icon: '⚠️' };
  return { label: 'In Stock', bg: 'rgba(16,185,129,.12)', border: 'rgba(16,185,129,.2)', color: '#6ee7b7', icon: '✓' };
};

// ─── Animated number ───
function AnimNum({ value, prefix = '' }) {
  const [d, setD] = useState(0);
  useEffect(() => {
    const n = typeof value === 'number' ? value : parseInt(String(value).replace(/[^0-9]/g, '')) || 0;
    if (!n) { setD(0); return; }
    let c = 0; const inc = n / 30;
    const t = setInterval(() => {
      c += inc;
      if (c >= n) { setD(n); clearInterval(t); } else setD(Math.floor(c));
    }, 20);
    return () => clearInterval(t);
  }, [value]);
  return <>{prefix}{d.toLocaleString('en-IN')}</>;
}

// ══════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════
export default function InventoryPage() {
  const [parts, setParts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // modals
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // bulk
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // filters
  const [filters, setFilters] = useState({ search: '', category: '', lowStock: false });

  // form
  const [formData, setFormData] = useState({
    partNumber: '', name: '', description: '', category: 'PARTS',
    brand: '', costPrice: '', sellingPrice: '', quantity: '',
    minStockLevel: '5', location: '', supplier: '', branchId: '',
  });

  // adjust
  const [adjData, setAdjData] = useState({ type: 'add', quantity: '', reason: '' });

  // stats
  const [stats, setStats] = useState({
    totalItems: 0, totalValue: 0, availableItems: 0,
    lowStockCount: 0, outOfStockCount: 0,
  });

  // ─── init ───
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setCurrentUser(JSON.parse(u));
    fetchBranches();
  }, []);

  useEffect(() => { if (currentUser) fetchParts(); }, [filters, currentUser]);

  const fetchBranches = async () => {
    try {
      const r = await fetch('/api/branches');
      const d = await r.json();
      if (d.success) setBranches(d.data || []);
    } catch {}
  };

  const fetchParts = useCallback(async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams();
      if (filters.search) p.append('search', filters.search);
      if (filters.category) p.append('category', filters.category);
      if (filters.lowStock) p.append('lowStock', 'true');
      const r = await fetch(`/api/inventory?${p}`);
      const d = await r.json();
      if (d.success) {
        setParts(d.data || []);
        const data = d.data || [];
        setStats({
          totalItems: data.length,
          totalValue: data.reduce((s, p) => s + p.sellingPrice * p.quantity, 0),
          availableItems: data.filter(p => p.quantity > 0).length,
          lowStockCount: data.filter(p => p.quantity <= p.minStockLevel && p.quantity > 0).length,
          outOfStockCount: data.filter(p => p.quantity === 0).length,
        });
      }
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  }, [filters]);

  // ─── form handlers ───
  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => {
    setFormData({
      partNumber: '', name: '', description: '', category: 'PARTS',
      brand: '', costPrice: '', sellingPrice: '', quantity: '',
      minStockLevel: '5', location: '', supplier: '', branchId: '',
    });
    setEditingPart(null);
  };

  const openCreate = () => { resetForm(); setShowModal(true); };
  const openEdit = (part) => {
    setEditingPart(part);
    setFormData({
      partNumber: part.partNumber, name: part.name,
      description: part.description || '', category: part.category,
      brand: part.brand || '',
      costPrice: String(part.costPrice), sellingPrice: String(part.sellingPrice),
      quantity: String(part.quantity), minStockLevel: String(part.minStockLevel),
      location: part.location || '', supplier: part.supplier || '',
      branchId: part.branchId || '',
    });
    setShowModal(true);
  };
  const openAdjust = (part) => {
    setSelectedPart(part);
    setAdjData({ type: 'add', quantity: '', reason: '' });
    setShowAdjustModal(true);
  };
  const openDetail = (part) => { setSelectedPart(part); setShowDetailModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const payload = editingPart ? { id: editingPart.id, ...formData } : formData;
      const r = await fetch('/api/inventory', {
        method: editingPart ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || 'Failed'); return; }
      toast.success(`Part ${editingPart ? 'updated' : 'added'}!`);
      resetForm(); setShowModal(false); fetchParts();
    } catch { toast.error('Error'); }
    finally { setSubmitting(false); }
  };

  const handleAdjust = async (e) => {
    e.preventDefault(); if (!selectedPart) return; setSubmitting(true);
    try {
      const r = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPart.id,
          adjustmentType: adjData.type,
          adjustmentQty: Number(adjData.quantity),
        }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || 'Failed'); return; }
      toast.success(`Stock ${adjData.type === 'add' ? 'added' : 'reduced'}!`);
      setShowAdjustModal(false); fetchParts();
    } catch { toast.error('Error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (part) => {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/inventory?id=${part.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || 'Failed'); return; }
      toast.success(d.message || 'Deleted');
      setShowDeleteConfirm(null); fetchParts();
    } catch { toast.error('Error'); }
    finally { setSubmitting(false); }
  };

  // ─── Excel handlers ───
  const downloadTemplate = () => {
    const tpl = [
      { partNumber:'OIL-5W30-001', name:'Engine Oil 5W-30', description:'1L synthetic', category:'FLUIDS', brand:'Castrol', costPrice:450, sellingPrice:650, quantity:50, minStockLevel:10, location:'Shelf A-1', supplier:'Auto Parts Ltd' },
      { partNumber:'FILTER-OIL-002', name:'Oil Filter', description:'Standard', category:'FILTERS', brand:'Bosch', costPrice:150, sellingPrice:250, quantity:100, minStockLevel:20, location:'Shelf B-2', supplier:'Bosch India' },
    ];
    const ws = XLSX.utils.json_to_sheet(tpl);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    ws['!cols'] = [{ wch:20 },{ wch:30 },{ wch:40 },{ wch:15 },{ wch:15 },{ wch:12 },{ wch:12 },{ wch:10 },{ wch:15 },{ wch:15 },{ wch:25 }];
    XLSX.writeFile(wb, 'Inventory_Template.xlsx');
    toast.success('Template downloaded');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!file.name.match(/\.xlsx?$/)) { toast.error('Upload .xlsx or .xls'); return; }
    setUploadFile(file); setIsProcessing(true); setUploadErrors([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (!json.length) { toast.error('Empty file'); setIsProcessing(false); return; }
        const cats = CATEGORIES.map(c => c.value);
        const valid = [], errors = [];
        json.forEach((row, i) => {
          const errs = [];
          if (!row.partNumber) errs.push('Part number required');
          if (!row.name) errs.push('Name required');
          if (!row.category) errs.push('Category required');
          if (row.costPrice == null) errs.push('Cost price required');
          if (row.sellingPrice == null) errs.push('Selling price required');
          if (row.quantity == null) errs.push('Quantity required');
          if (row.category && !cats.includes(String(row.category).toUpperCase())) errs.push('Invalid category');
          if (errs.length) errors.push({ row: i + 2, data: row, errors: errs });
          else valid.push({ ...row, partNumber: String(row.partNumber).trim().toUpperCase(), category: String(row.category).toUpperCase(), costPrice: Number(row.costPrice), sellingPrice: Number(row.sellingPrice), quantity: Number(row.quantity), minStockLevel: row.minStockLevel ? Number(row.minStockLevel) : 5 });
        });
        setUploadPreview(valid); setUploadErrors(errors); setIsProcessing(false);
        if (valid.length) toast.success(`${valid.length} valid items`);
        if (errors.length) toast.error(`${errors.length} errors`);
      } catch { toast.error('Error reading file'); setIsProcessing(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkUpload = async () => {
    if (!uploadPreview.length) { toast.error('No valid items'); return; }
    setSubmitting(true);
    try {
      const r = await fetch('/api/inventory/bulk-upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts: uploadPreview, branchId: currentUser?.role === 'SUPER_ADMIN' ? null : currentUser?.branchId }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || 'Failed'); return; }
      toast.success(`Uploaded ${d.imported} part(s)`);
      setShowBulkModal(false); setUploadFile(null); setUploadPreview([]); setUploadErrors([]); fetchParts();
    } catch { toast.error('Upload error'); }
    finally { setSubmitting(false); }
  };

  const canManage = ['SUPER_ADMIN', 'MANAGER'].includes(currentUser?.role);
  const isEmployee = currentUser?.role === 'EMPLOYEE';

  const STAT_CARDS = [
    { label: 'Total Items', v: stats.totalItems, icon: '📦', grad: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
    isEmployee
      ? { label: 'Available', v: stats.availableItems, icon: '✅', grad: 'linear-gradient(135deg,#10b981,#059669)' }
      : { label: 'Inventory Value', v: `₹${stats.totalValue.toLocaleString('en-IN')}`, icon: '💰', grad: 'linear-gradient(135deg,#10b981,#059669)' },
    { label: 'Low Stock', v: stats.lowStockCount, icon: '⚠️', grad: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    { label: 'Out of Stock', v: stats.outOfStockCount, icon: '❌', grad: 'linear-gradient(135deg,#ef4444,#dc2626)' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: INV_CSS }} />

      <div style={{ minHeight: '100vh' }}>
        {/* ═══ HEADER ═══ */}
        <div style={{ marginBottom: 24, animation: 'ivSlideUp .5s ease' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 26 }}>📦</span>
                <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem,4vw,1.7rem)', fontWeight: 800, color: 'white', letterSpacing: '-.5px' }}>
                  {isEmployee ? 'Parts & Inventory' : 'Inventory Management'}
                </h1>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.4)', fontWeight: 500 }}>
                {isEmployee ? 'View available parts and stock' : 'Manage parts, supplies, and stock'}
              </p>
            </div>

            {canManage && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <GlassBtn onClick={downloadTemplate} label={isMobile ? '📥' : '📥 Template'} outline color="#10b981" />
                <GlassBtn onClick={() => setShowBulkModal(true)} label={isMobile ? '📤 Bulk' : '📤 Bulk Upload'} grad="linear-gradient(135deg,#8b5cf6,#6d28d9)" glow="rgba(139,92,246,.35)" />
                <GlassBtn onClick={openCreate} label={isMobile ? '➕ Add' : '➕ Add Part'} grad="linear-gradient(135deg,#14b8a6,#0891b2)" glow="rgba(20,184,166,.35)" />
              </div>
            )}
          </div>
        </div>

        {/* ═══ STATS ═══ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${isMobile ? '140px' : '220px'}), 1fr))`,
          gap: isMobile ? 10 : 14, marginBottom: 20,
        }}>
          {STAT_CARDS.map((s, i) => (
            <div key={s.label} className="iv-glass iv-stat" style={{
              padding: isMobile ? '14px' : 'clamp(14px,2vw,20px)',
              animation: `ivSlideUp .5s ease ${i * .08}s backwards`,
              cursor: 'default',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '.7px' }}>{s.label}</p>
                  <p style={{ margin: '5px 0 0', fontSize: isMobile ? '1.2rem' : 'clamp(1.2rem,2.5vw,1.6rem)', fontWeight: 800, color: 'white', letterSpacing: '-.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {typeof s.v === 'number' ? <AnimNum value={s.v} /> : s.v}
                  </p>
                </div>
                <div className="iv-stat-icon" style={{
                  width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, borderRadius: 13,
                  background: s.grad,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMobile ? 20 : 22, flexShrink: 0,
                  boxShadow: '0 6px 18px rgba(0,0,0,.25)',
                  transition: 'transform .3s ease',
                }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ═══ LOW STOCK ALERT ═══ */}
        {stats.lowStockCount > 0 && (
          <div style={{
            padding: isMobile ? 14 : 18, marginBottom: 20, borderRadius: 16,
            background: 'rgba(245,158,11,.08)',
            border: '1px solid rgba(245,158,11,.2)',
            animation: 'ivSlideUp .5s ease .2s backwards',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: isMobile ? 24 : 28, animation: 'ivPulse 2s ease infinite' }}>⚠️</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#fcd34d', fontSize: isMobile ? 14 : 15 }}>Low Stock Alert</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
                  {stats.lowStockCount} item(s) low. {stats.outOfStockCount > 0 && `${stats.outOfStockCount} out of stock.`}
                </p>
              </div>
              <button onClick={() => setFilters(p => ({ ...p, lowStock: true }))} className="iv-btn" style={{
                padding: '8px 16px', borderRadius: 10,
                background: 'rgba(245,158,11,.2)', border: '1px solid rgba(245,158,11,.3)',
                color: '#fcd34d', fontSize: 12, fontWeight: 700,
              }}>View Items</button>
            </div>
          </div>
        )}

        {/* ═══ FILTERS ═══ */}
        <div className="iv-glass" style={{
          padding: isMobile ? 14 : 18, marginBottom: 20,
          animation: 'ivSlideUp .5s ease .25s backwards',
        }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
            {/* search */}
            <div style={{ flex: 1, position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(255,255,255,.3)', pointerEvents: 'none' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="iv-search" name="search" value={filters.search} onChange={handleFilterChange}
                placeholder="Search parts..." />
            </div>

            {/* category */}
            <select className="iv-select" name="category" value={filters.category} onChange={handleFilterChange}
              style={{ minWidth: isMobile ? '100%' : 150 }}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>

            {/* low stock toggle */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
              background: filters.lowStock ? 'rgba(245,158,11,.12)' : 'rgba(255,255,255,.03)',
              border: `1px solid ${filters.lowStock ? 'rgba(245,158,11,.3)' : 'rgba(255,255,255,.07)'}`,
              transition: 'all .22s',
            }}>
              <input type="checkbox" name="lowStock" checked={filters.lowStock} onChange={handleFilterChange}
                style={{ width: 15, height: 15, accentColor: '#f59e0b', cursor: 'pointer' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: filters.lowStock ? '#fcd34d' : 'rgba(255,255,255,.5)', whiteSpace: 'nowrap' }}>
                Low Stock
              </span>
            </label>

            {/* clear */}
            {(filters.search || filters.category || filters.lowStock) && (
              <button onClick={() => setFilters({ search: '', category: '', lowStock: false })} className="iv-btn" style={{
                padding: '10px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.08)',
                color: 'rgba(255,255,255,.5)', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, margin: '0 auto 14px', border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#14b8a6', borderRadius: '50%', animation: 'ivSpin .8s linear infinite' }} />
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, fontWeight: 500 }}>Loading inventory...</p>
            </div>
          </div>
        ) : parts.length === 0 ? (
          <div className="iv-glass" style={{ padding: '60px 24px', textAlign: 'center', animation: 'ivScaleIn .5s ease' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(20,184,166,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32, animation: 'ivFloat 3s ease-in-out infinite' }}>📦</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'white' }}>No parts found</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,.4)' }}>
              {(filters.search || filters.category || filters.lowStock) ? 'Try different filters' : 'Add your first part'}
            </p>
            {canManage && !(filters.search || filters.category || filters.lowStock) && (
              <GlassBtn onClick={openCreate} label="Add First Part" grad="linear-gradient(135deg,#14b8a6,#0891b2)" glow="rgba(20,184,166,.35)" />
            )}
          </div>
        ) : isMobile ? (
          /* MOBILE CARDS */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {parts.map((part, i) => {
              const ss = stockStatus(part);
              return (
                <div key={part.id} className="iv-glass" onClick={() => openDetail(part)} style={{
                  padding: 16, cursor: 'pointer',
                  animation: `ivSlideUp .4s ease ${i * .03}s backwards`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                        {catIcon(part.category)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{part.name}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: 'monospace' }}>{part.partNumber}</p>
                      </div>
                    </div>
                    <span style={{ padding: '3px 9px', borderRadius: 14, background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {ss.icon} {ss.label}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isEmployee ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <MiniStat label="Stock" value={part.quantity} color={part.quantity === 0 ? '#fca5a5' : part.quantity <= part.minStockLevel ? '#fcd34d' : 'white'} />
                    {!isEmployee && <MiniStat label="Price" value={`₹${part.sellingPrice.toLocaleString('en-IN')}`} color="#6ee7b7" />}
                    <MiniStat label="Used" value={part._count?.jobs || 0} color="#93c5fd" />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.05)' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
                      {isEmployee ? `📍 ${part.location || '—'}` : `${catIcon(part.category)} ${part.category}`}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {canManage && (
                        <button onClick={(e) => { e.stopPropagation(); openAdjust(part); }} className="iv-btn" style={{
                          padding: '6px 12px', borderRadius: 8,
                          background: 'rgba(20,184,166,.12)', border: '1px solid rgba(20,184,166,.2)',
                          color: '#5eead4', fontSize: 12, fontWeight: 700,
                        }}>Adjust</button>
                      )}
                      <span style={{ color: '#93c5fd', fontWeight: 600, fontSize: 12 }}>Details →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* DESKTOP TABLE */
          <div className="iv-glass" style={{ overflow: 'hidden', animation: 'ivSlideUp .5s ease .3s backwards' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850 }}>
                <thead>
                  <tr>
                    {['Part', 'Category', 'Stock', ...(!isEmployee ? ['Price'] : []), 'Status', isEmployee ? 'Location' : 'Branch', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '13px 18px', textAlign: h === 'Actions' ? 'right' : 'left',
                        fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.3)',
                        textTransform: 'uppercase', letterSpacing: '.8px',
                        borderBottom: '1px solid rgba(255,255,255,.06)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parts.map((part, i) => {
                    const ss = stockStatus(part);
                    return (
                      <tr key={part.id} className="iv-row" onClick={() => openDetail(part)} style={{
                        cursor: 'pointer',
                        borderBottom: i < parts.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                        animation: `ivSlideUp .35s ease ${i * .03}s backwards`,
                      }}>
                        <td style={{ padding: '13px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                              {catIcon(part.category)}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 14 }}>{part.name}</p>
                              <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: 'monospace' }}>{part.partNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '13px 18px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)' }}>
                            {catIcon(part.category)} {part.category}
                          </span>
                        </td>
                        <td style={{ padding: '13px 18px' }}>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: part.quantity === 0 ? '#fca5a5' : part.quantity <= part.minStockLevel ? '#fcd34d' : 'white' }}>{part.quantity}</p>
                          <p style={{ margin: '1px 0 0', fontSize: 10, color: 'rgba(255,255,255,.3)' }}>Min: {part.minStockLevel}</p>
                        </td>
                        {!isEmployee && (
                          <td style={{ padding: '13px 18px' }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#6ee7b7' }}>₹{part.sellingPrice.toLocaleString('en-IN')}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 10, color: 'rgba(255,255,255,.3)' }}>Cost: ₹{part.costPrice.toLocaleString('en-IN')}</p>
                          </td>
                        )}
                        <td style={{ padding: '13px 18px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 14, background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color, fontSize: 11, fontWeight: 700 }}>
                            {ss.icon} {ss.label}
                          </span>
                        </td>
                        <td style={{ padding: '13px 18px', fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
                          {isEmployee ? (part.location || '—') : (part.branch?.name || '—')}
                        </td>
                        <td style={{ padding: '13px 18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                            {canManage && <TblBtn onClick={(e) => { e.stopPropagation(); openAdjust(part); }} icon="➕" tip="Adjust" hc="#14b8a6" />}
                            <TblBtn onClick={(e) => { e.stopPropagation(); openDetail(part); }} icon="👁️" tip="View" hc="#3b82f6" />
                            {canManage && (
                              <>
                                <TblBtn onClick={(e) => { e.stopPropagation(); openEdit(part); }} icon="✏️" tip="Edit" hc="#10b981" />
                                <TblBtn onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(part); }} icon="🗑️" tip="Delete" hc="#ef4444" />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Add/Edit */}
      {showModal && (
        <Overlay onClose={() => setShowModal(false)}>
          <div style={{ maxWidth: 620, width: '100%' }}>
            <ModalHeader grad="linear-gradient(135deg,#14b8a6,#0891b2)"
              title={editingPart ? '✏️ Edit Part' : '➕ Add New Part'}
              sub={editingPart ? `Editing ${editingPart.name}` : 'Add to inventory'}
              onClose={() => setShowModal(false)} />

            <form onSubmit={handleSubmit} style={{
              padding: isMobile ? 20 : 24,
              background: 'rgba(15,23,42,.97)',
              borderRadius: '0 0 20px 20px',
              border: '1px solid rgba(255,255,255,.06)', borderTop: 'none',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, maxHeight: 'calc(80vh - 220px)', overflowY: 'auto', paddingRight: 4 }}>
                <FInput label="Part Number" name="partNumber" value={formData.partNumber} onChange={handleChange} placeholder="OIL-5W30-001" required disabled={!!editingPart} style={{ textTransform: 'uppercase' }} />
                <FInput label="Part Name" name="name" value={formData.name} onChange={handleChange} placeholder="Engine Oil 5W-30" required />

                <div>
                  <label className="iv-label">Category <span style={{ color: '#14b8a6' }}>*</span></label>
                  <select className="iv-select" name="category" value={formData.category} onChange={handleChange} required>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <FInput label="Brand" name="brand" value={formData.brand} onChange={handleChange} placeholder="Castrol" />
                <FInput label="Cost Price (₹)" name="costPrice" type="number" value={formData.costPrice} onChange={handleChange} placeholder="0" required min="0" step="0.01" />
                <FInput label="Selling Price (₹)" name="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleChange} placeholder="0" required min="0" step="0.01" />
                <FInput label="Quantity" name="quantity" type="number" value={formData.quantity} onChange={handleChange} placeholder="0" required min="0" />
                <FInput label="Min Stock Level" name="minStockLevel" type="number" value={formData.minStockLevel} onChange={handleChange} placeholder="5" min="0" />
                <FInput label="Location" name="location" value={formData.location} onChange={handleChange} placeholder="Shelf A-1" />
                <FInput label="Supplier" name="supplier" value={formData.supplier} onChange={handleChange} placeholder="Supplier name" />

                <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                  <label className="iv-label">Description</label>
                  <textarea className="iv-input" name="description" value={formData.description} onChange={handleChange} rows={2} placeholder="Part description..." style={{ resize: 'none' }} />
                </div>

                {currentUser?.role === 'SUPER_ADMIN' && branches.length > 0 && !editingPart && (
                  <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                    <label className="iv-label">Branch</label>
                    <select className="iv-select" name="branchId" value={formData.branchId} onChange={handleChange}>
                      <option value="">Select Branch</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}

                {formData.costPrice && formData.sellingPrice && (
                  <div style={{
                    gridColumn: isMobile ? 'auto' : 'span 2',
                    padding: 14, borderRadius: 12,
                    background: 'rgba(16,185,129,.08)',
                    border: '1px solid rgba(16,185,129,.2)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#6ee7b7', fontSize: 13 }}>💰 Profit Margin</span>
                      <span style={{ fontWeight: 800, fontSize: 16, color: '#6ee7b7' }}>
                        ₹{(Number(formData.sellingPrice) - Number(formData.costPrice)).toFixed(2)}
                        <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 6, color: 'rgba(255,255,255,.4)' }}>
                          ({Number(formData.costPrice) > 0 ? (((Number(formData.sellingPrice) - Number(formData.costPrice)) / Number(formData.costPrice)) * 100).toFixed(1) : 0}%)
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <ModalFooter onCancel={() => setShowModal(false)} submitting={submitting}
                submitLabel={editingPart ? 'Update Part' : 'Add Part'}
                grad="linear-gradient(135deg,#14b8a6,#0891b2)"
                glow="rgba(20,184,166,.3)" />
            </form>
          </div>
        </Overlay>
      )}

      {/* Stock Adjust */}
      {showAdjustModal && selectedPart && (
        <Overlay onClose={() => setShowAdjustModal(false)}>
          <div style={{ maxWidth: 460, width: '100%' }}>
            <ModalHeader grad="linear-gradient(135deg,#14b8a6,#0891b2)"
              title="📦 Adjust Stock"
              sub={`${selectedPart.name} • Current: ${selectedPart.quantity}`}
              onClose={() => setShowAdjustModal(false)} />

            <form onSubmit={handleAdjust} style={{
              padding: isMobile ? 20 : 24,
              background: 'rgba(15,23,42,.97)',
              borderRadius: '0 0 20px 20px',
              border: '1px solid rgba(255,255,255,.06)', borderTop: 'none',
            }}>
              {/* type toggle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                {[
                  { val: 'add', icon: '➕', label: 'Add Stock', c: '#10b981' },
                  { val: 'subtract', icon: '➖', label: 'Remove', c: '#ef4444' },
                ].map(t => (
                  <label key={t.val} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: 14, borderRadius: 12, cursor: 'pointer',
                    background: adjData.type === t.val ? `${t.c}15` : 'rgba(255,255,255,.03)',
                    border: `1.5px solid ${adjData.type === t.val ? `${t.c}40` : 'rgba(255,255,255,.07)'}`,
                    transition: 'all .22s',
                  }}>
                    <input type="radio" value={t.val} checked={adjData.type === t.val}
                      onChange={(e) => setAdjData(p => ({ ...p, type: e.target.value }))} style={{ display: 'none' }} />
                    <span style={{ fontSize: 18 }}>{t.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: adjData.type === t.val ? t.c : 'rgba(255,255,255,.5)' }}>{t.label}</span>
                  </label>
                ))}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="iv-label">Quantity <span style={{ color: '#14b8a6' }}>*</span></label>
                <input className="iv-input" type="number" value={adjData.quantity}
                  onChange={(e) => setAdjData(p => ({ ...p, quantity: e.target.value }))}
                  placeholder="Enter quantity" min="1"
                  max={adjData.type === 'subtract' ? selectedPart.quantity : undefined}
                  required style={{ fontSize: 16 }} />
              </div>

              {adjData.quantity && (
                <div style={{
                  padding: 14, borderRadius: 12, marginBottom: 4,
                  background: adjData.type === 'add' ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)',
                  border: `1px solid ${adjData.type === 'add' ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.2)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: adjData.type === 'add' ? '#6ee7b7' : '#fca5a5' }}>New Stock Level</span>
                    <span style={{ fontWeight: 800, fontSize: 22, color: adjData.type === 'add' ? '#6ee7b7' : '#fca5a5' }}>
                      {adjData.type === 'add' ? selectedPart.quantity + Number(adjData.quantity) : selectedPart.quantity - Number(adjData.quantity)}
                    </span>
                  </div>
                </div>
              )}

              <ModalFooter onCancel={() => setShowAdjustModal(false)} submitting={submitting}
                submitLabel={adjData.type === 'add' ? 'Add Stock' : 'Remove Stock'}
                grad={adjData.type === 'add' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)'}
                glow={adjData.type === 'add' ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'} />
            </form>
          </div>
        </Overlay>
      )}

      {/* Part Detail */}
      {showDetailModal && selectedPart && (
        <Overlay onClose={() => setShowDetailModal(false)}>
          <div style={{ maxWidth: 520, width: '100%' }}>
            <div style={{
              padding: isMobile ? 22 : 26,
              background: 'linear-gradient(135deg,rgba(20,184,166,.2),rgba(8,145,178,.1))',
              borderRadius: '20px 20px 0 0',
              border: '1px solid rgba(255,255,255,.08)', borderBottom: 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                  {catIcon(selectedPart.category)}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 800, color: 'white' }}>{selectedPart.name}</h2>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,.5)', fontFamily: 'monospace' }}>{selectedPart.partNumber}</p>
                </div>
                <CloseBtn onClick={() => setShowDetailModal(false)} />
              </div>
            </div>

            <div style={{
              padding: isMobile ? 20 : 24,
              background: 'rgba(15,23,42,.97)',
              borderRadius: '0 0 20px 20px',
              border: '1px solid rgba(255,255,255,.06)', borderTop: 'none',
              maxHeight: 'calc(80vh - 200px)', overflowY: 'auto',
            }}>
              {/* top stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                <MiniStatBox label="In Stock" value={selectedPart.quantity}
                  color={selectedPart.quantity === 0 ? '#fca5a5' : selectedPart.quantity <= selectedPart.minStockLevel ? '#fcd34d' : 'white'} />
                {!isEmployee
                  ? <MiniStatBox label="Selling Price" value={`₹${selectedPart.sellingPrice.toLocaleString('en-IN')}`} color="#6ee7b7" />
                  : <MiniStatBox label="Min Level" value={selectedPart.minStockLevel} color="#93c5fd" />
                }
              </div>

              {/* detail rows */}
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)' }}>
                <DRow label="Category" value={`${catIcon(selectedPart.category)} ${selectedPart.category}`} />
                <DRow label="Brand" value={selectedPart.brand || '—'} />
                {!isEmployee && <DRow label="Cost Price" value={`₹${selectedPart.costPrice.toLocaleString('en-IN')}`} />}
                <DRow label="Min Stock" value={selectedPart.minStockLevel} />
                <DRow label="Location" value={selectedPart.location || '—'} />
                {!isEmployee && <DRow label="Supplier" value={selectedPart.supplier || '—'} />}
                <DRow label="Branch" value={selectedPart.branch?.name || '—'} />
                <DRow label="Times Used" value={`${selectedPart._count?.jobs || 0} jobs`} last />
              </div>

              {selectedPart.description && (
                <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
                  <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Description</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.5 }}>{selectedPart.description}</p>
                </div>
              )}

              {/* actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <GlassBtn onClick={() => setShowDetailModal(false)} label="Close" outline color="rgba(255,255,255,.4)" />
                {canManage && (
                  <>
                    <GlassBtn onClick={() => { setShowDetailModal(false); openAdjust(selectedPart); }} label="Adjust Stock" grad="linear-gradient(135deg,#14b8a6,#0891b2)" glow="rgba(20,184,166,.3)" />
                    <GlassBtn onClick={() => { setShowDetailModal(false); openEdit(selectedPart); }} label="Edit" grad="linear-gradient(135deg,#3b82f6,#1d4ed8)" glow="rgba(59,130,246,.3)" />
                  </>
                )}
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* Bulk Upload */}
      {showBulkModal && (
        <Overlay onClose={() => { if (!isProcessing && !submitting) { setShowBulkModal(false); setUploadFile(null); setUploadPreview([]); setUploadErrors([]); } }}>
          <div style={{ maxWidth: 620, width: '100%' }}>
            <ModalHeader grad="linear-gradient(135deg,#8b5cf6,#6d28d9)"
              title="📤 Bulk Upload Parts"
              sub="Upload Excel to add multiple parts"
              onClose={() => { if (!isProcessing && !submitting) { setShowBulkModal(false); setUploadFile(null); setUploadPreview([]); setUploadErrors([]); } }} />

            <div style={{
              padding: isMobile ? 20 : 24,
              background: 'rgba(15,23,42,.97)',
              borderRadius: '0 0 20px 20px',
              border: '1px solid rgba(255,255,255,.06)', borderTop: 'none',
              maxHeight: 'calc(80vh - 200px)', overflowY: 'auto',
            }}>
              {/* drop zone */}
              <div style={{
                border: `2px dashed ${uploadFile ? 'rgba(16,185,129,.4)' : 'rgba(255,255,255,.12)'}`,
                borderRadius: 16, padding: isMobile ? 24 : 32, textAlign: 'center', marginBottom: 18,
                background: uploadFile ? 'rgba(16,185,129,.05)' : 'rgba(255,255,255,.02)',
                transition: 'all .3s',
              }}>
                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload}
                  disabled={isProcessing || submitting} style={{ display: 'none' }} id="bulk-input" />
                <label htmlFor="bulk-input" style={{ cursor: (isProcessing || submitting) ? 'not-allowed' : 'pointer', display: 'block' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: uploadFile ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 28 }}>
                    {isProcessing ? '⏳' : uploadFile ? '✅' : '📁'}
                  </div>
                  {isProcessing ? (
                    <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 14 }}>Processing...</p>
                  ) : uploadFile ? (
                    <>
                      <p style={{ margin: 0, fontWeight: 700, color: '#6ee7b7', fontSize: 14 }}>{uploadFile.name}</p>
                      <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,.35)', fontSize: 12 }}>Click to change</p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 14 }}>Click to upload Excel</p>
                      <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,.35)', fontSize: 12 }}>.xlsx or .xls</p>
                    </>
                  )}
                </label>
              </div>

              {/* preview */}
              {uploadPreview.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#6ee7b7' }}>✅ Valid Items ({uploadPreview.length})</p>
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)', maxHeight: 180, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,.04)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'rgba(255,255,255,.4)' }}>Part #</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'rgba(255,255,255,.4)' }}>Name</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'rgba(255,255,255,.4)' }}>Qty</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'rgba(255,255,255,.4)' }}>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadPreview.slice(0, 8).map((item, i) => (
                          <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'rgba(255,255,255,.6)' }}>{item.partNumber}</td>
                            <td style={{ padding: '8px 12px', color: 'white' }}>{item.name}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: 'rgba(255,255,255,.6)' }}>{item.quantity}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6ee7b7' }}>₹{item.sellingPrice}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {uploadPreview.length > 8 && (
                      <p style={{ textAlign: 'center', padding: 8, color: 'rgba(255,255,255,.35)', fontSize: 11, margin: 0, background: 'rgba(255,255,255,.02)' }}>
                        + {uploadPreview.length - 8} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* errors */}
              {uploadErrors.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>❌ Errors ({uploadErrors.length})</p>
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(239,68,68,.2)', maxHeight: 140, overflowY: 'auto', background: 'rgba(239,68,68,.05)' }}>
                    {uploadErrors.map((err, i) => (
                      <div key={i} style={{ padding: 10, borderBottom: i < uploadErrors.length - 1 ? '1px solid rgba(239,68,68,.1)' : 'none' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#fca5a5', fontSize: 12 }}>Row {err.row}: {err.data.partNumber || '?'}</p>
                        <ul style={{ margin: 0, paddingLeft: 16, color: 'rgba(239,68,68,.7)', fontSize: 11 }}>
                          {err.errors.map((e, j) => <li key={j}>{e}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* tips */}
              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.15)' }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#93c5fd' }}>💡 Tips</p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: 'rgba(255,255,255,.4)', lineHeight: 1.6 }}>
                  <li>Download template first</li>
                  <li>Required: Part Number, Name, Category, Cost/Selling Price, Quantity</li>
                  <li>Categories: PARTS, ACCESSORIES, FLUIDS, FILTERS, ELECTRICAL, BODY, TYRES, TOOLS, OTHER</li>
                </ul>
              </div>

              {/* footer */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                <GlassBtn onClick={() => { setShowBulkModal(false); setUploadFile(null); setUploadPreview([]); setUploadErrors([]); }}
                  label="Cancel" outline color="rgba(255,255,255,.4)"
                  disabled={isProcessing || submitting} />
                <button onClick={handleBulkUpload}
                  disabled={!uploadPreview.length || isProcessing || submitting}
                  className="iv-btn" style={{
                    padding: '10px 22px', borderRadius: 12,
                    background: (uploadPreview.length && !isProcessing && !submitting) ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'rgba(255,255,255,.06)',
                    border: 'none',
                    color: (uploadPreview.length && !isProcessing && !submitting) ? 'white' : 'rgba(255,255,255,.3)',
                    fontSize: 13, fontWeight: 700,
                    boxShadow: (uploadPreview.length && !isProcessing && !submitting) ? '0 4px 14px rgba(139,92,246,.3)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 8,
                    opacity: (!uploadPreview.length || isProcessing || submitting) ? .5 : 1,
                  }}>
                  {submitting && <Spin size={15} />}
                  {submitting ? 'Uploading...' : `Upload ${uploadPreview.length} Parts`}
                </button>
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <Overlay onClose={() => setShowDeleteConfirm(null)}>
          <div style={{
            maxWidth: 380, width: '100%',
            background: 'rgba(15,23,42,.97)',
            borderRadius: 20, border: '1px solid rgba(255,255,255,.06)',
            padding: 28, textAlign: 'center',
          }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>⚠️</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: 'white' }}>Delete Part?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
              Delete <span style={{ color: '#fca5a5', fontWeight: 700 }}>{showDeleteConfirm.name}</span>?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <GlassBtn onClick={() => setShowDeleteConfirm(null)} label="Cancel" outline color="rgba(255,255,255,.4)" style={{ flex: 1 }} />
              <button onClick={() => handleDelete(showDeleteConfirm)} disabled={submitting}
                className="iv-btn" style={{
                  flex: 1, padding: '10px 0', borderRadius: 12,
                  background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                  border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
                  opacity: submitting ? .6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                {submitting && <Spin size={14} />}
                Delete
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════

function Overlay({ children, onClose }) {
  return (
    <div className="iv-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.65)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div className="iv-modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ grad, title, sub, onClose }) {
  return (
    <div style={{
      padding: '18px 22px', background: grad,
      borderRadius: '20px 20px 0 0',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.1)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'white' }}>{title}</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{sub}</p>
        </div>
        <CloseBtn onClick={onClose} />
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, submitting, submitLabel, grad, glow }) {
  return (
    <div style={{
      display: 'flex', gap: 10, justifyContent: 'flex-end',
      marginTop: 22, paddingTop: 18,
      borderTop: '1px solid rgba(255,255,255,.06)',
    }}>
      <button type="button" onClick={onCancel} disabled={submitting} className="iv-btn" style={{
        padding: '10px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,.05)',
        border: '1px solid rgba(255,255,255,.1)',
        color: 'rgba(255,255,255,.55)', fontSize: 13, fontWeight: 600,
        opacity: submitting ? .5 : 1,
      }}>Cancel</button>
      <button type="submit" disabled={submitting} className="iv-btn" style={{
        padding: '10px 22px', borderRadius: 12,
        background: grad, border: 'none',
        color: 'white', fontSize: 13, fontWeight: 700,
        opacity: submitting ? .6 : 1,
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: `0 4px 14px ${glow}`,
      }}>
        {submitting && <Spin size={15} />}
        {submitLabel}
      </button>
    </div>
  );
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 30, height: 30, borderRadius: 9,
      background: 'rgba(255,255,255,.14)', border: 'none',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background .2s',
    }}>
      <svg style={{ width: 15, height: 15, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function Spin({ size = 16 }) {
  return <div style={{
    width: size, height: size,
    border: '2px solid rgba(255,255,255,.2)',
    borderTopColor: 'white', borderRadius: '50%',
    animation: 'ivSpin .6s linear infinite', flexShrink: 0,
  }} />;
}

function GlassBtn({ onClick, label, grad, glow, outline, color, disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} className="iv-btn" style={{
      padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
      background: outline ? 'transparent' : (grad || 'rgba(255,255,255,.06)'),
      border: outline ? `1px solid ${color || 'rgba(255,255,255,.15)'}` : 'none',
      color: outline ? (color || 'rgba(255,255,255,.6)') : 'white',
      boxShadow: glow ? `0 4px 14px ${glow}` : 'none',
      opacity: disabled ? .5 : 1,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      ...style,
    }}>{label}</button>
  );
}

function FInput({ label, name, type = 'text', value, onChange, placeholder, required, disabled, min, step, style = {} }) {
  return (
    <div>
      <label className="iv-label">{label} {required && <span style={{ color: '#14b8a6' }}>*</span>}</label>
      <input className="iv-input" type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} required={required} disabled={disabled}
        min={min} step={step} style={style} />
    </div>
  );
}

function TblBtn({ onClick, icon, tip, hc }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      title={tip} style={{
        width: 32, height: 32, borderRadius: 8, border: 'none',
        background: h ? `${hc}18` : 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, transition: 'all .2s',
        transform: h ? 'scale(1.1)' : 'scale(1)',
      }}>{icon}</button>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color }}>{value}</p>
      <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>{label}</p>
    </div>
  );
}

function MiniStatBox({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
      <p style={{ margin: '0 0 3px', fontSize: 24, fontWeight: 800, color }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>{label}</p>
    </div>
  );
}

function DRow({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 14px',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,.05)',
      background: 'rgba(255,255,255,.02)',
    }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{value}</span>
    </div>
  );
}