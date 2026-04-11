// src/app/(dashboard)/users/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const CSS = `
  @keyframes usSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes usScaleIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
  @keyframes usFadeIn{from{opacity:0}to{opacity:1}}
  @keyframes usSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes usFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  .us-glass{background:rgba(255,255,255,.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.07);border-radius:18px;transition:all .3s cubic-bezier(.4,0,.2,1)}
  .us-glass:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.11)}
  .us-stat:hover{transform:translateY(-4px);box-shadow:0 20px 48px rgba(0,0,0,.35)}
  .us-stat:hover .us-stat-icon{transform:scale(1.12) rotate(6deg)}
  .us-btn{transition:all .22s ease;cursor:pointer}
  .us-btn:hover{transform:translateY(-1px)}
  .us-row{transition:background .2s ease}
  .us-row:hover{background:rgba(255,255,255,.04)!important}
  .us-overlay{animation:usFadeIn .25s ease}
  .us-modal{animation:usScaleIn .3s cubic-bezier(.4,0,.2,1)}
  .us-input{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 14px;color:white;font-size:14px;width:100%;outline:none;transition:all .22s ease}
  .us-input::placeholder{color:rgba(255,255,255,.28)}
  .us-input:focus{border-color:rgba(99,102,241,.5);background:rgba(255,255,255,.07);box-shadow:0 0 0 3px rgba(99,102,241,.12)}
  .us-input:disabled{opacity:.5;cursor:not-allowed}
  .us-select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 14px;color:white;font-size:14px;width:100%;outline:none;appearance:none;cursor:pointer;transition:all .22s ease}
  .us-select option{background:#1a1f35;color:white}
  .us-select:focus{border-color:rgba(99,102,241,.5);box-shadow:0 0 0 3px rgba(99,102,241,.12)}
  .us-select:disabled{opacity:.5;cursor:not-allowed}
  .us-label{display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.45);margin-bottom:6px;text-transform:uppercase;letter-spacing:.7px}
  .us-search{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 14px 10px 40px;color:white;font-size:14px;width:100%;outline:none;transition:all .22s ease}
  .us-search::placeholder{color:rgba(255,255,255,.28)}
  .us-search:focus{border-color:rgba(99,102,241,.4);background:rgba(255,255,255,.07);box-shadow:0 0 0 3px rgba(99,102,241,.1)}
  @media(max-width:768px){.us-stat:hover{transform:none}.us-stat:hover .us-stat-icon{transform:none}}
