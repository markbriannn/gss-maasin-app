'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeColors {
    primary: string;
    secondary: string;
    background: string;
    card: string;
    surface: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    notification: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
}

interface Theme {
    dark: boolean;
    colors: ThemeColors;
}

interface ThemeContextType {
    theme: Theme;
    isDark: boolean;
    toggleTheme: () => void;
}

const lightTheme: Theme = {
    dark: false,
    colors: {
        primary: '#00B14F',
        secondary: '#1E3A8A',
        background: '#FFFFFF',
        card: '#FFFFFF',
        surface: '#FFFFFF',
        text: '#1F2937',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        border: '#E5E7EB',
        notification: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
    },
};

const darkTheme: Theme = {
    dark: true,
    colors: {
        primary: '#00B14F',
        secondary: '#3B82F6',
        background: '#111827',
        card: '#1F2937',
        surface: '#1F2937',
        text: '#F9FAFB',
        textSecondary: '#9CA3AF',
        textTertiary: '#6B7280',
        border: '#374151',
        notification: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
    },
};

const ThemeContext = createContext<ThemeContextType>({
    theme: lightTheme,
    isDark: false,
    toggleTheme: () => { },
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Always use light mode — dark mode disabled
    useEffect(() => {
        document.documentElement.classList.remove('dark');
        localStorage.removeItem('themePreference');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme: lightTheme, isDark: false, toggleTheme: () => { } }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
