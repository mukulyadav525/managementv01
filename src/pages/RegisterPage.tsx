import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/config/supabase';
import { Button, Input } from '@/components/common';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const { signUp } = useAuthStore();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        role: 'tenant' as any,
        societyName: '',
        societyId: ''
    });
    const [societies, setSocieties] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        const fetchSocieties = async () => {
            const { data, error } = await supabase.from('societies').select('id, name');
            if (!error && data) setSocieties(data);
        };
        fetchSocieties();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            return toast.error('Passwords do not match');
        }

        if (formData.role === 'admin' && !formData.societyName) {
            return toast.error('Please provide a society name');
        }

        if (formData.role !== 'admin' && !formData.societyId) {
            return toast.error('Please select a society');
        }

        setLoading(true);
        try {
            await signUp(formData.email, formData.password, {
                name: formData.name,
                phone: formData.phone,
                role: formData.role,
                societyId: formData.societyId,
                societyName: formData.societyName
            });

            toast.success('Registration and data seeding complete!');
            navigate('/dashboard');
        } catch (error: any) {
            toast.error(error.message);
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
                        <Building2 className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Society Manager</h1>
                    <p className="text-gray-600 mt-2">Create your account</p>
                </div>

                {/* Register Form */}
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
                            label="Email Address"
                            type="email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                            <Input
                                label="Confirm Password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                            />
                        </div>

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
                            Register & Setup
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                                Log in here
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center pb-8">
                    <p className="text-sm text-gray-500">
                        Made with ❤️ by <span className="text-primary-600 font-medium">Mukul</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        © {new Date().getFullYear()} Society Manager. All Rights Reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};
