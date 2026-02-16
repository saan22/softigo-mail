"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Shield, Settings, Server, Hash, Sun, Moon, MapPin, Cloud, ShieldCheck, CheckCircle2, ChevronRight, Phone } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function LoginPage() {
    const router = useRouter();
    const { theme, toggleTheme, colors } = useTheme();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [credentials, setCredentials] = useState({
        email: "",
        password: ""
    });

    // Mobile Support
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    // Advanced Settings State
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [serverConfig, setServerConfig] = useState({
        host: "",
        port: "993",
        secure: true
    });

    useEffect(() => {
        const token = localStorage.getItem("softigo_token");
        if (token) {
            router.push("/dashboard");
        }
    }, [router]);

    // Auto-fill host based on email
    useEffect(() => {
        if (!showAdvanced && credentials.email.includes('@')) {
            const domain = credentials.email.split('@')[1];
            setServerConfig(prev => ({ ...prev, host: `mail.${domain}` }));
        }
    }, [credentials.email, showAdvanced]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Determine host/port
            let imapHost = serverConfig.host;
            let imapPort = parseInt(serverConfig.port);

            if (!showAdvanced) {
                const emailDomain = credentials.email.split('@')[1];
                if (!emailDomain) {
                    throw new Error("Geçersiz e-posta adresi");
                }

                // Dynamic host detection
                imapHost = `mail.${emailDomain}`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: credentials.email,
                    password: credentials.password,
                    host: imapHost,
                    port: imapPort,
                    secure: serverConfig.secure
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await response.json();

            if (data.success) {
                localStorage.setItem("softigo_token", data.token);
                localStorage.setItem("softigo_user", credentials.email);
                router.push("/dashboard");
            } else {
                setError(data.message || "Giriş başarısız. Bilgilerinizi kontrol edin.");
                setLoading(false);
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                setError("Bağlantı zaman aşımına uğradı. Sunucu yanıt vermiyor.");
            } else if (err.message === "Geçersiz e-posta adresi") {
                setError("Lütfen geçerli bir e-posta adresi girin.");
            } else {
                setError("Sisteme bağlanılamıyor. Lütfen internetinizi veya sunucuyu kontrol edin.");
            }
            setLoading(false);
        }
    };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: theme === 'dark'
                ? 'radial-gradient(circle at 50% 50%, #1a2a4a 0%, #0a0e1a 100%)'
                : 'radial-gradient(circle at 50% 50%, #f0f4f8 0%, #d1d5db 100%)',
            color: colors.text,
            position: 'relative',
            overflow: 'hidden',
            transition: 'background-color 0.3s ease, color 0.3s ease'
        }}>
            {/* Nebula / Galaxy Effect Overlay */}
            {theme === 'dark' && (
                <>
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(249, 115, 22, 0.1) 0%, transparent 40%)',
                        pointerEvents: 'none',
                        zIndex: 1
                    }} />
                    {/* Stars */}
                    {[...Array(50)].map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            width: `${Math.random() * 2}px`,
                            height: `${Math.random() * 2}px`,
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            opacity: Math.random() * 0.5 + 0.2,
                            animation: `twinkle ${Math.random() * 3 + 2}s infinite alternate`,
                            zIndex: 1
                        }} />
                    ))}
                </>
            )}
            {/* Theme Toggle Button */}
            <button
                onClick={toggleTheme}
                style={{
                    position: 'absolute',
                    top: '24px',
                    right: '24px',
                    zIndex: 20,
                    padding: '10px',
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    borderRadius: '50%',
                    border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    color: colors.text,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Background Gradient */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '600px',
                height: '600px',
                background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
                pointerEvents: 'none'
            }} />

            {/* Login Container */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                maxWidth: '440px',
                padding: '0 24px'
            }}>
                {/* Logo Section */}
                <div style={{ textAlign: 'center', marginBottom: '16px', marginTop: '40px' }}>
                    <div style={{ marginBottom: '0px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                            src="/logo.png"
                            alt="Softigo Logo"
                            style={{
                                height: isMobile ? '160px' : '240px',
                                width: 'auto',
                                filter: theme === 'dark'
                                    ? 'drop-shadow(0 0 40px rgba(59,130,246,0.6))'
                                    : 'drop-shadow(0 2px 10px rgba(0,0,0,0.1))',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </div>
                </div>

                {/* Login Form */}
                <div style={{
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(40px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    borderRadius: '24px',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden'
                }}>
                    {/* Top Glow */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)'
                    }} />

                    <form onSubmit={handleSubmit} style={{ padding: isMobile ? '24px' : '40px' }}>
                        {/* Error Message */}
                        {error && (
                            <div style={{
                                backgroundColor: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                padding: '12px 16px',
                                marginBottom: '24px',
                                borderRadius: '4px'
                            }}>
                                <p style={{
                                    color: '#EF4444',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    textAlign: 'center'
                                }}>
                                    {error}
                                </p>
                            </div>
                        )}

                        {/* Email Field */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '11px',
                                color: 'rgba(255,255,255,0.5)',
                                textTransform: 'uppercase',
                                letterSpacing: '1.5px',
                                marginBottom: '10px',
                                fontWeight: 700
                            }}>
                                E-Posta Adresi
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{
                                    position: 'absolute',
                                    left: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'rgba(255,255,255,0.3)'
                                }} />
                                <input
                                    type="email"
                                    required
                                    style={{
                                        width: '100%',
                                        backgroundColor: 'rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        padding: '16px 16px 16px 48px',
                                        color: 'white',
                                        fontSize: '14px',
                                        transition: 'all 0.2s',
                                        outline: 'none'
                                    }}
                                    placeholder="info@softigo.com.tr"
                                    value={credentials.email}
                                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                    onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div style={{ marginBottom: '32px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '11px',
                                color: 'rgba(255,255,255,0.5)',
                                textTransform: 'uppercase',
                                letterSpacing: '1.5px',
                                marginBottom: '10px',
                                fontWeight: 700
                            }}>
                                Şifre
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{
                                    position: 'absolute',
                                    left: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'rgba(255,255,255,0.3)'
                                }} />
                                <input
                                    type="password"
                                    required
                                    style={{
                                        width: '100%',
                                        backgroundColor: 'rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        padding: '16px 16px 16px 48px',
                                        color: 'white',
                                        fontSize: '14px',
                                        transition: 'all 0.2s',
                                        outline: 'none'
                                    }}
                                    placeholder="••••••••"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                    onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                        </div>

                        {/* Advanced Settings Toggle */}
                        <div style={{ marginBottom: '24px' }}>
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(59,130,246,0.8)',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Settings size={14} />
                                {showAdvanced ? 'Gelişmiş Ayarları Gizle' : 'Gelişmiş Ayarlar (Host/Port)'}
                            </button>

                            {/* Advanced Fields */}
                            {showAdvanced && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '16px',
                                    backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                                    border: `1px solid ${colors.inputBorder}`,
                                    borderRadius: '4px'
                                }}>
                                    {/* Host */}
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '10px', color: colors.subtext, marginBottom: '6px', textTransform: 'uppercase' }}>IMAP Sunucusu</label>
                                        <div style={{ position: 'relative' }}>
                                            <Server size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.iconColor }} />
                                            <input
                                                type="text"
                                                value={serverConfig.host}
                                                onChange={(e) => setServerConfig({ ...serverConfig, host: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    backgroundColor: colors.inputBg,
                                                    border: `1px solid ${colors.inputBorder}`,
                                                    padding: '10px 12px 10px 36px',
                                                    color: colors.text,
                                                    fontSize: '13px'
                                                }}
                                                placeholder="mail.example.com"
                                            />
                                        </div>
                                    </div>

                                    {/* Port */}
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '10px', color: colors.subtext, marginBottom: '6px', textTransform: 'uppercase' }}>Port</label>
                                            <div style={{ position: 'relative' }}>
                                                <Hash size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.iconColor }} />
                                                <input
                                                    type="number"
                                                    value={serverConfig.port}
                                                    onChange={(e) => setServerConfig({ ...serverConfig, port: e.target.value })}
                                                    style={{
                                                        width: '100%',
                                                        backgroundColor: colors.inputBg,
                                                        border: `1px solid ${colors.inputBorder}`,
                                                        padding: '10px 12px 10px 36px',
                                                        color: colors.text,
                                                        fontSize: '13px'
                                                    }}
                                                    placeholder="993"
                                                />
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: colors.text }}>
                                                <input
                                                    type="checkbox"
                                                    checked={serverConfig.secure}
                                                    onChange={(e) => setServerConfig({ ...serverConfig, secure: e.target.checked })}
                                                    style={{ width: '16px', height: '16px' }}
                                                />
                                                SSL / TLS
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                height: '56px',
                                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 700,
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                transition: 'all 0.3s ease',
                                opacity: loading ? 0.6 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 10px 25px -5px rgba(59,130,246,0.5)',
                                border: 'none',
                                outline: 'none'
                            }}
                            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {loading ? (
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    border: '3px solid rgba(255,255,255,0.3)',
                                    borderTopColor: 'white',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                            ) : (
                                <>
                                    <Lock size={18} />
                                    BulutMail'e Güvenli Giriş
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </button>

                        {/* Trust Signals */}
                        <div style={{
                            marginTop: '32px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                                <CheckCircle2 size={14} /> 256-Bit SSL
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                                <ShieldCheck size={14} /> KVKK Uyumlu
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                                <Cloud size={14} /> Günlük Yedekleme
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                                <MapPin size={14} /> Türkiye Veri Merkezi
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div style={{
                    marginTop: '40px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '12px'
                }}>
                    <p style={{ fontWeight: 600, marginBottom: '4px' }}>Webproje Yazılım Bilişim Teknolojileri</p>
                    <p style={{ fontSize: '11px', opacity: 0.8, marginBottom: '12px' }}>
                        Vergi No: 7721738934 | Tic. Sic. No: 1115490 | Mersis: 0772173893400001
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', opacity: 0.9 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={14} /> 0541 520 46 46
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={14} /> 0212 963 45 46
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={14} /> 0840 532 45 46
                        </span>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes twinkle {
                    from { opacity: 0.2; transform: scale(1); }
                    to { opacity: 0.8; transform: scale(1.2); }
                }
            `}</style>
        </div>
    );
}
