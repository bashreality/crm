import React, { useState, useEffect } from 'react';
import { woodpeckerApi, contactsApi } from '../services/api';

const Campaigns = () => {
  const [woodpeckerCampaigns, setWoodpeckerCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedWoodpeckerCampaign, setSelectedWoodpeckerCampaign] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [woodpeckerLoading, setWoodpeckerLoading] = useState(false);
  const [woodpeckerError, setWoodpeckerError] = useState(null);
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchWoodpeckerCampaigns();
    fetchContacts();
  }, []);

  const fetchWoodpeckerCampaigns = async () => {
    try {
      setWoodpeckerLoading(true);
      setWoodpeckerError(null);
      const response = await woodpeckerApi.getCampaigns();
      
      console.log('Woodpecker API response:', response);
      console.log('Response data:', response.data);
      
      if (response && response.data) {
        let campaigns = [];
        
        // Różne możliwe formaty odpowiedzi z API
        if (Array.isArray(response.data)) {
          campaigns = response.data;
        } else if (response.data.campaigns && Array.isArray(response.data.campaigns)) {
          campaigns = response.data.campaigns;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          campaigns = response.data.data;
        } else if (response.data.items && Array.isArray(response.data.items)) {
          campaigns = response.data.items;
        } else {
          // Sprawdź czy są jakieś pola które mogą być kampaniami
          const keys = Object.keys(response.data);
          for (const key of keys) {
            if (Array.isArray(response.data[key])) {
              campaigns = response.data[key];
              break;
            }
          }
        }
        
        console.log('Parsed campaigns:', campaigns);
        setWoodpeckerCampaigns(campaigns);
      } else {
        console.log('No data in response');
        setWoodpeckerCampaigns([]);
      }
    } catch (error) {
      console.error('Error fetching Woodpecker campaigns:', error);
      console.error('Error details:', error.response?.data);
      setWoodpeckerError('Nie można połączyć się z Woodpecker API. Sprawdź konfigurację.');
      setWoodpeckerCampaigns([]);
    } finally {
      setWoodpeckerLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await contactsApi.getAll();
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      active: 'status-active',
      draft: 'status-draft',
      completed: 'status-completed'
    };
    return classes[status] || '';
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Aktywna',
      draft: 'Projekt',
      completed: 'Zakończona'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };

  const getProgress = (campaign) => {
    if (campaign.totalContacts === 0) return 0;
    return Math.round((campaign.sentCount / campaign.totalContacts) * 100);
  };

  const handleImportToWoodpecker = async () => {
    if (!selectedWoodpeckerCampaign) {
      alert('Wybierz kampanię Woodpecker');
      return;
    }

    const campaignId = selectedWoodpeckerCampaign.id || selectedWoodpeckerCampaign.campaign_id;
    const contactIds = selectedContacts.length > 0 ? selectedContacts : null;

    if (!window.confirm(
      `Czy na pewno chcesz zaimportować ${contactIds ? selectedContacts.length : contacts.length} kontaktów do kampanii Woodpecker?`
    )) {
      return;
    }

    try {
      setWoodpeckerLoading(true);
      const response = await woodpeckerApi.importContacts(campaignId, contactIds);
      
      if (response.data && response.data.success) {
        alert(`Sukces! Zaimportowano ${response.data.imported} kontaktów do Woodpecker.`);
        setShowImportModal(false);
        setSelectedContacts([]);
        setSelectedWoodpeckerCampaign(null);
      } else {
        alert('Import zakończony. Sprawdź szczegóły w konsoli.');
        console.log('Import response:', response.data);
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      alert('Błąd podczas importu kontaktów: ' + (error.response?.data?.error || error.message));
    } finally {
      setWoodpeckerLoading(false);
    }
  };

  const toggleContactSelection = (contactId) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  const selectAllContacts = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(c => c.id));
    }
  };

  const fetchCampaignDetails = async (campaignId) => {
    try {
      setDetailsLoading(true);
      const response = await woodpeckerApi.getCampaign(campaignId);
      console.log('Campaign details response:', response);
      
      if (response && response.data) {
        setCampaignDetails(response.data);
        setShowDetailsModal(true);
      } else {
        setCampaignDetails(response);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      alert('Błąd podczas pobierania szczegółów kampanii: ' + (error.response?.data?.error || error.message));
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Kampanie marketingowe</h1>
          <p className="page-subtitle">Zarządzanie kampaniami Woodpecker i import kontaktów</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Kampanie Woodpecker ({woodpeckerCampaigns.length})</h2>
          <button 
            className="btn btn-secondary" 
            onClick={fetchWoodpeckerCampaigns}
            disabled={woodpeckerLoading}
          >
            {woodpeckerLoading ? 'Odświeżanie...' : '🔄 Odśwież'}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowImportModal(true)}
            disabled={woodpeckerCampaigns.length === 0}
          >
            📥 Importuj kontakty
          </button>
        </div>

        {woodpeckerError && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            margin: '1rem',
            color: '#c00'
          }}>
            ⚠️ {woodpeckerError}
          </div>
        )}

        <div className="campaigns-section">
          {woodpeckerLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              Ładowanie kampanii Woodpecker...
            </div>
          ) : woodpeckerCampaigns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>Brak kampanii w Woodpecker. Utwórz kampanię w Woodpecker, aby móc importować kontakty.</p>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                Po utworzeniu kampanii w Woodpecker, kliknij "Odśwież" aby załadować listę.
              </p>
            </div>
          ) : (
            woodpeckerCampaigns.map((campaign) => {
              const campaignId = campaign.id || campaign.campaign_id;
              const campaignName = campaign.name || campaign.title || `Kampania #${campaignId}`;
              
              return (
                <div 
                  key={campaignId} 
                  className="campaign-item"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => fetchCampaignDetails(campaignId)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                    e.currentTarget.style.transform = '';
                  }}
                >
                  <div className="campaign-header-item">
                    <div className="campaign-title">{campaignName} 🔍</div>
                    {campaign.status && (
                      <span className={`campaign-status ${getStatusClass(campaign.status)}`}>
                        {getStatusLabel(campaign.status)}
                      </span>
                    )}
                  </div>
                  {campaign.description && (
                    <div style={{ color: '#666', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                      {campaign.description}
                    </div>
                  )}
                  <div className="campaign-stats">
                    {campaign.prospects_count !== undefined && (
                      <span>Prospectów: {campaign.prospects_count}</span>
                    )}
                    {campaign.created_at && (
                      <span>Utworzona: {formatDate(campaign.created_at)}</span>
                    )}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#2196f3' }}>
                    Kliknij aby zobaczyć szczegóły →
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal importu kontaktów */}
      {showImportModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '2rem', borderBottom: '1px solid #f0f0f0' }}>
              <h2 style={{ margin: 0, marginBottom: '1rem' }}>Import kontaktów do Woodpecker</h2>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Wybierz kampanię:
                </label>
                <select
                  value={selectedWoodpeckerCampaign?.id || selectedWoodpeckerCampaign?.campaign_id || ''}
                  onChange={(e) => {
                    const campaign = woodpeckerCampaigns.find(
                      c => (c.id || c.campaign_id) == e.target.value
                    );
                    setSelectedWoodpeckerCampaign(campaign);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">-- Wybierz kampanię --</option>
                  {woodpeckerCampaigns.map((campaign) => {
                    const campaignId = campaign.id || campaign.campaign_id;
                    const campaignName = campaign.name || campaign.title || `Kampania #${campaignId}`;
                    return (
                      <option key={campaignId} value={campaignId}>
                        {campaignName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Kontakty do importu</h3>
                <button
                  className="btn btn-secondary"
                  onClick={selectAllContacts}
                  style={{ fontSize: '0.85rem' }}
                >
                  {selectedContacts.length === contacts.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                </button>
              </div>
              <p style={{ color: '#666', marginBottom: '1rem' }}>
                {selectedContacts.length > 0 
                  ? `Zaznaczono: ${selectedContacts.length} kontaktów`
                  : 'Brak zaznaczonych - zostaną zaimportowane wszystkie kontakty'}
              </p>
              <div style={{ 
                maxHeight: '400px', 
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                {contacts.length === 0 ? (
                  <p style={{ color: '#666' }}>Brak kontaktów do importu</p>
                ) : (
                  contacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => toggleContactSelection(contact.id)}
                      style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        backgroundColor: selectedContacts.includes(contact.id) ? '#e3f2fd' : '#fff',
                        border: `2px solid ${selectedContacts.includes(contact.id) ? '#2196f3' : '#ddd'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => toggleContactSelection(contact.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold' }}>{contact.name}</div>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>
                          {contact.email} {contact.company && `• ${contact.company}`}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{
              padding: '1.5rem 2rem',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem'
            }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedWoodpeckerCampaign(null);
                  setSelectedContacts([]);
                }}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleImportToWoodpecker}
                disabled={!selectedWoodpeckerCampaign || woodpeckerLoading}
              >
                {woodpeckerLoading ? 'Importowanie...' : 'Importuj kontakty'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal szczegółów kampanii */}
      {showDetailsModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
          onClick={() => {
            setShowDetailsModal(false);
            setCampaignDetails(null);
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '2rem', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Szczegóły kampanii</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setCampaignDetails(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: '2rem' }}>
              {detailsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  Ładowanie szczegółów...
                </div>
              ) : campaignDetails ? (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {Object.entries(campaignDetails).map(([key, value]) => {
                    // Pomijamy bardzo długie wartości lub obiekty
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                      return (
                        <div key={key}>
                          <h3 style={{ 
                            margin: '0 0 0.5rem 0', 
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            color: '#333',
                            textTransform: 'capitalize'
                          }}>
                            {key.replace(/_/g, ' ')}
                          </h3>
                          <div style={{
                            padding: '1rem',
                            backgroundColor: '#f9f9f9',
                            borderRadius: '8px',
                            fontSize: '0.9rem'
                          }}>
                            {Object.entries(value).map(([subKey, subValue]) => (
                              <div key={subKey} style={{ marginBottom: '0.5rem' }}>
                                <strong>{subKey.replace(/_/g, ' ')}:</strong> {
                                  typeof subValue === 'object' 
                                    ? JSON.stringify(subValue, null, 2)
                                    : String(subValue)
                                }
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else if (Array.isArray(value)) {
                      return (
                        <div key={key}>
                          <h3 style={{ 
                            margin: '0 0 0.5rem 0', 
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            color: '#333',
                            textTransform: 'capitalize'
                          }}>
                            {key.replace(/_/g, ' ')} ({value.length})
                          </h3>
                          <div style={{
                            padding: '1rem',
                            backgroundColor: '#f9f9f9',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            maxHeight: '200px',
                            overflow: 'auto'
                          }}>
                            {value.map((item, index) => (
                              <div key={index} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #eee' }}>
                                {typeof item === 'object' 
                                  ? JSON.stringify(item, null, 2)
                                  : String(item)
                                }
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={key}>
                          <h3 style={{ 
                            margin: '0 0 0.5rem 0', 
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            color: '#333',
                            textTransform: 'capitalize'
                          }}>
                            {key.replace(/_/g, ' ')}
                          </h3>
                          <div style={{
                            padding: '1rem',
                            backgroundColor: '#f9f9f9',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            wordBreak: 'break-word'
                          }}>
                            {value === null || value === undefined ? '-' : String(value)}
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  Brak dostępnych szczegółów
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
