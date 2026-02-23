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

    // Auth + initial data fetch — does NOT depend on isMobile to avoid double-fetching
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
    }, [router]);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setAttachments(prev => [...prev, ...newFiles]);
        }
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
            attachments.forEach(file => formData.append('attachments', file));

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            {/* TOOLBAR */}
            <header style={{ height: isMobile ? '52px' : '42px', backgroundColor: '#0057B7', color: 'white', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: '12px', zIndex: 100, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    {/* Mobile back button */}
                    {isMobile && mobileView === 'detail' && (
                        <button
                            onClick={() => { setMobileView('list'); setSelectedMail(null); }}
                            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}
                        >
                            <ChevronLeft size={16} /> Geri
                        </button>
                    )}
                    {isMobile && mobileView === 'list' && (
                        <button
                            onClick={() => setMobileView('sidebar')}
                            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                        >
                            <Menu size={18} />
                        </button>
                    )}
                    {(!isMobile || mobileView !== 'detail') && (
                        <span style={{ fontWeight: 700, fontSize: isMobile ? '15px' : '14px' }}>Softigo BulutMail</span>
                    )}
                    {isMobile && mobileView === 'detail' && selectedMail && (
                        <span style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMail.subject || '(Konu Yok)'}</span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!isMobile && <span style={{ fontSize: '12px' }}>{userEmail}</span>}
                    {isMobile && mobileView !== 'detail' && (
                        <button
                            onClick={() => setIsComposeOpen(true)}
                            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
                        >
                            <Send size={14} /> Yaz
                        </button>
                    )}
                    {isMobile && mobileView === 'detail' && selectedMail && (
                        <button
                            onClick={() => selectedMail && handleReplyMail(selectedMail)}
                            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}
                        >
                            <Reply size={14} /> Yanıtla
                        </button>
                    )}
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}><LogOut size={16} /></button>
                </div>
            </header>

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
                <div style={{ padding: '8px 12px', backgroundColor: 'white', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px' }}>
                        <Search size={16} style={{ color: '#94A3B8' }} />
                        <input type="text" placeholder="E-postalarda ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'none', outline: 'none', marginLeft: '8px', fontSize: '14px', width: '100%', color: '#1E293B' }} />
                        <button onClick={() => fetchMails(selectedFolder)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                            <RefreshCw size={16} />
                        </button>
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
                    backgroundColor: 'white',
                    borderRight: isMobile ? 'none' : '1px solid #E2E8F0',
                    overflowY: 'auto',
                    display: isMobile ? (mobileView === 'list' ? 'block' : 'none') : 'block'
                }}>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <RefreshCw size={24} style={{ opacity: 0.4, animation: 'spin 1s linear infinite' }} />
                            Yükleniyor...
                        </div>
                    ) : filteredMails.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94A3B8' }}>
                            <Mail size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
                            <p style={{ fontWeight: 500 }}>İleti yok</p>
                        </div>
                    ) : (
                        filteredMails.map(mail => (
                            <div key={mail.uid} onClick={() => handleMailSelect(mail)} style={{
                                padding: isMobile ? '14px 16px' : '12px 16px',
                                borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
                                backgroundColor: selectedMail?.uid === mail.uid ? '#EFF6FF' : 'transparent',
                                borderLeft: mail.flags?.includes('\\Seen') ? '3px solid transparent' : '3px solid #0057B7',
                                display: 'flex', gap: '12px', alignItems: 'flex-start',
                                transition: 'background-color 0.1s'
                            }}>
                                {!isMobile && (
                                    <div onClick={(e) => toggleSelectMail(e, mail.uid)} style={{ marginTop: '2px', cursor: 'pointer' }}>
                                        {selectedUids.includes(mail.uid) ? (
                                            <CheckSquare size={16} style={{ color: '#0057B7' }} />
                                        ) : (
                                            <Square size={16} style={{ color: '#CBD5E1' }} />
                                        )}
                                    </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: isMobile ? '15px' : '14px', fontWeight: mail.flags?.includes('\\Seen') ? 500 : 800, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{mail.from}</span>
                                        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 400, flexShrink: 0 }}>{new Date(mail.date).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                    <div style={{ fontSize: isMobile ? '14px' : '13px', fontWeight: mail.flags?.includes('\\Seen') ? 400 : 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: isMobile ? '4px' : '0' }}>{mail.subject || '(Konu Yok)'}</div>
                                    {isMobile && <div style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                        <ChevronRight size={12} />
                                        <span>Görüntüle</span>
                                    </div>}
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
                    width: isMobile ? '100%' : 'auto'
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
                            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                                {selectedMail.loading ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>Yükleniyor...</div>
                                ) : (
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
                                        style={{ width: '100%', height: 'calc(100% - 60px)', border: 'none', borderRadius: '8px', backgroundColor: 'white' }}
                                    />
                                )}
                            </div>

                            {/* ATTACHMENTS DISPLAY */}
                            {!selectedMail.loading && selectedMail.attachments && selectedMail.attachments.length > 0 && (
                                <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', backgroundColor: '#F8FAFC' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <Paperclip size={16} style={{ color: '#64748B' }} />
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>EKLER ({selectedMail.attachments.length})</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        {selectedMail.attachments.map((att: any, idx: number) => (
                                            <a
                                                key={idx}
                                                href={`${process.env.NEXT_PUBLIC_API_URL}/api/mails/${selectedMail.uid}/attachments/${encodeURIComponent(att.filename)}?folder=${encodeURIComponent(selectedFolder)}&token=${encodeURIComponent(localStorage.getItem("softigo_token") || "")}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => {
                                                    if (!confirm(`"${att.filename}" dosyasını indirmek istiyor musunuz?`)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '8px 12px',
                                                    backgroundColor: 'white',
                                                    border: '1px solid #E2E8F0',
                                                    borderRadius: '6px',
                                                    textDecoration: 'none',
                                                    color: '#1E293B',
                                                    transition: 'all 0.2s'
                                                }}
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

            {/* MOBILE BOTTOM NAV */}
            {isMobile && (
                <nav style={{
                    height: '64px',
                    backgroundColor: 'white',
                    borderTop: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'stretch',
                    flexShrink: 0,
                    boxShadow: '0 -2px 8px rgba(0,0,0,0.06)'
                }}>
                    <button onClick={() => setMobileView('sidebar')} style={{
                        flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
                        color: mobileView === 'sidebar' ? '#0057B7' : '#94A3B8',
                        borderTop: mobileView === 'sidebar' ? '2px solid #0057B7' : '2px solid transparent',
                        fontSize: '10px', fontWeight: 600, paddingTop: '2px'
                    }}>
                        <Menu size={20} />
                        Klasörler
                    </button>
                    <button onClick={() => setMobileView('list')} style={{
                        flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
                        color: mobileView === 'list' ? '#0057B7' : '#94A3B8',
                        borderTop: mobileView === 'list' ? '2px solid #0057B7' : '2px solid transparent',
                        fontSize: '10px', fontWeight: 600, paddingTop: '2px'
                    }}>
                        <Inbox size={20} />
                        E-Postalar
                    </button>
                    <button onClick={() => setIsComposeOpen(true)} style={{
                        flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
                        color: '#0057B7',
                        borderTop: '2px solid transparent',
                        fontSize: '10px', fontWeight: 600, paddingTop: '2px'
                    }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#0057B7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '-6px', boxShadow: '0 2px 8px rgba(0,87,183,0.4)' }}>
                            <Send size={16} color="white" />
                        </div>
                        Oluştur
                    </button>
                    <button onClick={() => selectedMail && setMobileView('detail')} style={{
                        flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
                        color: mobileView === 'detail' ? '#0057B7' : '#94A3B8',
                        borderTop: mobileView === 'detail' ? '2px solid #0057B7' : '2px solid transparent',
                        fontSize: '10px', fontWeight: 600, paddingTop: '2px',
                        opacity: selectedMail ? 1 : 0.4
                    }}>
                        <Mail size={20} />
                        İleti
                    </button>
                    <button onClick={handleLogout} style={{
                        flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
                        color: '#94A3B8',
                        borderTop: '2px solid transparent',
                        fontSize: '10px', fontWeight: 600, paddingTop: '2px'
                    }}>
                        <LogOut size={20} />
                        Çıkış
                    </button>
                </nav>
            )}

            {/* COMPOSE MODAL */}
            <AnimatePresence>
                {isComposeOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            style={{ width: '100%', maxWidth: '850px', height: '90vh', backgroundColor: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
                        >
                            {/* Modal Header */}
                            <div style={{ height: '56px', backgroundColor: '#0057B7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '6px' }}>
                                        <Mail size={18} />
                                    </div>
                                    <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.3px' }}>Yeni İleti Oluştur</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button onClick={() => setIsComposeOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Form */}
                            <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0' }}>
                                <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column' }}>
                                    {/* Recipient Field */}
                                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F1F5F9', padding: '8px 0' }}>
                                        <span style={{ width: '60px', fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Kime:</span>
                                        <input
                                            type="text"
                                            placeholder="E-posta adresi yazın..."
                                            value={composeData.to}
                                            onChange={e => setComposeData({ ...composeData, to: e.target.value })}
                                            style={{ flex: 1, border: 'none', padding: '8px 4px', fontSize: '14px', outline: 'none', fontWeight: 500, color: '#1E293B' }}
                                            required
                                        />
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#0057B7', fontWeight: 600 }}>
                                            {!showCc && <button type="button" onClick={() => setShowCc(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Bilgi (Cc)</button>}
                                            {!showBcc && <button type="button" onClick={() => setShowBcc(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Gizli (Bcc)</button>}
                                        </div>
                                    </div>

                                    {/* Cc Field */}
                                    {showCc && (
                                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F1F5F9', padding: '8px 0' }}>
                                            <span style={{ width: '60px', fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Cc:</span>
                                            <input
                                                type="text"
                                                placeholder="Cc e-posta adresi..."
                                                value={composeData.cc}
                                                onChange={e => setComposeData({ ...composeData, cc: e.target.value })}
                                                style={{ flex: 1, border: 'none', padding: '8px 4px', fontSize: '14px', outline: 'none', fontWeight: 500, color: '#1E293B' }}
                                            />
                                            <button type="button" onClick={() => setShowCc(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={14} /></button>
                                        </div>
                                    )}

                                    {/* Bcc Field */}
                                    {showBcc && (
                                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F1F5F9', padding: '8px 0' }}>
                                            <span style={{ width: '60px', fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Bcc:</span>
                                            <input
                                                type="text"
                                                placeholder="Bcc e-posta adresi..."
                                                value={composeData.bcc}
                                                onChange={e => setComposeData({ ...composeData, bcc: e.target.value })}
                                                style={{ flex: 1, border: 'none', padding: '8px 4px', fontSize: '14px', outline: 'none', fontWeight: 500, color: '#1E293B' }}
                                            />
                                            <button type="button" onClick={() => setShowBcc(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={14} /></button>
                                        </div>
                                    )}

                                    {/* Subject Field */}
                                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F1F5F9', padding: '8px 0' }}>
                                        <span style={{ width: '60px', fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Konu:</span>
                                        <input
                                            type="text"
                                            placeholder="İleti konusu girin..."
                                            value={composeData.subject}
                                            onChange={e => setComposeData({ ...composeData, subject: e.target.value })}
                                            style={{ flex: 1, border: 'none', padding: '8px 4px', fontSize: '14px', outline: 'none', fontWeight: 600, color: '#1E293B' }}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Attachments List */}
                                {attachments.length > 0 && (
                                    <div style={{ padding: '0 20px 8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {attachments.map((file, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                backgroundColor: '#F1F5F9',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                color: '#334155',
                                                border: '1px solid #E2E8F0'
                                            }}>
                                                <Paperclip size={12} />
                                                <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachment(idx)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: '#EF4444' }}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Rich Text Editor Area */}
                                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <RichTextEditor
                                        value={composeData.body}
                                        onChange={(html: string) => setComposeData({ ...composeData, body: html })}
                                    />
                                </div>

                                {/* Bottom Action Bar */}
                                <div style={{ height: '72px', borderTop: '1px solid #E2E8F0', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <button type="submit" disabled={sending} style={{
                                            backgroundColor: '#0057B7',
                                            color: 'white',
                                            border: 'none',
                                            padding: '12px 32px',
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            fontSize: '15px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 87, 183, 0.3)',
                                            opacity: sending ? 0.7 : 1,
                                            transition: 'all 0.2s'
                                        }}>
                                            {sending ? (
                                                <>Yükleniyor...</>
                                            ) : (
                                                <>
                                                    <span>Gönder</span>
                                                    <Send size={18} />
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '8px', borderRadius: '6px', transition: 'all 0.2s' }}
                                            title="Dosya Ekle"
                                        >
                                            <Paperclip size={20} />
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                            multiple
                                        />
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={handleDiscard}
                                            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '8px', borderRadius: '6px' }}
                                            title="Çöpe At"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

