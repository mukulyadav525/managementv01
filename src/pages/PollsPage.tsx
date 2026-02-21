import React, { useState, useEffect } from 'react';
import { Vote, FileText, CheckCircle2, Clock, BarChart3, Plus, ChevronRight, AlertTriangle, Users } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, Button, StatsCard } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface PollOption {
    id: string;
    text: string;
    votes: number;
}

interface Poll {
    id: string;
    title: string;
    description: string;
    options: PollOption[];
    totalVotes: number;
    status: 'active' | 'closed';
    endDate: string;
    createdBy: string;
    votedBy: string[]; // List of user IDs who have voted
    category: 'general' | 'financial' | 'event' | 'committee';
}

export const PollsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [polls, setPolls] = useState<Poll[]>([]);

    useEffect(() => {
        // Simulated data fetching
        setTimeout(() => {
            setPolls([
                {
                    id: 'p1',
                    title: 'Annual Society Maintenance Hike',
                    description: 'A proposal to increase maintenance by 5% to cover rising security and cleaning costs from next quarter.',
                    options: [
                        { id: 'o1', text: 'Approve (5% Hike)', votes: 42 },
                        { id: 'o2', text: 'Reject (Keep same)', votes: 15 },
                        { id: 'o3', text: 'Need more discussion', votes: 8 }
                    ],
                    totalVotes: 65,
                    status: 'active',
                    endDate: '2026-03-01',
                    createdBy: 'admin_1',
                    votedBy: [],
                    category: 'financial'
                },
                {
                    id: 'p2',
                    title: 'Holi Celebration Event Venue',
                    description: 'Where should we organize the society Holi colors event this year?',
                    options: [
                        { id: 'o4', text: 'Central Park', votes: 28 },
                        { id: 'o5', text: 'Clubhouse Lawn', votes: 35 },
                        { id: 'o6', text: 'Basement Parking (Secondary)', votes: 5 }
                    ],
                    totalVotes: 68,
                    status: 'active',
                    endDate: '2026-02-28',
                    createdBy: 'admin_1',
                    votedBy: [user?.uid || ''],
                    category: 'event'
                },
                {
                    id: 'p3',
                    title: 'New Security Guard Vendor Selection',
                    description: 'Voting for the new security agency for the upcoming financial year.',
                    options: [
                        { id: 'o7', text: 'Z-Security Services', votes: 50 },
                        { id: 'o8', text: 'Elite Guard Agency', votes: 12 }
                    ],
                    totalVotes: 62,
                    status: 'closed',
                    endDate: '2026-01-15',
                    createdBy: 'admin_1',
                    votedBy: [user?.uid || ''],
                    category: 'general'
                }
            ]);
            setLoading(false);
        }, 1000);
    }, [user]);

    const handleVote = (pollId: string, optionId: string) => {
        const poll = polls.find(p => p.id === pollId);
        if (poll?.status === 'closed') {
            toast.error('This poll is already closed');
            return;
        }
        if (poll?.votedBy.includes(user?.uid || '')) {
            toast.error('You have already voted in this poll');
            return;
        }

        setPolls(prev => prev.map(p => {
            if (p.id === pollId) {
                return {
                    ...p,
                    totalVotes: p.totalVotes + 1,
                    votedBy: [...p.votedBy, user?.uid || ''],
                    options: p.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o)
                };
            }
            return p;
        }));

        toast.success('Your vote has been recorded securely!');
    };

    const calculatePercentage = (votes: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((votes / total) * 100);
    };

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Society Polls</h1>
                        <p className="text-gray-600 mt-1">Participate in decision making for your community</p>
                    </div>
                    {user?.role === 'admin' && (
                        <Button className="flex items-center gap-2">
                            <Plus size={20} />
                            Create New Poll
                        </Button>
                    )}
                </div>

                {/* Categories / Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatsCard title="Active Polls" value={polls.filter(p => p.status === 'active').length} icon={Vote} color="blue" />
                    <StatsCard title="Total Votes Cast" value={polls.reduce((acc, p) => acc + p.totalVotes, 0)} icon={CheckCircle2} color="green" />
                    <StatsCard title="Participation Rate" value="78%" icon={Users} color="purple" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="text-primary-600" size={24} />
                            Ongoing Votes
                        </h2>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2].map(i => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl"></div>)}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {polls.filter(p => p.status === 'active').map(poll => {
                                    const hasVoted = poll.votedBy.includes(user?.uid || '');
                                    return (
                                        <Card key={poll.id} className={`overflow-hidden border-l-4 ${hasVoted ? 'border-l-primary-500' : 'border-l-yellow-400'}`}>
                                            <div className="p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                        {poll.category}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                                        <Clock size={14} />
                                                        Ends {new Date(poll.endDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">{poll.title}</h3>
                                                <p className="text-gray-600 text-sm mb-6">{poll.description}</p>

                                                <div className="space-y-4">
                                                    {poll.options.map(option => {
                                                        const percentage = calculatePercentage(option.votes, poll.totalVotes);
                                                        return (
                                                            <div key={option.id} className="relative">
                                                                {hasVoted ? (
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center justify-between text-sm font-medium">
                                                                            <span className="text-gray-700">{option.text}</span>
                                                                            <span className="text-primary-600">{percentage}%</span>
                                                                        </div>
                                                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                                                            <div
                                                                                className="bg-primary-500 h-full transition-all duration-500 rounded-full"
                                                                                style={{ width: `${percentage}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <p className="text-[10px] text-gray-400">{option.votes} votes</p>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleVote(poll.id, option.id)}
                                                                        className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-primary-500 hover:bg-primary-50 transition-all font-medium group"
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-gray-700 group-hover:text-primary-700">{option.text}</span>
                                                                            <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500" />
                                                                        </div>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {hasVoted && (
                                                    <div className="mt-6 pt-4 border-t border-gray-50 flex items-center gap-2 text-green-600 font-bold text-sm">
                                                        <CheckCircle2 size={18} />
                                                        You have cast your vote
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <BarChart3 className="text-primary-600" size={24} />
                            Recent Results
                        </h2>
                        <Card>
                            <div className="divide-y divide-gray-50">
                                {polls.filter(p => p.status === 'closed').map(poll => (
                                    <div key={poll.id} className="p-5 hover:bg-gray-50 transition-colors cursor-pointer group">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h4 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{poll.title}</h4>
                                                <p className="text-xs text-gray-400 mt-0.5">Finalized on {new Date(poll.endDate).toLocaleDateString()}</p>
                                            </div>
                                            <div className="bg-gray-100 text-gray-500 p-2 rounded-lg">
                                                <FileText size={18} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-3">
                                            <div className="flex -space-x-2">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="w-6 h-6 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-primary-600">
                                                        {String.fromCharCode(64 + i)}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-xs text-gray-500 font-medium">{poll.totalVotes} total responses</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="bg-amber-50 border-amber-100 p-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-900 mb-1">Voting Rules</h4>
                                    <ul className="text-sm text-amber-800 space-y-2">
                                        <li>• One vote per registered user/flat.</li>
                                        <li>• Votes are anonymous to other residents.</li>
                                        <li>• Results are finalized once the deadline passes.</li>
                                    </ul>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
