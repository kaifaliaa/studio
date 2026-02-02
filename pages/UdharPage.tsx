import React from 'react';
import { Link } from 'react-router-dom';
import { UserIcon } from '../components/icons/UserIcon';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';

const UdharPage: React.FC = () => {
    return (
        <div className="max-w-md mx-auto">
            <header className="flex items-center justify-between gap-4 mb-6">
                <Link to="/profile" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                    <ArrowLeftIcon className="h-5 w-5"/><span>Back to Profile</span>
                </Link>
                <h2 className="text-2xl text-gray-900 dark:text-white">Personal Udhar</h2>
            </header>

            <div className="space-y-4">
                <Link to="/udhar/LAXMAN" className="block w-full text-left bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow p-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
                            <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-lg font-semibold">LAXMAN</span>
                    </div>
                </Link>
                <Link to="/udhar/BM" className="block w-full text-left bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow p-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-100 dark:bg-orange-900/50 p-3 rounded-full">
                            <UserIcon className="h-6 w-6 text-orange-500" />
                        </div>
                        <span className="text-lg font-semibold">BM</span>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default UdharPage;
