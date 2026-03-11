"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Inbox, Send, Trash2, Star, Mail, Search,
    RefreshCw, LogOut, Calendar, User, X, ArrowRight,
    FileText, AlertOctagon, Archive, Reply, Paperclip,
    Download, Menu, Settings, Bell,
    TrendingUp, CloudSun, MapPin, Globe, ExternalLink,
    ChevronDown, ChevronUp, Clock, Info, Globe2,
    ChevronLeft, ChevronRight, Square, CheckSquare,
    Moon, Sun
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RichTextEditor from "../../components/RichTextEditor";
import { useTheme } from "../../context/ThemeContext";

export default function Dashboard() {
    const router = useRouter();
    const { colors, theme, toggleTheme } = useTheme();
    const [mails, setMails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMail, setSelectedMail] = useState<any>(null);
    const [draftUid, setDraftUid] = useState<number | null>(null);
    const [userEmail, setUserEmail] = useState("");
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [composeData, setComposeData] = useState({ to: "", subject: "", body: "", cc: "", bcc: "" });
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState("INBOX");
    const [folders, setFolders] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUids, setSelectedUids] = useState<number[]>([]);
    const [weatherCity, setWeatherCity] = useState("Istanbul");
    const [widgetData, setWidgetData] = useState<any>({
        rates: [],
        weather: { temp: "--", desc: "Yükleniyor...", city: "İstanbul" },
        news: []
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fetchIdRef = useRef(0); // Race condition guard
    const [quota, setQuota] = useState<{ used: number, limit: number } | null>(null);
    const [quotaLoading, setQuotaLoading] = useState(false);

    const handleNavigate = (direction: 'prev' | 'next') => {
        if (!selectedMail) return;
        const currentIndex = filteredMails.findIndex(m => m.uid === selectedMail.uid);
        if (currentIndex === -1) return;

        let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < filteredMails.length) {
            handleMailSelect(filteredMails[nextIndex]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedUids.length === filteredMails.length) {
            setSelectedUids([]);
        } else {
            setSelectedUids(filteredMails.map(m => m.uid));
        }
    };

    const toggleSelectMail = (e: React.MouseEvent, uid: number) => {
        e.stopPropagation();
        setSelectedUids(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    // Mobile Support States
    const [isMobile, setIsMobile] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [mobileView, setMobileView] = useState<'sidebar' | 'list' | 'detail'>('list');
    const [isIframeFullscreen, setIsIframeFullscreen] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setIsSidebarOpen(false);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const filteredMails = mails.filter(mail => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (mail.subject && mail.subject.toLowerCase().includes(term)) ||
            (mail.from && mail.from.toLowerCase().includes(term))
        );
    });

    // Auth + initial data fetch — runs ONCE on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const token = localStorage.getItem("softigo_token");
        const email = localStorage.getItem("softigo_user");

        if (!token) {
            router.push("/");
            return;
        }

        setUserEmail(email || "");
        fetchFolders();

        const storedCity = localStorage.getItem("softigo_weather_city") || "Istanbul";
        setWeatherCity(storedCity);
        fetchWidgetData(storedCity);
        fetchQuota();
    }, []); // Empty deps = mount only, router is stable within session

    // Re-fetch mails only when selected folder changes
    useEffect(() => {
        const token = localStorage.getItem("softigo_token");
        if (!token) return;
        fetchMails(selectedFolder);
    }, [selectedFolder]);

    const fetchWidgetData = async (city: string) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/widgets/data?city=${encodeURIComponent(city)}`);
            const result = await response.json();
            if (result.success && result.data) {
                setWidgetData({
                    rates: result.data.rates || [],
                    weather: result.data.weather || { temp: "--", desc: "Bulunamadı", city: city },
                    news: result.data.news || []
                });
            }
        } catch (error) {
            console.error("Widget verisi çekme hatası:", error);
        }
    };

    const fetchQuota = async () => {
        const token = localStorage.getItem("softigo_token");
        if (!token) return;
        setQuotaLoading(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quota`, {
                headers: { "Authorization": token }
            });
            const result = await response.json();
            console.log("📊 Frontend Quota Result:", result);
            if (result.success && result.storage) {
                setQuota({
                    used: result.storage.used,
                    limit: result.storage.limit
                });
            }
        } catch (error) {
            console.error("Quota fetch error:", error);
        } finally {
            setQuotaLoading(false);
        }
    };

    const fetchFolders = async () => {
        const token = localStorage.getItem("softigo_token");
        setSelectedUids([]);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/folders`, {
                headers: { "Authorization": token || "" }
            });
            const result = await response.json();
            if (result.success) {
                const order = ['INBOX', 'DRAFTS', 'SENT', 'JUNK', 'TRASH', 'ARCHIVE'];
                const sortedFolders = result.data.sort((a: any, b: any) => {
                    const indexA = order.indexOf(a.type);
                    const indexB = order.indexOf(b.type);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return a.name.localeCompare(b.name);
                });
                setFolders(sortedFolders);
            }
        } catch (error) {
            console.error("Klasör çekme hatası:", error);
        }
    };

    const fetchMails = async (folder: string) => {
        const requestId = ++fetchIdRef.current;
        setLoading(true);
        setSelectedMail(null);
        const token = localStorage.getItem("softigo_token");

        try {
            const encodedFolder = encodeURIComponent(folder);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mails?folder=${encodedFolder}`, {
                headers: { "Authorization": token || "" }
            });
            const result = await response.json() as any;
            console.log(`📬 [${requestId}] Klasör: ${folder} →`, JSON.stringify(result).substring(0, 200));

            // Ignore stale responses
            if (requestId !== fetchIdRef.current) {
                console.log(`🚫 [${requestId}] Eski istek, yoksayıldı.`);
                return;
            }

            if (response.status === 401) {
                localStorage.removeItem("softigo_token");
                localStorage.removeItem("softigo_user");
                window.location.href = "/";
                return;
            }

            const mailsData = result.success === true
                ? result.data
                : Array.isArray(result.data)
                    ? result.data
                    : Array.isArray(result)
                        ? result
                        : [];
            setMails(mailsData);
        } catch (error) {
            console.error("Mail çekme hatası:", error);
        } finally {
            if (requestId === fetchIdRef.current) setLoading(false);
        }
    };

    const handleLogout = () => {
        if (confirm("Oturumu kapatmak istediğinizden emin misiniz?")) {
            const theme = localStorage.getItem("softigo_theme");
            localStorage.clear();
            if (theme) {
                localStorage.setItem("softigo_theme", theme);
            }
            window.location.href = "/";
        }
    };

    const handleMailSelect = async (mail: any) => {
        setSelectedMail({ ...mail, loading: true });
        if (isMobile) setMobileView('detail');
        const token = localStorage.getItem("softigo_token");
        try {
            const encodedFolder = encodeURIComponent(selectedFolder);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mails/${mail.uid}?folder=${encodedFolder}`, {
                headers: { "Authorization": token || "" }
            });
            const result = await response.json();
            if (result.success) {
                setSelectedMail(result.data);
                setMails(prevMails => prevMails.map(m =>
                    m.uid === mail.uid
                        ? { ...m, flags: [...(m.flags || []), '\\Seen'] }
                        : m
                ));
            }
        } catch (error) {
            console.error("Mail detayı hatası:", error);
        }
    };

    const handleDeleteMail = async (uid: number | string) => {
        if (!confirm("Seçili ileti(leri) silmek istediğinizden emin misiniz?")) return;
        const token = localStorage.getItem("softigo_token");
        try {
            const encodedFolder = encodeURIComponent(selectedFolder);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mails/${uid}?folder=${encodedFolder}`, {
                method: 'DELETE',
                headers: { "Authorization": token || "" }
            });
            if (response.ok) {
                alert("İleti(ler) başarıyla silindi");
                setSelectedMail(null);
                setSelectedUids([]);
                fetchMails(selectedFolder);
                fetchQuota();
            }
        } catch (error) {
            console.error("Silme hatası:", error);
        }
    };

    const handleMarkAsSpam = async (uid: number | string) => {
        const token = localStorage.getItem("softigo_token");
        try {
            const encodedFolder = encodeURIComponent(selectedFolder);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mails/${uid}/spam?folder=${encodedFolder}`, {
                method: 'POST',
                headers: { "Authorization": token || "" }
            });
            if (response.ok) {
                alert("İleti(ler) gereksiz olarak işaretlendi");
                setSelectedMail(null);
                setSelectedUids([]);
                fetchMails(selectedFolder);
            }
        } catch (error) {
            console.error("Spam işaretleme hatası:", error);
        }
    };

    const handleArchiveMail = async (uid: number | string) => {
        const token = localStorage.getItem("softigo_token");
        try {
            const encodedFolder = encodeURIComponent(selectedFolder);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mails/${uid}/archive?folder=${encodedFolder}`, {
                method: 'POST',
                headers: { "Authorization": token || "" }
            });
            if (response.ok) {
                alert("İleti(ler) arşivlendi");
                setSelectedMail(null);
                setSelectedUids([]);
                fetchMails(selectedFolder);
            }
        } catch (error) {
            console.error("Arşivleme hatası:", error);
        }
    };

    const handleReplyMail = (mail: any) => {
        setComposeData({
            to: mail.from,
            subject: `Re: ${mail.subject}`,
            body: `<br><br><br><div style="border-left: 2px solid #E2E8F0; padding-left: 16px; margin-left: 4px; color: #64748B;">
                <strong>Kimden:</strong> ${mail.from}<br>
                <strong>Tarih:</strong> ${new Date(mail.date).toLocaleString()}<br>
                <strong>Konu:</strong> ${mail.subject}<br><br>
                ${mail.body}
            </div>`,
            cc: "",
            bcc: ""
        });
        setShowCc(false);
        setShowBcc(false);
        setIsComposeOpen(true);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);
        const validFiles: File[] = [];

        for (const file of newFiles) {
            try {
                // iOS iCloud dosyalarını erken doğrula (indirilmemiş olabilir)
                await new Promise<void>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve();
                    reader.onerror = () => reject(new Error(`'${file.name}' dosyası okunamadı`));
                    reader.readAsArrayBuffer(file.slice(0, 1024));
                });
                validFiles.push(file);
            } catch (err: any) {
                alert(`⚠️ ${err.message}. Dosya atlandı.`);
            }
        }

        if (validFiles.length > 0) setAttachments(prev => [...prev, ...validFiles]);
        e.target.value = ''; // Aynı dosya tekrar seçilebilsin
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleDiscard = () => {
        if (composeData.to || composeData.subject || composeData.body) {
            if (confirm("Yazmakta olduğunuz ileti silinecek. Emin misiniz?")) {
                setIsComposeOpen(false);
                setComposeData({ to: "", subject: "", body: "", cc: "", bcc: "" });
                setAttachments([]);
                setDraftUid(null);
                setShowCc(false);
                setShowBcc(false);
            }
        } else {
            setIsComposeOpen(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        const token = localStorage.getItem("softigo_token");
        try {
            const formData = new FormData();
            formData.append('to', composeData.to);
            if (composeData.cc) formData.append('cc', composeData.cc);
            if (composeData.bcc) formData.append('bcc', composeData.bcc);
            formData.append('subject', composeData.subject);
            formData.append('html', composeData.body);
            // iOS Safari'de File nesneleri doğrudan FormData'ya eklenince
            // 'The string did not match the expected pattern' hatası çıkabiliyor.
            // Çözüm: önce ArrayBuffer'a dönüştür, sonra Blob olarak ekle.
            for (const file of attachments) {
                try {
                    const buf = await file.arrayBuffer();
                    const mimeType = file.type || 'application/octet-stream';
                    const blob = new Blob([buf], { type: mimeType });
                    formData.append('attachments', blob, file.name);
                } catch {
                    throw new Error(`'${file.name}' dosyası gönderilirken okunamadı. Dosyayı tekrar seçin.`);
                }
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/send`, {
                method: "POST",
                headers: { "Authorization": token || "" },
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                if (draftUid) {
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mails/${draftUid}?folder=DRAFTS`, {
                        method: 'DELETE',
                        headers: { "Authorization": token || "" }
                    });
                }
                setIsComposeOpen(false);
                setComposeData({ to: "", subject: "", body: "", cc: "", bcc: "" });
                setAttachments([]);
                setDraftUid(null);
                setShowCc(false);
                setShowBcc(false);
                alert("E-posta başarıyla gönderildi!");
                fetchMails(selectedFolder);
            } else {
                alert("Hata: " + (result.error || result.message || "İleti gönderilemedi. Sunucu bağlantısı reddedildi."));
            }
        } catch (error: any) {
            console.error("Gönderim hatası:", error);
            alert("Sistemsel bir hata oluştu: " + error.message);
        } finally {
            setSending(false);
        }
    };

    const [loginInfo] = useState({ ip: "88.230.255.153", time: "2026-02-14 11:42" });

    const getFolderInfo = (type: string, name: string) => {
        const mappings: any = {
            'INBOX': { label: 'Gelen', icon: <Inbox size={18} /> },
            'DRAFTS': { label: 'Taslak', icon: <FileText size={18} /> },
            'SENT': { label: 'Gönderilmiş', icon: <Send size={18} /> },
            'TRASH': { label: 'Çöp', icon: <Trash2 size={18} /> },
            'ARCHIVE': { label: 'Arşiv', icon: <Archive size={18} /> }
        };
        return mappings[type] || { label: name, icon: <Mail size={18} /> };
    };

    // ── Mobile UI Helpers ───────────────────────────────────────────────
    const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7B731', '#A29BFE', '#FD79A8', '#55EFC4', '#FDCB6E', '#74B9FF', '#E17055'];
    const getAvatarColor = (text: string) => AVATAR_COLORS[(text.charCodeAt(0) || 65) % AVATAR_COLORS.length];
    const getInitials = (raw: string) => {
        const clean = raw.replace(/<[^>]+>/g, '').trim();
        const parts = clean.split(/[\s@]/);
        if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
        return clean.substring(0, 2).toUpperCase() || 'MA';
    };
    const getDisplayName = (raw: string) => {
        const m = raw.match(/^"?([^"<]+)"?\s*(?:<.*>)?$/);
        return m ? m[1].trim() : raw.split('@')[0];
    };
    const formatMailDate = (dateStr: string) => {
        const d = new Date(dateStr), now = new Date();
        if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: '2-digit' });
    };
    const getFolderPath = (type: string) => folders.find(f => f.type === type)?.path || type;
    const unreadCount = mails.filter(m => !m.flags?.includes('\\Seen')).length;
    // ────────────────────────────────────────────────────────────────────

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: 'var(--app-height, 100vh)', background: 'radial-gradient(circle at 50% 100%, #1a0800 0%, #050209 100%)', overflow: 'hidden' }}>

            {/* ── MOBILE HEADER (list/sidebar) ── */}
            {isMobile && mobileView !== 'detail' && (
                <header style={{ height: '60px', backgroundColor: colors.headerBg, borderBottom: `1px solid ${colors.sidebarBorder}`, display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', flexShrink: 0, zIndex: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src="/logo.png" alt="Softigo" style={{ height: '56px' }} />
                        <span style={{ fontWeight: 700, fontSize: '20px', color: colors.text, letterSpacing: '-0.3px' }}>Softigo Mail</span>
                    </div>
                    <button onClick={() => setIsComposeOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Search size={22} color={colors.accent} />
                    </button>
                </header>
            )}

            {/* ── MOBILE HEADER (detail view) ── */}
            {isMobile && mobileView === 'detail' && (
                <header style={{ height: '52px', background: `linear-gradient(90deg, ${colors.accent} 0%, #c06800 100%)`, color: 'white', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between', flexShrink: 0, zIndex: 100 }}>
                    <button onClick={() => { setMobileView('list'); setSelectedMail(null); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 600 }}>
                        <ChevronLeft size={18} /> Geri
                    </button>
                    <span style={{ fontWeight: 600, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{selectedMail?.subject || '(Konu Yok)'}</span>
                    {selectedMail && (
                        <button onClick={() => selectedMail && handleReplyMail(selectedMail)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 600 }}>
                            <Reply size={15} /> Yanıtla
                        </button>
                    )}
                </header>
            )}

            {/* ── MOBILE MAIN CONTENT ── */}
            {isMobile && (
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', backgroundColor: colors.mailDetailBg }}>
                    {/* MOBILE SIDEBAR VIEW */}
                    {mobileView === 'sidebar' && (
                        <div style={{ flex: 1, backgroundColor: colors.sidebarBg, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                            <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: `1px solid ${colors.sidebarBorder}` }}>
                                <img src="/logo.png" alt="Softigo" style={{ height: '128px' }} />
                                <div>
                                    <div style={{ fontSize: '18px', fontWeight: 800, color: colors.accent }}>Softigo Mail</div>
                                    <div style={{ fontSize: '12px', color: colors.subtext }}>{userEmail}</div>
                                </div>
                            </div>
                            <div style={{ padding: '20px 16px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 700, color: colors.accent, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>KLASÖRLER</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {folders.map(folder => {
                                        const info = getFolderInfo(folder.type, folder.name);
                                        return (
                                            <button key={folder.path} onClick={() => { setSelectedFolder(folder.path); setMobileView('list'); }} style={{
                                                display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                                                background: selectedFolder === folder.path ? colors.folderActive : 'transparent',
                                                color: selectedFolder === folder.path ? colors.accent : colors.subtext,
                                                fontSize: '16px', fontWeight: selectedFolder === folder.path ? 700 : 500
                                            }}>
                                                {info.icon} {info.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ marginTop: 'auto', padding: '20px 16px', borderTop: `1px solid ${colors.sidebarBorder}` }}>
                                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', width: '100%', backgroundColor: colors.dangerBg, color: colors.danger, fontSize: '16px', fontWeight: 600 }}>
                                    <LogOut size={20} /> Oturumu Kapat
                                </button>
                            </div>
                        </div>
                    )}

                    {/* MOBILE LIST VIEW */}
                    {mobileView === 'list' && (
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {loading ? (
                                <div style={{ padding: '60px 20px', textAlign: 'center', color: colors.subtext }}>Yükleniyor...</div>
                            ) : filteredMails.length === 0 ? (
                                <div style={{ padding: '80px 20px', textAlign: 'center', color: colors.subtext }}>
                                    <Mail size={48} style={{ opacity: 0.15, margin: '0 auto 16px', display: 'block' }} />
                                    <p>İleti yok</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {filteredMails.map(mail => (
                                        <div key={mail.uid} onClick={() => handleMailSelect(mail)} style={{
                                            padding: '16px 20px', borderBottom: `1px dotted ${colors.sidebarBorder}`, cursor: 'pointer',
                                            display: 'flex', gap: '14px', alignItems: 'center'
                                        }}>
                                            <div style={{ width: 44, height: 44, borderRadius: '22px', backgroundColor: getAvatarColor(mail.from || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white' }}>
                                                {getInitials(mail.from || 'U')}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '15px', fontWeight: mail.flags?.includes('\\Seen') ? 500 : 900, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDisplayName(mail.from || '')}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '11px', color: colors.subtext }}>{formatMailDate(mail.date)}</span>
                                                        {!mail.flags?.includes('\\Seen') && (
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors.accent, boxShadow: `0 0 10px ${colors.accent}` }} />
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '14px', fontWeight: mail.flags?.includes('\\Seen') ? 400 : 700, color: mail.flags?.includes('\\Seen') ? colors.subtext : colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mail.subject || '(Konu Yok)'}</div>
                                            </div>
                                            <ChevronRight size={18} color={colors.subtext} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MOBILE DETAIL VIEW */}
                    {mobileView === 'detail' && selectedMail && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
                            <div style={{ padding: '20px', borderBottom: '1px solid #F1F5F9' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', marginBottom: '12px' }}>{selectedMail.subject || '(Konu Yok)'}</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: getAvatarColor(selectedMail.from || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>{getInitials(selectedMail.from || 'U')}</div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{selectedMail.from}</div>
                                        <div style={{ fontSize: '12px', color: '#64748B' }}>{new Date(selectedMail.date).toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
                                {selectedMail.loading ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>Yükleniyor...</div>
                                ) : (
                                    <iframe
                                        srcDoc={`<html><head><style>body { font-family: sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 10px; } img { max-width: 100%; height: auto; }</style></head><body>${selectedMail.body}</body></html>`}
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                    />
                                )}
                            </div>
                            {!selectedMail.loading && selectedMail.attachments && selectedMail.attachments.length > 0 && (
                                <div style={{ padding: '12px 16px', borderTop: '1px solid #F1F5F9', backgroundColor: '#F8FAFC', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Paperclip size={13} style={{ color: '#64748B' }} />
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>EKLER ({selectedMail.attachments.length})</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {selectedMail.attachments.map((att: any, idx: number) => (
                                            <a key={idx} href={`${process.env.NEXT_PUBLIC_API_URL}/api/mails/${selectedMail.uid}/attachments/${encodeURIComponent(att.filename)}?folder=${encodeURIComponent(selectedFolder)}&token=${encodeURIComponent(localStorage.getItem('softigo_token') || '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!confirm(`"${att.filename}" dosyasını indirmek istiyor musunuz?`)) e.preventDefault(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', textDecoration: 'none', color: '#1E293B', flex: '1 1 auto', minWidth: '120px' }}>
                                                <FileText size={16} style={{ color: colors.accent, flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</div><div style={{ fontSize: '11px', color: '#64748B' }}>{(att.size / 1024).toFixed(1)} KB</div></div>
                                                <Download size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            )}
            {/* ── DESKTOP LAYOUT CONTAINER - Floating rounded card ── */}
            {!isMobile && (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    backgroundColor: colors.mailDetailBg
                }}>

                    {/* ── DESKTOP TOP HEADER ── */}
                    <header style={{
                        height: '56px', background: 'linear-gradient(90deg, #110700 0%, #1f0d00 100%)',
                        borderBottom: `1px solid ${colors.accent}44`,
                        display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px',
                        flexShrink: 0, zIndex: 100
                    }}>
                        <img src="/logo.png" alt="Softigo" style={{ height: '72px', filter: 'drop-shadow(0 0 8px rgba(255,140,0,0.3))' }} />
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,140,0,0.2)', borderRadius: '8px', padding: '6px 12px', gap: '8px', maxWidth: '400px' }}>
                            <Search size={15} style={{ color: colors.subtext }} />
                            <input type="text" placeholder="E-postaları ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'none', outline: 'none', fontSize: '13px', width: '100%', color: colors.text }} />
                        </div>
                        <div style={{ flex: 1 }} />
                        <span style={{ color: colors.subtext, fontSize: '13px' }}>{userEmail}</span>
                        <button onClick={toggleTheme} title="Temayı Değiştir" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,140,0,0.2)', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            {theme === 'dark' ? <Sun size={16} color={colors.subtext} /> : <Moon size={16} color={colors.subtext} />}
                        </button>
                        <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,140,0,0.2)', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <User size={16} color={colors.subtext} />
                        </button>
                    </header>

                    {/* ── DESKTOP ACTION BAR ── */}
                    <div style={{ height: '44px', backgroundColor: colors.headerBg, borderBottom: `1px solid ${colors.mailListBorder}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px', flexShrink: 0 }}>
                        <button onClick={() => setIsComposeOpen(true)} style={{ background: `linear-gradient(90deg, ${colors.accent}, #c06800)`, color: 'white', border: 'none', padding: '5px 14px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <Send size={13} /> Oluştur
                        </button>
                        <button onClick={() => fetchMails(selectedFolder)} style={{ background: 'none', border: 'none', color: colors.subtext, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '5px 8px' }}>
                            <RefreshCw size={13} /> Yenile
                        </button>
                        <div style={{ width: '1px', height: '20px', backgroundColor: colors.mailListBorder, margin: '0 4px' }} />
                        <div onClick={toggleSelectAll} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '5px', borderRadius: '4px' }} title="Tümünü Seç/Kaldır">
                            {selectedUids.length === filteredMails.length && filteredMails.length > 0 ? (
                                <CheckSquare size={16} style={{ color: colors.accent }} />
                            ) : (
                                <Square size={16} style={{ color: colors.subtext }} />
                            )}
                        </div>
                        <div style={{ width: '1px', height: '20px', backgroundColor: colors.mailListBorder, margin: '0 4px' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <button onClick={() => selectedMail && handleReplyMail(selectedMail)} disabled={!selectedMail} title="Yanıtla" style={{ background: 'none', border: 'none', color: selectedMail ? colors.subtext : 'rgba(255,255,255,0.15)', cursor: selectedMail ? 'pointer' : 'default', padding: '5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}><Reply size={16} /></button>
                            <button disabled={!selectedMail} title="İlet" style={{ background: 'none', border: 'none', color: selectedMail ? colors.subtext : 'rgba(255,255,255,0.15)', cursor: selectedMail ? 'pointer' : 'default', padding: '5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}><ArrowRight size={16} /></button>
                            <button onClick={() => { const uids = selectedUids.length > 0 ? selectedUids.join(',') : selectedMail?.uid; if (uids) handleArchiveMail(uids); }} disabled={!(selectedMail || selectedUids.length > 0)} title="Arşivle" style={{ background: 'none', border: 'none', color: (selectedMail || selectedUids.length > 0) ? colors.subtext : 'rgba(255,255,255,0.15)', cursor: (selectedMail || selectedUids.length > 0) ? 'pointer' : 'default', padding: '5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}><Archive size={16} /></button>
                            <button onClick={() => { const uids = selectedUids.length > 0 ? selectedUids.join(',') : selectedMail?.uid; if (uids) handleMarkAsSpam(uids); }} disabled={!(selectedMail || selectedUids.length > 0)} title="Spam" style={{ background: 'none', border: 'none', color: (selectedMail || selectedUids.length > 0) ? colors.subtext : 'rgba(255,255,255,0.15)', cursor: (selectedMail || selectedUids.length > 0) ? 'pointer' : 'default', padding: '5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}><AlertOctagon size={16} /></button>
                            <button onClick={() => { const uids = selectedUids.length > 0 ? selectedUids.join(',') : selectedMail?.uid; if (uids) handleDeleteMail(uids); }} disabled={!(selectedMail || selectedUids.length > 0)} title="Sil" style={{ background: 'none', border: 'none', color: (selectedMail || selectedUids.length > 0) ? colors.danger : 'rgba(255,255,255,0.15)', cursor: (selectedMail || selectedUids.length > 0) ? 'pointer' : 'default', padding: '5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}><Trash2 size={16} /></button>
                        </div>
                        <div style={{ width: '1px', height: '20px', backgroundColor: colors.mailListBorder, margin: '0 4px' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <button onClick={() => handleNavigate('prev')} disabled={!selectedMail || filteredMails.findIndex(m => m.uid === selectedMail.uid) <= 0} title="Önceki" style={{ background: 'none', border: 'none', color: (!selectedMail || filteredMails.findIndex(m => m.uid === selectedMail.uid) <= 0) ? 'rgba(255,255,255,0.15)' : colors.subtext, cursor: 'pointer', padding: '5px', borderRadius: '4px' }}><ChevronLeft size={18} /></button>
                            <button onClick={() => handleNavigate('next')} disabled={!selectedMail || filteredMails.findIndex(m => m.uid === selectedMail.uid) === (filteredMails.length - 1)} title="Sonraki" style={{ background: 'none', border: 'none', color: (!selectedMail || filteredMails.findIndex(m => m.uid === selectedMail.uid) === (filteredMails.length - 1)) ? 'rgba(255,255,255,0.15)' : colors.subtext, cursor: 'pointer', padding: '5px', borderRadius: '4px' }}><ChevronRight size={18} /></button>
                        </div>
                    </div>

                    {/* ── DESKTOP MAIN CONTENT ── */}
                    <main style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                        {/* COL 1: SIDEBAR */}
                        <div style={{ width: '180px', backgroundColor: colors.sidebarBg, borderRight: `1px solid ${colors.sidebarBorder}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                            <div style={{ padding: '12px', flex: 1 }}>
                                <p style={{ fontSize: '10px', fontWeight: 700, color: colors.accent, textTransform: 'uppercase', marginBottom: '8px', marginTop: '8px', letterSpacing: '0.8px', padding: '0 4px' }}>KLASÖRLER</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {folders.map(folder => {
                                        const info = getFolderInfo(folder.type, folder.name);
                                        return (
                                            <button key={folder.path} onClick={() => setSelectedFolder(folder.path)} style={{
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                                                background: selectedFolder === folder.path ? `linear-gradient(90deg, rgba(255,140,0,0.3) 0%, rgba(255,140,0,0.05) 100%)` : 'transparent',
                                                color: selectedFolder === folder.path ? colors.accent : colors.subtext,
                                                borderLeft: selectedFolder === folder.path ? `3px solid ${colors.accent}` : '3px solid transparent',
                                                fontSize: '13px', fontWeight: selectedFolder === folder.path ? 700 : 400,
                                                transition: 'all 0.15s'
                                            }}>
                                                {info.icon} {info.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* Quota Section (Styled as Widget Card) */}
                            {(quota || quotaLoading) && (
                                <div style={{
                                    margin: '12px',
                                    padding: '12px',
                                    border: `1px solid ${colors.sidebarBorder}`,
                                    borderRadius: '10px',
                                    backgroundColor: 'rgba(255,140,0,0.03)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${colors.sidebarBorder}`, paddingBottom: '8px', marginBottom: '4px' }}>
                                        <Info size={13} color={colors.accent} />
                                        <span style={{ fontSize: '10px', fontWeight: 800, color: colors.text, letterSpacing: '0.8px', textTransform: 'uppercase' }}>DEPOLAMA KOTASI</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            color: colors.text,
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            padding: '8px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid rgba(255,140,0,0.1)',
                                            minHeight: '28px',
                                            alignItems: 'center'
                                        }}>
                                            {quotaLoading ? (
                                                <span style={{ opacity: 0.5, fontSize: '10px' }}>Sorgulanıyor...</span>
                                            ) : quota ? (
                                                (() => {
                                                    const usedKb = quota.used;
                                                    const limitKb = quota.limit;

                                                    const formatNum = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                                                    const format = (kb: number) => {
                                                        if (kb >= 1024 * 1024) return `${formatNum(kb / (1024 * 1024))} GB`;
                                                        if (kb >= 1024) return `${formatNum(kb / 1024)} MB`;
                                                        return `${formatNum(kb)} KB`;
                                                    };

                                                    const usedStr = format(usedKb);
                                                    const limitStr = limitKb > 0 ? format(limitKb) : '∞';
                                                    const percent = limitKb > 0 ? formatNum((usedKb / limitKb) * 100) : '0';

                                                    return `${usedStr} / ${limitStr}${limitKb > 0 ? ` / ${percent}%` : ''}`;
                                                })()
                                            ) : null}
                                        </div>
                                        <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${(quota && quota.limit > 0) ? Math.min(100, (quota.used / quota.limit) * 100) : 0}%`,
                                                background: `linear-gradient(90deg, ${colors.accent}, #FFB200)`,
                                                boxShadow: `0 0 10px ${colors.accent}55`,
                                                borderRadius: '3px',
                                                transition: 'width 0.8s ease-out'
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sidebar bottom icons */}
                            <div style={{ padding: '12px', borderTop: `1px solid ${colors.sidebarBorder}`, display: 'flex', justifyContent: 'space-around' }}>
                                <button title="Ayarlar" onClick={() => setIsSettingsOpen(true)} style={{ background: 'none', border: 'none', color: isSettingsOpen ? colors.accent : colors.subtext, cursor: 'pointer', padding: '8px', borderRadius: '8px' }}><Settings size={18} /></button>
                                <button title="Profil" onClick={handleLogout} style={{ background: 'none', border: 'none', color: colors.subtext, cursor: 'pointer', padding: '8px', borderRadius: '8px' }}><User size={18} /></button>
                                <button title="Takvim" onClick={() => setIsCalendarOpen(true)} style={{ background: 'none', border: 'none', color: isCalendarOpen ? colors.accent : colors.subtext, cursor: 'pointer', padding: '8px', borderRadius: '8px' }}><Calendar size={18} /></button>
                            </div>
                        </div>

                        {/* COL 2: MAIL LIST */}
                        <div style={{ width: '280px', backgroundColor: colors.mailListBg, borderRight: `1px solid ${colors.mailListBorder}`, overflowY: 'auto' }}>
                            {loading ? (
                                <div style={{ padding: '60px 20px', textAlign: 'center', color: colors.subtext, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                    <RefreshCw size={24} style={{ opacity: 0.4 }} />
                                    Yükleniyor...
                                </div>
                            ) : filteredMails.length === 0 ? (
                                <div style={{ padding: '80px 20px', textAlign: 'center', color: colors.subtext }}>
                                    <Mail size={48} style={{ opacity: 0.15, margin: '0 auto 16px', display: 'block' }} />
                                    <p style={{ fontWeight: 500, fontSize: '16px' }}>İleti yok</p>
                                </div>
                            ) : (
                                filteredMails.map(mail => (
                                    <div key={mail.uid} onClick={() => handleMailSelect(mail)} style={{
                                        padding: '10px 14px',
                                        borderBottom: `1px solid ${colors.mailListBorder}`, cursor: 'pointer',
                                        backgroundColor: selectedMail?.uid === mail.uid ? colors.mailItemActive : 'transparent',
                                        borderLeft: mail.flags?.includes('\\Seen') ? '3px solid transparent' : `3px solid ${colors.accent}`,
                                        display: 'flex', gap: '10px', alignItems: 'flex-start',
                                        transition: 'background-color 0.1s'
                                    }}>
                                        <div onClick={(e) => toggleSelectMail(e, mail.uid)} style={{ marginTop: '2px', cursor: 'pointer' }}>
                                            {selectedUids.includes(mail.uid) ? (
                                                <CheckSquare size={15} style={{ color: colors.accent }} />
                                            ) : (
                                                <Square size={15} style={{ color: colors.subtext }} />
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: mail.flags?.includes('\\Seen') ? 500 : 900, color: mail.flags?.includes('\\Seen') ? colors.text : '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{mail.from?.split('<')[0].trim() || mail.from}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '10px', color: colors.subtext, flexShrink: 0 }}>{new Date(mail.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}</span>
                                                    {!mail.flags?.includes('\\Seen') && (
                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colors.accent, boxShadow: `0 0 8px ${colors.accent}` }} />
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '12px', fontWeight: mail.flags?.includes('\\Seen') ? 400 : 700, color: mail.flags?.includes('\\Seen') ? colors.subtext : colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mail.subject || '(Konu Yok)'}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* COL 3: MAIL CONTENT */}
                        <div style={{ flex: 1, backgroundColor: colors.mailDetailBg, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
                            {selectedMail ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.mailListBorder}` }}>
                                        <h2 style={{ fontSize: '16px', fontWeight: 700, color: colors.text, marginBottom: '12px' }}>{selectedMail.subject || '(Konu Yok)'}</h2>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '18px', background: `linear-gradient(135deg, ${colors.accent}, #c06800)`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>{selectedMail.from?.charAt(0).toUpperCase()}</div>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>{selectedMail.from}</div>
                                                <div style={{ fontSize: '11px', color: colors.subtext }}>{new Date(selectedMail.date).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
                                        {selectedMail.loading ? (
                                            <div style={{ textAlign: 'center', padding: '40px', color: colors.subtext }}>Yükleniyor...</div>
                                        ) : (
                                            <iframe
                                                srcDoc={`<html><head><style>body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: ${colors.text}; margin: 0; padding: 12px; background: transparent; } img { max-width: 100%; height: auto; } a { color: ${colors.accent}; }</style></head><body>${selectedMail.body}</body></html>`}
                                                style={{ width: '100%', height: 'calc(100% - 0px)', border: 'none', borderRadius: '6px', backgroundColor: 'transparent' }}
                                            />
                                        )}
                                    </div>
                                    {!selectedMail.loading && selectedMail.attachments && selectedMail.attachments.length > 0 && (
                                        <div style={{ padding: '12px 24px', borderTop: `1px solid ${colors.mailListBorder}`, backgroundColor: colors.sidebarBg, flexShrink: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <Paperclip size={13} style={{ color: colors.subtext }} />
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: colors.subtext, textTransform: 'uppercase' }}>EKLER ({selectedMail.attachments.length})</span>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {selectedMail.attachments.map((att: any, idx: number) => (
                                                    <a key={idx} href={`${process.env.NEXT_PUBLIC_API_URL}/api/mails/${selectedMail.uid}/attachments/${encodeURIComponent(att.filename)}?folder=${encodeURIComponent(selectedFolder)}&token=${encodeURIComponent(localStorage.getItem('softigo_token') || '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!confirm(`"${att.filename}" dosyasını indirmek istiyor musunuz?`)) e.preventDefault(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: 'rgba(255,140,0,0.1)', border: `1px solid ${colors.accent}44`, borderRadius: '6px', textDecoration: 'none', color: colors.text }}>
                                                        <FileText size={14} style={{ color: colors.accent }} />
                                                        <div><div style={{ fontSize: '12px', fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</div><div style={{ fontSize: '10px', color: colors.subtext }}>{(att.size / 1024).toFixed(1)} KB</div></div>
                                                        <Download size={13} style={{ color: colors.subtext }} />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.subtext }}>
                                    <img src="/logo.png" alt="Softigo" style={{ height: '200px', opacity: 0.12, marginBottom: '16px', filter: 'grayscale(30%)' }} />
                                    <p style={{ fontSize: '15px', fontWeight: 500 }}>Görüntülenecek bir ileti seçin</p>
                                </div>
                            )}
                        </div>

                        {/* COL 4: WIDGETS */}
                        <div style={{ width: '240px', backgroundColor: colors.sidebarBg, borderLeft: `1px solid ${colors.sidebarBorder}`, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Döviz */}
                            <div style={{ border: `1px solid ${colors.sidebarBorder}`, borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${colors.sidebarBorder}`, background: 'rgba(255,140,0,0.08)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <TrendingUp size={13} color={colors.accent} />
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: colors.text, letterSpacing: '0.5px' }}>DÖVİZ KURLARI</span>
                                    </div>
                                    <ChevronRight size={14} color={colors.subtext} />
                                </div>
                                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {widgetData.rates.length > 0 ? widgetData.rates.map((rate: any) => (
                                        <div key={rate.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                            <span style={{ fontWeight: 600, color: colors.subtext }}>{rate.name}</span>
                                            <span style={{ fontWeight: 700, color: colors.text }}>{rate.value} ₺</span>
                                        </div>
                                    )) : <div style={{ fontSize: '12px', color: colors.subtext }}>Yükleniyor...</div>}
                                </div>
                            </div>

                            {/* Hava Durumu */}
                            <div style={{ border: `1px solid ${colors.sidebarBorder}`, borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${colors.sidebarBorder}`, background: 'rgba(255,140,0,0.08)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CloudSun size={13} color={colors.accent} />
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: colors.text, letterSpacing: '0.5px' }}>HAVA DURUMU</span>
                                    </div>
                                    <select
                                        value={weatherCity}
                                        onChange={(e) => {
                                            setWeatherCity(e.target.value);
                                            localStorage.setItem('softigo_weather_city', e.target.value);
                                            fetchWidgetData(e.target.value);
                                        }}
                                        style={{
                                            fontSize: '11px',
                                            padding: '2px 6px',
                                            borderRadius: '6px',
                                            border: `1px solid ${colors.accent}66`,
                                            outline: 'none',
                                            backgroundColor: '#1E1B24',
                                            color: colors.text,
                                            cursor: 'pointer',
                                            colorScheme: 'dark'
                                        }}
                                    >
                                        <option value="Istanbul" style={{ backgroundColor: '#1E1B24', color: '#fff' }}>İstanbul</option>
                                        <option value="Ankara" style={{ backgroundColor: '#1E1B24', color: '#fff' }}>Ankara</option>
                                        <option value="Izmir" style={{ backgroundColor: '#1E1B24', color: '#fff' }}>İzmir</option>
                                        <option value="Bursa" style={{ backgroundColor: '#1E1B24', color: '#fff' }}>Bursa</option>
                                        <option value="Antalya" style={{ backgroundColor: '#1E1B24', color: '#fff' }}>Antalya</option>
                                        <option value="Adana" style={{ backgroundColor: '#1E1B24', color: '#fff' }}>Adana</option>
                                    </select>
                                </div>
                                <div style={{ padding: '16px 12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '32px', fontWeight: 700, color: colors.text }}>{widgetData.weather?.temp}°C</div>
                                    <div style={{ fontSize: '13px', color: colors.subtext, marginTop: '4px' }}>{widgetData.weather?.desc}</div>
                                    <div style={{ fontSize: '11px', color: colors.accent, marginTop: '2px', fontWeight: 600 }}>{widgetData.weather?.city}</div>
                                </div>
                            </div>

                            {/* Haberler */}
                            <div style={{ border: `1px solid ${colors.sidebarBorder}`, borderRadius: '10px', overflow: 'hidden', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${colors.sidebarBorder}`, background: 'rgba(255,140,0,0.08)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Globe2 size={13} color={colors.accent} />
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: colors.text, letterSpacing: '0.5px' }}>HABERLER</span>
                                    </div>
                                    <ChevronRight size={14} color={colors.subtext} />
                                </div>
                                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                                    {widgetData.news.length > 0 ? widgetData.news.map((item: any, idx: number) => (
                                        <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: colors.subtext, fontWeight: 500, lineHeight: 1.5, paddingBottom: '8px', borderBottom: `1px solid ${colors.mailListBorder}`, textDecoration: 'none', display: 'block' }}
                                            onMouseOver={(e) => (e.currentTarget.style.color = colors.accent)}
                                            onMouseOut={(e) => (e.currentTarget.style.color = colors.subtext)}>
                                            {item.title}
                                        </a>
                                    )) : <div style={{ fontSize: '12px', color: colors.subtext }}>Yükleniyor...</div>}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            )}




            {/* ── MOBILE BOTTOM NAV ── */}
            {isMobile && (
                <nav style={{ height: '70px', backgroundColor: colors.sidebarBg, borderTop: `1px solid ${colors.sidebarBorder}`, display: 'flex', alignItems: 'stretch', flexShrink: 0 }}>
                    {[
                        { icon: Inbox, label: 'Gelen', type: 'INBOX' },
                        { icon: Send, label: 'Giden', type: 'SENT' },
                        { icon: FileText, label: 'Taslak', type: 'DRAFTS' },
                        { icon: Trash2, label: 'Cöp', type: 'TRASH' },
                        { icon: Menu, label: 'Menü', type: 'MENU' },
                    ].map(item => {
                        const folderPath = item.type !== 'MENU' ? getFolderPath(item.type) : '';
                        const isActive = item.type === 'MENU' ? mobileView === 'sidebar' : selectedFolder === folderPath && mobileView === 'list';
                        const badge = item.type === 'INBOX' ? unreadCount : 0;
                        return (
                            <button key={item.label} onClick={() => { if (item.type === 'MENU') { setMobileView('sidebar'); } else { setSelectedFolder(folderPath); setMobileView('list'); } }} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: isActive ? colors.accent : colors.subtext, fontSize: '10px', fontWeight: isActive ? 600 : 400, position: 'relative', paddingBottom: '4px' }}>
                                <div style={{ position: 'relative' }}>
                                    <item.icon size={24} />
                                    {badge > 0 && (<span style={{ position: 'absolute', top: '-6px', right: '-10px', backgroundColor: '#FF3B30', color: 'white', borderRadius: '10px', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, padding: '0 4px' }}>{badge > 99 ? '99+' : badge}</span>)}
                                </div>
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            )}

            {/* ── MOBILE COMPOSE FAB ── */}
            {isMobile && !isIframeFullscreen && (
                <button onClick={() => setIsComposeOpen(true)} style={{ position: 'fixed', right: '20px', bottom: '86px', width: '56px', height: '56px', borderRadius: '28px', backgroundColor: colors.accent, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${colors.accent}88`, zIndex: 100 }}>
                    <Mail size={24} />
                </button>
            )}

            {/* ── COMPOSE MODAL ── */}
            <AnimatePresence>
                {isComposeOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0,
                            backgroundColor: isMobile ? 'white' : 'rgba(15, 23, 42, 0.6)',
                            backdropFilter: isMobile ? 'none' : 'blur(4px)',
                            display: 'flex',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: isMobile ? '0' : '20px'
                        }}
                    >
                        <motion.div
                            initial={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0, y: 20 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
                            exit={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0, y: 20 }}
                            style={{
                                width: '100%',
                                maxWidth: isMobile ? '100%' : '850px',
                                height: isMobile ? 'var(--app-height, 100vh)' : '90vh',
                                backgroundColor: 'white',
                                borderRadius: isMobile ? '0' : '12px',
                                display: 'flex', flexDirection: 'column',
                                overflow: 'hidden',
                                boxShadow: isMobile ? 'none' : '0 25px 50px -12px rgba(0,0,0,0.25)'
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                height: isMobile ? '52px' : '56px',
                                backgroundColor: '#0057B7', color: 'white',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: isMobile ? '0 12px' : '0 20px',
                                flexShrink: 0
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {isMobile ? (
                                        <button type="button" onClick={() => setIsComposeOpen(false)}
                                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                            <X size={22} />
                                        </button>
                                    ) : (
                                        <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '6px' }}>
                                            <Mail size={18} />
                                        </div>
                                    )}
                                    <span style={{ fontWeight: 700, fontSize: '16px' }}>Yeni İleti</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {isMobile && (
                                        <button type="button" onClick={handleSend as any} disabled={sending}
                                            style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', borderRadius: '8px', padding: '6px 16px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: sending ? 0.7 : 1 }}>
                                            <Send size={14} /> {sending ? 'Gönderiliyor...' : 'Gönder'}
                                        </button>
                                    )}
                                    {!isMobile && (
                                        <button onClick={() => setIsComposeOpen(false)}
                                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ padding: isMobile ? '0 12px' : '0 20px 8px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F1F5F9', padding: '10px 0' }}>
                                        <span style={{ width: '52px', fontSize: '14px', color: '#64748B', fontWeight: 600, flexShrink: 0 }}>Kime:</span>
                                        <input type="text" placeholder="E-posta adresi..." value={composeData.to}
                                            onChange={e => setComposeData({ ...composeData, to: e.target.value })}
                                            style={{ flex: 1, border: 'none', padding: '4px', fontSize: '14px', outline: 'none', color: '#1E293B', minWidth: 0 }} required />
                                        {!isMobile && (
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#0057B7', fontWeight: 600, flexShrink: 0 }}>
                                                {!showCc && <button type="button" onClick={() => setShowCc(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Cc</button>}
                                                {!showBcc && <button type="button" onClick={() => setShowBcc(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Bcc</button>}
                                            </div>
                                        )}
                                    </div>
                                    {isMobile && (
                                        <div style={{ display: 'flex', gap: '8px', padding: '6px 0' }}>
                                            {!showCc && <button type="button" onClick={() => setShowCc(true)} style={{ background: '#EFF6FF', border: 'none', cursor: 'pointer', color: '#0057B7', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '12px' }}>+ Cc</button>}
                                            {!showBcc && <button type="button" onClick={() => setShowBcc(true)} style={{ background: '#EFF6FF', border: 'none', cursor: 'pointer', color: '#0057B7', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '12px' }}>+ Bcc</button>}
                                        </div>
                                    )}
                                    {showCc && (
                                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F1F5F9', padding: '10px 0' }}>
                                            <span style={{ width: '52px', fontSize: '14px', color: '#64748B', fontWeight: 600, flexShrink: 0 }}>Cc:</span>
                                            <input type="text" placeholder="Cc..." value={composeData.cc}
                                                onChange={e => setComposeData({ ...composeData, cc: e.target.value })}
                                                style={{ flex: 1, border: 'none', padding: '4px', fontSize: '14px', outline: 'none', color: '#1E293B', minWidth: 0 }} />
                                            <button type="button" onClick={() => setShowCc(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}><X size={14} /></button>
                                        </div>
                                    )}
                                    {showBcc && (
                                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F1F5F9', padding: '10px 0' }}>
                                            <span style={{ width: '52px', fontSize: '14px', color: '#64748B', fontWeight: 600, flexShrink: 0 }}>Bcc:</span>
                                            <input type="text" placeholder="Bcc..." value={composeData.bcc}
                                                onChange={e => setComposeData({ ...composeData, bcc: e.target.value })}
                                                style={{ flex: 1, border: 'none', padding: '4px', fontSize: '14px', outline: 'none', color: '#1E293B', minWidth: 0 }} />
                                            <button type="button" onClick={() => setShowBcc(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}><X size={14} /></button>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0' }}>
                                        <span style={{ width: '52px', fontSize: '14px', color: '#64748B', fontWeight: 600, flexShrink: 0 }}>Konu:</span>
                                        <input type="text" placeholder="İleti konusu..." value={composeData.subject}
                                            onChange={e => setComposeData({ ...composeData, subject: e.target.value })}
                                            style={{ flex: 1, border: 'none', padding: '4px', fontSize: '14px', outline: 'none', fontWeight: 600, color: '#1E293B', minWidth: 0 }} required />
                                    </div>
                                </div>

                                {attachments.length > 0 && (
                                    <div style={{ padding: isMobile ? '6px 12px' : '4px 20px', display: 'flex', flexWrap: 'wrap', gap: '6px', flexShrink: 0 }}>
                                        {attachments.map((file, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', color: '#334155', border: '1px solid #E2E8F0' }}>
                                                <Paperclip size={11} />
                                                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                                <button type="button" onClick={() => removeAttachment(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#EF4444' }}><X size={11} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <RichTextEditor value={composeData.body} onChange={(html: string) => setComposeData({ ...composeData, body: html })} />
                                </div>

                                <div style={{ height: isMobile ? '56px' : '72px', borderTop: '1px solid #E2E8F0', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {!isMobile && (
                                            <button type="submit" disabled={sending} style={{ backgroundColor: '#0057B7', color: 'white', border: 'none', padding: '10px 28px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: sending ? 0.7 : 1 }}>
                                                {sending ? 'Gönderiliyor...' : <><span>Gönder</span><Send size={16} /></>}
                                            </button>
                                        )}
                                        <button type="button" onClick={() => fileInputRef.current?.click()}
                                            style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Paperclip size={isMobile ? 22 : 20} />
                                            {isMobile && <span style={{ fontSize: '12px' }}>Ekle</span>}
                                        </button>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} multiple />
                                    </div>
                                    <button type="button" onClick={handleDiscard}
                                        style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Trash2 size={isMobile ? 22 : 20} />
                                        {isMobile && <span style={{ fontSize: '12px', color: '#94A3B8' }}>Sil</span>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* DESKTOP MODALS */}
            <AnimatePresence>
                {!isMobile && isSettingsOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            style={{ backgroundColor: colors.bg, width: '400px', borderRadius: '12px', border: `1px solid ${colors.sidebarBorder}`, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.sidebarBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ color: colors.text, margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={18} color={colors.accent} /> Ayarlar</h3>
                                <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'none', border: 'none', color: colors.subtext, cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <div style={{ padding: '24px 20px', color: colors.text, fontSize: '14px' }}>
                                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Aydınlık/Karanlık Tema</span>
                                    <button onClick={toggleTheme} style={{ background: colors.inputBg, border: `1px solid ${colors.sidebarBorder}`, color: colors.text, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                                        {theme === 'dark' ? 'Aydınlık Moda Geç' : 'Karanlık Moda Geç'}
                                    </button>
                                </div>
                                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Bildirimler</span>
                                    <span style={{ fontSize: '12px', color: colors.subtext, padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>Çok Yakında</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>İmza Ayarları</span>
                                    <span style={{ fontSize: '12px', color: colors.subtext, padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>Çok Yakında</span>
                                </div>
                            </div>
                            <div style={{ padding: '16px 20px', borderTop: `1px solid ${colors.sidebarBorder}`, display: 'flex', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                                <button onClick={() => setIsSettingsOpen(false)} style={{ background: colors.accent, color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Kapat</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {!isMobile && isCalendarOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            style={{ backgroundColor: colors.bg, width: '400px', borderRadius: '12px', border: `1px solid ${colors.sidebarBorder}`, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.sidebarBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ color: colors.text, margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={18} color={colors.accent} /> Takvim Görevleri</h3>
                                <button onClick={() => setIsCalendarOpen(false)} style={{ background: 'none', border: 'none', color: colors.subtext, cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: colors.subtext, fontSize: '14px' }}>
                                <Calendar size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                <p>Takvim özelliği şu anda geliştirme aşamasındadır.<br />Yakında eklenecek.</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    );
}
