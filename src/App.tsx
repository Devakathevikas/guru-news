/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Menu, 
  Settings, 
  Search, 
  Filter, 
  Plus, 
  ArrowUp, 
  ArrowLeft,
  RefreshCw, 
  Trash2,
  Link2, 
  Home, 
  Compass, 
  Bookmark, 
  BarChart2, 
  User,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Layers,
  History,
  AlignLeft,
  ChevronRight,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Category = 'Global' | 'Tech' | 'Finance' | 'Social' | 'Science';

interface Perspective {
  source: string;
  bias: 'Left' | 'Center' | 'Right' | 'State';
  headline: string;
  link: string;
}

interface Article {
  id: string;
  category: Category;
  title: string;
  summary: string;
  content: string;
  status: 'VERIFIED' | 'DISPUTED' | 'UNVERIFIED';
  truthScore: number; // 0-100
  publisher: string;
  timestamp: string;
  perspectives: Perspective[];
  previousArticleId?: string; // For Timeline connection
}

// --- Mock Data ---
const ARTICLES: Article[] = [
  {
    id: 'art-1',
    category: 'Tech',
    title: 'X-9 Quantum Processor Achieves Supremacy',
    summary: 'A breakthroughs in silicon-based quantum computing suggests a 1000x increase in logical qubit stable state.',
    content: 'Researchers at the Zurich Institute have successfully maintained qubit coherence for over 400ms using a new "Isotope-Pure" silicon substrate. This marks the first time a commercialized vendor has reached the threshold of effective fault-tolerant computing.',
    status: 'VERIFIED',
    truthScore: 94,
    publisher: 'Ars Technica',
    timestamp: '2H AGO',
    perspectives: [
      { source: 'Reuters', bias: 'Center', headline: 'Quantum Stocks Surge on Global Markets', link: '#' },
      { source: 'Global Times', bias: 'State', headline: 'Domestic Quantum Efforts match Zurich Leap', link: '#' }
    ]
  },
  {
    id: 'art-2',
    category: 'Global',
    title: 'North-Atlantic Trade Route Blockade',
    summary: 'Tensions rise as rogue naval fleets establish a perimeter around the GIUK gap.',
    content: 'Communication buoys in the sector have been disabled. Merchant vessels are currently idling 200 miles south of the line. Diplomats are calling it a "Kinetic Standstill."',
    status: 'DISPUTED',
    truthScore: 42,
    publisher: 'Reuters',
    timestamp: 'JUST NOW',
    perspectives: [
      { source: 'BBC', bias: 'Center', headline: 'Unconfirmed reports of fleet movement', link: '#' }
    ]
  },
  {
    id: 'art-3',
    category: 'Finance',
    title: 'Central Bank Digital Currency Rollout',
    summary: 'Three more G7 nations announce tethered currency pilot programs for Q4 2026.',
    content: 'The move suggests a significant shift away from traditional physical tender, banking on the security of the Unified Ledger protocol.',
    status: 'VERIFIED',
    truthScore: 89,
    publisher: 'WSJ World',
    timestamp: '4H AGO',
    perspectives: [
      { source: 'Wall St Journal', bias: 'Right', headline: 'Privacy Concerns grow over Digital Ledger', link: '#' }
    ]
  },
  {
    id: 'art-4',
    category: 'Tech',
    title: 'Vulnerability in Unified Ledger Protocol',
    summary: 'Security researchers identify a "Zero-Day" that could allow fractional spoofing in CBDC transactions.',
    content: 'The exploit, dubbed "ShadowLink," targets the consensus layer during high-volume periods. Central banks are reportedly rushing a patch before the broader rollout.',
    status: 'UNVERIFIED',
    truthScore: 61,
    publisher: 'Dark Reading',
    timestamp: '1H AGO',
    perspectives: []
  },
  {
    id: 'art-5',
    category: 'Global',
    title: 'Drought Forces Panama Canal Restriction',
    summary: 'Tonnage limits reduced as water levels hit record lows, threatening global grain shipments.',
    content: 'Wait times for non-reserved vessels have climbed to 15 days. Economic analysts predict a secondary inflation spike in food prices across the EU.',
    status: 'VERIFIED',
    truthScore: 98,
    publisher: 'Guardian World',
    timestamp: '5H AGO',
    perspectives: []
  }
];

// --- Components ---

const IconButton = ({ icon: Icon, className = "", onClick }: { icon: any, className?: string, onClick?: (e: React.MouseEvent) => void }) => (
  <button onClick={onClick} className={`p-2 hover:bg-white/10 text-white/40 hover:text-white transition-all ${className}`}>
    <Icon className="w-4 h-4" />
  </button>
);

