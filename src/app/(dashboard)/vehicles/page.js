// src/app/(dashboard)/vehicles/page.js
'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const CSS = `
  @keyframes vhSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes vhScaleIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
  @keyframes vhFadeIn{from{opacity:0}to{opacity:1}}
  @keyframes vhSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes vhFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  .vh-glass{background:rgba(255,255,255,.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.07);border-radius:18px;transition:all .3s cubic-bezier(.4,0,.2,1)}
  .vh-glass:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.11)}
  .vh-card-hover:hover{transform:translateY(-4px);box-shadow:0 20px 48px rgba(0,0,0,.35)}
  .vh-stat:hover{transform:translateY(-4px);box-shadow:0 20px 48px rgba(0,0,0,.35)}
  .vh-stat:hover .vh-stat-icon{transform:scale(1.12) rotate(6deg)}
  .vh-btn{transition:all .22s ease;cursor:pointer}
  .vh-btn:hover{transform:translateY(-1px)}
  .vh-overlay{animation:vhFadeIn .25s ease}
  .vh-modal{animation:vhScaleIn .3s cubic-bezier(.4,0,.2,1)}
  .vh-input{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 14px;color:white;font-size:14px;width:100%;outline:none;transition:all .22s ease;font-family:inherit}
  .vh-input::placeholder{color:rgba(255,255,255,.28)}
  .vh-input:focus{border-color:rgba(14,165,233,.5);background:rgba(255,255,255,.07);box-shadow:0 0 0 3px rgba(14,165,233,.12)}
  .vh-input:disabled{opacity:.5;cursor:not-allowed}
  .vh-select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 14px;color:white;font-size:14px;width:100%;outline:none;appearance:none;cursor:pointer;transition:all .22s ease}
  .vh-select option{background:#1a1f35;color:white}
  .vh-select:focus{border-color:rgba(14,165,233,.5);box-shadow:0 0 0 3px rgba(14,165,233,.12)}
  .vh-select:disabled{opacity:.5;cursor:not-allowed}
  .vh-label{display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.45);margin-bottom:6px;text-transform:uppercase;letter-spacing:.7px}
  .vh-search{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 14px 10px 40px;color:white;font-size:14px;width:100%;outline:none;transition:all .22s ease}
  .vh-search::placeholder{color:rgba(255,255,255,.28)}
  .vh-search:focus{border-color:rgba(14,165,233,.4);background:rgba(255,255,255,.07);box-shadow:0 0 0 3px rgba(14,165,233,.1)}
  .vh-plate{display:inline-block;padding:6px 14px;background:#fbbf24;color:#1f2937;border-radius:6px;font-weight:800;font-size:14px;font-family:monospace;letter-spacing:1px;border:2px solid rgba(0,0,0,.3)}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
  input[type=number]{-moz-appearance:textfield}
  @media(max-width:768px){.vh-card-hover:hover{transform:none}.vh-stat:hover{transform:none}.vh-stat:hover .vh-stat-icon{transform:none}}
`;

const FUELS=[{v:'PETROL',l:'⛽ Petrol',c:'#22c55e'},{v:'DIESEL',l:'🛢️ Diesel',c:'#eab308'},{v:'CNG',l:'💨 CNG',c:'#3b82f6'},{v:'LPG',l:'🔥 LPG',c:'#f97316'},{v:'ELECTRIC',l:'⚡ Electric',c:'#8b5cf6'},{v:'HYBRID',l:'🔋 Hybrid',c:'#06b6d4'},{v:'PETROL_CNG',l:'⛽💨 Petrol+CNG',c:'#10b981'},{v:'PETROL_LPG',l:'⛽🔥 Petrol+LPG',c:'#f59e0b'}];
const TRANS=[{v:'MANUAL',l:'🔧 Manual'},{v:'AUTOMATIC',l:'🅰️ Automatic'},{v:'CVT',l:'⚙️ CVT'},{v:'DCT',l:'🎯 DCT'},{v:'AMT',l:'🤖 AMT'},{v:'SEMI_AUTOMATIC',l:'🔀 Semi-Auto'}];
const CONDS=[{v:'EXCELLENT',l:'🌟 Excellent',c:'#22c55e'},{v:'GOOD',l:'✅ Good',c:'#3b82f6'},{v:'FAIR',l:'⚠️ Fair',c:'#f59e0b'},{v:'POOR',l:'🔴 Poor',c:'#ef4444'},{v:'NEEDS_ATTENTION',l:'🚨 Needs Attention',c:'#dc2626'}];
const MAKES=['Maruti Suzuki','Hyundai','Tata','Mahindra','Kia','Toyota','Honda','MG','Volkswagen','Skoda','Renault','Nissan','Ford','BMW','Mercedes-Benz','Audi','Other'];

const isExpiringSoon=d=>{if(!d)return false;const diff=Math.ceil((new Date(d)-new Date())/(1000*60*60*24));return diff<=30&&diff>0};
const isExpired=d=>d?new Date(d)<new Date():false;
const fmtOdo=v=>v?v.toLocaleString()+' km':'—';
const gFuel=v=>FUELS.find(f=>f.v===v);
const gCond=v=>CONDS.find(c=>c.v===v);
const gTrans=v=>TRANS.find(t=>t.v===v);

const AVATAR_GRADS=['linear-gradient(135deg,#6366f1,#4f46e5)','linear-gradient(135deg,#ec4899,#be185d)','linear-gradient(135deg,#3b82f6,#1d4ed8)','linear-gradient(135deg,#10b981,#059669)','linear-gradient(135deg,#f59e0b,#d97706)'];
const avatarGrad=n=>AVATAR_GRADS[(n?.charCodeAt(0)||0)%AVATAR_GRADS.length];
const initials=n=>n?n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2):'?';

export default function VehiclesPage() {
  const [vehicles,setVehicles]=useState([]);
  const [customers,setCustomers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [isMobile,setIsMobile]=useState(false);
  const [showModal,setShowModal]=useState(false);
  const [showViewModal,setShowViewModal]=useState(false);
  const [selectedVehicle,setSelectedVehicle]=useState(null);
  const [submitting,setSubmitting]=useState(false);
  const [search,setSearch]=useState('');
  const [filterFuel,setFilterFuel]=useState('');
  const [filterCond,setFilterCond]=useState('');
  const [deleteConfirm,setDeleteConfirm]=useState(null);
  const [editMode,setEditMode]=useState(false);

  const INIT_FORM={customerId:'',make:'',model:'',year:new Date().getFullYear(),variant:'',color:'',licensePlate:'',presentOdometer:'',fuelType:'PETROL',transmissionType:'MANUAL',engineCapacity:'',registrationDate:'',insuranceExpiry:'',insuranceCompany:'',insurancePolicyNo:'',pucExpiry:'',vehicleCondition:'GOOD',knownIssues:'',specialInstructions:'',customerNotes:'',internalNotes:''};
  const [formData,setFormData]=useState(INIT_FORM);

  useEffect(()=>{const c=()=>setIsMobile(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c)},[]);
  useEffect(()=>{fetchVehicles();fetchCustomers()},[]);

  const fetchVehicles=async()=>{try{setLoading(true);const r=await fetch('/api/vehicles');const d=await r.json();if(d.success)setVehicles(d.data||[])}catch{toast.error('Failed')}finally{setLoading(false)}};
  const fetchCustomers=async()=>{try{const r=await fetch('/api/customers');const d=await r.json();if(d.success)setCustomers(d.data||[])}catch{}};

  const resetForm=()=>{setFormData(INIT_FORM);setEditMode(false);setSelectedVehicle(null)};
  const handleChange=e=>setFormData(p=>({...p,[e.target.name]:e.target.value}));

  const handleSubmit=async e=>{e.preventDefault();setSubmitting(true);
    try{const url=editMode?`/api/vehicles/${selectedVehicle.id}`:'/api/vehicles';
    const r=await fetch(url,{method:editMode?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(formData)});const d=await r.json();
    if(!r.ok){toast.error(d.message||'Failed');return}toast.success(editMode?'Updated!':'Added!');resetForm();setShowModal(false);fetchVehicles()}
    catch{toast.error('Error')}finally{setSubmitting(false)}};

  const handleEdit=v=>{setFormData({customerId:v.customerId,make:v.make||'',model:v.model||'',year:v.year||new Date().getFullYear(),variant:v.variant||'',color:v.color||'',licensePlate:v.licensePlate||'',presentOdometer:v.presentOdometer||'',fuelType:v.fuelType||'PETROL',transmissionType:v.transmissionType||'MANUAL',engineCapacity:v.engineCapacity||'',registrationDate:v.registrationDate?v.registrationDate.split('T')[0]:'',insuranceExpiry:v.insuranceExpiry?v.insuranceExpiry.split('T')[0]:'',insuranceCompany:v.insuranceCompany||'',insurancePolicyNo:v.insurancePolicyNo||'',pucExpiry:v.pucExpiry?v.pucExpiry.split('T')[0]:'',vehicleCondition:v.vehicleCondition||'GOOD',knownIssues:v.knownIssues||'',specialInstructions:v.specialInstructions||'',customerNotes:v.customerNotes||'',internalNotes:v.internalNotes||''});setSelectedVehicle(v);setEditMode(true);setShowModal(true)};

  const handleDelete=async id=>{try{const r=await fetch(`/api/vehicles/${id}`,{method:'DELETE'});const d=await r.json();if(d.success){toast.success('Deleted');setDeleteConfirm(null);fetchVehicles()}else toast.error(d.message||'Failed')}catch{toast.error('Error')}};

  const filtered=vehicles.filter(v=>{
    const s=v.licensePlate?.toLowerCase().includes(search.toLowerCase())||v.make?.toLowerCase().includes(search.toLowerCase())||v.model?.toLowerCase().includes(search.toLowerCase())||v.customer?.name?.toLowerCase().includes(search.toLowerCase());
    return s&&(!filterFuel||v.fuelType===filterFuel)&&(!filterCond||v.vehicleCondition===filterCond);
  });

  const needsAttn=vehicles.filter(v=>v.vehicleCondition==='NEEDS_ATTENTION'||v.vehicleCondition==='POOR').length;
  const insAlert=vehicles.filter(v=>isExpiringSoon(v.insuranceExpiry)||isExpired(v.insuranceExpiry)).length;
  const avgOdo=vehicles.length?Math.round(vehicles.reduce((s,v)=>s+(v.presentOdometer||0),0)/vehicles.filter(v=>v.presentOdometer).length||0):0;

  const STATS=[
    {label:'Total Vehicles',v:vehicles.length,icon:'🚗',grad:'linear-gradient(135deg,#0ea5e9,#0284c7)'},
    {label:'Needs Attention',v:needsAttn,icon:'🔧',grad:'linear-gradient(135deg,#ef4444,#dc2626)'},
    {label:'Insurance Alert',v:insAlert,icon:'📋',grad:'linear-gradient(135deg,#f59e0b,#d97706)'},
    {label:'Avg Odometer',v:fmtOdo(avgOdo),icon:'📊',grad:'linear-gradient(135deg,#10b981,#059669)'},
  ];

  return(
    <>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      <div style={{minHeight:'100vh'}}>
        {/* HEADER */}
        <div style={{marginBottom:24,animation:'vhSlideUp .5s ease'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:14}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <span style={{fontSize:26}}>🚗</span>
                <h1 style={{margin:0,fontSize:'clamp(1.3rem,4vw,1.7rem)',fontWeight:800,color:'white',letterSpacing:'-.5px'}}>Vehicles</h1>
              </div>
              <p style={{margin:0,fontSize:13,color:'rgba(255,255,255,.4)',fontWeight:500}}>Manage vehicle database</p>
            </div>
            <VBtn onClick={()=>{resetForm();setShowModal(true)}} label="Add Vehicle" icon="➕" grad="linear-gradient(135deg,#0ea5e9,#0284c7)" glow="rgba(14,165,233,.35)" full={isMobile}/>
          </div>
        </div>

        {/* STATS */}
        <div style={{display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(min(100%,${isMobile?'140px':'180px'}),1fr))`,gap:isMobile?10:14,marginBottom:20}}>
          {STATS.map((s,i)=>(
            <div key={s.label} className="vh-glass vh-stat" style={{padding:isMobile?14:'clamp(14px,2vw,18px)',animation:`vhSlideUp .5s ease ${i*.08}s backwards`,cursor:'default'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                <div style={{minWidth:0}}>
                  <p style={{margin:0,fontSize:9.5,fontWeight:700,color:'rgba(255,255,255,.38)',textTransform:'uppercase',letterSpacing:'.7px'}}>{s.label}</p>
                  <p style={{margin:'5px 0 0',fontSize:isMobile?'1.1rem':'clamp(1.1rem,2.5vw,1.4rem)',fontWeight:800,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.v}</p>
                </div>
                <div className="vh-stat-icon" style={{width:isMobile?40:46,height:isMobile?40:46,borderRadius:12,background:s.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:isMobile?18:20,flexShrink:0,boxShadow:'0 6px 18px rgba(0,0,0,.25)',transition:'transform .3s ease'}}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div className="vh-glass" style={{padding:isMobile?14:16,marginBottom:20,animation:'vhSlideUp .5s ease .2s backwards'}}>
          <div style={{display:'flex',flexDirection:isMobile?'column':'row',gap:10,flexWrap:'wrap'}}>
            <div style={{flex:1,position:'relative',minWidth:0}}>
              <svg style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',width:16,height:16,color:'rgba(255,255,255,.3)',pointerEvents:'none'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input className="vh-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search plate, make, model, owner..."/>
            </div>
            <select className="vh-select" value={filterFuel} onChange={e=>setFilterFuel(e.target.value)} style={{minWidth:isMobile?'100%':150}}>
              <option value="">All Fuel</option>
              {FUELS.map(f=><option key={f.v} value={f.v}>{f.l}</option>)}
            </select>
            <select className="vh-select" value={filterCond} onChange={e=>setFilterCond(e.target.value)} style={{minWidth:isMobile?'100%':150}}>
              <option value="">All Conditions</option>
              {CONDS.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
        </div>

        {/* CONTENT */}
        {loading?<VLoader/>:filtered.length===0?(
          <div className="vh-glass" style={{padding:'60px 24px',textAlign:'center',animation:'vhScaleIn .5s ease'}}>
            <div style={{width:72,height:72,borderRadius:22,background:'rgba(14,165,233,.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:32,animation:'vhFloat 3s ease-in-out infinite'}}>🚗</div>
            <h3 style={{margin:'0 0 8px',fontSize:18,fontWeight:700,color:'white'}}>{(search||filterFuel||filterCond)?'No vehicles found':'No vehicles yet'}</h3>
            <p style={{margin:'0 0 24px',fontSize:14,color:'rgba(255,255,255,.4)'}}>{(search||filterFuel||filterCond)?'Try different filters':'Add your first vehicle'}</p>
            {!(search||filterFuel||filterCond)&&<VBtn onClick={()=>setShowModal(true)} label="Add Vehicle" grad="linear-gradient(135deg,#0ea5e9,#0284c7)" glow="rgba(14,165,233,.35)"/>}
          </div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:`repeat(auto-fill,minmax(min(100%,${isMobile?'100%':'340px'}),1fr))`,gap:14}}>
            {filtered.map((v,i)=>{
              const fuel=gFuel(v.fuelType),cond=gCond(v.vehicleCondition);
              const insA=isExpiringSoon(v.insuranceExpiry)||isExpired(v.insuranceExpiry);
              const pucA=isExpiringSoon(v.pucExpiry)||isExpired(v.pucExpiry);
              return(
                <div key={v.id} className="vh-glass vh-card-hover" style={{overflow:'hidden',animation:`vhSlideUp .4s ease ${i*.04}s backwards`}}>
                  {/* header */}
                  <div style={{padding:'16px 18px',background:'linear-gradient(135deg,rgba(14,165,233,.12),rgba(2,132,199,.06))'}}>
                    <div className="vh-plate">{v.licensePlate}</div>
                    <p style={{margin:'8px 0 2px',fontWeight:700,color:'white',fontSize:16}}>{v.make} {v.model}</p>
                    <p style={{margin:0,fontSize:12,color:'rgba(255,255,255,.5)'}}>{v.year} {v.variant&&`• ${v.variant}`} {v.color&&`• ${v.color}`}</p>
                  </div>

                  {/* body */}
                  <div style={{padding:'14px 18px'}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                      <div><p style={{margin:0,fontSize:10,color:'rgba(255,255,255,.35)',fontWeight:600}}>📊 Odometer</p><p style={{margin:'2px 0 0',fontWeight:700,color:'white',fontSize:13}}>{fmtOdo(v.presentOdometer)}</p></div>
                      <div><p style={{margin:0,fontSize:10,color:'rgba(255,255,255,.35)',fontWeight:600}}>⛽ Fuel</p><span style={{padding:'2px 8px',borderRadius:6,background:`${fuel?.c}15`,border:`1px solid ${fuel?.c}25`,color:fuel?.c,fontSize:11,fontWeight:700}}>{fuel?.l||v.fuelType}</span></div>
                      <div><p style={{margin:0,fontSize:10,color:'rgba(255,255,255,.35)',fontWeight:600}}>⚙️ Transmission</p><p style={{margin:'2px 0 0',fontWeight:600,color:'white',fontSize:12}}>{gTrans(v.transmissionType)?.l||v.transmissionType}</p></div>
                      <div><p style={{margin:0,fontSize:10,color:'rgba(255,255,255,.35)',fontWeight:600}}>🔧 Condition</p><span style={{padding:'2px 8px',borderRadius:6,background:`${cond?.c}15`,border:`1px solid ${cond?.c}25`,color:cond?.c,fontSize:11,fontWeight:700}}>{cond?.l||v.vehicleCondition}</span></div>
                    </div>

                    {/* alerts */}
                    {(insA||pucA)&&(
                      <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
                        {insA&&<div style={{padding:'8px 12px',borderRadius:10,background:isExpired(v.insuranceExpiry)?'rgba(239,68,68,.08)':'rgba(245,158,11,.08)',border:`1px solid ${isExpired(v.insuranceExpiry)?'rgba(239,68,68,.2)':'rgba(245,158,11,.2)'}`,color:isExpired(v.insuranceExpiry)?'#fca5a5':'#fcd34d',fontSize:11,fontWeight:600,display:'flex',justifyContent:'space-between'}}><span>{isExpired(v.insuranceExpiry)?'🚨 Insurance Expired':'⚠️ Insurance Expiring'}</span><span>{new Date(v.insuranceExpiry).toLocaleDateString()}</span></div>}
                        {pucA&&<div style={{padding:'8px 12px',borderRadius:10,background:isExpired(v.pucExpiry)?'rgba(239,68,68,.08)':'rgba(245,158,11,.08)',border:`1px solid ${isExpired(v.pucExpiry)?'rgba(239,68,68,.2)':'rgba(245,158,11,.2)'}`,color:isExpired(v.pucExpiry)?'#fca5a5':'#fcd34d',fontSize:11,fontWeight:600,display:'flex',justifyContent:'space-between'}}><span>{isExpired(v.pucExpiry)?'🚨 PUC Expired':'⚠️ PUC Expiring'}</span><span>{new Date(v.pucExpiry).toLocaleDateString()}</span></div>}
                      </div>
                    )}
                  </div>

                  {/* footer */}
                  <div style={{padding:'12px 18px',borderTop:'1px solid rgba(255,255,255,.05)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:32,height:32,borderRadius:9,background:avatarGrad(v.customer?.name),display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:800,fontSize:12,flexShrink:0}}>{initials(v.customer?.name)}</div>
                      <div><p style={{margin:0,fontWeight:600,color:'white',fontSize:12}}>{v.customer?.name}</p><p style={{margin:0,fontSize:10,color:'rgba(255,255,255,.35)'}}>{v.customer?.phone}</p></div>
                    </div>
                    <div style={{display:'flex',gap:4}}>
                      <VTBtn onClick={()=>{setSelectedVehicle(v);setShowViewModal(true)}} icon="👁️" hc="#0ea5e9"/>
                      <VTBtn onClick={()=>handleEdit(v)} icon="✏️" hc="#f59e0b"/>
                      <VTBtn onClick={()=>setDeleteConfirm(v.id)} icon="🗑️" hc="#ef4444"/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal&&(
        <VOvl onClose={()=>setShowModal(false)}>
          <div style={{maxWidth:700,width:'100%'}}>
            <VMH title={editMode?'✏️ Edit Vehicle':'🚗 Add Vehicle'} sub={editMode?'Update vehicle info':'Register new vehicle'} onClose={()=>setShowModal(false)}/>
            <form onSubmit={handleSubmit} style={{background:'rgba(15,23,42,.97)',borderRadius:'0 0 20px 20px',border:'1px solid rgba(255,255,255,.06)',borderTop:'none'}}>
              <div style={{padding:isMobile?20:24,maxHeight:'calc(72vh - 140px)',overflowY:'auto'}}>
                {/* Customer */}
                <Sec title="👤 Customer">
                  <div><label className="vh-label">Customer <span style={{color:'#0ea5e9'}}>*</span></label>
                  <select className="vh-select" name="customerId" value={formData.customerId} onChange={handleChange} required disabled={editMode}>
                    <option value="">Select Customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
                  </select></div>
                </Sec>

                {/* Basic */}
                <Sec title="🚗 Basic Info">
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:12}}>
                    <div><label className="vh-label">Make <span style={{color:'#0ea5e9'}}>*</span></label><select className="vh-select" name="make" value={formData.make} onChange={handleChange} required><option value="">Select</option>{MAKES.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
                    <div><label className="vh-label">Model <span style={{color:'#0ea5e9'}}>*</span></label><input className="vh-input" name="model" value={formData.model} onChange={handleChange} placeholder="Swift, i20..." required/></div>
                    <div><label className="vh-label">Year <span style={{color:'#0ea5e9'}}>*</span></label><input className="vh-input" type="number" name="year" value={formData.year} onChange={handleChange} min="1990" max={new Date().getFullYear()+1} required/></div>
                    <div><label className="vh-label">Variant</label><input className="vh-input" name="variant" value={formData.variant} onChange={handleChange} placeholder="LXI, VXI..."/></div>
                    <div><label className="vh-label">Color</label><input className="vh-input" name="color" value={formData.color} onChange={handleChange} placeholder="White, Silver..."/></div>
                    <div><label className="vh-label">License Plate <span style={{color:'#0ea5e9'}}>*</span></label><input className="vh-input" name="licensePlate" value={formData.licensePlate} onChange={handleChange} placeholder="MH 01 AB 1234" required style={{textTransform:'uppercase',fontFamily:'monospace',fontWeight:700}}/></div>
                  </div>
                </Sec>

                {/* Technical */}
                <Sec title="⚙️ Technical">
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:12}}>
                    <div><label className="vh-label">Odometer (km)</label><input className="vh-input" type="number" name="presentOdometer" value={formData.presentOdometer} onChange={handleChange} placeholder="45000" min="0"/></div>
                    <div><label className="vh-label">Fuel</label><select className="vh-select" name="fuelType" value={formData.fuelType} onChange={handleChange}>{FUELS.map(f=><option key={f.v} value={f.v}>{f.l}</option>)}</select></div>
                    <div><label className="vh-label">Transmission</label><select className="vh-select" name="transmissionType" value={formData.transmissionType} onChange={handleChange}>{TRANS.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
                    <div><label className="vh-label">Engine CC</label><input className="vh-input" type="number" name="engineCapacity" value={formData.engineCapacity} onChange={handleChange} placeholder="1197" min="0"/></div>
                    <div><label className="vh-label">Condition</label><select className="vh-select" name="vehicleCondition" value={formData.vehicleCondition} onChange={handleChange}>{CONDS.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}</select></div>
                  </div>
                </Sec>

                {/* Insurance */}
                <Sec title="📋 Registration & Insurance">
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:12}}>
                    <div><label className="vh-label">Registration Date</label><input className="vh-input" type="date" name="registrationDate" value={formData.registrationDate} onChange={handleChange}/></div>
                    <div><label className="vh-label">Insurance Company</label><input className="vh-input" name="insuranceCompany" value={formData.insuranceCompany} onChange={handleChange} placeholder="ICICI Lombard"/></div>
                    <div><label className="vh-label">Policy No</label><input className="vh-input" name="insurancePolicyNo" value={formData.insurancePolicyNo} onChange={handleChange} placeholder="Policy number"/></div>
                    <div><label className="vh-label">Insurance Expiry</label><input className="vh-input" type="date" name="insuranceExpiry" value={formData.insuranceExpiry} onChange={handleChange}/></div>
                    <div><label className="vh-label">PUC Expiry</label><input className="vh-input" type="date" name="pucExpiry" value={formData.pucExpiry} onChange={handleChange}/></div>
                  </div>
                </Sec>

                {/* Notes */}
                <Sec title="📝 Notes">
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12}}>
                    <div><label className="vh-label">Known Issues</label><textarea className="vh-input" name="knownIssues" value={formData.knownIssues} onChange={handleChange} rows={2} placeholder="Known problems..." style={{resize:'none'}}/></div>
                    <div><label className="vh-label">Special Instructions</label><textarea className="vh-input" name="specialInstructions" value={formData.specialInstructions} onChange={handleChange} rows={2} placeholder="Handling instructions..." style={{resize:'none'}}/></div>
                    <div><label className="vh-label">Customer Notes</label><textarea className="vh-input" name="customerNotes" value={formData.customerNotes} onChange={handleChange} rows={2} placeholder="From customer..." style={{resize:'none'}}/></div>
                    <div><label className="vh-label">Internal Notes</label><textarea className="vh-input" name="internalNotes" value={formData.internalNotes} onChange={handleChange} rows={2} placeholder="Staff only..." style={{resize:'none'}}/></div>
                  </div>
                </Sec>
              </div>

              <div style={{padding:'16px 24px',borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',gap:10,justifyContent:'flex-end'}}>
                <VBtn onClick={()=>setShowModal(false)} label="Cancel" outline color="rgba(255,255,255,.4)" disabled={submitting}/>
                <button type="submit" disabled={submitting} className="vh-btn" style={{padding:'10px 22px',borderRadius:12,background:'linear-gradient(135deg,#10b981,#059669)',border:'none',color:'white',fontSize:13,fontWeight:700,opacity:submitting?.5:1,display:'flex',alignItems:'center',gap:8,boxShadow:'0 4px 14px rgba(16,185,129,.3)'}}>
                  {submitting&&<VSpin/>}{editMode?'Update':'Add'} Vehicle
                </button>
              </div>
            </form>
          </div>
        </VOvl>
      )}

      {/* VIEW MODAL */}
      {showViewModal&&selectedVehicle&&(
        <VOvl onClose={()=>setShowViewModal(false)}>
          <div style={{maxWidth:580,width:'100%'}}>
            <div style={{padding:'18px 20px',background:'linear-gradient(135deg,rgba(14,165,233,.12),rgba(2,132,199,.06))',borderRadius:'20px 20px 0 0',border:'1px solid rgba(255,255,255,.08)',borderBottom:'none'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div className="vh-plate" style={{marginBottom:10}}>{selectedVehicle.licensePlate}</div>
                  <h2 style={{margin:'0 0 4px',fontSize:20,fontWeight:800,color:'white'}}>{selectedVehicle.make} {selectedVehicle.model}</h2>
                  <p style={{margin:0,fontSize:13,color:'rgba(255,255,255,.5)'}}>{selectedVehicle.year} {selectedVehicle.variant&&`• ${selectedVehicle.variant}`} {selectedVehicle.color&&`• ${selectedVehicle.color}`}</p>
                </div>
                <VCBtn onClick={()=>setShowViewModal(false)}/>
              </div>
            </div>
            <div style={{padding:isMobile?20:24,background:'rgba(15,23,42,.97)',borderRadius:'0 0 20px 20px',border:'1px solid rgba(255,255,255,.06)',borderTop:'none',maxHeight:'calc(72vh - 160px)',overflowY:'auto'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:18}}>
                {[
                  {l:'📊 Odometer',v:fmtOdo(selectedVehicle.presentOdometer)},
                  {l:'⛽ Fuel',v:gFuel(selectedVehicle.fuelType)?.l},
                  {l:'⚙️ Transmission',v:gTrans(selectedVehicle.transmissionType)?.l},
                  {l:'🔩 Engine',v:selectedVehicle.engineCapacity?`${selectedVehicle.engineCapacity} CC`:'—'},
                  {l:'🔧 Condition',v:gCond(selectedVehicle.vehicleCondition)?.l},
                  {l:'📅 Registered',v:selectedVehicle.registrationDate?new Date(selectedVehicle.registrationDate).toLocaleDateString():'—'},
                ].map(d=>(
                  <div key={d.l}><p style={{margin:'0 0 3px',fontSize:10,color:'rgba(255,255,255,.35)',fontWeight:600}}>{d.l}</p><p style={{margin:0,fontWeight:700,color:'white',fontSize:13}}>{d.v||'—'}</p></div>
                ))}
              </div>

              {/* Insurance */}
              <div style={{padding:14,borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',marginBottom:18}}>
                <p style={{margin:'0 0 10px',fontSize:10,color:'rgba(255,255,255,.35)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px'}}>📋 Insurance & Documents</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  {[
                    {l:'Company',v:selectedVehicle.insuranceCompany},
                    {l:'Policy No',v:selectedVehicle.insurancePolicyNo},
                    {l:'Insurance Expiry',v:selectedVehicle.insuranceExpiry?new Date(selectedVehicle.insuranceExpiry).toLocaleDateString():'—',alert:isExpired(selectedVehicle.insuranceExpiry)||isExpiringSoon(selectedVehicle.insuranceExpiry)},
                    {l:'PUC Expiry',v:selectedVehicle.pucExpiry?new Date(selectedVehicle.pucExpiry).toLocaleDateString():'—',alert:isExpired(selectedVehicle.pucExpiry)||isExpiringSoon(selectedVehicle.pucExpiry)},
                  ].map(d=>(
                    <div key={d.l}><p style={{margin:'0 0 3px',fontSize:10,color:'rgba(255,255,255,.35)',fontWeight:600}}>{d.l}</p><p style={{margin:0,fontWeight:600,color:d.alert?'#fca5a5':'white',fontSize:13}}>{d.v||'—'}</p></div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {(selectedVehicle.knownIssues||selectedVehicle.specialInstructions||selectedVehicle.customerNotes||selectedVehicle.internalNotes)&&(
                <div style={{padding:14,borderRadius:12,background:'rgba(245,158,11,.05)',border:'1px solid rgba(245,158,11,.12)',marginBottom:18}}>
                  <p style={{margin:'0 0 10px',fontSize:10,color:'rgba(255,255,255,.35)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px'}}>📝 Notes</p>
                  {[{l:'⚠️ Known Issues',v:selectedVehicle.knownIssues},{l:'📌 Instructions',v:selectedVehicle.specialInstructions},{l:'💬 Customer',v:selectedVehicle.customerNotes},{l:'🔒 Internal',v:selectedVehicle.internalNotes}].filter(n=>n.v).map(n=>(
                    <div key={n.l} style={{marginBottom:8}}><p style={{margin:'0 0 2px',fontSize:10,color:'rgba(255,255,255,.4)',fontWeight:600}}>{n.l}</p><p style={{margin:0,fontSize:12,color:'rgba(255,255,255,.6)',lineHeight:1.5}}>{n.v}</p></div>
                  ))}
                </div>
              )}

              {/* Owner */}
              <div style={{padding:14,borderRadius:12,background:'rgba(16,185,129,.06)',border:'1px solid rgba(16,185,129,.12)',display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:avatarGrad(selectedVehicle.customer?.name),display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:800,fontSize:16,flexShrink:0}}>{initials(selectedVehicle.customer?.name)}</div>
                <div><p style={{margin:0,fontWeight:700,color:'white',fontSize:14}}>{selectedVehicle.customer?.name}</p><p style={{margin:'2px 0 0',fontSize:12,color:'rgba(255,255,255,.4)'}}>📞 {selectedVehicle.customer?.phone}{selectedVehicle.customer?.email&&` • ✉️ ${selectedVehicle.customer.email}`}</p></div>
              </div>
            </div>
          </div>
        </VOvl>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm&&(
        <VOvl onClose={()=>setDeleteConfirm(null)}>
          <div style={{maxWidth:380,width:'100%',background:'rgba(15,23,42,.97)',borderRadius:20,border:'1px solid rgba(255,255,255,.06)',padding:28,textAlign:'center'}}>
            <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(239,68,68,.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:26}}>⚠️</div>
            <h3 style={{margin:'0 0 6px',fontSize:17,fontWeight:800,color:'white'}}>Delete Vehicle?</h3>
            <p style={{margin:'0 0 20px',fontSize:13,color:'rgba(255,255,255,.45)'}}>This cannot be undone.</p>
            <div style={{display:'flex',gap:10}}>
              <VBtn onClick={()=>setDeleteConfirm(null)} label="Cancel" outline color="rgba(255,255,255,.4)" style={{flex:1}}/>
              <button onClick={()=>handleDelete(deleteConfirm)} className="vh-btn" style={{flex:1,padding:'10px 0',borderRadius:12,background:'linear-gradient(135deg,#ef4444,#dc2626)',border:'none',color:'white',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>🗑️ Delete</button>
            </div>
          </div>
        </VOvl>
      )}
    </>
  );
}

// ─── SHARED ───
function VOvl({children,onClose}){return<div className="vh-overlay" onClick={onClose} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.65)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}><div className="vh-modal" onClick={e=>e.stopPropagation()}>{children}</div></div>}
function VMH({title,sub,onClose}){return<div style={{padding:'18px 22px',background:'linear-gradient(135deg,#0ea5e9,#0284c7)',borderRadius:'20px 20px 0 0',position:'relative',overflow:'hidden'}}><div style={{position:'absolute',top:-30,right:-30,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,.1)',pointerEvents:'none'}}/><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',zIndex:1}}><div><h2 style={{margin:0,fontSize:17,fontWeight:800,color:'white'}}>{title}</h2><p style={{margin:'3px 0 0',fontSize:12,color:'rgba(255,255,255,.7)'}}>{sub}</p></div><VCBtn onClick={onClose}/></div></div>}
function Sec({title,children}){return<div style={{marginBottom:20}}><h3 style={{margin:'0 0 12px',fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',gap:6}}>{title}</h3>{children}</div>}
function VBtn({onClick,label,icon,grad,glow,outline,color,disabled,full,style={}}){return<button onClick={onClick} disabled={disabled} className="vh-btn" style={{padding:'10px 20px',borderRadius:12,fontSize:13,fontWeight:700,background:outline?'transparent':(grad||'rgba(255,255,255,.06)'),border:outline?`1px solid ${color||'rgba(255,255,255,.15)'}`:'none',color:outline?(color||'rgba(255,255,255,.6)'):'white',boxShadow:glow?`0 4px 14px ${glow}`:'none',opacity:disabled?.5:1,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,width:full?'100%':'auto',...style}}>{icon&&<span>{icon}</span>}{label}</button>}
function VTBtn({onClick,icon,hc}){const[h,setH]=useState(false);return<button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{width:32,height:32,borderRadius:8,border:'none',background:h?`${hc}18`:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,transition:'all .2s',transform:h?'scale(1.1)':'scale(1)'}}>{icon}</button>}
function VCBtn({onClick}){return<button onClick={onClick} style={{width:30,height:30,borderRadius:9,background:'rgba(255,255,255,.14)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg style={{width:15,height:15,color:'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg></button>}
function VSpin(){return<div style={{width:15,height:15,border:'2px solid rgba(255,255,255,.2)',borderTopColor:'white',borderRadius:'50%',animation:'vhSpin .6s linear infinite',flexShrink:0}}/>}
function VLoader(){return<div style={{display:'flex',justifyContent:'center',padding:'80px 20px'}}><div style={{textAlign:'center'}}><div style={{width:44,height:44,margin:'0 auto 14px',border:'3px solid rgba(255,255,255,.1)',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'vhSpin .8s linear infinite'}}/><p style={{color:'rgba(255,255,255,.4)',fontSize:14,fontWeight:500}}>Loading vehicles...</p></div></div>}