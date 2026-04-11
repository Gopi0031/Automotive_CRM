// src/app/(dashboard)/branches/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

// ─── CSS ───
const PAGE_CSS = `
  @keyframes pgFadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes pgSlideUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pgScaleIn   { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
  @keyframes pgShimmer   { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes pgSpin      { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes pgPulseGlow { 0%,100%{box-shadow:0 0 20px rgba(245,158,11,.12)} 50%{box-shadow:0 0 40px rgba(245,158,11,.22)} }
  @keyframes pgFloat     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes pgBarFill   { from{width:0} to{width:var(--fill)} }

  .pg-card {
    background: rgba(255,255,255,.04);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 20px;
    transition: all .35s cubic-bezier(.4,0,.2,1);
  }
  .pg-card:hover {
    background: rgba(255,255,255,.065);
    border-color: rgba(255,255,255,.12);
    transform: translateY(-4px);
    box-shadow: 0 20px 48px rgba(0,0,0,.35);
  }
  .pg-stat-card:hover .pg-stat-icon {
    transform: scale(1.12) rotate(6deg);
  }
  .pg-branch-card:hover .pg-branch-header-glow {
    opacity: .22;
  }
  .pg-action-btn {
    transition: all .22s ease;
  }
  .pg-action-btn:hover {
    transform: translateY(-1px);
  }
  .pg-modal-overlay {
    animation: pgFadeIn .25s ease;
  }
  .pg-modal-content {
    animation: pgScaleIn .3s cubic-bezier(.4,0,.2,1);
  }
  .pg-input {
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 12px;
    padding: 12px 16px;
    color: white;
    font-size: 14px;
    width: 100%;
    outline: none;
    transition: all .25s ease;
  }
  .pg-input::placeholder { color: rgba(255,255,255,.3); }
  .pg-input:focus {
    border-color: rgba(245,158,11,.5);
    background: rgba(255,255,255,.07);
    box-shadow: 0 0 0 3px rgba(245,158,11,.12);
  }
  .pg-select {
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 12px;
    padding: 12px 16px;
    color: white;
    font-size: 14px;
    width: 100%;
    outline: none;
    transition: all .25s ease;
    appearance: none;
    cursor: pointer;
  }
  .pg-select option { background: #1a1f35; color: white; }
  .pg-select:focus {
    border-color: rgba(245,158,11,.5);
    box-shadow: 0 0 0 3px rgba(245,158,11,.12);
  }
  .pg-label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: rgba(255,255,255,.55);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: .8px;
  }

  @media(max-width:640px) {
    .pg-card:hover { transform: none; }
    .pg-stat-card:hover .pg-stat-icon { transform: none; }
  }
`;

