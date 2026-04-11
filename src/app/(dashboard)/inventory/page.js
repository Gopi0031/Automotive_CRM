// src/app/(dashboard)/inventory/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function InventoryPage() {
  const [parts, setParts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Bulk upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    lowStock: false,
  });

  // Form data
  const [formData, setFormData] = useState({
    partNumber: '',
    name: '',
    description: '',
    category: 'PARTS',
    brand: '',
    costPrice: '',
    sellingPrice: '',
    quantity: '',
    minStockLevel: '5',
    location: '',
    supplier: '',
    branchId: '',
  });

  // Adjustment form
  const [adjustmentData, setAdjustmentData] = useState({
    type: 'add',
    quantity: '',
    reason: '',
  });

  // Stats
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    availableItems: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  // Categories
  const categories = [
    { value: 'PARTS', label: 'Parts', icon: '⚙️' },
    { value: 'ACCESSORIES', label: 'Accessories', icon: '🔧' },
    { value: 'FLUIDS', label: 'Fluids & Oils', icon: '🛢️' },
    { value: 'FILTERS', label: 'Filters', icon: '🔲' },
    { value: 'ELECTRICAL', label: 'Electrical', icon: '⚡' },
    { value: 'BODY', label: 'Body Parts', icon: '🚗' },
    { value: 'TYRES', label: 'Tyres & Wheels', icon: '🛞' },
    { value: 'TOOLS', label: 'Tools', icon: '🔨' },
    { value: 'OTHER', label: 'Other', icon: '📦' },
  ];

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
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
      fetchParts();
    }
  }, [filters, currentUser]);

  const fetchInitialData = async () => {
    try {
      const branchesRes = await fetch('/api/branches');
      const branchesData = await branchesRes.json();
      if (branchesData.success) {
        setBranches(branchesData.data || []);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchParts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.lowStock) params.append('lowStock', 'true');

      const response = await fetch(`/api/inventory?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setParts(data.data || []);
        calculateStats(data.data || []);
      } else {
        toast.error(data.message || 'Failed to load inventory');
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const calculateStats = (partsData) => {
    const totalValue = partsData.reduce((sum, p) => sum + (p.sellingPrice * p.quantity), 0);
    const availableItems = partsData.filter(p => p.quantity > 0).length;
    const lowStockCount = partsData.filter(p => p.quantity <= p.minStockLevel && p.quantity > 0).length;
    const outOfStockCount = partsData.filter(p => p.quantity === 0).length;

    setStats({
      totalItems: partsData.length,
      totalValue,
      availableItems,
      lowStockCount,
      outOfStockCount,
    });
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      lowStock: false,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      partNumber: '',
      name: '',
      description: '',
      category: 'PARTS',
      brand: '',
      costPrice: '',
      sellingPrice: '',
      quantity: '',
      minStockLevel: '5',
      location: '',
      supplier: '',
      branchId: '',
    });
    setEditingPart(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (part) => {
    setEditingPart(part);
    setFormData({
      partNumber: part.partNumber,
      name: part.name,
      description: part.description || '',
      category: part.category,
      brand: part.brand || '',
      costPrice: part.costPrice.toString(),
      sellingPrice: part.sellingPrice.toString(),
      quantity: part.quantity.toString(),
      minStockLevel: part.minStockLevel.toString(),
      location: part.location || '',
      supplier: part.supplier || '',
      branchId: part.branchId || '',
    });
    setShowModal(true);
  };

  const openDetailModal = (part) => {
    setSelectedPart(part);
    setShowDetailModal(true);
  };

  const openAdjustModal = (part) => {
    setSelectedPart(part);
    setAdjustmentData({ type: 'add', quantity: '', reason: '' });
    setShowAdjustModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = '/api/inventory';
      const method = editingPart ? 'PUT' : 'POST';

      const payload = editingPart
        ? { id: editingPart.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || `Failed to ${editingPart ? 'update' : 'add'} part`);
        return;
      }

      toast.success(`Part ${editingPart ? 'updated' : 'added'} successfully`);
      resetForm();
      setShowModal(false);
      fetchParts();
    } catch (error) {
      console.error('Error saving part:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedPart) return;
    setSubmitting(true);

    try {
      const response = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPart.id,
          adjustmentType: adjustmentData.type,
          adjustmentQty: Number(adjustmentData.quantity),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to adjust stock');
        return;
      }

      toast.success(`Stock ${adjustmentData.type === 'add' ? 'added' : 'reduced'} successfully`);
      setShowAdjustModal(false);
      setAdjustmentData({ type: 'add', quantity: '', reason: '' });
      fetchParts();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (part) => {
    if (!confirm(`Are you sure you want to delete "${part.name}"?`)) return;

    try {
      const response = await fetch(`/api/inventory?id=${part.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to delete part');
        return;
      }

      toast.success(data.message);
      fetchParts();
    } catch (error) {
      console.error('Error deleting part:', error);
      toast.error('An error occurred');
    }
  };

  const getStockStatus = (part) => {
    if (part.quantity === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800', icon: '❌' };
    }
    if (part.quantity <= part.minStockLevel) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800', icon: '⚠️' };
    }
    return { label: 'In Stock', color: 'bg-green-100 text-green-800', icon: '✓' };
  };

  const getCategoryIcon = (category) => {
    return categories.find(c => c.value === category)?.icon || '📦';
  };

  // Excel Template Generator
  const downloadExcelTemplate = () => {
    const template = [
      {
        partNumber: 'OIL-5W30-001',
        name: 'Engine Oil 5W-30',
        description: '1 Liter synthetic engine oil',
        category: 'FLUIDS',
        brand: 'Castrol',
        costPrice: 450,
        sellingPrice: 650,
        quantity: 50,
        minStockLevel: 10,
        location: 'Shelf A-1',
        supplier: 'Auto Parts Supplier Ltd',
      },
      {
        partNumber: 'FILTER-OIL-002',
        name: 'Oil Filter',
        description: 'Standard oil filter',
        category: 'FILTERS',
        brand: 'Bosch',
        costPrice: 150,
        sellingPrice: 250,
        quantity: 100,
        minStockLevel: 20,
        location: 'Shelf B-2',
        supplier: 'Bosch India',
      },
      {
        partNumber: 'BRAKE-PAD-003',
        name: 'Brake Pads Set',
        description: 'Front brake pads - ceramic',
        category: 'PARTS',
        brand: 'Brembo',
        costPrice: 800,
        sellingPrice: 1200,
        quantity: 30,
        minStockLevel: 5,
        location: 'Shelf C-3',
        supplier: 'Brake Parts Co',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Parts Template');

    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 30 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
    ];

    XLSX.writeFile(workbook, 'Inventory_Template.xlsx');
    toast.success('Template downloaded successfully');
  };

  // Handle Excel file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setUploadFile(file);
    setIsProcessing(true);
    setUploadErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast.error('Excel file is empty');
          setIsProcessing(false);
          return;
        }

        const validatedData = validateExcelData(jsonData);
        setUploadPreview(validatedData.valid);
        setUploadErrors(validatedData.errors);
        setIsProcessing(false);

        if (validatedData.valid.length > 0) {
          toast.success(`${validatedData.valid.length} valid items found`);
        }
        if (validatedData.errors.length > 0) {
          toast.error(`${validatedData.errors.length} items have errors`);
        }
      } catch (error) {
        console.error('Error reading Excel file:', error);
        toast.error('Error reading Excel file');
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validateExcelData = (data) => {
    const valid = [];
    const errors = [];
    const categoryValues = ['PARTS', 'ACCESSORIES', 'FLUIDS', 'FILTERS', 'ELECTRICAL', 'BODY', 'TYRES', 'TOOLS', 'OTHER'];

    data.forEach((row, index) => {
      const rowErrors = [];

      if (!row.partNumber) rowErrors.push('Part number is required');
      if (!row.name) rowErrors.push('Name is required');
      if (!row.category) rowErrors.push('Category is required');
      if (row.costPrice === undefined || row.costPrice === null) rowErrors.push('Cost price is required');
      if (row.sellingPrice === undefined || row.sellingPrice === null) rowErrors.push('Selling price is required');
      if (row.quantity === undefined || row.quantity === null) rowErrors.push('Quantity is required');

      if (row.costPrice && isNaN(Number(row.costPrice))) rowErrors.push('Cost price must be a number');
      if (row.sellingPrice && isNaN(Number(row.sellingPrice))) rowErrors.push('Selling price must be a number');
      if (row.quantity && isNaN(Number(row.quantity))) rowErrors.push('Quantity must be a number');
      if (row.minStockLevel && isNaN(Number(row.minStockLevel))) rowErrors.push('Min stock level must be a number');

      if (row.costPrice && Number(row.costPrice) < 0) rowErrors.push('Cost price cannot be negative');
      if (row.sellingPrice && Number(row.sellingPrice) < 0) rowErrors.push('Selling price cannot be negative');
      if (row.quantity && Number(row.quantity) < 0) rowErrors.push('Quantity cannot be negative');

      if (row.category && !categoryValues.includes(row.category.toUpperCase())) {
        rowErrors.push(`Invalid category. Must be one of: ${categoryValues.join(', ')}`);
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: index + 2,
          data: row,
          errors: rowErrors
        });
      } else {
        valid.push({
          ...row,
          partNumber: String(row.partNumber).trim().toUpperCase(),
          category: row.category.toUpperCase(),
          costPrice: Number(row.costPrice),
          sellingPrice: Number(row.sellingPrice),
          quantity: Number(row.quantity),
          minStockLevel: row.minStockLevel ? Number(row.minStockLevel) : 5,
        });
      }
    });

    return { valid, errors };
  };

  const handleBulkUpload = async () => {
    if (uploadPreview.length === 0) {
      toast.error('No valid items to upload');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/inventory/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts: uploadPreview,
          branchId: currentUser?.role === 'SUPER_ADMIN' ? null : currentUser?.branchId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to upload parts');
        return;
      }

      toast.success(`Successfully uploaded ${data.imported} part(s)${data.failed > 0 ? `. ${data.failed} failed.` : ''}`);

      setShowBulkUploadModal(false);
      setUploadFile(null);
      setUploadPreview([]);
      setUploadErrors([]);
      fetchParts();
    } catch (error) {
      console.error('Error uploading parts:', error);
      toast.error('An error occurred during upload');
    } finally {
      setSubmitting(false);
    }
  };

  const canManageInventory = ['SUPER_ADMIN', 'MANAGER'].includes(currentUser?.role);
  const isEmployee = currentUser?.role === 'EMPLOYEE';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb'
    }}>
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
            gap: isMobile ? '16px' : '24px'
          }}>
            <div>
              <h1 style={{
                fontSize: isMobile ? '24px' : 'clamp(24px, 4vw, 32px)',
                fontWeight: '800',
                color: '#1a202c',
                margin: 0,
                marginBottom: '4px'
              }}>
                📦 {isEmployee ? 'Parts & Inventory' : 'Inventory Management'}
              </h1>
              <p style={{
                color: '#6b7280',
                fontSize: isMobile ? '14px' : '16px',
                margin: 0
              }}>
                {isEmployee ? 'View available parts and stock levels' : 'Manage parts, supplies, and stock levels'}
              </p>
            </div>

            {canManageInventory && (
              <div style={{
                display: 'flex',
                gap: isMobile ? '8px' : '12px',
                width: isMobile ? '100%' : 'auto',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={downloadExcelTemplate}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'white',
                    border: '2px solid #10b981',
                    color: '#10b981',
                    padding: isMobile ? '10px 16px' : '12px 20px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: isMobile ? '13px' : '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: isMobile ? '1' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#10b981';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#10b981';
                  }}
                >
                  <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {isMobile ? '📥' : 'Template'}
                </button>

                <button
                  onClick={() => setShowBulkUploadModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                    border: 'none',
                    color: 'white',
                    padding: isMobile ? '10px 16px' : '12px 20px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: isMobile ? '13px' : '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.2s',
                    flex: isMobile ? '1' : 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {isMobile ? '📤 Bulk' : 'Bulk Upload'}
                </button>

                <button
                  onClick={openCreateModal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
                    border: 'none',
                    color: 'white',
                    padding: isMobile ? '10px 16px' : '12px 20px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: isMobile ? '13px' : '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
                    transition: 'all 0.2s',
                    flex: isMobile ? '1' : 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {isMobile ? '➕ Add' : 'Add Part'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{
        padding: isMobile ? '16px' : '24px',
        maxWidth: '1600px',
        margin: '0 auto'
      }}>
        {/* Stats Cards - Role-based */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: isMobile ? '12px' : '16px',
          marginBottom: isMobile ? '20px' : '24px'
        }}>
          <StatsCard
            title="Total Items"
            value={stats.totalItems}
            icon="📦"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
            isMobile={isMobile}
          />
          
          {/* Show different stat based on role */}
          {isEmployee ? (
            <StatsCard
              title="Available"
              value={stats.availableItems}
              icon="✅"
              gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              isMobile={isMobile}
            />
          ) : (
            <StatsCard
              title="Inventory Value"
              value={`₹${stats.totalValue.toLocaleString('en-IN')}`}
              icon="💰"
              gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              isMobile={isMobile}
            />
          )}
          
          <StatsCard
            title="Low Stock"
            value={stats.lowStockCount}
            icon="⚠️"
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            isMobile={isMobile}
          />
          <StatsCard
            title="Out of Stock"
            value={stats.outOfStockCount}
            icon="❌"
            gradient="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
            isMobile={isMobile}
          />
        </div>

        {/* Low Stock Alert */}
        {stats.lowStockCount > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '2px solid #f59e0b',
            borderRadius: isMobile ? '16px' : '20px',
            padding: isMobile ? '16px' : '20px',
            marginBottom: isMobile ? '20px' : '24px',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: isMobile ? '28px' : '32px' }}>⚠️</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontWeight: '700',
                  color: '#92400e',
                  margin: 0,
                  marginBottom: '4px',
                  fontSize: isMobile ? '15px' : '16px'
                }}>
                  Low Stock Alert
                </p>
                <p style={{
                  fontSize: isMobile ? '13px' : '14px',
                  color: '#b45309',
                  margin: 0
                }}>
                  {stats.lowStockCount} item(s) are running low. {stats.outOfStockCount > 0 && `${stats.outOfStockCount} item(s) are out of stock.`}
                </p>
              </div>
              <button
                onClick={() => setFilters(prev => ({ ...prev, lowStock: true }))}
                style={{
                  padding: isMobile ? '8px 16px' : '10px 20px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: isMobile ? '13px' : '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#d97706'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f59e0b'}
              >
                View Items
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{
          background: 'white',
          borderRadius: isMobile ? '16px' : '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.05)',
          padding: isMobile ? '16px' : '20px',
          marginBottom: isMobile ? '20px' : '24px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '12px'
          }}>
            {/* Search */}
            <div style={{ flex: 1 }}>
              <div style={{ position: 'relative' }}>
                <svg style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  color: '#9ca3af'
                }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search by part number, name, or brand..."
                  style={{
                    width: '100%',
                    paddingLeft: '40px',
                    paddingRight: '16px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: isMobile ? '14px' : '15px',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {/* Category Filter */}
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              style={{
                padding: '10px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                background: 'white',
                fontSize: isMobile ? '14px' : '15px',
                minWidth: isMobile ? '100%' : '150px',
                cursor: 'pointer',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>

            {/* Low Stock Filter */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              cursor: 'pointer',
              background: filters.lowStock ? '#fef3c7' : 'white',
              borderColor: filters.lowStock ? '#f59e0b' : '#e5e7eb',
              transition: 'all 0.2s'
            }}>
              <input
                type="checkbox"
                name="lowStock"
                checked={filters.lowStock}
                onChange={handleFilterChange}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: '#f59e0b'
                }}
              />
              <span style={{
                fontSize: isMobile ? '14px' : '15px',
                fontWeight: '500',
                color: filters.lowStock ? '#b45309' : '#374151',
                whiteSpace: 'nowrap'
              }}>
                Low Stock Only
              </span>
            </label>

            {/* Clear Filters */}
            {(filters.search || filters.category || filters.lowStock) && (
              <button
                onClick={resetFilters}
                style={{
                  padding: '10px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  background: 'white',
                  color: '#6b7280',
                  fontSize: isMobile ? '14px' : '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Parts List */}
        {loading ? (
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
                width: isMobile ? '48px' : '64px',
                height: isMobile ? '48px' : '64px',
                border: '4px solid #e0f2fe',
                borderTopColor: '#14b8a6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p style={{
                color: '#6b7280',
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: '500',
                margin: 0
              }}>
                Loading inventory...
              </p>
            </div>
          </div>
        ) : parts.length === 0 ? (
          <EmptyState
            filters={filters}
            canManageInventory={canManageInventory}
            openCreateModal={openCreateModal}
            isMobile={isMobile}
          />
        ) : (
          <>
            {/* Desktop Table */}
            {!isMobile && (
              <DesktopPartsTable
                parts={parts}
                getCategoryIcon={getCategoryIcon}
                getStockStatus={getStockStatus}
                canManageInventory={canManageInventory}
                openAdjustModal={openAdjustModal}
                openDetailModal={openDetailModal}
                openEditModal={openEditModal}
                handleDelete={handleDelete}
                isEmployee={isEmployee}
              />
            )}

            {/* Mobile Cards */}
            {isMobile && (
              <MobilePartsCards
                parts={parts}
                getCategoryIcon={getCategoryIcon}
                getStockStatus={getStockStatus}
                canManageInventory={canManageInventory}
                openAdjustModal={openAdjustModal}
                openDetailModal={openDetailModal}
                isEmployee={isEmployee}
              />
            )}
          </>
        )}
      </div>

      {/* ========== ALL MODALS ========== */}
      
      {/* Add/Edit Part Modal */}
      <AddEditPartModal
        showModal={showModal}
        setShowModal={setShowModal}
        editingPart={editingPart}
        formData={formData}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        submitting={submitting}
        categories={categories}
        branches={branches}
        currentUser={currentUser}
        isMobile={isMobile}
      />

      {/* Adjust Stock Modal */}
      <StockAdjustModal
        showAdjustModal={showAdjustModal}
        setShowAdjustModal={setShowAdjustModal}
        selectedPart={selectedPart}
        adjustmentData={adjustmentData}
        setAdjustmentData={setAdjustmentData}
        handleAdjustStock={handleAdjustStock}
        submitting={submitting}
        isMobile={isMobile}
      />

      {/* Part Detail Modal */}
      <PartDetailModal
        showDetailModal={showDetailModal}
        setShowDetailModal={setShowDetailModal}
        selectedPart={selectedPart}
        getCategoryIcon={getCategoryIcon}
        canManageInventory={canManageInventory}
        openAdjustModal={openAdjustModal}
        openEditModal={openEditModal}
        isMobile={isMobile}
        isEmployee={isEmployee}
      />

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <BulkUploadModal
          isMobile={isMobile}
          isProcessing={isProcessing}
          submitting={submitting}
          uploadFile={uploadFile}
          uploadPreview={uploadPreview}
          uploadErrors={uploadErrors}
          handleFileUpload={handleFileUpload}
          handleBulkUpload={handleBulkUpload}
          onClose={() => {
            if (!isProcessing && !submitting) {
              setShowBulkUploadModal(false);
              setUploadFile(null);
              setUploadPreview([]);
              setUploadErrors([]);
            }
          }}
        />
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        * {
          box-sizing: border-box;
        }

        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}

// Helper Components
function StatsCard({ title, value, icon, gradient, isMobile }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'white',
        borderRadius: isMobile ? '16px' : '20px',
        padding: isMobile ? '16px' : '20px',
        boxShadow: isHovered ? '0 8px 24px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.05)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered && !isMobile ? 'translateY(-4px)' : 'translateY(0)',
        cursor: 'pointer'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: isMobile ? '11px' : '13px',
            color: '#6b7280',
            fontWeight: '600',
            margin: 0,
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {title}
          </p>
          <p style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: '800',
            color: '#1a202c',
            margin: 0,
            letterSpacing: '-0.5px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {value}
          </p>
        </div>
        <div style={{
          width: isMobile ? '48px' : '56px',
          height: isMobile ? '48px' : '56px',
          background: gradient,
          borderRadius: isMobile ? '14px' : '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isMobile ? '24px' : '28px',
          transition: 'all 0.3s ease',
          transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          flexShrink: 0
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ filters, canManageInventory, openCreateModal, isMobile }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: isMobile ? '16px' : '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      border: '1px solid rgba(0,0,0,0.05)',
      padding: isMobile ? '40px 20px' : '60px 40px',
      textAlign: 'center'
    }}>
      <div style={{
        width: isMobile ? '64px' : '80px',
        height: isMobile ? '64px' : '80px',
        background: '#f3f4f6',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        fontSize: isMobile ? '32px' : '40px'
      }}>
        📦
      </div>
      <h3 style={{
        fontSize: isMobile ? '18px' : '20px',
        fontWeight: '700',
        color: '#1a202c',
        margin: 0,
        marginBottom: '8px'
      }}>
        No parts found
      </h3>
      <p style={{
        fontSize: isMobile ? '14px' : '16px',
        color: '#6b7280',
        margin: 0,
        marginBottom: '24px'
      }}>
        {filters.search || filters.category || filters.lowStock
          ? 'Try adjusting your filters to find parts.'
          : 'Add your first part to the inventory.'}
      </p>
      {canManageInventory && !filters.search && !filters.category && !filters.lowStock && (
        <button
          onClick={openCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
            color: 'white',
            padding: isMobile ? '12px 24px' : '14px 28px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '600',
            fontSize: isMobile ? '14px' : '16px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add First Part
        </button>
      )}
    </div>
  );
}

function DesktopPartsTable({ 
  parts, 
  getCategoryIcon, 
  getStockStatus, 
  canManageInventory,
  openAdjustModal,
  openDetailModal,
  openEditModal,
  handleDelete,
  isEmployee
}) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      border: '1px solid rgba(0,0,0,0.05)',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: '900px'
        }}>
          <thead>
            <tr style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderBottom: '2px solid #e2e8f0'
            }}>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '700',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Part</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '700',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Category</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '700',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Stock</th>
              {!isEmployee && (
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Price</th>
              )}
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '700',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Status</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '700',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>{isEmployee ? 'Location' : 'Branch'}</th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'right',
                fontSize: '12px',
                fontWeight: '700',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part, index) => {
              const stockStatus = getStockStatus(part);
              return (
                <tr 
                  key={part.id}
                  style={{
                    borderBottom: index !== parts.length - 1 ? '1px solid #f1f5f9' : 'none',
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => openDetailModal(part)}
                >
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        flexShrink: 0
                      }}>
                        {getCategoryIcon(part.category)}
                      </div>
                      <div>
                        <p style={{
                          fontWeight: '600',
                          color: '#1e293b',
                          fontSize: '15px',
                          margin: 0,
                          marginBottom: '2px'
                        }}>{part.name}</p>
                        <p style={{
                          fontSize: '13px',
                          color: '#64748b',
                          margin: 0,
                          fontFamily: 'monospace'
                        }}>{part.partNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: '#f1f5f9',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#475569'
                    }}>
                      {getCategoryIcon(part.category)} {part.category}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div>
                      <p style={{
                        fontWeight: '700',
                        fontSize: '18px',
                        color: part.quantity === 0 ? '#ef4444' : part.quantity <= part.minStockLevel ? '#f59e0b' : '#1e293b',
                        margin: 0,
                        marginBottom: '2px'
                      }}>{part.quantity}</p>
                      <p style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        margin: 0
                      }}>Min: {part.minStockLevel}</p>
                    </div>
                  </td>
                  {!isEmployee && (
                    <td style={{ padding: '16px 20px' }}>
                      <div>
                        <p style={{
                          fontWeight: '600',
                          fontSize: '15px',
                          color: '#059669',
                          margin: 0,
                          marginBottom: '2px'
                        }}>₹{part.sellingPrice.toLocaleString('en-IN')}</p>
                        <p style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          margin: 0
                        }}>Cost: ₹{part.costPrice.toLocaleString('en-IN')}</p>
                      </div>
                    </td>
                  )}
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: stockStatus.color.includes('red') ? '#fef2f2' :
                                  stockStatus.color.includes('yellow') ? '#fffbeb' : '#f0fdf4',
                      color: stockStatus.color.includes('red') ? '#dc2626' :
                             stockStatus.color.includes('yellow') ? '#d97706' : '#16a34a'
                    }}>
                      {stockStatus.icon} {stockStatus.label}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      fontSize: '14px',
                      color: (isEmployee ? part.location : part.branch?.name) ? '#475569' : '#94a3b8'
                    }}>
                      {isEmployee ? (part.location || '—') : (part.branch?.name || '—')}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '8px'
                    }}>
                      {canManageInventory && (
                        <ActionButton
                          onClick={(e) => {
                            e.stopPropagation();
                            openAdjustModal(part);
                          }}
                          icon={
                            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          }
                          title="Adjust Stock"
                          hoverColor="#14b8a6"
                          hoverBg="#f0fdfa"
                        />
                      )}
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetailModal(part);
                        }}
                        icon={
                          <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        }
                        title="View Details"
                        hoverColor="#3b82f6"
                        hoverBg="#eff6ff"
                      />
                      {canManageInventory && (
                        <>
                          <ActionButton
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(part);
                            }}
                            icon={
                              <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            }
                            title="Edit"
                            hoverColor="#10b981"
                            hoverBg="#f0fdf4"
                          />
                          <ActionButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(part);
                            }}
                            icon={
                              <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            }
                            title="Delete"
                            hoverColor="#ef4444"
                            hoverBg="#fef2f2"
                          />
                        </>
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
  );
}

