import { HealStackPlugin, HealStackCore } from '@healstack/core';

export const AnalyticsModule: HealStackPlugin = {
  name: 'ProductAnalytics',
  setup: (core: HealStackCore) => {
    
    // 1. Auto-capture Page Views (Hooking into History API for SPAs)
    let lastUrl = window.location.href;
    new MutationObserver(() => {
      const url = window.location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        core.dispatch('page_view', { url, timestamp: Date.now() });
      }
    }).observe(document, { subtree: true, childList: true });

    // 2. Auto-capture Button Clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('button') || target.closest('a');
      
      if (button) {
        core.dispatch('user_interaction', {
          interaction_type: button.tagName.toLowerCase(),
          id: button.id,
          classes: button.className,
          text: button.innerText.trim(),
          url: window.location.href
        });
      }
    }, { capture: true }); // Use capture phase to ensure we catch it before propagation stops
  }
};