# Liquidity Validation Test Plan

## Overview

This document outlines how to test the new bonding curve liquidity validation feature that prevents users from selling more tokens than the bonding curve has CORDEX liquidity to pay for.

## Test Scenarios

### Scenario 1: New Bonding Curve with Minimal Liquidity

**Setup:**
1. Create a new service with bonding curve
2. Initial state: bonding curve has some tokens but minimal CORDEX liquidity
3. User has service tokens from launch

**Expected Behavior:**
- Available liquidity shows small CORDEX amount (depends on initial purchases)
- Max sellable amount shows limit based on available liquidity
- Attempting to sell beyond limit shows error message
- Sell button is disabled when amount exceeds limit

**Test Steps:**
1. Navigate to a newly created service's token dashboard
2. Check that "available liquidity" is displayed
3. Check that "max sellable" amount is displayed
4. Switch to "sell tokens" tab
5. Enter an amount larger than max sellable
6. Verify error message appears: "sell amount exceeds maximum sellable due to liquidity constraints"
7. Verify sell button is disabled

### Scenario 2: Established Bonding Curve with High Liquidity

**Setup:**
1. Navigate to a service with established trading activity
2. Bonding curve should have substantial CORDEX liquidity from trading fees

**Expected Behavior:**
- Available liquidity shows higher CORDEX amount
- Max sellable amount is constrained by user balance, not liquidity
- User can sell up to their full balance (if liquidity supports it)

### Scenario 3: Real-time Updates

**Setup:**
1. Have two browser windows open on same service
2. One user makes a large purchase (adding liquidity)
3. Another user refreshes or waits for real-time updates

**Expected Behavior:**
- Liquidity amount updates after purchase
- Max sellable amount updates automatically
- Validation limits adjust in real-time

## Visual Verification Points

### UI Elements to Check:
1. **Liquidity Display**: "available liquidity: X.XXXX CORDEX"
2. **Limit Display**: "max sellable: X.XXXX [TOKEN_SYMBOL]"
3. **Error Message**: Clear, descriptive error when limit exceeded
4. **Button State**: Disabled when validation fails
5. **Real-time Updates**: Values change after trades

### Error Message Verification:
- Old message: "sell amount exceeds bonding curve supply"
- New message: "sell amount exceeds maximum sellable due to liquidity constraints"

## Technical Verification

### Network Calls to Monitor:
1. `accumulatedFees` contract call
2. `calculateSellPayout` contract calls during binary search
3. Real-time balance updates

### Console Logs to Check:
- "[refreshBondingCurveInfo] Fees retrieved: ..."
- "[refreshBondingCurveInfo] Max sellable amount calculated: ..."
- "[useTokenDashboard] Token balance changed, recalculating max sellable amount"

## Edge Cases to Test

1. **Zero Liquidity**: Bonding curve with no accumulated fees
2. **User with No Tokens**: User balance is zero
3. **Very Small Amounts**: Test precision of binary search
4. **Network Errors**: Handle failed contract calls gracefully
5. **Rapid Trading**: Multiple trades happening quickly

## Success Criteria

✅ Liquidity validation prevents failed transactions
✅ User sees clear liquidity constraints
✅ Max sellable amount calculated accurately
✅ Real-time updates work correctly
✅ Error messages are clear and helpful
✅ UI is responsive and informative

## Implementation Notes

- Binary search finds max sellable with 0.001 token precision
- Validation checks: `getSellPayoutEstimate(amount) <= accumulatedFees`
- Updates trigger on balance changes and trade events
- Client-side validation with server-side safeguards 