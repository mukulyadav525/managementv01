import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Edit2, Trash2, Home, UserPlus } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Modal } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { UserService, toSnake, SocietyService } from '@/services/supabase.service';
import { User, Flat } from '@/types';
import { supabase } from '@/config/supabase';
import toast from 'react-hot-toast';
import { generateTempPassword } from '@/utils/password';
import { Shield } from 'lucide-react';

type StaffRoleType = 'society_staff' | 'domestic_staff';

interface StaffUser extends User {
    staffType?: StaffRoleType;
    buildingId?: string;
    buildingIds?: string[];
}

export const StaffPage: React.FC = () => {
    const { user } = useAuthStore();
    const [staffList, setStaffList] = useState<StaffUser[]>([]);
    const [flats, setFlats] = useState<Flat[]>([]);
    const [buildings, setBuildings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
    const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);

    useEffect(() => {
        if (user?.societyId) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user?.societyId) return;
        try {
            setLoading(true);
            const [usersData, flatsData, buildingsRes] = await Promise.all([
                UserService.getUsers(user.societyId),
                SocietyService.getFlats(user.societyId),
                supabase.from('buildings').select('id, name').eq('society_id', user.societyId)
            ]);

            // Filter only staff members
            const staff = (usersData as StaffUser[]).filter(u => u.role === 'staff' || u.role === 'security');
            setStaffList(staff);
            setFlats(flatsData as Flat[]);
            setBuildings(buildingsRes.data || []);
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
                role: formData.staffType === 'security' ? 'security' as any : 'staff' as any,
                staffType: formData.staffType === 'security' ? 'society_staff' : formData.staffType,
                staffRole: formData.staffType === 'security' ? 'Security Guard' : formData.staffRole,
                flatIds: formData.staffType === 'domestic_staff' ? formData.selectedFlatIds : [],
                buildingId: formData.staffType === 'society_staff' ? (formData.selectedBuildingIds[0] || null) : (formData.staffType === 'domestic_staff' ? (formData.selectedBuildingIds[0] || null) : null),
                buildingIds: formData.selectedBuildingIds || [],
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
                // For NEW staff, create an auth account
                const password = generateTempPassword();
                const { registerByAdmin } = useAuthStore.getState();

                await registerByAdmin(formData.email, password, {
                    ...staffData,
                    societyId: user.societyId
                });

                setGeneratedCredentials({ email: formData.email, password });
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
                                                <div className="flex flex-col gap-1">
                                                    {staff.role === 'security' ? (
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit bg-green-100 text-green-700 border border-green-200">
                                                            Security Guard
                                                        </span>
                                                    ) : (
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${staff.staffType === 'society_staff'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            {staff.staffType === 'society_staff' ? 'Society Staff' : 'Domestic Staff'}
                                                        </span>
                                                    )}
                                                    <span className="text-sm font-medium text-gray-700 ml-1">
                                                        {staff.role === 'security' ? 'Security' : (staff.staffRole || 'General Staff')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {staff.role === 'security' ? (
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                                        <Shield size={14} className="text-green-500" />
                                                        <span className="font-medium text-gray-900 border-b border-dotted border-green-200">
                                                            Society Wide
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1.5 max-w-[200px]">
                                                        {/* Buildings Mapping */}
                                                        {staff.buildingIds && staff.buildingIds.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 items-center">
                                                                <MapPin size={12} className="text-primary-500" />
                                                                {staff.buildingIds.map(bId => (
                                                                    <span key={bId} className="text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded border border-primary-100">
                                                                        {buildings.find(b => b.id === bId)?.name || 'Building'}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Flats Mapping (Only for Domestic) */}
                                                        {staff.staffType === 'domestic_staff' && staff.flatIds && staff.flatIds.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1 items-center">
                                                                <Home size={12} className="text-amber-500" />
                                                                {staff.flatIds.map(fId => {
                                                                    const flat = flats.find(f => f.id === fId);
                                                                    return (
                                                                        <span key={fId} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">
                                                                            {flat?.flatNumber || 'Flat'}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : staff.staffType === 'domestic_staff' && (
                                                            <span className="text-red-400 text-xs italic">No flats mapped</span>
                                                        )}

                                                        {(!staff.buildingIds || staff.buildingIds.length === 0) && (!staff.flatIds || staff.flatIds.length === 0) && (
                                                            <span className="text-gray-400 text-xs italic">Unassigned</span>
                                                        )}
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
                                                        setEditingStaff(staff);
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
                        initialData={editingStaff}
                    />
                )}
            </div>

            {generatedCredentials && (
                <CredentialSuccessModal
                    isOpen={!!generatedCredentials}
                    onClose={() => setGeneratedCredentials(null)}
                    credentials={generatedCredentials}
                />
            )}
        </Layout>
    );
};

const CredentialSuccessModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    credentials: { email: string; password: string };
}> = ({ isOpen, onClose, credentials }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Staff Member Registered">
            <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <p className="text-sm text-green-800">
                        An authentication account has been created for this staff member. You can now share these credentials with them.
                    </p>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">Email Address</label>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 mt-1">
                            <span className="font-mono text-sm">{credentials.email}</span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(credentials.email);
                                    toast.success('Email copied');
                                }}
                                className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">Temporary Password</label>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 mt-1">
                            <span className="font-mono text-sm">{credentials.password}</span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(credentials.password);
                                    toast.success('Password copied');
                                }}
                                className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-2">
                    <Shield size={18} className="text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-800 italic">
                        The user can also log in directly via Google using the same email address.
                    </p>
                </div>

                <Button onClick={onClose} className="w-full mt-4">Done</Button>
            </div>
        </Modal>
    );
};

interface StaffManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: any;
}

const StaffManagementModal: React.FC<StaffManagementModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        staffType: initialData?.role === 'security' ? 'security' : (initialData?.staffType || 'society_staff'),
        staffRole: initialData?.staffRole || '',
        selectedBuildingIds: initialData?.buildingIds || (initialData?.buildingId ? [initialData.buildingId] : []),
        selectedFlatIds: initialData?.flatIds || [] as string[],
        activeBuildingTab: '' // For Domestic Staff: which building's flats we are showing
    });

    const [buildings, setBuildings] = useState<any[]>([]);
    const [allFlats, setAllFlats] = useState<any[]>([]);
    const { user } = useAuthStore();

    const [isCustomRole, setIsCustomRole] = useState(false);

    const societyRoles = ['Receptionist', 'Maintenance', 'Manager', 'Accountant', 'Tech Support'];
    const domesticRoles = ['Maid', 'Cook', 'Driver', 'Milkman', 'Gardener'];

    const currentRoles = formData.staffType === 'society_staff' ? societyRoles : domesticRoles;

    // Load buildings & flats
    useEffect(() => {
        if (user?.societyId) {
            Promise.all([
                supabase.from('buildings').select('id, name').eq('society_id', user.societyId),
                supabase.from('flats').select('id, flat_number, floor, building_id').eq('society_id', user.societyId)
            ]).then(([buildingsRes, flatsRes]) => {
                setBuildings(buildingsRes.data || []);
                setAllFlats(flatsRes.data || []);
            });
        }
    }, [user?.societyId]);

    useEffect(() => {
        if (initialData?.staffRole && !currentRoles.includes(initialData.staffRole)) {
            setIsCustomRole(true);
        }
    }, [initialData, currentRoles]);

    // Logic for toggling buildings / flats


    const toggleBuilding = (buildingId: string) => {
        setFormData(prev => {
            const isRemoving = prev.selectedBuildingIds.includes(buildingId);
            const newBuildingIds = isRemoving
                ? prev.selectedBuildingIds.filter((id: string) => id !== buildingId)
                : [...prev.selectedBuildingIds, buildingId];

            // If removing a building, also remove its flats (only for domestic)
            const newFlatIds = isRemoving
                ? prev.selectedFlatIds.filter((fId: string) => {
                    const flat = allFlats.find(f => f.id === fId);
                    return flat?.building_id !== buildingId;
                })
                : prev.selectedFlatIds;

            return {
                ...prev,
                selectedBuildingIds: newBuildingIds,
                selectedFlatIds: newFlatIds,
                activeBuildingTab: prev.activeBuildingTab === buildingId && isRemoving ? '' : prev.activeBuildingTab
            };
        });
    };

    const toggleFlat = (flatId: string) => {
        setFormData(prev => ({
            ...prev,
            selectedFlatIds: prev.selectedFlatIds.includes(flatId)
                ? prev.selectedFlatIds.filter((id: string) => id !== flatId)
                : [...prev.selectedFlatIds, flatId]
        }));
    };

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
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, staffType: 'security', staffRole: 'Security Guard', selectedFlatIds: [], selectedBuildingIds: [] })}
                            className={`p-3 rounded-xl border text-left transition-all ${formData.staffType === 'security'
                                ? 'bg-green-50 border-green-600 ring-1 ring-green-600'
                                : 'bg-white border-gray-200 hover:border-green-400'
                                }`}
                        >
                            <div className="font-bold text-gray-900">Security</div>
                            <div className="text-xs text-gray-500">Guards, Gate security</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, staffType: 'society_staff', staffRole: '', selectedFlatIds: [], selectedBuildingIds: [] })}
                            className={`p-3 rounded-xl border text-left transition-all ${formData.staffType === 'society_staff'
                                ? 'bg-primary-50 border-primary-600 ring-1 ring-primary-600'
                                : 'bg-white border-gray-200 hover:border-primary-400'
                                }`}
                        >
                            <div className="font-bold text-gray-900">Society Staff</div>
                            <div className="text-xs text-gray-500">Maintenance, Accountant</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, staffType: 'domestic_staff', staffRole: '', selectedFlatIds: [], selectedBuildingIds: [] })}
                            className={`p-3 rounded-xl border text-left transition-all ${formData.staffType === 'domestic_staff'
                                ? 'bg-amber-50 border-amber-600 ring-1 ring-amber-600'
                                : 'bg-white border-gray-200 hover:border-amber-400'
                                }`}
                        >
                            <div className="font-bold text-gray-900">Domestic Staff</div>
                            <div className="text-xs text-gray-500">Maids, Cooks, Drivers</div>
                        </button>
                    </div>
                </div>

                {formData.staffType !== 'security' && (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Specific Role</label>
                        <div className="flex flex-wrap gap-2">
                            {currentRoles.map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, staffRole: role });
                                        setIsCustomRole(false);
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${formData.staffRole === role && !isCustomRole
                                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400'
                                        }`}
                                >
                                    {role}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomRole(true);
                                    setFormData({ ...formData, staffRole: '' });
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isCustomRole
                                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400'
                                    }`}
                            >
                                Other / Custom
                            </button>
                        </div>

                        {isCustomRole && (
                            <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 text-sm"
                                    placeholder="Type custom role..."
                                    value={formData.staffRole}
                                    onChange={(e) => setFormData({ ...formData, staffRole: e.target.value })}
                                    required
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Security: Society-wide notice */}
                {formData.staffType === 'security' && (
                    <div className="space-y-4 bg-green-50/50 p-4 rounded-xl border border-green-100">
                        <div className="flex items-center gap-2 text-green-900">
                            <Shield size={20} />
                            <span className="font-bold">Society Wide Access</span>
                        </div>
                        <p className="text-sm text-green-700 italic">
                            Security guards have access to the whole society records (visitors, residents, etc.). No specific building or flat assignment is required.
                        </p>
                    </div>
                )}

                {/* Staff (Society or Domestic): Multi-Building selector */}
                {(formData.staffType === 'society_staff' || formData.staffType === 'domestic_staff') && (
                    <div className={`space-y-4 p-4 rounded-xl border ${formData.staffType === 'domestic_staff'
                        ? 'bg-amber-50/50 border-amber-100'
                        : 'bg-primary-50/50 border-primary-100'
                        }`}>
                        <label className={`block text-sm font-medium ${formData.staffType === 'domestic_staff' ? 'text-amber-900' : 'text-primary-900'
                            }`}>Select Assigned Building(s)</label>

                        {/* Building Multi-Select Chills */}
                        <div className="flex flex-wrap gap-2">
                            {buildings.map(b => (
                                <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => toggleBuilding(b.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${formData.selectedBuildingIds.includes(b.id)
                                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400'
                                        }`}
                                >
                                    {b.name}
                                </button>
                            ))}
                        </div>

                        {/* Domestic Staff: Multi-Flat selector (appears only if buildings are selected) */}
                        {formData.staffType === 'domestic_staff' && formData.selectedBuildingIds.length > 0 && (
                            <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-medium text-amber-900">Select Flat(s)</label>

                                {/* Building Tabs for Flats */}
                                <div className="flex gap-2 border-b border-amber-200 pb-2">
                                    {formData.selectedBuildingIds.map((bId: string) => (
                                        <button
                                            key={bId}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, activeBuildingTab: bId })}
                                            className={`px-3 py-1 text-xs font-medium rounded-t-lg transition-colors ${(formData.activeBuildingTab === bId || (!formData.activeBuildingTab && formData.selectedBuildingIds[0] === bId))
                                                ? 'bg-amber-100 text-amber-900 border-b-2 border-amber-600'
                                                : 'text-gray-500 hover:bg-amber-50'
                                                }`}
                                        >
                                            {buildings.find(b => b.id === bId)?.name}
                                        </button>
                                    ))}
                                </div>

                                {/* Flat Grid for active building */}
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-white rounded-lg border border-amber-100">
                                    {allFlats
                                        .filter(f => f.building_id === (formData.activeBuildingTab || formData.selectedBuildingIds[0]))
                                        .map(flat => (
                                            <button
                                                key={flat.id}
                                                type="button"
                                                onClick={() => toggleFlat(flat.id)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${formData.selectedFlatIds.includes(flat.id)
                                                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                                    : 'bg-white text-gray-600 border-gray-100 hover:border-amber-400'
                                                    }`}
                                            >
                                                {flat.flat_number}
                                            </button>
                                        ))
                                    }
                                    {allFlats.filter(f => f.building_id === (formData.activeBuildingTab || formData.selectedBuildingIds[0])).length === 0 && (
                                        <p className="text-xs text-gray-400 italic">No flats mapped in this building.</p>
                                    )}
                                </div>

                                {formData.selectedFlatIds.length > 0 && (
                                    <p className="text-xs text-amber-600 font-bold">
                                        {formData.selectedFlatIds.length} flat(s) selected across buildings.
                                    </p>
                                )}
                            </div>
                        )}

                        <p className={`mt-1 text-xs italic flex items-center gap-1 ${formData.staffType === 'domestic_staff' ? 'text-amber-700' : 'text-primary-700'
                            }`}>
                            <Home size={12} /> {formData.staffType === 'domestic_staff'
                                ? 'Domestic staff can be assigned to multiple buildings and specific flats within them.'
                                : 'Society staff are assigned at the building level and work across the entire building.'}
                        </p>
                    </div>
                )}
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
                <Button type="submit" className="flex-1 rounded-xl shadow-lg shadow-primary-200">
                    {initialData ? 'Update Details' : 'Register Staff'}
                </Button>
            </div>
        </form>
    </Modal >
    );
};
