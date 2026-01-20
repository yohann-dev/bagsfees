import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  fetchTopTokens, 
  fetchAllClaimStats, 
  formatSolAmount, 
  formatUSD, 
  shortenAddress 
} from './api';

function App() {
  const [tokens, setTokens] = useState([]);
  const [claimStats, setClaimStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'lifetimeFees', direction: 'desc' });
  const [copiedAddress, setCopiedAddress] = useState(null);

  const MAX_FDV = 30000; // Only show tokens with FDV <= $30k

  const handleCopyAddress = (address) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 1500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch top tokens and filter by FDV
      const tokensData = await fetchTopTokens();
      const filteredTokens = tokensData.filter(token => {
        const fdv = token.tokenInfo?.fdv || 0;
        return fdv <= MAX_FDV;
      });
      setTokens(filteredTokens);
      
      // Fetch claim stats only for filtered tokens
      setLoadingClaims(true);
      const stats = await fetchAllClaimStats(filteredTokens);
      setClaimStats(stats);
      setLoadingClaims(false);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate totals
  const calculateTotals = () => {
    let totalLifetimeFees = BigInt(0);
    let totalClaimed = BigInt(0);
    
    tokens.forEach(token => {
      totalLifetimeFees += BigInt(token.lifetimeFees || 0);
      
      const stats = claimStats[token.token];
      if (stats) {
        stats.forEach(s => {
          totalClaimed += BigInt(s.totalClaimed || 0);
        });
      }
      
      // Also add from creators
      token.creators?.forEach(creator => {
        if (creator.totalClaimed) {
          // Already counted in claim stats, skip
        }
      });
    });
    
    const totalUnclaimed = totalLifetimeFees - totalClaimed;
    
    return {
      totalLifetimeFees: formatSolAmount(totalLifetimeFees.toString()),
      totalClaimed: formatSolAmount(totalClaimed.toString()),
      totalUnclaimed: formatSolAmount(totalUnclaimed > 0 ? totalUnclaimed.toString() : '0'),
      tokenCount: tokens.length,
    };
  };

  const getClaimedForToken = (token) => {
    let claimed = BigInt(0);
    const stats = claimStats[token.token];
    if (stats) {
      stats.forEach(s => {
        claimed += BigInt(s.totalClaimed || 0);
      });
    }
    
    // Also check creators for claimed amounts
    token.creators?.forEach(creator => {
      if (creator.totalClaimed && !stats) {
        claimed += BigInt(creator.totalClaimed);
      }
    });
    
    return claimed;
  };

  const getUnclaimedForToken = (token) => {
    const lifetimeFees = BigInt(token.lifetimeFees || 0);
    const claimed = getClaimedForToken(token);
    const unclaimed = lifetimeFees - claimed;
    return unclaimed > 0 ? unclaimed : BigInt(0);
  };

  const getClaimedPercentage = (token) => {
    const lifetimeFees = BigInt(token.lifetimeFees || 0);
    if (lifetimeFees === BigInt(0)) return 0;
    const claimed = getClaimedForToken(token);
    return Number(claimed * BigInt(10000) / lifetimeFees) / 100;
  };

  // Sorting logic
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const sortedTokens = useMemo(() => {
    if (!tokens.length) return [];
    
    return [...tokens].sort((a, b) => {
      let aVal, bVal;
      
      switch (sortConfig.key) {
        case 'name':
          aVal = a.tokenInfo?.name?.toLowerCase() || '';
          bVal = b.tokenInfo?.name?.toLowerCase() || '';
          break;
        case 'price':
          aVal = a.tokenInfo?.usdPrice || 0;
          bVal = b.tokenInfo?.usdPrice || 0;
          break;
        case 'fdv':
          aVal = a.tokenInfo?.fdv || 0;
          bVal = b.tokenInfo?.fdv || 0;
          break;
        case 'lifetimeFees':
          aVal = BigInt(a.lifetimeFees || 0);
          bVal = BigInt(b.lifetimeFees || 0);
          if (aVal < bVal) return sortConfig.direction === 'desc' ? 1 : -1;
          if (aVal > bVal) return sortConfig.direction === 'desc' ? -1 : 1;
          return 0;
        case 'claimed':
          aVal = getClaimedPercentage(a);
          bVal = getClaimedPercentage(b);
          break;
        case 'claimedPct':
          aVal = getClaimedPercentage(a);
          bVal = getClaimedPercentage(b);
          break;
        case 'unclaimed':
          aVal = 100 - getClaimedPercentage(a);
          bVal = 100 - getClaimedPercentage(b);
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortConfig.direction === 'desc' ? 1 : -1;
      if (aVal > bVal) return sortConfig.direction === 'desc' ? -1 : 1;
      return 0;
    });
  }, [tokens, claimStats, sortConfig]);

  const totals = !loading ? calculateTotals() : null;

  if (loading) {
    return (
      <div className="app">
        <div className="container">
          <div className="header">
            <h1>Bags Fees Tracker</h1>
            <p className="subtitle">Tracking unclaimed fees on Bags memecoin launchpad</p>
            <p className="filter-info">Showing tokens with FDV ≤ $30k</p>
            <p className="bags-logo">◈ BAGS.FM</p>
          </div>
          <div className="loading">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading tokens...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="container">
          <div className="header">
            <h1>Bags Fees Tracker</h1>
            <p className="subtitle">Tracking unclaimed fees on Bags memecoin launchpad</p>
          </div>
          <div className="error">
            <p>Error: {error}</p>
            <button className="refresh-btn" onClick={loadData} style={{ marginTop: '1rem' }}>
              ↻ Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h1>Bags Fees Tracker</h1>
          <p className="subtitle">Tracking unclaimed fees on Bags memecoin launchpad</p>
          <p className="filter-info">Showing tokens with FDV ≤ $30k</p>
          <p className="bags-logo">◈ BAGS.FM</p>
          <div className="header-actions">
            <button 
              className="refresh-btn" 
              onClick={loadData} 
              disabled={loading || loadingClaims}
            >
              ↻ Refresh Data
            </button>
          </div>
        </div>

        <div className="stats-summary">
          <div className="stat-card">
            <div className="label">Total Tokens</div>
            <div className="value secondary">{totals.tokenCount}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Lifetime Fees</div>
            <div className="value">{totals.totalLifetimeFees} SOL</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Claimed</div>
            <div className="value secondary">{totals.totalClaimed} SOL</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Unclaimed</div>
            <div className="value pulse">{totals.totalUnclaimed} SOL</div>
          </div>
        </div>

        <div className="tokens-grid">
          <div className="header-row">
            <span></span>
            <span 
              className={`sortable ${sortConfig.key === 'name' ? 'active' : ''}`}
              onClick={() => handleSort('name')}
            >
              Token {sortConfig.key === 'name' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </span>
            <span 
              className={`sortable ${sortConfig.key === 'price' ? 'active' : ''}`}
              onClick={() => handleSort('price')}
            >
              Price / FDV {sortConfig.key === 'price' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </span>
            <span 
              className={`sortable ${sortConfig.key === 'lifetimeFees' ? 'active' : ''}`}
              onClick={() => handleSort('lifetimeFees')}
            >
              Lifetime Fees {sortConfig.key === 'lifetimeFees' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </span>
            <span 
              className={`sortable ${sortConfig.key === 'claimed' ? 'active' : ''}`}
              onClick={() => handleSort('claimed')}
            >
              Claimed {sortConfig.key === 'claimed' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </span>
            <span 
              className={`sortable ${sortConfig.key === 'unclaimed' ? 'active' : ''}`}
              onClick={() => handleSort('unclaimed')}
            >
              Unclaimed {sortConfig.key === 'unclaimed' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </span>
          </div>

          {sortedTokens.map((token, index) => {
            const unclaimed = getUnclaimedForToken(token);
            const totalClaimedForToken = getClaimedForToken(token);
            const claimedPct = getClaimedPercentage(token);
            
            return (
              <div 
                key={token.token} 
                className="token-row"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <img 
                  src={token.tokenInfo?.icon || '/placeholder.png'} 
                  alt={token.tokenInfo?.name}
                  className="token-icon"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23222" width="100" height="100"/><text x="50" y="55" font-size="40" text-anchor="middle" fill="%2300ff88">◈</text></svg>';
                  }}
                />
                
                <div className="token-info">
                  <span className="token-name">{token.tokenInfo?.name || 'Unknown'}</span>
                  <span className="token-symbol">${token.tokenInfo?.symbol || '???'}</span>
                  <div className="token-address-row">
                    <span className="token-address">{shortenAddress(token.token)}</span>
                    <button 
                      className={`copy-btn ${copiedAddress === token.token ? 'copied' : ''}`}
                      onClick={() => handleCopyAddress(token.token)}
                      title="Copy address"
                    >
                      {copiedAddress === token.token ? '✓' : '📋'}
                    </button>
                    <a 
                      href={`https://bags.fm/${token.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bags-link"
                      title="Open on Bags.fm"
                    >
                      ↗
                    </a>
                  </div>
                </div>
                
                <div className="data-cell">
                  <div className="label">Price / FDV</div>
                  <div className="value white">
                    ${token.tokenInfo?.usdPrice?.toFixed(6) || '0.00'}
                  </div>
                  <div className="subvalue">
                    {formatUSD(token.tokenInfo?.fdv || 0)}
                  </div>
                </div>
                
                <div className="data-cell">
                  <div className="label">Lifetime Fees</div>
                  <div className="value dim">
                    {formatSolAmount(token.lifetimeFees)} SOL
                  </div>
                </div>
                
                <div className="data-cell">
                  <div className="label">Claimed</div>
                  <div className={`value ${claimedPct >= 90 ? 'green' : claimedPct >= 50 ? 'orange' : 'dim'}`}>
                    {loadingClaims ? '...' : `${claimedPct.toFixed(1)}%`}
                  </div>
                  <div className="subvalue">
                    {loadingClaims ? '...' : `${formatSolAmount(totalClaimedForToken.toString())} SOL`}
                  </div>
                </div>
                
                <div className="data-cell unclaimed-highlight">
                  <div className="label">Unclaimed</div>
                  <div className={`value ${(100 - claimedPct) >= 50 ? 'green' : (100 - claimedPct) >= 10 ? 'orange' : 'dim'}`}>
                    {loadingClaims ? '...' : `${(100 - claimedPct).toFixed(1)}%`}
                  </div>
                  <div className="subvalue">
                    {loadingClaims ? '...' : `${formatSolAmount(unclaimed.toString())} SOL`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;

