import React, { useEffect, useState, useMemo } from 'react';
import { analyticsApi } from '../services/api';
import { BarChart3, Target, Zap, Mail, Eye, Reply, TrendingUp, RefreshCw, Activity } from 'lucide-react';
import '../styles/SequenceAnalytics.css';

const SequenceAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSequence, setSelectedSequence] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await analyticsApi.getGlobalSequenceAnalytics();
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRate = (rate) => {
    if (!rate && rate !== 0) return '0%';
    return `${rate.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="analytics-shell">
        <div className="analytics-container">
          <div className="analytics-header">
            <div className="analytics-header-content">
              <div className="analytics-header-icon">
                <BarChart3 size={32} />
              </div>
              <div>
                <h1>Analityka Sekwencji</h1>
                <p>Szczegółowe statystyki wydajności twoich kampanii email</p>
              </div>
            </div>
          </div>
          <div className="loading">
            <div className="analytics-spinner"></div>
            <span>Ładowanie analityki...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-shell">
        <div className="analytics-container">
          <div className="analytics-header">
            <div className="analytics-header-content">
              <div className="analytics-header-icon">
                <BarChart3 size={32} />
              </div>
              <div>
                <h1>Analityka Sekwencji</h1>
                <p>Szczegółowe statystyki wydajności twoich kampanii email</p>
              </div>
            </div>
          </div>
          <div className="error">Nie udało się załadować analityki</div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-shell">
      <div className="analytics-container">
        <div className="analytics-header">
          <div className="analytics-header-content">
            <div className="analytics-header-icon">
              <BarChart3 size={32} />
            </div>
            <div>
              <h1>Analityka Sekwencji</h1>
              <p>Szczegółowe statystyki wydajności twoich kampanii email</p>
            </div>
          </div>
          <div className="analytics-header-actions">
            <button className="btn btn-secondary" onClick={loadAnalytics}>
              <RefreshCw size={18} />
              Odśwież
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="analytics-stats-grid">
          <div className="analytics-stat-card">
            <div className="analytics-stat-icon sequences">
              <Target size={24} />
            </div>
            <div className="analytics-stat-content">
              <div className="analytics-stat-number">{analytics.activeSequences}</div>
              <div className="analytics-stat-label">Aktywne Sekwencje</div>
              <div className="analytics-stat-sub">z {analytics.totalSequences} wszystkich</div>
            </div>
          </div>

          <div className="analytics-stat-card">
            <div className="analytics-stat-icon executions">
              <Zap size={24} />
            </div>
            <div className="analytics-stat-content">
              <div className="analytics-stat-number">{analytics.activeExecutions}</div>
              <div className="analytics-stat-label">Aktywne Wykonania</div>
              <div className="analytics-stat-sub">z {analytics.totalExecutions} wszystkich</div>
            </div>
          </div>

          <div className="analytics-stat-card">
            <div className="analytics-stat-icon emails">
              <Mail size={24} />
            </div>
            <div className="analytics-stat-content">
              <div className="analytics-stat-number">{analytics.totalEmailsSent}</div>
              <div className="analytics-stat-label">Wysłane Emaile</div>
              <div className="analytics-stat-sub">{analytics.totalEmailsPending} oczekujących</div>
            </div>
          </div>

          <div className="analytics-stat-card highlight">
            <div className="analytics-stat-icon open-rate">
              <Eye size={24} />
            </div>
            <div className="analytics-stat-content">
              <div className="analytics-stat-number">{formatRate(analytics.overallOpenRate)}</div>
              <div className="analytics-stat-label">Open Rate</div>
              <div className="analytics-stat-sub">{analytics.emailsOpened} otwarć</div>
            </div>
          </div>

          <div className="analytics-stat-card highlight">
            <div className="analytics-stat-icon reply-rate">
              <Reply size={24} />
            </div>
            <div className="analytics-stat-content">
              <div className="analytics-stat-number">{formatRate(analytics.overallReplyRate)}</div>
              <div className="analytics-stat-label">Reply Rate</div>
              <div className="analytics-stat-sub">Odpowiedzi kontaktów</div>
            </div>
          </div>
        </div>

      {/* Sequence Breakdown */}
      <div className="analytics-breakdown">
        <h2>Breakdown po Sekwencjach</h2>

        {analytics.sequenceBreakdown && analytics.sequenceBreakdown.length > 0 ? (
          <div className="breakdown-grid">
            {analytics.sequenceBreakdown.map((seq) => (
              <div
                key={seq.sequenceId}
                className="breakdown-card"
                onClick={() => setSelectedSequence(seq)}
              >
                <div className="breakdown-header">
                  <h3>{seq.sequenceName}</h3>
                  <span className="sequence-badge">ID: {seq.sequenceId}</span>
                </div>

                <div className="breakdown-metrics">
                  <div className="metric-row">
                    <span className="metric-label">Wykonania:</span>
                    <span className="metric-value">{seq.totalExecutions}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Aktywne:</span>
                    <span className="metric-value active">{seq.activeExecutions}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Ukończone:</span>
                    <span className="metric-value">{seq.completedExecutions}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Odpowiedzi:</span>
                    <span className="metric-value replied">{seq.repliedExecutions}</span>
                  </div>
                </div>

                <div className="breakdown-stats">
                  <div className="stat-item">
                    <div className="stat-label">Open Rate</div>
                    <div className="stat-bar">
                      <div
                        className="stat-fill open-rate"
                        style={{ width: `${Math.min(seq.openRate || 0, 100)}%` }}
                      ></div>
                    </div>
                    <div className="stat-value">{formatRate(seq.openRate)}</div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-label">Reply Rate</div>
                    <div className="stat-bar">
                      <div
                        className="stat-fill reply-rate"
                        style={{ width: `${Math.min(seq.replyRate || 0, 100)}%` }}
                      ></div>
                    </div>
                    <div className="stat-value">{formatRate(seq.replyRate)}</div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-label">Completion Rate</div>
                    <div className="stat-bar">
                      <div
                        className="stat-fill completion-rate"
                        style={{ width: `${Math.min(seq.completionRate || 0, 100)}%` }}
                      ></div>
                    </div>
                    <div className="stat-value">{formatRate(seq.completionRate)}</div>
                  </div>
                </div>

                <div className="breakdown-footer">
                  <span>📨 {seq.totalEmailsSent} wysłanych</span>
                  <span>👁️ {seq.emailsOpened} otwarć</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            Brak danych analitycznych. Utwórz i uruchom sekwencje aby zobaczyć statystyki.
          </div>
        )}
      </div>

      {/* Detailed Sequence View */}
      {selectedSequence && (
        <div className="modal-overlay" onClick={() => setSelectedSequence(null)}>
          <div className="sequence-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedSequence.sequenceName}</h2>
              <button onClick={() => setSelectedSequence(null)}>✕</button>
            </div>

            <div className="modal-content">
              <div className="detail-grid">
                <div className="detail-card">
                  <h4>Wykonania</h4>
                  <div className="detail-stats">
                    <div><span>Wszystkie:</span> {selectedSequence.totalExecutions}</div>
                    <div><span>Aktywne:</span> {selectedSequence.activeExecutions}</div>
                    <div><span>Ukończone:</span> {selectedSequence.completedExecutions}</div>
                    <div><span>Odpowiedzi:</span> {selectedSequence.repliedExecutions}</div>
                    <div><span>Pauza:</span> {selectedSequence.pausedExecutions}</div>
                    <div><span>Błędy:</span> {selectedSequence.failedExecutions}</div>
                  </div>
                </div>

                <div className="detail-card">
                  <h4>Emaile</h4>
                  <div className="detail-stats">
                    <div><span>Wysłane:</span> {selectedSequence.totalEmailsSent}</div>
                    <div><span>Oczekujące:</span> {selectedSequence.totalEmailsPending}</div>
                    <div><span>Błędy:</span> {selectedSequence.totalEmailsFailed}</div>
                    <div><span>Anulowane:</span> {selectedSequence.totalEmailsCancelled}</div>
                  </div>
                </div>

                <div className="detail-card">
                  <h4>Zaangażowanie</h4>
                  <div className="detail-stats">
                    <div><span>Otwarcia:</span> {selectedSequence.emailsOpened}</div>
                    <div><span>Open Rate:</span> {formatRate(selectedSequence.openRate)}</div>
                    <div><span>Reply Rate:</span> {formatRate(selectedSequence.replyRate)}</div>
                    <div><span>Completion Rate:</span> {formatRate(selectedSequence.completionRate)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SequenceAnalytics;
