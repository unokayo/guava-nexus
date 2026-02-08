"use client";

import { useWallet } from "@/lib/useWallet";

type WalletBarProps = {
  variant?: "default" | "compact";
};

export function WalletBar({ variant = "default" }: WalletBarProps) {
  const { address, isConnecting, error, connect, disconnect, switchAccount } = useWallet();

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        {!address ? (
          <button
            type="button"
            onClick={connect}
            disabled={isConnecting}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <>
            <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
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
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
      {!address ? (
        <div>
          <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
            Connect your wallet to interact with Seeds and HashNames
          </p>
          <button
            type="button"
            onClick={connect}
            disabled={isConnecting}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
          {error && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">{error}</p>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Connected: <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={switchAccount}
                disabled={isConnecting}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
              >
                Switch Account
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
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Disconnect clears Guava Nexus only. To fully disconnect, open MetaMask → Connected Sites → Remove this site.
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
            Switch Account may require selecting an account in MetaMask extension.
          </p>
        </div>
      )}
    </div>
  );
}
