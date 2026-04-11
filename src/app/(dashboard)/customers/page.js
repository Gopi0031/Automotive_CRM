// src/app/(dashboard)/customers/page.js
'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const CSS = `
  @keyframes cpFadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes cpSlideUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes cpScaleIn  { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
  @keyframes cpSpin     { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes cpFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

  .cp-card {
    background: rgba(255,255,255,.04);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 18px;
    transition: all .3s cubic-bezier(.4,0,.2,1);
  }
  .cp-card:hover {
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.11);
  }
  .cp-input {
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
  .cp-input::placeholder { color: rgba(255,255,255,.3); }
  .cp-input:focus {
    border-color: rgba(59,130,246,.5);
    background: rgba(255,255,255,.07);
    box-shadow: 0 0 0 3px rgba(59,130,246,.12);
  }
  .cp-label {
    display: block; font-size: 12px; font-weight: 700;
    color: rgba(255,255,255,.5);
    margin-bottom: 6px;
    text-transform: uppercase; letter-spacing: .7px;
  }
  .cp-btn { transition: all .22s ease; }
  .cp-btn:hover { transform: translateY(-1px); }
  .cp-row { transition: background .2s ease; }
  .cp-row:hover { background: rgba(255,255,255,.035) !important; }
  .cp-modal-bg { animation: cpFadeIn .25s ease; }
  .cp-modal { animation: cpScaleIn .3s cubic-bezier(.4,0,.2,1); }
  .cp-search {
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px;
    padding: 11px 16px 11px 44px;
    color: white; font-size: 14px;
    width: 100%; max-width: 380px;
    outline: none;
    transition: all .25s ease;
  }
  .cp-search::placeholder { color: rgba(255,255,255,.3); }
  .cp-search:focus {
    border-color: rgba(59,130,246,.4);
    background: rgba(255,255,255,.07);
    box-shadow: 0 0 0 3px rgba(59,130,246,.1);
  }
  @media(max-width:768px) {
    .cp-table-wrap { overflow-x: auto; }
    .cp-card:hover { transform: none; }
  }
`;

const AVATAR_GRADS = [
  'linear-gradient(135deg,#6366f1,#4f46e5)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#3b82f6,#1d4ed8)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#8b5cf6,#6d28d9)',
];

function avatarGrad(name) {
  return AVATAR_GRADS[name.charCodeAt(0) % AVATAR_GRADS.length];
}
function initials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showView, setShowView] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '',
  });

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/customers');
      const d = await r.json();
      if (d.success) setCustomers(d.data || []);
      else toast.error(d.message || 'Failed');
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch('/api/customers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || 'Failed'); return; }
      toast.success('Customer created!');
      setFormData({ name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '' });
      setShowModal(false); fetchCustomers();
    } catch { toast.error('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      const r = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) { toast.success('Deleted'); setDeleteId(null); fetchCustomers(); }
      else toast.error(d.message || 'Failed');
    } catch { toast.error('Error'); }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalVehicles = customers.reduce((a, c) => a + (c.vehicles?.length || 0), 0);
  const withEmail = customers.filter(c => c.email).length;

  const STATS = [
    { label: 'Total Customers', v: customers.length, icon: '👥', grad: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', c: '#93c5fd' },
    { label: 'Total Vehicles', v: totalVehicles, icon: '🚗', grad: 'linear-gradient(135deg,#10b981,#059669)', c: '#6ee7b7' },
    { label: 'With Email', v: withEmail, icon: '📧', grad: 'linear-gradient(135deg,#f59e0b,#d97706)', c: '#fcd34d' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div style={{ minHeight: '100vh' }}>
        {/* ─── Header ─── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16, marginBottom: 28,
          animation: 'cpSlideUp .5s ease',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 26 }}>👥</span>
              <h1 style={{
                margin: 0, fontSize: 'clamp(1.4rem,4vw,1.8rem)',
                fontWeight: 800, color: 'white', letterSpacing: '-.5px',
              }}>Customers</h1>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.4)', fontWeight: 500 }}>
              Manage your customer database
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="cp-btn" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 22px', borderRadius: 14,
            background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            color: 'white', border: 'none', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 18px rgba(59,130,246,.35)',
          }}>
            <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
            </svg>
            Add Customer
          </button>
        </div>

        {/* ─── Stats ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,200px), 1fr))',
          gap: 14, marginBottom: 24,
        }}>
          {STATS.map((s, i) => (
            <div key={s.label} className="cp-card" style={{
              padding: 'clamp(14px,2vw,20px)',
              animation: `cpSlideUp .5s ease ${i * .08}s backwards`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.7px' }}>{s.label}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 'clamp(1.3rem,3vw,1.8rem)', fontWeight: 800, color: 'white', letterSpacing: '-.5px' }}>{s.v}</p>
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: s.grad,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                  boxShadow: '0 6px 18px rgba(0,0,0,.25)',
                }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Search ─── */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <svg style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            width: 18, height: 18, color: 'rgba(255,255,255,.3)', pointerEvents: 'none',
          }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="cp-search"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ─── Content ─── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 44, height: 44, margin: '0 auto 14px',
                border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#3b82f6',
                borderRadius: '50%', animation: 'cpSpin .8s linear infinite',
              }} />
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, fontWeight: 500 }}>Loading...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="cp-card" style={{
            padding: '60px 24px', textAlign: 'center',
            animation: 'cpScaleIn .5s ease',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22,
              background: 'rgba(59,130,246,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 32,
              animation: 'cpFloat 3s ease-in-out infinite',
            }}>👥</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'white' }}>
              {search ? 'No matches found' : 'No customers yet'}
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,.4)' }}>
              {search ? 'Try different search terms' : 'Add your first customer'}
            </p>
            {!search && (
              <button onClick={() => setShowModal(true)} className="cp-btn" style={{
                padding: '11px 24px', borderRadius: 12,
                background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                color: 'white', border: 'none', fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
              }}>Add Customer</button>
            )}
          </div>
        ) : (
          <div className="cp-card cp-table-wrap" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr>
                    {['Customer', 'Phone', 'Email', 'City', 'Vehicles', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '14px 18px', textAlign: 'left',
                        fontSize: 10, fontWeight: 800,
                        color: 'rgba(255,255,255,.35)',
                        textTransform: 'uppercase', letterSpacing: '.8px',
                        borderBottom: '1px solid rgba(255,255,255,.06)',
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.id} className="cp-row" style={{
                      animation: `cpSlideUp .35s ease ${i * .03}s backwards`,
                    }}>
                      <td style={{
                        padding: '14px 18px',
                        borderBottom: '1px solid rgba(255,255,255,.04)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: avatarGrad(c.name),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: 13, fontWeight: 800, flexShrink: 0,
                          }}>{initials(c.name)}</div>
                          <span style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 13, color: 'rgba(255,255,255,.55)', fontFamily: 'monospace' }}>
                        {c.phone}
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
                        {c.email || <span style={{ color: 'rgba(255,255,255,.2)' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
                        {c.city || <span style={{ color: 'rgba(255,255,255,.2)' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 8,
                          background: (c.vehicles?.length || 0) > 0 ? 'rgba(59,130,246,.12)' : 'rgba(255,255,255,.04)',
                          border: `1px solid ${(c.vehicles?.length || 0) > 0 ? 'rgba(59,130,246,.2)' : 'rgba(255,255,255,.06)'}`,
                          color: (c.vehicles?.length || 0) > 0 ? '#93c5fd' : 'rgba(255,255,255,.35)',
                          fontSize: 12, fontWeight: 700,
                        }}>
                          🚗 {c.vehicles?.length || 0}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setSelectedCustomer(c); setShowView(true); }}
                            className="cp-btn" style={{
                              padding: '6px 14px', borderRadius: 8,
                              background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.2)',
                              color: '#93c5fd', fontSize: 12, fontWeight: 700,
                              cursor: 'pointer',
                            }}>View</button>
                          <button onClick={() => setDeleteId(c.id)}
                            className="cp-btn" style={{
                              padding: '6px 14px', borderRadius: 8,
                              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)',
                              color: '#fca5a5', fontSize: 12, fontWeight: 700,
                              cursor: 'pointer',
                            }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── Add Customer Modal ─── */}
      {showModal && (
        <ModalBg onClose={() => setShowModal(false)}>
          <div style={{ maxWidth: 540, width: '100%' }}>
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
              borderRadius: '20px 20px 0 0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'white' }}>
                ➕ Add New Customer
              </h2>
              <CloseBtn onClick={() => setShowModal(false)} />
            </div>

            <form onSubmit={handleSubmit} style={{
              padding: 24,
              background: 'rgba(15,23,42,.97)',
              borderRadius: '0 0 20px 20px',
              border: '1px solid rgba(255,255,255,.06)',
              borderTop: 'none',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
                <div>
                  <label className="cp-label">Name <span style={{ color: '#3b82f6' }}>*</span></label>
                  <input className="cp-input" name="name" value={formData.name} onChange={handleChange} placeholder="Customer Name" required />
                </div>
                <div>
                  <label className="cp-label">Phone <span style={{ color: '#3b82f6' }}>*</span></label>
                  <input className="cp-input" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" required />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="cp-label">Email</label>
                  <input className="cp-input" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="custmer@mail.com" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="cp-label">Address</label>
                  <input className="cp-input" name="address" value={formData.address} onChange={handleChange} placeholder="123 Main Street" />
                </div>
                <div>
                  <label className="cp-label">City</label>
                  <input className="cp-input" name="city" value={formData.city} onChange={handleChange} placeholder="Guntur" />
                </div>
                <div>
                  <label className="cp-label">State</label>
                  <input className="cp-input" name="state" value={formData.state} onChange={handleChange} placeholder="AP" />
                </div>
                <div>
                  <label className="cp-label">Pincode</label>
                  <input className="cp-input" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="522002" />
                </div>
              </div>

              <div style={{
                display: 'flex', gap: 10, justifyContent: 'flex-end',
                marginTop: 26, paddingTop: 18,
                borderTop: '1px solid rgba(255,255,255,.06)',
              }}>
                <button type="button" onClick={() => setShowModal(false)}
                  className="cp-btn" style={{
                    padding: '10px 20px', borderRadius: 12,
                    background: 'rgba(255,255,255,.06)',
                    border: '1px solid rgba(255,255,255,.1)',
                    color: 'rgba(255,255,255,.6)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                  }}>Cancel</button>
                <button type="submit" disabled={submitting} className="cp-btn" style={{
                  padding: '10px 24px', borderRadius: 12,
                  background: 'linear-gradient(135deg,#10b981,#059669)',
                  border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? .7 : 1,
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 14px rgba(16,185,129,.3)',
                }}>
                  {submitting && <SmallSpinner />}
                  {submitting ? 'Creating...' : '✓ Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </ModalBg>
      )}

      {/* ─── View Modal ─── */}
      {showView && selectedCustomer && (
        <ModalBg onClose={() => setShowView(false)}>
          <div style={{
            maxWidth: 500, width: '100%',
            background: 'rgba(15,23,42,.97)',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,.06)',
            overflow: 'hidden',
          }}>
            {/* header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'white' }}>
                Customer Details
              </h2>
              <CloseBtn onClick={() => setShowView(false)} />
            </div>

            <div style={{ padding: 24 }}>
              {/* avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: avatarGrad(selectedCustomer.name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 20, fontWeight: 800, flexShrink: 0,
                }}>{initials(selectedCustomer.name)}</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'white' }}>
                    {selectedCustomer.name}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
                    Since {new Date(selectedCustomer.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              {/* info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 20 }}>
                {[
                  { icon: '📱', label: 'Phone', val: selectedCustomer.phone },
                  { icon: '📧', label: 'Email', val: selectedCustomer.email },
                  { icon: '📍', label: 'Address', val: selectedCustomer.address },
                  { icon: '🏙️', label: 'City', val: selectedCustomer.city },
                  { icon: '🗺️', label: 'State', val: selectedCustomer.state },
                  { icon: '📮', label: 'Pincode', val: selectedCustomer.pincode },
                ].map(f => (
                  <div key={f.label}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                      {f.icon} {f.label}
                    </p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: f.val ? 'white' : 'rgba(255,255,255,.2)' }}>
                      {f.val || '—'}
                    </p>
                  </div>
                ))}
              </div>

              {/* vehicles */}
              {selectedCustomer.vehicles?.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 10px', fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    🚗 Vehicles ({selectedCustomer.vehicles.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedCustomer.vehicles.map(v => (
                      <div key={v.id} style={{
                        padding: '10px 14px', borderRadius: 12,
                        background: 'rgba(255,255,255,.03)',
                        border: '1px solid rgba(255,255,255,.05)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 13 }}>
                            {v.make} {v.model} ({v.year})
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
                            {v.licensePlate}
                          </p>
                        </div>
                        {v.color && (
                          <span style={{
                            padding: '3px 10px', borderRadius: 6,
                            background: 'rgba(255,255,255,.06)',
                            border: '1px solid rgba(255,255,255,.08)',
                            fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)',
                          }}>{v.color}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalBg>
      )}

      {/* ─── Delete Confirm ─── */}
      {deleteId && (
        <ModalBg onClose={() => setDeleteId(null)}>
          <div style={{
            maxWidth: 380, width: '100%',
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
              Delete Customer?
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} className="cp-btn" style={{
                flex: 1, padding: '10px 0', borderRadius: 12,
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(255,255,255,.1)',
                color: 'rgba(255,255,255,.6)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="cp-btn" style={{
                flex: 1, padding: '10px 0', borderRadius: 12,
                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}>Delete</button>
            </div>
          </div>
        </ModalBg>
      )}
    </>
  );
}

// ─── Shared ───
function ModalBg({ children, onClose }) {
  return (
    <div className="cp-modal-bg" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.65)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 30, height: 30, borderRadius: 8,
      background: 'rgba(255,255,255,.12)', border: 'none',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg style={{ width: 14, height: 14, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function SmallSpinner() {
  return <div style={{
    width: 16, height: 16,
    border: '2px solid rgba(255,255,255,.2)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'cpSpin .6s linear infinite',
    flexShrink: 0,
  }} />;
}