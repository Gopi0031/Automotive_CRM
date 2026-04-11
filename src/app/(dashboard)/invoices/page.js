// src/app/(dashboard)/invoices/page.js
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

// ─── CSS ───
const CSS = `
  @keyframes inSlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes inScaleIn { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
  @keyframes inFadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes inSpin    { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes inFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

  .in-glass{background:rgba(255,255,255,.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.07);border-radius:18px;transition:all .3s cubic-bezier(.4,0,.2,1)}
  .in-glass:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.11)}
  .in-stat:hover{transform:translateY(-4px);box-shadow:0 20px 48px rgba(0,0,0,.35)}
  .in-stat:hover .in-stat-icon{transform:scale(1.12) rotate(6deg)}
  .in-btn{transition:all .22s ease;cursor:pointer}
  .in-btn:hover{transform:translateY(-1px)}
  .in-btn:active{transform:translateY(0) scale(.98)}
  .in-row{transition:background .2s ease}
  .in-row:hover{background:rgba(255,255,255,.04)!important}
  .in-overlay{animation:inFadeIn .25s ease}
  .in-modal{animation:inScaleIn .3s cubic-bezier(.4,0,.2,1)}
  .in-input{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 14px;color:white;font-size:14px;width:100%;outline:none;transition:all .22s ease}
  .in-input::placeholder{color:rgba(255,255,255,.28)}
  .in-input:focus{border-color:rgba(16,185,129,.5);background:rgba(255,255,255,.07);box-shadow:0 0 0 3px rgba(16,185,129,.12)}
  .in-select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 14px;color:white;font-size:14px;width:100%;outline:none;appearance:none;cursor:pointer;transition:all .22s ease}
  .in-select option{background:#1a1f35;color:white}
  .in-select:focus{border-color:rgba(16,185,129,.5);box-shadow:0 0 0 3px rgba(16,185,129,.12)}
  .in-label{display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.45);margin-bottom:6px;text-transform:uppercase;letter-spacing:.7px}
  .in-search{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 14px 10px 40px;color:white;font-size:14px;width:100%;outline:none;transition:all .22s ease}
  .in-search::placeholder{color:rgba(255,255,255,.28)}
  .in-search:focus{border-color:rgba(16,185,129,.4);background:rgba(255,255,255,.07);box-shadow:0 0 0 3px rgba(16,185,129,.1)}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
  input[type=number]{-moz-appearance:textfield}
  @media(max-width:768px){.in-stat:hover{transform:none}.in-stat:hover .in-stat-icon{transform:none}}
`;

// ─── Status config ───
const STATUS = {
  PENDING:        { label:'Pending',  icon:'⏳', c:'#fcd34d', bg:'rgba(245,158,11,.12)', bd:'rgba(245,158,11,.25)' },
  PARTIALLY_PAID: { label:'Partial',  icon:'💳', c:'#93c5fd', bg:'rgba(59,130,246,.12)',  bd:'rgba(59,130,246,.25)' },
  PAID:           { label:'Paid',     icon:'✅', c:'#6ee7b7', bg:'rgba(16,185,129,.12)', bd:'rgba(16,185,129,.25)' },
  OVERDUE:        { label:'Overdue',  icon:'⚠️', c:'#fca5a5', bg:'rgba(239,68,68,.12)',  bd:'rgba(239,68,68,.25)' },
  CANCELLED:      { label:'Cancelled',icon:'❌', c:'rgba(255,255,255,.4)', bg:'rgba(255,255,255,.05)', bd:'rgba(255,255,255,.1)' },
};
const gS = s => STATUS[s] || STATUS.PENDING;

const PAY_METHODS = [
  { v:'CASH', l:'Cash', icon:'💵', c:'#10b981' },
  { v:'CARD', l:'Card', icon:'💳', c:'#3b82f6' },
  { v:'BANK_TRANSFER', l:'Bank Transfer', icon:'🏦', c:'#8b5cf6' },
  { v:'CHECK', l:'Check', icon:'📄', c:'#6b7280' },
  { v:'MOBILE_MONEY', l:'UPI/Mobile', icon:'📱', c:'#f59e0b' },
];