const VerificationBadge = ({ status, score }: { status: Article['status'], score: number }) => {
  const color = status === 'VERIFIED' ? 'text-emerald-500 border-emerald-500/30' : 
                status === 'DISPUTED' ? 'text-red-500 border-red-500/30' : 
                'text-yellow-500 border-yellow-500/30';
  
  return (
    <div className={`flex items-center gap-3 px-3 py-1 border rounded-none ${color} font-black text-[9px] tracking-[0.2em] uppercase`}>
      {status === 'VERIFIED' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
      {status} // {score}% TRUTH
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<'feed' | 'detail' | 'sources'>('feed');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [activeStatus, setActiveStatus] = useState<Article['status'] | 'All'>('All');
  const [search, setSearch] = useState('');
  const [themeColor, setThemeColor] = useState('#ffffff');
  const [articles, setArticles] = useState(ARTICLES);
  const [isAutoUpdateEnabled, setIsAutoUpdateEnabled] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(120000); // Default 2 minutes
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'guru', content: string}[]>([
    { role: 'guru', content: 'SYSTEM READY. I AM GURU. STATE YOUR QUERY OR AUTHORIZE AUTONOMOUS FEED SWEEP.' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userMsg = userInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setUserInput('');
    setIsTyping(true);

    // Simulate AI Response
    setTimeout(() => {
      let response = "NEURAL LINK ESTABLISHED. ANALYZING FEED VECTORS...";
      if (userMsg.toLowerCase().includes('status')) {
        response = `GLOBAL STATUS: ${articles.filter(a => a.status === 'VERIFIED').length} NODES VERIFIED. ${articles.filter(a => a.status === 'DISPUTED').length} ANOMALIES DETECTED.`;
      } else if (userMsg.toLowerCase().includes('news')) {
        response = "LATEST INTELLIGENCE SUITE LOADED. TOPIC: " + (articles[0]?.title || 'UNKNOWN') + " IS DOMINATING THE TRENDS.";
      } else if (userMsg.toLowerCase().includes('solve') || userMsg.toLowerCase().includes('fix')) {
        response = "AUTONOMOUS PROBLEM RESOLUTION INITIALIZED. SCANNING SCREEN ELEMENTS... USER CONSENT LOGGED. OPTIMIZING INTERFACE...";
      }

      setChatMessages(prev => [...prev, { role: 'guru', content: response }]);
      setIsTyping(false);

      // Auto-cleanup and close after a delay
      setTimeout(() => {
        setShowChat(false);
        setChatMessages([
          { role: 'guru', content: 'SYSTEM READY. I AM GURU. STATE YOUR QUERY OR AUTHORIZE AUTONOMOUS FEED SWEEP.' }
        ]);
      }, 5000);
    }, 1500);
  };
  const [sources, setSources] = useState([
    { id: 'src-1', name: 'ABC News', url: 'https://abcnews.go.com', category: 'NEWS', status: 'ACTIVE', update: '10m' },
    { id: 'src-2', name: 'Al Jazeera English', url: 'https://aljazeera.com', category: 'WAR', status: 'ACTIVE', update: '10m' },
    { id: 'src-3', name: 'Android Authority', url: 'https://androidauthority.com', category: 'TECH', status: 'ACTIVE', update: '10m' },
    { id: 'src-4', name: 'Ars Technica', url: 'https://arstechnica.com', category: 'TECH', status: 'ACTIVE', update: 'Real-time' },
    { id: 'src-5', name: 'BBC News', url: 'https://bbc.com/news', category: 'NEWS', status: 'ACTIVE', update: '10m' },
    { id: 'src-6', name: 'Dark Reading', url: 'https://darkreading.com', category: 'TECH', status: 'ACTIVE', update: '10m' },
    { id: 'src-7', name: 'Digital Trends', url: 'https://digitaltrends.com', category: 'TECH', status: 'ACTIVE', update: '10m' },
    { id: 'src-8', name: 'Engadget', url: 'https://engadget.com', category: 'TECH', status: 'ACTIVE', update: '10m' },
    { id: 'src-9', name: 'GeekWire', url: 'https://geekwire.com', category: 'TECH', status: 'ACTIVE', update: 'Real-time' },
    { id: 'src-10', name: 'Gizmodo', url: 'https://gizmodo.com', category: 'TECH', status: 'ACTIVE', update: 'Real-time' },
    { id: 'src-11', name: 'GSMArena', url: 'https://gsmarena.com', category: 'MOBILE', status: 'ACTIVE', update: '10m' },
    { id: 'src-12', name: 'Hacker News', url: 'https://news.ycombinator.com', category: 'TECH', status: 'ACTIVE', update: '10m' },
    { id: 'src-13', name: 'Huffington Post', url: 'https://huffpost.com', category: 'NEWS', status: 'ACTIVE', update: '10m' },
    { id: 'src-14', name: 'Independent', url: 'https://independent.co.uk', category: 'NEWS', status: 'ACTIVE', update: '60m' },
    { id: 'src-15', name: 'Guardian Iran', url: 'https://theguardian.com/world/iran', category: 'WAR', status: 'ACTIVE', update: '10m' },
    { id: 'src-16', name: 'BleepingComputer', url: 'https://bleepingcomputer.com', category: 'TECH', status: 'ACTIVE', update: '10m' },
    { id: 'src-17', name: 'ZDNet Security', url: 'https://zdnet.com', category: 'TECH', status: 'ACTIVE', update: '10m' },
    { id: 'src-18', name: 'PBS NewsHour', url: 'https://pbs.org/newshour', category: 'WAR', status: 'ACTIVE', update: '30m' },
    { id: 'src-19', name: 'Reuters', url: 'https://reuters.com', category: 'WAR', status: 'ACTIVE', update: 'Real-time' },
    { id: 'src-20', name: 'NDTV Gadgets360', url: 'https://gadgets360.com', category: 'MOBILE', status: 'ACTIVE', update: '61m' },
    { id: 'src-21', name: 'TechCrunch', url: 'https://techcrunch.com', category: 'TECH', status: 'ACTIVE', update: '31m' },
    { id: 'src-22', name: 'TechRadar', url: 'https://techradar.com', category: 'TECH', status: 'ACTIVE', update: '10m' },
    { id: 'src-23', name: 'The New York Times', url: 'https://nytimes.com', category: 'NEWS', status: 'ACTIVE', update: '10m' },
    { id: 'src-24', name: 'The Verge', url: 'https://theverge.com', category: 'TECH', status: 'ACTIVE', update: '10m' },
    { id: 'src-25', name: 'TIME', url: 'https://time.com', category: 'NEWS', status: 'ACTIVE', update: '10m' },
    { id: 'src-26', name: 'VentureBeat', url: 'https://venturebeat.com', category: 'TECH', status: 'ACTIVE', update: '10m' },
    { id: 'src-27', name: 'Washington Post', url: 'https://washingtonpost.com', category: 'NEWS', status: 'ACTIVE', update: '10m' },
    { id: 'src-28', name: 'Guardian World', url: 'https://theguardian.com/world', category: 'NEWS', status: 'ACTIVE', update: '10m' },
    { id: 'src-29', name: 'WSJ World', url: 'https://wsj.com/news/world', category: 'NEWS', status: 'ACTIVE', update: '10m' },
  ]);

  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '', category: 'NEWS' });

  const toggleBookmark = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setBookmarkedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSource.name && newSource.url) {
      setSources([
        { 
          id: `src-${Date.now()}`, 
          ...newSource, 
          status: 'ACTIVE', 
          update: 'JUST NOW' 
        }, 
        ...sources
      ]);
      setNewSource({ name: '', url: '', category: 'NEWS' });
      setIsAddingSource(false);
    }
  };

  const handleRemoveSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
  };

  const themes = [
    { name: 'Classic', color: '#ffffff' },
    { name: 'Neon', color: '#00f2ff' },
    { name: 'Ghost', color: '#888888' },
    { name: 'Blaze', color: '#ff4d00' },
    { name: 'Radioactive', color: '#ccff00' },
  ];

  const intervals = [
    { label: 'Real-time', value: 10000 },
    { label: '2m', value: 120000 },
    { label: '5m', value: 300000 },
    { label: '10m', value: 600000 },
    { label: '30m', value: 1800000 },
    { label: '60m', value: 3600000 },
  ];

  // News Update Logic
  useEffect(() => {
    if (!isAutoUpdateEnabled) return;

    const interval = setInterval(() => {
      if (sources.length === 0) return;
      const source = sources[Math.floor(Math.random() * sources.length)];
      const categoryMap: Record<string, Category> = {
        'NEWS': 'Global',
        'TECH': 'Tech',
        'WAR': 'Global',
        'MOBILE': 'Tech',
        'FINANCE': 'Finance'
      };
      
      const topics = {
        'Global': ['Supply Chain Pivot', 'Treaty Renegotiation', 'Border Decoupling', 'Deep Sea Mining Rights', 'Climate Accord Tension', 'Global Port Congestion'],
        'Tech': ['Neural Link Patch', 'Autonomous Swarm Update', 'Open Source Leak', 'Grid Resiliency Test', 'AI Alignment Breakthrough', 'Silicon Shortage Eases'],
        'Finance': ['Ledger Fork', 'Arbitrage Bot Collapse', 'Stablecoin De-peg', 'Flash Loan Attack', 'Interest Rate Pivot', 'Whale Wallet Movement'],
        'Science': ['Fusion Threshold', 'Isotope Discovery', 'Orbital Debris Study', 'Life Signature on Mars', 'Sub-atomic Particle Drift', 'CRISPR Safety Milestone']
      };

      const selectedCategory = categoryMap[source.category] || 'Global';
      const catTopics = topics[selectedCategory as keyof typeof topics] || topics['Global'];
      const selectedTopic = catTopics[Math.floor(Math.random() * catTopics.length)];

      const newArticle: Article = {
        id: `news-${Date.now()}`,
        category: selectedCategory,
        title: `${source.name}: ${selectedTopic} Reported`,
        summary: `Live data streams from ${source.name} indicate a significant development in ${selectedCategory.toLowerCase()} sectors. Data fidelity remains high at 92%.`,
        content: `Intelligence vector initiated from node ${source.id}. Status: Processing. This update reflects real-time shifting in narrative clusters associated with ${selectedTopic.toLowerCase()}. Source verification level ${Math.floor(Math.random() * 20) + 80}%.`,
        status: Math.random() > 0.4 ? 'VERIFIED' : 'UNVERIFIED',
        truthScore: Math.floor(Math.random() * 30) + 65,
        publisher: source.name,
        timestamp: 'JUST NOW',
        perspectives: []
      };
      setArticles(prev => [newArticle, ...prev].slice(0, 50));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [sources, updateInterval, isAutoUpdateEnabled]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', themeColor);
  }, [themeColor]);

  const selectedArticle = useMemo(() => 
    articles.find(a => a.id === selectedArticleId), 
    [selectedArticleId, articles]
  );

  const filteredArticles = useMemo(() => {
    let result = articles;
    
    // Filter by Source if selected
    if (selectedSourceId) {
      const source = sources.find(s => s.id === selectedSourceId);
      if (source) {
        result = result.filter(a => a.publisher === source.name);
      }
    }

    if (activeCategory === ('Bookmarked' as any)) {
      result = result.filter(a => bookmarkedIds.includes(a.id));
    } else if (activeCategory !== 'All') {
      result = result.filter(a => a.category === activeCategory);
    }
    
    if (activeStatus !== 'All') {
      result = result.filter(a => a.status === activeStatus);
    }
    if (search) {
      result = result.filter(a => a.title.toLowerCase().includes(search.toLowerCase()));
    }
    return result;
  }, [activeCategory, activeStatus, search, articles, bookmarkedIds, selectedSourceId, sources]);

  const handleOpenArticle = (id: string) => {
    setSelectedArticleId(id);
    setView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextArticle = () => {
    const currentIndex = articles.findIndex(a => a.id === selectedArticleId);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % articles.length;
    handleOpenArticle(articles[nextIndex].id);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view === 'detail' && e.key === 'ArrowRight') {
        handleNextArticle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, selectedArticleId]);

  const currentTimeline = useMemo(() => {
    if (!selectedArticle) return [];
    const timeline = [selectedArticle];
    if (selectedArticle.previousArticleId) {
      const prev = ARTICLES.find(a => a.id === selectedArticle.previousArticleId);
      if (prev) timeline.push(prev);
    }
    return timeline;
  }, [selectedArticle]);

  return (
    <div className="min-h-screen bg-[#050505] text-white antialiased font-sans flex flex-col relative overflow-hidden">
      {/* Background Text */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03]">
        <h1 className="font-display text-[20vw] uppercase leading-none">
          {view === 'feed' ? 'DISPATCH' : view === 'sources' ? 'HUB' : 'ANALYST'}
        </h1>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-stone-950 border-r border-white/10 z-[101] p-10 flex flex-col justify-between"
            >
              <div className="space-y-12">
                <div className="flex justify-between items-center">
                  <h3 className="font-display text-2xl uppercase tracking-tighter">System_Menu</h3>
                  <button onClick={() => setShowSidebar(false)} className="text-white/40 hover:text-white">
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">Operational_Stats</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-white/5 p-4">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block mb-1">Active_Sources</span>
                        <span className="text-xl font-display">{sources.length}</span>
                      </div>
                      <div className="border border-white/5 p-4">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block mb-1">Sync_Hz</span>
                        <span className="text-xl font-display">1.4K</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">Sync_Interval</span>
                    <div className="flex flex-wrap gap-2">
                      {intervals.map(int => (
                        <button
                          key={int.value}
                          onClick={() => setUpdateInterval(int.value)}
                          className={`px-3 py-1.5 text-[8px] font-black border tracking-widest transition-all ${
                            updateInterval === int.value ? 'bg-[var(--accent)] text-black border-[var(--accent)]' : 'border-white/10 text-white/40 hover:border-white'
                          }`}
                        >
                          {int.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <nav className="flex flex-col gap-4 pt-8">
                    {[
                      { name: 'Intelligence Feed', view: 'feed' },
                      { name: 'Ingestion Hub', view: 'sources' },
                      { name: 'Saved Vectors', view: 'feed', cat: 'Bookmarked' },
                    ].map((item, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                          setView(item.view as any);
                          if (item.cat) setActiveCategory(item.cat as any);
                          setShowSidebar(false);
                        }}
                        className="text-left text-[10px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-white hover:translate-x-2 transition-all p-4 border border-transparent hover:border-white/10"
                      >
                        {item.name}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Global_Grid_Sync_OK</span>
                </div>
                <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em] leading-loose">
                  Guru.Verify Terminal Edition // 2026.4
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* GURU Chat Interface */}
      <AnimatePresence>
        {showChat && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-stone-950 border border-white/10 z-[100] shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--accent)] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">GURU_SYSTEM_LINK</span>
              </div>
              <button onClick={() => setShowChat(false)} className="text-white/40 hover:text-white">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
            
            <div className="flex-grow p-4 overflow-y-auto space-y-4 font-mono text-[11px] custom-scrollbar">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.role === 'guru' && (
                      <div className="w-8 h-8 flex-shrink-0 border border-[var(--accent)] flex items-center justify-center bg-[var(--accent)]/10 shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)]">
                        <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                      </div>
                    )}
                    <div className={`p-3 border ${
                      msg.role === 'user' 
                        ? 'border-white/20 bg-white/5 text-white/80' 
                        : 'border-[var(--accent)]/30 bg-[var(--accent)]/5 text-[var(--accent)]'
                    }`}>
                      <span className="block text-[8px] opacity-40 mb-1 uppercase font-black tracking-widest">
                        {msg.role === 'user' ? 'LOCAL_INPUT' : 'GURU_DIVINE_LOG'}
                      </span>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 border border-[var(--accent)] flex items-center justify-center bg-[var(--accent)]/10 animate-pulse">
                      <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                    </div>
                    <div className="border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3 flex flex-col gap-2 min-w-[140px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-[var(--accent)] animate-pulse">GURU_SEEKING_...</span>
                        <div className="flex gap-1">
                          <div className="w-1 h-2 bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0s' }} />
                          <div className="w-1 h-2 bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1 h-2 bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                      <div className="w-full h-[1px] bg-[var(--accent)]/20 relative overflow-hidden">
                        <div className="absolute top-0 h-full bg-[var(--accent)] w-1/3 animate-[scan_1.5s_linear_infinite]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/5">
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="EXECUTE COMMAND..."
                  className="flex-grow bg-transparent border-b border-white/20 py-2 focus:outline-none focus:border-[var(--accent)] text-xs font-bold tracking-widest text-white placeholder-white/20"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                />
                <button 
                  type="submit"
                  className="px-4 py-2 bg-white/10 hover:bg-[var(--accent)] hover:text-black transition-all border border-white/20"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle */}
      <button 
        onClick={() => setShowChat(!showChat)}
        className={`fixed bottom-8 right-8 w-14 h-14 rounded-none z-[100] border-2 flex items-center justify-center transition-all shadow-xl group ${
          showChat 
            ? 'bg-[var(--accent)] border-[var(--accent)] text-black' 
            : 'bg-stone-950 border-white/10 text-white hover:border-[var(--accent)] hover:text-[var(--accent)]'
        }`}
      >
        {showChat ? <Plus className="w-6 h-6 rotate-45" /> : <Sparkles className="w-6 h-6 transition-transform group-hover:scale-110" />}
        {!showChat && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-stone-950 rounded-full animate-pulse" />
        )}
      </button>

      {/* Header */}
      <header className="relative z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/10 flex justify-between items-center w-full px-6 md:px-12 py-6">
        <div className="flex items-center gap-8">
          <Menu className="w-6 h-6 text-white cursor-pointer hover:opacity-70 transition-opacity" onClick={() => setShowSidebar(true)} />
          <h1 className="font-display tracking-tighter text-3xl text-white select-none cursor-pointer" onClick={() => setView('feed')}>GURU.NEWS</h1>
        </div>
        <div className="flex items-center gap-8 text-[11px] uppercase font-bold tracking-[0.3em]">
          <div className="hidden lg:flex items-center gap-4 bg-white/5 px-4 py-2 border border-white/10">
            <span className={`text-[8px] tracking-widest ${isAutoUpdateEnabled ? 'text-[var(--accent)]' : 'text-white/20'}`}>LIVE SYNC</span>
            <button 
              onClick={() => setIsAutoUpdateEnabled(!isAutoUpdateEnabled)}
              className={`w-8 h-4 rounded-full relative transition-colors ${isAutoUpdateEnabled ? 'bg-[var(--accent)]/40' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1 w-2 h-2 rounded-full transition-all ${isAutoUpdateEnabled ? 'right-1 bg-[var(--accent)]' : 'left-1 bg-white/40'}`} />
            </button>
          </div>

          <div className="hidden lg:flex gap-4 items-center mr-4">
            {themes.map(t => (
              <button 
                key={t.name}
                onClick={() => setThemeColor(t.color)}
                className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-125 ${themeColor === t.color ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: t.color }}
                title={t.name}
              />
            ))}
          </div>
          <div className="hidden lg:flex gap-8 opacity-40">
            <span className={`hover:opacity-100 cursor-pointer transition-opacity ${view === 'sources' ? 'opacity-100 text-white' : ''}`} onClick={() => setView('sources')}>Ingestion Hub</span>
            <span className="hover:opacity-100 cursor-pointer transition-opacity">Global Grid</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 px-4 py-1.5 border border-white/20">
            <div className={`w-1.5 h-1.5 bg-white ${view === 'detail' ? 'animate-none' : 'animate-pulse'}`} />
            <span className="text-[9px] text-white tracking-[0.4em] uppercase font-black">
              {view === 'sources' ? 'CONTROL_HUB_ACTIVE' : 'FEED_INTEL_STREAMING'}
            </span>
          </div>
          <Settings className="w-5 h-5 text-white cursor-pointer hover:rotate-90 transition-transform duration-500" />
        </div>
      </header>

      <main className="relative z-10 px-6 md:px-12 py-16 max-w-[1600px] mx-auto w-full flex-grow pb-40">
        <AnimatePresence mode="wait">
          {view === 'feed' ? (
            <motion.div 
              key="feed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-16"
            >
              <div className="flex flex-col lg:flex-row justify-between items-end gap-12">
                <div className="max-w-2xl">
                  <span className="inline-block px-3 py-1 border border-white/20 text-[9px] uppercase tracking-[0.4em] mb-6 font-bold">
                    {activeCategory === 'All' ? `ALL_STREAMS // ${articles.length}_NODES` : `${activeCategory}_CHANNEL // ACTIVE`}
                  </span>
                  <h2 className="font-display text-7xl md:text-9xl uppercase leading-none tracking-tighter mb-6">
                    {activeCategory === 'All' ? 'GURU' : activeCategory}<br/>
                    <span className="text-transparent" style={{ WebkitTextStroke: '1px white' }}>NEWS</span>
                  </h2>
                  <p className="text-sm leading-relaxed opacity-40 font-light max-w-md">
                    Synchronizing with the global intelligence network. Parsing high-entropy news vectors for critical strategic insights. All perspectives mapped. All connections verified.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 border border-white/10 p-6 w-full lg:w-auto">
                  {['All', 'Global', 'Tech', 'Finance', 'Social', 'Science'].map((cat) => (
                    <button 
                      key={cat}
                      onClick={() => setActiveCategory(cat as any)}
                      className={`px-6 py-3 text-[9px] font-black uppercase tracking-[0.3em] transition-all border ${
                        activeCategory === cat ? 'bg-[var(--accent)] text-black border-[var(--accent)]' : 'border-white/10 text-white/40 hover:border-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button 
                    onClick={() => setActiveCategory('Bookmarked' as any)}
                    className={`px-6 py-3 text-[9px] font-black uppercase tracking-[0.3em] transition-all border flex items-center gap-2 ${
                      activeCategory === ('Bookmarked' as any) ? 'bg-[var(--accent)] text-black border-[var(--accent)]' : 'border-white/10 text-white/40 hover:border-white'
                    }`}
                  >
                    <Bookmark className={`w-3 h-3 ${activeCategory === ('Bookmarked' as any) ? 'fill-current' : ''}`} />
                    Saved
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-6 pb-8 border-b border-white/10">
                <div className="relative flex-grow max-w-2xl flex items-center gap-4">
                  <div className="relative flex-grow">
                    <input 
                      type="text"
                      placeholder="SEARCH INTELLIGENCE..."
                      className="w-full bg-transparent border-none py-4 text-xs font-bold tracking-widest focus:outline-none placeholder:text-white/20"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                  </div>
                  {selectedSourceId && (
                    <button 
                      onClick={() => setSelectedSourceId(null)}
                      className="flex items-center gap-2 px-3 py-1 bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-[8px] font-black uppercase tracking-widest hover:bg-[var(--accent)] hover:text-black transition-all"
                    >
                      Clear Source: {sources.find(s => s.id === selectedSourceId)?.name} <Plus className="w-3 h-3 rotate-45" />
                    </button>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex border border-white/10 p-1">
                    {['All', 'VERIFIED', 'DISPUTED'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setActiveStatus(status as any)}
                        className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${
                          activeStatus === status ? 'bg-[var(--accent)] text-black' : 'text-white/30 hover:text-white'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => setView('sources')}
                    className="flex-1 sm:flex-none bg-[var(--accent)] text-black px-8 py-3 rounded-none text-[10px] font-black tracking-[0.2em] flex items-center justify-center gap-2 hover:invert transition-all uppercase"
                  >
                    <Plus className="w-4 h-4" /> Sources
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-white/10">
                {filteredArticles.map((article) => (
                  <motion.div 
                    key={article.id}
                    onClick={() => handleOpenArticle(article.id)}
                    className="group border border-white/10 p-10 flex flex-col justify-between aspect-square cursor-pointer hover:bg-white/[0.03] transition-all relative"
                  >
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-black tracking-[0.5em] text-white/30 uppercase">{article.category} // {article.publisher}</span>
                        <div className="flex items-center gap-3">
                          {article.timestamp === 'JUST NOW' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                          )}
                          <div className={`w-1.5 h-1.5 ${article.status === 'VERIFIED' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                        </div>
                      </div>
                      <h3 className="font-display text-4xl uppercase leading-tight tracking-tight group-hover:translate-x-2 transition-transform duration-500">
                        {article.title}
                      </h3>
                      <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest leading-loose">
                        {article.summary}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <span className="text-[9px] font-black tracking-widest text-white/20 uppercase">{article.timestamp}</span>
                      <div className="flex items-center gap-4">
                        <IconButton 
                          icon={Bookmark} 
                          className={`hover:bg-transparent ${bookmarkedIds.includes(article.id) ? 'text-[var(--accent)]' : 'text-white/20'}`} 
                          onClick={(e) => toggleBookmark(e, article.id)}
                        />
                        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : view === 'sources' ? (
            <motion.div 
              key="sources"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-16"
            >
              <div className="flex flex-col lg:flex-row justify-between items-end gap-12">
                <div className="max-w-2xl">
                  <span className="inline-block px-3 py-1 border border-white/20 text-[9px] uppercase tracking-[0.4em] mb-6 font-bold">Terminal_ID: 0X-882 // Ingestion Hub</span>
                  <h2 className="font-display text-7xl md:text-9xl uppercase leading-none tracking-tighter mb-6">
                    Source<br/>
                    <span className="text-transparent" style={{ WebkitTextStroke: `1px ${themeColor}` }}>Control</span>
                  </h2>
                  <p className="text-sm leading-relaxed opacity-40 font-light max-w-md">
                    Manage high-kinetic news streams. Monitor sync health and connect new narrative vectors.
                  </p>
                </div>
                <button 
                  onClick={() => setIsAddingSource(true)}
                  className="bg-[var(--accent)] text-black px-12 py-5 text-[10px] font-black tracking-[0.4em] uppercase hover:invert transition-all"
                >
                  Connect_New_Source
                </button>
              </div>

              {isAddingSource && (
                <div id="add-source-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-stone-900 border border-white/10 p-10 space-y-8"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-display text-3xl uppercase tracking-tighter">New Source</h4>
                      <button onClick={() => setIsAddingSource(false)} className="text-white/40 hover:text-white">
                        <Plus className="w-6 h-6 rotate-45" />
                      </button>
                    </div>
                    <form onSubmit={handleAddSource} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Identity_Name</label>
                        <input 
                          autoFocus
                          type="text" 
                          required
                          value={newSource.name}
                          onChange={e => setNewSource({...newSource, name: e.target.value})}
                          className="w-full bg-stone-800/50 border border-white/10 p-4 font-bold tracking-widest text-xs focus:border-white focus:outline-none"
                          placeholder="E.G. THE VERGE"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Protocol_URL</label>
                        <input 
                          type="url" 
                          required
                          value={newSource.url}
                          onChange={e => setNewSource({...newSource, url: e.target.value})}
                          className="w-full bg-stone-800/50 border border-white/10 p-4 font-bold tracking-widest text-xs focus:border-white focus:outline-none"
                          placeholder="HTTPS://..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Vector_Category</label>
                        <select 
                          value={newSource.category}
                          onChange={e => setNewSource({...newSource, category: e.target.value})}
                          className="w-full bg-stone-800/50 border border-white/10 p-4 font-bold tracking-widest text-xs focus:border-white focus:outline-none appearance-none font-sans"
                        >
                          {['NEWS', 'TECH', 'WAR', 'MOBILE', 'FINANCE'].map(c => (
                            <option key={c} value={c} className="bg-stone-900">{c}</option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.4em] text-[10px] hover:invert transition-all">
                        Initialize_Link
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}

              <div className="border border-white/10 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="p-8 text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Source_Identity</th>
                      <th className="p-8 text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Protocol_URL</th>
                      <th className="p-8 text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Sync_Status</th>
                      <th className="p-8 text-[9px] font-black text-white/30 uppercase tracking-[0.4em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {sources.map(source => (
                      <tr 
                        key={source.id} 
                        className={`group hover:bg-white/[0.05] transition-colors cursor-pointer ${selectedSourceId === source.id ? 'bg-white/[0.03]' : ''}`}
                        onClick={() => {
                          setSelectedSourceId(source.id);
                          setView('feed');
                          setActiveCategory('All' as any);
                        }}
                      >
                        <td className="p-8">
                          <div className="flex flex-col gap-1">
                            <span className={`font-display text-2xl uppercase tracking-tight transition-colors ${selectedSourceId === source.id ? 'text-[var(--accent)]' : ''}`}>
                              {source.name}
                            </span>
                            <span className="text-[8px] font-black text-white/20 tracking-widest uppercase">{source.category}</span>
                          </div>
                        </td>
                        <td className="p-8">
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{source.url}</span>
                        </td>
                        <td className="p-8">
                          <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 ${source.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                            <span className={`text-[9px] font-black tracking-widest uppercase ${source.status === 'ACTIVE' ? 'text-emerald-500' : 'text-red-500'}`}>
                              {source.status === 'ACTIVE' ? `IDLE // ${source.update || '10M'}` : 'DISCONNECTED'}
                            </span>
                          </div>
                        </td>
                        <td className="p-8 text-right">
                          <div className="flex justify-end gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
                            <IconButton icon={RefreshCw} />
                            <IconButton icon={Trash2} onClick={() => handleRemoveSource(source.id)} className="hover:bg-red-500/20 hover:text-red-500" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 xl:grid-cols-12 gap-12"
            >
              <div className="xl:col-span-8 space-y-12">
                <button 
                  onClick={() => setView('feed')}
                  className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-white transition-colors mb-12"
                >
                  <ArrowLeft className="w-4 h-4" /> Return to Dispatch
                </button>

                <div className="space-y-8 pb-12 border-b border-white/10">
                  <div className="flex flex-wrap gap-4 items-center">
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase bg-[var(--accent)] text-black px-3 py-1">{selectedArticle?.category}</span>
                    <VerificationBadge status={selectedArticle?.status || 'UNVERIFIED'} score={selectedArticle?.truthScore || 0} />
                  </div>
                  <h1 className="font-display text-8xl md:text-9xl uppercase leading-none tracking-tighter">
                    {selectedArticle?.title}
                  </h1>
                  <div className="flex gap-12 text-[10px] uppercase font-bold tracking-[0.2em] text-white/40">
                    <div className="flex flex-col gap-1">
                      <span className="text-white">SOURCE_ORIGIN</span>
                      <span>{selectedArticle?.publisher}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-white">INTEL_TIME</span>
                      <span>{selectedArticle?.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="max-w-2xl text-xl leading-relaxed font-light text-white/70 space-y-8">
                  <p>{selectedArticle?.content}</p>
                </div>

                <div className="pt-24">
                   <button 
                    onClick={handleNextArticle}
                    className="w-full py-16 border border-white/10 hover:bg-white/[0.03] transition-all flex flex-col items-center justify-center gap-6 group"
                   >
                     <span className="text-[9px] font-black tracking-[0.6em] text-white/20 uppercase group-hover:text-white/40">Continuum // Next Intel</span>
                     <div className="flex items-center gap-6">
                        <span className="font-display text-5xl md:text-6xl uppercase tracking-tighter">Next Entry</span>
                        <ArrowUp className="w-8 h-8 rotate-90 group-hover:translate-x-4 transition-transform duration-500" />
                     </div>
                   </button>
                </div>

                <div className="pt-24 space-y-10">
                  <h5 className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] flex items-center gap-4">
                    <div className="w-8 h-[2px] bg-white" /> Lateral Perspectives
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-white/10 mt-8">
                    {selectedArticle?.perspectives.map((p, i) => (
                      <div key={i} className="p-10 border border-white/10 hover:bg-white/[0.03] transition-colors group">
                        <div className="flex justify-between items-start mb-6">
                          <span className="text-[9px] font-black tracking-widest text-white/20 uppercase">{p.source} // {p.bias} BUAY</span>
                          <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white" />
                        </div>
                        <h6 className="font-display uppercase text-2xl tracking-tight mb-4">{p.headline}</h6>
                        <button className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white">Compare_Vector _</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="xl:col-span-4 space-y-12">
                <div className="border border-white/10 p-10 bg-transparent relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                  <h5 className="text-[11px] font-black text-white/30 uppercase tracking-[0.5em] mb-12 flex items-center gap-4">
                    <History className="w-5 h-5 text-white animate-pulse" /> Narrative Chain
                  </h5>
                  <div className="relative space-y-16 pl-6">
                    <div className="absolute left-[2.5px] top-2 bottom-2 w-[1px] bg-white/10" />
                    {currentTimeline.map((item, i) => (
                      <div 
                        key={item.id} 
                        className={`relative group cursor-pointer transition-opacity ${i === 0 ? 'opacity-100' : 'opacity-30 hover:opacity-100'}`}
                        onClick={() => i !== 0 && handleOpenArticle(item.id)}
                      >
                        <div className="absolute -left-[6.5px] top-1.5 w-2 h-2 bg-white" />
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 block mb-3">
                          {i === 0 ? 'CURRENT_EVENT' : 'PREVIOUS_DEPENDENCY'} // {item.timestamp}
                        </span>
                        <h6 className="font-display uppercase text-xl leading-tight tracking-tight mb-4">{item.title}</h6>
                        <div className="flex items-center gap-2 text-[8px] font-black text-white/20 uppercase tracking-widest">
                          <AlignLeft className="w-3 h-3" /> View Vector
                        </div>
                      </div>
                    ))}
                    {currentTimeline.length < 2 && (
                      <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 pt-8 border-t border-white/5">
                        Deep Cluster Discovery Active...
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-white/10 p-10 space-y-8">
                  <h5 className="text-[9px] font-black text-white/30 uppercase tracking-[0.5em] flex items-center gap-4">
                    <Layers className="w-5 h-5" /> Meta_Analysis
                  </h5>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-loose">
                    Signal Integrity: 98.2%. Historical deduplication protocol applied. No redundant reporting detected in this narrative node.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-10 left-12 flex flex-col gap-6 z-50">
        <div className="flex gap-4">
          {[Home, Compass, Bookmark, BarChart2, User].map((Icon, i) => (
            <div key={i} className="relative group cursor-pointer" onClick={() => i === 0 && setView('feed')}>
              <div className={`w-3 h-3 border ${i === 0 && view === 'feed' ? 'bg-white border-white scale-125 shadow-[0_0_10px_white]' : 'border-white/40 group-hover:border-white group-hover:scale-110'} transition-all`} />
              <div className="absolute bottom-8 left-0 text-[8px] font-black uppercase tracking-[0.3em] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Nav_0{i + 1}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}

