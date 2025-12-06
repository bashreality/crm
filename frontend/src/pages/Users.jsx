import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, UserPlus, Edit2, Trash2, Shield, User } from 'lucide-react';
import api from '../services/api';
import '../styles/Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'USER',
    active: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Błąd podczas pobierania użytkowników');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // Update existing user
        await api.put(`/users/${editingUser.id}`, formData);
        alert('Użytkownik zaktualizowany');
      } else {
        // Create new user
        if (!formData.password) {
          alert('Hasło jest wymagane dla nowego użytkownika');
          return;
        }
        await api.post('/users', formData);
        alert('Użytkownik utworzony');
      }

      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Błąd podczas zapisywania użytkownika');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Never prefill password
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || 'USER',
      active: user.active !== undefined ? user.active : true
    });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tego użytkownika?')) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      alert('Użytkownik usunięty');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Błąd podczas usuwania użytkownika');
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      email: '',
      firstName: '',
      lastName: '',
      role: 'USER',
      active: true
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  if (loading) {
    return <div className="loading">Ładowanie użytkowników...</div>;
  }

  return (
    <div className="users-container">
      <div className="users-header">
        <div className="users-header-content">
          <div className="users-header-icon">
            <UsersIcon size={32} />
          </div>
          <div>
            <h1>Zarządzanie użytkownikami</h1>
            <p>Dodawaj, edytuj i zarządzaj kontami użytkowników systemu</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={18} />
          Dodaj użytkownika
        </button>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Login</th>
              <th>Email</th>
              <th>Imię i nazwisko</th>
              <th>Rola</th>
              <th>Status</th>
              <th>Utworzono</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email || '-'}</td>
                <td>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || '-'}</td>
                <td>
                  <span className={`role-badge role-${user.role?.toLowerCase()}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${user.active ? 'active' : 'inactive'}`}>
                    {user.active ? 'Aktywny' : 'Nieaktywny'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString('pl-PL')}</td>
                <td className="actions">
                  <button className="btn-action btn-action-edit" onClick={() => handleEdit(user)} title="Edytuj">
                    <Edit2 size={16} />
                  </button>
                  <button className="btn-action btn-action-delete" onClick={() => handleDelete(user.id)} title="Usuń">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? 'Edytuj użytkownika' : 'Dodaj użytkownika'}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Login *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  disabled={editingUser !== null}
                />
              </div>

              <div className="form-group">
                <label>Hasło {!editingUser && '*'}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingUser}
                  placeholder={editingUser ? 'Pozostaw puste aby nie zmieniać' : ''}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Imię</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Nazwisko</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Rola</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                    />
                    <span>Aktywny</span>
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                  Anuluj
                </button>
                <button type="submit" className="btn-save">
                  {editingUser ? 'Zapisz zmiany' : 'Dodaj użytkownika'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
