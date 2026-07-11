import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

const SalaryPage = () => {
  const queryClient = useQueryClient();
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const { data: salaryData, isLoading } = useQuery({
    queryKey: ['salary-runs'],
    queryFn: async () => {
      const res = await api.get('/salary');
      return res.data;
    }
  });

  const generateRun = useMutation({
    mutationFn: async (data) => api.post('/salary/generate', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['salary-runs']);
      setIsGenerateModalOpen(false);
    }
  });

  const salaryRuns = salaryData?.data || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Payroll & Commissions</h1>
          <p className="text-gray-500">Manage worker payouts and salary runs.</p>
        </div>
        <button 
          onClick={() => setIsGenerateModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
        >
          Run Payroll
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading payroll history...</div>
        ) : salaryRuns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payroll runs generated yet.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Run ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated On</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Payout</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salaryRuns.map((run) => (
                <tr key={run.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {run.id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(run.periodStart).toLocaleDateString()} - {new Date(run.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(run.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right text-green-600">
                    ${run.totalPayout.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {run.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Generate Payroll Run</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              generateRun.mutate({
                periodStart: new Date(formData.get('periodStart')).toISOString(),
                periodEnd: new Date(formData.get('periodEnd')).toISOString()
              });
            }}>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  This will calculate all commissions and payouts from PAID invoices within the selected date range.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Period Start</label>
                  <input name="periodStart" type="date" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Period End</label>
                  <input name="periodEnd" type="date" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsGenerateModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={generateRun.isPending} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
                  {generateRun.isPending ? 'Calculating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryPage;
