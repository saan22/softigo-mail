"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Inbox, Send, Trash2, Star, Mail, Search,
    RefreshCw, LogOut, Calendar, User, X, ArrowRight,
    FileText, AlertOctagon, Archive, Reply, Paperclip,
    Sun, Moon, Download, Menu, Settings, Bell,
    TrendingUp, CloudSun, MapPin, Globe, ExternalLink,
    ChevronDown, ChevronUp, Clock, Info, Globe2,
    ChevronLeft, ChevronRight, Square, CheckSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RichTextEditor from "../../components/RichTextEditor";
import { useTheme } from "../../context/ThemeContext";

export default function Dashboard() {
    const router = useRouter();
    const { theme, toggleTheme, colors } = useTheme();
    const [mails, setMails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMail, setSelectedMail] = useState<any>(null);
    const [draftUid, setDraftUid] = useState<number | null>(null);
    const [userEmail, setUserEmail] = useState("");
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeData, setComposeData] = useState({ to: "", subject: "", body: "", cc: "", bcc: "" });
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState("INBOX");
    const [folders, setFolders] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUids, setSelectedUids] = useState<number[]>([]);
    const [widgetData, setWidgetData] = useState<any>({
        rates: [],
        weather: { temp: "--", desc: "Yükleniyor...", city: "İstanbul" },
        news: []
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fetchIdRef = useRef(0); // Race condition guard

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
        fetchWidgetData();
    }, []); // Empty deps = mount only, router is stable within session

    // Re-fetch mails only when selected folder changes
    useEffect(() => {
        const token = localStorage.getItem("softigo_token");
        if (!token) return;
        fetchMails(selectedFolder);
    }, [selectedFolder]);

    const fetchWidgetData = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/widgets/data`);
            const result = await response.json();
            if (result.success) {
                setWidgetData(result.data);
            }
        } catch (error) {
            console.error("Widget verisi çekme hatası:", error);
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
            localStorage.removeItem("softigo_token");
            localStorage.removeItem("softigo_user");
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
        <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: 'var(--app-height, 100vh)', backgroundColor: isMobile ? '#F2F2F7' : '#FFFFFF', overflow: 'hidden' }}>

            {/* ── MOBILE HEADER (list/sidebar) ── */}
            {isMobile && mobileView !== 'detail' && (
                <header style={{ height: '60px', backgroundColor: 'white', borderBottom: '1px solid #E5E5EA', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', flexShrink: 0, zIndex: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src="/logo.png" alt="Softigo" style={{ height: '28px' }} />
                        <span style={{ fontWeight: 700, fontSize: '20px', color: '#1C1C1E', letterSpacing: '-0.3px' }}>Softigo Mail</span>
                    </div>
                    <button onClick={() => setIsComposeOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Search size={22} color="#007AFF" />
                    </button>
                </header>
            )}

            {/* ── MOBILE HEADER (detail view) ── */}
            {isMobile && mobileView === 'detail' && (
                <header style={{ height: '52px', backgroundColor: '#0057B7', color: 'white', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between', flexShrink: 0, zIndex: 100 }}>
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

            {/* ── DESKTOP HEADER ── */}
            {!isMobile && (
                <header style={{ height: '42px', backgroundColor: '#0057B7', color: 'white', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: '12px', zIndex: 100, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>Softigo BulutMail</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span>{userEmail}</span>
                        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><LogOut size={16} /></button>
                    </div>
                </header>
            )}

            {/* ACTION BAR - Desktop Only */}
            {!isMobile && <div style={{ height: '48px', backgroundColor: 'white', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => setIsComposeOpen(true)} style={{ backgroundColor: '#0057B7', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Send size={14} /> Oluştur
                </button>
                <button onClick={() => fetchMails(selectedFolder)} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 500, marginLeft: '8px' }}>
                    <RefreshCw size={14} /> Yenile
                </button>

                <div style={{ width: '1px', height: '24px', backgroundColor: '#E2E8F0', margin: '0 8px' }} />

                <div
                    onClick={toggleSelectAll}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '4px', backgroundColor: selectedUids.length > 0 ? '#F1F5F9' : 'transparent' }}
                    title="Tümünü Seç/Kaldır"
                >
                    {selectedUids.length === filteredMails.length && filteredMails.length > 0 ? (
                        <CheckSquare size={18} style={{ color: '#0057B7' }} />
                    ) : (
                        <Square size={18} style={{ color: '#94A3B8' }} />
                    )}
                </div>

                {/* MAIL ACTIONS */}
                <div style={{ width: '1px', height: '24px', backgroundColor: '#E2E8F0', margin: '0 8px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        onClick={() => selectedMail && handleReplyMail(selectedMail)}
                        disabled={!selectedMail}
                        title="Yanıtla"
                        style={{ background: 'none', border: 'none', color: selectedMail ? '#475569' : '#CBD5E1', cursor: selectedMail ? 'pointer' : 'default', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                    >
                        <Reply size={18} />
                    </button>
                    <button
                        disabled={!selectedMail}
                        title="İlet"
                        style={{ background: 'none', border: 'none', color: selectedMail ? '#475569' : '#CBD5E1', cursor: selectedMail ? 'pointer' : 'default', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                    >
                        <ArrowRight size={18} />
                    </button>
                    <button
                        onClick={() => {
                            const uids = selectedUids.length > 0 ? selectedUids.join(',') : selectedMail?.uid;
                            if (uids) handleArchiveMail(uids);
                        }}
                        disabled={!(selectedMail || selectedUids.length > 0)}
                        title="Arşivle"
                        style={{ background: 'none', border: 'none', color: (selectedMail || selectedUids.length > 0) ? '#475569' : '#CBD5E1', cursor: (selectedMail || selectedUids.length > 0) ? 'pointer' : 'default', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                    >
                        <Archive size={18} />
                    </button>
                    <button
                        onClick={() => {
                            const uids = selectedUids.length > 0 ? selectedUids.join(',') : selectedMail?.uid;
                            if (uids) handleMarkAsSpam(uids);
                        }}
                        disabled={!(selectedMail || selectedUids.length > 0)}
                        title="Spam"
                        style={{ background: 'none', border: 'none', color: (selectedMail || selectedUids.length > 0) ? '#475569' : '#CBD5E1', cursor: (selectedMail || selectedUids.length > 0) ? 'pointer' : 'default', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                    >
                        <AlertOctagon size={18} />
                    </button>
                    <button
                        onClick={() => {
                            const uids = selectedUids.length > 0 ? selectedUids.join(',') : selectedMail?.uid;
                            if (uids) handleDeleteMail(uids);
                        }}
                        disabled={!(selectedMail || selectedUids.length > 0)}
                        title="Sil"
                        style={{ background: 'none', border: 'none', color: (selectedMail || selectedUids.length > 0) ? '#EF4444' : '#CBD5E1', cursor: (selectedMail || selectedUids.length > 0) ? 'pointer' : 'default', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                <div style={{ width: '1px', height: '24px', backgroundColor: '#E2E8F0', margin: '0 8px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        onClick={() => handleNavigate('prev')}
                        disabled={!selectedMail || filteredMails.findIndex(m => m.uid === selectedMail.uid) <= 0}
                        title="Önceki"
                        style={{ background: 'none', border: 'none', color: (!selectedMail || filteredMails.findIndex(m => m.uid === selectedMail.uid) <= 0) ? '#CBD5E1' : '#475569', cursor: 'pointer', padding: '6px', borderRadius: '4px' }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => handleNavigate('next')}
                        disabled={!selectedMail || filteredMails.findIndex(m => m.uid === selectedMail.uid) === (filteredMails.length - 1)}
                        title="Sonraki"
                        style={{ background: 'none', border: 'none', color: (!selectedMail || filteredMails.findIndex(m => m.uid === selectedMail.uid) === (filteredMails.length - 1)) ? '#CBD5E1' : '#475569', cursor: 'pointer', padding: '6px', borderRadius: '4px' }}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '6px 12px', width: '320px' }}>
                    <Search size={16} style={{ color: '#64748B' }} />
                    <input type="text" placeholder="E-postalarda ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'none', outline: 'none', marginLeft: '8px', fontSize: '14px', width: '100%', color: '#1E293B' }} />
                </div>
            </div>}

            {/* MOBILE SEARCH BAR */}
            {isMobile && mobileView === 'list' && (
                <div style={{ padding: '10px 16px', backgroundColor: 'white', borderBottom: '1px solid #E5E5EA', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: '10px', padding: '8px 14px', gap: '8px' }}>
                        <Search size={16} style={{ color: '#8E8E93', flexShrink: 0 }} />
                        <input type="text" placeholder="Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'none', outline: 'none', fontSize: '15px', width: '100%', color: '#1C1C1E' }} />
                        {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8E8E93', padding: 0, display: 'flex' }}><X size={16} /></button>}
                    </div>
                </div>
            )}

            <main style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                {/* COL 1: SIDEBAR - Desktop always visible, Mobile shown only when mobileView==='sidebar' */}
                <div style={{
                    width: isMobile ? '100%' : '220px',
                    backgroundColor: '#FFFFFF',
                    borderRight: isMobile ? 'none' : '1px solid #E2E8F0',
                    display: isMobile ? (mobileView === 'sidebar' ? 'flex' : 'none') : 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto'
                }}>
                    <div style={{ padding: isMobile ? '24px 20px' : '32px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                        <img src="/logo.png" alt="SOFTIGO" style={{ height: isMobile ? '64px' : '96px' }} />
                        {isMobile && <div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0057B7' }}>BulutMail</div>
                            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>{userEmail}</div>
                        </div>}
                    </div>
                    <div style={{ padding: '0 16px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>KLASÖRLER</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {folders.map(folder => {
                                const info = getFolderInfo(folder.type, folder.name);
                                return (
                                    <button key={folder.path} onClick={() => { setSelectedFolder(folder.path); if (isMobile) setMobileView('list'); }} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: isMobile ? '14px 16px' : '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                                        backgroundColor: selectedFolder === folder.path ? '#EFF6FF' : 'transparent',
                                        color: selectedFolder === folder.path ? '#0057B7' : '#334155',
                                        fontSize: isMobile ? '15px' : '14px', fontWeight: selectedFolder === folder.path ? 700 : 500,
                                        transition: 'all 0.15s'
                                    }}>
                                        {info.icon} {info.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {isMobile && (
                        <div style={{ marginTop: 'auto', padding: '24px 16px', borderTop: '1px solid #E2E8F0' }}>
                            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%', backgroundColor: '#FEF2F2', color: '#EF4444', fontSize: '15px', fontWeight: 600 }}>
                                <LogOut size={18} /> Oturumu Kapat
                            </button>
                        </div>
                    )}
                </div>

                {/* COL 2: MAIL LIST */}
                <div style={{
                    width: isMobile ? '100%' : '350px',
                    backgroundColor: isMobile ? '#F2F2F7' : 'white',
                    borderRight: isMobile ? 'none' : '1px solid #E2E8F0',
                    overflowY: 'auto',
                    display: isMobile ? (mobileView === 'list' ? 'block' : 'none') : 'block'
                }}>
                    {loading ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#8E8E93', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <RefreshCw size={24} style={{ opacity: 0.4 }} />
                            Yükleniyor...
                        </div>
                    ) : filteredMails.length === 0 ? (
                        <div style={{ padding: '80px 20px', textAlign: 'center', color: '#8E8E93' }}>
                            <Mail size={48} style={{ opacity: 0.15, margin: '0 auto 16px', display: 'block' }} />
                            <p style={{ fontWeight: 500, fontSize: '16px' }}>İleti yok</p>
                        </div>
                    ) : isMobile ? (
                        // ── MOBILE STYLED MAIL LIST ──
                        <div style={{ backgroundColor: 'white', margin: '0', borderRadius: '0' }}>
                            {/* Unread section header */}
                            {unreadCount > 0 && (
                                <div style={{ padding: '14px 20px 6px', fontSize: '12px', fontWeight: 700, color: '#8E8E93', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                                    Okunmamış
                                </div>
                            )}
                            {filteredMails.filter(m => !m.flags?.includes('\\Seen')).map(mail => (
                                <div key={`unread-${mail.uid}`} onClick={() => handleMailSelect(mail)} style={{
                                    display: 'flex', alignItems: 'center', padding: '12px 20px', gap: '14px',
                                    borderBottom: '1px solid #F2F2F7', cursor: 'pointer', backgroundColor: 'white'
                                }}>
                                    <div style={{ width: 46, height: 46, borderRadius: '50%', backgroundColor: getAvatarColor(mail.from || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
                                        <span style={{ color: 'white', fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px' }}>{getInitials(mail.from || 'U')}</span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#1C1C1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{getDisplayName(mail.from || '')}</span>
                                            <span style={{ fontSize: '12px', color: '#8E8E93', flexShrink: 0, marginLeft: '8px' }}>{formatMailDate(mail.date)}</span>
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1C1C1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{mail.subject || '(Konu Yok)'}</div>
                                        <div style={{ fontSize: '13px', color: '#8E8E93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Görüntülemek için dokunun...</div>
                                    </div>
                                    <ChevronRight size={16} color="#C7C7CC" style={{ flexShrink: 0 }} />
                                </div>
                            ))}

                            {/* Read section */}
                            {filteredMails.some(m => m.flags?.includes('\\Seen')) && (
                                <div style={{ padding: '14px 20px 6px', fontSize: '12px', fontWeight: 700, color: '#8E8E93', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                                    Okunmuş
                                </div>
                            )}
                            {filteredMails.filter(m => m.flags?.includes('\\Seen')).map(mail => (
                                <div key={`read-${mail.uid}`} onClick={() => handleMailSelect(mail)} style={{
                                    display: 'flex', alignItems: 'center', padding: '12px 20px', gap: '14px',
                                    borderBottom: '1px solid #F2F2F7', cursor: 'pointer', backgroundColor: 'white'
                                }}>
                                    <div style={{ width: 46, height: 46, borderRadius: '50%', backgroundColor: '#E5E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <span style={{ color: '#8E8E93', fontWeight: 600, fontSize: '16px' }}>{getInitials(mail.from || 'U')}</span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                            <span style={{ fontSize: '15px', fontWeight: 500, color: '#3A3A3C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{getDisplayName(mail.from || '')}</span>
                                            <span style={{ fontSize: '12px', color: '#8E8E93', flexShrink: 0, marginLeft: '8px' }}>{formatMailDate(mail.date)}</span>
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: 400, color: '#3A3A3C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{mail.subject || '(Konu Yok)'}</div>
                                        <div style={{ fontSize: '13px', color: '#8E8E93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Görüntülemek için dokunun...</div>
                                    </div>
                                    <ChevronRight size={16} color="#C7C7CC" style={{ flexShrink: 0 }} />
                                </div>
                            ))}

                            {/* Unread count bar */}
                            {unreadCount > 0 && (
                                <div style={{ padding: '16px 20px', textAlign: 'center', fontSize: '14px', color: '#007AFF', fontWeight: 500 }}>
                                    {unreadCount} okunmamış
                                </div>
                            )}
                        </div>
                    ) : (
                        // ── DESKTOP MAIL LIST ──
                        filteredMails.map(mail => (
                            <div key={mail.uid} onClick={() => handleMailSelect(mail)} style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
                                backgroundColor: selectedMail?.uid === mail.uid ? '#EFF6FF' : 'transparent',
                                borderLeft: mail.flags?.includes('\\Seen') ? '3px solid transparent' : '3px solid #0057B7',
                                display: 'flex', gap: '12px', alignItems: 'flex-start',
                                transition: 'background-color 0.1s'
                            }}>
                                <div onClick={(e) => toggleSelectMail(e, mail.uid)} style={{ marginTop: '2px', cursor: 'pointer' }}>
                                    {selectedUids.includes(mail.uid) ? (
                                        <CheckSquare size={16} style={{ color: '#0057B7' }} />
                                    ) : (
                                        <Square size={16} style={{ color: '#CBD5E1' }} />
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: mail.flags?.includes('\\Seen') ? 500 : 800, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{mail.from}</span>
                                        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 400, flexShrink: 0 }}>{new Date(mail.date).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: mail.flags?.includes('\\Seen') ? 400 : 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mail.subject || '(Konu Yok)'}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* COL 3: CONTENT */}
                <div style={{
                    flex: 1,
                    backgroundColor: 'white',
                    display: isMobile ? (mobileView === 'detail' ? 'flex' : 'none') : 'flex',
                    flexDirection: 'column',
                    width: isMobile ? '100%' : 'auto',
                    overflowY: isMobile ? 'auto' : 'hidden'  // mobile: full scroll
                }}>
                    {selectedMail ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ padding: '24px', borderBottom: '1px solid #F1F5F9' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>{selectedMail.subject || '(Konu Yok)'}</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: '#0057B7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{selectedMail.from?.charAt(0).toUpperCase()}</div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{selectedMail.from}</div>
                                        <div style={{ fontSize: '12px', color: '#94A3B8' }}>{new Date(selectedMail.date).toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                            {/* Mail body */}
                            <div style={{ flex: isMobile ? 'none' : 1, padding: isMobile ? '16px' : '24px', overflowY: isMobile ? 'visible' : 'auto' }}>
                                {selectedMail.loading ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>Yükleniyor...</div>
                                ) : (
                                    <>
                                        <iframe
                                            srcDoc={`
                                            <html>
                                                <head>
                                                    <style>
                                                        body { 
                                                            font-family: 'Inter', system-ui, -apple-system, sans-serif; 
                                                            line-height: 1.6; 
                                                            color: #1e293b; 
                                                            margin: 0;
                                                            padding: 20px;
                                                            background-color: white;
                                                        }
                                                        img { max-width: 100%; height: auto; }
                                                        a { color: #0057b7; }
                                                    </style>
                                                </head>
                                               <body>${selectedMail.body}</body>
                                            </html>
                                        `}
                                            style={{
                                                width: '100%',
                                                height: isMobile ? '320px' : 'calc(100% - 60px)',
                                                minHeight: isMobile ? '200px' : 'auto',
                                                border: 'none',
                                                borderRadius: '8px',
                                                backgroundColor: 'white'
                                            }}
                                        />
                                        {/* Mobile: tap to fullscreen button */}
                                        {isMobile && (
                                            <button
                                                onClick={() => setIsIframeFullscreen(true)}
                                                style={{
                                                    marginTop: '8px', width: '100%', padding: '10px',
                                                    backgroundColor: '#F0F7FF', border: '1px solid #DBEAFE',
                                                    borderRadius: '8px', color: '#0057B7', fontSize: '13px',
                                                    fontWeight: 600, cursor: 'pointer', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                                                Tam Ekranda Oku
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* ── FULLSCREEN IFRAME OVERLAY (Mobile only) ── */}
                            {isMobile && isIframeFullscreen && !selectedMail.loading && (
                                <div style={{
                                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: 'white', zIndex: 9999,
                                    display: 'flex', flexDirection: 'column'
                                }}>
                                    {/* Fullscreen header */}
                                    <div style={{
                                        height: '52px', backgroundColor: '#0057B7', color: 'white',
                                        display: 'flex', alignItems: 'center', padding: '0 16px',
                                        justifyContent: 'space-between', flexShrink: 0,
                                        paddingTop: 'env(safe-area-inset-top)'
                                    }}>
                                        <span style={{ fontSize: '15px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                                            {selectedMail.subject || '(Konu Yok)'}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setIsIframeFullscreen(false);
                                                // Zoom'u kapat, orijinal viewport'a dön
                                                const vp = document.querySelector('meta[name=viewport]');
                                                if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
                                            }}
                                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <X size={16} /> Kapat
                                        </button>
                                    </div>
                                    {/* Fullscreen iframe - zoom aktif */}
                                    <iframe
                                        srcDoc={`
                                            <html>
                                                <head><style>
                                                    body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.7; color: #1e293b; margin: 0; padding: 20px; background: white; }
                                                    img { max-width: 100%; height: auto; }
                                                    a { color: #0057b7; }
                                                </style></head>
                                                <body>${selectedMail.body}</body>
                                            </html>
                                        `}
                                        style={{ flex: 1, border: 'none', width: '100%' }}
                                        onLoad={() => {
                                            // Zoom'u aç: tam ekrana geçince (minimum-scale=0.25 ile zoom-out da çalışır)
                                            const vp = document.querySelector('meta[name=viewport]');
                                            if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, minimum-scale=0.25, maximum-scale=5, user-scalable=yes, viewport-fit=cover');
                                        }}
                                    />
                                </div>
                            )}

                            {!selectedMail.loading && selectedMail.attachments && selectedMail.attachments.length > 0 && (
                                <div style={{
                                    padding: isMobile ? '12px 16px' : '16px 24px',
                                    borderTop: '1px solid #F1F5F9',
                                    backgroundColor: '#F8FAFC',
                                    flexShrink: 0
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                        <Paperclip size={14} style={{ color: '#64748B' }} />
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EKLER ({selectedMail.attachments.length})</span>
                                    </div>
                                    {/* Mobile: compact horizontal chips */}
                                    {isMobile ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {selectedMail.attachments.map((att: any, idx: number) => (
                                                <a
                                                    key={idx}
                                                    href={`${process.env.NEXT_PUBLIC_API_URL}/api/mails/${selectedMail.uid}/attachments/${encodeURIComponent(att.filename)}?folder=${encodeURIComponent(selectedFolder)}&token=${encodeURIComponent(localStorage.getItem("softigo_token") || "")}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    onClick={(e) => { if (!confirm(`"${att.filename}" dosyasını indirmek istiyor musunuz?`)) e.preventDefault(); }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', textDecoration: 'none', color: '#1E293B' }}
                                                >
                                                    <FileText size={16} style={{ color: '#0057B7', flexShrink: 0 }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</div>
                                                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>{(att.size / 1024).toFixed(1)} KB</div>
                                                    </div>
                                                    <Download size={16} style={{ color: '#007AFF', flexShrink: 0 }} />
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        // Desktop: wrap cards
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {selectedMail.attachments.map((att: any, idx: number) => (
                                                <a
                                                    key={idx}
                                                    href={`${process.env.NEXT_PUBLIC_API_URL}/api/mails/${selectedMail.uid}/attachments/${encodeURIComponent(att.filename)}?folder=${encodeURIComponent(selectedFolder)}&token=${encodeURIComponent(localStorage.getItem("softigo_token") || "")}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    onClick={(e) => { if (!confirm(`"${att.filename}" dosyasını indirmek istiyor musunuz?`)) e.preventDefault(); }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', textDecoration: 'none', color: '#1E293B', transition: 'all 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0057B7'}
                                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
                                                >
                                                    <div style={{ color: '#0057B7' }}><FileText size={18} /></div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</span>
                                                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>{(att.size / 1024).toFixed(1)} KB</span>
                                                    </div>
                                                    <Download size={14} style={{ color: '#94A3B8', marginLeft: '4px' }} />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                            <img src="/logo.png" alt="Softigo" style={{ height: '120px', opacity: 0.15, marginBottom: '20px' }} />
                            <p style={{ fontSize: '16px', fontWeight: 500 }}>Görüntülenecek bir ileti seçin</p>
                        </div>
                    )}
                </div>

                {/* COL 4: WIDGETS - Desktop Only */}
                <div style={{ width: '280px', backgroundColor: '#FFFFFF', borderLeft: '1px solid #E2E8F0', padding: '16px', overflowY: 'auto', display: isMobile ? 'none' : 'block' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', marginBottom: '12px', borderBottom: '2px solid #0057B7', paddingBottom: '4px' }}>DÖVİZ KURLARI</h4>
                        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {widgetData.rates.length > 0 ? widgetData.rates.map((rate: any) => (
                                <div key={rate.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#1E293B' }}>
                                    <span style={{ fontWeight: 700 }}>{rate.name}</span>
                                    <span style={{ fontWeight: 600 }}>{rate.value} ₺</span>
                                </div>
                            )) : <div style={{ fontSize: '12px', color: '#94A3B8' }}>Yükleniyor...</div>}
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', marginBottom: '12px', borderBottom: '2px solid #0057B7', paddingBottom: '4px' }}>HAVA DURUMU</h4>
                        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '20px', textAlign: 'center' }}>
                            <div style={{ fontSize: '36px', fontWeight: 600, color: '#1E293B' }}>{widgetData.weather?.temp}°C</div>
                            <div style={{ fontSize: '16px', color: '#334155', fontWeight: 600, textTransform: 'capitalize', marginTop: '4px' }}>{widgetData.weather?.desc}</div>
                            <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 500, marginTop: '4px' }}>{widgetData.weather?.city}</div>
                        </div>
                    </div>

                    <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', marginBottom: '12px', borderBottom: '2px solid #0057B7', paddingBottom: '4px' }}>HABERLER</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {widgetData.news.length > 0 ? widgetData.news.map((item: any, idx: number) => (
                                <div key={idx} style={{ fontSize: '13px', color: '#334155', fontWeight: 500, lineHeight: 1.5, paddingBottom: '10px', borderBottom: '1px solid #E2E8F0' }}>{item}</div>
                            )) : <div style={{ fontSize: '12px', color: '#94A3B8' }}>Yükleniyor...</div>}
                        </div>
                    </div>
                </div>
            </main>

            {/* ── MOBILE BOTTOM NAV ── */}
            {isMobile && (
                <nav style={{ height: '70px', backgroundColor: 'white', borderTop: '1px solid #E5E5EA', display: 'flex', alignItems: 'stretch', flexShrink: 0, boxShadow: '0 -1px 0 rgba(0,0,0,0.08)' }}>
                    {[
                        { icon: Inbox, label: 'Gelen', type: 'INBOX' },
                        { icon: Send, label: 'Giden', type: 'SENT' },
                        { icon: FileText, label: 'Taslak', type: 'DRAFTS' },
                        { icon: Trash2, label: 'Çöp', type: 'TRASH' },
                        { icon: Menu, label: 'Menü', type: 'MENU' },
                    ].map(item => {
                        const folderPath = item.type !== 'MENU' ? getFolderPath(item.type) : '';
                        const isActive = item.type === 'MENU'
                            ? mobileView === 'sidebar'
                            : selectedFolder === folderPath && mobileView === 'list';
                        const badge = item.type === 'INBOX' ? unreadCount : 0;
                        return (
                            <button key={item.label} onClick={() => {
                                if (item.type === 'MENU') { setMobileView('sidebar'); }
                                else { setSelectedFolder(folderPath); setMobileView('list'); }
                            }} style={{
                                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
                                color: isActive ? '#007AFF' : '#8E8E93',
                                fontSize: '10px', fontWeight: isActive ? 600 : 400,
                                position: 'relative', paddingBottom: '4px'
                            }}>
                                <div style={{ position: 'relative' }}>
                                    <item.icon size={24} />
                                    {badge > 0 && (
                                        <span style={{ position: 'absolute', top: '-6px', right: '-10px', backgroundColor: '#FF3B30', color: 'white', borderRadius: '10px', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, padding: '0 4px' }}>
                                            {badge > 99 ? '99+' : badge}
                                        </span>
                                    )}
                                </div>
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            )}

            {/* ── MOBILE COMPOSE FAB ── */}
            {isMobile && !isIframeFullscreen && (
                <button
                    onClick={() => setIsComposeOpen(true)}
                    style={{
                        position: 'fixed',
                        right: '20px',
                        bottom: '86px',  // bottom nav (70px) + 16px margin
                        width: '56px',
                        height: '56px',
                        borderRadius: '28px',
                        backgroundColor: '#007AFF',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(0, 122, 255, 0.45)',
                        zIndex: 100,
                        fontSize: '28px',
                        fontWeight: 300,
                        lineHeight: 1
                    }}
                >
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
        </div>
    );
}