// ─── Animated counter ───
function AnimNum({ value, prefix = '' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const n = typeof value === 'number' ? value : parseInt(value) || 0;
    if (n === 0) { setDisplay(0); return; }
    let cur = 0;
    const steps = 30;
    const inc = n / steps;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= n) { setDisplay(n); clearInterval(t); }
      else setDisplay(Math.floor(cur));
    }, 20);
    return () => clearInterval(t);
  }, [value]);
  return <>{prefix}{display.toLocaleString('en-IN')}</>;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '', location: '', phone: '', email: '', managerId: '',
  });
  const [stats, setStats] = useState({
    totalBranches: 0, totalStaff: 0, totalCustomers: 0, totalJobs: 0,
  });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setCurrentUser(JSON.parse(u));
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bRes, uRes] = await Promise.all([
        fetch('/api/branches'), fetch('/api/users'),
      ]);
      const bData = await bRes.json();
      const uData = await uRes.json();
      if (bData.success) {
        setBranches(bData.data || []);
        const d = bData.data || [];
        setStats({
          totalBranches: d.length,
          totalStaff: d.reduce((s, b) => s + (b._count?.staff || 0), 0),
          totalCustomers: d.reduce((s, b) => s + (b._count?.customers || 0), 0),
          totalJobs: d.reduce((s, b) => s + (b._count?.jobs || 0), 0),
        });
      }
      if (uData.success) {
        setManagers((uData.data || []).filter(u => u.role === 'MANAGER' && u.isActive));
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setFormData({ name: '', location: '', phone: '', email: '', managerId: '' });
    setEditingBranch(null);
  };

  const openCreate = () => { resetForm(); setShowModal(true); };
  const openEdit = (b) => {
    setEditingBranch(b);
    setFormData({
      name: b.name, location: b.location,
      phone: b.phone, email: b.email,
      managerId: b.managerId || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...(editingBranch && { id: editingBranch.id }),
        name: formData.name, location: formData.location,
        phone: formData.phone, email: formData.email,
      };
      if (formData.managerId?.trim()) payload.managerId = formData.managerId;
      else if (editingBranch) payload.managerId = '';

      const res = await fetch('/api/branches', {
        method: editingBranch ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed'); return; }
      toast.success(`Branch ${editingBranch ? 'updated' : 'created'}!`);
      resetForm(); setShowModal(false); fetchData();
    } catch { toast.error('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedBranch) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/branches?id=${selectedBranch.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed'); return; }
      toast.success('Branch deleted');
      setShowDeleteModal(false); setSelectedBranch(null); fetchData();
    } catch { toast.error('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const availManagers = managers.filter(m => {
    const isCur = editingBranch && m.id === editingBranch.managerId;
    const free = !branches.some(b => b.managerId === m.id && b.id !== editingBranch?.id);
    return isCur || free;
  });

  const canManage = currentUser?.role === 'SUPER_ADMIN';

  const STAT_CARDS = [
    { label: 'Total Branches', key: 'totalBranches', icon: '🏢', grad: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fcd34d' },
    { label: 'Total Staff',    key: 'totalStaff',     icon: '👥', grad: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#93c5fd' },
    { label: 'Total Customers',key: 'totalCustomers', icon: '🧑‍🤝‍🧑', grad: 'linear-gradient(135deg,#10b981,#059669)', color: '#6ee7b7' },
    { label: 'Total Jobs',     key: 'totalJobs',      icon: '🔧', grad: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#c4b5fd' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      <div style={{ minHeight: '100vh' }}>
        {/* ─── Header ─── */}
        <div style={{
          marginBottom: 28,
          animation: 'pgSlideUp .5s ease',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 16,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <span style={{ fontSize: 28 }}>🏢</span>
                <h1 style={{
                  margin: 0, fontSize: 'clamp(1.4rem,4vw,1.8rem)',
                  fontWeight: 800, color: 'white',
                  letterSpacing: '-.5px',
                }}>
                  Branches
                </h1>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.4)', fontWeight: 500 }}>
                Manage your business locations
              </p>
            </div>

            {canManage && (
              <button
                onClick={openCreate}
                className="pg-action-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '11px 22px', borderRadius: 14,
                  background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                  color: 'white', border: 'none',
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(245,158,11,.35)',
                  transition: 'all .25s ease',
                }}
              >
                <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
                </svg>
                Add Branch
              </button>
            )}
          </div>
        </div>

        {/* ─── Stats ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,200px), 1fr))',
          gap: 14, marginBottom: 28,
        }}>
          {STAT_CARDS.map((s, i) => (
            <div
              key={s.key}
              className="pg-card pg-stat-card"
              style={{
                padding: 'clamp(14px,2vw,20px)',
                animation: `pgSlideUp .5s ease ${i * .08}s backwards`,
                cursor: 'default',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 10, fontWeight: 700,
                    color: 'rgba(255,255,255,.4)',
                    textTransform: 'uppercase', letterSpacing: '.7px',
                  }}>
                    {s.label}
                  </p>
                  <p style={{
                    margin: '6px 0 0', fontSize: 'clamp(1.3rem,3vw,1.8rem)',
                    fontWeight: 800, color: 'white', letterSpacing: '-.5px',
                  }}>
                    <AnimNum value={stats[s.key]} />
                  </p>
                </div>
                <div
                  className="pg-stat-icon"
                  style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: s.grad,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                    boxShadow: `0 6px 18px rgba(0,0,0,.25)`,
                    transition: 'transform .3s ease',
                  }}
                >
                  {s.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Branch Cards ─── */}
        {loading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '80px 20px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, margin: '0 auto 16px',
                border: '3px solid rgba(255,255,255,.1)',
                borderTopColor: '#f59e0b',
                borderRadius: '50%',
                animation: 'pgSpin .8s linear infinite',
              }} />
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, fontWeight: 500 }}>
                Loading branches...
              </p>
            </div>
          </div>
        ) : branches.length === 0 ? (
          <div className="pg-card" style={{
            padding: '60px 24px', textAlign: 'center',
            animation: 'pgScaleIn .5s ease',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22,
              background: 'rgba(245,158,11,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 32,
              animation: 'pgFloat 3s ease-in-out infinite',
            }}>
              🏢
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'white' }}>
              No branches yet
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,.4)' }}>
              Create your first branch to get started
            </p>
            {canManage && (
              <button
                onClick={openCreate}
                className="pg-action-btn"
                style={{
                  padding: '11px 24px', borderRadius: 12,
                  background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                  color: 'white', border: 'none', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(245,158,11,.35)',
                }}
              >
                Add First Branch
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: 18,
          }}>
            {branches.map((branch, i) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                index={i}
                canManage={canManage}
                onView={() => { setSelectedBranch(branch); setShowDetailModal(true); }}
                onEdit={() => openEdit(branch)}
                onDelete={() => { setSelectedBranch(branch); setShowDeleteModal(true); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Create/Edit Modal ─── */}
      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div style={{ maxWidth: 520, width: '100%' }}>
            {/* header */}
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              borderRadius: '20px 20px 0 0',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -30, right: -30,
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(255,255,255,.1)', pointerEvents: 'none',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'white' }}>
                    {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,.75)' }}>
                    {editingBranch ? `Editing ${editingBranch.name}` : 'Create a new location'}
                  </p>
                </div>
                <ModalCloseBtn onClick={() => setShowModal(false)} />
              </div>
            </div>

            {/* form */}
            <form onSubmit={handleSubmit} style={{
              padding: 24,
              background: 'rgba(15,23,42,.97)',
              borderRadius: '0 0 20px 20px',
              border: '1px solid rgba(255,255,255,.06)',
              borderTop: 'none',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label className="pg-label">Branch Name <span style={{ color: '#f59e0b' }}>*</span></label>
                  <input className="pg-input" name="name" value={formData.name}
                    onChange={handleChange} placeholder="Downtown Branch" required />
                </div>

                <div>
                  <label className="pg-label">Location <span style={{ color: '#f59e0b' }}>*</span></label>
                  <textarea className="pg-input" name="location" value={formData.location}
                    onChange={handleChange} placeholder="Full address"
                    rows={2} required style={{ resize: 'none' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="pg-label">Phone <span style={{ color: '#f59e0b' }}>*</span></label>
                    <input className="pg-input" name="phone" value={formData.phone}
                      onChange={handleChange} placeholder="022-1234567" required />
                  </div>
                  <div>
                    <label className="pg-label">Email <span style={{ color: '#f59e0b' }}>*</span></label>
                    <input className="pg-input" type="email" name="email" value={formData.email}
                      onChange={handleChange} placeholder="branch@co.com" required />
                  </div>
                </div>

                <div>
                  <label className="pg-label">Branch Manager</label>
                  <select className="pg-select" name="managerId"
                    value={formData.managerId} onChange={handleChange}>
                    <option value="">Select Manager (Optional)</option>
                    {availManagers.map(m => (
                      <option key={m.id} value={m.id}>👔 {m.name} ({m.email})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* footer */}
              <div style={{
                display: 'flex', gap: 10, justifyContent: 'flex-end',
                marginTop: 28, paddingTop: 20,
                borderTop: '1px solid rgba(255,255,255,.06)',
              }}>
                <button type="button" onClick={() => setShowModal(false)}
                  className="pg-action-btn"
                  style={{
                    padding: '10px 20px', borderRadius: 12,
                    background: 'rgba(255,255,255,.06)',
                    border: '1px solid rgba(255,255,255,.1)',
                    color: 'rgba(255,255,255,.6)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="pg-action-btn"
                  style={{
                    padding: '10px 24px', borderRadius: 12,
                    background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                    border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
                    cursor: submitting ? 'wait' : 'pointer',
                    opacity: submitting ? .7 : 1,
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 4px 14px rgba(245,158,11,.3)',
                  }}>
                  {submitting && <Spinner size={16} />}
                  {editingBranch ? 'Update' : 'Create'} Branch
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* ─── Detail Modal ─── */}
      {showDetailModal && selectedBranch && (
        <ModalOverlay onClose={() => setShowDetailModal(false)}>
          <div style={{ maxWidth: 500, width: '100%' }}>
            {/* header */}
            <div style={{
              padding: 24,
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              borderRadius: '20px 20px 0 0',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -25, right: -25,
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(255,255,255,.1)', pointerEvents: 'none',
              }} />
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                position: 'relative', zIndex: 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'rgba(255,255,255,.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                  }}>🏢</div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white' }}>
                      {selectedBranch.name}
                    </h2>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
                      {selectedBranch.location}
                    </p>
                  </div>
                </div>
                <ModalCloseBtn onClick={() => setShowDetailModal(false)} />
              </div>
            </div>

            {/* body */}
            <div style={{
              padding: 24,
              background: 'rgba(15,23,42,.97)',
              borderRadius: '0 0 20px 20px',
              border: '1px solid rgba(255,255,255,.06)',
              borderTop: 'none',
            }}>
              {/* contact */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {[
                  { icon: '📞', label: 'Phone', val: selectedBranch.phone, color: '#3b82f6' },
                  { icon: '📧', label: 'Email', val: selectedBranch.email, color: '#10b981' },
                ].map(c => (
                  <div key={c.label} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 12,
                    background: 'rgba(255,255,255,.03)',
                    border: '1px solid rgba(255,255,255,.05)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${c.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, flexShrink: 0,
                    }}>{c.icon}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{c.label}</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'white' }}>{c.val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* manager */}
              <div style={{
                padding: 14, borderRadius: 14,
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(255,255,255,.06)',
                marginBottom: 20,
              }}>
                <p style={{ margin: '0 0 8px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  Branch Manager
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 800, fontSize: 17, flexShrink: 0,
                  }}>
                    {selectedBranch.manager?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 14 }}>
                      {selectedBranch.manager?.name || 'Not Assigned'}
                    </p>
                    {selectedBranch.manager?.email && (
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
                        {selectedBranch.manager.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[
                  { v: selectedBranch._count?.staff || 0, l: 'Staff', c: '#3b82f6' },
                  { v: selectedBranch._count?.customers || 0, l: 'Customers', c: '#10b981' },
                  { v: selectedBranch._count?.jobs || 0, l: 'Jobs', c: '#8b5cf6' },
                  { v: selectedBranch._count?.invoices || 0, l: 'Invoices', c: '#f59e0b' },
                ].map(s => (
                  <div key={s.l} style={{
                    textAlign: 'center', padding: 12, borderRadius: 12,
                    background: `${s.c}0d`,
                    border: `1px solid ${s.c}18`,
                  }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: s.c }}>
                      {s.v}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>
                      {s.l}
                    </p>
                  </div>
                ))}
              </div>

              {/* footer */}
              <div style={{
                display: 'flex', gap: 10, justifyContent: 'flex-end',
                marginTop: 24, paddingTop: 18,
                borderTop: '1px solid rgba(255,255,255,.06)',
              }}>
                <button onClick={() => setShowDetailModal(false)}
                  className="pg-action-btn"
                  style={{
                    padding: '10px 20px', borderRadius: 12,
                    background: 'rgba(255,255,255,.06)',
                    border: '1px solid rgba(255,255,255,.1)',
                    color: 'rgba(255,255,255,.6)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                  }}>Close</button>
                {canManage && (
                  <button onClick={() => { setShowDetailModal(false); openEdit(selectedBranch); }}
                    className="pg-action-btn"
                    style={{
                      padding: '10px 20px', borderRadius: 12,
                      background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                      border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', boxShadow: '0 4px 14px rgba(245,158,11,.3)',
                    }}>Edit Branch</button>
                )}
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ─── Delete Modal ─── */}
      {showDeleteModal && selectedBranch && (
        <ModalOverlay onClose={() => setShowDeleteModal(false)}>
          <div style={{
            maxWidth: 420, width: '100%',
            background: 'rgba(15,23,42,.97)',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,.06)',
            padding: 28, textAlign: 'center',
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'rgba(239,68,68,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px', fontSize: 28,
            }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: 'white' }}>
              Delete Branch
            </h3>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: 'rgba(255,255,255,.5)' }}>
              Delete <span style={{ color: '#f87171', fontWeight: 700 }}>{selectedBranch.name}</span>?
            </p>

            {(selectedBranch._count?.staff > 0 || selectedBranch._count?.customers > 0 || selectedBranch._count?.jobs > 0) && (
              <div style={{
                margin: '16px 0', padding: 14, borderRadius: 12,
                background: 'rgba(239,68,68,.08)',
                border: '1px solid rgba(239,68,68,.2)',
                textAlign: 'left',
              }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#f87171' }}>
                  ⚠️ This branch has:
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#fca5a5' }}>
                  {selectedBranch._count?.staff > 0 && <li>{selectedBranch._count.staff} staff</li>}
                  {selectedBranch._count?.customers > 0 && <li>{selectedBranch._count.customers} customers</li>}
                  {selectedBranch._count?.jobs > 0 && <li>{selectedBranch._count.jobs} jobs</li>}
                </ul>
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#fca5a5' }}>
                  Reassign data before deleting.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowDeleteModal(false)}
                className="pg-action-btn"
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12,
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid rgba(255,255,255,.1)',
                  color: 'rgba(255,255,255,.6)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}>Cancel</button>
              <button onClick={handleDelete}
                disabled={submitting || selectedBranch._count?.staff > 0 || selectedBranch._count?.customers > 0 || selectedBranch._count?.jobs > 0}
                className="pg-action-btn"
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12,
                  background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                  border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: (submitting || selectedBranch._count?.staff > 0 || selectedBranch._count?.customers > 0 || selectedBranch._count?.jobs > 0) ? .5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                {submitting && <Spinner size={14} />}
                Delete
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}

// ─── Branch Card ───
function BranchCard({ branch, index, canManage, onView, onEdit, onDelete }) {
  return (
    <div className="pg-card pg-branch-card" style={{
      overflow: 'hidden',
      animation: `pgSlideUp .5s ease ${index * .06}s backwards`,
    }}>
      {/* gradient header */}
      <div style={{
        padding: '18px 20px',
        background: 'linear-gradient(135deg,rgba(245,158,11,.18),rgba(217,119,6,.08))',
        position: 'relative',
      }}>
        <div className="pg-branch-header-glow" style={{
          position: 'absolute', top: -30, right: -30,
          width: 80, height: 80, borderRadius: '50%',
          background: '#f59e0b', opacity: .08,
          filter: 'blur(16px)', transition: 'opacity .35s',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'white' }}>
            {branch.name}
          </h3>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'rgba(255,255,255,.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>🏢</div>
        </div>
      </div>

      {/* body */}
      <div style={{ padding: '16px 20px 20px' }}>
        {/* contact info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {[
            { icon: '📍', val: branch.location },
            { icon: '📞', val: branch.phone },
            { icon: '📧', val: branch.email },
          ].map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.4 }}>
                {c.val}
              </span>
            </div>
          ))}
        </div>

        {/* manager */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12,
          background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.05)',
          marginBottom: 14,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0,
          }}>
            {branch.manager?.name?.charAt(0) || '?'}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>Manager</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'white' }}>
              {branch.manager?.name || 'Not Assigned'}
            </p>
          </div>
        </div>

        {/* mini stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { v: branch._count?.staff || 0, l: 'Staff', c: '#3b82f6' },
            { v: branch._count?.customers || 0, l: 'Customers', c: '#10b981' },
            { v: branch._count?.jobs || 0, l: 'Jobs', c: '#8b5cf6' },
          ].map(s => (
            <div key={s.l} style={{
              textAlign: 'center', padding: '8px 4px', borderRadius: 10,
              background: `${s.c}0d`, border: `1px solid ${s.c}15`,
            }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</p>
              <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* actions */}
        <div style={{
          display: 'flex', gap: 6,
          paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.05)',
        }}>
          <button onClick={onView} className="pg-action-btn" style={{
            flex: 1, padding: '9px 0', borderRadius: 10,
            background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)',
            color: '#93c5fd', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>View</button>
          {canManage && (
            <>
              <button onClick={onEdit} className="pg-action-btn" style={{
                flex: 1, padding: '9px 0', borderRadius: 10,
                background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)',
                color: '#6ee7b7', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>Edit</button>
              <button onClick={onDelete} className="pg-action-btn" style={{
                padding: '9px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)',
                color: '#fca5a5', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared components ───
function ModalOverlay({ children, onClose }) {
  return (
    <div
      className="pg-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,.65)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div className="pg-modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ModalCloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 32, height: 32, borderRadius: 9,
      background: 'rgba(255,255,255,.15)', border: 'none',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background .2s',
    }}>
      <svg style={{ width: 16, height: 16, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function Spinner({ size = 18 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid rgba(255,255,255,.2)`,
      borderTopColor: 'white',
      borderRadius: '50%',
      animation: 'pgSpin .6s linear infinite',
      flexShrink: 0,
    }} />
  );
}