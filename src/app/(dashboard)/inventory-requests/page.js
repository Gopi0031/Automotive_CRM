// src/app/(dashboard)/inventory-requests/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export default function InventoryRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
  });

  // Form data for creating request
  const [formData, setFormData] = useState({
    jobId: '',
    notes: '',
    urgency: 'MEDIUM',
    items: [{ partId: '', quantity: 1, notes: '' }],
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUser(user);
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchRequests();
    }
  }, [filters, currentUser]);

  const fetchInitialData = async () => {
    try {
      const [jobsRes, partsRes] = await Promise.all([
        fetch('/api/jobs'),
        fetch('/api/inventory'),
      ]);

      const jobsData = await jobsRes.json();
      const partsData = await partsRes.json();

      if (jobsData.success) {
        // Filter only assigned jobs for technicians
        setJobs(jobsData.data || []);
      }
      if (partsData.success) {
        setParts(partsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`/api/inventory-requests?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setRequests(data.data || []);
        calculateStats(data.data || []);
      } else {
        toast.error(data.message || 'Failed to load requests');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const calculateStats = (requestsData) => {
    setStats({
      total: requestsData.length,
      pending: requestsData.filter(r => r.status === 'PENDING').length,
      approved: requestsData.filter(r => ['APPROVED', 'PARTIALLY_APPROVED'].includes(r.status)).length,
      rejected: requestsData.filter(r => r.status === 'REJECTED').length,
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      jobId: '',
      notes: '',
      urgency: 'MEDIUM',
      items: [{ partId: '', quantity: 1, notes: '' }],
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { partId: '', quantity: 1, notes: '' }],
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.jobId) {
      toast.error('Please select a job');
      return;
    }

    const validItems = formData.items.filter(item => item.partId && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/inventory-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: formData.jobId,
          notes: formData.notes,
          urgency: formData.urgency,
          items: validItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to create request');
        return;
      }

      toast.success('Request created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchRequests();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;

    try {
      const response = await fetch(`/api/inventory-requests/${requestId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to cancel request');
        return;
      }

      toast.success('Request cancelled');
      fetchRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('An error occurred');
    }
  };

  const handleApproveReject = async (action, approvalData) => {
    if (!selectedRequest) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/inventory-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          items: approvalData?.items,
          rejectionReason: approvalData?.rejectionReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || `Failed to ${action} request`);
        return;
      }

      toast.success(data.message);
      setShowApproveModal(false);
      setShowDetailModal(false);
      fetchRequests();
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      PENDING: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
      APPROVED: { label: 'Approved', color: '#10b981', bg: '#d1fae5', icon: '✅' },
      PARTIALLY_APPROVED: { label: 'Partial', color: '#3b82f6', bg: '#dbeafe', icon: '⚡' },
      REJECTED: { label: 'Rejected', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
      CANCELLED: { label: 'Cancelled', color: '#6b7280', bg: '#f3f4f6', icon: '🚫' },
    };
    return configs[status] || configs.PENDING;
  };

  const getUrgencyConfig = (urgency) => {
    const configs = {
      LOW: { label: 'Low', color: '#6b7280', icon: '🔵' },
      MEDIUM: { label: 'Medium', color: '#3b82f6', icon: '🟡' },
      HIGH: { label: 'High', color: '#f97316', icon: '🟠' },
      URGENT: { label: 'Urgent', color: '#ef4444', icon: '🔴' },
    };
    return configs[urgency] || configs.MEDIUM;
  };

  const isTechnician = currentUser?.role === 'EMPLOYEE';
  const isManager = ['SUPER_ADMIN', 'MANAGER'].includes(currentUser?.role);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          padding: isMobile ? '16px' : '16px 24px',
          maxWidth: '1600px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div>
              <h1 style={{
                fontSize: isMobile ? '24px' : '32px',
                fontWeight: '800',
                color: '#1a202c',
                margin: 0,
                marginBottom: '4px'
              }}>
                📋 {isTechnician ? 'My Inventory Requests' : 'Inventory Requests'}
              </h1>
              <p style={{
                color: '#6b7280',
                fontSize: isMobile ? '14px' : '16px',
                margin: 0
              }}>
                {isTechnician 
                  ? 'Request parts and supplies for your assigned jobs'
                  : 'Review and manage inventory requests from technicians'
                }
              </p>
            </div>

            {isTechnician && (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center'
                }}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Request
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{
        padding: isMobile ? '16px' : '24px',
        maxWidth: '1600px',
        margin: '0 auto'
      }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <StatCard title="Total Requests" value={stats.total} icon="📋" color="#3b82f6" isMobile={isMobile} />
          <StatCard title="Pending" value={stats.pending} icon="⏳" color="#f59e0b" isMobile={isMobile} />
          <StatCard title="Approved" value={stats.approved} icon="✅" color="#10b981" isMobile={isMobile} />
          <StatCard title="Rejected" value={stats.rejected} icon="❌" color="#ef4444" isMobile={isMobile} />
        </div>

        {/* Filters */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '12px'
          }}>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              style={{
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '15px',
                background: 'white',
                minWidth: '180px',
                cursor: 'pointer'
              }}
            >
              <option value="">All Status</option>
              <option value="PENDING">⏳ Pending</option>
              <option value="APPROVED">✅ Approved</option>
              <option value="PARTIALLY_APPROVED">⚡ Partially Approved</option>
              <option value="REJECTED">❌ Rejected</option>
              <option value="CANCELLED">🚫 Cancelled</option>
            </select>

            {filters.status && (
              <button
                onClick={() => setFilters({ status: '' })}
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  background: 'white',
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <LoadingState isMobile={isMobile} />
        ) : requests.length === 0 ? (
          <EmptyState 
            isTechnician={isTechnician}
            hasFilter={!!filters.status}
            onCreateClick={() => setShowCreateModal(true)}
            isMobile={isMobile}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {requests.map(request => (
              <RequestCard
                key={request.id}
                request={request}
                getStatusConfig={getStatusConfig}
                getUrgencyConfig={getUrgencyConfig}
                isTechnician={isTechnician}
                isManager={isManager}
                onView={() => {
                  setSelectedRequest(request);
                  setShowDetailModal(true);
                }}
                onApprove={() => {
                  setSelectedRequest(request);
                  setShowApproveModal(true);
                }}
                onCancel={() => handleCancelRequest(request.id)}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      {showCreateModal && (
        <CreateRequestModal
          isMobile={isMobile}
          formData={formData}
          setFormData={setFormData}
          jobs={jobs.filter(j => j.assignedToId === currentUser?.id)}
          parts={parts}
          onSubmit={handleCreateRequest}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          addItem={addItem}
          removeItem={removeItem}
          updateItem={updateItem}
          submitting={submitting}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <DetailModal
          isMobile={isMobile}
          request={selectedRequest}
          getStatusConfig={getStatusConfig}
          getUrgencyConfig={getUrgencyConfig}
          isManager={isManager}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRequest(null);
          }}
          onApprove={() => {
            setShowDetailModal(false);
            setShowApproveModal(true);
          }}
          onReject={(reason) => handleApproveReject('reject', { rejectionReason: reason })}
          submitting={submitting}
        />
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <ApproveModal
          isMobile={isMobile}
          request={selectedRequest}
          onClose={() => {
            setShowApproveModal(false);
            setSelectedRequest(null);
          }}
          onApprove={(items) => handleApproveReject('approve', { items })}
          submitting={submitting}
        />
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Helper Components

function StatCard({ title, value, icon, color, isMobile }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: isMobile ? '16px' : '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      border: '1px solid rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', margin: 0, marginBottom: '4px', textTransform: 'uppercase' }}>
            {title}
          </p>
          <p style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '800', color: '#1a202c', margin: 0 }}>
            {value}
          </p>
        </div>
        <div style={{
          width: isMobile ? '44px' : '52px',
          height: isMobile ? '44px' : '52px',
          background: `${color}15`,
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isMobile ? '22px' : '26px'
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function LoadingState({ isMobile }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 20px',
      background: 'white',
      borderRadius: '20px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#14b8a6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: '#6b7280', fontSize: '16px', fontWeight: '500', margin: 0 }}>
          Loading requests...
        </p>
      </div>
    </div>
  );
}

function EmptyState({ isTechnician, hasFilter, onCreateClick, isMobile }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: isMobile ? '40px 20px' : '60px 40px',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        background: '#f3f4f6',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        fontSize: '40px'
      }}>
        📋
      </div>
      <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1a202c', margin: 0, marginBottom: '8px' }}>
        No requests found
      </h3>
      <p style={{ fontSize: '16px', color: '#6b7280', margin: 0, marginBottom: '24px' }}>
        {hasFilter 
          ? 'Try adjusting your filters to see requests.'
          : isTechnician 
            ? 'Create your first inventory request for a job.'
            : 'No pending requests from technicians.'
        }
      </p>
      {isTechnician && !hasFilter && (
        <button
          onClick={onCreateClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
            color: 'white',
            padding: '14px 28px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '600',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create First Request
        </button>
      )}
    </div>
  );
}

function RequestCard({ 
  request, 
  getStatusConfig, 
  getUrgencyConfig, 
  isTechnician, 
  isManager, 
  onView, 
  onApprove, 
  onCancel,
  isMobile 
}) {
  const statusConfig = getStatusConfig(request.status);
  const urgencyConfig = getUrgencyConfig(request.urgency);
  const itemCount = request.items?.length || 0;
  const totalQty = request.items?.reduce((sum, item) => sum + item.quantityRequested, 0) || 0;

  return (
    <div 
      style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.05)',
        overflow: 'hidden',
        transition: 'all 0.2s',
        cursor: 'pointer'
      }}
      onClick={onView}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
      }}
    >
      <div style={{ padding: '20px' }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          {/* Left Section */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '12px'
            }}>
              <span style={{
                fontFamily: 'monospace',
                fontWeight: '700',
                fontSize: '16px',
                color: '#1a202c'
              }}>
                {request.requestNumber}
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                background: statusConfig.bg,
                color: statusConfig.color
              }}>
                {statusConfig.icon} {statusConfig.label}
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                background: '#f3f4f6',
                color: urgencyConfig.color
              }}>
                {urgencyConfig.icon} {urgencyConfig.label}
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Job:</span>
              <span style={{ fontWeight: '600', color: '#1a202c' }}>
                {request.job?.jobNumber}
              </span>
              <span style={{ color: '#9ca3af' }}>•</span>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                {request.job?.vehicle?.licensePlate}
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '14px'
            }}>
              <span style={{ color: '#6b7280' }}>
                <strong style={{ color: '#1a202c' }}>{itemCount}</strong> item(s)
              </span>
              <span style={{ color: '#6b7280' }}>
                <strong style={{ color: '#1a202c' }}>{totalQty}</strong> total qty
              </span>
              {!isTechnician && (
                <>
                  <span style={{ color: '#9ca3af' }}>•</span>
                  <span style={{ color: '#6b7280' }}>
                    By: <strong style={{ color: '#1a202c' }}>{request.requestedBy?.name}</strong>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right Section - Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0
          }}>
            {isManager && request.status === 'PENDING' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove();
                }}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Review
              </button>
            )}

            {isTechnician && request.status === 'PENDING' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                style={{
                  padding: '10px 20px',
                  background: '#fee2e2',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#ef4444',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}

            <span style={{ color: '#6b7280', fontSize: '13px' }}>
              {new Date(request.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateRequestModal({
  isMobile,
  formData,
  setFormData,
  jobs,
  parts,
  onSubmit,
  onClose,
  addItem,
  removeItem,
  updateItem,
  submitting
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
          padding: '24px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, marginBottom: '4px' }}>
                📦 New Inventory Request
              </h2>
              <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                Request parts and supplies for your job
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={onSubmit}>
          <div style={{ padding: '24px', maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
            {/* Job Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Select Job <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={formData.jobId}
                onChange={(e) => setFormData(prev => ({ ...prev, jobId: e.target.value }))}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '15px',
                  background: 'white'
                }}
              >
                <option value="">Choose a job...</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.jobNumber} - {job.vehicle?.licensePlate} ({job.vehicle?.make} {job.vehicle?.model})
                  </option>
                ))}
              </select>
              {jobs.length === 0 && (
                <p style={{ fontSize: '13px', color: '#ef4444', marginTop: '8px' }}>
                  No jobs assigned to you. Contact your manager.
                </p>
              )}
            </div>

            {/* Urgency */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Urgency
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { value: 'LOW', label: '🔵 Low', color: '#3b82f6' },
                  { value: 'MEDIUM', label: '🟡 Medium', color: '#f59e0b' },
                  { value: 'HIGH', label: '🟠 High', color: '#f97316' },
                  { value: 'URGENT', label: '🔴 Urgent', color: '#ef4444' }
                ].map(option => (
                  <label
                    key={option.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 16px',
                      border: `2px solid ${formData.urgency === option.value ? option.color : '#e5e7eb'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: formData.urgency === option.value ? `${option.color}15` : 'white'
                    }}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      value={option.value}
                      checked={formData.urgency === option.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value }))}
                      style={{ display: 'none' }}
                    />
                    <span style={{
                      fontWeight: '600',
                      fontSize: '14px',
                      color: formData.urgency === option.value ? option.color : '#6b7280'
                    }}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Items */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Request Items <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 16px',
                    background: '#f0fdf4',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#10b981',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Item
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr auto',
                      gap: '12px',
                      alignItems: 'end'
                    }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                          Part/Item
                        </label>
                        <select
                          value={item.partId}
                          onChange={(e) => updateItem(index, 'partId', e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '10px',
                            fontSize: '14px',
                            background: 'white'
                          }}
                        >
                          <option value="">Select part...</option>
                          {parts.map(part => (
                            <option key={part.id} value={part.id}>
                              {part.name} ({part.partNumber}) - Stock: {part.quantity}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          min="1"
                          required
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '10px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          style={{
                            padding: '10px',
                            background: '#fee2e2',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                        >
                          <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Any special instructions or notes..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '15px',
                  resize: 'none'
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '20px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            background: '#f9fafb'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '12px 24px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                background: 'white',
                color: '#374151',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: submitting ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || jobs.length === 0}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
                color: 'white',
                fontWeight: '600',
                cursor: submitting || jobs.length === 0 ? 'not-allowed' : 'pointer',
                opacity: submitting || jobs.length === 0 ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {submitting && (
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailModal({
  isMobile,
  request,
  getStatusConfig,
  getUrgencyConfig,
  isManager,
  onClose,
  onApprove,
  onReject,
  submitting
}) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  
  const statusConfig = getStatusConfig(request.status);
  const urgencyConfig = getUrgencyConfig(request.urgency);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: '#1f2937',
          padding: '24px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', opacity: 0.7, margin: 0, marginBottom: '4px' }}>Request</p>
              <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, marginBottom: '12px' }}>
                {request.requestNumber}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: statusConfig.bg,
                  color: statusConfig.color
                }}>
                  {statusConfig.icon} {statusConfig.label}
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white'
                }}>
                  {urgencyConfig.icon} {urgencyConfig.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', maxHeight: 'calc(90vh - 250px)', overflowY: 'auto' }}>
          {/* Job Info */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, marginBottom: '8px', fontWeight: '600' }}>
              FOR JOB
            </p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c', margin: 0, marginBottom: '4px' }}>
              {request.job?.jobNumber}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              {request.job?.vehicle?.licensePlate} • {request.job?.vehicle?.make} {request.job?.vehicle?.model}
            </p>
          </div>

          {/* Requester Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>Requested By</p>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                {request.requestedBy?.name}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>Date</p>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                {new Date(request.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Items */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, marginBottom: '12px', fontWeight: '600' }}>
              REQUESTED ITEMS
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {request.items?.map((item, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: '#f9fafb',
                    borderRadius: '10px'
                  }}
                >
                  <div>
                    <p style={{ fontWeight: '600', color: '#1a202c', margin: 0, marginBottom: '2px', fontSize: '14px' }}>
                      {item.part?.name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontFamily: 'monospace' }}>
                      {item.part?.partNumber}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: '700', color: '#1a202c', margin: 0, fontSize: '16px' }}>
                      {item.quantityRequested}
                    </p>
                    {item.quantityApproved !== null && (
                      <p style={{ 
                        fontSize: '12px', 
                        color: item.quantityApproved === item.quantityRequested ? '#10b981' : '#f59e0b', 
                        margin: 0 
                      }}>
                        Approved: {item.quantityApproved}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {request.notes && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>Notes</p>
              <p style={{ fontSize: '14px', color: '#1a202c', margin: 0 }}>{request.notes}</p>
            </div>
          )}

          {/* Rejection Reason */}
          {request.status === 'REJECTED' && request.rejectionReason && (
            <div style={{
              background: '#fef2f2',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #fecaca'
            }}>
              <p style={{ fontSize: '12px', color: '#b91c1c', margin: 0, marginBottom: '4px', fontWeight: '600' }}>
                Rejection Reason
              </p>
              <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>{request.rejectionReason}</p>
            </div>
          )}

          {/* Reject Form */}
          {isManager && request.status === 'PENDING' && showRejectForm && (
            <div style={{
              background: '#fef2f2',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '16px'
            }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#b91c1c', margin: 0, marginBottom: '12px' }}>
                Rejection Reason
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Explain why this request is being rejected..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'none',
                  marginBottom: '12px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason('');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => onReject(rejectionReason)}
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    opacity: submitting ? 0.5 : 1
                  }}
                >
                  {submitting ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isManager && request.status === 'PENDING' && !showRejectForm && (
          <div style={{
            padding: '20px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            background: '#f9fafb'
          }}>
            <button
              onClick={() => setShowRejectForm(true)}
              style={{
                padding: '12px 24px',
                border: '2px solid #ef4444',
                borderRadius: '12px',
                background: 'white',
                color: '#ef4444',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Reject
            </button>
            <button
              onClick={onApprove}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Approve Items
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ApproveModal({
  isMobile,
  request,
  onClose,
  onApprove,
  submitting
}) {
  const [itemApprovals, setItemApprovals] = useState(
    request.items?.map(item => ({
      id: item.id,
      partId: item.partId,
      partName: item.part?.name,
      quantityRequested: item.quantityRequested,
      quantityApproved: item.quantityRequested,
      available: item.part?.quantity || 0
    })) || []
  );

  const handleQuantityChange = (itemId, value) => {
    setItemApprovals(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantityApproved: parseInt(value) || 0 } : item
    ));
  };

  const handleSubmit = () => {
    const items = itemApprovals.map(item => ({
      id: item.id,
      quantityApproved: item.quantityApproved
    }));
    onApprove(items);
  };

  const hasValidApproval = itemApprovals.some(item => item.quantityApproved > 0);
  const hasStockIssue = itemApprovals.some(item => item.quantityApproved > item.available);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '24px',
          color: 'white'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, marginBottom: '4px' }}>
            ✅ Approve Request
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
            {request.requestNumber} • Set approved quantities
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: 0, marginBottom: '20px' }}>
            Adjust the quantities to approve. Items with 0 quantity will not be issued.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {itemApprovals.map((item, index) => {
              const isOverStock = item.quantityApproved > item.available;
              
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '16px',
                    background: isOverStock ? '#fef2f2' : '#f9fafb',
                    borderRadius: '12px',
                    border: `2px solid ${isOverStock ? '#fecaca' : '#e5e7eb'}`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <div>
                      <p style={{ fontWeight: '600', color: '#1a202c', margin: 0, marginBottom: '2px' }}>
                        {item.partName}
                      </p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                        Requested: {item.quantityRequested} • Available: {item.available}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                      Approve:
                    </label>
                    <input
                      type="number"
                      value={item.quantityApproved}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      min="0"
                      max={item.available}
                      style={{
                        width: '100px',
                        padding: '10px 12px',
                        border: `2px solid ${isOverStock ? '#fecaca' : '#e5e7eb'}`,
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                      / {item.quantityRequested} requested
                    </span>
                  </div>

                  {isOverStock && (
                    <p style={{
                      fontSize: '12px',
                      color: '#ef4444',
                      margin: 0,
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ⚠️ Exceeds available stock!
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: '#f0fdf4',
            borderRadius: '12px',
            border: '1px solid #bbf7d0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', color: '#15803d' }}>Total Items Approved</span>
              <span style={{ fontWeight: '700', fontSize: '18px', color: '#15803d' }}>
                {itemApprovals.filter(i => i.quantityApproved > 0).length} / {itemApprovals.length}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          background: '#f9fafb'
        }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '12px 24px',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              color: '#374151',
              fontWeight: '600',
              cursor: 'pointer',
              opacity: submitting ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !hasValidApproval || hasStockIssue}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '12px',
              background: hasValidApproval && !hasStockIssue
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : '#e5e7eb',
              color: hasValidApproval && !hasStockIssue ? 'white' : '#9ca3af',
              fontWeight: '600',
              cursor: hasValidApproval && !hasStockIssue ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {submitting && (
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
            {submitting ? 'Approving...' : 'Confirm Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}