
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

        const maxCashCount = Math.max(0, ...customers.map(c => c.cash.length));
        const maxUpiCount = Math.max(0, ...customers.map(c => c.upi.length));
        const maxDebitCount = debitAmounts.length;

        return { customers, debitAmounts, totalCredit, totalDebit, closingBalance, maxCashCount, maxUpiCount, maxDebitCount };
    }, [companyTransactions]);

    const formattedDate = (date: Date) => date.toLocaleString('en-IN', {
        day: '2-digit', month: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
    
    const getStatementPeriod = () => {
        if (showAllDates) {
            return `${filterDay}/${filterMonth}/${filterYear}`;
        }
        return new Date().toLocaleDateString('en-IN');
    };

    if (!reportData) {
        return (
            <div className="text-center p-8">
                <p>No transactions found for {decodedCompanyName} matching the applied filters.</p>
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

    const totalColumns = 1 + reportData.maxCashCount + reportData.maxUpiCount + 1;

    return (
        <div className="bg-white p-2 sm:p-4 md:p-6 lg:p-8 print-container min-w-0">
             <div className="no-print mb-4">
                <Link to={`/company/${encodeURIComponent(decodedCompanyName)}?${searchParams.toString()}`} className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                    <ArrowLeftIcon className="h-5 w-5"/><span>Back to History</span>
                </Link>
             </div>
            
            <header className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-black">ALI ENTERPRISES</h1>
                    <p className="text-lg text-gray-600 tracking-wider">FINANCIAL TRANSACTION STATEMENT</p>
                </div>
                <div className="text-right">
                    <span className="bg-black text-white text-sm font-bold px-3 py-1">CONFIDENTIAL REPORT</span>
                    <h2 className="text-2xl font-semibold mt-2">{decodedCompanyName}</h2>
                    <p className="text-xs text-gray-500 mt-1">GENERATED: {formattedDate(generationDate)}</p>
                    <p className="text-xs text-gray-500">LOCATION: {locationFilter || 'N/A'}</p>
                </div>
            </header>
            
            <div className="mb-8">
                <p className="text-sm"><span className="font-bold">STATEMENT PERIOD:</span> {getStatementPeriod()}</p>
            </div>

            <hr className="border-black mb-8" />
            
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-black text-xs sm:text-sm">
                    <thead className="font-bold bg-gray-100">
                        <tr>
                            <th rowSpan={2} className="border border-black p-1 sm:p-2">Customer Name</th>
                            {reportData.maxCashCount > 0 && <th colSpan={reportData.maxCashCount} className="border border-black p-1 sm:p-2">Cash</th>}
                            {reportData.maxUpiCount > 0 && <th colSpan={reportData.maxUpiCount} className="border border-black p-1 sm:p-2">UPI</th>}
                            <th rowSpan={2} className="border border-black p-1 sm:p-2">Total Credit</th>
                        </tr>
                        <tr>
                            {Array.from({ length: reportData.maxCashCount }, (_, i) => (
                                <th key={`cash-header-${i}`} className="border border-black p-1 sm:p-2">{i + 1}</th>
                            ))}
                            {Array.from({ length: reportData.maxUpiCount }, (_, i) => (
                                <th key={`upi-header-${i}`} className="border border-black p-1 sm:p-2">{i + 1}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.customers.map(customer => (
                            <tr key={customer.name}>
                                <td className="border border-black p-1 sm:p-2 font-semibold">{customer.name}</td>
                                {Array.from({ length: reportData.maxCashCount }, (_, i) => (
                                    <td key={`cash-cell-${i}`} className="border border-black p-1 sm:p-2 text-center font-bold">
                                        {customer.cash[i] ? currencyFormatter.format(customer.cash[i]) : ''}
                                    </td>
                                ))}
                                {Array.from({ length: reportData.maxUpiCount }, (_, i) => (
                                    <td key={`upi-cell-${i}`} className="border border-black p-1 sm:p-2 text-center font-bold">
                                        {customer.upi[i] ? currencyFormatter.format(customer.upi[i]) : ''}
                                    </td>
                                ))}
                                <td className="border border-black p-1 sm:p-2 text-right font-bold">{currencyFormatter.format(customer.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="font-bold">
                        <tr>
                            <td colSpan={1 + reportData.maxCashCount + reportData.maxUpiCount} className="border-t-2 border-black p-1 sm:p-2 text-right">Total Credit</td>
                            <td className="border-t-2 border-black border-l border-black p-1 sm:p-2 text-right bg-green-100">{currencyFormatter.format(reportData.totalCredit)}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 sm:p-2">Entry</td>
                             {Array.from({ length: Math.max(reportData.maxCashCount, reportData.maxDebitCount) }, (_, i) => (
                                <td key={`debit-cash-${i}`} className="border border-black p-1 sm:p-2 text-right">
                                    {reportData.debitAmounts[i] ? currencyFormatter.format(reportData.debitAmounts[i]) : ''}
                                </td>
                            ))}
                             {reportData.maxCashCount < reportData.maxDebitCount && <td colSpan={reportData.maxDebitCount - reportData.maxCashCount}></td>}
                            <td colSpan={reportData.maxUpiCount} className="border-y border-r border-black p-1 sm:p-2"></td>
                            <td className="border border-black p-1 sm:p-2 text-right bg-red-100">{currencyFormatter.format(reportData.totalDebit)}</td>
                        </tr>
                        <tr>
                            <td colSpan={totalColumns -1} className="p-1 sm:p-2 text-right">Closing Balance</td>
                            <td className={`border border-black p-1 sm:p-2 text-right ${
                                reportData.closingBalance >= 0 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-600 font-bold'
                            }`}>
                                {currencyFormatter.format(reportData.closingBalance)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default ReportPage;
