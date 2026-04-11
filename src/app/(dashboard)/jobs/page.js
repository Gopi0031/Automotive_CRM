// src/app/(dashboard)/jobs/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    assignedToId: '',
  });

  // Form data
  const [formData, setFormData] = useState({
    vehicleId: '',
    description: '',
    assignedToId: '',
    priority: 'MEDIUM',
    estimatedCost: '',
    scheduledDate: '',
    customerNotes: '',
    branchId: '',
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
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
      fetchJobs();
    }
  }, [filters, currentUser]);

  const fetchInitialData = async () => {
    try {
      const [vehiclesRes, usersRes, branchesRes] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/users'),
        fetch('/api/branches'),
      ]);

      const vehiclesData = await vehiclesRes.json();
      const usersData = await usersRes.json();
      const branchesData = await branchesRes.json();

      if (vehiclesData.success) setVehicles(vehiclesData.data || []);
      if (usersData.success) {
        // Filter only technicians (EMPLOYEE role)
        setTechnicians(usersData.data?.filter(u => u.role === 'EMPLOYEE' && u.isActive) || []);
      }
      if (branchesData.success) setBranches(branchesData.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assignedToId) params.append('assignedToId', filters.assignedToId);

      const response = await fetch(`/api/jobs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setJobs(data.data || []);
        calculateStats(data.data || []);
      } else {
        toast.error(data.message || 'Failed to load jobs');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const calculateStats = (jobsData) => {
    setStats({
      total: jobsData.length,
      pending: jobsData.filter(j => j.status === 'PENDING').length,
      inProgress: jobsData.filter(j => j.status === 'IN_PROGRESS').length,
      completed: jobsData.filter(j => j.status === 'COMPLETED' || j.status === 'DELIVERED').length,
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
      priority: '',
      assignedToId: '',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      description: '',
      assignedToId: '',
      priority: 'MEDIUM',
      estimatedCost: '',
      scheduledDate: '',
      customerNotes: '',
      branchId: '',
    });
    setSelectedJob(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (job) => {
    setSelectedJob(job);
    setFormData({
      vehicleId: job.vehicleId,
      description: job.description || '',
      assignedToId: job.assignedToId || '',
      priority: job.priority,
      estimatedCost: job.estimatedCost?.toString() || '',
      scheduledDate: job.scheduledDate ? job.scheduledDate.split('T')[0] : '',
      customerNotes: job.customerNotes || '',
      branchId: job.branchId || '',
    });
    setShowModal(true);
  };

  const openDetailModal = (job) => {
    setSelectedJob(job);
    setShowDetailModal(true);
  };

  const openDeleteModal = (job) => {
    setSelectedJob(job);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = selectedJob ? `/api/jobs/${selectedJob.id}` : '/api/jobs';
      const method = selectedJob ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || `Failed to ${selectedJob ? 'update' : 'create'} job`);
        return;
      }

      toast.success(`Job ${selectedJob ? 'updated' : 'created'} successfully`);
      resetForm();
      setShowModal(false);
      fetchJobs();
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedJob) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/jobs/${selectedJob.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to delete job');
        return;
      }

      toast.success('Job deleted successfully');
      setShowDeleteModal(false);
      setSelectedJob(null);
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const updateJobStatus = async (jobId, newStatus) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to update status');
        return;
      }

      toast.success(`Status updated to ${newStatus}`);
      fetchJobs();
      if (showDetailModal) {
        setSelectedJob(data.data);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('An error occurred');
    }
  };

  // Status configuration
  const statusConfig = {
    PENDING: { 
      label: 'Pending', 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: '⏳',
      nextStatus: 'IN_PROGRESS'
    },
    IN_PROGRESS: { 
      label: 'In Progress', 
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '🔧',
      nextStatus: 'COMPLETED'
    },
    AWAITING_PARTS: { 
      label: 'Awaiting Parts', 
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: '📦',
      nextStatus: 'IN_PROGRESS'
    },
    COMPLETED: { 
      label: 'Completed', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '✅',
      nextStatus: 'DELIVERED'
    },
    DELIVERED: { 
      label: 'Delivered', 
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: '🚗',
      nextStatus: null
    },
    CANCELLED: { 
      label: 'Cancelled', 
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '❌',
      nextStatus: null
    },
  };

  // Priority configuration
  const priorityConfig = {
    LOW: { label: 'Low', color: 'bg-gray-100 text-gray-700', icon: '🔵' },
    MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-700', icon: '🟡' },
    HIGH: { label: 'High', color: 'bg-orange-100 text-orange-700', icon: '🟠' },
    URGENT: { label: 'Urgent', color: 'bg-red-100 text-red-700', icon: '🔴' },
  };

  const canManageJobs = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MANAGER';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {currentUser?.role === 'EMPLOYEE' ? 'My Jobs' : 'Job Cards'}
              </h1>
              <p className="text-gray-500 mt-1 text-sm sm:text-base">
                {currentUser?.role === 'EMPLOYEE' 
                  ? 'View and manage your assigned work' 
                  : 'Manage service jobs and work orders'}
              </p>
            </div>
            {canManageJobs && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create Job</span>
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
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Jobs</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">
                📋
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Pending</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-xl">
                ⏳
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">In Progress</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">
                🔧
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Completed</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">{stats.completed}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center text-xl">
                ✅
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
                  placeholder="Search by job #, vehicle, or customer..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-3">
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[140px]"
              >
                <option value="">All Status</option>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>

              <select
                name="priority"
                value={filters.priority}
                onChange={handleFilterChange}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[130px]"
              >
                <option value="">All Priority</option>
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>

              {canManageJobs && technicians.length > 0 && (
                <select
                  name="assignedToId"
                  value={filters.assignedToId}
                  onChange={handleFilterChange}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[150px]"
                >
                  <option value="">All Technicians</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              )}

              {(filters.search || filters.status || filters.priority || filters.assignedToId) && (
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

        {/* Jobs List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-500 mt-4 font-medium">Loading jobs...</p>
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
              🔧
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-500 mb-6">
              {filters.search || filters.status || filters.priority
                ? 'Try adjusting your filters to find jobs.'
                : 'Create your first job card to get started.'}
            </p>
            {canManageJobs && !filters.search && !filters.status && !filters.priority && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create First Job
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
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Job Details</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vehicle</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned To</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cost</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{job.jobNumber}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[job.priority]?.color}`}>
                                {priorityConfig[job.priority]?.icon} {priorityConfig[job.priority]?.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(job.createdAt).toLocaleDateString('en-IN', { 
                                day: 'numeric', 
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{job.vehicle?.licensePlate}</p>
                          <p className="text-sm text-gray-500">{job.vehicle?.make} {job.vehicle?.model}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{job.vehicle?.customer?.name}</p>
                          <p className="text-sm text-gray-500">{job.vehicle?.customer?.phone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusConfig[job.status]?.color}`}>
                            <span>{statusConfig[job.status]?.icon}</span>
                            {statusConfig[job.status]?.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {job.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                                {job.assignedTo.name?.charAt(0)}
                              </div>
                              <span className="text-gray-900">{job.assignedTo.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">
                            ₹{(job.actualCost || job.estimatedCost || 0).toLocaleString()}
                          </p>
                          {job.actualCost && job.estimatedCost && job.actualCost !== job.estimatedCost && (
                            <p className="text-xs text-gray-500 line-through">
                              Est: ₹{job.estimatedCost.toLocaleString()}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openDetailModal(job)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            {canManageJobs && (
                              <>
                                <button
                                  onClick={() => openEditModal(job)}
                                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                {!job.invoice && (
                                  <button
                                    onClick={() => openDeleteModal(job)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{job.jobNumber}</p>
                      <p className="text-sm text-gray-500">
                        {job.vehicle?.make} {job.vehicle?.model}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig[job.status]?.color}`}>
                      {statusConfig[job.status]?.icon} {statusConfig[job.status]?.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[job.priority]?.color}`}>
                      {priorityConfig[job.priority]?.icon} {priorityConfig[job.priority]?.label}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-600">{job.vehicle?.licensePlate}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div>
                      <p className="text-gray-500">Customer</p>
                      <p className="font-medium text-gray-900">{job.vehicle?.customer?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Technician</p>
                      <p className="font-medium text-gray-900">{job.assignedTo?.name || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Cost</p>
                      <p className="font-medium text-gray-900">₹{(job.actualCost || job.estimatedCost || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="font-medium text-gray-900">
                        {new Date(job.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openDetailModal(job)}
                      className="text-blue-600 font-medium text-sm"
                    >
                      View Details →
                    </button>
                    {canManageJobs && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(job)}
                          className="p-2 text-gray-500 hover:text-green-600 rounded-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {!job.invoice && (
                          <button
                            onClick={() => openDeleteModal(job)}
                            className="p-2 text-gray-500 hover:text-red-600 rounded-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedJob ? 'Edit Job' : 'Create New Job'}
                  </h2>
                  <p className="text-blue-100 text-sm mt-0.5">
                    {selectedJob ? `Editing ${selectedJob.jobNumber}` : 'Fill in the job details'}
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
                {/* Vehicle Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vehicle <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="vehicleId"
                    value={formData.vehicleId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    required
                    disabled={!!selectedJob}
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.licensePlate} - {v.make} {v.model} ({v.customer?.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Technician */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Assign Technician
                    </label>
                    <select
                      name="assignedToId"
                      value={formData.assignedToId}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">Select Technician</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          🔧 {tech.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.icon} {config.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Estimated Cost */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Estimated Cost (₹)
                    </label>
                    <input
                      type="number"
                      name="estimatedCost"
                      value={formData.estimatedCost}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Scheduled Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      name="scheduledDate"
                      value={formData.scheduledDate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Branch Selection (Super Admin only) */}
                {currentUser?.role === 'SUPER_ADMIN' && branches.length > 0 && !selectedJob && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Branch
                    </label>
                    <select
                      name="branchId"
                      value={formData.branchId}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} - {branch.location}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Work Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Describe the work to be performed..."
                  />
                </div>

                {/* Customer Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Customer Notes
                  </label>
                  <textarea
                    name="customerNotes"
                    value={formData.customerNotes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Any specific instructions from customer..."
                  />
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
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {selectedJob ? 'Update Job' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {showDetailModal && selectedJob && (
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
                  <h2 className="text-xl font-bold text-white">{selectedJob.jobNumber}</h2>
                  <p className="text-gray-300 text-sm mt-0.5">
                    Created {new Date(selectedJob.createdAt).toLocaleDateString('en-IN', {
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
              {/* Status and Priority */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border ${statusConfig[selectedJob.status]?.color}`}>
                  {statusConfig[selectedJob.status]?.icon} {statusConfig[selectedJob.status]?.label}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold ${priorityConfig[selectedJob.priority]?.color}`}>
                  {priorityConfig[selectedJob.priority]?.icon} {priorityConfig[selectedJob.priority]?.label} Priority
                </span>
              </div>

              {/* Quick Actions */}
              {statusConfig[selectedJob.status]?.nextStatus && (
                <div className="bg-blue-50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-blue-700 mb-3">Quick Action:</p>
                  <button
                    onClick={() => updateJobStatus(selectedJob.id, statusConfig[selectedJob.status].nextStatus)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                  >
                    Move to {statusConfig[statusConfig[selectedJob.status].nextStatus]?.label}
                  </button>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Vehicle Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    🚗 Vehicle Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Registration:</span> <span className="font-medium">{selectedJob.vehicle?.licensePlate}</span></p>
                    <p><span className="text-gray-500">Make/Model:</span> <span className="font-medium">{selectedJob.vehicle?.make} {selectedJob.vehicle?.model}</span></p>
                    <p><span className="text-gray-500">Year:</span> <span className="font-medium">{selectedJob.vehicle?.year}</span></p>
                    {selectedJob.vehicle?.color && (
                      <p><span className="text-gray-500">Color:</span> <span className="font-medium">{selectedJob.vehicle?.color}</span></p>
                    )}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    👤 Customer Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Name:</span> <span className="font-medium">{selectedJob.vehicle?.customer?.name}</span></p>
                    <p><span className="text-gray-500">Phone:</span> <span className="font-medium">{selectedJob.vehicle?.customer?.phone}</span></p>
                    {selectedJob.vehicle?.customer?.email && (
                      <p><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedJob.vehicle?.customer?.email}</span></p>
                    )}
                  </div>
                </div>

                {/* Assignment Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    🔧 Assignment
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Technician:</span>{' '}
                      <span className="font-medium">{selectedJob.assignedTo?.name || 'Not assigned'}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Branch:</span>{' '}
                      <span className="font-medium">{selectedJob.branch?.name}</span>
                    </p>
                    {selectedJob.scheduledDate && (
                      <p>
                        <span className="text-gray-500">Scheduled:</span>{' '}
                        <span className="font-medium">
                          {new Date(selectedJob.scheduledDate).toLocaleDateString('en-IN')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Cost Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    💰 Cost Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Estimated:</span>{' '}
                      <span className="font-medium">₹{(selectedJob.estimatedCost || 0).toLocaleString()}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Actual:</span>{' '}
                      <span className="font-medium">₹{(selectedJob.actualCost || 0).toLocaleString()}</span>
                    </p>
                    {selectedJob.laborHours && (
                      <p>
                        <span className="text-gray-500">Labor Hours:</span>{' '}
                        <span className="font-medium">{selectedJob.laborHours} hrs</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedJob.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Work Description</h3>
                  <p className="text-gray-600 bg-gray-50 rounded-xl p-4">{selectedJob.description}</p>
                </div>
              )}

              {/* Timeline */}
              {selectedJob.timeline && selectedJob.timeline.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Timeline</h3>
                  <div className="space-y-3">
                    {selectedJob.timeline.map((entry, index) => (
                      <div key={entry.id || index} className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                        <div>
                          <p className="font-medium text-gray-900">{entry.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(entry.createdAt).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Close
              </button>
              {canManageJobs && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openEditModal(selectedJob);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  Edit Job
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedJob && (
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Job</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete job <span className="font-semibold">{selectedJob.jobNumber}</span>? 
                This action cannot be undone.
              </p>
              
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
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  disabled={submitting}
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Delete Job
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}