// src/app/(dashboard)/payments/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const CSS = `
  @keyframes pySlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pyScaleIn { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
  @keyframes pyFadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes pySpin    { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes pyFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

  .py-glass{background:rgba(255,255,255,.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.07);border-radius:18px;transition:all .3s cubic-bezier(.4,0,.2,1)}
  .py-glass:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.11)}
  .py-stat:hover{transform:translateY(-4px);box-shadow:0 20px 48px rgba(0,0,0,.35)}
  .py-stat:hover .py-stat-icon{transform:scale(1.12) rotate(6deg)}
  .py-btn{transition:all .22s ease;cursor:pointer}
  .py-btn:hover{transform:translateY(-1px)}
  .py-row{transition:background .2s ease}
  .py-row:hover{background:rgba(255,255,255,.04)!important}
  .py-overlay{animation:pyFadeIn .25s ease}
  .py-modal{animation:pyScaleIn .3s cubic-bezier(.4,0,.2,1)}
  .py-input{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 14px;color:white;font-size:14px;width:100%;outline:none;transition:all .22s ease}
  .py-input::placeholder{color:rgba(255,255,255,.28)}
  .py-input:focus{border-color:rgba(139,92,246,.5);background:rgba(255,255,255,.07);box-shadow:0 0 0 3px rgba(139,92,246,.12)}
  .py-select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 14px;color:white;font-size:14px;width:100%;outline:none;appearance:none;cursor:pointer;transition:all .22s ease}
  .py-select option{background:#1a1f35;color:white}
  .py-select:focus{border-color:rgba(139,92,246,.5);box-shadow:0 0 0 3px rgba(139,92,246,.12)}
  .py-label{display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.45);margin-bottom:6px;text-transform:uppercase;letter-spacing:.7px}
  .py-search{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 14px 10px 40px;color:white;font-size:14px;width:100%;outline:none;transition:all .22s ease}
  .py-search::placeholder{color:rgba(255,255,255,.28)}
  .py-search:focus{border-color:rgba(139,92,246,.4);background:rgba(255,255,255,.07);box-shadow:0 0 0 3px rgba(139,92,246,.1)}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
  input[type=number]{-moz-appearance:textfield}
  @media(max-width:768px){.py-stat:hover{transform:none}.py-stat:hover .py-stat-icon{transform:none}}
