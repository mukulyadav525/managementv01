import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Layout } from '@/components/layout/Layout';
import { Camera, MapPin, Circle, Plus, Edit2, Trash2, Shield, Settings } from 'lucide-react';
import { CCTVService } from '@/services/supabase.service';
import { CCTVCamera } from '@/types';
import { Button } from '@/components/common';
import { CCTVModal } from '@/components/security/CCTVModal';
import toast from 'react-hot-toast';

export const CCTVPage: React.FC = () => {
    const { user } = useAuthStore();
    const [cameras, setCameras] = useState<CCTVCamera[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCamera, setSelectedCamera] = useState<CCTVCamera | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCamera, setEditingCamera] = useState<CCTVCamera | undefined>();

    useEffect(() => {
        loadCameras();
    }, [user]);

    const loadCameras = async () => {
        if (!user?.societyId) return;

        try {
            setLoading(true);
            const data = await CCTVService.getCameras(user.societyId) as CCTVCamera[];
            setCameras(data);
            if (data.length > 0) {
                setSelectedCamera(data[0] as CCTVCamera);
            } else {
                setSelectedCamera(null);
            }
        } catch (error) {
            console.error('Error loading cameras:', error);
            toast.error('Failed to load CCTV cameras');
        } finally {
            setLoading(false);
        }
    };

    const seedCameras = async () => {
        if (!user?.societyId) return;
        setLoading(true);
        try {
            const demoCameras = [
                {
                    name: 'Main Entrance Gate',
                    location: 'Entry Point - Sector 4',
                    streamUrl: 'https://www.youtube.com/embed/5_X94S1H-gM', // Demo live stream
                    isActive: true,
                    societyId: user.societyId
                },
                {
                    name: 'Basement Parking A',
                    location: 'Level -1, Block A',
                    streamUrl: 'https://www.youtube.com/embed/1EiC9bvVGnk',
                    isActive: true,
                    societyId: user.societyId
                },
                {
                    name: 'Club House Pool',
                    location: 'Amenities Area',
                    streamUrl: '',
                    isActive: false,
                    societyId: user.societyId
                }
            ];

            for (const cam of demoCameras) {
                await CCTVService.createCamera(cam);
            }
            toast.success('Demo cameras seeded successfully');
            loadCameras();
        } catch (error: any) {
            toast.error('Failed to seed demo cameras');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to remove this camera?')) return;
        try {
            await CCTVService.deleteCamera(id);
            toast.success('Camera removed successfully');
            loadCameras();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete camera');
        }
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'staff';

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        <div className="text-gray-500">Loading CCTV cameras...</div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">CCTV Cameras</h1>
                        <p className="text-gray-600 mt-1">Monitor security cameras across the society</p>
                    </div>
                    {isAdmin && (
                        <Button
                            onClick={() => {
                                setEditingCamera(undefined);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Add Camera
                        </Button>
                    )}
                </div>

                {cameras.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Camera className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cameras Available</h3>
                        <p className="text-gray-600 max-w-sm mx-auto mb-6">
                            No CCTV cameras have been set up yet.
                            {isAdmin ? ' Start by adding your first security camera or seed demo cameras.' : ' Contact your administrator to add cameras.'}
                        </p>
                        {isAdmin && (
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button onClick={() => setIsModalOpen(true)}>
                                    <Plus size={18} className="mr-2" />
                                    Add First Camera
                                </Button>
                                <Button variant="secondary" onClick={seedCameras}>
                                    Seed Demo Cameras
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Camera List */}
                        <div className="lg:col-span-1 space-y-3">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <Shield size={16} className="text-primary-600" />
                                    Active Streams ({cameras.length})
                                </h2>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1 custom-scrollbar">
                                {cameras.map((camera) => (
                                    <div
                                        key={camera.id}
                                        className={`group relative rounded-lg border-2 transition-all p-4 ${selectedCamera?.id === camera.id
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                    >
                                        <button
                                            onClick={() => setSelectedCamera(camera)}
                                            className="w-full text-left"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 mb-1">{camera.name}</h3>
                                                    {camera.location && (
                                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                                            <MapPin className="w-3" size={14} />
                                                            {camera.location}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Circle
                                                        className={`w-2 h-2 ${camera.isActive ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'
                                                            }`}
                                                    />
                                                    <span className={`text-[10px] font-bold uppercase tracking-tight ${camera.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                                                        {camera.isActive ? 'Live' : 'Off'}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>

                                        {isAdmin && (
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-md shadow-sm border border-gray-100">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingCamera(camera);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                                                    title="Edit Camera"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(camera.id);
                                                    }}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    title="Remove Camera"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Camera Feed Viewer */}
                        <div className="lg:col-span-2">
                            {selectedCamera ? (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full sticky top-6">
                                    <div className="p-4 border-b bg-white flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary-50 p-2 rounded-lg">
                                                <Camera className="text-primary-600" size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-gray-900">{selectedCamera.name}</h2>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    {selectedCamera.location && (
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <MapPin size={12} />
                                                            {selectedCamera.location}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1.5">
                                                        <span className={`relative flex h-2 w-2 ${selectedCamera.isActive ? '' : 'hidden'}`}>
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                        </span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedCamera.isActive ? 'text-red-600' : 'text-gray-400'}`}>
                                                            {selectedCamera.isActive ? 'Live Stream' : 'Camera Offline'}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <button
                                                    onClick={() => {
                                                        setEditingCamera(selectedCamera);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                                >
                                                    <Settings size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="aspect-video bg-black relative">
                                        {selectedCamera.streamUrl ? (
                                            <div className="w-full h-full">
                                                <iframe
                                                    src={selectedCamera.streamUrl}
                                                    className="w-full h-full border-0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    title={selectedCamera.name}
                                                />
                                                {/* Overlay to catch clicks if needed or for branding */}
                                                <div className="absolute top-4 right-4 pointer-events-none flex flex-col items-end">
                                                    <div className="bg-black/40 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono text-white/80 border border-white/10">
                                                        REC ⬤ {new Date().toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-900">
                                                <div className="bg-gray-800 p-4 rounded-full mb-4">
                                                    <Camera className="w-12 h-12 opacity-50" />
                                                </div>
                                                <h4 className="text-white font-semibold mb-1">No Stream Configured</h4>
                                                <p className="text-sm max-w-xs">
                                                    To view this camera, please provide a stream URL (YouTube/IP Cam embed link) in the settings.
                                                </p>
                                                {isAdmin && (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="mt-6"
                                                        onClick={() => {
                                                            setEditingCamera(selectedCamera);
                                                            setIsModalOpen(true);
                                                        }}
                                                    >
                                                        Configure Stream
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
                                        <div className="flex gap-4">
                                            {selectedCamera.recordingUrl && (
                                                <a
                                                    href={selectedCamera.recordingUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-bold transition-colors"
                                                >
                                                    <Shield size={16} />
                                                    View Playback
                                                </a>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-medium italic">
                                            Authorized access only • Encrypted stream
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-20 text-center flex flex-col items-center justify-center">
                                    <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mb-6">
                                        <Camera className="w-12 h-12 text-gray-300" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Camera</h3>
                                    <p className="text-gray-600 max-w-xs mx-auto">
                                        Select one of the {cameras.length} active security cameras on the left to start the monitoring session.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <CCTVModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadCameras}
                camera={editingCamera}
            />
        </Layout>
    );
};
