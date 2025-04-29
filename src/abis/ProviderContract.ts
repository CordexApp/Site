export const ProviderContractAbi = [
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
    name: "tokenAddress",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "apiEndpoint",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxEscrow",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isActive",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TOKEN_EXPIRY",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "transactionCounter",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "bytes32" }],
    name: "requestTokens",
    outputs: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "expiryTime", type: "uint256" },
      { name: "isActive", type: "bool" },
      { name: "transactionId", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenHash", type: "bytes32" }],
    name: "isTokenValid",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },

  // --- Write Functions ---
  {
    inputs: [
      { name: "_provider", type: "address" },
      { name: "_tokenAddress", type: "address" },
      { name: "_apiEndpoint", type: "string" },
      { name: "_maxEscrow", type: "uint256" },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "userNonce", type: "uint256" },
    ],
    name: "generateToken",
    outputs: [{ name: "tokenHash", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "tokenHash", type: "bytes32" },
      { name: "amountToClaim", type: "uint256" },
    ],
    name: "claimToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tokenHash", type: "bytes32" }],
    name: "refundExpiredToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_isActive", type: "bool" }],
    name: "setContractStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_apiEndpoint", type: "string" }],
    name: "updateApiEndpoint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // --- Events ---
  {
    type: "event",
    name: "TokenGenerated",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "expiryTime", type: "uint256", indexed: false },
      { name: "transactionId", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TokenClaimed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amountClaimed", type: "uint256", indexed: false },
      { name: "transactionId", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TokenRefunded",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amountRefunded", type: "uint256", indexed: false },
      { name: "transactionId", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ContractStatusChanged",
    inputs: [{ name: "isActive", type: "bool", indexed: false }],
    anonymous: false,
  },
] as const;
