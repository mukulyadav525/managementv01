import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Edit2, Trash2, Home, UserPlus } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Modal } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { UserService, toSnake, SocietyService } from '@/services/supabase.service';
import { User, Flat } from '@/types';
import { supabase } from '@/config/supabase';
import toast from 'react-hot-toast';

type StaffRoleType = 'society_staff' | 'domestic_staff';

interface StaffUser extends User {
    staffType?: StaffRoleType;
    mappedFlatId?: string;
}

export const StaffPage: React.FC = () => {
    const { user } = useAuthStore();
    const [staffList, setStaffList] = useState<StaffUser[]>([]);
    const [flats, setFlats] = useState<Flat[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

    useEffect(() => {
        if (user?.societyId) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user?.societyId) return;
        try {
            setLoading(true);
            const [usersData, flatsData] = await Promise.all([
                UserService.getUsers(user.societyId),
                SocietyService.getFlats(user.societyId)
            ]);

            // Filter only staff members
            const staff = (usersData as StaffUser[]).filter(u => u.role === 'staff');
            setStaffList(staff);
            setFlats(flatsData as Flat[]);
        } catch (error) {
            toast.error('Failed to load staff data');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStaff = async (staff: StaffUser) => {
        if (!window.confirm(`Are you sure you want to delete ${staff.name}?`)) return;

        try {
            setLoading(true);
            const { error } = await supabase.from('users').delete().eq('uid', staff.uid);
            if (error) throw error;
            toast.success('Staff member deleted');
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete staff');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveStaff = async (formData: any) => {
        if (!user?.societyId) return;
        try {
            setLoading(true);
            const staffUid = editingStaff ? editingStaff.uid : crypto.randomUUID();

            const staffData = {
                uid: staffUid,
                societyId: user.societyId,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role: 'staff',
                staffType: formData.staffType,
                flatIds: formData.staffType === 'domestic_staff' && formData.mappedFlatId ? [formData.mappedFlatId] : [],
                status: editingStaff ? editingStaff.status : 'active',
                updatedAt: new Date().toISOString()
            };

            if (editingStaff) {
                const { error } = await supabase
                    .from('users')
                    .update(toSnake(staffData))
                    .eq('uid', staffUid);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('users')
                    .insert([toSnake({ ...staffData, createdAt: new Date().toISOString() })]);
                if (error) throw error;
            }

            toast.success(editingStaff ? 'Staff updated' : 'Staff member added');
            setShowModal(false);
            setEditingStaff(null);
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save staff');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
                        <p className="text-gray-600 mt-1">Manage society and domestic staff members</p>
                    </div>
                    <Button onClick={() => { setEditingStaff(null); setShowModal(true); }}>
                        <UserPlus size={20} className="mr-2" />
                        Add Staff Member
                    </Button>
                </div>

                {/* Staff List */}
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
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Staff Member</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Mapping</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {staffList.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                No staff members found. Add your first staff member!
                                            </td>
                                        </tr>
                                    )}
                                    {staffList.map((staff) => (
                                        <tr key={staff.uid} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                                                        {staff.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{staff.name}</div>
                                                        <div className="text-xs text-gray-500 uppercase tracking-wider">{staff.uid.substring(0, 8)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${staff.staffType === 'society_staff'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {staff.staffType === 'society_staff' ? 'Society Staff' : 'Domestic Staff'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {staff.staffType === 'domestic_staff' ? (
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                                        <Home size={14} className="text-gray-400" />
                                                        {staff.flatIds?.[0] ? (
                                                            <span>Flat {flats.find(f => f.id === staff.flatIds[0])?.flatNumber || staff.flatIds[0]}</span>
                                                        ) : (
                                                            <span className="text-red-400 italic">Not Mapped</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-500 italic">
                                                        <MapPin size={14} className="text-gray-300" />
                                                        Resident Wide
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Phone size={14} className="text-gray-400" /> {staff.phone}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Mail size={14} className="text-gray-400" /> {staff.email}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingStaff({
                                                            ...staff,
                                                            mappedFlatId: staff.flatIds?.[0] || ''
                                                        } as any);
                                                        setShowModal(true);
                                                    }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteStaff(staff)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {showModal && (
                    <StaffManagementModal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        onSubmit={handleSaveStaff}
                        flats={flats}
                        initialData={editingStaff}
                    />
                )}
            </div>
        </Layout>
    );
};

interface StaffManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    flats: Flat[];
    initialData?: any;
}

const StaffManagementModal: React.FC<StaffManagementModalProps> = ({ isOpen, onClose, onSubmit, flats, initialData }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        staffType: initialData?.staffType || 'society_staff',
        mappedFlatId: initialData?.flatIds?.[0] || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Staff Member' : 'Add Staff Member'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                        placeholder="e.g. Maria Sparkles (Maid)"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                            placeholder="email@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Staff Category</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, staffType: 'society_staff', mappedFlatId: '' })}
                            className={`p-3 rounded-xl border text-left transition-all ${formData.staffType === 'society_staff'
                                ? 'bg-primary-50 border-primary-600 ring-1 ring-primary-600'
                                : 'bg-white border-gray-200 hover:border-primary-400'
                                }`}
                        >
                            <div className="font-bold text-gray-900">Society Staff</div>
                            <div className="text-xs text-gray-500">Receptionists, Maintenance, Tech support</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, staffType: 'domestic_staff' })}
                            className={`p-3 rounded-xl border text-left transition-all ${formData.staffType === 'domestic_staff'
                                ? 'bg-amber-50 border-amber-600 ring-1 ring-amber-600'
                                : 'bg-white border-gray-200 hover:border-amber-400'
                                }`}
                        >
                            <div className="font-bold text-gray-900">Domestic Staff</div>
                            <div className="text-xs text-gray-500">Maids, Milkmen, Private Drivers</div>
                        </button>
                    </div>
                </div>

                {formData.staffType === 'domestic_staff' && (
                    <div className="space-y-1 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                        <label className="block text-sm font-medium text-amber-900">Map to Resident Flat</label>
                        <select
                            className="w-full mt-1.5 px-3 py-2 bg-white border border-amber-200 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                            value={formData.mappedFlatId}
                            onChange={(e) => setFormData({ ...formData, mappedFlatId: e.target.value })}
                            required={formData.staffType === 'domestic_staff'}
                        >
                            <option value="">Select a flat...</option>
                            {flats.map(flat => (
                                <option key={flat.id} value={flat.id}>
                                    Flat {flat.flatNumber} (Floor {flat.floor})
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-amber-700 italic flex items-center gap-1">
                            <Home size={12} /> Domestic staff must be assigned to a specific property.
                        </p>
                    </div>
                )}

                <div className="flex gap-3 pt-6 border-t border-gray-100">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
                    <Button type="submit" className="flex-1 rounded-xl shadow-lg shadow-primary-200">
                        {initialData ? 'Update Details' : 'Register Staff'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
