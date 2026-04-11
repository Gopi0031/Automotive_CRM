// app/(dashboard)/customers/page.js
'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
      padding: '24px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '32px',
      flexWrap: 'wrap',
      gap: '16px',
    },
    title: {
      fontSize: '2.25rem',
      fontWeight: '800',
      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      margin: 0,
    },
    addButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
      transition: 'all 0.3s ease',
    },
    searchContainer: {
      marginBottom: '24px',
    },
    searchInput: {
      width: '100%',
      maxWidth: '400px',
      padding: '14px 20px',
      paddingLeft: '48px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '1rem',
      outline: 'none',
      transition: 'all 0.3s ease',
      background: 'white',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'%3E%3C/path%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '16px center',
      backgroundSize: '20px',
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '32px',
    },
    statCard: {
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    },
    statIcon: {
      width: '56px',
      height: '56px',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
    },
    statValue: {
      fontSize: '1.75rem',
      fontWeight: '700',
      color: '#1f2937',
      margin: 0,
    },
    statLabel: {
      fontSize: '0.875rem',
      color: '#6b7280',
      margin: 0,
    },
    tableCard: {
      background: 'white',
      borderRadius: '20px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      animation: 'slideUp 0.5s ease',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    th: {
      padding: '18px 20px',
      textAlign: 'left',
      fontSize: '0.75rem',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: '#6b7280',
      background: '#f9fafb',
      borderBottom: '2px solid #e5e7eb',
    },
    td: {
      padding: '18px 20px',
      borderBottom: '1px solid #f3f4f6',
      fontSize: '0.95rem',
      color: '#374151',
    },
    tr: {
      transition: 'background-color 0.2s ease',
    },
    customerName: {
      fontWeight: '600',
      color: '#1f2937',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    avatar: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '700',
      fontSize: '1rem',
      color: 'white',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '600',
    },
    viewButton: {
      padding: '8px 16px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      marginRight: '8px',
      transition: 'all 0.3s ease',
    },
    deleteButton: {
      padding: '8px 16px',
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    modalBackdrop: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease',
      padding: '20px',
    },
    modal: {
      background: 'white',
      borderRadius: '24px',
      width: '100%',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
      animation: 'slideUp 0.4s ease',
    },
    modalHeader: {
      padding: '24px 32px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#1f2937',
      margin: 0,
    },
    closeButton: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      border: 'none',
      background: '#f3f4f6',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.25rem',
      color: '#6b7280',
      transition: 'all 0.3s ease',
    },
    modalBody: {
      padding: '32px',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '20px',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    formGroupFull: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      gridColumn: 'span 2',
    },
    label: {
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#374151',
    },
    required: {
      color: '#ef4444',
    },
    input: {
      padding: '14px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '1rem',
      outline: 'none',
      transition: 'all 0.3s ease',
      background: '#fafafa',
    },
    inputFocus: {
      borderColor: '#3b82f6',
      background: 'white',
      boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)',
    },
    modalFooter: {
      padding: '20px 32px',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
    },
    cancelButton: {
      padding: '12px 24px',
      background: '#f3f4f6',
      color: '#374151',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    submitButton: {
      padding: '12px 32px',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    loadingSpinner: {
      width: '48px',
      height: '48px',
      border: '4px solid #e5e7eb',
      borderTopColor: '#3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      background: 'white',
      borderRadius: '20px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
    },
    emptyIcon: {
      fontSize: '4rem',
      marginBottom: '16px',
    },
    emptyTitle: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#1f2937',
      marginBottom: '8px',
    },
    emptyText: {
      fontSize: '1rem',
      color: '#6b7280',
      marginBottom: '24px',
    },
    viewModalContent: {
      padding: '32px',
    },
    viewSection: {
      marginBottom: '24px',
    },
    viewLabel: {
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: '#6b7280',
      marginBottom: '4px',
    },
    viewValue: {
      fontSize: '1.1rem',
      fontWeight: '500',
      color: '#1f2937',
    },
    viewGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '24px',
    },
    vehicleCard: {
      background: '#f9fafb',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '12px',
    },
  };

  // CSS Keyframes (inject into head)
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customers');
      const data = await response.json();
      if (data.success) {
        setCustomers(data.data || []);
      } else {
        toast.error(data.message || 'Failed to load customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to create customer');
        return;
      }

      toast.success('🎉 Customer created successfully!', {
        style: {
          borderRadius: '12px',
          background: '#10b981',
          color: '#fff',
          fontWeight: '600',
        },
      });
      
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
      });
      setShowModal(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customerId) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Customer deleted successfully');
        setDeleteConfirm(null);
        fetchCustomers();
      } else {
        toast.error(data.message || 'Failed to delete customer');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAvatarColor = (name) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>👥 Customers</h1>
        <button
          style={styles.addButton}
          onClick={() => setShowModal(true)}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.4)';
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>➕</span>
          Add Customer
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsContainer}>
        <div
          style={styles.statCard}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
          }}
        >
          <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
            👥
          </div>
          <div>
            <p style={styles.statValue}>{customers.length}</p>
            <p style={styles.statLabel}>Total Customers</p>
          </div>
        </div>

        <div
          style={styles.statCard}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
          }}
        >
          <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            🚗
          </div>
          <div>
            <p style={styles.statValue}>
              {customers.reduce((acc, c) => acc + (c.vehicles?.length || 0), 0)}
            </p>
            <p style={styles.statLabel}>Total Vehicles</p>
          </div>
        </div>

        <div
          style={styles.statCard}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
          }}
        >
          <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
            📧
          </div>
          <div>
            <p style={styles.statValue}>
              {customers.filter((c) => c.email).length}
            </p>
            <p style={styles.statLabel}>With Email</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
          <div style={styles.loadingSpinner}></div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>👥</div>
          <h3 style={styles.emptyTitle}>
            {searchTerm ? 'No customers found' : 'No customers yet'}
          </h3>
          <p style={styles.emptyText}>
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Create your first customer to get started!'}
          </p>
          {!searchTerm && (
            <button
              style={styles.addButton}
              onClick={() => setShowModal(true)}
            >
              ➕ Add Your First Customer
            </button>
          )}
        </div>
      ) : (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>City</th>
                <th style={styles.th}>Vehicles</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer, index) => (
                <tr
                  key={customer.id}
                  style={{
                    ...styles.tr,
                    animation: `slideUp 0.3s ease ${index * 0.05}s both`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={styles.td}>
                    <div style={styles.customerName}>
                      <div
                        style={{
                          ...styles.avatar,
                          background: getAvatarColor(customer.name),
                        }}
                      >
                        {getInitials(customer.name)}
                      </div>
                      {customer.name}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>
                      {customer.phone}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {customer.email || (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {customer.city || (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        background: customer.vehicles?.length > 0
                          ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                          : '#f3f4f6',
                        color: customer.vehicles?.length > 0 ? '#1e40af' : '#6b7280',
                      }}
                    >
                      🚗 {customer.vehicles?.length || 0}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.viewButton}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setShowViewModal(true);
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      👁️ View
                    </button>
                    <button
                      style={styles.deleteButton}
                      onClick={() => setDeleteConfirm(customer.id)}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Customer Modal */}
      {showModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>➕ Add New Customer</h2>
              <button
                style={styles.closeButton}
                onClick={() => setShowModal(false)}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e5e7eb';
                  e.target.style.color = '#1f2937';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f3f4f6';
                  e.target.style.color = '#6b7280';
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Name <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      style={styles.input}
                      onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.background = '#fafafa';
                        e.target.style.boxShadow = 'none';
                      }}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Phone <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      style={styles.input}
                      onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.background = '#fafafa';
                        e.target.style.boxShadow = 'none';
                      }}
                      placeholder="+1 234 567 8900"
                      required
                    />
                  </div>

                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      style={styles.input}
                      onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.background = '#fafafa';
                        e.target.style.boxShadow = 'none';
                      }}
                      placeholder="john@example.com"
                    />
                  </div>

                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      style={styles.input}
                      onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.background = '#fafafa';
                        e.target.style.boxShadow = 'none';
                      }}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      style={styles.input}
                      onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.background = '#fafafa';
                        e.target.style.boxShadow = 'none';
                      }}
                      placeholder="New York"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      style={styles.input}
                      onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.background = '#fafafa';
                        e.target.style.boxShadow = 'none';
                      }}
                      placeholder="NY"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Pincode</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      style={styles.input}
                      onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.background = '#fafafa';
                        e.target.style.boxShadow = 'none';
                      }}
                      placeholder="10001"
                    />
                  </div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setShowModal(false)}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f3f4f6';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    ...styles.submitButton,
                    opacity: submitting ? 0.7 : 1,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                  disabled={submitting}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.4)';
                  }}
                >
                  {submitting ? (
                    <>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: 'white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }}
                      ></div>
                      Creating...
                    </>
                  ) : (
                    <>✓ Create Customer</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Customer Modal */}
      {showViewModal && selectedCustomer && (
        <div style={styles.modalBackdrop} onClick={() => setShowViewModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>👤 Customer Details</h2>
              <button
                style={styles.closeButton}
                onClick={() => setShowViewModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.viewModalContent}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '16px',
                    background: getAvatarColor(selectedCustomer.name),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                  }}
                >
                  {getInitials(selectedCustomer.name)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                    {selectedCustomer.name}
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#6b7280' }}>
                    Customer since {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div style={styles.viewGrid}>
                <div style={styles.viewSection}>
                  <p style={styles.viewLabel}>📱 Phone</p>
                  <p style={styles.viewValue}>{selectedCustomer.phone}</p>
                </div>

                <div style={styles.viewSection}>
                  <p style={styles.viewLabel}>📧 Email</p>
                  <p style={styles.viewValue}>{selectedCustomer.email || '—'}</p>
                </div>

                <div style={styles.viewSection}>
                  <p style={styles.viewLabel}>📍 Address</p>
                  <p style={styles.viewValue}>{selectedCustomer.address || '—'}</p>
                </div>

                <div style={styles.viewSection}>
                  <p style={styles.viewLabel}>🏙️ City</p>
                  <p style={styles.viewValue}>{selectedCustomer.city || '—'}</p>
                </div>

                <div style={styles.viewSection}>
                  <p style={styles.viewLabel}>🗺️ State</p>
                  <p style={styles.viewValue}>{selectedCustomer.state || '—'}</p>
                </div>

                <div style={styles.viewSection}>
                  <p style={styles.viewLabel}>📮 Pincode</p>
                  <p style={styles.viewValue}>{selectedCustomer.pincode || '—'}</p>
                </div>
              </div>

              {selectedCustomer.vehicles && selectedCustomer.vehicles.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <p style={{ ...styles.viewLabel, marginBottom: '12px' }}>🚗 Vehicles ({selectedCustomer.vehicles.length})</p>
                  {selectedCustomer.vehicles.map((vehicle) => (
                    <div key={vehicle.id} style={styles.vehicleCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: '600', color: '#1f2937' }}>
                            {vehicle.make} {vehicle.model} ({vehicle.year})
                          </p>
                          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                            {vehicle.licensePlate}
                          </p>
                        </div>
                        {vehicle.color && (
                          <span
                            style={{
                              padding: '4px 12px',
                              background: '#f3f4f6',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              color: '#374151',
                            }}
                          >
                            {vehicle.color}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={styles.modalBackdrop} onClick={() => setDeleteConfirm(null)}>
          <div
            style={{
              ...styles.modal,
              maxWidth: '400px',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '32px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  fontSize: '2rem',
                }}
              >
                ⚠️
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                Delete Customer?
              </h3>
              <p style={{ margin: '0 0 24px', color: '#6b7280' }}>
                This action cannot be undone. All data associated with this customer will be permanently deleted.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  style={styles.cancelButton}
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  style={styles.deleteButton}
                  onClick={() => handleDelete(deleteConfirm)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}