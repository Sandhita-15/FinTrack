import { useState, useMemo, FormEvent, useEffect, Fragment } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Search, Plus, ArrowUpDown, Edit2, Trash2, X, ArrowUpRight, ArrowDownRight, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Transaction } from '../types';
import { cn } from '../lib/utils';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-shimmer rounded-lg ${className}`} />
);

export default function Transactions() {
  const { state, dispatch } = useDashboard();
  const { isLoading } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // New/Edit Transaction Form State
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    type: 'expense',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        description: editingTransaction.description,
        amount: editingTransaction.amount.toString(),
        category: editingTransaction.category,
        type: editingTransaction.type,
        date: editingTransaction.date
      });
    } else {
      setFormData({
        description: '',
        amount: '',
        category: '',
        type: 'expense',
        date: format(new Date(), 'yyyy-MM-dd')
      });
    }
  }, [editingTransaction]);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'category' | 'type'>('none');

  const filteredTransactions = useMemo(() => {
    return state.transactions
      .filter((t) => filterType === 'all' || t.type === filterType)
      .filter((t) => {
        if (!startDate && !endDate) return true;
        const txDate = new Date(t.date);
        if (startDate && txDate < new Date(startDate)) return false;
        if (endDate && txDate > new Date(endDate)) return false;
        return true;
      })
      .filter((t) => 
         t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
         t.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [state.transactions, searchTerm, filterType, sortOrder, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, sortOrder, startDate, endDate, groupBy]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const groupedTransactions = useMemo(() => {
    if (groupBy === 'none') return { 'All Transactions': paginatedTransactions };
    
    return paginatedTransactions.reduce((acc, tx) => {
      const key = groupBy === 'category' ? tx.category : tx.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(tx);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [paginatedTransactions, groupBy]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/20">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 w-24" />
                <Skeleton className="h-12 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      console.info('Deleting transaction:', id);
      dispatch({ type: 'DELETE_TRANSACTION', payload: id });
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.category) return;
    
    if (editingTransaction) {
      const updatedTx: Transaction = {
        ...editingTransaction,
        type: formData.type as 'income' | 'expense',
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category,
        date: formData.date
      };
      dispatch({ type: 'UPDATE_TRANSACTION', payload: updatedTx });
    } else {
      const newTx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: formData.type as 'income' | 'expense',
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category,
        date: formData.date
      };
      dispatch({ type: 'ADD_TRANSACTION', payload: newTx });
    }
    
    closeModal();
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Type', 'Category', 'Amount'];
    const rows = filteredTransactions.map(tx => [
      tx.date,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.type,
      tx.category,
      tx.amount
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(filteredTransactions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `transactions_${format(new Date(), 'yyyy-MM-dd')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
           <p className="text-muted-foreground text-sm mt-1">Manage and view your financial history.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1 mr-2 border border-border">
            <button 
              onClick={exportToCSV}
              className="p-1 px-2 text-xs font-medium hover:bg-background rounded transition-colors flex items-center gap-1"
              title="Export to CSV"
            >
              <Download size={14} /> CSV
            </button>
            <div className="w-[1px] bg-border mx-1" />
            <button 
              onClick={exportToJSON}
              className="p-1 px-2 text-xs font-medium hover:bg-background rounded transition-colors flex items-center gap-1"
              title="Export to JSON"
            >
              <FileText size={14} /> JSON
            </button>
          </div>
          {state.role === 'admin' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Add Transaction
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
         {/* Toolbar */}
         <div className="p-4 border-b border-border space-y-4 bg-muted/20">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                  type="text" 
                  placeholder="Search description or category..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Range</span>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-xs focus:outline-none"
                    title="Start Date"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-xs focus:outline-none"
                    title="End Date"
                  />
                </div>
                
                <select 
                  title="Group By"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as 'none' | 'category' | 'type')}
                  className="bg-background border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="none">No Grouping</option>
                  <option value="category">Group by Category</option>
                  <option value="type">Group by Type</option>
                </select>

                <select 
                  title="Filter Type"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                  className="bg-background border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>

                <button 
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  title="Sort by Date"
                  className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-2 text-sm"
                >
                  <ArrowUpDown size={16} />
                </button>

                {(searchTerm || filterType !== 'all' || startDate || endDate || groupBy !== 'none') && (
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('all');
                      setStartDate('');
                      setEndDate('');
                      setGroupBy('none');
                    }}
                    className="text-xs text-primary hover:underline font-medium px-2"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
         </div>

         {/* Table */}
         <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left relative">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Date</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  {state.role === 'admin' && <th className="px-6 py-4 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={state.role === 'admin' ? 6 : 5} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FileText size={48} className="text-muted/50" />
                        <p>No transactions found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  Object.entries(groupedTransactions).map(([groupName, transactions]) => (
                    <Fragment key={groupName}>
                      {groupBy !== 'none' && (
                        <tr className="bg-muted/50 border-y border-border">
                          <td colSpan={state.role === 'admin' ? 6 : 5} className="px-6 py-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {groupName} 
                              <span className="font-normal text-muted-foreground/60 ml-1">({transactions.length})</span>
                            </span>
                          </td>
                        </tr>
                      )}
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                            {format(new Date(tx.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 font-medium max-w-[200px] truncate" title={tx.description}>
                            {tx.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                              tx.type === 'income' 
                                ? "bg-supreme-green/10 text-supreme-green border-supreme-green/20" 
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            )}>
                              {tx.type === 'income' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-background border border-border max-w-[120px] truncate" title={tx.category}>
                              {tx.category}
                            </span>
                          </td>
                          <td className={cn(
                            "px-6 py-4 font-semibold whitespace-nowrap",
                            tx.type === 'income' ? 'text-supreme-green' : 'text-rose-600'
                          )}>
                            {tx.type === 'income' ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          {state.role === 'admin' && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleEdit(tx); }}
                                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-muted" 
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={(e) => handleDelete(e, tx.id)} 
                                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-muted" 
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
         </div>
         
         {/* Pagination Controls */}
         {totalPages > 1 && (
           <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
             <div className="text-xs text-muted-foreground font-medium">
               Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} entries
             </div>
             <div className="flex items-center gap-2">
               <button
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                 disabled={currentPage === 1}
                 className="px-3 py-1 text-xs font-bold bg-background border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors text-foreground"
               >
                 Previous
               </button>
               <div className="text-xs font-bold px-2 text-muted-foreground">
                 Page {currentPage} of {totalPages}
               </div>
               <button
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 disabled={currentPage === totalPages}
                 className="px-3 py-1 text-xs font-bold bg-background border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors text-foreground"
               >
                 Next
               </button>
             </div>
           </div>
         )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-lg p-6 relative">
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-bold mb-4">{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input 
                    type="text" required
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                    <input 
                      type="number" required min="0.01" step="0.01"
                      value={formData.amount} 
                      onChange={e => {
                        const val = e.target.value;
                        if (parseFloat(val) >= 0 || val === '') {
                          setFormData({...formData, amount: val});
                        }
                      }}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input 
                      type="date" required
                      value={formData.date} 
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input 
                    type="text" required list="categories"
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    placeholder="e.g. Groceries"
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <datalist id="categories">
                    <option value="Food & Dining" />
                    <option value="Rent" />
                    <option value="Shopping" />
                    <option value="Entertainment" />
                    <option value="Transport" />
                    <option value="Salary" />
                    <option value="Utilities" />
                    <option value="Health" />
                  </datalist>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors mt-2"
                >
                  {editingTransaction ? 'Update Transaction' : 'Save Transaction'}
                </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
