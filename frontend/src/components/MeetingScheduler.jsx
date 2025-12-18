// frontend/src/components/MeetingScheduler.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

export default function MeetingScheduler({ item, onClose }) {
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [creating, setCreating] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    if (item) {
      setMeetingTitle(`${item.clientName} - Renewal Discussion`);
      setMeetingDescription(`Policy: ${item.productLine} (${item.policyNumber})\nExpiry: ${item.expiryDate}\nPremium: ₹${item.premium?.toLocaleString()}`);
      fetchAvailableSlots();
    }

    // Lock body scroll
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, [item]);

  const fetchAvailableSlots = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/auth/google/calendar', {
        params: { daysBack: 0, daysForward: 7 }
      });
      const events = response.data.events || [];
      const slots = generateAvailableSlots(events);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableSlots = (events) => {
    const slots = [];
    const now = new Date();
    const businessHours = { start: 9, end: 18 };

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0);

      if (date.getDay() === 0 || date.getDay() === 6) continue;

      for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);

        if (slotStart <= now) continue;

        const hasConflict = events.some(event => {
          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);
          return (slotStart < eventEnd && slotEnd > eventStart);
        });

        if (!hasConflict) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            label: formatSlotLabel(slotStart)
          });
        }
      }
    }
    return slots.slice(0, 18);
  };

  const formatSlotLabel = (date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dayLabel;
    if (date.toDateString() === today.toDateString()) dayLabel = 'Today';
    else if (date.toDateString() === tomorrow.toDateString()) dayLabel = 'Tomorrow';
    else dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dayLabel}, ${timeLabel}`;
  };

  const handleSchedule = async () => {
    if (!selectedSlot) return;
    setCreating(true);
    try {
      const eventData = {
        summary: meetingTitle,
        description: meetingDescription,
        startDateTime: selectedSlot.start.toISOString(),
        endDateTime: selectedSlot.end.toISOString(),
        timeZone: 'Asia/Kolkata',
        attendees: item.primaryContact?.email ? [item.primaryContact.email] : [],
        reminders: [
          { method: 'email', minutes: 1440 },
          { method: 'popup', minutes: 30 }
        ]
      };
      const response = await axios.post('/auth/google/calendar/create', eventData);
      if (response.data.success) {
        alert('Meeting scheduled successfully!');
        onClose();
      }
    } catch (error) {
      alert('Failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setCreating(false);
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
      zIndex: 99999,
      padding: 40
    }}>
      <div className="glass-card animate-modal-in" style={{
        padding: 40,
        width: '100%',
        maxWidth: 720,
        maxHeight: '85vh',
        overflow: 'auto',
        border: '1px solid rgba(255,255,255,0.12)',
        position: 'relative',
        boxShadow: '0 0 100px -20px rgba(0, 0, 0, 0.8)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Schedule Discovery Meeting</h2>
            <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              Find the perfect time for <span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>{item?.clientName}</span>
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-secondary)',
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20
          }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Header Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Meeting Title</label>
              <input type="text" value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Expected Duration</label>
              <select value={duration} onChange={e => { setDuration(Number(e.target.value)); setSelectedSlot(null); fetchAvailableSlots(); }} style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }}>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Primary Attendee</label>
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 14, color: 'var(--accent-secondary)', fontWeight: 600 }}>{item?.primaryContact?.email || 'No email detected'}</div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Select Available Slot (Next 7 Days)</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
              maxHeight: 280,
              overflowY: 'auto',
              padding: 4
            }}>
              {loading ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 14 }}>Scanning calendar availability...</div>
              ) : availableSlots.map((slot, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedSlot(slot)}
                  style={{
                    padding: '14px',
                    background: selectedSlot === slot ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selectedSlot === slot ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 10,
                    color: 'white',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    fontWeight: selectedSlot === slot ? 700 : 500
                  }}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '10px 20px' }}>Cancel</button>
            <button
              onClick={handleSchedule}
              disabled={!selectedSlot || creating}
              className="btn btn-primary"
              style={{ height: 48, padding: '0 32px', fontSize: 15, fontWeight: 800, borderRadius: 12, boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)' }}
            >
              {creating ? 'Scheduling...' : 'Confirm Meeting'}
            </button>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        .animate-modal-in { animation: modalPop 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes modalPop { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}} />
    </div>
  );

  return createPortal(modalContent, document.body);
}