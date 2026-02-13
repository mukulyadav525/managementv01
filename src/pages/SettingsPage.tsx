import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Input } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { SocietyService, toSnake } from '@/services/supabase.service';
import { Society } from '@/types';
import { supabase } from '@/config/supabase';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [society, setSociety] = useState<Society | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user?.societyId) {
            loadSociety();
        }
    }, [user]);

    const loadSociety = async () => {
        if (!user?.societyId) return;
        try {
            setLoading(true);
            const data = await SocietyService.getSociety(user.societyId);
            setSociety(data as Society);
        } catch (error) {
            toast.error('Failed to load society settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!society || !user?.societyId) return;

        try {
            setSaving(true);
            const { error } = await supabase
                .from('societies')
                .update(toSnake({
                    ...society,
                    updatedAt: new Date().toISOString()
                }))
                .eq('id', user.societyId);

            if (error) throw error;
            toast.success('Settings updated successfully');
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6 max-w-4xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Society Settings</h1>
                    <p className="text-gray-600 mt-1">Configure your society's global parameters and contact info</p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* General Information */}
                    <Card title="General Information">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Society Name"
                                value={society?.name || ''}
                                onChange={(e) => setSociety(s => s ? { ...s, name: e.target.value } : null)}
                                required
                            />
                            <Input
                                label="Total Flats"
                                type="number"
                                value={society?.totalFlats || 0}
                                onChange={(e) => setSociety(s => s ? { ...s, totalFlats: parseInt(e.target.value) } : null)}
                            />
                        </div>
                    </Card>

                    {/* Contact Information */}
                    <Card title="Contact Details">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Contact Email"
                                type="email"
                                value={society?.contactEmail || ''}
                                onChange={(e) => setSociety(s => s ? { ...s, contactEmail: e.target.value } : null)}
                            />
                            <Input
                                label="Contact Phone"
                                type="tel"
                                value={society?.contactPhone || ''}
                                onChange={(e) => setSociety(s => s ? { ...s, contactPhone: e.target.value } : null)}
                            />
                        </div>
                    </Card>

                    {/* Address Information */}
                    <Card title="Address">
                        <div className="space-y-4">
                            <Input
                                label="Street Address"
                                value={society?.address?.street || ''}
                                onChange={(e) => setSociety(s => s ? { ...s, address: { ...s.address, street: e.target.value } } : null)}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input
                                    label="City"
                                    value={society?.address?.city || ''}
                                    onChange={(e) => setSociety(s => s ? { ...s, address: { ...s.address, city: e.target.value } } : null)}
                                />
                                <Input
                                    label="State"
                                    value={society?.address?.state || ''}
                                    onChange={(e) => setSociety(s => s ? { ...s, address: { ...s.address, state: e.target.value } } : null)}
                                />
                                <Input
                                    label="Zip Code"
                                    value={society?.address?.pincode || ''}
                                    onChange={(e) => setSociety(s => s ? { ...s, address: { ...s.address, pincode: e.target.value } } : null)}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Amenities */}
                    <Card title="Amenities">
                        <div className="space-y-2">
                            <p className="text-sm text-gray-500 mb-4">List amenities separated by commas (e.g. Gym, Pool, Park)</p>
                            <textarea
                                className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 h-24"
                                value={society?.amenities?.join(', ') || ''}
                                onChange={(e) => setSociety(s => s ? { ...s, amenities: e.target.value.split(',').map(a => a.trim()) } : null)}
                                placeholder="Amenity 1, Amenity 2..."
                            />
                        </div>
                    </Card>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : (
                                <>
                                    <Save size={20} className="mr-2" />
                                    Save All Changes
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};
