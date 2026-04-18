import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import SearchStep from './steps/SearchStep';
import DetailsStep from './steps/DetailsStep';
import SeatStep from './steps/SeatStep';
import PaymentStep from './steps/PaymentStep';
import RedemptionCard from './RedemptionCard';
import {
  initConcierge,
  checkFriction,
  reportTransaction,
  sendClarifyResponse,
  startDwellTimer,
  clearDwellTimer,
} from './concierge';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchData,  setSearchData]  = useState({});
  const [detailsData, setDetailsData] = useState({});
  const [seatData,    setSeatData]    = useState({});
  const [cardPayload, setCardPayload] = useState(null);
  const [completed,   setCompleted]   = useState(false);
  const [stateLost,   setStateLost]   = useState(false);

  useEffect(() => {
    initConcierge((p) => setCardPayload(p));
  }, []);

  useEffect(() => {
    if (location.pathname === '/seat') {
      startDwellTimer('seat', 20000);
    } else if (location.pathname === '/payment') {
      startDwellTimer('payment', 12000);
    } else {
      clearDwellTimer();
    }
  }, [location.pathname]);

  const handleSearchNext  = (data) => { setSearchData(data);  setStateLost(false); navigate('/details'); };
  const handleDetailsNext = (data) => { setDetailsData(data); setStateLost(false); navigate('/seat'); };
  const handleDetailsBack = ()     => { setStateLost(false); navigate('/'); };

  const handleSeatNext = (data) => { setSeatData(data); navigate('/payment'); };
  const handleSeatBack = () => {
    setDetailsData({});
    setStateLost(true);
    checkFriction((p) => setCardPayload(p));
    navigate('/details');
  };

  const handlePaymentBack = () => {
    setSeatData({});
    navigate('/seat');
  };

  const handleClarify = (answer) => {
    const { frictionType, cachedData } = cardPayload;
    sendClarifyResponse(answer, frictionType, cachedData);
  };

  const handleComplete = () => {
    const savedAmount = cardPayload?.offer?.incentive?.finalPrice ?? 1200;
    reportTransaction(savedAmount);
    setCardPayload(null);
    setCompleted(true);
    setTimeout(() => {
      setCompleted(false);
      setSearchData({});
      setDetailsData({});
      setSeatData({});
      setStateLost(false);
      navigate('/');
    }, 3000);
  };

  const cachedSeat = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('concierge_cache') || '{}').seat || null;
    } catch { return null; }
  })();

  if (completed) {
    return (
      <>
        <nav className="nav">
          <div className="nav-logo"><span className="nav-logo-mark">✈</span> AeroBook</div>
        </nav>
        <div className="success-screen">
          <div className="success-icon">✓</div>
          <h2 className="success-title">Booking Confirmed!</h2>
          <p className="success-sub">
            Your seat is secured. Check your email for the itinerary. Thank you for flying with AeroBook.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-logo">
          <span className="nav-logo-mark">✈</span> AeroBook
        </div>
        <div className="nav-links">
          <span className="nav-link">Flights</span>
          <span className="nav-link">Hotels</span>
          <span className="nav-link">Deals</span>
          <span className="nav-link">Help</span>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={
          <>
            <div className="hero">
              <img src="/flight.png" className="hero-plane" alt="" aria-hidden="true" />
              <p className="hero-eyebrow">White Glove Travel</p>
              <h1 className="hero-title">Fly the way you deserve.</h1>
              <p className="hero-sub">Premium routes. Transparent pricing. Zero friction.</p>
              <div className="hero-ctas">
                <button className="btn-pill btn-pill-filled">Book a Flight</button>
                <button className="btn-pill btn-pill-outline-dark">Explore Deals ›</button>
              </div>
            </div>
            <div className="booking-section">
              <SearchStep onNext={handleSearchNext} />
            </div>
          </>
        } />

        <Route path="/details" element={
          <div className="booking-section">
            <DetailsStep
              initialData={detailsData}
              showCrackBadge={stateLost}
              onNext={handleDetailsNext}
              onBack={handleDetailsBack}
            />
          </div>
        } />

        <Route path="/seat" element={
          <div className="booking-section">
            <SeatStep
              originalSelection={cachedSeat}
              onNext={handleSeatNext}
              onBack={handleSeatBack}
            />
          </div>
        } />

        <Route path="/payment" element={
          <div className="booking-section">
            <PaymentStep
              searchData={searchData}
              detailsData={detailsData}
              seatData={seatData}
              onBack={handlePaymentBack}
            />
          </div>
        } />
      </Routes>

      {cardPayload && (
        <RedemptionCard
          payload={cardPayload}
          onComplete={handleComplete}
          onDismiss={() => setCardPayload(null)}
          onClarify={handleClarify}
        />
      )}
    </>
  );
}
