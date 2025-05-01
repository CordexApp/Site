export const BondingCurveAbi = [
  // --- View Functions & Public Variables ---
  {
    inputs: [],
    name: "provider",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "providerTokenAddress",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "cordexTokenAddress",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "m", // slope
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "b", // intercept
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokenSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "accumulatedFees",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalVolumeTraded",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_amount", type: "uint256" }],
    name: "calculatePrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCurrentPrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_tokenAmount", type: "uint256" }],
    name: "calculateSellPayout",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },

  // --- Write Functions ---
  {
    inputs: [
      { name: "_provider", type: "address" },
      { name: "_providerTokenAddress", type: "address" },
      { name: "_cordexTokenAddress", type: "address" },
      { name: "_initialTokenAmount", type: "uint256" },
      { name: "_slope", type: "uint256" },
      { name: "_intercept", type: "uint256" },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_tokenAmount", type: "uint256" }],
    name: "buyTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_tokenAmount", type: "uint256" }],
    name: "sellTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // --- Events ---
  {
    type: "event",
    name: "TokensPurchased",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "cost", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TokensSold",
    inputs: [
      { name: "seller", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "payout", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FeesWithdrawn",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "BondingCurveInitialized",
    inputs: [
      { name: "provider", type: "address", indexed: false },
      { name: "providerToken", type: "address", indexed: false },
      { name: "cordexToken", type: "address", indexed: false },
      { name: "initialTokens", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TradeActivity",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "isBuy", type: "bool", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
      { name: "tokenAmount", type: "uint256", indexed: false },
      { name: "pricePerToken", type: "uint256", indexed: false },
      { name: "totalVolume", type: "uint256", indexed: false },
      { name: "poolLiquidity", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;
