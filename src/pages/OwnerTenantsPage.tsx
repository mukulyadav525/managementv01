import React, { useEffect, useState } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Eye, DollarSign, Filter } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Modal, Input } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { SocietyService, PaymentService } from '@/services/supabase.service';
import { Flat, User, PaymentType } from '@/types';
import { AddTenantModal } from '@/components/tenant/AddTenantModal';
import { EditTenantModal } from '@/components/tenant/EditTenantModal';
import { TenantDetailsModal } from '@/components/tenant/TenantDetailsModal';
import { supabase } from '@/config/supabase';
import toast from 'react-hot-toast';

export const OwnerTenantsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [flats, setFlats] = useState<Flat[]>([]);
    const [tenants, setTenants] = useState<{ [key: string]: User }>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'occupied' | 'vacant'>('all');

    // Modals
    const [showAddTenantModal, setShowAddTenantModal] = useState(false);
    const [showEditTenantModal, setShowEditTenantModal] = useState<{ isOpen: boolean; tenant: User | null }>({ isOpen: false, tenant: null });
    const [showDetailsModal, setShowDetailsModal] = useState<{ isOpen: boolean; tenant: User | null; flatNumber?: string }>({ isOpen: false, tenant: null });
    const [showBillModal, setShowBillModal] = useState<{ isOpen: boolean; flat: Flat | null; tenant: User | null }>({ isOpen: false, flat: null, tenant: null });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ isOpen: boolean; tenant: User | null }>({ isOpen: false, tenant: null });

    const [vehicles, setVehicles] = useState<{ [key: string]: any[] }>({});

    useEffect(() => {
        if (user) {
            loadOwnedData();
        }
    }, [user]);

    const loadOwnedData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const ownedFlats = (await SocietyService.getOwnedFlats(user.uid)) as Flat[];
            setFlats(ownedFlats);

            if (ownedFlats && ownedFlats.length > 0) {
                const flatIds = ownedFlats.map((f: Flat) => f.id);
                const allTenants = await SocietyService.getDocuments<User>('users', (q) =>
                    q.eq('society_id', user.societyId).eq('role', 'tenant')
                );

                const myTenants: { [key: string]: User } = {};
                const tenantList: User[] = [];

                if (allTenants) {
                    allTenants.forEach((t: any) => {
                        const residesInMyFlat = t.flatIds && t.flatIds.some((fid: string) => flatIds.includes(fid));
                        if (residesInMyFlat) {
                            myTenants[t.uid] = t;
                            tenantList.push(t);
                        }
                    });
                }
                setTenants(myTenants);

                if (tenantList.length > 0) {
                    const tenantIds = tenantList.map(t => t.uid);
                    const tenantVehicles = await SocietyService.getDocuments('vehicles', (q) =>
                        q.in('user_id', tenantIds)
                    );

                    const vehicleMap: { [key: string]: any[] } = {};
                    if (tenantVehicles) {
                        tenantVehicles.forEach((v: any) => {
                            if (!vehicleMap[v.user_id]) vehicleMap[v.user_id] = [];
                            vehicleMap[v.user_id].push(v);
                        });
                    }
                    setVehicles(vehicleMap);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load flats and tenants');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBill = async (formData: any) => {
        if (!user || !showBillModal.flat) return;

        try {
            // Get tenants for this flat
            const flatTenants = Object.values(tenants).filter((t: any) =>
                t.flatIds && t.flatIds.includes(showBillModal.flat!.id)
            );

            // Target the specific tenant if selected, otherwise first tenant
            const targetTenant = showBillModal.tenant || flatTenants[0];

            if (!targetTenant) {
                toast.error('No tenant found for this flat');
                return;
            }

            const tenantId = targetTenant.uid;

            await PaymentService.createPayment(user.societyId, {
                flatId: showBillModal.flat.id,
                userId: tenantId,
                amount: formData.amount,
                type: formData.type,
                description: formData.description,
                dueDate: formData.dueDate,
                month: formData.month,
                status: 'pending'
            });

            toast.success(`Payment request sent to ${targetTenant.name}`);
            setShowBillModal({ isOpen: false, flat: null, tenant: null });
        } catch (error) {
            toast.error('Failed to create payment request');
        }
    };

    const handleDeleteTenant = async () => {
        if (!showDeleteConfirm.tenant) return;

        try {
            const tenant = showDeleteConfirm.tenant;

            // Update flats to remove tenant
            if (tenant.flatIds) {
                for (const flatId of tenant.flatIds) {
                    await supabase
                        .from('flats')
                        .update({
                            occupancy_status: 'vacant',
                            tenant_id: null
                        })
                        .eq('id', flatId);
                }
            }

            // Update user status to inactive
            await supabase
                .from('users')
                .update({
                    status: 'inactive',
                    flat_ids: []
                })
                .eq('uid', tenant.uid);

            toast.success('Tenant removed successfully');
            setShowDeleteConfirm({ isOpen: false, tenant: null });
            loadOwnedData();
        } catch (error) {
            console.error('Error deleting tenant:', error);
            toast.error('Failed to remove tenant');
        }
    };

    // Filter flats based on search and status
    const filteredFlats = flats.filter(flat => {
        const flatTenants = Object.values(tenants).filter((t: any) =>
            t.flatIds && t.flatIds.includes(flat.id)
        );
        const hasTenants = flatTenants.length > 0;

        // Status filter
        if (filterStatus === 'occupied' && !hasTenants) return false;
        if (filterStatus === 'vacant' && hasTenants) return false;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesFlat = flat.flatNumber.toLowerCase().includes(query);
            const matchesTenant = flatTenants.some(t =>
                t.name.toLowerCase().includes(query) ||
                t.email.toLowerCase().includes(query) ||
                t.phone.includes(query)
            );
            return matchesFlat || matchesTenant;
        }

        return true;
    });

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Tenants</h1>
                        <p className="text-gray-600 mt-1">Manage your flats and tenant payments</p>
                    </div>
                    <Button onClick={() => setShowAddTenantModal(true)}>
                        <Plus className="mr-2" size={18} />
                        Add Tenant
                    </Button>
                </div>

                {/* Search and Filters */}
                <Card>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by flat number, tenant name, email, or phone..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter size={20} className="text-gray-400" />
                            <select
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                            >
                                <option value="all">All Flats</option>
                                <option value="occupied">Occupied</option>
                                <option value="vacant">Vacant</option>
                            </select>
                        </div>
                    </div>
                </Card>

                {/* Flats List */}
                <div className="grid grid-cols-1 gap-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        </div>
                    ) : filteredFlats.length === 0 ? (
                        <Card>
                            <div className="text-center py-12">
                                <Users size={48} className="mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-500">
                                    {searchQuery || filterStatus !== 'all'
                                        ? 'No flats match your search criteria'
                                        : 'You don\'t have any owned flats registered'}
                                </p>
                            </div>
                        </Card>
                    ) : (
                        filteredFlats.map((flat) => {
                            const flatTenants = Object.values(tenants).filter((t: any) =>
                                t.flatIds && t.flatIds.includes(flat.id)
                            );
                            const hasTenants = flatTenants.length > 0;

                            return (
                                <Card key={flat.id}>
                                    <div className="flex flex-col gap-6">
                                        {/* Flat Header */}
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-4">
                                                <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
                                                    <Users size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">Flat {flat.flatNumber}</h3>
                                                    <p className="text-sm text-gray-500">{flat.bhkType} • Floor {flat.floor}</p>
                                                    <div className="mt-2">
                                                        {hasTenants ? (
                                                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                                                {flatTenants.length} Tenant(s)
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                                                Vacant
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Flat Actions */}
                                            {hasTenants && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => setShowBillModal({ isOpen: true, flat, tenant: null })}
                                                >
                                                    <DollarSign size={16} className="mr-2" /> Global Request
                                                </Button>
                                            )}
                                        </div>

                                        {/* Tenants List */}
                                        {hasTenants && (
                                            <div className="border-t pt-4 space-y-4">
                                                {flatTenants.map((tenant) => (
                                                    <div key={tenant.uid} className="bg-gray-50 rounded-lg p-4">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900">{tenant.name}</h4>
                                                                <p className="text-sm text-gray-600">{tenant.email}</p>
                                                                <p className="text-sm text-gray-600">{tenant.phone}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() => setShowDetailsModal({
                                                                        isOpen: true,
                                                                        tenant,
                                                                        flatNumber: flat.flatNumber
                                                                    })}
                                                                >
                                                                    <Eye size={16} />
                                                                </Button>
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() => setShowEditTenantModal({ isOpen: true, tenant })}
                                                                >
                                                                    <Edit2 size={16} />
                                                                </Button>
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() => setShowDeleteConfirm({ isOpen: true, tenant })}
                                                                    className="text-red-600 hover:bg-red-50"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </Button>
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                                                                    onClick={() => setShowBillModal({ isOpen: true, flat, tenant })}
                                                                >
                                                                    Requested Payment
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        {vehicles[tenant.uid] && vehicles[tenant.uid].length > 0 && (
                                                            <div className="text-sm text-gray-600">
                                                                <span className="font-medium">Vehicles: </span>
                                                                {vehicles[tenant.uid].map((v, idx) => (
                                                                    <span key={idx} className="font-mono">
                                                                        {v.vehicle_number}{idx < vehicles[tenant.uid].length - 1 ? ', ' : ''}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* Modals */}
                <AddTenantModal
                    isOpen={showAddTenantModal}
                    onClose={() => setShowAddTenantModal(false)}
                    onSuccess={loadOwnedData}
                    ownedFlats={flats}
                    societyId={user?.societyId || ''}
                />

                <EditTenantModal
                    isOpen={showEditTenantModal.isOpen}
                    onClose={() => setShowEditTenantModal({ isOpen: false, tenant: null })}
                    onSuccess={loadOwnedData}
                    tenant={showEditTenantModal.tenant}
                />

                <TenantDetailsModal
                    isOpen={showDetailsModal.isOpen}
                    onClose={() => setShowDetailsModal({ isOpen: false, tenant: null })}
                    tenant={showDetailsModal.tenant}
                    vehicles={showDetailsModal.tenant ? vehicles[showDetailsModal.tenant.uid] : []}
                    flatNumber={showDetailsModal.flatNumber}
                />

                <EnhancedBillModal
                    isOpen={showBillModal.isOpen}
                    onClose={() => setShowBillModal({ isOpen: false, flat: null, tenant: null })}
                    onSubmit={handleCreateBill}
                    flatNumber={showBillModal.flat?.flatNumber || ''}
                    tenantName={showBillModal.tenant?.name}
                />

                <DeleteConfirmModal
                    isOpen={showDeleteConfirm.isOpen}
                    onClose={() => setShowDeleteConfirm({ isOpen: false, tenant: null })}
                    onConfirm={handleDeleteTenant}
                    tenantName={showDeleteConfirm.tenant?.name || ''}
                />
            </div>
        </Layout>
    );
};

// Enhanced Bill Modal with more fields
const EnhancedBillModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    flatNumber: string;
    tenantName?: string;
}> = ({ isOpen, onClose, onSubmit, flatNumber, tenantName }) => {
    const [formData, setFormData] = useState({
        type: 'rent' as PaymentType,
        amount: '',
        dueDate: '',
        month: '',
        description: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        setFormData({
            type: 'rent',
            amount: '',
            dueDate: '',
            month: '',
            description: ''
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Send Payment Request - ${tenantName ? tenantName : `Flat ${flatNumber}`}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                        <option value="rent">Rent</option>
                        <option value="water">Water Bill</option>
                        <option value="electricity">Electricity Bill</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <Input
                    label="Amount (₹)"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                />
                <Input
                    label="Due Date"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                />
                <Input
                    label="Month/Period"
                    type="month"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    placeholder="e.g., 2024-01"
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                    <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        placeholder="Add any additional notes..."
                    />
                </div>
                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" className="flex-1">Send Request</Button>
                </div>
            </form>
        </Modal>
    );
};

// Delete Confirmation Modal
const DeleteConfirmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    tenantName: string;
}> = ({ isOpen, onClose, onConfirm, tenantName }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Remove Tenant">
            <div className="space-y-4">
                <p className="text-gray-700">
                    Are you sure you want to remove <strong>{tenantName}</strong> as a tenant?
                    This will update the flat status to vacant and mark the tenant as inactive.
                </p>
                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={() => { onConfirm(); onClose(); }}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                        Remove Tenant
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
