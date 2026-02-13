import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/common';
import { User } from '@/types';
import { supabase } from '@/config/supabase';
import toast from 'react-hot-toast';

interface EditTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenant: User | null;
}

export const EditTenantModal: React.FC<EditTenantModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    tenant
}) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        moveInDate: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (tenant) {
            setFormData({
                name: tenant.name || '',
                phone: tenant.phone || '',
                moveInDate: tenant.moveInDate || '',
                emergencyContactName: tenant.emergencyContact?.name || '',
                emergencyContactPhone: tenant.emergencyContact?.phone || '',
                emergencyContactRelation: tenant.emergencyContact?.relation || ''
            });
        }
    }, [tenant]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant) return;

        setLoading(true);

        try {
            const emergencyContact = formData.emergencyContactName ? {
                name: formData.emergencyContactName,
                phone: formData.emergencyContactPhone,
                relation: formData.emergencyContactRelation
            } : null;

            const { error } = await supabase
                .from('users')
                .update({
                    name: formData.name,
                    phone: formData.phone,
                    move_in_date: formData.moveInDate || null,
                    emergency_contact: emergencyContact
                })
                .eq('uid', tenant.uid);

            if (error) throw error;

            toast.success('Tenant updated successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error updating tenant:', error);
            toast.error(error.message || 'Failed to update tenant');
        } finally {
            setLoading(false);
        }
    };

    if (!tenant) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Tenant Details">
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={tenant.email}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    <Input
                        label="Phone Number"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                    />

                    <Input
                        label="Move-in Date"
                        type="date"
                        value={formData.moveInDate}
                        onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                    />
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">Emergency Contact</h3>

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
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
