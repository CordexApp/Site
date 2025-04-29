export const ContractFactoryAbi = [
  {
    inputs: [
      { name: "apiEndpoint", type: "string" },
      { name: "maxEscrow", type: "uint256" },
      { name: "tokenName", type: "string" },
      { name: "tokenSymbol", type: "string" },
    ],
    name: "deployProviderContract",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getProviderContract", // Most recent provider contract
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getProviderToken", // Most recent provider token
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getProviderContracts", // List of all provider contracts
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getProviderTokens", // List of all provider tokens
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getBondingCurveContract", // Most recent bonding curve
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getBondingCurveContracts", // List of all bonding curves
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "providerTokenAddress", type: "address" },
      { name: "initialTokenAmount", type: "uint256" },
      { name: "slope", type: "uint256" },
      { name: "intercept", type: "uint256" },
    ],
    name: "deployBondingCurveContract",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Add Events: ProviderContractDeployed, BondingCurveDeployed
  {
    type: "event",
    name: "ProviderContractDeployed",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "contractAddress", type: "address", indexed: false },
      { name: "ownershipTokenAddress", type: "address", indexed: false },
      { name: "apiEndpoint", type: "string", indexed: false },
      { name: "maxEscrow", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "BondingCurveDeployed",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "bondingCurveAddress", type: "address", indexed: false },
      { name: "providerTokenAddress", type: "address", indexed: false },
      { name: "initialTokenAmount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;
