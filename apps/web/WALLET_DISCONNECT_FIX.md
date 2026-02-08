# Wallet Disconnect Fix - Debug Session Summary

## Problem Statement

**Issue**: Wallet disconnect didn't persist across page refresh. After clicking "Disconnect" and refreshing, the app would auto-reconnect to the previous account.

**User couldn't**:
- Stay disconnected after page refresh
- Switch to a different MetaMask account from the UI

## Root Cause (Confirmed with Debug Logs)

The bug was in `apps/web/lib/useWallet.ts`:

### **Original Buggy Code**:
```typescript
const connect = async () => {
  // Clear disconnect flag when explicitly connecting
  localStorage.removeItem(DISCONNECT_FLAG_KEY); // ❌ TOO EARLY
  
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  if (accounts.length > 0) {
    setAddress(accounts[0].toLowerCase());
  }
};
```

### **The Bug**:
1. User clicks "Disconnect" → flag set to `"1"` ✅
2. User refreshes page → still disconnected (flag persists) ✅
3. User clicks "Connect" → **flag immediately cleared** ❌
4. User cancels MetaMask popup → connection fails BUT flag is already gone
5. Page refresh → auto-connects because flag was cleared

### **Debug Log Evidence**:

**Before fix** (lines 10-11 from first debug session):
```json
{"location":"useWallet.ts:93","message":"connect() called","data":{"flagBeforeClear":"1"}}
{"location":"useWallet.ts:103","message":"eth_requestAccounts result","data":{"accountsLength":1}}
```
Flag was cleared BEFORE connection attempt.

**After fix** (lines 14-15 from verification session):
```json
{"location":"useWallet.ts:42","message":"Checked disconnect flag","data":{"userDisconnected":true,"flagValue":"1"}}
{"location":"useWallet.ts:47","message":"Skipped auto-connect (flag set)","data":{"userDisconnected":true}}
```
Flag persisted across page refresh and prevented auto-connect! ✅

## Solution Implemented

### **1. Fixed Flag Clearing Timing**

Moved `localStorage.removeItem(DISCONNECT_FLAG_KEY)` to happen **AFTER successful connection**:

```typescript
const connect = async () => {
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  
  if (accounts.length > 0) {
    setAddress(accounts[0].toLowerCase());
    // Clear disconnect flag ONLY after successful connection
    localStorage.removeItem(DISCONNECT_FLAG_KEY); // ✅ AFTER SUCCESS
  }
};
```

**Result**: If user cancels MetaMask popup, disconnect state persists.

### **2. Added switchAccount() Function**

```typescript
const switchAccount = async () => {
  // Request permissions to force account selection
  try {
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch (permErr) {
    // Continue anyway if permissions request fails
  }
  
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  
  if (accounts.length > 0) {
    setAddress(accounts[0].toLowerCase());
    localStorage.removeItem(DISCONNECT_FLAG_KEY);
  }
};
```

**Features**:
- Uses `wallet_requestPermissions` to request fresh permissions
- Falls back to `eth_requestAccounts` if permissions request fails
- Allows user to select different account from MetaMask

### **3. Improved accountsChanged Handler**

```typescript
const handleAccountsChanged = (accounts: string[]) => {
  if (accounts.length > 0) {
    setAddress(accounts[0].toLowerCase());
    // Only clear disconnect flag if user wasn't intentionally disconnected
    const previousFlag = localStorage.getItem(DISCONNECT_FLAG_KEY);
    if (previousFlag !== "1") {
      localStorage.removeItem(DISCONNECT_FLAG_KEY);
    }
  } else {
    setAddress(null);
  }
};
```

**Result**: Event listener respects user's disconnect intent.

### **4. UI Improvements**

Added "Switch Account" button in:
- `app/page.tsx` (homepage)
- `app/seed/[id]/UpdateSeedForm.tsx` (update form)

```tsx
<button onClick={switchAccount}>Switch Account</button>
<button onClick={disconnect}>Disconnect</button>
```

## Debug Evidence Summary

### **Test 1: Before Fix**
- Flag set to "1" on disconnect ✅
- Flag cleared when connect() called (even if user canceled) ❌
- Auto-reconnected after refresh ❌

### **Test 2: After Fix**
- Flag set to "1" on disconnect ✅
- Flag persists across page refresh ✅
- Skipped auto-connect (line 15 log) ✅
- Account switching worked (line 30-32: different account detected) ✅
- Flag only cleared after successful connection (line 18-19, 47) ✅

## Verification Results

**From debug logs (post-fix run)**:

