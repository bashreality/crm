import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { tasksApi, contactsApi } from '../services/api';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/Calendar.css';

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

const CalendarTask = () => {
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    type: 'todo',
    dueDate: '',
    contactId: null,
    priority: 2
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

  // Konwertuj zadania na eventy dla kalendarza
  const events = tasks.map(task => {
    const start = task.dueDate ? new Date(task.dueDate) : new Date();
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

  const handleSelectSlot = useCallback(({ start, end }) => {
    // Formatuj datę do datetime-local input
    const formattedDate = format(start, "yyyy-MM-dd'T'HH:mm");
    setTaskFormData({
      title: '',
      description: '',
      type: 'todo',
      dueDate: formattedDate,
      contactId: null,
      priority: 2
    });
    setShowTaskModal(true);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event.resource);
    setShowEventModal(true);
  }, []);

  const handleTaskFormChange = (e) => {
    const { name, value } = e.target;
    setTaskFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();

    if (!taskFormData.title || !taskFormData.dueDate) {
      alert('Wypełnij tytuł i datę wykonania');
      return;
    }

    try {
      const payload = {
        title: taskFormData.title.trim(),
        description: taskFormData.description?.trim() || null,
        type: taskFormData.type,
        dueDate: taskFormData.dueDate ? `${taskFormData.dueDate}:00` : null,
        priority: Number(taskFormData.priority),
        completed: false,
        contact: taskFormData.contactId
          ? { id: Number(taskFormData.contactId) }
          : null,
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
        priority: 2
      });
      fetchTasks(); // Odśwież kalendarz
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

  const eventStyleGetter = (event) => {
    const task = event.resource;
    let backgroundColor = '#3174ad';

    if (task.completed) {
      backgroundColor = '#4caf50'; // Zielony dla ukończonych
    } else if (task.priority === 1) {
      backgroundColor = '#f44336'; // Czerwony dla wysokiego priorytetu
    } else if (task.priority === 2) {
      backgroundColor = '#ff9800'; // Pomarańczowy dla średniego
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: task.completed ? 0.6 : 1,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Kalendarz Zadań</h1>
          <p className="page-subtitle">Widok kalendarza z wszystkimi zadaniami i terminami</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowTaskModal(true)}
        >
          + Nowe zadanie
        </button>
      </div>

      <div className="calendar-container">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '700px' }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={eventStyleGetter}
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
          }}
          culture="pl"
        />
      </div>

      {/* Modal szczegółów zadania */}
      {showEventModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', wordWrap: 'break-word' }}>{selectedEvent.title}</h2>
              <button className="modal-close" onClick={() => setShowEventModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div className="event-details">
                <div className="event-detail-item" style={{ padding: '1rem', marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#555' }}>Typ:</strong>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem' }}>{selectedEvent.type}</p>
                </div>
                <div className="event-detail-item" style={{ padding: '1rem', marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#555' }}>Termin:</strong>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem' }}>{format(new Date(selectedEvent.dueDate), 'dd.MM.yyyy HH:mm')}</p>
                </div>
                <div className="event-detail-item" style={{ padding: '1rem', marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#555' }}>Priorytet:</strong>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem' }}>
                    {selectedEvent.priority === 1 ? '🔴 Wysoki' : selectedEvent.priority === 2 ? '🟠 Średni' : '🟢 Niski'}
                  </p>
                </div>
                {selectedEvent.contact && (
                  <div className="event-detail-item" style={{ padding: '1rem', marginBottom: '1rem' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#555' }}>Kontakt:</strong>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', wordWrap: 'break-word' }}>
                      {selectedEvent.contact.name} ({selectedEvent.contact.email})
                    </p>
                  </div>
                )}
                {selectedEvent.description && (
                  <div className="event-detail-item" style={{ padding: '1rem', marginBottom: '1rem' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#555' }}>Opis:</strong>
                    <div style={{
                      marginTop: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      maxHeight: '300px',
                      overflow: 'auto',
                      padding: '0.75rem',
                      backgroundColor: '#fff',
                      borderRadius: '4px',
                      border: '1px solid #e0e0e0',
                      fontSize: '0.95rem',
                      lineHeight: '1.6'
                    }}>
                      {selectedEvent.description}
                    </div>
                  </div>
                )}
                <div className="event-detail-item" style={{ padding: '1rem' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#555' }}>Status:</strong>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem' }}>
                    {selectedEvent.completed ? '✅ Ukończone' : '⏳ Oczekujące'}
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', padding: '1rem 1.5rem' }}>
              <button className="btn btn-danger" onClick={handleDeleteTask}>
                Usuń
              </button>
              {!selectedEvent.completed && (
                <button className="btn btn-primary" onClick={handleCompleteTask}>
                  Oznacz jako ukończone
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal tworzenia zadania */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Utwórz nowe zadanie</h2>
              <button className="modal-close" onClick={() => setShowTaskModal(false)}>×</button>
            </div>
            <form onSubmit={handleTaskSubmit} className="modal-body">
              <div className="form-group">
                <label htmlFor="taskTitle">Tytuł zadania *</label>
                <input
                  type="text"
                  id="taskTitle"
                  name="title"
                  className="form-control"
                  value={taskFormData.title}
                  onChange={handleTaskFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="taskType">Typ zadania</label>
                <select
                  id="taskType"
                  name="type"
                  className="form-control"
                  value={taskFormData.type}
                  onChange={handleTaskFormChange}
                >
                  <option value="todo">Do zrobienia</option>
                  <option value="call">Telefon</option>
                  <option value="email">Email</option>
                  <option value="meeting">Spotkanie</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="taskDescription">Opis</label>
                <textarea
                  id="taskDescription"
                  name="description"
                  className="form-control"
                  rows="4"
                  value={taskFormData.description}
                  onChange={handleTaskFormChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="taskDueDate">Data i godzina wykonania *</label>
                <input
                  type="datetime-local"
                  id="taskDueDate"
                  name="dueDate"
                  className="form-control"
                  value={taskFormData.dueDate}
                  onChange={handleTaskFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="taskPriority">Priorytet</label>
                <select
                  id="taskPriority"
                  name="priority"
                  className="form-control"
                  value={taskFormData.priority}
                  onChange={handleTaskFormChange}
                >
                  <option value="1">Wysoki</option>
                  <option value="2">Średni</option>
                  <option value="3">Niski</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="taskContact">Przypisz do kontaktu</label>
                <select
                  id="taskContact"
                  name="contactId"
                  className="form-control"
                  value={taskFormData.contactId || ''}
                  onChange={handleTaskFormChange}
                >
                  <option value="">Wybierz kontakt (opcjonalnie)</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} ({contact.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn btn-primary">
                  Utwórz zadanie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarTask;
