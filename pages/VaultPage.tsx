
import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { DENOMINATIONS } from '../constants';
import { NoteCounts } from '../types';
import { CalendarDaysIcon } from '../components/icons/CalendarDaysIcon';

const VaultPage: React.FC = () => {
  const { vault, transactions } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState<'total' | 'activity'>('total');
  
  const [filterYear, setFilterYear] = useState(searchParams.get('year') || 'all');
  const [filterMonth, setFilterMonth] = useState(searchParams.get('month') || 'all');
  const [filterDay, setFilterDay] = useState(searchParams.get('day') || 'all');
  const [showAllDates, setShowAllDates] = useState(searchParams.get('showAllDates') === 'true');

  const cashTransactions = useMemo(() => 
    transactions.filter(tx => tx.paymentMethod === 'cash')
  , [transactions]);

  const { years, months, days } = useMemo(() => {
    const years = new Set<string>();
    const months = new Set<string>();
    const days = new Set<string>();
    cashTransactions.forEach(tx => {
        const d = new Date(tx.date);
        years.add(d.getFullYear().toString());
        if (showAllDates) {
            if (filterYear === 'all' || d.getFullYear().toString() === filterYear) {
                months.add((d.getMonth() + 1).toString());
            }
            if ((filterYear === 'all' || d.getFullYear().toString() === filterYear) && 
                (filterMonth === 'all' || (d.getMonth() + 1).toString() === filterMonth)) {
                days.add(d.getDate().toString());
            }
        }
    });
    return {
        years: Array.from(years).sort((a,b) => parseInt(b) - parseInt(a)),
        months: Array.from(months).sort((a,b) => parseInt(a) - parseInt(b)),
        days: Array.from(days).sort((a,b) => parseInt(a) - parseInt(b)),
    };
  }, [cashTransactions, filterYear, filterMonth, showAllDates]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (showAllDates) {
      params.set('showAllDates', 'true');
      params.set('year', filterYear);
      params.set('month', filterMonth);
      params.set('day', filterDay);
    } else {
      params.delete('showAllDates');
      params.delete('year');
      params.delete('month');
      params.delete('day');
    }
    setSearchParams(params, { replace: true });
  }, [filterYear, filterMonth, filterDay, showAllDates, setSearchParams]);


  const filteredActivityVault = useMemo(() => {
    const activityVault: NoteCounts = {};
    DENOMINATIONS.forEach(d => activityVault[d] = 0);

    const filteredTransactions = cashTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      if (!showAllDates) {
        const currentDate = new Date();
        return txDate.getFullYear() === currentDate.getFullYear() && 
               txDate.getMonth() === currentDate.getMonth() && 
               txDate.getDate() === currentDate.getDate();
      } else {
        if (filterYear !== 'all' && txDate.getFullYear().toString() !== filterYear) return false;
        if (filterMonth !== 'all' && (txDate.getMonth() + 1).toString() !== filterMonth) return false;
        if (filterDay !== 'all' && txDate.getDate().toString() !== filterDay) return false;
        return true;
      }
    });

    filteredTransactions.forEach(tx => {
      if (tx.breakdown && typeof tx.breakdown === 'object') {
        for (const denomStr in tx.breakdown) {
          const denom = parseInt(denomStr, 10);
          const count = tx.breakdown[denom] || 0;
          if (DENOMINATIONS.includes(denom)) {
            if (tx.type === 'credit') {
              activityVault[denom] = (activityVault[denom] || 0) + count;
            } else if (tx.type === 'debit') {
              activityVault[denom] = (activityVault[denom] || 0) - count;
            }
          }
        }
      }
    });
    return activityVault;
  }, [cashTransactions, showAllDates, filterYear, filterMonth, filterDay]);

  const data = useMemo(() => {
    if (view === 'total') {
      const totalValue = DENOMINATIONS.reduce((sum, denom) => sum + (vault[denom] || 0) * denom, 0);
      return {
        vaultToDisplay: vault,
        title: 'Cash Vault',
        totalTitle: 'Total Vault Value',
        totalValue,
      };
    }
    
    // Activity View
    const totalValue = DENOMINATIONS.reduce((sum, denom) => sum + (filteredActivityVault[denom] || 0) * denom, 0);
    let title = "Today's Vault Activity";
    if (showAllDates) {
        if(filterDay !== 'all' && filterMonth !== 'all' && filterYear !== 'all') {
            title = `Vault Activity for ${filterDay}/${filterMonth}/${filterYear}`
        } else if (filterMonth !== 'all' && filterYear !== 'all') {
            title = `Vault Activity for ${new Date(parseInt(filterYear), parseInt(filterMonth)-1).toLocaleString('default', { month: 'long' })} ${filterYear}`
        } else if (filterYear !== 'all') {
            title = `Vault Activity for ${filterYear}`
        } else {
            title = "All Vault Activity"
        }
    }

    return {
        vaultToDisplay: filteredActivityVault,
        title,
        totalTitle: "Net Change for Period",
        totalValue,
      };

  }, [view, vault, filteredActivityVault, showAllDates, filterYear, filterMonth, filterDay]);

  const { vaultToDisplay, title, totalTitle, totalValue } = data;

  const sortedDenominations = useMemo(() => {
    return [...DENOMINATIONS].sort((a, b) => b - a);
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setView('activity')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              view === 'activity'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setView('total')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              view === 'total'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Total Vault
          </button>
        </div>
      </div>

      {view === 'activity' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
          <div className="mb-4 flex items-center gap-4">
            <button
              onClick={() => setShowAllDates(!showAllDates)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                showAllDates 
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700' 
              }`}
            >
              {showAllDates ? 'Show Today Only' : 'Filter by Date'}
            </button>
            {!showAllDates && (
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Showing: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>
          
          {showAllDates && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className='relative'><CalendarDaysIcon className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400'/><select value={filterYear} onChange={e => {setFilterYear(e.target.value); setFilterMonth('all'); setFilterDay('all');}} className="w-full p-2 pl-10 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 appearance-none"><option value="all">All Years</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></div>
                <div className='relative'><CalendarDaysIcon className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400'/><select value={filterMonth} onChange={e => {setFilterMonth(e.target.value); setFilterDay('all');}} className="w-full p-2 pl-10 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 appearance-none"><option value="all">All Months</option>{months.map(m=><option key={m} value={m}>{new Date(2000, parseInt(m) - 1).toLocaleString('default', { month: 'long' })}</option>)}</select></div>
                <div className='relative'><CalendarDaysIcon className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400'/><select value={filterDay} onChange={e => setFilterDay(e.target.value)} className="w-full p-2 pl-10 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 appearance-none"><option value="all">All Days</option>{days.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
            </div>
          )}
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 mb-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">{totalTitle}</h3>
          <p className={`text-5xl font-bold mt-2 ${
            totalValue < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
          }`}>
            ₹ {totalValue.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Denomination Breakdown</h3>
        <div className="space-y-4">
          {sortedDenominations.map(denom => {
            const count = vaultToDisplay[denom] || 0;
            const value = count * denom;
            if (view === 'total' || count !== 0) { // For activity view, only show denominations with activity
              return (
                <div key={denom} className={`flex items-center justify-between p-4 rounded-lg ${
                  count === 0 && view === 'total'
                    ? 'bg-gray-100 dark:bg-gray-700/30' 
                    : count < 0 
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        : 'bg-gray-50 dark:bg-gray-700/50'
                }`}>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400 w-20">₹ {denom}</span>
                    <span className="text-gray-500 dark:text-gray-400 mx-4">x</span>
                    <span className={`text-lg font-medium w-24 ${
                      count < 0 
                        ? 'text-red-600 dark:text-red-400' 
                        : count === 0 
                            ? 'text-gray-400 dark:text-gray-500'
                            : 'text-gray-800 dark:text-gray-200'
                    }`}>
                      {count.toLocaleString('en-IN')} {Math.abs(count) === 1 ? 'note' : 'notes'}
                      {count < 0 && view === 'total' && ' (shortage)'}
                    </span>
                  </div>
                  <div className={`text-lg font-semibold ${
                    value < 0 
                        ? 'text-red-600 dark:text-red-400' 
                        : value === 0 
                            ? 'text-gray-400 dark:text-gray-500'
                            : 'text-gray-900 dark:text-white'
                  }`}>
                    {value < 0 ? '-' : ''}₹ {Math.abs(value).toLocaleString('en-IN')}
                  </div>
                </div>
              );
            }
            return null;
          })}
          {totalValue === 0 && Object.values(vaultToDisplay).every(c => c === 0) && (
            <p className="text-center py-10 text-gray-500 dark:text-gray-400">
              {view === 'total' ? 'The vault is empty. Add a credit transaction to get started.' : 'No cash transactions found for the selected period.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VaultPage;
