// src/app/(dashboard)/jobs/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const CSS = `
  @keyframes jbSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes jbScaleIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
  @keyframes jbFadeIn{from{opacity:0}to{opacity:1}}
  @keyframes jbSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes jbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  .jb-glass{background:rgba(255,255,255,.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.07);border-radius:18px;transition:all .3s cubic-bezier(.4,0,.2,1)}
  .jb-glass:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.11)}
  .jb-stat:hover{transform:translateY(-4px);box-shadow:0 20px 48px rgba(0,0,0,.35)}
  .jb-stat:hover .jb-stat-icon{transform:scale(1.12) rotate(6deg)}
  .jb-btn{transition:all .22s ease;cursor:pointer}
  .jb-btn:hover{transform:translateY(-1px)}
  .jb-row{transition:background .2s ease}
  .jb-row:hover{background:rgba(255,255,255,.04)!important}
  .jb-overlay{animation:jbFadeIn .25s ease}
  .jb-modal{animation:jbScaleIn .3s cubic-bezier(.4,0,.2,1)}
  .jb-input{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 14px;color:white;font-size:14px;width:100%;outline:none;transition:all .22s ease}
  .jb-input::placeholder{color:rgba(255,255,255,.28)}
  .jb-input:focus{border-color:rgba(59,130,246,.5);background:rgba(255,255,255,.07);box-shadow:0 0 0 3px rgba(59,130,246,.12)}
  .jb-input:disabled{opacity:.5;cursor:not-allowed}
  .jb-select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 14px;color:white;font-size:14px;width:100%;outline:none;appearance:none;cursor:pointer;transition:all .22s ease}
  .jb-select option{background:#1a1f35;color:white}
  .jb-select:focus{border-color:rgba(59,130,246,.5);box-shadow:0 0 0 3px rgba(59,130,246,.12)}
  .jb-select:disabled{opacity:.5;cursor:not-allowed}
  .jb-label{display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.45);margin-bottom:6px;text-transform:uppercase;letter-spacing:.7px}
  .jb-search{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 14px 10px 40px;color:white;font-size:14px;width:100%;outline:none;transition:all .22s ease}
  .jb-search::placeholder{color:rgba(255,255,255,.28)}
  .jb-search:focus{border-color:rgba(59,130,246,.4);background:rgba(255,255,255,.07);box-shadow:0 0 0 3px rgba(59,130,246,.1)}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
  input[type=number]{-moz-appearance:textfield}
  @media(max-width:768px){.jb-stat:hover{transform:none}.jb-stat:hover .jb-stat-icon{transform:none}}
