// src/app/(dashboard)/inventory-transfers/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export default function InventoryTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [actionType, setActionType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    type: '', // 'incoming' or 'outgoing'
  });

  // Form data
  const [formData, setFormData] = useState({
    fromBranchId: '',
    toBranchId: '',
    notes: '',
    urgency: 'MEDIUM',
    items: [{ partId: '', quantity: 1, notes: '' }],
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inTransit: 0,
    completed: 0,
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
      setCurrentUser(JSON.parse(userData));
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTransfers();
    }
  }, [filters, currentUser]);

  const fetchInitialData = async () => {
    try {
      const [branchesRes, partsRes] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/inventory'),
      ]);

      const branchesData = await branchesRes.json();
      const partsData = await partsRes.json();

      if (branchesData.success) setBranches(branchesData.data || []);
      if (partsData.success) setParts(partsData.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);

      const response = await fetch(`/api/inventory-transfers?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTransfers(data.data || []);
        calculateStats(data.data || []);
      } else {
        toast.error(data.message || 'Failed to load transfers');
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const calculateStats = (transfersData) => {
    setStats({
      total: transfersData.length,
      pending: transfersData.filter(t => ['REQUESTED', 'APPROVED'].includes(t.status)).length,
      inTransit: transfersData.filter(t => t.status === 'IN_TRANSIT').length,
      completed: transfersData.filter(t => t.status === 'RECEIVED').length,
    });
  };

  const resetForm = () => {
    setFormData({
      fromBranchId: '',
      toBranchId: currentUser?.branchId || '',
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

  // Get parts from selected source branch
  const getSourceBranchParts = () => {
    if (!formData.fromBranchId) return [];
    return parts.filter(p => p.branchId === formData.fromBranchId && p.quantity > 0);
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    
    if (!formData.fromBranchId || !formData.toBranchId) {
      toast.error('Please select both source and destination branches');
      return;
    }

    const validItems = formData.items.filter(item => item.partId && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/inventory-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromBranchId: formData.fromBranchId,
          toBranchId: formData.toBranchId,
          notes: formData.notes,
          urgency: formData.urgency,
          items: validItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to create transfer request');
        return;
      }

      toast.success('Transfer request created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchTransfers();
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferAction = async (actionData) => {
    if (!selectedTransfer) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/inventory-transfers/${selectedTransfer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          ...actionData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || `Failed to ${actionType} transfer`);
        return;
      }

      toast.success(data.message);
      setShowActionModal(false);
      setShowDetailModal(false);
      setSelectedTransfer(null);
      fetchTransfers();
    } catch (error) {
      console.error('Error processing transfer:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const openActionModal = (transfer, action) => {
    setSelectedTransfer(transfer);
    setActionType(action);
    setShowActionModal(true);
  };

  const getStatusConfig = (status) => {
    const configs = {
      REQUESTED: { label: 'Requested', color: '#f59e0b', bg: '#fef3c7', icon: '📤' },
      APPROVED: { label: 'Approved', color: '#3b82f6', bg: '#dbeafe', icon: '✅' },
      REJECTED: { label: 'Rejected', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
      IN_TRANSIT: { label: 'In Transit', color: '#8b5cf6', bg: '#ede9fe', icon: '🚚' },
      RECEIVED: { label: 'Completed', color: '#10b981', bg: '#d1fae5', icon: '✓' },
      CANCELLED: { label: 'Cancelled', color: '#6b7280', bg: '#f3f4f6', icon: '🚫' },
    };
    return configs[status] || configs.REQUESTED;
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

  const isManager = ['SUPER_ADMIN', 'MANAGER'].includes(currentUser?.role);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Check if user can perform actions on a transfer
  const canApproveReject = (transfer) => {
    return transfer.status === 'REQUESTED' && 
           (isSuperAdmin || transfer.fromBranchId === currentUser?.branchId);
  };

  const canSend = (transfer) => {
    return transfer.status === 'APPROVED' && 
           (isSuperAdmin || transfer.fromBranchId === currentUser?.branchId);
  };

  const canReceive = (transfer) => {
    return transfer.status === 'IN_TRANSIT' && 
           (isSuperAdmin || transfer.toBranchId === currentUser?.branchId);
  };

  // Categorize transfers
  const incomingTransfers = transfers.filter(t => t.toBranchId === currentUser?.branchId);
  const outgoingTransfers = transfers.filter(t => t.fromBranchId === currentUser?.branchId);

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
                🔄 Inventory Transfers
              </h1>
              <p style={{
                color: '#6b7280',
                fontSize: isMobile ? '14px' : '16px',
                margin: 0
              }}>
                Transfer inventory items between branches
              </p>
            </div>

            {isManager && (
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center'
                }}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Request Transfer
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
          <StatCard title="Total Transfers" value={stats.total} icon="🔄" color="#8b5cf6" isMobile={isMobile} />
          <StatCard title="Pending" value={stats.pending} icon="⏳" color="#f59e0b" isMobile={isMobile} />
          <StatCard title="In Transit" value={stats.inTransit} icon="🚚" color="#3b82f6" isMobile={isMobile} />
          <StatCard title="Completed" value={stats.completed} icon="✓" color="#10b981" isMobile={isMobile} />
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
              name="type"
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
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
              <option value="">All Transfers</option>
              <option value="incoming">📥 Incoming</option>
              <option value="outgoing">📤 Outgoing</option>
            </select>

            <select
              name="status"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
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
              <option value="REQUESTED">📤 Requested</option>
              <option value="APPROVED">✅ Approved</option>
              <option value="IN_TRANSIT">🚚 In Transit</option>
              <option value="RECEIVED">✓ Completed</option>
              <option value="REJECTED">❌ Rejected</option>
            </select>

            {(filters.status || filters.type) && (
              <button
                onClick={() => setFilters({ status: '', type: '' })}
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
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Pending Actions Alert */}
        {!isSuperAdmin && (
          <>
            {incomingTransfers.filter(t => t.status === 'IN_TRANSIT').length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                border: '2px solid #3b82f6',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>📦</span>
                  <div>
                    <p style={{ fontWeight: '700', color: '#1e40af', margin: 0 }}>
                      Items Ready to Receive
                    </p>
                    <p style={{ fontSize: '14px', color: '#3b82f6', margin: 0 }}>
                      {incomingTransfers.filter(t => t.status === 'IN_TRANSIT').length} transfer(s) awaiting confirmation
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFilters({ type: 'incoming', status: 'IN_TRANSIT' })}
                  style={{
                    padding: '10px 20px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  View Items
                </button>
              </div>
            )}

            {outgoingTransfers.filter(t => t.status === 'REQUESTED').length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '2px solid #f59e0b',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>📤</span>
                  <div>
                    <p style={{ fontWeight: '700', color: '#92400e', margin: 0 }}>
                      Pending Approval
                    </p>
                    <p style={{ fontSize: '14px', color: '#b45309', margin: 0 }}>
                      {outgoingTransfers.filter(t => t.status === 'REQUESTED').length} transfer request(s) need your review
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFilters({ type: 'outgoing', status: 'REQUESTED' })}
                  style={{
                    padding: '10px 20px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Review Requests
                </button>
              </div>
            )}
          </>
        )}

        {/* Transfers List */}
        {loading ? (
          <LoadingState isMobile={isMobile} />
        ) : transfers.length === 0 ? (
          <EmptyState 
            hasFilter={!!filters.status || !!filters.type}
            onCreateClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            isManager={isManager}
            isMobile={isMobile}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {transfers.map(transfer => (
              <TransferCard
                key={transfer.id}
                transfer={transfer}
                currentUser={currentUser}
                getStatusConfig={getStatusConfig}
                getUrgencyConfig={getUrgencyConfig}
                canApproveReject={canApproveReject(transfer)}
                canSend={canSend(transfer)}
                canReceive={canReceive(transfer)}
                onView={() => {
                  setSelectedTransfer(transfer);
                  setShowDetailModal(true);
                }}
                onApprove={() => openActionModal(transfer, 'approve')}
                onReject={() => openActionModal(transfer, 'reject')}
                onSend={() => openActionModal(transfer, 'send')}
                onReceive={() => openActionModal(transfer, 'receive')}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Transfer Modal */}
      {showCreateModal && (
        <CreateTransferModal
          isMobile={isMobile}
          formData={formData}
          setFormData={setFormData}
          branches={branches}
          parts={getSourceBranchParts()}
          allParts={parts}
          currentUser={currentUser}
          onSubmit={handleCreateTransfer}
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
      {showDetailModal && selectedTransfer && (
        <TransferDetailModal
          isMobile={isMobile}
          transfer={selectedTransfer}
          currentUser={currentUser}
          getStatusConfig={getStatusConfig}
          getUrgencyConfig={getUrgencyConfig}
          canApproveReject={canApproveReject(selectedTransfer)}
          canSend={canSend(selectedTransfer)}
          canReceive={canReceive(selectedTransfer)}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedTransfer(null);
          }}
          onApprove={() => openActionModal(selectedTransfer, 'approve')}
          onReject={() => openActionModal(selectedTransfer, 'reject')}
          onSend={() => openActionModal(selectedTransfer, 'send')}
          onReceive={() => openActionModal(selectedTransfer, 'receive')}
        />
      )}

      {/* Action Modal */}
      {showActionModal && selectedTransfer && (
        <TransferActionModal
          isMobile={isMobile}
          transfer={selectedTransfer}
          actionType={actionType}
          onClose={() => {
            setShowActionModal(false);
            setActionType('');
          }}
          onSubmit={handleTransferAction}
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

// Helper Components for Transfers Page

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
          borderTopColor: '#8b5cf6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: '#6b7280', fontSize: '16px', fontWeight: '500', margin: 0 }}>
          Loading transfers...
        </p>
      </div>
    </div>
  );
}

function EmptyState({ hasFilter, onCreateClick, isManager, isMobile }) {
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
        🔄
      </div>
      <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1a202c', margin: 0, marginBottom: '8px' }}>
        No transfers found
      </h3>
      <p style={{ fontSize: '16px', color: '#6b7280', margin: 0, marginBottom: '24px' }}>
        {hasFilter 
          ? 'Try adjusting your filters to see transfers.'
          : 'Request inventory from another branch to get started.'
        }
      </p>
      {isManager && !hasFilter && (
        <button
          onClick={onCreateClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Request Transfer
        </button>
      )}
    </div>
  );
}

function TransferCard({ 
  transfer, 
  currentUser,
  getStatusConfig, 
  getUrgencyConfig, 
  canApproveReject,
  canSend,
  canReceive,
  onView, 
  onApprove,
  onReject,
  onSend,
  onReceive,
  isMobile 
}) {
  const statusConfig = getStatusConfig(transfer.status);
  const urgencyConfig = getUrgencyConfig(transfer.urgency);
  const itemCount = transfer.items?.length || 0;
  const isIncoming = transfer.toBranchId === currentUser?.branchId;
  const isOutgoing = transfer.fromBranchId === currentUser?.branchId;

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
      {/* Direction indicator */}
      <div style={{
        height: '4px',
        background: isIncoming 
          ? 'linear-gradient(90deg, #10b981, #34d399)' 
          : 'linear-gradient(90deg, #f59e0b, #fbbf24)'
      }} />

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
                {transfer.transferNumber}
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
                background: isIncoming ? '#d1fae5' : '#fef3c7',
                color: isIncoming ? '#059669' : '#d97706'
              }}>
                {isIncoming ? '📥 Incoming' : '📤 Outgoing'}
              </span>
            </div>

            {/* Branches */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              flexWrap: 'wrap'
            }}>
              <span style={{
                padding: '4px 12px',
                background: '#f3f4f6',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                {transfer.fromBranch?.name}
              </span>
              <svg style={{ width: '20px', height: '20px', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <span style={{
                padding: '4px 12px',
                background: '#f3f4f6',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                {transfer.toBranch?.name}
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
              <span style={{ color: '#9ca3af' }}>•</span>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: urgencyConfig.color
              }}>
                {urgencyConfig.icon} {urgencyConfig.label}
              </span>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            flexWrap: 'wrap'
          }}>
            {canApproveReject && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove();
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#d1fae5',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#059669',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject();
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#fee2e2',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Reject
                </button>
              </>
            )}

            {canSend && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSend();
                }}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                🚚 Send Items
              </button>
            )}

            {canReceive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReceive();
                }}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                ✓ Receive
              </button>
            )}

            <span style={{ color: '#6b7280', fontSize: '13px' }}>
              {new Date(transfer.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateTransferModal({
  isMobile,
  formData,
  setFormData,
  branches,
  parts,
  allParts,
  currentUser,
  onSubmit,
  onClose,
  addItem,
  removeItem,
  updateItem,
  submitting
}) {
  const otherBranches = branches.filter(b => b.id !== currentUser?.branchId);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // For managers, they request TO their branch, so source is other branches
  // For super admin, they can set both
  
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
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
          padding: '24px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, marginBottom: '4px' }}>
                🔄 Request Transfer
              </h2>
              <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                Request inventory items from another branch
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
            {/* Branch Selection */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr',
              gap: '16px',
              alignItems: 'end',
              marginBottom: '24px'
            }}>
              {/* Source Branch */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  From Branch <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={formData.fromBranchId}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    fromBranchId: e.target.value,
                    items: [{ partId: '', quantity: 1, notes: '' }] // Reset items when branch changes
                  }))}
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
                  <option value="">Select source branch...</option>
                  {(isSuperAdmin ? branches : otherBranches).map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} - {branch.location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Arrow */}
              {!isMobile && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingBottom: '8px'
                }}>
                  <svg style={{ width: '32px', height: '32px', color: '#8b5cf6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              )}

              {/* Destination Branch */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  To Branch <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {isSuperAdmin ? (
                  <select
                    value={formData.toBranchId}
                    onChange={(e) => setFormData(prev => ({ ...prev, toBranchId: e.target.value }))}
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
                    <option value="">Select destination branch...</option>
                    {branches.filter(b => b.id !== formData.fromBranchId).map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} - {branch.location}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    background: '#f9fafb',
                    color: '#374151',
                    fontWeight: '500'
                  }}>
                    {branches.find(b => b.id === currentUser?.branchId)?.name || 'Your Branch'}
                  </div>
                )}
              </div>
            </div>

            {/* Urgency */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px'
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
                  disabled={!formData.fromBranchId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 16px',
                    background: formData.fromBranchId ? '#ede9fe' : '#f3f4f6',
                    border: 'none',
                    borderRadius: '8px',
                    color: formData.fromBranchId ? '#7c3aed' : '#9ca3af',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: formData.fromBranchId ? 'pointer' : 'not-allowed'
                  }}
                >
                  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Item
                </button>
              </div>

              {!formData.fromBranchId ? (
                <div style={{
                  padding: '24px',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  Select a source branch to view available items
                </div>
              ) : parts.length === 0 ? (
                <div style={{
                  padding: '24px',
                  background: '#fef3c7',
                  borderRadius: '12px',
                  textAlign: 'center',
                  color: '#92400e'
                }}>
                  No items with available stock in selected branch
                </div>
              ) : (
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
                                {part.name} ({part.partNumber}) - Available: {part.quantity}
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
              )}
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
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Any additional notes or instructions..."
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
              disabled={submitting || !formData.fromBranchId}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '12px',
                background: formData.fromBranchId
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                  : '#e5e7eb',
                color: formData.fromBranchId ? 'white' : '#9ca3af',
                fontWeight: '600',
                cursor: formData.fromBranchId ? 'pointer' : 'not-allowed',
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

function TransferDetailModal({
  isMobile,
  transfer,
  currentUser,
  getStatusConfig,
  getUrgencyConfig,
  canApproveReject,
  canSend,
  canReceive,
  onClose,
  onApprove,
  onReject,
  onSend,
  onReceive
}) {
  const statusConfig = getStatusConfig(transfer.status);
  const urgencyConfig = getUrgencyConfig(transfer.urgency);
  const isIncoming = transfer.toBranchId === currentUser?.branchId;

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
          maxWidth: '650px',
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
              <p style={{ fontSize: '14px', opacity: 0.7, margin: 0, marginBottom: '4px' }}>Transfer</p>
              <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, marginBottom: '12px' }}>
                {transfer.transferNumber}
              </h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                  background: isIncoming ? '#d1fae5' : '#fef3c7',
                  color: isIncoming ? '#059669' : '#d97706'
                }}>
                  {isIncoming ? '📥 Incoming' : '📤 Outgoing'}
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
        <div style={{ padding: '24px', maxHeight: 'calc(90vh - 280px)', overflowY: 'auto' }}>
          {/* Transfer Route */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '20px',
            background: '#f8fafc',
            borderRadius: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>FROM</p>
              <p style={{ fontWeight: '700', fontSize: '16px', color: '#1a202c', margin: 0 }}>
                {transfer.fromBranch?.name}
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                {transfer.fromBranch?.location}
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg style={{ width: '24px', height: '24px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>TO</p>
              <p style={{ fontWeight: '700', fontSize: '16px', color: '#1a202c', margin: 0 }}>
                {transfer.toBranch?.name}
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                {transfer.toBranch?.location}
              </p>
            </div>
          </div>

          {/* Info Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>Requested By</p>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                {transfer.requestedBy?.name}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>Urgency</p>
              <p style={{
                fontSize: '14px',
                fontWeight: '600',
                color: urgencyConfig.color,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {urgencyConfig.icon} {urgencyConfig.label}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>Created</p>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                {new Date(transfer.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
            {transfer.approvedBy && (
              <div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>Approved By</p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                  {transfer.approvedBy?.name}
                </p>
              </div>
            )}
          </div>

          {/* Items */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, marginBottom: '12px', fontWeight: '600' }}>
              TRANSFER ITEMS
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {transfer.items?.map((item, index) => (
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
                    {item.quantitySent !== null && (
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                        Sent: {item.quantitySent}
                      </p>
                    )}
                    {item.quantityReceived !== null && (
                      <p style={{ fontSize: '12px', color: '#10b981', margin: 0 }}>
                        Received: {item.quantityReceived}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {transfer.notes && (
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>Notes</p>
              <p style={{ fontSize: '14px', color: '#1a202c', margin: 0 }}>{transfer.notes}</p>
            </div>
          )}

          {/* Rejection Reason */}
          {transfer.status === 'REJECTED' && transfer.rejectionReason && (
            <div style={{
              background: '#fef2f2',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #fecaca',
              marginTop: '16px'
            }}>
              <p style={{ fontSize: '12px', color: '#b91c1c', margin: 0, marginBottom: '4px', fontWeight: '600' }}>
                Rejection Reason
              </p>
              <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>{transfer.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          background: '#f9fafb',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              color: '#374151',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Close
          </button>

          {canApproveReject && (
            <>
              <button
                onClick={onReject}
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
                Approve
              </button>
            </>
          )}

          {canSend && (
            <button
              onClick={onSend}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🚚 Send Items
            </button>
          )}

          {canReceive && (
            <button
              onClick={onReceive}
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
              ✓ Confirm Receipt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TransferActionModal({
  isMobile,
  transfer,
  actionType,
  onClose,
  onSubmit,
  submitting
}) {
  const [itemData, setItemData] = useState(
    transfer.items?.map(item => ({
      id: item.id,
      partName: item.part?.name,
      quantityRequested: item.quantityRequested,
      quantitySent: item.quantitySent || item.quantityRequested,
      quantityReceived: item.quantityReceived || item.quantitySent || item.quantityRequested,
    })) || []
  );
  const [rejectionReason, setRejectionReason] = useState('');

  const handleQuantityChange = (itemId, field, value) => {
    setItemData(prev => prev.map(item =>
      item.id === itemId ? { ...item, [field]: parseInt(value) || 0 } : item
    ));
  };

  const handleSubmit = () => {
    if (actionType === 'reject') {
      onSubmit({ rejectionReason });
    } else if (actionType === 'approve' || actionType === 'send') {
      onSubmit({
        items: itemData.map(item => ({
          id: item.id,
          quantitySent: item.quantitySent
        }))
      });
    } else if (actionType === 'receive') {
      onSubmit({
        items: itemData.map(item => ({
          id: item.id,
          quantityReceived: item.quantityReceived
        }))
      });
    }
  };

  const getActionConfig = () => {
    const configs = {
      approve: {
        title: '✅ Approve Transfer',
        subtitle: 'Set quantities to send',
        buttonText: 'Approve & Set Quantities',
        buttonColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      },
      reject: {
        title: '❌ Reject Transfer',
        subtitle: 'Provide a reason for rejection',
        buttonText: 'Reject Transfer',
        buttonColor: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
      },
      send: {
        title: '🚚 Send Items',
        subtitle: 'Confirm items being dispatched',
        buttonText: 'Confirm Dispatch',
        buttonColor: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
      },
      receive: {
        title: '📦 Receive Items',
        subtitle: 'Confirm received quantities',
        buttonText: 'Confirm Receipt',
        buttonColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      }
    };
    return configs[actionType] || configs.approve;
  };

  const actionConfig = getActionConfig();

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
        zIndex: 60,
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
          maxWidth: '550px',
          maxHeight: '90vh',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: actionType === 'reject' ? '#fef2f2' : '#f0fdf4',
          padding: '24px',
          borderBottom: `2px solid ${actionType === 'reject' ? '#fecaca' : '#bbf7d0'}`
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: '700',
            margin: 0,
            marginBottom: '4px',
            color: actionType === 'reject' ? '#b91c1c' : '#15803d'
          }}>
            {actionConfig.title}
          </h2>
          <p style={{
            fontSize: '14px',
            color: actionType === 'reject' ? '#dc2626' : '#16a34a',
            margin: 0
          }}>
            {actionConfig.subtitle}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
          {actionType === 'reject' ? (
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Reason for Rejection
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                placeholder="Explain why this transfer is being rejected..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #fecaca',
                  borderRadius: '12px',
                  fontSize: '15px',
                  resize: 'none'
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {itemData.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <div>
                      <p style={{ fontWeight: '600', color: '#1a202c', margin: 0 }}>
                        {item.partName}
                      </p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                        Requested: {item.quantityRequested}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                      {actionType === 'receive' ? 'Received:' : 'Quantity:'}
                    </label>
                    <input
                      type="number"
                      value={actionType === 'receive' ? item.quantityReceived : item.quantitySent}
                      onChange={(e) => handleQuantityChange(
                        item.id,
                        actionType === 'receive' ? 'quantityReceived' : 'quantitySent',
                        e.target.value
                      )}
                      min="0"
                      max={item.quantityRequested}
                      style={{
                        width: '100px',
                        padding: '10px 12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                      / {item.quantityRequested}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            disabled={submitting}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '12px',
              background: actionConfig.buttonColor,
              color: 'white',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
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
            {actionConfig.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}