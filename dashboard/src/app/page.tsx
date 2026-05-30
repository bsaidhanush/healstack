"use client";

import axios from "axios";
import { useEffect, useState, useRef } from "react";

const BACKEND_URL = "http://localhost:8000";

type ActiveTab = 
  | "overview" 
  | "analytics" 
  | "monitoring" 
  | "session-replay" 
  | "heatmaps" 
  | "releases" 
  | "alerts" 
  | "plugins" 
  | "team";

type MonitoringSubTab = "performance" | "crashes" | "api";

export default function Home() {
  // Authentication & Session States
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  // Workspace Configurations
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [monitoringTab, setMonitoringTab] = useState<MonitoringSubTab>("performance");
  const [environment, setEnvironment] = useState<string>("production");

  // SaaS Project & Log States
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [newProjectName, setNewProjectName] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  // Dynamic Seeded Analytics & Summary Metrics
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);

  // AI Copilot State
  const [copilotQuery, setCopilotQuery] = useState<string>("");
  const [copilotHistory, setCopilotHistory] = useState<Array<{ sender: "user" | "copilot"; text: string }>>([
    {
      sender: "copilot",
      text: "### Welcome to HealStack AI Copilot! 🤖\nI am connected to your live and historical project telemetry data.\n\nHere are some questions I can assist you with:\n* 🔍 **Why are checkout funnels dropping?**\n* 💥 **What caused the latest exception spike?**\n* 🚀 **Which release introduced the memory leak anomaly?**\n\nAsk me anything!"
    }
  ]);
  const [isCopilotTyping, setIsCopilotTyping] = useState<boolean>(false);
  const copilotEndRef = useRef<HTMLDivElement>(null);

  // Interactive Self-Healing Sandbox State
  const [simulatingType, setSimulatingType] = useState<string | null>(null);
  const [simulationLog, setSimulationLog] = useState<string | null>(null);
  const [healingAlerts, setHealingAlerts] = useState<any[]>([]);

  // Session Replay Player State
  const [replayPlaying, setReplayPlaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);
  const [replayProgress, setReplayProgress] = useState<number>(0);
  const [replayStep, setReplayStep] = useState<number>(0);

  // Webhook Alerts Inputs
  const [alertSlackUrl, setAlertSlackUrl] = useState<string>("https://hooks.slack.com/services/T000/B000/X000");
  const [alertDiscordUrl, setAlertDiscordUrl] = useState<string>("https://discord.com/api/webhooks/000000000000000000/xxxxxx");
  const [webhookConfigStatus, setWebhookConfigStatus] = useState<string | null>(null);

  // Plugin Marketplace States
  const [pluginsStatus, setPluginsStatus] = useState<Record<string, boolean>>({
    aws_cloudwatch: false,
    openai_diagnostics: true,
    vercel_rollback: false,
    security_audits: false,
    slack_notify: false
  });

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

  // Fetch custom analytical models
  async function fetchAnalyticsSummary() {
    if (!token || !activeProject) return;
    setIsLoadingAnalytics(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/analytics/summary?project_id=${activeProject.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalytics(res.data);
      if (res.data.plugins) {
        setPluginsStatus(res.data.plugins);
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }

  // Initial loads
  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  // Load telemetry logs & analytics when active project updates
  useEffect(() => {
    if (token && activeProject) {
      fetchLogs();
      fetchAnalyticsSummary();
    }
  }, [token, activeProject]);

  // Real-time WebSocket connection to ingest live streamed events
  useEffect(() => {
    if (!token || !activeProject) return;

    let ws: WebSocket;
    const connectWS = () => {
      ws = new WebSocket("ws://localhost:8000/ws/logs");

      ws.onmessage = (event) => {
        try {
          const logData = JSON.parse(event.data);
          if (logData.project_id === activeProject.id) {
            // Append incoming live log dynamically to logs list
            setLogs((prevLogs) => [
              {
                id: logData.id,
                project_id: logData.project_id,
                type: logData.type,
                data: logData.data,
                analysis: logData.analysis,
                timestamp: logData.timestamp
              },
              ...prevLogs
            ]);

            // Dynamically increment live counters
            if (analytics) {
              setAnalytics((prev: any) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  summary: {
                    ...prev.summary,
                    active_sessions: prev.summary.active_sessions + 1,
                    health_score: Math.max(90, prev.summary.health_score - 1)
                  }
                };
              });
            }

            // Fire temporary dashboard pop toast for user feedback
            const toastId = Math.random();
            setHealingAlerts((prev) => [
              ...prev,
              {
                id: toastId,
                message: `[Auto-Healing] Captured critical ${logData.type} - Resolving error state...`,
                timestamp: new Date().toLocaleTimeString()
              }
            ]);
            setTimeout(() => {
              setHealingAlerts((prev) => prev.filter((t) => t.id !== toastId));
            }, 6000);
          }
        } catch (err) {
          console.error("WS parsing error", err);
        }
      };

      ws.onclose = () => {
        // Retry connection after 5 seconds if connection drops
        setTimeout(connectWS, 5000);
      };
    };

    connectWS();
    return () => {
      if (ws) ws.close();
    };
  }, [token, activeProject, analytics]);

  // Scroll AI copilot window to bottom
  useEffect(() => {
    copilotEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [copilotHistory]);

  // Session Replay progress slider timeline simulation
  useEffect(() => {
    let timer: any;
    if (replayPlaying) {
      timer = setInterval(() => {
        setReplayProgress((prev) => {
          if (prev >= 100) {
            setReplayPlaying(false);
            return 0;
          }
          return prev + (0.5 * replaySpeed);
        });
        setReplayStep((prev) => (prev >= 4 ? 0 : prev + 1));
      }, 100);
    }
    return () => clearInterval(timer);
  }, [replayPlaying, replaySpeed]);

  // Handle User registration / log in
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

      fetchProjects(access_token);
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || "Authentication failed. Try again.");
    }
  }

  // Handle Logout
  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    setToken(null);
    setEmail("");
    setProjects([]);
    setActiveProject(null);
    setLogs([]);
    setAnalytics(null);
    setActiveTab("overview");
  }

  // Handle Project creation
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
      setActiveProject(res.data); // Switch to created project
      setNewProjectName("");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create project", err);
    }
  }

  // Trigger Dynamic Simulation Actions in the Sandbox
  async function triggerSimulation(type: string) {
    if (!token || !activeProject) return;
    setSimulatingType(type);
    setSimulationLog(null);

    try {
      const res = await axios.post(
        `${BACKEND_URL}/self-heal/simulate`,
        { type, project_id: activeProject.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Save simulator output logs to display
      setSimulationLog(res.data.healing.output);
      fetchLogs();
      fetchAnalyticsSummary();
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setSimulatingType(null);
    }
  }

  // Configure Webhook alerts
  async function configureWebhook(channel: string, url: string) {
    if (!token || !activeProject) return;
    setWebhookConfigStatus("Saving...");
    try {
      await axios.post(
        `${BACKEND_URL}/alerts/configure`,
        { project_id: activeProject.id, channel_type: channel, webhook_url: url },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWebhookConfigStatus(`Successfully configured ${channel} channel!`);
      fetchAnalyticsSummary();
      setTimeout(() => setWebhookConfigStatus(null), 3000);
    } catch (err) {
      setWebhookConfigStatus("Failed to configure webhook.");
      setTimeout(() => setWebhookConfigStatus(null), 3000);
    }
  }

  // Toggle Marketplace Plugin status
  async function togglePlugin(pluginName: string, active: boolean) {
    if (!token || !activeProject) return;
    // Optimistically toggle plugin state
    setPluginsStatus((prev) => ({ ...prev, [pluginName]: active }));

    try {
      await axios.post(
        `${BACKEND_URL}/plugins/toggle`,
        { project_id: activeProject.id, plugin_name: pluginName, is_enabled: active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAnalyticsSummary();
    } catch (err) {
      console.error("Failed to toggle plugin", err);
    }
  }

  // AI Copilot conversational chat pipeline handler
  async function handleCopilotChat(e: React.FormEvent) {
    e.preventDefault();
    if (!copilotQuery.trim() || !token || !activeProject) return;

    const userMessage = copilotQuery;
    setCopilotQuery("");
    setCopilotHistory((prev) => [...prev, { sender: "user", text: userMessage }]);
    setIsCopilotTyping(true);

    try {
      const res = await axios.post(
        `${BACKEND_URL}/copilot/chat`,
        { message: userMessage, project_id: activeProject.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCopilotHistory((prev) => [
        ...prev,
        { sender: "copilot", text: res.data.response }
      ]);
    } catch (err) {
      setCopilotHistory((prev) => [
        ...prev,
        { sender: "copilot", text: "I encountered a communication interruption parsing your telemetry request. Verify your API setup." }
      ]);
    } finally {
      setIsCopilotTyping(false);
    }
  }

  // Copy API Key Helper
  function copyToClipboard(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  // Simulated Session Replay Screen frames
  const sessionFrames = [
    {
      title: "1. Navigation Event",
      url: "https://shop.healstack.io/login",
      action: "Customer accessed the secure OAuth portal page.",
      status: "HTTP 200 OK",
      type: "nav"
    },
    {
      title: "2. Form Submission",
      url: "https://shop.healstack.io/api/v1/auth",
      action: "Login submitted successfully.",
      status: "HTTP 200 OK",
      type: "api"
    },
    {
      title: "3. Shopping Cart Interactions",
      url: "https://shop.healstack.io/checkout",
      action: "Clicked 'Checkout Billing Details' button.",
      status: "Rage clicks trapped (4 fast consecutive triggers)",
      type: "warn"
    },
    {
      title: "4. Network Transaction Failure",
      url: "https://api.stripe.com/v3/charges",
      action: "Trapped: HTTP 504 Gateway Connection Timeout.",
      status: "CRITICAL FAILURE DETECTED",
      type: "fail"
    },
    {
      title: "5. Autonomous Self-Healing Recovery State",
      url: "https://api-fallback.stripe.com/v3/charges",
      action: "Switched dynamically to backup node in 140ms.",
      status: "RECOVERED AUTOMATICALLY - SUCCESS",
      type: "heal"
    }
  ];

  // Render Login Screen if unauthenticated
  if (!token) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 selection:bg-rose-500 selection:text-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 relative shadow-2xl overflow-hidden glass-panel">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center mb-8 relative">
            <div className="inline-flex p-3 bg-neutral-800 border border-neutral-700 rounded-2xl mb-4 text-rose-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">HealStack 3.0</h1>
            <p className="text-neutral-400 text-sm mt-2 font-medium">
              {isLoginMode ? "Sign in to deploy your self-healing telemetry system" : "Configure developer workspaces to get started"}
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
                className="w-full bg-neutral-950 border border-neutral-850 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-4 py-3 text-sm transition outline-none"
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
                className="w-full bg-neutral-950 border border-neutral-850 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-4 py-3 text-sm transition outline-none"
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
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col selection:bg-rose-500 selection:text-white relative font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* TOP SAAS SHELL CONTROLS */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3.5">
            <div className="inline-flex p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-rose-500 shadow-md shadow-rose-950/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent">HealStack</span>
            <span className="text-[10px] bg-rose-950 border border-rose-500/30 text-rose-400 font-extrabold uppercase px-2 py-0.5 rounded-full tracking-widest animate-pulse">v3.0 PRO</span>
          </div>

          {/* ACTIVE PROJECT SELECTION LIST */}
          <div className="hidden md:flex items-center space-x-2">
            <span className="text-neutral-500 text-xs font-semibold">Project:</span>
            {projects.length === 0 ? (
              <button onClick={() => setShowCreateModal(true)} className="text-rose-400 hover:text-rose-300 text-xs font-bold transition">
                + Create First Project
              </button>
            ) : (
              <select
                value={activeProject?.id || ""}
                onChange={(e) => {
                  const proj = projects.find((p) => p.id === parseInt(e.target.value));
                  if (proj) setActiveProject(proj);
                }}
                className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-350 outline-none cursor-pointer focus:border-rose-500"
              >
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* ENVIRONMENT SELECTOR */}
          <div className="hidden lg:flex items-center space-x-1 bg-neutral-900 border border-neutral-850 p-1 rounded-xl">
            {["production", "staging", "development"].map((env) => (
              <button
                key={env}
                onClick={() => setEnvironment(env)}
                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition ${
                  environment === env
                    ? "bg-rose-600 text-white shadow-md shadow-rose-950/20"
                    : "text-neutral-500 hover:text-neutral-350"
                }`}
              >
                {env}
              </button>
            ))}
          </div>
        </div>

        {/* LOGOUT & USER INFO */}
        <div className="flex items-center space-x-4">
          <span className="hidden sm:inline-block text-xs text-neutral-400 font-semibold bg-neutral-900/60 border border-neutral-800 px-3.5 py-1.5 rounded-xl">
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

      {/* FLOATING ACTION TOASTS LIST FOR INTERACTIVE SELF-HEALING NOTIFICATIONS */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 pointer-events-none">
        {healingAlerts.map((t) => (
          <div
            key={t.id}
            className="p-4 bg-rose-950/90 border border-rose-500/50 text-rose-200 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold animate-slide-left pointer-events-auto duration-300"
          >
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <div className="flex-1">
              <p>{t.message}</p>
              <span className="text-[9px] text-rose-400 font-medium block mt-0.5">{t.timestamp}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ACTIVE INTERACTIVE SELF-HEALING SANDBOX CONTROLS PANEL */}
      <section className="bg-neutral-900 border-b border-neutral-850 py-3.5 px-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <span className="inline-flex p-1 bg-amber-950 border border-amber-500/30 text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider">
            SANDBOX MODE
          </span>
          <p className="text-xs text-neutral-400 font-semibold leading-relaxed">
            Trigger custom mock failures in the telemetry environment & monitor active HealStack recovery loops:
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => triggerSimulation("stripe_timeout")}
            disabled={simulatingType !== null || !activeProject}
            className="px-3.5 py-1.5 bg-neutral-950 hover:bg-neutral-850 text-xs font-bold border border-rose-500/20 text-rose-400 rounded-xl transition duration-150"
          >
            {simulatingType === "stripe_timeout" ? "Simulation Active..." : "⚡ Stripe 504 Timeout"}
          </button>
          <button
            onClick={() => triggerSimulation("react_render_crash")}
            disabled={simulatingType !== null || !activeProject}
            className="px-3.5 py-1.5 bg-neutral-950 hover:bg-neutral-850 text-xs font-bold border border-purple-500/20 text-purple-400 rounded-xl transition duration-150"
          >
            {simulatingType === "react_render_crash" ? "Simulation Active..." : "⚡ React Render Error"}
          </button>
          <button
            onClick={() => triggerSimulation("db_bottleneck")}
            disabled={simulatingType !== null || !activeProject}
            className="px-3.5 py-1.5 bg-neutral-950 hover:bg-neutral-850 text-xs font-bold border border-cyan-500/20 text-cyan-400 rounded-xl transition duration-150"
          >
            {simulatingType === "db_bottleneck" ? "Simulation Active..." : "⚡ DB Connection Spike"}
          </button>
          <button
            onClick={() => triggerSimulation("memory_leak")}
            disabled={simulatingType !== null || !activeProject}
            className="px-3.5 py-1.5 bg-neutral-950 hover:bg-neutral-850 text-xs font-bold border border-amber-500/20 text-amber-400 rounded-xl transition duration-150"
          >
            {simulatingType === "memory_leak" ? "Simulation Active..." : "⚡ Process Memory Leak"}
          </button>
        </div>
      </section>

      {/* DASHBOARD WORKSPACE GRID */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR NAVIGATION PANEL */}
        <aside className="w-64 border-r border-neutral-900 bg-neutral-950/40 hidden md:flex flex-col p-4 space-y-1">
          <div className="pb-4 mb-4 border-b border-neutral-900 pl-3">
            <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">OPERATIONAL CONSOLE</span>
          </div>

          {[
            { id: "overview", name: "Executive Overview", icon: "📊" },
            { id: "analytics", name: "Analytics Hub", icon: "🎯" },
            { id: "monitoring", name: "Monitoring Center", icon: "🛠️" },
            { id: "session-replay", name: "Session Replay", icon: "📼" },
            { id: "heatmaps", name: "Interactive Heatmaps", icon: "🔥" },
            { id: "releases", name: "Release Intelligence", icon: "🚀" },
            { id: "alerts", name: "Alert Settings", icon: "🔔" },
            { id: "plugins", name: "Plugin Marketplace", icon: "🔌" },
            { id: "team", name: "Team Settings", icon: "👥" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition duration-150 text-left ${
                activeTab === tab.id
                  ? "bg-rose-950/20 text-rose-400 border-l-2 border-rose-500 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900/60"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}

          {/* QUICK CREDENTIALS PANEL */}
          {activeProject && (
            <div className="mt-auto p-4 bg-neutral-900/40 border border-neutral-850 rounded-2xl text-[10px] space-y-3">
              <div>
                <span className="text-neutral-500 font-bold uppercase tracking-wider block mb-1">API Key Integration</span>
                <div className="flex space-x-1.5">
                  <input
                    type="password"
                    readOnly
                    value={activeProject.api_key}
                    className="flex-1 bg-neutral-950 border border-neutral-850 px-2 py-1 rounded-lg text-neutral-400 text-xs font-mono outline-none select-all text-center"
                  />
                  <button
                    onClick={() => copyToClipboard(activeProject.api_key)}
                    className="px-2 py-1 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition font-bold"
                  >
                    {copiedKey ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN PANEL WORKSPACE */}
        <section className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 relative">
          
          {/* SIMULATOR RESPONSE CODE BLOCK DISPLAY (if any simulated action was clicked) */}
          {simulationLog && (
            <div className="bg-neutral-950 border border-rose-500/20 rounded-3xl p-5 shadow-2xl animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/[0.02] rounded-full blur-2xl" />
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs">
                  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                  <span className="uppercase tracking-widest text-[10px]">HealStack Autonomous Self-Healing Log Output</span>
                </div>
                <button
                  onClick={() => setSimulationLog(null)}
                  className="text-neutral-500 hover:text-neutral-350 text-xs font-bold"
                >
                  ✕ Close Console
                </button>
              </div>
              <pre className="text-[11px] font-mono leading-relaxed text-rose-100 bg-neutral-900/50 p-4 border border-neutral-850 rounded-2xl overflow-x-auto select-all max-h-52 whitespace-pre-wrap">
                {simulationLog}
              </pre>
            </div>
          )}

          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">Executive Operational Overview</h2>

              {/* KPI DASHBOARD CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                
                <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-3xl relative overflow-hidden glass-card">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/[0.02] rounded-full blur-2xl" />
                  <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-2">SYSTEM HEALTH SCORE</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-black">{analytics?.summary?.health_score || 96}%</span>
                    <span className="text-xs text-emerald-400 font-bold">▲ Optimal</span>
                  </div>
                  <div className="mt-3.5 h-1 w-full bg-neutral-950 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${analytics?.summary?.health_score || 96}%` }} />
                  </div>
                </div>

                <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-3xl relative overflow-hidden glass-card">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/[0.02] rounded-full blur-2xl" />
                  <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-2">CRASH-FREE USERS</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-black">{analytics?.summary?.crash_free_users || 99.8}%</span>
                    <span className="text-xs text-emerald-400 font-bold">▲ Safe</span>
                  </div>
                  <div className="mt-3.5 h-1 w-full bg-neutral-950 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${analytics?.summary?.crash_free_users || 99.8}%` }} />
                  </div>
                </div>

                <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-3xl relative overflow-hidden glass-card">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/[0.02] rounded-full blur-2xl" />
                  <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-2">AVG API LATENCY</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-black">{analytics?.summary?.avg_api_latency || 195}ms</span>
                    <span className="text-xs text-neutral-400 font-medium">Steady</span>
                  </div>
                  <div className="mt-3.5 h-1 w-full bg-neutral-950 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: "65%" }} />
                  </div>
                </div>

                <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-3xl relative overflow-hidden glass-card">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/[0.02] rounded-full blur-2xl" />
                  <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-2">HEALING SUCCESS RATE</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-black">{analytics?.summary?.healing_success_rate || 94.2}%</span>
                    <span className="text-xs text-emerald-400 font-bold">▲ High</span>
                  </div>
                  <div className="mt-3.5 h-1 w-full bg-neutral-950 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${analytics?.summary?.healing_success_rate || 94.2}%` }} />
                  </div>
                </div>

              </div>

              {/* DUAL TIMELINES AND INCOMING LOGS PREVIEW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* DYNAMIC TELEMETRY TIMELINE CHART */}
                <div className="lg:col-span-2 p-6 bg-neutral-900 border border-neutral-850 rounded-3xl relative glass-card">
                  <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">DAU / MAU Telemetry Timelines</span>
                  
                  {analytics && analytics.dau_mau ? (
                    <div className="h-64 w-full relative pt-4 flex flex-col justify-between">
                      {/* Grid Lines */}
                      <div className="absolute inset-x-0 top-4 bottom-8 flex flex-col justify-between pointer-events-none">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="border-t border-neutral-850/60 w-full" />
                        ))}
                      </div>

                      {/* SVG Line representation */}
                      <svg className="w-full h-44 overflow-visible z-10" viewBox="0 0 600 120" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="gradient-dau" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25"/>
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0"/>
                          </linearGradient>
                          <linearGradient id="gradient-mau" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.15"/>
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0"/>
                          </linearGradient>
                        </defs>

                        {/* MAU Line Area */}
                        <path
                          className="chart-line"
                          d={`M 0,${120 - (analytics.dau_mau[0].mau / 180)} ` + analytics.dau_mau.map((d: any, idx: number) => `L ${(idx / 13) * 600},${120 - (d.mau / 180)}`).join(" ")}
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="1.5"
                          strokeOpacity="0.5"
                        />
                        
                        {/* DAU Line Area */}
                        <path
                          className="chart-line"
                          d={`M 0,${120 - (analytics.dau_mau[0].dau / 35)} ` + analytics.dau_mau.map((d: any, idx: number) => `L ${(idx / 13) * 600},${120 - (d.dau / 35)}`).join(" ")}
                          fill="url(#gradient-dau)"
                          stroke="#f43f5e"
                          strokeWidth="3.5"
                        />

                        {/* Interactive dots */}
                        {analytics.dau_mau.map((d: any, idx: number) => (
                          <circle
                            key={idx}
                            cx={(idx / 13) * 600}
                            cy={120 - (d.dau / 35)}
                            r="4.5"
                            className="chart-point fill-rose-500 stroke-neutral-900 stroke-2 hover:r-6 cursor-pointer transition-all duration-150"
                          />
                        ))}
                      </svg>

                      {/* X Axis Date labels */}
                      <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-widest text-neutral-500 pt-2 border-t border-neutral-850">
                        {analytics.dau_mau.map((d: any, idx: number) => (
                          <span key={idx} className={idx % 3 === 0 ? "" : "hidden sm:inline-block"}>
                            {d.date}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-neutral-500 text-xs italic">
                      Analytics loading...
                    </div>
                  )}
                </div>

                {/* SELF-HEALING ACTION LOG AUDITS LIST */}
                <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-3xl relative overflow-hidden glass-card">
                  <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">Autonomous Healing Audits</span>

                  {analytics?.healing_actions?.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center text-neutral-500 text-xs space-y-2">
                      <span>No self-healing loops triggered yet.</span>
                      <span className="text-[10px] text-neutral-600 px-4 leading-relaxed">Click any sandbox action button above to see the AI recovery logs trigger here!</span>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[17.5rem] overflow-y-auto pr-1">
                      {analytics?.healing_actions?.slice(0, 5).map((act: any) => (
                        <div key={act.id} className="p-3 bg-neutral-950 border border-neutral-850 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wide">
                            <span className={act.success ? "text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded-md border border-emerald-500/10" : "text-rose-400 bg-rose-950/20 px-2 py-0.5 rounded-md border border-rose-500/10"}>
                              {act.action_type}
                            </span>
                            <span className="text-neutral-500">{act.timestamp}</span>
                          </div>
                          {act.target && (
                            <p className="text-[9px] font-mono text-neutral-400 truncate">{act.target}</p>
                          )}
                          <div className="flex items-center justify-between text-[9px] font-bold text-neutral-500">
                            <span>Duration: {act.duration}ms</span>
                            <span>{act.success ? "🟢 Executed OK" : "🔴 Interrupted"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: ANALYTICS HUB */}
          {activeTab === "analytics" && (
            <div className="space-y-8 animate-fade-in">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">User & Product Analytics Hub</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* CONVERSION FUNNEL CHART */}
                <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-3xl glass-card">
                  <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-5">Product Conversion Funnel</span>

                  {analytics?.funnel ? (
                    <div className="space-y-4">
                      {analytics.funnel.map((step: any, idx: number) => {
                        const rate = step.rate;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                              <span>{step.step}</span>
                              <span className="text-neutral-400 font-bold">{step.sessions} sessions ({rate}%)</span>
                            </div>
                            <div className="h-4 w-full bg-neutral-950 rounded-lg overflow-hidden border border-neutral-900">
                              <div
                                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-lg transition-all duration-700"
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 italic">No funnel data available.</p>
                  )}
                </div>

                {/* COHORT RETENTION TABLES */}
                <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-3xl glass-card">
                  <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-5">Cohort User Retention Curve</span>

                  {analytics?.retention ? (
                    <div className="h-56 w-full relative pt-4 flex flex-col justify-between">
                      {/* Grid Lines */}
                      <div className="absolute inset-x-0 top-4 bottom-8 flex flex-col justify-between pointer-events-none">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="border-t border-neutral-850/60 w-full" />
                        ))}
                      </div>

                      <svg className="w-full h-36 overflow-visible z-10" viewBox="0 0 500 100" preserveAspectRatio="none">
                        {/* Area */}
                        <path
                          className="chart-line"
                          d={`M 0,${100 - analytics.retention[0].retention} ` + analytics.retention.map((d: any, idx: number) => `L ${(idx / 6) * 500},${100 - d.retention}`).join(" ")}
                          fill="url(#gradient-dau)"
                          stroke="#f43f5e"
                          strokeWidth="3"
                        />
                        {/* Interactive dots */}
                        {analytics.retention.map((d: any, idx: number) => (
                          <circle
                            key={idx}
                            cx={(idx / 6) * 500}
                            cy={100 - d.retention}
                            r="4.5"
                            className="chart-point fill-rose-500 stroke-neutral-900 stroke-2 hover:r-6 cursor-pointer transition-all duration-150"
                          />
                        ))}
                      </svg>

                      {/* X labels */}
                      <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-widest text-neutral-500 pt-2 border-t border-neutral-850">
                        {analytics.retention.map((d: any) => (
                          <span key={d.day}>{d.day}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 italic">No retention data available.</p>
                  )}
                </div>

              </div>

              {/* GEOGRAPHIC USER INSIGHTS LIST */}
              <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-3xl glass-card">
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-5">Geographic Active Segments</span>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {analytics?.geo?.map((geo: any, idx: number) => (
                    <div key={idx} className="p-4 bg-neutral-950 border border-neutral-850 rounded-2xl text-center space-y-1.5">
                      <span className="text-2xl">
                        {geo.country === "United States" && "🇺🇸"}
                        {geo.country === "United Kingdom" && "🇬🇧"}
                        {geo.country === "Germany" && "🇩🇪"}
                        {geo.country === "India" && "🇮🇳"}
                        {geo.country === "Singapore" && "🇸🇬"}
                      </span>
                      <span className="block text-xs font-bold text-neutral-300">{geo.country}</span>
                      <span className="block text-lg font-black text-rose-400">{geo.sessions}</span>
                      <span className="block text-[9px] text-neutral-500 font-mono">lat: {geo.lat}, lng: {geo.lng}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: MONITORING CENTER */}
          {activeTab === "monitoring" && (
            <div className="space-y-6 animate-fade-in">
              
              {/* SUB HEADER CONTROLS */}
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">Monitoring Center</h2>
                
                <div className="flex items-center space-x-1.5 bg-neutral-900 border border-neutral-850 p-1 rounded-xl">
                  {[
                    { id: "performance", name: "Performance Timelines", icon: "🕒" },
                    { id: "crashes", name: "Crash Reports", icon: "💥" },
                    { id: "api", name: "API Monitoring", icon: "🌐" }
                  ].map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setMonitoringTab(subTab.id as MonitoringSubTab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                        monitoringTab === subTab.id
                          ? "bg-rose-600 text-white shadow"
                          : "text-neutral-450 hover:text-white"
                      }`}
                    >
                      <span>{subTab.icon}</span>
                      <span>{subTab.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SUBTAB A: PERFORMANCE TIMELINES */}
              {monitoringTab === "performance" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                  
                  {/* CPU USAGE TRENDS */}
                  <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-3xl glass-card">
                    <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">CPU Usage Timeline (%)</span>
                    
                    {analytics?.cpu ? (
                      <div className="h-56 w-full relative pt-4 flex flex-col justify-between">
                        {/* Grid Lines */}
                        <div className="absolute inset-x-0 top-4 bottom-8 flex flex-col justify-between pointer-events-none">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="border-t border-neutral-850/60 w-full" />
                          ))}
                        </div>

                        <svg className="w-full h-36 overflow-visible z-10" viewBox="0 0 500 100" preserveAspectRatio="none">
                          <path
                            className="chart-line"
                            d={`M 0,${100 - analytics.cpu[0].value} ` + analytics.cpu.map((d: any, idx: number) => `L ${(idx / 11) * 500},${100 - d.value}`).join(" ")}
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="3.5"
                          />
                        </svg>

                        {/* X Axis */}
                        <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-widest text-neutral-500 pt-2 border-t border-neutral-850">
                          {analytics.cpu.map((d: any, idx: number) => (
                            <span key={idx} className={idx % 3 === 0 ? "" : "hidden sm:inline-block"}>
                              {d.time}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500 italic">Telemetry loading...</p>
                    )}
                  </div>

                  {/* MEMORY USAGE TRENDS */}
                  <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-3xl glass-card">
                    <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">Memory Footprint (MB)</span>
                    
                    {analytics?.memory ? (
                      <div className="h-56 w-full relative pt-4 flex flex-col justify-between">
                        {/* Grid Lines */}
                        <div className="absolute inset-x-0 top-4 bottom-8 flex flex-col justify-between pointer-events-none">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="border-t border-neutral-850/60 w-full" />
                          ))}
                        </div>

                        <svg className="w-full h-36 overflow-visible z-10" viewBox="0 0 500 100" preserveAspectRatio="none">
                          <path
                            className="chart-line"
                            d={`M 0,${100 - (analytics.memory[0].value / 4.5)} ` + analytics.memory.map((d: any, idx: number) => `L ${(idx / 11) * 500},${100 - (d.value / 4.5)}`).join(" ")}
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="3.5"
                          />
                        </svg>

                        {/* X Axis */}
                        <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-widest text-neutral-500 pt-2 border-t border-neutral-850">
                          {analytics.memory.map((d: any, idx: number) => (
                            <span key={idx} className={idx % 3 === 0 ? "" : "hidden sm:inline-block"}>
                              {d.time}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500 italic">Telemetry loading...</p>
                    )}
                  </div>

                </div>
              )}

              {/* SUBTAB B: CRASH REPORTS LIST */}
              {monitoringTab === "crashes" && (
                <div className="bg-neutral-900 border border-neutral-850 rounded-3xl p-6 shadow-xl relative overflow-hidden glass-panel animate-fade-in">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/[0.01] rounded-full blur-3xl" />
                  
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-5 mb-6">
                    <h3 className="text-lg font-bold tracking-tight">Active Exception & Crash Groupings</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 bg-neutral-950 border border-neutral-850 px-3 py-1 rounded-full">
                      {logs.filter((l) => l.type === "Frontend Error").length} Grouped Crashes
                    </span>
                  </div>

                  {logs.filter((l) => l.type === "Frontend Error").length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500 space-y-3">
                      <p className="text-sm font-semibold">No active frontend exceptions caught yet.</p>
                      <p className="text-xs max-w-xs text-neutral-600">Trigger standard failures in your Sandbox panel above to see the logs populate here instantly!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {logs.filter((l) => l.type === "Frontend Error").map((log) => (
                        <div key={log.id} className="p-5 border border-rose-950/40 bg-rose-950/[0.02] rounded-2xl relative">
                          
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <span className="text-[10px] font-extrabold uppercase bg-rose-950/40 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full tracking-wider">
                              {log.analysis?.severity || "High"}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>

                          <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 font-mono text-xs text-neutral-300 break-all mb-4">
                            {log.data?.message}
                          </div>

                          {/* Expanded AI Diagnostician card */}
                          <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 space-y-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/[0.01] rounded-full blur-2xl" />
                            <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-400">
                              <span>🤖</span>
                              <span className="uppercase tracking-widest text-[9px]">HealStack AI Diagnostic resolution</span>
                            </div>
                            <div className="space-y-2.5 text-xs leading-relaxed">
                              <div>
                                <span className="block text-[8px] font-black uppercase text-neutral-500 tracking-wider">Root Cause:</span>
                                <p className="text-neutral-350">{log.analysis?.cause}</p>
                              </div>
                              <div>
                                <span className="block text-[8px] font-black uppercase text-neutral-500 tracking-wider">Suggested Fix:</span>
                                <pre className="bg-neutral-900 border border-neutral-850 px-3 py-2 rounded-lg text-rose-100 font-mono text-[10px] select-all overflow-x-auto block">
                                  {log.analysis?.solution}
                                </pre>
                              </div>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB C: API MONITORING LIST */}
              {monitoringTab === "api" && (
                <div className="bg-neutral-900 border border-neutral-850 rounded-3xl p-6 shadow-xl relative overflow-hidden glass-panel animate-fade-in">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-5 mb-6">
                    <h3 className="text-lg font-bold tracking-tight">API Request Monitoring Logs</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 bg-neutral-950 border border-neutral-850 px-3 py-1 rounded-full">
                      {logs.filter((l) => l.type === "API Failure").length} API Intercepts
                    </span>
                  </div>

                  {logs.filter((l) => l.type === "API Failure").length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500 space-y-3">
                      <p className="text-sm font-semibold">No API transaction failures captured.</p>
                      <p className="text-xs max-w-xs text-neutral-600">Trigger api bottlenecks in sandbox filters above to trace API health states.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-neutral-850 text-neutral-500 font-bold uppercase text-[9px] tracking-widest">
                            <th className="py-3 px-4">Method</th>
                            <th className="py-3 px-4">Endpoint</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Retries</th>
                            <th className="py-3 px-4">Severity</th>
                            <th className="py-3 px-4">Recovery Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.filter((l) => l.type === "API Failure").map((log) => (
                            <tr key={log.id} className="border-b border-neutral-850 hover:bg-neutral-900/40 font-mono transition">
                              <td className="py-3.5 px-4 font-bold text-cyan-400">{log.data?.method}</td>
                              <td className="py-3.5 px-4 text-neutral-300 truncate max-w-xs">{log.data?.url}</td>
                              <td className="py-3.5 px-4">
                                <span className={log.data?.statusCode >= 500 ? "text-rose-400 font-bold" : "text-amber-400 font-bold"}>
                                  {log.data?.statusCode || "Timeout"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-neutral-450">{log.data?.retryCount}</td>
                              <td className="py-3.5 px-4 text-rose-400 font-bold">{log.analysis?.severity}</td>
                              <td className="py-3.5 px-4 font-sans font-medium text-emerald-400">
                                {log.analysis?.cause ? "API Fallback OK" : "Manual review"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 4: SESSION REPLAY PLAYER */}
          {activeTab === "session-replay" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">Visual Session Replay Workspace</h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* VIDEO REPLAY SCREEN CANVAS */}
                <div className="lg:col-span-2 p-6 bg-neutral-900 border border-neutral-850 rounded-3xl flex flex-col justify-between glass-card h-[29rem] relative overflow-hidden">
                  
                  {/* Background Mock Browser Header */}
                  <div className="bg-neutral-950 border border-neutral-850 rounded-2xl py-3.5 px-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="bg-neutral-900 border border-neutral-850 text-neutral-400 font-mono text-[10px] px-8 py-1 rounded-lg truncate w-1/2 text-center select-all">
                      {sessionFrames[replayStep]?.url || "https://shop.healstack.io/checkout"}
                    </div>
                    <span className="text-[10px] text-rose-400 font-bold">● Rec Stream Active</span>
                  </div>

                  {/* Browser simulated content view */}
                  <div className="flex-1 my-6 rounded-2xl border border-neutral-850/60 bg-neutral-950 flex flex-col items-center justify-center p-6 relative select-none">
                    
                    {/* Visual Mouse Cursor Bubble animation */}
                    {replayPlaying && (
                      <div className="absolute top-1/2 left-1/3 w-8 h-8 rounded-full border border-rose-500 bg-rose-500/20 rage-click-active pointer-events-none z-20 transition-all duration-300" />
                    )}

                    <div className="text-center space-y-4 max-w-sm">
                      <h4 className="text-base font-extrabold tracking-tight text-neutral-300">{sessionFrames[replayStep]?.title}</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed font-semibold">{sessionFrames[replayStep]?.action}</p>
                      
                      <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl font-mono text-xs text-rose-300">
                        {sessionFrames[replayStep]?.status}
                      </div>
                    </div>

                  </div>

                  {/* Video Player Navigation Controls */}
                  <div className="bg-neutral-950 border border-neutral-850 px-5 py-3 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setReplayPlaying(!replayPlaying)}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs font-bold rounded-xl transition flex items-center space-x-1"
                      >
                        <span>{replayPlaying ? "⏸ Pause" : "▶ Play"}</span>
                      </button>
                      
                      {/* Playback speed selector */}
                      <select
                        value={replaySpeed}
                        onChange={(e) => setReplaySpeed(parseFloat(e.target.value))}
                        className="bg-neutral-900 border border-neutral-800 text-[10px] font-bold py-1 px-2 rounded-lg text-neutral-350 outline-none"
                      >
                        <option value="1">1x Speed</option>
                        <option value="2">2x Speed</option>
                        <option value="4">4x Speed</option>
                      </select>
                    </div>

                    {/* Timeline slider tracker */}
                    <div className="flex-1 flex items-center space-x-2">
                      <span className="text-[10px] text-neutral-500 font-bold">0:00</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={replayProgress}
                        onChange={(e) => {
                          const progressVal = parseFloat(e.target.value);
                          setReplayProgress(progressVal);
                          setReplayStep(Math.min(4, Math.floor(progressVal / 20)));
                        }}
                        className="flex-1 accent-rose-600 bg-neutral-900 h-1 rounded-lg appearance-none cursor-pointer outline-none"
                      />
                      <span className="text-[10px] text-neutral-500 font-bold">0:32</span>
                    </div>

                  </div>

                </div>

                {/* PLAYBACK EVENTS TIMELINE LIST */}
                <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-3xl glass-card flex flex-col justify-between h-[29rem]">
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-5">Telemetry Events Timeline</span>
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                      {sessionFrames.map((frame, idx) => {
                        const active = replayStep === idx;
                        
                        let borderStyle = active ? "border-rose-500/50 bg-rose-950/15" : "border-neutral-850 hover:border-neutral-800";
                        let typePill = "bg-neutral-850 text-neutral-400";
                        if (frame.type === "api") typePill = "bg-cyan-950/20 text-cyan-400 border border-cyan-500/10";
                        if (frame.type === "warn") typePill = "bg-amber-950/20 text-amber-400 border border-amber-500/10";
                        if (frame.type === "fail") typePill = "bg-rose-950/20 text-rose-400 border border-rose-500/10";
                        if (frame.type === "heal") typePill = "bg-emerald-950/20 text-emerald-400 border border-emerald-500/10";

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setReplayStep(idx);
                              setReplayProgress(idx * 20);
                            }}
                            className={`p-3 border rounded-xl cursor-pointer text-left transition duration-200 ${borderStyle}`}
                          >
                            <div className="flex items-center justify-between mb-1 text-[9px] font-extrabold uppercase">
                              <span className={`px-2 py-0.5 rounded-md ${typePill}`}>{frame.type}</span>
                              <span className="text-neutral-500">T+{idx * 6}s</span>
                            </div>
                            <p className="text-xs font-bold text-neutral-300">{frame.title}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[10px] text-neutral-500 font-semibold text-center italic mt-4">
                    Session records DOM mutation deltas and syncs them to system logs.
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* TAB 5: HEATMAPS OVERLAY */}
          {activeTab === "heatmaps" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">Interactive Click & Scroll Heatmaps</h2>

              <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-3xl glass-card relative overflow-hidden">
                
                <div className="max-w-2xl mx-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-8 space-y-6 relative overflow-hidden">
                  
                  {/* Graphic overlay circles simulating high click densities */}
                  <div className="absolute top-1/4 left-1/3 w-36 h-36 bg-radial-glow rounded-full opacity-70 pointer-events-none animate-pulse" />
                  <div className="absolute top-1/3 left-1/2 w-48 h-48 bg-radial-glow rounded-full opacity-60 pointer-events-none" />
                  <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-radial-glow rounded-full opacity-50 pointer-events-none" />

                  {/* Header mock */}
                  <div className="border-b border-neutral-900 pb-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-neutral-400">HealStack Shop Layout (Home)</span>
                    <span className="text-[10px] text-rose-400 font-bold border border-rose-500/20 bg-rose-950/20 px-2 py-0.5 rounded-md">8,450 Clicks Tracked</span>
                  </div>

                  {/* HTML wireframe mockup */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 p-10 bg-neutral-900 border border-neutral-850 rounded-2xl relative text-center">
                      <span className="text-xs font-bold text-neutral-350 block mb-2">Main Call-To-Action Banner</span>
                      <span className="text-[9px] text-rose-400 font-mono bg-rose-950/30 px-2 py-0.5 rounded-md">Hot-zone: 74% clicks</span>
                    </div>
                    <div className="p-10 bg-neutral-900 border border-neutral-850 rounded-2xl text-center">
                      <span className="text-xs font-bold text-neutral-450 block">Right Widget Panel</span>
                    </div>
                  </div>

                  {/* Layout elements */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-2xl text-center space-y-1.5">
                      <span className="text-xs font-bold text-neutral-450 block">1. Product Detail Page</span>
                      <span className="text-[9px] text-amber-500 font-semibold block">Mid Density: 24% clicks</span>
                    </div>
                    <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-2xl text-center space-y-1.5">
                      <span className="text-xs font-bold text-neutral-450 block">2. Add to Cart Triggers</span>
                      <span className="text-[9px] text-rose-500 font-semibold block">Hot-zone: 62% clicks</span>
                    </div>
                    <div className="p-6 bg-neutral-900 border border-neutral-850 rounded-2xl text-center space-y-1.5">
                      <span className="text-xs font-bold text-neutral-450 block">3. Newsletter Form</span>
                      <span className="text-[9px] text-neutral-500 font-semibold block">Low Density: 4% clicks</span>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* TAB 6: RELEASE INTELLIGENCE */}
          {activeTab === "releases" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">Release Intelligence & Version Regressions</h2>

              <div className="bg-neutral-900 border border-neutral-850 rounded-3xl p-6 shadow-xl relative overflow-hidden glass-panel">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/[0.01] rounded-full blur-3xl" />
                
                <div className="flex items-center justify-between border-b border-neutral-800 pb-5 mb-6">
                  <h3 className="text-lg font-bold tracking-tight">Active Deployment Tracking</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                    {analytics?.releases?.length || 0} Total Deployed Releases
                  </span>
                </div>

                <div className="space-y-4">
                  {analytics?.releases?.map((rel: any, idx: number) => {
                    const isBeta = rel.version === "v2.1.0-beta";
                    return (
                      <div key={idx} className="p-4 bg-neutral-950 border border-neutral-850 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                          <span className="text-lg font-black text-rose-400">{rel.version}</span>
                          <span className="text-[10px] font-mono text-neutral-500">SHA: {rel.sha}</span>
                        </div>
                        <div className="flex items-center space-x-6">
                          <span className="text-xs text-neutral-450 font-semibold">{rel.deployed_at}</span>
                          
                          {/* Alert state indicators */}
                          {isBeta ? (
                            <span className="text-[10px] font-extrabold uppercase bg-rose-950 border border-rose-500/30 text-rose-400 px-3 py-1 rounded-full tracking-wider animate-pulse">
                              🔴 REGRESSED ANOMALY
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold uppercase bg-emerald-950 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full tracking-wider">
                              🟢 HEALTHY STABLE
                            </span>
                          )}

                          {isBeta && (
                            <button
                              onClick={() => triggerSimulation("memory_leak")}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition duration-150 shadow"
                            >
                              ⚡ Rollback Release
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>
          )}

          {/* TAB 7: ALERT SETTINGS */}
          {activeTab === "alerts" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">Alert Center & Channel Webhooks</h2>

              <div className="bg-neutral-900 border border-neutral-850 rounded-3xl p-6 shadow-xl relative overflow-hidden glass-panel">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/[0.01] rounded-full blur-3xl" />
                
                <h3 className="text-lg font-bold tracking-tight border-b border-neutral-800 pb-5 mb-6">Configure Telemetry Notification Integrations</h3>

                {webhookConfigStatus && (
                  <div className="bg-rose-950/40 border border-rose-950 text-rose-400 text-xs p-3.5 rounded-xl mb-4 font-bold">
                    {webhookConfigStatus}
                  </div>
                )}

                <div className="space-y-6">
                  
                  {/* SLACK ALERTS BINDING */}
                  <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-2xl space-y-4">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-xl">💬</span>
                      <span className="text-sm font-bold text-neutral-350">Slack Webhook Target</span>
                    </div>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={alertSlackUrl}
                        onChange={(e) => setAlertSlackUrl(e.target.value)}
                        className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-xs font-mono text-neutral-400 outline-none"
                      />
                      <button
                        onClick={() => configureWebhook("slack", alertSlackUrl)}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition duration-150"
                      >
                        Save & Test Alert
                      </button>
                    </div>
                  </div>

                  {/* DISCORD ALERTS BINDING */}
                  <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-2xl space-y-4">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-xl">👾</span>
                      <span className="text-sm font-bold text-neutral-350">Discord Hook Target</span>
                    </div>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={alertDiscordUrl}
                        onChange={(e) => setAlertDiscordUrl(e.target.value)}
                        className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-xs font-mono text-neutral-400 outline-none"
                      />
                      <button
                        onClick={() => configureWebhook("discord", alertDiscordUrl)}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition duration-150"
                      >
                        Save & Test Alert
                      </button>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 8: PLUGIN MARKETPLACE */}
          {activeTab === "plugins" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">Modular Plugin Marketplace</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {[
                  { id: "openai_diagnostics", name: "OpenAI AI Diagnostic Engine", desc: "Unlock deep structural diagnoses using GPT-4o models directly on stack trace exceptions.", category: "AI Integration" },
                  { id: "aws_cloudwatch", name: "AWS CloudWatch Sync", desc: "Publish application health indices and retry events contextually back to CloudWatch logs.", category: "Cloud Integration" },
                  { id: "vercel_rollback", name: "Vercel CD Rollback integration", desc: "Automate continuous rollback of Vercel production builds upon release regression thresholds.", category: "Deployment" },
                  { id: "security_audits", name: "Security Audit micro-plugin", desc: "Traps credential injection attempts or raw password leaking metrics inside client payloads.", category: "Security" },
                  { id: "slack_notify", name: "Slack Telemetry Webhook Channel", desc: "Publish automatic diagnostic reports on Slack streams when exceptions caught.", category: "Alerts Integration" }
                ].map((plugin) => {
                  const enabled = pluginsStatus[plugin.id] || false;
                  return (
                    <div key={plugin.id} className="p-6 bg-neutral-900 border border-neutral-850 rounded-3xl relative overflow-hidden glass-card flex flex-col justify-between h-56">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/[0.01] rounded-full blur-2xl" />
                      
                      <div className="space-y-2.5">
                        <span className="text-[9px] font-black bg-rose-950/40 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider block w-max">
                          {plugin.category}
                        </span>
                        <h4 className="text-sm font-extrabold text-neutral-300">{plugin.name}</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed font-semibold">{plugin.desc}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-neutral-850 pt-4 mt-4">
                        <span className="text-xs text-neutral-400 font-bold">{enabled ? "🟢 Enabled" : "🔴 Disabled"}</span>
                        <button
                          onClick={() => togglePlugin(plugin.id, !enabled)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 ${
                            enabled
                              ? "bg-rose-950 border border-rose-500/30 text-rose-400"
                              : "bg-neutral-850 hover:bg-neutral-800 text-neutral-300"
                          }`}
                        >
                          {enabled ? "Deactivate" : "Activate"}
                        </button>
                      </div>

                    </div>
                  );
                })}

              </div>

            </div>
          )}

          {/* TAB 9: TEAM CONFIGURATIONS */}
          {activeTab === "team" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">Team Management & Access Roles</h2>

              <div className="bg-neutral-900 border border-neutral-850 rounded-3xl p-6 shadow-xl relative overflow-hidden glass-panel">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/[0.01] rounded-full blur-3xl" />
                
                <h3 className="text-lg font-bold tracking-tight border-b border-neutral-800 pb-5 mb-6">Workspace Membership Directory</h3>

                <div className="space-y-4">
                  {[
                    { email: "saidh@healstack.io", role: "Workspace Owner", status: "Active" },
                    { email: "developer1@healstack.io", role: "SRE / SRE Dev", status: "Active" },
                    { email: "security_auditor@healstack.io", role: "Compliance Viewer", status: "Audit logs only" }
                  ].map((member, idx) => (
                    <div key={idx} className="p-4 bg-neutral-950 border border-neutral-850 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-8 h-8 rounded-full bg-rose-600/30 border border-rose-500/25 flex items-center justify-center font-bold text-rose-400 text-xs">
                          {member.email.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-xs font-bold text-neutral-350">{member.email}</span>
                          <span className="block text-[10px] text-neutral-500 font-semibold">{member.role}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold uppercase bg-rose-950/20 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full">
                        {member.status}
                      </span>
                    </div>
                  ))}
                </div>

              </div>

            </div>
          )}

        </section>

        {/* CONVERSATIONAL AI COPILOT WORKSPACE (Floating widget on the right side) */}
        <aside className="w-80 border-l border-neutral-900 bg-neutral-950/40 hidden xl:flex flex-col p-5 space-y-4 relative glass-panel">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/[0.02] rounded-full blur-3xl pointer-events-none" />

          {/* Copilot Header */}
          <div className="border-b border-neutral-900 pb-4 flex items-center space-x-2.5 relative">
            <span className="text-xl">🤖</span>
            <div className="space-y-0.5">
              <span className="text-sm font-extrabold tracking-tight block">AI Copilot Terminal</span>
              <span className="text-[9px] text-emerald-400 font-bold block uppercase tracking-wider">🟢 Telemetry Context active</span>
            </div>
          </div>

          {/* Interactive Chat History Container */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[30rem] scrollbar-thin select-text">
            {copilotHistory.map((chat, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[90%] ${
                  chat.sender === "user"
                    ? "bg-rose-600/10 border border-rose-500/35 text-neutral-200 self-end ml-auto"
                    : "bg-neutral-900 border border-neutral-850 text-neutral-350"
                }`}
              >
                {/* Simulated Markdown Parsing for key headers/lists in mock responses */}
                {chat.text.split("\n").map((line, lIdx) => {
                  if (line.startsWith("### ")) {
                    return <h5 key={lIdx} className="font-extrabold text-neutral-200 mt-2.5 mb-1.5 text-xs uppercase tracking-wider">{line.replace("### ", "")}</h5>;
                  }
                  if (line.startsWith("#### ")) {
                    return <h6 key={lIdx} className="font-bold text-neutral-250 mt-2 mb-1 text-xs">{line.replace("#### ", "")}</h6>;
                  }
                  if (line.startsWith("* ")) {
                    return <li key={lIdx} className="ml-3 list-disc text-neutral-400 my-0.5 font-medium">{line.replace("* ", "")}</li>;
                  }
                  if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ")) {
                    return <div key={lIdx} className="ml-1 my-1 font-bold text-rose-350">{line}</div>;
                  }
                  if (line.startsWith("```")) {
                    return null; // Skip code fence markers in render
                  }
                  if (line.includes("|")) {
                    // Simple table parser
                    return <div key={lIdx} className="text-[10px] font-mono py-0.5 text-rose-200">{line}</div>;
                  }
                  return <p key={lIdx} className="my-1 font-semibold">{line}</p>;
                })}
              </div>
            ))}
            
            {/* Loading typing state */}
            {isCopilotTyping && (
              <div className="p-3 bg-neutral-900 border border-neutral-850 rounded-2xl text-xs text-rose-400 flex items-center space-x-1.5 w-max">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce delay-100" />
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce delay-200" />
                <span className="text-[10px] text-neutral-500 font-bold pl-1.5">Analyzing logs...</span>
              </div>
            )}

            <div ref={copilotEndRef} />
          </div>

          {/* Quick prompt shortcut filters */}
          <div className="grid grid-cols-2 gap-2 text-[9px] font-extrabold uppercase text-neutral-500 select-none">
            <button
              onClick={() => { setCopilotQuery("Why is user conversion dropping?"); }}
              className="p-2 border border-neutral-850 rounded-xl hover:text-rose-400 hover:border-rose-500/20 text-center transition"
            >
              Analyze Drops
            </button>
            <button
              onClick={() => { setCopilotQuery("Explain latest checkout exception"); }}
              className="p-2 border border-neutral-850 rounded-xl hover:text-rose-400 hover:border-rose-500/20 text-center transition"
            >
              Explain Crash
            </button>
          </div>

          {/* Form message input */}
          <form onSubmit={handleCopilotChat} className="flex gap-2">
            <input
              type="text"
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              placeholder="Ask Copilot about telemetry..."
              className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-neutral-350 outline-none outline-0"
            />
            <button
              type="submit"
              className="p-2 bg-rose-600 hover:bg-rose-500 rounded-xl transition font-bold text-xs"
            >
              Send
            </button>
          </form>
        </aside>

      </div>

      {/* CREATE NEW PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 relative shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5 pl-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. My Production Web App"
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
