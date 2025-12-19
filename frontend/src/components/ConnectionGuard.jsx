import React, { useState } from 'react';
import ConnectionModal from './ConnectionModal';
import Hubspot from '../assets/Hubspot';
import Google from '../assets/Google';


export default function ConnectionGuard({ connectors, onConnectionUpdate, isConnected, children }) {
    const [skipped, setSkipped] = useState(false);
    const [loadingMap, setLoadingMap] = useState({});

    // If backend is disconnected, LoadingOverlay handles everything.
    // Return children to maintain component tree but LoadingOverlay will mask it.
    if (!isConnected) return children;

    // Get current status
    const hubspot = connectors.find(c => c.name.toLowerCase().includes('hubspot'));
    const google = connectors.find(c => c.name.toLowerCase().includes('google'));

    const hubspotConnected = hubspot?.status === 'connected';
    const googleConnected = google?.status === 'connected';

    // If both connected or user skipped, show dashboard
    const allConnected = hubspotConnected && googleConnected;

    const handleConnectHubSpot = async () => {
        setLoadingMap(prev => ({ ...prev, hubspot: true }));
        try {
            const res = await fetch(`/auth/test/hubspot`);
            const data = await res.json();
            if (data.success) {
                if (onConnectionUpdate) onConnectionUpdate();
            } else {
                alert(`HubSpot Connection Failed: ${data.error}`);
            }
        } catch (err) {
            alert(`Network error connecting to HubSpot: ${err.message}`);
        } finally {
            setLoadingMap(prev => ({ ...prev, hubspot: false }));
        }
    };

    const handleConnectGoogle = () => {
        window.location.href = `/auth/google`;
    };

    if (!allConnected && !skipped) {
        const services = [
            {
                id: 'hubspot',
                title: 'HubSpot CRM',
                description: 'Connect your private app to sync deals, contacts, and historical commissions.',
                icon: <Hubspot size={48} />,
                actionLabel: 'Verify Connection',
                onAction: handleConnectHubSpot,
                loading: loadingMap.hubspot,
                status: hubspotConnected ? 'connected' : 'disconnected'
            },
            {
                id: 'google',
                title: 'Google Suite',
                description: 'Sync Gmail and Calendar to automate interaction logging and follow-up scheduling.',
                icon: <Google size={48} />,
                actionLabel: 'Connect Google',
                onAction: handleConnectGoogle,
                loading: loadingMap.google,
                status: googleConnected ? 'connected' : 'disconnected'
            }
        ];

        return (
            <ConnectionModal
                isOpen={true}
                services={services}
                onSkip={() => setSkipped(true)}
            />
        );
    }

    return children;
}
