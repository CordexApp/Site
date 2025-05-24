# Bonding Curve Liquidity Validation

## Overview

This feature prevents users from attempting to sell more service tokens than the bonding curve can mathematically handle or has CORDEX liquidity to pay for. The system calculates the maximum amount that can be sold without breaking the bonding curve's price mathematics and without exceeding available liquidity.

## Key Problem Solved

**Previous Issue**: Users were seeing transaction failures with "sell transaction failed or confirmation timed out" because the validation calculated unrealistic maximum sellable amounts that would cause the bonding curve's price formula to go negative, resulting in smart contract reverts.

**Root Cause**: When selling very large amounts of tokens, the linear bonding curve formula `P(x) = m*(initialSupply - x) + b` can produce negative prices, causing the contract to revert with "Calculation error: Negative price integral in sell".

**Solution**: The validation now respects the mathematical constraints of the bonding curve by testing for calculation failures and stopping before the price formula breaks down.

## Implementation Details

### Changes Made

1. **BondingCurveServices (`src/services/bondingCurveServices.ts`)**
   - Added `getAccumulatedFees()` function to fetch available CORDEX liquidity
   - **Fixed `getMaxSellableAmount()`** to respect bonding curve mathematical constraints
   - Uses adaptive upper bound testing to find realistic limits
   - Stops when `getSellPayoutEstimate` returns 0 or throws errors

2. **TokenTrading Component (`src/components/TokenTrading.tsx`)**
   - Updated props to include `accumulatedFees` and `maxSellableAmount`
   - Validation function `exceedsLiquidityLimit()` checks against mathematically valid limits
   - Updated error messages and UI displays to clarify the constraint
   - Display shows "total sellable until liquidity exhausted" with proper mathematical bounds

3. **useTokenDashboard Hook (`src/hooks/useTokenDashboard.ts`)**
   - Updated `BondingCurveInfo` interface to include accumulated fees and max sellable amount
   - Modified `refreshBondingCurveInfo()` to fetch liquidity data and calculate valid sellable limits
   - Added effect to recalculate when bonding curve state changes

4. **TokenDashboard Component (`src/components/TokenDashboard.tsx`)**
   - Updated props passed to TokenTrading component

### Validation Logic

The validation now works as follows:

```typescript
const exceedsLiquidityLimit = () => {
  if (!maxSellableAmount || !sellState.amount) return false;
  return Number(sellState.amount) > Number(maxSellableAmount);
};
```

The `maxSellableAmount` is calculated by finding the maximum token amount that:
1. **Doesn't break the bonding curve mathematics** (price stays positive)
2. **Doesn't exceed available liquidity** (`payout <= accumulatedFees`)
3. **Respects the curve's design constraints** (reasonable for the initialized token supply)

### User Experience

- **Liquidity Display**: Users see the available CORDEX liquidity in the bonding curve
- **Total Sellable Display**: Users see the total token amount that could be sold to exhaust all liquidity
- **Error Message**: Clear message when sell amount would exceed available liquidity
- **Button State**: Sell button is disabled when validation fails
- **Real-time Updates**: Limits recalculate when bonding curve liquidity changes

### Data Flow

1. `getAccumulatedFees()` fetches available CORDEX liquidity from bonding curve
2. `getMaxSellableAmount()` calculates total tokens that would drain all liquidity using binary search
3. User sees both available liquidity and the total theoretical sellable amount
4. Validation prevents sells that would exceed the liquidity-draining threshold
5. Limits update automatically when bonding curve state changes

## Benefits

- **Prevents Failed Transactions**: Users can't submit sells that would fail due to insufficient liquidity
- **Better User Experience**: Immediate feedback with clear liquidity constraints
- **Cost Savings**: Prevents users from paying gas fees for doomed transactions
- **Transparency**: Users see exactly how much CORDEX liquidity is available
- **Accurate Limits**: Shows personalized sell limits based on both balance and liquidity

## Technical Notes

- Uses bonding curve's `accumulatedFees` field (CORDEX liquidity available for payouts)
- Binary search algorithm finds maximum sellable amount with 0.001 token precision
- Validation is performed client-side for immediate feedback
- Smart contract still has final validation as safeguard
- Max sellable amount recalculates when user balance changes
- Displays show liquidity with 4 decimal places for clarity

## Key Features

### Liquidity-Based Validation
- Shows available CORDEX liquidity in the bonding curve
- Calculates maximum sellable tokens based on liquidity constraints
- Prevents sell attempts that would exceed available liquidity

### Service Provider Protection
- Correctly handles scenarios where service providers have allocated only a portion of their tokens to the bonding curve
- Uses binary search algorithm to find true maximum sellable amount regardless of user's total balance
- Prevents service providers from attempting to sell their entire balance when the bonding curve lacks sufficient liquidity

### Real-Time Updates
- Recalculates limits when user balance changes
- Updates liquidity information when bonding curve state changes
- Provides immediate feedback without requiring transaction attempts

## User Experience

### Before
- Users could enter any sell amount
- Transactions would fail with generic error messages
- No indication of available liquidity or limits

### After
- Users see available CORDEX liquidity
- Clear display of total theoretical sellable amount
- Sell button disabled when amount exceeds limits
- Informative error messages explaining constraints

## Technical Implementation

### Binary Search Algorithm
The `getMaxSellableAmount()` function uses binary search with mathematical constraint validation:

1. **Adaptive Upper Bound**: Starts with reasonable upper bound (10x user balance or 1M tokens) and tests if it works
2. **Mathematical Validation**: Tests each amount with `getSellPayoutEstimate` to detect when curve mathematics break down
3. **Error Handling**: When calculation returns 0 or throws errors, it reduces the search space
4. **Liquidity Constraint**: Ensures payout doesn't exceed available `accumulatedFees`
5. **Realistic Limits**: Produces sellable amounts that work within the bonding curve's design parameters

This approach prevents the "Calculation error: Negative price integral in sell" smart contract reverts that were causing transaction failures, while still providing accurate liquidity-based limits.

### Cache Management
- Bonding curve data is cached to reduce blockchain calls
- Cache is invalidated when user balance changes to ensure accurate max sellable calculations
- Fresh data is fetched when liquidity constraints might have changed 