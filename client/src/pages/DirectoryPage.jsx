import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { Link } from 'react-router-dom';

const DirectoryPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data } = useQuery({
    queryKey: ['directory-salons'],
    queryFn: async () => {
      const res = await api.get('/directory/salons');
      return res.data;
    }
  });

  const salons = data?.data?.salons || [];

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Find Your Next Look</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Discover top-rated salons, barbershops, and spas near you. Book instantly online.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex shadow-sm rounded-lg overflow-hidden">
            <input 
              type="text" 
              placeholder="Search by salon name or service..." 
              className="flex-1 px-6 py-4 border-none focus:ring-0 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="bg-indigo-600 text-white px-8 font-bold hover:bg-indigo-700">
              Search
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {salons?.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(salon => (
            <div key={salon.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
              <div className="h-48 bg-gray-200 bg-gradient-to-br from-indigo-100 to-rose-100 flex items-center justify-center">
                <span className="text-4xl">✂️</span>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{salon.name}</h3>
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded flex items-center">
                    ★ 5.0
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">{salon.branches?.[0]?.address || 'Multiple Locations'}</p>
                <Link to={`/book/${salon.id}`} className="block w-full text-center bg-indigo-50 text-indigo-700 font-bold py-2 rounded hover:bg-indigo-100 transition">
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DirectoryPage;
