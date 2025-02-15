import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Create Stripe session
export async function createStripeCheckoutSession(photos: { id: string; price: number }[]) {
  try {
    const response = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ photos }),
    });

    const session = await response.json();
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Create Stripe Connect account link
export async function createStripeConnectAccount() {
  try {
    const response = await fetch('/.netlify/functions/create-connect-account', {
      method: 'POST',
    });

    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error('Error creating connect account:', error);
    throw error;
  }
}