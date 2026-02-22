import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/common';
import { SocietyService } from '@/services/supabase.service';
import { User, Flat } from '@/types';
import toast from 'react-hot-toast';
import { supabase } from '@/config/supabase';

interface AssignOccupantsModalProps {
    isOpen: boolean;
    onClose: () => void;
    unit: Flat;
    societyId: string;
    onSuccess: () => void;
}

export const AssignOccupantsModal: React.FC<AssignOccupantsModalProps> = ({ isOpen, onClose, unit, societyId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [fetchingUsers, setFetchingUsers] = useState(true);

    const [availableOwners, setAvailableOwners] = useState<User[]>([]);
    const [availableTenants, setAvailableTenants] = useState<User[]>([]);

    const [selectedOwnerId, setSelectedOwnerId] = useState<string>(unit.ownerId || '');
    const [selectedTenantId, setSelectedTenantId] = useState<string>(unit.currentTenantId || '');
    const [ownerLivesHere, setOwnerLivesHere] = useState<boolean>(unit.occupancyStatus === 'owner-occupied');

    useEffect(() => {
        if (isOpen) {
            loadUsers();
            // Reset state based on incoming unit whenever opened
            setSelectedOwnerId(unit.ownerId || '');
            setSelectedTenantId(unit.currentTenantId || '');
            setOwnerLivesHere(unit.occupancyStatus === 'owner-occupied');
        }
    }, [isOpen, unit]);

    const loadUsers = async () => {
        setFetchingUsers(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('society_id', societyId)
                .in('role', ['owner', 'tenant']);

            if (error) throw error;

            const users = data as any[];
            setAvailableOwners(users.filter(u => u.role === 'owner'));
            setAvailableTenants(users.filter(u => u.role === 'tenant'));
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error('Failed to load users for assignment');
        } finally {
            setFetchingUsers(false);
        }
    };

    const handleSave = async () => {
        if (!selectedOwnerId) {
            return toast.error('An Owner must be assigned to the unit');
        }

        const newOccupancyStatus = ownerLivesHere ? 'owner-occupied' : (selectedTenantId ? 'rented' : 'vacant');
        const finalTenantId = ownerLivesHere ? null : (selectedTenantId || null);

        setLoading(true);
        try {
            // 1. Update the Unit itself
            const unitUpdate = {
                owner_id: selectedOwnerId,
                current_tenant_id: finalTenantId,
                occupancy_status: newOccupancyStatus,
                updated_at: new Date().toISOString()
            };

            const { error: unitError } = await supabase
                .from('flats')
                .update(unitUpdate)
                .eq('id', unit.id);

            if (unitError) throw unitError;

            // 2. We should ideally update the User records to append this unit.id to their flat_ids array. 
            // In a robust system, this would be a trigger or a more complex transaction.
            // For now, we rely on the unit record as the ultimate source of truth, but we can do a best-effort update:

            // Add unit to new owner
            if (selectedOwnerId !== unit.ownerId) {
                await SocietyService.assignFlatToUser(selectedOwnerId, unit.id);
            }

            // Add unit to new tenant
            if (finalTenantId && finalTenantId !== unit.currentTenantId) {
                await SocietyService.assignFlatToUser(finalTenantId, unit.id);
            }

            toast.success('Occupants assigned successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to map occupants');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Assign Occupants - Unit ${unit.flatNumber}`}>
            <div className="space-y-6">

                {fetchingUsers ? (
                    <div className="py-8 text-center text-gray-500">Loading society members...</div>
                ) : (
                    <>
                        {/* Owner Section */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-3">1. Owner Assignment (Mandatory)</h3>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                value={selectedOwnerId}
                                onChange={(e) => setSelectedOwnerId(e.target.value)}
                            >
                                <option value="">Select an Owner...</option>
                                {availableOwners.map(owner => (
                                    <option key={owner.uid} value={owner.uid}>
                                        {owner.name} ({owner.email})
                                    </option>
                                ))}
                            </select>

                            {selectedOwnerId && (
                                <div className="mt-4 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="ownerLivesHere"
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        checked={ownerLivesHere}
                                        onChange={(e) => {
                                            setOwnerLivesHere(e.target.checked);
                                            if (e.target.checked) setSelectedTenantId(''); // Clear tenant if owner moves in
                                        }}
                                    />
                                    <label htmlFor="ownerLivesHere" className="text-sm font-medium text-gray-700 cursor-pointer">
                                        The Owner currently lives in this unit
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Tenant Section */}
                        <div className={`p-4 rounded-lg border transition-opacity ${ownerLivesHere || !selectedOwnerId ? 'opacity-50 bg-gray-100 border-gray-100 ptr-events-none' : 'bg-white border-primary-200'}`}>
                            <h3 className="font-semibold text-gray-900 mb-3">2. Tenant Assignment</h3>
                            <p className="text-xs text-gray-500 mb-3">
                                {ownerLivesHere
                                    ? "Tenants cannot be assigned because the owner lives here."
                                    : "Select a tenant who currently occupies this unit."}
                            </p>

                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                value={selectedTenantId}
                                onChange={(e) => setSelectedTenantId(e.target.value)}
                                disabled={ownerLivesHere || !selectedOwnerId}
                            >
                                <option value="">Select a Tenant (Optional)...</option>
                                {availableTenants.map(tenant => (
                                    <option key={tenant.uid} value={tenant.uid}>
                                        {tenant.name} ({tenant.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} loading={loading} disabled={fetchingUsers}>
                        Save Assignments
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
