'use client';

import React from 'react';

interface RevenueOverviewCardProps {
  currentRevenue: number;
  percentageChange: number;
  weeklyChange: number;
}

export default function RevenueOverviewCard({
  currentRevenue,
  percentageChange,
  weeklyChange,
}: RevenueOverviewCardProps) {
  const isPositive = percentageChange >= 0;
  const isWeeklyPositive = weeklyChange >= 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">💰 Revenue This Month</h3>
      </div>
      
      <div className="space-y-3">
        <div className="text-4xl font-bold text-gray-900">
          ₱{currentRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </div>
        
        <div className="flex flex-col space-y-1">
          <div className={`flex items-center text-sm font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <span className="mr-1">{isPositive ? '▲' : '▼'}</span>
            <span>{Math.abs(percentageChange).toFixed(1)}% from last month</span>
          </div>
          
          <div className={`flex items-center text-sm font-medium ${
            isWeeklyPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <span className="mr-1">{isWeeklyPositive ? '▲' : '▼'}</span>
            <span>{Math.abs(weeklyChange).toFixed(1)}% from last week</span>
          </div>
        </div>
      </div>
    </div>
  );
}
