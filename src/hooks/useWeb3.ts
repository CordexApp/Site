"use client";

import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';

export function useWeb3() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum as any);
      setProvider(ethersProvider);
      
      if (isConnected && address) {
        const ethersSigner = ethersProvider.getSigner(address);
        setSigner(ethersSigner);
      } else {
        setSigner(null);
      }
    }
  }, [isConnected, address]);

  return {
    address,
    isConnected,
    provider,
    signer,
    publicClient,
    walletClient
  };
} 