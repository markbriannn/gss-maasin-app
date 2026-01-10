'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';

export default function ProviderReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;

    // Real-time listener for booking data
    const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), async (docSnap) => {
      if (docSnap.exists()) {
        const bookingData = docSnap.data();
        const data = { id: docSnap.id, ...bookingData };
        setBooking(data);
        
        if (bookingData.clientId) {
          try {
            const clientDoc = await getDoc(doc(db, 'users', bookingData.clientId));
            if (clientDoc.exists()) {
              const c = clientDoc.data();
              setClient({ id: clientDoc.id, name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Client', photo: c.profilePhoto });
            }
          } catch (e) {
            console.error('Error fetching client:', e);
          }
        }
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching booking:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [bookingId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download the receipt');
      return;
    }

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GSS Maasin Earnings Receipt - ${booking?.id?.slice(-8).toUpperCase()}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; padding: 30px 0; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border-radius: 12px 12px 0 0; margin: -40px -40px 0 -40px; padding: 40px; }
          .logo { width: 60px; height: 60px; background: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; }
          .logo span { font-size: 28px; font-weight: bold; color: #22c55e; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { opacity: 0.9; font-size: 14px; }
          .status { text-align: center; padding: 15px; border-bottom: 1px solid #e5e7eb; }
          .status span { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; background: #dcfce7; color: #166534; }
          .section { padding: 20px 0; border-bottom: 1px solid #e5e7eb; }
          .section-title { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 12px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .row .label { color: #6b7280; }
          .row .value { font-weight: 500; color: #1f2937; }
          .client { display: flex; align-items: center; gap: 12px; }
          .client-avatar { width: 48px; height: 48px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .client-avatar img { width: 100%; height: 100%; object-fit: cover; }
          .client-avatar span { font-size: 18px; font-weight: bold; color: #9ca3af; }
          .client-info { flex: 1; }
          .client-name { font-weight: 500; color: #1f2937; }
          .client-role { font-size: 13px; color: #6b7280; }
          .total-section { background: #f0fdf4; padding: 20px; margin: 0 -40px; }
          .total { display: flex; justify-content: space-between; align-items: center; }
          .total .label { font-size: 18px; font-weight: 600; color: #1f2937; }
          .total .value { font-size: 28px; font-weight: bold; color: #22c55e; }
          .footer { text-align: center; padding: 20px 0; color: #9ca3af; font-size: 12px; }
          .footer p { margin-bottom: 4px; }
          .fee { color: #ef4444; }
          @media print {
            body { padding: 20px; }
            .header { margin: -20px -20px 0 -20px; padding: 30px; }
            .total-section { margin: 0 -20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo"><span>G</span></div>
          <h1>GSS Maasin</h1>
          <p>Earnings Receipt</p>
        </div>
        
        <div class="status">
          <span>${booking?.status === 'payment_received' ? 'Completed' : booking?.status?.charAt(0).toUpperCase() + booking?.status?.slice(1)}</span>
        </div>
        
        <div class="section">
          <div class="section-title">Service Details</div>
          <div class="row">
            <span class="label">Service</span>
            <span class="value">${booking?.serviceCategory || 'Service'}</span>
          </div>
          <div class="row">
            <span class="label">Date</span>
            <span class="value">${booking?.scheduledDate || formatDate(booking?.completedAt || booking?.createdAt)}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Client</div>
          <div class="client">
            <div class="client-avatar">
              ${client?.photo ? `<img src="${client.photo}" alt="" />` : `<span>${client?.name?.charAt(0) || '?'}</span>`}
            </div>
            <div class="client-info">
              <div class="client-name">${client?.name || 'Unknown'}</div>
              <div class="client-role">Client</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Earnings Breakdown</div>
          <div class="row">
            <span class="label">Service Fee</span>
            <span class="value">₱${baseAmount.toLocaleString()}</span>
          </div>
          ${approvedCharges.length > 0 ? approvedCharges.map((charge: any) => `
            <div class="row">
              <span class="label">${charge.reason || 'Additional'}</span>
              <span class="value">+₱${(charge.amount || 0).toLocaleString()}</span>
            </div>
          `).join('') : ''}
          <div class="row">
            <span class="label">System Fee (5%)</span>
            <span class="value fee">-₱${systemFee.toLocaleString()}</span>
          </div>
        </div>
        
        <div class="total-section">
          <div class="total">
            <span class="label">Your Earnings</span>
            <span class="value">₱${earnings.toLocaleString()}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Receipt #${booking?.id?.slice(-8).toUpperCase()}</p>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
          <p style="margin-top: 10px;">Thank you for being a GSS Maasin provider!</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  if (loading) {
    return <ProviderLayout><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div></div></ProviderLayout>;
  }

  if (!booking) {
    return <ProviderLayout><div className="text-center py-12"><p className="text-gray-500">Receipt not found</p></div></ProviderLayout>;
  }

  const baseAmount = booking.providerPrice || booking.offeredPrice || booking.totalAmount || booking.price || 0;
  const additionalCharges = booking.additionalCharges || [];
  const approvedCharges = additionalCharges.filter((c: any) => c.status === 'approved');
  const additionalTotal = approvedCharges.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const subtotal = baseAmount + additionalTotal;
  const systemFee = booking.systemFee || Math.round(subtotal * 0.05);
  const earnings = subtotal - systemFee;

  const getStatusColor = (status: string) => {
    if (['completed', 'payment_received'].includes(status)) return 'bg-green-100 text-green-700';
    if (['cancelled', 'rejected'].includes(status)) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <ProviderLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Earnings Receipt</h1>
          <div className="w-10"></div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center text-white">
            <div className="w-16 h-16 bg-white rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-2xl font-bold text-green-600">G</span>
            </div>
            <h2 className="text-xl font-bold">GSS Maasin</h2>
            <p className="text-sm opacity-90">Earnings Receipt</p>
          </div>

          <div className="p-4 border-b border-gray-100 flex justify-center">
            <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
              {booking.status === 'payment_received' ? 'Completed' : booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
            </span>
          </div>

          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">SERVICE DETAILS</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-gray-600">Service</span><span className="font-medium text-gray-900">{booking.serviceCategory || 'Service'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Date</span><span className="font-medium text-gray-900">{booking.scheduledDate || formatDate(booking.completedAt || booking.createdAt)}</span></div>
            </div>
          </div>

          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">CLIENT</h3>
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {client?.photo ? <img src={client.photo} alt="" className="w-full h-full object-cover" /> : <span className="text-lg font-bold text-gray-400">{client?.name?.charAt(0) || '?'}</span>}
              </div>
              <div className="ml-3"><p className="font-medium text-gray-900">{client?.name || 'Unknown'}</p><p className="text-sm text-gray-500">Client</p></div>
            </div>
          </div>

          <div className="p-6 border-b border-dashed border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">EARNINGS BREAKDOWN</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-gray-600">Service Fee</span><span className="text-gray-900">₱{baseAmount.toLocaleString()}</span></div>
              {approvedCharges.length > 0 && approvedCharges.map((charge: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm"><span className="text-gray-500">{charge.reason || 'Additional'}</span><span className="text-gray-700">+₱{(charge.amount || 0).toLocaleString()}</span></div>
              ))}
              <div className="flex justify-between text-red-600"><span>System Fee (5%)</span><span>-₱{systemFee.toLocaleString()}</span></div>
            </div>
          </div>

          <div className="p-6 bg-green-50">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Your Earnings</span>
              <span className="text-2xl font-bold text-green-600">₱{earnings.toLocaleString()}</span>
            </div>
          </div>

          <div className="p-6 bg-gray-50 text-center border-t border-gray-100">
            <p className="text-xs text-gray-500">Receipt #{booking.id?.slice(-8).toUpperCase()}</p>
            <p className="text-xs text-gray-400 mt-1">Generated on {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="mt-6">
          <button onClick={handleDownloadPDF} className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download PDF
          </button>
        </div>
      </div>
    </ProviderLayout>
  );
}
