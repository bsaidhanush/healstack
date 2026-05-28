"use client";

import { useState } from "react";

export default function Home() {
  const [activeSection, setActiveSection] = useState("quickstart");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Copy Code Blocks to Clipboard Utility
  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setToastMessage(`Copied ${label}!`);
    setTimeout(() => setToastMessage(null), 2000);
  }

  // Smooth scroll handler
  function scrollToSection(id: string) {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const sections = [
    { id: "quickstart", title: "🚀 5-Minute Quickstart" },
    { id: "web-sdk", title: "🌐 Web Observability SDK" },
    { id: "flutter-sdk", title: "📱 Flutter Observability SDK" },
    { id: "backend-setup", title: "⚙️ Backend Infrastructure" },
    { id: "dashboard-guide", title: "📊 Observability Dashboard" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative selection:bg-rose-500 selection:text-white">
      {/* GLOWING HEADER */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="inline-flex p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-rose-500 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white">HealStack</span>
            <span className="text-[10px] bg-rose-950 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold ml-2.5 uppercase tracking-wider">docs</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/bsaidhanush/healstack"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-4 py-2 rounded-xl transition duration-150 flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
            <span>GitHub</span>
          </a>
        </div>
      </header>

      {/* DOCUMENTATION CORE LAYOUT */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row relative">
        
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="w-full md:w-64 border-r border-zinc-900 bg-zinc-950 md:sticky md:top-20 md:h-[calc(100vh-80px)] p-6 z-35 overflow-y-auto">
          <span className="block text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mb-4 pl-2">Navigation</span>
          <nav className="space-y-1.5">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className={`w-full flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition duration-150 text-left border ${
                  activeSection === sec.id
                    ? "bg-rose-950/20 border-rose-500/20 text-rose-400 shadow-sm"
                    : "bg-transparent border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                }`}
              >
                {sec.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* RIGHT CONTENT PANEL */}
        <div className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto space-y-16 max-w-4xl">
          
          {/* SECTION 1: 5-MINUTE QUICKSTART */}
          <section id="quickstart" className="space-y-6 scroll-mt-24">
            <div className="border-b border-zinc-900 pb-5">
              <span className="text-[10px] uppercase font-black text-rose-500 tracking-widest block mb-2">Onboarding Guide</span>
              <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center">
                Integrate HealStack in 5 Minutes
              </h1>
              <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                Transform open, unhandled exceptions and client network outages into real-time self-healing dashboard logs in five simple steps.
              </p>
            </div>

            {/* Quickstart Step 1 */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span className="flex items-center justify-center w-6 h-6 bg-zinc-900 border border-zinc-800 text-rose-400 rounded-lg text-xs font-black">1</span>
                <span>Initialize Backend Server</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Download the packages and run the FastAPI server. By default, it automatically sets up an in-memory SQLite database (`sqlite:///./healstack.db`) and launches the Rule-Based Fallback AI diagnostics if no environment secrets are set.
              </p>
              <div className="relative group">
                <pre className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-[11px] font-mono text-rose-200/90 overflow-x-auto whitespace-pre pr-16 select-all">
                  {`cd backend\npip install -r requirements.txt\nuvicorn main:app --reload`}
                </pre>
                <button
                  onClick={() => handleCopy("cd backend\npip install -r requirements.txt\nuvicorn main:app --reload", "Backend start commands")}
                  className="absolute top-3.5 right-4 px-2.5 py-1 text-[10px] font-bold uppercase bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 rounded-md opacity-0 group-hover:opacity-100 transition"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Quickstart Step 2 */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span className="flex items-center justify-center w-6 h-6 bg-zinc-900 border border-zinc-800 text-rose-400 rounded-lg text-xs font-black">2</span>
                <span>Register a Developer Profile</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Open `http://localhost:3000` in your web browser. Create a developer account, and register your first project to automatically generate a secure API credential (`hs_live_...`).
              </p>
            </div>

            {/* Quickstart Step 3 */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span className="flex items-center justify-center w-6 h-6 bg-zinc-900 border border-zinc-800 text-rose-400 rounded-lg text-xs font-black">3</span>
                <span>Configure Client SDKs</span>
              </h3>
              
              {/* Web SDK quickstart */}
              <div className="border border-zinc-900 bg-zinc-950/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-2" /> Web Application Setup
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono">npm package</span>
                </div>
                <div className="relative group">
                  <pre className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-[11px] font-mono text-rose-200/90 overflow-x-auto whitespace-pre pr-16 select-all">
                    {`import HealStack from 'healstack-sdk';\n\nHealStack.init({\n  apiKey: "hs_live_your_project_key",\n  apiUrl: "http://localhost:8000"\n});`}
                  </pre>
                  <button
                    onClick={() => handleCopy("import HealStack from 'healstack-sdk';\n\nHealStack.init({\n  apiKey: \"hs_live_your_project_key\",\n  apiUrl: \"http://localhost:8000\"\n});", "Web SDK quickstart")}
                    className="absolute top-3.5 right-4 px-2.5 py-1 text-[10px] font-bold uppercase bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 rounded-md opacity-0 group-hover:opacity-100 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Flutter SDK quickstart */}
              <div className="border border-zinc-900 bg-zinc-950/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-2" /> Flutter Application Setup
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono">pub.dev package</span>
                </div>
                <div className="relative group">
                  <pre className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-[11px] font-mono text-rose-200/90 overflow-x-auto whitespace-pre pr-16 select-all">
                    {`import 'package:healstack_flutter/healstack_flutter.dart';\n\nvoid main() {\n  HealStack.init(\n    apiKey: "hs_live_your_project_key",\n    apiUrl: "http://10.0.2.2:8000", // Android Emulator loopback IP\n  );\n  runApp(const MyApp());\n}`}
                  </pre>
                  <button
                    onClick={() => handleCopy("import 'package:healstack_flutter/healstack_flutter.dart';\n\nvoid main() {\n  HealStack.init(\n    apiKey: \"hs_live_your_project_key\",\n    apiUrl: \"http://10.0.2.2:8000\",\n  );\n  runApp(const MyApp());\n}", "Flutter SDK quickstart")}
                    className="absolute top-3.5 right-4 px-2.5 py-1 text-[10px] font-bold uppercase bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 rounded-md opacity-0 group-hover:opacity-100 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {/* Quickstart Step 4 */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span className="flex items-center justify-center w-6 h-6 bg-zinc-900 border border-zinc-800 text-rose-400 rounded-lg text-xs font-black">4</span>
                <span>Trigger a Test Error</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Throw an exception inside your frontend client to verify unhandled error logging:
              </p>
              <div className="relative group">
                <pre className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-[11px] font-mono text-rose-200/90 overflow-x-auto whitespace-pre pr-16 select-all">
                  {`throw Exception("HealStack 5-Minute integration successful!");`}
                </pre>
                <button
                  onClick={() => handleCopy('throw Exception("HealStack 5-Minute integration successful!");', "Trigger error snippet")}
                  className="absolute top-3.5 right-4 px-2.5 py-1 text-[10px] font-bold uppercase bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 rounded-md opacity-0 group-hover:opacity-100 transition"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Quickstart Step 5 */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span className="flex items-center justify-center w-6 h-6 bg-zinc-900 border border-zinc-800 text-rose-400 rounded-lg text-xs font-black">5</span>
                <span>Observe Diagnostics</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                Verify the live observability console displays:
                <br />
                ✅ Captured exception payload details
                <br />
                ✅ Dynamic severity classification levels
                <br />
                ✅ AI-Powered cause and solution suggestions
              </p>
            </div>
          </section>

          {/* SECTION 2: WEB SDK */}
          <section id="web-sdk" className="space-y-6 scroll-mt-24">
            <div className="border-b border-zinc-900 pb-5">
              <span className="text-[10px] uppercase font-black text-rose-500 tracking-widest block mb-2">Web SDK Documentation</span>
              <h2 className="text-3xl font-bold tracking-tight text-white">Web Observability SDK</h2>
              <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                Integrate the lightweight TypeScript Web SDK in your browser client to intercept raw runtime exceptions, configure api retries, and activate self-healing fallbacks.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-2 pl-1">1. Package Installation</h4>
                <div className="relative group">
                  <pre className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-[11px] font-mono text-rose-200/90 overflow-x-auto whitespace-pre pr-16 select-all">
                    {`npm install healstack-sdk --save`}
                  </pre>
                  <button
                    onClick={() => handleCopy("npm install healstack-sdk --save", "npm installation command")}
                    className="absolute top-3.5 right-4 px-2.5 py-1 text-[10px] font-bold uppercase bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 rounded-md opacity-0 group-hover:opacity-100 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-2 pl-1">2. Core Setup & Global Exception Tracking</h4>
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Call `HealStack.init` early in your app load sequence. It hooks into unhandled global window exception boundaries to monitor front-end issues.
                </p>
                <div className="relative group">
                  <pre className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-[11px] font-mono text-rose-200/90 overflow-x-auto whitespace-pre pr-16 select-all">
                    {`import HealStack from 'healstack-sdk';\n\nHealStack.init({\n  apiKey: "hs_live_3420ec70c0f1e2b0e173e98b...",\n  apiUrl: "http://localhost:8000",\n});`}
                  </pre>
                  <button
                    onClick={() => handleCopy("import HealStack from 'healstack-sdk';\n\nHealStack.init({\n  apiKey: \"hs_live_3420ec70c0f1e2b0e173e98b...\",\n  apiUrl: \"http://localhost:8000\",\n});", "Web SDK core initialization")}
                    className="absolute top-3.5 right-4 px-2.5 py-1 text-[10px] font-bold uppercase bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 rounded-md opacity-0 group-hover:opacity-100 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: FLUTTER SDK */}
          <section id="flutter-sdk" className="space-y-6 scroll-mt-24">
            <div className="border-b border-zinc-900 pb-5">
              <span className="text-[10px] uppercase font-black text-rose-500 tracking-widest block mb-2">Flutter SDK Documentation</span>
              <h2 className="text-3xl font-bold tracking-tight text-white">Flutter Observability SDK</h2>
              <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                Connect our public Flutter SDK `healstack_flutter` to handle global error catching and Dio networking interceptors.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-2 pl-1">1. pub.dev Installation</h4>
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Add the stable package dependency under the `dependencies:` block inside your `pubspec.yaml` manifest:
                </p>
                <div className="relative group">
                  <pre className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-[11px] font-mono text-rose-200/90 overflow-x-auto whitespace-pre pr-16 select-all">
                    {`dependencies:\n  flutter:\n    sdk: flutter\n  healstack_flutter: ^1.0.0\n  dio: ^5.4.0`}
                  </pre>
                  <button
                    onClick={() => handleCopy("dependencies:\n  flutter:\n    sdk: flutter\n  healstack_flutter: ^1.0.0\n  dio: ^5.4.0", "Flutter pubspec config")}
                    className="absolute top-3.5 right-4 px-2.5 py-1 text-[10px] font-bold uppercase bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 rounded-md opacity-0 group-hover:opacity-100 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-2 pl-1">2. Dio Interceptor Configuration</h4>
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Equip your Dio network client with `HealStackInterceptor`. It automatically captures connection timeouts, operating system metadata, and retries 5xx server exceptions or network outages up to 2 times after a 1-second backoff delay.
                </p>
                <div className="relative group">
                  <pre className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-[11px] font-mono text-rose-200/90 overflow-x-auto whitespace-pre pr-16 select-all">
                    {`import 'package:dio/dio.dart';\nimport 'package:healstack_flutter/healstack_flutter.dart';\n\nfinal dio = Dio();\n\nvoid setupDioClient() {\n  dio.interceptors.add(\n    HealStackInterceptor(),\n  );\n}`}
                  </pre>
                  <button
                    onClick={() => handleCopy("import 'package:dio/dio.dart';\nimport 'package:healstack_flutter/healstack_flutter.dart';\n\nfinal dio = Dio();\n\nvoid setupDioClient() {\n  dio.interceptors.add(\n    HealStackInterceptor(),\n  );\n}", "Dio Interceptor registration")}
                    className="absolute top-3.5 right-4 px-2.5 py-1 text-[10px] font-bold uppercase bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 rounded-md opacity-0 group-hover:opacity-100 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/[0.02] rounded-full blur-2xl pointer-events-none" />
                <h5 className="text-xs font-bold text-rose-400 flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  Android Emulator Loopback IP
                </h5>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Inside the Android Emulator, standard loopback address `localhost` or `127.0.0.1` maps to the virtual device itself. You **MUST** configure the backend `apiUrl` specifically to use **`http://10.0.2.2:8000`** in emulator environments to correctly route traffic to your development host machine!
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 4: BACKEND */}
          <section id="backend-setup" className="space-y-6 scroll-mt-24">
            <div className="border-b border-zinc-900 pb-5">
              <span className="text-[10px] uppercase font-black text-rose-500 tracking-widest block mb-2">Backend Setup Documentation</span>
              <h2 className="text-3xl font-bold tracking-tight text-white">Backend Infrastructure</h2>
              <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                Deploy and scale the FastAPI logging server. Supports PostgreSQL pooling, user JWT security, and OpenAI ChatGPT diagnostics.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-2 pl-1">1. PostgreSQL / Database Settings</h4>
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Specify database and secret configurations inside a `.env` file under the `/backend` directory:
                </p>
                <div className="relative group">
                  <pre className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-[11px] font-mono text-rose-200/90 overflow-x-auto whitespace-pre pr-16 select-all">
                    {`# PostgreSQL URI connection pooling\nDATABASE_URL=postgresql://developer:password@localhost:5432/healstack_db\n\n# JWT secret key\nSECRET_KEY=healstack-jwt-super-secret-security-123456\n\n# OpenAI Key for dynamic diagnosis (optional, falls back to rule-based AI if empty)\nOPENAI_API_KEY=sk-proj-yourOpenAISecretKeyHere`}
                  </pre>
                  <button
                    onClick={() => handleCopy("DATABASE_URL=postgresql://developer:password@localhost:5432/healstack_db\nSECRET_KEY=healstack-jwt-super-secret-security-123456\nOPENAI_API_KEY=sk-proj-yourOpenAISecretKeyHere", "Backend .env file template")}
                    className="absolute top-3.5 right-4 px-2.5 py-1 text-[10px] font-bold uppercase bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 rounded-md opacity-0 group-hover:opacity-100 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-2 pl-1">2. Production Deployment</h4>
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Run uvicorn behind a reverse proxy (like Nginx) or using multiple worker processes for high availability:
                </p>
                <div className="relative group">
                  <pre className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-[11px] font-mono text-rose-200/90 overflow-x-auto whitespace-pre pr-16 select-all">
                    {`uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4`}
                  </pre>
                  <button
                    onClick={() => handleCopy("uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4", "Uvicorn workers run")}
                    className="absolute top-3.5 right-4 px-2.5 py-1 text-[10px] font-bold uppercase bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 rounded-md opacity-0 group-hover:opacity-100 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 5: DASHBOARD */}
          <section id="dashboard-guide" className="space-y-6 scroll-mt-24">
            <div className="border-b border-zinc-900 pb-5">
              <span className="text-[10px] uppercase font-black text-rose-500 tracking-widest block mb-2">Dashboard Operations</span>
              <h2 className="text-3xl font-bold tracking-tight text-white">Observability Dashboard</h2>
              <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                Utilize the Next.js SaaS Console workspace to manage developer credentials, monitor active projects, and inspect AI-assisted exception fixes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2">
                <span className="inline-flex p-2 bg-zinc-950 border border-zinc-850 text-rose-500 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                </span>
                <h4 className="text-sm font-bold text-white">Usage Isolation & Projects</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Developer credentials generate secure isolated project profiles. API keys segment incoming exception reporting streams automatically, avoiding cross-contamination across staging or production profiles.
                </p>
              </div>

              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2">
                <span className="inline-flex p-2 bg-zinc-950 border border-zinc-850 text-rose-500 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </span>
                <h4 className="text-sm font-bold text-white">HealStack AI Diagnostic</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Every error log persisted undergoes real-time diagnostic synthesis. High-severity timeouts or exceptions receive detailed root cause summaries and drop-in code fix recommendations for faster troubleshooting.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* FLOATING CLIPBOARD TOAST SUCCESS NOTIFIER */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-950 border border-emerald-500/30 text-emerald-400 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center space-x-2 z-50 toast-animate">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
