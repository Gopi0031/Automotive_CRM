// src/app/(dashboard)/inventory-transfers/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const CSS = `
  @keyframes trSlideUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes trScaleIn  { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
  @keyframes trFadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes trSpin     { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes trFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

  .tr-glass {
    background:rgba(255,255,255,.04);
    backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
    border:1px solid rgba(255,255,255,.07);
    border-radius:18px;
    transition:all .3s cubic-bezier(.4,0,.2,1);
  }
  .tr-glass:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.11)}
  .tr-card-hover:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(0,0,0,.35)}
  .tr-stat:hover{transform:translateY(-4px);box-shadow:0 20px 48px rgba(0,0,0,.35)}
  .tr-stat:hover .tr-stat-icon{transform:scale(1.12) rotate(6deg)}
  .tr-btn{transition:all .22s ease;cursor:pointer}
  .tr-btn:hover{transform:translateY(-1px)}
  .tr-btn:active{transform:translateY(0) scale(.98)}
  .tr-overlay{animation:trFadeIn .25s ease}
  .tr-modal{animation:trScaleIn .3s cubic-bezier(.4,0,.2,1)}
  .tr-input{
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
    border-radius:12px;padding:11px 14px;color:white;font-size:14px;
    width:100%;outline:none;transition:all .22s ease;
  }
  .tr-input::placeholder{color:rgba(255,255,255,.28)}
  .tr-input:focus{border-color:rgba(139,92,246,.5);background:rgba(255,255,255,.07);box-shadow:0 0 0 3px rgba(139,92,246,.12)}
  .tr-select{
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
    border-radius:12px;padding:11px 14px;color:white;font-size:14px;
    width:100%;outline:none;appearance:none;cursor:pointer;transition:all .22s ease;
  }
  .tr-select option{background:#1a1f35;color:white}
  .tr-select:focus{border-color:rgba(139,92,246,.5);box-shadow:0 0 0 3px rgba(139,92,246,.12)}
  .tr-label{display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.45);margin-bottom:6px;text-transform:uppercase;letter-spacing:.7px}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
  input[type=number]{-moz-appearance:textfield}
  @media(max-width:768px){.tr-stat:hover{transform:none}.tr-stat:hover .tr-stat-icon{transform:none}.tr-card-hover:hover{transform:none}}
