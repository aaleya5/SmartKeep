import { useState } from 'react';
import { contentAPI } from '../services/api';

const AddContentView = ({ onAddSuccess, onError, isLoading: externalLoading }) => {
  const [urlInput, setUrlInput] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const isLoading = externalLoading || localLoading;

  const handleURLSubmit = async (e) => {
    e.preventDefault();
    setLocalLoading(true);
    try {
      await contentAPI.createFromURL(urlInput);
      onAddSuccess('Document saved! AI enrichment will complete shortly.');
      setUrlInput('');
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) {
        onAddSuccess('This URL is already in your library — showing library.');
      } else {
        const detail = err.response?.data?.detail;
        const message = typeof detail === 'string' ? detail : (detail?.message || err.message);
        onError(message || 'Failed to fetch URL content');
      }
    } finally {
      setLocalLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLocalLoading(true);
    try {
      await contentAPI.createManual(manualTitle, manualContent);
      onAddSuccess('Document saved! AI enrichment will complete shortly.');
      setManualTitle('');
      setManualContent('');
    } catch (err) {
      const detail = err.response?.data?.detail;
      onError(detail || err.message || 'Failed to create document');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="add-content-view">
      <h2 style={{ borderBottom: '4px solid', paddingBottom: '1rem', marginBottom: '2rem', fontSize: '2.5rem' }}>INGEST CONTENT</h2>
      
      <div className="add-options">
        <div className="add-option config-panel">
          <h3 style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>/// OUTBOUND FETCH</h3>
          <form onSubmit={handleURLSubmit}>
            <div className="form-group">
              <label htmlFor="url">TARGET_URL:</label>
              <input
                type="url"
                id="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                required
                disabled={isLoading}
                style={{ fontFamily: 'monospace', padding: '1.5rem', fontSize: '1.25rem' }}
              />
            </div>
            <button type="submit" className="btn primary" disabled={isLoading} style={{ width: '100%', padding: '1.5rem', fontSize: '1.25rem' }}>
              {isLoading ? <><span className="spinner-small"></span> EXECUTING...</> : 'INITIATE EXTRACTION'}
            </button>
          </form>
          <p className="form-hint" style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--text-color)', color: 'var(--bg-color)', fontWeight: 'bold' }}>
            &gt; Content will be pushed to the enrichment pipeline automatically.
          </p>
        </div>

        <div className="divider" style={{ opacity: 0 }}></div>

        <div className="add-option config-panel">
          <h3 style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>/// DIRECT INPUT</h3>
          <form onSubmit={handleManualSubmit}>
            <div className="form-group">
              <label htmlFor="title">SYS.TITLE:</label>
              <input
                type="text"
                id="title"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="IDENTIFIER..."
                required
                disabled={isLoading}
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="content">RAW.PAYLOAD:</label>
              <textarea
                id="content"
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="CONTENT_BLOB..."
                rows={8}
                required
                disabled={isLoading}
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <button type="submit" className="btn primary" disabled={isLoading} style={{ width: '100%' }}>
              {isLoading ? <><span className="spinner-small"></span> COMMITTING...</> : 'COMMIT_RECORD'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddContentView;
