import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { tasksApi, contactsApi } from '../services/api';
import { CheckCircle2, AlertCircle, Clock, Trash2 } from 'lucide-react'; // Import icons
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/Calendar.css';
import '../styles/Tasks.css';

const locales = {
  'pl': pl,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const formats = {
  monthHeaderFormat: 'LLLL yyyy',
  dayHeaderFormat: 'EEEE, d LLLL',
  dayRangeHeaderFormat: ({ start, end }, culture, loc) =>
    `${loc.format(start, 'd LLLL', culture)} – ${loc.format(end, 'd LLLL', culture)}`,
  eventTimeRangeFormat: ({ start, end }, culture, loc) =>
    `${loc.format(start, 'HH:mm', culture)} - ${loc.format(end, 'HH:mm', culture)}`,
};

const CalendarTask = () => {
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [onlyHighPriority, setOnlyHighPriority] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    type: 'todo',
    dueDate: '',
    contactId: null,
    priority: 3 // Default Low
  });

  useEffect(() => {
    fetchTasks();
    fetchContacts();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await tasksApi.getAll();
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
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

  const visibleTasks = onlyHighPriority
    ? tasks.filter((t) => Number(t.priority) === 1)
    : tasks;

  const events = visibleTasks.map(task => {
    const start = task.dueDate ? new Date(task.dueDate) : new Date(); // Default to now if no date, or filter out?
    const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour

    return {
      id: task.id,
      title: task.title,
      start: start,
      end: end,
      resource: task,
      allDay: false,
    };
  });

  const handleSelectSlot = useCallback(({ start }) => {
    const formattedDate = format(start, "yyyy-MM-dd'T'HH:mm");
    setTaskFormData({
      title: '',
      description: '',
      type: 'todo',
      dueDate: formattedDate,
      contactId: null,
      priority: 3
    });
    setShowTaskModal(true);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event.resource);
    setShowEventModal(true);
  }, []);

  const handleTaskFormChange = (e) => {
    const { name, value } = e.target;
    setTaskFormData(prev => ({
      ...prev,
      [name]: name === 'priority'
        ? Number(value)
        : name === 'contactId'
          ? (value ? Number(value) : null)
          : value
    }));
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();

    if (!taskFormData.title || !taskFormData.dueDate) {
      alert('Wpisz tytuł i termin zadania');
      return;
    }

    try {
      const payload = {
        title: taskFormData.title.trim(),
        description: taskFormData.description?.trim() || null,
        type: taskFormData.type,
        dueDate: taskFormData.dueDate ? `${taskFormData.dueDate}:00` : null,
        priority: Number(taskFormData.priority) || 3,
        completed: false,
        contact: taskFormData.contactId ? { id: Number(taskFormData.contactId) } : null,
      };

      await tasksApi.create(payload);
      alert('✅ Zadanie zostało utworzone!');
      setShowTaskModal(false);
      setTaskFormData({
        title: '',
        description: '',
        type: 'todo',
        dueDate: '',
        contactId: null,
        priority: 3
      });
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('❌ Błąd podczas tworzenia zadania');
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedEvent) return;
    try {
      await tasksApi.complete(selectedEvent.id);
      alert('✅ Zadanie oznaczone jako ukończone!');
      setShowEventModal(false);
      setSelectedEvent(null);
      fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      alert('❌ Błąd podczas oznaczania zadania');
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedEvent || !window.confirm('Czy na pewno chcesz usunąć to zadanie?')) return;
    try {
      await tasksApi.delete(selectedEvent.id);
      alert('✅ Zadanie zostało usunięte!');
      setShowEventModal(false);
      setSelectedEvent(null);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('❌ Błąd podczas usuwania zadania');
    }
  };

  // Custom Event Component
  const CustomEvent = ({ event }) => {
    const task = event.resource;
    if (!task) return null;
    return (
      <div className="rbc-event-content">
        <div className="rbc-event-title">
          {task.completed && <CheckCircle2 size={12} style={{marginRight:4}} />}
          {task.title}
        </div>
      </div>
    );
  };

  const eventStyleGetter = (event) => {
    const task = event.resource;
    let backgroundColor = '#3b82f6'; // Default
    const priority = parseInt(task.priority);

    if (task.completed) {
      backgroundColor = '#9ca3af'; // Gray for completed
    } else {
      switch(priority) {
        case 1: backgroundColor = '#ef4444'; break; // High (Red)
        case 2: backgroundColor = '#f59e0b'; break; // Medium (Amber)
        case 3: backgroundColor = '#10b981'; break; // Low (Green)
        default: backgroundColor = '#3b82f6';
      }
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 1,
        color: 'white',
        border: 'none',
        display: 'block',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        fontSize: '13px',
        fontWeight: '500',
        padding: '2px 6px'
      }
    };
  };

  // ... existing eventStyleGetter ...

  return (
    <div className="container">
      <div className="calendar-container">
        <div className="calendar-header-custom">
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                <h2>Kalendarz zadań</h2>
                <button 
                    className="btn btn-primary" 
                    style={{padding: '6px 12px', fontSize: '13px'}}
                    onClick={() => {
                        setTaskFormData({
                            title: '',
                            description: '',
                            type: 'todo',
                            dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                            contactId: null,
                            priority: 3
                        });
                        setShowTaskModal(true);
                    }}
                >
                    + Nowe zadanie
                </button>
            </div>
            <div className="calendar-legend">
              {/* ... legend items ... */}
              <div className="legend-item"><span className="legend-dot high"></span> Wysoki</div>
              <div className="legend-item"><span className="legend-dot medium"></span> Średni</div>
              <div className="legend-item"><span className="legend-dot low"></span> Niski</div>
              <div className="legend-item"><span className="legend-dot completed"></span> Ukończone</div>
              
              <label className="legend-toggle">
                <input
                  type="checkbox"
                  checked={onlyHighPriority}
                  onChange={(e) => setOnlyHighPriority(e.target.checked)}
                />
                <span>Tylko pilne</span>
              </label>
            </div>
        </div>

        <Calendar
          // ... props ...
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '750px' }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={eventStyleGetter}
          components={{
            event: CustomEvent
          }}
          formats={formats}
          messages={{
            next: "Następny",
            previous: "Poprzedni",
            today: "Dziś",
            month: "Miesiąc",
            week: "Tydzień",
            day: "Dzień",
            agenda: "Agenda",
            date: "Data",
            time: "Czas",
            event: "Wydarzenie",
            noEventsInRange: "Brak wydarzeń w tym zakresie."
          }}
          culture="pl"
        />
      </div>

      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div className="task-modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="task-modal" onClick={(e) => e.stopPropagation()}>
            <header className="task-modal__header">
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                 {selectedEvent.completed ? <CheckCircle2 color="#10b981" /> : <Clock color="#6b7280" />}
                 <h2 style={{margin:0}}>{selectedEvent.title}</h2>
              </div>
              <button className="task-modal__close" onClick={() => setShowEventModal(false)}>×</button>
            </header>
            
            <div className="task-form">
                {/* Status Banner */}
                <div style={{
                    padding: '12px', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    backgroundColor: selectedEvent.completed ? '#ecfdf5' : '#f3f4f6',
                    color: selectedEvent.completed ? '#065f46' : '#374151',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{fontWeight:600}}>
                        {selectedEvent.completed ? 'Zadanie ukończone' : 'Do wykonania'}
                    </span>
                    <span style={{fontSize:'13px'}}>
                        Termin: {selectedEvent.dueDate ? format(new Date(selectedEvent.dueDate), 'd MMMM, HH:mm', { locale: pl }) : 'Brak terminu'}
                    </span>
                </div>
                {/* ... rest of modal ... */}

                <div className="task-form__section">
                    <label className="task-form__label">Opis</label>
                    <p style={{whiteSpace: 'pre-wrap', color: '#4b5563', lineHeight: 1.6}}>
                        {selectedEvent.description || 'Brak opisu'}
                    </p>
                </div>

                <div className="task-form__grid">
                    <div>
                        <label className="task-form__label">Priorytet</label>
                        <div className={`task-form__chip active priority-${
                            selectedEvent.priority === 1 ? 'high' : selectedEvent.priority === 2 ? 'medium' : 'low'
                        }`}>
                            {selectedEvent.priority === 1 ? 'Wysoki' : selectedEvent.priority === 2 ? 'Średni' : 'Niski'}
                        </div>
                    </div>
                    <div>
                        <label className="task-form__label">Powiązany kontakt</label>
                        {selectedEvent.contact ? (
                            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                <div style={{
                                    width:24, height:24, borderRadius:'50%', 
                                    backgroundColor:'#dbeafe', color:'#1e40af', 
                                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'bold'
                                }}>
                                    {selectedEvent.contact.name.charAt(0)}
                                </div>
                                <span>{selectedEvent.contact.name}</span>
                            </div>
                        ) : <span style={{color:'#9ca3af'}}>Brak</span>}
                    </div>
                </div>

                <div className="task-modal__footer" style={{justifyContent:'space-between', marginTop:'20px'}}>
                    <button className="btn btn-secondary" style={{color:'#ef4444', borderColor:'#fee2e2'}} onClick={handleDeleteTask}>
                        <Trash2 size={16} /> Usuń
                    </button>
                    {!selectedEvent.completed && (
                        <button className="btn btn-primary" onClick={handleCompleteTask}>
                            <CheckCircle2 size={16} /> Oznacz jako wykonane
                        </button>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="task-modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="task-modal" onClick={(e) => e.stopPropagation()}>
            <header className="task-modal__header">
              <h2>Nowe zadanie</h2>
              <button className="task-modal__close" onClick={() => setShowTaskModal(false)}>×</button>
            </header>

            <form className="task-form" onSubmit={handleTaskSubmit}>
              <div className="task-form__section">
                <label className="task-form__label">Tytuł *</label>
                <input
                  type="text"
                  name="title"
                  value={taskFormData.title}
                  onChange={handleTaskFormChange}
                  placeholder="np. Spotkanie z klientem"
                  required
                />
              </div>

              <div className="task-form__grid">
                <label className="task-form__label">
                  Typ zadania
                  <div className="task-form__chips">
                    {['todo', 'call', 'email', 'meeting'].map(type => (
                       <button
                         key={type}
                         type="button"
                         className={`task-form__chip ${taskFormData.type === type ? 'active' : ''}`}
                         onClick={() => setTaskFormData(p => ({ ...p, type }))}
                       >
                         {type === 'todo' ? 'Do zrobienia' : type === 'call' ? 'Telefon' : type === 'email' ? 'Email' : 'Spotkanie'}
                       </button>
                    ))}
                  </div>
                </label>

                <label className="task-form__label">
                  Priorytet
                  <div className="task-form__chips">
                    {[
                        { val: 1, label: 'Wysoki', cls: 'high' },
                        { val: 2, label: 'Średni', cls: 'medium' },
                        { val: 3, label: 'Niski', cls: 'low' }
                    ].map(p => (
                       <button
                         key={p.val}
                         type="button"
                         className={`task-form__chip priority-${p.cls} ${Number(taskFormData.priority) === p.val ? 'active' : ''}`}
                         onClick={() => setTaskFormData(prev => ({ ...prev, priority: p.val }))}
                       >
                         {p.label}
                       </button>
                    ))}
                  </div>
                </label>
              </div>

              <div className="task-form__section">
                <label className="task-form__label">Kontakt</label>
                <select name="contactId" value={taskFormData.contactId || ''} onChange={handleTaskFormChange}>
                    <option value="">-- Wybierz kontakt --</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="task-form__grid">
                 <label className="task-form__label">
                    Termin
                    <input type="datetime-local" name="dueDate" value={taskFormData.dueDate} onChange={handleTaskFormChange} required />
                 </label>
              </div>

              <div className="task-form__section">
                 <label className="task-form__label">Opis</label>
                 <textarea rows="3" name="description" value={taskFormData.description} onChange={handleTaskFormChange} placeholder="Szczegóły..." />
              </div>

              <div className="task-modal__footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Anuluj</button>
                <button type="submit" className="btn btn-primary">Utwórz</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarTask;