// ─── Number to words (Indian format) ───
const numberToWords = (num) => {
  if (num === 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const s = Math.floor(num).toString();
  if (s.length > 9) return 'Overflow';
  const p = s.padStart(9,'0');
  const twoD = n => n < 20 ? ones[n] : tens[Math.floor(n/10)] + (n%10?' '+ones[n%10]:'');
  let r = '';
  const cr = parseInt(p.substring(0,2)), lk = parseInt(p.substring(2,4));
  const th = parseInt(p.substring(4,6)), hd = parseInt(p.substring(6,7));
  const rm = parseInt(p.substring(7,9));
  if (cr > 0) r += twoD(cr)+' Crore ';
  if (lk > 0) r += twoD(lk)+' Lakh ';
  if (th > 0) r += twoD(th)+' Thousand ';
  if (hd > 0) r += ones[hd]+' Hundred ';
  if (rm > 0) { if (r) r += 'and '; r += twoD(rm); }
  return r.trim() || 'Zero';
};

// ══════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState({ search:'', status:'', startDate:'', endDate:'' });
  const [formData, setFormData] = useState({
    jobId:'', subtotal:'', tax:'', discount:'0', dueDate:'', notes:'', autoCalculate:true,
  });
  const [payData, setPayData] = useState({ amount:'', method:'CASH', reference:'', notes:'' });
  const [stats, setStats] = useState({ total:0, pending:0, paid:0, overdue:0, totalAmount:0, pendingAmount:0 });

  // ─── init ───
  useEffect(() => { const c = () => setIsMobile(window.innerWidth < 768); c(); window.addEventListener('resize',c); return () => window.removeEventListener('resize',c); }, []);
  useEffect(() => { const u = localStorage.getItem('user'); if(u) setCurrentUser(JSON.parse(u)); fetchJobs(); }, []);
  useEffect(() => { if(currentUser) fetchInvoices(); }, [filters, currentUser]);

  const fetchJobs = async () => {
    try { const r = await fetch('/api/jobs'); const d = await r.json();
      if (d.success) setJobs((d.data||[]).filter(j => !j.invoice && j.status !== 'CANCELLED'));
    } catch {}
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams();
      if(filters.search) p.append('search', filters.search);
      if(filters.status) p.append('status', filters.status);
      if(filters.startDate) p.append('startDate', filters.startDate);
      if(filters.endDate) p.append('endDate', filters.endDate);
      const r = await fetch(`/api/invoices?${p}`);
      const d = await r.json();
      if (d.success) {
        setInvoices(d.data||[]);
        const data = d.data||[];
        const today = new Date(); today.setHours(0,0,0,0);
        setStats({
          total: data.length,
          pending: data.filter(i => i.status === 'PENDING').length,
          paid: data.filter(i => i.status === 'PAID').length,
          overdue: data.filter(i => i.status === 'OVERDUE' || (i.status === 'PENDING' && new Date(i.dueDate) < today)).length,
          totalAmount: data.reduce((s,i) => s + (i.total||0), 0),
          pendingAmount: data.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').reduce((s,i) => s + ((i.total||0)-(i.amountPaid||0)), 0),
        });
      }
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [filters]);

  // ─── Form handlers ───
  const resetForm = () => { setFormData({ jobId:'', subtotal:'', tax:'', discount:'0', dueDate:'', notes:'', autoCalculate:true }); setSelectedJob(null); };
  const openCreate = () => { resetForm(); fetchJobs(); setShowModal(true); };

  const handleJobSelect = (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    setSelectedJob(job);
    setFormData(p => ({ ...p, jobId }));
    if (job && formData.autoCalculate) {
      const sTotal = job.services?.reduce((s,js) => s+((js.price||js.service?.basePrice||0)*(js.quantity||1)),0)||0;
      const pTotal = job.parts?.reduce((s,jp) => s+((jp.price||jp.part?.sellingPrice||0)*(jp.quantity||1)),0)||0;
      const sub = sTotal + pTotal + (job.actualCost||job.estimatedCost||0);
      setFormData(p => ({ ...p, subtotal: sub.toFixed(2), tax: (sub*.18).toFixed(2) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const payload = { jobId:formData.jobId, subtotal:parseFloat(formData.subtotal)||0, tax:parseFloat(formData.tax)||0, discount:parseFloat(formData.discount)||0, dueDate:formData.dueDate||null, notes:formData.notes||null };
      const r = await fetch('/api/invoices', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message||'Failed'); return; }
      toast.success('Invoice created!'); resetForm(); setShowModal(false); fetchInvoices(); fetchJobs();
    } catch { toast.error('Error'); }
    finally { setSubmitting(false); }
  };

  const handlePayment = async (e) => {
    e.preventDefault(); if(!selectedInvoice) return; setSubmitting(true);
    try {
      const r = await fetch('/api/payments', { method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ invoiceId:selectedInvoice.id, amount:parseFloat(payData.amount), method:payData.method, reference:payData.reference, notes:payData.notes }) });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message||'Failed'); return; }
      toast.success('Payment recorded!'); setShowPaymentModal(false); setPayData({amount:'',method:'CASH',reference:'',notes:''}); fetchInvoices();
    } catch { toast.error('Error'); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async (inv) => {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/invoices?id=${inv.id}`, { method:'DELETE' });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message||'Failed'); return; }
      toast.success('Invoice cancelled'); setShowCancelConfirm(null); setShowDetailModal(false); fetchInvoices();
    } catch { toast.error('Error'); }
    finally { setSubmitting(false); }
  };

  const openPayModal = inv => {
    setSelectedInvoice(inv);
    setPayData({ amount:(inv.total-inv.amountPaid).toFixed(2), method:'CASH', reference:'', notes:'' });
    setShowPaymentModal(true);
  };

  // Print (keeps light theme for paper)
  const printInvoice = (inv) => {
    const w = window.open('','_blank');
    w.document.write(generatePrintHTML(inv));
    w.document.close();
    w.print();
  };

  const canManage = ['SUPER_ADMIN','MANAGER','CASHIER'].includes(currentUser?.role);

  const STAT_CARDS = [
    { label:'Total Invoices', v:stats.total, icon:'📄', grad:'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
    { label:'Total Amount', v:`₹${stats.totalAmount.toLocaleString('en-IN')}`, icon:'💰', grad:'linear-gradient(135deg,#10b981,#059669)' },
    { label:'Pending', v:`₹${stats.pendingAmount.toLocaleString('en-IN')}`, icon:'⏳', grad:'linear-gradient(135deg,#f59e0b,#d97706)' },
    { label:'Overdue', v:stats.overdue, icon:'⚠️', grad:'linear-gradient(135deg,#ef4444,#dc2626)' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div style={{ minHeight:'100vh' }}>
        {/* ═══ HEADER ═══ */}
        <div style={{ marginBottom:24, animation:'inSlideUp .5s ease' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <span style={{ fontSize:26 }}>📄</span>
                <h1 style={{ margin:0, fontSize:'clamp(1.3rem,4vw,1.7rem)', fontWeight:800, color:'white', letterSpacing:'-.5px' }}>Invoices</h1>
              </div>
              <p style={{ margin:0, fontSize:13, color:'rgba(255,255,255,.4)', fontWeight:500 }}>Generate and manage billing</p>
            </div>
            {canManage && (
              <IBtn onClick={openCreate} label="Generate Invoice" icon="➕"
                grad="linear-gradient(135deg,#10b981,#059669)" glow="rgba(16,185,129,.35)" full={isMobile} />
            )}
          </div>
        </div>

        {/* ═══ STATS ═══ */}
        <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fit,minmax(min(100%,${isMobile?'140px':'200px'}),1fr))`, gap:isMobile?10:14, marginBottom:20 }}>
          {STAT_CARDS.map((s,i) => (
            <div key={s.label} className="in-glass in-stat" style={{ padding:isMobile?14:'clamp(14px,2vw,20px)', animation:`inSlideUp .5s ease ${i*.08}s backwards`, cursor:'default' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:0, fontSize:9.5, fontWeight:700, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.7px' }}>{s.label}</p>
                  <p style={{ margin:'5px 0 0', fontSize:isMobile?'1.1rem':'clamp(1.1rem,2.5vw,1.5rem)', fontWeight:800, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.v}</p>
                </div>
                <div className="in-stat-icon" style={{ width:isMobile?42:48, height:isMobile?42:48, borderRadius:13, background:s.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:isMobile?20:22, flexShrink:0, boxShadow:'0 6px 18px rgba(0,0,0,.25)', transition:'transform .3s ease' }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ═══ FILTERS ═══ */}
        <div className="in-glass" style={{ padding:isMobile?14:16, marginBottom:20, animation:'inSlideUp .5s ease .2s backwards' }}>
          <div style={{ display:'flex', flexDirection:isMobile?'column':'row', gap:10, flexWrap:'wrap' }}>
            <div style={{ flex:1, position:'relative', minWidth:0 }}>
              <svg style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'rgba(255,255,255,.3)', pointerEvents:'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="in-search" name="search" value={filters.search} onChange={e => setFilters(p => ({...p, search:e.target.value}))} placeholder="Search invoice # or customer..." />
            </div>
            <select className="in-select" value={filters.status} onChange={e => setFilters(p => ({...p, status:e.target.value}))} style={{ minWidth:isMobile?'100%':140 }}>
              <option value="">All Status</option>
              {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <input className="in-input" type="date" value={filters.startDate} onChange={e => setFilters(p => ({...p, startDate:e.target.value}))} style={{ minWidth:isMobile?'100%':'auto' }} />
            <input className="in-input" type="date" value={filters.endDate} onChange={e => setFilters(p => ({...p, endDate:e.target.value}))} style={{ minWidth:isMobile?'100%':'auto' }} />
            {(filters.search||filters.status||filters.startDate||filters.endDate) && (
              <button onClick={() => setFilters({search:'',status:'',startDate:'',endDate:''})} className="in-btn" style={{ padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', color:'rgba(255,255,255,.5)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>✕ Clear</button>
            )}
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        {loading ? (
          <Loader text="Loading invoices..." />
        ) : invoices.length === 0 ? (
          <Empty icon="📄" title="No invoices found"
            sub={(filters.search||filters.status) ? 'Try different filters' : 'Generate your first invoice'}
            showBtn={canManage && !filters.search && !filters.status}
            onBtn={openCreate} btnLabel="Generate First Invoice" />
        ) : isMobile ? (
          /* MOBILE CARDS */
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {invoices.map((inv,i) => {
              const isOD = inv.status === 'PENDING' && new Date(inv.dueDate) < new Date();
              const st = gS(isOD ? 'OVERDUE' : inv.status);
              return (
                <div key={inv.id} className="in-glass" onClick={() => { setSelectedInvoice(inv); setShowDetailModal(true); }}
                  style={{ padding:16, cursor:'pointer', animation:`inSlideUp .4s ease ${i*.03}s backwards` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <p style={{ margin:0, fontWeight:700, color:'white', fontSize:14 }}>{inv.invoiceNumber}</p>
                      <p style={{ margin:'2px 0 0', fontSize:12, color:'rgba(255,255,255,.4)' }}>{inv.customer?.name}</p>
                    </div>
                    <Badge {...st} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                    <div><p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,.35)' }}>Vehicle</p><p style={{ margin:0, fontWeight:600, color:'white', fontSize:13 }}>{inv.job?.vehicle?.licensePlate}</p></div>
                    <div><p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,.35)' }}>Amount</p><p style={{ margin:0, fontWeight:800, color:'#6ee7b7', fontSize:15 }}>₹{inv.total?.toLocaleString('en-IN')}</p></div>
                    <div><p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,.35)' }}>Date</p><p style={{ margin:0, fontWeight:600, color:'white', fontSize:12 }}>{new Date(inv.createdAt).toLocaleDateString('en-IN')}</p></div>
                    <div><p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,.35)' }}>Due</p><p style={{ margin:0, fontWeight:600, color:'white', fontSize:12 }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : '—'}</p></div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:'1px solid rgba(255,255,255,.05)' }}>
                    <span style={{ color:'#93c5fd', fontWeight:600, fontSize:12 }}>View Details →</span>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={e => { e.stopPropagation(); printInvoice(inv); }} className="in-btn" style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'rgba(255,255,255,.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🖨️</button>
                      {canManage && inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                        <button onClick={e => { e.stopPropagation(); openPayModal(inv); }} className="in-btn" style={{ width:32, height:32, borderRadius:8, background:'rgba(139,92,246,.12)', border:'1px solid rgba(139,92,246,.2)', color:'#c4b5fd', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>💳</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* DESKTOP TABLE */
          <div className="in-glass" style={{ overflow:'hidden', animation:'inSlideUp .5s ease .3s backwards' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
                <thead>
                  <tr>
                    {['Invoice','Customer','Vehicle','Amount','Status','Due Date','Actions'].map(h => (
                      <th key={h} style={{ padding:'13px 18px', textAlign:h==='Actions'?'right':'left', fontSize:10, fontWeight:800, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.8px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv,i) => {
                    const isOD = inv.status === 'PENDING' && new Date(inv.dueDate) < new Date();
                    const st = gS(isOD ? 'OVERDUE' : inv.status);
                    return (
                      <tr key={inv.id} className="in-row" style={{ borderBottom:i<invoices.length-1?'1px solid rgba(255,255,255,.04)':'none', animation:`inSlideUp .35s ease ${i*.03}s backwards` }}>
                        <td style={{ padding:'13px 18px' }}>
                          <p style={{ margin:0, fontWeight:700, color:'white', fontSize:13 }}>{inv.invoiceNumber}</p>
                          <p style={{ margin:'1px 0 0', fontSize:11, color:'rgba(255,255,255,.35)' }}>{new Date(inv.createdAt).toLocaleDateString('en-IN')}</p>
                        </td>
                        <td style={{ padding:'13px 18px' }}>
                          <p style={{ margin:0, fontWeight:600, color:'white', fontSize:13 }}>{inv.customer?.name}</p>
                          <p style={{ margin:'1px 0 0', fontSize:11, color:'rgba(255,255,255,.35)' }}>{inv.customer?.phone}</p>
                        </td>
                        <td style={{ padding:'13px 18px' }}>
                          <p style={{ margin:0, fontWeight:600, color:'white', fontSize:13 }}>{inv.job?.vehicle?.licensePlate}</p>
                          <p style={{ margin:'1px 0 0', fontSize:11, color:'rgba(255,255,255,.35)' }}>{inv.job?.vehicle?.make} {inv.job?.vehicle?.model}</p>
                        </td>
                        <td style={{ padding:'13px 18px' }}>
                          <p style={{ margin:0, fontWeight:800, color:'#6ee7b7', fontSize:15 }}>₹{inv.total?.toLocaleString('en-IN')}</p>
                          {inv.amountPaid > 0 && inv.amountPaid < inv.total && (
                            <p style={{ margin:'1px 0 0', fontSize:10, color:'rgba(255,255,255,.35)' }}>Paid: ₹{inv.amountPaid?.toLocaleString('en-IN')}</p>
                          )}
                        </td>
                        <td style={{ padding:'13px 18px' }}><Badge {...st} /></td>
                        <td style={{ padding:'13px 18px', fontSize:13, color:'rgba(255,255,255,.45)' }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                        <td style={{ padding:'13px 18px' }}>
                          <div style={{ display:'flex', justifyContent:'flex-end', gap:4 }}>
                            <TBtn onClick={() => { setSelectedInvoice(inv); setShowDetailModal(true); }} tip="View" icon="👁️" hc="#3b82f6" />
                            <TBtn onClick={() => printInvoice(inv)} tip="Print" icon="🖨️" hc="#10b981" />
                            {canManage && inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                              <TBtn onClick={() => openPayModal(inv)} tip="Pay" icon="💳" hc="#8b5cf6" />
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

      {/* ═══ CREATE MODAL ═══ */}
      {showModal && (
        <Ovl onClose={() => setShowModal(false)}>
          <div style={{ maxWidth:600, width:'100%' }}>
            <MH grad="linear-gradient(135deg,#10b981,#059669)" title="Generate Invoice" sub="Create a new billing invoice" onClose={() => setShowModal(false)} />
            <form onSubmit={handleSubmit} style={{ padding:isMobile?20:24, background:'rgba(15,23,42,.97)', borderRadius:'0 0 20px 20px', border:'1px solid rgba(255,255,255,.06)', borderTop:'none' }}>
              <div style={{ maxHeight:'calc(72vh - 200px)', overflowY:'auto', paddingRight:4 }}>
                <div style={{ marginBottom:16 }}>
                  <label className="in-label">Select Job <span style={{ color:'#10b981' }}>*</span></label>
                  <select className="in-select" value={formData.jobId} onChange={e => handleJobSelect(e.target.value)} required>
                    <option value="">Select completed job...</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.jobNumber} - {j.vehicle?.licensePlate} ({j.vehicle?.customer?.name})</option>)}
                  </select>
                  {!jobs.length && <p style={{ margin:'6px 0 0', fontSize:11, color:'#fcd34d' }}>No jobs available</p>}
                </div>

                {/* Auto calc toggle */}
                <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, cursor:'pointer' }}>
                  <input type="checkbox" checked={formData.autoCalculate} onChange={e => setFormData(p => ({...p, autoCalculate:e.target.checked}))}
                    style={{ width:15, height:15, accentColor:'#10b981' }} />
                  <span style={{ fontSize:13, color:'rgba(255,255,255,.5)', fontWeight:500 }}>Auto-calculate from services & parts</span>
                </label>

                {selectedJob && (
                  <div style={{ padding:14, borderRadius:12, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', marginBottom:16 }}>
                    <p style={{ margin:'0 0 8px', fontSize:12, fontWeight:700, color:'rgba(255,255,255,.5)' }}>Job Details</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:12 }}>
                      <p style={{ margin:0, color:'rgba(255,255,255,.5)' }}>Vehicle: <strong style={{ color:'white' }}>{selectedJob.vehicle?.licensePlate}</strong></p>
                      <p style={{ margin:0, color:'rgba(255,255,255,.5)' }}>Customer: <strong style={{ color:'white' }}>{selectedJob.vehicle?.customer?.name}</strong></p>
                      <p style={{ margin:0, color:'rgba(255,255,255,.5)' }}>Services: <strong style={{ color:'white' }}>{selectedJob.services?.length||0}</strong></p>
                      <p style={{ margin:0, color:'rgba(255,255,255,.5)' }}>Parts: <strong style={{ color:'white' }}>{selectedJob.parts?.length||0}</strong></p>
                    </div>
                  </div>
                )}

                <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
                  <div><label className="in-label">Subtotal (₹) <span style={{color:'#10b981'}}>*</span></label><input className="in-input" type="number" value={formData.subtotal} onChange={e => setFormData(p => ({...p, subtotal:e.target.value}))} placeholder="0.00" step="0.01" min="0" required /></div>
                  <div><label className="in-label">Tax/GST (₹)</label><input className="in-input" type="number" value={formData.tax} onChange={e => setFormData(p => ({...p, tax:e.target.value}))} placeholder="0.00" step="0.01" min="0" /></div>
                  <div><label className="in-label">Discount (₹)</label><input className="in-input" type="number" value={formData.discount} onChange={e => setFormData(p => ({...p, discount:e.target.value}))} placeholder="0.00" step="0.01" min="0" /></div>
                </div>

                <div style={{ marginBottom:16 }}>
                  <label className="in-label">Due Date</label>
                  <input className="in-input" type="date" value={formData.dueDate} onChange={e => setFormData(p => ({...p, dueDate:e.target.value}))} />
                </div>

                <div style={{ marginBottom:16 }}>
                  <label className="in-label">Notes</label>
                  <textarea className="in-input" value={formData.notes} onChange={e => setFormData(p => ({...p, notes:e.target.value}))} rows={2} placeholder="Additional notes..." style={{ resize:'none' }} />
                </div>

                {/* Total preview */}
                <div style={{ padding:14, borderRadius:12, background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontWeight:700, color:'#6ee7b7', fontSize:14 }}>Total Amount</span>
                    <span style={{ fontWeight:800, color:'#6ee7b7', fontSize:20 }}>
                      ₹{((parseFloat(formData.subtotal)||0)+(parseFloat(formData.tax)||0)-(parseFloat(formData.discount)||0)).toLocaleString('en-IN',{minimumFractionDigits:2})}
                    </span>
                  </div>
                </div>
              </div>

              <MF onCancel={() => setShowModal(false)} submitting={submitting} label="Generate Invoice"
                grad="linear-gradient(135deg,#10b981,#059669)" glow="rgba(16,185,129,.3)" disabled={!jobs.length} />
            </form>
          </div>
        </Ovl>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      {showDetailModal && selectedInvoice && (
        <Ovl onClose={() => { setShowDetailModal(false); setSelectedInvoice(null); }}>
          <div style={{ maxWidth:620, width:'100%' }}>
            <div style={{ padding:'20px 22px', background:'rgba(255,255,255,.04)', borderRadius:'20px 20px 0 0', border:'1px solid rgba(255,255,255,.08)', borderBottom:'none' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <h2 style={{ margin:'0 0 8px', fontSize:20, fontWeight:800, color:'white' }}>{selectedInvoice.invoiceNumber}</h2>
                  <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                    <Badge {...gS(selectedInvoice.status)} />
                    {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                      <span style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>Balance: ₹{(selectedInvoice.total-selectedInvoice.amountPaid).toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </div>
                <CBtn onClick={() => { setShowDetailModal(false); setSelectedInvoice(null); }} />
              </div>
            </div>

            <div style={{ padding:isMobile?20:24, background:'rgba(15,23,42,.97)', borderRadius:'0 0 20px 20px', border:'1px solid rgba(255,255,255,.06)', borderTop:'none', maxHeight:'calc(72vh - 180px)', overflowY:'auto' }}>
              {/* Customer & Vehicle */}
              <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:12, marginBottom:18 }}>
                <div style={{ padding:14, borderRadius:12, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)' }}>
                  <p style={{ margin:'0 0 6px', fontSize:10, color:'rgba(255,255,255,.35)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px' }}>👤 Customer</p>
                  <p style={{ margin:0, fontWeight:700, color:'white', fontSize:14 }}>{selectedInvoice.customer?.name}</p>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:'rgba(255,255,255,.4)' }}>{selectedInvoice.customer?.phone}</p>
                </div>
                <div style={{ padding:14, borderRadius:12, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)' }}>
                  <p style={{ margin:'0 0 6px', fontSize:10, color:'rgba(255,255,255,.35)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px' }}>🚗 Vehicle</p>
                  <p style={{ margin:0, fontWeight:700, color:'white', fontSize:14 }}>{selectedInvoice.job?.vehicle?.licensePlate}</p>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:'rgba(255,255,255,.4)' }}>{selectedInvoice.job?.vehicle?.make} {selectedInvoice.job?.vehicle?.model}</p>
                </div>
              </div>

              {/* Amount Summary */}
              <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid rgba(255,255,255,.06)', marginBottom:18 }}>
                {[
                  { l:'Subtotal', v:`₹${selectedInvoice.subtotal?.toLocaleString('en-IN')}` },
                  { l:'Tax (GST)', v:`₹${selectedInvoice.tax?.toLocaleString('en-IN')}` },
                  { l:'Discount', v:`-₹${selectedInvoice.discount?.toLocaleString('en-IN')}`, c:'#fca5a5' },
                ].map((r,i) => (
                  <div key={r.l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,.04)', background:'rgba(255,255,255,.02)' }}>
                    <span style={{ fontSize:13, color:'rgba(255,255,255,.45)' }}>{r.l}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:r.c||'white' }}>{r.v}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 14px', background:'rgba(16,185,129,.08)' }}>
                  <span style={{ fontSize:14, fontWeight:700, color:'#6ee7b7' }}>Total</span>
                  <span style={{ fontSize:18, fontWeight:800, color:'#6ee7b7' }}>₹{selectedInvoice.total?.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', background:'rgba(255,255,255,.02)' }}>
                  <span style={{ fontSize:13, color:'rgba(255,255,255,.45)' }}>Amount Paid</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'#6ee7b7' }}>₹{selectedInvoice.amountPaid?.toLocaleString('en-IN')}</span>
                </div>
                {(selectedInvoice.total - selectedInvoice.amountPaid) > 0 && selectedInvoice.status !== 'PAID' && (
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', background:'rgba(239,68,68,.06)' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'#fca5a5' }}>Balance Due</span>
                    <span style={{ fontSize:15, fontWeight:800, color:'#fca5a5' }}>₹{(selectedInvoice.total-selectedInvoice.amountPaid).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Payment History */}
              {selectedInvoice.payments?.length > 0 && (
                <div style={{ marginBottom:18 }}>
                  <p style={{ margin:'0 0 10px', fontSize:10, color:'rgba(255,255,255,.35)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px' }}>💳 Payment History</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {selectedInvoice.payments.map((pay,i) => (
                      <div key={pay.id||i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:10, background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.12)' }}>
                        <div>
                          <span style={{ fontWeight:700, color:'#6ee7b7', fontSize:14 }}>₹{pay.amount?.toLocaleString('en-IN')}</span>
                          <span style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginLeft:8 }}>
                            {PAY_METHODS.find(m => m.v === pay.method)?.l || pay.method}
                            {pay.reference && ` • ${pay.reference}`}
                          </span>
                        </div>
                        <span style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>{new Date(pay.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedInvoice.notes && (
                <div style={{ padding:14, borderRadius:12, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.05)', marginBottom:18 }}>
                  <p style={{ margin:'0 0 4px', fontSize:10, color:'rgba(255,255,255,.35)', fontWeight:600 }}>Notes</p>
                  <p style={{ margin:0, fontSize:13, color:'rgba(255,255,255,.6)' }}>{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', flexWrap:'wrap', marginTop:20, paddingTop:16, borderTop:'1px solid rgba(255,255,255,.06)' }}>
                <IBtn onClick={() => { setShowDetailModal(false); setSelectedInvoice(null); }} label="Close" outline color="rgba(255,255,255,.4)" />
                <IBtn onClick={() => printInvoice(selectedInvoice)} label="🖨️ Print" outline color="rgba(255,255,255,.5)" />
                {canManage && selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                  <>
                    <IBtn onClick={() => { setShowDetailModal(false); openPayModal(selectedInvoice); }} label="💳 Record Payment"
                      grad="linear-gradient(135deg,#10b981,#059669)" glow="rgba(16,185,129,.3)" />
                    <IBtn onClick={() => setShowCancelConfirm(selectedInvoice)} label="Cancel Invoice"
                      grad="linear-gradient(135deg,#ef4444,#dc2626)" glow="rgba(239,68,68,.3)" />
                  </>
                )}
              </div>
            </div>
          </div>
        </Ovl>
      )}

      {/* ═══ PAYMENT MODAL ═══ */}
      {showPaymentModal && selectedInvoice && (
        <Ovl onClose={() => setShowPaymentModal(false)}>
          <div style={{ maxWidth:460, width:'100%' }}>
            <MH grad="linear-gradient(135deg,#8b5cf6,#6d28d9)" title="Record Payment"
              sub={`${selectedInvoice.invoiceNumber} • Balance: ₹${(selectedInvoice.total-selectedInvoice.amountPaid).toLocaleString('en-IN')}`}
              onClose={() => setShowPaymentModal(false)} />
            <form onSubmit={handlePayment} style={{ padding:isMobile?20:24, background:'rgba(15,23,42,.97)', borderRadius:'0 0 20px 20px', border:'1px solid rgba(255,255,255,.06)', borderTop:'none' }}>
              <div style={{ marginBottom:16 }}>
                <label className="in-label">Amount (₹) <span style={{color:'#8b5cf6'}}>*</span></label>
                <input className="in-input" type="number" value={payData.amount} onChange={e => setPayData(p => ({...p, amount:e.target.value}))} placeholder="0.00" step="0.01" min="0.01" max={selectedInvoice.total-selectedInvoice.amountPaid} required style={{ fontSize:18, fontWeight:700 }} />
              </div>

              <div style={{ marginBottom:16 }}>
                <label className="in-label">Payment Method <span style={{color:'#8b5cf6'}}>*</span></label>
                <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)', gap:8 }}>
                  {PAY_METHODS.map(m => (
                    <label key={m.v} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:11, cursor:'pointer', background:payData.method===m.v?`${m.c}12`:'rgba(255,255,255,.03)', border:`1.5px solid ${payData.method===m.v?`${m.c}40`:'rgba(255,255,255,.07)'}`, transition:'all .2s' }}>
                      <input type="radio" name="method" value={m.v} checked={payData.method===m.v} onChange={e => setPayData(p => ({...p, method:e.target.value}))} style={{ display:'none' }} />
                      <span style={{ fontSize:16 }}>{m.icon}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:payData.method===m.v?m.c:'rgba(255,255,255,.45)' }}>{m.l}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <label className="in-label">Reference / Transaction ID</label>
                <input className="in-input" value={payData.reference} onChange={e => setPayData(p => ({...p, reference:e.target.value}))} placeholder="UPI ID, Check #..." />
              </div>

              <div style={{ marginBottom:4 }}>
                <label className="in-label">Notes</label>
                <textarea className="in-input" value={payData.notes} onChange={e => setPayData(p => ({...p, notes:e.target.value}))} rows={2} placeholder="Optional..." style={{ resize:'none' }} />
              </div>

              <MF onCancel={() => setShowPaymentModal(false)} submitting={submitting} label="Record Payment"
                grad="linear-gradient(135deg,#8b5cf6,#6d28d9)" glow="rgba(139,92,246,.3)" />
            </form>
          </div>
        </Ovl>
      )}

      {/* ═══ CANCEL CONFIRM ═══ */}
      {showCancelConfirm && (
        <Ovl onClose={() => setShowCancelConfirm(null)}>
          <div style={{ maxWidth:380, width:'100%', background:'rgba(15,23,42,.97)', borderRadius:20, border:'1px solid rgba(255,255,255,.06)', padding:28, textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(239,68,68,.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:26 }}>⚠️</div>
            <h3 style={{ margin:'0 0 6px', fontSize:17, fontWeight:800, color:'white' }}>Cancel Invoice?</h3>
            <p style={{ margin:'0 0 20px', fontSize:13, color:'rgba(255,255,255,.45)' }}>
              Cancel <span style={{ color:'#fca5a5', fontWeight:700 }}>{showCancelConfirm.invoiceNumber}</span>? This cannot be undone.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <IBtn onClick={() => setShowCancelConfirm(null)} label="Keep" outline color="rgba(255,255,255,.4)" style={{ flex:1 }} />
              <button onClick={() => handleCancel(showCancelConfirm)} disabled={submitting} className="in-btn" style={{
                flex:1, padding:'10px 0', borderRadius:12, background:'linear-gradient(135deg,#ef4444,#dc2626)',
                border:'none', color:'white', fontSize:13, fontWeight:700, opacity:submitting?.6:1,
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              }}>{submitting && <Spin />}Cancel Invoice</button>
            </div>
          </div>
        </Ovl>
      )}
    </>
  );

  // ─── Print HTML Generator (stays LIGHT theme for paper) ───
  function generatePrintHTML(inv) {
    return `<!DOCTYPE html><html><head><title>Invoice ${inv.invoiceNumber}</title>
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;width:210mm;min-height:297mm;margin:0 auto;color:#1a202c;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
.cw{position:relative;z-index:1;padding:20mm 15mm;min-height:297mm}
.hdr{text-align:center;margin-bottom:25px;padding-bottom:20px;border-bottom:3px solid #1a365d}
.cn{font-size:28px;font-weight:800;color:#1a365d;margin-bottom:4px}
.ct{font-size:12px;color:#718096;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px}
.cc{font-size:12px;color:#4a5568}
.tb{background:linear-gradient(135deg,#1a365d,#2d3748);color:white;padding:14px 20px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;margin-bottom:25px}
.tb h2{font-size:20px;font-weight:700;letter-spacing:1px}
.tn{font-size:16px;font-weight:600;background:rgba(255,255,255,.15);padding:6px 14px;border-radius:8px}
.ig{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:25px}
.ic{background:#f7fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px}
.ich{font-size:10px;font-weight:700;color:#a0aec0;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}
.ic h3{font-size:16px;font-weight:700;color:#1a202c;margin-bottom:4px}
.ic p{font-size:13px;color:#4a5568;margin:3px 0;line-height:1.5}
.vb{background:#edf2f7;border-radius:10px;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:25px;border:1px solid #e2e8f0}
.vb span{font-size:13px;color:#4a5568}.vb strong{color:#1a202c}
table{width:100%;border-collapse:separate;border-spacing:0;margin-bottom:25px;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.05)}
thead th{background:linear-gradient(135deg,#2d3748,#1a365d);color:white;padding:14px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
thead th:last-child{text-align:right}
tbody td{padding:12px 16px;font-size:13px;color:#2d3748;border-bottom:1px solid #edf2f7;background:rgba(255,255,255,.85)}
tbody td:last-child{text-align:right;font-weight:600}
tbody tr:last-child td{border-bottom:none}
tbody tr:nth-child(even) td{background:#f7fafc}
.ts{display:flex;justify-content:flex-end;margin-bottom:25px}
.tc{width:320px;background:white;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
.tr{display:flex;justify-content:space-between;align-items:center;padding:10px 18px;font-size:14px;border-bottom:1px solid #f7fafc}
.tr:last-child{border-bottom:none}
.tr .tl{color:#718096}.tr .tv{font-weight:600;color:#2d3748}
.tr.tt{background:linear-gradient(135deg,#1a365d,#2d3748);padding:14px 18px}
.tr.tt .tl{color:rgba(255,255,255,.85);font-weight:600;font-size:15px}
.tr.tt .tv{color:white;font-size:20px;font-weight:800}
.tr.tp .tv{color:#38a169}
.tr.tb2{background:#fff5f5}.tr.tb2 .tl{color:#c53030;font-weight:600}.tr.tb2 .tv{color:#e53e3e;font-weight:700;font-size:16px}
.ft{margin-top:auto;padding-top:20px;border-top:2px solid #e2e8f0;text-align:center}
.ft .terms{font-size:11px;color:#718096;line-height:1.6;margin-bottom:12px;padding:10px 20px;background:#f7fafc;border-radius:8px}
.ft .ty{font-size:16px;font-weight:700;color:#2d3748;margin-bottom:6px}
.ft .gen{font-size:10px;color:#a0aec0}
.sa{display:flex;justify-content:space-between;margin-top:30px;padding:0 40px}
.sb{text-align:center;width:180px}
.sl{border-top:1px solid #cbd5e0;margin-top:50px;padding-top:8px;font-size:12px;color:#718096;font-weight:600}
@media print{body{padding:0;margin:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.cw{padding:15mm 12mm}}
</style></head><body><div class="cw">
<div class="hdr">
<div style="width:80px;height:80px;margin:0 auto 12px;border-radius:16px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:36px;color:white">🚗</div>
<div class="cn">${inv.branch?.name||'AutoBill Pro'}</div>
<div class="ct">Automotive Service & Billing</div>
<div class="cc">${inv.branch?.location?`📍 ${inv.branch.location}`:''}${inv.branch?.phone?` | 📞 ${inv.branch.phone}`:''}${inv.branch?.email?` | ✉️ ${inv.branch.email}`:''}</div>
</div>
<div class="tb"><h2>TAX INVOICE</h2><span class="tn">${inv.invoiceNumber}</span></div>
<div class="ig">
<div class="ic"><div class="ich">📋 BILL TO</div><h3>${inv.customer?.name||'N/A'}</h3><p>📞 ${inv.customer?.phone||'N/A'}</p>${inv.customer?.email?`<p>✉️ ${inv.customer.email}</p>`:''}</div>
<div class="ic"><div class="ich">📅 DETAILS</div><p><strong>Date:</strong> ${new Date(inv.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p><p><strong>Due:</strong> ${inv.dueDate?new Date(inv.dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):'On Receipt'}</p><p><strong>Job:</strong> ${inv.job?.jobNumber||'N/A'}</p></div>
</div>
<div class="vb"><span>🚗 <strong>${inv.job?.vehicle?.licensePlate||'N/A'}</strong></span><span>${inv.job?.vehicle?.make||''} ${inv.job?.vehicle?.model||''}</span></div>
<table><thead><tr><th style="width:8%">#</th><th style="width:42%">Description</th><th style="width:12%;text-align:center">Qty</th><th style="width:18%;text-align:right">Rate (₹)</th><th style="width:20%;text-align:right">Amount (₹)</th></tr></thead><tbody>
${(inv.job?.services||[]).map((s,i) => `<tr><td>${i+1}</td><td><strong>${s.service?.name||'Service'}</strong></td><td style="text-align:center">${s.quantity||1}</td><td style="text-align:right">${(s.price||s.service?.basePrice||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td><td style="text-align:right">${((s.price||s.service?.basePrice||0)*(s.quantity||1)).toLocaleString('en-IN',{minimumFractionDigits:2})}</td></tr>`).join('')}
${(inv.job?.parts||[]).map((p,i) => `<tr><td>${(inv.job?.services?.length||0)+i+1}</td><td><strong>${p.part?.name||'Part'}</strong></td><td style="text-align:center">${p.quantity||1}</td><td style="text-align:right">${(p.price||p.part?.sellingPrice||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td><td style="text-align:right">${((p.price||p.part?.sellingPrice||0)*(p.quantity||1)).toLocaleString('en-IN',{minimumFractionDigits:2})}</td></tr>`).join('')}
${(!inv.job?.services?.length&&!inv.job?.parts?.length)?`<tr><td>1</td><td><strong>Service Charges</strong></td><td style="text-align:center">1</td><td style="text-align:right">${(inv.subtotal||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td><td style="text-align:right">${(inv.subtotal||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td></tr>`:''}
</tbody></table>
<div class="ts"><div class="tc">
<div class="tr"><span class="tl">Subtotal</span><span class="tv">₹${(inv.subtotal||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
<div class="tr"><span class="tl">Tax (GST 18%)</span><span class="tv">₹${(inv.tax||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
${(inv.discount||0)>0?`<div class="tr"><span class="tl">Discount</span><span class="tv" style="color:#e53e3e">-₹${(inv.discount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>`:''}
<div class="tr tt"><span class="tl">Grand Total</span><span class="tv">₹${(inv.total||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
${(inv.amountPaid||0)>0?`<div class="tr tp"><span class="tl">Amount Paid</span><span class="tv">₹${(inv.amountPaid||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>`:''}
${(inv.total-(inv.amountPaid||0))>0&&inv.status!=='PAID'?`<div class="tr tb2"><span class="tl">Balance Due</span><span class="tv">₹${((inv.total||0)-(inv.amountPaid||0)).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>`:''}
</div></div>
<div style="background:#ebf8ff;border:1px solid #bee3f8;border-radius:8px;padding:10px 16px;margin-bottom:25px;font-size:13px"><strong style="color:#2b6cb0">Amount in Words:</strong> <span style="color:#2d3748">Rupees ${numberToWords(inv.total||0)} Only</span></div>
${inv.payments?.length?`<div style="margin-bottom:25px"><h4 style="font-size:12px;font-weight:700;color:#a0aec0;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">💳 Payment History</h4>${inv.payments.map(p => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f0fff4;border:1px solid #c6f6d5;border-radius:8px;margin-bottom:6px;font-size:13px"><div><span style="font-weight:700;color:#276749">₹${(p.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</span><span style="color:#718096"> via ${p.method||'Cash'}${p.reference?` (Ref: ${p.reference})`:''}</span></div><span style="color:#718096">${new Date(p.createdAt).toLocaleDateString('en-IN')}</span></div>`).join('')}</div>`:''}
${inv.notes?`<div style="background:#fffff0;border:1px solid #fefcbf;border-radius:10px;padding:14px 18px;margin-bottom:25px"><h4 style="font-size:12px;font-weight:700;color:#d69e2e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">📝 Notes</h4><p style="font-size:13px;color:#744210;line-height:1.6">${inv.notes}</p></div>`:''}
<div class="ft">
<div class="terms">Payment is due within 7 days. Late payments may incur charges. Thank you for choosing our services!</div>
<div class="sa"><div class="sb"><div class="sl">Customer Signature</div></div><div class="sb"><div class="sl">Authorized Signature</div></div></div>
<div style="margin-top:25px"><div class="ty">Thank you for your business! 🙏</div><div class="gen">Generated on ${new Date().toLocaleString('en-IN',{dateStyle:'long',timeStyle:'short'})} | AutoBill Pro</div></div>
</div></div></body></html>`;
  }
}

// ══════════════════════════════════════════════
// SHARED UI
// ══════════════════════════════════════════════
function Ovl({ children, onClose }) {
  return (
    <div className="in-overlay" onClick={onClose} style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,.65)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div className="in-modal" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function MH({ grad, title, sub, onClose }) {
  return (
    <div style={{ padding:'18px 22px', background:grad, borderRadius:'20px 20px 0 0', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-30, right:-30, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.1)', pointerEvents:'none' }} />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex:1 }}>
        <div>
          <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:'white' }}>{title}</h2>
          <p style={{ margin:'3px 0 0', fontSize:12, color:'rgba(255,255,255,.7)' }}>{sub}</p>
        </div>
        <CBtn onClick={onClose} />
      </div>
    </div>
  );
}

function MF({ onCancel, submitting, label, grad, glow, disabled }) {
  return (
    <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22, paddingTop:18, borderTop:'1px solid rgba(255,255,255,.06)' }}>
      <IBtn onClick={onCancel} label="Cancel" outline color="rgba(255,255,255,.4)" disabled={submitting} />
      <button type="submit" disabled={submitting||disabled} className="in-btn" style={{
        padding:'10px 22px', borderRadius:12, background:grad, border:'none', color:'white', fontSize:13, fontWeight:700,
        opacity:(submitting||disabled)?.5:1, display:'flex', alignItems:'center', gap:8, boxShadow:`0 4px 14px ${glow}`,
      }}>{submitting && <Spin />}{label}</button>
    </div>
  );
}

function Badge({ label, icon, c, bg, bd }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'3px 10px', borderRadius:14, background:bg, border:`1px solid ${bd}`, color:c, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
      {icon} {label}
    </span>
  );
}

function IBtn({ onClick, label, icon, grad, glow, outline, color, disabled, full, style={} }) {
  return (
    <button onClick={onClick} disabled={disabled} className="in-btn" style={{
      padding:'10px 20px', borderRadius:12, fontSize:13, fontWeight:700,
      background:outline?'transparent':(grad||'rgba(255,255,255,.06)'),
      border:outline?`1px solid ${color||'rgba(255,255,255,.15)'}`:'none',
      color:outline?(color||'rgba(255,255,255,.6)'):'white',
      boxShadow:glow?`0 4px 14px ${glow}`:'none',
      opacity:disabled?.5:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
      width:full?'100%':'auto', ...style,
    }}>{icon && <span>{icon}</span>}{label}</button>
  );
}

function TBtn({ onClick, tip, icon, hc }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} title={tip} style={{
      width:32, height:32, borderRadius:8, border:'none', background:h?`${hc}18`:'transparent',
      cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
      transition:'all .2s', transform:h?'scale(1.1)':'scale(1)',
    }}>{icon}</button>
  );
}

function CBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ width:30, height:30, borderRadius:9, background:'rgba(255,255,255,.14)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg style={{ width:15, height:15, color:'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function Spin() { return <div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,.2)', borderTopColor:'white', borderRadius:'50%', animation:'inSpin .6s linear infinite', flexShrink:0 }} />; }

function Loader({ text }) {
  return <div style={{ display:'flex', justifyContent:'center', padding:'80px 20px' }}>
    <div style={{ textAlign:'center' }}>
      <div style={{ width:44, height:44, margin:'0 auto 14px', border:'3px solid rgba(255,255,255,.1)', borderTopColor:'#10b981', borderRadius:'50%', animation:'inSpin .8s linear infinite' }} />
      <p style={{ color:'rgba(255,255,255,.4)', fontSize:14, fontWeight:500 }}>{text}</p>
    </div>
  </div>;
}

function Empty({ icon, title, sub, showBtn, onBtn, btnLabel }) {
  return <div className="in-glass" style={{ padding:'60px 24px', textAlign:'center', animation:'inScaleIn .5s ease' }}>
    <div style={{ width:72, height:72, borderRadius:22, background:'rgba(16,185,129,.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:32, animation:'inFloat 3s ease-in-out infinite' }}>{icon}</div>
    <h3 style={{ margin:'0 0 8px', fontSize:18, fontWeight:700, color:'white' }}>{title}</h3>
    <p style={{ margin:'0 0 24px', fontSize:14, color:'rgba(255,255,255,.4)' }}>{sub}</p>
    {showBtn && <IBtn onClick={onBtn} label={btnLabel} grad="linear-gradient(135deg,#10b981,#059669)" glow="rgba(16,185,129,.35)" />}
  </div>;
}