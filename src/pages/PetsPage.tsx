import React, { useEffect, useState } from 'react';
import { PawPrint, Plus, Search, Edit2, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, StatsCard } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { PetService, SocietyService } from '@/services/supabase.service';
import { Pet, Flat } from '@/types';
import { PetModal } from '@/components/pets/PetModal';
import toast from 'react-hot-toast';

export const PetsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [pets, setPets] = useState<Pet[]>([]);
    const [flats, setFlats] = useState<Flat[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPet, setSelectedPet] = useState<Pet | undefined>();

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user?.societyId) return;
        try {
            setLoading(true);
            const [petsData, flatsData] = await Promise.all([
                PetService.getPets(user.societyId),
                SocietyService.getFlats(user.societyId)
            ]);
            setPets(petsData as Pet[]);
            setFlats(flatsData as Flat[]);
        } catch (error) {
            console.error('Error loading pets:', error);
            toast.error('Failed to load pets data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to remove this pet?')) return;
        try {
            await PetService.deletePet(id);
            toast.success('Pet removed successfully');
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove pet');
        }
    };

    const getFlatNumber = (flatId: string) => {
        const flat = flats.find(f => f.id === flatId);
        return flat ? `Flat ${flat.flatNumber}` : 'Unknown';
    };

    const filteredPets = pets.filter(pet =>
        pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pet.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getFlatNumber(pet.flatId).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = {
        total: pets.length,
        dogs: pets.filter(p => p.type === 'Dog').length,
        cats: pets.filter(p => p.type === 'Cat').length,
        vaccinated: pets.filter(p => p.vaccinationStatus === 'vaccinated').length
    };

    const canManagePet = (pet: Pet) => {
        return user?.role === 'admin' || user?.uid === pet.ownerId;
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Pet Management</h1>
                        <p className="text-gray-600 mt-1">Manage and track pets in the society</p>
                    </div>
                    <Button
                        onClick={() => {
                            setSelectedPet(undefined);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Register Pet
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard title="Total Pets" value={stats.total} icon={PawPrint} color="blue" />
                    <StatsCard title="Dogs" value={stats.dogs} icon={PawPrint} color="purple" />
                    <StatsCard title="Cats" value={stats.cats} icon={PawPrint} color="purple" />
                    <StatsCard
                        title="Vaccinated"
                        value={stats.vaccinated}
                        icon={stats.vaccinated === stats.total ? ShieldCheck : ShieldAlert}
                        color={stats.vaccinated === stats.total ? 'green' : 'yellow'}
                    />
                </div>

                <Card>
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name, type, or flat..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">Pet Name</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">Type / Breed</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">Residence</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">Vaccination</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                                            Loading pets...
                                        </td>
                                    </tr>
                                ) : filteredPets.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            No pets found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPets.map((pet) => (
                                        <tr key={pet.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                                                        <PawPrint size={16} />
                                                    </div>
                                                    <span className="font-medium text-gray-900">{pet.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-gray-900">{pet.type}</p>
                                                    {pet.breed && <p className="text-gray-500 text-xs">{pet.breed}</p>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {getFlatNumber(pet.flatId)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${pet.vaccinationStatus === 'vaccinated'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {pet.vaccinationStatus === 'vaccinated' ? 'Vaccinated' : 'Pending'}
                                                </span>
                                                {pet.vaccinationDate && (
                                                    <p className="text-[10px] text-gray-400 mt-1">{new Date(pet.vaccinationDate).toLocaleDateString()}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {canManagePet(pet) && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedPet(pet);
                                                                    setIsModalOpen(true);
                                                                }}
                                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(pet.id)}
                                                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <PetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadData}
                pet={selectedPet}
            />
        </Layout>
    );
};
