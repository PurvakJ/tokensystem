import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api";

export default function DealerDashboard({ dealer, setDealer, onLogout, onNavigate }) {
  const [dealerData, setDealerData] = useState(dealer || null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenList, setTokenList] = useState([]);
  const [activeTab, setActiveTab] = useState("tokens");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [upiId, setUpiId] = useState(dealer?.upiId || "");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [, setVerifiedTokens] = useState([]);
  
  const abortControllerRef = useRef(null);

  const loadData = useCallback(async () => {
    if (!dealerData?.id) return;
    
    setRefreshing(true);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      const res = await api("getDealerData", { dealerId: dealerData.id });
      if (res.success) {
        setDealerData(res.dealerData);
        if (setDealer) setDealer(res.dealerData);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Load error:", error);
      }
    } finally {
      setRefreshing(false);
    }
  }, [dealerData?.id, setDealer]);

  useEffect(() => {
    if (dealerData?.id) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => {
        clearInterval(interval);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }
  }, [loadData, dealerData?.id]);

  if (!dealerData) {
    return (
      <div className="dealer-container">
        <div className="loading-overlay">
          <div className="spinner-large"></div>
          <p>Loading dealer data...</p>
        </div>
      </div>
    );
  }

  const handleAddToken = () => {
    if (!tokenInput.trim()) return;
    setTokenList([...tokenList, tokenInput.trim()]);
    setTokenInput("");
  };

  const handleRemoveToken = (index) => {
    setTokenList(tokenList.filter((_, i) => i !== index));
  };



  const handleUploadTokens = async () => {
    if (tokenList.length === 0) {
      alert("No tokens to upload");
      return;
    }
    
    setLoading(true);
    const res = await api("uploadTokens", { 
      dealerId: dealerData.id, 
      tokenNumbers: tokenList,
      done: true
    });
    setLoading(false);
    
    if (res.success) {
      alert(res.message);
      setTokenList([]);
      setVerifiedTokens([]);
      loadData();
    } else {
      alert(res.error);
    }
  };

  const handleRedeem = async () => {
    if (!redeemAmount || Number(redeemAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    
    if (Number(redeemAmount) > dealerData.walletBalance) {
      alert(`Insufficient balance! Available: ₹${dealerData.walletBalance}`);
      return;
    }
    
    setLoading(true);
    const res = await api("requestRedeem", { 
      dealerId: dealerData.id, 
      amount: Number(redeemAmount),
      upiId: upiId || dealerData.upiId
    });
    setLoading(false);
    
    if (res.success) {
      alert("Redeem request submitted successfully!");
      setRedeemAmount("");
      setShowRedeemModal(false);
      loadData();
    } else {
      alert(res.error);
    }
  };

  const handleUpdateUPI = async () => {
    if (!upiId.trim()) {
      alert("Please enter UPI ID");
      return;
    }
    
    setLoading(true);
    const res = await api("updateDealerUPI", { dealerId: dealerData.id, upiId });
    setLoading(false);
    
    if (res.success) {
      alert("UPI ID updated successfully!");
      setDealerData({ ...dealerData, upiId });
    } else {
      alert(res.error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const getTransactionIcon = (type) => {
    if (type === 'CREDIT') return '➕';
    if (type === 'DEBIT') return '➖';
    if (type === 'PAYOUT') return '💰';
    return '📝';
  };

  return (
    <div className="dealer-container">
      {refreshing && <div className="toast-refresh">Refreshing data...</div>}

      {/* Dealer Header */}
      <div className="dealer-header">
        <div className="header-left">
          <div className="logo-small">
            <span className="tree-icon-small">🌳</span>
            <h1>Dealer Portal</h1>
          </div>
          <p className="welcome-text">Welcome, {dealerData.name}!</p>
        </div>
        <div className="header-right">
          <div className="wallet-card">
            <span className="wallet-label">💰 Wallet Balance</span>
            <span className="wallet-value">₹{dealerData.walletBalance?.toFixed(2) || 0}</span>
          </div>
          <button onClick={() => { onLogout(); onNavigate("user"); }} className="logout-btn">🚪 Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="dealer-tabs">
        <button className={activeTab === "tokens" ? "tab-active" : "tab"} onClick={() => setActiveTab("tokens")}>
          🎫 Upload Tokens
        </button>
        <button className={activeTab === "redeem" ? "tab-active" : "tab"} onClick={() => setActiveTab("redeem")}>
          💰 Redeem
        </button>
        <button className={activeTab === "history" ? "tab-active" : "tab"} onClick={() => setActiveTab("history")}>
          📜 Transactions
        </button>
      </div>

      {/* Tokens Tab */}
      {activeTab === "tokens" && (
        <div className="tokens-section">
          <div className="info-banner">
            💡 Enter the token numbers given by customers. Each token has a guaranteed cash value that will be added to your wallet.
          </div>
          
          <div className="token-input-section">
            <div className="token-input-group">
              <input 
                type="text"
                placeholder="Enter Token Number" 
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                className="form-input"
                onKeyPress={e => e.key === 'Enter' && handleAddToken()}
              />
              <button onClick={handleAddToken} className="add-token-btn">+ Add</button>
            </div>
            
            {tokenList.length > 0 && (
              <div className="token-list">
                <h4>Tokens to Upload ({tokenList.length})</h4>
                <div className="token-badges">
                  {tokenList.map((token, index) => (
                    <div key={index} className="token-badge">
                      <span>{token}</span>
                      <button onClick={() => handleRemoveToken(index)} className="remove-token">✕</button>
                    </div>
                  ))}
                </div>
                <div className="token-actions">
                  <button onClick={handleUploadTokens} className="submit-btn" disabled={loading}>
                    {loading ? <div className="spinner"></div> : "✅ Done - Add to Wallet"}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Recent Token Uploads */}
          {dealerData.tokens && dealerData.tokens.length > 0 && (
            <div className="recent-tokens">
              <h3>Recent Token Uploads</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>Token Number</th><th>Value</th><th>Used At</th></tr>
                  </thead>
                  <tbody>
                    {dealerData.tokens.map((token, i) => (
                      <tr key={i}>
                        <td>{token.tokenNumber}</td>
                        <td>₹{token.value}</td>
                        <td>{formatDate(token.usedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Redeem Tab */}
      {activeTab === "redeem" && (
        <div className="redeem-section">
          <div className="redeem-card">
            <h3>Request Payout</h3>
            <p>Current Balance: <strong>₹{dealerData.walletBalance?.toFixed(2) || 0}</strong></p>
            
            <div className="upi-section">
              <label>UPI ID for receiving payment</label>
              <div className="upi-input-group">
                <input 
                  type="text"
                  placeholder="your@upi" 
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  className="form-input"
                />
                <button onClick={handleUpdateUPI} className="secondary-btn" disabled={loading}>
                  Update
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setShowRedeemModal(true)} 
              className="redeem-btn"
              disabled={dealerData.walletBalance === 0}
            >
              Request Redeem →
            </button>
          </div>
          
          {/* Redeem History */}
          {dealerData.redeems && dealerData.redeems.length > 0 && (
            <div className="redeem-history">
              <h3>Redeem History</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>Request ID</th><th>Amount</th><th>Status</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {dealerData.redeems.map((redeem, i) => (
                      <tr key={i}>
                        <td>{redeem.id}</td>
                        <td>₹{redeem.amount}</td>
                        <td>
                          <span className={`status-${redeem.status.toLowerCase()}`}>
                            {redeem.status}
                          </span>
                        </td>
                        <td>{formatDate(redeem.requestedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === "history" && (
        <div className="history-section">
          <h3>Transaction History</h3>
          {dealerData.transactions && dealerData.transactions.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>ID</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th><th>Remark</th></tr>
                </thead>
                <tbody>
                  {dealerData.transactions.map((txn, i) => (
                    <tr key={i}>
                      <td>{txn.id?.substring(0, 12)}...</td>
                      <td>
                        <span className={`txn-badge txn-${txn.type?.toLowerCase()}`}>
                          {getTransactionIcon(txn.type)} {txn.type}
                        </span>
                      </td>
                      <td className={txn.type === 'CREDIT' ? 'credit-amount' : 'debit-amount'}>
                        {txn.type === 'CREDIT' ? '+' : '-'} ₹{txn.amount?.toFixed(2) || 0}
                      </td>
                      <td>
                        <span className={`status-${txn.status?.toLowerCase()}`}>
                          {txn.status}
                        </span>
                      </td>
                      <td>{formatDate(txn.createdAt)}</td>
                      <td>{txn.remark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data-card">
              <p>📭 No transactions yet</p>
              <p className="sub-text">Upload tokens to start earning</p>
            </div>
          )}
          
          {/* Summary Cards */}
          {dealerData.transactions && dealerData.transactions.length > 0 && (
            <div className="transaction-summary">
              <h4>Summary</h4>
              <div className="summary-cards">
                <div className="summary-card credit">
                  <span>Total Credits</span>
                  <strong>+₹{dealerData.transactions
                    .filter(t => t.type === 'CREDIT')
                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                    .toFixed(2)}</strong>
                </div>
                <div className="summary-card debit">
                  <span>Total Debits</span>
                  <strong>-₹{dealerData.transactions
                    .filter(t => t.type === 'DEBIT')
                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                    .toFixed(2)}</strong>
                </div>
                <div className="summary-card payout">
                  <span>Payouts Received</span>
                  <strong>₹{dealerData.transactions
                    .filter(t => t.type === 'PAYOUT')
                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                    .toFixed(2)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Redeem Modal */}
      {showRedeemModal && (
        <div className="modal-overlay" onClick={() => setShowRedeemModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Request Redeem</h3>
            <p>Available Balance: <strong>₹{dealerData.walletBalance?.toFixed(2) || 0}</strong></p>
            <input 
              type="number"
              placeholder="Enter amount to redeem" 
              value={redeemAmount}
              onChange={e => setRedeemAmount(e.target.value)}
              className="form-input"
            />
            <p className="note">Amount will be sent to: <strong>{upiId || dealerData.upiId || 'Not set'}</strong></p>
            <div className="modal-actions">
              <button onClick={handleRedeem} className="submit-btn" disabled={loading}>
                {loading ? <div className="spinner"></div> : "Confirm Redeem"}
              </button>
              <button onClick={() => setShowRedeemModal(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner-large"></div>
          <p>Processing...</p>
        </div>
      )}
    </div>
  );
}