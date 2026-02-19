'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plus, Pencil, Trash2, Check, X, Loader2, Tag, Users, ChevronRight } from 'lucide-react';

interface ServiceCategory {
    id: string;
    name: string;
    icon: string;
    color: string;
    basePrice: number;
    gradient?: string;
}

const DEFAULT_COLORS = ['#F59E0B', '#3B82F6', '#8B4513', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

const DEFAULT_SERVICES = [
    { name: 'Electrician', icon: '⚡', color: '#F59E0B', basePrice: 200 },
    { name: 'Plumber', icon: '🔧', color: '#3B82F6', basePrice: 200 },
    { name: 'Carpenter', icon: '🔨', color: '#8B4513', basePrice: 200 },
    { name: 'Cleaner', icon: '✨', color: '#10B981', basePrice: 200 },
];

export default function AdminServicesPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [services, setServices] = useState<ServiceCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Add form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newIcon, setNewIcon] = useState('⚙️');
    const [newPrice, setNewPrice] = useState('');
    const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPrice, setEditPrice] = useState('');
    const [editName, setEditName] = useState('');
    const [editIcon, setEditIcon] = useState('');

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [isLoading, user, router]);

    useEffect(() => {
        fetchServices();
        fetchProviderCounts();
    }, []);

    const [providerCounts, setProviderCounts] = useState<Record<string, number>>({});

    const fetchServices = async () => {
        try {
            const snap = await getDocs(collection(db, 'serviceCategories'));
            const list: ServiceCategory[] = snap.docs.map(d => ({
                id: d.id,
                ...(d.data() as Omit<ServiceCategory, 'id'>),
            }));
            setServices(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchProviderCounts = async () => {
        try {
            const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'PROVIDER')));
            const counts: Record<string, number> = {};
            snap.docs.forEach(d => {
                const cat = d.data().serviceCategory || d.data().service || '';
                if (cat) counts[cat] = (counts[cat] || 0) + 1;
            });
            setProviderCounts(counts);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAdd = async () => {
        if (!newName.trim() || !newPrice) return;
        setSaving(true);
        try {
            const docRef = await addDoc(collection(db, 'serviceCategories'), {
                name: newName.trim(),
                icon: newIcon,
                color: newColor,
                basePrice: parseFloat(newPrice),
                gradient: 'from-gray-400 to-gray-600',
                createdAt: serverTimestamp(),
            });
            setServices(prev => [...prev, {
                id: docRef.id,
                name: newName.trim(),
                icon: newIcon,
                color: newColor,
                basePrice: parseFloat(newPrice),
            }]);
            setNewName(''); setNewIcon('⚙️'); setNewPrice(''); setNewColor(DEFAULT_COLORS[0]);
            setShowAddForm(false);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleStartEdit = (service: ServiceCategory) => {
        setEditingId(service.id);
        setEditPrice(service.basePrice.toString());
        setEditName(service.name);
        setEditIcon(service.icon);
    };

    const handleSaveEdit = async (id: string) => {
        if (!editPrice) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'serviceCategories', id), {
                name: editName,
                icon: editIcon,
                basePrice: parseFloat(editPrice),
                updatedAt: serverTimestamp(),
            });
            setServices(prev => prev.map(s => s.id === id
                ? { ...s, name: editName, icon: editIcon, basePrice: parseFloat(editPrice) }
                : s
            ));
            setEditingId(null);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        try {
            await deleteDoc(doc(db, 'serviceCategories', id));
            setServices(prev => prev.filter(s => s.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    const handleSeed = async () => {
        if (!confirm('Seed default services (Electrician, Plumber, Carpenter, Cleaner) at ₱200 each?')) return;
        setSaving(true);
        try {
            const added: ServiceCategory[] = [];
            for (const svc of DEFAULT_SERVICES) {
                const docRef = await addDoc(collection(db, 'serviceCategories'), {
                    ...svc,
                    gradient: 'from-gray-400 to-gray-600',
                    createdAt: serverTimestamp(),
                });
                added.push({ id: docRef.id, ...svc });
            }
            setServices(added);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };


    return (
        <AdminLayout>
            <div className="max-w-3xl mx-auto py-8 px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Service Categories</h1>
                        <p className="text-gray-500 mt-1">Manage services and their system prices</p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] transition-all shadow-md"
                    >
                        <Plus className="w-5 h-5" />
                        Add Service
                    </button>
                </div>

                {/* Add Form */}
                {showAddForm && (
                    <div className="bg-white rounded-2xl border-2 border-[#00B14F] p-6 mb-6 shadow-lg">
                        <h3 className="font-bold text-gray-900 mb-4">New Service Category</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g. Electrician"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Emoji Icon *</label>
                                <input
                                    type="text"
                                    value={newIcon}
                                    onChange={e => setNewIcon(e.target.value)}
                                    placeholder="e.g. ⚡"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F] text-2xl"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (₱) *</label>
                                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#00B14F]">
                                    <span className="px-3 text-gray-500 font-semibold">₱</span>
                                    <input
                                        type="number"
                                        value={newPrice}
                                        onChange={e => setNewPrice(e.target.value)}
                                        placeholder="200"
                                        className="flex-1 py-2.5 pr-3 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                <div className="flex gap-2 flex-wrap">
                                    {DEFAULT_COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setNewColor(c)}
                                            className={`w-7 h-7 rounded-full border-2 transition-all ${newColor === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleAdd}
                                disabled={saving || !newName.trim() || !newPrice}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] disabled:opacity-50 transition-all"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Save Service
                            </button>
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Services List */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-[#00B14F]" />
                    </div>
                ) : services.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                        <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-6">No service categories yet. Add one above or seed defaults.</p>
                        <button
                            onClick={handleSeed}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] disabled:opacity-50 transition-all mx-auto"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Seed Default Services
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {services.map(service => (
                            <div key={service.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {editingId === service.id ? (
                                    /* Edit Mode */
                                    <div className="p-5">
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Icon</label>
                                                <input
                                                    type="text"
                                                    value={editIcon}
                                                    onChange={e => setEditIcon(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F] text-xl"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Base Price (₱)</label>
                                                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#00B14F]">
                                                    <span className="px-2 text-gray-500 font-semibold">₱</span>
                                                    <input
                                                        type="number"
                                                        value={editPrice}
                                                        onChange={e => setEditPrice(e.target.value)}
                                                        className="flex-1 py-2 pr-2 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSaveEdit(service.id)}
                                                disabled={saving}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-[#00B14F] text-white rounded-xl text-sm font-semibold hover:bg-[#009940] disabled:opacity-50"
                                            >
                                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* View Mode */
                                    <div className="flex items-center gap-4 p-5">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                                            style={{ backgroundColor: service.color + '20' }}
                                            onClick={() => router.push(`/admin/providers?service=${encodeURIComponent(service.name)}`)}
                                        >
                                            {service.icon}
                                        </div>
                                        <div
                                            className="flex-1 cursor-pointer hover:opacity-70 transition-opacity"
                                            onClick={() => router.push(`/admin/providers?service=${encodeURIComponent(service.name)}`)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-gray-900">{service.name}</p>
                                                <span className="px-2 py-0.5 bg-violet-100 text-violet-600 text-xs font-bold rounded-full flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {providerCounts[service.name] || 0}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500">System rate per job</p>
                                        </div>
                                        <div className="text-right mr-4">
                                            <p className="text-2xl font-black text-[#00B14F]">₱{service.basePrice.toLocaleString()}</p>
                                            <p className="text-xs text-gray-400">Client pays ₱{(service.basePrice * 1.05).toFixed(0)} (incl. 5% fee)</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleStartEdit(service)}
                                                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service.id, service.name)}
                                                className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}


            </div>
        </AdminLayout>
    );
}
