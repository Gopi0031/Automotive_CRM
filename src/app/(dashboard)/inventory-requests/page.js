// src/app/(dashboard)/inventory-requests/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

// ─── CSS ───
const CSS = `
  @keyframes irSlideUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes irScaleIn  { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
  @keyframes irFadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes irSpin     { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes irFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes irPulse    { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.3)} 50%{box-shadow:0 0 0 8px rgba(245,158,11,0)} }

  .ir-glass {
    background: rgba(255,255,255,.04);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 18px;
    transition: all .3s cubic-bezier(.4,0,.2,1);
  }
  .ir-glass:hover {
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.11);
  }
  .ir-card-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 40px rgba(0,0,0,.35);
  }
  .ir-stat:hover { transform: translateY(-4px); box-shadow: 0 20px 48px rgba(0,0,0,.35); }
  .ir-stat:hover .ir-stat-icon { transform: scale(1.12) rotate(6deg); }
  .ir-btn { transition: all .22s ease; cursor: pointer; }
  .ir-btn:hover { transform: translateY(-1px); }
  .ir-btn:active { transform: translateY(0) scale(.98); }
  .ir-overlay { animation: irFadeIn .25s ease; }
  .ir-modal { animation: irScaleIn .3s cubic-bezier(.4,0,.2,1); }

  .ir-input {
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 12px;
    padding: 11px 14px;
    color: white; font-size: 14px;
    width: 100%; outline: none;
    transition: all .22s ease;
  }
  .ir-input::placeholder { color: rgba(255,255,255,.28); }
  .ir-input:focus {
    border-color: rgba(20,184,166,.5);
    background: rgba(255,255,255,.07);
    box-shadow: 0 0 0 3px rgba(20,184,166,.12);
  }
  .ir-select {
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 12px;
    padding: 11px 14px;
    color: white; font-size: 14px;
    width: 100%; outline: none;
    appearance: none; cursor: pointer;
    transition: all .22s ease;
  }
  .ir-select option { background: #1a1f35; color: white; }
  .ir-select:focus {
    border-color: rgba(20,184,166,.5);
    box-shadow: 0 0 0 3px rgba(20,184,166,.12);
  }
  .ir-label {
    display: block; font-size: 11px; font-weight: 700;
    color: rgba(255,255,255,.45);
    margin-bottom: 6px;
    text-transform: uppercase; letter-spacing: .7px;
  }

  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }

  @media(max-width:768px) {
    .ir-stat:hover { transform: none; }
    .ir-stat:hover .ir-stat-icon { transform: none; }
    .ir-card-hover:hover { transform: none; }
  }
`;

// ─── Status / Urgency configs ───
const STATUS_CFG = {
  PENDING:             { label: 'Pending',  icon: '⏳', c: '#fcd34d', bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.25)' },
  APPROVED:            { label: 'Approved', icon: '✅', c: '#6ee7b7', bg: 'rgba(16,185,129,.12)', border: 'rgba(16,185,129,.25)' },
  PARTIALLY_APPROVED:  { label: 'Partial',  icon: '⚡', c: '#93c5fd', bg: 'rgba(59,130,246,.12)', border: 'rgba(59,130,246,.25)' },
  REJECTED:            { label: 'Rejected', icon: '❌', c: '#fca5a5', bg: 'rgba(239,68,68,.12)',  border: 'rgba(239,68,68,.25)' },
  CANCELLED:           { label: 'Cancelled',icon: '🚫', c: 'rgba(255,255,255,.4)', bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.1)' },
};

const URGENCY_CFG = {
  LOW:    { label: 'Low',    icon: '🔵', c: '#93c5fd' },
  MEDIUM: { label: 'Medium', icon: '🟡', c: '#fcd34d' },
  HIGH:   { label: 'High',   icon: '🟠', c: '#fb923c' },
  URGENT: { label: 'Urgent', icon: '🔴', c: '#fca5a5' },
};

