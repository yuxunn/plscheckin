import React, { useState } from 'react';
import { 
  Sparkles, Activity, Calendar, Building, Info, 
  AlertCircle, CheckCircle, XCircle, ChevronRight,
  TrendingUp, Users, CreditCard, BarChart3, List
} from 'lucide-react';

export default function App() {
  const [formData, setFormData] = useState({
    branch: 'Changi',
    booking_month: 'August',
    arrival_month: 'September',
    arrival_day: 15,
    checkout_month: 'September',
    checkout_day: 18,
    country: 'China',
    first_time: 'Yes',
    room: 'King',
    price: 850.34,
    platform: 'Website',
    num_adults: 2,
    num_children: 1.0
  });

  const [currency, setCurrency] = useState('SGD'); 
  const [prediction, setPrediction] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loadingPred, setLoadingPred] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let newValue = value;

    if (value === '') {
      newValue = null;
    } else if (type === 'number') {
      newValue = parseFloat(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleCurrencyChange = (e) => {
    setCurrency(e.target.value);
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoadingPred(true);
    setError('');
    setPrediction(null);
    let finalPrice = formData.price;
    if (currency === 'USD' && formData.price !== null) {
      finalPrice = formData.price * 1.36;
    }

    const payload = {
      branch: formData.branch ?? "",
      booking_month: formData.booking_month ?? "",
      arrival_month: formData.arrival_month ?? "",
      arrival_day: formData.arrival_day ?? 1,
      checkout_month: formData.checkout_month ?? "",
      checkout_day: formData.checkout_day ?? 1,
      country: formData.country ?? "",
      first_time: formData.first_time ?? "",
      room: formData.room ?? "",
      price: finalPrice ?? 0,
      platform: formData.platform ?? "",
      num_adults: formData.num_adults ?? 0,
      num_children: formData.num_children ?? 0
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Prediction failed');
      }

      const data = await response.json();
      setPrediction(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPred(false);
    }
  };

  const fetchAnalysis = async () => {
    setLoadingAnalysis(true);
    setAnalysis(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/analysis');
      const data = await response.json();
      setAnalysis(data.report);
    } catch (err) {
      setAnalysis("Could not fetch analysis. Ensure API key is set and backend is running.");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const formatText = (text) => {
    return text.split(/(\*\*.*?\*\*)/).map((segment, i) => {
      if (segment.startsWith('**') && segment.endsWith('**')) {
        return (
          <strong key={i} className="text-slate-900 font-bold bg-slate-100 px-1 rounded-sm mx-0.5">
            {segment.slice(2, -2)}
          </strong>
        );
      }

      return segment.split(/(\b\w+__\w+\b)/).map((part, j) => {
        if (part.match(/\b\w+__\w+\b/)) {
          return (
            <code key={`${i}-${j}`} className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 mx-0.5 align-middle">
              {part}
            </code>
          );
        }
        return part;
      });
    });
  };

  const FormatReport = ({ text }) => {
    if (!text) return null;

    const cleanText = text.replace(/`/g, '');

    return (
      <div className="space-y-2 text-slate-600 font-normal leading-relaxed text-base">
        {cleanText.split('\n').map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={index} className="h-2" />; 

          if (trimmed.startsWith('---') || trimmed.startsWith('___')) {
            return <hr key={index} className="my-6 border-slate-200" />;
          }

          if (trimmed.startsWith('###') || (trimmed.endsWith(':') && trimmed.length < 80 && !trimmed.match(/^[-*1-9]/))) {
            const isStrategy = /strategy|action|recommendation/i.test(trimmed);
            return (
              <h4 key={index} className={`font-bold mt-8 mb-4 tracking-tight flex items-center gap-3 ${
                isStrategy 
                  ? 'text-emerald-800 text-xl border-l-4 border-emerald-500 pl-4 py-2 bg-emerald-50/60 rounded-r-xl' 
                  : 'text-indigo-900 text-lg border-b border-indigo-50 pb-2'
              }`}>
                {!isStrategy && <Sparkles className="w-5 h-5 text-indigo-400" />}
                {trimmed.replace(/###/g, '').trim()}
              </h4>
            );
          }

          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
             return (
                <div key={index} className="flex items-start gap-3 ml-2 mt-4">
                   <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mt-0.5 border border-indigo-200">
                      {numMatch[1]}
                   </div>
                   <div className="leading-relaxed text-slate-700">
                      {formatText(numMatch[2])}
                   </div>
                </div>
             );
          }


          if (trimmed.match(/^[-*]\s/)) {
            const leadingSpaces = line.search(/\S/);
            const isNested = leadingSpaces >= 2;
            const content = trimmed.replace(/^[-*]\s/, '');

            const keyMatch = content.match(/^(\*\*.*?\*\*:?)(.*)/);

            return (
              <div key={index} className={`flex items-start gap-3 ${isNested ? 'ml-8 mt-2 text-sm' : 'ml-2 mt-3'}`}>
                <div className={`shrink-0 rounded-full mt-2.5 ${
                  isNested 
                    ? 'w-1.5 h-1.5 bg-slate-400' 
                    : 'w-2 h-2 bg-indigo-500 shadow-sm shadow-indigo-200'
                }`} />
                
                <div className="leading-relaxed">
                  {keyMatch ? (
                    <>
                       <span className="font-bold text-indigo-900 mr-1">{keyMatch[1].replace(/\*\*/g, '').replace(/:$/, '')}:</span>
                       <span className="text-slate-700">{formatText(keyMatch[2])}</span>
                    </>
                  ) : (
                    formatText(content)
                  )}
                </div>
              </div>
            );
          }

          return (
            <p key={index} className="leading-relaxed mb-3 text-slate-700">
              {formatText(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-200">
              <Activity className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">PlsCheckIn</h1>
              <p className="text-slate-500 font-medium text-sm">Intelligent No-Show Prediction</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
            <div className={`w-2.5 h-2.5 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`} />
            <span className="text-slate-600">System Operational</span>
          </div>
        </header>

        <main className="space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <Calendar className="text-indigo-600 w-5 h-5" />
                  <h2 className="font-semibold text-slate-800">Booking Parameters</h2>
                </div>
                
                <form onSubmit={handlePredict} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location & Status</label>
                      <div className="space-y-3">
                        <div className="relative">
                          <Building className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                          <select 
                            name="branch" 
                            value={formData.branch ?? ''} 
                            onChange={handleChange} 
                            className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium appearance-none"
                          >
                            <option value="Changi">Changi Branch</option>
                            <option value="Orchard">Orchard Branch</option>
                          </select>
                          <ChevronRight className="absolute right-3 top-3 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                        </div>
                        
                        <input type="text" name="country" value={formData.country ?? ''} onChange={handleChange} placeholder="Guest Country" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                        
                        <select name="first_time" value={formData.first_time ?? ''} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                          <option value="Yes">First Time Guest</option>
                          <option value="No">Returning Guest</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room Details</label>
                      <div className="space-y-3">
                        <select name="room" value={formData.room ?? ''} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                          <option value="King">King Room</option>
                          <option value="Queen">Queen Room</option>
                          <option value="Single">Single Room</option>
                          <option value="">Optional (Not Selected)</option>
                        </select>

                        <div className="flex gap-2">
                           <div className="relative w-24 shrink-0">
                              <select 
                                value={currency} 
                                onChange={handleCurrencyChange}
                                className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="SGD">SGD</option>
                                <option value="USD">USD</option>
                              </select>
                           </div>
                           <div className="relative w-full">
                              <CreditCard className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                              <input type="number" name="price" value={formData.price ?? ''} onChange={handleChange} placeholder="Price" className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                           </div>
                        </div>

                        <select name="platform" value={formData.platform ?? ''} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                          <option value="Website">Website</option>
                          <option value="Email">Email</option>
                          <option value="Phone">Phone</option>
                          <option value="">Optional (Not Selected)</option>
                        </select>
                      </div>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 gap-6 pt-2">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Arrival</label>
                          <div className="flex gap-2">
                            <select name="arrival_month" value={formData.arrival_month ?? ''} onChange={handleChange} className="w-2/3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"><option>{formData.arrival_month}</option>{months.map(m=> m!==formData.arrival_month && <option key={m}>{m}</option>)}</select>
                            <input type="number" name="arrival_day" value={formData.arrival_day ?? ''} onChange={handleChange} className="w-1/3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                          </div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Checkout</label>
                          <div className="flex gap-2">
                            <select name="checkout_month" value={formData.checkout_month ?? ''} onChange={handleChange} className="w-2/3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"><option>{formData.checkout_month}</option>{months.map(m=> m!==formData.checkout_month && <option key={m}>{m}</option>)}</select>
                            <input type="number" name="checkout_day" value={formData.checkout_day ?? ''} onChange={handleChange} className="w-1/3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                          </div>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2 grid grid-cols-2 gap-6 border-t border-slate-100 pt-4 mt-2">
                      <div className="flex items-center gap-3">
                          <Users className="text-slate-400 w-5 h-5" />
                          <div className="w-full">
                            <label className="text-xs font-bold text-slate-400 uppercase">Adults</label>
                            <input type="number" name="num_adults" value={formData.num_adults ?? ''} onChange={handleChange} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                          </div>
                      </div>
                      <div className="w-full">
                          <label className="text-xs font-bold text-slate-400 uppercase">Children</label>
                          <input type="number" name="num_children" value={formData.num_children ?? ''} onChange={handleChange} className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                      </div>
                    </div>

                  </div>

                  <button 
                    type="submit" 
                    disabled={loadingPred}
                    className="mt-8 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all active:scale-[0.99] flex justify-center items-center gap-2"
                  >
                    {loadingPred ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <BarChart3 className="w-5 h-5" />
                        Calculate Risk Score
                      </>
                    )}
                  </button>
                </form>
            </div>

            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="text-indigo-600 w-5 h-5" />
                    Result
                  </h3>
                  {prediction && (
                      <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">TH: {prediction.threshold}</span>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Error</p>
                      <p>{error}</p>
                    </div>
                  </div>
                )}

                {!prediction && !loadingPred && !error && (
                  <div className="text-center py-10 px-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Info className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500 font-medium">Ready to Analyze</p>
                    <p className="text-slate-400 text-sm mt-1">Enter details to see risk.</p>
                  </div>
                )}

                {loadingPred && (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                    <p className="text-indigo-600 font-medium animate-pulse">Calculating...</p>
                  </div>
                )}

                {prediction && (
                  <div className="animate-in fade-in zoom-in-95 duration-300">
                    <div className={`relative overflow-hidden p-6 rounded-2xl text-center mb-6 transition-colors border-2 ${
                      prediction.prediction === "Check-In" 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-900" 
                        : "bg-rose-50 border-rose-100 text-rose-900"
                    }`}>
                      <div className="relative z-10">
                          {prediction.prediction === "Check-In" ? (
                          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-3 drop-shadow-sm" />
                          ) : (
                          <XCircle className="w-14 h-14 text-rose-500 mx-auto mb-3 drop-shadow-sm" />
                          )}
                          <div className="text-sm font-bold uppercase tracking-widest opacity-70 mb-1">Prediction</div>
                          <h3 className="text-3xl font-extrabold tracking-tight">
                          {prediction.prediction}
                          </h3>
                      </div>
                    </div>

                    <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between text-sm font-semibold text-slate-600">
                        <span>No-Show Probability</span>
                        <span className="text-slate-900">{(prediction.probability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            prediction.prediction === "No-Show" ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${prediction.probability * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-full">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white p-1 rounded-2xl shadow-xl">
              <div className="bg-slate-900 rounded-[14px] p-8 relative z-10">
                <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-xl">
                        <Sparkles className="text-indigo-400 w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">AI Analyst Insight</h2>
                        <p className="text-slate-400 text-sm">Comprehensive breakdown of risk factors</p>
                    </div>
                  </div>
                  {analysis && (
                    <button 
                        onClick={fetchAnalysis} 
                        disabled={loadingAnalysis}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-700"
                        title="Regenerate Report"
                    >
                        <Activity className={`w-4 h-4 text-indigo-400 ${loadingAnalysis ? 'animate-spin' : ''}`} />
                        <span className="text-sm font-medium">Refresh</span>
                    </button>
                  )}
                </div>

                {!analysis && !loadingAnalysis && (
                  <div className="text-center py-12">
                    <div className={`inline-block p-4 rounded-full mb-4 ${prediction ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
                        <Sparkles className={`w-8 h-8 ${prediction ? 'text-indigo-400' : 'text-slate-600'}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Generate Business Intelligence</h3>
                    <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
                      Our AI will analyze the prediction model's features to explain <b>why</b> this specific booking is at risk, and suggest actionable strategies.
                    </p>
                    
                    {!prediction && (
                        <div className="mb-6 inline-flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-lg text-sm text-slate-400 border border-slate-700">
                            <Info className="w-4 h-4" />
                            <span>Calculate risk score above to unlock analysis</span>
                        </div>
                    )}

                    <button 
                      onClick={fetchAnalysis}
                      disabled={!prediction}
                      className={`
                        py-3.5 px-6 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 group mx-auto
                        ${prediction 
                            ? 'bg-white text-slate-900 hover:bg-indigo-50 hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5' 
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-70'
                        }
                      `}
                    >
                      <Sparkles className={`w-4 h-4 ${prediction ? 'text-indigo-600 group-hover:scale-110' : 'text-slate-500'} transition-transform`} />
                      Generate Business Report
                    </button>
                  </div>
                )}

                {loadingAnalysis && (
                  <div className="space-y-6 py-8 animate-pulse max-w-3xl mx-auto">
                    <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-700/50 rounded w-full"></div>
                    <div className="h-4 bg-slate-700/50 rounded w-5/6"></div>
                    <div className="h-32 bg-slate-700/30 rounded-xl w-full mt-6"></div>
                  </div>
                )}

                {analysis && (
                  <div className="bg-white rounded-xl p-8 shadow-inner border border-slate-200/10 text-slate-800">
                    <FormatReport text={analysis} />
                  </div>
                )}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}