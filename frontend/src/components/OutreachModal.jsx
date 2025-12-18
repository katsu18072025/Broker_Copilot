import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

export default function OutreachModal({ item, brief, onClose }) {
    const [sending, setSending] = useState(false);
    const [editableSubject, setEditableSubject] = useState('');
    const [editableBody, setEditableBody] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [recipientMode, setRecipientMode] = useState('automatic');
    const [attachBrief, setAttachBrief] = useState(true);

    useEffect(() => {
        if (brief?.outreachTemplate && item) {
            const template = typeof brief.outreachTemplate === 'string'
                ? brief.outreachTemplate
                : JSON.stringify(brief.outreachTemplate);

            const subjectMatch = template.match(/Subject:\s*(.+)/);
            const subject = subjectMatch
                ? subjectMatch[1].trim()
                : `${item.clientName} - Renewal Discussion`;

            const body = template.replace(/Subject:.*?\n\n?/, '');

            setEditableSubject(subject);
            setEditableBody(body);

            if (item.primaryContact?.email) {
                setRecipientEmail(item.primaryContact.email);
            } else {
                const fallback = `${item.primaryContactName?.toLowerCase().replace(/\s+/g, '') || 'client'}@${item.clientName?.toLowerCase().replace(/\s+/g, '') || 'example'}.com`;
                setRecipientEmail(fallback);
            }
        }

        // Lock body scroll
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, [brief, item]);

    const sendEmail = async () => {
        if (!editableSubject || !editableBody || !recipientEmail) {
            alert('Please fill in all fields (recipient, subject, and body)');
            return;
        }
        setSending(true);
        try {
            const htmlBody = editableBody
                .split('\n\n')
                .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
                .join('');

            const response = await axios.post('/api/send-email', {
                to: recipientEmail,
                subject: editableSubject,
                body: editableBody,
                htmlBody: htmlBody,
                renewalId: item.id,
                attachBrief: attachBrief,
                briefData: attachBrief ? { ...brief, item } : null
            });

            if (response.data.success) {
                alert(`Email sent successfully to ${recipientEmail}!`);
                onClose();
            } else throw new Error(response.data.error);
        } catch (err) {
            alert(`Failed to send: ${err.message}`);
        } finally {
            setSending(false);
        }
    };

    const modalContent = (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 18, 0.95)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999, // Extremely high to bypass any containers
            padding: 40
        }}>
            <div className="glass-card animate-modal-in" style={{
                padding: 40,
                width: '100%',
                maxWidth: 840,
                maxHeight: '85vh',
                overflow: 'auto',
                border: '1px solid rgba(255,255,255,0.12)',
                position: 'relative',
                boxShadow: '0 0 100px -20px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 0
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Compose Strategy Outreach</h2>
                        <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            Personalizing strategy for <span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>{item?.clientName}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text-secondary)',
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: 20,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >×</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                    {/* Recipient Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recipient Mode</label>
                            <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <button
                                    onClick={() => setRecipientMode('automatic')}
                                    style={{
                                        flex: 1,
                                        fontSize: 12,
                                        padding: '8px',
                                        border: 'none',
                                        borderRadius: 6,
                                        background: recipientMode === 'automatic' ? 'var(--accent-primary)' : 'transparent',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        transition: 'all 0.2s'
                                    }}
                                >Automatic</button>
                                <button
                                    onClick={() => setRecipientMode('manual')}
                                    style={{
                                        flex: 1,
                                        fontSize: 12,
                                        padding: '8px',
                                        border: 'none',
                                        borderRadius: 6,
                                        background: recipientMode === 'manual' ? 'var(--accent-primary)' : 'transparent',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        transition: 'all 0.2s'
                                    }}
                                >Manual</button>
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Target Email</label>
                            <input
                                type="email"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                disabled={recipientMode === 'automatic'}
                                placeholder="client@company.com"
                                style={{
                                    width: '100%',
                                    padding: '14px 18px',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 10,
                                    color: recipientMode === 'automatic' ? 'var(--text-secondary)' : 'var(--text-primary)',
                                    outline: 'none',
                                    fontSize: 14,
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Subject Line</label>
                        <input
                            type="text"
                            value={editableSubject}
                            onChange={(e) => setEditableSubject(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px 18px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 10,
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: 14,
                                boxSizing: 'border-box',
                                fontWeight: 500
                            }}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Message Editorial</label>
                        <textarea
                            value={editableBody}
                            onChange={(e) => setEditableBody(e.target.value)}
                            rows={14}
                            style={{
                                width: '100%',
                                padding: '20px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 12,
                                color: 'var(--text-primary)',
                                outline: 'none',
                                resize: 'none',
                                fontFamily: 'inherit',
                                lineHeight: 1.65,
                                fontSize: 14,
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Footer Actions */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 16,
                        marginTop: 4
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div
                                onClick={() => setAttachBrief(!attachBrief)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    cursor: 'pointer',
                                    padding: '8px 16px',
                                    background: 'rgba(59, 130, 246, 0.05)',
                                    borderRadius: 10,
                                    border: `1px solid ${attachBrief ? 'rgba(59, 130, 246, 0.2)' : 'transparent'}`,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{
                                    width: 44,
                                    height: 22,
                                    background: attachBrief ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                                    borderRadius: 20,
                                    position: 'relative',
                                    transition: 'all 0.3s'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: attachBrief ? 24 : 4,
                                        top: 3,
                                        width: 16,
                                        height: 16,
                                        background: 'white',
                                        borderRadius: '50%',
                                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                    }} />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: attachBrief ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                    Attach Strategy Report (PDF)
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 16 }}>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: '10px 20px'
                                }}
                            >Discard</button>
                            <button
                                onClick={sendEmail}
                                disabled={sending}
                                className="btn btn-primary"
                                style={{
                                    height: 48,
                                    padding: '0 36px',
                                    fontSize: 15,
                                    fontWeight: 800,
                                    borderRadius: 12,
                                    boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.4)'
                                }}
                            >
                                {sending ? 'Dispatching...' : 'Dispatch Outreach'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .animate-modal-in {
          animation: modalFloatUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalFloatUp {
          from { opacity: 0; transform: translateY(30px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
        </div>
    );

    return createPortal(modalContent, document.body);
}