const getSC = (s) => STATUS_CFG[s] || STATUS_CFG.PENDING;
const getUC = (u) => URGENCY_CFG[u] || URGENCY_CFG.MEDIUM;

// ══════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════
export default function InventoryRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState({ status: '' });

  const [formData, setFormData] = useState({
    jobId: '', notes: '', urgency: 'MEDIUM',
    items: [{ partId: '', quantity: 1, notes: '' }],
  });

  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  // ─── init ───
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

useEffect(() => {
  const loadUser = async () => {
    const stored = localStorage.getItem('user');
    let user = null;

    if (stored) {
      try {
        user = JSON.parse(stored);
        setCurrentUser(user);
      } catch (e) {
        localStorage.removeItem('user');
      }
    }

    // Fetch fresh profile to ensure branchId is available
    try {
      const res = await fetch('/api/auth/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const freshUser = { ...user, ...data.data };
          setCurrentUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        }
      }
    } catch (err) {
      console.error('Profile fetch failed:', err);
    }
  };

  loadUser();
  fetchInitial();
}, []);

  useEffect(() => { if (currentUser) fetchRequests(); }, [filters, currentUser]);

  const fetchInitial = async () => {
    try {
      const [jR, pR] = await Promise.all([fetch('/api/jobs'), fetch('/api/inventory')]);
      const jD = await jR.json();
      const pD = await pR.json();
      if (jD.success) setJobs(jD.data || []);
      if (pD.success) setParts(pD.data || []);
    } catch {}
  };

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams();
      if (filters.status) p.append('status', filters.status);
      const r = await fetch(`/api/inventory-requests?${p}`);
      const d = await r.json();
      if (d.success) {
        setRequests(d.data || []);
        const data = d.data || [];
        setStats({
          total: data.length,
          pending: data.filter(r => r.status === 'PENDING').length,
          approved: data.filter(r => ['APPROVED', 'PARTIALLY_APPROVED'].includes(r.status)).length,
          rejected: data.filter(r => r.status === 'REJECTED').length,
        });
      }
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [filters]);

  // ─── form handlers ───
  const resetForm = () => setFormData({
    jobId: '', notes: '', urgency: 'MEDIUM',
    items: [{ partId: '', quantity: 1, notes: '' }],
  });

  const addItem = () => setFormData(p => ({
    ...p, items: [...p.items, { partId: '', quantity: 1, notes: '' }],
  }));

  const removeItem = (i) => {
    if (formData.items.length === 1) return;
    setFormData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  };

  const updateItem = (i, field, value) => {
    setFormData(p => ({
      ...p, items: p.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item),
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.jobId) { toast.error('Select a job'); return; }
    const valid = formData.items.filter(i => i.partId && i.quantity > 0);
    if (!valid.length) { toast.error('Add at least one item'); return; }
    setSubmitting(true);
    try {
      const r = await fetch('/api/inventory-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: formData.jobId, notes: formData.notes, urgency: formData.urgency, items: valid }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || 'Failed'); return; }
      toast.success('Request created!');
      setShowCreateModal(false); resetForm(); fetchRequests();
    } catch { toast.error('Error'); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async (id) => {
    try {
      const r = await fetch(`/api/inventory-requests/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || 'Failed'); return; }
      toast.success('Request cancelled');
      setShowCancelConfirm(null); fetchRequests();
    } catch { toast.error('Error'); }
  };

  const handleApproveReject = async (action, approvalData) => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/inventory-requests/${selectedRequest.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action, items: approvalData?.items,
          rejectionReason: approvalData?.rejectionReason,
        }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || 'Failed'); return; }
      toast.success(d.message);
      setShowApproveModal(false); setShowDetailModal(false); fetchRequests();
    } catch { toast.error('Error'); }
    finally { setSubmitting(false); }
  };

  const isTech = currentUser?.role === 'EMPLOYEE';
  const isMgr = ['SUPER_ADMIN', 'MANAGER'].includes(currentUser?.role);

  const STAT_CARDS = [
    { label: 'Total Requests', v: stats.total, icon: '📋', grad: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
    { label: 'Pending', v: stats.pending, icon: '⏳', grad: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    { label: 'Approved', v: stats.approved, icon: '✅', grad: 'linear-gradient(135deg,#10b981,#059669)' },
    { label: 'Rejected', v: stats.rejected, icon: '❌', grad: 'linear-gradient(135deg,#ef4444,#dc2626)' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div style={{ minHeight: '100vh' }}>
        {/* ═══ HEADER ═══ */}
        <div style={{ marginBottom: 24, animation: 'irSlideUp .5s ease' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 26 }}>📋</span>
                <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem,4vw,1.7rem)', fontWeight: 800, color: 'white', letterSpacing: '-.5px' }}>
                  {isTech ? 'My Inventory Requests' : 'Inventory Requests'}
                </h1>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.4)', fontWeight: 500 }}>
                {isTech ? 'Request parts for your jobs' : 'Review and manage requests'}
              </p>
            </div>

            {isTech && (
              <Btn onClick={() => setShowCreateModal(true)}
                label="New Request" icon="➕"
                grad="linear-gradient(135deg,#14b8a6,#0891b2)"
                glow="rgba(20,184,166,.35)" full={isMobile} />
            )}
          </div>
        </div>

        {/* ═══ STATS ═══ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${isMobile ? '140px' : '200px'}), 1fr))`,
          gap: isMobile ? 10 : 14, marginBottom: 20,
        }}>
          {STAT_CARDS.map((s, i) => (
            <div key={s.label} className="ir-glass ir-stat" style={{
              padding: isMobile ? '14px' : 'clamp(14px,2vw,20px)',
              animation: `irSlideUp .5s ease ${i * .08}s backwards`,
              cursor: 'default',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '.7px' }}>{s.label}</p>
                  <p style={{ margin: '5px 0 0', fontSize: isMobile ? '1.2rem' : 'clamp(1.2rem,2.5vw,1.6rem)', fontWeight: 800, color: 'white' }}>{s.v}</p>
                </div>
                <div className="ir-stat-icon" style={{
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

        {/* ═══ FILTERS ═══ */}
        <div className="ir-glass" style={{
          padding: isMobile ? 14 : 16, marginBottom: 20,
          animation: 'irSlideUp .5s ease .2s backwards',
        }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
            <select className="ir-select" name="status" value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              style={{ minWidth: isMobile ? '100%' : 180 }}>
              <option value="">All Status</option>
              <option value="PENDING">⏳ Pending</option>
              <option value="APPROVED">✅ Approved</option>
              <option value="PARTIALLY_APPROVED">⚡ Partially Approved</option>
              <option value="REJECTED">❌ Rejected</option>
              <option value="CANCELLED">🚫 Cancelled</option>
            </select>

            {filters.status && (
              <button onClick={() => setFilters({ status: '' })} className="ir-btn" style={{
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
              <div style={{ width: 44, height: 44, margin: '0 auto 14px', border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#14b8a6', borderRadius: '50%', animation: 'irSpin .8s linear infinite' }} />
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, fontWeight: 500 }}>Loading requests...</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="ir-glass" style={{ padding: '60px 24px', textAlign: 'center', animation: 'irScaleIn .5s ease' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(20,184,166,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32, animation: 'irFloat 3s ease-in-out infinite' }}>📋</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'white' }}>No requests found</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,.4)' }}>
              {filters.status ? 'Try different filters' : isTech ? 'Create your first request' : 'No pending requests'}
            </p>
            {isTech && !filters.status && (
              <Btn onClick={() => setShowCreateModal(true)} label="Create First Request" icon="➕"
                grad="linear-gradient(135deg,#14b8a6,#0891b2)" glow="rgba(20,184,166,.35)" />
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map((req, i) => (
              <RequestCard
                key={req.id}
                request={req}
                index={i}
                isTech={isTech}
                isMgr={isMgr}
                isMobile={isMobile}
                onView={() => { setSelectedRequest(req); setShowDetailModal(true); }}
                onApprove={() => { setSelectedRequest(req); setShowApproveModal(true); }}
                onCancel={() => setShowCancelConfirm(req.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══ CREATE MODAL ═══ */}
      {showCreateModal && (
        <Overlay onClose={() => { setShowCreateModal(false); resetForm(); }}>
          <div style={{ maxWidth: 620, width: '100%' }}>
            <MHead grad="linear-gradient(135deg,#14b8a6,#0891b2)"
              title="📦 New Inventory Request"
              sub="Request parts for your job"
              onClose={() => { setShowCreateModal(false); resetForm(); }} />

            <form onSubmit={handleCreate} style={{
              padding: isMobile ? 20 : 24,
              background: 'rgba(15,23,42,.97)',
              borderRadius: '0 0 20px 20px',
              border: '1px solid rgba(255,255,255,.06)', borderTop: 'none',
            }}>
              <div style={{ maxHeight: 'calc(75vh - 200px)', overflowY: 'auto', paddingRight: 4 }}>
                {/* Job */}
                <div style={{ marginBottom: 18 }}>
                  <label className="ir-label">Select Job <span style={{ color: '#14b8a6' }}>*</span></label>
                  <select className="ir-select" value={formData.jobId}
                    onChange={(e) => setFormData(p => ({ ...p, jobId: e.target.value }))} required>
                    <option value="">Choose a job...</option>
                    {jobs.filter(j => j.assignedToId === currentUser?.id).map(j => (
                      <option key={j.id} value={j.id}>
                        {j.jobNumber} - {j.vehicle?.licensePlate} ({j.vehicle?.make} {j.vehicle?.model})
                      </option>
                    ))}
                  </select>
                  {jobs.filter(j => j.assignedToId === currentUser?.id).length === 0 && (
                    <p style={{ fontSize: 11, color: '#fca5a5', marginTop: 6 }}>No jobs assigned to you.</p>
                  )}
                </div>

                {/* Urgency */}
                <div style={{ marginBottom: 18 }}>
                  <label className="ir-label">Urgency</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { v: 'LOW', l: '🔵 Low', c: '#3b82f6' },
                      { v: 'MEDIUM', l: '🟡 Medium', c: '#f59e0b' },
                      { v: 'HIGH', l: '🟠 High', c: '#f97316' },
                      { v: 'URGENT', l: '🔴 Urgent', c: '#ef4444' },
                    ].map(o => (
                      <label key={o.v} style={{
                        display: 'flex', alignItems: 'center', padding: '9px 14px',
                        borderRadius: 10, cursor: 'pointer',
                        background: formData.urgency === o.v ? `${o.c}15` : 'rgba(255,255,255,.03)',
                        border: `1.5px solid ${formData.urgency === o.v ? `${o.c}40` : 'rgba(255,255,255,.07)'}`,
                        transition: 'all .2s',
                      }}>
                        <input type="radio" name="urgency" value={o.v}
                          checked={formData.urgency === o.v}
                          onChange={(e) => setFormData(p => ({ ...p, urgency: e.target.value }))}
                          style={{ display: 'none' }} />
                        <span style={{ fontWeight: 700, fontSize: 13, color: formData.urgency === o.v ? o.c : 'rgba(255,255,255,.45)' }}>{o.l}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Items */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label className="ir-label" style={{ margin: 0 }}>Request Items <span style={{ color: '#14b8a6' }}>*</span></label>
                    <button type="button" onClick={addItem} className="ir-btn" style={{
                      padding: '6px 12px', borderRadius: 8,
                      background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.2)',
                      color: '#6ee7b7', fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
                      </svg>
                      Add Item
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {formData.items.map((item, idx) => (
                      <div key={idx} style={{
                        padding: 14, borderRadius: 14,
                        background: 'rgba(255,255,255,.025)',
                        border: '1px solid rgba(255,255,255,.06)',
                      }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr auto',
                          gap: 10, alignItems: 'end',
                        }}>
                          <div>
                            <label style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Part</label>
                            <select className="ir-select" value={item.partId}
                              onChange={(e) => updateItem(idx, 'partId', e.target.value)} required>
                              <option value="">Select part...</option>
                              {parts.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.partNumber}) - Stock: {p.quantity}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Qty</label>
                            <input className="ir-input" type="number" value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                              min="1" required />
                          </div>
                          {formData.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(idx)} className="ir-btn" style={{
                              width: 38, height: 38, borderRadius: 10,
                              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)',
                              color: '#fca5a5',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="ir-label">Additional Notes</label>
                  <textarea className="ir-input" value={formData.notes}
                    onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                    rows={3} placeholder="Special instructions..."
                    style={{ resize: 'none' }} />
                </div>
              </div>

              <MFoot onCancel={() => { setShowCreateModal(false); resetForm(); }}
                submitting={submitting} label="Submit Request"
                grad="linear-gradient(135deg,#14b8a6,#0891b2)"
                glow="rgba(20,184,166,.3)"
                disabled={jobs.filter(j => j.assignedToId === currentUser?.id).length === 0} />
            </form>
          </div>
        </Overlay>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      {showDetailModal && selectedRequest && (
        <DetailModal
          request={selectedRequest}
          isMobile={isMobile}
          isMgr={isMgr}
          onClose={() => { setShowDetailModal(false); setSelectedRequest(null); }}
          onApprove={() => { setShowDetailModal(false); setShowApproveModal(true); }}
          onReject={(reason) => handleApproveReject('reject', { rejectionReason: reason })}
          submitting={submitting}
        />
      )}

      {/* ═══ APPROVE MODAL ═══ */}
      {showApproveModal && selectedRequest && (
        <ApproveModal
          request={selectedRequest}
          isMobile={isMobile}
          onClose={() => { setShowApproveModal(false); setSelectedRequest(null); }}
          onApprove={(items) => handleApproveReject('approve', { items })}
          submitting={submitting}
        />
      )}

      {/* ═══ CANCEL CONFIRM ═══ */}
      {showCancelConfirm && (
        <Overlay onClose={() => setShowCancelConfirm(null)}>
          <div style={{
            maxWidth: 380, width: '100%',
            background: 'rgba(15,23,42,.97)', borderRadius: 20,
            border: '1px solid rgba(255,255,255,.06)',
            padding: 28, textAlign: 'center',
          }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>🚫</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: 'white' }}>Cancel Request?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,.45)' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={() => setShowCancelConfirm(null)} label="Keep" outline color="rgba(255,255,255,.4)" style={{ flex: 1 }} />
              <button onClick={() => handleCancel(showCancelConfirm)} className="ir-btn" style={{
                flex: 1, padding: '10px 0', borderRadius: 12,
                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
              }}>Cancel Request</button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// REQUEST CARD
// ══════════════════════════════════════════════
function RequestCard({ request, index, isTech, isMgr, isMobile, onView, onApprove, onCancel }) {
  const sc = getSC(request.status);
  const uc = getUC(request.urgency);
  const itemCount = request.items?.length || 0;
  const totalQty = request.items?.reduce((s, i) => s + i.quantityRequested, 0) || 0;

  return (
    <div className="ir-glass ir-card-hover" onClick={onView} style={{
      padding: isMobile ? 16 : 20, cursor: 'pointer',
      animation: `irSlideUp .4s ease ${index * .04}s backwards`,
    }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: 14 }}>
        {/* left */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: 'white' }}>
              {request.requestNumber}
            </span>
            <Badge text={`${sc.icon} ${sc.label}`} bg={sc.bg} border={sc.border} color={sc.c} />
            <Badge text={`${uc.icon} ${uc.label}`} bg="rgba(255,255,255,.05)" border="rgba(255,255,255,.08)" color={uc.c} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>Job:</span>
            <span style={{ fontWeight: 700, color: 'white', fontSize: 13 }}>{request.job?.jobNumber}</span>
            <span style={{ color: 'rgba(255,255,255,.2)' }}>•</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>{request.job?.vehicle?.licensePlate}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,.4)' }}>
              <strong style={{ color: 'white' }}>{itemCount}</strong> item(s)
            </span>
            <span style={{ color: 'rgba(255,255,255,.4)' }}>
              <strong style={{ color: 'white' }}>{totalQty}</strong> total qty
            </span>
            {!isTech && (
              <>
                <span style={{ color: 'rgba(255,255,255,.15)' }}>•</span>
                <span style={{ color: 'rgba(255,255,255,.4)' }}>
                  By: <strong style={{ color: 'white' }}>{request.requestedBy?.name}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          {isMgr && request.status === 'PENDING' && (
            <button onClick={(e) => { e.stopPropagation(); onApprove(); }} className="ir-btn" style={{
              padding: '8px 16px', borderRadius: 10,
              background: 'linear-gradient(135deg,#10b981,#059669)',
              border: 'none', color: 'white', fontWeight: 700, fontSize: 13,
              boxShadow: '0 4px 12px rgba(16,185,129,.3)',
            }}>Review</button>
          )}
          {isTech && request.status === 'PENDING' && (
            <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="ir-btn" style={{
              padding: '8px 16px', borderRadius: 10,
              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)',
              color: '#fca5a5', fontWeight: 700, fontSize: 13,
            }}>Cancel</button>
          )}
          <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 11, fontWeight: 500 }}>
            {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// DETAIL MODAL
// ══════════════════════════════════════════════
function DetailModal({ request, isMobile, isMgr, onClose, onApprove, onReject, submitting }) {
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const sc = getSC(request.status);
  const uc = getUC(request.urgency);

  return (
    <Overlay onClose={onClose}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        {/* header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02))',
          borderRadius: '20px 20px 0 0',
          border: '1px solid rgba(255,255,255,.08)', borderBottom: 'none',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Request</p>
              <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: 'white' }}>{request.requestNumber}</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                <Badge text={`${sc.icon} ${sc.label}`} bg={sc.bg} border={sc.border} color={sc.c} />
                <Badge text={`${uc.icon} ${uc.label}`} bg="rgba(255,255,255,.06)" border="rgba(255,255,255,.1)" color={uc.c} />
              </div>
            </div>
            <CloseBtn onClick={onClose} />
          </div>
        </div>

        {/* body */}
        <div style={{
          padding: isMobile ? 20 : 24,
          background: 'rgba(15,23,42,.97)',
          borderRadius: '0 0 20px 20px',
          border: '1px solid rgba(255,255,255,.06)', borderTop: 'none',
          maxHeight: 'calc(75vh - 180px)', overflowY: 'auto',
        }}>
          {/* job info */}
          <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', marginBottom: 18 }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>For Job</p>
            <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 15 }}>{request.job?.jobNumber}</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
              {request.job?.vehicle?.licensePlate} • {request.job?.vehicle?.make} {request.job?.vehicle?.model}
            </p>
          </div>

          {/* meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>Requested By</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'white' }}>{request.requestedBy?.name}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>Date</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'white' }}>
                {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* items */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: '0 0 10px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Requested Items</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {request.items?.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 14px', borderRadius: 11,
                  background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)',
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 13 }}>{item.part?.name}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: 'monospace' }}>{item.part?.partNumber}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 800, color: 'white', fontSize: 16 }}>{item.quantityRequested}</p>
                    {item.quantityApproved != null && (
                      <p style={{ margin: 0, fontSize: 11, color: item.quantityApproved === item.quantityRequested ? '#6ee7b7' : '#fcd34d' }}>
                        Approved: {item.quantityApproved}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* notes */}
          {request.notes && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>Notes</p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.6)' }}>{request.notes}</p>
            </div>
          )}

          {/* rejection reason */}
          {request.status === 'REJECTED' && request.rejectionReason && (
            <div style={{ padding: 14, borderRadius: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, color: '#fca5a5', fontWeight: 700 }}>Rejection Reason</p>
              <p style={{ margin: 0, fontSize: 13, color: '#fca5a5' }}>{request.rejectionReason}</p>
            </div>
          )}

          {/* reject form */}
          {isMgr && request.status === 'PENDING' && showReject && (
            <div style={{ padding: 14, borderRadius: 12, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.15)', marginTop: 14 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>Rejection Reason</p>
              <textarea className="ir-input" value={reason} onChange={(e) => setReason(e.target.value)}
                rows={3} placeholder="Explain why..." style={{ resize: 'none', borderColor: 'rgba(239,68,68,.2)' }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                <Btn onClick={() => { setShowReject(false); setReason(''); }} label="Cancel" outline color="rgba(255,255,255,.4)" />
                <button onClick={() => onReject(reason)} disabled={submitting} className="ir-btn" style={{
                  padding: '8px 16px', borderRadius: 10,
                  background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                  border: 'none', color: 'white', fontWeight: 700, fontSize: 13,
                  opacity: submitting ? .6 : 1,
                }}>{submitting ? 'Rejecting...' : 'Confirm Reject'}</button>
              </div>
            </div>
          )}

          {/* manager actions */}
          {isMgr && request.status === 'PENDING' && !showReject && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              <Btn onClick={() => setShowReject(true)} label="Reject" outline color="#fca5a5" borderColor="rgba(239,68,68,.3)" />
              <Btn onClick={onApprove} label="Approve Items" grad="linear-gradient(135deg,#10b981,#059669)" glow="rgba(16,185,129,.3)" />
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}

// ══════════════════════════════════════════════
// APPROVE MODAL
// ══════════════════════════════════════════════
function ApproveModal({ request, isMobile, onClose, onApprove, submitting }) {
  const [items, setItems] = useState(
    request.items?.map(i => ({
      id: i.id, partId: i.partId, partName: i.part?.name,
      quantityRequested: i.quantityRequested,
      quantityApproved: i.quantityRequested,
      available: i.part?.quantity || 0,
    })) || []
  );

  const handleQty = (id, v) => setItems(p => p.map(i => i.id === id ? { ...i, quantityApproved: parseInt(v) || 0 } : i));
  const hasValid = items.some(i => i.quantityApproved > 0);
  const hasOver = items.some(i => i.quantityApproved > i.available);

  return (
    <Overlay onClose={onClose}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <MHead grad="linear-gradient(135deg,#10b981,#059669)"
          title="✅ Approve Request" sub={`${request.requestNumber} • Set quantities`}
          onClose={onClose} />

        <div style={{
          padding: isMobile ? 20 : 24,
          background: 'rgba(15,23,42,.97)',
          borderRadius: '0 0 20px 20px',
          border: '1px solid rgba(255,255,255,.06)', borderTop: 'none',
          maxHeight: 'calc(75vh - 200px)', overflowY: 'auto',
        }}>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
            Adjust quantities. Items with 0 won't be issued.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {items.map(item => {
              const over = item.quantityApproved > item.available;
              return (
                <div key={item.id} style={{
                  padding: 14, borderRadius: 14,
                  background: over ? 'rgba(239,68,68,.06)' : 'rgba(255,255,255,.025)',
                  border: `1.5px solid ${over ? 'rgba(239,68,68,.25)' : 'rgba(255,255,255,.06)'}`,
                }}>
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 14 }}>{item.partName}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
                      Requested: {item.quantityRequested} • Available: {item.available}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>Approve:</span>
                    <input className="ir-input" type="number" value={item.quantityApproved}
                      onChange={(e) => handleQty(item.id, e.target.value)}
                      min="0" max={item.available}
                      style={{ width: 90, textAlign: 'center', fontSize: 16, fontWeight: 700, borderColor: over ? 'rgba(239,68,68,.3)' : undefined }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>/ {item.quantityRequested}</span>
                  </div>
                  {over && (
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: '#fca5a5' }}>⚠️ Exceeds available stock!</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* summary */}
          <div style={{
            padding: 14, borderRadius: 12,
            background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#6ee7b7' }}>Items Approved</span>
              <span style={{ fontWeight: 800, fontSize: 17, color: '#6ee7b7' }}>
                {items.filter(i => i.quantityApproved > 0).length} / {items.length}
              </span>
            </div>
          </div>

          {/* footer */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <Btn onClick={onClose} label="Cancel" outline color="rgba(255,255,255,.4)" disabled={submitting} />
            <button onClick={() => onApprove(items.map(i => ({ id: i.id, quantityApproved: i.quantityApproved })))}
              disabled={submitting || !hasValid || hasOver}
              className="ir-btn" style={{
                padding: '10px 22px', borderRadius: 12,
                background: (hasValid && !hasOver) ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,.06)',
                border: 'none',
                color: (hasValid && !hasOver) ? 'white' : 'rgba(255,255,255,.3)',
                fontSize: 13, fontWeight: 700,
                opacity: (submitting || !hasValid || hasOver) ? .5 : 1,
                boxShadow: (hasValid && !hasOver) ? '0 4px 14px rgba(16,185,129,.3)' : 'none',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
              {submitting && <Spin />}
              {submitting ? 'Approving...' : 'Confirm Approval'}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// ══════════════════════════════════════════════
// SHARED UI COMPONENTS
// ══════════════════════════════════════════════
function Overlay({ children, onClose }) {
  return (
    <div className="ir-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.65)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div className="ir-modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function MHead({ grad, title, sub, onClose }) {
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

function MFoot({ onCancel, submitting, label, grad, glow, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,.06)' }}>
      <Btn onClick={onCancel} label="Cancel" outline color="rgba(255,255,255,.4)" disabled={submitting} />
      <button type="submit" disabled={submitting || disabled} className="ir-btn" style={{
        padding: '10px 22px', borderRadius: 12,
        background: grad, border: 'none',
        color: 'white', fontSize: 13, fontWeight: 700,
        opacity: (submitting || disabled) ? .5 : 1,
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: `0 4px 14px ${glow}`,
      }}>
        {submitting && <Spin />}
        {label}
      </button>
    </div>
  );
}

function Badge({ text, bg, border, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '3px 10px', borderRadius: 14,
      background: bg, border: `1px solid ${border}`,
      color, fontSize: 11, fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>{text}</span>
  );
}

function Btn({ onClick, label, icon, grad, glow, outline, color, borderColor, disabled, full, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} className="ir-btn" style={{
      padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
      background: outline ? 'transparent' : (grad || 'rgba(255,255,255,.06)'),
      border: outline ? `1px solid ${borderColor || color || 'rgba(255,255,255,.15)'}` : 'none',
      color: outline ? (color || 'rgba(255,255,255,.6)') : 'white',
      boxShadow: glow ? `0 4px 14px ${glow}` : 'none',
      opacity: disabled ? .5 : 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      width: full ? '100%' : 'auto',
      ...style,
    }}>
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 30, height: 30, borderRadius: 9,
      background: 'rgba(255,255,255,.14)', border: 'none',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg style={{ width: 15, height: 15, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function Spin() {
  return <div style={{
    width: 15, height: 15,
    border: '2px solid rgba(255,255,255,.2)',
    borderTopColor: 'white', borderRadius: '50%',
    animation: 'irSpin .6s linear infinite', flexShrink: 0,
  }} />;
}