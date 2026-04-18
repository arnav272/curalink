// Simple delay utility for API rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async (fn, retries = 3, delayMs = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      const is429 = error.response?.status === 429 || 
                    error.message?.includes('429');
      if (is429 && i < retries - 1) {
        console.log(`Rate limited. Waiting ${delayMs}ms before retry ${i + 1}...`);
        await delay(delayMs * (i + 1)); // exponential backoff
      } else {
        throw error;
      }
    }
  }
};

module.exports = { delay, withRetry };