"use client";

import ContractFactoryABI from '@/abis/ContractFactory.json';
import { ProviderContractAbi } from '@/abis/ProviderContract';
import ProviderTokenABI from '@/abis/ProviderToken.json';
import { useWeb3 } from '@/hooks/useWeb3';
import { createService } from '@/services/servicesService';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Slider } from './ui/Slider';
import { Textarea } from './ui/Textarea';

// Get factory address from environment variables
const factoryAddressEnv = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
if (!factoryAddressEnv) {
  console.error("NEXT_PUBLIC_FACTORY_ADDRESS environment variable is not set. Using fallback address.");
}
const CONTRACT_FACTORY_ADDRESS = factoryAddressEnv || '0x0000000000000000000000000000000000000000';

type DeploymentStep = 'input' | 'confirming' | 'deploying-service' | 'approving-tokens' | 'deploying-curve' | 'registering-service' | 'complete';

// Define types for contract events
interface ContractEvent {
  event: string;
  args?: any;
}

export function LaunchServiceFlow() {
  const router = useRouter();
  const { provider, address, signer } = useWeb3();
  
  // Form fields
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [maxEscrow, setMaxEscrow] = useState('1');
  const [tokenPercentage, setTokenPercentage] = useState(20); // Default 20% of tokens to bonding curve
  
  // Deployment state
  const [currentStep, setCurrentStep] = useState<DeploymentStep>('input');
  const [error, setError] = useState<string | null>(null);
  const [providerContractAddress, setProviderContractAddress] = useState<string | null>(null);
  const [providerTokenAddress, setProviderTokenAddress] = useState<string | null>(null);
  const [bondingCurveAddress, setBondingCurveAddress] = useState<string | null>(null);
  
  // Defaults for bonding curve
  const DEFAULT_SLOPE = ethers.utils.parseUnits('0.05', 18); // 0.05 with 18 decimals
  const DEFAULT_INTERCEPT = ethers.utils.parseUnits('0.1', 18); // 0.1 with 18 decimals

  const handleServiceDeployment = async () => {
    if (!provider || !address || !signer) {
      setError('Wallet not connected');
      return;
    }
    
    let deployedProviderContractAddress: string | null = null;
    let deployedTokenAddress: string | null = null;
    let deployedBondingCurveAddress: string | null = null;

    try {
      setCurrentStep('confirming');
      
      // Validation
      if (!serviceName || !apiEndpoint || !tokenName || !tokenSymbol) {
        setError('Please fill all required fields');
        setCurrentStep('input');
        return;
      }
      
      const factory = new ethers.Contract(CONTRACT_FACTORY_ADDRESS, ContractFactoryABI, signer);
      
      // Step 1: Deploy Provider Contract
      setCurrentStep('deploying-service');
      const maxEscrowAmount = ethers.utils.parseUnits(maxEscrow, 18);
      
      const tx1 = await factory.deployProviderContract(
        apiEndpoint,
        maxEscrowAmount,
        tokenName,
        tokenSymbol
      );
      
      const receipt1 = await tx1.wait();
      
      // Extract provider contract and token addresses from events
      const deployEvent = receipt1.events?.find((e: ContractEvent) => e.event === 'ProviderContractDeployed');
      if (!deployEvent || !deployEvent.args) {
        throw new Error('Failed to get deployment information');
      }
      
      deployedProviderContractAddress = deployEvent.args.contractAddress;
      deployedTokenAddress = deployEvent.args.ownershipTokenAddress;
      
      setProviderContractAddress(deployedProviderContractAddress);
      setProviderTokenAddress(deployedTokenAddress);
      
      // Step 1.5: Activate Provider Contract
      setCurrentStep('confirming');
      if (!deployedProviderContractAddress) {
        throw new Error('Provider contract address not found after deployment.');
      }
      const providerContract = new ethers.Contract(deployedProviderContractAddress, ProviderContractAbi, signer);
      const activateTx = await providerContract.setContractStatus(true);
      await activateTx.wait();
      console.log('Provider contract activated');
      
      // Step 2: Approve tokens for bonding curve
      setCurrentStep('approving-tokens');
      
      // Calculate amount to deposit (percentage of total supply)
      if (!deployedTokenAddress) {
        throw new Error('Provider token address not found after deployment.');
      }
      const token = new ethers.Contract(deployedTokenAddress, ProviderTokenABI, signer);
      const totalSupply = await token.totalSupply();
      const depositAmount = totalSupply.mul(tokenPercentage).div(100);
      
      const approveTx = await token.approve(CONTRACT_FACTORY_ADDRESS, depositAmount);
      await approveTx.wait();
      
      // Step 3: Deploy Bonding Curve
      setCurrentStep('deploying-curve');
      
      const tx2 = await factory.deployBondingCurveContract(
        deployedTokenAddress,
        depositAmount,
        DEFAULT_SLOPE,
        DEFAULT_INTERCEPT
      );
      
      const receipt2 = await tx2.wait();
      
      // Extract bonding curve address from events
      const curveEvent = receipt2.events?.find((e: ContractEvent) => e.event === 'BondingCurveDeployed');
      if (!curveEvent || !curveEvent.args) {
        throw new Error('Failed to get bonding curve information');
      }
      
      deployedBondingCurveAddress = curveEvent.args.bondingCurveAddress;
      setBondingCurveAddress(deployedBondingCurveAddress);
      
      // Step 4: Register service with the backend
      setCurrentStep('registering-service');
      if (!deployedProviderContractAddress || !deployedTokenAddress || !deployedBondingCurveAddress) {
        throw new Error('One or more contract addresses are missing for backend registration.');
      }
      const serviceToCreate = {
        name: serviceName,
        endpoint: apiEndpoint,
        provider_contract_address: deployedProviderContractAddress!,
        coin_contract_address: deployedTokenAddress!,
        bonding_curve_address: deployedBondingCurveAddress!,
        owner_wallet_address: address,
        is_active: true,
      };

      const createdService = await createService(serviceToCreate);
      if (!createdService) {
        throw new Error('Failed to register the service with the backend.');
      }
      console.log('Service registered with backend:', createdService);
      
      setCurrentStep('complete');
      
    } catch (error: unknown) {
      console.error('Deployment error:', error);
      setError(error instanceof Error ? error.message : 'Failed to deploy service');
      if (deployedProviderContractAddress) setProviderContractAddress(deployedProviderContractAddress);
      if (deployedTokenAddress) setProviderTokenAddress(deployedTokenAddress);
      if (deployedBondingCurveAddress) setBondingCurveAddress(deployedBondingCurveAddress);
      setCurrentStep(deployedBondingCurveAddress ? 'registering-service' : deployedTokenAddress ? 'deploying-curve' : deployedProviderContractAddress ? 'approving-tokens' : 'input');
    }
  };

  const handleRedirectToManage = () => {
    if (providerContractAddress) {
      router.push(`/service/${providerContractAddress}`);
    }
  };

  return (
    <Card className="p-6 w-full max-w-2xl mx-auto">
      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}
      
      {currentStep === 'input' && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">Service Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1">Service Name</label>
                <Input 
                  value={serviceName} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setServiceName(e.target.value)}
                  placeholder="My AI Service"
                />
              </div>
              
              <div>
                <label className="block mb-1">Description (Optional)</label>
                <Textarea 
                  value={serviceDescription} 
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setServiceDescription(e.target.value)}
                  placeholder="Describe what your service does..."
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block mb-1">API Endpoint</label>
                <Input 
                  value={apiEndpoint} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiEndpoint(e.target.value)}
                  placeholder="https://api.myservice.com/v1"
                />
              </div>
              
              <div>
                <label className="block mb-1">Max Escrow (CRDX)</label>
                <Input 
                  type="number"
                  value={maxEscrow} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxEscrow(e.target.value)}
                  min="0"
                />
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">Token Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1">Token Name</label>
                <Input 
                  value={tokenName} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTokenName(e.target.value)}
                  placeholder="My Service Token"
                />
              </div>
              
              <div>
                <label className="block mb-1">Token Symbol</label>
                <Input 
                  value={tokenSymbol} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTokenSymbol(e.target.value)}
                  placeholder="MST"
                  maxLength={5}
                />
              </div>
              
              <div>
                <label className="block mb-1">
                  Percentage of tokens to deposit in bonding curve: {tokenPercentage}%
                </label>
                <Slider
                  min={1}
                  max={50}
                  step={1}
                  value={[tokenPercentage]}
                  onValueChange={(values) => setTokenPercentage(values[0])}
                />
                <p className="text-sm text-gray-500 mt-1">
                  This determines how many of your tokens will be available for trading.
                  Remaining tokens will stay in your wallet.
                </p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleServiceDeployment} 
            size="lg"
            className="w-full"
            variant="primary"
            disabled={currentStep !== 'input'}
          >
            Launch Service
          </Button>
        </>
      )}
      
      {currentStep !== 'input' && currentStep !== 'complete' && (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="text-xl font-bold mb-2">
            {currentStep === 'confirming' && 'Waiting for confirmation...'}
            {currentStep === 'deploying-service' && 'Deploying your service...'}
            {currentStep === 'approving-tokens' && 'Approving tokens...'}
            {currentStep === 'deploying-curve' && 'Deploying bonding curve...'}
            {currentStep === 'registering-service' && 'Registering service with backend...'}
          </h3>
          <p className="text-gray-500">
            Please confirm the transaction in your wallet when prompted. This may take a few moments.
          </p>
        </div>
      )}
      
      {currentStep === 'complete' && providerContractAddress && (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-green-500">Deployment Complete!</h2>
          <p className="mb-2">Your service has been successfully launched and activated.</p>
          <p className="mb-1">
            Provider Contract: <span className="font-mono text-sm">{providerContractAddress}</span>
          </p>
          {providerTokenAddress && (
            <p className="mb-1">
              Token Address: <span className="font-mono text-sm">{providerTokenAddress}</span>
            </p>
          )}
          {bondingCurveAddress && (
            <p className="mb-4">
              Bonding Curve: <span className="font-mono text-sm">{bondingCurveAddress}</span>
            </p>
          )}
          <Button onClick={() => router.push(`/service/${providerContractAddress}`)} className="mt-4">
            View Your Service
          </Button>
        </div>
      )}
    </Card>
  );
} 