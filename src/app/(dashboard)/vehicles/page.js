// app/(dashboard)/vehicles/page.js
'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFuel, setFilterFuel] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    customerId: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    variant: '',
    color: '',
    licensePlate: '',
    presentOdometer: '',
    fuelType: 'PETROL',
    transmissionType: 'MANUAL',
    engineCapacity: '',
    registrationDate: '',
    insuranceExpiry: '',
    insuranceCompany: '',
    insurancePolicyNo: '',
    pucExpiry: '',
    vehicleCondition: 'GOOD',
    knownIssues: '',
    specialInstructions: '',
    customerNotes: '',
    internalNotes: '',
  });

  const fuelTypes = [
    { value: 'PETROL', label: '⛽ Petrol', color: '#22c55e' },
    { value: 'DIESEL', label: '🛢️ Diesel', color: '#eab308' },
    { value: 'CNG', label: '💨 CNG', color: '#3b82f6' },
    { value: 'LPG', label: '🔥 LPG', color: '#f97316' },
    { value: 'ELECTRIC', label: '⚡ Electric', color: '#8b5cf6' },
    { value: 'HYBRID', label: '🔋 Hybrid', color: '#06b6d4' },
    { value: 'PETROL_CNG', label: '⛽💨 Petrol + CNG', color: '#10b981' },
    { value: 'PETROL_LPG', label: '⛽🔥 Petrol + LPG', color: '#f59e0b' },
  ];

  const transmissionTypes = [
    { value: 'MANUAL', label: '🔧 Manual' },
    { value: 'AUTOMATIC', label: '🅰️ Automatic' },
    { value: 'CVT', label: '⚙️ CVT' },
    { value: 'DCT', label: '🎯 DCT' },
    { value: 'AMT', label: '🤖 AMT' },
    { value: 'SEMI_AUTOMATIC', label: '🔀 Semi-Auto' },
  ];

  const conditionTypes = [
    { value: 'EXCELLENT', label: '🌟 Excellent', color: '#22c55e', bg: '#dcfce7' },
    { value: 'GOOD', label: '✅ Good', color: '#3b82f6', bg: '#dbeafe' },
    { value: 'FAIR', label: '⚠️ Fair', color: '#f59e0b', bg: '#fef3c7' },
    { value: 'POOR', label: '🔴 Poor', color: '#ef4444', bg: '#fee2e2' },
    { value: 'NEEDS_ATTENTION', label: '🚨 Needs Attention', color: '#dc2626', bg: '#fecaca' },
  ];

  const popularMakes = [
    'Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Kia', 'Toyota', 
    'Honda', 'MG', 'Volkswagen', 'Skoda', 'Renault', 'Nissan',
    'Ford', 'Chevrolet', 'Jeep', 'BMW', 'Mercedes-Benz', 'Audi'
  ];

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
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
      background: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      margin: 0,
    },
    addButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '14px 28px',
      background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '14px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)',
      transition: 'all 0.3s ease',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '20px',
      marginBottom: '32px',
    },
    statCard: {
      background: 'white',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    statIcon: {
      width: '52px',
      height: '52px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
    },
    filtersContainer: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    searchInput: {
      flex: '1',
      minWidth: '280px',
      padding: '14px 20px 14px 48px',
      border: '2px solid #e0e7ff',
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
    filterSelect: {
      padding: '14px 20px',
      border: '2px solid #e0e7ff',
      borderRadius: '12px',
      fontSize: '0.95rem',
      outline: 'none',
      background: 'white',
      cursor: 'pointer',
      minWidth: '160px',
    },
    vehicleGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      gap: '24px',
    },
    vehicleCard: {
      background: 'white',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      transition: 'all 0.3s ease',
    },
    vehicleHeader: {
      padding: '20px 24px',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
      color: 'white',
    },
    vehiclePlate: {
      display: 'inline-block',
      padding: '8px 16px',
      background: '#fbbf24',
      color: '#1f2937',
      borderRadius: '6px',
      fontWeight: '800',
      fontSize: '1.1rem',
      fontFamily: 'monospace',
      letterSpacing: '1px',
      border: '2px solid #000',
      marginBottom: '12px',
    },
    vehicleName: {
      fontSize: '1.35rem',
      fontWeight: '700',
      margin: '8px 0 4px',
    },
    vehicleVariant: {
      fontSize: '0.9rem',
      opacity: 0.85,
    },
    vehicleBody: {
      padding: '20px 24px',
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
      marginBottom: '16px',
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    },
    infoLabel: {
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: '#6b7280',
    },
    infoValue: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1f2937',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '0.85rem',
      fontWeight: '600',
    },
    alertBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 14px',
      borderRadius: '10px',
      fontSize: '0.85rem',
      fontWeight: '500',
      marginTop: '12px',
    },
    vehicleFooter: {
      padding: '16px 24px',
      borderTop: '1px solid #f3f4f6',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    ownerInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    ownerAvatar: {
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: '700',
      fontSize: '0.9rem',
    },
    actionButtons: {
      display: 'flex',
      gap: '8px',
    },
    iconButton: {
      width: '38px',
      height: '38px',
      borderRadius: '10px',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1rem',
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
      padding: '20px',
    },
    modal: {
      background: 'white',
      borderRadius: '24px',
      width: '100%',
      maxWidth: '800px',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    },
    modalHeader: {
      padding: '24px 32px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      background: 'white',
      zIndex: 10,
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
    formSection: {
      marginBottom: '32px',
    },
    sectionTitle: {
      fontSize: '1rem',
      fontWeight: '700',
      color: '#374151',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    label: {
      fontSize: '0.85rem',
      fontWeight: '600',
      color: '#374151',
    },
    required: {
      color: '#ef4444',
    },
    input: {
      padding: '12px 14px',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '0.95rem',
      outline: 'none',
      transition: 'all 0.3s ease',
      background: '#fafafa',
    },
    select: {
      padding: '12px 14px',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '0.95rem',
      outline: 'none',
      background: '#fafafa',
      cursor: 'pointer',
    },
    textarea: {
      padding: '12px 14px',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '0.95rem',
      outline: 'none',
      transition: 'all 0.3s ease',
      background: '#fafafa',
      resize: 'vertical',
      minHeight: '80px',
      fontFamily: 'inherit',
    },
    modalFooter: {
      padding: '20px 32px',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      position: 'sticky',
      bottom: 0,
      background: 'white',
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
      borderTopColor: '#0ea5e9',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    emptyState: {
      textAlign: 'center',
      padding: '80px 20px',
      background: 'white',
      borderRadius: '24px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
    },
  };

  // CSS Keyframes
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
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
    `;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchCustomers();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicles');
      const data = await response.json();
      if (data.success) {
        setVehicles(data.data || []);
      } else {
        toast.error(data.message || 'Failed to load vehicles');
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      variant: '',
      color: '',
      licensePlate: '',
      presentOdometer: '',
      fuelType: 'PETROL',
      transmissionType: 'MANUAL',
      engineCapacity: '',
      registrationDate: '',
      insuranceExpiry: '',
      insuranceCompany: '',
      insurancePolicyNo: '',
      pucExpiry: '',
      vehicleCondition: 'GOOD',
      knownIssues: '',
      specialInstructions: '',
      customerNotes: '',
      internalNotes: '',
    });
    setEditMode(false);
    setSelectedVehicle(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editMode ? `/api/vehicles/${selectedVehicle.id}` : '/api/vehicles';
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to save vehicle');
        return;
      }

      toast.success(editMode ? '🚗 Vehicle updated!' : '🎉 Vehicle added!', {
        style: {
          borderRadius: '12px',
          background: '#10b981',
          color: '#fff',
          fontWeight: '600',
        },
      });

      resetForm();
      setShowModal(false);
      fetchVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (vehicle) => {
    setFormData({
      customerId: vehicle.customerId,
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year || new Date().getFullYear(),
      variant: vehicle.variant || '',
      color: vehicle.color || '',
      licensePlate: vehicle.licensePlate || '',
      presentOdometer: vehicle.presentOdometer || '',
      fuelType: vehicle.fuelType || 'PETROL',
      transmissionType: vehicle.transmissionType || 'MANUAL',
      engineCapacity: vehicle.engineCapacity || '',
      registrationDate: vehicle.registrationDate ? vehicle.registrationDate.split('T')[0] : '',
      insuranceExpiry: vehicle.insuranceExpiry ? vehicle.insuranceExpiry.split('T')[0] : '',
      insuranceCompany: vehicle.insuranceCompany || '',
      insurancePolicyNo: vehicle.insurancePolicyNo || '',
      pucExpiry: vehicle.pucExpiry ? vehicle.pucExpiry.split('T')[0] : '',
      vehicleCondition: vehicle.vehicleCondition || 'GOOD',
      knownIssues: vehicle.knownIssues || '',
      specialInstructions: vehicle.specialInstructions || '',
      customerNotes: vehicle.customerNotes || '',
      internalNotes: vehicle.internalNotes || '',
    });
    setSelectedVehicle(vehicle);
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (vehicleId) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Vehicle deleted successfully');
        setDeleteConfirm(null);
        fetchVehicles();
      } else {
        toast.error(data.message || 'Failed to delete vehicle');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const formatOdometer = (value) => {
    if (!value) return '—';
    return value.toLocaleString() + ' km';
  };

  const isExpiringSoon = (date) => {
    if (!date) return false;
    const expiry = new Date(date);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const getAvatarColor = (name) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    ];
    const index = name?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFuel = !filterFuel || vehicle.fuelType === filterFuel;
    const matchesCondition = !filterCondition || vehicle.vehicleCondition === filterCondition;

    return matchesSearch && matchesFuel && matchesCondition;
  });

  // Stats
  const totalVehicles = vehicles.length;
  const needsAttention = vehicles.filter((v) => v.vehicleCondition === 'NEEDS_ATTENTION' || v.vehicleCondition === 'POOR').length;
  const insuranceExpiring = vehicles.filter((v) => isExpiringSoon(v.insuranceExpiry) || isExpired(v.insuranceExpiry)).length;
  const avgOdometer = vehicles.length > 0
    ? Math.round(vehicles.reduce((sum, v) => sum + (v.presentOdometer || 0), 0) / vehicles.filter(v => v.presentOdometer).length)
    : 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🚗 Vehicles</h1>
        <button
          style={styles.addButton}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 14px rgba(14, 165, 233, 0.4)';
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>➕</span>
          Add Vehicle
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
            🚗
          </div>
          <div>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>{totalVehicles}</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Total Vehicles</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
            🔧
          </div>
          <div>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>{needsAttention}</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Needs Attention</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
            📋
          </div>
          <div>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>{insuranceExpiring}</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Insurance Alert</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            📊
          </div>
          <div>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>{formatOdometer(avgOdometer)}</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Avg Odometer</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filtersContainer}>
        <input
          type="text"
          placeholder="Search by plate, make, model, or owner..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterFuel}
          onChange={(e) => setFilterFuel(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Fuel Types</option>
          {fuelTypes.map((fuel) => (
            <option key={fuel.value} value={fuel.value}>{fuel.label}</option>
          ))}
        </select>
        <select
          value={filterCondition}
          onChange={(e) => setFilterCondition(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Conditions</option>
          {conditionTypes.map((cond) => (
            <option key={cond.value} value={cond.value}>{cond.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div style={styles.loadingSpinner}></div>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🚗</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
            {searchTerm || filterFuel || filterCondition ? 'No vehicles found' : 'No vehicles yet'}
          </h3>
          <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '24px' }}>
            {searchTerm || filterFuel || filterCondition
              ? 'Try adjusting your filters'
              : 'Add your first vehicle to get started!'}
          </p>
          {!searchTerm && !filterFuel && !filterCondition && (
            <button style={styles.addButton} onClick={() => setShowModal(true)}>
              ➕ Add Your First Vehicle
            </button>
          )}
        </div>
      ) : (
        <div style={styles.vehicleGrid}>
          {filteredVehicles.map((vehicle, index) => {
            const fuel = fuelTypes.find((f) => f.value === vehicle.fuelType);
            const condition = conditionTypes.find((c) => c.value === vehicle.vehicleCondition);
            const hasInsuranceAlert = isExpiringSoon(vehicle.insuranceExpiry) || isExpired(vehicle.insuranceExpiry);
            const hasPucAlert = isExpiringSoon(vehicle.pucExpiry) || isExpired(vehicle.pucExpiry);

            return (
              <div
                key={vehicle.id}
                style={{
                  ...styles.vehicleCard,
                  animation: `slideUp 0.4s ease ${index * 0.05}s both`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
                }}
              >
                <div style={styles.vehicleHeader}>
                  <div style={styles.vehiclePlate}>{vehicle.licensePlate}</div>
                  <p style={styles.vehicleName}>
                    {vehicle.make} {vehicle.model}
                  </p>
                  <p style={styles.vehicleVariant}>
                    {vehicle.year} {vehicle.variant && `• ${vehicle.variant}`} {vehicle.color && `• ${vehicle.color}`}
                  </p>
                </div>

                <div style={styles.vehicleBody}>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>📊 Odometer</span>
                      <span style={styles.infoValue}>{formatOdometer(vehicle.presentOdometer)}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>⛽ Fuel Type</span>
                      <span style={{ ...styles.badge, background: `${fuel?.color}20`, color: fuel?.color }}>
                        {fuel?.label || vehicle.fuelType}
                      </span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>⚙️ Transmission</span>
                      <span style={styles.infoValue}>
                        {transmissionTypes.find((t) => t.value === vehicle.transmissionType)?.label || vehicle.transmissionType}
                      </span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>🔧 Condition</span>
                      <span style={{ ...styles.badge, background: condition?.bg, color: condition?.color }}>
                        {condition?.label || vehicle.vehicleCondition}
                      </span>
                    </div>
                  </div>

                  {vehicle.engineCapacity && (
                    <div style={{ ...styles.infoItem, marginBottom: '12px' }}>
                      <span style={styles.infoLabel}>🔩 Engine</span>
                      <span style={styles.infoValue}>{vehicle.engineCapacity} CC</span>
                    </div>
                  )}

                  {/* Alerts */}
                  {(hasInsuranceAlert || hasPucAlert) && (
                    <div>
                      {hasInsuranceAlert && (
                        <div style={{
                          ...styles.alertBadge,
                          background: isExpired(vehicle.insuranceExpiry) ? '#fee2e2' : '#fef3c7',
                          color: isExpired(vehicle.insuranceExpiry) ? '#dc2626' : '#d97706',
                        }}>
                          {isExpired(vehicle.insuranceExpiry) ? '🚨' : '⚠️'}
                          Insurance {isExpired(vehicle.insuranceExpiry) ? 'Expired' : 'Expiring Soon'}
                          <span style={{ marginLeft: 'auto', fontWeight: '600' }}>
                            {new Date(vehicle.insuranceExpiry).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {hasPucAlert && (
                        <div style={{
                          ...styles.alertBadge,
                          background: isExpired(vehicle.pucExpiry) ? '#fee2e2' : '#fef3c7',
                          color: isExpired(vehicle.pucExpiry) ? '#dc2626' : '#d97706',
                        }}>
                          {isExpired(vehicle.pucExpiry) ? '🚨' : '⚠️'}
                          PUC {isExpired(vehicle.pucExpiry) ? 'Expired' : 'Expiring Soon'}
                          <span style={{ marginLeft: 'auto', fontWeight: '600' }}>
                            {new Date(vehicle.pucExpiry).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {vehicle.knownIssues && (
                    <div style={{
                      ...styles.alertBadge,
                      background: '#fef3c7',
                      color: '#92400e',
                    }}>
                      ⚠️ Known Issues: {vehicle.knownIssues.substring(0, 50)}...
                    </div>
                  )}
                </div>

                <div style={styles.vehicleFooter}>
                  <div style={styles.ownerInfo}>
                    <div style={{ ...styles.ownerAvatar, background: getAvatarColor(vehicle.customer?.name) }}>
                      {getInitials(vehicle.customer?.name)}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem', color: '#1f2937' }}>
                        {vehicle.customer?.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                        {vehicle.customer?.phone}
                      </p>
                    </div>
                  </div>
                  <div style={styles.actionButtons}>
                    <button
                      style={{ ...styles.iconButton, background: '#dbeafe', color: '#1d4ed8' }}
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        setShowViewModal(true);
                      }}
                      title="View Details"
                    >
                      👁️
                    </button>
                    <button
                      style={{ ...styles.iconButton, background: '#fef3c7', color: '#d97706' }}
                      onClick={() => handleEdit(vehicle)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      style={{ ...styles.iconButton, background: '#fee2e2', color: '#dc2626' }}
                      onClick={() => setDeleteConfirm(vehicle.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Vehicle Modal */}
      {showModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editMode ? '✏️ Edit Vehicle' : '🚗 Add New Vehicle'}
              </h2>
              <button style={styles.closeButton} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.modalBody}>
                {/* Customer Selection */}
                <div style={styles.formSection}>
                  <h3 style={styles.sectionTitle}>👤 Customer</h3>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Select Customer <span style={styles.required}>*</span>
                    </label>
                    <select
                      name="customerId"
                      value={formData.customerId}
                      onChange={handleChange}
                      style={styles.select}
                      required
                      disabled={editMode}
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} - {customer.phone}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Basic Info */}
                <div style={styles.formSection}>
                  <h3 style={styles.sectionTitle}>🚗 Basic Information</h3>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Make <span style={styles.required}>*</span>
                      </label>
                      <select
                        name="make"
                        value={formData.make}
                        onChange={handleChange}
                        style={styles.select}
                        required
                      >
                        <option value="">Select Make</option>
                        {popularMakes.map((make) => (
                          <option key={make} value={make}>{make}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Model <span style={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        name="model"
                        value={formData.model}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="e.g., Swift, i20, Nexon"
                        required
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Year <span style={styles.required}>*</span>
                      </label>
                      <input
                        type="number"
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        style={styles.input}
                        min="1990"
                        max={new Date().getFullYear() + 1}
                        required
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Variant</label>
                      <input
                        type="text"
                        name="variant"
                        value={formData.variant}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="e.g., LXI, VXI, ZXI+"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Color</label>
                      <input
                        type="text"
                        name="color"
                        value={formData.color}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="e.g., White, Silver"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        License Plate <span style={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        name="licensePlate"
                        value={formData.licensePlate}
                        onChange={handleChange}
                        style={{ ...styles.input, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: '600' }}
                        placeholder="MH 01 AB 1234"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Technical Specs */}
                <div style={styles.formSection}>
                  <h3 style={styles.sectionTitle}>⚙️ Technical Specifications</h3>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Present Odometer (km)</label>
                      <input
                        type="number"
                        name="presentOdometer"
                        value={formData.presentOdometer}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="e.g., 45000"
                        min="0"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Fuel Type</label>
                      <select
                        name="fuelType"
                        value={formData.fuelType}
                        onChange={handleChange}
                        style={styles.select}
                      >
                        {fuelTypes.map((fuel) => (
                          <option key={fuel.value} value={fuel.value}>{fuel.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Transmission</label>
                      <select
                        name="transmissionType"
                        value={formData.transmissionType}
                        onChange={handleChange}
                        style={styles.select}
                      >
                        {transmissionTypes.map((trans) => (
                          <option key={trans.value} value={trans.value}>{trans.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Engine Capacity (CC)</label>
                      <input
                        type="number"
                        name="engineCapacity"
                        value={formData.engineCapacity}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="e.g., 1197"
                        min="0"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Vehicle Condition</label>
                      <select
                        name="vehicleCondition"
                        value={formData.vehicleCondition}
                        onChange={handleChange}
                        style={styles.select}
                      >
                        {conditionTypes.map((cond) => (
                          <option key={cond.value} value={cond.value}>{cond.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Registration & Insurance */}
                <div style={styles.formSection}>
                  <h3 style={styles.sectionTitle}>📋 Registration & Insurance</h3>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Registration Date</label>
                      <input
                        type="date"
                        name="registrationDate"
                        value={formData.registrationDate}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Insurance Company</label>
                      <input
                        type="text"
                        name="insuranceCompany"
                        value={formData.insuranceCompany}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="e.g., ICICI Lombard"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Policy Number</label>
                      <input
                        type="text"
                        name="insurancePolicyNo"
                        value={formData.insurancePolicyNo}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="Policy number"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Insurance Expiry</label>
                      <input
                        type="date"
                        name="insuranceExpiry"
                        value={formData.insuranceExpiry}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>PUC Expiry</label>
                      <input
                        type="date"
                        name="pucExpiry"
                        value={formData.pucExpiry}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div style={styles.formSection}>
                  <h3 style={styles.sectionTitle}>📝 Notes & Issues</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Known Issues</label>
                      <textarea
                        name="knownIssues"
                        value={formData.knownIssues}
                        onChange={handleChange}
                        style={styles.textarea}
                        placeholder="Any known problems with the vehicle..."
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Special Instructions</label>
                      <textarea
                        name="specialInstructions"
                        value={formData.specialInstructions}
                        onChange={handleChange}
                        style={styles.textarea}
                        placeholder="Special handling instructions..."
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Customer Notes</label>
                      <textarea
                        name="customerNotes"
                        value={formData.customerNotes}
                        onChange={handleChange}
                        style={styles.textarea}
                        placeholder="Notes from the customer..."
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Internal Notes (Staff Only)</label>
                      <textarea
                        name="internalNotes"
                        value={formData.internalNotes}
                        onChange={handleChange}
                        style={styles.textarea}
                        placeholder="Internal garage notes..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" style={styles.cancelButton} onClick={() => setShowModal(false)}>
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
                >
                  {submitting ? (
                    <>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}></div>
                      {editMode ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>✓ {editMode ? 'Update Vehicle' : 'Add Vehicle'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Vehicle Modal */}
      {showViewModal && selectedVehicle && (
        <div style={styles.modalBackdrop} onClick={() => setShowViewModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>🚗 Vehicle Details</h2>
              <button style={styles.closeButton} onClick={() => setShowViewModal(false)}>✕</button>
            </div>

            <div style={{ padding: '24px 32px' }}>
              {/* Vehicle Header */}
              <div style={{
                background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
                marginBottom: '24px',
              }}>
                <div style={styles.vehiclePlate}>{selectedVehicle.licensePlate}</div>
                <h3 style={{ margin: '12px 0 4px', fontSize: '1.5rem', fontWeight: '700' }}>
                  {selectedVehicle.make} {selectedVehicle.model}
                </h3>
                <p style={{ margin: 0, opacity: 0.9 }}>
                  {selectedVehicle.year} {selectedVehicle.variant && `• ${selectedVehicle.variant}`} {selectedVehicle.color && `• ${selectedVehicle.color}`}
                </p>
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>📊 Present Odometer</span>
                  <span style={{ ...styles.infoValue, fontSize: '1.25rem' }}>
                    {formatOdometer(selectedVehicle.presentOdometer)}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>⛽ Fuel Type</span>
                  <span style={styles.infoValue}>
                    {fuelTypes.find((f) => f.value === selectedVehicle.fuelType)?.label}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>⚙️ Transmission</span>
                  <span style={styles.infoValue}>
                    {transmissionTypes.find((t) => t.value === selectedVehicle.transmissionType)?.label}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>🔩 Engine Capacity</span>
                  <span style={styles.infoValue}>
                    {selectedVehicle.engineCapacity ? `${selectedVehicle.engineCapacity} CC` : '—'}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>🔧 Condition</span>
                  <span style={styles.infoValue}>
                    {conditionTypes.find((c) => c.value === selectedVehicle.vehicleCondition)?.label}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>📅 Registered</span>
                  <span style={styles.infoValue}>
                    {selectedVehicle.registrationDate
                      ? new Date(selectedVehicle.registrationDate).toLocaleDateString()
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Insurance & PUC */}
              <div style={{
                background: '#f9fafb',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
              }}>
                <h4 style={{ margin: '0 0 16px', fontWeight: '600' }}>📋 Insurance & Documents</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#6b7280' }}>Insurance Company</p>
                    <p style={{ margin: 0, fontWeight: '500' }}>{selectedVehicle.insuranceCompany || '—'}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#6b7280' }}>Policy Number</p>
                    <p style={{ margin: 0, fontWeight: '500', fontFamily: 'monospace' }}>
                      {selectedVehicle.insurancePolicyNo || '—'}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#6b7280' }}>Insurance Expiry</p>
                    <p style={{
                      margin: 0,
                      fontWeight: '600',
                      color: isExpired(selectedVehicle.insuranceExpiry) ? '#dc2626' :
                        isExpiringSoon(selectedVehicle.insuranceExpiry) ? '#d97706' : '#1f2937'
                    }}>
                      {selectedVehicle.insuranceExpiry
                        ? new Date(selectedVehicle.insuranceExpiry).toLocaleDateString()
                        : '—'}
                      {isExpired(selectedVehicle.insuranceExpiry) && ' (Expired!)'}
                      {isExpiringSoon(selectedVehicle.insuranceExpiry) && ' (Expiring Soon)'}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#6b7280' }}>PUC Expiry</p>
                    <p style={{
                      margin: 0,
                      fontWeight: '600',
                      color: isExpired(selectedVehicle.pucExpiry) ? '#dc2626' :
                        isExpiringSoon(selectedVehicle.pucExpiry) ? '#d97706' : '#1f2937'
                    }}>
                      {selectedVehicle.pucExpiry
                        ? new Date(selectedVehicle.pucExpiry).toLocaleDateString()
                        : '—'}
                      {isExpired(selectedVehicle.pucExpiry) && ' (Expired!)'}
                      {isExpiringSoon(selectedVehicle.pucExpiry) && ' (Expiring Soon)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {(selectedVehicle.knownIssues || selectedVehicle.specialInstructions ||
                selectedVehicle.customerNotes || selectedVehicle.internalNotes) && (
                  <div style={{
                    background: '#fffbeb',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px',
                  }}>
                    <h4 style={{ margin: '0 0 16px', fontWeight: '600' }}>📝 Notes & Instructions</h4>
                    {selectedVehicle.knownIssues && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#92400e', fontWeight: '600' }}>
                          ⚠️ Known Issues
                        </p>
                        <p style={{ margin: 0, color: '#78350f' }}>{selectedVehicle.knownIssues}</p>
                      </div>
                    )}
                    {selectedVehicle.specialInstructions && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#92400e', fontWeight: '600' }}>
                          📌 Special Instructions
                        </p>
                        <p style={{ margin: 0, color: '#78350f' }}>{selectedVehicle.specialInstructions}</p>
                      </div>
                    )}
                    {selectedVehicle.customerNotes && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#92400e', fontWeight: '600' }}>
                          💬 Customer Notes
                        </p>
                        <p style={{ margin: 0, color: '#78350f' }}>{selectedVehicle.customerNotes}</p>
                      </div>
                    )}
                    {selectedVehicle.internalNotes && (
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#92400e', fontWeight: '600' }}>
                          🔒 Internal Notes
                        </p>
                        <p style={{ margin: 0, color: '#78350f' }}>{selectedVehicle.internalNotes}</p>
                      </div>
                    )}
                  </div>
                )}

              {/* Owner Info */}
              <div style={{
                background: '#f0fdf4',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: getAvatarColor(selectedVehicle.customer?.name),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '1.25rem',
                }}>
                  {getInitials(selectedVehicle.customer?.name)}
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '1.1rem', color: '#1f2937' }}>
                    {selectedVehicle.customer?.name}
                  </p>
                  <p style={{ margin: 0, color: '#6b7280' }}>
                    📞 {selectedVehicle.customer?.phone}
                    {selectedVehicle.customer?.email && ` • ✉️ ${selectedVehicle.customer?.email}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div style={styles.modalBackdrop} onClick={() => setDeleteConfirm(null)}>
          <div
            style={{ ...styles.modal, maxWidth: '400px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '32px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                fontSize: '2rem',
              }}>
                ⚠️
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                Delete Vehicle?
              </h3>
              <p style={{ margin: '0 0 24px', color: '#6b7280' }}>
                This action cannot be undone. The vehicle will be permanently removed.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button style={styles.cancelButton} onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.submitButton,
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                  }}
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