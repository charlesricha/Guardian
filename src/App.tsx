import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Shield, 
  Users, 
  Activity, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  User, 
  Info,
  AlertCircle,
  X,
  BrainCircuit,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";

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

interface Status {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  message: string;
  aiReasoning?: string;
}

export default function App() {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [status, setStatus] = useState<Status>({
    riskLevel: "LOW",
    confidence: 0,
    message: "Initializing system..."
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertAcknowledged, setAlertAcknowledged] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const feedRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini
  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" }), []);

  const analyzeWithGemini = async (currentPassengers: Passenger[], currentEvents: Event[]) => {
    if (currentPassengers.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const prompt = `
        Act as a Public Transport Security AI. Analyze the following passenger data and event log:
        
        Passengers: ${JSON.stringify(currentPassengers)}
        Recent Events: ${JSON.stringify(currentEvents.slice(0, 5))}
        
        Context:
        - "inactive" means the passenger is completely still and unresponsive, which is highly unusual.
        - "sleeping" is a normal activity but can be a cover for theft or a sign of drugging if combined with suspicious proximity from others.
        - "leaning" means a passenger is physically close to another, potentially reaching for pockets.
        
        Task:
        1. Determine the overall Risk Level (LOW, MEDIUM, or HIGH).
        2. Provide a confidence score (0-100).
        3. Write a concise summary message of the situation.
        4. Provide a brief "AI Reasoning" explaining why you chose this risk level. 
           IMPORTANT: Distinguish between a passenger who is just "sleeping" (Normal) and one who is "at_risk" (Inactivity + Suspicious Proximity).
        
        Return the result in JSON format:
        {
          "riskLevel": "LOW" | "MEDIUM" | "HIGH",
          "confidence": number,
          "message": "string",
          "aiReasoning": "string"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || "{}");
      
      setStatus(prev => ({
        ...prev,
        riskLevel: result.riskLevel || prev.riskLevel,
        confidence: result.confidence || prev.confidence,
        message: result.message || prev.message,
        aiReasoning: result.aiReasoning
      }));

      // Trigger alert if HIGH and not acknowledged
      if (result.riskLevel === "HIGH" && !alertAcknowledged) {
        setShowAlert(true);
      } else if (result.riskLevel !== "HIGH") {
        setAlertAcknowledged(false);
        setShowAlert(false);
      }
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchData = async () => {
    try {
      const [eventsRes, passengersRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/passengers")
      ]);

      const eventsData = await eventsRes.json();
      const passengersData = await passengersRes.json();

      setEvents(eventsData);
      setPassengers(passengersData);

      // Perform real AI analysis
      analyzeWithGemini(passengersData, eventsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Analyze every 5 seconds
    return () => clearInterval(interval);
  }, [alertAcknowledged]);

  const startSimulation = async () => {
    setIsSimulating(true);
    setShowAlert(false);
    setAlertAcknowledged(false);
    try {
      await fetch("/api/simulate", { method: "POST" });
      setTimeout(() => setIsSimulating(false), 20000);
    } catch (error) {
      console.error("Failed to start simulation:", error);
      setIsSimulating(false);
    }
  };

  const closeAlert = () => {
    setShowAlert(false);
    setAlertAcknowledged(true);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "HIGH": return "text-red-500 border-red-500/30 bg-red-500/10";
      case "MEDIUM": return "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
      default: return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "at_risk": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "suspicious": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-blue-500/30">
      <div className="scanline" />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase">Guardian AI</h1>
            <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Surveillance & Safety System v4.2</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] text-white/40 font-mono uppercase">AI Engine</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isAnalyzing ? "bg-blue-500 animate-ping" : "bg-emerald-500 animate-pulse"}`} />
              <span className={`text-xs font-medium uppercase tracking-wider ${isAnalyzing ? "text-blue-400" : "text-emerald-400"}`}>
                {isAnalyzing ? "Gemini Analyzing..." : "Active Monitoring"}
              </span>
            </div>
          </div>
          
          <button 
            onClick={startSimulation}
            disabled={isSimulating}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 ${
              isSimulating 
                ? "bg-white/5 border-white/10 text-white/30 cursor-not-allowed" 
                : "bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/50"
            }`}
          >
            {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span className="text-xs font-bold uppercase tracking-wider">
              {isSimulating ? "Simulation Active" : "Start Simulation"}
            </span>
          </button>
        </div>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Risk & Feed */}
        <div className="lg:col-span-4 space-y-6">
          {/* Risk Level Card */}
          <section className="glass p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity className="w-24 h-24" />
            </div>
            
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Risk Assessment
            </h2>

            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold tracking-tighter mb-1">
                    {status.riskLevel}
                  </p>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border inline-block ${getRiskColor(status.riskLevel)}`}>
                    Threat Level
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-mono font-medium text-white/80">{status.confidence}%</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">AI Confidence</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${status.confidence}%` }}
                  className={`h-full ${
                    status.riskLevel === "HIGH" ? "bg-red-500" : 
                    status.riskLevel === "MEDIUM" ? "bg-yellow-500" : "bg-emerald-500"
                  }`}
                />
              </div>

              <div className="space-y-4">
                <p className="text-sm text-white/70 leading-relaxed italic">
                  "{status.message}"
                </p>
                
                {status.aiReasoning && (
                  <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <BrainCircuit className="w-3 h-3 text-blue-400" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400">Gemini Reasoning</span>
                    </div>
                    <p className="text-[11px] text-white/50 leading-relaxed">
                      {status.aiReasoning}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Activity Feed */}
          <section className="glass p-6 rounded-2xl h-[400px] flex flex-col">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info className="w-3 h-3" /> Event Log
            </h2>
            
            <div 
              ref={feedRef}
              className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar"
            >
              <AnimatePresence initial={false}>
                {events.map((event, idx) => (
                  <motion.div 
                    key={`${event.time}-${idx}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3 items-start border-l-2 border-white/5 pl-4 py-1"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-white/30">{event.time}</span>
                        <span className={`text-[9px] uppercase font-bold px-1.5 rounded ${
                          event.severity === "high" ? "bg-red-500/20 text-red-400" :
                          event.severity === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-blue-500/20 text-blue-400"
                        }`}>
                          {event.severity}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 leading-snug">{event.event}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* Right Column: Monitoring Grid */}
        <div className="lg:col-span-8 space-y-6">
          <section className="glass p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-3 h-3" /> Vehicle Monitoring Panel
              </h2>
              <div className="flex items-center gap-4 text-[10px] text-white/40 uppercase font-mono">
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Normal
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Suspicious
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> At Risk
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {passengers.map((passenger) => (
                <motion.div 
                  layout
                  key={passenger.id}
                  className={`p-4 rounded-xl border transition-all duration-500 ${getStatusColor(passenger.status)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-wider">{passenger.id}</p>
                      <p className="text-[9px] font-mono opacity-60 uppercase">{passenger.activity}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest">
                      <span className="opacity-40">Status</span>
                      <span>{passenger.status}</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        animate={{ 
                          width: passenger.status === "normal" ? "100%" : 
                                 passenger.status === "suspicious" ? "60%" : "20%",
                          backgroundColor: passenger.status === "normal" ? "#10b981" : 
                                           passenger.status === "suspicious" ? "#f59e0b" : "#ef4444"
                        }}
                        className="h-full"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* System Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass p-6 rounded-2xl">
              <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap className="w-3 h-3" /> Real-Time Intelligence
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">AI Processing Latency</span>
                  <span className="text-xs font-mono font-bold text-blue-400">124ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">Neural Engine Load</span>
                  <span className="text-xs font-mono font-bold text-blue-400">14%</span>
                </div>
              </div>
            </div>
            <div className="glass p-6 rounded-2xl">
              <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">Hardware Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">Camera Feed (4K)</span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">Thermal Sensors</span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Alert Modal */}
      <AnimatePresence>
        {showAlert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={closeAlert}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative glass-dark max-w-md w-full p-8 rounded-3xl border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.3)]"
            >
              <button 
                onClick={closeAlert}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                
                <h2 className="text-2xl font-bold tracking-tight mb-2 uppercase">Critical Threat Detected</h2>
                <p className="text-red-400 font-mono text-xs mb-6 uppercase tracking-widest">Potential Theft or Drugging Incident</p>
                
                <div className="w-full glass p-4 rounded-xl mb-8 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 uppercase">Confidence</span>
                    <span className="text-lg font-mono font-bold text-white">{status.confidence}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 uppercase">Primary Target</span>
                    <span className="text-xs font-bold text-white uppercase">Passenger D</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={closeAlert}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  >
                    Check Passenger Immediately
                  </button>
                  <button 
                    onClick={closeAlert}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/60 font-bold rounded-xl transition-all uppercase tracking-widest text-xs"
                  >
                    Dismiss Alert
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
