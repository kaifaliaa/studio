import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { NoteCounts, TransactionType } from '../types';
import { DENOMINATIONS } from '../constants';
import CurrencyCounter from '../components/CurrencyCounter';
import { UserIcon } from '../components/icons/UserIcon';
import { BuildingOfficeIcon } from '../components/icons/BuildingOfficeIcon';
import { MapPinIcon } from '../components/icons/MapPinIcon';
import { TrendingUpIcon } from '../components/icons/TrendingUpIcon';
import { TrendingDownIcon } from '../components/icons/TrendingDownIcon';
import { CalendarDaysIcon } from '../components/icons/CalendarDaysIcon';
import { sendTelegramMessage } from '../services/telegramService';

const TransactionPage: React.FC = () => {
  const { addTransaction, companyNames, locations } = useAppContext();
  const { state: routeState } = useLocation();
  const navigate = useNavigate();

  const user = localStorage.getItem('ali_enterprises_user');
  const userData = user ? JSON.parse(user) : null;
  const currentUserName = userData?.displayName || userData?.email || 'Unknown User';

  const [person, setPerson] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [recordedBy, setRecordedBy] = useState(currentUserName);
  const [breakdown, setBreakdown] = useState<NoteCounts>({});
  const [manualDate, setManualDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19));

  const [prefilledType, setPrefilledType] = useState<TransactionType | null>(null);
  const [isPersonalUdhar, setIsPersonalUdhar] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (routeState?.person && routeState?.company) {
      setPerson(routeState.person);
      setCompany(routeState.company);
      setPrefilledType(routeState.type || null);
      setIsPersonalUdhar(true);
    } else {
      setIsPersonalUdhar(false);
      setPrefilledType(null);
    }
  }, [routeState]);

  useEffect(() => {
    setRecordedBy(currentUserName);
  }, [currentUserName]);

  const totalAmount = useMemo(() => {
    return DENOMINATIONS.reduce((sum, denom) => sum + (breakdown[denom] || 0) * denom, 0);
  }, [breakdown]);

  const resetForm = (clearPrefilled = false) => {
    if (!isPersonalUdhar || clearPrefilled) {
        setPerson('');
        setCompany('');
        setIsPersonalUdhar(false);
        setPrefilledType(null);
        navigate('.', { replace: true });
    }
    setLocation('');
    setBreakdown({});
    setError(null);
    setManualDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19));
  };

  const handleTransaction = async (transactionType: TransactionType) => {
    if (!location) {
      setError("Location is a required field.");
      return;
    }
    if (totalAmount < 0) {
        setError("Transaction amount cannot be negative.");
        return;
    }

    setError(null);
    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      const transactionData = {
        type: transactionType,
        paymentMethod: 'cash',
        company: company || 'NA',
        person: person,
        location: location,
        recordedBy: recordedBy,
        amount: totalAmount,
        notes: '',
        breakdown,
        manualDate: manualDate,
      };

      await addTransaction(transactionData);

      const formattedDate = new Date(manualDate).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const breakdownString = DENOMINATIONS
        .map(denom => {
            const count = breakdown[denom];
            return count ? `₹${denom} x ${count} = ${denom * count}` : null;
        })
        .filter(Boolean)
        .join('\n');


      const telegramMessage = `
*New Transaction Alert!*

*Type:* ${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}
*Amount:* ₹${totalAmount.toLocaleString('en-IN')}
*Person:* ${person || 'N/A'}
*Company:* ${company || 'NA'}
*Location:* ${location}
*Recorded By:* ${recordedBy}
*Date:* ${formattedDate}
${breakdownString ? `
*Breakdown:*
${breakdownString}` : ''}
      `;

      await sendTelegramMessage(telegramMessage);

      setSuccessMessage(`Transaction of ₹${totalAmount.toLocaleString('en-IN')} recorded successfully!`);
      resetForm(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8">
      {successMessage && (
        <div className="bg-green-100 dark:bg-green-900/50 border border-green-400 text-green-700 dark:text-green-200 px-4 py-3 rounded-lg relative mb-6">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg relative mb-6">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Cash Denominations</h3>
          <CurrencyCounter value={breakdown} onChange={setBreakdown} />
        </div>

        <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg text-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            Total Amount: ₹{totalAmount.toLocaleString('en-IN')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon className="h-5 w-5 text-gray-400" /></div>
            <input type="text" value={person} onChange={e => setPerson(e.target.value)} disabled={isPersonalUdhar} className="block w-full pl-10 pr-3 py-2 border rounded-md sm:text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-800" placeholder="Customer's name" />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><BuildingOfficeIcon className="h-5 w-5 text-gray-400" /></div>
            <select value={company} onChange={e => setCompany(e.target.value)} disabled={isPersonalUdhar} className="block w-full pl-10 pr-3 py-2 border rounded-md sm:text-sm bg-white dark:bg-gray-700 appearance-none border-gray-300 dark:border-gray-600 disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-800">
              <option value="">Select Company</option>
              {isPersonalUdhar && <option value="NA">NA</option>}
              {companyNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPinIcon className="h-5 w-5 text-gray-400" /></div>
                <select value={location} onChange={e => setLocation(e.target.value)} className="block w-full pl-10 pr-3 py-2 border rounded-md sm:text-sm bg-white dark:bg-gray-700 appearance-none border-gray-300 dark:border-gray-600" required>
                <option value="">Select Location</option>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
            </div>

            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><CalendarDaysIcon className="h-5 w-5 text-gray-400" /></div>
                <input type="datetime-local" value={manualDate} onChange={e => setManualDate(e.target.value)} className="block w-full pl-10 pr-3 py-2 border rounded-md sm:text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
            </div>
        </div>

        <div>
            {prefilledType ? (
                <button
                    type="button"
                    onClick={() => handleTransaction(prefilledType)}
                    disabled={isSubmitting || totalAmount < 0}
                    className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${prefilledType === 'credit' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'}`}>
                    <span className="capitalize">{prefilledType}</span>
                    <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                </button>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => handleTransaction('debit')} disabled={isSubmitting || totalAmount < 0} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"><TrendingDownIcon className="h-5 w-5 text-red-500" /><span>Debit</span></button>
                    <button type="button" onClick={() => handleTransaction('credit')} disabled={isSubmitting || totalAmount < 0} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"><TrendingUpIcon className="h-5 w-5 text-green-500" /><span>Credit</span></button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TransactionPage;
