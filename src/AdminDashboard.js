import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api";

export default function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [redeems, setRedeems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tokenValue, setTokenValue] = useState(1);
  const [stats, setStats] = useState({});
  const [tokenBulkInput, setTokenBulkInput] = useState("");
  const [tokenValuePerToken, setTokenValuePerToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedRedeem, setSelectedRedeem] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [selectedDealer, setSelectedDealer] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  
  const abortControllerRef = useRef(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      const [usersRes, dealersRes, tokensRes, redeemsRes, tokenValueRes, statsRes, transactionsRes] = await Promise.all([
        api("getAllUsers"),
        api("getAllDealers"),
        api("getAllTokens"),
        api("getAllRedeems"),
        api("getTokenValueSetting"),
        api("getDashboardStats"),
        api("getAllTransactions")
      ]);
      
      if (usersRes.success) setUsers(usersRes.users || []);
      if (dealersRes.success) setDealers(dealersRes.dealers || []);
      if (tokensRes.success) setTokens(tokensRes.tokens || []);
      if (redeemsRes.success) setRedeems(redeemsRes.redeems || []);
      if (tokenValueRes.success) setTokenValue(tokenValueRes.tokenValue || 1);
      if (statsRes.success) setStats(statsRes.stats || {});
      if (transactionsRes.success) setTransactions(transactionsRes.transactions || []);
    } catch (error) {
      if (error.name !== 'AbortError') console.error("Load error:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);

  const handleIssueTokens = async () => {
    if (!tokenBulkInput.trim()) {
      alert("Please enter token numbers");
      return;
    }
    
    if (!tokenValuePerToken || Number(tokenValuePerToken) <= 0) {
      alert("Please enter token value");
      return;
    }
    
    const tokenNumbers = tokenBulkInput.split(/\n|,/).map(t => t.trim()).filter(t => t);
    const tokenData = tokenNumbers.map(token => ({
      tokenNumber: token,
      value: Number(tokenValuePerToken)
    }));
    
    setLoading(true);
    const res = await api("issueTokens", { tokenData });
    setLoading(false);
    
    if (res.success) {
      alert(`${res.count} tokens issued successfully!`);
      setTokenBulkInput("");
      setTokenValuePerToken("");
      setShowTokenModal(false);
      loadData();
    } else {
      alert(res.error);
    }
  };

  const handleApproveRedeem = async () => {
    if (!transactionId.trim()) {
      alert("Please enter transaction ID");
      return;
    }
    
    setLoading(true);
    const res = await api("approveRedeem", { id: selectedRedeem.id, transactionId });
    setLoading(false);
    
    if (res.success) {
      alert("Redeem approved successfully!");
      setSelectedRedeem(null);
      setModalType(null);
      setTransactionId("");
      loadData();
    } else {
      alert(res.error);
    }
  };

  const handleCancelRedeem = async () => {
    if (!cancelReason.trim()) {
      alert("Please enter cancellation reason");
      return;
    }
    
    setLoading(true);
    const res = await api("cancelRedeem", { id: selectedRedeem.id, cancelReason });
    setLoading(false);
    
    if (res.success) {
      alert("Redeem cancelled. Amount refunded to dealer.");
      setSelectedRedeem(null);
      setModalType(null);
      setCancelReason("");
      loadData();
    } else {
      alert(res.error);
    }
  };

  const handleUpdateTokenValue = async () => {
    const newValue = prompt("Enter value per token (₹):", tokenValue);
    if (newValue && Number(newValue) > 0) {
      setLoading(true);
      const res = await api("updateTokenValueSetting", { tokenValue: Number(newValue) });
      setLoading(false);
      if (res.success) {
        alert("Token value updated!");
        setTokenValue(Number(newValue));
      }
    }
  };

  const handleUpdateDealerStatus = async (dealerId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setLoading(true);
    const res = await api("updateDealerStatus", { dealerId, status: newStatus });
    setLoading(false);
    if (res.success) {
      alert(`Dealer ${newStatus.toLowerCase()}`);
      loadData();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };


  const pendingRedeems = (redeems || []).filter(r => r.status === 'PENDING');

  // Filter transactions based on dealer and date range
  const filteredTransactions = (transactions || []).filter(txn => {
    if (selectedDealer !== 'all' && txn.dealerId !== selectedDealer) return false;
    if (dateRange.start && new Date(txn.createdAt) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(txn.createdAt) > new Date(dateRange.end)) return false;
    return true;
  });

  // Calculate totals
  const totalCredits = filteredTransactions
    .filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const totalDebits = filteredTransactions
    .filter(t => t.type === 'DEBIT')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const totalPayouts = filteredTransactions
    .filter(t => t.type === 'PAYOUT')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const getTransactionIcon = (type) => {
    if (type === 'CREDIT') return '➕';
    if (type === 'DEBIT') return '➖';
    if (type === 'PAYOUT') return '💰';
    return '📝';
  };

  return (
    <div className="admin-container">
      {refreshing && <div className="toast-refresh">Refreshing data...</div>}

      {/* Admin Header */}
      <div className="admin-header">
        <div className="header-left">
          <div className="logo-small">
            <span className="tree-icon-small">🌳</span>
            <h1>Admin Panel</h1>
          </div>
          <p className="welcome-text">HEXELO Management</p>
        </div>
        <div className="header-right">
          <div className="token-setting">
            <span>🎫 Token Value: ₹{tokenValue}</span>
            <button onClick={handleUpdateTokenValue} className="small-btn" disabled={loading}>Edit</button>
          </div>
          <button onClick={onLogout} className="logout-btn" disabled={loading}>🚪 Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={activeTab === "dashboard" ? "tab-active" : "tab"} onClick={() => setActiveTab("dashboard")}>
          📊 Dashboard
        </button>
        <button className={activeTab === "dealers" ? "tab-active" : "tab"} onClick={() => setActiveTab("dealers")}>
          🏪 Dealers ({dealers.length})
        </button>
        <button className={activeTab === "tokens" ? "tab-active" : "tab"} onClick={() => setActiveTab("tokens")}>
          🎫 Tokens ({tokens.length})
        </button>
        <button className={activeTab === "redeems" ? "tab-active" : "tab"} onClick={() => setActiveTab("redeems")}>
          💰 Redeems ({pendingRedeems.length} pending)
        </button>
        <button className={activeTab === "transactions" ? "tab-active" : "tab"} onClick={() => setActiveTab("transactions")}>
          📊 Transactions ({transactions.length})
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="dashboard-section">
          <div className="stats-grid">
            <div className="stat-card-large">
              <div className="stat-icon">🏪</div>
              <div className="stat-value">{stats.totalDealers || 0}</div>
              <div className="stat-label">Total Dealers</div>
            </div>
            <div className="stat-card-large">
              <div className="stat-icon">🎫</div>
              <div className="stat-value">{stats.totalTokens || 0}</div>
              <div className="stat-label">Tokens Issued</div>
            </div>
            <div className="stat-card-large">
              <div className="stat-icon">✅</div>
              <div className="stat-value">{stats.usedTokens || 0}</div>
              <div className="stat-label">Tokens Used</div>
            </div>
            <div className="stat-card-large">
              <div className="stat-icon">⏳</div>
              <div className="stat-value">{stats.pendingRedeems || 0}</div>
              <div className="stat-label">Pending Redeems</div>
            </div>
            <div className="stat-card-large">
              <div className="stat-icon">💰</div>
              <div className="stat-value">₹{(stats.totalPayouts || 0).toFixed(2)}</div>
              <div className="stat-label">Total Payouts</div>
            </div>
          </div>
          
          <div className="quick-actions">
            <button onClick={() => setShowTokenModal(true)} className="primary-btn">
              🎫 Issue Bulk Tokens
            </button>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="admin-section">
          <h3>All Users</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Mobile</th><th>Name</th><th>Joined At</th></tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr key={i}>
                    <td>{user.mobile}</td>
                    <td>{user.name}</td>
                    <td>{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dealers Tab */}
      {activeTab === "dealers" && (
        <div className="admin-section">
          <h3>All Dealers</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Name</th><th>Mobile</th><th>Wallet</th><th>UPI ID</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {dealers.map((dealer, i) => (
                  <tr key={i}>
                    <td>{dealer.id}</td>
                    <td>{dealer.name}</td>
                    <td>{dealer.mobile}</td>
                    <td>₹{dealer.walletBalance?.toFixed(2) || 0}</td>
                    <td>{dealer.upiId || '-'}</td>
                    <td>
                      <span className={`status-${dealer.status?.toLowerCase()}`}>
                        {dealer.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleUpdateDealerStatus(dealer.id, dealer.status)}
                        className="action-btn"
                        disabled={loading}
                      >
                        {dealer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tokens Tab */}
      {activeTab === "tokens" && (
        <div className="admin-section">
          <div className="section-header">
            <h3>All Tokens</h3>
            <button onClick={() => setShowTokenModal(true)} className="add-btn" disabled={loading}>
              + Issue Tokens
            </button>
          </div>
          <div className="stats-cards-mini">
            <div className="stat-mini">
              <span>Total: {tokens.length}</span>
              <span>Used: {tokens.filter(t => t.status === 'USED').length}</span>
              <span>Active: {tokens.filter(t => t.status === 'ACTIVE').length}</span>
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Token Number</th><th>Value</th><th>Status</th><th>Used By</th><th>Used At</th></tr>
              </thead>
              <tbody>
                {tokens.slice(0, 100).map((token, i) => (
                  <tr key={i}>
                    <td>{token.tokenNumber}</td>
                    <td>₹{token.value}</td>
                    <td>
                      <span className={`status-${token.status?.toLowerCase()}`}>
                        {token.status}
                      </span>
                    </td>
                    <td>{token.usedBy || '-'}</td>
                    <td>{formatDate(token.usedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Redeems Tab */}
      {activeTab === "redeems" && (
        <div className="admin-section">
          <h3>Redeem Requests</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Dealer</th><th>Amount</th><th>UPI ID</th><th>Status</th><th>Requested</th><th>Action</th></tr>
              </thead>
              <tbody>
                {redeems.map((redeem, i) => (
                  <tr key={i}>
                    <td>{redeem.id}</td>
                    <td>{redeem.dealerName}</td>
                    <td>₹{redeem.amount}</td>
                    <td>{redeem.upiId || '-'}</td>
                    <td>
                      <span className={`status-${redeem.status?.toLowerCase()}`}>
                        {redeem.status}
                      </span>
                    </td>
                    <td>{formatDate(redeem.requestedAt)}</td>
                    <td>
                      {redeem.status === 'PENDING' && (
                        <div className="action-buttons">
                          <button 
                            className="action-btn approve-btn"
                            onClick={() => {
                              setSelectedRedeem(redeem);
                              setModalType('approve');
                              setTransactionId("");
                            }}
                            disabled={loading}
                            title="Approve"
                          >
                            ✓ Approve
                          </button>
                          <button 
                            className="action-btn cancel-btn"
                            onClick={() => {
                              setSelectedRedeem(redeem);
                              setModalType('cancel');
                              setCancelReason("");
                            }}
                            disabled={loading}
                            title="Cancel"
                          >
                            ✗ Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === "transactions" && (
        <div className="admin-section">
          <h3>All Transactions</h3>
          
          {/* Filters */}
          <div className="filters-section">
            <div className="filter-group">
              <label>Filter by Dealer:</label>
              <select 
                value={selectedDealer} 
                onChange={e => setSelectedDealer(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Dealers</option>
                {dealers.map(dealer => (
                  <option key={dealer.id} value={dealer.id}>
                    {dealer.name} ({dealer.mobile})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>From Date:</label>
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                className="filter-input"
              />
            </div>
            
            <div className="filter-group">
              <label>To Date:</label>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                className="filter-input"
              />
            </div>
            
            <button 
              onClick={() => { setSelectedDealer("all"); setDateRange({ start: "", end: "" }); }}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          </div>
          
          {/* Summary Cards */}
          <div className="transaction-summary-admin">
            <div className="summary-card-admin credit">
              <div className="summary-icon">➕</div>
              <div className="summary-details">
                <span>Total Credits</span>
                <strong>₹{totalCredits.toFixed(2)}</strong>
              </div>
            </div>
            <div className="summary-card-admin debit">
              <div className="summary-icon">➖</div>
              <div className="summary-details">
                <span>Total Debits</span>
                <strong>₹{totalDebits.toFixed(2)}</strong>
              </div>
            </div>
            <div className="summary-card-admin payout">
              <div className="summary-icon">💰</div>
              <div className="summary-details">
                <span>Total Payouts</span>
                <strong>₹{totalPayouts.toFixed(2)}</strong>
              </div>
            </div>
            <div className="summary-card-admin net">
              <div className="summary-icon">📊</div>
              <div className="summary-details">
                <span>Net Balance</span>
                <strong>₹{(totalCredits - totalDebits).toFixed(2)}</strong>
              </div>
            </div>
          </div>
          
          {/* Transactions Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Dealer</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((txn, i) => {
                    const dealer = dealers.find(d => d.id === txn.dealerId);
                    return (
                      <tr key={i}>
                        <td>{txn.id?.substring(0, 12)}...</td>
                        <td>
                          <div className="dealer-info-cell">
                            <strong>{dealer?.name || txn.dealerId}</strong>
                            <small>{dealer?.mobile || ''}</small>
                          </div>
                        </td>
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
                        <td className="remark-cell">{txn.remark || '-'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="no-data-cell">
                      📭 No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issue Tokens Modal */}
      {showTokenModal && (
        <div className="modal-overlay" onClick={() => setShowTokenModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <h3>Issue Bulk Tokens</h3>
            <p>Enter token numbers (one per line or comma separated)</p>
            <textarea 
              placeholder="TOKEN001&#10;TOKEN002&#10;TOKEN003"
              value={tokenBulkInput}
              onChange={e => setTokenBulkInput(e.target.value)}
              className="form-input"
              rows="8"
            />
            <input 
              type="number"
              placeholder="Value per token (₹)"
              value={tokenValuePerToken}
              onChange={e => setTokenValuePerToken(e.target.value)}
              className="form-input"
            />
            <div className="modal-actions">
              <button onClick={handleIssueTokens} className="submit-btn" disabled={loading}>
                {loading ? <div className="spinner"></div> : "Issue Tokens"}
              </button>
              <button onClick={() => setShowTokenModal(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Redeem Modal */}
      {selectedRedeem && modalType === 'approve' && (
        <div className="modal-overlay" onClick={() => { setSelectedRedeem(null); setModalType(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Approve Redeem Request</h3>
            <p>Dealer: <strong>{selectedRedeem.dealerName}</strong></p>
            <p>Amount: <strong>₹{selectedRedeem.amount}</strong></p>
            <p>UPI ID: <strong>{selectedRedeem.upiId}</strong></p>
            <input 
              type="text"
              placeholder="Transaction ID / Reference Number *"
              value={transactionId}
              onChange={e => setTransactionId(e.target.value)}
              className="form-input"
            />
            <div className="modal-actions">
              <button onClick={handleApproveRedeem} className="submit-btn" disabled={loading}>
                {loading ? <div className="spinner"></div> : "✓ Approve & Mark Paid"}
              </button>
              <button onClick={() => { setSelectedRedeem(null); setModalType(null); }} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Redeem Modal */}
      {selectedRedeem && modalType === 'cancel' && (
        <div className="modal-overlay" onClick={() => { setSelectedRedeem(null); setModalType(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Cancel Redeem Request</h3>
            <p>Dealer: <strong>{selectedRedeem.dealerName}</strong></p>
            <p>Amount: <strong>₹{selectedRedeem.amount}</strong></p>
            <textarea 
              placeholder="Reason for cancellation *"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="form-input"
              rows="3"
            />
            <p className="warning-text">⚠️ Amount will be refunded to dealer's wallet</p>
            <div className="modal-actions">
              <button onClick={handleCancelRedeem} className="cancel-btn" disabled={loading}>
                {loading ? <div className="spinner"></div> : "✗ Confirm Cancellation"}
              </button>
              <button onClick={() => { setSelectedRedeem(null); setModalType(null); }} className="secondary-btn">Back</button>
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