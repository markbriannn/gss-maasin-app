'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';

export default function ServiceReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const receiptRef = useRef<HTMLDivElement>(null);

  const [booking, setBooking] = useState<any>(null);
  const [otherParty, setOtherParty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingId) fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
      if (bookingDoc.exists()) {
        const data = { id: bookingDoc.id, ...bookingDoc.data() } as any;
        setBooking(data);

        // Fetch provider info
        if ((data as any).providerId) {
          const providerDoc = await getDoc(doc(db, 'users', data.providerId));
          if (providerDoc.exists()) {
            const p = providerDoc.data();
            setOtherParty({
              id: providerDoc.id,
              name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Provider',
              photo: p.profilePhoto,
              rating: p.rating || p.averageRating || 0,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleShare = async () => {
    const receiptText = `
GSS Maasin Service Receipt
--------------------------
Receipt #: ${booking?.id?.slice(-8).toUpperCase() || 'N/A'}
Date: ${formatDate(booking?.completedAt || booking?.createdAt)}
Service: ${booking?.serviceCategory || 'Service'}
Provider: ${otherParty?.name || 'N/A'}
Location: ${booking?.streetAddress ? `${booking.streetAddress}, ${booking.barangay}` : booking?.location || 'N/A'}
--------------------------
Total: ₱${(booking?.finalAmount || booking?.providerPrice || booking?.totalAmount || 0).toLocaleString()}
Thank you for using GSS Maasin!
    `.trim();

    if (navigator.share) {
      await navigator.share({ title: 'Service Receipt', text: receiptText });
    } else {
      await navigator.clipboard.writeText(receiptText);
      alert('Receipt copied to clipboard!');
    }
  };

  const handleDownloadPDF = () => {
    // Create a new window with just the receipt content for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download the receipt');
      return;
    }

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GSS Maasin Receipt - ${booking?.id?.slice(-8).toUpperCase()}</title>
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
          .provider { display: flex; align-items: center; gap: 12px; }
          .provider-avatar { width: 48px; height: 48px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .provider-avatar img { width: 100%; height: 100%; object-fit: cover; }
          .provider-avatar span { font-size: 18px; font-weight: bold; color: #9ca3af; }
          .provider-info { flex: 1; }
          .provider-name { font-weight: 500; color: #1f2937; }
          .provider-role { font-size: 13px; color: #6b7280; }
          .total-section { background: #f9fafb; padding: 20px; margin: 0 -40px; }
          .total { display: flex; justify-content: space-between; align-items: center; }
          .total .label { font-size: 18px; font-weight: 600; color: #1f2937; }
          .total .value { font-size: 28px; font-weight: bold; color: #22c55e; }
          .footer { text-align: center; padding: 20px 0; color: #9ca3af; font-size: 12px; }
          .footer p { margin-bottom: 4px; }
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
          <p>Service Receipt</p>
        </div>
        
        <div class="status">
          <span>${booking?.status?.charAt(0).toUpperCase()}${booking?.status?.slice(1) || 'Unknown'}</span>
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
          ${booking?.scheduledTime ? `<div class="row"><span class="label">Time</span><span class="value">${booking.scheduledTime}</span></div>` : ''}
        </div>
        
        <div class="section">
          <div class="section-title">Service Provider</div>
          <div class="provider">
            <div class="provider-avatar">
              ${otherParty?.photo ? `<img src="${otherParty.photo}" alt="" />` : `<span>${otherParty?.name?.charAt(0) || '?'}</span>`}
            </div>
            <div class="provider-info">
              <div class="provider-name">${otherParty?.name || 'Unknown'}</div>
              <div class="provider-role">Provider</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Service Location</div>
          <p style="color: #374151;">${booking?.streetAddress ? `${booking.streetAddress}, ${booking.barangay}` : booking?.location || 'N/A'}</p>
        </div>
        
        <div class="section">
          <div class="section-title">Payment Details</div>
          <div class="row">
            <span class="label">Service Fee</span>
            <span class="value">₱${baseAmount.toLocaleString()}</span>
          </div>
          ${approvedCharges.length > 0 ? approvedCharges.map((charge: any) => `
            <div class="row">
              <span class="label">${charge.reason || 'Additional'}</span>
              <span class="value">₱${(charge.amount || 0).toLocaleString()}</span>
            </div>
          `).join('') : ''}
          ${discount > 0 ? `<div class="row"><span class="label" style="color: #22c55e;">Discount</span><span class="value" style="color: #22c55e;">-₱${discount.toLocaleString()}</span></div>` : ''}
        </div>
        
        <div class="total-section">
          <div class="total">
            <span class="label">Total Paid</span>
            <span class="value">₱${finalTotal.toLocaleString()}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Receipt #${booking?.id?.slice(-8).toUpperCase()}</p>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
          <p style="margin-top: 10px;">Thank you for using GSS Maasin!</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
        </div>
      </ClientLayout>
    );
  }

  if (!booking) {
    return (
      <ClientLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Receipt not found</p>
          <button onClick={() => router.back()} className="mt-4 text-green-600 hover:underline">Go Back</button>
        </div>
      </ClientLayout>
    );
  }

  const baseAmount = booking.providerPrice || booking.offeredPrice || booking.totalAmount || booking.price || 0;
  const additionalCharges = booking.additionalCharges || [];
  const approvedCharges = additionalCharges.filter((c: any) => c.status === 'approved');
  const additionalTotal = approvedCharges.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const discount = booking.discount || 0;
  const finalTotal = booking.finalAmount || (baseAmount + additionalTotal - discount);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <ClientLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Service Receipt</h1>
          <button onClick={handleShare} className="p-2 hover:bg-gray-100 rounded-full">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* Receipt Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Logo Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center text-white">
            <div className="w-16 h-16 bg-white rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-2xl font-bold text-green-600">G</span>
            </div>
            <h2 className="text-xl font-bold">GSS Maasin</h2>
            <p className="text-sm opacity-90">Service Receipt</p>
          </div>

          {/* Status */}
          <div className="p-4 border-b border-gray-100 flex justify-center">
            <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
              {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'Unknown'}
            </span>
          </div>

          {/* Service Details */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">SERVICE DETAILS</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Service</span>
                <span className="font-medium text-gray-900">{booking.serviceCategory || 'Service'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span className="font-medium text-gray-900">{booking.scheduledDate || formatDate(booking.completedAt || booking.createdAt)}</span>
              </div>
              {booking.scheduledTime && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Time</span>
                  <span className="font-medium text-gray-900">{booking.scheduledTime}</span>
                </div>
              )}
            </div>
          </div>

          {/* Provider */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">SERVICE PROVIDER</h3>
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {otherParty?.photo ? (
                  <img src={otherParty.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-gray-400">{otherParty?.name?.charAt(0) || '?'}</span>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="font-medium text-gray-900">{otherParty?.name || 'Unknown'}</p>
                <p className="text-sm text-gray-500">Provider</p>
              </div>
              {otherParty?.rating > 0 && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="ml-1 text-sm font-medium">{otherParty.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">SERVICE LOCATION</h3>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="ml-2 text-gray-700">
                {booking.streetAddress ? `${booking.streetAddress}, ${booking.barangay}` : booking.location || 'N/A'}
              </p>
            </div>
          </div>

          {/* Payment Details */}
          <div className="p-6 border-b border-dashed border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">PAYMENT DETAILS</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Service Fee</span>
                <span className="text-gray-900">₱{baseAmount.toLocaleString()}</span>
              </div>
              {approvedCharges.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Additional Charges</p>
                  {approvedCharges.map((charge: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-500">{charge.reason || 'Additional'}</span>
                      <span className="text-gray-700">₱{(charge.amount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-₱{discount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="p-6 bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total Paid</span>
              <span className="text-2xl font-bold text-green-600">₱{finalTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Review Section */}
          {booking.status === 'completed' && (booking.rating || booking.review) && (
            <div className="p-6 border-t border-gray-100">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="ml-2 font-medium text-gray-900">Your Review</span>
              </div>
              {booking.rating && (
                <div className="flex mb-2">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className={`w-5 h-5 ${i <= booking.rating ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
              )}
              {booking.review && <p className="text-gray-600 italic">"{booking.review}"</p>}
            </div>
          )}

          {/* Footer */}
          <div className="p-6 bg-gray-50 text-center border-t border-gray-100">
            <p className="text-xs text-gray-500">Receipt #{booking.id?.slice(-8).toUpperCase()}</p>
            <p className="text-xs text-gray-400 mt-1">Generated on {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={handleDownloadPDF}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </button>
          {booking.status === 'completed' && (
            <button
              onClick={() => router.push(`/client/providers/${booking.providerId}`)}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Book Again
            </button>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