`;

const ST = {
  PENDING:       { l:'Pending',       icon:'⏳', c:'#fcd34d', bg:'rgba(245,158,11,.12)', bd:'rgba(245,158,11,.25)', next:'IN_PROGRESS' },
  IN_PROGRESS:   { l:'In Progress',   icon:'🔧', c:'#93c5fd', bg:'rgba(59,130,246,.12)',  bd:'rgba(59,130,246,.25)', next:'COMPLETED' },
  AWAITING_PARTS:{ l:'Awaiting Parts', icon:'📦', c:'#fb923c', bg:'rgba(249,115,22,.12)', bd:'rgba(249,115,22,.25)', next:'IN_PROGRESS' },
  COMPLETED:     { l:'Completed',     icon:'✅', c:'#6ee7b7', bg:'rgba(16,185,129,.12)', bd:'rgba(16,185,129,.25)', next:'DELIVERED' },
  DELIVERED:     { l:'Delivered',     icon:'🚗', c:'#c4b5fd', bg:'rgba(139,92,246,.12)', bd:'rgba(139,92,246,.25)', next:null },
  CANCELLED:     { l:'Cancelled',    icon:'❌', c:'#fca5a5', bg:'rgba(239,68,68,.12)',  bd:'rgba(239,68,68,.25)',  next:null },
};
const PR = {
  LOW:    { l:'Low',    icon:'🔵', c:'#93c5fd', bg:'rgba(59,130,246,.1)',  bd:'rgba(59,130,246,.2)' },
  MEDIUM: { l:'Medium', icon:'🟡', c:'#fcd34d', bg:'rgba(245,158,11,.1)', bd:'rgba(245,158,11,.2)' },
  HIGH:   { l:'High',   icon:'🟠', c:'#fb923c', bg:'rgba(249,115,22,.1)', bd:'rgba(249,115,22,.2)' },
  URGENT: { l:'Urgent', icon:'🔴', c:'#fca5a5', bg:'rgba(239,68,68,.1)',  bd:'rgba(239,68,68,.2)' },
};
const gST = s => ST[s]||ST.PENDING;
const gPR = p => PR[p]||PR.MEDIUM;

export default function JobsPage() {
  const [jobs,setJobs]=useState([]);
  const [vehicles,setVehicles]=useState([]);
  const [technicians,setTechnicians]=useState([]);
  const [branches,setBranches]=useState([]);
  const [loading,setLoading]=useState(true);
  const [currentUser,setCurrentUser]=useState(null);
  const [isMobile,setIsMobile]=useState(false);

  const [showModal,setShowModal]=useState(false);
  const [showDetailModal,setShowDetailModal]=useState(false);
  const [showDeleteModal,setShowDeleteModal]=useState(false);
  const [selectedJob,setSelectedJob]=useState(null);
  const [submitting,setSubmitting]=useState(false);

  const [filters,setFilters]=useState({search:'',status:'',priority:'',assignedToId:''});
  const [formData,setFormData]=useState({vehicleId:'',description:'',assignedToId:'',priority:'MEDIUM',estimatedCost:'',scheduledDate:'',customerNotes:'',branchId:''});
  const [stats,setStats]=useState({total:0,pending:0,inProgress:0,completed:0});

  useEffect(()=>{const c=()=>setIsMobile(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c)},[]);
  useEffect(()=>{const u=localStorage.getItem('user');if(u)setCurrentUser(JSON.parse(u));fetchInit()},[]);
  useEffect(()=>{if(currentUser)fetchJobs()},[filters,currentUser]);

  const fetchInit=async()=>{try{const[vR,uR,bR]=await Promise.all([fetch('/api/vehicles'),fetch('/api/users'),fetch('/api/branches')]);const vD=await vR.json(),uD=await uR.json(),bD=await bR.json();if(vD.success)setVehicles(vD.data||[]);if(uD.success)setTechnicians((uD.data||[]).filter(u=>u.role==='EMPLOYEE'&&u.isActive));if(bD.success)setBranches(bD.data||[])}catch{}};

  const fetchJobs=useCallback(async()=>{try{setLoading(true);const p=new URLSearchParams();if(filters.search)p.append('search',filters.search);if(filters.status)p.append('status',filters.status);if(filters.priority)p.append('priority',filters.priority);if(filters.assignedToId)p.append('assignedToId',filters.assignedToId);const r=await fetch(`/api/jobs?${p}`);const d=await r.json();if(d.success){setJobs(d.data||[]);const data=d.data||[];setStats({total:data.length,pending:data.filter(j=>j.status==='PENDING').length,inProgress:data.filter(j=>j.status==='IN_PROGRESS').length,completed:data.filter(j=>j.status==='COMPLETED'||j.status==='DELIVERED').length})}}catch{toast.error('Failed to load')}finally{setLoading(false)}},[filters]);

  const resetForm=()=>{setFormData({vehicleId:'',description:'',assignedToId:'',priority:'MEDIUM',estimatedCost:'',scheduledDate:'',customerNotes:'',branchId:''});setSelectedJob(null)};
  const openCreate=()=>{resetForm();setShowModal(true)};
  const openEdit=j=>{setSelectedJob(j);setFormData({vehicleId:j.vehicleId,description:j.description||'',assignedToId:j.assignedToId||'',priority:j.priority,estimatedCost:j.estimatedCost?.toString()||'',scheduledDate:j.scheduledDate?j.scheduledDate.split('T')[0]:'',customerNotes:j.customerNotes||'',branchId:j.branchId||''});setShowModal(true)};

  const handleSubmit=async e=>{e.preventDefault();setSubmitting(true);try{const url=selectedJob?`/api/jobs/${selectedJob.id}`:'/api/jobs';const r=await fetch(url,{method:selectedJob?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(formData)});const d=await r.json();if(!r.ok){toast.error(d.message||'Failed');return}toast.success(`Job ${selectedJob?'updated':'created'}!`);resetForm();setShowModal(false);fetchJobs()}catch{toast.error('Error')}finally{setSubmitting(false)}};

  const handleDelete=async()=>{if(!selectedJob)return;setSubmitting(true);try{const r=await fetch(`/api/jobs/${selectedJob.id}`,{method:'DELETE'});const d=await r.json();if(!r.ok){toast.error(d.message||'Failed');return}toast.success('Deleted');setShowDeleteModal(false);setSelectedJob(null);fetchJobs()}catch{toast.error('Error')}finally{setSubmitting(false)}};

  const updateStatus=async(id,s)=>{try{const r=await fetch(`/api/jobs/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:s})});const d=await r.json();if(!r.ok){toast.error(d.message||'Failed');return}toast.success(`Status → ${s}`);fetchJobs();if(showDetailModal)setSelectedJob(d.data)}catch{toast.error('Error')}};

  const canManage=currentUser?.role==='SUPER_ADMIN'||currentUser?.role==='MANAGER';
  const isEmp=currentUser?.role==='EMPLOYEE';

  const STATS=[
    {label:'Total Jobs',v:stats.total,icon:'📋',grad:'linear-gradient(135deg,#3b82f6,#1d4ed8)'},
    {label:'Pending',v:stats.pending,icon:'⏳',grad:'linear-gradient(135deg,#f59e0b,#d97706)'},
    {label:'In Progress',v:stats.inProgress,icon:'🔧',grad:'linear-gradient(135deg,#6366f1,#4f46e5)'},
    {label:'Completed',v:stats.completed,icon:'✅',grad:'linear-gradient(135deg,#10b981,#059669)'},
  ];

  return(
    <>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      <div style={{minHeight:'100vh'}}>

        {/* HEADER */}
        <div style={{marginBottom:24,animation:'jbSlideUp .5s ease'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:14}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <span style={{fontSize:26}}>🔧</span>
                <h1 style={{margin:0,fontSize:'clamp(1.3rem,4vw,1.7rem)',fontWeight:800,color:'white',letterSpacing:'-.5px'}}>{isEmp?'My Jobs':'Job Cards'}</h1>
              </div>
              <p style={{margin:0,fontSize:13,color:'rgba(255,255,255,.4)',fontWeight:500}}>{isEmp?'View your assigned work':'Manage service jobs'}</p>
            </div>
            {canManage&&(<JBtn onClick={openCreate} label="Create Job" icon="➕" grad="linear-gradient(135deg,#3b82f6,#1d4ed8)" glow="rgba(59,130,246,.35)" full={isMobile}/>)}
          </div>
        </div>

        {/* STATS */}
        <div style={{display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(min(100%,${isMobile?'140px':'200px'}),1fr))`,gap:isMobile?10:14,marginBottom:20}}>
          {STATS.map((s,i)=>(
            <div key={s.label} className="jb-glass jb-stat" style={{padding:isMobile?14:'clamp(14px,2vw,20px)',animation:`jbSlideUp .5s ease ${i*.08}s backwards`,cursor:'default'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                <div style={{minWidth:0}}>
                  <p style={{margin:0,fontSize:9.5,fontWeight:700,color:'rgba(255,255,255,.38)',textTransform:'uppercase',letterSpacing:'.7px'}}>{s.label}</p>
                  <p style={{margin:'5px 0 0',fontSize:isMobile?'1.2rem':'clamp(1.2rem,2.5vw,1.6rem)',fontWeight:800,color:'white'}}>{s.v}</p>
                </div>
                <div className="jb-stat-icon" style={{width:isMobile?42:48,height:isMobile?42:48,borderRadius:13,background:s.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:isMobile?20:22,flexShrink:0,boxShadow:'0 6px 18px rgba(0,0,0,.25)',transition:'transform .3s ease'}}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div className="jb-glass" style={{padding:isMobile?14:16,marginBottom:20,animation:'jbSlideUp .5s ease .2s backwards'}}>
          <div style={{display:'flex',flexDirection:isMobile?'column':'row',gap:10,flexWrap:'wrap'}}>
            <div style={{flex:1,position:'relative',minWidth:0}}>
              <svg style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',width:16,height:16,color:'rgba(255,255,255,.3)',pointerEvents:'none'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input className="jb-search" name="search" value={filters.search} onChange={e=>setFilters(p=>({...p,search:e.target.value}))} placeholder="Search job #, vehicle, customer..."/>
            </div>
            <select className="jb-select" value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))} style={{minWidth:isMobile?'100%':140}}>
              <option value="">All Status</option>
              {Object.entries(ST).map(([k,v])=><option key={k} value={k}>{v.icon} {v.l}</option>)}
            </select>
            <select className="jb-select" value={filters.priority} onChange={e=>setFilters(p=>({...p,priority:e.target.value}))} style={{minWidth:isMobile?'100%':130}}>
              <option value="">All Priority</option>
              {Object.entries(PR).map(([k,v])=><option key={k} value={k}>{v.icon} {v.l}</option>)}
            </select>
            {canManage&&technicians.length>0&&(
              <select className="jb-select" value={filters.assignedToId} onChange={e=>setFilters(p=>({...p,assignedToId:e.target.value}))} style={{minWidth:isMobile?'100%':150}}>
                <option value="">All Technicians</option>
                {technicians.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            {(filters.search||filters.status||filters.priority||filters.assignedToId)&&(
              <button onClick={()=>setFilters({search:'',status:'',priority:'',assignedToId:''})} className="jb-btn" style={{padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',color:'rgba(255,255,255,.5)',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:6}}>✕ Clear</button>
            )}
          </div>
        </div>

        {/* CONTENT */}
        {loading?<Loader text="Loading jobs..."/>:jobs.length===0?(
          <Empty icon="🔧" title="No jobs found" sub={(filters.search||filters.status||filters.priority)?'Try different filters':'Create your first job card'} showBtn={canManage&&!filters.search&&!filters.status} onBtn={openCreate} btnLabel="Create First Job"/>
        ):isMobile?(
          /* MOBILE CARDS */
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {jobs.map((job,i)=>{
              const st=gST(job.status),pr=gPR(job.priority);
              return(
                <div key={job.id} className="jb-glass" onClick={()=>{setSelectedJob(job);setShowDetailModal(true)}} style={{padding:16,cursor:'pointer',animation:`jbSlideUp .4s ease ${i*.03}s backwards`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div><p style={{margin:0,fontWeight:700,color:'white',fontSize:14}}>{job.jobNumber}</p><p style={{margin:'2px 0 0',fontSize:12,color:'rgba(255,255,255,.4)'}}>{job.vehicle?.make} {job.vehicle?.model}</p></div>
                    <Badge l={st.l} icon={st.icon} c={st.c} bg={st.bg} bd={st.bd}/>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                    <Badge l={pr.l} icon={pr.icon} c={pr.c} bg={pr.bg} bd={pr.bd}/>
                    <span style={{color:'rgba(255,255,255,.2)'}}>•</span>
                    <span style={{fontSize:13,color:'rgba(255,255,255,.5)'}}>{job.vehicle?.licensePlate}</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                    <div><p style={{margin:0,fontSize:10,color:'rgba(255,255,255,.35)'}}>Customer</p><p style={{margin:0,fontWeight:600,color:'white',fontSize:13}}>{job.vehicle?.customer?.name}</p></div>
                    <div><p style={{margin:0,fontSize:10,color:'rgba(255,255,255,.35)'}}>Technician</p><p style={{margin:0,fontWeight:600,color:'white',fontSize:13}}>{job.assignedTo?.name||'Unassigned'}</p></div>
                    <div><p style={{margin:0,fontSize:10,color:'rgba(255,255,255,.35)'}}>Cost</p><p style={{margin:0,fontWeight:700,color:'#6ee7b7',fontSize:14}}>₹{(job.actualCost||job.estimatedCost||0).toLocaleString()}</p></div>
                    <div><p style={{margin:0,fontSize:10,color:'rgba(255,255,255,.35)'}}>Created</p><p style={{margin:0,fontWeight:600,color:'white',fontSize:12}}>{new Date(job.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p></div>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:10,borderTop:'1px solid rgba(255,255,255,.05)'}}>
                    <span style={{color:'#93c5fd',fontWeight:600,fontSize:12}}>View Details →</span>
                    {canManage&&(
                      <div style={{display:'flex',gap:4}}>
                        <TBtn onClick={e=>{e.stopPropagation();openEdit(job)}} icon="✏️" hc="#3b82f6"/>
                        {!job.invoice&&<TBtn onClick={e=>{e.stopPropagation();setSelectedJob(job);setShowDeleteModal(true)}} icon="🗑️" hc="#ef4444"/>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ):(
          /* DESKTOP TABLE */
          <div className="jb-glass" style={{overflow:'hidden',animation:'jbSlideUp .5s ease .3s backwards'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
                <thead><tr>
                  {['Job Details','Vehicle','Customer','Status','Assigned To','Cost','Actions'].map(h=>(
                    <th key={h} style={{padding:'13px 18px',textAlign:h==='Actions'?'right':'left',fontSize:10,fontWeight:800,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.8px',borderBottom:'1px solid rgba(255,255,255,.06)'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {jobs.map((job,i)=>{
                    const st=gST(job.status),pr=gPR(job.priority);
                    return(
                      <tr key={job.id} className="jb-row" style={{borderBottom:i<jobs.length-1?'1px solid rgba(255,255,255,.04)':'none',animation:`jbSlideUp .35s ease ${i*.03}s backwards`}}>
                        <td style={{padding:'13px 18px'}}>
                          <p style={{margin:0,fontWeight:700,color:'white',fontSize:13}}>{job.jobNumber}</p>
                          <Badge l={pr.l} icon={pr.icon} c={pr.c} bg={pr.bg} bd={pr.bd} small/>
                          <p style={{margin:'4px 0 0',fontSize:10,color:'rgba(255,255,255,.3)'}}>{new Date(job.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                        </td>
                        <td style={{padding:'13px 18px'}}><p style={{margin:0,fontWeight:600,color:'white',fontSize:13}}>{job.vehicle?.licensePlate}</p><p style={{margin:'1px 0 0',fontSize:11,color:'rgba(255,255,255,.35)'}}>{job.vehicle?.make} {job.vehicle?.model}</p></td>
                        <td style={{padding:'13px 18px'}}><p style={{margin:0,fontWeight:600,color:'white',fontSize:13}}>{job.vehicle?.customer?.name}</p><p style={{margin:'1px 0 0',fontSize:11,color:'rgba(255,255,255,.35)'}}>{job.vehicle?.customer?.phone}</p></td>
                        <td style={{padding:'13px 18px'}}><Badge l={st.l} icon={st.icon} c={st.c} bg={st.bg} bd={st.bd}/></td>
                        <td style={{padding:'13px 18px'}}>
                          {job.assignedTo?(
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:11,fontWeight:800,flexShrink:0}}>{job.assignedTo.name?.charAt(0)}</div>
                              <span style={{fontSize:13,color:'white'}}>{job.assignedTo.name}</span>
                            </div>
                          ):<span style={{fontSize:13,color:'rgba(255,255,255,.3)',fontStyle:'italic'}}>Unassigned</span>}
                        </td>
                        <td style={{padding:'13px 18px'}}>
                          <p style={{margin:0,fontWeight:700,color:'#6ee7b7',fontSize:14}}>₹{(job.actualCost||job.estimatedCost||0).toLocaleString()}</p>
                          {job.actualCost&&job.estimatedCost&&job.actualCost!==job.estimatedCost&&(
                            <p style={{margin:'1px 0 0',fontSize:10,color:'rgba(255,255,255,.3)',textDecoration:'line-through'}}>Est: ₹{job.estimatedCost.toLocaleString()}</p>
                          )}
                        </td>
                        <td style={{padding:'13px 18px'}}>
                          <div style={{display:'flex',justifyContent:'flex-end',gap:4}}>
                            <TBtn onClick={()=>{setSelectedJob(job);setShowDetailModal(true)}} icon="👁️" hc="#3b82f6"/>
                            {canManage&&(<><TBtn onClick={()=>openEdit(job)} icon="✏️" hc="#10b981"/>{!job.invoice&&<TBtn onClick={()=>{setSelectedJob(job);setShowDeleteModal(true)}} icon="🗑️" hc="#ef4444"/>}</>)}
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

      {/* CREATE/EDIT MODAL */}
      {showModal&&(
        <Ovl onClose={()=>setShowModal(false)}>
          <div style={{maxWidth:620,width:'100%'}}>
            <MH grad="linear-gradient(135deg,#3b82f6,#1d4ed8)" title={selectedJob?'Edit Job':'Create New Job'} sub={selectedJob?`Editing ${selectedJob.jobNumber}`:'Fill in job details'} onClose={()=>setShowModal(false)}/>
            <form onSubmit={handleSubmit} style={{padding:isMobile?20:24,background:'rgba(15,23,42,.97)',borderRadius:'0 0 20px 20px',border:'1px solid rgba(255,255,255,.06)',borderTop:'none'}}>
              <div style={{maxHeight:'calc(72vh - 200px)',overflowY:'auto',paddingRight:4}}>
                <div style={{marginBottom:16}}>
                  <label className="jb-label">Vehicle <span style={{color:'#3b82f6'}}>*</span></label>
                  <select className="jb-select" name="vehicleId" value={formData.vehicleId} onChange={e=>setFormData(p=>({...p,vehicleId:e.target.value}))} required disabled={!!selectedJob}>
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v=><option key={v.id} value={v.id}>{v.licensePlate} - {v.make} {v.model} ({v.customer?.name})</option>)}
                  </select>
                </div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14,marginBottom:16}}>
                  <div><label className="jb-label">Assign Technician</label><select className="jb-select" value={formData.assignedToId} onChange={e=>setFormData(p=>({...p,assignedToId:e.target.value}))}><option value="">Select</option>{technicians.map(t=><option key={t.id} value={t.id}>🔧 {t.name}</option>)}</select></div>
                  <div><label className="jb-label">Priority</label><select className="jb-select" value={formData.priority} onChange={e=>setFormData(p=>({...p,priority:e.target.value}))}>{Object.entries(PR).map(([k,v])=><option key={k} value={k}>{v.icon} {v.l}</option>)}</select></div>
                  <div><label className="jb-label">Estimated Cost (₹)</label><input className="jb-input" type="number" value={formData.estimatedCost} onChange={e=>setFormData(p=>({...p,estimatedCost:e.target.value}))} placeholder="0.00" min="0" step="0.01"/></div>
                  <div><label className="jb-label">Scheduled Date</label><input className="jb-input" type="date" value={formData.scheduledDate} onChange={e=>setFormData(p=>({...p,scheduledDate:e.target.value}))}/></div>
                </div>
                {currentUser?.role==='SUPER_ADMIN'&&branches.length>0&&!selectedJob&&(
                  <div style={{marginBottom:16}}><label className="jb-label">Branch</label><select className="jb-select" value={formData.branchId} onChange={e=>setFormData(p=>({...p,branchId:e.target.value}))}><option value="">Select Branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                )}
                <div style={{marginBottom:16}}><label className="jb-label">Work Description</label><textarea className="jb-input" value={formData.description} onChange={e=>setFormData(p=>({...p,description:e.target.value}))} rows={3} placeholder="Describe work..." style={{resize:'none'}}/></div>
                <div><label className="jb-label">Customer Notes</label><textarea className="jb-input" value={formData.customerNotes} onChange={e=>setFormData(p=>({...p,customerNotes:e.target.value}))} rows={2} placeholder="Customer instructions..." style={{resize:'none'}}/></div>
              </div>
              <MF onCancel={()=>setShowModal(false)} submitting={submitting} label={selectedJob?'Update Job':'Create Job'} grad="linear-gradient(135deg,#3b82f6,#1d4ed8)" glow="rgba(59,130,246,.3)"/>
            </form>
          </div>
        </Ovl>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal&&selectedJob&&(
        <Ovl onClose={()=>{setShowDetailModal(false);setSelectedJob(null)}}>
          <div style={{maxWidth:620,width:'100%'}}>
            <div style={{padding:'20px 22px',background:'rgba(255,255,255,.04)',borderRadius:'20px 20px 0 0',border:'1px solid rgba(255,255,255,.08)',borderBottom:'none'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <h2 style={{margin:'0 0 8px',fontSize:20,fontWeight:800,color:'white'}}>{selectedJob.jobNumber}</h2>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    <Badge {...gST(selectedJob.status)}/>
                    <Badge {...gPR(selectedJob.priority)} suffix=" Priority"/>
                  </div>
                </div>
                <CBtn onClick={()=>{setShowDetailModal(false);setSelectedJob(null)}}/>
              </div>
            </div>

            <div style={{padding:isMobile?20:24,background:'rgba(15,23,42,.97)',borderRadius:'0 0 20px 20px',border:'1px solid rgba(255,255,255,.06)',borderTop:'none',maxHeight:'calc(72vh - 180px)',overflowY:'auto'}}>
              {/* Quick Action */}
              {gST(selectedJob.status).next&&(
                <div style={{padding:14,borderRadius:12,background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.2)',marginBottom:18}}>
                  <p style={{margin:'0 0 8px',fontSize:12,color:'#93c5fd',fontWeight:600}}>Quick Action:</p>
                  <button onClick={()=>updateStatus(selectedJob.id,gST(selectedJob.status).next)} className="jb-btn" style={{padding:'8px 16px',borderRadius:10,background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',border:'none',color:'white',fontSize:13,fontWeight:700,boxShadow:'0 4px 12px rgba(59,130,246,.3)'}}>
                    Move to {gST(gST(selectedJob.status).next).l}
                  </button>
                </div>
              )}

              {/* Info cards */}
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12,marginBottom:18}}>
                {[
                  {title:'🚗 Vehicle',items:[{l:'Registration',v:selectedJob.vehicle?.licensePlate},{l:'Make/Model',v:`${selectedJob.vehicle?.make} ${selectedJob.vehicle?.model}`},{l:'Year',v:selectedJob.vehicle?.year},{l:'Color',v:selectedJob.vehicle?.color}].filter(x=>x.v)},
                  {title:'👤 Customer',items:[{l:'Name',v:selectedJob.vehicle?.customer?.name},{l:'Phone',v:selectedJob.vehicle?.customer?.phone},{l:'Email',v:selectedJob.vehicle?.customer?.email}].filter(x=>x.v)},
                  {title:'🔧 Assignment',items:[{l:'Technician',v:selectedJob.assignedTo?.name||'Not assigned'},{l:'Branch',v:selectedJob.branch?.name},{l:'Scheduled',v:selectedJob.scheduledDate?new Date(selectedJob.scheduledDate).toLocaleDateString('en-IN'):null}].filter(x=>x.v)},
                  {title:'💰 Cost',items:[{l:'Estimated',v:`₹${(selectedJob.estimatedCost||0).toLocaleString()}`},{l:'Actual',v:`₹${(selectedJob.actualCost||0).toLocaleString()}`},{l:'Labor',v:selectedJob.laborHours?`${selectedJob.laborHours} hrs`:null}].filter(x=>x.v)},
                ].map(card=>(
                  <div key={card.title} style={{padding:14,borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)'}}>
                    <p style={{margin:'0 0 8px',fontSize:12,fontWeight:700,color:'rgba(255,255,255,.5)'}}>{card.title}</p>
                    <div style={{display:'flex',flexDirection:'column',gap:4}}>
                      {card.items.map(item=>(<p key={item.l} style={{margin:0,fontSize:12,color:'rgba(255,255,255,.45)'}}>{item.l}: <strong style={{color:'white'}}>{item.v}</strong></p>))}
                    </div>
                  </div>
                ))}
              </div>

              {selectedJob.description&&(
                <div style={{padding:14,borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',marginBottom:18}}>
                  <p style={{margin:'0 0 4px',fontSize:10,color:'rgba(255,255,255,.35)',fontWeight:600}}>Work Description</p>
                  <p style={{margin:0,fontSize:13,color:'rgba(255,255,255,.6)',lineHeight:1.5}}>{selectedJob.description}</p>
                </div>
              )}

              {selectedJob.timeline?.length>0&&(
                <div>
                  <p style={{margin:'0 0 10px',fontSize:10,color:'rgba(255,255,255,.35)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px'}}>Timeline</p>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {selectedJob.timeline.map((e,i)=>(
                      <div key={e.id||i} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:'#3b82f6',marginTop:6,flexShrink:0}}/>
                        <div><p style={{margin:0,fontWeight:600,color:'white',fontSize:13}}>{e.description}</p><p style={{margin:'2px 0 0',fontSize:10,color:'rgba(255,255,255,.3)'}}>{new Date(e.createdAt).toLocaleString('en-IN')}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:20,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.06)'}}>
                <JBtn onClick={()=>{setShowDetailModal(false);setSelectedJob(null)}} label="Close" outline color="rgba(255,255,255,.4)"/>
                {canManage&&<JBtn onClick={()=>{setShowDetailModal(false);openEdit(selectedJob)}} label="Edit Job" grad="linear-gradient(135deg,#3b82f6,#1d4ed8)" glow="rgba(59,130,246,.3)"/>}
              </div>
            </div>
          </div>
        </Ovl>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal&&selectedJob&&(
        <Ovl onClose={()=>setShowDeleteModal(false)}>
          <div style={{maxWidth:380,width:'100%',background:'rgba(15,23,42,.97)',borderRadius:20,border:'1px solid rgba(255,255,255,.06)',padding:28,textAlign:'center'}}>
            <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(239,68,68,.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:26}}>⚠️</div>
            <h3 style={{margin:'0 0 6px',fontSize:17,fontWeight:800,color:'white'}}>Delete Job?</h3>
            <p style={{margin:'0 0 20px',fontSize:13,color:'rgba(255,255,255,.45)'}}>Delete <span style={{color:'#fca5a5',fontWeight:700}}>{selectedJob.jobNumber}</span>? Cannot be undone.</p>
            <div style={{display:'flex',gap:10}}>
              <JBtn onClick={()=>setShowDeleteModal(false)} label="Cancel" outline color="rgba(255,255,255,.4)" style={{flex:1}}/>
              <button onClick={handleDelete} disabled={submitting} className="jb-btn" style={{flex:1,padding:'10px 0',borderRadius:12,background:'linear-gradient(135deg,#ef4444,#dc2626)',border:'none',color:'white',fontSize:13,fontWeight:700,opacity:submitting?.6:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                {submitting&&<Spin/>}Delete
              </button>
            </div>
          </div>
        </Ovl>
      )}
    </>
  );
}

// ─── SHARED ───
function Ovl({children,onClose}){return<div className="jb-overlay" onClick={onClose} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.65)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}><div className="jb-modal" onClick={e=>e.stopPropagation()}>{children}</div></div>}
function MH({grad,title,sub,onClose}){return<div style={{padding:'18px 22px',background:grad,borderRadius:'20px 20px 0 0',position:'relative',overflow:'hidden'}}><div style={{position:'absolute',top:-30,right:-30,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,.1)',pointerEvents:'none'}}/><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',zIndex:1}}><div><h2 style={{margin:0,fontSize:17,fontWeight:800,color:'white'}}>{title}</h2><p style={{margin:'3px 0 0',fontSize:12,color:'rgba(255,255,255,.7)'}}>{sub}</p></div><CBtn onClick={onClose}/></div></div>}
function MF({onCancel,submitting,label,grad,glow,disabled}){return<div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:22,paddingTop:18,borderTop:'1px solid rgba(255,255,255,.06)'}}><JBtn onClick={onCancel} label="Cancel" outline color="rgba(255,255,255,.4)" disabled={submitting}/><button type="submit" disabled={submitting||disabled} className="jb-btn" style={{padding:'10px 22px',borderRadius:12,background:grad,border:'none',color:'white',fontSize:13,fontWeight:700,opacity:(submitting||disabled)?.5:1,display:'flex',alignItems:'center',gap:8,boxShadow:`0 4px 14px ${glow}`}}>{submitting&&<Spin/>}{label}</button></div>}
function Badge({l,icon,c,bg,bd,small,suffix=''}){return<span style={{display:'inline-flex',alignItems:'center',gap:3,padding:small?'2px 8px':'3px 10px',borderRadius:14,background:bg,border:`1px solid ${bd}`,color:c,fontSize:small?10:11,fontWeight:700,whiteSpace:'nowrap',marginTop:small?4:0}}>{icon} {l}{suffix}</span>}
function JBtn({onClick,label,icon,grad,glow,outline,color,disabled,full,style={}}){return<button onClick={onClick} disabled={disabled} className="jb-btn" style={{padding:'10px 20px',borderRadius:12,fontSize:13,fontWeight:700,background:outline?'transparent':(grad||'rgba(255,255,255,.06)'),border:outline?`1px solid ${color||'rgba(255,255,255,.15)'}`:'none',color:outline?(color||'rgba(255,255,255,.6)'):'white',boxShadow:glow?`0 4px 14px ${glow}`:'none',opacity:disabled?.5:1,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,width:full?'100%':'auto',...style}}>{icon&&<span>{icon}</span>}{label}</button>}
function TBtn({onClick,icon,hc}){const[h,setH]=useState(false);return<button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{width:32,height:32,borderRadius:8,border:'none',background:h?`${hc}18`:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,transition:'all .2s',transform:h?'scale(1.1)':'scale(1)'}}>{icon}</button>}
function CBtn({onClick}){return<button onClick={onClick} style={{width:30,height:30,borderRadius:9,background:'rgba(255,255,255,.14)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg style={{width:15,height:15,color:'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg></button>}
function Spin(){return<div style={{width:15,height:15,border:'2px solid rgba(255,255,255,.2)',borderTopColor:'white',borderRadius:'50%',animation:'jbSpin .6s linear infinite',flexShrink:0}}/>}
function Loader({text}){return<div style={{display:'flex',justifyContent:'center',padding:'80px 20px'}}><div style={{textAlign:'center'}}><div style={{width:44,height:44,margin:'0 auto 14px',border:'3px solid rgba(255,255,255,.1)',borderTopColor:'#3b82f6',borderRadius:'50%',animation:'jbSpin .8s linear infinite'}}/><p style={{color:'rgba(255,255,255,.4)',fontSize:14,fontWeight:500}}>{text}</p></div></div>}
function Empty({icon,title,sub,showBtn,onBtn,btnLabel}){return<div className="jb-glass" style={{padding:'60px 24px',textAlign:'center',animation:'jbScaleIn .5s ease'}}><div style={{width:72,height:72,borderRadius:22,background:'rgba(59,130,246,.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:32,animation:'jbFloat 3s ease-in-out infinite'}}>{icon}</div><h3 style={{margin:'0 0 8px',fontSize:18,fontWeight:700,color:'white'}}>{title}</h3><p style={{margin:'0 0 24px',fontSize:14,color:'rgba(255,255,255,.4)'}}>{sub}</p>{showBtn&&<JBtn onClick={onBtn} label={btnLabel} grad="linear-gradient(135deg,#3b82f6,#1d4ed8)" glow="rgba(59,130,246,.35)"/>}</div>}