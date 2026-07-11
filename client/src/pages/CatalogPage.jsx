import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

const CatalogPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('SERVICES');
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  const { data: catalogData, isLoading, error } = useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const res = await api.get('/catalog');
      return res.data;
    }
  });

  const createService = useMutation({
    mutationFn: async (data) => api.post('/catalog/services', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['catalog']);
      setIsAddServiceOpen(false);
    }
  });

  const createCategory = useMutation({
    mutationFn: async (data) => api.post('/catalog/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['catalog']);
      setIsAddCategoryOpen(false);
    }
  });

  if (isLoading) return <div className="p-8 text-center text-secondary">Loading catalog...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error loading catalog</div>;

  const categories = catalogData?.data?.categories || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Catalog & Services</h1>
          <p className="text-gray-500">Manage the services and packages offered at your salon.</p>
        </div>
        <div className="space-x-3">
          {activeTab === 'CATEGORIES' && (
            <button 
              onClick={() => setIsAddCategoryOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 transition"
            >
              + Add Category
            </button>
          )}
          {activeTab === 'SERVICES' && (
            <button 
              onClick={() => setIsAddServiceOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
            >
              + Add Service
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 mb-6">
        {['CATEGORIES', 'SERVICES', 'PACKAGES'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-4 text-sm font-medium transition ${
              activeTab === tab 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow border border-gray-200 min-h-[400px] overflow-hidden">
        {activeTab === 'SERVICES' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.flatMap(c => c.services).length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No services found. Click '+ Add Service' to start building your catalog.
                  </td>
                </tr>
              ) : (
                categories.flatMap(c => 
                  c.services.map(s => (
                    <tr key={s.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${s.basePrice.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.baseDuration} mins</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        )}
        
        {activeTab === 'CATEGORIES' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Services Count</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="2" className="p-8 text-center text-gray-500">
                    No categories found. Click '+ Add Category' to create one.
                  </td>
                </tr>
              ) : (
                categories.map(c => (
                  <tr key={c.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.services?.length || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'PACKAGES' && (
           <div className="p-8 text-center text-gray-500">Package Builder UI (Requires Backend API to modify Packages)</div>
        )}
      </div>

      {isAddServiceOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Add New Service</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              createService.mutate({
                categoryId: formData.get('categoryId'),
                name: formData.get('name'),
                description: formData.get('description'),
                basePrice: parseFloat(formData.get('basePrice')),
                baseDuration: parseInt(formData.get('baseDuration'), 10),
                taxRate: parseFloat(formData.get('taxRate')) || 0
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select name="categoryId" required className="mt-1 block w-full border border-gray-300 rounded-md p-2">
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Name</label>
                  <input name="name" type="text" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Base Price ($)</label>
                    <input name="basePrice" type="number" step="0.01" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (mins)</label>
                    <input name="baseDuration" type="number" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                  <input name="taxRate" type="number" step="0.01" defaultValue="0" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddServiceOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={createService.isPending || categories.length === 0} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
                  {categories.length === 0 ? 'Need Category First' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddCategoryOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Add New Category</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              createCategory.mutate({
                name: formData.get('name'),
                description: formData.get('description')
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category Name</label>
                  <input name="name" type="text" required placeholder="e.g. Haircuts, Coloring" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                  <input name="description" type="text" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddCategoryOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={createCategory.isPending} className="px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogPage;
