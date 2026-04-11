// src/app/(dashboard)/reports/page.js
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

const CSS = `
  @keyframes rpSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes rpScaleIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
  @keyframes rpSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes rpBarFill{from{width:0}to{width:var(--w)}}
  @keyframes rpShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
  .rp-glass{background:rgba(255,255,255,.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.07);border-radius:18px;transition:all .3s cubic-bezier(.4,0,.2,1)}
  .rp-glass:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.11)}
  .rp-card:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(0,0,0,.3)}
  .rp-btn{transition:all .22s ease;cursor:pointer}
  .rp-btn:hover{transform:translateY(-1px)}
  .rp-btn:active{transform:translateY(0) scale(.98)}
  .rp-select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:10px 14px;color:white;font-size:14px;outline:none;appearance:none;cursor:pointer;transition:all .22s ease}
  .rp-select option{background:#1a1f35;color:white}
  .rp-select:focus{border-color:rgba(59,130,246,.5);box-shadow:0 0 0 3px rgba(59,130,246,.12)}
  .rp-skeleton{background:linear-gradient(90deg,rgba(255,255,255,.03) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.03) 75%);background-size:800px 100%;animation:rpShimmer 1.5s infinite;border-radius:12px}
  @media(max-width:768px){.rp-card:hover{transform:none}}
`;

