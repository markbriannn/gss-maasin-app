'use client';

import React from 'react';

interface Provider {
  id: string;
  name: string;
  rating: number;
  jobs: number;
  earnings: number;
  photoURL?: string;
}

interface ProviderLeaderboardProps {
  providers: Provider[];
}

export default function ProviderLeaderboard({ providers }: ProviderLeaderboardProps) {
  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">⭐ Provider Performance</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">#</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Provider</th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Rating</th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Jobs</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Earnings</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider, index) => (
              <tr 
                key={provider.id} 
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-2">
                  <span className="text-2xl">{getMedalEmoji(index)}</span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center">
                    {provider.photoURL ? (
                      <img 
                        src={provider.photoURL} 
                        alt={provider.name}
                        className="w-10 h-10 rounded-full mr-3 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                        <span className="text-emerald-600 font-semibold">
                          {provider.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{provider.name}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    {provider.rating.toFixed(1)} ⭐
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-gray-900 font-medium">{provider.jobs} jobs</span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-emerald-600 font-semibold">
                    ₱{provider.earnings.toLocaleString('en-PH')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
