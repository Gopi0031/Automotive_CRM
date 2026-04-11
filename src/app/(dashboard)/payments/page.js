// src/app/(dashboard)/payments/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    method: '',
    startDate: '',
    endDate: '',
  });

  // Form data
  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: '',
    method: 'CASH',
    reference: '',
    notes: '',
  });

  // Stats
  const [stats, setStats] = useState({
    totalCollected: 0,
    todayCollection: 0,
    weekCollection: 0,
    pendingInvoices: 0,
    paymentCount: 0,
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchPayments();
    }
  }, [filters, currentUser]);

  const fetchInitialData = async () => {
    try {
      const invoicesRes = await fetch('/api/invoices');
      const invoicesData = await invoicesRes.json();

      if (invoicesData.success) {
        // Filter only unpaid/partially paid invoices
        const unpaidInvoices = invoicesData.data?.filter(
          i => i.status !== 'PAID' && i.status !== 'CANCELLED'
        ) || [];
        setInvoices(unpaidInvoices);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.method) params.append('method', filters.method);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/payments?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setPayments(data.data || []);
        calculateStats(data.data || []);
      } else {
        toast.error(data.message || 'Failed to load payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const calculateStats = (paymentsData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const totalCollected = paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0);
    const todayCollection = paymentsData
      .filter(p => new Date(p.createdAt) >= today)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const weekCollection = paymentsData
      .filter(p => new Date(p.createdAt) >= weekAgo)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    setStats({
      totalCollected,
      todayCollection,
      weekCollection,
      pendingInvoices: invoices.length,
      paymentCount: paymentsData.length,
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      method: '',
      startDate: '',
      endDate: '',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      invoiceId: '',
      amount: '',
      method: 'CASH',
      reference: '',
      notes: '',
    });
    setSelectedInvoice(null);
  };

  const openCreateModal = () => {
    resetForm();
    fetchInitialData(); // Refresh available invoices
    setShowModal(true);
  };

  const openDetailModal = (payment) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  // When invoice is selected, auto-fill remaining balance
  const handleInvoiceSelect = (invoiceId) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    setSelectedInvoice(invoice);
    setFormData(prev => ({
      ...prev,
      invoiceId,
      amount: invoice ? (invoice.total - invoice.amountPaid).toFixed(2) : '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        invoiceId: formData.invoiceId,
        amount: parseFloat(formData.amount) || 0,
        method: formData.method,
        reference: formData.reference || null,
        notes: formData.notes || null,
      };

      console.log('📤 Sending payment data:', payload);

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to process payment');
        return;
      }

      toast.success(data.message || 'Payment processed successfully');
      resetForm();
      setShowModal(false);
      fetchPayments();
      fetchInitialData();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidPayment = async (payment) => {
    if (!confirm(`Are you sure you want to void this payment of ₹${payment.amount.toLocaleString('en-IN')}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/payments?id=${payment.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to void payment');
        return;
      }

      toast.success('Payment voided successfully');
      setShowDetailModal(false);
      fetchPayments();
      fetchInitialData();
    } catch (error) {
      console.error('Error voiding payment:', error);
      toast.error('An error occurred');
    }
  };

  // Payment method configuration
  const paymentMethods = [
    { value: 'CASH', label: 'Cash', icon: '💵', color: 'bg-green-100 text-green-800' },
    { value: 'CARD', label: 'Card', icon: '💳', color: 'bg-blue-100 text-blue-800' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦', color: 'bg-purple-100 text-purple-800' },
    { value: 'CHECK', label: 'Check', icon: '📄', color: 'bg-gray-100 text-gray-800' },
    { value: 'MOBILE_MONEY', label: 'UPI/Mobile', icon: '📱', color: 'bg-orange-100 text-orange-800' },
  ];

  const getMethodConfig = (method) => {
    return paymentMethods.find(m => m.value === method) || { label: method, icon: '💰', color: 'bg-gray-100 text-gray-800' };
  };

  const canManagePayments = ['SUPER_ADMIN', 'MANAGER', 'CASHIER'].includes(currentUser?.role);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payments</h1>
              <p className="text-gray-500 mt-1 text-sm sm:text-base">
                Track and manage payment collections
              </p>
            </div>
            {canManagePayments && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg shadow-purple-500/25 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Record Payment</span>
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
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Today's Collection</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
                  ₹{stats.todayCollection.toLocaleString('en-IN')}
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
                <p className="text-xs sm:text-sm text-gray-500 font-medium">This Week</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
                  ₹{stats.weekCollection.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">
                📊
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Collected</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600 mt-1">
                  ₹{stats.totalCollected.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center text-xl">
                💎
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Pending Invoices</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1">{stats.pendingInvoices}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center text-xl">
                📋
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
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
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-3">
              <select
                name="method"
                value={filters.method}
                onChange={handleFilterChange}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white min-w-[150px]"
              >
                <option value="">All Methods</option>
                {paymentMethods.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.icon} {method.label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              />

              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              />

              {(filters.search || filters.method || filters.startDate || filters.endDate) && (
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

        {/* Payments List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-500 mt-4 font-medium">Loading payments...</p>
            </div>
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
              💳
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500 mb-6">
              {filters.search || filters.method || filters.startDate
                ? 'Try adjusting your filters.'
                : 'Record your first payment to get started.'}
            </p>
            {canManagePayments && !filters.search && !filters.method && !filters.startDate && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Record First Payment
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
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Received By</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((payment) => {
                      const methodConfig = getMethodConfig(payment.method);
                      return (
                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900">{payment.invoice?.invoiceNumber}</p>
                            <p className="text-xs text-gray-500">{payment.invoice?.job?.jobNumber}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{payment.invoice?.customer?.name}</p>
                            <p className="text-sm text-gray-500">{payment.invoice?.customer?.phone}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-green-600 text-lg">
                              ₹{payment.amount?.toLocaleString('en-IN')}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${methodConfig.color}`}>
                              <span>{methodConfig.icon}</span>
                              {methodConfig.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {payment.reference || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900">
                              {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(payment.createdAt).toLocaleTimeString('en-IN', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900">{payment.receivedBy?.name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openDetailModal(payment)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
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
              {payments.map((payment) => {
                const methodConfig = getMethodConfig(payment.method);
                return (
                  <div key={payment.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-gray-900">{payment.invoice?.invoiceNumber}</p>
                        <p className="text-sm text-gray-500">{payment.invoice?.customer?.name}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${methodConfig.color}`}>
                        {methodConfig.icon} {methodConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <p className="text-2xl font-bold text-green-600">
                        ₹{payment.amount?.toLocaleString('en-IN')}
                      </p>
                      <div className="text-right text-sm text-gray-500">
                        <p>{new Date(payment.createdAt).toLocaleDateString('en-IN')}</p>
                        <p>{new Date(payment.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>

                    {payment.reference && (
                      <p className="text-sm text-gray-600 mb-3">
                        <span className="text-gray-400">Ref:</span> {payment.reference}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        By: {payment.receivedBy?.name}
                      </p>
                      <button
                        onClick={() => openDetailModal(payment)}
                        className="text-blue-600 font-medium text-sm"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-600 to-indigo-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Record Payment</h2>
                  <p className="text-purple-100 text-sm mt-0.5">Process a new payment</p>
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
                {/* Invoice Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Invoice <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="invoiceId"
                    value={formData.invoiceId}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    required
                  >
                    <option value="">Select an invoice</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.customer?.name} - Balance: ₹{(inv.total - inv.amountPaid).toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                  {invoices.length === 0 && (
                    <p className="text-sm text-yellow-600 mt-2">
                      No pending invoices available.
                    </p>
                  )}
                </div>

                {/* Selected Invoice Details */}
                {selectedInvoice && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Invoice Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Customer</p>
                        <p className="font-medium">{selectedInvoice.customer?.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Invoice Total</p>
                        <p className="font-medium">₹{selectedInvoice.total?.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Already Paid</p>
                        <p className="font-medium text-green-600">₹{selectedInvoice.amountPaid?.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Balance Due</p>
                        <p className="font-bold text-red-600">₹{(selectedInvoice.total - selectedInvoice.amountPaid).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max={selectedInvoice ? (selectedInvoice.total - selectedInvoice.amountPaid) : undefined}
                    required
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.value}
                        className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                          formData.method === method.value
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="method"
                          value={method.value}
                          checked={formData.method === method.value}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span className="text-lg">{method.icon}</span>
                        <span className="text-sm font-medium">{method.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reference / Transaction ID
                  </label>
                  <input
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., UPI ID, Check number, Card last 4 digits"
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
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
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
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  disabled={submitting || invoices.length === 0}
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Process Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Detail Modal */}
      {showDetailModal && selectedPayment && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-600 to-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Payment Details</h2>
                  <p className="text-green-100 text-sm mt-0.5">
                    {new Date(selectedPayment.createdAt).toLocaleString('en-IN')}
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

            <div className="p-6">
              {/* Amount */}
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-green-600">
                  ₹{selectedPayment.amount?.toLocaleString('en-IN')}
                </p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold mt-2 ${getMethodConfig(selectedPayment.method).color}`}>
                  {getMethodConfig(selectedPayment.method).icon} {getMethodConfig(selectedPayment.method).label}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Invoice</span>
                  <span className="font-medium">{selectedPayment.invoice?.invoiceNumber}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium">{selectedPayment.invoice?.customer?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-medium">{selectedPayment.invoice?.customer?.phone}</span>
                </div>
                {selectedPayment.reference && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Reference</span>
                    <span className="font-medium">{selectedPayment.reference}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Received By</span>
                  <span className="font-medium">{selectedPayment.receivedBy?.name}</span>
                </div>
                {selectedPayment.notes && (
                  <div className="py-2">
                    <p className="text-gray-500 mb-1">Notes</p>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{selectedPayment.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Close
              </button>
              {currentUser?.role === 'SUPER_ADMIN' && (
                <button
                  onClick={() => handleVoidPayment(selectedPayment)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                >
                  Void Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}