import React, { useEffect, useState } from 'react';
import { Users, Shield, UserX, UserCheck, Phone, Mail, Edit2, Trash2, UserMinus } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Modal } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { UserService, toSnake } from '@/services/supabase.service';
import { User } from '@/types';
import { supabase } from '@/config/supabase';
import toast from 'react-hot-toast';

export const ResidentsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [residents, setResidents] = useState<User[]>([]);
    const [flats, setFlats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedResident, setSelectedResident] = useState<User | null>(null);
    const [editingResident, setEditingResident] = useState<User | null>(null);

    useEffect(() => {
        if (user?.societyId) {
            loadResidents();
            loadFlats();
        }
    }, [user]);

    const loadFlats = async () => {
        if (!user?.societyId) return;
        try {
            const { data, error } = await supabase
                .from('flats')
                .select('id, flat_number, floor')
                .eq('society_id', user.societyId)
                .order('floor', { ascending: true })
                .order('flat_number', { ascending: true });

            if (error) throw error;
            setFlats(data || []);
        } catch (error: any) {
            console.error('Error loading flats:', error.message);
        }
    };

    const loadResidents = async () => {
        if (!user?.societyId) return;
        try {
            setLoading(true);
            const data = await UserService.getUsers(user.societyId);
            setResidents(data as User[]);
        } catch (error) {
            toast.error('Failed to load residents');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (uid: string, status: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ status })
                .eq('uid', uid);
            if (error) throw error;
            toast.success(`User status updated to ${status}`);
            loadResidents();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleUpdateRole = async (uid: string, role: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ role })
                .eq('uid', uid);
            if (error) throw error;
            toast.success(`User role updated to ${role}`);
            loadResidents();
        } catch (error) {
            toast.error('Failed to update role');
        }
    };

    const handleDeleteResident = async (resident: User) => {
        if (!window.confirm(`Are you sure you want to delete ${resident.name}? This will also remove them from any mapped flats.`)) return;

        try {
            setLoading(true);

            // 1. Find all flats where this user is owner or tenant
            const { data: ownedFlats } = await supabase.from('flats').select('id').eq('owner_id', resident.uid);
            const { data: tenantFlats } = await supabase.from('flats').select('id').eq('tenant_id', resident.uid);

            // 2. Clear associations in flats table
            if (ownedFlats && ownedFlats.length > 0) {
                await supabase.from('flats')
                    .update({ owner_id: null, occupancy_status: 'vacant' })
                    .in('id', ownedFlats.map(f => f.id));
            }
            if (tenantFlats && tenantFlats.length > 0) {
                await supabase.from('flats')
                    .update({ tenant_id: null, occupancy_status: 'vacant' })
                    .in('id', tenantFlats.map(f => f.id));
            }

            // 3. Delete user
            const { error: deleteError } = await supabase.from('users').delete().eq('uid', resident.uid);
            if (deleteError) throw deleteError;

            toast.success('Resident deleted successfully');
            loadResidents();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete resident');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveResident = async (formData: any) => {
        if (!user?.societyId) return;
        try {
            setLoading(true);

            // 1. Find or Create Flat
            let flatId = '';
            const { data: existingFlats } = await supabase
                .from('flats')
                .select('id, flat_number, floor')
                .eq('society_id', user.societyId)
                .eq('flat_number', formData.flatNumber);

            if (existingFlats && existingFlats.length > 0) {
                flatId = existingFlats[0].id;
            } else {
                const newFlatId = crypto.randomUUID();
                const { error: createFlatError } = await supabase
                    .from('flats')
                    .insert([toSnake({
                        id: newFlatId,
                        societyId: user.societyId,
                        flatNumber: formData.flatNumber,
                        floor: formData.role === 'tenant' ? parseInt(formData.floor) : 1,
                        occupancyStatus: 'vacant',
                        bhkType: '2BHK',
                        area: 1200
                    })]);

                if (createFlatError) throw createFlatError;
                flatId = newFlatId;
            }

            const residentUid = editingResident ? editingResident.uid : crypto.randomUUID();

            // 2. Handle Flat Migration (if editing and flat changed)
            if (editingResident && editingResident.flatIds?.[0] !== flatId) {
                const oldFlatId = editingResident.flatIds?.[0];
                if (oldFlatId) {
                    await supabase.from('flats')
                        .update({
                            owner_id: null,
                            tenant_id: null,
                            occupancy_status: 'vacant'
                        })
                        .eq('id', oldFlatId);
                }
            }

            const residentData = {
                uid: residentUid,
                societyId: user.societyId,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role: formData.role,
                flatIds: ['owner', 'tenant'].includes(formData.role) ? [flatId] : [],
                status: editingResident ? editingResident.status : 'active',
                updatedAt: new Date().toISOString()
            };

            // 3. Save User
            if (editingResident) {
                const { error: userError } = await supabase
                    .from('users')
                    .update(toSnake(residentData))
                    .eq('uid', residentUid);
                if (userError) throw userError;
            } else {
                const { error: userError } = await supabase
                    .from('users')
                    .insert([toSnake({ ...residentData, createdAt: new Date().toISOString() })]);
                if (userError) throw userError;
            }

            if (['owner', 'tenant'].includes(formData.role)) {
                const updateField = formData.role === 'owner' ? 'owner_id' : 'tenant_id';
                const { error: flatError } = await supabase
                    .from('flats')
                    .update({
                        [updateField]: residentUid,
                        occupancy_status: formData.role === 'owner' ? 'owner-occupied' : 'tenant-occupied',
                        ...(formData.role === 'tenant' ? { floor: parseInt(formData.floor) } : {})
                    })
                    .eq('id', flatId);

                if (flatError) throw flatError;
            }

            toast.success(editingResident ? 'Resident updated' : 'Resident added');
            setShowModal(false);
            setEditingResident(null);
            loadResidents();
            loadFlats();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save resident');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Resident Management</h1>
                        <p className="text-gray-600 mt-1">Manage users, roles, and access permissions</p>
                    </div>
                    <Button onClick={() => { setEditingResident(null); setShowModal(true); }}>
                        <Users size={20} className="mr-2" />
                        Add Resident
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Residents</p>
                            <p className="text-2xl font-bold">{residents.length}</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                            <UserCheck size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Active</p>
                            <p className="text-2xl font-bold">
                                {residents.filter(r => r.status === 'active').length}
                            </p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                            <UserX size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Inactive</p>
                            <p className="text-2xl font-bold">
                                {residents.filter(r => r.status !== 'active').length}
                            </p>
                        </div>
                    </Card>
                </div>

                <Card>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Resident</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Flat</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {residents.map((resident) => (
                                        <tr key={resident.uid} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{resident.name}</div>
                                                <div className="text-xs text-gray-500">ID: {resident.uid?.substring(0, 8)}...</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {resident.flatIds && resident.flatIds.length > 0 ? (
                                                        resident.flatIds.map(fId => {
                                                            const flat = flats.find(f => f.id === fId);
                                                            return (
                                                                <span key={fId} className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-medium">
                                                                    {flat ? `Flat ${flat.flatNumber || flat.flat_number}` : fId}
                                                                </span>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-xs text-gray-400">No flat</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                                    <Mail size={14} /> {resident.email}
                                                </div>
                                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                                    <Phone size={14} /> {resident.phone}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    defaultValue={resident.role}
                                                    onChange={(e) => handleUpdateRole(resident.uid, e.target.value)}
                                                    className="text-sm border rounded px-2 py-1 bg-white focus:ring-primary-500"
                                                >
                                                    <option value="tenant">Tenant</option>
                                                    <option value="owner">Owner</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="security">Security</option>
                                                    <option value="staff">Staff</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${resident.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {resident.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 space-x-2">
                                                <button
                                                    onClick={() => {
                                                        const flat = flats.find(f => f.id === resident.flatIds?.[0]);
                                                        setEditingResident({
                                                            ...resident,
                                                            // Inject flat details for modal pre-fill
                                                            flatNumber: flat?.flat_number || '',
                                                            floor: flat?.floor?.toString() || '1'
                                                        } as any);
                                                        setShowModal(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Edit Resident"
                                                >
                                                    <Edit2 size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(resident.uid, resident.status === 'active' ? 'inactive' : 'active')}
                                                    className={`${resident.status === 'active' ? 'text-red-600' : 'text-green-600'} hover:opacity-80`}
                                                    title={resident.status === 'active' ? 'Deactivate' : 'Activate'}
                                                >
                                                    {resident.status === 'active' ? <UserMinus size={20} /> : <UserCheck size={20} />}
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedResident(resident); setShowDetailsModal(true); }}
                                                    className="text-primary-600 hover:text-primary-800"
                                                    title="View Details"
                                                >
                                                    <Shield size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteResident(resident)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Delete Resident"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {showDetailsModal && selectedResident && (
                    <ResidentDetailsModal
                        isOpen={showDetailsModal}
                        resident={selectedResident}
                        onClose={() => setShowDetailsModal(false)}
                    />
                )}

                {showModal && (
                    <ResidentModal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        onSubmit={handleSaveResident}
                        flats={flats}
                        initialData={editingResident}
                    />
                )}
            </div>
        </Layout>
    );
};

const ResidentDetailsModal: React.FC<{
    isOpen: boolean;
    resident: User;
    onClose: () => void;
}> = ({ isOpen, resident, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Resident Details">
            <div className="space-y-4">
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase">Registration Date</p>
                    <p className="text-gray-900">{resident.createdAt ? new Date(resident.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase">Mapped Flats</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {resident.flatIds && resident.flatIds.length > 0 ? (
                            resident.flatIds.map(f => (
                                <span key={f} className="px-2 py-1 bg-gray-100 rounded text-sm">{f}</span>
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 italic">No flats assigned</p>
                        )}
                    </div>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase">KYC Documents</p>
                    {resident.kycDocuments?.aadhar ? (
                        <p className="text-sm text-green-600">Documents verified</p>
                    ) : (
                        <p className="text-sm text-red-600">Verification pending</p>
                    )}
                </div>
                <div className="pt-4">
                    <Button onClick={onClose} className="w-full">Close</Button>
                </div>
            </div>
        </Modal>
    );
};

const ResidentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    flats: any[];
    initialData?: (User & { flatNumber?: string; floor?: string }) | null;
}> = ({ isOpen, onClose, onSubmit, flats, initialData }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        role: initialData?.role || 'tenant',
        flatNumber: initialData?.flatNumber || '',
        floor: initialData?.floor || '1'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Resident' : 'Add New Resident'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                            placeholder="e.g. John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                            type="tel"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                            placeholder="Phone number"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                        type="email"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['owner', 'tenant', 'security', 'staff'].map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setFormData({ ...formData, role: r as any })}
                                className={`px-2 py-2 rounded-lg text-sm font-medium border capitalize ${formData.role === r
                                    ? 'bg-primary-50 border-primary-600 text-primary-700'
                                    : 'bg-white border-gray-200 text-gray-600'
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['owner', 'tenant'].includes(formData.role) && (
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Flat Number</label>
                            <input
                                type="text"
                                list="flat-suggestions"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                                placeholder="e.g. 101, A-502"
                                value={formData.flatNumber}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const existing = flats.find(f => f.flat_number === val || f.flatNumber === val);
                                    setFormData({
                                        ...formData,
                                        flatNumber: val,
                                        floor: existing ? (existing.floor || existing.floor_number)?.toString() : formData.floor
                                    });
                                }}
                                required
                            />
                            <datalist id="flat-suggestions">
                                {flats.map(f => (
                                    <option key={f.id} value={f.flat_number || f.flatNumber}>Floor {f.floor}</option>
                                ))}
                            </datalist>
                        </div>
                    )}

                    {formData.role === 'tenant' && (
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Floor Number</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                                value={formData.floor}
                                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                                required
                            />
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" className="flex-1">
                        {initialData ? 'Update Resident' : 'Add Resident'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
