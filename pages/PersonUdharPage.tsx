import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Transaction, TransactionType } from '../types';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { MinusCircleIcon } from '../components/icons/MinusCircleIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { StarIcon } from '../components/icons/StarIcon';
import { PlusIcon } from '../components/icons/PlusIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { CalendarDaysIcon } from '../components/icons/CalendarDaysIcon';

const PersonUdharPage: React.FC = () => {
    const { personName } = useParams<{ personName: string }>();
    const { transactions, deleteTransactionsByIds, addTransaction } = useAppContext();
    const navigate = useNavigate();
    const user = localStorage.getItem('ali_enterprises_user');
    const userData = user ? JSON.parse(user) : null;
    const currentUserName = userData?.displayName || userData?.email || 'Unknown User';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalType, setModalType] = useState<TransactionType>('credit');
    const [amount, setAmount] = useState(0);
    const [remark, setRemark] = useState('');
    const [manualDate, setManualDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));


    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const personTransactions = useMemo(() => {
        return transactions
            .filter(tx => tx.company === 'NA' && tx.location === 'NA' && tx.person?.toUpperCase() === personName?.toUpperCase())
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, personName]);

    const summary = useMemo(() => {
        return personTransactions.reduce((acc, tx) => {
            if (tx.type === 'credit') acc.totalCredit += tx.amount;
            else acc.totalDebit += tx.amount;
            return acc;
        }, { totalCredit: 0, totalDebit: 0 });
    }, [personTransactions]);

    const netBalance = summary.totalCredit - summary.totalDebit;

    const openAddTransactionModal = (type: TransactionType) => {
        setModalType(type);
        setAmount(0);
        setRemark('');
        setManualDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        setModalError(null);
        setIsModalOpen(true);
    }
    
    const currencyFormatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    const handleSaveTransaction = async () => {
        if (amount <= 0) { setModalError('Amount must be positive.'); return; }

        setIsSubmitting(true);
        setModalError(null);

        try {
            await addTransaction({
                type: modalType,
                paymentMethod: 'cash',
                company: 'NA',
                person: personName || '',
                location: 'NA',
                recordedBy: currentUserName,
                amount: amount,
                notes: remark,
                manualDate: manualDate,
                breakdown: {},
            });
            setIsModalOpen(false);
        } catch(err: any) {
            setModalError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleDeleteClick = (id: string) => {
        setSelectedId(id);
        setDeleteError(null);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedId) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            await deleteTransactionsByIds([selectedId]);
            setIsDeleteModalOpen(false);
            setSelectedId(null);
        } catch (err: any) { 
            setDeleteError(err.message || 'Failed to delete transaction.');
        } finally {
            setIsDeleting(false);
        }
    };

    const TransactionItem: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
        const { id, date, type, amount, paymentMethod, notes } = transaction;
        const formattedDate = new Date(date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-start p-4 gap-4">
                {type === 'credit' ? 
                    <CheckCircleIcon className="h-8 w-8 text-green-500 flex-shrink-0 mt-1" /> : 
                    <MinusCircleIcon className="h-8 w-8 text-red-500 flex-shrink-0 mt-1" />
                }
                <div className="flex-grow">
                    <div className="flex justify-between items-center">
                        <p className={`text-lg font-bold ${type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {currencyFormatter.format(amount)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-medium">{paymentMethod}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</p>
                    {notes && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{notes}</p>}
                </div>
                <div className="flex-shrink-0 flex flex-col sm:flex-row items-center gap-2 -mr-2">
                    <Link to={`/edit/${id}`} state={{ from: window.location.pathname }} className="p-2 text-gray-400 hover:text-blue-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><PencilIcon className="h-5 w-5" /></Link>
                    <button onClick={() => handleDeleteClick(id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><TrashIcon className="h-5 w-5" /></button>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto px-2 pb-24">
            <header className="flex items-center justify-between gap-4 my-6">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600"><ArrowLeftIcon className="h-5 w-5"/><span>Back</span></button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{personName} - Udhar</h1>
                <div className="flex gap-2">
                    <button onClick={() => openAddTransactionModal('credit')} className="flex items-center gap-1 bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 text-sm font-medium"><PlusIcon className="h-4 w-4"/> Cr</button>
                    <button onClick={() => openAddTransactionModal('debit')} className="flex items-center gap-1 bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 text-sm font-medium"><PlusIcon className="h-4 w-4"/> Dr</button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SummaryCard title="Total Credit" amount={summary.totalCredit} color="green" />
                <SummaryCard title="Total Debit" amount={summary.totalDebit} color="red" />
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Balance</p>
                        <p className={`text-2xl font-bold mt-1 ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>{currencyFormatter.format(netBalance)}</p>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full"><StarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" /></div>
                </div>
            </div>
            
            {personTransactions.length > 0 ? (
                <div className="space-y-4">{personTransactions.map(tx => <TransactionItem key={tx.id} transaction={tx} />)}</div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-xl mt-4">
                    <p className="text-gray-500 dark:text-gray-400">No udhar transactions found for {personName}.</p>
                </div>
            )}

            {isModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">Add {modalType}</h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
                                <input type="number" id="amount" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                            </div>
                             <div>
                                <label htmlFor="remark" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Remark</label>
                                <input type="text" id="remark" value={remark} onChange={(e) => setRemark(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter a remark (optional)" />
                            </div>
                            <div className="relative">
                                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date & Time</label>
                                <div className="absolute inset-y-0 left-3 top-7 flex items-center pointer-events-none"><CalendarDaysIcon className="h-5 w-5 text-gray-400" /></div>
                                <input type="datetime-local" id="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="block w-full pl-10 pr-3 py-2 border rounded-md sm:text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 mt-1" />
                            </div>
                        </div>
                        {modalError && <div className="mt-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 p-2 rounded-lg text-sm">{modalError}</div>}
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium border rounded-md disabled:opacity-50">Cancel</button>
                            <button onClick={handleSaveTransaction} disabled={isSubmitting} className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${modalType === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>{isSubmitting ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                 </div>
            )}

            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Deletion</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Are you sure you want to delete this transaction? This cannot be undone.</p>
                        {deleteError && <div className="mt-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 p-2 rounded-lg text-sm">{deleteError}</div>}
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} className="px-4 py-2 text-sm font-medium border rounded-md disabled:opacity-50">Cancel</button>
                            <button onClick={handleConfirmDelete} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50">{isDeleting ? 'Deleting...' : 'Delete'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const SummaryCard: React.FC<{title: string, amount: number, color: string}> = ({ title, amount, color }) => {
    const currencyFormatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400 mt-1`}>{currencyFormatter.format(amount)}</p>
        </div>
    );
};

export default PersonUdharPage;
