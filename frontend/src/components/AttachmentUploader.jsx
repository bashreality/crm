import React, { useState, useRef, useCallback } from 'react';
import { attachmentsApi } from '../services/api';

const AttachmentUploader = ({ attachments = [], onChange, maxSize = 25, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const maxSizeBytes = maxSize * 1024 * 1024;

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (contentType) => {
    if (contentType?.startsWith('image/')) return '🖼️';
    if (contentType?.includes('pdf')) return '📄';
    if (contentType?.includes('word') || contentType?.includes('document')) return '📝';
    if (contentType?.includes('excel') || contentType?.includes('spreadsheet')) return '📊';
    if (contentType?.includes('powerpoint') || contentType?.includes('presentation')) return '📑';
    if (contentType?.includes('zip') || contentType?.includes('rar') || contentType?.includes('archive')) return '📦';
    return '📎';
  };

  const handleFiles = useCallback(async (files) => {
    if (disabled || uploading) return;
    
    setError(null);
    const validFiles = [];
    
    for (const file of files) {
      if (file.size > maxSizeBytes) {
        setError(`Plik "${file.name}" jest za duży (max ${maxSize}MB)`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    const newAttachments = [...attachments];

    try {
      for (const file of validFiles) {
        const response = await attachmentsApi.upload(file);
        newAttachments.push(response.data);
      }
      onChange(newAttachments);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Błąd podczas przesyłania pliku');
    } finally {
      setUploading(false);
    }
  }, [attachments, onChange, disabled, uploading, maxSizeBytes, maxSize]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  }, [disabled, uploading]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled || uploading) return;
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [disabled, uploading, handleFiles]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
    e.target.value = '';
  };

  const handleRemove = async (attachmentId) => {
    if (disabled) return;
    
    try {
      await attachmentsApi.delete(attachmentId);
      const newAttachments = attachments.filter(a => a.id !== attachmentId);
      onChange(newAttachments);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Błąd podczas usuwania załącznika');
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      {/* Upload area */}
      <div
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? '#3b82f6' : '#d1d5db'}`,
          borderRadius: '12px',
          padding: '1.25rem',
          textAlign: 'center',
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          backgroundColor: isDragging ? '#eff6ff' : (disabled ? '#f9fafb' : '#fafbfc'),
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.6 : 1
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled || uploading}
        />
        
        {uploading ? (
          <div style={{ color: '#6b7280' }}>
            <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }}>⏳</span>
            <span>Przesyłanie...</span>
          </div>
        ) : (
          <div style={{ color: '#6b7280' }}>
            <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }}>📎</span>
            <span style={{ fontWeight: '500' }}>
              Przeciągnij pliki lub <span style={{ color: '#3b82f6', textDecoration: 'underline' }}>kliknij aby wybrać</span>
            </span>
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#9ca3af' }}>
              Maksymalny rozmiar: {maxSize}MB
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.625rem 0.875rem',
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          borderRadius: '8px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#64748b',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Załączniki ({attachments.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.875rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>
                    {getFileIcon(attachment.contentType)}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#334155',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {attachment.originalName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {formatFileSize(attachment.size)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(attachment.id);
                  }}
                  disabled={disabled}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    padding: '0.375rem',
                    borderRadius: '6px',
                    color: '#94a3b8',
                    transition: 'all 0.15s ease',
                    opacity: disabled ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.backgroundColor = '#fee2e2';
                      e.currentTarget.style.color = '#dc2626';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                  title="Usuń załącznik"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;

