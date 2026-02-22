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
    societyType?: 'tower' | 'house';
}

export const AssignOccupantsModal: React.FC<AssignOccupantsModalProps> = ({ isOpen, onClose, unit, societyId, onSuccess, societyType }) => {
    const isHouse = societyType === 'house';
    const totalFloors = unit.totalFloors || 1;

    const [loading, setLoading] = useState(false);
    const [fetchingUsers, setFetchingUsers] = useState(true);

    const [availableOwners, setAvailableOwners] = useState<User[]>([]);
    const [availableTenants, setAvailableTenants] = useState<User[]>([]);

    const [selectedOwnerId, setSelectedOwnerId] = useState<string>(unit.ownerId || '');
    const [selectedTenantId, setSelectedTenantId] = useState<string>(unit.tenantId || '');
    const [ownerLivesHere, setOwnerLivesHere] = useState<boolean>(unit.occupancyStatus === 'owner-occupied' || unit.ownerLivesInHouse === true);

    // House specific states
    const [ownerFloorNumber, setOwnerFloorNumber] = useState<number>(unit.ownerFloorNumber || 1);
    const [tenantsByFloor, setTenantsByFloor] = useState<Record<string, string>>(unit.tenantsByFloor || {});

    useEffect(() => {
        if (isOpen) {
            loadUsers();
            // Reset state based on incoming unit whenever opened
            setSelectedOwnerId(unit.ownerId || '');
            setSelectedTenantId(unit.tenantId || '');
            setOwnerLivesHere(unit.occupancyStatus === 'owner-occupied' || unit.ownerLivesInHouse === true);
            setOwnerFloorNumber(unit.ownerFloorNumber || 1);
            setTenantsByFloor(unit.tenantsByFloor || {});
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

        if (isHouse && ownerLivesHere && (!ownerFloorNumber || ownerFloorNumber < 1 || ownerFloorNumber > totalFloors)) {
            return toast.error(`Owner floor must be between 1 and ${totalFloors}`);
        }

        // Validate that owner floor does not have a tenant
        if (isHouse && ownerLivesHere && tenantsByFloor[ownerFloorNumber.toString()]) {
            return toast.error(`A tenant is assigned to floor ${ownerFloorNumber}, where the owner lives. Please remove the tenant first.`);
        }

        const newOccupancyStatus = ownerLivesHere ? 'owner-occupied' : (isHouse && Object.keys(tenantsByFloor).length > 0 ? 'rented' : (selectedTenantId ? 'rented' : 'vacant'));
        const finalTenantId = isHouse ? null : (ownerLivesHere ? null : (selectedTenantId || null)); // For towers

        setLoading(true);
        try {
            // 1. Update the Unit itself
            const unitUpdate: any = {
                owner_id: selectedOwnerId,
                occupancy_status: newOccupancyStatus,
                updated_at: new Date().toISOString()
            };

            if (isHouse) {
                unitUpdate.owner_lives_in_house = ownerLivesHere;
                unitUpdate.owner_floor_number = ownerLivesHere ? ownerFloorNumber : null;
                // If owner moves in, delete the tenant on their floor before saving
                const safeTenants = { ...tenantsByFloor };
                if (ownerLivesHere) {
                    delete safeTenants[ownerFloorNumber.toString()];
                }
                unitUpdate.tenants_by_floor = safeTenants;
                // For house type, use the first tenant from the floor map
                unitUpdate.tenant_id = Object.values(safeTenants)[0] || null;
            } else {
                unitUpdate.tenant_id = finalTenantId;
            }

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
            if (finalTenantId && finalTenantId !== unit.tenantId) {
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
                                <div className="mt-4 flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="ownerLivesHere"
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            checked={ownerLivesHere}
                                            onChange={(e) => {
                                                setOwnerLivesHere(e.target.checked);
                                                if (e.target.checked && !isHouse) setSelectedTenantId(''); // Clear tower tenant
                                                if (e.target.checked && isHouse) {
                                                    const newTenants = { ...tenantsByFloor };
                                                    delete newTenants[ownerFloorNumber.toString()];
                                                    setTenantsByFloor(newTenants);
                                                }
                                            }}
                                        />
                                        <label htmlFor="ownerLivesHere" className="text-sm font-medium text-gray-700 cursor-pointer">
                                            The Owner currently lives in this unit
                                        </label>
                                    </div>

                                    {ownerLivesHere && isHouse && (
                                        <div className="ml-6 flex items-center gap-3">
                                            <span className="text-sm text-gray-600">Owner's Floor:</span>
                                            <select
                                                className="px-3 py-1 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                                value={ownerFloorNumber}
                                                onChange={(e) => {
                                                    const newFloor = parseInt(e.target.value);
                                                    setOwnerFloorNumber(newFloor);
                                                    // Protect owner floor by overriding any tenant
                                                    const newTenants = { ...tenantsByFloor };
                                                    delete newTenants[newFloor.toString()];
                                                    setTenantsByFloor(newTenants);
                                                }}
                                            >
                                                {Array.from({ length: totalFloors }, (_, i) => i + 1).map(floor => (
                                                    <option key={floor} value={floor}>Floor {floor}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Tenant Section */}
                        <div className={`p-4 rounded-lg border transition-opacity ${(!isHouse && ownerLivesHere) || !selectedOwnerId ? 'opacity-50 bg-gray-100 border-gray-100' : 'bg-white border-primary-200'}`}>
                            <h3 className="font-semibold text-gray-900 mb-3">2. Tenant Assignment</h3>
                            <p className="text-xs text-gray-500 mb-3">
                                {isHouse
                                    ? "Assign tenants to specific floors. The owner's floor cannot be assigned."
                                    : (ownerLivesHere
                                        ? "Tenants cannot be assigned because the owner lives here."
                                        : "Select a tenant who currently occupies this unit.")}
                            </p>

                            {!isHouse ? (
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
                            ) : (
                                <div className="space-y-3 mt-4">
                                    {Array.from({ length: totalFloors }, (_, i) => i + 1).map(floor => {
                                        const isOwnerFloor = ownerLivesHere && ownerFloorNumber === floor;

                                        return (
                                            <div key={floor} className="flex items-center gap-3">
                                                <span className="w-16 text-sm font-medium text-gray-700">Floor {floor}:</span>
                                                <select
                                                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-400"
                                                    value={tenantsByFloor[floor.toString()] || ''}
                                                    disabled={isOwnerFloor || !selectedOwnerId}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setTenantsByFloor(prev => {
                                                            const next = { ...prev };
                                                            if (!val) delete next[floor.toString()];
                                                            else next[floor.toString()] = val;
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    <option value="">{isOwnerFloor ? "Occupied by Owner" : "Vacant"}</option>
                                                    {availableTenants.map(tenant => (
                                                        <option key={tenant.uid} value={tenant.uid}>
                                                            {tenant.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
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
