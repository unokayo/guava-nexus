"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/useWallet";
import { useSignature } from "@/lib/useSignature";

type Props = {
  seedId: number;
  authorAddress: string | null;
};

export function RequestHashRootForm({ seedId, authorAddress }: Props) {
  const router = useRouter();
  const { address, isConnecting, error: walletError, connect, disconnect, switchAccount } = useWallet();
  const { requestSignature, isSigning, error: signError } = useSignature();
  
  const [hashnameHandle, setHashnameHandle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if connected wallet is the author
  const isAuthor = address && authorAddress && address.toLowerCase() === authorAddress.toLowerCase();
  const canRequest = authorAddress !== null && isAuthor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!isAuthor) {
      setError("Only the Seed author can request HashRoot attachment");
      return;
    }

    const trimmedHandle = hashnameHandle.trim();
    if (!trimmedHandle) {
      setError("HashName handle is required");
      return;
    }

    try {
      setIsSubmitting(true);

      // Request signature
      const signedData = await requestSignature(address, "request_hashroot", seedId);
      if (!signedData) {
        setError(signError || "Failed to sign message. Please try again.");
        return;
      }

      const res = await fetch("/api/hashroots/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed_id: seedId,
          hashname_handle: trimmedHandle,
          address: signedData.address,
          signature: signedData.signature,
          nonce: signedData.nonce,
          timestamp: signedData.timestamp,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to submit request");
      }

      // Check response status
      if (result.status === "already_approved") {
        setSuccess(`HashRoot ${result.hashname_handle} is already approved for this Seed`);
      } else if (result.status === "pending") {
        setSuccess(`Request submitted for ${result.hashname_handle}`);
      } else {
        setSuccess(`Request submitted successfully`);
      }
      
      setHashnameHandle("");
      
      // Refresh the page to show the pending request
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Legacy seed - no author
  if (authorAddress === null) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Request HashRoot Attachment
          </label>
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Legacy seed has no author; cannot request HashRoot.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Request HashRoot Attachment
        </label>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
          Request to attach this Seed to a HashName identity namespace. The HashName owner must approve.
        </p>

        {/* Wallet Connection */}
        <div className="mb-3 rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
          {!address ? (
            <div>
              <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-400">
                Connect your wallet to request HashRoot attachment
              </p>
              <button
                type="button"
                onClick={connect}
                disabled={isConnecting}
                className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
              {walletError && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">{walletError}</p>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  <p>Connected: <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span></p>
                  {!isAuthor && (
                    <p className="mt-1 text-amber-600 dark:text-amber-500">
                      Only the Seed author can request HashRoot attachment
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={switchAccount}
                    disabled={isConnecting}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                  >
                    Switch
                  </button>
                  <button
                    type="button"
                    onClick={disconnect}
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                App-level disconnect. To fully disconnect: MetaMask → Connected Sites.
              </p>
            </div>
          )}
        </div>

        {canRequest && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input
                id="hashnameHandle"
                type="text"
                value={hashnameHandle}
                onChange={(e) => {
                  setHashnameHandle(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., #tamadxyz or tamadxyz"
                disabled={isSubmitting || isSigning}
                className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                aria-label="HashName handle"
              />
              <button
                type="submit"
                disabled={isSubmitting || isSigning || !hashnameHandle.trim()}
                className="rounded border border-zinc-800 bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-300 disabled:text-zinc-500 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
              >
                {isSigning ? "Signing..." : isSubmitting ? "Submitting..." : "Request attachment"}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-xs text-green-600 dark:text-green-400">
                {success}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
