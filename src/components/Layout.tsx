import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, PieChart, Menu, X, Sun, Moon, Shield, Eye } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { cn } from '../lib/utils';

export default function Layout() {
  const { state, dispatch } = useDashboard();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleTheme = () => dispatch({ type: 'TOGGLE_THEME' });
  const toggleRole = () => dispatch({ type: 'SET_ROLE', payload: state.role === 'admin' ? 'viewer' : 'admin' });

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: ReceiptText },
    { name: 'Insights', path: '/insights', icon: PieChart },
  ];

  return (
    <div className="min-h-screen bg-background flex text-foreground transition-colors duration-300">
      {/* Sidebar Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card shadow-sm transition-transform duration-300 lg:static lg:translate-x-0 flex flex-col",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-3 font-black text-xl tracking-tighter text-foreground">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-lg border border-white/10">
               <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
                 <rect x="7" y="7" width="18" height="4.5" rx="2.25" fill="white" />
                 <path d="M7 15C7 13.6193 8.11929 12.5 9.5 12.5H19.5C20.8807 12.5 22 13.6193 22 15V15C22 16.3807 20.8807 17.5 19.5 17.5H13V22.5C13 23.8807 11.8807 25 10.5 25V25C9.11929 25 8 23.8807 8 22.5V15.5C8 15.5 7 15.5 7 15Z" fill="white" />
               </svg>
            </div>
            <span>FinTrack</span>
          </div>
          <button 
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <item.icon size={18} className={cn(isActive ? "text-primary" : "")} />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wider px-2">Access Control</div>
          <button 
            onClick={toggleRole}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-border/50 bg-background hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              {state.role === 'admin' ? <Shield size={16} className="text-destructive" /> : <Eye size={16} className="text-primary"/>}
              <span className="capitalize">{state.role} Mode</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-4 lg:px-8 shrink-0">
          <button 
            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="ml-auto flex items-center gap-4">
             <button
               onClick={toggleTheme}
               className="p-2 rounded-full hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
               aria-label="Toggle theme"
             >
               {state.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <img 
               src="/user-avatar.png" 
               alt="User profile" 
               className="w-8 h-8 rounded-full shadow-sm border border-border cursor-pointer object-cover"
             />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 bg-background/50">
           <Outlet />
        </div>
      </main>
    </div>
  );
}