`;

const ROLES = {
  SUPER_ADMIN: { l:'Super Admin', icon:'👑', c:'#a78bfa', bg:'rgba(167,139,250,.12)', bd:'rgba(167,139,250,.25)', grad:'linear-gradient(135deg,#7c3aed,#5b21b6)', desc:'Full access' },
  MANAGER:     { l:'Manager',     icon:'👔', c:'#93c5fd', bg:'rgba(147,197,253,.12)', bd:'rgba(147,197,253,.25)', grad:'linear-gradient(135deg,#3b82f6,#1d4ed8)', desc:'Branch management' },
  EMPLOYEE:    { l:'Technician',  icon:'🔧', c:'#6ee7b7', bg:'rgba(110,231,183,.12)', bd:'rgba(110,231,183,.25)', grad:'linear-gradient(135deg,#10b981,#059669)', desc:'Service & repairs' },
  CASHIER:     { l:'Cashier',     icon:'💰', c:'#fcd34d', bg:'rgba(252,211,77,.12)',  bd:'rgba(252,211,77,.25)',  grad:'linear-gradient(135deg,#f59e0b,#d97706)', desc:'Billing & payments' },
};
const gR = r => ROLES[r] || ROLES.EMPLOYEE;

export default function UsersPage() {
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showModal,setShowModal]=useState(false);
  const [showDeleteModal,setShowDeleteModal]=useState(false);
  const [editingUser,setEditingUser]=useState(null);
  const [deletingUser,setDeletingUser]=useState(null);
  const [currentUser,setCurrentUser]=useState(null);
  const [branches,setBranches]=useState([]);
  const [submitting,setSubmitting]=useState(false);
  const [isMobile,setIsMobile]=useState(false);
  const [filters,setFilters]=useState({search:'',role:'',status:'',branchId:''});
  const [formData,setFormData]=useState({email:'',password:'',name:'',phone:'',role:'EMPLOYEE',branchId:''});
  const [stats,setStats]=useState({total:0,active:0,inactive:0,byRole:{}});

  useEffect(()=>{const c=()=>setIsMobile(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c)},[]);
  useEffect(()=>{const u=localStorage.getItem('user');if(u)setCurrentUser(JSON.parse(u));fetchBranches()},[]);
  useEffect(()=>{if(currentUser)fetchUsers()},[filters,currentUser]);

  const fetchBranches=async()=>{try{const r=await fetch('/api/branches');const d=await r.json();if(d.success)setBranches(d.data||[])}catch{}};

  const fetchUsers=useCallback(async()=>{
    try{setLoading(true);const p=new URLSearchParams();if(filters.search)p.append('search',filters.search);if(filters.role)p.append('role',filters.role);if(filters.status)p.append('status',filters.status);if(filters.branchId)p.append('branchId',filters.branchId);
    const r=await fetch(`/api/users?${p}`);const d=await r.json();
    if(d.success){setUsers(d.data||[]);const data=d.data||[];const byRole={};data.forEach(u=>{byRole[u.role]=(byRole[u.role]||0)+1});setStats({total:data.length,active:data.filter(u=>u.isActive).length,inactive:data.filter(u=>!u.isActive).length,byRole})}}
    catch{toast.error('Failed to load')}finally{setLoading(false)}},[filters]);

  const resetForm=()=>{setFormData({email:'',password:'',name:'',phone:'',role:'EMPLOYEE',branchId:''});setEditingUser(null)};
  const openCreate=()=>{resetForm();setShowModal(true)};
  const openEdit=u=>{setEditingUser(u);setFormData({email:u.email,password:'',name:u.name,phone:u.phone||'',role:u.role,branchId:u.branchId||''});setShowModal(true)};

  const handleSubmit=async e=>{e.preventDefault();setSubmitting(true);
    try{const payload=editingUser?{id:editingUser.id,...formData,...(formData.password?{}:{password:undefined})}:formData;if(editingUser&&!formData.password)delete payload.password;
    const r=await fetch('/api/users',{method:editingUser?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();
    if(!r.ok){toast.error(d.message||'Failed');return}toast.success(`User ${editingUser?'updated':'created'}!`);resetForm();setShowModal(false);fetchUsers()}
    catch{toast.error('Error')}finally{setSubmitting(false)}};

  const handleDelete=async(permanent=false)=>{if(!deletingUser)return;setSubmitting(true);
    try{const r=await fetch(`/api/users?id=${deletingUser.id}${permanent?'&permanent=true':''}`,{method:'DELETE'});const d=await r.json();
    if(!r.ok){toast.error(d.message||'Failed');return}toast.success(d.message);setShowDeleteModal(false);setDeletingUser(null);fetchUsers()}
    catch{toast.error('Error')}finally{setSubmitting(false)}};

  const toggleStatus=async u=>{
    try{const r=await fetch('/api/users',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:u.id,isActive:!u.isActive})});const d=await r.json();
    if(!r.ok){toast.error(d.message||'Failed');return}toast.success(`User ${u.isActive?'deactivated':'activated'}`);fetchUsers()}catch{toast.error('Error')}};

  const getAllowedRoles=()=>{if(!currentUser)return[];if(currentUser.role==='SUPER_ADMIN')return['MANAGER','EMPLOYEE','CASHIER'];if(currentUser.role==='MANAGER')return['EMPLOYEE','CASHIER'];return[]};
  const allowedRoles=getAllowedRoles();
  const canManage=allowedRoles.length>0;

  const STATS=[
    {label:'Total Users',v:stats.total,icon:'👥',grad:'linear-gradient(135deg,#3b82f6,#1d4ed8)'},
    {label:'Active',v:stats.active,icon:'✅',grad:'linear-gradient(135deg,#10b981,#059669)'},
    {label:'Inactive',v:stats.inactive,icon:'🚫',grad:'linear-gradient(135deg,#ef4444,#dc2626)'},
    {label:'Technicians',v:stats.byRole['EMPLOYEE']||0,icon:'🔧',grad:'linear-gradient(135deg,#10b981,#059669)'},
  ];

  return(
    <>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      <div style={{minHeight:'100vh'}}>

        {/* HEADER */}
        <div style={{marginBottom:24,animation:'usSlideUp .5s ease'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:14}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <span style={{fontSize:26}}>👥</span>
                <h1 style={{margin:0,fontSize:'clamp(1.3rem,4vw,1.7rem)',fontWeight:800,color:'white',letterSpacing:'-.5px'}}>User Management</h1>
              </div>
              <p style={{margin:0,fontSize:13,color:'rgba(255,255,255,.4)',fontWeight:500}}>Manage team members and permissions</p>
            </div>
            {canManage&&<UBtn onClick={openCreate} label="Add User" icon="➕" grad="linear-gradient(135deg,#6366f1,#4f46e5)" glow="rgba(99,102,241,.35)" full={isMobile}/>}
          </div>
        </div>

        {/* STATS */}
        <div style={{display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(min(100%,${isMobile?'140px':'200px'}),1fr))`,gap:isMobile?10:14,marginBottom:20}}>
          {STATS.map((s,i)=>(
            <div key={s.label} className="us-glass us-stat" style={{padding:isMobile?14:'clamp(14px,2vw,20px)',animation:`usSlideUp .5s ease ${i*.08}s backwards`,cursor:'default'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                <div style={{minWidth:0}}>
                  <p style={{margin:0,fontSize:9.5,fontWeight:700,color:'rgba(255,255,255,.38)',textTransform:'uppercase',letterSpacing:'.7px'}}>{s.label}</p>
                  <p style={{margin:'5px 0 0',fontSize:isMobile?'1.2rem':'clamp(1.2rem,2.5vw,1.6rem)',fontWeight:800,color:'white'}}>{s.v}</p>
                </div>
                <div className="us-stat-icon" style={{width:isMobile?42:48,height:isMobile?42:48,borderRadius:13,background:s.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:isMobile?20:22,flexShrink:0,boxShadow:'0 6px 18px rgba(0,0,0,.25)',transition:'transform .3s ease'}}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div className="us-glass" style={{padding:isMobile?14:16,marginBottom:20,animation:'usSlideUp .5s ease .2s backwards'}}>
          <div style={{display:'flex',flexDirection:isMobile?'column':'row',gap:10,flexWrap:'wrap'}}>
            <div style={{flex:1,position:'relative',minWidth:0}}>
              <svg style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',width:16,height:16,color:'rgba(255,255,255,.3)',pointerEvents:'none'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input className="us-search" value={filters.search} onChange={e=>setFilters(p=>({...p,search:e.target.value}))} placeholder="Search name, email, phone..."/>
            </div>
            <select className="us-select" value={filters.role} onChange={e=>setFilters(p=>({...p,role:e.target.value}))} style={{minWidth:isMobile?'100%':140}}>
              <option value="">All Roles</option>
              {Object.entries(ROLES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.l}</option>)}
            </select>
            <select className="us-select" value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))} style={{minWidth:isMobile?'100%':130}}>
              <option value="">All Status</option>
              <option value="active">✓ Active</option>
              <option value="inactive">✗ Inactive</option>
            </select>
            {currentUser?.role==='SUPER_ADMIN'&&branches.length>0&&(
              <select className="us-select" value={filters.branchId} onChange={e=>setFilters(p=>({...p,branchId:e.target.value}))} style={{minWidth:isMobile?'100%':150}}>
                <option value="">All Branches</option>
                {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            {(filters.search||filters.role||filters.status||filters.branchId)&&(
              <button onClick={()=>setFilters({search:'',role:'',status:'',branchId:''})} className="us-btn" style={{padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',color:'rgba(255,255,255,.5)',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:6}}>✕ Clear</button>
            )}
          </div>
        </div>

        {/* CONTENT */}
        {loading?<Loader text="Loading users..."/>:users.length===0?(
          <Empty icon="👥" title="No users found" sub={(filters.search||filters.role||filters.status)?'Try different filters':'Add your first team member'} showBtn={canManage&&!filters.search&&!filters.role} onBtn={openCreate} btnLabel="Add First User"/>
        ):isMobile?(
          /* MOBILE CARDS */
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {users.map((user,i)=>{
              const role=gR(user.role);
              return(
                <div key={user.id} className="us-glass" style={{padding:16,animation:`usSlideUp .4s ease ${i*.03}s backwards`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:44,height:44,borderRadius:13,background:role.grad,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:800,fontSize:16,flexShrink:0,boxShadow:`0 4px 12px ${role.c}30`}}>{user.name?.charAt(0).toUpperCase()||'?'}</div>
                      <div>
                        <p style={{margin:0,fontWeight:700,color:'white',fontSize:14}}>{user.name}</p>
                        <Badge l={role.l} icon={role.icon} c={role.c} bg={role.bg} bd={role.bd}/>
                      </div>
                    </div>
                    <button onClick={()=>toggleStatus(user)} disabled={user.role==='SUPER_ADMIN'||user.id===currentUser?.id} className="us-btn" style={{
                      padding:'4px 10px',borderRadius:10,fontSize:10,fontWeight:700,
                      background:user.isActive?'rgba(16,185,129,.12)':'rgba(239,68,68,.12)',
                      border:`1px solid ${user.isActive?'rgba(16,185,129,.25)':'rgba(239,68,68,.25)'}`,
                      color:user.isActive?'#6ee7b7':'#fca5a5',
                      opacity:(user.role==='SUPER_ADMIN'||user.id===currentUser?.id)?.5:1,
                    }}>{user.isActive?'Active':'Inactive'}</button>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:12,fontSize:12,color:'rgba(255,255,255,.45)'}}>
                    <span>📧 {user.email}</span>
                    {user.phone&&<span>📞 {user.phone}</span>}
                    <span>🏢 {user.branch?.name||'No branch'}</span>
                  </div>

                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:10,borderTop:'1px solid rgba(255,255,255,.05)'}}>
                    <div style={{display:'flex',gap:12,fontSize:11,color:'rgba(255,255,255,.35)'}}>
                      <span>{user._count?.jobs||0} jobs</span>
                      <span>{user._count?.payments||0} payments</span>
                    </div>
                    <div style={{display:'flex',gap:4}}>
                      <TBtn onClick={()=>openEdit(user)} icon="✏️" hc="#6366f1"/>
                      {user.role!=='SUPER_ADMIN'&&user.id!==currentUser?.id&&canManage&&(
                        <TBtn onClick={()=>{setDeletingUser(user);setShowDeleteModal(true)}} icon="🗑️" hc="#ef4444"/>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ):(
          /* DESKTOP TABLE */
          <div className="us-glass" style={{overflow:'hidden',animation:'usSlideUp .5s ease .3s backwards'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:950}}>
                <thead><tr>
                  {['User','Contact','Role','Branch','Status','Stats','Actions'].map(h=>(
                    <th key={h} style={{padding:'13px 18px',textAlign:h==='Actions'?'right':'left',fontSize:10,fontWeight:800,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.8px',borderBottom:'1px solid rgba(255,255,255,.06)'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {users.map((user,i)=>{
                    const role=gR(user.role);
                    return(
                      <tr key={user.id} className="us-row" style={{borderBottom:i<users.length-1?'1px solid rgba(255,255,255,.04)':'none',animation:`usSlideUp .35s ease ${i*.03}s backwards`}}>
                        <td style={{padding:'13px 18px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:36,height:36,borderRadius:10,background:role.grad,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:800,fontSize:14,flexShrink:0}}>{user.name?.charAt(0).toUpperCase()||'?'}</div>
                            <div>
                              <p style={{margin:0,fontWeight:700,color:'white',fontSize:13}}>{user.name}</p>
                              <p style={{margin:'1px 0 0',fontSize:10,color:'rgba(255,255,255,.3)'}}>Joined {new Date(user.createdAt).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'13px 18px'}}>
                          <p style={{margin:0,fontSize:13,color:'rgba(255,255,255,.6)'}}>{user.email}</p>
                          {user.phone&&<p style={{margin:'1px 0 0',fontSize:11,color:'rgba(255,255,255,.35)'}}>{user.phone}</p>}
                        </td>
                        <td style={{padding:'13px 18px'}}><Badge l={role.l} icon={role.icon} c={role.c} bg={role.bg} bd={role.bd}/></td>
                        <td style={{padding:'13px 18px',fontSize:13,color:user.branch?.name?'rgba(255,255,255,.5)':'rgba(255,255,255,.25)',fontStyle:user.branch?.name?'normal':'italic'}}>{user.branch?.name||'No branch'}</td>
                        <td style={{padding:'13px 18px'}}>
                          <button onClick={()=>toggleStatus(user)} disabled={user.role==='SUPER_ADMIN'||user.id===currentUser?.id} className="us-btn" style={{
                            padding:'4px 12px',borderRadius:10,fontSize:11,fontWeight:700,
                            background:user.isActive?'rgba(16,185,129,.12)':'rgba(239,68,68,.12)',
                            border:`1px solid ${user.isActive?'rgba(16,185,129,.25)':'rgba(239,68,68,.25)'}`,
                            color:user.isActive?'#6ee7b7':'#fca5a5',
                            opacity:(user.role==='SUPER_ADMIN'||user.id===currentUser?.id)?.5:1,
                          }}>{user.isActive?'✓ Active':'✗ Inactive'}</button>
                        </td>
                        <td style={{padding:'13px 18px'}}>
                          <div style={{display:'flex',gap:12,fontSize:11,color:'rgba(255,255,255,.35)'}}>
                            <span>📋 {user._count?.jobs||0}</span>
                            <span>💳 {user._count?.payments||0}</span>
                          </div>
                        </td>
                        <td style={{padding:'13px 18px'}}>
                          <div style={{display:'flex',justifyContent:'flex-end',gap:4}}>
                            <TBtn onClick={()=>openEdit(user)} icon="✏️" hc="#6366f1"/>
                            {user.role!=='SUPER_ADMIN'&&user.id!==currentUser?.id&&canManage&&(
                              <TBtn onClick={()=>{setDeletingUser(user);setShowDeleteModal(true)}} icon="🗑️" hc="#ef4444"/>
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

      {/* CREATE/EDIT MODAL */}
      {showModal&&(
        <Ovl onClose={()=>{setShowModal(false);resetForm()}}>
          <div style={{maxWidth:520,width:'100%'}}>
            <MH grad="linear-gradient(135deg,#6366f1,#4f46e5)" title={editingUser?'Edit User':'Create New User'} sub={editingUser?'Update information':'Add team member'} onClose={()=>{setShowModal(false);resetForm()}}/>
            <form onSubmit={handleSubmit} style={{padding:isMobile?20:24,background:'rgba(15,23,42,.97)',borderRadius:'0 0 20px 20px',border:'1px solid rgba(255,255,255,.06)',borderTop:'none'}}>
              <div style={{maxHeight:'calc(72vh - 200px)',overflowY:'auto',paddingRight:4}}>
                <FI label="Full Name" name="name" value={formData.name} onChange={e=>setFormData(p=>({...p,name:e.target.value}))} placeholder="Enter name" required/>
                <FI label="Email" type="email" name="email" value={formData.email} onChange={e=>setFormData(p=>({...p,email:e.target.value}))} placeholder="email@example.com" required/>
                <FI label="Phone" name="phone" value={formData.phone} onChange={e=>setFormData(p=>({...p,phone:e.target.value}))} placeholder="Phone number"/>
                <FI label={editingUser?'Password (blank = keep)':'Password'} type="password" name="password" value={formData.password} onChange={e=>setFormData(p=>({...p,password:e.target.value}))} placeholder={editingUser?'New password':'Min 6 chars'} required={!editingUser} minLength={6}/>

                {/* Role selection */}
                <div style={{marginBottom:16}}>
                  <label className="us-label">Role <span style={{color:'#6366f1'}}>*</span></label>
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:8}}>
                    {allowedRoles.map(role=>{
                      const rc=gR(role);
                      return(
                        <label key={role} style={{
                          display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:12,cursor:'pointer',
                          background:formData.role===role?`${rc.c}12`:'rgba(255,255,255,.03)',
                          border:`1.5px solid ${formData.role===role?`${rc.c}40`:'rgba(255,255,255,.07)'}`,
                          transition:'all .2s',
                        }}>
                          <input type="radio" name="role" value={role} checked={formData.role===role} onChange={e=>setFormData(p=>({...p,role:e.target.value}))} style={{display:'none'}}/>
                          <span style={{fontSize:22}}>{rc.icon}</span>
                          <div>
                            <p style={{margin:0,fontWeight:700,fontSize:13,color:formData.role===role?rc.c:'rgba(255,255,255,.6)'}}>{rc.l}</p>
                            <p style={{margin:0,fontSize:10,color:'rgba(255,255,255,.3)'}}>{rc.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Branch */}
                {(currentUser?.role==='SUPER_ADMIN'||branches.length>0)&&(
                  <div style={{marginBottom:4}}>
                    <label className="us-label">Branch</label>
                    <select className="us-select" value={formData.branchId} onChange={e=>setFormData(p=>({...p,branchId:e.target.value}))} disabled={currentUser?.role!=='SUPER_ADMIN'}>
                      <option value="">Select Branch</option>
                      {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <MF onCancel={()=>{setShowModal(false);resetForm()}} submitting={submitting} label={editingUser?'Update User':'Create User'} grad="linear-gradient(135deg,#6366f1,#4f46e5)" glow="rgba(99,102,241,.3)"/>
            </form>
          </div>
        </Ovl>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal&&deletingUser&&(
        <Ovl onClose={()=>{setShowDeleteModal(false);setDeletingUser(null)}}>
          <div style={{maxWidth:400,width:'100%',background:'rgba(15,23,42,.97)',borderRadius:20,border:'1px solid rgba(255,255,255,.06)',padding:28,textAlign:'center'}}>
            <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(239,68,68,.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:26}}>⚠️</div>
            <h3 style={{margin:'0 0 6px',fontSize:17,fontWeight:800,color:'white'}}>Delete User</h3>
            <p style={{margin:'0 0 20px',fontSize:13,color:'rgba(255,255,255,.45)'}}>
              Delete <span style={{color:'#fca5a5',fontWeight:700}}>{deletingUser.name}</span>? This will deactivate their account.
            </p>
            <div style={{display:'flex',gap:10}}>
              <UBtn onClick={()=>{setShowDeleteModal(false);setDeletingUser(null)}} label="Cancel" outline color="rgba(255,255,255,.4)" style={{flex:1}}/>
              <button onClick={()=>handleDelete(false)} disabled={submitting} className="us-btn" style={{
                flex:1,padding:'10px 0',borderRadius:12,background:'linear-gradient(135deg,#ef4444,#dc2626)',
                border:'none',color:'white',fontSize:13,fontWeight:700,opacity:submitting?.6:1,
                display:'flex',alignItems:'center',justifyContent:'center',gap:6,
              }}>{submitting&&<Spin/>}Deactivate</button>
            </div>
            {currentUser?.role==='SUPER_ADMIN'&&(
              <button onClick={()=>handleDelete(true)} disabled={submitting} className="us-btn" style={{
                width:'100%',marginTop:10,padding:'8px 0',borderRadius:10,
                background:'transparent',border:'1px solid rgba(239,68,68,.2)',
                color:'#fca5a5',fontSize:11,fontWeight:600,opacity:submitting?.5:1,
              }}>Permanently delete (cannot be undone)</button>
            )}
          </div>
        </Ovl>
      )}
    </>
  );
}

// ─── SHARED ───
function Ovl({children,onClose}){return<div className="us-overlay" onClick={onClose} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.65)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}><div className="us-modal" onClick={e=>e.stopPropagation()}>{children}</div></div>}
function MH({grad,title,sub,onClose}){return<div style={{padding:'18px 22px',background:grad,borderRadius:'20px 20px 0 0',position:'relative',overflow:'hidden'}}><div style={{position:'absolute',top:-30,right:-30,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,.1)',pointerEvents:'none'}}/><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',zIndex:1}}><div><h2 style={{margin:0,fontSize:17,fontWeight:800,color:'white'}}>{title}</h2><p style={{margin:'3px 0 0',fontSize:12,color:'rgba(255,255,255,.7)'}}>{sub}</p></div><CBtn onClick={onClose}/></div></div>}
function MF({onCancel,submitting,label,grad,glow}){return<div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:22,paddingTop:18,borderTop:'1px solid rgba(255,255,255,.06)'}}><UBtn onClick={onCancel} label="Cancel" outline color="rgba(255,255,255,.4)" disabled={submitting}/><button type="submit" disabled={submitting} className="us-btn" style={{padding:'10px 22px',borderRadius:12,background:grad,border:'none',color:'white',fontSize:13,fontWeight:700,opacity:submitting?.5:1,display:'flex',alignItems:'center',gap:8,boxShadow:`0 4px 14px ${glow}`}}>{submitting&&<Spin/>}{label}</button></div>}
function Badge({l,icon,c,bg,bd}){return<span style={{display:'inline-flex',alignItems:'center',gap:3,padding:'3px 10px',borderRadius:14,background:bg,border:`1px solid ${bd}`,color:c,fontSize:11,fontWeight:700,whiteSpace:'nowrap',marginTop:4}}>{icon} {l}</span>}
function UBtn({onClick,label,icon,grad,glow,outline,color,disabled,full,style={}}){return<button onClick={onClick} disabled={disabled} className="us-btn" style={{padding:'10px 20px',borderRadius:12,fontSize:13,fontWeight:700,background:outline?'transparent':(grad||'rgba(255,255,255,.06)'),border:outline?`1px solid ${color||'rgba(255,255,255,.15)'}`:'none',color:outline?(color||'rgba(255,255,255,.6)'):'white',boxShadow:glow?`0 4px 14px ${glow}`:'none',opacity:disabled?.5:1,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,width:full?'100%':'auto',...style}}>{icon&&<span>{icon}</span>}{label}</button>}
function FI({label,type='text',name,value,onChange,placeholder,required,disabled,minLength}){return<div style={{marginBottom:16}}><label className="us-label">{label} {required&&<span style={{color:'#6366f1'}}>*</span>}</label><input className="us-input" type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} disabled={disabled} minLength={minLength}/></div>}
function TBtn({onClick,icon,hc}){const[h,setH]=useState(false);return<button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{width:32,height:32,borderRadius:8,border:'none',background:h?`${hc}18`:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,transition:'all .2s',transform:h?'scale(1.1)':'scale(1)'}}>{icon}</button>}
function CBtn({onClick}){return<button onClick={onClick} style={{width:30,height:30,borderRadius:9,background:'rgba(255,255,255,.14)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg style={{width:15,height:15,color:'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg></button>}
function Spin(){return<div style={{width:15,height:15,border:'2px solid rgba(255,255,255,.2)',borderTopColor:'white',borderRadius:'50%',animation:'usSpin .6s linear infinite',flexShrink:0}}/>}
function Loader({text}){return<div style={{display:'flex',justifyContent:'center',padding:'80px 20px'}}><div style={{textAlign:'center'}}><div style={{width:44,height:44,margin:'0 auto 14px',border:'3px solid rgba(255,255,255,.1)',borderTopColor:'#6366f1',borderRadius:'50%',animation:'usSpin .8s linear infinite'}}/><p style={{color:'rgba(255,255,255,.4)',fontSize:14,fontWeight:500}}>{text}</p></div></div>}
function Empty({icon,title,sub,showBtn,onBtn,btnLabel}){return<div className="us-glass" style={{padding:'60px 24px',textAlign:'center',animation:'usScaleIn .5s ease'}}><div style={{width:72,height:72,borderRadius:22,background:'rgba(99,102,241,.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:32,animation:'usFloat 3s ease-in-out infinite'}}>{icon}</div><h3 style={{margin:'0 0 8px',fontSize:18,fontWeight:700,color:'white'}}>{title}</h3><p style={{margin:'0 0 24px',fontSize:14,color:'rgba(255,255,255,.4)'}}>{sub}</p>{showBtn&&<UBtn onClick={onBtn} label={btnLabel} grad="linear-gradient(135deg,#6366f1,#4f46e5)" glow="rgba(99,102,241,.35)"/>}</div>}