export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('WordServe content script loaded');
    
    // Simple demo: add a visual indicator that WordServe is active
    const indicator = document.createElement('div');
    indicator.id = 'wordserve-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 999999;
      background: oklch(0.647 0.137 320.109);
      color: oklch(0.139 0.029 285.882);
      padding: 4px 8px;
      border-radius: 4px;
      font-family: "Space Mono", monospace;
      font-size: 12px;
      font-weight: 500;
      opacity: 0.8;
      pointer-events: none;
    `;
    indicator.textContent = 'WordServe Active';
    
    // Only show on pages that aren't blacklisted
    if (!isBlacklisted(window.location.hostname)) {
      document.body.appendChild(indicator);
      
      // Remove after 2 seconds
      setTimeout(() => {
        indicator.remove();
      }, 2000);
    }
  },
});

function isBlacklisted(hostname: string): boolean {
  const defaultBlacklist = [
    'paypal.com',
    'stripe.com', 
    'checkout.com',
    'square.com',
    'braintreepayments.com',
    'authorize.net'
  ];
  
  return defaultBlacklist.some(domain => 
    hostname.includes(domain) || 
    hostname.includes('payment') || 
    hostname.includes('checkout') ||
    hostname.includes('billing') ||
    hostname.includes('bank')
  );
}
