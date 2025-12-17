'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  BarChart3, 
  DollarSign,
  MessageSquare,
  Settings,
  Wrench,
  Bell,
  LogOut,
  Menu,
  X,
  Map
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/providers', icon: Users, label: 'Providers' },
  { href: '/admin/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/earnings', icon: DollarSign, label: 'Earnings' },
  { href: '/admin/messages', icon: MessageSquare, label: 'Messages' },
  { href: '/admin/map', icon: Map, label: 'Live Map' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r overflow-y-auto">
          <div className="flex items-center gap-2 px-6 py-5 border-b">
            <div className="w-10 h-10 bg-[#00B14F] rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900">GSS Admin</span>
              <p className="text-xs text-gray-500">Management Panel</p>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname === item.href
                    ? 'bg-[#00B14F] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold">
                  {user?.firstName?.[0] || 'A'}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <button 
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#00B14F] rounded-lg flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-bold">GSS Admin</span>
              </div>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <nav className="px-4 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                    pathname === item.href
                      ? 'bg-[#00B14F] text-white'
                      : 'text-gray-600'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-4">
            <button 
              className="lg:hidden p-2 text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Bell className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
