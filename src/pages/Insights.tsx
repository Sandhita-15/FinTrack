import { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  parseISO, 
  subMonths
} from 'date-fns';
import { 
  TrendingUp, 
  AlertCircle, 
  Zap, 
  Activity, 
  Layout as LayoutIcon
} from 'lucide-react';
import { cn } from '../lib/utils';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-shimmer rounded-lg ${className}`} />
);

export default function Insights() {
  const { state } = useDashboard();
  const { transactions, isLoading } = state;

  const analytics = useMemo(() => {
    if (transactions.length === 0) return null;

    // Use current month as default target
    const targetDate = new Date();
    
    // Filters for Current Month
    const startCurrent = startOfMonth(targetDate);
    const endCurrent = endOfMonth(targetDate);

    // Filters for Previous Month
    const datePrev = subMonths(targetDate, 1);
    const startPrev = startOfMonth(datePrev);
    const endPrev = endOfMonth(datePrev);

    // --- 1. Left Side: Category Comparison ---
    const expensesOnly = transactions.filter(t => t.type === 'expense');
    const categories = Array.from(new Set(expensesOnly.map(t => t.category)));

    const categoryComparison = categories.map(cat => {
      const current = expensesOnly
        .filter(t => t.category === cat && isWithinInterval(parseISO(t.date), { start: startCurrent, end: endCurrent }))
        .reduce((sum, t) => sum + t.amount, 0);
      
      const previous = expensesOnly
        .filter(t => t.category === cat && isWithinInterval(parseISO(t.date), { start: startPrev, end: endPrev }))
        .reduce((sum, t) => sum + t.amount, 0);

      return { name: cat, previous, current };
    })
    .filter(item => item.current > 0 || item.previous > 0)
    .sort((a,b) => b.current - a.current)
    .slice(0, 6); // Top 6

    // --- 2. Bottom Section: Monthly Metrics ---
    const monthlySpending: Record<string, number> = {};
    expensesOnly.forEach(t => {
      const monthKey = format(parseISO(t.date), 'yyyy-MM');
      monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + t.amount;
    });

    const spendingEntries = Object.entries(monthlySpending);
    const avgSpending = spendingEntries.length > 0 ? spendingEntries.reduce((a, b) => a + b[1], 0) / spendingEntries.length : 0;
    
    const maxEntry = spendingEntries.length > 0 ? spendingEntries.reduce((a, b) => b[1] > a[1] ? b : a) : [null, 0];
    const minEntry = spendingEntries.length > 0 ? spendingEntries.reduce((a, b) => b[1] < a[1] ? b : a) : [null, 0];

    const maxMonthLabel = maxEntry[0] ? format(parseISO(`${maxEntry[0]}-01`), 'MMMM yyyy') : '';
    const minMonthLabel = minEntry[0] ? format(parseISO(`${minEntry[0]}-01`), 'MMMM yyyy') : '';

    // --- 3. Right Side: Top Category Hero ---

    const topHero = categoryComparison[0] || null;
    let topHeroDelta = 0;
    let topHeroPercentage = 0;
    let isTopHeroIncreasing = false;

    if (topHero) {
      topHeroDelta = topHero.current - topHero.previous;
      isTopHeroIncreasing = topHeroDelta > 0;
      topHeroPercentage = topHero.previous > 0 
        ? (Math.abs(topHeroDelta) / topHero.previous) * 100 
        : 0;
    }

    return {
      categoryComparison,
      metrics: {
        avg: avgSpending,
        max: maxEntry[1] as number,
        maxMonth: maxMonthLabel,
        min: minEntry[1] as number,
        minMonth: minMonthLabel
      },
      topHero: topHero ? {
        ...topHero,
        delta: Math.abs(topHeroDelta),
        percentage: topHeroPercentage,
        isIncreasing: isTopHeroIncreasing
      } : null,
      labels: {
        current: format(targetDate, 'MMM yyyy'),
        prev: format(datePrev, 'MMM yyyy')
      }
    };
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!analytics) return (
     <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground bg-muted/5 border border-dashed border-border rounded-3xl gap-4">
        <AlertCircle size={48} className="opacity-10" />
        <div className="text-center">
          <p className="font-bold text-lg">Insufficient Data</p>
          <p className="text-sm opacity-60">Log transactions to analyze insights.</p>
        </div>
     </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex flex-col gap-1">
           <h1 className="text-2xl font-black tracking-tighter uppercase text-supreme-green flex items-center gap-2">
              <TrendingUp size={24} /> Financial Intelligence
           </h1>
           <p className="text-muted-foreground text-sm font-medium">Compare category spending for the current vs previous month.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comparison Chart */}
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Category Spending Delta</h3>
              <div className="flex items-center gap-4 text-[10px] font-black tracking-widest uppercase">
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-muted-foreground/40" /> {analytics.labels.prev}</div>
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-foreground" /> {analytics.labels.current}</div>
              </div>
           </div>
           <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.categoryComparison} margin={{ top: 0, right: 0, left: -15, bottom: 0 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: 'hsl(var(--muted-foreground))' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    tickFormatter={(val) => `₹${val}`} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number | string | readonly (number | string)[] | undefined) => {
                      if (val === undefined) return ['₹0'];
                      const numericVal = Array.isArray(val) ? Number(val[0]) : Number(val);
                      return [`₹${numericVal.toLocaleString()}`];
                    }}
                  />
                  <Bar dataKey="previous" fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[4, 4, 0, 0]} barSize={25} name={analytics.labels.prev} />
                  <Bar dataKey="current" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} barSize={25} name={analytics.labels.current} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Top Category Hero Focus */}
        <div className="bg-muted/30 border border-border p-8 rounded-3xl flex flex-col justify-between group overflow-hidden relative">
           <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
           {analytics.topHero ? (
              <div>
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Top Spending Hero</h3>
                 <div className="mb-10">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-2">Highest Category</span>
                    <div className="text-4xl font-black text-foreground tracking-tighter leading-none">{analytics.topHero.name}</div>
                 </div>

                 <div className="grid grid-cols-1 gap-6">
                    <div className="bg-card/50 border border-border/40 p-4 rounded-2xl">
                       <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Last Month ({analytics.labels.prev})</span>
                       <div className="text-lg font-black text-muted-foreground">₹{analytics.topHero.previous.toLocaleString()}</div>
                    </div>
                    
                    <div className="bg-card/80 border border-border p-4 rounded-2xl shadow-sm">
                       <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">This Month ({analytics.labels.current})</span>
                       <div className="text-xl font-black text-foreground">₹{analytics.topHero.current.toLocaleString()}</div>
                    </div>

                    <div className={cn(
                       "p-4 rounded-2xl border",
                       analytics.topHero.isIncreasing ? "bg-rose-500/5 border-rose-500/20" : "bg-supreme-green/5 border-supreme-green/20"
                    )}>
                       <span className={cn(
                          "text-[9px] font-bold uppercase tracking-widest block mb-1",
                          analytics.topHero.isIncreasing ? "text-rose-500" : "text-supreme-green"
                       )}>
                          {analytics.topHero.isIncreasing ? 'Monthly Increase' : 'Monthly Savings'}
                       </span>
                       <div className={cn(
                          "text-xl font-black tracking-tighter flex items-baseline gap-2",
                          analytics.topHero.isIncreasing ? "text-rose-500" : "text-supreme-green"
                       )}>
                          ₹{analytics.topHero.delta.toLocaleString()}
                          <span className="text-sm font-bold opacity-80">({analytics.topHero.percentage.toFixed(1)}%)</span>
                       </div>
                    </div>
                 </div>
              </div>
           ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                 <AlertCircle size={40} className="text-muted-foreground/20 mb-4" />
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No Category Data</p>
              </div>
           )}
           <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 mt-8">Main Category Insight</p>
        </div>
      </div>

      {/* Historical Metrics (Overall) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:border-primary/20 transition-all group overflow-hidden relative">
            <div className="absolute right-4 top-4 text-primary/10 group-hover:text-primary/20 transition-colors">
               <LayoutIcon size={48} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Average Monthly Spending</h4>
            <div className="text-3xl font-black tracking-tight">₹{Math.round(analytics.metrics.avg).toLocaleString()}</div>
            <p className="text-[10px] font-bold text-muted-foreground mt-2 italic border-l-2 border-primary/20 pl-2">Usually spent every month</p>
         </div>

         <div className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:border-rose-500/20 transition-all group overflow-hidden relative">
            <div className="absolute right-4 top-4 text-rose-500/10 group-hover:text-rose-500/20 transition-colors">
               <Zap size={48} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Highest Spending {analytics.metrics.maxMonth ? `(${analytics.metrics.maxMonth})` : ''}</h4>
            <div className="text-3xl font-black tracking-tight text-rose-500">₹{Math.round(analytics.metrics.max).toLocaleString()}</div>
            <p className="text-[10px] font-bold text-muted-foreground mt-2 italic border-l-2 border-rose-500/20 pl-2">Most you spent in one month</p>
         </div>

         <div className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:border-supreme-green/20 transition-all group overflow-hidden relative">
            <div className="absolute right-4 top-4 text-supreme-green/10 group-hover:text-supreme-green/20 transition-colors">
               <Activity size={48} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Lowest Spending {analytics.metrics.minMonth ? `(${analytics.metrics.minMonth})` : ''}</h4>
            <div className="text-3xl font-black tracking-tight text-supreme-green">₹{Math.round(analytics.metrics.min).toLocaleString()}</div>
            <p className="text-[10px] font-bold text-muted-foreground mt-2 italic border-l-2 border-supreme-green/20 pl-2">Least you spent in one month</p>
         </div>
      </div>
    </div>
  );
}
