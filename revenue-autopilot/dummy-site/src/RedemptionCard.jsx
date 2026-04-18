import { useState, useEffect } from 'react';

export default function RedemptionCard({ payload, onComplete, onDismiss, onClarify }) {
  const [localState, setLocalState] = useState('loading');

  useEffect(() => {
    if (!payload || payload === 'loading') {
      setLocalState('loading');
      return;
    }
    if (payload.clarify) {
      setLocalState('clarify');
    } else if (payload.ctaAction === 'offer') {
      setLocalState('offer');
    } else {
      setLocalState('ready');
    }
  }, [payload]);

  function handleClarify(answer) {
    setLocalState('loading');
    onClarify(answer);
  }

  function handleComplete() {
    setLocalState('success');
    setTimeout(onComplete, 1400);
  }

  const cachedData = payload?.cachedData || {};
  const name = cachedData.firstName || 'traveler';

  if (localState === 'loading') {
    return (
      <div className="concierge-overlay" onClick={onDismiss}>
        <div className="redemption-card" onClick={e => e.stopPropagation()}>
          <div className="card-icon">✈</div>
          <div className="card-loading-pulse">
            <span className="pulse-dot" />
            Concierge is reading your session…
          </div>
        </div>
      </div>
    );
  }

  if (localState === 'success') {
    const finalPrice = payload?.offer?.incentive?.finalPrice;
    return (
      <div className="concierge-overlay">
        <div className="redemption-card">
          <div className="card-success-icon">✓</div>
          <h2 className="card-title">You're all set, {name}.</h2>
          <p className="card-message">
            {finalPrice
              ? `$${finalPrice.toLocaleString()} locked in. See you at the gate.`
              : 'Your seat is secured. See you at the gate.'}
          </p>
        </div>
      </div>
    );
  }

  if (localState === 'clarify') {
    return (
      <div className="concierge-overlay" onClick={onDismiss}>
        <div className="redemption-card" onClick={e => e.stopPropagation()}>
          <div className="card-icon">✈</div>
          <h2 className="card-title">{payload.clarify}</h2>
          <p className="card-message">I can help — just let me know what's holding you back.</p>
          <div className="clarify-buttons">
            <button className="clarify-btn clarify-yes" onClick={() => handleClarify('price')}>
              Yes, the price
            </button>
            <button className="clarify-btn clarify-no" onClick={() => handleClarify('other')}>
              Something else
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (localState === 'offer') {
    const { offer } = payload;
    return (
      <div className="concierge-overlay" onClick={onDismiss}>
        <div className="redemption-card offer-card" onClick={e => e.stopPropagation()}>
          <div className="card-icon">✈</div>
          <h2 className="card-title">{payload.headline}</h2>
          <p className="card-message">{payload.message}</p>

          <div className="competitor-table">
            {offer.competitors.map(c => (
              <div key={c.airline} className={`competitor-row${c.highlight ? ' competitor-highlight' : ''}`}>
                <span className="competitor-airline">{c.airline}</span>
                <span className="competitor-note">{c.note}</span>
                <span className="competitor-price">${c.price.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="incentive-badge">
            🏷 <strong>{offer.incentive.code}</strong> applied —{' '}
            <strong className="incentive-final">${offer.incentive.finalPrice.toLocaleString()}</strong> total
          </div>

          <button className="card-cta" onClick={handleComplete}>
            {payload.ctaLabel}
          </button>
          <button className="card-dismiss" onClick={onDismiss}>
            No thanks, I'll pay full price
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="concierge-overlay" onClick={onDismiss}>
      <div className="redemption-card" onClick={e => e.stopPropagation()}>
        <div className="card-icon">✈</div>
        <h2 className="card-title">{payload.headline}</h2>
        <p className="card-message">{payload.message}</p>

        <div className="card-ghost-data">
          {cachedData.firstName && (
            <span className="ghost-tag">👤 {cachedData.firstName} {cachedData.lastName}</span>
          )}
          {cachedData.seat  && <span className="ghost-tag">💺 Seat {cachedData.seat}</span>}
          {cachedData.email && <span className="ghost-tag">✉ {cachedData.email}</span>}
        </div>

        <button className="card-cta" onClick={handleComplete}>
          {payload.ctaLabel}
        </button>
        <button className="card-dismiss" onClick={onDismiss}>
          No thanks, I'll start over
        </button>
      </div>
    </div>
  );
}
