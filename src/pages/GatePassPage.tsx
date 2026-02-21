import React, { useState, useEffect } from 'react';
import { QrCode, UserPlus, Clock, CheckCircle2, AlertCircle, Share2, Trash2, MapPin, User } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, Button, StatsCard } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface GatePass {
    id: string;
    visitorName: string;
    visitorType: 'guest' | 'delivery' | 'service';
    phone: string;
    validUntil: string;
    status: 'active' | 'expired' | 'used';
    entryCode: string;
    createdAt: string;
}

export const GatePassPage: React.FC = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [passes, setPasses] = useState<GatePass[]>([]);

    useEffect(() => {
        // Simulated data fetching
        setTimeout(() => {
            setPasses([
                {
                    id: 'v1',
                    visitorName: 'Rajesh Kumar',
                    visitorType: 'guest',
                    phone: '+91 9876543210',
                    validUntil: new Date(Date.now() + 86400000).toISOString(), // 24h from now
                    status: 'active',
                    entryCode: 'GP-8821',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'v2',
                    visitorName: 'Swiggy Delivery',
                    visitorType: 'delivery',
                    phone: '+91 9988776655',
                    validUntil: new Date(Date.now() + 3600000).toISOString(), // 1h from now
                    status: 'used',
                    entryCode: 'GP-4412',
                    createdAt: new Date(Date.now() - 7200000).toISOString()
                }
            ]);
            setLoading(false);
        }, 1000);
    }, [user]);

    const handleDelete = (id: string) => {
        setPasses(prev => prev.filter(p => p.id !== id));
        toast.success('Pass cancelled successfully');
    };

    const handleShare = (code: string) => {
        toast.success(`Share link copied for code: ${code}`);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700';
            case 'used': return 'bg-blue-100 text-blue-700';
            case 'expired': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Gate Pass</h1>
                        <p className="text-gray-600 mt-1">Generate and manage entry passes for your visitors</p>
                    </div>
                    <Button onClick={() => toast.success('New Gate Pass form opening...')} className="flex items-center gap-2">
                        <UserPlus size={20} />
                        New visitor pass
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatsCard title="Active Passes" value={passes.filter(p => p.status === 'active').length} icon={QrCode} color="blue" />
                    <StatsCard title="Entries Today" value="8" icon={CheckCircle2} color="green" />
                    <StatsCard title="Pending Guests" value="2" icon={Clock} color="purple" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="text-primary-600" size={24} />
                            Recent Passes
                        </h2>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2].map(i => <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-2xl"></div>)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {passes.map(pass => (
                                    <Card key={pass.id} className="overflow-hidden border-none shadow-sm shadow-gray-200/60 hover:shadow-md transition-shadow">
                                        <div className="p-5">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`p-3 rounded-2xl ${pass.visitorType === 'guest' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                    {pass.visitorType === 'guest' ? <User size={24} /> : <QrCode size={24} />}
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(pass.status)}`}>
                                                    {pass.status}
                                                </span>
                                            </div>

                                            <h4 className="font-bold text-lg text-gray-900 truncate mb-1">{pass.visitorName}</h4>
                                            <p className="text-xs text-gray-500 font-medium mb-4 flex items-center gap-1">
                                                <Clock size={12} />
                                                Valid until: {new Date(pass.validUntil).toLocaleString()}
                                            </p>

                                            <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between mb-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Entry Code</span>
                                                    <span className="text-lg font-black text-slate-800 tracking-tighter">{pass.entryCode}</span>
                                                </div>
                                                <div className="bg-white p-2 rounded-lg shadow-sm">
                                                    <QrCode size={32} className="text-slate-800" />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="secondary"
                                                    className="flex-1 py-2 text-xs"
                                                    onClick={() => handleShare(pass.entryCode)}
                                                >
                                                    <Share2 size={14} className="mr-2" />
                                                    Share
                                                </Button>
                                                <button
                                                    onClick={() => handleDelete(pass.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <AlertCircle className="text-primary-600" size={24} />
                            Gate Security
                        </h2>
                        <Card className="bg-slate-900 border-none p-6 text-white overflow-hidden relative">
                            <div className="absolute right-0 bottom-0 opacity-10 bg-primary-400 w-32 h-32 rounded-full blur-3xl"></div>
                            <h4 className="font-bold text-lg mb-4">Instructions for Residents</h4>
                            <ul className="space-y-4">
                                <li className="flex gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                                    <p className="text-sm text-slate-400">Specify the correct visitor type for faster processing at the gate.</p>
                                </li>
                                <li className="flex gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                                    <p className="text-sm text-slate-400">Share the 6-digit entry code with your visitor via WhatsApp or SMS.</p>
                                </li>
                                <li className="flex gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                                    <p className="text-sm text-slate-400">Security will verify the code and grant access. You will be notified instantly.</p>
                                </li>
                            </ul>
                        </Card>

                        <Card className="p-6">
                            <h4 className="font-bold text-gray-900 mb-4">Security Support</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <MapPin size={18} className="text-gray-400" />
                                        <span className="text-sm font-medium text-gray-700">Main Gate</span>
                                    </div>
                                    <span className="text-xs font-bold text-green-600">Active</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <MapPin size={18} className="text-gray-400" />
                                        <span className="text-sm font-medium text-gray-700">Service Entry</span>
                                    </div>
                                    <span className="text-xs font-bold text-green-600">Active</span>
                                </div>
                            </div>
                            <Button variant="secondary" className="w-full mt-4 flex items-center justify-center gap-2">
                                <CheckCircle2 size={18} />
                                Contact Gate
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