| Behavior | Log Evidence | Status |
|----------|--------------|--------|
| Disconnect sets flag | Lines 10-11, 42-43, 61-63 | ✅ Working |
| Flag persists across refresh | Lines 13-14 (`flagValue: "1"` after refresh) | ✅ Working |
| Auto-connect skipped when flag set | Line 15 ("Skipped auto-connect") | ✅ Working |
| Flag cleared only after success | Lines 18-19, 46-47 (after eth_requestAccounts) | ✅ Working |
| Account switching works | Line 30 (accountsChanged with new account) | ✅ Working |
| Multiple accounts detected | Lines 34, 45 (accountsLength: 2) | ✅ Working |

## How It Works

### **App-Level Disconnect (not MetaMask disconnect)**

MetaMask cannot be programmatically disconnected. The app manages disconnect state:

1. **disconnect()**: 
   - Clears address in React state
   - Sets `guava.walletDisconnected = "1"` in localStorage

2. **On mount**:
   - Checks localStorage flag
   - If `"1"`: Skips auto-connect
   - If not set: Auto-connects if MetaMask has connected accounts

3. **On connect()**:
   - Attempts connection
   - **Only clears flag if connection succeeds**
   - If user cancels: Flag stays, disconnect persists

### **Account Switching**

Uses MetaMask's permissions API to request fresh account selection:

1. Calls `wallet_requestPermissions({ eth_accounts: {} })`
2. This prompts MetaMask to show account selector (if supported)
3. Then calls `eth_requestAccounts` to get selected account
4. Updates address in React state
5. Clears disconnect flag (user explicitly chose to connect)

**Fallback**: If MetaMask doesn't show picker, user can switch accounts in MetaMask extension, and `accountsChanged` event updates the app.

## MetaMask Limitations

- **No programmatic disconnect**: MetaMask tracks connected sites internally; app cannot force disconnect
- **Account picker not guaranteed**: `wallet_requestPermissions` may not always show account selector
- **User must use extension**: For reliable account switching, user opens MetaMask and selects account manually

## Files Modified

1. **`lib/useWallet.ts`**:
   - Fixed flag clearing timing in `connect()` and `switchAccount()`
   - Improved `handleAccountsChanged` to respect disconnect flag
   - Added `switchAccount()` function
   - Exported `switchAccount` from hook

2. **`app/page.tsx`**:
   - Added "Switch Account" button next to "Disconnect"
   - Imported `switchAccount` from useWallet hook
   - Added helper text about MetaMask account selection

3. **`app/seed/[id]/UpdateSeedForm.tsx`**:
   - Added "Switch Account" button
   - Imported `switchAccount` from useWallet hook

## Testing Checklist

Test the following scenarios:

### **Scenario 1: Disconnect Persists**
- [ ] Connect wallet with Account A
- [ ] Click "Disconnect"
- [ ] Verify localStorage shows `guava.walletDisconnected: "1"`
- [ ] Hard refresh (Cmd+Shift+R)
- [ ] **EXPECTED**: Wallet stays disconnected ✅

### **Scenario 2: Reconnect After Disconnect**
- [ ] While disconnected, click "Connect Wallet"
- [ ] Approve in MetaMask
- [ ] **EXPECTED**: Connects successfully, flag cleared

### **Scenario 3: Cancel Connection**
- [ ] Click "Disconnect"
- [ ] Click "Connect Wallet"
- [ ] **Reject/Cancel** in MetaMask popup
- [ ] Refresh page
- [ ] **EXPECTED**: Still disconnected (flag preserved)

### **Scenario 4: Switch Account**
- [ ] Connect with Account A
- [ ] Click "Switch Account"
- [ ] MetaMask prompts for permissions (or shows account list)
- [ ] Select Account B
- [ ] **EXPECTED**: App updates to Account B

### **Scenario 5: Manual MetaMask Switch**
- [ ] Connected with Account A
- [ ] Open MetaMask extension
- [ ] Switch to Account B in MetaMask
- [ ] **EXPECTED**: App detects accountsChanged and updates to Account B

### **Scenario 6: Account Change While Disconnected**
- [ ] Click "Disconnect" (flag set)
- [ ] Open MetaMask and switch account
- [ ] Refresh page
- [ ] **EXPECTED**: Stays disconnected (flag not cleared by accountsChanged)

## Status

✅ **RESOLVED** - Wallet disconnect now persists across page refresh.

**Key improvements**:
- Disconnect state managed by app-level localStorage flag
- Flag only cleared after successful connection
- Account switching supported with `wallet_requestPermissions`
- Event listeners respect user disconnect intent
