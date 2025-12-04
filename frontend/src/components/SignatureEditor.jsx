import React, { useRef, useState, useEffect } from 'react';
import '../styles/EmailAccounts.css';

const SignatureEditor = ({ value, onChange }) => {
  const editorRef = useRef(null);
  const [mode, setMode] = useState('visual'); // 'visual' or 'html'
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');

  useEffect(() => {
    if (editorRef.current && mode === 'visual' && !editorRef.current.innerHTML) {
      // Ustaw content tylko jeśli edytor jest pusty (aby nie resetować kursora)
      editorRef.current.innerHTML = value || '';
    }
  }, [value, mode]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    updateSignature();
  };

  const updateSignature = () => {
    if (editorRef.current && mode === 'visual') {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    updateSignature();
  };

  const handleModeChange = (newMode) => {
    if (newMode === 'html') {
      // Switching to HTML mode - get current HTML
      const html = editorRef.current.innerHTML;
      setMode('html');
      onChange(html);
    } else {
      // Switching to visual mode
      setMode('visual');
      if (editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  };

  const handleHtmlChange = (e) => {
    onChange(e.target.value);
  };

  const insertLink = () => {
    const url = prompt('Wpisz URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const fonts = [
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  ];

  const fontSizes = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

  return (
    <div>
      <div className="signature-mode-toggle">
        <button
          type="button"
          className={`mode-btn ${mode === 'visual' ? 'active' : ''}`}
          onClick={() => handleModeChange('visual')}
        >
          👁️ Wizualny
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === 'html' ? 'active' : ''}`}
          onClick={() => handleModeChange('html')}
        >
          &lt;/&gt; HTML
        </button>
      </div>

      {mode === 'visual' ? (
        <div className="signature-editor-wrapper">
          <div className="signature-toolbar">
            <div className="signature-toolbar-group">
              <select
                className="toolbar-select"
                onChange={(e) => {
                  document.execCommand('fontName', false, e.target.value);
                  updateSignature();
                }}
                defaultValue=""
              >
                <option value="" disabled>Czcionka</option>
                {fonts.map(font => (
                  <option key={font.value} value={font.value}>{font.name}</option>
                ))}
              </select>

              <select
                className="toolbar-select"
                onChange={(e) => {
                  document.execCommand('fontSize', false, '7');
                  const fontElements = document.getElementsByTagName('font');
                  for (let i = 0; i < fontElements.length; i++) {
                    if (fontElements[i].size === '7') {
                      fontElements[i].removeAttribute('size');
                      fontElements[i].style.fontSize = e.target.value;
                    }
                  }
                  updateSignature();
                }}
                defaultValue=""
              >
                <option value="" disabled>Rozmiar</option>
                {fontSizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div className="signature-toolbar-group">
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => execCommand('bold')}
                title="Pogrubienie (Ctrl+B)"
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => execCommand('italic')}
                title="Kursywa (Ctrl+I)"
              >
                <em>I</em>
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => execCommand('underline')}
                title="Podkreślenie (Ctrl+U)"
              >
                <u>U</u>
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => execCommand('strikeThrough')}
                title="Przekreślenie"
              >
                <s>S</s>
              </button>
            </div>

            <div className="signature-toolbar-group">
              <div className="color-picker-wrapper">
                <button
                  type="button"
                  className="color-picker-button"
                  onClick={() => document.getElementById('textColorPicker').click()}
                  title="Kolor tekstu"
                >
                  <span className="color-preview" style={{ backgroundColor: textColor }}></span>
                  A
                </button>
                <input
                  id="textColorPicker"
                  type="color"
                  className="color-picker-input"
                  value={textColor}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    execCommand('foreColor', e.target.value);
                  }}
                />
              </div>

              <div className="color-picker-wrapper">
                <button
                  type="button"
                  className="color-picker-button"
                  onClick={() => document.getElementById('bgColorPicker').click()}
                  title="Kolor tła"
                >
                  <span className="color-preview" style={{ backgroundColor: bgColor }}></span>
                  🎨
                </button>
                <input
                  id="bgColorPicker"
                  type="color"
                  className="color-picker-input"
                  value={bgColor}
                  onChange={(e) => {
                    setBgColor(e.target.value);
                    execCommand('backColor', e.target.value);
                  }}
                />
              </div>
            </div>

            <div className="signature-toolbar-group">
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => execCommand('justifyLeft')}
                title="Wyrównaj do lewej"
              >
                ≡
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => execCommand('justifyCenter')}
                title="Wyrównaj do środka"
              >
                ≣
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => execCommand('justifyRight')}
                title="Wyrównaj do prawej"
              >
                ≢
              </button>
            </div>

            <div className="signature-toolbar-group">
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => execCommand('insertUnorderedList')}
                title="Lista punktowana"
              >
                •
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => execCommand('insertOrderedList')}
                title="Lista numerowana"
              >
                1.
              </button>
            </div>

            <div className="signature-toolbar-group">
              <button
                type="button"
                className="toolbar-btn"
                onClick={insertLink}
                title="Wstaw link"
              >
                🔗
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => execCommand('removeFormat')}
                title="Usuń formatowanie"
              >
                ✖️
              </button>
            </div>
          </div>

          <div
            ref={editorRef}
            className="signature-editor"
            contentEditable
            onInput={handleInput}
            onBlur={updateSignature}
            suppressContentEditableWarning
          />
        </div>
      ) : (
        <div>
          <textarea
            value={value || ''}
            onChange={handleHtmlChange}
            rows="15"
            style={{
              width: '100%',
              padding: '1rem',
              fontFamily: 'monospace',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
            }}
            placeholder="Wpisz HTML swojej stopki..."
          />
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#374151' }}>
              Podgląd:
            </h4>
            <div
              className="signature-preview"
              dangerouslySetInnerHTML={{ __html: value || '' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureEditor;
