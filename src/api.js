const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN;
const PUBLIC_API_KEY = import.meta.env.VITE_PUBLIC_API_KEY;

// Always use proxy paths - Vite handles it in dev, Express server in prod
const BAGS_API_BASE = '/api/bags';
const PUBLIC_API_BASE = '/api/public';

export async function fetchTopTokens() {
  const response = await fetch(`${BAGS_API_BASE}/token-launch/top-tokens/lifetime-fees`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tokens: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error('API returned unsuccessful response');
  }
  
  return data.response;
}

export async function fetchClaimStats(tokenMint) {
  const response = await fetch(`${PUBLIC_API_BASE}/token-launch/claim-stats?tokenMint=${tokenMint}`, {
    headers: {
      'x-api-key': PUBLIC_API_KEY,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch claim stats: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error('API returned unsuccessful response');
  }
  
  return data.response;
}

export async function fetchAllClaimStats(tokens) {
  const results = await Promise.allSettled(
    tokens.map(token => fetchClaimStats(token.token))
  );
  
  const claimStatsMap = {};
  
  results.forEach((result, index) => {
    const tokenMint = tokens[index].token;
    if (result.status === 'fulfilled') {
      claimStatsMap[tokenMint] = result.value;
    } else {
      claimStatsMap[tokenMint] = null;
    }
  });
  
  return claimStatsMap;
}

// Helper to format SOL amounts (values are in lamports * 10^9)
export function formatSolAmount(amountStr, decimals = 9) {
  if (!amountStr) return '0';
  const amount = BigInt(amountStr);
  const divisor = BigInt(10 ** decimals);
  const sol = Number(amount) / Number(divisor);
  return sol.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 4 
  });
}

export function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