function ActionButton({ onClick, icon, title, hoverColor, hoverBg }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
      style={{
        padding: '8px',
        border: 'none',
        borderRadius: '10px',
        background: isHovered ? hoverBg : 'transparent',
        color: isHovered ? hoverColor : '#64748b',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
      }}
    >
      {icon}
    </button>
  );
}

function MobilePartsCards({ 
  parts, 
  getCategoryIcon, 
  getStockStatus, 
  canManageInventory,
  openAdjustModal,
  openDetailModal,
  isEmployee
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {parts.map((part) => {
        const stockStatus = getStockStatus(part);
        return (
          <div 
            key={part.id}
            style={{
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.05)',
              padding: '16px',
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={() => openDetailModal(part)}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0
                }}>
                  {getCategoryIcon(part.category)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontWeight: '600',
                    color: '#1e293b',
                    fontSize: '15px',
                    margin: 0,
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>{part.name}</p>
                  <p style={{
                    fontSize: '12px',
                    color: '#64748b',
                    margin: 0,
                    fontFamily: 'monospace'
                  }}>{part.partNumber}</p>
                </div>
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: '600',
                background: stockStatus.color.includes('red') ? '#fef2f2' :
                            stockStatus.color.includes('yellow') ? '#fffbeb' : '#f0fdf4',
                color: stockStatus.color.includes('red') ? '#dc2626' :
                       stockStatus.color.includes('yellow') ? '#d97706' : '#16a34a',
                flexShrink: 0
              }}>
                {stockStatus.icon} {stockStatus.label}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isEmployee ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <div style={{
                textAlign: 'center',
                padding: '10px 8px',
                background: '#f8fafc',
                borderRadius: '10px'
              }}>
                <p style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: part.quantity === 0 ? '#ef4444' : part.quantity <= part.minStockLevel ? '#f59e0b' : '#1e293b',
                  margin: 0,
                  marginBottom: '2px'
                }}>{part.quantity}</p>
                <p style={{
                  fontSize: '11px',
                  color: '#64748b',
                  margin: 0
                }}>In Stock</p>
              </div>
              {!isEmployee && (
                <div style={{
                  textAlign: 'center',
                  padding: '10px 8px',
                  background: '#f0fdf4',
                  borderRadius: '10px'
                }}>
                  <p style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#059669',
                    margin: 0,
                    marginBottom: '2px'
                  }}>₹{part.sellingPrice.toLocaleString('en-IN')}</p>
                  <p style={{
                    fontSize: '11px',
                    color: '#64748b',
                    margin: 0
                  }}>Price</p>
                </div>
              )}
              <div style={{
                textAlign: 'center',
                padding: '10px 8px',
                background: '#eff6ff',
                borderRadius: '10px'
              }}>
                <p style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#3b82f6',
                  margin: 0,
                  marginBottom: '2px'
                }}>{part._count?.jobs || 0}</p>
                <p style={{
                  fontSize: '11px',
                  color: '#64748b',
                  margin: 0
                }}>Used</p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9'
            }}>
              <span style={{
                fontSize: '12px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {isEmployee ? `📍 ${part.location || 'No location'}` : `${getCategoryIcon(part.category)} ${part.category}`}
              </span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {canManageInventory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openAdjustModal(part);
                    }}
                    style={{
                      padding: '8px 12px',
                      background: '#f0fdfa',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#14b8a6',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Adjust
                  </button>
                )}
                <span style={{
                  color: '#3b82f6',
                  fontWeight: '600',
                  fontSize: '13px'
                }}>
                  Details →
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BulkUploadModal({ 
  isMobile, 
  isProcessing, 
  submitting, 
  uploadFile, 
  uploadPreview, 
  uploadErrors,
  handleFileUpload,
  handleBulkUpload,
  onClose 
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
        padding: isMobile ? '16px' : '24px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: isMobile ? '20px' : '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
          padding: isMobile ? '20px' : '24px',
          color: 'white'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h2 style={{
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: '700',
                margin: 0,
                marginBottom: '4px'
              }}>
                📤 Bulk Upload Parts
              </h2>
              <p style={{
                fontSize: isMobile ? '13px' : '14px',
                opacity: 0.9,
                margin: 0
              }}>
                Upload an Excel file to add multiple parts at once
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing || submitting}
              style={{
                padding: '8px',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                cursor: isProcessing || submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: isProcessing || submitting ? 0.5 : 1
              }}
            >
              <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{
          padding: isMobile ? '20px' : '24px',
          maxHeight: 'calc(90vh - 200px)',
          overflowY: 'auto'
        }}>
          <div style={{
            border: '2px dashed #d1d5db',
            borderRadius: '16px',
            padding: isMobile ? '24px' : '32px',
            textAlign: 'center',
            marginBottom: '20px',
            background: uploadFile ? '#f0fdf4' : '#f9fafb',
            borderColor: uploadFile ? '#10b981' : '#d1d5db',
            transition: 'all 0.3s'
          }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isProcessing || submitting}
              style={{ display: 'none' }}
              id="bulk-upload-input"
            />
            <label 
              htmlFor="bulk-upload-input"
              style={{
                cursor: isProcessing || submitting ? 'not-allowed' : 'pointer',
                display: 'block'
              }}
            >
              <div style={{
                width: '64px',
                height: '64px',
                background: uploadFile ? '#dcfce7' : '#e5e7eb',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '32px'
              }}>
                {isProcessing ? '⏳' : uploadFile ? '✅' : '📁'}
              </div>
              
              {isProcessing ? (
                <p style={{ color: '#6b7280', fontSize: '15px', margin: 0 }}>
                  Processing file...
                </p>
              ) : uploadFile ? (
                <>
                  <p style={{
                    fontWeight: '600',
                    color: '#059669',
                    fontSize: '16px',
                    margin: 0,
                    marginBottom: '4px'
                  }}>
                    {uploadFile.name}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                    Click to change file
                  </p>
                </>
              ) : (
                <>
                  <p style={{
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '16px',
                    margin: 0,
                    marginBottom: '4px'
                  }}>
                    Click to upload Excel file
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                    or drag and drop (.xlsx, .xls)
                  </p>
                </>
              )}
            </label>
          </div>

          {uploadPreview.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e293b',
                margin: 0,
                marginBottom: '12px'
              }}>
                ✅ Valid Items ({uploadPreview.length})
              </h3>
              
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px'
                }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Part #</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>Qty</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadPreview.slice(0, 10).map((item, index) => (
                      <tr key={index} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{item.partNumber}</td>
                        <td style={{ padding: '10px 12px' }}>{item.name}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>₹{item.sellingPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uploadPreview.length > 10 && (
                  <p style={{
                    textAlign: 'center',
                    padding: '10px',
                    color: '#6b7280',
                    fontSize: '13px',
                    margin: 0,
                    background: '#f1f5f9'
                  }}>
                    + {uploadPreview.length - 10} more items
                  </p>
                )}
              </div>
            </div>
          )}

          {uploadErrors.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#dc2626',
                margin: 0,
                marginBottom: '12px'
              }}>
                ❌ Errors ({uploadErrors.length})
              </h3>
              
              <div style={{
                background: '#fef2f2',
                borderRadius: '12px',
                maxHeight: '150px',
                overflowY: 'auto',
                border: '1px solid #fecaca'
              }}>
                {uploadErrors.map((error, index) => (
                  <div 
                    key={index}
                    style={{
                      padding: '12px',
                      borderBottom: index !== uploadErrors.length - 1 ? '1px solid #fecaca' : 'none'
                    }}
                  >
                    <p style={{
                      fontWeight: '600',
                      color: '#b91c1c',
                      fontSize: '13px',
                      margin: 0,
                      marginBottom: '4px'
                    }}>
                      Row {error.row}: {error.data.partNumber || 'Unknown'}
                    </p>
                    <ul style={{
                      margin: 0,
                      paddingLeft: '20px',
                      color: '#dc2626',
                      fontSize: '12px'
                    }}>
                      {error.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{
            background: '#eff6ff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #bfdbfe'
          }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1d4ed8',
              margin: 0,
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              💡 Tips for successful upload
            </h4>
            <ul style={{
              margin: 0,
              paddingLeft: '20px',
              fontSize: '13px',
              color: '#1e40af',
              lineHeight: 1.6
            }}>
              <li>Download the template first to see the correct format</li>
              <li>Required fields: Part Number, Name, Category, Cost Price, Selling Price, Quantity</li>
              <li>Valid categories: PARTS, ACCESSORIES, FLUIDS, FILTERS, ELECTRICAL, BODY, TYRES, TOOLS, OTHER</li>
              <li>Part numbers must be unique</li>
            </ul>
          </div>
        </div>

        <div style={{
          padding: isMobile ? '16px 20px' : '20px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          background: '#f9fafb'
        }}>
          <button
            onClick={onClose}
            disabled={isProcessing || submitting}
            style={{
              padding: '12px 24px',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              color: '#374151',
              fontWeight: '600',
              fontSize: '15px',
              cursor: isProcessing || submitting ? 'not-allowed' : 'pointer',
              opacity: isProcessing || submitting ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleBulkUpload}
            disabled={uploadPreview.length === 0 || isProcessing || submitting}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '12px',
              background: uploadPreview.length > 0 && !isProcessing && !submitting
                ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                : '#e5e7eb',
              color: uploadPreview.length > 0 && !isProcessing && !submitting ? 'white' : '#9ca3af',
              fontWeight: '600',
              fontSize: '15px',
              cursor: uploadPreview.length === 0 || isProcessing || submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: uploadPreview.length > 0 && !isProcessing && !submitting
                ? '0 4px 12px rgba(139, 92, 246, 0.3)'
                : 'none',
              transition: 'all 0.2s'
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
            {submitting ? 'Uploading...' : `Upload ${uploadPreview.length} Parts`}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddEditPartModal({
  showModal,
  setShowModal,
  editingPart,
  formData,
  handleChange,
  handleSubmit,
  submitting,
  categories,
  branches,
  currentUser,
  isMobile
}) {
  if (!showModal) return null;

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
        padding: isMobile ? '16px' : '24px'
      }}
      onClick={() => setShowModal(false)}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: isMobile ? '20px' : '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
          padding: isMobile ? '20px' : '24px',
          color: 'white'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h2 style={{
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: '700',
                margin: 0,
                marginBottom: '4px'
              }}>
                {editingPart ? '✏️ Edit Part' : '➕ Add New Part'}
              </h2>
              <p style={{
                fontSize: isMobile ? '13px' : '14px',
                opacity: 0.9,
                margin: 0
              }}>
                {editingPart ? `Editing ${editingPart.name}` : 'Add a new part to inventory'}
              </p>
            </div>
            <button
              onClick={() => setShowModal(false)}
              style={{
                padding: '8px',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{
            padding: isMobile ? '20px' : '24px',
            maxHeight: 'calc(90vh - 200px)',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '16px'
            }}>
              <FormInput
                label="Part Number"
                name="partNumber"
                value={formData.partNumber}
                onChange={handleChange}
                placeholder="e.g., OIL-5W30-001"
                required
                disabled={!!editingPart}
                style={{ textTransform: 'uppercase' }}
              />

              <FormInput
                label="Part Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Engine Oil 5W-30"
                required
              />

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Category <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '15px',
                    background: 'white',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <FormInput
                label="Brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g., Castrol"
              />

              <FormInput
                label="Cost Price (₹)"
                name="costPrice"
                type="number"
                value={formData.costPrice}
                onChange={handleChange}
                placeholder="0.00"
                required
                min="0"
                step="0.01"
              />

              <FormInput
                label="Selling Price (₹)"
                name="sellingPrice"
                type="number"
                value={formData.sellingPrice}
                onChange={handleChange}
                placeholder="0.00"
                required
                min="0"
                step="0.01"
              />

              <FormInput
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0"
                required
                min="0"
              />

              <FormInput
                label="Min Stock Level"
                name="minStockLevel"
                type="number"
                value={formData.minStockLevel}
                onChange={handleChange}
                placeholder="5"
                min="0"
              />

              <FormInput
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Shelf A-1"
              />

              <FormInput
                label="Supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                placeholder="Supplier name"
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Part description..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '15px',
                  resize: 'none',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {currentUser?.role === 'SUPER_ADMIN' && branches.length > 0 && !editingPart && (
              <div style={{ marginTop: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Branch
                </label>
                <select
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '15px',
                    background: 'white',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">Select Branch</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.costPrice && formData.sellingPrice && (
              <div style={{
                marginTop: '20px',
                background: '#f0fdf4',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #bbf7d0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{
                    fontWeight: '600',
                    color: '#15803d'
                  }}>💰 Profit Margin</span>
                  <span style={{
                    fontWeight: '700',
                    fontSize: '18px',
                    color: '#15803d'
                  }}>
                    ₹{(Number(formData.sellingPrice) - Number(formData.costPrice)).toFixed(2)}
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      marginLeft: '8px'
                    }}>
                      ({Number(formData.costPrice) > 0 ? (((Number(formData.sellingPrice) - Number(formData.costPrice)) / Number(formData.costPrice)) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div style={{
            padding: isMobile ? '16px 20px' : '20px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            background: '#f9fafb'
          }}>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={submitting}
              style={{
                padding: '12px 24px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                background: 'white',
                color: '#374151',
                fontWeight: '600',
                fontSize: '15px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
                color: 'white',
                fontWeight: '600',
                fontSize: '15px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
                transition: 'all 0.2s'
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
              {editingPart ? 'Update Part' : 'Add Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormInput({ 
  label, 
  name, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  required = false,
  disabled = false,
  min,
  step,
  style = {}
}) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px'
      }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        step={step}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          fontSize: '15px',
          outline: 'none',
          transition: 'all 0.2s',
          background: disabled ? '#f3f4f6' : 'white',
          color: disabled ? '#9ca3af' : '#1f2937',
          cursor: disabled ? 'not-allowed' : 'text',
          ...style
        }}
        onFocus={(e) => !disabled && (e.target.style.borderColor = '#14b8a6')}
        onBlur={(e) => !disabled && (e.target.style.borderColor = '#e5e7eb')}
      />
    </div>
  );
}

function StockAdjustModal({
  showAdjustModal,
  setShowAdjustModal,
  selectedPart,
  adjustmentData,
  setAdjustmentData,
  handleAdjustStock,
  submitting,
  isMobile
}) {
  if (!showAdjustModal || !selectedPart) return null;

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
        padding: isMobile ? '16px' : '24px'
      }}
      onClick={() => setShowAdjustModal(false)}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: isMobile ? '20px' : '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '480px',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
          padding: isMobile ? '20px' : '24px',
          color: 'white'
        }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: '700',
            margin: 0,
            marginBottom: '4px'
          }}>
            📦 Adjust Stock
          </h2>
          <p style={{
            fontSize: isMobile ? '13px' : '14px',
            opacity: 0.9,
            margin: 0
          }}>
            {selectedPart.name} • Current: {selectedPart.quantity}
          </p>
        </div>

        <form onSubmit={handleAdjustStock}>
          <div style={{ padding: isMobile ? '20px' : '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Adjustment Type
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px',
                  border: `2px solid ${adjustmentData.type === 'add' ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: adjustmentData.type === 'add' ? '#f0fdf4' : 'white',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="radio"
                    name="type"
                    value="add"
                    checked={adjustmentData.type === 'add'}
                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, type: e.target.value }))}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: '20px' }}>➕</span>
                  <span style={{ fontWeight: '600', color: adjustmentData.type === 'add' ? '#059669' : '#374151' }}>
                    Add Stock
                  </span>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px',
                  border: `2px solid ${adjustmentData.type === 'subtract' ? '#ef4444' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: adjustmentData.type === 'subtract' ? '#fef2f2' : 'white',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="radio"
                    name="type"
                    value="subtract"
                    checked={adjustmentData.type === 'subtract'}
                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, type: e.target.value }))}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: '20px' }}>➖</span>
                  <span style={{ fontWeight: '600', color: adjustmentData.type === 'subtract' ? '#dc2626' : '#374151' }}>
                    Remove Stock
                  </span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Quantity <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                value={adjustmentData.quantity}
                onChange={(e) => setAdjustmentData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Enter quantity"
                min="1"
                max={adjustmentData.type === 'subtract' ? selectedPart.quantity : undefined}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {adjustmentData.quantity && (
              <div style={{
                borderRadius: '12px',
                padding: '16px',
                background: adjustmentData.type === 'add' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${adjustmentData.type === 'add' ? '#bbf7d0' : '#fecaca'}`
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{
                    fontWeight: '600',
                    color: adjustmentData.type === 'add' ? '#15803d' : '#b91c1c'
                  }}>New Stock Level</span>
                  <span style={{
                    fontWeight: '700',
                    fontSize: '24px',
                    color: adjustmentData.type === 'add' ? '#15803d' : '#b91c1c'
                  }}>
                    {adjustmentData.type === 'add' 
                      ? selectedPart.quantity + Number(adjustmentData.quantity)
                      : selectedPart.quantity - Number(adjustmentData.quantity)
                    }
                  </span>
                </div>
              </div>
            )}
          </div>

          <div style={{
            padding: isMobile ? '16px 20px' : '20px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            background: '#f9fafb'
          }}>
            <button
              type="button"
              onClick={() => setShowAdjustModal(false)}
              disabled={submitting}
              style={{
                padding: '12px 24px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                background: 'white',
                color: '#374151',
                fontWeight: '600',
                fontSize: '15px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '12px',
                background: adjustmentData.type === 'add'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                fontWeight: '600',
                fontSize: '15px',
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
              {adjustmentData.type === 'add' ? 'Add Stock' : 'Remove Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PartDetailModal({
  showDetailModal,
  setShowDetailModal,
  selectedPart,
  getCategoryIcon,
  canManageInventory,
  openAdjustModal,
  openEditModal,
  isMobile,
  isEmployee
}) {
  if (!showDetailModal || !selectedPart) return null;

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
        padding: isMobile ? '16px' : '24px'
      }}
      onClick={() => setShowDetailModal(false)}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: isMobile ? '20px' : '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
          padding: isMobile ? '24px' : '28px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px'
            }}>
              {getCategoryIcon(selectedPart.category)}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: isMobile ? '22px' : '26px',
                fontWeight: '700',
                color: 'white',
                margin: 0,
                marginBottom: '4px'
              }}>
                {selectedPart.name}
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.85)',
                margin: 0,
                fontFamily: 'monospace'
              }}>
                {selectedPart.partNumber}
              </p>
            </div>
          </div>
        </div>

        <div style={{
          padding: isMobile ? '20px' : '24px',
          maxHeight: 'calc(90vh - 280px)',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              textAlign: 'center',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px'
            }}>
              <p style={{
                fontSize: '28px',
                fontWeight: '700',
                color: selectedPart.quantity === 0 ? '#ef4444' : selectedPart.quantity <= selectedPart.minStockLevel ? '#f59e0b' : '#1e293b',
                margin: 0,
                marginBottom: '4px'
              }}>{selectedPart.quantity}</p>
              <p style={{
                fontSize: '13px',
                color: '#64748b',
                margin: 0
              }}>In Stock</p>
            </div>
            {!isEmployee ? (
              <div style={{
                textAlign: 'center',
                padding: '16px',
                background: '#f0fdf4',
                borderRadius: '12px'
              }}>
                <p style={{
                  fontSize: '26px',
                  fontWeight: '700',
                  color: '#059669',
                  margin: 0,
                  marginBottom: '4px'
                }}>₹{selectedPart.sellingPrice.toLocaleString('en-IN')}</p>
                <p style={{
                  fontSize: '13px',
                  color: '#64748b',
                  margin: 0
                }}>Selling Price</p>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '16px',
                background: '#eff6ff',
                borderRadius: '12px'
              }}>
                <p style={{
                  fontSize: '26px',
                  fontWeight: '700',
                  color: '#3b82f6',
                  margin: 0,
                  marginBottom: '4px'
                }}>{selectedPart.minStockLevel}</p>
                <p style={{
                  fontSize: '13px',
                  color: '#64748b',
                  margin: 0
                }}>Min Level</p>
              </div>
            )}
          </div>

          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <DetailRow label="Category" value={selectedPart.category} />
            <DetailRow label="Brand" value={selectedPart.brand || '—'} />
            {!isEmployee && (
              <DetailRow label="Cost Price" value={`₹${selectedPart.costPrice.toLocaleString('en-IN')}`} />
            )}
            <DetailRow label="Min Stock Level" value={selectedPart.minStockLevel} />
            <DetailRow label="Location" value={selectedPart.location || '—'} />
            {!isEmployee && (
              <DetailRow label="Supplier" value={selectedPart.supplier || '—'} />
            )}
            <DetailRow label="Branch" value={selectedPart.branch?.name || '—'} />
            <DetailRow label="Times Used" value={`${selectedPart._count?.jobs || 0} jobs`} isLast />
          </div>

          {selectedPart.description && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px'
            }}>
              <p style={{
                fontSize: '13px',
                color: '#64748b',
                margin: 0,
                marginBottom: '4px',
                fontWeight: '600'
              }}>Description</p>
              <p style={{
                fontSize: '14px',
                color: '#374151',
                margin: 0,
                lineHeight: 1.6
              }}>{selectedPart.description}</p>
            </div>
          )}
        </div>

        <div style={{
          padding: isMobile ? '16px 20px' : '20px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          background: '#f9fafb',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setShowDetailModal(false)}
            style={{
              padding: '12px 24px',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              background: 'white',
              color: '#374151',
              fontWeight: '600',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
          {canManageInventory && (
            <>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  openAdjustModal(selectedPart);
                }}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer'
                }}
              >
                Adjust Stock
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  openEditModal(selectedPart);
                }}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer'
                }}
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, isLast = false }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: isLast ? 'none' : '1px solid #e2e8f0'
    }}>
      <span style={{
        fontSize: '14px',
        color: '#64748b'
      }}>{label}</span>
      <span style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#1e293b'
      }}>{value}</span>
    </div>
  );
}