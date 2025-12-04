import { useEffect, useMemo, useState } from 'react';
import { tasksApi, contactsApi } from '../services/api';
import '../styles/Tasks.css';

const emptyTask = {
  title: '',
  description: '',
  type: 'todo',
  contactId: '',
  dueDate: '',
  priority: '3',
};

const typeOptions = [
  { value: 'todo', label: 'Do zrobienia', icon: '📝' },
  { value: 'call', label: 'Telefon', icon: '📞' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'meeting', label: 'Spotkanie', icon: '🤝' },
];

const priorityOptions = [
  { value: '1', label: 'Wysoki', tone: 'high' },
  { value: '2', label: 'Średni', tone: 'medium' },
  { value: '3', label: 'Niski', tone: 'low' },
];

const filterOptions = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'today', label: 'Na dziś' },
  { value: 'pending', label: 'Oczekujące' },
  { value: 'overdue', label: 'Spóźnione' },
  { value: 'completed', label: 'Ukończone' },
];

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isOverdue = (task) => {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate) < new Date();
};

const isToday = (task) => {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
};

const getPriorityTone = (priority) => {
  switch (Number(priority)) {
    case 1:
      return 'high';
    case 2:
      return 'medium';
    default:
      return 'low';
  }
};

const TaskModal = ({
  contacts,
  isOpen,
  onClose,
  onSubmit,
  task,
  setTask,
  isSaving,
  isEditing = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="task-modal-overlay"
      onClick={() => !isSaving && onClose()}
      role="presentation"
    >
      <div
        className="task-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="task-modal__header">
          <div>
            <h2>{isEditing ? 'Edytuj zadanie' : 'Nowe zadanie'}</h2>
            <p>{isEditing ? 'Zaktualizuj szczegóły zadania' : 'Przypisz follow-up lub zadanie dla zespołu'}</p>
          </div>
          <button
            type="button"
            className="task-modal__close"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Zamknij"
          >
            ×
          </button>
        </header>

        <form className="task-form" onSubmit={onSubmit}>
          <div className="task-form__section">
            <label className="task-form__label">
              Tytuł <span>*</span>
              <input
                type="text"
                value={task.title}
                onChange={(e) =>
                  setTask((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="np. Oddzwonić do klienta"
                required
                disabled={isSaving}
              />
            </label>
          </div>

          <div className="task-form__grid">
            <label className="task-form__label">
              Typ zadania
              <div className="task-form__chips">
                {typeOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={`task-form__chip ${
                      task.type === option.value ? 'active' : ''
                    }`}
                    onClick={() =>
                      setTask((prev) => ({ ...prev, type: option.value }))
                    }
                    disabled={isSaving}
                  >
                    <span>{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </label>

            <label className="task-form__label">
              Priorytet
              <div className="task-form__chips">
                {priorityOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={`task-form__chip priority-${option.tone} ${
                      task.priority === option.value ? 'active' : ''
                    }`}
                    onClick={() =>
                      setTask((prev) => ({ ...prev, priority: option.value }))
                    }
                    disabled={isSaving}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <div className="task-form__section">
            <label className="task-form__label">
              Przypisz do kontaktu
              <select
                value={task.contactId}
                onChange={(e) =>
                  setTask((prev) => ({ ...prev, contactId: e.target.value }))
                }
                disabled={isSaving}
              >
                <option value="">Brak powiązania</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name || contact.email}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="task-form__grid">
            <label className="task-form__label">
              Termin realizacji
              <input
                type="datetime-local"
                value={task.dueDate}
                onChange={(e) =>
                  setTask((prev) => ({ ...prev, dueDate: e.target.value }))
                }
                disabled={isSaving}
              />
              <div className="task-form__quick">
                <button
                  type="button"
                  onClick={() =>
                    setTask((prev) => ({
                      ...prev,
                      dueDate: new Date().toISOString().slice(0, 16),
                    }))
                  }
                  disabled={isSaving}
                >
                  Dzisiaj
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setTask((prev) => ({
                      ...prev,
                      dueDate: tomorrow.toISOString().slice(0, 16),
                    }));
                  }}
                  disabled={isSaving}
                >
                  Jutro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    setTask((prev) => ({
                      ...prev,
                      dueDate: nextWeek.toISOString().slice(0, 16),
                    }));
                  }}
                  disabled={isSaving}
                >
                  Za tydzień
                </button>
              </div>
            </label>
            <label className="task-form__label">
              Opis
              <textarea
                rows={4}
                value={task.description}
                onChange={(e) =>
                  setTask((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Dodaj ważne szczegóły, linki lub następne kroki..."
                disabled={isSaving}
              />
            </label>
          </div>

          <footer className="task-form__actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Anuluj
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Zapisywanie...' : isEditing ? 'Zaktualizuj zadanie' : 'Zapisz zadanie'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formState, setFormState] = useState(emptyTask);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTask, setEditingTask] = useState(null); // null = create mode, task object = edit mode

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [tasksResponse, contactsResponse] = await Promise.all([
          tasksApi.getAll(),
          contactsApi.getAll(),
        ]);
        setTasks(tasksResponse.data);
        setContacts(contactsResponse.data);
      } catch (err) {
        console.error('Nie udało się pobrać listy zadań:', err);
        setError('Nie udało się pobrać zadań. Spróbuj ponownie później.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const refreshTasks = async () => {
    try {
      const response = await tasksApi.getAll();
      setTasks(response.data);
    } catch (err) {
      console.error('Nie udało się odświeżyć zadań:', err);
    }
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((task) => !task.completed).length;
    const overdue = tasks.filter((task) => isOverdue(task)).length;
    const today = tasks.filter((task) => !task.completed && isToday(task)).length;
    const completed = tasks.filter((task) => task.completed).length;

    return { total, pending, overdue, today, completed };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (!searchTerm.trim()) return true;
        const haystack = `${task.title} ${task.description || ''} ${
          task.contact?.name || ''
        }`.toLowerCase();
        return haystack.includes(searchTerm.trim().toLowerCase());
      })
      .filter((task) => {
        switch (filter) {
          case 'pending':
            return !task.completed;
          case 'overdue':
            return !task.completed && isOverdue(task);
          case 'completed':
            return task.completed;
          case 'today':
            return !task.completed && isToday(task);
          default:
            return true;
        }
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return aDate - bDate;
      });
  }, [tasks, filter, searchTerm]);

  const handleSubmitTask = async (event) => {
    event.preventDefault();
    if (!formState.title.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        title: formState.title.trim(),
        description: formState.description?.trim() || null,
        type: formState.type,
        dueDate: formState.dueDate ? `${formState.dueDate}:00` : null,
        priority: Number(formState.priority),
        completed: editingTask ? editingTask.completed : false,
        contact: formState.contactId
          ? { id: Number(formState.contactId) }
          : null,
      };

      if (editingTask) {
        // Edit mode - update existing task
        await tasksApi.update(editingTask.id, payload);
      } else {
        // Create mode - create new task
        await tasksApi.create(payload);
      }

      await refreshTasks();
      setModalOpen(false);
      setFormState(emptyTask);
      setEditingTask(null);
    } catch (err) {
      console.error('Błąd zapisu zadania:', err);
      alert('Nie udało się zapisać zadania. Sprawdź dane i spróbuj ponownie.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTask = (task) => {
    // Convert task to form format
    setFormState({
      title: task.title,
      description: task.description || '',
      type: task.type,
      contactId: task.contact?.id || '',
      dueDate: task.dueDate ? task.dueDate.slice(0, 16) : '',
      priority: String(task.priority),
    });
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await tasksApi.complete(taskId);
      await refreshTasks();
    } catch (err) {
      console.error('Błąd podczas zamykania zadania:', err);
      alert('Nie udało się oznaczyć zadania jako ukończone.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    const confirmed = window.confirm('Usunąć to zadanie?');
    if (!confirmed) return;

    try {
      await tasksApi.delete(taskId);
      await refreshTasks();
    } catch (err) {
      console.error('Błąd usuwania zadania:', err);
      alert('Nie udało się usunąć zadania.');
    }
  };

  return (
    <div className="tasks-shell" style={{ background: 'var(--color-bg-main)', minHeight: '100vh' }}>
      <div className="container" style={{ paddingTop: '24px' }}>
        {/* Action buttons integrated into background */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '12px', 
          marginBottom: '24px' 
        }}>
          <button className="btn btn-secondary" onClick={() => refreshTasks()}>
            🔄 Odśwież
          </button>
          <button className="btn btn-primary" onClick={() => {
            setFormState(emptyTask);
            setEditingTask(null);
            setModalOpen(true);
          }}>
            + Nowe zadanie
          </button>
        </div>
        <section className="tasks-metrics">
        <article className="metric-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="metric-label">Aktywne</span>
            <span style={{ fontSize: '20px' }}>📋</span>
          </div>
          <strong className="metric-value">{stats.pending}</strong>
          <span className="metric-trend positive">
            {stats.today} zaplanowane na dziś
          </span>
        </article>
        <article className="metric-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="metric-label">Spóźnione</span>
            <span style={{ fontSize: '20px' }}>⚠️</span>
          </div>
          <strong className="metric-value overdue">{stats.overdue}</strong>
          <span className="metric-trend">
            {stats.total ? `${Math.round((stats.overdue / stats.total) * 100)}%` : 0}
            {' '}listy zadań
          </span>
        </article>
        <article className="metric-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="metric-label">Zakończone</span>
            <span style={{ fontSize: '20px' }}>✅</span>
          </div>
          <strong className="metric-value completed">{stats.completed}</strong>
          <span className="metric-trend neutral">
            Łącznie {stats.total} zadań
          </span>
        </article>
        <article className="metric-card" style={{ gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="metric-label">Postęp</span>
            <span style={{ fontSize: '20px' }}>📊</span>
          </div>
          <strong className="metric-value" style={{ color: '#6366f1' }}>
            {stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
          </strong>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginTop: '12px' }}>
            <div style={{
              width: `${stats.total ? (stats.completed / stats.total) * 100 : 0}%`,
              height: '100%',
              backgroundColor: '#10b981',
              transition: 'width 0.3s ease',
              borderRadius: '4px'
            }}></div>
          </div>
          <span className="metric-trend neutral" style={{ marginTop: '8px', display: 'block' }}>
            {stats.completed} z {stats.total} ukończonych
          </span>
        </article>
      </section>

      <div className="main-layout">
        {/* Left Sidebar - Filters */}
        <aside className="sidebar">
          <h3>Filtry zadań</h3>

          <div className="filter-group">
            <label className="filter-label">Status</label>
            <div className="tasks-filters">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  className={filter === option.value ? 'active' : ''}
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                  <span>
                    {option.value === 'all'
                      ? stats.total
                      : option.value === 'pending'
                      ? stats.pending
                      : option.value === 'overdue'
                      ? stats.overdue
                      : option.value === 'completed'
                      ? stats.completed
                      : stats.today}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Szukaj</label>
            <div className="filter-input">
              <input
                type="search"
                placeholder="Szukaj po tytule, opisie lub kontakcie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Statystyki</label>
            <div className="tasks-stats">
              <div className="stat-row">
                <span>Wszystkie zadania:</span>
                <span>{stats.total}</span>
              </div>
              <div className="stat-row">
                <span>Oczekujące:</span>
                <span>{stats.pending}</span>
              </div>
              <div className="stat-row">
                <span>Spóźnione:</span>
                <span>{stats.overdue}</span>
              </div>
              <div className="stat-row">
                <span>Ukończone:</span>
                <span>{stats.completed}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content - Tasks List */}
        <section className="tasks-center">
          {/* White Card Container */}
          <div>
            {/* Toolbar */}
            <div className="tasks-toolbar">
              <div>
                <h3>Lista zadań</h3>
                <p>Wyświetlono {filteredTasks.length} z {stats.total} zadań</p>
              </div>
            </div>

            {/* Tasks List */}
            <div className="tasks-list">
        {isLoading && (
          <div className="tasks-empty">
            <div className="tasks-spinner" />
            <p>Ładuję zadania...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="tasks-error">
            <p>{error}</p>
            <button onClick={refreshTasks}>Spróbuj ponownie</button>
          </div>
        )}

        {!isLoading && !error && filteredTasks.length === 0 && (
          <div className="tasks-empty">
            <div className="tasks-empty__icon">🗂️</div>
            <h3>Brak zadań w tej sekcji</h3>
            <p>Utwórz nowe zadanie lub zmień filtr, aby zobaczyć archiwum.</p>
            <button className="btn-secondary" onClick={() => {
              setFormState(emptyTask);
              setEditingTask(null);
              setModalOpen(true);
            }}>
              Dodaj pierwsze zadanie
            </button>
          </div>
        )}

        {!isLoading &&
          !error &&
          filteredTasks.map((task) => (
            <article
              key={task.id}
              className={`task-card ${
                task.completed ? 'task-card--completed' : ''
              } ${isOverdue(task) ? 'task-card--overdue' : ''}`}
              onClick={() => handleEditTask(task)}
              style={{ cursor: 'pointer' }}
            >
              <div className="task-card__header">
                <div className="task-card__info">
                  <span className="task-card__icon">
                    {typeOptions.find((option) => option.value === task.type)?.icon ||
                      '📝'}
                  </span>
                  <div>
                    <h3>{task.title}</h3>
                    {task.contact && (
                      <span className="task-card__contact">
                        👤 {task.contact.name || task.contact.email}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`task-card__priority priority-${getPriorityTone(
                    task.priority,
                  )}`}
                >
                  Priorytet{' '}
                  {
                    priorityOptions.find(
                      (option) => Number(option.value) === Number(task.priority),
                    )?.label
                  }
                </div>
              </div>

              {task.description && (
                <p className="task-card__description">{task.description}</p>
              )}

              <footer className="task-card__footer">
                {task.dueDate ? (
                  <span
                    className={`task-card__due ${
                      isOverdue(task) ? 'overdue' : isToday(task) ? 'today' : ''
                    }`}
                  >
                    📅 {formatDateTime(task.dueDate)}
                  </span>
                ) : (
                  <span className="task-card__due no-date">⏳ Bez terminu</span>
                )}

                <div className="task-card__actions">
                  {!task.completed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteTask(task.id);
                      }}
                    >
                      Oznacz jako ukończone
                    </button>
                  )}
                  <button
                    className="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(task.id);
                    }}
                  >
                    Usuń
                  </button>
                </div>
              </footer>
            </article>
          ))}
            </div>
          </div>
        </section>
      </div>
      </div>

      <TaskModal
        contacts={contacts}
        isOpen={modalOpen}
        onClose={() => {
          if (!isSaving) {
            setModalOpen(false);
            setFormState(emptyTask);
            setEditingTask(null);
          }
        }}
        onSubmit={handleSubmitTask}
        task={formState}
        setTask={setFormState}
        isSaving={isSaving}
        isEditing={!!editingTask}
      />
    </div>
  );
};

export default Tasks;
