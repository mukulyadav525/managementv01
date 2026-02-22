import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/config/supabase';
import { Button, Input } from '@/components/common';
import toast from 'react-hot-toast';

export const CompleteProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { completeProfile } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [societies, setSocieties] = useState<any[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        name: '', // Optional, pre-fill if possible
        phone: '',
        role: 'tenant' as any,
        societyName: '',
        societyId: ''
    });

    useEffect(() => {
        // Fetch societies for the dropdown
        const fetchSocieties = async () => {
            const { data, error } = await supabase.from('societies').select('id, name');
            if (!error && data) setSocieties(data);
        };
        fetchSocieties();

        // Check if we can get user metadata to pre-fill name
        const getUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.full_name) {
                setFormData(prev => ({ ...prev, name: user.user_metadata.full_name }));
            }

            // Check if profile ALREADY exists and is complete
            if (user) {
                const { data: profile } = await supabase.from('users').select('role, society_id').eq('uid', user.id).single();
                if (profile && profile.role && (profile.society_id || profile.role === 'admin')) {
                    console.log('CompleteProfilePage: Profile already complete, redirecting...');
                    navigate('/dashboard');
                }
            }
        };
        getUserData();

    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        if (formData.role === 'admin' && !formData.societyName) {
            return toast.error('Please provide a society name');
        }

        if (formData.role !== 'admin' && !formData.societyId) {
            return toast.error('Please select a society');
        }

        if (!formData.phone) {
            return toast.error('Please provide a phone number');
        }

        setLoading(true);
        try {
            console.log('CompleteProfilePage: Submitting profile...', formData);
            await completeProfile({
                name: formData.name,
                phone: formData.phone,
                role: formData.role,
                societyId: formData.societyId,
                societyName: formData.role === 'admin' ? formData.societyName : undefined
            });

            toast.success('Profile completed successfully!');

            // Wait a tiny bit for the store to settle
            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 500);
        } catch (error: any) {
            console.error('CompleteProfilePage: Error completing profile:', error);
            toast.error(error.message || 'Failed to complete profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
                        <UserCircle className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Complete Profile</h1>
                    <p className="text-gray-600 mt-2">We need a few more details to get you started.</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">

                        <Input
                            label="Full Name"
                            type="text"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />

                        <Input
                            label="Phone Number"
                            type="tel"
                            placeholder="+91 1234567890"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                        />

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Account Type</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                            >
                                <option value="tenant">Tenant</option>
                                <option value="owner">Owner</option>
                                <option value="staff">Staff</option>
                                <option value="security">Security Guard</option>
                                <option value="admin">Admin (Create New Society)</option>
                            </select>
                        </div>

                        {formData.role === 'admin' ? (
                            <Input
                                label="Society Name"
                                type="text"
                                placeholder="Marvel Heights"
                                value={formData.societyName}
                                onChange={(e) => setFormData({ ...formData, societyName: e.target.value })}
                                required
                            />
                        ) : (
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Select Society</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                    value={formData.societyId}
                                    onChange={(e) => setFormData({ ...formData, societyId: e.target.value })}
                                    required
                                >
                                    <option value="">Choose a society...</option>
                                    {societies.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full mt-6"
                            loading={loading}
                        >
                            Complete Registration
                        </Button>
                    </form>
                </div>
                <div className="mt-8 text-center pb-8 text-gray-400">
                    <p className="text-sm">
                        <a
                            href="https://www.linkedin.com/in/mukulyadav525"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 font-medium hover:underline"
                        >
                            Mukul
                        </a>{' '}
                        and{' '}
                        <a
                            href="https://www.linkedin.com/in/priya-kyal-44bb69313"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 font-medium hover:underline"
                        >
                            Priya
                        </a>
                    </p>
                    <p className="text-xs mt-1 uppercase tracking-wider">
                        All Rights Reserved © {new Date().getFullYear()}
                    </p>
                </div>

            </div>
        </div>
    );
};
