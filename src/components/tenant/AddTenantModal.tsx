import React, { useState } from 'react';
import { Modal, Button, Input } from '@/components/common';
import { Flat } from '@/types';
import { supabase } from '@/config/supabase';
import toast from 'react-hot-toast';

interface AddTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    ownedFlats: Flat[];
    societyId: string;
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    ownedFlats,
    societyId
}) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        flatId: '',
        moveInDate: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    emailRedirectTo: undefined,
                    data: {
                        name: formData.name,
                        role: 'tenant'
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Failed to create user');

            // 2. Create user record in users table
            const emergencyContact = formData.emergencyContactName ? {
                name: formData.emergencyContactName,
                phone: formData.emergencyContactPhone,
                relation: formData.emergencyContactRelation
            } : null;

            const userData = {
                uid: authData.user.id,
                email: formData.email,
                name: formData.name,
                phone: formData.phone,
                role: 'tenant',
                society_id: societyId,
                flat_ids: [formData.flatId],
                move_in_date: formData.moveInDate || null,
                emergency_contact: emergencyContact,
                status: 'active'
            };

            const { error: userError } = await supabase
                .from('users')
                .insert([userData]);

            if (userError) throw userError;

            // 3. Update flat occupancy status
            const { error: flatError } = await supabase
                .from('flats')
                .update({
                    occupancy_status: 'rented',
                    tenant_id: authData.user.id
                })
                .eq('id', formData.flatId);

            if (flatError) throw flatError;

            toast.success('Tenant added successfully!');
            onSuccess();
            onClose();
            resetForm();
        } catch (error: any) {
            console.error('Error adding tenant:', error);
            toast.error(error.message || 'Failed to add tenant');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            password: '',
            flatId: '',
            moveInDate: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            emergencyContactRelation: ''
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Tenant">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">Basic Information</h3>

                    <Input
                        label="Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        placeholder="Set password for tenant"
                    />

                    <Input
                        label="Phone Number"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Flat <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={formData.flatId}
                            onChange={(e) => setFormData({ ...formData, flatId: e.target.value })}
                            required
                        >
                            <option value="">Choose a flat</option>
                            {ownedFlats.filter(f => f.occupancyStatus === 'vacant' || f.occupancyStatus === 'owner-occupied').map((flat) => (
                                <option key={flat.id} value={flat.id}>
                                    Flat {flat.flatNumber} - {flat.bhkType} (Floor {flat.floor})
                                </option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Move-in Date"
                        type="date"
                        value={formData.moveInDate}
                        onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                    />
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">Emergency Contact (Optional)</h3>

                    <Input
                        label="Contact Name"
                        value={formData.emergencyContactName}
                        onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    />

                    <Input
                        label="Contact Phone"
                        type="tel"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    />

                    <Input
                        label="Relation"
                        value={formData.emergencyContactRelation}
                        onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                        placeholder="e.g., Father, Mother, Spouse"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1"
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1"
                        disabled={loading}
                    >
                        {loading ? 'Adding...' : 'Add Tenant'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
