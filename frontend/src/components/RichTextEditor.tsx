"use client";

import {
    Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon,
    Image as ImageIcon, Quote, Type, AlignLeft, AlignCenter, AlignRight,
    Search, ChevronDown, Check, Palette
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const { theme, colors } = useTheme();

    // Sync initial value only once or when value changes externally (careful with loops)
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            // Only update if significantly different to avoid cursor jumping
            // Simple check: if empty, set it.
            if (editorRef.current.innerHTML === '<br>' && value === '') return;
            // For reply, we need to set the value.
            // We can check if the editor is focused. If focused, maybe don't update to avoid interrupts?
            // But for initial load (Reply click), it is needed.
            // Let's rely on parent controlling "initial" values mainly.
            if (!isFocused) {
                editorRef.current.innerHTML = value;
            }
        }
    }, [value, isFocused]);

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
            editorRef.current.focus();
        }
    };

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${colors.sidebarBorder}`,
            borderRadius: '8px',
            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            overflow: 'hidden',
            minHeight: '300px'
        }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                gap: '4px',
                padding: '8px 12px',
                flexWrap: 'wrap',
                borderBottom: `1px solid #E2E8F0`,
                backgroundColor: '#F1F5F9',
                alignItems: 'center'
            }}>
                <ToolbarButton icon={<Bold size={16} />} onClick={() => execCommand('bold')} tooltip="Kalın" />
                <ToolbarButton icon={<Italic size={16} />} onClick={() => execCommand('italic')} tooltip="İtalik" />
                <ToolbarButton icon={<Underline size={16} />} onClick={() => execCommand('underline')} tooltip="Altı Çizili" />

                <div style={{ width: '1px', height: '20px', backgroundColor: colors.sidebarBorder, margin: '0 8px' }} />

                <select
                    onChange={(e) => execCommand('fontSize', e.target.value)}
                    style={{ background: 'white', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', padding: '2px 8px', outline: 'none', cursor: 'pointer', color: '#1E293B', fontWeight: 600 }}
                >
                    <option value="3">Normal</option>
                    <option value="1">Çok Küçük</option>
                    <option value="2">Küçük</option>
                    <option value="4">Büyük</option>
                    <option value="5">Çok Büyük</option>
                    <option value="6">Başlık</option>
                </select>

                <div style={{ width: '1px', height: '20px', backgroundColor: '#E2E8F0', margin: '0 8px' }} />

                <select
                    onChange={(e) => execCommand('fontName', e.target.value)}
                    style={{ background: 'white', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', padding: '2px 8px', outline: 'none', cursor: 'pointer', color: '#1E293B', fontWeight: 600 }}
                >
                    <option value="Inter">Varsayılan</option>
                    <option value="Arial">Arial</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Tahoma">Tahoma</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Verdana">Verdana</option>
                </select>

                <div style={{ width: '1px', height: '20px', backgroundColor: '#E2E8F0', margin: '0 8px' }} />

                <ToolbarButton icon={<AlignLeft size={16} />} onClick={() => execCommand('justifyLeft')} tooltip="Sola Yasla" />
                <ToolbarButton icon={<AlignCenter size={16} />} onClick={() => execCommand('justifyCenter')} tooltip="Ortala" />
                <ToolbarButton icon={<AlignRight size={16} />} onClick={() => execCommand('justifyRight')} tooltip="Sağa Yasla" />

                <div style={{ width: '1px', height: '20px', backgroundColor: colors.sidebarBorder, margin: '0 8px' }} />

                <ToolbarButton icon={<List size={16} />} onClick={() => execCommand('insertUnorderedList')} tooltip="Madde İşaretleri" />
                <ToolbarButton icon={<ListOrdered size={16} />} onClick={() => execCommand('insertOrderedList')} tooltip="Numaralı Liste" />

                <div style={{ width: '1px', height: '20px', backgroundColor: colors.sidebarBorder, margin: '0 8px' }} />

                <ToolbarButton icon={<Quote size={16} />} onClick={() => execCommand('formatBlock', 'blockquote')} tooltip="Alıntı" />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Renk:</span>
                    <input
                        type="color"
                        onInput={(e) => execCommand('foreColor', (e.target as HTMLInputElement).value)}
                        style={{ width: '24px', height: '24px', border: 'none', padding: '0', background: 'none', cursor: 'pointer', borderRadius: '4px' }}
                        title="Yazı Rengi"
                    />
                </div>
            </div>

            {/* Editor Area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{
                    flex: 1,
                    padding: '20px',
                    outline: 'none',
                    color: '#1E293B',
                    backgroundColor: '#FFFFFF',
                    fontSize: '15px',
                    lineHeight: '1.7',
                    overflowY: 'auto',
                    minHeight: '400px'
                }}
                className="rich-editor-content"
                spellCheck={false}
            />

            <style jsx global>{`
                .rich-editor-content blockquote {
                    border-left: 3px solid ${theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};
                    margin: 1em 0;
                    padding-left: 1em;
                    color: ${colors.subtext};
                }
                .rich-editor-content a {
                    color: ${colors.accent};
                    text-decoration: underline;
                }
                .rich-editor-content ul {
                    padding-left: 20px;
                    list-style-type: disc;
                }
            `}</style>
        </div>
    );
}

function ToolbarButton({ icon, onClick, tooltip }: { icon: React.ReactNode, onClick: () => void, tooltip: string }) {
    const { theme, colors } = useTheme();
    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                onClick();
            }}
            title={tooltip}
            style={{
                padding: '6px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                e.currentTarget.style.color = '#1E293B';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#475569';
            }}
        >
            {icon}
        </button>
    );
}
