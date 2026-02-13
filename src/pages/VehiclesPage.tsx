import React, { useEffect, useState } from 'react';
import { Car, Plus, Trash2, Edit2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Modal, Input } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { toSnake } from '@/services/supabase.service';
import { supabase } from '@/config/supabase';
import toast from 'react-hot-toast';

export const VehiclesPage: React.FC = () => {
    const { user } = useAuthStore();
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [flats, setFlats] = useState<any[]>([]);
    const [residents, setResidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<any>(null);

    useEffect(() => {
        if (user?.societyId) {
            loadVehicles();
            loadFormData();
        }
    }, [user]);

    const loadFormData = async () => {
        if (!user?.societyId) return;
        try {
            let flatsData: any[] = [];
            let residentsData: any[] = [];

            if (user.role === 'admin' || user.role === 'staff') {
                // Admins see everything
                const [flatsRes, residentsRes] = await Promise.all([
                    supabase.from('flats').select('id, flat_number, floor').eq('society_id', user.societyId),
                    supabase.from('users').select('uid, name').eq('society_id', user.societyId)
                ]);
                flatsData = flatsRes.data || [];
                residentsData = residentsRes.data || [];
            } else if (user.role === 'owner') {
                // Owners see only their flats and residents in those flats
                const { data: myFlats } = await supabase
                    .from('flats')
                    .select('id, flat_number, floor, tenant_id')
                    .eq('owner_id', user.uid);

                flatsData = myFlats || [];

                // Get IDs of tenants in my flats + myself
                // Better approach: fetch all users who have these flats in their flat_ids
                const myFlatIds = flatsData.map(f => f.id);
                if (myFlatIds.length > 0) {
                    const { data: societyUsers } = await supabase
                        .from('users')
                        .select('uid, name, flat_ids')
                        .eq('society_id', user.societyId);

                    if (societyUsers) {
                        residentsData = societyUsers.filter(u =>
                            u.uid === user.uid || // Include self
                            (u.flat_ids && u.flat_ids.some((fid: string) => myFlatIds.includes(fid)))
                        );
                    }
                } else {
                    residentsData = [{ uid: user.uid, name: user.name }];
                }
            } else {
                // Tenants: fetch their flats AND all residents in those flats (roommates, family)
                // Tenants: fetch flats based on their profile's flat_ids (handle secondary tenants)
                let myFlats: any[] = [];
                if (user.flatIds && user.flatIds.length > 0) {
                    const { data } = await supabase
                        .from('flats')
                        .select('id, flat_number, floor')
                        .in('id', user.flatIds);
                    myFlats = data || [];
                }

                // Fallback (legacy)
                if (myFlats.length === 0) {
                    const { data } = await supabase
                        .from('flats')
                        .select('id, flat_number, floor')
                        .eq('tenant_id', user.uid);
                    myFlats = data || [];
                }

                flatsData = myFlats || [];
                const myFlatIds = flatsData.map(f => f.id);

                if (myFlatIds.length > 0) {
                    // Fetch all users in these flats
                    const { data: societyUsers } = await supabase
                        .from('users')
                        .select('uid, name, flat_ids')
                        .eq('society_id', user.societyId);

                    if (societyUsers) {
                        residentsData = societyUsers.filter(u =>
                            (u.flat_ids && u.flat_ids.some((fid: string) => myFlatIds.includes(fid)))
                        );
                    }
                }

                // If no residents found (edge case), at least show self
                if (residentsData.length === 0) {
                    residentsData = [{ uid: user.uid, name: user.name }];
                }
            }

            setFlats(flatsData);
            setResidents(residentsData);
        } catch (error) {
            console.error('Error loading form data:', error);
        }
    };

    const loadVehicles = async () => {
        if (!user?.societyId) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('vehicles')
                .select('*, users(name), flats(flat_number)')
                .eq('society_id', user.societyId);

            if (error) throw error;
            setVehicles(data || []);
        } catch (error) {
            toast.error('Failed to load vehicles');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveVehicle = async (formData: any) => {
        if (!user?.societyId) return;
        try {
            const vehicleData = {
                ...formData,
                societyId: user.societyId,
                userId: formData.userId || null,
                flatId: formData.flatId || null,
                updatedAt: new Date().toISOString()
            };

            const payload = toSnake(vehicleData);

            if (editingVehicle) {
                const { error } = await supabase
                    .from('vehicles')
                    .update(payload)
                    .eq('id', editingVehicle.id);
                if (error) throw error;
                toast.success('Vehicle updated');
            } else {
                const { error } = await supabase
                    .from('vehicles')
                    .insert([{ ...payload, created_at: new Date().toISOString() }]);
                if (error) throw error;
                toast.success('Vehicle registered');
            }
            setShowModal(false);
            setEditingVehicle(null);
            loadVehicles();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save vehicle');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Remove this vehicle?')) return;
        try {
            const { error } = await supabase.from('vehicles').delete().eq('id', id);
            if (error) throw error;
            toast.success('Vehicle removed');
            loadVehicles();
        } catch (error) {
            toast.error('Failed to remove vehicle');
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Vehicle Management</h1>
                        <p className="text-gray-600 mt-1">Track resident vehicles and parking slots</p>
                    </div>
                    <Button onClick={() => { setEditingVehicle(null); setShowModal(true); }}>
                        <Plus size={20} className="mr-2" />
                        Register Vehicle
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <Car size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Vehicles</p>
                            <p className="text-2xl font-bold">{vehicles.length}</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Car size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Cars</p>
                            <p className="text-2xl font-bold">
                                {vehicles.filter(v => v.v_type === 'car').length}
                            </p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                            <Car size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Bikes / Others</p>
                            <p className="text-2xl font-bold">
                                {vehicles.filter(v => v.v_type !== 'car').length}
                            </p>
                        </div>
                    </Card>
                </div>

                <Card>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        </div>
                    ) : vehicles.length === 0 ? (
                        <div className="text-center py-12">
                            <Car size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500">No vehicles registered</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Owner / Flat</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Parking Slot</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {vehicles.map((v) => (
                                        <tr key={v.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium">
                                                <div className="text-gray-900">{v.vehicle_number}</div>
                                                <div className="text-xs text-gray-500 uppercase">{v.brand} {v.model}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm">{v.users?.name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500 font-medium">Flat {v.flats?.flat_number || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="capitalize px-2 py-0.5 bg-gray-100 rounded text-xs">
                                                    {v.v_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                                    {v.parking_slot || 'Unassigned'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 space-x-2">
                                                <button onClick={() => { setEditingVehicle(v); setShowModal(true); }} className="text-blue-600 hover:text-blue-800">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-800">
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
                    <VehicleModal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        onSubmit={handleSaveVehicle}
                        initialData={editingVehicle}
                        flats={flats}
                        residents={residents}
                        userRole={user?.role}
                    />
                )}
            </div>
        </Layout>
    );
};

const VehicleModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: any;
    flats: any[];
    residents: any[];
    userRole?: string;
}> = ({ isOpen, onClose, onSubmit, initialData, flats, residents, userRole }) => {
    // Auto-select if only one option exists (especially for tenants/owners)
    const initialFlatId = initialData?.flat_id || (flats.length === 1 ? flats[0].id : '');
    const initialUserId = initialData?.user_id || (residents.length === 1 ? residents[0].uid : '');

    const [formData, setFormData] = useState({
        vehicleNumber: initialData?.vehicle_number || '',
        brand: initialData?.brand || '',
        model: initialData?.model || '',
        vType: initialData?.v_type || 'car',
        parkingSlot: initialData?.parking_slot || '',
        userId: initialUserId,
        flatId: initialFlatId
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Vehicle' : 'Register Vehicle'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Vehicle Number"
                    placeholder="DL 01 AB 1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    required
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Brand"
                        placeholder="Toyota"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        required
                    />
                    <Input
                        label="Model"
                        placeholder="Camry"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        required
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Flat</label>
                        <select
                            value={formData.flatId}
                            onChange={(e) => setFormData({ ...formData, flatId: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
                            required
                            disabled={flats.length === 1}
                        >
                            <option value="">Select Flat</option>
                            {flats.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.flat_number} {f.floor !== undefined && f.floor !== null ? `(Floor ${f.floor})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Resident</label>
                        <select
                            value={formData.userId}
                            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
                            required
                            disabled={residents.length === 1}
                        >
                            <option value="">Select Resident</option>
                            {residents.map(r => (
                                <option key={r.uid} value={r.uid}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                        value={formData.vType}
                        onChange={(e) => setFormData({ ...formData, vType: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                    >
                        <option value="car">Car</option>
                        <option value="bike">Bike</option>
                        <option value="scooter">Scooter</option>
                        <option value="cycle">Cycle</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                {userRole === 'admin' && (
                    <Input
                        label="Parking Slot"
                        placeholder="P-102"
                        value={formData.parkingSlot}
                        onChange={(e) => setFormData({ ...formData, parkingSlot: e.target.value })}
                    />
                )}
                {userRole !== 'admin' && formData.parkingSlot && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Parking Slot</label>
                        <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 border">
                            {formData.parkingSlot}
                        </div>
                    </div>
                )}


                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" className="flex-1">Save Vehicle</Button>
                </div>
            </form>
        </Modal>
    );
};
