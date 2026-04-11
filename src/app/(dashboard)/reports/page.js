'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

// Skeleton component for loading states
const SkeletonCard = () => (
  <div className="card border-l-4 border-gray-200 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
    </div>
  </div>
);

// Animated metric card with smooth transitions
const MetricCard = ({ 
  title, 
  value, 
  icon, 
  color, 
  subtext, 
  delay = 0,
  isVisible = true 
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, delay]);

  return (
    <div 
      className={`card border-l-4 ${color} transform transition-all duration-500 ease-out ${
        show 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      } hover:shadow-lg hover:-translate-y-1`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2 transition-all duration-300">
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-gray-500 mt-1 transition-opacity duration-300">
              {subtext}
            </p>
          )}
        </div>
        <span className="text-3xl transform transition-transform duration-300 hover:scale-110">
          {icon}
        </span>
      </div>
    </div>
  );
};

// Progress bar component
const ProgressBar = ({ 
  percentage, 
  color = 'bg-blue-500',
  label 
}) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{label}</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

export default function ReportsPage() {
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    totalJobs: 0,
    completedJobs: 0,
    activeJobs: 0,
    totalCustomers: 0,
    totalEmployees: 0,
    outstandingAmount: 0,
    paidRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [exporting, setExporting] = useState(null);
  const reportRef = useRef(null);
  const [rawData, setRawData] = useState({
    customers: [],
    jobs: [],
    invoices: [],
    users: []
  });

  const fetchReportData = useCallback(async () => {
    try {
      if (!initialLoad) {
        setLoading(false);
      }

      const [customersRes, jobsRes, invoicesRes, usersRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/jobs'),
        fetch('/api/invoices'),
        fetch('/api/users'),
      ]);

      const [customers, jobs, invoices, users] = await Promise.all([
        customersRes.json(),
        jobsRes.json(),
        invoicesRes.json(),
        usersRes.json(),
      ]);

      const customersData = customers.data || [];
      const jobsData = jobs.data || [];
      const invoicesData = invoices.data || [];
      const usersData = users.data || [];

      // Store raw data for exports
      setRawData({
        customers: customersData,
        jobs: jobsData,
        invoices: invoicesData,
        users: usersData,
      });

      // Filter by date range
      const now = new Date();
      const filterByDate = (items, dateField = 'createdAt') => {
        if (dateRange === 'all') return items;
        
        return items.filter(item => {
          const itemDate = new Date(item[dateField]);
          switch (dateRange) {
            case 'month':
              return itemDate.getMonth() === now.getMonth() && 
                     itemDate.getFullYear() === now.getFullYear();
            case 'quarter':
              const quarter = Math.floor(now.getMonth() / 3);
              const itemQuarter = Math.floor(itemDate.getMonth() / 3);
              return itemQuarter === quarter && 
                     itemDate.getFullYear() === now.getFullYear();
            case 'year':
              return itemDate.getFullYear() === now.getFullYear();
            default:
              return true;
          }
        });
      };

      const filteredInvoices = filterByDate(invoicesData);
      const filteredJobs = filterByDate(jobsData);

      const totalRev = filteredInvoices.reduce(
        (sum, inv) => sum + (inv.total || inv.totalAmount || 0), 
        0
      );
      
      const paidInvoices = filteredInvoices.filter(
        inv => inv.status === 'PAID' || inv.paymentStatus === 'PAID'
      );
      const paidCount = paidInvoices.length;
      const paidRevenue = paidInvoices.reduce(
        (sum, inv) => sum + (inv.total || inv.totalAmount || 0),
        0
      );
      
      const pendingCount = filteredInvoices.filter(
        inv => inv.status !== 'PAID' && inv.paymentStatus !== 'PAID'
      ).length;

      const outstandingAmount = filteredInvoices
        .filter(inv => inv.status !== 'PAID' && inv.paymentStatus !== 'PAID')
        .reduce((sum, inv) => 
          sum + ((inv.total || inv.totalAmount || 0) - (inv.amountPaid || 0)), 
          0
        );

      const completedJobsCount = filteredJobs.filter(
        j => j.status === 'COMPLETED'
      ).length;
      const activeJobsCount = filteredJobs.filter(
        j => ['PENDING', 'IN_PROGRESS'].includes(j.status)
      ).length;
      const employeeCount = usersData.filter(
        u => u.role === 'EMPLOYEE' || u.role === 'STAFF'
      ).length;

      const totalCost = filteredJobs.reduce(
        (sum, j) => sum + (j.actualCost || 0), 
        0
      );

      setReportData({
        totalRevenue: totalRev,
        totalCost: totalCost,
        totalProfit: totalRev - totalCost,
        totalInvoices: filteredInvoices.length,
        paidInvoices: paidCount,
        pendingInvoices: pendingCount,
        totalJobs: filteredJobs.length,
        completedJobs: completedJobsCount,
        activeJobs: activeJobsCount,
        totalCustomers: customersData.length,
        totalEmployees: employeeCount,
        outstandingAmount: outstandingAmount,
        paidRevenue: paidRevenue,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [dateRange, initialLoad]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Export to CSV
  const exportToCSV = () => {
    setExporting('csv');
    
    try {
      const dateRangeLabel = {
        month: 'This Month',
        quarter: 'This Quarter',
        year: 'This Year',
        all: 'All Time'
      }[dateRange];

      let csvContent = 'BUSINESS REPORT\n';
      csvContent += `Generated: ${new Date().toLocaleDateString('en-IN')}\n`;
      csvContent += `Period: ${dateRangeLabel}\n\n`;

      csvContent += 'FINANCIAL SUMMARY\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Revenue,₹${reportData.totalRevenue.toLocaleString('en-IN')}\n`;
      csvContent += `Total Cost,₹${reportData.totalCost.toLocaleString('en-IN')}\n`;
      csvContent += `Net Profit,₹${reportData.totalProfit.toLocaleString('en-IN')}\n`;
      csvContent += `Profit Margin,${reportData.totalRevenue > 0 ? ((reportData.totalProfit / reportData.totalRevenue) * 100).toFixed(2) : 0}%\n\n`;

      csvContent += 'INVOICE SUMMARY\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Invoices,${reportData.totalInvoices}\n`;
      csvContent += `Paid Invoices,${reportData.paidInvoices}\n`;
      csvContent += `Pending Invoices,${reportData.pendingInvoices}\n`;
      csvContent += `Outstanding Amount,₹${reportData.outstandingAmount.toLocaleString('en-IN')}\n\n`;

      csvContent += 'JOB SUMMARY\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Jobs,${reportData.totalJobs}\n`;
      csvContent += `Completed Jobs,${reportData.completedJobs}\n`;
      csvContent += `Active Jobs,${reportData.activeJobs}\n`;
      csvContent += `Completion Rate,${reportData.totalJobs > 0 ? ((reportData.completedJobs / reportData.totalJobs) * 100).toFixed(0) : 0}%\n\n`;

      csvContent += 'TEAM SUMMARY\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Customers,${reportData.totalCustomers}\n`;
      csvContent += `Total Employees,${reportData.totalEmployees}\n\n`;

      if (rawData.invoices.length > 0) {
        csvContent += 'DETAILED INVOICE LIST\n';
        csvContent += 'Invoice Number,Customer,Amount,Status,Date\n';
        rawData.invoices.forEach(inv => {
          csvContent += `${inv.invoiceNumber || inv.id},${inv.customer?.name || 'N/A'},₹${(inv.total || inv.totalAmount || 0).toLocaleString('en-IN')},${inv.status || inv.paymentStatus},${new Date(inv.createdAt).toLocaleDateString('en-IN')}\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `business_report_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(null);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    setExporting('pdf');
    
    try {
      const dateRangeLabel = {
        month: 'This Month',
        quarter: 'This Quarter',
        year: 'This Year',
        all: 'All Time'
      }[dateRange];

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to export PDF');
        setExporting(null);
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Business Report - ${dateRangeLabel}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 40px; 
              color: #333;
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              padding-bottom: 20px; 
              border-bottom: 3px solid #3b82f6; 
            }
            .header h1 { 
              color: #1e40af; 
              font-size: 28px; 
              margin-bottom: 10px; 
            }
            .header p { 
              color: #6b7280; 
              font-size: 14px; 
            }
            .section { 
              margin-bottom: 30px; 
              page-break-inside: avoid;
            }
            .section-title { 
              font-size: 18px; 
              color: #1e40af; 
              margin-bottom: 15px; 
              padding-bottom: 8px;
              border-bottom: 2px solid #e5e7eb;
            }
            .metrics-grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 15px; 
            }
            .metric-card { 
              background: #f9fafb; 
              padding: 20px; 
              border-radius: 8px; 
              border-left: 4px solid #3b82f6;
            }
            .metric-card.green { border-left-color: #10b981; }
            .metric-card.red { border-left-color: #ef4444; }
            .metric-card.yellow { border-left-color: #f59e0b; }
            .metric-card.purple { border-left-color: #8b5cf6; }
            .metric-label { 
              font-size: 12px; 
              color: #6b7280; 
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .metric-value { 
              font-size: 24px; 
              font-weight: bold; 
              color: #111827; 
              margin: 8px 0;
            }
            .metric-subtext { 
              font-size: 11px; 
              color: #9ca3af; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 15px;
              font-size: 12px;
            }
            th, td { 
              padding: 12px; 
              text-align: left; 
              border-bottom: 1px solid #e5e7eb; 
            }
            th { 
              background: #f3f4f6; 
              font-weight: 600;
              color: #374151;
            }
            tr:hover { background: #f9fafb; }
            .status-paid { color: #10b981; font-weight: 600; }
            .status-pending { color: #f59e0b; font-weight: 600; }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px; 
              border-top: 1px solid #e5e7eb; 
              text-align: center; 
              color: #9ca3af; 
              font-size: 12px; 
            }
            .summary-box {
              background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
              color: white;
              padding: 25px;
              border-radius: 12px;
              margin-bottom: 30px;
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
            }
            .summary-item { text-align: center; }
            .summary-item .label { font-size: 12px; opacity: 0.9; margin-bottom: 5px; }
            .summary-item .value { font-size: 22px; font-weight: bold; }
            @media print {
              body { padding: 20px; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Business Performance Report</h1>
            <p>Period: ${dateRangeLabel} | Generated: ${new Date().toLocaleDateString('en-IN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>

          <div class="summary-box">
            <div class="summary-item">
              <div class="label">Total Revenue</div>
              <div class="value">₹${reportData.totalRevenue.toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-item">
              <div class="label">Net Profit</div>
              <div class="value">₹${reportData.totalProfit.toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-item">
              <div class="label">Jobs Completed</div>
              <div class="value">${reportData.completedJobs}/${reportData.totalJobs}</div>
            </div>
            <div class="summary-item">
              <div class="label">Collection Rate</div>
              <div class="value">${reportData.totalInvoices > 0 ? ((reportData.paidInvoices / reportData.totalInvoices) * 100).toFixed(0) : 0}%</div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">💰 Financial Summary</h2>
            <div class="metrics-grid">
              <div class="metric-card green">
                <div class="metric-label">Total Revenue</div>
                <div class="metric-value">₹${reportData.totalRevenue.toLocaleString('en-IN')}</div>
                <div class="metric-subtext">From ${reportData.totalInvoices} invoices</div>
              </div>
              <div class="metric-card red">
                <div class="metric-label">Total Cost</div>
                <div class="metric-value">₹${reportData.totalCost.toLocaleString('en-IN')}</div>
                <div class="metric-subtext">Operational expenses</div>
              </div>
              <div class="metric-card ${reportData.totalProfit >= 0 ? 'green' : 'red'}">
                <div class="metric-label">Net Profit</div>
                <div class="metric-value">₹${reportData.totalProfit.toLocaleString('en-IN')}</div>
                <div class="metric-subtext">Margin: ${reportData.totalRevenue > 0 ? ((reportData.totalProfit / reportData.totalRevenue) * 100).toFixed(2) : 0}%</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">📄 Invoice Status</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Total Invoices</div>
                <div class="metric-value">${reportData.totalInvoices}</div>
              </div>
              <div class="metric-card green">
                <div class="metric-label">Paid Invoices</div>
                <div class="metric-value">${reportData.paidInvoices}</div>
                <div class="metric-subtext">${reportData.totalInvoices > 0 ? ((reportData.paidInvoices / reportData.totalInvoices) * 100).toFixed(0) : 0}% collected</div>
              </div>
              <div class="metric-card yellow">
                <div class="metric-label">Pending Invoices</div>
                <div class="metric-value">${reportData.pendingInvoices}</div>
                <div class="metric-subtext">₹${reportData.outstandingAmount.toLocaleString('en-IN')} outstanding</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">⚙️ Job Statistics</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Total Jobs</div>
                <div class="metric-value">${reportData.totalJobs}</div>
              </div>
              <div class="metric-card green">
                <div class="metric-label">Completed Jobs</div>
                <div class="metric-value">${reportData.completedJobs}</div>
                <div class="metric-subtext">${reportData.totalJobs > 0 ? ((reportData.completedJobs / reportData.totalJobs) * 100).toFixed(0) : 0}% completion rate</div>
              </div>
              <div class="metric-card purple">
                <div class="metric-label">Active Jobs</div>
                <div class="metric-value">${reportData.activeJobs}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">👥 Team Overview</h2>
            <div class="metrics-grid" style="grid-template-columns: repeat(2, 1fr);">
              <div class="metric-card">
                <div class="metric-label">Total Customers</div>
                <div class="metric-value">${reportData.totalCustomers}</div>
              </div>
              <div class="metric-card green">
                <div class="metric-label">Total Employees</div>
                <div class="metric-value">${reportData.totalEmployees}</div>
              </div>
            </div>
          </div>

          ${rawData.invoices.length > 0 ? `
          <div class="section">
            <h2 class="section-title">📋 Recent Invoices</h2>
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${rawData.invoices.slice(0, 10).map(inv => `
                  <tr>
                    <td>${inv.invoiceNumber || inv.id}</td>
                    <td>${inv.customer?.name || 'N/A'}</td>
                    <td>₹${(inv.total || inv.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td class="${(inv.status === 'PAID' || inv.paymentStatus === 'PAID') ? 'status-paid' : 'status-pending'}">
                      ${inv.status || inv.paymentStatus || 'N/A'}
                    </td>
                    <td>${new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${rawData.invoices.length > 10 ? `<p style="margin-top: 10px; color: #6b7280; font-size: 12px;">Showing 10 of ${rawData.invoices.length} invoices</p>` : ''}
          </div>
          ` : ''}

          <div class="footer">
            <p>This report was automatically generated by your Business Management System</p>
            <p>© ${new Date().getFullYear()} All rights reserved</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };

      toast.success('PDF ready for download!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(null);
    }
  };

  // Email Report
  const emailReport = () => {
    setExporting('email');
    
    try {
      const dateRangeLabel = {
        month: 'This Month',
        quarter: 'This Quarter',
        year: 'This Year',
        all: 'All Time'
      }[dateRange];

      const subject = encodeURIComponent(`Business Report - ${dateRangeLabel}`);
      const body = encodeURIComponent(`
Business Performance Report
Period: ${dateRangeLabel}
Generated: ${new Date().toLocaleDateString('en-IN')}

FINANCIAL SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Revenue: ₹${reportData.totalRevenue.toLocaleString('en-IN')}
Total Cost: ₹${reportData.totalCost.toLocaleString('en-IN')}
Net Profit: ₹${reportData.totalProfit.toLocaleString('en-IN')}
Profit Margin: ${reportData.totalRevenue > 0 ? ((reportData.totalProfit / reportData.totalRevenue) * 100).toFixed(2) : 0}%

INVOICE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Invoices: ${reportData.totalInvoices}
Paid Invoices: ${reportData.paidInvoices}
Pending Invoices: ${reportData.pendingInvoices}
Outstanding Amount: ₹${reportData.outstandingAmount.toLocaleString('en-IN')}

JOB STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Jobs: ${reportData.totalJobs}
Completed Jobs: ${reportData.completedJobs}
Active Jobs: ${reportData.activeJobs}
Completion Rate: ${reportData.totalJobs > 0 ? ((reportData.completedJobs / reportData.totalJobs) * 100).toFixed(0) : 0}%

TEAM OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Customers: ${reportData.totalCustomers}
Total Employees: ${reportData.totalEmployees}

---
This report was automatically generated.
      `);

      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      toast.success('Email client opened!');
    } catch (error) {
      console.error('Error preparing email:', error);
      toast.error('Failed to prepare email');
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  };

  // Print Report
  const printReport = () => {
    setExporting('print');
    exportToPDF();
  };

  // Render skeleton loaders
  const renderSkeletons = (count) => (
    <>
      {Array(count).fill(0).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );

  return (
    <div ref={reportRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Reports & Analytics
          </h1>
          <p className="text-gray-500 mt-1">
            Track your business performance and insights
          </p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="input-field max-w-xs transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          disabled={loading && initialLoad}
        >
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Quick Summary Banner */}
      {!initialLoad && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-8 text-white transition-all duration-500 hover:shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-blue-100 text-sm">Revenue</p>
              <p className="text-2xl font-bold">₹{reportData.totalRevenue.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-center">
              <p className="text-blue-100 text-sm">Profit</p>
              <p className="text-2xl font-bold">₹{reportData.totalProfit.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-center">
              <p className="text-blue-100 text-sm">Jobs Done</p>
              <p className="text-2xl font-bold">{reportData.completedJobs}/{reportData.totalJobs}</p>
            </div>
            <div className="text-center">
              <p className="text-blue-100 text-sm">Collection Rate</p>
              <p className="text-2xl font-bold">
                {reportData.totalInvoices > 0 
                  ? ((reportData.paidInvoices / reportData.totalInvoices) * 100).toFixed(0) 
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">💰</span> Financial Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading && initialLoad ? renderSkeletons(3) : (
            <>
              <MetricCard
                title="Total Revenue"
                value={`₹${reportData.totalRevenue.toLocaleString('en-IN')}`}
                icon="💵"
                color="border-green-500"
                delay={0}
              />
              <MetricCard
                title="Total Cost"
                value={`₹${reportData.totalCost.toLocaleString('en-IN')}`}
                icon="💳"
                color="border-red-500"
                delay={100}
              />
              <MetricCard
                title="Net Profit"
                value={`₹${reportData.totalProfit.toLocaleString('en-IN')}`}
                icon="📈"
                color={reportData.totalProfit >= 0 ? 'border-green-500' : 'border-red-500'}
                subtext={reportData.totalRevenue > 0 
                  ? `Margin: ${((reportData.totalProfit / reportData.totalRevenue) * 100).toFixed(2)}%` 
                  : 'No revenue yet'}
                delay={200}
              />
            </>
          )}
        </div>
        
        {/* Profit Margin Progress */}
        {!initialLoad && reportData.totalRevenue > 0 && (
          <div className="mt-4 card">
            <ProgressBar 
              percentage={Math.max(0, Math.min(100, (reportData.totalProfit / reportData.totalRevenue) * 100))}
              color={reportData.totalProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}
              label="Profit Margin"
            />
          </div>
        )}
      </div>

      {/* Invoices Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">📄</span> Invoice Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading && initialLoad ? renderSkeletons(3) : (
            <>
              <MetricCard
                title="Total Invoices"
                value={reportData.totalInvoices}
                icon="📋"
                color="border-blue-500"
                delay={300}
              />
              <MetricCard
                title="Paid Invoices"
                value={reportData.paidInvoices}
                icon="✅"
                color="border-green-500"
                subtext={reportData.totalInvoices > 0 
                  ? `${((reportData.paidInvoices / reportData.totalInvoices) * 100).toFixed(0)}% Collected` 
                  : 'No invoices yet'}
                delay={400}
              />
              <MetricCard
                title="Pending Invoices"
                value={reportData.pendingInvoices}
                icon="⏳"
                color="border-yellow-500"
                subtext={`₹${reportData.outstandingAmount.toLocaleString('en-IN')} Outstanding`}
                delay={500}
              />
            </>
          )}
        </div>
        
        {/* Collection Progress */}
        {!initialLoad && reportData.totalInvoices > 0 && (
          <div className="mt-4 card">
            <ProgressBar 
              percentage={(reportData.paidInvoices / reportData.totalInvoices) * 100}
              color="bg-green-500"
              label="Collection Progress"
            />
          </div>
        )}
      </div>

      {/* Jobs Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">⚙️</span> Job Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading && initialLoad ? renderSkeletons(3) : (
            <>
              <MetricCard
                title="Total Jobs"
                value={reportData.totalJobs}
                icon="🛠️"
                color="border-blue-500"
                delay={600}
              />
              <MetricCard
                title="Completed Jobs"
                value={reportData.completedJobs}
                icon="✅"
                color="border-green-500"
                subtext={reportData.totalJobs > 0 
                  ? `${((reportData.completedJobs / reportData.totalJobs) * 100).toFixed(0)}% Completion Rate` 
                  : 'No jobs yet'}
                delay={700}
              />
              <MetricCard
                title="Active Jobs"
                value={reportData.activeJobs}
                icon="⚡"
                color="border-purple-500"
                delay={800}
              />
            </>
          )}
        </div>
        
        {/* Job Completion Progress */}
        {!initialLoad && reportData.totalJobs > 0 && (
          <div className="mt-4 card">
            <ProgressBar 
              percentage={(reportData.completedJobs / reportData.totalJobs) * 100}
              color="bg-blue-500"
              label="Job Completion Rate"
            />
          </div>
        )}
      </div>

      {/* Team Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">👥</span> Team Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading && initialLoad ? renderSkeletons(2) : (
            <>
              <MetricCard
                title="Total Customers"
                value={reportData.totalCustomers}
                icon="🧑‍💼"
                color="border-blue-500"
                delay={900}
              />
              <MetricCard
                title="Total Employees"
                value={reportData.totalEmployees}
                icon="👨‍💼"
                color="border-green-500"
                delay={1000}
              />
            </>
          )}
        </div>
      </div>

      {/* Export Options */}
      <div className="card transition-all duration-300 hover:shadow-lg">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">📥</span> Export Reports
        </h3>
        <div className="flex flex-wrap gap-3">
          <button 
            className="btn btn-primary flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            onClick={exportToCSV}
            disabled={exporting !== null || (loading && initialLoad)}
          >
            {exporting === 'csv' ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <span>📊</span>
            )}
            Export to CSV
          </button>
          <button 
            className="btn btn-primary flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            onClick={exportToPDF}
            disabled={exporting !== null || (loading && initialLoad)}
          >
            {exporting === 'pdf' ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <span>📄</span>
            )}
            Export to PDF
          </button>
          <button 
            className="btn btn-secondary flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            onClick={emailReport}
            disabled={exporting !== null || (loading && initialLoad)}
          >
            {exporting === 'email' ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <span>📧</span>
            )}
            Email Report
          </button>
          <button 
            className="btn btn-secondary flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            onClick={printReport}
            disabled={exporting !== null || (loading && initialLoad)}
          >
            {exporting === 'print' ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <span>🖨️</span>
            )}
            Print Report
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          💡 Tip: Use PDF export for a professionally formatted report with charts and tables.
        </p>
      </div>
    </div>
  );
}