import React, { useEffect, useState, useRef } from 'react';
import { Plus, UserCheck, CheckCircle, Camera, Trash2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Modal, Input, ResidenceSelector } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { VisitorService, StorageService, toSnake } from '@/services/supabase.service';
import { Visitor } from '@/types';
import { supabase } from '@/config/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import QRCode from 'qrcode.react';
import { ManageGatesModal } from '@/components/visitors/ManageGatesModal';
import { GateService } from '@/services/supabase.service';
import { Gate } from '@/types';

export const VisitorsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'exited'>('all');
  const [gates, setGates] = useState<Gate[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [showManageGates, setShowManageGates] = useState(false);

  useEffect(() => {
    if (user?.societyId) {
      loadVisitors();
      loadFlats();
      loadGates();
      loadResidents();
    }
  }, [user]);

  const loadGates = async () => {
    if (!user?.societyId) return;
    try {
      const data = await GateService.getGates(user.societyId);
      setGates(data as Gate[]);
    } catch (error) {
      console.error('Error loading gates:', error);
    }
  };

  const loadResidents = async () => {
    if (!user?.societyId) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('uid, name')
        .eq('society_id', user.societyId);
      if (error) throw error;
      setResidents(data || []);
    } catch (error) {
      console.error('Error loading residents:', error);
    }
  };

  const loadFlats = async () => {
    if (!user?.societyId) return;
    try {
      const { data, error } = await supabase
        .from('flats')
        .select('id, flat_number, floor, owner_id, tenant_id')
        .eq('society_id', user.societyId)
        .order('flat_number', { ascending: true });

      if (error) throw error;
      setFlats(data || []);
    } catch (error: any) {
      console.error('Error loading flats:', error.message);
    }
  };


  const loadVisitors = async () => {
    if (!user?.societyId) return;

    try {
      setLoading(true);
      let flatIds: string[] | undefined = undefined;

      if (user.role !== 'admin' && user.role !== 'staff' && user.role !== 'security') {
        const { data: myFlats } = await supabase
          .from('flats')
          .select('id')
          .or(`owner_id.eq.${user.uid},tenant_id.eq.${user.uid}`);

        flatIds = myFlats?.map(f => f.id) || [];

        // Also check user.flatIds as backup/extended source
        if (user.flatIds && user.flatIds.length > 0) {
          flatIds = [...new Set([...flatIds, ...user.flatIds])];
        }

        // Use dummy ID if no flats found to prevent "fetch all" behavior
        if (flatIds.length === 0) {
          flatIds = ['00000000-0000-0000-0000-000000000000'];
        }
      }

      const data = await VisitorService.getVisitors(user.societyId, flatIds);
      setVisitors(data as Visitor[]);
    } catch (error) {
      toast.error('Failed to load visitors');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVisitor = async (formData: any) => {
    if (!user?.societyId) return;

    try {
      setLoading(true);

      // 1. Find the internal flat ID
      let flatId = '';
      let flatOwnerId = '';
      let flatTenantId = '';
      const existingFlat = flats.find(f => f.flat_number === formData.flatNumber);

      if (existingFlat) {
        flatId = existingFlat.id;
        flatOwnerId = existingFlat.owner_id;
        flatTenantId = existingFlat.tenant_id;
      } else {
        // If flat doesn't exist, we create it (or error out)
        // For visitors, it's better to create on the fly as well if needed
        const newFlatId = crypto.randomUUID();
        const { error: createFlatError } = await supabase
          .from('flats')
          .insert([toSnake({
            id: newFlatId,
            societyId: user.societyId,
            flatNumber: formData.flatNumber,
            floor: formData.floor ? parseInt(formData.floor) : 1,
            occupancyStatus: 'vacant',
            bhkType: '2BHK',
            area: 1200
          })]);

        if (createFlatError) throw createFlatError;
        flatId = newFlatId;
      }

      let photoUrl = '';
      // Upload photo if present
      if (formData.photo) {
        const path = `visitor-photos/${user.societyId}/${Date.now()}-${formData.photo.name}`;
        photoUrl = await StorageService.uploadFile(formData.photo, 'documents', path);
      }

      // Determine status: Approved ONLY if the current user is the owner or tenant of the flat
      const isResident = user.uid === flatOwnerId || user.uid === flatTenantId;
      const status = isResident ? 'approved' : 'pending';

      const visitorData = {
        name: formData.name,
        phone: formData.phone,
        flatId: flatId,
        vType: formData.vType || 'guest',
        purpose: formData.purpose,
        vehicleNumber: formData.vehicleNumber,
        photoUrl: photoUrl,
        entryTime: new Date().toISOString(),
        status: status,
        passCode: Math.random().toString(36).substr(2, 6).toUpperCase()
      };

      await VisitorService.createVisitor(user.societyId, visitorData);
      toast.success('Visitor entry recorded');
      setShowAddModal(false);
      loadVisitors();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add visitor');
    } finally {
      setLoading(false);
    }
  };


  const handleApprove = async (visitorId: string) => {
    if (!user?.societyId) return;

    try {
      await VisitorService.updateVisitor(user.societyId, visitorId, {
        status: 'approved',
        approvedBy: user.uid
      });
      toast.success('Visitor approved');
      loadVisitors();
    } catch (error) {
      toast.error('Failed to approve visitor');
    }
  };

  const handleReject = async (visitorId: string) => {
    if (!user?.societyId) return;
    if (!window.confirm('Reject this visitor request?')) return;

    try {
      await VisitorService.updateVisitor(user.societyId, visitorId, {
        status: 'rejected',
        approvedBy: user.uid
      });
      toast.success('Visitor rejected');
      loadVisitors();
    } catch (error) {
      toast.error('Failed to reject visitor');
    }
  };

  const handleCheckout = async (visitorId: string) => {
    if (!user?.societyId) return;

    try {
      await VisitorService.checkoutVisitor(user.societyId, visitorId);
      toast.success('Visitor checked out');
      loadVisitors();
    } catch (error) {
      toast.error('Failed to checkout visitor');
    }
  };

  const handleDeleteVisitor = async (visitorId: string) => {
    if (!user?.societyId) return;
    if (!window.confirm('Are you sure you want to delete this visitor record? This action cannot be undone.')) return;

    try {
      setLoading(true);
      await VisitorService.deleteVisitor(user.societyId, visitorId);
      toast.success('Visitor record deleted');
      loadVisitors();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete visitor');
    } finally {
      setLoading(false);
    }
  };


  const filteredVisitors = visitors.filter((v: Visitor) => {
    if (filter === 'all') return true;
    return v.status === filter;
  });

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'exited': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visitor Management</h1>
            <p className="text-gray-600 mt-1">Track entries and issue visitor gate passes</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 shadow-lg shadow-primary-100">
            <Plus size={20} />
            Add Visitor / Issue Pass
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Filters */}
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'exited'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-2 rounded-xl capitalize transition-all ${filter === f
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Visitors List */}
            <Card className="overflow-hidden border-none shadow-sm shadow-gray-200/50">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : filteredVisitors.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No visitors found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visitor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flat</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resident</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredVisitors.map((visitor: Visitor) => {
                        const flat = flats.find(f => f.id === visitor.flatId);
                        return (
                          <tr key={visitor.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {visitor.photoUrl ? (
                                  <img src={visitor.photoUrl} alt={visitor.name} className="h-10 w-10 rounded-full object-cover mr-3" />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                    <span className="text-gray-500 text-xs">{visitor.name.charAt(0)}</span>
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-gray-900">{visitor.name}</div>
                                  <div className="text-sm text-gray-500 capitalize">{visitor.vType || 'Guest'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {visitor.phone}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {flat ? flat.flat_number : visitor.flatId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(() => {
                                if (!flat) return 'N/A';
                                const host = residents.find(r => r.uid === flat.owner_id || r.uid === flat.tenant_id);
                                return host ? host.name : 'Unknown';
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {visitor.purpose}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {visitor.entryTime && format(new Date(visitor.entryTime), 'MMM dd, hh:mm a')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(visitor.status)}`}>
                                {visitor.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 flex items-center">
                              {visitor.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(visitor.id)}
                                    className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReject(visitor.id)}
                                    className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {visitor.status === 'approved' && !visitor.exitTime && (
                                <button
                                  onClick={() => handleCheckout(visitor.id)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  Checkout
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedVisitor(visitor)}
                                className="text-primary-600 hover:text-primary-700"
                                title="View Pass"
                              >
                                View Pass
                              </button>

                              {user?.role === 'admin' && (
                                <button
                                  onClick={() => handleDeleteVisitor(visitor.id)}
                                  className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle size={24} className="text-primary-600" />
              Gate Security
            </h2>
            <Card className="bg-slate-900 border-none p-6 text-white overflow-hidden relative shadow-xl shadow-slate-200">
              <div className="absolute right-0 bottom-0 opacity-10 bg-primary-400 w-32 h-32 rounded-full blur-3xl"></div>
              <h4 className="font-bold text-lg mb-4">Instructions for Residents</h4>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center shrink-0 text-xs font-bold font-mono">1</div>
                  <p className="text-sm text-slate-400">Add visitor details to pre-authorize entry.</p>
                </li>
                <li className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center shrink-0 text-xs font-bold font-mono">2</div>
                  <p className="text-sm text-slate-400">Share the 6-digit entry code or QR with your visitor.</p>
                </li>
                <li className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center shrink-0 text-xs font-bold font-mono">3</div>
                  <p className="text-sm text-slate-400">Security will verify the code and grant access instantly.</p>
                </li>
              </ul>
              <div className="mt-8 pt-6 border-t border-slate-800">
                <p className="text-xs text-slate-500 italic">Pre-authorized visitors bypass manual registration at the gate.</p>
              </div>
            </Card>

            <Card className="p-6 border-none shadow-sm shadow-gray-200/50">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-900">Security Support</h4>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => setShowManageGates(true)}
                    className="text-xs text-primary-600 hover:underline font-medium"
                  >
                    Manage
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {gates.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No gates configured</p>
                ) : (
                  gates.map((gate) => (
                    <div key={gate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-700">{gate.name}</span>
                      <div className="flex items-center gap-2">
                        {gate.phone && (
                          <a href={`tel:${gate.phone}`} className="text-xs text-primary-600 hover:underline">
                            Call
                          </a>
                        )}
                        <span className={`text-[10px] font-bold uppercase ${gate.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                          {gate.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {gates.length > 0 && gates[0].phone && (
                <a
                  href={`tel:${gates[0].phone}`}
                  className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-gray-200 text-gray-900 hover:bg-gray-300 font-medium px-4 py-2 transition-colors"
                >
                  Contact Main Gate
                </a>
              )}
            </Card>
          </div>
        </div>

        {/* Add Visitor Modal */}
        <AddVisitorModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddVisitor}
        />

        {/* Manage Gates Modal */}
        <ManageGatesModal
          isOpen={showManageGates}
          onClose={() => setShowManageGates(false)}
          societyId={user?.societyId || ''}
          onSuccess={loadGates}
        />

        {/* Visitor Pass Modal */}
        {
          selectedVisitor && (
            <VisitorPassModal
              visitor={selectedVisitor}
              onClose={() => setSelectedVisitor(null)}
              flatNumber={flats.find(f => f.id === selectedVisitor.flatId)?.flat_number || selectedVisitor.flatId}
            />
          )
        }
      </div>
    </Layout>
  );
};

// Add Visitor Modal Component
const AddVisitorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    flatNumber: '',
    flatId: '',
    purpose: '',
    vehicleNumber: '',
    vType: 'guest',
    floor: '',
    photo: null as File | null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuthStore();
  const isRestricted = user?.role !== 'admin' && user?.role !== 'staff' && user?.role !== 'security';


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      name: '',
      phone: '',
      flatNumber: '',
      flatId: '',
      purpose: '',
      vehicleNumber: '',
      vType: 'guest',
      floor: '',
      photo: null
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Visitor Entry">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Visitor Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <Input
          label="Phone Number"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />
        <ResidenceSelector
          initialFlatId={formData.flatId}
          onSelect={(flatId, flat, floor) => setFormData({
            ...formData,
            flatId,
            flatNumber: flat?.flatNumber || '',
            floor: floor?.toString() || flat?.floor?.toString() || ''
          })}
          restrictedToUserFlats={isRestricted}
          showResidentInfo={!isRestricted}
        />


        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Visitor Type</label>
          <div className="grid grid-cols-3 gap-2">
            {['guest', 'delivery', 'service'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, vType: type })}
                className={`px-4 py-2 rounded-lg text-sm font-medium border capitalize ${formData.vType === type
                  ? 'bg-primary-50 border-primary-600 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-600'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visitor Photo (Optional)</label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => setFormData({ ...formData, photo: e.target.files?.[0] || null })}
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              {formData.photo ? (
                <>
                  <CheckCircle size={20} className="text-green-500" />
                  Photo Attached
                </>
              ) : (
                <>
                  <Camera size={20} />
                  Capture / Upload Photo
                </>
              )}
            </Button>
          </div>
        </div>
        <Input
          label="Purpose of Visit"
          value={formData.purpose}
          onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
          required
        />
        <Input
          label="Vehicle Number (Optional)"
          value={formData.vehicleNumber}
          onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
        />
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Add Visitor
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Visitor Pass Modal Component
const VisitorPassModal: React.FC<{
  visitor: Visitor;
  onClose: () => void;
  flatNumber: string;
}> = ({ visitor, onClose, flatNumber }) => {
  return (
    <Modal isOpen={true} onClose={onClose} title="Visitor Pass">
      <div className="text-center space-y-4">
        <div className="bg-primary-50 p-6 rounded-lg flex justify-center">
          <QRCode value={visitor.passCode || visitor.id} size={200} />
        </div>
        <div className="space-y-2">
          <p className="text-2xl font-bold text-gray-900">{visitor.name}</p>
          <p className="text-gray-600">Pass Code: <span className="font-mono font-bold text-primary-600">{visitor.passCode}</span></p>
          <p className="text-sm text-gray-500">Visiting: Flat {flatNumber}</p>
          <p className="text-sm text-gray-500 capitalize">Type: {visitor.vType || 'Guest'}</p>
          <p className="text-sm text-gray-500">
            Valid from: {visitor.entryTime && format(new Date(visitor.entryTime), 'MMM dd, yyyy hh:mm a')}
          </p>
        </div>
        <Button onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    </Modal>
  );
};
