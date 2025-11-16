import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Tasks.css';

const API_URL = 'http://localhost:8080/api';

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, overdue, completed

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    type: 'todo',
    contactId: '',
    dueDate: '',
    priority: 3
  });

  useEffect(() => {
    loadTasks();
    loadContacts();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await axios.get(`${API_URL}/contacts`);
      setContacts(response.data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();

    const taskData = {
      title: newTask.title,
      description: newTask.description,
      type: newTask.type,
      contact: newTask.contactId ? contacts.find(c => c.id === parseInt(newTask.contactId)) : null,
      dueDate: newTask.dueDate || null,
      priority: parseInt(newTask.priority),
      completed: false
    };

    try {
      await axios.post(`${API_URL}/tasks`, taskData);
      setShowModal(false);
      setNewTask({
        title: '',
        description: '',
        type: 'todo',
        contactId: '',
        dueDate: '',
        priority: 3
      });
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Błąd podczas tworzenia zadania');
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await axios.put(`${API_URL}/tasks/${taskId}/complete`);
      loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (confirm('Czy na pewno chcesz usunąć to zadanie?')) {
      try {
        await axios.delete(`${API_URL}/tasks/${taskId}`);
        loadTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 1: return '#EF4444';
      case 2: return '#F59E0B';
      case 3: return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPriorityLabel = (priority) => {
    switch(priority) {
      case 1: return 'Wysoki';
      case 2: return 'Średni';
      case 3: return 'Niski';
      default: return 'Nieznany';
    }
  };

  const getTaskIcon = (type) => {
    switch(type) {
      case 'call': return '📞';
      case 'email': return '📧';
      case 'meeting': return '🤝';
      case 'todo': return '✓';
      default: return '📝';
    }
  };

  const isOverdue = (task) => {
    if (!task.dueDate || task.completed) return false;
    return new Date(task.dueDate) < new Date();
  };

  const getFilteredTasks = () => {
    switch(filter) {
      case 'pending':
        return tasks.filter(t => !t.completed);
      case 'overdue':
        return tasks.filter(t => !t.completed && isOverdue(t));
      case 'completed':
        return tasks.filter(t => t.completed);
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();
  const pendingCount = tasks.filter(t => !t.completed).length;
  const overdueCount = tasks.filter(t => isOverdue(t)).length;
  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <div>
          <h1>Zadania</h1>
          <div className="task-filters">
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              Wszystkie ({tasks.length})
            </button>
            <button
              className={filter === 'pending' ? 'active' : ''}
              onClick={() => setFilter('pending')}
            >
              Oczekujące ({pendingCount})
            </button>
            <button
              className={filter === 'overdue' ? 'active' : ''}
              onClick={() => setFilter('overdue')}
            >
              Spóźnione ({overdueCount})
            </button>
            <button
              className={filter === 'completed' ? 'active' : ''}
              onClick={() => setFilter('completed')}
            >
              Ukończone ({completedCount})
            </button>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Nowe Zadanie
        </button>
      </div>

      <div className="tasks-list">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>Brak zadań</h3>
            <p>Utwórz nowe zadanie, aby rozpocząć</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className={`task-card ${task.completed ? 'completed' : ''} ${isOverdue(task) ? 'overdue' : ''}`}>
              <div className="task-main">
                <div className="task-checkbox">
                  {!task.completed && (
                    <input
                      type="checkbox"
                      onChange={() => handleCompleteTask(task.id)}
                    />
                  )}
                  {task.completed && <span className="check-icon">✓</span>}
                </div>

                <div className="task-content">
                  <div className="task-title-row">
                    <span className="task-icon">{getTaskIcon(task.type)}</span>
                    <h3 className="task-title">{task.title}</h3>
                    <div
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(task.priority) }}
                    >
                      {getPriorityLabel(task.priority)}
                    </div>
                  </div>

                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}

                  <div className="task-meta">
                    {task.contact && (
                      <span className="meta-item">
                        👤 {task.contact.name}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className={`meta-item ${isOverdue(task) ? 'overdue-text' : ''}`}>
                        📅 {new Date(task.dueDate).toLocaleString('pl-PL')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="task-actions">
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nowe Zadanie</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Tytuł *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Typ zadania</label>
                <select
                  value={newTask.type}
                  onChange={(e) => setNewTask({...newTask, type: e.target.value})}
                >
                  <option value="todo">Do zrobienia</option>
                  <option value="call">Telefon</option>
                  <option value="email">Email</option>
                  <option value="meeting">Spotkanie</option>
                </select>
              </div>

              <div className="form-group">
                <label>Opis</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Kontakt</label>
                <select
                  value={newTask.contactId}
                  onChange={(e) => setNewTask({...newTask, contactId: e.target.value})}
                >
                  <option value="">Brak</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Termin</label>
                  <input
                    type="datetime-local"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Priorytet</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                  >
                    <option value="1">Wysoki</option>
                    <option value="2">Średni</option>
                    <option value="3">Niski</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn-primary">
                  Utwórz Zadanie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;
