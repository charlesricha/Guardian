import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Passenger {
  id: string;
  status: "normal" | "suspicious" | "at_risk";
  activity: "sitting" | "moving" | "leaning" | "inactive" | "sleeping";
}

interface Event {
  time: string;
  event: string;
  severity: "low" | "medium" | "high";
}

interface SimulationState {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  message: string;
  events: Event[];
  passengers: Passenger[];
  phase: number;
}

let state: SimulationState = {
  riskLevel: "LOW",
  confidence: 98,
  message: "System operational. Monitoring vehicle environment.",
  events: [
    { time: new Date().toLocaleTimeString(), event: "System initialized", severity: "low" },
    { time: new Date().toLocaleTimeString(), event: "Vehicle tracking active", severity: "low" }
  ],
  passengers: [
    { id: "Passenger A", status: "normal", activity: "sitting" },
    { id: "Passenger B", status: "normal", activity: "sitting" },
    { id: "Passenger C", status: "normal", activity: "moving" },
    { id: "Passenger D", status: "normal", activity: "sitting" },
    { id: "Passenger E", status: "normal", activity: "sleeping" },
    { id: "Passenger F", status: "normal", activity: "sitting" },
  ],
  phase: 0
};

const resetState = () => {
  state = {
    riskLevel: "LOW",
    confidence: 98,
    message: "System operational. Monitoring vehicle environment.",
    events: [
      { time: new Date().toLocaleTimeString(), event: "System initialized", severity: "low" },
      { time: new Date().toLocaleTimeString(), event: "Vehicle tracking active", severity: "low" }
    ],
    passengers: state.passengers.map(p => ({ ...p, status: "normal", activity: "sitting" })),
    phase: 0
  };
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Endpoints
  app.get("/api/status", (req, res) => {
    res.json({
      riskLevel: state.riskLevel,
      confidence: state.confidence,
      message: state.message
    });
  });

  app.get("/api/events", (req, res) => {
    res.json(state.events);
  });

  app.get("/api/passengers", (req, res) => {
    res.json(state.passengers);
  });

  app.post("/api/simulate", (req, res) => {
    resetState();
    res.json({ message: "Simulation started" });

    // Phase 1: Normal
    setTimeout(() => {
      state.phase = 1;
      state.events.unshift({
        time: new Date().toLocaleTimeString(),
        event: "Routine passenger boarding completed",
        severity: "low"
      });
    }, 2000);

    // Phase 2: Suspicious movement
    setTimeout(() => {
      state.phase = 2;
      state.passengers = state.passengers.map(p => {
        if (p.id === "Passenger B") return { ...p, activity: "moving" };
        return p;
      });
      state.events.unshift({
        time: new Date().toLocaleTimeString(),
        event: "Passenger B is standing and moving towards the rear",
        severity: "low"
      });
    }, 7000);

    // Phase 3: Proximity
    setTimeout(() => {
      state.phase = 3;
      state.passengers = state.passengers.map(p => {
        if (p.id === "Passenger B") return { ...p, status: "suspicious", activity: "leaning" };
        if (p.id === "Passenger D") return { ...p, activity: "sitting" };
        return p;
      });
      state.events.unshift({
        time: new Date().toLocaleTimeString(),
        event: "Passenger B has stopped and is leaning close to Passenger D",
        severity: "medium"
      });
    }, 12000);

    // Phase 4: High-risk alert (Physical state change)
    setTimeout(() => {
      state.phase = 4;
      state.passengers = state.passengers.map(p => {
        if (p.id === "Passenger D") return { ...p, status: "at_risk", activity: "inactive" };
        return p;
      });
      state.events.unshift({
        time: new Date().toLocaleTimeString(),
        event: "Passenger D has stopped all visible movement",
        severity: "medium"
      });
    }, 17000);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
