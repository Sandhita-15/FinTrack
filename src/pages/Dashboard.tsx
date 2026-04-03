import { useMemo, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { ArrowUpRight, ArrowDownRight, Wallet, PieChart as PieChartIcon, TrendingUp, Calendar } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
} from 'recharts';
import {
  format,
  parseISO,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfMonth
} from 'date-fns';
import { cn } from '../lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "../components/ui/chart"

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-shimmer rounded-lg ${className}`} />
);

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function Dashboard() {
  const { state } = useDashboard();
  const { transactions, isLoading } = state;
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let start: Date;
    const end = endOfDay(now);

    switch (timeRange) {
      case 'daily':
        start = startOfDay(now);
        break;
      case 'weekly':
        start = startOfDay(subWeeks(now, 1));
        break;
      case 'monthly':
        start = startOfDay(subMonths(now, 1));
        break;
      case 'yearly':
        start = startOfDay(subYears(now, 1));
        break;
      default:
        start = startOfMonth(now);
    }

    return transactions.filter(t => {
      const txDate = parseISO(t.date);
      return isWithinInterval(txDate, { start, end });
    });
  }, [transactions, timeRange]);

  const { income, expenses, balance } = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, curr) => {
        if (curr.type === 'income') {
          acc.income += curr.amount;
          acc.balance += curr.amount;
        } else {
          acc.expenses += curr.amount;
          acc.balance -= curr.amount;
        }
        return acc;
      },
      { income: 0, expenses: 0, balance: 0 }
    );
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    let segments = 30; 
    let formatStr = 'MMM dd';
    
    if (timeRange === 'daily') { segments = 1; formatStr = 'HH:mm'; }
    else if (timeRange === 'weekly') { segments = 7; formatStr = 'EEE'; }
    else if (timeRange === 'yearly') { segments = 12; formatStr = 'MMM'; }

    const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (timeRange === 'yearly') {
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(now, i);
        const m = format(d, 'MMM');
        const monthTxs = sorted.filter(t => format(parseISO(t.date), 'MMM yyyy') === format(d, 'MMM yyyy'));
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        monthTxs.forEach(t => {
          if (t.type === 'income') monthlyIncome += t.amount;
          else monthlyExpense += t.amount;
        });
        data.push({ date: m, income: monthlyIncome, expense: monthlyExpense });
      }
    } else {
      for (let i = segments - 1; i >= 0; i--) {
        const d = format(subDays(now, i), 'yyyy-MM-dd');
        const dailyTx = sorted.filter(t => t.date === d);
        let dailyIncome = 0;
        let dailyExpense = 0;
        dailyTx.forEach(t => {
          if (t.type === 'income') dailyIncome += t.amount;
          else dailyExpense += t.amount;
        });
        
        data.push({
          date: format(parseISO(d), formatStr),
          income: dailyIncome,
          expense: dailyExpense,
        });
      }
    }
    return data;
  }, [filteredTransactions, timeRange]);

  const sortedCategoryData = useMemo(() => {
    const expensesTx = filteredTransactions.filter(t => t.type === 'expense');
    const grouped = expensesTx.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const sorted = Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const n = sorted.length;
    return sorted.map((item, index) => {
      const hue = n > 1 ? Math.round((160 * index) / (n - 1)) : 0;
      const saturation = n > 1 ? 84 - (index * (84 - 52) / (n - 1)) : 84;
      const lightness = n > 1 ? 60 - (index * (60 - 49) / (n - 1)) : 60;
      
      return { 
        category: item.name, 
        amount: item.value, 
        fill: `hsl(${hue}, ${saturation}%, ${lightness}%)` 
      };
    });
  }, [filteredTransactions]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      amount: {
        label: "Amount spent",
      }
    };
    sortedCategoryData.forEach(item => {
      config[item.category] = {
        label: item.category,
        color: item.fill,
      };
    });
    return config;
  }, [sortedCategoryData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-2">
           <Skeleton className="h-8 w-48" />
           <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card p-6 rounded-xl border border-border shadow-sm h-32 flex flex-col justify-between text-muted-foreground">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm lg:col-span-2 h-[400px]">
             <Skeleton className="h-6 w-48 mb-6" />
             <Skeleton className="h-[300px] w-full" />
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm h-[400px]">
             <Skeleton className="h-6 w-48 mb-6" />
             <div className="flex flex-col items-center justify-center gap-4 h-[300px]">
               <Skeleton className="h-48 w-48 rounded-full" />
               <Skeleton className="h-4 w-32" />
             </div>
          </div>
        </div>
      </div>
    );
  }

  const rangeLabels: Record<TimeRange, string> = {
    daily: 'Today',
    weekly: 'Past 7 Days',
    monthly: 'Past 30 Days',
    yearly: 'Past Year'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold tracking-tight">Financial Overview</h1>
           <p className="text-muted-foreground text-sm mt-1">Real-time performance tracking and trends.</p>
        </div>
        <div className="flex bg-muted p-1 rounded-lg border border-border shadow-sm">
          {(['daily', 'weekly', 'monthly', 'yearly'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-md transition-all uppercase tracking-wider",
                timeRange === range 
                  ? "bg-background text-primary shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-primary/20 transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Wallet size={80} />
          </div>
          <div className="flex items-center justify-between text-muted-foreground pb-2 z-10">
            <h3 className="text-[10px] font-black tracking-widest uppercase opacity-70">Total Balance</h3>
            <Wallet size={18} className="text-primary"/>
          </div>
          <div className="z-10">
            <div className="text-3xl font-black tracking-tight">₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-supreme-green font-bold">{rangeLabels[timeRange]}</span>
            </p>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-supreme-green/20 transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <ArrowUpRight size={80} />
          </div>
          <div className="flex items-center justify-between text-muted-foreground pb-2 z-10">
            <h3 className="text-[10px] font-black tracking-widest uppercase opacity-70">Range Income</h3>
            <ArrowUpRight size={18} style={{ color: '#3BBD92' }}/>
          </div>
          <div className="z-10">
            <div className="text-3xl font-black tracking-tight" style={{ color: '#3BBD92' }}>₹{income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Total inflow</p>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-rose-500/20 transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <ArrowDownRight size={80} />
          </div>
          <div className="flex items-center justify-between text-muted-foreground pb-2 z-10">
            <h3 className="text-[10px] font-black tracking-widest uppercase opacity-70">Range Expenses</h3>
            <ArrowDownRight size={18} style={{ color: 'hsl(0, 84%, 60%)' }}/>
          </div>
          <div className="z-10">
            <div className="text-3xl font-black tracking-tight" style={{ color: 'hsl(0, 84%, 60%)' }}>₹{expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Total outflow</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <TrendingUp size={16} /> Cash Flow Trend
            </h3>
            <span className="text-[10px] font-bold text-muted-foreground italic">{rangeLabels[timeRange]}</span>
          </div>
          <div className="h-[300px] w-full">
            {filteredTransactions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3BBD92" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3BBD92" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{fontWeight: 'bold'}}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `₹${value}`} 
                    tick={{fontWeight: 'bold'}}
                  />
                  <Tooltip 
                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    itemStyle={{ padding: '0px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#3BBD92" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorIncome)" 
                    animationDuration={1500}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expense" 
                    stroke="hsl(0, 84%, 60%)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorExpense)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 bg-muted/10 rounded-xl border border-dashed border-border">
                <Calendar size={48} className="opacity-20" />
                <p className="text-sm font-medium">No activity recorded for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Expenditure Splits Pie Chart */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Expenditure Splits</CardTitle>
            <CardDescription>{rangeLabels[timeRange]}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {sortedCategoryData.length > 0 ? (
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-[300px] pb-0 [&_.recharts-pie-label-text]:fill-foreground"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value) => (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold">₹{Number(value).toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {((Number(value) / sortedCategoryData.reduce((acc, curr) => acc + curr.amount, 0)) * 100).toFixed(1)}% of total
                      </span>
                    </div>
                  )} />} />
                  <Pie 
                    data={sortedCategoryData} 
                    dataKey="amount" 
                    label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`} 
                    nameKey="category" 
                    innerRadius={60}
                    strokeWidth={5}
                  />
                  <ChartLegend content={<ChartLegendContent nameKey="category" className="-translate-y-2 flex-wrap" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-4 bg-muted/10 rounded-xl border border-dashed border-border mt-6">
                <PieChartIcon size={48} className="opacity-20" />
                <p className="text-sm font-medium text-center">No categorizable expenses<br/>in this range</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 leading-none font-medium">
              Top category: {sortedCategoryData[0]?.category} <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">
              Showing distribution across categories
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
