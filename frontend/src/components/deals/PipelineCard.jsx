import React from 'react';
import { Target, DollarSign, TrendingUp, ArrowRight, Star } from 'lucide-react';

const PipelineCard = ({ pipeline, deals = [], onClick, isDefault = false }) => {
  // Oblicz statystyki dla tego lejka
  const pipelineDeals = deals.filter(d => d.pipeline?.id === pipeline.id || !d.pipeline);
  const totalValue = pipelineDeals.reduce((sum, deal) => {
    const value = parseFloat(deal.value) || 0;
    return sum + value;
  }, 0);
  const totalDeals = pipelineDeals.length;
  
  // Oblicz postęp (średnie prawdopodobieństwo)
  const avgProbability = pipelineDeals.length > 0
    ? pipelineDeals.reduce((sum, deal) => {
        const prob = deal.stage?.probability || 0;
        return sum + prob;
      }, 0) / pipelineDeals.length
    : 0;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div
      className="pipeline-card"
      onClick={onClick}
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '24px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.borderColor = 'var(--color-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
      }}
    >
      {/* Default Badge */}
      {isDefault && (
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          color: 'white',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)'
        }}>
          <Star size={12} />
          Domyślny
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <Target size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--color-text-main)',
                lineHeight: 1.2
              }}>
                {pipeline.name}
              </h3>
              <p style={{
                margin: '4px 0 0',
                fontSize: '13px',
                color: 'var(--color-text-secondary)'
              }}>
                {pipeline.stages?.length || 0} etapów
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'var(--color-bg-main)',
          borderRadius: '12px',
          padding: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px'
          }}>
            <DollarSign size={16} style={{ color: 'var(--color-primary)' }} />
            <span style={{
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Wartość
            </span>
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            color: 'var(--color-text-main)'
          }}>
            {formatCurrency(totalValue)}
          </div>
        </div>

        <div style={{
          background: 'var(--color-bg-main)',
          borderRadius: '12px',
          padding: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px'
          }}>
            <Target size={16} style={{ color: '#3b82f6' }} />
            <span style={{
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Szanse
            </span>
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            color: 'var(--color-text-main)'
          }}>
            {totalDeals}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--color-text-secondary)'
          }}>
            Średnie prawdopodobieństwo
          </span>
          <span style={{
            fontSize: '14px',
            fontWeight: '700',
            color: 'var(--color-primary)'
          }}>
            {Math.round(avgProbability)}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          background: 'var(--color-bg-main)',
          borderRadius: '4px',
          overflow: 'hidden',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{
            width: `${avgProbability}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--color-primary) 0%, #059669 100%)',
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '16px',
        borderTop: '1px solid var(--color-border)'
      }}>
        <span style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)'
        }}>
          Kliknij aby otworzyć
        </span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--color-primary)',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          <span>Otwórz</span>
          <ArrowRight size={16} />
        </div>
      </div>
    </div>
  );
};

export default PipelineCard;

