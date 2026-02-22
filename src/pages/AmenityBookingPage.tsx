import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle, Plus, ChevronRight, Info, Users, Trash2, Edit2, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, Button, StatsCard } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

import {
    Amenity,
    AmenityBooking as Booking
} from '@/types';
import { AmenityService } from '@/services/supabase.service';

export const AmenityBookingPage: React.FC = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [myBookings, setMyBookings] = useState<Booking[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (user?.societyId) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [amenitiesData, bookingsData] = await Promise.all([
                AmenityService.getAmenities(user!.societyId),
                AmenityService.getBookings(user!.societyId, { userId: user!.uid })
            ]);
            setAmenities(amenitiesData as Amenity[]);
            setMyBookings(bookingsData as any[]);
        } catch (error) {
            toast.error('Failed to load amenities');
        } finally {
            setLoading(false);
        }
    };

    const handleBooking = (amenity: Amenity) => {
        if (amenity.status !== 'available') {
            toast.error('This amenity is currently unavailable for booking');
            return;
        }
        // In a real app, this would open a modal with date/time selection
        toast.success(`Booking flow initiated for ${amenity.name}`);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this amenity?')) return;
        try {
            await AmenityService.deleteAmenity(id);
            toast.success('Amenity deleted');
            loadData();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data = { ...formData, societyId: user!.societyId };
            await AmenityService.createAmenity({
                ...data,
                bookingType: data.bookingType || 'slot',
                status: data.status || 'available',
                pricePerHour: Number(data.pricePerHour) || 0,
                capacity: Number(data.capacity) || 0,
                rules: data.rules ? data.rules.split(',').map((r: string) => r.trim()) : []
            });

            toast.success(`Amenity created successfully`);
            setShowModal(false);
            setFormData({});
            loadData();
        } catch (error) {
            toast.error('Failed to create amenity');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available': return 'bg-green-100 text-green-700';
            case 'maintenance': return 'bg-yellow-100 text-yellow-700';
            case 'closed': return 'bg-red-100 text-red-700';
            case 'confirmed': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Amenity Booking</h1>
                        <p className="text-gray-600 mt-1">Book society facilities and manage your reservations</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {user?.role === 'admin' && (
                            <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
                                <Plus size={20} />
                                Add Amenity
                            </Button>
                        )}
                        <Button variant="secondary" className="flex items-center gap-2">
                            <Calendar size={18} />
                            My Bookings
                        </Button>
                    </div>
                </div>

                {/* Categories / Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatsCard title="Total Amenities" value={amenities.length} icon={Users} color="blue" />
                    <StatsCard title="Available Now" value={amenities.filter(a => a.status === 'available').length} icon={CheckCircle} color="green" />
                    <StatsCard title="Upcoming Bookings" value={myBookings.length} icon={Clock} color="purple" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Amenity List */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Plus className="text-primary-600" size={24} />
                            Quick Book
                        </h2>
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-2xl"></div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {amenities.map(amenity => (
                                    <Card key={amenity.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="flex flex-col sm:flex-row h-full">
                                            <div className="w-full sm:w-48 bg-gray-100 h-32 sm:h-auto flex items-center justify-center relative">
                                                {amenity.status === 'maintenance' && (
                                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
                                                        <div className="bg-yellow-500 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                            <AlertCircle size={14} />
                                                            In Maintenance
                                                        </div>
                                                    </div>
                                                )}
                                                <Calendar className="text-gray-300" size={48} />
                                            </div>
                                            <div className="p-5 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h3 className="font-bold text-lg text-gray-900">{amenity.name}</h3>
                                                        <div className="flex items-center gap-2">
                                                            {user?.role === 'admin' && (
                                                                <div className="flex items-center gap-1.5 mr-2">
                                                                    <button className="text-gray-400 hover:text-primary-600 transition-colors">
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(amenity.id)}
                                                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(amenity.status)}`}>
                                                                {amenity.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{amenity.description}</p>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 font-medium">
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={14} />
                                                            {amenity.location}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Users size={14} />
                                                            Capacity: {amenity.capacity}
                                                        </span>
                                                        {amenity.pricePerHour && (
                                                            <span className="text-primary-600 font-bold">₹{amenity.pricePerHour}/hr</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-50">
                                                    <span className="text-xs text-gray-400 italic">Booking: {amenity.bookingType.replace('_', ' ')}</span>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleBooking(amenity)}
                                                        disabled={amenity.status !== 'available'}
                                                    >
                                                        Book Slot
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Activity / Notifications */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="text-primary-600" size={24} />
                            Recent Activity
                        </h2>
                        <Card className="h-full">
                            {myBookings.length === 0 ? (
                                <div className="p-10 text-center flex flex-col items-center justify-center">
                                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                                        <Info className="text-gray-300" size={24} />
                                    </div>
                                    <h4 className="font-bold text-gray-700">No active bookings</h4>
                                    <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">Your facility reservations will appear here. Start by selecting an amenity.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {myBookings.map(booking => (
                                        <div key={booking.id} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start gap-4">
                                                <div className="bg-primary-50 p-3 rounded-2xl text-primary-600">
                                                    <Calendar size={24} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-bold text-gray-900">
                                                            {amenities.find(a => a.id === booking.amenityId)?.name || 'Facility'}
                                                        </h4>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(booking.status)}`}>
                                                            {booking.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            {new Date(booking.startTime).toLocaleDateString()}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-gray-300" size={20} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        {/* Booking Rules Card */}
                        <Card className="bg-slate-900 text-white p-6 border-none">
                            <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Info size={20} className="text-primary-400" />
                                Booking Rules
                            </h4>
                            <ul className="space-y-3 text-sm text-slate-400">
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0"></div>
                                    Each flat can have maximum 2 active bookings at a time.
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0"></div>
                                    Cancellations must be done at least 4 hours in advance.
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0"></div>
                                    Charges (if any) will be added to the next maintenance bill.
                                </li>
                            </ul>
                        </Card>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg">
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Add New Amenity</h3>
                                <button type="button" onClick={() => setShowModal(false)}><X /></button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Name / Title</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-2 border rounded-xl"
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Amenity Name"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 border rounded-xl"
                                            value={formData.location || ''}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Price/hr</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2 border rounded-xl"
                                            value={formData.pricePerHour || ''}
                                            onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Capacity</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2 border rounded-xl"
                                            value={formData.capacity || ''}
                                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Booking Type</label>
                                        <select
                                            className="w-full px-4 py-2 border rounded-xl"
                                            value={formData.bookingType || 'slot'}
                                            onChange={(e) => setFormData({ ...formData, bookingType: e.target.value })}
                                        >
                                            <option value="slot">Slot-based</option>
                                            <option value="full_day">Full Day</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Rules (Comma separated)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border rounded-xl"
                                        value={formData.rules || ''}
                                        onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                                        placeholder="e.g. No smoking, Mask required"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                                    <textarea
                                        className="w-full px-4 py-2 border rounded-xl"
                                        rows={2}
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                                <Button type="submit" disabled={submitting} className="flex-1">
                                    {submitting ? 'Creating...' : 'Create Amenity'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </Layout>
    );
};
