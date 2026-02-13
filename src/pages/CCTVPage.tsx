import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Layout } from '@/components/layout/Layout';
import { Camera, MapPin, Circle } from 'lucide-react';
import { CCTVService } from '@/services/supabase.service';
import { CCTVCamera } from '@/types';
import toast from 'react-hot-toast';

export const CCTVPage: React.FC = () => {
    const { user } = useAuthStore();
    const [cameras, setCameras] = useState<CCTVCamera[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCamera, setSelectedCamera] = useState<CCTVCamera | null>(null);

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
            }
        } catch (error) {
            console.error('Error loading cameras:', error);
            toast.error('Failed to load CCTV cameras');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading CCTV cameras...</div>
            </div>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">CCTV Cameras</h1>
                    <p className="text-gray-600 mt-1">Monitor security cameras across the society</p>
                </div>

                {cameras.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cameras Available</h3>
                        <p className="text-gray-600">
                            No CCTV cameras have been set up yet. Contact your administrator to add cameras.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Camera List */}
                        <div className="lg:col-span-1 space-y-3">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Cameras</h2>
                            {cameras.map((camera) => (
                                <button
                                    key={camera.id}
                                    onClick={() => setSelectedCamera(camera)}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedCamera?.id === camera.id
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 mb-1">{camera.name}</h3>
                                            {camera.location && (
                                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {camera.location}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Circle
                                                className={`w-2 h-2 ${camera.isActive ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'
                                                    }`}
                                            />
                                            <span className={`text-xs ${camera.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                                                {camera.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Camera Feed */}
                        <div className="lg:col-span-2">
                            {selectedCamera ? (
                                <div className="bg-white rounded-lg shadow overflow-hidden">
                                    <div className="p-4 border-b bg-gray-50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900">{selectedCamera.name}</h2>
                                                {selectedCamera.location && (
                                                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                                        <MapPin className="w-4 h-4" />
                                                        {selectedCamera.location}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Circle
                                                    className={`w-3 h-3 ${selectedCamera.isActive ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'
                                                        }`}
                                                />
                                                <span className={`text-sm font-medium ${selectedCamera.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {selectedCamera.isActive ? 'Live' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="aspect-video bg-gray-900 flex items-center justify-center">
                                        {selectedCamera.streamUrl ? (
                                            <iframe
                                                src={selectedCamera.streamUrl}
                                                className="w-full h-full"
                                                allow="camera; microphone"
                                                title={selectedCamera.name}
                                            />
                                        ) : (
                                            <div className="text-center text-gray-400">
                                                <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                                <p>No stream URL configured</p>
                                                <p className="text-sm mt-1">Contact administrator to set up camera feed</p>
                                            </div>
                                        )}
                                    </div>

                                    {selectedCamera.recordingUrl && (
                                        <div className="p-4 border-t bg-gray-50">
                                            <a
                                                href={selectedCamera.recordingUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                            >
                                                View Recordings →
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow p-12 text-center">
                                    <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">Select a camera to view feed</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};
