import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Edit2, Trash2, Home, UserPlus, DollarSign } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Modal } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { UserService, toSnake, SocietyService, SalaryPaymentService } from '@/services/supabase.service';
import { User, Flat, SalaryPayment } from '@/types';
import { supabase } from '@/config/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface StaffUser extends User {
    staffType?: 'society_staff' | 'domestic_staff';
    mappedFlatId?: string;
}

export const OwnerStaffPage: React.FC = () => {
    const { user } = useAuthStore();
    const [staffList, setStaffList] = useState<StaffUser[]>([]);
    const [myFlats, setMyFlats] = useState<Flat[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState<{ isOpen: boolean; staff: StaffUser | null }>({ isOpen: false, staff: null });
    const [salaryHistory, setSalaryHistory] = useState<{ [key: string]: SalaryPayment[] }>({});

    useEffect(() => {
        if (user?.societyId && user?.flatIds) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user?.societyId || !user?.flatIds) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const [usersData, flatsData] = await Promise.all([
                UserService.getUsers(user.societyId, 'staff').catch(e => {
                    console.error('Error fetching staff list:', e);
                    return [] as StaffUser[];
                }),
                SocietyService.getFlats(user.societyId).catch(e => {
                    console.error('Error fetching flats:', e);
                    return [] as Flat[];
                })
            ]);

            // Filter flats owned or rented by the user
            const userFlats = (flatsData as Flat[]).filter(f => user.flatIds!.includes(f.id));
            setMyFlats(userFlats);

            // Filter staff mapped to the user's flats
            const myStaff = (usersData as StaffUser[]).filter(u =>
                u.flatIds?.some(fid => user.flatIds!.includes(fid))
            );
            setStaffList(myStaff);

            // Fetch salary history for my staff
            if (myStaff.length > 0) {
                const historyMap: { [key: string]: SalaryPayment[] } = {};

                try {
                    const historyPromises = myStaff.map(s =>
                        SalaryPaymentService.getSalaryPayments(s.uid, user.societyId)
                            .catch(e => {
                                console.warn(`Failed to fetch salary history for staff ${s.uid}:`, e);
                                return [] as SalaryPayment[];
                            })
                    );
                    const historyResults = await Promise.all(historyPromises);

                    myStaff.forEach((s, index) => {
                        const results = historyResults[index];
                        if (Array.isArray(results)) {
                            historyMap[s.uid] = results.filter(p => p && p.status === 'paid');
                        } else {
                            historyMap[s.uid] = [];
                        }
                    });
                } catch (historyError) {
                    console.error('Error processing salary history mapping:', historyError);
                }

                setSalaryHistory(historyMap);
            }
        } catch (error) {
            console.error('Error loading staff page data:', error);
            toast.error('Failed to load staff data');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStaff = async (staff: StaffUser) => {
        if (!window.confirm(`Are you sure you want to remove ${staff.name} from your staff list?`)) return;

        try {
            setLoading(true);
            const { error } = await supabase.from('users').delete().eq('uid', staff.uid);
            if (error) throw error;
            toast.success('Staff member removed');
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove staff');
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
                staffType: 'domestic_staff',
                flatIds: [formData.mappedFlatId],
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

    const handlePaySalary = async (formData: any) => {
        if (!user || !showPaymentModal.staff) return;
        try {
            setLoading(true);
            await SalaryPaymentService.createSalaryRequest({
                societyId: user.societyId,
                guardId: showPaymentModal.staff.uid,
                amount: formData.amount,
                month: formData.month,
                status: 'paid',
                requestedAt: new Date().toISOString(),
                paidAt: new Date().toISOString(),
                approvedAt: new Date().toISOString(),
                approvedBy: user.uid,
                notes: `Paid by Resident: ${user.name}${formData.notes ? ` - ${formData.notes}` : ''}`
            });
            toast.success(`Salary paid to ${showPaymentModal.staff.name}`);
            setShowPaymentModal({ isOpen: false, staff: null });
            loadData();
        } catch (error) {
            console.error('Salary payment error:', error);
            toast.error('Failed to process payment. Please check your permissions.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Staff</h1>
                        <p className="text-gray-600 mt-1">Manage domestic help and pay salaries</p>
                    </div>
                    <Button onClick={() => { setEditingStaff(null); setShowModal(true); }}>
                        <UserPlus size={20} className="mr-2" />
                        Add Domestic Help
                    </Button>
                </div>

                <Card>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                            <p className="mt-4 text-gray-500">Loading staff information...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Assigned Flat</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Paid</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {staffList.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                No domestic staff found for your properties.
                                            </td>
                                        </tr>
                                    )}
                                    {staffList.map((staff) => (
                                        <tr key={staff.uid} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                                                        {staff.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="font-medium text-gray-900">{staff.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                                    <Home size={14} className="text-gray-400" />
                                                    <span>Flat {myFlats.find(f => staff.flatIds?.includes(f.id))?.flatNumber || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Phone size={14} className="text-gray-400" /> {staff.phone}
                                                    </div>
                                                    {staff.email && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Mail size={14} className="text-gray-400" /> {staff.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {salaryHistory[staff.uid]?.length > 0 ? (
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            ₹{salaryHistory[staff.uid][0].amount.toLocaleString()}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            on {salaryHistory[staff.uid][0].paidAt ? format(new Date(salaryHistory[staff.uid][0].paidAt!), 'MMM dd, yyyy') : 'Recently'}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-400">Never</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                                                    onClick={() => setShowPaymentModal({ isOpen: true, staff })}
                                                >
                                                    <DollarSign size={14} className="mr-1" /> Pay
                                                </Button>
                                                <button
                                                    onClick={() => {
                                                        setEditingStaff({
                                                            ...staff,
                                                            mappedFlatId: staff.flatIds?.[0] || ''
                                                        } as any);
                                                        setShowModal(true);
                                                    }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteStaff(staff)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                    <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingStaff ? 'Edit Domestic Help' : 'Add Domestic Help'}>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleSaveStaff({
                                name: formData.get('name'),
                                email: formData.get('email'),
                                phone: formData.get('phone'),
                                mappedFlatId: formData.get('mappedFlatId')
                            });
                        }} className="space-y-4">
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input
                                    name="name"
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                                    defaultValue={editingStaff?.name}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                                    <input
                                        name="phone"
                                        type="tel"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                                        defaultValue={editingStaff?.phone}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                                    <input
                                        name="email"
                                        type="email"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                                        defaultValue={editingStaff?.email}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1 bg-amber-50 p-4 rounded-lg border border-amber-100">
                                <label className="block text-sm font-medium text-amber-900">Map to Flat</label>
                                <select
                                    name="mappedFlatId"
                                    className="w-full mt-1.5 px-3 py-2 bg-white border border-amber-200 rounded-lg focus:ring-amber-500"
                                    defaultValue={editingStaff?.flatIds?.[0] || ''}
                                    required
                                >
                                    <option value="">Select one of your flats...</option>
                                    {myFlats.map(flat => (
                                        <option key={flat.id} value={flat.id}>
                                            Flat {flat.flatNumber}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                                <Button type="submit" className="flex-1">
                                    {editingStaff ? 'Update Details' : 'Register Help'}
                                </Button>
                            </div>
                        </form>
                    </Modal>
                )}

                {showPaymentModal.isOpen && showPaymentModal.staff && (
                    <Modal
                        isOpen={showPaymentModal.isOpen}
                        onClose={() => setShowPaymentModal({ isOpen: false, staff: null })}
                        title={`Pay Salary - ${showPaymentModal.staff.name}`}
                    >
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handlePaySalary({
                                amount: parseInt(formData.get('amount') as string),
                                month: formData.get('month'),
                                notes: formData.get('notes')
                            });
                        }} className="space-y-4">
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Salary Amount (₹)</label>
                                <input
                                    name="amount"
                                    type="number"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-green-500"
                                    placeholder="e.g. 5000"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">Salary Month</label>
                                    <input
                                        name="month"
                                        type="month"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-green-500"
                                        defaultValue={new Date().toISOString().substring(0, 7)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                                        value={format(new Date(), 'MMM dd, yyyy')}
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                                <textarea
                                    name="notes"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-green-500"
                                    placeholder="Payment reference, mode, etc."
                                    rows={2}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowPaymentModal({ isOpen: false, staff: null })} className="flex-1">Cancel</Button>
                                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                                    Confirm Payment
                                </Button>
                            </div>
                        </form>
                    </Modal>
                )}
            </div>
        </Layout>
    );
};
