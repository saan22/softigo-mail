"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "dark" | "light";

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
    },
    light: {
        bg: '#F8FAFC',
        text: '#1E293B',
        subtext: '#64748B',
        cardBg: '#FFFFFF',
        inputBg: '#FFFFFF',
        inputBorder: '#E2E8F0',
        inputFocus: '#FF8C00',
        iconColor: '#94A3B8',
        footerText: '#94A3B8',
        glow: 'rgba(255,140,0,0.1)',
        logoText: 'linear-gradient(180deg, #1E293B 0%, #FF8C00 100%)',
        accent: '#FF8C00',
        accentHover: '#E07B00',
        danger: '#EF4444',
        dangerBg: 'rgba(239,68,68,0.1)',
        success: '#10B981',
        sidebarBg: '#F1F5F9', // Light Sidebar
        sidebarBorder: '#E2E8F0',
        headerBg: '#FFFFFF',
        folderActive: 'linear-gradient(90deg, rgba(255,140,0,0.15) 0%, transparent 100%)',
        mailListBg: '#FFFFFF',
        mailListBorder: '#E2E8F0',
        mailItemHover: '#F8FAFC',
        mailItemActive: 'rgba(255,140,0,0.08)',
        mailDetailBg: '#FFFFFF'
    }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Check local storage on mount
        const savedTheme = localStorage.getItem("softigo_theme") as Theme;
        if (savedTheme && (savedTheme === "dark" || savedTheme === "light")) {
            setTheme(savedTheme);
        } else {
            // Check system preference if no saved theme
            const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
            if (prefersLight) setTheme("light");
        }
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        setTheme(prev => {
            const nextTheme = prev === "dark" ? "light" : "dark";
            localStorage.setItem("softigo_theme", nextTheme);
            return nextTheme;
        });
    };

    if (!mounted) {
        return <div style={{ minHeight: '100vh', backgroundColor: '#050209' }} />; // prevent flash of incorrect theme
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
