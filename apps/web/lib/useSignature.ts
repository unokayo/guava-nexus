"use client";

import { useState } from "react";
import { generateSigningMessage, type SignaturePayload } from "./auth";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export type SignedData = {
  address: string;
  signature: string;
  nonce: string;
  timestamp: number;
};

export function useSignature() {
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestSignature = async (
    address: string,
    action: string,
    seed_id?: number
  ): Promise<SignedData | null> => {
    if (typeof window === "undefined" || typeof window.ethereum === "undefined") {
      setError("Please install MetaMask or another Web3 wallet");
      return null;
    }

    try {
      setIsSigning(true);
      setError(null);

      // Get nonce from server
      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      if (!nonceRes.ok) {
        throw new Error("Failed to get nonce");
      }

      const { nonce } = await nonceRes.json();
      const timestamp = Date.now();

      // Generate message
      const payload: SignaturePayload = { address, nonce, timestamp, action, seed_id };
      const message = generateSigningMessage(payload);

      // Request signature
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });

      return { address, signature, nonce, timestamp };
    } catch (err: any) {
      const errorMessage = err.message || "Failed to sign message";
      setError(errorMessage);
      return null;
    } finally {
      setIsSigning(false);
    }
  };

  return { requestSignature, isSigning, error };
}
