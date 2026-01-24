import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Users, 
  Eye, 
  Heart, 
  ChevronRight,
  Wallet,
  Globe,
  AlertCircle,
  CheckCircle2,
  ArrowDownToLine,
  CreditCard,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import PaymentMethodsModal from '@/components/PaymentMethodsModal';
import CountrySelector from '@/components/CountrySelector';

interface EarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EarningsData {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  watchHours: number;
  followers: number;
  isEligible: boolean;
  countryCode: string;
  countryName: string;
  vatRate: number;
  currency: string;
  weeklyEarnings: { day: string; gross: number; net: number }[];
  reelEarnings: { title: string; gross: number; views: number }[];
}

const FOLLOWER_GOAL = 6000;
const WATCH_HOURS_GOAL = 2000000;

const EarningsModal: React.FC<EarningsModalProps> = ({ isOpen, onClose }) => {
  const { authUser, currentUser } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [data, setData] = useState<EarningsData>({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    watchHours: 0,
    followers: 0,
    isEligible: false,
    countryCode: 'US',
    countryName: 'United States',
    vatRate: 0,
    currency: 'USD',
    weeklyEarnings: [],
    reelEarnings: [],
  });

  useEffect(() => {
    if (isOpen && authUser) {
      fetchEarningsData();
      fetchPayoutHistory();
    }
  }, [isOpen, authUser]);

  const fetchPayoutHistory = async () => {
    if (!authUser) return;
    const { data } = await supabase
      .from('creator_payouts')
      .select('*')
      .eq('user_id', authUser.id)
      .order('requested_at', { ascending: false })
      .limit(10);
    
    if (data) setPayoutHistory(data);
  };

  const handleRequestPayout = async () => {
    if (!authUser || data.pendingEarnings < 50) return;

    // Check if user has payment method set up
    const storedMethods = localStorage.getItem(`payment_methods_${authUser.id}`);
    if (!storedMethods || JSON.parse(storedMethods).length === 0) {
      toast({ 
        title: 'Payment Method Required', 
        description: 'Please add a payment method first',
        variant: 'destructive'
      });
      setShowPaymentMethods(true);
      return;
    }

    setRequestingPayout(true);
    try {
      const { error } = await supabase.from('creator_payouts').insert({
        user_id: authUser.id,
        amount: data.pendingEarnings,
        vat_deducted: data.pendingEarnings * (data.vatRate / 100),
        currency: data.currency,
        country_code: data.countryCode,
        payout_method: JSON.parse(storedMethods)[0]?.type || 'unknown',
      });

      if (error) throw error;

      toast({ title: 'Payout Requested', description: 'Your payout request has been submitted' });
      fetchPayoutHistory();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to request payout', variant: 'destructive' });
    } finally {
      setRequestingPayout(false);
    }
  };

  const fetchEarningsData = async () => {
    if (!authUser) return;
    setLoading(true);

    try {
      // Fetch profile with monetization data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, country_code, is_monetized, total_watch_hours, lifetime_earnings')
        .eq('user_id', authUser.id)
        .single();

      // Fetch VAT rate for country
      const countryCode = profile?.country_code || 'US';
      const { data: vatData } = await supabase
        .from('country_vat_rates')
        .select('*')
        .eq('country_code', countryCode)
        .single();

      // Fetch followers count
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', authUser.id);

      // Fetch reels with engagement data
      const { data: reels } = await supabase
        .from('reels')
        .select('id, title, views_count, likes_count, comments_count, shares_count, created_at')
        .eq('user_id', authUser.id);

      // Fetch likes on user's reels for bonus calculation
      const { count: totalLikesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .in('reel_id', reels?.map(r => r.id) || []);

      // Revenue calculation algorithm:
      // Base rate: $0.001 per view (CPM = $1.00)
      // Engagement bonus: $0.002 per like
      // Share bonus: $0.003 per share
      // Comment bonus: $0.001 per comment
      // Watch time multiplier: 1.5x for high engagement content (>5% engagement rate)
      
      const BASE_VIEW_RATE = 0.001; // $1 CPM
      const LIKE_BONUS = 0.002;
      const SHARE_BONUS = 0.003;
      const COMMENT_BONUS = 0.001;
      
      const totalViews = reels?.reduce((sum, r) => sum + (r.views_count || 0), 0) || 0;
      const totalLikes = reels?.reduce((sum, r) => sum + (r.likes_count || 0), 0) || 0;
      const totalShares = reels?.reduce((sum, r) => sum + (r.shares_count || 0), 0) || 0;
      const totalComments = reels?.reduce((sum, r) => sum + (r.comments_count || 0), 0) || 0;
      
      // Calculate engagement rate for bonus multiplier
      const engagementRate = totalViews > 0 ? ((totalLikes + totalComments + totalShares) / totalViews) * 100 : 0;
      const watchTimeMultiplier = engagementRate > 5 ? 1.5 : 1.0;
      
      // Calculate gross earnings
      const viewEarnings = totalViews * BASE_VIEW_RATE * watchTimeMultiplier;
      const likeEarnings = totalLikes * LIKE_BONUS;
      const shareEarnings = totalShares * SHARE_BONUS;
      const commentEarnings = totalComments * COMMENT_BONUS;
      
      const grossEarnings = viewEarnings + likeEarnings + shareEarnings + commentEarnings;
      const vatRate = Number(vatData?.vat_rate) || 0;
      const vatDeduction = grossEarnings * (vatRate / 100);
      const netEarnings = grossEarnings - vatDeduction;

      // Calculate watch hours (estimate: 30 seconds avg per view = 0.00833 hours)
      const estimatedWatchHours = totalViews * 0.00833;

      // Generate weekly earnings chart data from actual reel performance
      const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const today = new Date();
      const weeklyEarnings = weekDays.map((day, idx) => {
        const targetDay = new Date(today);
        targetDay.setDate(today.getDate() - (6 - idx));
        
        const dayReels = reels?.filter(r => {
          const reelDate = new Date(r.created_at);
          return reelDate.toDateString() === targetDay.toDateString();
        }) || [];
        
        const dayViews = dayReels.reduce((s, r) => s + (r.views_count || 0), 0);
        const dayLikes = dayReels.reduce((s, r) => s + (r.likes_count || 0), 0);
        const dayShares = dayReels.reduce((s, r) => s + (r.shares_count || 0), 0);
        const dayComments = dayReels.reduce((s, r) => s + (r.comments_count || 0), 0);
        
        const gross = (dayViews * BASE_VIEW_RATE) + (dayLikes * LIKE_BONUS) + (dayShares * SHARE_BONUS) + (dayComments * COMMENT_BONUS);
        const net = gross * (1 - vatRate / 100);
        
        return { day, gross: Number(gross.toFixed(4)), net: Number(net.toFixed(4)) };
      });

      // Top performing reels by calculated earnings
      const reelEarnings = reels?.map(r => {
        const views = r.views_count || 0;
        const likes = r.likes_count || 0;
        const shares = r.shares_count || 0;
        const comments = r.comments_count || 0;
        const engagement = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;
        const multiplier = engagement > 5 ? 1.5 : 1.0;
        
        const gross = (views * BASE_VIEW_RATE * multiplier) + (likes * LIKE_BONUS) + (shares * SHARE_BONUS) + (comments * COMMENT_BONUS);
        
        return {
          title: r.title?.slice(0, 20) + (r.title && r.title.length > 20 ? '...' : ''),
          gross,
          views,
        };
      }).sort((a, b) => b.gross - a.gross).slice(0, 5) || [];

      const followers = followersCount || 0;
      const isEligible = followers >= FOLLOWER_GOAL && estimatedWatchHours >= WATCH_HOURS_GOAL;

      setData({
        totalEarnings: netEarnings,
        pendingEarnings: netEarnings, // All unpaid earnings are pending
        paidEarnings: 0, // Track from creator_earnings when paid
        watchHours: estimatedWatchHours,
        followers,
        isEligible,
        countryCode,
        countryName: vatData?.country_name || 'United States',
        vatRate,
        currency: vatData?.currency || 'USD',
        weeklyEarnings,
        reelEarnings,
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const symbols: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', ZAR: 'R', NGN: '₦', KES: 'KSh', 
      GHS: '₵', INR: '₹', BRL: 'R$', JPY: '¥', AUD: 'A$', CAD: 'C$',
      AED: 'د.إ', SGD: 'S$', MYR: 'RM', PHP: '₱', THB: '฿', IDR: 'Rp',
      PKR: '₨', EGP: 'E£', TRY: '₺', PLN: 'zł', SEK: 'kr', MXN: 'MX$',
    };
    const symbol = symbols[data.currency] || '$';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  };

  const followerProgress = Math.min((data.followers / FOLLOWER_GOAL) * 100, 100);
  const watchHoursProgress = Math.min((data.watchHours / WATCH_HOURS_GOAL) * 100, 100);

  const chartConfig = {
    gross: { label: 'Gross', color: 'hsl(var(--primary))' },
    net: { label: 'Net', color: 'hsl(var(--chart-2))' },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Earnings & Monetization
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Eligibility Banner */}
            <div className={`p-4 rounded-xl ${data.isEligible ? 'bg-green-500/10 border border-green-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
              <div className="flex items-center gap-3 mb-3">
                {data.isEligible ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                )}
                <div>
                  <p className="font-semibold">
                    {data.isEligible ? 'You\'re Eligible to Earn!' : 'Keep Growing!'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.isEligible 
                      ? 'Congratulations! You can now earn from your content.'
                      : 'Meet the requirements below to start earning.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" /> Followers
                    </span>
                    <span>{formatNumber(data.followers)} / {formatNumber(FOLLOWER_GOAL)}</span>
                  </div>
                  <Progress value={followerProgress} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Watch Hours
                    </span>
                    <span>{formatNumber(data.watchHours)} / {formatNumber(WATCH_HOURS_GOAL)}</span>
                  </div>
                  <Progress value={watchHoursProgress} className="h-2" />
                </div>
              </div>
            </div>

            {/* Country & VAT Info */}
            <button
              onClick={() => setShowCountrySelector(true)}
              className="w-full flex items-center justify-between p-3 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-medium">{data.countryName}</p>
                  <p className="text-xs text-muted-foreground">VAT Rate: {data.vatRate}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{data.currency}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>

            {/* Earnings Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-secondary/30 rounded-xl text-center">
                <DollarSign className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{formatCurrency(data.totalEarnings)}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-xl text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <p className="text-lg font-bold">{formatCurrency(data.pendingEarnings)}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-xl text-center">
                <ArrowDownToLine className="w-5 h-5 mx-auto mb-1 text-green-500" />
                <p className="text-lg font-bold">{formatCurrency(data.paidEarnings)}</p>
                <p className="text-xs text-muted-foreground">Paid Out</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Weekly Earnings Chart */}
                <div className="p-4 bg-secondary/30 rounded-xl">
                  <h3 className="text-sm font-semibold mb-3">Weekly Earnings</h3>
                  <ChartContainer config={chartConfig} className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.weeklyEarnings}>
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="gross" fill="var(--color-gross)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="net" fill="var(--color-net)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>

                {/* Top Earning Reels */}
                <div className="p-4 bg-secondary/30 rounded-xl">
                  <h3 className="text-sm font-semibold mb-3">Top Earning Muv'z</h3>
                  <div className="space-y-2">
                    {data.reelEarnings.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No earnings yet. Keep creating!
                      </p>
                    ) : (
                      data.reelEarnings.map((reel, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                            <span className="text-sm truncate max-w-[150px]">{reel.title}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatCurrency(reel.gross)}</p>
                            <p className="text-xs text-muted-foreground">{formatNumber(reel.views)} views</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="breakdown" className="space-y-4 mt-4">
                <div className="p-4 bg-secondary/30 rounded-xl space-y-3">
                  <h3 className="text-sm font-semibold">Earnings Breakdown</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Gross Earnings</span>
                      <span className="font-medium">{formatCurrency(data.totalEarnings / (1 - data.vatRate / 100))}</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-400">
                      <span>VAT Deduction ({data.vatRate}%)</span>
                      <span>-{formatCurrency((data.totalEarnings / (1 - data.vatRate / 100)) * (data.vatRate / 100))}</span>
                    </div>
                    <div className="border-t border-border my-2" />
                    <div className="flex justify-between text-sm font-bold">
                      <span>Net Earnings</span>
                      <span className="text-green-500">{formatCurrency(data.totalEarnings)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-secondary/30 rounded-xl space-y-3">
                  <h3 className="text-sm font-semibold">How You Earn</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <span>$0.001 per view on your Muv'z</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span>$0.002 per like (bonus engagement)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span>Performance bonuses for viral content</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="payouts" className="space-y-4 mt-4">
                {/* Payment Methods */}
                <div className="p-4 bg-secondary/30 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Payment Method</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPaymentMethods(true)}
                      className="h-8"
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      Manage
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => setShowPaymentMethods(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>

                <div className="p-4 bg-secondary/30 rounded-xl">
                  <h3 className="text-sm font-semibold mb-3">Request Payout</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Minimum payout: {formatCurrency(50)}. Payouts are processed weekly.
                  </p>

                  <Button 
                    className="w-full rounded-xl" 
                    disabled={data.pendingEarnings < 50 || requestingPayout}
                    onClick={handleRequestPayout}
                  >
                    {requestingPayout ? 'Requesting...' : 
                      data.pendingEarnings >= 50 
                        ? `Request Payout (${formatCurrency(data.pendingEarnings)})`
                        : `${formatCurrency(50 - data.pendingEarnings)} more to withdraw`}
                  </Button>
                </div>

                <div className="p-4 bg-secondary/30 rounded-xl">
                  <h3 className="text-sm font-semibold mb-3">Payout History</h3>
                  {payoutHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No payouts yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {payoutHistory.map((payout) => (
                        <div key={payout.id} className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{formatCurrency(payout.amount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payout.requested_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            payout.status === 'paid' ? 'bg-green-500/20 text-green-600' :
                            payout.status === 'pending' ? 'bg-amber-500/20 text-amber-600' :
                            payout.status === 'approved' ? 'bg-blue-500/20 text-blue-600' :
                            'bg-red-500/20 text-red-600'
                          }`}>
                            {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>

      {/* Payment Methods Modal */}
      <PaymentMethodsModal
        isOpen={showPaymentMethods}
        onClose={() => setShowPaymentMethods(false)}
      />

      {/* Country Selector Modal */}
      <CountrySelector
        isOpen={showCountrySelector}
        onClose={() => {
          setShowCountrySelector(false);
          fetchEarningsData(); // Refresh to get updated country
        }}
      />
    </Dialog>
  );
};

export default EarningsModal;
