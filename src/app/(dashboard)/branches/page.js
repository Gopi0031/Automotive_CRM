// src/app/(dashboard)/branches/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    phone: '',
    email: '',
    managerId: '',
  });

  // Stats
  const [stats, setStats] = useState({
    totalBranches: 0,
    totalStaff: 0,
    totalCustomers: 0,
    totalJobs: 0,
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [branchesRes, usersRes] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/users'),
      ]);

      const branchesData = await branchesRes.json();
      const usersData = await usersRes.json();

      if (branchesData.success) {
        setBranches(branchesData.data || []);
        calculateStats(branchesData.data || []);
      }

      if (usersData.success) {
        // Filter only managers without a branch or current branch's manager
        const availableManagers = usersData.data?.filter(
          u => u.role === 'MANAGER' && u.isActive
        ) || [];
        setManagers(availableManagers);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (branchesData) => {
    const totalStaff = branchesData.reduce((sum, b) => sum + (b._count?.staff || 0), 0);
    const totalCustomers = branchesData.reduce((sum, b) => sum + (b._count?.customers || 0), 0);
    const totalJobs = branchesData.reduce((sum, b) => sum + (b._count?.jobs || 0), 0);

    setStats({
      totalBranches: branchesData.length,
      totalStaff,
      totalCustomers,
      totalJobs,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      phone: '',
      email: '',
      managerId: '',
    });
    setEditingBranch(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      location: branch.location,
      phone: branch.phone,
      email: branch.email,
      managerId: branch.managerId || '',
    });
    setShowModal(true);
  };

  const openDetailModal = (branch) => {
    setSelectedBranch(branch);
    setShowDetailModal(true);
  };

  const openDeleteModal = (branch) => {
    setSelectedBranch(branch);
    setShowDeleteModal(true);
  };

  // In the branches page, update handleSubmit:

const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);

  try {
    const url = '/api/branches';
    const method = editingBranch ? 'PUT' : 'POST';

    // ✅ FIX: Clean the payload before sending
    const cleanPayload = {
      ...(editingBranch && { id: editingBranch.id }),
      name: formData.name,
      location: formData.location,
      phone: formData.phone,
      email: formData.email,
    };

    // Only include managerId if it has a real value
    if (formData.managerId && formData.managerId.trim() !== '') {
      cleanPayload.managerId = formData.managerId;
    }
    // For edit mode, explicitly send null to remove manager
    else if (editingBranch) {
      cleanPayload.managerId = '';  // API will convert to null
    }

    console.log('📤 Sending branch data:', cleanPayload);

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message || `Failed to ${editingBranch ? 'update' : 'create'} branch`);
      return;
    }

    toast.success(`Branch ${editingBranch ? 'updated' : 'created'} successfully`);
    resetForm();
    setShowModal(false);
    fetchData();
  } catch (error) {
    console.error('Error saving branch:', error);
    toast.error('An error occurred');
  } finally {
    setSubmitting(false);
  }
};

  const handleDelete = async () => {
    if (!selectedBranch) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/branches?id=${selectedBranch.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to delete branch');
        return;
      }

      toast.success('Branch deleted successfully');
      setShowDeleteModal(false);
      setSelectedBranch(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Get available managers (not assigned to other branches)
  const getAvailableManagers = () => {
    return managers.filter(m => {
      // Include if: no branch assigned, or is current branch's manager
      const isCurrentBranchManager = editingBranch && m.id === editingBranch.managerId;
      const isUnassigned = !branches.some(b => b.managerId === m.id && b.id !== editingBranch?.id);
      return isCurrentBranchManager || isUnassigned;
    });
  };

  const canManageBranches = currentUser?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Branches</h1>
              <p className="text-gray-500 mt-1 text-sm sm:text-base">
                Manage your business locations
              </p>
            </div>
            {canManageBranches && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Branch</span>
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
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Branches</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.totalBranches}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center text-xl">
                🏢
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Staff</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">{stats.totalStaff}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">
                👥
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Customers</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">{stats.totalCustomers}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center text-xl">
                🧑‍🤝‍🧑
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Jobs</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">{stats.totalJobs}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center text-xl">
                🔧
              </div>
            </div>
          </div>
        </div>

        {/* Branches List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-500 mt-4 font-medium">Loading branches...</p>
            </div>
          </div>
        ) : branches.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
              🏢
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No branches found</h3>
            <p className="text-gray-500 mb-6">
              Create your first branch to get started.
            </p>
            {canManageBranches && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add First Branch
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {branches.map((branch) => (
              <div 
                key={branch.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Branch Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">{branch.name}</h3>
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-2xl">
                      🏢
                    </div>
                  </div>
                </div>

                {/* Branch Details */}
                <div className="p-5">
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-gray-600">{branch.location}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-gray-600">{branch.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-600">{branch.email}</span>
                    </div>
                  </div>

                  {/* Manager */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                      {branch.manager?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Branch Manager</p>
                      <p className="font-semibold text-gray-900">
                        {branch.manager?.name || 'Not Assigned'}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <p className="text-lg font-bold text-blue-600">{branch._count?.staff || 0}</p>
                      <p className="text-xs text-gray-500">Staff</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-lg font-bold text-green-600">{branch._count?.customers || 0}</p>
                      <p className="text-xs text-gray-500">Customers</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <p className="text-lg font-bold text-purple-600">{branch._count?.jobs || 0}</p>
                      <p className="text-xs text-gray-500">Jobs</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => openDetailModal(branch)}
                      className="flex-1 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium text-sm transition-colors"
                    >
                      View Details
                    </button>
                    {canManageBranches && (
                      <>
                        <button
                          onClick={() => openEditModal(branch)}
                          className="flex-1 px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg font-medium text-sm transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(branch)}
                          className="px-3 py-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-600 to-amber-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                  </h2>
                  <p className="text-orange-100 text-sm mt-0.5">
                    {editingBranch ? `Editing ${editingBranch.name}` : 'Create a new business location'}
                  </p>
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
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Branch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="e.g., Downtown Branch"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Location / Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                    placeholder="Full address of the branch"
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="e.g., 022-12345678"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="branch@company.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Branch Manager
                  </label>
                  <select
                    name="managerId"
                    value={formData.managerId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all"
                  >
                    <option value="">Select Manager (Optional)</option>
                    {getAvailableManagers().map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        👔 {manager.name} ({manager.email})
                      </option>
                    ))}
                  </select>
                  {managers.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      No managers available. Create a user with Manager role first.
                    </p>
                  )}
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
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedBranch && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-4xl">
                    🏢
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedBranch.name}</h2>
                    <p className="text-orange-100">{selectedBranch.location}</p>
                  </div>
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
              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{selectedBranch.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{selectedBranch.email}</p>
                  </div>
                </div>
              </div>

              {/* Manager */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-500 mb-2">Branch Manager</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {selectedBranch.manager?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedBranch.manager?.name || 'Not Assigned'}
                    </p>
                    {selectedBranch.manager?.email && (
                      <p className="text-sm text-gray-500">{selectedBranch.manager.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600">{selectedBranch._count?.staff || 0}</p>
                  <p className="text-xs text-gray-500">Staff</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl">
                  <p className="text-2xl font-bold text-green-600">{selectedBranch._count?.customers || 0}</p>
                  <p className="text-xs text-gray-500">Customers</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-xl">
                  <p className="text-2xl font-bold text-purple-600">{selectedBranch._count?.jobs || 0}</p>
                  <p className="text-xs text-gray-500">Jobs</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-xl">
                  <p className="text-2xl font-bold text-orange-600">{selectedBranch._count?.invoices || 0}</p>
                  <p className="text-xs text-gray-500">Invoices</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Close
              </button>
              {canManageBranches && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openEditModal(selectedBranch);
                  }}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-colors"
                >
                  Edit Branch
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedBranch && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Branch</h3>
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete <span className="font-semibold">{selectedBranch.name}</span>?
              </p>
              
              {(selectedBranch._count?.staff > 0 || 
                selectedBranch._count?.customers > 0 || 
                selectedBranch._count?.jobs > 0) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left">
                  <p className="text-sm text-red-700 font-medium mb-1">⚠️ This branch has:</p>
                  <ul className="text-sm text-red-600 list-disc list-inside">
                    {selectedBranch._count?.staff > 0 && (
                      <li>{selectedBranch._count.staff} staff members</li>
                    )}
                    {selectedBranch._count?.customers > 0 && (
                      <li>{selectedBranch._count.customers} customers</li>
                    )}
                    {selectedBranch._count?.jobs > 0 && (
                      <li>{selectedBranch._count.jobs} jobs</li>
                    )}
                  </ul>
                  <p className="text-sm text-red-700 mt-2">
                    Please reassign or remove this data before deleting.
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={submitting || 
                    selectedBranch._count?.staff > 0 || 
                    selectedBranch._count?.customers > 0 || 
                    selectedBranch._count?.jobs > 0}
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Delete Branch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}