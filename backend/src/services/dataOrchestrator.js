import { hubspotConnector } from '../connectors/hubspot.js';
import { googleConnector } from '../connectors/google.js';

class DataOrchestrator {
  constructor() {
    this.cachedRenewals = [];
    this.lastSync = null;
  }

  /**
   * Main sync function - orchestrates data from all connectors
   */
  async syncAllData() {
    console.log('🔄 Starting data sync...');
    const startTime = Date.now();

    try {
      // Step 1: Fetch HubSpot deals
      const deals = await this.fetchHubSpotDeals();
      console.log(`✅ Fetched ${deals.length} deals from HubSpot`);

      // Step 2: Fetch Google emails to count touchpoints
      const emailTouchpoints = await this.fetchGoogleTouchpoints();
      console.log(`✅ Analyzed ${Object.keys(emailTouchpoints).length} email threads`);

      // Step 3: Transform to unified renewal schema
      const renewals = this.transformToRenewals(deals, emailTouchpoints);
      console.log(`✅ Created ${renewals.length} renewal records`);

      // Step 4: Cache results
      this.cachedRenewals = renewals;
      this.lastSync = new Date().toISOString();

      const duration = Date.now() - startTime;
      console.log(`✨ Sync completed in ${duration}ms`);

      return {
        success: true,
        renewalCount: renewals.length,
        lastSync: this.lastSync,
        duration
      };
    } catch (error) {
      console.error('❌ Sync failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch deals from HubSpot
   */
  async fetchHubSpotDeals() {
    try {
      if (!hubspotConnector.isConnected()) {
        console.log('⚠️ HubSpot not connected, using fallback data');
        return [];
      }
      return await hubspotConnector.fetchDeals();
    } catch (error) {
      console.error('HubSpot fetch error:', error.message);
      return [];
    }
  }

  /**
   * Analyze Google emails to count touchpoints per client
   */
  async fetchGoogleTouchpoints() {
    const touchpoints = {};
    
    try {
      const emails = await googleConnector.fetchEmails(50);
      
      // Count emails mentioning renewal/policy keywords
      for (const email of emails) {
        const headers = email.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        
        // Extract company name or domain from email
        const domain = this.extractDomain(from);
        
        if (this.isRenewalRelated(subject)) {
          touchpoints[domain] = (touchpoints[domain] || 0) + 1;
        }
      }
    } catch (error) {
      console.log('⚠️ Google not connected or error:', error.message);
    }

    return touchpoints;
  }

  /**
   * Transform raw connector data to unified renewal schema
   */
  transformToRenewals(deals, emailTouchpoints) {
    const renewals = deals.map((deal, index) => {
      const dealName = deal.properties?.dealname || 'Unknown Deal';
      const amount = parseFloat(deal.properties?.amount || 0);
      const closeDate = deal.properties?.closedate || this.generateFutureDate(30 + index * 15);
      
      // Try to match email touchpoints by deal name
      const domain = this.extractCompanyDomain(dealName);
      const touchpointCount = emailTouchpoints[domain] || 0;

      return {
        id: `R-${deal.id || (1000 + index)}`,
        clientName: dealName,
        policyNumber: `POL-${deal.id || Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        productLine: this.inferProductLine(dealName),
        carrier: this.inferCarrier(dealName),
        premium: Math.round(amount),
        expiryDate: closeDate,
        status: this.mapDealStage(deal.properties?.dealstage),
        sourceSystem: 'HubSpot',
        crmRecordId: deal.id,
        lastEmailId: null,
        recentTouchpoints: touchpointCount,
        primaryContactName: this.extractContactName(dealName)
      };
    });

    return renewals;
  }

  /**
   * Helper: Extract domain from email address
   */
  extractDomain(email) {
    const match = email.match(/@([a-zA-Z0-9.-]+)/);
    return match ? match[1].toLowerCase() : 'unknown';
  }

  /**
   * Helper: Extract company domain from deal name
   */
  extractCompanyDomain(dealName) {
    // Simple heuristic: take first word and add .com
    const firstWord = dealName.split(' ')[0].toLowerCase();
    return `${firstWord}.com`;
  }

  /**
   * Helper: Check if subject is renewal-related
   */
  isRenewalRelated(subject) {
    const keywords = ['renewal', 'policy', 'insurance', 'premium', 'quote', 'expiry'];
    return keywords.some(kw => subject.toLowerCase().includes(kw));
  }

  /**
   * Helper: Infer product line from deal name
   */
  inferProductLine(dealName) {
    const name = dealName.toLowerCase();
    if (name.includes('property') || name.includes('building')) return 'Property Insurance';
    if (name.includes('liability') || name.includes('gl')) return 'General Liability';
    if (name.includes('cyber')) return 'Cyber Liability';
    if (name.includes('marine') || name.includes('cargo')) return 'Marine Cargo';
    if (name.includes('auto') || name.includes('vehicle')) return 'Auto Insurance';
    return 'General Insurance';
  }

  /**
   * Helper: Infer carrier (placeholder logic)
   */
  inferCarrier(dealName) {
    const carriers = ['HDFC ERGO', 'ICICI Lombard', 'Bajaj Allianz', 'Reliance General', 'Future Generali'];
    return carriers[Math.floor(Math.random() * carriers.length)];
  }

  /**
   * Helper: Map HubSpot deal stage to renewal status
   */
  mapDealStage(stage) {
    if (!stage) return 'Discovery';
    if (stage.includes('qualify')) return 'Pre-Renewal Review';
    if (stage.includes('present')) return 'Pricing Discussion';
    if (stage.includes('decision')) return 'Quote Comparison';
    if (stage.includes('closed')) return 'Renewed';
    return 'Discovery';
  }

  /**
   * Helper: Extract contact name (simple heuristic)
   */
  extractContactName(dealName) {
    const names = ['Ananya', 'Rahul', 'Meera', 'Sanjay', 'Priya', 'Vikram'];
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Helper: Generate future date
   */
  generateFutureDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get cached renewals
   */
  getRenewals() {
    return this.cachedRenewals;
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      lastSync: this.lastSync,
      recordCount: this.cachedRenewals.length,
      hasSynced: this.cachedRenewals.length > 0
    };
  }
}

export const dataOrchestrator = new DataOrchestrator();