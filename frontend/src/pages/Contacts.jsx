import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Calendar, 
  MoreHorizontal, 
  Trash2, 
  Send, 
  UserPlus,
  X,
  Edit3,
  Building2,
  User,
  StickyNote,
  Plus
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api, { contactsApi, tasksApi, emailAccountsApi, tagsApi, sequencesApi, notesApi } from '../services/api';
import TagModal from '../components/TagModal';
import '../styles/Contacts.css';
import '../styles/Tasks.css'; // Ensure modals are styled

// Utility for initials
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Utility for Last Activity Logic
const getLastActivityLabel = (dateString) => {
  if (!dateString) return { label: 'Brak', class: 'old' };
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: 'Dzisiaj', class: 'recent' };
  if (diffDays <= 2) return { label: `${diffDays} dni temu`, class: 'recent' };
  if (diffDays <= 14) return { label: `${diffDays} dni temu`, class: 'medium' };
  return { label: diffDays > 30 ? '> 1 mies.' : `${diffDays} dni temu`, class: 'old' };
};

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection & UI State
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeContact, setActiveContact] = useState(null);
  
  // Filter State
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [companies, setCompanies] = useState([]);
  const [tagFilter, setTagFilter] = useState('');
  const [tags, setTags] = useState([]);

  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Tag & Bulk Actions
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagContact, setTagContact] = useState(null);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState('');
  const [sequences, setSequences] = useState([]);

  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [editContactData, setEditContactData] = useState({ id: null, name: '', email: '', company: '', phone: '', position: '' });

  // Forms
  const [emailFormData, setEmailFormData] = useState({ to: '', subject: '', body: '', accountId: '' });
  const [taskFormData, setTaskFormData] = useState({ title: '', description: '', type: 'todo', priority: '3', dueDate: '', contactId: '' });
  const [meetingFormData, setMeetingFormData] = useState({ title: '', description: '', type: 'meeting', priority: '2', dueDate: '', contactId: '' });
  const [newContactData, setNewContactData] = useState({ name: '', email: '', company: '', phone: '', position: '' });
  
  // Activity State
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // Notes State
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // --- Initial Load ---
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await contactsApi.getAll({ showAll: true });
      setContacts(response.data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Activity Log & Notes Logic ---
  useEffect(() => {
    if (activeContact) {
        setActivityLoading(true);
        setNotesLoading(true);
        
        // Fetch emails
        contactsApi.getContactEmails(activeContact.id)
            .then(res => {
                const emails = res.data?.emails || [];
                const mappedActivity = emails.map(email => ({
                    id: email.id,
                    type: email.status === 'sent' ? 'sent' : 'received',
                    subject: email.subject,
                    body: email.body || email.snippet,
                    preview: email.preview,
                    receivedAt: email.receivedAt,
                    sentAt: email.sentAt
                })).sort((a, b) => new Date(b.receivedAt || b.sentAt) - new Date(a.receivedAt || a.sentAt));
                setActivity(mappedActivity);
            })
            .catch(err => console.error("Failed to load activity", err))
            .finally(() => setActivityLoading(false));
            
        // Fetch notes
        notesApi.getByContact(activeContact.id)
            .then(res => setNotes(res.data || []))
            .catch(err => console.error("Failed to load notes", err))
            .finally(() => setNotesLoading(false));
    } else {
        setActivity([]);
        setNotes([]);
    }
  }, [activeContact]);
  
  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !activeContact) return;
    
    setSavingNote(true);
    try {
      await notesApi.create({
        content: newNoteContent.trim(),
        contact: { id: activeContact.id }
      });
      toast.success('Notatka dodana!');
      setNewNoteContent('');
      // Refresh notes
      const res = await notesApi.getByContact(activeContact.id);
      setNotes(res.data || []);
    } catch (err) {
      console.error('Error adding note:', err);
      toast.error('Błąd dodawania notatki');
    } finally {
      setSavingNote(false);
    }
  };
  
  const handleDeleteNote = async (noteId) => {
    if (!confirm('Czy na pewno chcesz usunąć tę notatkę?')) return;
    
    try {
      await notesApi.delete(noteId);
      toast.success('Notatka usunięta');
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Error deleting note:', err);
      toast.error('Błąd usuwania notatki');
    }
  };

  const handleTaskSubmit = async (e) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          await tasksApi.create(taskFormData);
          toast.success('Zadanie dodane!');
          setShowTaskModal(false);
      } catch (err) {
          toast.error('Błąd dodawania zadania');
      } finally {
          setIsSaving(false);
      }
  };

  const handleMeetingSubmit = async (e) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          await tasksApi.create(meetingFormData);
          toast.success('Spotkanie zaplanowane!');
          setShowMeetingModal(false);
      } catch (err) {
          toast.error('Błąd planowania spotkania');
      } finally {
          setIsSaving(false);
      }
  };

  const resetNewContactForm = () => {
    setNewContactData({ name: '', email: '', company: '', phone: '', position: '' });
  };

  const handleOpenEditContact = (contact) => {
    setEditContactData({
      id: contact.id,
      name: contact.name || '',
      email: contact.email || '',
      company: contact.company || '',
      phone: contact.phone || '',
      position: contact.position || ''
    });
    setShowEditContactModal(true);
  };

  const handleEditContact = async (e) => {
    e.preventDefault();
    const name = editContactData.name.trim();
    const email = editContactData.email.trim();

    if (!name || !email) {
      toast.error('Podaj imię i email kontaktu');
      return;
    }

    setEditingContact(true);
    try {
      const payload = {
        name,
        email,
        company: editContactData.company.trim(),
        phone: editContactData.phone.trim(),
        position: editContactData.position.trim()
      };
      await contactsApi.update(editContactData.id, payload);
      toast.success('Kontakt zaktualizowany!');
      setShowEditContactModal(false);
      await fetchContacts();
      // Zaktualizuj activeContact jeśli to ten sam kontakt
      if (activeContact && activeContact.id === editContactData.id) {
        setActiveContact({ ...activeContact, ...payload });
      }
    } catch (err) {
      console.error('Error updating contact', err);
      toast.error(err.response?.data?.message || 'Błąd aktualizacji kontaktu');
    } finally {
      setEditingContact(false);
    }
  };

  const handleCreateContact = async (e) => {
    e.preventDefault();
    const name = newContactData.name.trim();
    const email = newContactData.email.trim();

    if (!name || !email) {
      toast.error('Podaj imię i email kontaktu');
      return;
    }

    setCreatingContact(true);
    try {
      const payload = {
        name,
        email,
        company: newContactData.company.trim(),
        phone: newContactData.phone.trim(),
        position: newContactData.position.trim()
      };
      const response = await contactsApi.create(payload);
      toast.success('Kontakt utworzony!');
      resetNewContactForm();
      setShowCreateContactModal(false);
      await fetchContacts();
      setActiveContact(response.data);
      setDetailsOpen(true);
    } catch (err) {
      console.error('Error creating contact', err);
      toast.error(err.response?.data?.message || 'Błąd dodawania kontaktu');
    } finally {
      setCreatingContact(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchInitialData();
  }, [fetchContacts]);

  const fetchInitialData = async () => {
    try {
      const [companiesRes, accountsRes, tagsRes, seqRes] = await Promise.all([
        contactsApi.getCompanies(),
        emailAccountsApi.getAll(),
        tagsApi.getAll(),
        sequencesApi.getActive()
      ]);
      setCompanies(companiesRes.data || []);
      setEmailAccounts(accountsRes.data || []);
      setTags(tagsRes.data || []);
      setSequences(seqRes.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  // --- Filtering & Pagination ---
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts.filter((c) => {
      const matchesSearch = !query || [c.name, c.company, c.email].some(f => (f || '').toLowerCase().includes(query));
      const matchesCompany = !companyFilter || c.company === companyFilter;
      const matchesTag = !tagFilter || (c.tags || []).some(t => t.id.toString() === tagFilter);
      return matchesSearch && matchesCompany && matchesTag;
    });
  }, [contacts, search, companyFilter, tagFilter]);

  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  // --- Selection Logic ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(paginatedContacts.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleRowClick = (contact) => {
    setActiveContact(contact);
    setDetailsOpen(true);
  };

  // --- Actions ---
  const handleQuickEmail = (e, contact) => {
    e.stopPropagation();
    // Logic to find best account similar to previous implementation
    const defaultAccount = emailAccounts.length > 0 ? emailAccounts[0].id : '';
    setEmailFormData({
        to: contact.email,
        subject: '',
        body: '',
        accountId: defaultAccount
    });
    setShowEmailModal(true);
  };

  const handleBulkEmail = () => {
    toast('Wysyłanie masowych wiadomości już wkrótce!', { icon: '📧' });
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        await api.post('/emails/send', { ...emailFormData, accountId: Number(emailFormData.accountId) });
        toast.success('Email wysłany!');
        setShowEmailModal(false);
    } catch (err) {
        toast.error('Błąd wysyłki');
    } finally {
        setIsSaving(false);
    }
  };

  // Tag & Bulk Actions Handlers
  const handleTagContact = (contact) => {
    setTagContact(contact);
    setShowTagModal(true);
  };

  const handleToggleSelection = (contactId) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedIds(newSelection);
  };

  const handleBulkAction = async (action, tagId = null, sequenceId = null) => {
    if (selectedIds.size === 0) {
      toast.error('Zaznacz kontakty');
      return;
    }

    setIsSaving(true);
    try {
      if (action === 'tag' && tagId) {
        await tagsApi.addToContacts(Array.from(selectedIds), tagId);
        toast.success(`Tag dodany do ${selectedIds.size} kontaktów`);
        await fetchContacts();
      } else if (action === 'sequence' && sequenceId) {
        const promises = Array.from(selectedIds).map(contactId =>
          sequencesApi.startSequence(sequenceId, contactId)
        );
        await Promise.all(promises);
        toast.success(`Sekwencja uruchomiona dla ${selectedIds.size} kontaktów`);
      }
      setSelectedIds(new Set());
      setShowBulkActionsModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Błąd wykonywania akcji');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="contacts-shell">
      <Toaster position="top-right" />
      
      {/* Topbar */}
      <div className="contacts-topbar">
        <div>
          <h1>Kontakty</h1>
          <p className="contacts-sub">Zarządzaj relacjami z klientami</p>
        </div>
        <div className="contacts-topbar-actions">
          <button className="btn btn-secondary" onClick={() => fetchContacts()}>🔄 Odśwież</button>
          <button className="btn btn-primary" onClick={() => setShowCreateContactModal(true)}>+ Dodaj kontakt</button>
        </div>
      </div>

      {/* Main Dashboard Layout - matching Dashboard page */}
      <div className="container" style={{ paddingTop: '24px' }}>
        <div className="main-layout">
        {/* Left Sidebar - Filters */}
        <aside className="sidebar">
          <h3>Filtry kontaktów</h3>

          <div className="filter-group">
            <label className="filter-label">Szukaj</label>
            <div className="filter-input" style={{ position: 'relative' }}>
               <Search className="search-icon" size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
               <input
                 style={{ paddingLeft: '40px', width: '100%' }}
                 placeholder="Szukaj kontaktów..."
                 value={search}
                 onChange={e => setSearch(e.target.value)}
               />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Firma</label>
            <select
                className="filter-input"
                value={companyFilter}
                onChange={e => setCompanyFilter(e.target.value)}
            >
                <option value="">Wszystkie firmy</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Tagi</label>
            <select
                className="filter-input"
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
            >
                <option value="">Wszystkie tagi</option>
                {tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Statystyki</label>
            <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Wszystkie kontakty:</span>
                <span style={{ fontWeight: '600', color: '#111827' }}>{contacts.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Po filtrowaniu:</span>
                <span style={{ fontWeight: '600', color: '#111827' }}>{filtered.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <section className="contacts-center">
          {/* Toolbar - simplified */}
          <div className="contacts-toolbar">
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                Lista kontaktów
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
                Wyświetlono {filtered.length} z {contacts.length} kontaktów
              </p>
            </div>

            <div style={{display:'flex', gap: '12px', alignItems: 'center'}}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                {selectedIds.size > 0 && `${selectedIds.size} zaznaczonych`}
              </span>
            </div>
          </div>

          {/* Data Grid */}
          <div className="contacts-table-container">
            <table className="contacts-table">
              <thead>
                <tr>
                  <th className="col-checkbox">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={paginatedContacts.length > 0 && selectedIds.size === paginatedContacts.length}
                    />
                  </th>
                  <th className="col-name">Nazwa / Firma</th>
                  <th className="col-contact">Kontakt</th>
                  <th>Status / Tagi</th>
                  <th>Aktywność</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedContacts.map(contact => {
                   const initials = getInitials(contact.name);
                   const activity = getLastActivityLabel(contact.updatedAt); // Using updatedAt as proxy
                   return (
                     <tr 
                        key={contact.id} 
                        className={`contacts-row ${selectedIds.has(contact.id) ? 'selected' : ''}`}
                        onClick={() => handleRowClick(contact)}
                     >
                       <td className="col-checkbox" onClick={e => e.stopPropagation()}>
                         <input 
                            type="checkbox" 
                            checked={selectedIds.has(contact.id)}
                            onChange={() => handleSelectRow(contact.id)}
                         />
                       </td>
                       <td>
                         <div className="name-cell">
                           <div className="contact-avatar">{initials}</div>
                           <div>
                             <div className="name-text">{contact.name}</div>
                             <div className="company-text">{contact.company || '-'}</div>
                           </div>
                         </div>
                       </td>
                       <td>
                         <div className="meta-cell">
                           <a href={`mailto:${contact.email}`} className="email-link" onClick={e => e.stopPropagation()}>{contact.email}</a>
                           <span style={{color:'#94a3b8'}}>{contact.phone}</span>
                         </div>
                       </td>
                       <td>
                         <div className="tags-wrapper">
                            {(contact.tags || []).slice(0, 3).map(tag => (
                              <span
                                key={tag.id}
                                className="tag-chip"
                                style={{backgroundColor: tag.color, color: 'white'}}
                                onClick={(e) => { e.stopPropagation(); handleTagContact(contact); }}
                                title="Kliknij aby zarządzać tagami"
                              >
                                {tag.name}
                              </span>
                            ))}
                            {(contact.tags || []).length === 0 && (
                              <button
                                className="add-tag-btn"
                                onClick={(e) => { e.stopPropagation(); handleTagContact(contact); }}
                              >
                                + Tag
                              </button>
                            )}
                         </div>
                       </td>
                       <td>
                          <span className={`activity-badge ${activity.class}`}>
                             {activity.label}
                          </span>
                       </td>
                       <td>
                         <div className="row-actions">
                            <button 
                                className="action-icon-btn" 
                                title="Wyślij email"
                                onClick={(e) => handleQuickEmail(e, contact)}
                            >
                                <Mail size={16} />
                            </button>
                            <button 
                                className="action-icon-btn" 
                                title="Zadzwoń"
                                onClick={(e) => { e.stopPropagation(); window.location.href=`tel:${contact.phone}`}}
                            >
                                <Phone size={16} />
                            </button>
                         </div>
                       </td>
                     </tr>
                   );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="contacts-pagination">
             <span className="contacts-sub">Strona {currentPage} z {totalPages}</span>
             <div style={{display:'flex', gap:'8px'}}>
                <button 
                    className="btn btn-secondary" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                >
                    Poprzednia
                </button>
                <button 
                    className="btn btn-secondary" 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                >
                    Następna
                </button>
             </div>
          </div>
        </section>

        {/* Right Slide-Over Panel */}
        <aside className={`contacts-details ${detailsOpen ? 'open' : ''}`}>
            <button className="details-close" onClick={() => setDetailsOpen(false)}>
                <X size={20} />
            </button>
            {activeContact && (
                <div style={{marginTop:'20px'}}>
                    <div style={{textAlign:'center', marginBottom:'24px'}}>
                        <div className="contact-avatar" style={{width:'64px', height:'64px', fontSize:'24px', margin:'0 auto 12px'}}>
                            {getInitials(activeContact.name)}
                        </div>
                        <h2 style={{fontSize:'18px', margin:'0 0 4px'}}>{activeContact.name}</h2>
                        <p className="contacts-sub">{activeContact.company}</p>
                    </div>

                    <div style={{display:'flex', gap:'8px', marginBottom:'24px', justifyContent:'center', flexWrap:'wrap'}}>
                        <button className="btn btn-primary" onClick={(e) => handleQuickEmail(e, activeContact)}>
                            <Mail size={16} /> Email
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleOpenEditContact(activeContact)}>
                            ✏️ Edytuj
                        </button>
                        <button className="btn btn-secondary" onClick={() => {
                            setTaskFormData({ title: '', description: '', type: 'todo', priority: '3', dueDate: '', contactId: activeContact.id.toString() });
                            setShowTaskModal(true);
                        }}>
                            <Calendar size={16} /> Zadanie
                        </button>
                        <button className="btn btn-secondary" onClick={() => {
                            setMeetingFormData({ title: `Spotkanie z ${activeContact.name}`, description: '', type: 'meeting', priority: '2', dueDate: '', contactId: activeContact.id.toString() });
                            setShowMeetingModal(true);
                        }}>
                            <UserPlus size={16} /> Spotkanie
                        </button>
                    </div>

                    <div className="contacts-section">
                        <h3 style={{fontSize:'14px', fontWeight:'600', color:'#0f172a', marginBottom:'12px'}}>Dane kontaktowe</h3>
                        <div style={{display:'flex', flexDirection:'column', gap:'12px', fontSize:'14px'}}>
                            <div>
                                <span className="contacts-sub" style={{display:'block', marginBottom:'2px'}}>Email</span>
                                {activeContact.email}
                            </div>
                            <div>
                                <span className="contacts-sub" style={{display:'block', marginBottom:'2px'}}>Telefon</span>
                                {activeContact.phone || '-'}
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="contacts-section">
                        <h3 style={{fontSize:'14px', fontWeight:'600', color:'#0f172a', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px'}}>
                            <StickyNote size={16} /> Notatki
                        </h3>
                        
                        {/* Add Note Form */}
                        <div style={{ marginBottom: '16px' }}>
                            <textarea
                                value={newNoteContent}
                                onChange={e => setNewNoteContent(e.target.value)}
                                placeholder="Dodaj notatkę..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    fontSize: '14px',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                }}
                                disabled={savingNote}
                            />
                            <button 
                                className="btn btn-primary" 
                                style={{ marginTop: '8px', width: '100%' }}
                                onClick={handleAddNote}
                                disabled={savingNote || !newNoteContent.trim()}
                            >
                                {savingNote ? 'Zapisywanie...' : '+ Dodaj notatkę'}
                            </button>
                        </div>
                        
                        {/* Notes List */}
                        {notesLoading ? (
                            <div className="contacts-sub">Ładowanie notatek...</div>
                        ) : notes.length === 0 ? (
                            <div className="contacts-sub" style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                                Brak notatek dla tego kontaktu
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {notes.map(note => (
                                    <div key={note.id} style={{
                                        padding: '12px',
                                        backgroundColor: '#fffbeb',
                                        borderRadius: '8px',
                                        border: '1px solid #fde68a',
                                        position: 'relative'
                                    }}>
                                        <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', marginBottom: '8px' }}>
                                            {note.content}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', color: '#92400e' }}>
                                                {new Date(note.createdAt).toLocaleString('pl-PL')}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="contacts-section">
                        <h3 style={{fontSize:'14px', fontWeight:'600', color:'#0f172a', marginBottom:'12px'}}>Ostatnia aktywność</h3>
                        {activityLoading ? (
                            <div className="contacts-sub">Ładowanie...</div>
                        ) : activity.length === 0 ? (
                            <div className="contacts-sub">Brak ostatniej aktywności</div>
                        ) : (
                            <div className="contacts-timeline">
                                {activity.slice(0, 5).map(item => (
                                    <div key={item.id} className="contacts-timeline-item">
                                        <div style={{fontWeight:'500', marginBottom:'2px'}}>{item.subject || 'Brak tematu'}</div>
                                        <div className="contacts-sub" style={{marginBottom:'4px'}}>
                                            {new Date(item.receivedAt || item.sentAt).toLocaleDateString()} • {item.type === 'sent' ? 'Wysłano' : 'Odebrano'}
                                        </div>
                                        <div style={{color:'#64748b', fontSize:'13px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                            {item.preview || item.body}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </aside>
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
          <div className="floating-bar">
              <div className="floating-count">{selectedIds.size} zaznaczonych</div>
              <div className="floating-actions">
                  <button className="floating-btn" onClick={handleBulkEmail}>
                      <Send size={16} /> Wyślij email
                  </button>
                  <button className="floating-btn" onClick={() => { setSelectedBulkAction('tag'); setShowBulkActionsModal(true); }}>
                      🏷️ Dodaj tag
                  </button>
                  <button className="floating-btn" onClick={() => { setSelectedBulkAction('sequence'); setShowBulkActionsModal(true); }}>
                      ▶️ Uruchom sekwencję
                  </button>
                  <button className="floating-btn">
                      <UserPlus size={16} /> Zmień opiekuna
                  </button>
                  <button className="floating-btn" style={{color:'#f87171'}}>
                      <Trash2 size={16} /> Usuń
                  </button>
              </div>
          </div>
      )}

      {/* Create Contact Modal */}
      {showCreateContactModal && (
        <div className="task-modal-overlay" onClick={() => { setShowCreateContactModal(false); resetNewContactForm(); }}>
          <div className="task-modal" onClick={e => e.stopPropagation()}>
            <header className="task-modal__header">
              <h2>Dodaj nowy kontakt</h2>
              <button className="task-modal__close" onClick={() => { setShowCreateContactModal(false); resetNewContactForm(); }}>×</button>
            </header>
            <form className="task-form" onSubmit={handleCreateContact}>
              <div className="task-form__section">
                <label className="task-form__label">Imię i nazwisko *</label>
                <input
                  className="contacts-search"
                  value={newContactData.name}
                  onChange={e => setNewContactData({ ...newContactData, name: e.target.value })}
                  placeholder="np. Jan Kowalski"
                  required
                />
              </div>
              <div className="task-form__section">
                <label className="task-form__label">Email *</label>
                <input
                  className="contacts-search"
                  type="email"
                  value={newContactData.email}
                  onChange={e => setNewContactData({ ...newContactData, email: e.target.value })}
                  placeholder="jan@example.com"
                  required
                />
              </div>
              <div className="task-form__grid">
                <label className="task-form__label">
                  Firma
                  <input
                    className="contacts-search"
                    value={newContactData.company}
                    onChange={e => setNewContactData({ ...newContactData, company: e.target.value })}
                    placeholder="Nazwa firmy"
                  />
                </label>
                <label className="task-form__label">
                  Telefon
                  <input
                    className="contacts-search"
                    value={newContactData.phone}
                    onChange={e => setNewContactData({ ...newContactData, phone: e.target.value })}
                    placeholder="+48..."
                  />
                </label>
              </div>
              <div className="task-form__section">
                <label className="task-form__label">Stanowisko</label>
                <input
                  className="contacts-search"
                  value={newContactData.position}
                  onChange={e => setNewContactData({ ...newContactData, position: e.target.value })}
                  placeholder="np. CEO"
                />
              </div>
              <div className="task-modal__footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateContactModal(false); resetNewContactForm(); }} disabled={creatingContact}>
                  Anuluj
                </button>
                <button className="btn btn-primary" disabled={creatingContact}>
                  {creatingContact ? 'Zapisywanie...' : 'Dodaj kontakt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditContactModal && (
        <div className="task-modal-overlay" onClick={() => setShowEditContactModal(false)}>
          <div className="task-modal" onClick={e => e.stopPropagation()}>
            <header className="task-modal__header">
              <h2>Edytuj kontakt</h2>
              <button className="task-modal__close" onClick={() => setShowEditContactModal(false)}>×</button>
            </header>
            <form className="task-form" onSubmit={handleEditContact}>
              <div className="task-form__section">
                <label className="task-form__label">Imię i nazwisko *</label>
                <input
                  className="contacts-search"
                  value={editContactData.name}
                  onChange={e => setEditContactData({ ...editContactData, name: e.target.value })}
                  placeholder="np. Jan Kowalski"
                  required
                />
              </div>
              <div className="task-form__section">
                <label className="task-form__label">Email *</label>
                <input
                  className="contacts-search"
                  type="email"
                  value={editContactData.email}
                  onChange={e => setEditContactData({ ...editContactData, email: e.target.value })}
                  placeholder="jan@example.com"
                  required
                />
              </div>
              <div className="task-form__grid">
                <label className="task-form__label">
                  Firma
                  <input
                    className="contacts-search"
                    value={editContactData.company}
                    onChange={e => setEditContactData({ ...editContactData, company: e.target.value })}
                    placeholder="Nazwa firmy"
                  />
                </label>
                <label className="task-form__label">
                  Telefon
                  <input
                    className="contacts-search"
                    value={editContactData.phone}
                    onChange={e => setEditContactData({ ...editContactData, phone: e.target.value })}
                    placeholder="+48..."
                  />
                </label>
              </div>
              <div className="task-form__section">
                <label className="task-form__label">Stanowisko</label>
                <input
                  className="contacts-search"
                  value={editContactData.position}
                  onChange={e => setEditContactData({ ...editContactData, position: e.target.value })}
                  placeholder="np. CEO"
                />
              </div>
              <div className="task-modal__footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditContactModal(false)} disabled={editingContact}>
                  Anuluj
                </button>
                <button className="btn btn-primary" disabled={editingContact}>
                  {editingContact ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="task-modal-overlay" onClick={() => setShowEmailModal(false)}>
            <div className="task-modal" onClick={e => e.stopPropagation()}>
                <header className="task-modal__header">
                    <h2>Wyślij wiadomość</h2>
                    <button className="task-modal__close" onClick={() => setShowEmailModal(false)}>×</button>
                </header>
                <form className="task-form" onSubmit={handleEmailSubmit}>
                    <div className="task-form__section">
                        <label className="task-form__label">Do</label>
                        <input value={emailFormData.to} disabled className="contacts-search" />
                    </div>
                    <div className="task-form__section">
                        <label className="task-form__label">Temat</label>
                        <input 
                            value={emailFormData.subject} 
                            onChange={e => setEmailFormData({...emailFormData, subject: e.target.value})}
                            className="contacts-search" 
                        />
                    </div>
                    <div className="task-form__section">
                        <label className="task-form__label">Treść</label>
                        <textarea 
                            rows={5}
                            value={emailFormData.body} 
                            onChange={e => setEmailFormData({...emailFormData, body: e.target.value})}
                            className="contacts-search"
                        />
                    </div>
                    <div className="task-modal__footer">
                        <button className="btn btn-primary" disabled={isSaving}>Wyślij</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="task-modal-overlay" onClick={() => setShowTaskModal(false)}>
            <div className="task-modal" onClick={e => e.stopPropagation()}>
                <header className="task-modal__header">
                    <h2>Nowe Zadanie</h2>
                    <button className="task-modal__close" onClick={() => setShowTaskModal(false)}>×</button>
                </header>
                <form className="task-form" onSubmit={handleTaskSubmit}>
                    <div className="task-form__section">
                        <label className="task-form__label">Tytuł</label>
                        <input 
                            value={taskFormData.title} 
                            onChange={e => setTaskFormData({...taskFormData, title: e.target.value})}
                            className="contacts-search"
                            placeholder="np. Zadzwonić do klienta"
                            required
                        />
                    </div>
                    <div className="task-form__section">
                        <label className="task-form__label">Opis</label>
                        <textarea 
                            rows={3}
                            value={taskFormData.description} 
                            onChange={e => setTaskFormData({...taskFormData, description: e.target.value})}
                            className="contacts-search"
                        />
                    </div>
                    <div className="task-form__grid">
                        <label className="task-form__label">
                            Priorytet
                            <select 
                                value={taskFormData.priority} 
                                onChange={e => setTaskFormData({...taskFormData, priority: e.target.value})}
                                className="contacts-search"
                            >
                                <option value="1">Wysoki</option>
                                <option value="2">Średni</option>
                                <option value="3">Niski</option>
                            </select>
                        </label>
                        <label className="task-form__label">
                            Termin
                            <input 
                                type="datetime-local"
                                value={taskFormData.dueDate} 
                                onChange={e => setTaskFormData({...taskFormData, dueDate: e.target.value})}
                                className="contacts-search"
                            />
                        </label>
                    </div>
                    <div className="task-modal__footer">
                        <button className="btn btn-primary" disabled={isSaving}>Zapisz</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Meeting Modal */}
      {showMeetingModal && (
        <div className="task-modal-overlay" onClick={() => setShowMeetingModal(false)}>
            <div className="task-modal" onClick={e => e.stopPropagation()}>
                <header className="task-modal__header">
                    <h2>Zaplanuj Spotkanie</h2>
                    <button className="task-modal__close" onClick={() => setShowMeetingModal(false)}>×</button>
                </header>
                <form className="task-form" onSubmit={handleMeetingSubmit}>
                    <div className="task-form__section">
                        <label className="task-form__label">Tytuł</label>
                        <input 
                            value={meetingFormData.title} 
                            onChange={e => setMeetingFormData({...meetingFormData, title: e.target.value})}
                            className="contacts-search"
                            required
                        />
                    </div>
                    <div className="task-form__section">
                        <label className="task-form__label">Opis / Agenda</label>
                        <textarea 
                            rows={3}
                            value={meetingFormData.description} 
                            onChange={e => setMeetingFormData({...meetingFormData, description: e.target.value})}
                            className="contacts-search"
                        />
                    </div>
                    <div className="task-form__grid">
                        <label className="task-form__label">
                            Data i godzina
                            <input 
                                type="datetime-local"
                                value={meetingFormData.dueDate} 
                                onChange={e => setMeetingFormData({...meetingFormData, dueDate: e.target.value})}
                                className="contacts-search"
                                required
                            />
                        </label>
                    </div>
                    <div className="task-modal__footer">
                        <button className="btn btn-primary" disabled={isSaving}>Zaplanuj</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Tag Modal */}
      <TagModal
        isOpen={showTagModal}
        onClose={() => {
          setShowTagModal(false);
          setTagContact(null);
        }}
        contact={tagContact}
        onTagAdded={fetchContacts}
      />

      {/* Bulk Actions Modal */}
      {showBulkActionsModal && (
        <div className="modal-overlay" onClick={() => { setShowBulkActionsModal(false); setSelectedBulkAction(''); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedBulkAction === 'tag' ? 'Dodaj tag do kontaktów' : 'Uruchom sekwencję'}</h2>
              <p>Zaznaczono kontaktów: {selectedIds.size}</p>
              <button className="modal-close" onClick={() => { setShowBulkActionsModal(false); setSelectedBulkAction(''); }}>×</button>
            </div>
            <div className="modal-body">
              {selectedBulkAction === 'tag' && (
                <div className="form-group">
                  <label>Wybierz tag</label>
                  <select
                    id="bulkTagSelect"
                    disabled={isSaving}
                  >
                    <option value="">-- Wybierz tag --</option>
                    {tags.map(tag => (
                      <option key={tag.id} value={tag.id}>{tag.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedBulkAction === 'sequence' && (
                <div className="form-group">
                  <label>Wybierz sekwencję</label>
                  <select
                    id="bulkSequenceSelect"
                    disabled={isSaving}
                  >
                    <option value="">-- Wybierz sekwencję --</option>
                    {sequences.map(seq => (
                      <option key={seq.id} value={seq.id}>{seq.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowBulkActionsModal(false); setSelectedBulkAction(''); }}
                  disabled={isSaving}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isSaving}
                  onClick={() => {
                    const tagSelect = document.getElementById('bulkTagSelect');
                    const seqSelect = document.getElementById('bulkSequenceSelect');
                    const tagId = tagSelect ? Number(tagSelect.value) : null;
                    const seqId = seqSelect ? Number(seqSelect.value) : null;
                    handleBulkAction(selectedBulkAction, tagId, seqId);
                  }}
                >
                  {isSaving ? 'Wykonywanie...' : 'Wykonaj'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Contacts;
