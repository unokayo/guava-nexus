"use client";

import { useState, useEffect } from "react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const DISCONNECT_FLAG_KEY = "guava.walletDisconnected";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already connected on mount
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      // Check if user manually disconnected
      const userDisconnected = localStorage.getItem(DISCONNECT_FLAG_KEY) === "1";
      
      if (!userDisconnected) {
        // Auto-populate address from existing connection
        window.ethereum
          .request({ method: "eth_accounts" })
          .then((accounts: string[]) => {
            if (accounts.length > 0) {
              setAddress(accounts[0].toLowerCase());
            }
          })
          .catch(() => {
            // Silent fail on initial check
          });
      }

      // Listen for account changes
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0].toLowerCase());
          // CRITICAL: Only clear disconnect flag if user wasn't intentionally disconnected
          // Don't clear if it's just MetaMask re-announcing the same account
          const previousFlag = localStorage.getItem(DISCONNECT_FLAG_KEY);
          if (previousFlag !== "1") {
            // Only clear if user wasn't intentionally disconnected
            localStorage.removeItem(DISCONNECT_FLAG_KEY);
          }
        } else {
          setAddress(null);
        }
      };

      // Listen for chain changes (reload page to reset state)
      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum?.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  const connect = async () => {
    if (typeof window === "undefined" || typeof window.ethereum === "undefined") {
      setError("Please install MetaMask or another Web3 wallet");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      if (accounts.length > 0) {
        setAddress(accounts[0].toLowerCase());
        // Clear disconnect flag ONLY after successful connection
        localStorage.removeItem(DISCONNECT_FLAG_KEY);
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const switchAccount = async () => {
    if (typeof window === "undefined" || typeof window.ethereum === "undefined") {
      setError("Please install MetaMask or another Web3 wallet");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      
      // Request permissions to force account selection
      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (permErr: any) {
        // If permissions request fails, continue anyway
      }
      
      // Now request accounts (should show picker after permissions request)
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      if (accounts.length > 0) {
        setAddress(accounts[0].toLowerCase());
        // Clear disconnect flag ONLY after successful account switch
        localStorage.removeItem(DISCONNECT_FLAG_KEY);
      }
    } catch (err: any) {
      setError(err.message || "Failed to switch account");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    // Set flag to prevent auto-connect on next mount
    if (typeof window !== "undefined") {
      localStorage.setItem(DISCONNECT_FLAG_KEY, "1");
      
      // Best-effort: Try to revoke permissions (not all wallets support this)
      if (window.ethereum?.request) {
        window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        }).catch(() => {
          // Silently fail - this is optional
        });
      }
    }
  };

  return { address, isConnecting, error, connect, disconnect, switchAccount };
}
