"use client";

import axios from "axios";
import { useEffect, useState } from "react";

const BACKEND_URL = "http://localhost:8000";

export default function Home() {
  // Authentication & Session States
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  // SaaS Project & Log States
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [newProjectName, setNewProjectName] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  // Sync token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    const savedEmail = localStorage.getItem("user_email");
    if (savedToken && savedEmail) {
      setToken(savedToken);
      setEmail(savedEmail);
    }
  }, []);

  // Fetch projects when authenticated
  async function fetchProjects(savedToken = token) {
    if (!savedToken) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/projects`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      setProjects(res.data);
      if (res.data.length > 0 && !activeProject) {
        setActiveProject(res.data[0]);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  }

  // Fetch logs for the active selected project
  async function fetchLogs() {
    if (!token || !activeProject) return;
    try {
      const res = await axios.get(
        `${BACKEND_URL}/logs?project_id=${activeProject.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  }

  // Fetch projects list once authenticated
  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  // Fetch logs whenever the active project changes or on a 3-second polling interval
  useEffect(() => {
    if (token && activeProject) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    } else {
      setLogs([]);
    }
  }, [token, activeProject]);

  // Handle User Registration & Login
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    const endpoint = isLoginMode ? "/auth/login" : "/auth/register";

    try {
      const res = await axios.post(`${BACKEND_URL}${endpoint}`, {
        email: authEmail,
        password: authPassword,
      });

      const { access_token, email: userEmail } = res.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user_email", userEmail);
      
      setToken(access_token);
      setEmail(userEmail);
      setAuthEmail("");
      setAuthPassword("");
      
      // Immediately load projects using the new token
      fetchProjects(access_token);
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || "Authentication failed. Try again.");
    }
  }

  // Handle Logging Out
  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    setToken(null);
    setEmail("");
    setProjects([]);
    setActiveProject(null);
    setLogs([]);
  }

  // Handle Project Creation
  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const res = await axios.post(
        `${BACKEND_URL}/projects`,
        { name: newProjectName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProjects([...projects, res.data]);
      setActiveProject(res.data); // Switch to the newly created project
      setNewProjectName("");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create project", err);
    }
  }

  // Copy API Key Utility
  function copyToClipboard(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  // Render Login & Registration screens if not authenticated
  if (!token) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 selection:bg-rose-500 selection:text-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 relative shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center mb-8 relative">
            <div className="inline-flex p-3 bg-neutral-800 border border-neutral-700 rounded-2xl mb-4 text-rose-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">HealStack</h1>
            <p className="text-neutral-400 text-sm mt-2">
              {isLoginMode ? "Sign in to monitor error infrastructure" : "Create developer account to start scaling"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 relative">
            {authError && (
              <div className="bg-rose-950/40 border border-rose-900/50 text-rose-400 text-xs p-3.5 rounded-xl font-medium">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5 pl-1">Email address</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="developer@healstack.io"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-4 py-3 text-sm transition outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5 pl-1">Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-4 py-3 text-sm transition outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-sm font-semibold rounded-xl py-3 mt-2 transition duration-200 shadow-lg shadow-rose-900/20"
            >
              {isLoginMode ? "Sign In" : "Get Started"}
            </button>
          </form>

          <div className="text-center mt-6 relative text-xs text-neutral-400 font-medium">
            <span>
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setAuthError("");
              }}
              className="text-rose-400 hover:text-rose-300 font-bold hover:underline transition ml-1"
            >
              {isLoginMode ? "Sign Up" : "Log In"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Render SaaS Workspace
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col selection:bg-rose-500 selection:text-white relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* TOP HEADER CONTROLS */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="inline-flex p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-rose-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <span className="text-lg font-bold tracking-tight">HealStack</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-xs text-neutral-400 font-semibold bg-neutral-900/60 border border-neutral-800/80 px-3.5 py-1.5 rounded-full">
            {email}
          </span>
          <button
            onClick={handleLogout}
            className="text-neutral-400 hover:text-white text-xs font-semibold bg-neutral-900 border border-neutral-800 hover:border-neutral-700 px-4 py-2 rounded-xl transition duration-150"
          >
            Logout
          </button>
        </div>
      </header>

      {/* DASHBOARD WORKSPACE */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
        
        {/* SIDE PANEL: PROJECTS LIST & KEY MANAGER */}
        <section className="lg:col-span-1 flex flex-col space-y-6">
          <div className="bg-neutral-900 border border-neutral-800/60 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Projects</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex p-1.5 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-rose-400 hover:text-rose-300 rounded-lg transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>

            {projects.length === 0 ? (
              <p className="text-neutral-500 text-xs italic py-4 text-center">No projects created yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => setActiveProject(proj)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-150 text-left border ${
                      activeProject?.id === proj.id
                        ? "bg-rose-950/20 border-rose-500/30 text-rose-400"
                        : "bg-neutral-950/30 border-transparent text-neutral-400 hover:text-white hover:bg-neutral-800/50 hover:border-neutral-800"
                    }`}
                  >
                    <span>{proj.name}</span>
                    {activeProject?.id === proj.id && (
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ACTIVE PROJECT SECURE API KEY */}
          {activeProject && (
            <div className="bg-neutral-900 border border-neutral-800/60 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">Credentials</h2>
              <div className="space-y-4">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1.5">Project ID</span>
                  <div className="bg-neutral-950 border border-neutral-850 px-3.5 py-2 rounded-xl text-xs font-mono text-neutral-400 border border-neutral-850">
                    {activeProject.id}
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1.5">API KEY</span>
                  <div className="flex space-x-2">
                    <input
                      type="password"
                      readOnly
                      value={activeProject.api_key}
                      className="flex-1 bg-neutral-950 border border-neutral-850 px-3.5 py-2 rounded-xl text-xs font-mono text-neutral-400 border border-neutral-850 outline-none select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(activeProject.api_key)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition ${
                        copiedKey
                          ? "bg-green-950/20 border-green-500/30 text-green-400"
                          : "bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-300"
                      }`}
                    >
                      {copiedKey ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* LOG PANEL: ACTIVE INCOMING LOGS */}
        <section className="lg:col-span-3 flex flex-col space-y-6">
          <div className="bg-neutral-900 border border-neutral-800/60 rounded-3xl p-6 shadow-xl flex-1 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/[0.02] rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-5 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <h2 className="text-lg font-bold tracking-tight">
                  {activeProject ? `Observability Console: ${activeProject.name}` : "Observability Console"}
                </h2>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                {logs.length} Total Logs
              </span>
            </div>

            {/* Logs List Container */}
            {logs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-neutral-500 space-y-4">
                <div className="p-4 bg-neutral-950 border border-neutral-850 text-neutral-600 rounded-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-400">Waiting for live error logs...</p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
                    Once you trigger crashes or API failures in your SDK example app, they will show up here instantly.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                {logs.map((log) => {
                  // Style configurations based on severity
                  const isHigh = log.analysis?.severity === "High";
                  const isMed = log.analysis?.severity === "Medium";
                  
                  let severityBorder = "border-neutral-800";
                  let severityPill = "bg-neutral-850 text-neutral-400 border-neutral-800";
                  
                  if (isHigh) {
                    severityBorder = "border-rose-950/70 hover:border-rose-500/30 bg-rose-950/5";
                    severityPill = "bg-rose-950/20 text-rose-400 border-rose-500/20";
                  } else if (isMed) {
                    severityBorder = "border-amber-950/70 hover:border-amber-500/30 bg-amber-950/5";
                    severityPill = "bg-amber-950/20 text-amber-400 border-amber-500/20";
                  } else if (log.analysis?.severity === "Low") {
                    severityBorder = "border-emerald-950/70 hover:border-emerald-500/30 bg-emerald-950/5";
                    severityPill = "bg-emerald-950/20 text-emerald-400 border-emerald-500/20";
                  }

                  const isApiFail = log.type === "API Failure";

                  return (
                    <div
                      key={log.id}
                      className={`p-6 border rounded-2xl transition duration-200 shadow-md ${severityBorder}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div className="flex items-center space-x-2.5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border tracking-wider ${
                            isApiFail ? "bg-cyan-950/20 text-cyan-400 border-cyan-500/20" : "bg-purple-950/20 text-purple-400 border-purple-500/20"
                          }`}>
                            {log.type}
                          </span>
                          <span className="text-[10px] bg-neutral-950 text-neutral-400 border border-neutral-850 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                            {log.data?.platform}
                          </span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border tracking-wider ${severityPill}`}>
                          {log.analysis?.severity || "Unknown"}
                        </span>
                      </div>

                      {/* Log raw error payload details */}
                      <div className="bg-neutral-950 border border-neutral-850/80 rounded-xl p-4 mb-4">
                        <p className="text-xs font-semibold text-neutral-300 font-mono break-all">{log.data?.message}</p>
                        
                        {isApiFail && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-neutral-900 text-xs font-mono">
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider font-semibold text-neutral-500">Method</span>
                              <span className="text-cyan-400 font-bold">{log.data?.method}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider font-semibold text-neutral-500">Status</span>
                              <span className={log.data?.statusCode >= 500 ? "text-rose-400 font-bold" : "text-amber-400 font-bold"}>
                                {log.data?.statusCode || "Network Err"}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider font-semibold text-neutral-500">Retries</span>
                              <span className="text-neutral-400 font-bold">{log.data?.retryCount}</span>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                              <span className="block text-[9px] uppercase tracking-wider font-semibold text-neutral-500">Target URL</span>
                              <span className="text-neutral-400 truncate block max-w-xs">{log.data?.url}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* HealStack AI Diagnosis Core */}
                      <div className="bg-neutral-950 border border-neutral-850/50 rounded-xl p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/[0.01] rounded-full blur-2xl pointer-events-none" />
                        
                        <div className="flex items-center space-x-2 mb-3.5 text-xs font-bold text-rose-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                          <span className="uppercase tracking-widest text-[10px] font-extrabold">HealStack AI Diagnostic</span>
                        </div>

                        <div className="space-y-3.5 text-xs leading-relaxed">
                          <div>
                            <span className="block text-[9px] font-extrabold uppercase tracking-widest text-neutral-500 mb-1">Root Cause Diagnosis</span>
                            <p className="text-neutral-350 font-medium">{log.analysis?.cause}</p>
                          </div>
                          <div>
                            <span className="block text-[9px] font-extrabold uppercase tracking-widest text-neutral-500 mb-1">Suggested Self-Healing Recovery</span>
                            <div className="bg-neutral-900 border border-neutral-850/80 px-3.5 py-3 rounded-lg text-rose-200/90 font-mono text-[11px] select-all break-all whitespace-pre-wrap">
                              {log.analysis?.solution}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="text-[10px] text-neutral-500 font-semibold mt-4 text-right">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* CREATE NEW PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 relative shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. My Production Flutter App"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-4 py-3 text-sm transition outline-none"
                />
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewProjectName("");
                  }}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-sm font-semibold rounded-xl py-3 transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl py-3 transition duration-150 shadow-md shadow-rose-900/20"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
