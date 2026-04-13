import React, { useState } from "react";
import { api } from "./api";

export default function UserDashboard({ onNavigate }) {
  const [tokenNumber, setTokenNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [checkedToken, setCheckedToken] = useState("");

  const brandData = {
    name: "GREYSTONE",
    tagline: "Premium Plywood & Furniture Solutions",
    features: ["🌟 Quality Assured", "🌿 Eco-Friendly", "💪 10 Year Warranty"],
    products: [
      { name: "GREYSTONE CHAUGATH", description: "5×2.5 inch & 6×2.5 inch | 25 year guarantee", icon: "🚪" },
      { name: "VENEER", description: "4mm thickness | Premium Wood Finishes", icon: "🌳" },
      { name: "GREYSTONE LAMINATES", description: "Thickness: 0.72mm to 1.25mm", icon: "📐" },
      { name: "GREYSTONE FLUSH DOORS", description: "30mm, 32mm | Water proof", icon: "🚪" }
    ]
  };

  const handleCheckToken = async () => {
    if (!tokenNumber.trim()) {
      alert("Please enter a token number");
      return;
    }
    
    setLoading(true);
    const res = await api("checkToken", { tokenNumber });
    setLoading(false);
    
    if (res.success) {
      setWinAmount(res.tokenValue);
      setCheckedToken(tokenNumber);
      setShowPopup(true);
      setTokenNumber("");
      
      // Auto-hide popup after 5 seconds
      setTimeout(() => setShowPopup(false), 5000);
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Popup Modal */}
      {showPopup && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup-content win-popup" onClick={e => e.stopPropagation()}>
            <div className="popup-icon">🎉</div>
            <h2>Congratulations!</h2>
            <p>You won</p>
            <div className="win-amount">₹{winAmount}</div>
            <div className="token-display">
              <p>Token Number:</p>
              <strong>{checkedToken}</strong>
            </div>
            <p>Show this token to your nearest dealer to claim your cash!</p>
            <button onClick={() => setShowPopup(false)} className="popup-close">Got It!</button>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <div className="nav-bar">
        <div className="nav-logo">
          <span className="tree-icon">🌳</span>
          <h1>GREYSTONE</h1>
        </div>
        <div className="nav-buttons">
          <button onClick={() => onNavigate("dealerLogin")} className="nav-btn dealer">🏪 Dealer Login</button>
          <button onClick={() => onNavigate("adminLogin")} className="nav-btn admin">👑 Admin</button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>GREYSTONE</h1>
          <p>Premium Plywood & Furniture Solutions</p>
          <div className="hero-badges">
            {brandData.features.map((feature, idx) => <span key={idx}>{feature}</span>)}
          </div>
        </div>
      </div>

      {/* Token Check Section */}
      <div className="token-check-section">
        <div className="token-card">
          <div className="token-icon">🎫</div>
          <h2>Check Your Token</h2>
          <p>Enter the token number from your purchase to win exciting cash prizes!</p>
          
          <div className="token-input-group">
            <input 
              type="text"
              placeholder="Enter Token Number" 
              value={tokenNumber}
              onChange={e => setTokenNumber(e.target.value)} 
              className="token-input"
              disabled={loading}
              onKeyPress={e => e.key === 'Enter' && handleCheckToken()}
            />
            <button onClick={handleCheckToken} className="check-btn" disabled={loading}>
              {loading ? <div className="spinner"></div> : "Check & Win →"}
            </button>
          </div>
          
          <div className="token-info">
            <p>💡 Each token has a guaranteed cash prize!</p>
            <p>🏪 Visit any GREYSTONE dealer to claim your winnings</p>
            <p>⚠️ Token remains active until claimed from dealer</p>
          </div>
        </div>
      </div>
      
      {/* Products Showcase */}
      <div className="products-showcase">
        <h2>Our Premium Products</h2>
        <div className="products-grid-mini">
          {brandData.products.map((product, idx) => (
            <div key={idx} className="product-mini-card">
              <div className="product-mini-icon">{product.icon}</div>
              <h4>{product.name}</h4>
              <p>{product.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className="brand-footer">
        <div className="footer-content">
          <div className="footer-logo">🌳 GREYSTONE</div>
          <p>Premium Plywood & Furniture Solutions | Since 2020</p>
          <div className="footer-stats">
            <span>🏆 25 Year Guarantee</span>
            <span>🌿 Eco-Friendly</span>
            <span>💪 Termite & Water Proof</span>
          </div>
        </div>
      </div>
    </div>
  );
}