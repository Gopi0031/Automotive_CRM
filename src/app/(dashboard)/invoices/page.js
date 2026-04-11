// src/app/(dashboard)/invoices/page.js
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  // Form data
  const [formData, setFormData] = useState({
    jobId: '',
    subtotal: '',
    tax: '',
    discount: '0',
    dueDate: '',
    notes: '',
    autoCalculate: true,
  });

  // Payment form
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'CASH',
    reference: '',
    notes: '',
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    overdue: 0,
    totalAmount: 0,
    pendingAmount: 0,
  });

  const printRef = useRef(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchInvoices();
    }
  }, [filters, currentUser]);

  const fetchInitialData = async () => {
    try {
      const jobsRes = await fetch('/api/jobs');
      const jobsData = await jobsRes.json();

      if (jobsData.success) {
        // Filter jobs without invoices
        setJobs(jobsData.data?.filter(j => !j.invoice && j.status !== 'CANCELLED') || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/invoices?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setInvoices(data.data || []);
        calculateStats(data.data || []);
      } else {
        toast.error(data.message || 'Failed to load invoices');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const calculateStats = (invoicesData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setStats({
      total: invoicesData.length,
      pending: invoicesData.filter(i => i.status === 'PENDING').length,
      paid: invoicesData.filter(i => i.status === 'PAID').length,
      overdue: invoicesData.filter(i => i.status === 'OVERDUE' || (i.status === 'PENDING' && new Date(i.dueDate) < today)).length,
      totalAmount: invoicesData.reduce((sum, i) => sum + (i.total || 0), 0),
      pendingAmount: invoicesData.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').reduce((sum, i) => sum + ((i.total || 0) - (i.amountPaid || 0)), 0),
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      startDate: '',
      endDate: '',
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      jobId: '',
      subtotal: '',
      tax: '',
      discount: '0',
      dueDate: '',
      notes: '',
      autoCalculate: true,
    });
    setSelectedJob(null);
  };

  const openCreateModal = () => {
    resetForm();
    fetchInitialData(); // Refresh available jobs
    setShowModal(true);
  };

  const openDetailModal = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: (invoice.total - invoice.amountPaid).toFixed(2),
      method: 'CASH',
      reference: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  // When job is selected, calculate amounts
  const handleJobSelect = (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    setSelectedJob(job);
    setFormData(prev => ({ ...prev, jobId }));

    if (job && formData.autoCalculate) {
      // Calculate from services and parts
      const servicesTotal = job.services?.reduce((sum, js) => {
        return sum + ((js.price || js.service?.basePrice || 0) * (js.quantity || 1));
      }, 0) || 0;

      const partsTotal = job.parts?.reduce((sum, jp) => {
        return sum + ((jp.price || jp.part?.sellingPrice || 0) * (jp.quantity || 1));
      }, 0) || 0;

      const subtotal = servicesTotal + partsTotal + (job.actualCost || job.estimatedCost || 0);
      const tax = subtotal * 0.18; // 18% GST

      setFormData(prev => ({
        ...prev,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
      }));
    }
  };


const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);

  try {
    // ✅ Parse values before sending
    const payload = {
      jobId: formData.jobId,
      subtotal: parseFloat(formData.subtotal) || 0,
      tax: parseFloat(formData.tax) || 0,
      discount: parseFloat(formData.discount) || 0,
      dueDate: formData.dueDate || null,
      notes: formData.notes || null,
    };

    console.log('📤 Sending invoice data:', payload);
    console.log('📊 Expected total:', payload.subtotal + payload.tax - payload.discount);

    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message || 'Failed to create invoice');
      return;
    }

    console.log('✅ Invoice created:', data.data);
    toast.success('Invoice created successfully');
    resetForm();
    setShowModal(false);
    fetchInvoices();
    fetchInitialData();
  } catch (error) {
    console.error('Error creating invoice:', error);
    toast.error('An error occurred');
  } finally {
    setSubmitting(false);
  }
};

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSubmitting(true);

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: parseFloat(paymentData.amount),
          method: paymentData.method,
          reference: paymentData.reference,
          notes: paymentData.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to record payment');
        return;
      }

      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentData({ amount: '', method: 'CASH', reference: '', notes: '' });
      fetchInvoices();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInvoice = async (invoice) => {
    if (!confirm(`Are you sure you want to cancel invoice ${invoice.invoiceNumber}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices?id=${invoice.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to cancel invoice');
        return;
      }

      toast.success('Invoice cancelled successfully');
      fetchInvoices();
      if (showDetailModal) {
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast.error('An error occurred');
    }
  };

  const printInvoice = (invoice) => {
    const printContent = generatePrintContent(invoice);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePrintContent = (invoice) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body { 
              font-family: 'Segoe UI', Arial, sans-serif;
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              position: relative;
              color: #1a202c;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            /* Background Image */
            .page-background {
              position: fixed;
              top: 0;
              left: 0;
              width: 210mm;
              height: 297mm;
              z-index: -1;
              background-image: url('/Gemini_Generated_Image_6o4spy6o4spy6o4s (1).png');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              opacity: 0.15;
            }
            
            /* Content wrapper */
            .content-wrapper {
              position: relative;
              z-index: 1;
              padding: 20mm 15mm;
              min-height: 297mm;
            }
            
            /* Header */
            .header {
              text-align: center;
              margin-bottom: 25px;
              padding-bottom: 20px;
              border-bottom: 3px solid #1a365d;
              position: relative;
            }
            
            .header::after {
              content: '';
              position: absolute;
              bottom: -3px;
              left: 30%;
              right: 30%;
              height: 3px;
              background: linear-gradient(90deg, #3182ce, #805ad5);
            }
            
            .company-logo {
              width: 80px;
              height: 80px;
              margin: 0 auto 12px;
              border-radius: 16px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 36px;
              color: white;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }
            
            .company-name {
              font-size: 28px;
              font-weight: 800;
              color: #1a365d;
              margin-bottom: 4px;
              letter-spacing: -0.5px;
            }
            
            .company-tagline {
              font-size: 12px;
              color: #718096;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 8px;
            }
            
            .company-contact {
              font-size: 12px;
              color: #4a5568;
            }
            
            /* Invoice Title Bar */
            .invoice-title-bar {
              background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
              color: white;
              padding: 14px 20px;
              border-radius: 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 25px;
              box-shadow: 0 4px 12px rgba(26, 54, 93, 0.2);
            }
            
            .invoice-title-bar h2 {
              font-size: 20px;
              font-weight: 700;
              letter-spacing: 1px;
            }
            
            .invoice-number {
              font-size: 16px;
              font-weight: 600;
              background: rgba(255,255,255,0.15);
              padding: 6px 14px;
              border-radius: 8px;
            }
            
            /* Info Sections */
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 25px;
            }
            
            .info-card {
              background: rgba(247, 250, 252, 0.9);
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
            }
            
            .info-card-header {
              font-size: 10px;
              font-weight: 700;
              color: #a0aec0;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            
            .info-card h3 {
              font-size: 16px;
              font-weight: 700;
              color: #1a202c;
              margin-bottom: 4px;
            }
            
            .info-card p {
              font-size: 13px;
              color: #4a5568;
              margin: 3px 0;
              line-height: 1.5;
            }
            
            /* Vehicle Info Bar */
            .vehicle-bar {
              background: linear-gradient(90deg, rgba(237, 242, 247, 0.9), rgba(226, 232, 240, 0.9));
              border-radius: 10px;
              padding: 12px 18px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 25px;
              border: 1px solid #e2e8f0;
            }
            
            .vehicle-bar span {
              font-size: 13px;
              color: #4a5568;
            }
            
            .vehicle-bar strong {
              color: #1a202c;
            }
            
            /* Table */
            table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin-bottom: 25px;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            
            thead th {
              background: linear-gradient(135deg, #2d3748 0%, #1a365d 100%);
              color: white;
              padding: 14px 16px;
              text-align: left;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            thead th:last-child {
              text-align: right;
            }
            
            tbody td {
              padding: 12px 16px;
              font-size: 13px;
              color: #2d3748;
              border-bottom: 1px solid #edf2f7;
              background: rgba(255,255,255,0.85);
            }
            
            tbody td:last-child {
              text-align: right;
              font-weight: 600;
            }
            
            tbody tr:last-child td {
              border-bottom: none;
            }
            
            tbody tr:nth-child(even) td {
              background: rgba(247, 250, 252, 0.85);
            }
            
            .item-name {
              font-weight: 600;
              color: #1a202c;
            }
            
            .item-type {
              display: inline-block;
              font-size: 10px;
              padding: 2px 8px;
              border-radius: 4px;
              font-weight: 600;
              margin-left: 8px;
            }
            
            .item-type-service {
              background: #ebf8ff;
              color: #2b6cb0;
            }
            
            .item-type-part {
              background: #faf5ff;
              color: #6b46c1;
            }
            
            /* Totals Section */
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 25px;
            }
            
            .totals-card {
              width: 320px;
              background: rgba(255,255,255,0.9);
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              overflow: hidden;
            }
            
            .totals-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 18px;
              font-size: 14px;
              border-bottom: 1px solid #f7fafc;
            }
            
            .totals-row:last-child {
              border-bottom: none;
            }
            
            .totals-row .label {
              color: #718096;
            }
            
            .totals-row .value {
              font-weight: 600;
              color: #2d3748;
            }
            
            .totals-row.discount .value {
              color: #e53e3e;
            }
            
            .totals-row.total {
              background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
              padding: 14px 18px;
            }
            
            .totals-row.total .label {
              color: rgba(255,255,255,0.85);
              font-weight: 600;
              font-size: 15px;
            }
            
            .totals-row.total .value {
              color: white;
              font-size: 20px;
              font-weight: 800;
            }
            
            .totals-row.paid .value {
              color: #38a169;
            }
            
            .totals-row.balance {
              background: #fff5f5;
            }
            
            .totals-row.balance .label {
              color: #c53030;
              font-weight: 600;
            }
            
            .totals-row.balance .value {
              color: #e53e3e;
              font-weight: 700;
              font-size: 16px;
            }
            
            /* Payment Status Badge */
            .status-badge {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 8px 16px;
              border-radius: 20px;
              font-weight: 700;
              font-size: 13px;
              margin-bottom: 20px;
            }
            
            .status-pending {
              background: #fefcbf;
              color: #d69e2e;
              border: 2px solid #ecc94b;
            }
            
            .status-paid {
              background: #c6f6d5;
              color: #276749;
              border: 2px solid #68d391;
            }
            
            .status-overdue {
              background: #fed7d7;
              color: #c53030;
              border: 2px solid #fc8181;
            }
            
            .status-partially_paid {
              background: #bee3f8;
              color: #2b6cb0;
              border: 2px solid #63b3ed;
            }
            
            .status-cancelled {
              background: #e2e8f0;
              color: #4a5568;
              border: 2px solid #a0aec0;
            }
            
            /* Notes Section */
            .notes-section {
              background: rgba(255, 255, 240, 0.9);
              border: 1px solid #fefcbf;
              border-radius: 10px;
              padding: 14px 18px;
              margin-bottom: 25px;
            }
            
            .notes-section h4 {
              font-size: 12px;
              font-weight: 700;
              color: #d69e2e;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
            }
            
            .notes-section p {
              font-size: 13px;
              color: #744210;
              line-height: 1.6;
            }
            
            /* Payment History */
            .payment-history {
              margin-bottom: 25px;
            }
            
            .payment-history h4 {
              font-size: 12px;
              font-weight: 700;
              color: #a0aec0;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            
            .payment-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 14px;
              background: rgba(240, 255, 244, 0.9);
              border: 1px solid #c6f6d5;
              border-radius: 8px;
              margin-bottom: 6px;
              font-size: 13px;
            }
            
            .payment-item .amount {
              font-weight: 700;
              color: #276749;
            }
            
            .payment-item .details {
              color: #718096;
            }
            
            /* Footer */
            .footer {
              margin-top: auto;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
            }
            
            .footer .terms {
              font-size: 11px;
              color: #718096;
              line-height: 1.6;
              margin-bottom: 12px;
              padding: 10px 20px;
              background: rgba(247, 250, 252, 0.9);
              border-radius: 8px;
            }
            
            .footer .thank-you {
              font-size: 16px;
              font-weight: 700;
              color: #2d3748;
              margin-bottom: 6px;
            }
            
            .footer .generated {
              font-size: 10px;
              color: #a0aec0;
            }
            
            .footer .signature-area {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
              padding: 0 40px;
            }
            
            .footer .signature-box {
              text-align: center;
              width: 180px;
            }
            
            .footer .signature-line {
              border-top: 1px solid #cbd5e0;
              margin-top: 50px;
              padding-top: 8px;
              font-size: 12px;
              color: #718096;
              font-weight: 600;
            }
            
            /* QR Code placeholder */
            .qr-section {
              display: flex;
              align-items: center;
              gap: 12px;
              background: rgba(247, 250, 252, 0.9);
              border: 1px dashed #cbd5e0;
              border-radius: 10px;
              padding: 12px 16px;
              margin-bottom: 25px;
            }
            
            .qr-placeholder {
              width: 60px;
              height: 60px;
              background: #e2e8f0;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              color: #a0aec0;
              text-align: center;
              flex-shrink: 0;
            }
            
            .qr-info {
              font-size: 12px;
              color: #718096;
            }
            
            .qr-info strong {
              display: block;
              color: #2d3748;
              margin-bottom: 2px;
            }
            
            /* Watermark */
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 80px;
              font-weight: 800;
              color: rgba(0,0,0,0.03);
              pointer-events: none;
              z-index: 0;
              white-space: nowrap;
              letter-spacing: 10px;
            }
            
            @media print {
              body { 
                padding: 0; 
                margin: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              .page-background {
                position: fixed;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              .content-wrapper {
                padding: 15mm 12mm;
              }
              
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <!-- Background Image -->
          <div class="page-background"></div>
          
          <!-- Watermark for cancelled invoices -->
          ${invoice.status === 'CANCELLED' ? '<div class="watermark">CANCELLED</div>' : ''}
          ${invoice.status === 'PAID' ? '<div class="watermark" style="color: rgba(56, 161, 105, 0.04);">PAID</div>' : ''}
          
          <div class="content-wrapper">
            <!-- Header -->
            <div class="header">
              <div class="company-logo">🚗</div>
              <div class="company-name">${invoice.branch?.name || 'AutoBill Pro'}</div>
              <div class="company-tagline">Automotive Service & Billing</div>
              <div class="company-contact">
                ${invoice.branch?.location ? `📍 ${invoice.branch.location}` : ''}
                ${invoice.branch?.phone ? ` | 📞 ${invoice.branch.phone}` : ''}
                ${invoice.branch?.email ? ` | ✉️ ${invoice.branch.email}` : ''}
              </div>
            </div>
            
            <!-- Invoice Title Bar -->
            <div class="invoice-title-bar">
              <h2>TAX INVOICE</h2>
              <span class="invoice-number">${invoice.invoiceNumber}</span>
            </div>
            
            <!-- Status Badge -->
            <div style="margin-bottom: 20px;">
              <span class="status-badge status-${invoice.status.toLowerCase()}">
                ${invoice.status === 'PAID' ? '✅' : invoice.status === 'PENDING' ? '⏳' : invoice.status === 'OVERDUE' ? '⚠️' : invoice.status === 'PARTIALLY_PAID' ? '💳' : '❌'} 
                ${invoice.status.replace('_', ' ')}
              </span>
            </div>
            
            <!-- Info Grid -->
            <div class="info-grid">
              <div class="info-card">
                <div class="info-card-header">📋 BILL TO</div>
                <h3>${invoice.customer?.name || 'N/A'}</h3>
                <p>📞 ${invoice.customer?.phone || 'N/A'}</p>
                ${invoice.customer?.email ? `<p>✉️ ${invoice.customer.email}</p>` : ''}
                ${invoice.customer?.address ? `<p>📍 ${invoice.customer.address}</p>` : ''}
              </div>
              <div class="info-card">
                <div class="info-card-header">📅 INVOICE DETAILS</div>
                <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p><strong>Due Date:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'On Receipt'}</p>
                <p><strong>Job #:</strong> ${invoice.job?.jobNumber || 'N/A'}</p>
              </div>
            </div>
            
            <!-- Vehicle Info Bar -->
            <div class="vehicle-bar">
              <span>🚗 <strong>${invoice.job?.vehicle?.licensePlate || 'N/A'}</strong></span>
              <span>${invoice.job?.vehicle?.make || ''} ${invoice.job?.vehicle?.model || ''} ${invoice.job?.vehicle?.year ? `(${invoice.job.vehicle.year})` : ''}</span>
              <span>${invoice.job?.vehicle?.color ? `Color: ${invoice.job.vehicle.color}` : ''}</span>
            </div>
            
            <!-- Items Table -->
            <table>
              <thead>
                <tr>
                  <th style="width: 8%">#</th>
                  <th style="width: 42%">Description</th>
                  <th style="width: 12%; text-align: center;">Qty</th>
                  <th style="width: 18%; text-align: right;">Rate (₹)</th>
                  <th style="width: 20%; text-align: right;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${(invoice.job?.services || []).map((s, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>
                      <span class="item-name">${s.service?.name || s.serviceName || 'Service'}</span>
                      <span class="item-type item-type-service">Service</span>
                      ${s.service?.description ? `<br><span style="font-size: 11px; color: #718096;">${s.service.description}</span>` : ''}
                    </td>
                    <td style="text-align: center;">${s.quantity || 1}</td>
                    <td style="text-align: right;">${(s.price || s.service?.basePrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style="text-align: right;">${((s.price || s.service?.basePrice || 0) * (s.quantity || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
                ${(invoice.job?.parts || []).map((p, i) => `
                  <tr>
                    <td>${(invoice.job?.services?.length || 0) + i + 1}</td>
                    <td>
                      <span class="item-name">${p.part?.name || p.partName || 'Part'}</span>
                      <span class="item-type item-type-part">Part</span>
                      ${p.part?.partNumber ? `<br><span style="font-size: 11px; color: #718096;">P/N: ${p.part.partNumber}</span>` : ''}
                    </td>
                    <td style="text-align: center;">${p.quantity || 1}</td>
                    <td style="text-align: right;">${(p.price || p.part?.sellingPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style="text-align: right;">${((p.price || p.part?.sellingPrice || 0) * (p.quantity || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
                ${(!invoice.job?.services?.length && !invoice.job?.parts?.length) ? `
                  <tr>
                    <td>1</td>
                    <td><span class="item-name">Service Charges</span></td>
                    <td style="text-align: center;">1</td>
                    <td style="text-align: right;">${(invoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style="text-align: right;">${(invoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
            
            <!-- Totals -->
            <div class="totals-section">
              <div class="totals-card">
                <div class="totals-row">
                  <span class="label">Subtotal</span>
                  <span class="value">₹${(invoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="totals-row">
                  <span class="label">Tax (GST 18%)</span>
                  <span class="value">₹${(invoice.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                ${(invoice.discount || 0) > 0 ? `
                  <div class="totals-row discount">
                    <span class="label">Discount</span>
                    <span class="value">-₹${(invoice.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ` : ''}
                <div class="totals-row total">
                  <span class="label">Grand Total</span>
                  <span class="value">₹${(invoice.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                ${(invoice.amountPaid || 0) > 0 ? `
                  <div class="totals-row paid">
                    <span class="label">Amount Paid</span>
                    <span class="value">₹${(invoice.amountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ` : ''}
                ${(invoice.total - (invoice.amountPaid || 0)) > 0 && invoice.status !== 'PAID' ? `
                  <div class="totals-row balance">
                    <span class="label">Balance Due</span>
                    <span class="value">₹${((invoice.total || 0) - (invoice.amountPaid || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ` : ''}
              </div>
            </div>
            
            <!-- Amount in Words -->
            <div style="background: rgba(235, 248, 255, 0.9); border: 1px solid #bee3f8; border-radius: 8px; padding: 10px 16px; margin-bottom: 25px; font-size: 13px;">
              <strong style="color: #2b6cb0;">Amount in Words:</strong>
              <span style="color: #2d3748;"> Rupees ${numberToWords(invoice.total || 0)} Only</span>
            </div>
            
            <!-- Payment History -->
            ${invoice.payments && invoice.payments.length > 0 ? `
              <div class="payment-history">
                <h4>💳 Payment History</h4>
                ${invoice.payments.map(payment => `
                  <div class="payment-item">
                    <div>
                      <span class="amount">₹${(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      <span class="details"> via ${payment.method || 'Cash'}${payment.reference ? ` (Ref: ${payment.reference})` : ''}</span>
                    </div>
                    <span class="details">${new Date(payment.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <!-- Notes -->
            ${invoice.notes ? `
              <div class="notes-section">
                <h4>📝 Notes</h4>
                <p>${invoice.notes}</p>
              </div>
            ` : ''}
            
            <!-- QR Section -->
            <div class="qr-section">
              <div class="qr-placeholder">Scan<br>to Pay</div>
              <div class="qr-info">
                <strong>Scan to Pay Online</strong>
                UPI: ${invoice.branch?.name?.toLowerCase().replace(/\s/g, '') || 'autobillpro'}@upi
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <div class="terms">
                ${invoice.termsConditions || 'Payment is due within 7 days of invoice date. Late payments may incur additional charges. All disputes are subject to local jurisdiction. Thank you for choosing our services!'}
              </div>
              
              <div class="signature-area">
                <div class="signature-box">
                  <div class="signature-line">Customer Signature</div>
                </div>
                <div class="signature-box">
                  <div class="signature-line">Authorized Signature</div>
                </div>
              </div>
              
              <div style="margin-top: 25px;">
                <div class="thank-you">Thank you for your business! 🙏</div>
                <div class="generated">
                  Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })} | AutoBill Pro - Automotive Billing System
                </div>
              </div>
            </div>
          </div>
          
          <script>
            // Number to words function
            function numberToWords(num) {
              // This is embedded in the HTML for the print page
            }
          </script>
        </body>
      </html>
    `;
  };

  // Number to words converter
  const numberToWords = (num) => {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                  'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const numStr = Math.floor(num).toString();
    
    if (numStr.length > 9) return 'Overflow';
    
    const padded = numStr.padStart(9, '0');
    const crore = parseInt(padded.substring(0, 2));
    const lakh = parseInt(padded.substring(2, 4));
    const thousand = parseInt(padded.substring(4, 6));
    const hundred = parseInt(padded.substring(6, 7));
    const remaining = parseInt(padded.substring(7, 9));
    
    let result = '';
    
    const twoDigitToWords = (n) => {
      if (n < 20) return ones[n];
      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    };
    
    if (crore > 0) result += twoDigitToWords(crore) + ' Crore ';
    if (lakh > 0) result += twoDigitToWords(lakh) + ' Lakh ';
    if (thousand > 0) result += twoDigitToWords(thousand) + ' Thousand ';
    if (hundred > 0) result += ones[hundred] + ' Hundred ';
    if (remaining > 0) {
      if (result) result += 'and ';
      result += twoDigitToWords(remaining);
    }
    
    return result.trim() || 'Zero';
  };

  // Status configuration
  const statusConfig = {
    PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '⏳' },
    PARTIALLY_PAID: { label: 'Partial', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '💳' },
    PAID: { label: 'Paid', color: 'bg-green-100 text-green-800 border-green-200', icon: '✅' },
    OVERDUE: { label: 'Overdue', color: 'bg-red-100 text-red-800 border-red-200', icon: '⚠️' },
    CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '❌' },
  };

  const paymentMethods = [
    { value: 'CASH', label: 'Cash', icon: '💵' },
    { value: 'CARD', label: 'Card', icon: '💳' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦' },
    { value: 'CHECK', label: 'Check', icon: '📄' },
    { value: 'MOBILE_MONEY', label: 'UPI/Mobile', icon: '📱' },
  ];

  const canManageInvoices = ['SUPER_ADMIN', 'MANAGER', 'CASHIER'].includes(currentUser?.role);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Invoices</h1>
              <p className="text-gray-500 mt-1 text-sm sm:text-base">
                Generate and manage billing invoices
              </p>
            </div>
            {canManageInvoices && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg shadow-green-500/25 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Generate Invoice</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Invoices</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">
                📄
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Amount</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
                  ₹{stats.totalAmount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center text-xl">
                💰
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1">
                  ₹{stats.pendingAmount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-xl">
                ⏳
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Overdue</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1">{stats.overdue}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl flex items-center justify-center text-xl">
                ⚠️
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search by invoice # or customer..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white min-w-[130px]"
              >
                <option value="">All Status</option>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>

              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                placeholder="Start Date"
              />

              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                placeholder="End Date"
              />

              {(filters.search || filters.status || filters.startDate || filters.endDate) && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Invoices List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-500 mt-4 font-medium">Loading invoices...</p>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
              📄
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500 mb-6">
              {filters.search || filters.status
                ? 'Try adjusting your filters.'
                : 'Generate your first invoice to get started.'}
            </p>
            {canManageInvoices && !filters.search && !filters.status && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Generate First Invoice
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vehicle</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.map((invoice) => {
                      const isOverdue = invoice.status === 'PENDING' && new Date(invoice.dueDate) < new Date();
                      const displayStatus = isOverdue ? 'OVERDUE' : invoice.status;
                      
                      return (
                        <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(invoice.createdAt).toLocaleDateString('en-IN')}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{invoice.customer?.name}</p>
                            <p className="text-sm text-gray-500">{invoice.customer?.phone}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{invoice.job?.vehicle?.licensePlate}</p>
                            <p className="text-sm text-gray-500">
                              {invoice.job?.vehicle?.make} {invoice.job?.vehicle?.model}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-900">₹{invoice.total?.toLocaleString('en-IN')}</p>
                            {invoice.amountPaid > 0 && invoice.amountPaid < invoice.total && (
                              <p className="text-xs text-green-600">
                                Paid: ₹{invoice.amountPaid?.toLocaleString('en-IN')}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusConfig[displayStatus]?.color}`}>
                              {statusConfig[displayStatus]?.icon} {statusConfig[displayStatus]?.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {invoice.dueDate 
                              ? new Date(invoice.dueDate).toLocaleDateString('en-IN')
                              : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openDetailModal(invoice)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => printInvoice(invoice)}
                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Print"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>
                              {canManageInvoices && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => openPaymentModal(invoice)}
                                  className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Record Payment"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                </button>
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

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {invoices.map((invoice) => {
                const isOverdue = invoice.status === 'PENDING' && new Date(invoice.dueDate) < new Date();
                const displayStatus = isOverdue ? 'OVERDUE' : invoice.status;

                return (
                  <div key={invoice.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-gray-900">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-500">{invoice.customer?.name}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig[displayStatus]?.color}`}>
                        {statusConfig[displayStatus]?.icon} {statusConfig[displayStatus]?.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div>
                        <p className="text-gray-500">Vehicle</p>
                        <p className="font-medium text-gray-900">{invoice.job?.vehicle?.licensePlate}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Amount</p>
                        <p className="font-bold text-gray-900">₹{invoice.total?.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(invoice.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Due</p>
                        <p className="font-medium text-gray-900">
                          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <button
                        onClick={() => openDetailModal(invoice)}
                        className="text-blue-600 font-medium text-sm"
                      >
                        View Details →
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => printInvoice(invoice)}
                          className="p-2 text-gray-500 hover:text-green-600 rounded-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                        {canManageInvoices && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                          <button
                            onClick={() => openPaymentModal(invoice)}
                            className="p-2 text-gray-500 hover:text-purple-600 rounded-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-600 to-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Generate Invoice</h2>
                  <p className="text-green-100 text-sm mt-0.5">Create a new billing invoice</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-5">
                {/* Job Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Job <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="jobId"
                    value={formData.jobId}
                    onChange={(e) => handleJobSelect(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                    required
                  >
                    <option value="">Select a completed job</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.jobNumber} - {job.vehicle?.licensePlate} ({job.vehicle?.customer?.name})
                      </option>
                    ))}
                  </select>
                  {jobs.length === 0 && (
                    <p className="text-sm text-yellow-600 mt-2">
                      No jobs available for invoicing. Complete a job first.
                    </p>
                  )}
                </div>

                {/* Auto Calculate Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autoCalculate"
                    name="autoCalculate"
                    checked={formData.autoCalculate}
                    onChange={handleChange}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="autoCalculate" className="text-sm text-gray-700">
                    Auto-calculate from services and parts
                  </label>
                </div>

                {selectedJob && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Job Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <p><span className="text-gray-500">Vehicle:</span> {selectedJob.vehicle?.licensePlate}</p>
                      <p><span className="text-gray-500">Customer:</span> {selectedJob.vehicle?.customer?.name}</p>
                      <p><span className="text-gray-500">Services:</span> {selectedJob.services?.length || 0}</p>
                      <p><span className="text-gray-500">Parts:</span> {selectedJob.parts?.length || 0}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Subtotal */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subtotal (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="subtotal"
                      value={formData.subtotal}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>

                  {/* Tax */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tax/GST (₹)
                    </label>
                    <input
                      type="number"
                      name="tax"
                      value={formData.tax}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Discount (₹)
                    </label>
                    <input
                      type="number"
                      name="discount"
                      value={formData.discount}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                    placeholder="Additional notes..."
                  />
                </div>

                {/* Total Preview */}
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold text-gray-700">Total Amount:</span>
                    <span className="font-bold text-green-700 text-xl">
                      ₹{((parseFloat(formData.subtotal) || 0) + (parseFloat(formData.tax) || 0) - (parseFloat(formData.discount) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  disabled={submitting || jobs.length === 0}
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-800 to-gray-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedInvoice.invoiceNumber}</h2>
                  <p className="text-gray-300 text-sm mt-0.5">
                    {new Date(selectedInvoice.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Status Badge */}
              <div className="flex items-center gap-3 mb-6">
                <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border ${statusConfig[selectedInvoice.status]?.color}`}>
                  {statusConfig[selectedInvoice.status]?.icon} {statusConfig[selectedInvoice.status]?.label}
                </span>
                {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                  <span className="text-gray-500 text-sm">
                    Balance: ₹{(selectedInvoice.total - selectedInvoice.amountPaid).toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {/* Customer & Vehicle Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    👤 Customer
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{selectedInvoice.customer?.name}</p>
                    <p className="text-gray-600">{selectedInvoice.customer?.phone}</p>
                    <p className="text-gray-600">{selectedInvoice.customer?.email}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    🚗 Vehicle
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{selectedInvoice.job?.vehicle?.licensePlate}</p>
                    <p className="text-gray-600">
                      {selectedInvoice.job?.vehicle?.make} {selectedInvoice.job?.vehicle?.model}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Amount Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>₹{selectedInvoice.subtotal?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax (GST)</span>
                    <span>₹{selectedInvoice.tax?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span>-₹{selectedInvoice.discount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>₹{selectedInvoice.total?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Amount Paid</span>
                    <span>₹{selectedInvoice.amountPaid?.toLocaleString('en-IN')}</span>
                  </div>
                  {selectedInvoice.total - selectedInvoice.amountPaid > 0 && (
                    <div className="flex justify-between font-bold text-red-600 pt-2 border-t border-gray-200">
                      <span>Balance Due</span>
                      <span>₹{(selectedInvoice.total - selectedInvoice.amountPaid).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payments History */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Payment History</h3>
                  <div className="space-y-2">
                    {selectedInvoice.payments.map((payment, index) => (
                      <div key={payment.id || index} className="flex items-center justify-between bg-green-50 rounded-lg p-3">
                        <div>
                          <p className="font-medium text-gray-900">₹{payment.amount?.toLocaleString('en-IN')}</p>
                          <p className="text-xs text-gray-500">
                            {paymentMethods.find(m => m.value === payment.method)?.label || payment.method}
                            {payment.reference && ` • ${payment.reference}`}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedInvoice.notes && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-600 bg-gray-50 rounded-xl p-4">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap gap-3 justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => printInvoice(selectedInvoice)}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              {canManageInvoices && selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                <>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openPaymentModal(selectedInvoice);
                    }}
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Record Payment
                  </button>
                  <button
                    onClick={() => handleCancelInvoice(selectedInvoice)}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                  >
                    Cancel Invoice
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowPaymentModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-600 to-indigo-600">
              <h2 className="text-xl font-bold text-white">Record Payment</h2>
              <p className="text-purple-100 text-sm mt-0.5">
                {selectedInvoice.invoiceNumber} • Balance: ₹{(selectedInvoice.total - selectedInvoice.amountPaid).toLocaleString('en-IN')}
              </p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={paymentData.amount}
                    onChange={handlePaymentChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max={selectedInvoice.total - selectedInvoice.amountPaid}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.value}
                        className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                          paymentData.method === method.value
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="method"
                          value={method.value}
                          checked={paymentData.method === method.value}
                          onChange={handlePaymentChange}
                          className="sr-only"
                        />
                        <span className="text-lg">{method.icon}</span>
                        <span className="text-sm font-medium">{method.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reference / Transaction ID
                  </label>
                  <input
                    type="text"
                    name="reference"
                    value={paymentData.reference}
                    onChange={handlePaymentChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., UPI ID, Check number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={paymentData.notes}
                    onChange={handlePaymentChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}