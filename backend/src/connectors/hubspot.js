import axios from 'axios';
import 'dotenv/config';

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const API_BASE = 'https://api.hubapi.com';

export class HubSpotConnector {
  
  isConnected() {
    return !!HUBSPOT_ACCESS_TOKEN;
  }

  async testConnection() {
    console.log('🔗 [HubSpot Connector] Testing connection...');
    
    if (!HUBSPOT_ACCESS_TOKEN) {
      console.error('❌ [HubSpot Connector] No access token configured');
      return { success: false, error: 'No access token configured' };
    }

    try {
      const response = await axios.get(`${API_BASE}/crm/v3/objects/contacts`, {
        headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
        params: { limit: 1 }
      });
      
      const contactCount = response.data.total || 0;
      console.log('✅ [HubSpot Connector] Connection successful!', {
        timestamp: new Date().toISOString(),
        contactCount
      });
      
      return { 
        success: true, 
        message: 'HubSpot connection working!',
        contactCount
      };
    } catch (error) {
      console.error('❌ [HubSpot Connector] Connection failed:', error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  /**
   * Fetch deals WITH associated contacts (enriched)
   */
  async fetchDealsWithContacts() {
    if (!HUBSPOT_ACCESS_TOKEN) throw new Error('Not configured');

    try {
      console.log('📦 [HubSpot] Fetching deals with contact associations...');
      
      // Step 1: Fetch deals with associations
      const dealsResponse = await axios.get(`${API_BASE}/crm/v3/objects/deals`, {
        headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
        params: {
          limit: 100,
          properties: 'dealname,amount,closedate,dealstage,pipeline,hs_object_id',
          associations: 'contacts' // Request contact associations
        }
      });

      const deals = dealsResponse.data.results || [];
      console.log(`✅ [HubSpot] Fetched ${deals.length} deals`);

      // Step 2: For each deal, fetch associated contact details
      const enrichedDeals = await Promise.all(
        deals.map(async (deal) => {
          const contactIds = deal.associations?.contacts?.results?.map(c => c.id) || [];
          
          // Fetch contact details if associations exist
          let primaryContact = null;
          if (contactIds.length > 0) {
            try {
              const contactResponse = await axios.get(
                `${API_BASE}/crm/v3/objects/contacts/${contactIds[0]}`,
                {
                  headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
                  params: {
                    properties: 'firstname,lastname,email,phone,company'
                  }
                }
              );
              
              const props = contactResponse.data.properties;
              primaryContact = {
                id: contactIds[0],
                firstName: props.firstname,
                lastName: props.lastname,
                email: props.email,
                phone: props.phone,
                company: props.company
              };
            } catch (err) {
              console.warn(`⚠️ Failed to fetch contact ${contactIds[0]}:`, err.message);
            }
          }

          return {
            ...deal,
            primaryContact
          };
        })
      );

      console.log(`✅ [HubSpot] Enriched ${enrichedDeals.filter(d => d.primaryContact).length}/${enrichedDeals.length} deals with contact info`);
      
      return enrichedDeals;

    } catch (error) {
      console.error('❌ [HubSpot] Fetch deals error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Legacy method (kept for backwards compatibility)
   */
  async fetchDeals() {
    if (!HUBSPOT_ACCESS_TOKEN) throw new Error('Not configured');

    try {
      const response = await axios.get(`${API_BASE}/crm/v3/objects/deals`, {
        headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
        params: {
          limit: 100,
          properties: 'dealname,amount,closedate,dealstage,pipeline,hs_object_id'
        }
      });

      return response.data.results || [];
    } catch (error) {
      console.error('HubSpot fetch deals error:', error.response?.data || error.message);
      throw error;
    }
  }

  async fetchContacts() {
    if (!HUBSPOT_ACCESS_TOKEN) throw new Error('Not configured');

    try {
      const response = await axios.get(`${API_BASE}/crm/v3/objects/contacts`, {
        headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
        params: {
          limit: 100,
          properties: 'firstname,lastname,email,phone,company,hs_object_id'
        }
      });

      return response.data.results || [];
    } catch (error) {
      console.error('HubSpot fetch contacts error:', error.response?.data || error.message);
      throw error;
    }
  }

  async fetchCompanies() {
    if (!HUBSPOT_ACCESS_TOKEN) throw new Error('Not configured');

    try {
      const response = await axios.get(`${API_BASE}/crm/v3/objects/companies`, {
        headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
        params: {
          limit: 100,
          properties: 'name,domain,industry,city,hs_object_id'
        }
      });

      return response.data.results || [];
    } catch (error) {
      console.error('HubSpot fetch companies error:', error.response?.data || error.message);
      throw error;
    }
  }
}

export const hubspotConnector = new HubSpotConnector();