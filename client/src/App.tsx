import { useEffect, useState } from "react";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking backend...");

  useEffect(() => {
    fetch("/api/health")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Backend request failed");
        }

        return response.json();
      })
      .then((data) => {
        setBackendStatus(data.message);
      })
      .catch(() => {
        setBackendStatus("Backend connection failed");
      });
  }, []);

  return (
    <main>
      <h1>Yu-Gi-Oh Deck Builder</h1>

      <p>Backend status:</p>
      <p>{backendStatus}</p>
    </main>
  );
}

export default App;