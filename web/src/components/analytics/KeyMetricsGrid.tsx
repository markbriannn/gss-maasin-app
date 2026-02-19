'use client';

import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon: string;
}

function MetricCard({ title, value, change, subtitle, icon }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-600">{title}</h4>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      {change !== undefined && (
        <div className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          <span className="mr-1">{isPositive ? '▲' : '▼'}</span>
          {Math.abs(change).toFixed(1)}%
        </div>
      )}
      {subtitle && (
        <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

interface KeyMetricsGridProps {
  totalJobs: number;
  jobsChange: number;
  activeClients: number;
  activeProviders: number;
  avgResponseTime: number;
  responseTimeChange: number;
}

export default function KeyMetricsGrid({
  totalJobs,
  jobsChange,
  activeClients,
  activeProviders,
  avgResponseTime,
  responseTimeChange,
}: KeyMetricsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricCard
        title="Total Jobs"
        value={totalJobs}
        change={jobsChange}
        icon="📋"
      />
      <MetricCard
        title="Active Users"
        value={activeClients}
        subtitle={`${activeProviders} providers`}
        icon="👥"
      />
      <MetricCard
        title="Avg Response Time"
        value={`${avgResponseTime} min`}
        change={-responseTimeChange} // Negative is good for response time
        icon="⏱️"
      />
    </div>
  );
}
