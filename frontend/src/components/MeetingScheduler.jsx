// frontend/src/components/MeetingScheduler.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function MeetingScheduler({ item, onClose }) {
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [creating, setCreating] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [duration, setDuration] = useState(30); // minutes

  useEffect(() => {
    if (item) {
      setMeetingTitle(`${item.clientName} - Renewal Discussion`);
      setMeetingDescription(`Policy: ${item.productLine} (${item.policyNumber})\nExpiry: ${item.expiryDate}\nPremium: ₹${item.premium?.toLocaleString()}`);
      fetchAvailableSlots();
    }
  }, [item]);

  const fetchAvailableSlots = async () => {
    setLoading(true);
    try {
      // Fetch calendar events for next 7 days
      const response = await axios.get('/auth/google/calendar', {
        params: { daysBack: 0, daysForward: 7 }
      });

      const events = response.data.events || [];
      const slots = generateAvailableSlots(events);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
      alert('Failed to load calendar availability');
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableSlots = (events) => {
    const slots = [];
    const now = new Date();
    const businessHours = { start: 9, end: 18 }; // 9 AM to 6 PM

    // Generate slots for next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // Generate hourly slots
      for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);

        // Skip past times
        if (slotStart <= now) continue;

        // Check if slot conflicts with existing events
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

    return slots.slice(0, 20); // Show max 20 slots
  };

  const formatSlotLabel = (date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dayLabel;
    if (date.toDateString() === today.toDateString()) {
      dayLabel = 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dayLabel = 'Tomorrow';
    } else {
      dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    const timeLabel = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    return `${dayLabel}, ${timeLabel}`;
  };

  const handleSchedule = async () => {
    if (!selectedSlot) {
      alert('Please select a time slot');
      return;
    }

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
          { method: 'email', minutes: 1440 }, // 1 day before
          { method: 'popup', minutes: 30 }
        ]
      };

      const response = await axios.post('/auth/google/calendar/create', eventData);

      if (response.data.success) {
        alert(`✅ Meeting scheduled successfully!\n\nTime: ${selectedSlot.label}\nAttendee: ${item.primaryContact?.email || 'No attendee'}\n\nView in calendar: ${response.data.htmlLink}`);
        onClose();
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert('❌ Failed to schedule meeting: ' + (error.response?.data?.error || error.message));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        background: '#071127',
        padding: 24,
        borderRadius: 12,
        width: '100%',
        maxWidth: 700,
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid #1e293b'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 20 
        }}>
          <h3 style={{ margin: 0, color: '#e2e8f0' }}>📅 Schedule Meeting</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 24,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Meeting Details */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: 6, 
              fontSize: 13, 
              color: '#94a3b8',
              fontWeight: 600 
            }}>
              Meeting Title
            </label>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0a1628',
                border: '1px solid #1e293b',
                borderRadius: 6,
                color: '#e2e8f0',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: 6, 
              fontSize: 13, 
              color: '#94a3b8',
              fontWeight: 600 
            }}>
              Description
            </label>
            <textarea
              value={meetingDescription}
              onChange={(e) => setMeetingDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0a1628',
                border: '1px solid #1e293b',
                borderRadius: 6,
                color: '#e2e8f0',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 6, 
                fontSize: 13, 
                color: '#94a3b8',
                fontWeight: 600 
              }}>
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => {
                  setDuration(Number(e.target.value));
                  setSelectedSlot(null); // Reset selection when duration changes
                  fetchAvailableSlots();
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0a1628',
                  border: '1px solid #1e293b',
                  borderRadius: 6,
                  color: '#e2e8f0',
                  fontSize: 14
                }}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 6, 
                fontSize: 13, 
                color: '#94a3b8',
                fontWeight: 600 
              }}>
                Attendee
              </label>
              <input
                type="text"
                value={item.primaryContact?.email || 'No email'}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0a1628',
                  border: '1px solid #1e293b',
                  borderRadius: 6,
                  color: '#64748b',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* Available Slots */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ 
            display: 'block', 
            marginBottom: 10, 
            fontSize: 13, 
            color: '#94a3b8',
            fontWeight: 600 
          }}>
            Select Available Time Slot
          </label>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>
              Loading available slots...
            </div>
          ) : availableSlots.length === 0 ? (
            <div style={{
              padding: 16,
              background: '#0a1628',
              borderRadius: 6,
              textAlign: 'center',
              color: '#fbbf24'
            }}>
              ⚠️ No available slots found in the next 7 days
            </div>
          ) : (
            <div style={{
              maxHeight: 300,
              overflowY: 'auto',
              border: '1px solid #1e293b',
              borderRadius: 6,
              padding: 8,
              background: '#0a1628'
            }}>
              {availableSlots.map((slot, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedSlot(slot)}
                  style={{
                    padding: '10px 12px',
                    marginBottom: 6,
                    background: selectedSlot === slot ? '#3b82f6' : '#041022',
                    border: `1px solid ${selectedSlot === slot ? '#60a5fa' : '#1e293b'}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: '#e2e8f0',
                    fontSize: 13,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedSlot !== slot) {
                      e.target.style.background = '#0f172a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedSlot !== slot) {
                      e.target.style.background = '#041022';
                    }
                  }}
                >
                  {slot.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          justifyContent: 'flex-end' 
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#334155',
              border: 'none',
              color: '#e2e8f0',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            disabled={!selectedSlot || creating}
            style={{
              padding: '10px 24px',
              background: (!selectedSlot || creating) ? '#555' : '#10b981',
              border: 'none',
              color: 'white',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 'bold',
              cursor: (!selectedSlot || creating) ? 'not-allowed' : 'pointer',
              opacity: (!selectedSlot || creating) ? 0.6 : 1
            }}
          >
            {creating ? '📅 Scheduling...' : '📅 Schedule Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}