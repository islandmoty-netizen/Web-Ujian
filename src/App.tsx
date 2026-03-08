/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  LogOut, 
  Plus, 
  Trash2, 
  FileText, 
  Users, 
  Brain, 
  Clock, 
  CheckCircle, 
  Download,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Eye,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateQuestions } from './services/geminiService';

// --- Types ---
interface UserData {
  id: number;
  username: string;
  role: 'admin' | 'user';
  duration: number;
}

interface Question {
  id: number;
  category: string;
  question: string;
  options: string[];
  correct_answer: string;
}

interface Result {
  id: number;
  username: string;
  score: number;
  total_questions: number;
  details: string;
  completed_at: string;
}

// --- Components ---

const LoginPage = ({ onLogin }: { onLogin: (user: UserData) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E4E3E0] p-4">
      <div className="w-full max-w-md bg-white border border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-black flex items-center justify-center rounded-full">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2 font-serif italic">PSIKOTES POLRI</h1>
        <p className="text-center text-sm text-gray-600 mb-8 uppercase tracking-widest">Sistem Ujian Online</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                className="w-full pl-10 pr-4 py-2 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="password" 
                className="w-full pl-10 pr-4 py-2 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-xs font-bold">{error}</p>}
          <button 
            type="submit" 
            className="w-full bg-black text-white py-3 font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
          >
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
};

