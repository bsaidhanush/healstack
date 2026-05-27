"use client";

import axios from "axios";
import { useEffect, useState } from "react";

export default function Home() {
  const [logs, setLogs] = useState([]);

  async function fetchLogs() {
    try {
      const response = await axios.get("http://localhost:8000/logs");
      setLogs(response.data);
    } catch (err) {
      console.log("Failed to fetch logs");
    }
  }

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-10">

      <h1 className="text-5xl font-bold mb-8">
        HealStack Console
      </h1>

      <div className="bg-zinc-900 p-6 rounded-2xl mb-10">

        <h2 className="text-2xl font-semibold mb-6">
          Live Logs
        </h2>

        <div className="space-y-4">
          {logs.map((log, index) => (
            <div key={index} className="bg-black p-4 rounded-xl">
              <p className="text-green-400 font-semibold">{log.type}</p>
              <pre className="text-sm mt-2 overflow-auto">
                {JSON.stringify(log.data, null, 2)}
              </pre>

              <div className="mt-4 bg-zinc-900 p-4 rounded-xl">

                <p>
                  <span className="text-blue-400">Severity:</span>
                  {" "}
                  {log.analysis?.severity}
                </p>

                <p className="mt-2">
                  <span className="text-yellow-400">Cause:</span>
                  {" "}
                  {log.analysis?.cause}
                </p>

                <p className="mt-2">
                  <span className="text-green-400">Suggested Fix:</span>
                  {" "}
                  {log.analysis?.solution}
                </p>

              </div>
            </div>
          ))}
        </div>

      </div>

    </main>
  );
}