`;

const PAY_METHODS = [
  { v: 'CASH', l: 'Cash', icon: '💵', c: '#10b981' },
  { v: 'CARD', l: 'Card', icon: '💳', c: '#3b82f6' },
  { v: 'BANK_TRANSFER', l: 'Bank Transfer', icon: '🏦', c: '#8b5cf6' },
  { v: 'CHECK', l: 'Check', icon: '📄', c: '#6b7280' },
  { v: 'MOBILE_MONEY', l: 'UPI/Mobile', icon: '📱', c: '#f59e0b' },
];
const getMethod = m => PAY_METHODS.find(p => p.v === m) || { l: m, icon: '💰', c: '#6b7280' };

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ search: '', method: '', startDate: '', endDate: '' });
  const [formData, setFormData] = useState({ invoiceId: '', amount: '', method: 'CASH', reference: '', notes: '' });
  const [stats, setStats] = useState({ totalCollected: 0, todayCollection: 0, weekCollection: 0, pendingInvoices: 0, paymentCount: 0 });

  useEffect(() => {
    const c = () => setIsMobile(window.innerWidth < 768);
    c();
    window.addEventListener('resize', c);
    return () => window.removeEventListener('resize', c);
  }, []);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      try {
        setCurrentUser(JSON.parse(u));
      } catch {}
    }
  }, []);

  // Fetch invoices (for the create payment form)
  const fetchInvoices = useCallback(async () => {
    try {
      const r = await fetch('/api/invoices');
      if (!r.ok) return;
      const d = await r.json();
      if (d.success) {
        const pending = (d.data || []).filter(i =>
          i.status !== 'PAID' && i.status !== 'CANCELLED'
        );
        setInvoices(pending);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    }
  }, []);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams();
      if (filters.search) p.append('search', filters.search);
      if (filters.method) p.append('method', filters.method);
      if (filters.startDate) p.append('startDate', filters.startDate);
      if (filters.endDate) p.append('endDate', filters.endDate);

      const r = await fetch(`/api/payments?${p}`);
      if (!r.ok) {
        const errData = await r.json().catch(() => ({}));
        toast.error(errData.message || 'Failed to load payments');
        return;
      }

      const d = await r.json();
      if (d.success) {
        const data = d.data || [];
        setPayments(data);

        // Calculate stats
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);

        setStats({
          totalCollected: data.reduce((s, p) => s + (p.amount || 0), 0),
          todayCollection: data
            .filter(p => new Date(p.createdAt) >= todayStart)
            .reduce((s, p) => s + (p.amount || 0), 0),
          weekCollection: data
            .filter(p => new Date(p.createdAt) >= weekStart)
            .reduce((s, p) => s + (p.amount || 0), 0),
          paymentCount: data.length,
          pendingInvoices: 0, // Will be updated separately
        });
      }
    } catch (err) {
      console.error('Fetch payments error:', err);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Fetch payments when user is available or filters change
  useEffect(() => {
    if (currentUser) {
      fetchPayments();
    }
  }, [currentUser, fetchPayments]);

  // Update pending invoices count when invoices change
  useEffect(() => {
    setStats(prev => ({ ...prev, pendingInvoices: invoices.length }));
  }, [invoices]);

  const resetForm = () => {
    setFormData({ invoiceId: '', amount: '', method: 'CASH', reference: '', notes: '' });
    setSelectedInvoice(null);
  };

  const openCreate = () => {
    resetForm();
    fetchInvoices(); // Refresh invoices list
    setShowModal(true);
  };

  const handleInvoiceSelect = id => {
    const inv = invoices.find(i => i.id === id);
    setSelectedInvoice(inv);
    setFormData(p => ({
      ...p,
      invoiceId: id,
      amount: inv ? (inv.total - inv.amountPaid).toFixed(2) : '',
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.invoiceId) {
      toast.error('Please select an invoice');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (selectedInvoice) {
      const balance = selectedInvoice.total - selectedInvoice.amountPaid;
      if (amount > balance + 0.01) {
        toast.error(`Amount exceeds balance of ₹${balance.toFixed(2)}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const r = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: formData.invoiceId,
          amount,
          method: formData.method,
          reference: formData.reference || null,
          notes: formData.notes || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        toast.error(d.message || 'Payment failed');
        return;
      }
      toast.success(d.message || 'Payment processed!');
      resetForm();
      setShowModal(false);
      // Refresh both payments and invoices
      await Promise.all([fetchPayments(), fetchInvoices()]);
    } catch {
      toast.error('Error processing payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoid = async payment => {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/payments?id=${payment.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) {
        toast.error(d.message || 'Failed to void');
        return;
      }
      toast.success('Payment voided');
      setShowVoidConfirm(null);
      setShowDetailModal(false);
      setSelectedPayment(null);
      await Promise.all([fetchPayments(), fetchInvoices()]);
    } catch {
      toast.error('Error');
    } finally {
      setSubmitting(false);
    }
  };

  const canManage = ['SUPER_ADMIN', 'MANAGER', 'CASHIER'].includes(currentUser?.role);

  const STATS = [
    { label: "Today's Collection", v: `₹${stats.todayCollection.toLocaleString('en-IN')}`, icon: '💰', grad: 'linear-gradient(135deg,#10b981,#059669)' },
    { label: 'This Week', v: `₹${stats.weekCollection.toLocaleString('en-IN')}`, icon: '📊', grad: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
    { label: 'Total Collected', v: `₹${stats.totalCollected.toLocaleString('en-IN')}`, icon: '💎', grad: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' },
    { label: 'Pending Invoices', v: stats.pendingInvoices, icon: '📋', grad: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div style={{ minHeight: '100vh' }}>
        {/* HEADER */}
        <div style={{ marginBottom: 24, animation: 'pySlideUp .5s ease' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 26 }}>💳</span>
                <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem,4vw,1.7rem)', fontWeight: 800, color: 'white', letterSpacing: '-.5px' }}>Payments</h1>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.4)', fontWeight: 500 }}>Track and manage collections</p>
            </div>
            {canManage && (
              <PBtn onClick={openCreate} label="Record Payment" icon="➕"
                grad="linear-gradient(135deg,#8b5cf6,#6d28d9)" glow="rgba(139,92,246,.35)" full={isMobile} />
            )}
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${isMobile ? '140px' : '200px'}),1fr))`, gap: isMobile ? 10 : 14, marginBottom: 20 }}>
          {STATS.map((s, i) => (
            <div key={s.label} className="py-glass py-stat" style={{ padding: isMobile ? 14 : 'clamp(14px,2vw,20px)', animation: `pySlideUp .5s ease ${i * .08}s backwards`, cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '.7px' }}>{s.label}</p>
                  <p style={{ margin: '5px 0 0', fontSize: isMobile ? '1.1rem' : 'clamp(1.1rem,2.5vw,1.5rem)', fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.v}</p>
                </div>
                <div className="py-stat-icon" style={{ width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, borderRadius: 13, background: s.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 20 : 22, flexShrink: 0, boxShadow: '0 6px 18px rgba(0,0,0,.25)', transition: 'transform .3s ease' }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div className="py-glass" style={{ padding: isMobile ? 14 : 16, marginBottom: 20, animation: 'pySlideUp .5s ease .2s backwards' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(255,255,255,.3)', pointerEvents: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="py-search" name="search" value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} placeholder="Search invoice # or customer..." />
            </div>
            <select className="py-select" value={filters.method} onChange={e => setFilters(p => ({ ...p, method: e.target.value }))} style={{ minWidth: isMobile ? '100%' : 150 }}>
              <option value="">All Methods</option>
              {PAY_METHODS.map(m => <option key={m.v} value={m.v}>{m.icon} {m.l}</option>)}
            </select>
            <input className="py-input" type="date" value={filters.startDate} onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))} style={{ minWidth: isMobile ? '100%' : 'auto' }} />
            <input className="py-input" type="date" value={filters.endDate} onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))} style={{ minWidth: isMobile ? '100%' : 'auto' }} />
            {(filters.search || filters.method || filters.startDate || filters.endDate) && (
              <button onClick={() => setFilters({ search: '', method: '', startDate: '', endDate: '' })} className="py-btn" style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>✕ Clear</button>
            )}
          </div>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, margin: '0 auto 14px', border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'pySpin .8s linear infinite' }} />
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, fontWeight: 500 }}>Loading payments...</p>
            </div>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-glass" style={{ padding: '60px 24px', textAlign: 'center', animation: 'pyScaleIn .5s ease' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(139,92,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32, animation: 'pyFloat 3s ease-in-out infinite' }}>💳</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'white' }}>No payments found</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,.4)' }}>
              {(filters.search || filters.method || filters.startDate) ? 'Try different filters' : 'Record your first payment'}
            </p>
            {canManage && !(filters.search || filters.method || filters.startDate) && (
              <PBtn onClick={openCreate} label="Record First Payment" grad="linear-gradient(135deg,#8b5cf6,#6d28d9)" glow="rgba(139,92,246,.35)" />
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            {!isMobile && (
              <div className="py-glass" style={{ overflow: 'hidden', animation: 'pySlideUp .5s ease .3s backwards' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850 }}>
                    <thead>
                      <tr>
                        {['Invoice', 'Customer', 'Amount', 'Method', 'Reference', 'Date', 'Received By', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '13px 18px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.8px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((pay, i) => {
                        const m = getMethod(pay.method);
                        return (
                          <tr key={pay.id} className="py-row" style={{ borderBottom: i < payments.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none', animation: `pySlideUp .35s ease ${i * .03}s backwards` }}>
                            <td style={{ padding: '13px 18px' }}>
                              <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 13 }}>{pay.invoice?.invoiceNumber || '—'}</p>
                              <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{pay.invoice?.job?.jobNumber || ''}</p>
                            </td>
                            <td style={{ padding: '13px 18px' }}>
                              <p style={{ margin: 0, fontWeight: 600, color: 'white', fontSize: 13 }}>{pay.invoice?.customer?.name || '—'}</p>
                              <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{pay.invoice?.customer?.phone || ''}</p>
                            </td>
                            <td style={{ padding: '13px 18px' }}>
                              <p style={{ margin: 0, fontWeight: 800, color: '#6ee7b7', fontSize: 16 }}>₹{pay.amount?.toLocaleString('en-IN')}</p>
                            </td>
                            <td style={{ padding: '13px 18px' }}>
                              <span style={{ padding: '4px 10px', borderRadius: 10, background: `${m.c}15`, border: `1px solid ${m.c}25`, color: m.c, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {m.icon} {m.l}
                              </span>
                            </td>
                            <td style={{ padding: '13px 18px', fontSize: 13, color: 'rgba(255,255,255,.45)' }}>{pay.reference || '—'}</td>
                            <td style={{ padding: '13px 18px' }}>
                              <p style={{ margin: 0, fontSize: 13, color: 'white' }}>{new Date(pay.createdAt).toLocaleDateString('en-IN')}</p>
                              <p style={{ margin: '1px 0 0', fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{new Date(pay.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                            </td>
                            <td style={{ padding: '13px 18px', fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{pay.receivedBy?.name || '—'}</td>
                            <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                              <button onClick={() => { setSelectedPayment(pay); setShowDetailModal(true); }} className="py-btn" style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', color: '#93c5fd', fontSize: 12, fontWeight: 700 }}>View</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mobile Cards */}
            {isMobile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {payments.map((pay, i) => {
                  const m = getMethod(pay.method);
                  return (
                    <div key={pay.id} className="py-glass" onClick={() => { setSelectedPayment(pay); setShowDetailModal(true); }} style={{ padding: 16, cursor: 'pointer', animation: `pySlideUp .4s ease ${i * .03}s backwards` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 14 }}>{pay.invoice?.invoiceNumber || '—'}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{pay.invoice?.customer?.name || '—'}</p>
                        </div>
                        <span style={{ padding: '3px 9px', borderRadius: 8, background: `${m.c}15`, border: `1px solid ${m.c}25`, color: m.c, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{m.icon} {m.l}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <p style={{ margin: 0, fontWeight: 800, color: '#6ee7b7', fontSize: 22 }}>₹{pay.amount?.toLocaleString('en-IN')}</p>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.45)' }}>{new Date(pay.createdAt).toLocaleDateString('en-IN')}</p>
                          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{new Date(pay.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.05)' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>By: {pay.receivedBy?.name || '—'}</span>
                        <span style={{ color: '#93c5fd', fontWeight: 600, fontSize: 12 }}>Details →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* RECORD PAYMENT MODAL */}
      {showModal && (
        <POvl onClose={() => setShowModal(false)}>
          <div style={{ maxWidth: 520, width: '100%' }}>
            <PMHead title="Record Payment" sub="Process a new payment" onClose={() => setShowModal(false)} />
            <form onSubmit={handleSubmit} style={{ padding: isMobile ? 20 : 24, background: 'rgba(15,23,42,.97)', borderRadius: '0 0 20px 20px', border: '1px solid rgba(255,255,255,.06)', borderTop: 'none' }}>
              <div style={{ maxHeight: 'calc(72vh - 200px)', overflowY: 'auto', paddingRight: 4 }}>
                <div style={{ marginBottom: 16 }}>
                  <label className="py-label">Select Invoice <span style={{ color: '#8b5cf6' }}>*</span></label>
                  <select className="py-select" value={formData.invoiceId} onChange={e => handleInvoiceSelect(e.target.value)} required>
                    <option value="">Select invoice...</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.customer?.name} - Balance: ₹{(inv.total - inv.amountPaid).toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                  {invoices.length === 0 && (
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: '#fcd34d' }}>
                      No pending invoices available
                    </p>
                  )}
                </div>

                {selectedInvoice && (
                  <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', marginBottom: 16 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>Invoice Details</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { l: 'Customer', v: selectedInvoice.customer?.name },
                        { l: 'Total', v: `₹${selectedInvoice.total?.toLocaleString('en-IN')}` },
                        { l: 'Paid', v: `₹${selectedInvoice.amountPaid?.toLocaleString('en-IN')}`, c: '#6ee7b7' },
                        { l: 'Balance', v: `₹${(selectedInvoice.total - selectedInvoice.amountPaid).toLocaleString('en-IN')}`, c: '#fca5a5' },
                      ].map(d => (
                        <div key={d.l}>
                          <p style={{ margin: '0 0 2px', fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{d.l}</p>
                          <p style={{ margin: 0, fontWeight: 700, color: d.c || 'white', fontSize: 13 }}>{d.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label className="py-label">Amount (₹) <span style={{ color: '#8b5cf6' }}>*</span></label>
                  <input className="py-input" type="number" name="amount" value={formData.amount}
                    onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00" step="0.01" min="0.01"
                    max={selectedInvoice ? (selectedInvoice.total - selectedInvoice.amountPaid) : undefined} required
                    style={{ fontSize: 18, fontWeight: 700 }} />
                  {selectedInvoice && formData.amount && parseFloat(formData.amount) >= (selectedInvoice.total - selectedInvoice.amountPaid) && (
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: '#6ee7b7', fontWeight: 600 }}>
                      ✓ This will fully pay the invoice
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="py-label">Payment Method <span style={{ color: '#8b5cf6' }}>*</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: 8 }}>
                    {PAY_METHODS.map(m => (
                      <label key={m.v} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 11, cursor: 'pointer',
                        background: formData.method === m.v ? `${m.c}12` : 'rgba(255,255,255,.03)',
                        border: `1.5px solid ${formData.method === m.v ? `${m.c}40` : 'rgba(255,255,255,.07)'}`, transition: 'all .2s',
                      }}>
                        <input type="radio" name="method" value={m.v} checked={formData.method === m.v}
                          onChange={e => setFormData(p => ({ ...p, method: e.target.value }))} style={{ display: 'none' }} />
                        <span style={{ fontSize: 16 }}>{m.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: formData.method === m.v ? m.c : 'rgba(255,255,255,.45)' }}>{m.l}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="py-label">Reference / Transaction ID</label>
                  <input className="py-input" value={formData.reference}
                    onChange={e => setFormData(p => ({ ...p, reference: e.target.value }))}
                    placeholder="UPI ID, Check #, Card last 4..." />
                </div>

                <div>
                  <label className="py-label">Notes</label>
                  <textarea className="py-input" value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    rows={2} placeholder="Optional notes..." style={{ resize: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                <PBtn onClick={() => setShowModal(false)} label="Cancel" outline color="rgba(255,255,255,.4)" disabled={submitting} />
                <button type="submit" disabled={submitting || invoices.length === 0} className="py-btn" style={{
                  padding: '10px 22px', borderRadius: 12, background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                  border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
                  opacity: (submitting || invoices.length === 0) ? .5 : 1,
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 14px rgba(139,92,246,.3)',
                }}>
                  {submitting && <PSpin />}
                  Process Payment
                </button>
              </div>
            </form>
          </div>
        </POvl>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && selectedPayment && (
        <POvl onClose={() => { setShowDetailModal(false); setSelectedPayment(null); }}>
          <div style={{ maxWidth: 440, width: '100%' }}>
            <div style={{ padding: '20px 22px', background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: '20px 20px 0 0', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.1)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'white' }}>Payment Details</h2>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{new Date(selectedPayment.createdAt).toLocaleString('en-IN')}</p>
                </div>
                <PClose onClick={() => { setShowDetailModal(false); setSelectedPayment(null); }} />
              </div>
            </div>

            <div style={{ padding: isMobile ? 20 : 24, background: 'rgba(15,23,42,.97)', borderRadius: '0 0 20px 20px', border: '1px solid rgba(255,255,255,.06)', borderTop: 'none' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <p style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800, color: '#6ee7b7' }}>₹{selectedPayment.amount?.toLocaleString('en-IN')}</p>
                {(() => { const m = getMethod(selectedPayment.method); return (
                  <span style={{ padding: '4px 12px', borderRadius: 10, background: `${m.c}15`, border: `1px solid ${m.c}25`, color: m.c, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{m.icon} {m.l}</span>
                ); })()}
              </div>

              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)' }}>
                {[
                  { l: 'Invoice', v: selectedPayment.invoice?.invoiceNumber },
                  { l: 'Customer', v: selectedPayment.invoice?.customer?.name },
                  { l: 'Phone', v: selectedPayment.invoice?.customer?.phone },
                  { l: 'Vehicle', v: selectedPayment.invoice?.job?.vehicle ? `${selectedPayment.invoice.job.vehicle.make} ${selectedPayment.invoice.job.vehicle.model} - ${selectedPayment.invoice.job.vehicle.licensePlate}` : null },
                  ...(selectedPayment.reference ? [{ l: 'Reference', v: selectedPayment.reference }] : []),
                  { l: 'Received By', v: selectedPayment.receivedBy?.name },
                  { l: 'Branch', v: selectedPayment.invoice?.branch?.name },
                ].filter(r => r.v).map((r, i, arr) => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none', background: 'rgba(255,255,255,.02)' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{r.l}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'white', textAlign: 'right', maxWidth: '60%' }}>{r.v}</span>
                  </div>
                ))}
              </div>

              {selectedPayment.notes && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
                  <p style={{ margin: '0 0 3px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>Notes</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.6)' }}>{selectedPayment.notes}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                <PBtn onClick={() => { setShowDetailModal(false); setSelectedPayment(null); }} label="Close" outline color="rgba(255,255,255,.4)" />
                {currentUser?.role === 'SUPER_ADMIN' && (
                  <PBtn onClick={() => setShowVoidConfirm(selectedPayment)} label="Void Payment"
                    grad="linear-gradient(135deg,#ef4444,#dc2626)" glow="rgba(239,68,68,.3)" />
                )}
              </div>
            </div>
          </div>
        </POvl>
      )}

      {/* VOID CONFIRM */}
      {showVoidConfirm && (
        <POvl onClose={() => setShowVoidConfirm(null)}>
          <div style={{ maxWidth: 380, width: '100%', background: 'rgba(15,23,42,.97)', borderRadius: 20, border: '1px solid rgba(255,255,255,.06)', padding: 28, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>⚠️</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: 'white' }}>Void Payment?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
              Void <span style={{ color: '#6ee7b7', fontWeight: 700 }}>₹{showVoidConfirm.amount?.toLocaleString('en-IN')}</span> for {showVoidConfirm.invoice?.invoiceNumber}? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <PBtn onClick={() => setShowVoidConfirm(null)} label="Cancel" outline color="rgba(255,255,255,.4)" style={{ flex: 1 }} disabled={submitting} />
              <button onClick={() => handleVoid(showVoidConfirm)} disabled={submitting} className="py-btn" style={{
                flex: 1, padding: '10px 0', borderRadius: 12, background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                border: 'none', color: 'white', fontSize: 13, fontWeight: 700, opacity: submitting ? .6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {submitting && <PSpin />}Void Payment
              </button>
            </div>
          </div>
        </POvl>
      )}
    </>
  );
}

// ─── SHARED COMPONENTS ───
function POvl({ children, onClose }) {
  return (
    <div className="py-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="py-modal" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function PMHead({ title, sub, onClose }) {
  return (
    <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', borderRadius: '20px 20px 0 0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.1)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'white' }}>{title}</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{sub}</p>
        </div>
        <PClose onClick={onClose} />
      </div>
    </div>
  );
}

function PBtn({ onClick, label, icon, grad, glow, outline, color, disabled, full, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} className="py-btn" style={{
      padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
      background: outline ? 'transparent' : (grad || 'rgba(255,255,255,.06)'),
      border: outline ? `1px solid ${color || 'rgba(255,255,255,.15)'}` : 'none',
      color: outline ? (color || 'rgba(255,255,255,.6)') : 'white',
      boxShadow: glow ? `0 4px 14px ${glow}` : 'none',
      opacity: disabled ? .5 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      width: full ? '100%' : 'auto', ...style,
    }}>{icon && <span>{icon}</span>}{label}</button>
  );
}

function PClose({ onClick }) {
  return (
    <button onClick={onClick} style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,.14)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ width: 15, height: 15, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function PSpin() {
  return <div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'pySpin .6s linear infinite', flexShrink: 0 }} />;
}