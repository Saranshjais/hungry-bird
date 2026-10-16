// Premium helpers (CONTRACT §3, §7). Nothing premium is shown unless config.premium.enabled.

export const premiumEnabled = (config) => !!(config && config.premium && config.premium.enabled);

// is_premium on the user is independent of the admin switch (CONTRACT §1).
export const isPremiumUser = (user, config) => premiumEnabled(config) && !!(user && user.is_premium);

export function formatDuration(days) {
  const d = Number(days) || 0;
  if (!d) return '';
  if (d % 365 === 0) return d === 365 ? '1 year' : `${d / 365} years`;
  if (d % 30 === 0) return d === 30 ? '1 month' : `${d / 30} months`;
  if (d % 7 === 0) return d === 7 ? '1 week' : `${d / 7} weeks`;
  return d === 1 ? '1 day' : `${d} days`;
}

export function formatPaise(paise) {
  const n = Number(paise);
  if (!Number.isFinite(n)) return '';
  const rupees = n / 100;
  return `₹${Number.isInteger(rupees) ? rupees : rupees.toFixed(2)}`;
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let loader = null;

// Loads Razorpay Standard Checkout on demand (only when someone presses Buy).
export function loadRazorpay(timeoutMs = 20000) {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    const timer = setTimeout(() => {
      loader = null;
      reject(new Error('timeout'));
    }, timeoutMs);
    script.onload = () => {
      clearTimeout(timer);
      if (window.Razorpay) resolve(window.Razorpay);
      else {
        loader = null;
        reject(new Error('Razorpay missing'));
      }
    };
    script.onerror = () => {
      clearTimeout(timer);
      loader = null;
      script.remove();
      reject(new Error('load failed'));
    };
    document.body.appendChild(script);
  });
  return loader;
}
