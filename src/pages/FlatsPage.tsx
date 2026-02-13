import React, { useEffect, useState } from 'react';
import { Plus, Building, Edit2, Trash2, Home } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Modal, Input } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { SocietyService, toSnake } from '@/services/supabase.service';
import { Flat } from '@/types';
import { supabase } from '@/config/supabase';
import toast from 'react-hot-toast';

export const FlatsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [flats, setFlats] = useState<Flat[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingFlat, setEditingFlat] = useState<Flat | null>(null);

    useEffect(() => {
        if (user?.societyId) {
            loadFlats();
        }
    }, [user]);

    const loadFlats = async () => {
        if (!user?.societyId) return;
        try {
            setLoading(true);
            console.log('FlatsPage: Loading flats for societyId:', user.societyId);
            const data = await SocietyService.getFlats(user.societyId);
            console.log('FlatsPage: Fetched flats:', data.length);
            setFlats(data as Flat[]);
        } catch (error) {
            toast.error('Failed to load flats');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveFlat = async (formData: any) => {
        if (!user?.societyId) return;

        try {
            const flatData = {
                ...formData,
                societyId: user.societyId,
                updatedAt: new Date().toISOString()
            };

            if (editingFlat) {
                const { error } = await supabase
                    .from('flats')
                    .update(toSnake(flatData))
                    .eq('id', editingFlat.id);
                if (error) throw error;
                toast.success('Flat updated successfully');
            } else {
                const { error } = await supabase
                    .from('flats')
                    .insert([toSnake({
                        ...flatData,
                        id: crypto.randomUUID(),
                        createdAt: new Date().toISOString()
                    })]);
                if (error) throw error;
                toast.success('Flat added successfully');
            }
            setShowModal(false);
            setEditingFlat(null);
            loadFlats();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save flat');
        }
    };

    const handleDeleteFlat = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this flat?')) return;

        try {
            const { error } = await supabase.from('flats').delete().eq('id', id);
            if (error) throw error;
            toast.success('Flat deleted');
            loadFlats();
        } catch (error) {
            toast.error('Failed to delete flat');
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Flat Management</h1>
                        <p className="text-gray-600 mt-1">Manage all properties in the society</p>
                    </div>
                    {user?.role === 'admin' && (
                        <Button onClick={() => { setEditingFlat(null); setShowModal(true); }}>
                            <Plus size={20} className="mr-2" />
                            Add Flat
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <Building size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Flats</p>
                            <p className="text-2xl font-bold">{flats.length}</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                            <Home size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Occupied</p>
                            <p className="text-2xl font-bold">
                                {flats.filter(f => f.occupancyStatus !== 'vacant').length}
                            </p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                            <Home size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Vacant</p>
                            <p className="text-2xl font-bold">
                                {flats.filter(f => f.occupancyStatus === 'vacant').length}
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
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Flat No</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Floor</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {flats.map((flat) => (
                                        <tr key={flat.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium">{flat.flatNumber}</td>
                                            <td className="px-6 py-4">{flat.bhkType}</td>
                                            <td className="px-6 py-4">{flat.floor}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${flat.occupancyStatus === 'vacant' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {flat.occupancyStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 space-x-2">
                                                <button onClick={() => { setEditingFlat(flat); setShowModal(true); }} className="text-blue-600 hover:text-blue-800">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteFlat(flat.id)} className="text-red-600 hover:text-red-800">
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
                    <FlatModal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        onSubmit={handleSaveFlat}
                        initialData={editingFlat}
                    />
                )}
            </div>
        </Layout>
    );
};

const FlatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: Flat | null;
}> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [formData, setFormData] = useState({
        flatNumber: initialData?.flatNumber || '',
        floor: initialData?.floor ?? 1,
        bhkType: initialData?.bhkType || '2BHK',
        area: initialData?.area || 1200,
        occupancyStatus: (initialData?.occupancyStatus || 'vacant') as any
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Flat' : 'Add New Flat'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Flat Number"
                    value={formData.flatNumber}
                    onChange={(e) => setFormData({ ...formData, flatNumber: e.target.value })}
                    required
                />
                <Input
                    label="Floor"
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                    required
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">BHK Type</label>
                    <select
                        value={formData.bhkType}
                        onChange={(e) => setFormData({ ...formData, bhkType: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                    >
                        <option value="1BHK">1 BHK</option>
                        <option value="2BHK">2 BHK</option>
                        <option value="3BHK">3 BHK</option>
                        <option value="4BHK">4 BHK</option>
                    </select>
                </div>
                <Input
                    label="Area (sq ft)"
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: parseInt(e.target.value) })}
                    required
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                        value={formData.occupancyStatus}
                        onChange={(e) => setFormData({ ...formData, occupancyStatus: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                    >
                        <option value="vacant">Vacant</option>
                        <option value="owner-occupied">Owner Occupied</option>
                        <option value="tenant-occupied">Tenant Occupied</option>
                    </select>
                </div>
                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" className="flex-1">Save Flat</Button>
                </div>
            </form>
        </Modal>
    );
};
