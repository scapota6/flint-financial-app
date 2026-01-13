import { apiRequest } from "./queryClient";

export interface SnapTradeAccount {
  id: string;
  name: string;
  type: string;
  institution: string;
  balance: number;
  currency: string;
  connection_id: string;
  canTrade?: boolean;
}

export interface SnapTradeHolding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  market_value: number;
  type: string;
  account_id: string;
  canTrade?: boolean;
}

export interface SnapTradeQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
}

export interface SnapTradeOrder {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  order_type: 'MARKET' | 'LIMIT';
  status: string;
  account_id: string;
}

export class SnapTradeAPI {
  static async getConnectionUrl(): Promise<{ url: string }> {
    // Get authenticated user data first
    const userResp = await apiRequest("/api/auth/user");
    if (!userResp.ok) throw new Error("Authentication required");
    const userData = await userResp.json();
    
    // Use stable userId (user.id is the stable internal identifier)
    const userId = userData.id;
    if (!userId) throw new Error("User ID not available");

    const response = await apiRequest("/api/connections/snaptrade/register", {
      method: "POST",
      body: { userId },
    });
    
    const data = await response.json();
    return data.connect || data;
  }

  static async getAccounts(): Promise<SnapTradeAccount[]> {
    // Get authenticated user data first for user ID
    const userResp = await apiRequest("/api/auth/user");
    if (!userResp.ok) throw new Error("Authentication required");
    const userData = await userResp.json();
    
    const response = await apiRequest("/api/holdings", {
      headers: {
        "x-user-id": userData.id
      }
    });
    const data = await response.json();
    return data.accounts || [];
  }

  static async getHoldings(accountId?: string): Promise<SnapTradeHolding[]> {
    // Get authenticated user data first for user ID
    const userResp = await apiRequest("/api/auth/user");
    if (!userResp.ok) throw new Error("Authentication required");
    const userData = await userResp.json();
    
    const url = accountId ? `/api/holdings?accountId=${accountId}` : "/api/holdings";
    const response = await apiRequest(url, {
      headers: {
        "x-user-id": userData.id
      }
    });
    return response.json();
  }

  static async getSnapTradeAccounts(): Promise<SnapTradeAccount[]> {
    try {
      const response = await apiRequest("/api/snaptrade/accounts");
      if (!response.ok) return [];
      const data = await response.json();
      return (data.accounts || []).map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        type: acc.accountType || acc.type || 'investment',
        institution: acc.institutionName,
        balance: acc.balance?.amount || 0,
        currency: acc.currency || 'USD',
        connection_id: acc.brokerageAuthId,
        canTrade: acc.canTrade ?? false
      }));
    } catch (err) {
      console.error('Failed to get SnapTrade accounts:', err);
      return [];
    }
  }

  static async getAllHoldings(): Promise<SnapTradeHolding[]> {
    try {
      // Get all accounts first (with canTrade info)
      const snaptradeAccounts = await this.getSnapTradeAccounts();
      const accounts = await this.getAccounts();
      
      // Create a map of accountId -> canTrade
      const canTradeMap = new Map<string, boolean>();
      for (const acc of snaptradeAccounts) {
        canTradeMap.set(acc.id, acc.canTrade ?? false);
      }
      
      if (!accounts.length) {
        return []; // No accounts, return empty holdings
      }

      // Get holdings for each account
      const allHoldings: SnapTradeHolding[] = [];
      for (const account of accounts) {
        try {
          const holdings = await this.getHoldings(account.id);
          // Add canTrade to each holding based on its account
          const holdingsWithTrade = holdings.map(h => ({
            ...h,
            canTrade: canTradeMap.get(h.account_id) ?? false
          }));
          allHoldings.push(...holdingsWithTrade);
        } catch (err) {
          console.warn(`Failed to get holdings for account ${account.id}:`, err);
          // Continue with other accounts
        }
      }
      
      return allHoldings;
    } catch (err) {
      console.error('Failed to get all holdings:', err);
      return []; // Return empty array instead of throwing
    }
  }

  static async searchSymbols(query: string): Promise<SnapTradeQuote[]> {
    const response = await apiRequest(`/api/snaptrade/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    // Normalize the symbol data to ensure consistent structure
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        ...item,
        symbol: typeof item.symbol === 'string' ? item.symbol : (item.symbol?.symbol || item.symbol?.raw_symbol || query.toUpperCase()),
        name: item.name || (typeof item.symbol === 'object' ? item.symbol.description : `${query.toUpperCase()} Inc.`),
        price: item.price || 0,
        change: item.change || 0,
        changePercent: item.changePercent || 0
      }));
    }
    
    return data || [];
  }

  static async getQuote(symbol: string): Promise<SnapTradeQuote> {
    const response = await apiRequest(`/api/snaptrade/quote/${symbol}`);
    return response.json();
  }

  static async placeOrder(orderData: {
    accountId: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price?: number;
    orderType: 'MARKET' | 'LIMIT';
  }): Promise<SnapTradeOrder> {
    const response = await apiRequest("/api/snaptrade/orders", {
      method: "POST",
      body: orderData
    });
    return response.json();
  }

  static async getOrders(accountId?: string): Promise<SnapTradeOrder[]> {
    const url = accountId ? `/api/snaptrade/orders/${accountId}` : "/api/snaptrade/orders";
    const response = await apiRequest(url);
    return response.json();
  }

  static async disconnectAccount(accountId: string) {
    const response = await apiRequest(`/api/snaptrade/accounts/${accountId}`, {
      method: "DELETE"
    });
    return response.json();
  }
}