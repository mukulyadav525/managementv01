import React, { useEffect, useState } from 'react';
import { Plus, AlertCircle, Trash2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Modal, Input } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { ComplaintService, StorageService } from '@/services/supabase.service';
import { Complaint } from '@/types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '@/config/supabase';

export const ComplaintsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'in-progress' | 'resolved'>('all');

  useEffect(() => {
    if (user?.societyId) {
      loadComplaints();
    }
  }, [user]);

  const loadComplaints = async () => {
    if (!user?.societyId) return;

    try {
      setLoading(true);
      const flatId = user.role === 'admin' || user.role === 'staff' || user.role === 'security'
        ? undefined
        : user.flatIds?.[0];
      const data = await ComplaintService.getComplaints(user.societyId, { flatId });
      setComplaints(data as Complaint[]);
    } catch (error) {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComplaint = async (formData: any) => {
    if (!user?.societyId) return;

    try {
      let imageUrls: string[] = [];
      if (formData.images && formData.images.length > 0) {
        imageUrls = await StorageService.uploadMultipleFiles(
          formData.images,
          'complaints',
          `complaints/${user.societyId}`
        );
      }

      await ComplaintService.createComplaint(user.societyId, {
        flatId: formData.flatId || user.flatIds?.[0],
        userId: user.uid,
        category: formData.category,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: 'open',
        images: imageUrls
      });

      toast.success('Complaint registered successfully');
      setShowAddModal(false);
      loadComplaints();
    } catch (error) {
      toast.error('Failed to register complaint');
    }
  };

  const handleUpdateStatus = async (complaintId: string, status: string) => {
    if (!user?.societyId) return;

    try {
      await ComplaintService.updateComplaint(user.societyId, complaintId, { status });
      toast.success('Status updated');
      loadComplaints();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleResolve = async (complaintId: string, notes: string) => {
    if (!user?.societyId) return;

    try {
      await ComplaintService.resolveComplaint(user.societyId, complaintId, notes);
      toast.success('Complaint resolved');
      loadComplaints();
    } catch (error) {
      toast.error('Failed to resolve complaint');
    }
  };

  const handleDelete = async (complaintId: string) => {
    if (!window.confirm('Delete this complaint?')) return;
    try {
      const { error } = await supabase.from('complaints').delete().eq('id', complaintId);
      if (error) throw error;
      toast.success('Complaint deleted');
      loadComplaints();
    } catch (error) {
      toast.error('Failed to delete complaint');
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-700';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Complaints</h1>
            <p className="text-gray-600 mt-1">Raise and track maintenance issues</p>
          </div>
          {user?.role !== 'staff' && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={20} className="mr-2" />
              New Complaint
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{complaints.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <p className="text-sm text-gray-600">Open</p>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {complaints.filter(c => c.status === 'open').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {complaints.filter(c => c.status === 'in-progress').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <p className="text-sm text-gray-600">Resolved</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {complaints.filter(c => c.status === 'resolved').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'open', 'in-progress', 'resolved'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Complaints List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No complaints found</p>
              </div>
            </Card>
          ) : (
            filteredComplaints.map((complaint) => (
              <Card key={complaint.id}>
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{complaint.title}</h3>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                          {complaint.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority} priority
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {complaint.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div className="flex items-center gap-2 justify-end">
                        <p>Flat {complaint.flatId}</p>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(complaint.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <p>{format(new Date(complaint.createdAt), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-700">{complaint.description}</p>

                  {/* Images */}
                  {complaint.images && complaint.images.length > 0 && (
                    <div className="flex gap-2">
                      {complaint.images.map((image, idx) => (
                        <img
                          key={idx}
                          src={image}
                          alt={`Complaint ${idx + 1}`}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {(user?.role === 'admin' || user?.role === 'staff') && complaint.status !== 'resolved' && (
                    <div className="flex gap-2 pt-2 border-t">
                      {complaint.status === 'open' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(complaint.id, 'in-progress')}
                        >
                          Start Work
                        </Button>
                      )}
                      {complaint.status === 'in-progress' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const notes = prompt('Enter resolution notes:');
                            if (notes) handleResolve(complaint.id, notes);
                          }}
                        >
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Resolution Notes */}
                  {complaint.resolutionNotes && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-800">Resolution:</p>
                      <p className="text-sm text-green-700 mt-1">{complaint.resolutionNotes}</p>
                      {complaint.resolvedAt && (
                        <p className="text-xs text-green-600 mt-1">
                          Resolved on {format(new Date(complaint.resolvedAt), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Add Complaint Modal */}
        <AddComplaintModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddComplaint}
        />
      </div>
    </Layout>
  );
};

// Add Complaint Modal Component
const AddComplaintModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'plumbing',
    description: '',
    priority: 'medium',
    images: [] as File[],
    flatId: ''
  });
  const [flats, setFlats] = useState<any[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadFlats = async () => {
      if (!user?.societyId) return;
      const { data } = await supabase
        .from('flats')
        .select('id, flat_number')
        .eq('society_id', user.societyId);
      setFlats(data || []);
    };
    if (['admin', 'staff', 'security'].includes(user?.role || '')) {
      loadFlats();
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      title: '',
      category: 'plumbing',
      description: '',
      priority: 'medium',
      images: [],
      flatId: ''
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({ ...formData, images: Array.from(e.target.files) });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Complaint">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />

        {['admin', 'staff', 'security'].includes(user?.role || '') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flat (Optional)</label>
            <select
              value={formData.flatId}
              onChange={(e) => setFormData({ ...formData, flatId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select Flat</option>
              {flats.map(f => (
                <option key={f.id} value={f.id}>{f.flat_number}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="cleaning">Cleaning</option>
            <option value="lift">Lift</option>
            <option value="parking">Parking</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Images (Optional)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Submit Complaint
          </Button>
        </div>
      </form>
    </Modal>
  );
};
