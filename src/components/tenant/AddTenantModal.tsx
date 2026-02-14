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
    const [selectedFloor, setSelectedFloor] = useState<string>('');

    // derived state for filtering
    const uniqueFloors = Array.from(new Set(ownedFlats.map(f => f.floor))).sort((a, b) => a - b);

    const filteredFlats = ownedFlats.filter(f => {
        const isVacantOrOwner = f.occupancyStatus === 'vacant' || f.occupancyStatus === 'owner-occupied';
        const matchesFloor = selectedFloor ? f.floor.toString() === selectedFloor : true;
        return isVacantOrOwner && matchesFloor;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Check if user already exists
            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('email', formData.email)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            let userId = '';

            if (existingUser) {
                // User exists - update their record
                userId = existingUser.uid;

                // If they are not a tenant, we might want to warn or just proceed. 
                // For now, we update them to be part of this society and flat.

                const currentFlatIds = existingUser.flat_ids || [];
                const newFlatIds = [...new Set([...currentFlatIds, formData.flatId])];

                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        society_id: societyId,
                        flat_ids: newFlatIds,
                        status: 'active'
                    })
                    .eq('uid', userId);

                if (updateError) throw updateError;
                toast.success('Existing tenant linked to flat!');
            } else {
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
                userId = authData.user.id;

                // 2. Create user record in users table
                const emergencyContact = formData.emergencyContactName ? {
                    name: formData.emergencyContactName,
                    phone: formData.emergencyContactPhone,
                    relation: formData.emergencyContactRelation
                } : null;

                const userData = {
                    uid: userId,
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
                toast.success('New tenant added successfully!');
            }

            // 3. Update flat occupancy status (for both new and existing)
            const { error: flatError } = await supabase
                .from('flats')
                .update({
                    occupancy_status: 'rented',
                    tenant_id: userId
                })
                .eq('id', formData.flatId);

            if (flatError) throw flatError;

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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Filter by Floor
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={selectedFloor}
                                onChange={(e) => setSelectedFloor(e.target.value)}
                            >
                                <option value="">All Floors</option>
                                {uniqueFloors.map((floor) => (
                                    <option key={floor} value={floor}>
                                        Floor {floor}
                                    </option>
                                ))}
                            </select>
                        </div>
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
                                {filteredFlats.map((flat) => (
                                    <option key={flat.id} value={flat.id}>
                                        Flat {flat.flatNumber} - {flat.bhkType} (Floor {flat.floor})
                                    </option>
                                ))}
                            </select>
                        </div>
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
