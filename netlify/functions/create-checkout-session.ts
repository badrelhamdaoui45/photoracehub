import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { photos } = JSON.parse(event.body || '{}');
    
    // Get user from Supabase auth context
    const authHeader = event.headers.authorization;
    const token = authHeader?.split('Bearer ')[1];
    
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Get photographer's Stripe account IDs for the photos
    const { data: photoData, error: photoError } = await supabase
      .from('photos')
      .select(`
        id,
        price,
        photographer_id,
        profiles(stripe_account_id)
      `)
      .in('id', photos.map(p => p.id));

    if (photoError || !photoData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Failed to fetch photo data' })
      };
    }

    // Create line items with proper Stripe Connect handling
    const lineItems = photoData.map(photo => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Race Photo #${photo.id}`,
        },
        unit_amount: Math.round(photo.price * 100),
        application_fee_amount: Math.round(photo.price * 10), // 10% platform fee
      },
      quantity: 1,
    }));

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.URL}/profile?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/gallery`,
      payment_intent_data: {
        application_fee_amount: Math.round(photos.reduce((sum, p) => sum + p.price, 0) * 10), // 10% platform fee
        transfer_data: {
          destination: photoData[0].profiles.stripe_account_id,
        },
      },
      metadata: {
        user_id: user.id,
        photo_ids: photos.map(p => p.id).join(','),
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id, url: session.url })
    };
  } catch (error) {
    console.error('Stripe session creation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create checkout session' })
    };
  }
}