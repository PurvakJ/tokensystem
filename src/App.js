import React, { useState, useEffect } from "react";
import { api } from "./api";
import UserDashboard from "./UserDashboard";
import DealerDashboard from "./DealerDashboard";
import AdminDashboard from "./AdminDashboard";
import './App.css';

export default function App() {
  const [page, setPage] = useState("user");
  const [dealer, setDealer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on app load
  useEffect(() => {
    const savedSession = localStorage.getItem("hexelo_session");
    
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        
        if (session.page === "dealer" && session.dealerData) {
          // Verify dealer session is still valid (optional)
          setDealer(session.dealerData);
          setPage("dealer");
        } 
        else if (session.page === "admin") {
          setPage("admin");
        }
        else if (session.page === "user") {
          setPage("user");
        }
      } catch (error) {
        console.error("Session restore error:", error);
        localStorage.removeItem("hexelo_session");
      }
    }
    
    setLoading(false);
  }, []);

  const handleLogout = () => {
    setDealer(null);
    setPage("user");
    // Clear session on logout
    localStorage.removeItem("hexelo_session");
  };

  const handleDealerLogin = (dealerData) => {
    setDealer(dealerData);
    setPage("dealer");
    // Save session
    localStorage.setItem("hexelo_session", JSON.stringify({
      page: "dealer",
      dealerData: dealerData,
      timestamp: Date.now()
    }));
  };

  const handleAdminLogin = () => {
    setPage("admin");
    // Save session
    localStorage.setItem("hexelo_session", JSON.stringify({
      page: "admin",
      timestamp: Date.now()
    }));
  };

  const handleUserNavigate = (target) => {
    if (target === "user") {
      setPage("user");
      localStorage.removeItem("hexelo_session");
    } else {
      setPage(target);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (page === "user") return <UserDashboard onNavigate={handleUserNavigate} />;
  if (page === "dealer") return <DealerDashboard 
    dealer={dealer} 
    setDealer={setDealer} 
    onLogout={handleLogout} 
    onNavigate={(target) => setPage(target)} 
  />;
  if (page === "admin") return <AdminDashboard onLogout={handleLogout} />;
  if (page === "dealerLogin") return <DealerLogin 
    setPage={setPage} 
    setDealer={handleDealerLogin} 
  />;
  if (page === "adminLogin") return <AdminLogin 
    setPage={setPage} 
    onAdminLogin={handleAdminLogin}
  />;
  if (page === "dealerSignup") return <DealerSignup setPage={setPage} />;
}

// Dealer Login Component
function DealerLogin({ setPage, setDealer }) {
  const [mobileNumber, setMobile] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!mobileNumber.trim()) {
      alert("Please enter mobile number");
      return;
    }
    
    setLoading(true);
    try {
      const res = await api("loginDealer", { mobileNumber });
      console.log("Login response:", res);
      
      if (res.success) {
        setDealer(res.dealerData);
      } else {
        alert(res.error || "Login failed");
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="wood-pattern"></div>
      <div className="auth-card">
        <div className="logo-section">
          <img src="https://i.postimg.cc/Njyq9QbM/Whats_App_Image_2026_03_19_at_12_33_09_removebg_preview.png" alt="HEXELO" className="company-logo" />
          <h2>Dealer Login</h2>
          <p>Access your dealer dashboard</p>
        </div>
        
        <input 
          type="tel"
          placeholder="Mobile Number" 
          onChange={e => setMobile(e.target.value)} 
          className="auth-input"
          disabled={loading}
        />
        
        <button onClick={handleLogin} className="auth-btn" disabled={loading}>
          {loading ? <div className="spinner"></div> : "Login →"}
        </button>
        
        <p className="auth-link" onClick={() => setPage("dealerSignup")}>New Dealer? Register →</p>
        <p className="auth-link" onClick={() => setPage("user")}>← Back to Token Check</p>
      </div>
    </div>
  );
}

// Dealer Signup Component
function DealerSignup({ setPage }) {
  const [mobileNumber, setMobile] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!mobileNumber.trim() || !name.trim()) {
      alert("Please fill all fields");
      return;
    }
    
    setLoading(true);
    try {
      const res = await api("registerDealer", { mobileNumber, name });
      console.log("Signup response:", res);
      
      if (res.success) {
        alert(res.message || "Dealer registered successfully! Please login.");
        setPage("dealerLogin");
      } else {
        alert(res.error || "Registration failed");
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="wood-pattern"></div>
      <div className="auth-card">
        <div className="logo-section">
          <img src="https://i.postimg.cc/Njyq9QbM/Whats_App_Image_2026_03_19_at_12_33_09_removebg_preview.png" alt="HEXELO" className="company-logo" />
          <h2>Register as Dealer</h2>
          <p>Join HEXELO dealer network</p>
        </div>
        
        <input 
          placeholder="Full Name" 
          onChange={e => setName(e.target.value)} 
          className="auth-input"
          disabled={loading}
        />
        
        <input 
          type="tel"
          placeholder="Mobile Number" 
          onChange={e => setMobile(e.target.value)} 
          className="auth-input"
          disabled={loading}
        />
        
        <button onClick={handleSignup} className="auth-btn" disabled={loading}>
          {loading ? <div className="spinner"></div> : "Register →"}
        </button>
        
        <p className="auth-link" onClick={() => setPage("dealerLogin")}>← Back to Login</p>
      </div>
    </div>
  );
}

// Admin Login Component
function AdminLogin({ setPage, onAdminLogin }) {
  const [adminCode, setAdminCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!adminCode.trim()) {
      alert("Please enter admin code");
      return;
    }
    
    setLoading(true);
    try {
      const res = await api("adminLogin", { adminCode });
      console.log("Admin login response:", res);
      
      if (res.success) {
        onAdminLogin();
      } else {
        alert(res.error || "Invalid admin code");
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="wood-pattern"></div>
      <div className="auth-card">
        <div className="logo-section">
          <img src="https://i.postimg.cc/Njyq9QbM/Whats_App_Image_2026_03_19_at_12_33_09_removebg_preview.png" alt="HEXELO" className="company-logo" />
          <h2>Admin Login</h2>
          <p>Enter admin credentials</p>
        </div>
        
        <input 
          type="password"
          placeholder="Admin Code" 
          onChange={e => setAdminCode(e.target.value)} 
          className="auth-input"
          disabled={loading}
        />
        
        <button onClick={handleLogin} className="auth-btn" disabled={loading}>
          {loading ? <div className="spinner"></div> : "Login →"}
        </button>
        
        <p className="auth-link" onClick={() => setPage("user")}>← Back to Token Check</p>
      </div>
    </div>
  );
}