import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserIcon } from '../components/icons/UserIcon';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';

const UdharPage: React.FC = () => {
    const navigate = useNavigate();

    const people = [
        { name: 'LAXMAN', color: 'blue' },
        { name: 'BM', color: 'orange' },
        // Add more people here if needed
    ];

    return (
        <div className="max-w-xl mx-auto px-4">
            <header className="flex items-center justify-between my-6">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <ArrowLeftIcon className="h-5 w-5"/>
                    <span className="text-sm font-medium">Back</span>
                </button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Personal Udhar</h1>
                {/* Spacer */}
                <div className="w-12"></div>
            </header>

            <div className="space-y-4">
                {people.map(person => (
                    <Link 
                        key={person.name}
                        to={`/udhar/${person.name}`}
                        className="block w-full text-left bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 ease-in-out p-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full bg-${person.color}-100 dark:bg-${person.color}-900/50`}>
                                <UserIcon className={`h-6 w-6 text-${person.color}-600 dark:text-${person.color}-400`} />
                            </div>
                            <div>
                                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{person.name}</span>
                                <p className="text-sm text-gray-500 dark:text-gray-400">View udhar details</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default UdharPage;
