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
          // Clear disconnect flag when user switches accounts in MetaMask
          localStorage.removeItem(DISCONNECT_FLAG_KEY);
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
      
      // Clear disconnect flag when explicitly connecting
      localStorage.removeItem(DISCONNECT_FLAG_KEY);
      
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts.length > 0) {
        setAddress(accounts[0].toLowerCase());
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    // Set flag to prevent auto-connect on next mount
    if (typeof window !== "undefined") {
      localStorage.setItem(DISCONNECT_FLAG_KEY, "1");
    }
  };

  return { address, isConnecting, error, connect, disconnect };
}
