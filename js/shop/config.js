/* =========================================================
   Shop Configuration
   Responsibility:
   - Store contact details
   - Payment-related constants
   - NO business logic here
   ========================================================= */

(function () {
    // ---- STORE CONTACT DETAILS ----
    const STORE_CONFIG = {
        WHATSAPP_NUMBER: '916379243495',
        EMAIL: 'iamajoyag@gmail.com',
        UPI_ID: 'ajoyag06@okhdfcbank',

        // Branding
        STORE_NAME: 'Sri Pickles'
    };

    // ---- PAYMENT CONFIG ----
    const PAYMENT_CONFIG = {
        // PhonePe (Mock / Placeholder – server integration needed for real use)
        PHONEPE_MERCHANT_ID: 'PGCHECKOUT',
        PHONEPE_SALT_KEY: 'YOUR_SALT_KEY',

        // Razorpay (Test key only – NEVER put live key here)
        RAZORPAY_KEY_ID: 'rzp_test_yourkeyhere'
    };

    // ---- SHIPPING CONFIG ----
    const SHIPPING_CONFIG = {
        BASE_COST: 50,
        GST_PERCENT: 18
    };

    // ---- EXPORT TO GLOBAL NAMESPACE (SINGLE ENTRY POINT) ----
    window.ShopConfig = {
        store: STORE_CONFIG,
        payment: PAYMENT_CONFIG,
        shipping: SHIPPING_CONFIG
    };
})();
