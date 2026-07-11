import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../api/axios';

const StripeCheckout = ({ clientSecret, invoiceId, amount, onPaymentSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
      }
    });

    if (stripeError) {
      setError(stripeError.message);
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        // Record payment in our backend
        await api.post('/pos/payments', {
          invoiceId,
          amount,
          method: 'STRIPE',
          transactionId: paymentIntent.id
        });
        setIsProcessing(false);
        onPaymentSuccess();
      } catch (_err) {
        setError('Payment succeeded in Stripe but failed to save in system.');
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="bg-white p-6 border rounded-xl shadow-lg mt-4">
      <h3 className="text-lg font-bold mb-4">Complete Payment</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4 p-3 border rounded">
          <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
        </div>
        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        <div className="flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-semibold"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={!stripe || isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded font-semibold"
          >
            {isProcessing ? 'Processing...' : `Pay $${amount}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StripeCheckout;
