import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { Modal, Button, Input, ResidenceSelector } from '@/components/common';
import { Pet } from '@/types';
import { PetService } from '@/services/supabase.service';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface PetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    pet?: Pet;
}

export const PetModal: React.FC<PetModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    pet
}) => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        type: 'Dog',
        breed: '',
        flatId: '',
        vaccinationStatus: 'pending' as any,
        vaccinationDate: '',
        ownerId: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (pet) {
                setFormData({
                    name: pet.name,
                    type: pet.type,
                    breed: pet.breed || '',
                    flatId: pet.flatId,
                    vaccinationStatus: pet.vaccinationStatus,
                    vaccinationDate: pet.vaccinationDate || '',
                    ownerId: pet.ownerId
                });
            } else {
                setFormData({
                    name: '',
                    type: 'Dog',
                    breed: '',
                    flatId: '',
                    vaccinationStatus: 'pending',
                    vaccinationDate: '',
                    ownerId: user?.uid || ''
                });
            }
        }
    }, [isOpen, pet, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.societyId) return;

        if (!formData.name || !formData.type || !formData.flatId) {
            return toast.error('Please fill in all required fields');
        }

        setLoading(true);
        try {
            if (pet) {
                await PetService.updatePet(pet.id, formData);
                toast.success('Pet updated successfully');
            } else {
                await PetService.createPet(user.societyId, formData);
                toast.success('Pet registered successfully');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save pet');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={pet ? 'Edit Pet' : 'Register New Pet'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Pet Name *"
                        placeholder="e.g. Buddy"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Pet Type *</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            required
                        >
                            <option value="Dog">Dog</option>
                            <option value="Cat">Cat</option>
                            <option value="Bird">Bird</option>
                            <option value="Rabbit">Rabbit</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <Input
                        label="Breed / Description"
                        placeholder="e.g. Golden Retriever"
                        value={formData.breed}
                        onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    />
                </div>

                {/* Standardized Residence Selector */}
                <ResidenceSelector
                    initialFlatId={formData.flatId}
                    onSelect={(flatId, flat) => {
                        setFormData({
                            ...formData,
                            flatId: flatId,
                            ownerId: flat?.ownerId || user?.uid || ''
                        });
                    }}
                    showResidentInfo={true}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Vaccination Status</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            value={formData.vaccinationStatus}
                            onChange={(e) => setFormData({ ...formData, vaccinationStatus: e.target.value as any })}
                        >
                            <option value="pending">Pending</option>
                            <option value="vaccinated">Vaccinated</option>
                        </select>
                    </div>
                    <Input
                        label="Last Vaccination Date"
                        type="date"
                        value={formData.vaccinationDate}
                        onChange={(e) => setFormData({ ...formData, vaccinationDate: e.target.value })}
                    />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg flex gap-3">
                    <Info className="text-blue-600 shrink-0" size={20} />
                    <p className="text-sm text-blue-700">
                        Registering your pet helps the society maintain safety and support for pet owners.
                    </p>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={loading}>
                        {pet ? 'Update Pet' : 'Register Pet'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
