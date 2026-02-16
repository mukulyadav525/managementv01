import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { Modal, Button, Input } from '@/components/common';
import { ServiceRequest, Flat, ServiceCategory } from '@/types';
import { SocietyService, ServiceRequestService } from '@/services/supabase.service';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface ServiceRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    request?: ServiceRequest;
}

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    request
}) => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [flats, setFlats] = useState<Flat[]>([]);
    const [buildings, setBuildings] = useState<any[]>([]);
    const [selectedBuilding, setSelectedBuilding] = useState<string>('');
    const [selectedFloor, setSelectedFloor] = useState<string>('');

    const [formData, setFormData] = useState({
        title: '',
        category: 'plumbing' as ServiceCategory,
        description: '',
        flatId: '',
        preferredTime: '',
        requesterId: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, request, user]);

    useEffect(() => {
        if (request && flats.length > 0) {
            const currentFlat = flats.find(f => f.id === request.flatId);
            if (currentFlat) {
                setSelectedBuilding(currentFlat.buildingId || '');
                setSelectedFloor(currentFlat.floor?.toString() || '');
                setFormData(prev => ({ ...prev, flatId: request.flatId }));
            }
        }
    }, [request, flats]);

    const loadData = async () => {
        if (!user?.societyId) return;
        try {
            const [flatsData, buildingsData] = await Promise.all([
                SocietyService.getFlats(user.societyId),
                SocietyService.getBuildings(user.societyId)
            ]);
            setFlats(flatsData as Flat[]);
            setBuildings(buildingsData);

            if (request) {
                setFormData({
                    title: request.title,
                    category: request.category,
                    description: request.description || '',
                    flatId: request.flatId,
                    preferredTime: request.preferredTime || '',
                    requesterId: request.requesterId
                });
            } else {
                setFormData({
                    title: '',
                    category: 'plumbing',
                    description: '',
                    flatId: '',
                    preferredTime: '',
                    requesterId: user?.uid || ''
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const floors = selectedBuilding
        ? Array.from(new Set(flats.filter(f => f.buildingId === selectedBuilding).map(f => f.floor))).sort((a, b) => a - b)
        : [];

    const filteredFlats = selectedBuilding && selectedFloor
        ? flats.filter(f => f.buildingId === selectedBuilding && f.floor?.toString() === selectedFloor)
        : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.societyId) return;

        if (!formData.title || !formData.category || !formData.flatId) {
            return toast.error('Please fill in all required fields');
        }

        setLoading(true);
        try {
            if (request) {
                await ServiceRequestService.updateRequest(request.id, formData);
                toast.success('Request updated successfully');
            } else {
                await ServiceRequestService.createRequest(user.societyId, {
                    ...formData,
                    status: 'pending'
                });
                toast.success('Service request raised successfully');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={request ? 'Edit Service Request' : 'Raise Service Request'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Title / Short Issue Description *"
                    placeholder="e.g. Kitchen tap leaking"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Category *</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as ServiceCategory })}
                            required
                        >
                            <option value="plumbing">Plumbing</option>
                            <option value="electrical">Electrical</option>
                            <option value="cleaning">Cleaning</option>
                            <option value="carpentry">Carpentry</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Building *</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            value={selectedBuilding}
                            onChange={(e) => {
                                setSelectedBuilding(e.target.value);
                                setSelectedFloor('');
                                setFormData({ ...formData, flatId: '' });
                            }}
                            required
                        >
                            <option value="">Select Building...</option>
                            {buildings.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Floor *</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            value={selectedFloor}
                            onChange={(e) => {
                                setSelectedFloor(e.target.value);
                                setFormData({ ...formData, flatId: '' });
                            }}
                            disabled={!selectedBuilding}
                            required
                        >
                            <option value="">Select Floor...</option>
                            {floors.map(f => (
                                <option key={f} value={f?.toString()}>{f === 0 ? 'Ground' : `Floor ${f}`}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Flat *</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            value={formData.flatId}
                            onChange={(e) => setFormData({ ...formData, flatId: e.target.value })}
                            disabled={!selectedFloor}
                            required
                        >
                            <option value="">Select Flat...</option>
                            {filteredFlats.map((f) => (
                                <option key={f.id} value={f.id}>Flat {f.flatNumber}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        rows={3}
                        placeholder="Detailed explanation of the issue..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <Input
                    label="Preferred Time for Service"
                    placeholder="e.g. Tomorrow morning around 10 AM"
                    value={formData.preferredTime}
                    onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                />

                <div className="bg-blue-50 p-4 rounded-lg flex gap-3">
                    <Info className="text-blue-600 shrink-0" size={20} />
                    <p className="text-sm text-blue-700">
                        Raising a request will notify the society office and maintenance staff.
                    </p>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={loading}>
                        {request ? 'Update Request' : 'Submit Request'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
