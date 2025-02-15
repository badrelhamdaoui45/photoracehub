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

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body!,
      sig!,
      webhookSecret!
    );

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const { user_id, photo_ids } = session.metadata!;

        // Create purchase records
        const purchases = photo_ids.split(',').map(photoId => ({
          photo_id: photoId,
          buyer_id: user_id,
          amount: session.amount_total! / 100,
          stripe_payment_intent: session.payment_intent as string
        }));

        await supabase.from('purchases').insert(purchases);
        break;
      }

      case 'account.updated': {
        const account = stripeEvent.data.object as Stripe.Account;
        
        if (account.metadata?.user_id) {
          await supabase
            .from('profiles')
            .update({
              stripe_account_id: account.id,
              stripe_account_status: account.charges_enabled ? 'active' : 'pending'
            })
            .eq('id', account.metadata.user_id);
        }
        break;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Webhook error' })
    };
  }
}