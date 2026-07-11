import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

const InventoryPage = () => {
  const queryClient = useQueryClient();
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await api.get('/inventory');
      return res.data;
    }
  });

  const adjustStock = useMutation({
    mutationFn: async (data) => api.post('/inventory/adjust', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      setIsAdjustModalOpen(false);
      setSelectedProduct(null);
    }
  });

  const products = productsData?.data || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Inventory</h1>
          <p className="text-gray-500">Manage your salon products and stock levels.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
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
                      className="text-blue-600 hover:text-blue-900"
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
    </div>
  );
};

export default InventoryPage;
