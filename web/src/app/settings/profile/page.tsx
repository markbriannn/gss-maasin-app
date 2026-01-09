'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import {
  ArrowLeft,
  User,
  Camera,
  Loader2,
  CheckCircle,
  MapPin,
  Navigation,
  Home,
  Flag,
  Mail,
  Phone,
  DollarSign,
  Tag,
  Award,
  Save,
  Sparkles,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

interface InteractiveMapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
}

const InteractiveMap: ComponentType<InteractiveMapProps> = dynamic(
  () => import('@/components/InteractiveMap'),
  { ssr: false, loading: () => <div className="h-[200px] bg-gray-100 rounded-2xl flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div> }
);

const MAASIN_BARANGAYS = [
  'Abgao', 'Asuncion', 'Bactul I', 'Bactul II', 'Badiang', 'Bagtican',
  'Basak', 'Bato I', 'Bato II', 'Baugo', 'Bilibol', 'Bogo', 'Cabadiangan',
  'Cagnituan', 'Cambooc', 'Cansirong', 'Canturing', 'Combado', 'Dongon',
  'Gawisan', 'Guadalupe', 'Hanginan', 'Ibarra', 'Isagani', 'Laboon',
  'Lanao', 'Lib-og', 'Libertad', 'Lico-an', 'Lonoy', 'Lunas', 'Mahayahay',
  'Malapoc Norte', 'Malapoc Sur', 'Mambajao', 'Manhilo', 'Mantahan',
  'Maria Clara', 'Matin-ao', 'Nasaug', 'Nati', 'Nonok Norte', 'Nonok Sur',
  'Panan-awan', 'Pansaan', 'Pasay', 'Pinascohan', 'Pob. District I',
  'Pob. District II', 'Pob. District III', 'San Agustin', 'San Isidro',
  'San Jose', 'San Rafael', 'Santa Cruz', 'Santa Rosa', 'Santo Rosario',
  'Soro-soro', 'Tagnipa', 'Tam-is', 'Tunga-tunga', 'Utod',
];

export default function EditProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [barangay, setBarangay] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [landmark, setLandmark] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [latitude, setLatitude] = useState(10.1335);
  const [longitude, setLongitude] = useState(124.8513);
  const [fixedPrice, setFixedPrice] = useState('');
  const [priceType, setPriceType] = useState('per_job');
  const [experience, setExperience] = useState('');

  const isProvider = user?.role === 'PROVIDER';

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phoneNumber || user.phone || '');
      setBio(user.bio || '');
      setStreetAddress(user.streetAddress || user.location?.streetAddress || '');
      setBarangay(user.barangay || user.location?.barangay || '');
      setHouseNumber(user.houseNumber || user.location?.houseNumber || '');
      setLandmark(user.landmark || user.location?.landmark || '');
      setProfilePhoto(user.profilePhoto || '');
      setLatitude(user.latitude || user.location?.latitude || 10.1335);
      setLongitude(user.longitude || user.location?.longitude || 124.8513);
      setFixedPrice(String(user.fixedPrice || user.hourlyRate || ''));
      setPriceType(user.priceType || 'per_job');
      setExperience(user.experience || '');
    }
  }, [user]);

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'gss_uploads');
      formData.append('folder', `profiles/${user.uid}`);
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dxhisrwl5';
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.secure_url) {
        setProfilePhoto(data.secure_url);
        await updateDoc(doc(db, 'users', user.uid), { profilePhoto: data.secure_url, photo: data.secure_url });
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported'); return; }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat);
        setLongitude(lng);
        await reverseGeocode(lat, lng);
        setLoadingLocation(false);
      },
      () => { alert('Could not get location'); setLoadingLocation(false); },
      { enableHighAccuracy: true }
    );
  };

  // Reverse geocode coordinates to get address details
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
      const data = await response.json();
      if (data.results?.length > 0) {
        let detectedBarangay = '', detectedStreet = '', detectedHouseNumber = '';
        for (const result of data.results) {
          for (const component of result.address_components) {
            if (component.types.includes('street_number')) detectedHouseNumber = detectedHouseNumber || component.long_name;
            if (component.types.includes('route')) detectedStreet = detectedStreet || component.long_name;
            const matchedBarangay = MAASIN_BARANGAYS.find((b) => component.long_name.toLowerCase().includes(b.toLowerCase()));
            if (matchedBarangay) detectedBarangay = matchedBarangay;
          }
        }
        if (detectedBarangay) setBarangay(detectedBarangay);
        if (detectedStreet && !detectedStreet.toLowerCase().includes('unnamed')) setStreetAddress(detectedStreet);
        if (detectedHouseNumber) setHouseNumber(detectedHouseNumber);
      }
    } catch (error) {
      console.log('Reverse geocoding error:', error);
    }
  };

  // Handle map marker drag - update coordinates and reverse geocode
  const handleLocationChange = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    await reverseGeocode(lat, lng);
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        firstName, lastName, phoneNumber: phone, phone, bio, streetAddress, barangay, houseNumber, landmark, latitude, longitude,
        location: { streetAddress, barangay, houseNumber, landmark, latitude, longitude },
        updatedAt: new Date(),
      };
      if (isProvider) {
        updateData.fixedPrice = parseFloat(fixedPrice) || 0;
        updateData.hourlyRate = parseFloat(fixedPrice) || 0;
        updateData.priceType = priceType;
        updateData.yearsExperience = experience;
        updateData.experience = experience;
      }
      await updateDoc(doc(db, 'users', user.uid), updateData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getFullAddress = () => {
    const parts = [];
    if (houseNumber) parts.push(houseNumber);
    if (streetAddress) parts.push(streetAddress);
    if (barangay) parts.push(`Brgy. ${barangay}`);
    parts.push('Maasin City');
    if (landmark) parts.push(`(Near ${landmark})`);
    return parts.join(', ');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 pb-8">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Edit Profile</h1>
                <p className="text-emerald-100 text-sm">Update your information</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                saved ? 'bg-white text-emerald-600' : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4">
        {/* Profile Photo Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-4">
          <div className="flex flex-col items-center">
            <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
            <button onClick={handlePhotoClick} disabled={uploadingPhoto} className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-emerald-100 shadow-lg">
                {uploadingPhoto ? (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  </div>
                ) : profilePhoto ? (
                  <Image src={profilePhoto} alt="" width={112} height={112} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <User className="w-14 h-14 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-9 h-9 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center text-white shadow-lg border-3 border-white group-hover:scale-110 transition-transform">
                <Camera className="w-4 h-4" />
              </div>
            </button>
            <button onClick={handlePhotoClick} disabled={uploadingPhoto} className="mt-3 text-emerald-600 text-sm font-semibold hover:text-emerald-700">
              {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>
        </div>

        {/* Personal Information Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-gray-900">Personal Information</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">First Name</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">Email</label>
              <div className="flex items-center px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-500">{user?.email || ''}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">Phone Number</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                <div className="px-4 py-3 bg-gray-50 border-r border-gray-200">
                  <Phone className="w-5 h-5 text-gray-400" />
                </div>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 9XX XXX XXXX"
                  className="flex-1 px-4 py-3 outline-none text-gray-900" />
              </div>
            </div>
          </div>
        </div>

        {/* Provider Pricing Card */}
        {isProvider && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900">Service Pricing</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Service Price (₱)</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                  <div className="px-4 py-3 bg-gray-50 border-r border-gray-200">
                    <span className="text-gray-500 font-semibold">₱</span>
                  </div>
                  <input type="number" value={fixedPrice} onChange={(e) => setFixedPrice(e.target.value)} placeholder="500"
                    className="flex-1 px-4 py-3 outline-none text-gray-900" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Price Type</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                  <div className="px-4 py-3 bg-gray-50 border-r border-gray-200">
                    <Tag className="w-5 h-5 text-gray-400" />
                  </div>
                  <select value={priceType} onChange={(e) => setPriceType(e.target.value)}
                    className="flex-1 px-4 py-3 outline-none text-gray-900 bg-transparent">
                    <option value="per_job">Per Job (fixed total)</option>
                    <option value="per_hire">Per Hire (per session)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Years of Experience</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                  <div className="px-4 py-3 bg-gray-50 border-r border-gray-200">
                    <Award className="w-5 h-5 text-gray-400" />
                  </div>
                  <input type="text" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g., 3"
                    className="flex-1 px-4 py-3 outline-none text-gray-900" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  Clients will see your price as <span className="font-bold">₱{fixedPrice || '0'} {priceType === 'per_job' ? 'per job' : 'per hire'}</span>. A 5% service fee is added at checkout.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Location Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="font-bold text-gray-900">Location</h3>
          </div>

          <button onClick={handleUseCurrentLocation} disabled={loadingLocation}
            className="w-full mb-4 py-3.5 border-2 border-dashed border-emerald-200 rounded-2xl flex items-center justify-center gap-2 text-emerald-600 font-semibold hover:border-emerald-400 hover:bg-emerald-50 transition-all disabled:opacity-50">
            {loadingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
            {loadingLocation ? 'Getting location...' : 'Use My Current Location'}
          </button>

          <div className="mb-4 rounded-2xl overflow-hidden border border-gray-200">
            <InteractiveMap latitude={latitude} longitude={longitude} onLocationChange={handleLocationChange} />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">Barangay</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                <div className="px-4 py-3 bg-gray-50 border-r border-gray-200">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <select value={barangay} onChange={(e) => setBarangay(e.target.value)}
                  className="flex-1 px-4 py-3 outline-none text-gray-900 bg-transparent">
                  <option value="">Select Barangay</option>
                  {MAASIN_BARANGAYS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">Street Address</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                <div className="px-4 py-3 bg-gray-50 border-r border-gray-200">
                  <Navigation className="w-5 h-5 text-gray-400" />
                </div>
                <input type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder="Street name"
                  className="flex-1 px-4 py-3 outline-none text-gray-900" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">House/Building Number</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                <div className="px-4 py-3 bg-gray-50 border-r border-gray-200">
                  <Home className="w-5 h-5 text-gray-400" />
                </div>
                <input type="text" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} placeholder="e.g., 123"
                  className="flex-1 px-4 py-3 outline-none text-gray-900" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">Nearby Landmark (Optional)</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                <div className="px-4 py-3 bg-gray-50 border-r border-gray-200">
                  <Flag className="w-5 h-5 text-gray-400" />
                </div>
                <input type="text" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near Maasin Cathedral"
                  className="flex-1 px-4 py-3 outline-none text-gray-900" />
              </div>
            </div>

            {(barangay || streetAddress) && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-700 font-medium">{getFullAddress()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-200 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
