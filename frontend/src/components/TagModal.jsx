import React, { useState, useEffect } from 'react';
import { tagsApi } from '../services/api';
import toast from 'react-hot-toast';
import '../styles/TagModal.css';

const TagModal = ({ isOpen, onClose, contact, onTagAdded }) => {
  const [tags, setTags] = useState([]);
  const [selectedTagId, setSelectedTagId] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  const fetchTags = async () => {
    try {
      const response = await tagsApi.getAll();
      setTags(response.data);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Błąd pobierania tagów');
    }
  };

  const handleAddTag = async () => {
    if (!selectedTagId) {
      toast.error('Wybierz tag');
      return;
    }

    setLoading(true);
    try {
      await tagsApi.addToContact(contact.id, selectedTagId);
      toast.success('Tag dodany!');
      if (onTagAdded) onTagAdded();
      onClose();
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Błąd dodawania tagu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Podaj nazwę tagu');
      return;
    }

    setLoading(true);
    try {
      const response = await tagsApi.create({
        name: newTagName,
        color: newTagColor
      });
      toast.success('Tag utworzony!');
      setTags([...tags, response.data]);
      setNewTagName('');
      setNewTagColor('#3b82f6');
      setShowCreateTag(false);
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error(error.response?.data?.message || 'Błąd tworzenia tagu');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tagId) => {
    setLoading(true);
    try {
      await tagsApi.removeFromContact(contact.id, tagId);
      toast.success('Tag usunięty');
      if (onTagAdded) onTagAdded();
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Błąd usuwania tagu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const contactTags = contact?.tags || [];

  return (
    <div className="tag-modal-overlay" onClick={onClose}>
      <div className="tag-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tag-modal-header">
          <h2>Zarządzaj tagami</h2>
          <p>{contact?.name}</p>
          <button className="tag-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="tag-modal-body">
          {/* Obecne tagi kontaktu */}
          {contactTags.length > 0 && (
            <div className="tag-section">
              <h3>Obecne tagi</h3>
              <div className="tags-list">
                {contactTags.map(tag => (
                  <div key={tag.id} className="tag-chip" style={{ backgroundColor: tag.color }}>
                    <span>{tag.name}</span>
                    <button
                      className="tag-remove-btn"
                      onClick={() => handleRemoveTag(tag.id)}
                      disabled={loading}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dodaj istniejący tag */}
          <div className="tag-section">
            <h3>Dodaj tag</h3>
            <div className="tag-add-form">
              <select
                value={selectedTagId}
                onChange={(e) => setSelectedTagId(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Wybierz tag --</option>
                {tags
                  .filter(tag => !contactTags.some(ct => ct.id === tag.id))
                  .map(tag => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
              </select>
              <button
                className="btn btn-primary"
                onClick={handleAddTag}
                disabled={loading || !selectedTagId}
              >
                Dodaj
              </button>
            </div>
          </div>

          {/* Utwórz nowy tag */}
          <div className="tag-section">
            {!showCreateTag ? (
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreateTag(true)}
              >
                + Utwórz nowy tag
              </button>
            ) : (
              <div className="tag-create-form">
                <h3>Nowy tag</h3>
                <input
                  type="text"
                  placeholder="Nazwa tagu"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  disabled={loading}
                />
                <div className="color-picker-row">
                  <label>Kolor:</label>
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="tag-create-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowCreateTag(false)}
                    disabled={loading}
                  >
                    Anuluj
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreateTag}
                    disabled={loading}
                  >
                    Utwórz
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagModal;
