// EDIT THIS FILE: prices, payment methods and where the money goes.
module.exports = {
  currency: 'usd',
  discord: 'https://discord.gg/YOUR_INVITE',
  plans: {
    month:    { name: 'Monthly',  price: 10, days: 30,   note: '30 days of access, no auto-renewal' },
    lifetime: { name: 'Lifetime', price: 30, days: null, note: 'One payment, all future updates' }
  },
  methods: {
    // Money goes to the bank account connected in your Stripe dashboard (Settings > Payouts).
    stripe: { enabled: true, label: 'Card, Apple Pay, Google Pay' },
    // Manual methods: customer pays you directly, you confirm in /admin and the key is released.
    paypal: { enabled: true, label: 'PayPal',
      instructions: 'Send the exact amount to YOUR_PAYPAL_EMAIL. Put your order ID in the payment note.' },
    crypto: { enabled: true, label: 'Crypto (USDT, TRC20)',
      instructions: 'Send the exact amount to YOUR_WALLET_ADDRESS on the TRC20 network, then open a Discord ticket with your order ID.' }
  }
};
