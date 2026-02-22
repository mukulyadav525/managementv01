import React, { useState, useEffect } from 'react';
import { SocietyService, UserService } from '@/services/supabase.service';
import { Flat, Building } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { predictFloor, formatFlatName } from '@/utils/flat.utils';

interface ResidenceSelectorProps {
    onSelect: (flatId: string, flat?: Flat, floor?: number) => void;
    initialFlatId?: string;
    required?: boolean;
    className?: string;
    label?: string;
    showResidentInfo?: boolean;
    restrictedToUserFlats?: boolean;
}

export const ResidenceSelector: React.FC<ResidenceSelectorProps> = ({
    onSelect,
    initialFlatId,
    required = true,
    className = "",
    showResidentInfo = false,
    restrictedToUserFlats = false
}) => {
    const { user } = useAuthStore();
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [allFlats, setAllFlats] = useState<Flat[]>([]);
    const [residents, setResidents] = useState<any[]>([]);
    const [selectedBuilding, setSelectedBuilding] = useState<string>('');
    const [selectedFlatId, setSelectedFlatId] = useState<string>(initialFlatId || '');
    const [selectedFloor, setSelectedFloor] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user?.societyId) {
            loadData();
        }
    }, [user?.societyId]);

    useEffect(() => {
        if (initialFlatId && allFlats.length > 0) {
            const flat = allFlats.find(f => f.id === initialFlatId);
            if (flat) {
                setSelectedBuilding(flat.buildingId);
                setSelectedFlatId(flat.id);
                setSelectedFloor(flat.floor);
            }
        }
    }, [initialFlatId, allFlats]);

    const loadData = async () => {
        if (!user?.societyId) return;
        setLoading(true);
        try {
            const [buildingsData, flatsData, usersData] = await Promise.all([
                SocietyService.getBuildings(user.societyId),
                SocietyService.getFlats(user.societyId),
                UserService.getUsers(user.societyId)
            ]);

            setBuildings(buildingsData as Building[]);
            setResidents(usersData as any[]);

            let filteredFlats = flatsData as Flat[];
            if (restrictedToUserFlats && user.role !== 'admin' && user.role !== 'staff' && user.role !== 'security') {
                filteredFlats = filteredFlats.filter(f =>
                    f.ownerId === user.uid ||
                    (user.flatIds && user.flatIds.includes(f.id))
                );
            }
            setAllFlats(filteredFlats);
        } catch (error) {
            console.error('Error loading residence data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuildingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedBuilding(val);
        setSelectedFlatId('');
        setSelectedFloor('');
        onSelect('', undefined, undefined);
    };

    const handleFlatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedFlatId(val);
        const flat = allFlats.find(f => f.id === val);
        if (flat) {
            const floor = flat.floor || predictFloor(flat.flatNumber);
            setSelectedFloor(floor);
            onSelect(val, flat, floor);
        } else {
            setSelectedFloor('');
            onSelect(val, undefined, undefined);
        }
    };

    const handleFloorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value ? parseInt(e.target.value) : '';
        setSelectedFloor(val);
        const flat = allFlats.find(f => f.id === selectedFlatId);
        onSelect(selectedFlatId, flat, val === '' ? undefined : val);
    };

    const filteredFlatsByBuilding = selectedBuilding
        ? allFlats.filter(f => f.buildingId === selectedBuilding)
        : [];

    const currentBuilding = buildings.find(b => b.id === selectedBuilding);
    const maxFloors = currentBuilding?.totalFloors || 0;
    const floorOptions = Array.from({ length: maxFloors }, (_, i) => i + 1);

    if (loading) return <div className="text-xs text-gray-400 animate-pulse">Loading residence options...</div>;

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Building Name */}
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Building {required && '*'}</label>
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                        value={selectedBuilding}
                        onChange={handleBuildingChange}
                        required={required}
                    >
                        <option value="">Select Building...</option>
                        {buildings.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                {/* 2. Flat No */}
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Flat No {required && '*'}</label>
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
                        value={selectedFlatId}
                        onChange={handleFlatChange}
                        disabled={!selectedBuilding}
                        required={required}
                    >
                        <option value="">Select Flat...</option>
                        {filteredFlatsByBuilding.map(f => (
                            <option key={f.id} value={f.id}>
                                {formatFlatName(f.flatNumber, currentBuilding?.name)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 3. Floor Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Floor {required && '*'}</label>
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
                        value={selectedFloor}
                        onChange={handleFloorChange}
                        disabled={!selectedFlatId}
                        required={required}
                    >
                        <option value="">Select Floor...</option>
                        {floorOptions.map(floor => (
                            <option key={floor} value={floor}>Floor {floor}</option>
                        ))}
                    </select>
                </div>
                {showResidentInfo && selectedFlatId && (() => {
                    const flat = allFlats.find(f => f.id === selectedFlatId);
                    const owner = flat?.ownerId ? residents.find(r => r.uid === flat.ownerId) : null;
                    const tenant = flat?.tenantId ? residents.find(r => r.uid === flat.tenantId) : null;
                    const names: string[] = [];
                    if (owner) names.push(`${owner.name} (Owner)`);
                    if (tenant) names.push(`${tenant.name} (Tenant)`);
                    const display = names.length > 0 ? names.join(', ') : 'No resident assigned';
                    return (
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Resident</label>
                            <div className={`px-3 py-2 rounded-md text-xs italic border ${names.length > 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                {display}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

