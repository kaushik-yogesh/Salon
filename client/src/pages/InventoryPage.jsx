import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

const InventoryPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('products');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await api.get('/inventory');
      return res.data;
    }
  });

  const { data: suppliersData, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get('/inventory/suppliers');
      return res.data;
    }
  });

  const adjustStock = useMutation({
    mutationFn: async (data) => {
      // Manual restock is positive, shrinkage is negative
      if (data.type === 'SHRINKAGE') data.quantity = -Math.abs(data.quantity);
      else if (data.type === 'MANUAL_RESTOCK') data.quantity = Math.abs(data.quantity);
      return api.post('/inventory/adjust', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      setIsAdjustModalOpen(false);
      setSelectedProduct(null);
    }
  });

  const createProduct = useMutation({
    mutationFn: async (data) => api.post('/inventory', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      setIsAddProductModalOpen(false);
    }
  });

  const createSupplier = useMutation({
    mutationFn: async (data) => api.post('/inventory/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      setIsSupplierModalOpen(false);
    }
  });

  const products = productsData?.data || [];
  const suppliers = suppliersData?.data || [];
  
  // We need a branchId for new products, hardcoding the primary branch for now 
  // In a real app this would come from context or a selector
  const defaultBranchId = products.length > 0 ? products[0].branchId : 'c031c19b-c49b-4497-a790-281b3d5b00c6';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Inventory</h1>
          <p className="text-gray-500">Manage your salon products and stock levels.</p>
        </div>
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          {['products', 'suppliers', 'purchase orders'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-bold text-sm uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'products' && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="font-bold text-gray-800">Retail Products</h2>
            <button 
              onClick={() => setIsAddProductModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded shadow text-sm font-bold hover:bg-indigo-700 transition"
            >
              + Add Product
            </button>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading inventory...</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No products found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.stockQuantity < product.lowStockThreshold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {product.stockQuantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">${product.retailPrice}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => { setSelectedProduct(product); setIsAdjustModalOpen(true); }}
                        className="text-indigo-600 hover:text-indigo-900 font-bold"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="font-bold text-gray-800">Supplier Directory</h2>
            <button 
              onClick={() => setIsSupplierModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded shadow text-sm font-bold hover:bg-indigo-700 transition"
            >
              + Add Supplier
            </button>
          </div>
          {suppliersLoading ? (
            <div className="p-8 text-center text-gray-500">Loading suppliers...</div>
          ) : suppliers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No suppliers found. Add one to start issuing Purchase Orders.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.map((sup) => (
                  <tr key={sup.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{sup.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sup.contactPerson || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sup.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sup.phone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'purchase orders' && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-8 text-center mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Purchase Orders Dashboard</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            The Supply Chain schema is connected. You can now track bulk shipments from your Suppliers directly into your branch inventory.
          </p>
          <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg shadow font-bold hover:bg-indigo-700 transition">
            Create Draft PO
          </button>
        </div>
      )}

      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Adjust Stock: {selectedProduct.name}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              adjustStock.mutate({
                productId: selectedProduct.id,
                type: formData.get('type'),
                quantity: parseInt(formData.get('quantity'), 10),
                notes: formData.get('notes')
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Adjustment Type</label>
                  <select name="type" required className="mt-1 block w-full border border-gray-300 rounded-md p-2">
                    <option value="MANUAL_RESTOCK">Manual Restock</option>
                    <option value="SHRINKAGE">Shrinkage / Loss</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity (Absolute Value)</label>
                  <input name="quantity" type="number" min="1" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  <p className="text-xs text-gray-500 mt-1">If Shrinkage, this number will be subtracted.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <input name="notes" type="text" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => { setIsAdjustModalOpen(false); setSelectedProduct(null); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={adjustStock.isPending} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Add New Product</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              createProduct.mutate({
                branchId: defaultBranchId,
                sku: formData.get('sku'),
                name: formData.get('name'),
                description: formData.get('description'),
                retailPrice: parseFloat(formData.get('retailPrice')),
                costPrice: parseFloat(formData.get('costPrice') || 0),
                stockQuantity: parseInt(formData.get('stockQuantity'), 10),
                lowStockThreshold: parseInt(formData.get('lowStockThreshold'), 10),
                status: 'ACTIVE'
              });
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                    <input name="sku" type="text" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input name="name" type="text" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea name="description" className="mt-1 block w-full border border-gray-300 rounded-md p-2" rows="2"></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Retail Price ($)</label>
                    <input name="retailPrice" type="number" step="0.01" min="0" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost Price ($)</label>
                    <input name="costPrice" type="number" step="0.01" min="0" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Initial Stock</label>
                    <input name="stockQuantity" type="number" min="0" defaultValue="0" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Low Stock Alert</label>
                    <input name="lowStockThreshold" type="number" min="0" defaultValue="5" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddProductModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={createProduct.isPending} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Add New Supplier</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              createSupplier.mutate({
                name: formData.get('name'),
                contactPerson: formData.get('contactPerson'),
                email: formData.get('email'),
                phone: formData.get('phone')
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                  <input name="name" type="text" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                  <input name="contactPerson" type="text" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input name="email" type="email" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input name="phone" type="text" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={createSupplier.isPending} className="px-4 py-2 text-white bg-indigo-600 rounded font-bold hover:bg-indigo-700">Add Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
