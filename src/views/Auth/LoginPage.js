import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import axios from "axios";

import logo from "assets/img/logo.png";

const LoginPage = () => {
  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in ms
  const expiryTime = new Date().getTime() + SESSION_DURATION;
  const [u_name, setUName] = useState("");
  const [u_password, setUPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const history = useHistory();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post("http://localhost:5000/api/login", {
        u_name,
        u_password,
      });

      if (response.data.success) {
        const roleId = response.data.role_id;
        localStorage.setItem("role_id", roleId);
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("username", u_name);
        localStorage.setItem("userId", response.data.u_id);
        localStorage.setItem("sessionExpiry", expiryTime);
        localStorage.setItem("showMissedAlert", response.data.missedCount ?? 0);

        if (roleId === 1) history.push("/admin/dashboard");
        else if (roleId === 3) history.push("/collector/dashboard");
        else if (roleId === 2) history.push("/driver/dashboard");
        else setError("Unknown role. Please contact admin.");
      } else {
        setError("Invalid username or password.");
      }
    } catch (err) {
      setError("Server error. Try again later.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        display: "flex",
        justifyContent: "center",
        alignItems: isMobile ? "flex-start" : "center", // allow top scroll on mobile
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        padding: isMobile ? "20px" : "0",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          width: isMobile ? "100%" : "800px",
          maxWidth: "100%",
          height: isMobile ? "auto" : "480px",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.2)",
          background: "#fff",
        }}
      >
        {/* Left Panel */}
        <div
          style={{
            flex: 1,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "30px",
            textAlign: "center",
          }}
        >
          <img
            src={logo}
            style={{
              width: isMobile ? "100px" : "120px",
              marginBottom: "20px",
            }}
          />
          <h1 style={{ fontSize: "24px", marginBottom: "12px" }}>
            Welcome Back
          </h1>
          <p style={{ fontSize: "15px", maxWidth: "240px" }}>
            Sign in to manage your smart waste dashboard efficiently.
          </p>
        </div>

        {/* Right Panel */}
        <div
          style={{
            flex: 1,
            padding: "30px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <h2
            style={{
              marginBottom: "20px",
              fontSize: "22px",
              fontWeight: "600",
              color: "#333",
            }}
          >
            Sign In
          </h2>

          <form onSubmit={handleLogin}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                color: "#555",
                fontWeight: "500",
              }}
            >
              Username
            </label>
            <input
              type="text"
              value={u_name}
              onChange={(e) => setUName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "16px",
                borderRadius: "8px",
                border: "1.8px solid #ccc",
                fontSize: "16px",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#667eea")}
              onBlur={(e) => (e.target.style.borderColor = "#ccc")}
            />

            <label
              style={{
                display: "block",
                marginBottom: "6px",
                color: "#555",
                fontWeight: "500",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={u_password}
                onChange={(e) => setUPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 48px 12px 12px",
                  borderRadius: "8px",
                  border: "1.8px solid #ccc",
                  fontSize: "16px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#667eea")}
                onBlur={(e) => (e.target.style.borderColor = "#ccc")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "18px",
                  padding: 0,
                  color: "#667eea",
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {error && (
              <p
                style={{
                  color: "#e53e3e",
                  marginBottom: "12px",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "14px",
                background: "#667eea",
                borderRadius: "10px",
                color: "#fff",
                fontWeight: "600",
                fontSize: "16px",
                cursor: "pointer",
                border: "none",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#5563c1")}
              onMouseLeave={(e) => (e.target.style.background = "#667eea")}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
