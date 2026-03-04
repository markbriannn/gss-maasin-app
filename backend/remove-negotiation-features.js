/**
 * Script to identify all negotiation-related code that needs to be removed
 * Run: node backend/remove-negotiation-features.js
 */

console.log('Files with negotiation features to clean:');
console.log('\nWEB:');
console.log('- web/src/app/provider/jobs/page.tsx');
console.log('- web/src/components/layouts/AdminLayout.tsx');
console.log('- web/src/components/layouts/ProviderLayout.tsx');
console.log('- web/src/components/layouts/ClientLayout.tsx');
console.log('- web/src/components/ToastNotification.tsx');
console.log('- web/src/components/NotificationDropdown.tsx');
console.log('- web/src/app/provider/page.tsx');
console.log('\nMOBILE:');
console.log('- src/screens/client/JobDetailsScreen.jsx');
console.log('\nSearch terms to remove:');
console.log('- pending_negotiation');
console.log('- counter_offer');
console.log('- isNegotiable');
console.log('- offeredPrice');
console.log('- counterOfferPrice');
console.log('- priceNote');
console.log('- counterOfferNote');