export default function ReportsPage() {
  const [data, setData] = useState({
    totalRevenue:0,totalCost:0,totalProfit:0,totalInvoices:0,paidInvoices:0,
    pendingInvoices:0,totalJobs:0,completedJobs:0,activeJobs:0,totalCustomers:0,
    totalEmployees:0,outstandingAmount:0,paidRevenue:0,
  });
  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [exporting, setExporting] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [rawData, setRawData] = useState({customers:[],jobs:[],invoices:[],users:[]});

  useEffect(()=>{const c=()=>setIsMobile(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c)},[]);

  const fetchData = useCallback(async () => {
    try {
      if (!initial) setLoading(false);
      const [cR,jR,iR,uR]=await Promise.all([fetch('/api/customers'),fetch('/api/jobs'),fetch('/api/invoices'),fetch('/api/users')]);
      const [cD,jD,iD,uD]=await Promise.all([cR.json(),jR.json(),iR.json(),uR.json()]);
      const customers=cD.data||[],jobs=jD.data||[],invoices=iD.data||[],users=uD.data||[];
      setRawData({customers,jobs,invoices,users});

      const now=new Date();
      const filter=(items)=>{
        if(dateRange==='all')return items;
        return items.filter(item=>{
          const d=new Date(item.createdAt);
          if(dateRange==='month')return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
          if(dateRange==='quarter'){const q=Math.floor(now.getMonth()/3);return Math.floor(d.getMonth()/3)===q&&d.getFullYear()===now.getFullYear()}
          if(dateRange==='year')return d.getFullYear()===now.getFullYear();
          return true;
        });
      };

      const fInv=filter(invoices),fJobs=filter(jobs);
      const rev=fInv.reduce((s,i)=>s+(i.total||0),0);
      const paid=fInv.filter(i=>i.status==='PAID');
      const paidRev=paid.reduce((s,i)=>s+(i.total||0),0);
      const pending=fInv.filter(i=>i.status!=='PAID').length;
      const outstanding=fInv.filter(i=>i.status!=='PAID').reduce((s,i)=>s+((i.total||0)-(i.amountPaid||0)),0);
      const completed=fJobs.filter(j=>j.status==='COMPLETED').length;
      const active=fJobs.filter(j=>['PENDING','IN_PROGRESS'].includes(j.status)).length;
      const cost=fJobs.reduce((s,j)=>s+(j.actualCost||0),0);
      const emps=users.filter(u=>u.role==='EMPLOYEE'||u.role==='STAFF').length;

      setData({totalRevenue:rev,totalCost:cost,totalProfit:rev-cost,totalInvoices:fInv.length,paidInvoices:paid.length,pendingInvoices:pending,totalJobs:fJobs.length,completedJobs:completed,activeJobs:active,totalCustomers:customers.length,totalEmployees:emps,outstandingAmount:outstanding,paidRevenue:paidRev});
    } catch{toast.error('Failed to load')}
    finally{setLoading(false);setInitial(false)}
  },[dateRange,initial]);

  useEffect(()=>{fetchData()},[fetchData]);

  // ─── Export functions (keep light theme for PDF/print on paper) ───
  const exportCSV=()=>{
    setExporting('csv');
    try{
      const label={month:'This Month',quarter:'This Quarter',year:'This Year',all:'All Time'}[dateRange];
      let csv=`BUSINESS REPORT\nGenerated: ${new Date().toLocaleDateString('en-IN')}\nPeriod: ${label}\n\nFINANCIAL SUMMARY\nMetric,Value\nTotal Revenue,₹${data.totalRevenue.toLocaleString('en-IN')}\nTotal Cost,₹${data.totalCost.toLocaleString('en-IN')}\nNet Profit,₹${data.totalProfit.toLocaleString('en-IN')}\nProfit Margin,${data.totalRevenue>0?((data.totalProfit/data.totalRevenue)*100).toFixed(2):0}%\n\nINVOICES\nTotal,${data.totalInvoices}\nPaid,${data.paidInvoices}\nPending,${data.pendingInvoices}\nOutstanding,₹${data.outstandingAmount.toLocaleString('en-IN')}\n\nJOBS\nTotal,${data.totalJobs}\nCompleted,${data.completedJobs}\nActive,${data.activeJobs}\n\nTEAM\nCustomers,${data.totalCustomers}\nEmployees,${data.totalEmployees}\n`;
      if(rawData.invoices.length){csv+='\nINVOICE LIST\nInvoice,Customer,Amount,Status,Date\n';rawData.invoices.forEach(i=>{csv+=`${i.invoiceNumber||i.id},${i.customer?.name||'N/A'},₹${(i.total||0).toLocaleString('en-IN')},${i.status},${new Date(i.createdAt).toLocaleDateString('en-IN')}\n`})}
      const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`report_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;document.body.appendChild(link);link.click();document.body.removeChild(link);
      toast.success('CSV exported!');
    }catch{toast.error('Export failed')}finally{setExporting(null)}
  };

  const exportPDF=()=>{
    setExporting('pdf');
    try{
      const label={month:'This Month',quarter:'This Quarter',year:'This Year',all:'All Time'}[dateRange];
      const w=window.open('','_blank');if(!w){toast.error('Allow popups');setExporting(null);return}
      w.document.write(`<!DOCTYPE html><html><head><title>Report - ${label}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:40px;color:#333;line-height:1.6}.hdr{text-align:center;margin-bottom:40px;padding-bottom:20px;border-bottom:3px solid #3b82f6}.hdr h1{color:#1e40af;font-size:28px;margin-bottom:10px}.hdr p{color:#6b7280;font-size:14px}.sb{background:linear-gradient(135deg,#3b82f6,#1e40af);color:white;padding:25px;border-radius:12px;margin-bottom:30px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.sb .si{text-align:center}.sb .si .sl{font-size:12px;opacity:.9;margin-bottom:5px}.sb .si .sv{font-size:22px;font-weight:bold}.sec{margin-bottom:30px}.sec h2{font-size:18px;color:#1e40af;margin-bottom:15px;padding-bottom:8px;border-bottom:2px solid #e5e7eb}.mg{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.mc{background:#f9fafb;padding:20px;border-radius:8px;border-left:4px solid #3b82f6}.mc.g{border-left-color:#10b981}.mc.r{border-left-color:#ef4444}.mc.y{border-left-color:#f59e0b}.mc.p{border-left-color:#8b5cf6}.ml{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}.mv{font-size:24px;font-weight:bold;color:#111827;margin:8px 0}.ms{font-size:11px;color:#9ca3af}table{width:100%;border-collapse:collapse;margin-top:15px;font-size:12px}th,td{padding:12px;text-align:left;border-bottom:1px solid #e5e7eb}th{background:#f3f4f6;font-weight:600;color:#374151}.ft{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px}@media print{body{padding:20px}}</style></head><body>
      <div class="hdr"><h1>📊 Business Report</h1><p>Period: ${label} | ${new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p></div>
      <div class="sb"><div class="si"><div class="sl">Revenue</div><div class="sv">₹${data.totalRevenue.toLocaleString('en-IN')}</div></div><div class="si"><div class="sl">Profit</div><div class="sv">₹${data.totalProfit.toLocaleString('en-IN')}</div></div><div class="si"><div class="sl">Jobs Done</div><div class="sv">${data.completedJobs}/${data.totalJobs}</div></div><div class="si"><div class="sl">Collection</div><div class="sv">${data.totalInvoices>0?((data.paidInvoices/data.totalInvoices)*100).toFixed(0):0}%</div></div></div>
      <div class="sec"><h2>💰 Financial</h2><div class="mg"><div class="mc g"><div class="ml">Revenue</div><div class="mv">₹${data.totalRevenue.toLocaleString('en-IN')}</div></div><div class="mc r"><div class="ml">Cost</div><div class="mv">₹${data.totalCost.toLocaleString('en-IN')}</div></div><div class="mc ${data.totalProfit>=0?'g':'r'}"><div class="ml">Profit</div><div class="mv">₹${data.totalProfit.toLocaleString('en-IN')}</div><div class="ms">Margin: ${data.totalRevenue>0?((data.totalProfit/data.totalRevenue)*100).toFixed(2):0}%</div></div></div></div>
      <div class="sec"><h2>📄 Invoices</h2><div class="mg"><div class="mc"><div class="ml">Total</div><div class="mv">${data.totalInvoices}</div></div><div class="mc g"><div class="ml">Paid</div><div class="mv">${data.paidInvoices}</div></div><div class="mc y"><div class="ml">Pending</div><div class="mv">${data.pendingInvoices}</div><div class="ms">₹${data.outstandingAmount.toLocaleString('en-IN')} outstanding</div></div></div></div>
      <div class="sec"><h2>⚙️ Jobs</h2><div class="mg"><div class="mc"><div class="ml">Total</div><div class="mv">${data.totalJobs}</div></div><div class="mc g"><div class="ml">Completed</div><div class="mv">${data.completedJobs}</div></div><div class="mc p"><div class="ml">Active</div><div class="mv">${data.activeJobs}</div></div></div></div>
      ${rawData.invoices.length?`<div class="sec"><h2>📋 Recent Invoices</h2><table><thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>${rawData.invoices.slice(0,10).map(i=>`<tr><td>${i.invoiceNumber||i.id}</td><td>${i.customer?.name||'N/A'}</td><td>₹${(i.total||0).toLocaleString('en-IN')}</td><td>${i.status}</td><td>${new Date(i.createdAt).toLocaleDateString('en-IN')}</td></tr>`).join('')}</tbody></table></div>`:''}
      <div class="ft"><p>Auto-generated | © ${new Date().getFullYear()}</p></div></body></html>`);
      w.document.close();w.onload=()=>setTimeout(()=>w.print(),250);
      toast.success('PDF ready!');
    }catch{toast.error('Failed')}finally{setExporting(null)}
  };

  const emailReport=()=>{
    setExporting('email');
    try{
      const label={month:'This Month',quarter:'This Quarter',year:'This Year',all:'All Time'}[dateRange];
      const subject=encodeURIComponent(`Business Report - ${label}`);
      const body=encodeURIComponent(`Business Report\nPeriod: ${label}\n\nRevenue: ₹${data.totalRevenue.toLocaleString('en-IN')}\nProfit: ₹${data.totalProfit.toLocaleString('en-IN')}\nInvoices: ${data.paidInvoices}/${data.totalInvoices} paid\nJobs: ${data.completedJobs}/${data.totalJobs} completed\nCustomers: ${data.totalCustomers}\n`);
      window.location.href=`mailto:?subject=${subject}&body=${body}`;
      toast.success('Email opened!');
    }catch{toast.error('Failed')}finally{setTimeout(()=>setExporting(null),1000)}
  };

  const profitMargin=data.totalRevenue>0?(data.totalProfit/data.totalRevenue)*100:0;
  const collectionRate=data.totalInvoices>0?(data.paidInvoices/data.totalInvoices)*100:0;
  const completionRate=data.totalJobs>0?(data.completedJobs/data.totalJobs)*100:0;

  const SECTIONS=[
    {title:'💰 Financial Summary',cards:[
      {l:'Total Revenue',v:`₹${data.totalRevenue.toLocaleString('en-IN')}`,icon:'💵',c:'#10b981',sub:`From ${data.totalInvoices} invoices`},
      {l:'Total Cost',v:`₹${data.totalCost.toLocaleString('en-IN')}`,icon:'💳',c:'#ef4444',sub:'Operational expenses'},
      {l:'Net Profit',v:`₹${data.totalProfit.toLocaleString('en-IN')}`,icon:'📈',c:data.totalProfit>=0?'#10b981':'#ef4444',sub:`Margin: ${profitMargin.toFixed(2)}%`},
    ],bar:{pct:Math.max(0,Math.min(100,profitMargin)),label:'Profit Margin',c:data.totalProfit>=0?'#10b981':'#ef4444'}},
    {title:'📄 Invoice Status',cards:[
      {l:'Total Invoices',v:data.totalInvoices,icon:'📋',c:'#3b82f6'},
      {l:'Paid Invoices',v:data.paidInvoices,icon:'✅',c:'#10b981',sub:`${collectionRate.toFixed(0)}% collected`},
      {l:'Pending',v:data.pendingInvoices,icon:'⏳',c:'#f59e0b',sub:`₹${data.outstandingAmount.toLocaleString('en-IN')} outstanding`},
    ],bar:{pct:collectionRate,label:'Collection Progress',c:'#10b981'}},
    {title:'⚙️ Job Statistics',cards:[
      {l:'Total Jobs',v:data.totalJobs,icon:'🛠️',c:'#3b82f6'},
      {l:'Completed',v:data.completedJobs,icon:'✅',c:'#10b981',sub:`${completionRate.toFixed(0)}% rate`},
      {l:'Active',v:data.activeJobs,icon:'⚡',c:'#8b5cf6'},
    ],bar:{pct:completionRate,label:'Job Completion',c:'#3b82f6'}},
  ];

  return(
    <>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>

      <div style={{minHeight:'100vh'}}>
        {/* HEADER */}
        <div style={{display:'flex',flexDirection:isMobile?'column':'row',justifyContent:'space-between',alignItems:isMobile?'flex-start':'center',gap:14,marginBottom:28,animation:'rpSlideUp .5s ease'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
              <span style={{fontSize:26}}>📊</span>
              <h1 style={{margin:0,fontSize:'clamp(1.3rem,4vw,1.7rem)',fontWeight:800,color:'white',letterSpacing:'-.5px'}}>Reports & Analytics</h1>
            </div>
            <p style={{margin:0,fontSize:13,color:'rgba(255,255,255,.4)',fontWeight:500}}>Track business performance</p>
          </div>
          <select className="rp-select" value={dateRange} onChange={e=>setDateRange(e.target.value)} disabled={loading&&initial} style={{minWidth:160}}>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* SUMMARY BANNER */}
        {!initial&&(
          <div style={{padding:isMobile?18:24,borderRadius:18,background:'linear-gradient(135deg,rgba(59,130,246,.15),rgba(99,102,241,.1))',border:'1px solid rgba(59,130,246,.2)',marginBottom:28,animation:'rpSlideUp .5s ease .1s backwards'}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:isMobile?14:20}}>
              {[
                {l:'Revenue',v:`₹${data.totalRevenue.toLocaleString('en-IN')}`},
                {l:'Profit',v:`₹${data.totalProfit.toLocaleString('en-IN')}`},
                {l:'Jobs Done',v:`${data.completedJobs}/${data.totalJobs}`},
                {l:'Collection',v:`${collectionRate.toFixed(0)}%`},
              ].map(s=>(
                <div key={s.l} style={{textAlign:'center'}}>
                  <p style={{margin:'0 0 4px',fontSize:11,color:'rgba(255,255,255,.45)',fontWeight:600}}>{s.l}</p>
                  <p style={{margin:0,fontSize:isMobile?18:22,fontWeight:800,color:'white'}}>{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTIONS */}
        {SECTIONS.map((sec,si)=>(
          <div key={sec.title} style={{marginBottom:28}}>
            <h2 style={{margin:'0 0 14px',fontSize:17,fontWeight:800,color:'white',display:'flex',alignItems:'center',gap:8,animation:`rpSlideUp .5s ease ${.15+si*.1}s backwards`}}>{sec.title}</h2>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':`repeat(${sec.cards.length},1fr)`,gap:12}}>
              {(loading&&initial)?Array(sec.cards.length).fill(0).map((_,i)=>(
                <div key={i} className="rp-glass" style={{padding:20}}>
                  <div className="rp-skeleton" style={{height:14,width:80,marginBottom:12}}/>
                  <div className="rp-skeleton" style={{height:28,width:120,marginBottom:8}}/>
                  <div className="rp-skeleton" style={{height:10,width:100}}/>
                </div>
              )):sec.cards.map((card,ci)=>(
                <div key={card.l} className="rp-glass rp-card" style={{padding:isMobile?16:20,animation:`rpSlideUp .5s ease ${.2+si*.1+ci*.06}s backwards`,cursor:'default',borderLeft:`3px solid ${card.c}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                      <p style={{margin:0,fontSize:10,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.7px'}}>{card.l}</p>
                      <p style={{margin:'6px 0 0',fontSize:'clamp(1.2rem,2.5vw,1.6rem)',fontWeight:800,color:'white'}}>{card.v}</p>
                      {card.sub&&<p style={{margin:'4px 0 0',fontSize:11,color:'rgba(255,255,255,.35)'}}>{card.sub}</p>}
                    </div>
                    <span style={{fontSize:24}}>{card.icon}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            {!initial&&sec.bar&&data.totalRevenue!==undefined&&(
              <div className="rp-glass" style={{padding:14,marginTop:10}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'rgba(255,255,255,.45)',marginBottom:6}}>
                  <span>{sec.bar.label}</span>
                  <span>{sec.bar.pct.toFixed(0)}%</span>
                </div>
                <div style={{height:6,borderRadius:3,background:'rgba(255,255,255,.08)',overflow:'hidden'}}>
                  <div style={{'--w':`${sec.bar.pct}%`,width:0,height:'100%',borderRadius:3,background:sec.bar.c,animation:'rpBarFill 1.2s ease forwards',animationDelay:'.3s'}}/>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* TEAM */}
        <div style={{marginBottom:28}}>
          <h2 style={{margin:'0 0 14px',fontSize:17,fontWeight:800,color:'white',display:'flex',alignItems:'center',gap:8}}>👥 Team Overview</h2>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12}}>
            {(loading&&initial)?Array(2).fill(0).map((_,i)=>(
              <div key={i} className="rp-glass" style={{padding:20}}><div className="rp-skeleton" style={{height:14,width:100,marginBottom:12}}/><div className="rp-skeleton" style={{height:28,width:60}}/></div>
            )):[
              {l:'Total Customers',v:data.totalCustomers,icon:'🧑‍💼',c:'#3b82f6'},
              {l:'Total Employees',v:data.totalEmployees,icon:'👨‍💼',c:'#10b981'},
            ].map(card=>(
              <div key={card.l} className="rp-glass rp-card" style={{padding:isMobile?16:20,cursor:'default',borderLeft:`3px solid ${card.c}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <p style={{margin:0,fontSize:10,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.7px'}}>{card.l}</p>
                    <p style={{margin:'6px 0 0',fontSize:'clamp(1.3rem,2.5vw,1.6rem)',fontWeight:800,color:'white'}}>{card.v}</p>
                  </div>
                  <span style={{fontSize:28}}>{card.icon}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EXPORT */}
        <div className="rp-glass" style={{padding:isMobile?18:22}}>
          <h3 style={{margin:'0 0 14px',fontSize:15,fontWeight:800,color:'white',display:'flex',alignItems:'center',gap:8}}>📥 Export Reports</h3>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {[
              {key:'csv',icon:'📊',label:'Export CSV',onClick:exportCSV,grad:'linear-gradient(135deg,#3b82f6,#1d4ed8)',glow:'rgba(59,130,246,.3)'},
              {key:'pdf',icon:'📄',label:'Export PDF',onClick:exportPDF,grad:'linear-gradient(135deg,#10b981,#059669)',glow:'rgba(16,185,129,.3)'},
              {key:'email',icon:'📧',label:'Email',onClick:emailReport,outline:true},
              {key:'print',icon:'🖨️',label:'Print',onClick:exportPDF,outline:true},
            ].map(btn=>(
              <button key={btn.key} onClick={btn.onClick} disabled={exporting!=null||(loading&&initial)} className="rp-btn" style={{
                padding:'10px 18px',borderRadius:12,fontSize:13,fontWeight:700,
                background:btn.outline?'rgba(255,255,255,.04)':(btn.grad||'rgba(255,255,255,.06)'),
                border:btn.outline?'1px solid rgba(255,255,255,.12)':'none',
                color:btn.outline?'rgba(255,255,255,.6)':'white',
                boxShadow:btn.glow?`0 4px 14px ${btn.glow}`:'none',
                opacity:(exporting!=null||(loading&&initial))?.5:1,
                display:'inline-flex',alignItems:'center',gap:8,
              }}>
                {exporting===btn.key?<div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.2)',borderTopColor:'white',borderRadius:'50%',animation:'rpSpin .6s linear infinite'}}/>:<span>{btn.icon}</span>}
                {btn.label}
              </button>
            ))}
          </div>
          <p style={{margin:'12px 0 0',fontSize:12,color:'rgba(255,255,255,.3)'}}>💡 PDF export creates a formatted report for printing</p>
        </div>
      </div>
    </>
  );
}