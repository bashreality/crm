import React, { useRef, useState, useEffect } from 'react';
import './RichTextEditor.css';

const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = 'Wpisz treść...', 
  minHeight = '200px',
  disabled = false 
}) => {
  const editorRef = useRef(null);
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  const execCommand = (command, val = null) => {
    if (disabled) return;
    document.execCommand(command, false, val);
    updateContent();
    editorRef.current?.focus();
  };

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    updateContent();
  };

  const fonts = [
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif' },
    { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
    { name: 'Segoe UI', value: 'Segoe UI, sans-serif' },
  ];

  const fontSizes = [
    { label: '10px', value: '1' },
    { label: '12px', value: '2' },
    { label: '14px', value: '3' },
    { label: '16px', value: '4' },
    { label: '18px', value: '5' },
    { label: '24px', value: '6' },
    { label: '32px', value: '7' },
  ];

  const handleFontChange = (e) => {
    if (disabled) return;
    const font = e.target.value;
    if (font) {
      document.execCommand('fontName', false, font);
      updateContent();
    }
  };

  const handleFontSizeChange = (e) => {
    if (disabled) return;
    const size = e.target.value;
    if (size) {
      document.execCommand('fontSize', false, size);
      updateContent();
    }
  };

  const handleColorChange = (color, isBackground = false) => {
    if (disabled) return;
    if (isBackground) {
      setBgColor(color);
      execCommand('backColor', color);
    } else {
      setTextColor(color);
      execCommand('foreColor', color);
    }
  };

  const insertLink = () => {
    if (disabled) return;
    const url = prompt('Wpisz URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  return (
    <div className={`rich-editor-container ${disabled ? 'disabled' : ''}`}>
      {/* Toolbar */}
      <div className="rich-editor-toolbar">
        {/* Font & Size */}
        <div className="toolbar-group">
          <select 
            className="toolbar-select"
            onChange={handleFontChange}
            defaultValue=""
            disabled={disabled}
            title="Czcionka"
          >
            <option value="" disabled>Czcionka</option>
            {fonts.map(font => (
              <option key={font.value} value={font.value}>{font.name}</option>
            ))}
          </select>

          <select 
            className="toolbar-select toolbar-select-small"
            onChange={handleFontSizeChange}
            defaultValue=""
            disabled={disabled}
            title="Rozmiar"
          >
            <option value="" disabled>Rozmiar</option>
            {fontSizes.map(size => (
              <option key={size.value} value={size.value}>{size.label}</option>
            ))}
          </select>
        </div>

        {/* Text formatting */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('bold')}
            disabled={disabled}
            title="Pogrubienie (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('italic')}
            disabled={disabled}
            title="Kursywa (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('underline')}
            disabled={disabled}
            title="Podkreślenie (Ctrl+U)"
          >
            <u>U</u>
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('strikeThrough')}
            disabled={disabled}
            title="Przekreślenie"
          >
            <s>S</s>
          </button>
        </div>

        {/* Colors */}
        <div className="toolbar-group">
          <div className="color-picker-wrapper">
            <button
              type="button"
              className="toolbar-btn color-btn"
              onClick={() => document.getElementById('rte-text-color').click()}
              disabled={disabled}
              title="Kolor tekstu"
            >
              <span className="color-indicator" style={{ backgroundColor: textColor }}></span>
              A
            </button>
            <input
              id="rte-text-color"
              type="color"
              className="color-input"
              value={textColor}
              onChange={(e) => handleColorChange(e.target.value, false)}
              disabled={disabled}
            />
          </div>

          <div className="color-picker-wrapper">
            <button
              type="button"
              className="toolbar-btn color-btn"
              onClick={() => document.getElementById('rte-bg-color').click()}
              disabled={disabled}
              title="Kolor tła"
            >
              <span className="color-indicator" style={{ backgroundColor: bgColor }}></span>
              🎨
            </button>
            <input
              id="rte-bg-color"
              type="color"
              className="color-input"
              value={bgColor}
              onChange={(e) => handleColorChange(e.target.value, true)}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Alignment */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('justifyLeft')}
            disabled={disabled}
            title="Wyrównaj do lewej"
          >
            ≡
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('justifyCenter')}
            disabled={disabled}
            title="Wyśrodkuj"
          >
            ≣
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('justifyRight')}
            disabled={disabled}
            title="Wyrównaj do prawej"
          >
            ≢
          </button>
        </div>

        {/* Lists */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('insertUnorderedList')}
            disabled={disabled}
            title="Lista punktowana"
          >
            •
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('insertOrderedList')}
            disabled={disabled}
            title="Lista numerowana"
          >
            1.
          </button>
        </div>

        {/* Other */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={insertLink}
            disabled={disabled}
            title="Wstaw link"
          >
            🔗
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('removeFormat')}
            disabled={disabled}
            title="Usuń formatowanie"
          >
            ✖️
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        className="rich-editor-content"
        contentEditable={!disabled}
        onInput={handleInput}
        onBlur={updateContent}
        style={{ minHeight }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
};

export default RichTextEditor;

