import { createContext, useContext, useReducer, useEffect, FC, ReactNode, Dispatch } from 'react';
import { DashboardState, DashboardAction } from '../types';

const initialState: DashboardState = {
  transactions: [],
  role: 'viewer',
  theme: 'light',
  isLoading: true,
};

const savedStateJSON = localStorage.getItem('finance-dashboard-state-v2');
let persistedState: DashboardState | null = null;
try {
  persistedState = savedStateJSON ? JSON.parse(savedStateJSON) : null;
  // Always force isLoading to true for initially loaded state to show skeletons
  if (persistedState) persistedState.isLoading = true;
} catch (e) {
  console.error("Failed to parse persisted state", e);
}

// Initialize state with persisted data but fallback to empty initialState
// (transactions will be populated by API fetch if empty)
const initialLoadedState = persistedState || initialState;

const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload),
      };
    case 'SET_ROLE':
      return { ...state, role: action.payload };
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload, isLoading: false };
    default:
      return state;
  }
};

const DashboardContext = createContext<{
  state: DashboardState;
  dispatch: Dispatch<DashboardAction>;
} | undefined>(undefined);

export const DashboardProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialLoadedState);

  // Simulate initial data loading delay and API fetch
  useEffect(() => {
    const loadData = async () => {
      // If we already have transactions in local storage, we just simulate network delay
      if (state.transactions.length > 0) {
        setTimeout(() => {
          dispatch({ type: 'SET_LOADING', payload: false });
        }, 800);
        return;
      }

      // Otherwise, we fetch the mock data from our "API"
      try {
        const response = await fetch('/mockData.json');
        if (!response.ok) throw new Error('Failed to fetch mock data');
        const data = await response.json();
        
        // Simulate network latency
        setTimeout(() => {
          dispatch({ type: 'SET_TRANSACTIONS', payload: data });
        }, 1200);

      } catch (error) {
        console.error("Error fetching transactions:", error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Apply theme to DOM and persist state
  useEffect(() => {
    localStorage.setItem('finance-dashboard-state-v2', JSON.stringify(state));
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(state.theme);
  }, [state]);

  // Handle system theme changes initially if no persisted theme
  useEffect(() => {
    if (!savedStateJSON) {
       const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
       if (isDark && state.theme === 'light') {
         dispatch({ type: 'TOGGLE_THEME' });
       }
    }
  }, []);

  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
