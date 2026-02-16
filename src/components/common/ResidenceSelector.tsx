import React, { useState, useEffect } from 'react';
import { SocietyService } from '@/services/supabase.service';
import { Flat, Building } from '@/types';
import { useAuthStore } from '@/stores/authStore';

interface ResidenceSelectorProps {
    onSelect: (flatId: string, flat?: Flat) => void;
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
    const [selectedBuilding, setSelectedBuilding] = useState<string>('');
    const [selectedFlatId, setSelectedFlatId] = useState<string>(initialFlatId || '');
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
            }
        }
    }, [initialFlatId, allFlats]);

    const loadData = async () => {
        if (!user?.societyId) return;
        setLoading(true);
        try {
            const [buildingsData, flatsData] = await Promise.all([
                SocietyService.getBuildings(user.societyId),
                SocietyService.getFlats(user.societyId)
            ]);

            setBuildings(buildingsData as Building[]);

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
        onSelect('');
    };

    const handleFlatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedFlatId(val);
        const flat = allFlats.find(f => f.id === val);
        onSelect(val, flat);
    };

    const filteredFlatsByBuilding = selectedBuilding
        ? allFlats.filter(f => f.buildingId === selectedBuilding)
        : [];

    const currentFlat = allFlats.find(f => f.id === selectedFlatId);

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
                            <option key={f.id} value={f.id}>{f.flatNumber}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 3. Floor No - Purely Informational/Auto-filled */}
            {selectedFlatId && currentFlat && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Floor</label>
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
                            {currentFlat.floor === 0 ? 'Ground Floor' : `Floor ${currentFlat.floor}`}
                        </div>
                    </div>
                    {showResidentInfo && (
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Resident</label>
                            <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-700 italic">
                                {currentFlat.ownerId === user?.uid ? 'You (Owner)' : 'Assigned Resident'}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
