"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    colors: typeof colors.dark;
}

export const colors = {
    dark: {
        bg: '#050209', // Deep dark space background
        text: '#F8FAFC',
        subtext: 'rgba(255,255,255,0.5)',
        cardBg: 'rgba(15, 10, 15, 0.4)', // Slightly transparent black/purple
        inputBg: 'rgba(255,255,255,0.02)',
        inputBorder: 'rgba(255,140,0,0.3)',
        inputFocus: 'rgba(255,140,0,0.8)',
        iconColor: 'rgba(255,255,255,0.5)',
        footerText: 'rgba(255,255,255,0.3)',
        glow: 'rgba(255,140,0,0.15)',
        logoText: 'linear-gradient(180deg, #FFFFFF 0%, #FF8C00 100%)',
        accent: '#FF8C00', // Orange primary color
        accentHover: '#E07B00',
        danger: '#EF4444',
        dangerBg: 'rgba(239,68,68,0.1)',
        success: '#10B981',
        sidebarBg: '#090510', // Dark Sidebar
        sidebarBorder: 'rgba(255,140,0,0.2)', // Orange border on sidebar
        headerBg: '#090510',
        folderActive: 'linear-gradient(90deg, rgba(255,140,0,0.25) 0%, transparent 100%)', // Orange side glow
        mailListBg: '#0A0512',
        mailListBorder: 'rgba(255,140,0,0.1)',
        mailItemHover: 'rgba(255,140,0,0.05)',
        mailItemActive: 'rgba(255,140,0,0.1)',
        mailDetailBg: '#050209'
    }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme: Theme = "dark";
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        // No-op for single mode
    };

    if (!mounted) {
        return null; // Or a loading spinner
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, colors: colors[theme] }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