`;

const STATUS_CFG = {
  REQUESTED:  { label:'Requested',  icon:'📤', c:'#fcd34d', bg:'rgba(245,158,11,.12)', bd:'rgba(245,158,11,.25)' },
  APPROVED:   { label:'Approved',   icon:'✅', c:'#93c5fd', bg:'rgba(59,130,246,.12)',  bd:'rgba(59,130,246,.25)' },
  REJECTED:   { label:'Rejected',   icon:'❌', c:'#fca5a5', bg:'rgba(239,68,68,.12)',   bd:'rgba(239,68,68,.25)' },
  IN_TRANSIT: { label:'In Transit', icon:'🚚', c:'#c4b5fd', bg:'rgba(139,92,246,.12)', bd:'rgba(139,92,246,.25)' },
  RECEIVED:   { label:'Completed',  icon:'✓',  c:'#6ee7b7', bg:'rgba(16,185,129,.12)', bd:'rgba(16,185,129,.25)' },
  CANCELLED:  { label:'Cancelled',  icon:'🚫', c:'rgba(255,255,255,.4)', bg:'rgba(255,255,255,.05)', bd:'rgba(255,255,255,.1)' },
};
const URGENCY_CFG = {
  LOW:    { label:'Low',    icon:'🔵', c:'#93c5fd' },
  MEDIUM: { label:'Medium', icon:'🟡', c:'#fcd34d' },
  HIGH:   { label:'High',   icon:'🟠', c:'#fb923c' },
  URGENT: { label:'Urgent', icon:'🔴', c:'#fca5a5' },
};
const gSC = s => STATUS_CFG[s] || STATUS_CFG.REQUESTED;
const gUC = u => URGENCY_CFG[u] || URGENCY_CFG.MEDIUM;

export default function InventoryTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [actionType, setActionType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState({ status: '', type: '' });
  const [formData, setFormData] = useState({
    fromBranchId: '', toBranchId: '', notes: '', urgency: 'MEDIUM',
    items: [{ partId: '', quantity: 1, notes: '' }],
  });
  const [stats, setStats] = useState({ total: 0, pending: 0, inTransit: 0, completed: 0 });

  const isMgr = ['SUPER_ADMIN', 'MANAGER'].includes(currentUser?.role);
  const isSA = currentUser?.role === 'SUPER_ADMIN';
  const userBranchId = currentUser?.branchId || currentUser?.branch?.id;

  useEffect(() => {
    const c = () => setIsMobile(window.innerWidth < 768);
    c(); window.addEventListener('resize', c);
    return () => window.removeEventListener('resize', c);
  }, []);

// ✅ Replace WITH this:
useEffect(() => {
  const loadUser = async () => {
    const stored = localStorage.getItem('user');
    let user = null;

    if (stored) {
      try {
        user = JSON.parse(stored);
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to parse user:', e);
        localStorage.removeItem('user');
      }
    }

    // Always fetch fresh profile to ensure branchId is available
    try {
      const res = await fetch('/api/auth/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const freshUser = { ...user, ...data.data };
          setCurrentUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
          console.log('✅ User loaded:', {
            name: freshUser.name,
            role: freshUser.role,
            branchId: freshUser.branchId,
            branch: freshUser.branch?.name,
          });
        }
      }
    } catch (err) {
      console.error('Profile fetch failed:', err);
    }
  };

  loadUser();
  fetchInitial();
}, []);

  const fetchUserProfile = async (fallbackUser) => {
    try {
      const r = await fetch('/api/auth/profile');
      if (!r.ok) {
        console.warn(`Profile endpoint returned ${r.status}`);
        // Fallback: try /api/auth/me
        const r2 = await fetch('/api/auth/me');
        if (!r2.ok) return;
        const contentType2 = r2.headers.get('content-type');
        if (!contentType2 || !contentType2.includes('application/json')) return;
        const d2 = await r2.json();
        if (d2.success && d2.user) {
          const fullUser = { ...fallbackUser, ...d2.user };
          setCurrentUser(fullUser);
          localStorage.setItem('user', JSON.stringify(fullUser));
        }
        return;
      }
      const contentType = r.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      const d = await r.json();
      if (d.success && d.data) {
        const fullUser = { ...fallbackUser, ...d.data };
        setCurrentUser(fullUser);
        localStorage.setItem('user', JSON.stringify(fullUser));
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  useEffect(() => { if (currentUser) fetchTransfers(); }, [filters, currentUser]);

// src/app/(dashboard)/inventory-transfers/page.js
// Find the fetchInitial function and replace it with this:

const fetchInitial = async () => {
  try {
    const [bR, pR] = await Promise.all([
      fetch('/api/branches?all=true'),              // ✅ FIX: Get ALL branches
      fetch('/api/inventory?allBranches=true'),      // ✅ FIX: Get ALL branches' parts
    ]);
    const bD = await bR.json();
    const pD = await pR.json();
    if (bD.success) setBranches(bD.data || []);
    if (pD.success) setParts(pD.data || []);
  } catch (err) {
    console.error('Failed to fetch initial data:', err);
  }
};

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams();
      if (filters.status) p.append('status', filters.status);
      if (filters.type) p.append('type', filters.type);
      const r = await fetch(`/api/inventory-transfers?${p}`);
      const d = await r.json();
      if (d.success) {
        setTransfers(d.data || []);
        const data = d.data || [];
        setStats({
          total: data.length,
          pending: data.filter(t => ['REQUESTED', 'APPROVED'].includes(t.status)).length,
          inTransit: data.filter(t => t.status === 'IN_TRANSIT').length,
          completed: data.filter(t => t.status === 'RECEIVED').length,
        });
      }
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [filters]);

  const resetForm = () => setFormData({
    fromBranchId: '',
    toBranchId: isSA ? '' : (userBranchId || ''),
    notes: '',
    urgency: 'MEDIUM',
    items: [{ partId: '', quantity: 1, notes: '' }],
  });

  const addItem = () => setFormData(p => ({ ...p, items: [...p.items, { partId: '', quantity: 1, notes: '' }] }));
  const removeItem = i => { if (formData.items.length > 1) setFormData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) })); };
  const updateItem = (i, f, v) => setFormData(p => ({ ...p, items: p.items.map((item, idx) => idx === i ? { ...item, [f]: v } : item) }));

  const sourceParts = () => formData.fromBranchId ? parts.filter(p => p.branchId === formData.fromBranchId && p.quantity > 0) : [];

  // Get available source branches (excluding user's own branch for non-SA)
  const getSourceBranches = () => {
    if (isSA) return branches;
    if (!userBranchId) return branches; // Show all if branchId unknown
    return branches.filter(b => b.id !== userBranchId);
  };

  // Get available destination branches (excluding source branch)
  const getDestinationBranches = () => {
    return branches.filter(b => b.id !== formData.fromBranchId);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const finalToBranchId = isSA ? formData.toBranchId : (userBranchId || formData.toBranchId);
    if (!formData.fromBranchId || !finalToBranchId) { toast.error('Select both branches'); return; }
    if (formData.fromBranchId === finalToBranchId) { toast.error('Source and destination must be different'); return; }
    const valid = formData.items.filter(i => i.partId && i.quantity > 0);
    if (!valid.length) { toast.error('Add at least one item'); return; }
    setSubmitting(true);
    try {
      const r = await fetch('/api/inventory-transfers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromBranchId: formData.fromBranchId,
          toBranchId: finalToBranchId,
          notes: formData.notes,
          urgency: formData.urgency,
          items: valid,
        }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || 'Failed'); return; }
      toast.success('Transfer request created!');
      setShowCreateModal(false); resetForm(); fetchTransfers();
    } catch { toast.error('Error'); }
    finally { setSubmitting(false); }
  };

  const handleAction = async (actionData) => {
    if (!selectedTransfer) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/inventory-transfers/${selectedTransfer.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, ...actionData }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || 'Failed'); return; }
      toast.success(d.message);
      setShowActionModal(false); setShowDetailModal(false); setSelectedTransfer(null); fetchTransfers();
    } catch { toast.error('Error'); }
    finally { setSubmitting(false); }
  };

  const openAction = (t, a) => { setSelectedTransfer(t); setActionType(a); setShowActionModal(true); };

  const canApproveReject = t => t.status === 'REQUESTED' && (isSA || t.fromBranchId === userBranchId);
  const canSend = t => t.status === 'APPROVED' && (isSA || t.fromBranchId === userBranchId);
  const canReceive = t => t.status === 'IN_TRANSIT' && (isSA || t.toBranchId === userBranchId);

  const incoming = transfers.filter(t => t.toBranchId === userBranchId);
  const outgoing = transfers.filter(t => t.fromBranchId === userBranchId);

  const userBranchName = branches.find(b => b.id === userBranchId)?.name;
  const sourceBranchList = getSourceBranches();

  const STATS = [
    { label: 'Total Transfers', v: stats.total, icon: '🔄', grad: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' },
    { label: 'Pending', v: stats.pending, icon: '⏳', grad: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    { label: 'In Transit', v: stats.inTransit, icon: '🚚', grad: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
    { label: 'Completed', v: stats.completed, icon: '✓', grad: 'linear-gradient(135deg,#10b981,#059669)' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div style={{ minHeight: '100vh' }}>
        {/* HEADER */}
        <div style={{ marginBottom: 24, animation: 'trSlideUp .5s ease' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 26 }}>🔄</span>
                <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem,4vw,1.7rem)', fontWeight: 800, color: 'white', letterSpacing: '-.5px' }}>
                  Inventory Transfers
                </h1>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.4)', fontWeight: 500 }}>
                Transfer items between branches
                {userBranchName && !isSA && (
                  <span style={{ color: 'rgba(255,255,255,.25)', marginLeft: 6 }}>• {userBranchName}</span>
                )}
              </p>
            </div>
            {isMgr && (
              <GBtn onClick={() => { resetForm(); setShowCreateModal(true); }} label="Request Transfer" icon="🔄"
                grad="linear-gradient(135deg,#8b5cf6,#6d28d9)" glow="rgba(139,92,246,.35)" full={isMobile} />
            )}
          </div>
        </div>

        {/* STATS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${isMobile ? '140px' : '200px'}),1fr))`,
          gap: isMobile ? 10 : 14, marginBottom: 20,
        }}>
          {STATS.map((s, i) => (
            <div key={s.label} className="tr-glass tr-stat" style={{
              padding: isMobile ? 14 : 'clamp(14px,2vw,20px)',
              animation: `trSlideUp .5s ease ${i * .08}s backwards`, cursor: 'default',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '.7px' }}>{s.label}</p>
                  <p style={{ margin: '5px 0 0', fontSize: isMobile ? '1.2rem' : 'clamp(1.2rem,2.5vw,1.6rem)', fontWeight: 800, color: 'white' }}>{s.v}</p>
                </div>
                <div className="tr-stat-icon" style={{
                  width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, borderRadius: 13,
                  background: s.grad, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMobile ? 20 : 22, flexShrink: 0, boxShadow: '0 6px 18px rgba(0,0,0,.25)',
                  transition: 'transform .3s ease',
                }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ALERTS */}
        {!isSA && incoming.filter(t => t.status === 'IN_TRANSIT').length > 0 && (
          <AlertBanner icon="📦" title="Items Ready to Receive"
            sub={`${incoming.filter(t => t.status === 'IN_TRANSIT').length} transfer(s) awaiting confirmation`}
            color="#3b82f6" onClick={() => setFilters({ type: 'incoming', status: 'IN_TRANSIT' })} btnLabel="View" />
        )}
        {!isSA && outgoing.filter(t => t.status === 'REQUESTED').length > 0 && (
          <AlertBanner icon="📤" title="Pending Approval"
            sub={`${outgoing.filter(t => t.status === 'REQUESTED').length} request(s) need review`}
            color="#f59e0b" onClick={() => setFilters({ type: 'outgoing', status: 'REQUESTED' })} btnLabel="Review" />
        )}

        {/* FILTERS */}
        <div className="tr-glass" style={{ padding: isMobile ? 14 : 16, marginBottom: 20, animation: 'trSlideUp .5s ease .2s backwards' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
            <select className="tr-select" value={filters.type}
              onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
              style={{ minWidth: isMobile ? '100%' : 170 }}>
              <option value="">All Transfers</option>
              <option value="incoming">📥 Incoming</option>
              <option value="outgoing">📤 Outgoing</option>
            </select>
            <select className="tr-select" value={filters.status}
              onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
              style={{ minWidth: isMobile ? '100%' : 170 }}>
              <option value="">All Status</option>
              <option value="REQUESTED">📤 Requested</option>
              <option value="APPROVED">✅ Approved</option>
              <option value="IN_TRANSIT">🚚 In Transit</option>
              <option value="RECEIVED">✓ Completed</option>
              <option value="REJECTED">❌ Rejected</option>
            </select>
            {(filters.status || filters.type) && (
              <ClearBtn onClick={() => setFilters({ status: '', type: '' })} />
            )}
          </div>
        </div>

        {/* CONTENT */}
        {loading ? <Loader text="Loading transfers..." /> : transfers.length === 0 ? (
          <Empty icon="🔄" title="No transfers found"
            sub={filters.status || filters.type ? 'Try different filters' : 'Request inventory from another branch'}
            showBtn={isMgr && !filters.status && !filters.type}
            onBtn={() => { resetForm(); setShowCreateModal(true); }}
            btnLabel="Request Transfer" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {transfers.map((t, i) => (
              <TransferCard key={t.id} transfer={t} index={i} userBranchId={userBranchId} isMobile={isMobile}
                canAR={canApproveReject(t)} canS={canSend(t)} canR={canReceive(t)}
                onView={() => { setSelectedTransfer(t); setShowDetailModal(true); }}
                onApprove={() => openAction(t, 'approve')}
                onReject={() => openAction(t, 'reject')}
                onSend={() => openAction(t, 'send')}
                onReceive={() => openAction(t, 'receive')} />
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <Overlay onClose={() => { setShowCreateModal(false); resetForm(); }}>
          <div style={{ maxWidth: 620, width: '100%' }}>
            <MHead grad="linear-gradient(135deg,#8b5cf6,#6d28d9)" title="🔄 Request Transfer"
              sub={isSA ? 'Transfer items between any branches' : `Request items to ${userBranchName || 'your branch'}`}
              onClose={() => { setShowCreateModal(false); resetForm(); }} />
            <form onSubmit={handleCreate} style={{ padding: isMobile ? 20 : 24, background: 'rgba(15,23,42,.97)', borderRadius: '0 0 20px 20px', border: '1px solid rgba(255,255,255,.06)', borderTop: 'none' }}>
              <div style={{ maxHeight: 'calc(72vh - 200px)', overflowY: 'auto', paddingRight: 4 }}>

                {/* Branch Info Banner for Manager */}
                {!isSA && userBranchId && (
                  <div style={{
                    padding: '12px 16px', marginBottom: 18, borderRadius: 12,
                    background: 'rgba(139,92,246,.08)',
                    border: '1px solid rgba(139,92,246,.2)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>🏢</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.45)', fontWeight: 600 }}>
                        Requesting items to
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: '#c4b5fd' }}>
                        {userBranchName || 'Your Branch'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Branches */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : (isSA ? '1fr auto 1fr' : '1fr'),
                  gap: 14, alignItems: 'end', marginBottom: 18,
                }}>
                  {/* From Branch (Source) */}
                  <div>
                    <label className="tr-label">
                      From Branch (Source) <span style={{ color: '#8b5cf6' }}>*</span>
                    </label>
                    <select className="tr-select" value={formData.fromBranchId}
                      onChange={e => setFormData(p => ({
                        ...p,
                        fromBranchId: e.target.value,
                        items: [{ partId: '', quantity: 1, notes: '' }],
                      }))} required>
                      <option value="">Select source branch...</option>
                      {sourceBranchList.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name}{b.location ? ` — ${b.location}` : ''}
                        </option>
                      ))}
                    </select>
                    {!isSA && userBranchId && sourceBranchList.length === 0 && (
                      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#fca5a5' }}>
                        No other branches available. At least 2 branches are needed for transfers.
                      </p>
                    )}
                    {!isSA && !userBranchId && (
                      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#fcd34d' }}>
                        ⚠️ Your branch assignment could not be detected. Please log out and log back in.
                      </p>
                    )}
                  </div>

                  {/* Arrow (only for SA with both selects) */}
                  {isSA && !isMobile && (
                    <div style={{ paddingBottom: 8, display: 'flex', justifyContent: 'center' }}>
                      <span style={{ fontSize: 22, color: '#8b5cf6' }}>→</span>
                    </div>
                  )}

                  {/* To Branch (Destination) - only SA can select */}
                  {isSA && (
                    <div>
                      <label className="tr-label">
                        To Branch (Destination) <span style={{ color: '#8b5cf6' }}>*</span>
                      </label>
                      <select className="tr-select" value={formData.toBranchId}
                        onChange={e => setFormData(p => ({ ...p, toBranchId: e.target.value }))} required>
                        <option value="">Select destination...</option>
                        {getDestinationBranches().map(b => (
                          <option key={b.id} value={b.id}>
                            {b.name}{b.location ? ` — ${b.location}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Visual route indicator for Manager */}
                {!isSA && formData.fromBranchId && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
                    padding: 16, borderRadius: 14,
                    background: 'rgba(255,255,255,.025)',
                    border: '1px solid rgba(255,255,255,.06)',
                    marginBottom: 18,
                  }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <p style={{ margin: '0 0 3px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600, textTransform: 'uppercase' }}>From</p>
                      <p style={{ margin: 0, fontWeight: 700, color: '#fcd34d', fontSize: 14 }}>
                        {branches.find(b => b.id === formData.fromBranchId)?.name || 'Source'}
                      </p>
                    </div>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span style={{ color: 'white', fontSize: 16 }}>→</span>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <p style={{ margin: '0 0 3px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600, textTransform: 'uppercase' }}>To</p>
                      <p style={{ margin: 0, fontWeight: 700, color: '#6ee7b7', fontSize: 14 }}>
                        {userBranchName || 'Your Branch'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Urgency */}
                <div style={{ marginBottom: 18 }}>
                  <label className="tr-label">Urgency</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { v: 'LOW', l: '🔵 Low', c: '#3b82f6' },
                      { v: 'MEDIUM', l: '🟡 Medium', c: '#f59e0b' },
                      { v: 'HIGH', l: '🟠 High', c: '#f97316' },
                      { v: 'URGENT', l: '🔴 Urgent', c: '#ef4444' },
                    ].map(o => (
                      <label key={o.v} style={{
                        display: 'flex', alignItems: 'center', padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                        background: formData.urgency === o.v ? `${o.c}15` : 'rgba(255,255,255,.03)',
                        border: `1.5px solid ${formData.urgency === o.v ? `${o.c}40` : 'rgba(255,255,255,.07)'}`,
                        transition: 'all .2s',
                      }}>
                        <input type="radio" value={o.v} checked={formData.urgency === o.v}
                          onChange={e => setFormData(p => ({ ...p, urgency: e.target.value }))} style={{ display: 'none' }} />
                        <span style={{ fontWeight: 700, fontSize: 13, color: formData.urgency === o.v ? o.c : 'rgba(255,255,255,.45)' }}>{o.l}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Items */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label className="tr-label" style={{ margin: 0 }}>Items <span style={{ color: '#8b5cf6' }}>*</span></label>
                    <button type="button" onClick={addItem} disabled={!formData.fromBranchId} className="tr-btn" style={{
                      padding: '6px 12px', borderRadius: 8, background: formData.fromBranchId ? 'rgba(139,92,246,.12)' : 'rgba(255,255,255,.04)',
                      border: `1px solid ${formData.fromBranchId ? 'rgba(139,92,246,.25)' : 'rgba(255,255,255,.06)'}`,
                      color: formData.fromBranchId ? '#c4b5fd' : 'rgba(255,255,255,.3)',
                      fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
                    }}>+ Add Item</button>
                  </div>

                  {!formData.fromBranchId ? (
                    <div style={{ padding: 24, borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', textAlign: 'center', color: 'rgba(255,255,255,.35)', fontSize: 13 }}>
                      Select a source branch to see available items
                    </div>
                  ) : sourceParts().length === 0 ? (
                    <div style={{ padding: 24, borderRadius: 12, background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.15)', textAlign: 'center', color: '#fcd34d', fontSize: 13 }}>
                      No items with stock in selected branch
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {formData.items.map((item, idx) => (
                        <div key={idx} style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr auto', gap: 10, alignItems: 'end' }}>
                            <div>
                              <label style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Part</label>
                              <select className="tr-select" value={item.partId} onChange={e => updateItem(idx, 'partId', e.target.value)} required>
                                <option value="">Select...</option>
                                {sourceParts().map(p => (
                                  <option key={p.id} value={p.id}>{p.name} ({p.partNumber}) - Avail: {p.quantity}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Qty</label>
                              <input className="tr-input" type="number" value={item.quantity}
                                onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} min="1" required />
                            </div>
                            {formData.items.length > 1 && (
                              <button type="button" onClick={() => removeItem(idx)} className="tr-btn" style={{
                                width: 38, height: 38, borderRadius: 10, background: 'rgba(239,68,68,.1)',
                                border: '1px solid rgba(239,68,68,.2)', color: '#fca5a5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>✕</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="tr-label">Notes</label>
                  <textarea className="tr-input" value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    rows={2} placeholder="Additional notes..." style={{ resize: 'none' }} />
                </div>
              </div>

              <MFoot onCancel={() => { setShowCreateModal(false); resetForm(); }} submitting={submitting}
                label="Submit Request" grad="linear-gradient(135deg,#8b5cf6,#6d28d9)" glow="rgba(139,92,246,.3)"
                disabled={!formData.fromBranchId || (!isSA && !userBranchId)} />
            </form>
          </div>
        </Overlay>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && selectedTransfer && (
        <Overlay onClose={() => { setShowDetailModal(false); setSelectedTransfer(null); }}>
          <div style={{ maxWidth: 580, width: '100%' }}>
            <div style={{ padding: '20px 22px', background: 'rgba(255,255,255,.04)', borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,.08)', borderBottom: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>Transfer</p>
                  <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: 'white' }}>{selectedTransfer.transferNumber}</h2>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Badge {...gSC(selectedTransfer.status)} />
                    <Badge text={selectedTransfer.toBranchId === userBranchId ? '📥 Incoming' : '📤 Outgoing'}
                      bg={selectedTransfer.toBranchId === userBranchId ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)'}
                      bd={selectedTransfer.toBranchId === userBranchId ? 'rgba(16,185,129,.25)' : 'rgba(245,158,11,.25)'}
                      c={selectedTransfer.toBranchId === userBranchId ? '#6ee7b7' : '#fcd34d'} />
                  </div>
                </div>
                <CloseBtn onClick={() => { setShowDetailModal(false); setSelectedTransfer(null); }} />
              </div>
            </div>

            <div style={{ padding: isMobile ? 20 : 24, background: 'rgba(15,23,42,.97)', borderRadius: '0 0 20px 20px', border: '1px solid rgba(255,255,255,.06)', borderTop: 'none', maxHeight: 'calc(72vh - 180px)', overflowY: 'auto' }}>
              {/* Route */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 18, borderRadius: 14, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', marginBottom: 20 }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ margin: '0 0 3px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>FROM</p>
                  <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 14 }}>{selectedTransfer.fromBranch?.name}</p>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'white', fontSize: 16 }}>→</span>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ margin: '0 0 3px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>TO</p>
                  <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 14 }}>{selectedTransfer.toBranch?.name}</p>
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[
                  { l: 'Requested By', v: selectedTransfer.requestedBy?.name },
                  { l: 'Urgency', v: `${gUC(selectedTransfer.urgency).icon} ${gUC(selectedTransfer.urgency).label}` },
                  { l: 'Created', v: new Date(selectedTransfer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                  ...(selectedTransfer.approvedBy ? [{ l: 'Approved By', v: selectedTransfer.approvedBy?.name }] : []),
                ].map(m => (
                  <div key={m.l}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>{m.l}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'white' }}>{m.v}</p>
                  </div>
                ))}
              </div>

              {/* Items */}
              <p style={{ margin: '0 0 10px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Transfer Items</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {selectedTransfer.items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderRadius: 11, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 13 }}>{item.part?.name}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: 'monospace' }}>{item.part?.partNumber}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontWeight: 800, color: 'white', fontSize: 16 }}>{item.quantityRequested}</p>
                      {item.quantitySent != null && <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,.4)' }}>Sent: {item.quantitySent}</p>}
                      {item.quantityReceived != null && <p style={{ margin: 0, fontSize: 10, color: '#6ee7b7' }}>Received: {item.quantityReceived}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {selectedTransfer.notes && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>Notes</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.6)' }}>{selectedTransfer.notes}</p>
                </div>
              )}

              {selectedTransfer.status === 'REJECTED' && selectedTransfer.rejectionReason && (
                <div style={{ padding: 14, borderRadius: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 10, color: '#fca5a5', fontWeight: 700 }}>Rejection Reason</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#fca5a5' }}>{selectedTransfer.rejectionReason}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.06)', flexWrap: 'wrap' }}>
                <GBtn onClick={() => { setShowDetailModal(false); setSelectedTransfer(null); }} label="Close" outline color="rgba(255,255,255,.4)" />
                {canApproveReject(selectedTransfer) && (
                  <>
                    <GBtn onClick={() => openAction(selectedTransfer, 'reject')} label="Reject" outline color="#fca5a5" borderColor="rgba(239,68,68,.3)" />
                    <GBtn onClick={() => openAction(selectedTransfer, 'approve')} label="Approve" grad="linear-gradient(135deg,#10b981,#059669)" glow="rgba(16,185,129,.3)" />
                  </>
                )}
                {canSend(selectedTransfer) && (
                  <GBtn onClick={() => openAction(selectedTransfer, 'send')} label="🚚 Send" grad="linear-gradient(135deg,#8b5cf6,#6d28d9)" glow="rgba(139,92,246,.3)" />
                )}
                {canReceive(selectedTransfer) && (
                  <GBtn onClick={() => openAction(selectedTransfer, 'receive')} label="✓ Receive" grad="linear-gradient(135deg,#10b981,#059669)" glow="rgba(16,185,129,.3)" />
                )}
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* ACTION MODAL */}
      {showActionModal && selectedTransfer && (
        <ActionModal transfer={selectedTransfer} actionType={actionType} isMobile={isMobile}
          onClose={() => { setShowActionModal(false); setActionType(''); }}
          onSubmit={handleAction} submitting={submitting} />
      )}
    </>
  );
}

// ─── ACTION MODAL ───
function ActionModal({ transfer, actionType, isMobile, onClose, onSubmit, submitting }) {
  const [items, setItems] = useState(
    transfer.items?.map(i => ({
      id: i.id, partName: i.part?.name, quantityRequested: i.quantityRequested,
      quantitySent: i.quantitySent || i.quantityRequested,
      quantityReceived: i.quantityReceived || i.quantitySent || i.quantityRequested,
    })) || []
  );
  const [reason, setReason] = useState('');

  const handleQty = (id, field, v) => setItems(p => p.map(i => i.id === id ? { ...i, [field]: parseInt(v) || 0 } : i));

  const submit = () => {
    if (actionType === 'reject') onSubmit({ rejectionReason: reason });
    else if (actionType === 'receive') onSubmit({ items: items.map(i => ({ id: i.id, quantityReceived: i.quantityReceived })) });
    else onSubmit({ items: items.map(i => ({ id: i.id, quantitySent: i.quantitySent })) });
  };

  const cfg = {
    approve: { title: '✅ Approve', sub: 'Set quantities', btn: 'Approve', grad: 'linear-gradient(135deg,#10b981,#059669)', glow: 'rgba(16,185,129,.3)' },
    reject: { title: '❌ Reject', sub: 'Provide reason', btn: 'Reject', grad: 'linear-gradient(135deg,#ef4444,#dc2626)', glow: 'rgba(239,68,68,.3)' },
    send: { title: '🚚 Send Items', sub: 'Confirm dispatch', btn: 'Confirm Send', grad: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', glow: 'rgba(139,92,246,.3)' },
    receive: { title: '📦 Receive', sub: 'Confirm receipt', btn: 'Confirm Receipt', grad: 'linear-gradient(135deg,#10b981,#059669)', glow: 'rgba(16,185,129,.3)' },
  }[actionType];

  return (
    <Overlay onClose={onClose} z={110}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <MHead grad={cfg.grad} title={cfg.title} sub={cfg.sub} onClose={onClose} />
        <div style={{ padding: isMobile ? 20 : 24, background: 'rgba(15,23,42,.97)', borderRadius: '0 0 20px 20px', border: '1px solid rgba(255,255,255,.06)', borderTop: 'none', maxHeight: 'calc(72vh - 200px)', overflowY: 'auto' }}>
          {actionType === 'reject' ? (
            <div>
              <label className="tr-label">Rejection Reason</label>
              <textarea className="tr-input" value={reason} onChange={e => setReason(e.target.value)}
                rows={4} placeholder="Explain why..." style={{ resize: 'none' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(item => (
                <div key={item.id} style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <p style={{ margin: '0 0 3px', fontWeight: 700, color: 'white', fontSize: 14 }}>{item.partName}</p>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Requested: {item.quantityRequested}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>
                      {actionType === 'receive' ? 'Received:' : 'Quantity:'}
                    </span>
                    <input className="tr-input" type="number"
                      value={actionType === 'receive' ? item.quantityReceived : item.quantitySent}
                      onChange={e => handleQty(item.id, actionType === 'receive' ? 'quantityReceived' : 'quantitySent', e.target.value)}
                      min="0" max={item.quantityRequested}
                      style={{ width: 90, textAlign: 'center', fontSize: 16, fontWeight: 700 }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>/ {item.quantityRequested}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <GBtn onClick={onClose} label="Cancel" outline color="rgba(255,255,255,.4)" disabled={submitting} />
            <button onClick={submit} disabled={submitting} className="tr-btn" style={{
              padding: '10px 22px', borderRadius: 12, background: cfg.grad, border: 'none',
              color: 'white', fontSize: 13, fontWeight: 700, opacity: submitting ? .6 : 1,
              display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 14px ${cfg.glow}`,
            }}>
              {submitting && <Spin />}
              {cfg.btn}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// ─── TRANSFER CARD ───
function TransferCard({ transfer, index, userBranchId, isMobile, canAR, canS, canR, onView, onApprove, onReject, onSend, onReceive }) {
  const sc = gSC(transfer.status);
  const uc = gUC(transfer.urgency);
  const isIn = transfer.toBranchId === userBranchId;

  return (
    <div className="tr-glass tr-card-hover" onClick={onView} style={{ overflow: 'hidden', cursor: 'pointer', animation: `trSlideUp .4s ease ${index * .04}s backwards` }}>
      <div style={{ height: 3, background: isIn ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)' }} />
      <div style={{ padding: isMobile ? 16 : 20 }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: 'white' }}>{transfer.transferNumber}</span>
              <Badge {...sc} />
              <Badge text={isIn ? '📥 Incoming' : '📤 Outgoing'}
                bg={isIn ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)'}
                bd={isIn ? 'rgba(16,185,129,.25)' : 'rgba(245,158,11,.25)'}
                c={isIn ? '#6ee7b7' : '#fcd34d'} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 10px', borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.6)' }}>{transfer.fromBranch?.name}</span>
              <span style={{ color: 'rgba(255,255,255,.3)' }}>→</span>
              <span style={{ padding: '3px 10px', borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.6)' }}>{transfer.toBranch?.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
              <span style={{ color: 'rgba(255,255,255,.4)' }}><strong style={{ color: 'white' }}>{transfer.items?.length || 0}</strong> item(s)</span>
              <span style={{ color: uc.c, display: 'flex', alignItems: 'center', gap: 4 }}>{uc.icon} {uc.label}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
            {canAR && (
              <>
                <SmBtn onClick={e => { e.stopPropagation(); onApprove(); }} label="✓ Approve" bg="rgba(16,185,129,.12)" bd="rgba(16,185,129,.2)" c="#6ee7b7" />
                <SmBtn onClick={e => { e.stopPropagation(); onReject(); }} label="✕ Reject" bg="rgba(239,68,68,.08)" bd="rgba(239,68,68,.15)" c="#fca5a5" />
              </>
            )}
            {canS && <SmBtn onClick={e => { e.stopPropagation(); onSend(); }} label="🚚 Send" grad="linear-gradient(135deg,#8b5cf6,#6d28d9)" />}
            {canR && <SmBtn onClick={e => { e.stopPropagation(); onReceive(); }} label="✓ Receive" grad="linear-gradient(135deg,#10b981,#059669)" />}
            <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 11, fontWeight: 500 }}>
              {new Date(transfer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SHARED COMPONENTS ───
function Overlay({ children, onClose, z = 100 }) {
  return (
    <div className="tr-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: z, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="tr-modal" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function MHead({ grad, title, sub, onClose }) {
  return (
    <div style={{ padding: '18px 22px', background: grad, borderRadius: '20px 20px 0 0', position: 'relative', overflow: 'hidden' }}>
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
      <GBtn onClick={onCancel} label="Cancel" outline color="rgba(255,255,255,.4)" disabled={submitting} />
      <button type="submit" disabled={submitting || disabled} className="tr-btn" style={{
        padding: '10px 22px', borderRadius: 12, background: grad, border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
        opacity: (submitting || disabled) ? .5 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 14px ${glow}`,
      }}>
        {submitting && <Spin />}{label}
      </button>
    </div>
  );
}

function Badge({ label, icon, c, bg, bd, text }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 10px', borderRadius: 14, background: bg, border: `1px solid ${bd}`, color: c, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {text || `${icon} ${label}`}
    </span>
  );
}

function GBtn({ onClick, label, icon, grad, glow, outline, color, borderColor, disabled, full, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} className="tr-btn" style={{
      padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
      background: outline ? 'transparent' : (grad || 'rgba(255,255,255,.06)'),
      border: outline ? `1px solid ${borderColor || color || 'rgba(255,255,255,.15)'}` : 'none',
      color: outline ? (color || 'rgba(255,255,255,.6)') : 'white',
      boxShadow: glow ? `0 4px 14px ${glow}` : 'none',
      opacity: disabled ? .5 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      width: full ? '100%' : 'auto', ...style,
    }}>{icon && <span>{icon}</span>}{label}</button>
  );
}

function SmBtn({ onClick, label, bg, bd, c, grad }) {
  return (
    <button onClick={onClick} className="tr-btn" style={{
      padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700,
      background: grad || bg, border: grad ? 'none' : `1px solid ${bd}`,
      color: grad ? 'white' : c,
      boxShadow: grad ? '0 4px 12px rgba(0,0,0,.2)' : 'none',
    }}>{label}</button>
  );
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,.14)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ width: 15, height: 15, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function ClearBtn({ onClick }) {
  return (
    <button onClick={onClick} className="tr-btn" style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
      ✕ Clear
    </button>
  );
}

function Spin() {
  return <div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'trSpin .6s linear infinite', flexShrink: 0 }} />;
}

function Loader({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 20px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, margin: '0 auto 14px', border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'trSpin .8s linear infinite' }} />
        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, fontWeight: 500 }}>{text}</p>
      </div>
    </div>
  );
}

function Empty({ icon, title, sub, showBtn, onBtn, btnLabel }) {
  return (
    <div className="tr-glass" style={{ padding: '60px 24px', textAlign: 'center', animation: 'trScaleIn .5s ease' }}>
      <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(139,92,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32, animation: 'trFloat 3s ease-in-out infinite' }}>{icon}</div>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'white' }}>{title}</h3>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,.4)' }}>{sub}</p>
      {showBtn && <GBtn onClick={onBtn} label={btnLabel} icon="🔄" grad="linear-gradient(135deg,#8b5cf6,#6d28d9)" glow="rgba(139,92,246,.35)" />}
    </div>
  );
}

function AlertBanner({ icon, title, sub, color, onClick, btnLabel }) {
  return (
    <div style={{ padding: 16, marginBottom: 14, borderRadius: 16, background: `${color}0d`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, animation: 'trSlideUp .5s ease .15s backwards' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 26 }}>{icon}</span>
        <div>
          <p style={{ margin: 0, fontWeight: 700, color, fontSize: 14 }}>{title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{sub}</p>
        </div>
      </div>
      <button onClick={onClick} className="tr-btn" style={{ padding: '8px 16px', borderRadius: 10, background: `${color}20`, border: `1px solid ${color}30`, color, fontSize: 12, fontWeight: 700 }}>{btnLabel}</button>
    </div>
  );
}