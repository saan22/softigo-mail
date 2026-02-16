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
        bg: '#0A0E1A',
        text: '#F8FAFC',
        subtext: 'rgba(255,255,255,0.4)',
        cardBg: 'rgba(15,22,35,0.8)',
        inputBg: 'rgba(0,0,0,0.3)',
        inputBorder: 'rgba(255,255,255,0.1)',
        inputFocus: 'rgba(59,130,246,0.5)',
        iconColor: 'rgba(255,255,255,0.2)',
        footerText: 'rgba(255,255,255,0.2)',
        glow: 'rgba(59,130,246,0.1)',
        logoText: 'linear-gradient(180deg, #FFFFFF 0%, #94A3B8 100%)',
        accent: '#3B82F6',
        accentHover: '#1D4ED8',
        danger: '#EF4444',
        dangerBg: 'rgba(239,68,68,0.1)',
        success: '#10B981',
        sidebarBg: '#0F1623',
        sidebarBorder: 'rgba(255,255,255,0.05)',
        headerBg: '#0F1623',
        folderActive: 'rgba(59,130,246,0.1)',
        mailListBg: '#0A0E1A',
        mailListBorder: 'rgba(255,255,255,0.05)',
        mailItemHover: 'rgba(255,255,255,0.02)',
        mailItemActive: 'rgba(59,130,246,0.05)',
        mailDetailBg: '#0A0E1A'
    },
    light: {
        bg: '#FDFBF7', // Warmer, straw-like color
        text: '#1E293B',
        subtext: 'rgba(30,41,59,0.5)',
        cardBg: 'rgba(255,255,255,0.9)',
        inputBg: '#FFFFFF',
        inputBorder: 'rgba(0,0,0,0.1)',
        inputFocus: 'rgba(37,99,235,0.5)',
        iconColor: 'rgba(30,41,59,0.3)',
        footerText: 'rgba(30,41,59,0.4)',
        glow: 'rgba(37,99,235,0.05)',
        logoText: 'linear-gradient(180deg, #1E293B 0%, #000000 100%)', // Darker, more visible
        accent: '#2563EB',
        accentHover: '#1D4ED8',
        danger: '#DC2626',
        dangerBg: 'rgba(220,38,38,0.1)',
        success: '#059669',
        sidebarBg: '#FDFBF7', // Match bg
        sidebarBorder: 'rgba(0,0,0,0.05)',
        headerBg: '#FDFBF7', // Match bg
        folderActive: 'rgba(37,99,235,0.1)',
        mailListBg: '#F8FAFC',
        mailListBorder: 'rgba(0,0,0,0.05)',
        mailItemHover: 'rgba(0,0,0,0.02)',
        mailItemActive: 'rgba(37,99,235,0.05)',
        mailDetailBg: '#F1F5F9'
    }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const storedTheme = localStorage.getItem("softigo_theme") as Theme;
        if (storedTheme) {
            setTheme(storedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            setTheme("light");
        }
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        localStorage.setItem("softigo_theme", newTheme);
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
