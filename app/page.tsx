"use client";

import { useState, useEffect } from "react";

// ============================================================
// ⚙️  CONFIGURATION — Fill these in after EmailJS setup
// ============================================================
const CONFIG = {
  ADMIN_PASSWORD: "Admin@1234",          // Change this to your password
  EMAILJS_SERVICE_ID: "YOUR_SERVICE_ID", // From EmailJS dashboard
  EMAILJS_TEMPLATE_ID: "YOUR_TEMPLATE_ID",
  EMAILJS_PUBLIC_KEY: "YOUR_PUBLIC_KEY",
  ADMIN_EMAIL: "your@email.com",         // Your email for notifications
};
// ============================================================



async function sendEmailNotification(ticket) {
  if (
    CONFIG.EMAILJS_SERVICE_ID === "YOUR_SERVICE_ID" ||
    CONFIG.EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY"
  ) {
    console.log("EmailJS not configured yet. Ticket created:", ticket);
    return;
  }
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: CONFIG.EMAILJS_SERVICE_ID,
        template_id: CONFIG.EMAILJS_TEMPLATE_ID,
        user_id: CONFIG.EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: CONFIG.ADMIN_EMAIL,
          ticket_id: ticket.id,
          ticket_type: ticket.type,
          user_name: ticket.name,
          user_email: ticket.email,
          created_at: ticket.createdAt,
        },
      }),
    });
    if (!res.ok) console.error("EmailJS error:", res.status);
  } catch (e) {
    console.error("Email send failed:", e);
  }
}

// ─────────────────────────────────────────────────────────────
// JIRA API HELPERS
// ─────────────────────────────────────────────────────────────
async function apiCreateTicket(ticket: any) {
  const res = await fetch("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticket),
  });
  if (!res.ok) throw new Error("Failed to create ticket");
  return res.json();
}

async function apiFetchTickets() {
  const res = await fetch("/api/tickets", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch tickets");
  const data = await res.json();
  return data.tickets || [];
}

async function apiUpdateStatus(jiraId: string, action: string) {
  const res = await fetch("/api/tickets", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jiraId, action }),
  });
  if (!res.ok) throw new Error("Failed to update status");
}

async function apiDeleteTicket(jiraId: string) {
  const res = await fetch("/api/tickets", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jiraId }),
  });
  if (!res.ok) throw new Error("Failed to delete ticket");
}

// ─────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────

function TicketForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [emailCreation, setEmailCreation] = useState("");
  const [emailSharing, setEmailSharing] = useState("");
  const [type, setType] = useState("Creation of Creds");
  const [passwordRequested, setPasswordRequested] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [touched, setTouched] = useState({});

  const isChange = type === "Change of Creds";
  const isValid = name.trim() && emailCreation.trim() && emailSharing.trim();

  const touch = (field) => setTouched(t => ({ ...t, [field]: true }));

  const handleSubmit = async () => {
    setTouched({ name: true, emailCreation: true, emailSharing: true });
    if (!isValid) return;
    setLoading(true);
    try {
      const ticketData = {
        name: name.trim(),
        emailCreation: emailCreation.trim(),
        emailSharing: emailSharing.trim(),
        type,
        passwordRequested: isChange && passwordRequested.trim() ? passwordRequested.trim() : null,
      };
      const result = await apiCreateTicket(ticketData);
      sendEmailNotification({ ...ticketData, id: result.id });
      setTicketId(result.id);
      setSubmitted(true);
    } catch (e) {
      alert("Something went wrong submitting your ticket. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setName(""); setEmailCreation(""); setEmailSharing("");
    setPasswordRequested(""); setType("Creation of Creds");
    setSubmitted(false); setTicketId(""); setTouched({});
  };

  if (submitted) {
    return (
      <div style={styles.successCard}>
        <div style={styles.checkCircle}>✓</div>
        <h2 style={styles.successTitle}>Ticket Raised!</h2>
        <p style={styles.successSub}>Your request has been submitted successfully.</p>
        <div style={styles.ticketBadge}>{ticketId}</div>
        <p style={styles.successNote}>Keep this ID for future reference.</p>
        <button style={styles.newTicketBtn} onClick={reset}>Raise Another Ticket</button>
      </div>
    );
  }

  const fieldError = (field, val) => touched[field] && !val.trim()
    ? <span style={styles.errorInline}>This field is required</span>
    : null;

  return (
    <div style={styles.formCard}>
      <div style={styles.formHeader}>
        <h1 style={styles.formTitle}>Creds Generation Form for Clients</h1>
        <p style={styles.formSubtitle}>Fill in all details to raise a credentials request</p>
      </div>

      {/* Full Name */}
      <div style={styles.field}>
        <label style={styles.label}>Full Name <span style={styles.req}>*</span></label>
        <input
          style={{ ...styles.input, ...(touched.name && !name.trim() ? styles.inputError : {}) }}
          placeholder="Enter the client's name"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => touch("name")}
          onFocus={e => (e.target.style.borderColor = "#6366f1")}
        />
        {fieldError("name", name)}
      </div>

      {/* Email for Account Creation */}
      <div style={styles.field}>
        <label style={styles.label}>Email Address (Account Creation) <span style={styles.req}>*</span></label>
        <input
          style={{ ...styles.input, ...(touched.emailCreation && !emailCreation.trim() ? styles.inputError : {}) }}
          placeholder="Enter the client's email ID to be used for account creation"
          type="email"
          value={emailCreation}
          onChange={e => setEmailCreation(e.target.value)}
          onBlur={() => touch("emailCreation")}
          onFocus={e => (e.target.style.borderColor = "#6366f1")}
        />
        {fieldError("emailCreation", emailCreation)}
      </div>

      {/* Email for Sharing */}
      <div style={styles.field}>
        <label style={styles.label}>Email Address (Sharing of Creds) <span style={styles.req}>*</span></label>
        <input
          style={{ ...styles.input, ...(touched.emailSharing && !emailSharing.trim() ? styles.inputError : {}) }}
          placeholder="Enter the client's email ID for sharing the creds"
          type="email"
          value={emailSharing}
          onChange={e => setEmailSharing(e.target.value)}
          onBlur={() => touch("emailSharing")}
          onFocus={e => (e.target.style.borderColor = "#6366f1")}
        />
        {fieldError("emailSharing", emailSharing)}
      </div>

      {/* Request Type */}
      <div style={styles.field}>
        <label style={styles.label}>Request Type <span style={styles.req}>*</span></label>
        <div style={styles.radioGroup}>
          {["Creation of Creds", "Change of Creds"].map(opt => (
            <label
              key={opt}
              style={{ ...styles.radioCard, ...(type === opt ? styles.radioCardActive : {}) }}
              onClick={() => setType(opt)}
            >
              <span style={styles.radioIcon}>{opt === "Creation of Creds" ? "✨" : "🔄"}</span>
              <span style={styles.radioLabel}>{opt}</span>
              <span style={styles.radioCheck}>{type === opt ? "●" : "○"}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Conditional: Password Requested (only for Change of Creds) */}
      {isChange && (
        <div style={{ ...styles.field, ...styles.conditionalField }}>
          <label style={styles.label}>
            Password Requested <span style={styles.optionalTag}>Optional</span>
          </label>
          <input
            style={styles.input}
            placeholder="Enter the requested password (if any)"
            value={passwordRequested}
            onChange={e => setPasswordRequested(e.target.value)}
            onFocus={e => (e.target.style.borderColor = "#8b5cf6")}
            onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
          />
          <p style={styles.fieldHint}>Leave blank if no specific password is requested.</p>
        </div>
      )}

      <button
        style={{ ...styles.submitBtn, ...(!isValid || loading ? styles.submitBtnDisabled : {}) }}
        onClick={handleSubmit}
        disabled={loading || !isValid}
      >
        {loading ? "Submitting…" : "Submit Ticket"}
      </button>
    </div>
  );
}

function AdminDashboard({ tickets, onUpdateStatus, onDelete, onRefresh }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = tickets
    .filter(t => filter === "All" || t.type === filter || t.status === filter)
    .filter(t => {
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.emailCreation || "").toLowerCase().includes(q) ||
        (t.emailSharing || "").toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    });

  const counts = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "Open").length,
    resolved: tickets.filter(t => t.status === "Resolved").length,
    creation: tickets.filter(t => t.type === "Creation of Creds").length,
    change: tickets.filter(t => t.type === "Change of Creds").length,
  };

  const statCards = [
    { label: "Total Tickets", value: counts.total, gradient: "linear-gradient(135deg, #667eea, #764ba2)", icon: "🎫" },
    { label: "Open", value: counts.open, gradient: "linear-gradient(135deg, #f59e0b, #ef4444)", icon: "🔓" },
    { label: "Resolved", value: counts.resolved, gradient: "linear-gradient(135deg, #10b981, #059669)", icon: "✅" },
    { label: "Creation", value: counts.creation, gradient: "linear-gradient(135deg, #3b82f6, #6366f1)", icon: "✨" },
    { label: "Change", value: counts.change, gradient: "linear-gradient(135deg, #8b5cf6, #ec4899)", icon: "🔄" },
  ];

  const filterOptions = ["All", "Open", "Resolved", "Creation of Creds", "Change of Creds"];

  return (
    <div style={admStyles.wrapper}>
      {/* Header */}
      <div style={admStyles.header}>
        <div>
          <h1 style={admStyles.title}>Admin Dashboard</h1>
          <p style={admStyles.sub}>{counts.total} ticket{counts.total !== 1 ? "s" : ""} in the system</p>
        </div>
        <button style={admStyles.refreshBtn} onClick={onRefresh}>↻ Refresh</button>
      </div>

      {/* Stat Cards */}
      <div style={admStyles.statsRow}>
        {statCards.map(s => (
          <div key={s.label} style={{ ...admStyles.statCard, background: s.gradient }}>
            <div style={admStyles.statIcon}>{s.icon}</div>
            <div style={admStyles.statValue}>{s.value}</div>
            <div style={admStyles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div style={admStyles.controlsBar}>
        <div style={admStyles.searchWrap}>
          <span style={admStyles.searchIcon}>🔍</span>
          <input
            style={admStyles.searchInput}
            placeholder="Search by name, email, or ticket ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={admStyles.filterPills}>
          {filterOptions.map(f => (
            <button
              key={f}
              style={{ ...admStyles.pill, ...(filter === f ? admStyles.pillActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={admStyles.empty}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
          <p style={{ color: "#94a3b8", margin: 0 }}>No tickets found.</p>
        </div>
      ) : (
        <div style={admStyles.tableCard}>
          <table style={admStyles.table}>
            <thead>
              <tr style={admStyles.theadRow}>
                {["Ticket ID", "Name", "Email (Creation)", "Email (Sharing)", "Type", "Password Req.", "Status", "Created At", "Actions"].map(h => (
                  <th key={h} style={admStyles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} style={{ ...admStyles.tr, background: i % 2 === 0 ? "#fff" : "#f8fafc" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0f4ff"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f8fafc"}
                >
                  <td style={admStyles.td}><span style={admStyles.idBadge}>{t.id}</span></td>
                  <td style={{ ...admStyles.td, fontWeight: 600, color: "#1e293b" }}>{t.name}</td>
                  <td style={admStyles.td}>{t.emailCreation || t.email || "—"}</td>
                  <td style={admStyles.td}>{t.emailSharing || "—"}</td>
                  <td style={admStyles.td}>
                    <span style={t.type === "Creation of Creds" ? admStyles.typeCreation : admStyles.typeChange}>
                      {t.type === "Creation of Creds" ? "✨ Creation" : "🔄 Change"}
                    </span>
                  </td>
                  <td style={admStyles.td}>
                    {t.passwordRequested
                      ? <span style={admStyles.pwBadge}>{t.passwordRequested}</span>
                      : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={admStyles.td}>
                    <span style={t.status === "Open" ? admStyles.statusOpen : admStyles.statusResolved}>
                      {t.status === "Open" ? "● Open" : "✓ Resolved"}
                    </span>
                  </td>
                  <td style={{ ...admStyles.td, color: "#64748b", fontSize: 13 }}>{t.createdAt}</td>
                  <td style={admStyles.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        style={t.status === "Open" ? admStyles.resolveBtn : admStyles.reopenBtn}
                        onClick={() => onUpdateStatus(t.jiraId, t.status)}
                      >
                        {t.status === "Open" ? "Resolve" : "Reopen"}
                      </button>
                      <button style={admStyles.deleteBtn} onClick={() => onDelete(t.jiraId)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  const attempt = () => {
    if (pw === CONFIG.ADMIN_PASSWORD) { onLogin(); }
    else { setError(true); setTimeout(() => setError(false), 2000); }
  };

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginCard}>
        <div style={styles.loginIcon}>🔐</div>
        <h2 style={styles.loginTitle}>Admin Access</h2>
        <p style={styles.loginSub}>Enter your password to view the dashboard</p>
        <input
          style={{ ...styles.input, ...(error ? { borderColor: "#ef4444" } : {}) }}
          type="password"
          placeholder="Password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && attempt()}
        />
        {error && <p style={styles.errorMsg}>Incorrect password. Try again.</p>}
        <button style={styles.submitBtn} onClick={attempt}>Login →</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("form");
  const [tickets, setTickets] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [dashError, setDashError] = useState("");

  const fetchTickets = async () => {
    try {
      setDashError("");
      const t = await apiFetchTickets();
      setTickets(t);
    } catch (e) {
      setDashError("Could not load tickets from Jira. Check your API config.");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    if (view === "admin") fetchTickets();
    else setLoaded(true);
  }, [view]);

  const handleNewTicket = () => {
    // Ticket already created in Jira via the form — nothing extra needed here
  };

  const handleUpdateStatus = async (jiraId, currentStatus) => {
    const action = currentStatus === "Open" ? "resolve" : "reopen";
    try {
      await apiUpdateStatus(jiraId, action);
      await fetchTickets();
    } catch (e) {
      alert("Failed to update ticket status.");
    }
  };

  const handleDelete = async (jiraId) => {
    if (!confirm("Are you sure you want to delete this ticket from Jira?")) return;
    try {
      await apiDeleteTicket(jiraId);
      await fetchTickets();
    } catch (e) {
      alert("Failed to delete ticket.");
    }
  };

  return (
    <div style={styles.app}>
      <nav style={styles.nav}>
        <span style={styles.navBrand}>Lighthouse Canton</span>
        <div style={styles.navLinks}>
          <button style={{ ...styles.navBtn, ...(view === "form" ? styles.navBtnActive : {}) }} onClick={() => setView("form")}>
            Submit Ticket
          </button>
          <button
            style={{ ...styles.navBtn, ...(view === "admin" || view === "login" ? styles.navBtnActive : {}) }}
            onClick={() => view === "admin" ? setView("form") : setView("login")}
          >
            {view === "admin" ? "← Exit Admin" : "Admin"}
          </button>
        </div>
      </nav>

      <main style={{ ...styles.main, background: view === "admin" ? "#0f172a" : undefined }}>
        {view === "form" && <div style={styles.formWrap}><TicketForm onSubmit={handleNewTicket} /></div>}
        {view === "login" && <div style={styles.formWrap}><LoginScreen onLogin={() => { setLoaded(false); setView("admin"); }} /></div>}
        {view === "admin" && (
          !loaded
            ? <div style={{ color: "#94a3b8", textAlign: "center", padding: "80px 0" }}>Loading tickets from Jira…</div>
            : dashError
            ? <div style={{ color: "#ef4444", textAlign: "center", padding: "80px 0" }}>{dashError}</div>
            : <AdminDashboard
                tickets={tickets}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDelete}
                onRefresh={fetchTickets}
              />
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = {
  app: { minHeight: "100vh", background: "#c0152a", fontFamily: "'Segoe UI', sans-serif" },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#64748b" },

  nav: { background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 },
  navBrand: { fontWeight: 700, fontSize: 18, color: "#c0152a" },
  navLinks: { display: "flex", gap: 8 },
  navBtn: { padding: "6px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "transparent", cursor: "pointer", fontSize: 14, color: "#64748b", transition: "all .15s" },
  navBtnActive: { background: "#6366f1", color: "#fff", borderColor: "#6366f1" },

  main: { width: "100%", margin: "0 auto", padding: "32px 24px", boxSizing: "border-box" },

  // Form
  formCard: { background: "#fff", borderRadius: 20, padding: 40, boxShadow: "0 4px 24px rgba(0,0,0,0.07)", maxWidth: 520, margin: "0 auto", boxSizing: "border-box" },
  formHeader: { textAlign: "center", marginBottom: 32 },
  formIcon: { fontSize: 40, marginBottom: 12 },
  formTitle: { fontSize: 28, fontWeight: 800, color: "#1e293b", margin: 0 },
  formSubtitle: { color: "#64748b", marginTop: 6, fontSize: 15 },
  field: { marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 15, outline: "none", transition: "border .15s", boxSizing: "border-box", color: "#1e293b" },
  radioGroup: { display: "flex", flexDirection: "column", gap: 10 },
  radioCard: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: "1.5px solid #e2e8f0", borderRadius: 12, cursor: "pointer", transition: "all .15s" },
  radioCardActive: { borderColor: "#6366f1", background: "#eef2ff" },
  radioIcon: { fontSize: 20 },
  radioLabel: { flex: 1, fontWeight: 500, color: "#1e293b", fontSize: 15 },
  radioCheck: { color: "#6366f1", fontSize: 18 },
  inputError: { borderColor: "#ef4444" },
  errorInline: { color: "#ef4444", fontSize: 12, marginTop: 4, display: "block" },
  req: { color: "#ef4444", marginLeft: 2 },
  conditionalField: { background: "#faf5ff", borderRadius: 12, padding: "16px", border: "1.5px dashed #c4b5fd" },
  optionalTag: { fontSize: 11, fontWeight: 600, background: "#f3f4f6", color: "#9ca3af", padding: "2px 8px", borderRadius: 20, marginLeft: 8, textTransform: "uppercase", letterSpacing: .3 },
  fieldHint: { color: "#94a3b8", fontSize: 12, marginTop: 6, marginBottom: 0 },
  pwBadge: { fontFamily: "monospace", fontSize: 12, background: "#f5f3ff", color: "#7c3aed", padding: "2px 8px", borderRadius: 6, fontWeight: 600 },
  submitBtnDisabled: { opacity: 0.45, cursor: "not-allowed" },
  submitBtn: { display: "block", width: "100%", padding: "13px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 24, boxSizing: "border-box", transition: "opacity .15s" },

  // Success
  successCard: { background: "#fff", borderRadius: 20, padding: 48, textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", maxWidth: 400, margin: "0 auto" },
  checkCircle: { width: 64, height: 64, borderRadius: "50%", background: "#dcfce7", color: "#16a34a", fontSize: 30, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  successTitle: { fontSize: 24, fontWeight: 800, color: "#1e293b", margin: 0 },
  successSub: { color: "#64748b", marginTop: 8, fontSize: 15 },
  ticketBadge: { display: "inline-block", background: "#eef2ff", color: "#6366f1", fontWeight: 700, fontSize: 18, padding: "10px 20px", borderRadius: 10, margin: "16px 0 8px", letterSpacing: 1 },
  successNote: { color: "#94a3b8", fontSize: 13, margin: "4px 0 24px" },
  newTicketBtn: { padding: "10px 24px", background: "#f1f5f9", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, color: "#475569" },

  // Login
  loginWrap: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" },
  loginCard: { background: "#fff", borderRadius: 20, padding: 40, boxShadow: "0 4px 24px rgba(0,0,0,0.07)", width: "100%", maxWidth: 380, textAlign: "center" },
  loginIcon: { fontSize: 40, marginBottom: 12 },
  loginTitle: { fontSize: 22, fontWeight: 800, color: "#1e293b", margin: 0 },
  loginSub: { color: "#64748b", fontSize: 14, marginTop: 6, marginBottom: 20 },
  errorMsg: { color: "#ef4444", fontSize: 13, marginTop: 8, marginBottom: 0 },

  // Dashboard
  dashboard: { width: "100%" },
  dashHeader: { marginBottom: 24 },
  dashTitle: { fontSize: 28, fontWeight: 800, color: "#1e293b", margin: 0 },
  dashSub: { color: "#64748b", marginTop: 4 },

  statsRow: { display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" },
  statCard: { background: "#fff", borderRadius: 12, padding: "16px 20px", flex: "1 1 100px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  statValue: { fontSize: 28, fontWeight: 800 },
  statLabel: { fontSize: 12, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 },

  filterRow: { marginBottom: 20 },
  searchInput: { width: "100%", padding: "10px 16px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", marginBottom: 12, boxSizing: "border-box" },
  filterBtns: { display: "flex", gap: 8, flexWrap: "wrap" },
  filterBtn: { padding: "6px 14px", borderRadius: 20, border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13, color: "#64748b" },
  filterBtnActive: { background: "#6366f1", color: "#fff", borderColor: "#6366f1" },

  formWrap: { maxWidth: 560, margin: "0 auto" },
  tableWrap: { background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflowX: "auto", width: "100%" },
  table: { width: "100%", minWidth: 1000, borderCollapse: "collapse", fontSize: 14 },
  th: { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, borderBottom: "1px solid #f1f5f9" },
  td: { padding: "12px 16px", color: "#374151", borderBottom: "1px solid #f8fafc" },

  idBadge: { fontFamily: "monospace", fontSize: 12, background: "#f8fafc", padding: "2px 8px", borderRadius: 6, color: "#475569", fontWeight: 600 },
  typeBadge: { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  statusBadge: { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },

  actionBtns: { display: "flex", gap: 6 },
  resolveBtn: { padding: "5px 12px", borderRadius: 8, border: "1px solid #d1fae5", background: "#ecfdf5", color: "#065f46", cursor: "pointer", fontSize: 12, fontWeight: 600 },
  deleteBtn: { padding: "5px 10px", borderRadius: 8, border: "1px solid #fee2e2", background: "#fff5f5", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 },

  empty: { textAlign: "center", color: "#94a3b8", padding: "48px 0", background: "#fff", borderRadius: 16 },
};

const admStyles = {
  wrapper: { width: "100%", fontFamily: "'Segoe UI', sans-serif" },

  header: { marginBottom: 32, display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: 32, fontWeight: 900, color: "#c0152a", margin: 0, letterSpacing: "-0.5px" },
  sub: { color: "#64748b", marginTop: 4, fontSize: 14 },

  statsRow: { display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" },
  statCard: { flex: "1 1 140px", borderRadius: 16, padding: "20px 24px", color: "#fff", position: "relative", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" },
  statIcon: { fontSize: 22, marginBottom: 8, opacity: 0.85 },
  statValue: { fontSize: 36, fontWeight: 900, lineHeight: 1, color: "#fff" },
  statLabel: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.75)", marginTop: 4 },

  controlsBar: { background: "#1e293b", borderRadius: 16, padding: "16px 20px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 },
  searchWrap: { display: "flex", alignItems: "center", background: "#fff", borderRadius: 10, padding: "0 14px", border: "1.5px solid #334155" },
  searchIcon: { fontSize: 16, marginRight: 8, opacity: 0.5 },
  searchInput: { flex: 1, padding: "10px 0", border: "none", outline: "none", fontSize: 14, color: "#0f172a", background: "transparent" },
  filterPills: { display: "flex", gap: 8, flexWrap: "wrap" },
  pill: { padding: "6px 16px", borderRadius: 999, border: "1.5px solid #334155", background: "transparent", cursor: "pointer", fontSize: 13, color: "#94a3b8", fontWeight: 500, transition: "all .15s" },
  pillActive: { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "1.5px solid transparent", fontWeight: 700 },

  tableCard: { background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.15)", overflowX: "auto" },
  table: { width: "100%", minWidth: 1000, borderCollapse: "collapse", fontSize: 14 },
  theadRow: { background: "#f8fafc" },
  th: { padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8, borderBottom: "2px solid #f1f5f9" },
  tr: { transition: "background .1s" },
  td: { padding: "13px 16px", color: "#475569", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" },

  idBadge: { fontFamily: "monospace", fontSize: 12, background: "linear-gradient(135deg, #eef2ff, #f5f3ff)", color: "#6366f1", padding: "3px 10px", borderRadius: 6, fontWeight: 700, border: "1px solid #e0e7ff" },
  typeCreation: { display: "inline-block", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "linear-gradient(135deg, #dbeafe, #eff6ff)", color: "#2563eb", border: "1px solid #bfdbfe" },
  typeChange: { display: "inline-block", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "linear-gradient(135deg, #ede9fe, #f5f3ff)", color: "#7c3aed", border: "1px solid #ddd6fe" },
  statusOpen: { display: "inline-block", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg, #fef3c7, #fde68a)", color: "#92400e", border: "1px solid #fcd34d" },
  statusResolved: { display: "inline-block", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg, #d1fae5, #a7f3d0)", color: "#065f46", border: "1px solid #6ee7b7" },
  pwBadge: { fontFamily: "monospace", fontSize: 12, background: "#f5f3ff", color: "#7c3aed", padding: "3px 10px", borderRadius: 6, fontWeight: 600, border: "1px solid #ddd6fe" },

  resolveBtn: { padding: "5px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  reopenBtn: { padding: "5px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  deleteBtn: { padding: "5px 10px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 },

  refreshBtn: { padding: "8px 18px", borderRadius: 10, border: "1.5px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 14, fontWeight: 600 },
};