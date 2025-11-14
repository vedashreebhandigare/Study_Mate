import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getLearningStats,
  getUserProfile,
  getUserBadges,
  getRecentActivity,
  getAllDocumentMastery,
  getQuizTrendData,
  getStudyTimeData,
  getSuggestedNextAction,
  checkAndAwardBadges,
  type LearningStats,
  type UserProfile,
  type Badge,
  type ActivityEvent,
  type DocumentMastery,
  type QuizTrendData,
  type StudyTimeData,
} from '../lib/profile-utils';
import { StudyHeatmap } from './StudyHeatmap';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  FileText, 
  Trophy, 
  Layers, 
  MessageCircle, 
  Flame, 
  Clock,
  Settings,
  Download,
  Share2,
  ChevronRight,
  Award,
  TrendingUp,
  Calendar,
  Filter,
  Edit,
  Bell,
  Moon,
  Sun,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { toast } from 'sonner';

interface ProfilePageProps {
  onNavigate?: (page: string, data?: any) => void;
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [masteryData, setMasteryData] = useState<DocumentMastery[]>([]);
  const [quizTrend, setQuizTrend] = useState<QuizTrendData[]>([]);
  const [studyTimeData, setStudyTimeData] = useState<StudyTimeData[]>([]);
  const [suggestedAction, setSuggestedAction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState<'7days' | 'all'>('7days');
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    initializeProfile();
  }, []);

  useEffect(() => {
    if (userId) {
      loadActivityData();
    }
  }, [activityFilter, userId]);

  async function initializeProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to view your profile');
        onNavigate?.('dashboard');
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Load all profile data
      const [
        profileData,
        statsData,
        badgesData,
        masteryDataResult,
        quizTrendResult,
        studyTimeResult,
        suggestionResult,
      ] = await Promise.all([
        getUserProfile(user.id),
        getLearningStats(user.id),
        getUserBadges(user.id),
        getAllDocumentMastery(user.id),
        getQuizTrendData(user.id, 10),
        getStudyTimeData(user.id),
        getSuggestedNextAction(user.id),
      ]);

      setProfile(profileData);
      setStats(statsData);
      setBadges(badgesData);
      setMasteryData(masteryDataResult);
      setQuizTrend(quizTrendResult);
      setStudyTimeData(studyTimeResult);
      setSuggestedAction(suggestionResult);

      // Check for new badges
      await checkAndAwardBadges(user.id);

      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile data');
      setLoading(false);
    }
  }

  async function loadActivityData() {
    if (!userId) return;
    const days = activityFilter === '7days' ? 7 : undefined;
    const activityData = await getRecentActivity(userId, 20, days);
    setActivities(activityData);
  }

  function formatStudyTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  }

  function getMasteryColor(score: number): string {
    if (score >= 85) return 'text-green-400';
    if (score >= 65) return 'text-yellow-400';
    return 'text-red-400';
  }

  function getMasteryLabel(score: number): { label: string; color: string } {
    if (score >= 85) return { label: 'Strong', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    if (score >= 65) return { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    return { label: 'Weak', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case 'document_upload': return '📄';
      case 'quiz_complete': return '🏆';
      case 'flashcard_review': return '🗂️';
      case 'tutor_session': return '💬';
      case 'badge_earned': return '🌟';
      default: return '📌';
    }
  }

  function handleAction(action: string) {
    const [actionType, data] = action.split(':');
    
    switch (actionType) {
      case 'upload':
        onNavigate?.('dashboard');
        break;
      case 'quiz':
        onNavigate?.('dashboard');
        break;
      case 'flashcards':
        onNavigate?.('dashboard');
        break;
      case 'tutor':
        onNavigate?.('dashboard', { openTutor: true, documentId: data });
        break;
      case 'document':
        onNavigate?.('dashboard', { documentId: data });
        break;
      case 'generate-quiz':
        onNavigate?.('dashboard', { generateQuiz: true, documentId: data });
        break;
    }
  }

  async function exportToPDF() {
    toast.info('PDF export coming soon!');
    // TODO: Implement PDF export with jsPDF
  }

  async function shareToLinkedIn() {
    toast.info('LinkedIn share coming soon!');
    // TODO: Implement LinkedIn share with html2canvas
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading your learning journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 pt-32">
        {/* User Header */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-2 border-purple-500/50">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-purple-500/20 text-2xl">
                  {profile?.full_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl md:text-3xl mb-1">
                  {profile?.full_name || 'Learning Enthusiast'}
                </h1>
                <p className="text-white/60">{profile?.role || 'Student'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-white/80">
                    {badges.filter(b => b.earned).reduce((sum, b) => sum + b.points, 0)} points
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              variant="outline"
              className="bg-white/5 border-white/10 hover:bg-white/10"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Suggested Next Action */}
        {suggestedAction && (
          <div className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-xl border border-purple-500/30 p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🎯</div>
              <div className="flex-1">
                <h3 className="text-lg mb-1">{suggestedAction.title}</h3>
                <p className="text-white/70 text-sm mb-4">{suggestedAction.description}</p>
                <div className="flex gap-3">
                  {suggestedAction.actions.map((action: any, idx: number) => (
                    <Button
                      key={idx}
                      onClick={() => handleAction(action.action)}
                      className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={FileText} label="Documents" value={stats?.documentsAnalyzed || 0} />
          <StatCard icon={Trophy} label="Quizzes" value={stats?.quizzesCompleted || 0} />
          <StatCard icon={Layers} label="Flashcards" value={stats?.flashcardsReviewed || 0} />
          <StatCard icon={MessageCircle} label="Tutor Sessions" value={stats?.tutorSessions || 0} />
          <StatCard 
            icon={Flame} 
            label="Current Streak" 
            value={`${stats?.currentStreak || 0} days`}
            highlight={stats?.currentStreak && stats.currentStreak >= 7}
          />
          <StatCard 
            icon={Clock} 
            label="Study Time" 
            value={formatStudyTime(stats?.totalStudyTime || 0)} 
          />
        </div>

        {/* Study Heatmap */}
        {userId && <StudyHeatmap userId={userId} />}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Charts & Documents */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Charts */}
            {quizTrend.length > 0 && (
              <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
                <h3 className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Quiz Performance Trend
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={quizTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#a855f7" 
                      strokeWidth={2}
                      dot={{ fill: '#a855f7', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {studyTimeData.length > 0 && (
              <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
                <h3 className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Weekly Study Time
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={studyTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="week" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="minutes" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Document Progress Tracker */}
            <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              <h3 className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-purple-400" />
                Document Mastery
              </h3>
              <div className="space-y-4">
                {masteryData.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No documents yet. Upload one to get started!</p>
                  </div>
                ) : (
                  masteryData.map(doc => {
                    const masteryLevel = getMasteryLabel(doc.masteryScore);
                    return (
                      <div key={doc.documentId} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-sm mb-1 line-clamp-1">{doc.documentName}</h4>
                            <div className="flex items-center gap-2">
                              <span className={`text-2xl ${getMasteryColor(doc.masteryScore)}`}>
                                {doc.masteryScore}
                              </span>
                              <span className="text-white/60 text-sm">/ 100</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs border ${masteryLevel.color}`}>
                                {masteryLevel.label}
                              </span>
                            </div>
                          </div>
                          <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 flex items-center justify-center">
                            <span className="text-sm">{doc.masteryScore}%</span>
                          </div>
                        </div>
                        <Progress value={doc.masteryScore} className="h-2 mb-2" />
                        {doc.suggestedAction && (
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                            <span className="text-xs text-white/60">{doc.suggestedAction}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 hover:bg-white/10"
                              onClick={() => handleAction(`document:${doc.documentId}`)}
                            >
                              Continue <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  Recent Activity
                </h3>
                <Tabs value={activityFilter} onValueChange={(v) => setActivityFilter(v as any)}>
                  <TabsList className="bg-white/5">
                    <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
                    <TabsTrigger value="all">All Time</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  activities.map(activity => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-white/40 mt-1">
                          {new Date(activity.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Badges, Actions, Settings */}
          <div className="space-y-6">
            {/* Achievements */}
            <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              <h3 className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-yellow-400" />
                Achievements
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {badges.map(badge => (
                  <div
                    key={badge.id}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      badge.earned
                        ? 'bg-purple-500/10 border-purple-500/30 hover:scale-105'
                        : 'bg-white/5 border-white/10 opacity-40'
                    }`}
                    title={badge.description || badge.name}
                  >
                    <div className="text-3xl mb-1">{badge.icon}</div>
                    <p className="text-xs line-clamp-2">{badge.name}</p>
                    {badge.earned && (
                      <p className="text-xs text-purple-400 mt-1">+{badge.points}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Export & Share */}
            <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              <h3 className="mb-4">Export & Share</h3>
              <div className="space-y-3">
                <Button
                  onClick={exportToPDF}
                  className="w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report (PDF)
                </Button>
                <Button
                  onClick={shareToLinkedIn}
                  className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share to LinkedIn
                </Button>
              </div>
            </div>

            {/* Settings */}
            <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center justify-between w-full mb-4"
              >
                <h3 className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Settings
                </h3>
                <ChevronRight className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-90' : ''}`} />
              </button>
              {showSettings && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-white/60" />
                      <span className="text-sm">Notifications</span>
                    </div>
                    <Switch defaultChecked={profile?.notifications_enabled} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {profile?.theme_preference === 'dark' ? (
                        <Moon className="w-4 h-4 text-white/60" />
                      ) : (
                        <Sun className="w-4 h-4 text-white/60" />
                      )}
                      <span className="text-sm">Dark Mode</span>
                    </div>
                    <Switch defaultChecked={profile?.theme_preference === 'dark'} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {profile?.profile_visibility === 'public' ? (
                        <Eye className="w-4 h-4 text-white/60" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-white/60" />
                      )}
                      <span className="text-sm">Public Profile</span>
                    </div>
                    <Switch defaultChecked={profile?.profile_visibility === 'public'} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  highlight = false 
}: { 
  icon: any; 
  label: string; 
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 backdrop-blur-xl border transition-all ${
      highlight
        ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30'
        : 'bg-white/5 border-white/10'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${highlight ? 'text-orange-400' : 'text-purple-400'}`} />
        <span className="text-xs text-white/60">{label}</span>
      </div>
      <p className="text-2xl">{value}</p>
    </div>
  );
}