const AdminDashboard = ({ user, onLogout }: { user: UserData; onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'questions' | 'results'>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  
  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDuration, setNewDuration] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genCount, setGenCount] = useState(5);

  const fetchData = async () => {
    const [uRes, qRes, rRes] = await Promise.all([
      fetch('/api/users'),
      fetch('/api/questions'),
      fetch('/api/results')
    ]);
    setUsers(await uRes.json());
    setQuestions(await qRes.json());
    setResults(await rRes.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername, password: newPassword, duration: newDuration }),
    });
    if (res.ok) {
      setNewUsername('');
      setNewPassword('');
      fetchData();
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (confirm('Hapus user ini?')) {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (confirm('Hapus soal ini?')) {
      await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleGenerateQuestions = async (category: string) => {
    setIsGenerating(true);
    try {
      const generated = await generateQuestions(category, genCount);
      if (generated.length > 0) {
        await fetch('/api/questions/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: generated }),
        });
        fetchData();
      } else {
        alert('Gagal generate soal. Pastikan API Key sudah terpasang.');
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat generate soal.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hasil Ujian");
    XLSX.writeFile(wb, "Hasil_Ujian_Psikotes.xlsx");
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex flex-col">
      {/* Header */}
      <header className="bg-black text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6" />
          <h1 className="font-bold tracking-widest uppercase text-sm">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase opacity-70">Logged in as {user.username}</span>
          <button onClick={onLogout} className="flex items-center gap-2 text-xs font-bold uppercase hover:text-red-400">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-black bg-white p-6 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-3 p-3 font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'users' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
          >
            <Users className="w-4 h-4" /> Manajemen User
          </button>
          <button 
            onClick={() => setActiveTab('questions')}
            className={`flex items-center gap-3 p-3 font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'questions' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
          >
            <Brain className="w-4 h-4" /> Manajemen Soal
          </button>
          <button 
            onClick={() => setActiveTab('results')}
            className={`flex items-center gap-3 p-3 font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'results' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
          >
            <FileText className="w-4 h-4" /> Hasil Ujian
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'users' && (
            <div className="space-y-8">
              <div className="bg-white border border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-lg font-bold uppercase mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Tambah Peserta
                </h2>
                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">Username</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-black text-sm"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">Password</label>
                    <input 
                      type="password" 
                      className="w-full p-2 border border-black text-sm"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">Durasi (Menit)</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border border-black text-sm"
                      value={newDuration}
                      onChange={(e) => setNewDuration(parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <button type="submit" className="bg-black text-white p-2 font-bold uppercase text-xs tracking-widest hover:bg-gray-800">
                    Simpan User
                  </button>
                </form>
              </div>

              <div className="bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-bottom border-black bg-gray-50">
                      <th className="p-4 text-[10px] font-bold uppercase">ID</th>
                      <th className="p-4 text-[10px] font-bold uppercase">Username</th>
                      <th className="p-4 text-[10px] font-bold uppercase">Durasi</th>
                      <th className="p-4 text-[10px] font-bold uppercase text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-t border-black/10 hover:bg-gray-50">
                        <td className="p-4 text-sm font-mono">{u.id}</td>
                        <td className="p-4 text-sm font-bold">{u.username}</td>
                        <td className="p-4 text-sm">{u.duration} Menit</td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:bg-red-50 p-2 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-8">
              <div className="bg-white border border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-lg font-bold uppercase mb-4 flex items-center gap-2">
                  <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} /> 
                  Generate Soal Otomatis (Gemini AI)
                </h2>
                
                <div className="mb-6">
                  <label className="block text-[10px] font-bold uppercase mb-1">Jumlah Soal yang Ingin Ditambah</label>
                  <input 
                    type="number" 
                    min="1"
                    max="20"
                    className="w-full md:w-48 p-2 border border-black text-sm"
                    value={genCount}
                    onChange={(e) => setGenCount(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-[9px] text-gray-500 mt-1 uppercase font-bold">Maksimal 20 soal per sekali generate</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    disabled={isGenerating}
                    onClick={() => handleGenerateQuestions('kepribadian')}
                    className="border-2 border-black p-4 font-bold uppercase text-xs tracking-widest hover:bg-black hover:text-white transition-all disabled:opacity-50"
                  >
                    Kepribadian
                  </button>
                  <button 
                    disabled={isGenerating}
                    onClick={() => handleGenerateQuestions('ketelitian')}
                    className="border-2 border-black p-4 font-bold uppercase text-xs tracking-widest hover:bg-black hover:text-white transition-all disabled:opacity-50"
                  >
                    Ketelitian
                  </button>
                  <button 
                    disabled={isGenerating}
                    onClick={() => handleGenerateQuestions('kecerdasan')}
                    className="border-2 border-black p-4 font-bold uppercase text-xs tracking-widest hover:bg-black hover:text-white transition-all disabled:opacity-50"
                  >
                    Kecerdasan
                  </button>
                </div>
              </div>

              <div className="bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-4 border-b border-black bg-gray-50 flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-widest">Daftar Soal ({questions.length})</h3>
                </div>
                <div className="divide-y divide-black/10 max-h-[500px] overflow-y-auto">
                  {questions.map(q => (
                    <div key={q.id} className="p-4 hover:bg-gray-50 flex justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase px-2 py-1 bg-black text-white mb-2 inline-block">
                          {q.category}
                        </span>
                        <p className="text-sm font-bold mb-2">{q.question}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt, i) => (
                            <div key={i} className={`text-xs p-1 px-2 border ${opt === q.correct_answer ? 'border-green-500 bg-green-50 font-bold' : 'border-gray-200'}`}>
                              {String.fromCharCode(65 + i)}. {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-600 self-start p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold uppercase">Hasil Ujian Peserta</h2>
                <button 
                  onClick={exportToExcel}
                  className="bg-green-600 text-white px-4 py-2 font-bold uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-green-700"
                >
                  <Download className="w-4 h-4" /> Export Excel
                </button>
              </div>

              <div className="bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-bottom border-black bg-gray-50">
                      <th className="p-4 text-[10px] font-bold uppercase">Peserta</th>
                      <th className="p-4 text-[10px] font-bold uppercase">Skor</th>
                      <th className="p-4 text-[10px] font-bold uppercase">Total Soal</th>
                      <th className="p-4 text-[10px] font-bold uppercase">Waktu Selesai</th>
                      <th className="p-4 text-[10px] font-bold uppercase text-right">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.id} className="border-t border-black/10 hover:bg-gray-50">
                        <td className="p-4 text-sm font-bold">{r.username}</td>
                        <td className="p-4 text-sm font-mono text-blue-600 font-bold">{r.score}</td>
                        <td className="p-4 text-sm">{r.total_questions}</td>
                        <td className="p-4 text-sm text-gray-500">{new Date(r.completed_at).toLocaleString()}</td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => setSelectedResult(r)}
                            className="text-black hover:bg-gray-100 p-2 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detail Modal */}
              {selectedResult && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[80vh] flex flex-col">
                    <div className="p-4 border-b border-black flex justify-between items-center bg-black text-white">
                      <h3 className="font-bold uppercase text-xs tracking-widest">Detail Jawaban: {selectedResult.username}</h3>
                      <button onClick={() => setSelectedResult(null)}><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {JSON.parse(selectedResult.details).map((item: any, idx: number) => (
                        <div key={idx} className={`p-4 border ${item.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-black text-white">Soal {idx + 1}</span>
                            {item.isCorrect ? 
                              <span className="text-[10px] font-bold text-green-700 uppercase">Benar</span> : 
                              <span className="text-[10px] font-bold text-red-700 uppercase">Salah</span>
                            }
                          </div>
                          <p className="text-sm font-bold mb-3">{item.question}</p>
                          <div className="grid grid-cols-1 gap-1 text-xs">
                            <p><span className="opacity-60">Jawaban Peserta:</span> <span className="font-bold">{item.userAnswer || '(Tidak Dijawab)'}</span></p>
                            {!item.isCorrect && <p><span className="opacity-60">Jawaban Benar:</span> <span className="font-bold text-green-700">{item.correctAnswer}</span></p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const UserExam = ({ user, onLogout }: { user: UserData; onLogout: () => void }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(user.duration * 60);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [examResults, setExamResults] = useState<{ score: number; total: number; details: any[] } | null>(null);

  useEffect(() => {
    fetch('/api/questions')
      .then(res => res.json())
      .then(data => {
        setQuestions(data);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 && !isFinished) {
      handleFinish();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isFinished]);

  const handleFinish = async () => {
    let score = 0;
    const details = questions.map(q => {
      const isCorrect = answers[q.id] === q.correct_answer;
      if (isCorrect) score++;
      return {
        question: q.question,
        userAnswer: answers[q.id],
        correctAnswer: q.correct_answer,
        isCorrect
      };
    });

    const resultsData = {
      score,
      total: questions.length,
      details
    };

    await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        score,
        total_questions: questions.length,
        details
      }),
    });

    setExamResults(resultsData);
    setIsFinished(true);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold uppercase tracking-widest">Loading Exam...</div>;

  if (isFinished && examResults) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center p-4 py-12">
        <div className="max-w-2xl w-full bg-white border border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center mb-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold uppercase mb-2">Ujian Selesai</h2>
          <p className="text-gray-600 mb-6">Terima kasih telah mengikuti simulasi psikotes Polri.</p>
          
          <div className="bg-black text-white p-6 mb-8">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Skor Akhir Anda</p>
            <p className="text-4xl font-bold font-mono">{examResults.score} / {examResults.total}</p>
          </div>

          <button 
            onClick={onLogout}
            className="w-full bg-black text-white py-3 font-bold uppercase tracking-widest hover:bg-gray-800"
          >
            Kembali ke Login
          </button>
        </div>

        <div className="max-w-2xl w-full space-y-4">
          <h3 className="font-bold uppercase text-sm tracking-widest mb-4">Rincian Jawaban:</h3>
          {examResults.details.map((item, idx) => (
            <div key={idx} className={`bg-white border border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${item.isCorrect ? 'border-l-8 border-l-green-500' : 'border-l-8 border-l-red-500'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-black text-white">Soal {idx + 1}</span>
                <span className={`text-[10px] font-bold uppercase ${item.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {item.isCorrect ? 'Benar' : 'Salah'}
                </span>
              </div>
              <p className="text-sm font-bold mb-3">{item.question}</p>
              <div className="text-xs space-y-1">
                <p><span className="opacity-60">Jawaban Anda:</span> <span className="font-bold">{item.userAnswer || '(Tidak Dijawab)'}</span></p>
                {!item.isCorrect && (
                  <p><span className="opacity-60">Jawaban Benar:</span> <span className="font-bold text-green-700">{item.correctAnswer}</span></p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
          <h2 className="text-xl font-bold uppercase mb-4">Belum Ada Soal</h2>
          <p className="text-gray-600 mb-8">Admin belum mengunggah soal ujian.</p>
          <button onClick={onLogout} className="w-full bg-black text-white py-3 font-bold uppercase tracking-widest">Logout</button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex flex-col">
      <header className="bg-black text-white p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5" />
          <h1 className="font-bold tracking-widest uppercase text-xs">Ujian Psikotes Polri</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded">
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold text-sm">{formatTime(timeLeft)}</span>
          </div>
          <button onClick={() => { if(confirm('Selesai sekarang?')) handleFinish() }} className="text-xs font-bold uppercase bg-red-600 px-3 py-1 hover:bg-red-700">
            Selesai
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 py-12">
        <div className="bg-white border border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center mb-6">
            <span className="text-[10px] font-bold uppercase px-2 py-1 bg-black text-white">
              {currentQ.category}
            </span>
            <span className="text-xs font-bold uppercase text-gray-400">
              Soal {currentIdx + 1} dari {questions.length}
            </span>
          </div>

          <h2 className="text-xl font-bold mb-8 leading-relaxed">
            {currentQ.question}
          </h2>

          <div className="space-y-3 mb-12">
            {currentQ.options.map((opt, i) => (
              <button 
                key={i}
                onClick={() => setAnswers({ ...answers, [currentQ.id]: opt })}
                className={`w-full text-left p-4 border-2 transition-all flex items-center gap-4 ${
                  answers[currentQ.id] === opt 
                  ? 'border-black bg-black text-white' 
                  : 'border-gray-200 hover:border-black'
                }`}
              >
                <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                  answers[currentQ.id] === opt ? 'border-white' : 'border-black'
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-sm font-medium">{opt}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <button 
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => prev - 1)}
              className="px-6 py-2 border border-black font-bold uppercase text-xs tracking-widest disabled:opacity-30"
            >
              Sebelumnya
            </button>
            {currentIdx === questions.length - 1 ? (
              <button 
                onClick={handleFinish}
                className="px-6 py-2 bg-green-600 text-white font-bold uppercase text-xs tracking-widest hover:bg-green-700"
              >
                Kirim Jawaban
              </button>
            ) : (
              <button 
                onClick={() => setCurrentIdx(prev => prev + 1)}
                className="px-6 py-2 bg-black text-white font-bold uppercase text-xs tracking-widest flex items-center gap-2"
              >
                Berikutnya <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Question Grid */}
        <div className="mt-12 grid grid-cols-5 sm:grid-cols-10 gap-2">
          {questions.map((_, i) => (
            <button 
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`h-10 border font-bold text-xs flex items-center justify-center ${
                currentIdx === i ? 'border-black bg-black text-white ring-2 ring-offset-2 ring-black' : 
                answers[questions[i].id] ? 'border-black bg-gray-200' : 'border-gray-300 bg-white'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return <UserExam user={user} onLogout={handleLogout} />;
}
