import React, { useMemo, useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Transaction } from '../types';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';

const ReportPage: React.FC = () => {
    const { companyName } = useParams<{ companyName: string }>();
    const { transactions } = useAppContext();
    const [generationDate] = useState(new Date());
    
    const [searchParams] = useSearchParams();
    const locationFilter = searchParams.get('location');
    const filterType = searchParams.get('type') || 'all';
    const searchTerm = searchParams.get('search') || '';
    const showAllDates = searchParams.get('showAllDates') === 'true';
    const filterYear = searchParams.get('year') || 'all';
    const filterMonth = searchParams.get('month') || 'all';
    const filterDay = searchParams.get('day') || 'all';

    const decodedCompanyName = companyName ? decodeURIComponent(companyName) : '';

    useEffect(() => {
        const originalTitle = document.title;
        const today = new Date();
        const dateString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        document.title = `${decodedCompanyName}_Report_${dateString}`;
        
        const timer = setTimeout(() => {
            window.print();
            document.title = originalTitle;
        }, 500);
        
        return () => {
            clearTimeout(timer);
            document.title = originalTitle;
        };
    }, [decodedCompanyName]);
    
    const companyTransactions = useMemo(() => {
        let filtered = transactions.filter(tx => (tx.company || 'NA') === decodedCompanyName);
        
        if (locationFilter && locationFilter !== 'all') {
            filtered = filtered.filter(tx => tx.location === locationFilter);
        }
        
        if (!showAllDates) {
            const today = new Date();
            filtered = filtered.filter(tx => {
                const txDate = new Date(tx.date);
                return txDate.getFullYear() === today.getFullYear() &&
                       txDate.getMonth() === today.getMonth() &&
                       txDate.getDate() === today.getDate();
            });
        } else {
            if (filterYear !== 'all') {
                filtered = filtered.filter(tx => new Date(tx.date).getFullYear().toString() === filterYear);
            }
            if (filterMonth !== 'all') {
                filtered = filtered.filter(tx => (new Date(tx.date).getMonth() + 1).toString() === filterMonth);
            }
            if (filterDay !== 'all') {
                filtered = filtered.filter(tx => new Date(tx.date).getDate().toString() === filterDay);
            }
        }
        
        if (filterType !== 'all') {
            filtered = filtered.filter(tx => tx.type === filterType);
        }
        
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(tx => 
                tx.person?.toLowerCase().includes(searchLower) ||
                tx.amount.toString().includes(searchLower) ||
                tx.paymentMethod.toLowerCase().includes(searchLower)
            );
        }
        
        return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [transactions, decodedCompanyName, locationFilter, filterType, showAllDates, filterYear, filterMonth, filterDay, searchTerm]);

    const reportData = useMemo(() => {
        if (!companyTransactions.length) return null;

        const credits = companyTransactions.filter(tx => tx.type === 'credit');
        const debits = companyTransactions.filter(tx => tx.type === 'debit');

        const creditsByPerson = credits.reduce((acc, tx) => {
            const personName = (tx.person || 'N/A').trim().toUpperCase();
            if (!acc[personName]) {
                acc[personName] = [];
            }
            acc[personName].push(tx);
            return acc;
        }, {} as {[key: string]: Transaction[]});

        const customers = Object.entries(creditsByPerson).map(([name, txs]: [string, Transaction[]]) => {
            const cash = txs.filter(tx => tx.paymentMethod === 'cash').map(tx => tx.amount);
            const upi = txs.filter(tx => tx.paymentMethod === 'upi').map(tx => tx.amount);
            const total = txs.reduce((sum, tx) => sum + tx.amount, 0);
            return { name, cash, upi, total };
        });

        const debitAmounts = debits.map(tx => tx.amount);
        const totalCredit = credits.reduce((sum, tx) => sum + tx.amount, 0);
        const totalDebit = debitAmounts.reduce((sum, amount) => sum + amount, 0);
        const closingBalance = totalCredit - totalDebit;

        return { customers, debitAmounts, totalCredit, totalDebit, closingBalance };
    }, [companyTransactions]);

    const formattedDate = (date: Date) => date.toLocaleString('en-IN', {
        day: '2-digit', month: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });

    const getFilterDescription = () => {
        const parts = [];
        if (!showAllDates) {
            parts.push(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`);
        } else {
            if (filterYear !== 'all') parts.push(`Year: ${filterYear}`);
            if (filterMonth !== 'all') {
                const monthName = new Date(2000, parseInt(filterMonth) - 1).toLocaleString('default', { month: 'long' });
                parts.push(`Month: ${monthName}`);
            }
            if (filterDay !== 'all') parts.push(`Day: ${filterDay}`);
        }
        if (locationFilter && locationFilter !== 'all') parts.push(`Location: ${locationFilter}`);
        if (filterType !== 'all') parts.push(`Type: ${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`);
        if (searchTerm.trim()) parts.push(`Search: "${searchTerm.trim()}"`);
        return parts.length > 0 ? parts.join(' | ') : 'All transactions';
    };

    if (!reportData) {
        return (
            <div className="text-center p-8">
                <p>No transactions found for {decodedCompanyName} matching the applied filters.</p>
                <p className="text-sm text-gray-600 mt-2">Filters applied: {getFilterDescription()}</p>
                <Link to={`/company/${encodeURIComponent(decodedCompanyName)}?${searchParams.toString()}`} className="text-blue-600 hover:underline mt-4 inline-block no-print">Go Back</Link>
            </div>
        );
    }
    
    const currencyFormatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    return (
        <div className="bg-white p-2 sm:p-4 md:p-6 lg:p-8 print-container min-w-0">
             <div className="no-print mb-4">
                <Link to={`/company/${encodeURIComponent(decodedCompanyName)}?${searchParams.toString()}`} className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                    <ArrowLeftIcon className="h-5 w-5"/><span>Back to History</span>
                </Link>
             </div>
             <div className="text-center mb-2 sm:mb-4">
                 <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-black uppercase">Report for {decodedCompanyName}</h1>
                 <p className="text-xs sm:text-sm text-gray-600">Generated on: {formattedDate(generationDate)}</p>
                 <p className="text-xs sm:text-sm text-blue-600 font-medium">Filters: {getFilterDescription()}</p>
             </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-black text-xs sm:text-sm">
                    <thead className="font-bold bg-gray-100">
                        <tr>
                            <th rowSpan={2} className="border border-black p-1 sm:p-2 text-xs sm:text-sm">Customer Name</th>
                            <th colSpan={4} className="border border-black p-1 sm:p-2 text-xs sm:text-sm">Cash</th>
                            <th colSpan={4} className="border border-black p-1 sm:p-2 text-xs sm:text-sm">UPI</th>
                            <th rowSpan={2} className="border border-black p-1 sm:p-2 text-xs sm:text-sm">Total Credit</th>
                        </tr>
                        <tr>
                            <th className="border border-black p-1 sm:p-2 text-xs sm:text-sm">1st</th>
                            <th className="border border-black p-1 sm:p-2 text-xs sm:text-sm">2nd</th>
                            <th className="border border-black p-1 sm:p-2 text-xs sm:text-sm">3rd</th>
                            <th className="border border-black p-1 sm:p-2 text-xs sm:text-sm">4th</th>
                            <th className="border border-black p-1 sm:p-2 text-xs sm:text-sm">1st</th>
                            <th className="border border-black p-1 sm:p-2 text-xs sm:text-sm">2nd</th>
                            <th className="border border-black p-1 sm:p-2 text-xs sm_text-sm">3rd</th>
                            <th className="border border-black p-1 sm:p-2 text-xs sm:text-sm">4th</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.customers.map(customer => (
                            <tr key={customer.name}>
                                <td className="border border-black p-1 sm:p-2 font-semibold text-xs sm:text-sm">{customer.name}</td>
                                {[0, 1, 2, 3].map(i => <td key={`cash-${i}`} className="border border-black p-1 sm:p-2 text-center font-bold text-xs sm:text-sm">{customer.cash[i] ? currencyFormatter.format(customer.cash[i]) : ''}</td>)}
                                {[0, 1, 2, 3].map(i => <td key={`upi-${i}`} className="border border-black p-1 sm:p-2 text-center font-bold text-xs sm:text-sm">{customer.upi[i] ? currencyFormatter.format(customer.upi[i]) : ''}</td>)}
                                <td className="border border-black p-1 sm:p-2 text-right font-bold text-xs sm:text-sm">{currencyFormatter.format(customer.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="font-bold">
                        
                        <tr>
                            <td colSpan={9} className="border-t-2 border-black p-1 sm:p-2 text-right text-xs sm:text-sm">Total Credit</td>
                            <td className="border-t-2 border-black border-l border-black p-1 sm:p-2 text-right bg-green-100 text-xs sm:text-sm">{currencyFormatter.format(reportData.totalCredit)}</td>
                        </tr>

                       
                        <tr>
                            <td className="border border-black p-1 sm:p-2 text-xs sm:text-sm">Entry</td>
                            {[0, 1, 2, 3].map(i => (
                                <td key={`debit-cash-${i}`} className="border border-black p-1 sm:p-2 text-right text-xs sm:text-sm">
                                    {reportData.debitAmounts[i] ? currencyFormatter.format(reportData.debitAmounts[i]) : ''}
                                </td>
                            ))}
                            
                            <td colSpan={4} className="border-y border-r border-black p-1 sm:p-2"></td>
                            <td className="border border-black p-1 sm:p-2 text-right bg-red-100 text-xs sm:text-sm">{currencyFormatter.format(reportData.totalDebit)}</td>
                        </tr>

                       
                        <tr>
                            <td colSpan={9} className="p-1 sm:p-2 text-right text-xs sm:text-sm">Closing Balance</td>
                            <td className={`border border-black p-1 sm:p-2 text-right text-xs sm:text-sm ${
                                reportData.closingBalance >= 0 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-600 font-bold'
                            }`}>
                                {reportData.closingBalance < 0 ? '-' : ''}₹{Math.abs(reportData.closingBalance).toLocaleString('en-IN')}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            
        </div>
    );
};

export default ReportPage;
