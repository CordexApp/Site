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
import { Card } from './ui/Card';
import { CopyableHash } from './ui/CopyableHash';
import { Input } from './ui/Input';
import { LoadingDots } from './ui/LoadingDots';
import { Slider } from './ui/Slider';
import { Textarea } from './ui/Textarea';
import { TypedText } from './ui/TypedText';

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
  const [deployBondingCurve, setDeployBondingCurve] = useState(true); // New state for bonding curve toggle
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Deployment state
  const [currentStep, setCurrentStep] = useState<DeploymentStep>('input');
  const [error, setError] = useState<string | null>(null);
  const [providerContractAddress, setProviderContractAddress] = useState<string | null>(null);
  const [providerTokenAddress, setProviderTokenAddress] = useState<string | null>(null);
  const [bondingCurveAddress, setBondingCurveAddress] = useState<string | null>(null);
  const [createdServiceId, setCreatedServiceId] = useState<string | null>(null);
  
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
      
      // Only deploy bonding curve if selected
      if (deployBondingCurve) {
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
      }
      
      // Step 4: Register service with the backend
      setCurrentStep('registering-service');
      if (!deployedProviderContractAddress || !deployedTokenAddress) {
        throw new Error('Contract addresses are missing for backend registration.');
      }
      
      // Upload image if selected
      let imageUrl = undefined;
      if (imageFile) {
        try {
          // Get pre-signed URL for upload
          const uploadUrlResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/upload/presigned-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file_name: imageFile.name,
              content_type: imageFile.type
            }),
          });
          
          if (!uploadUrlResponse.ok) {
            console.error('Failed to get upload URL:', await uploadUrlResponse.text());
          } else {
            const { presigned_url, object_key } = await uploadUrlResponse.json();
            
            // Upload the file to S3
            const uploadResponse = await fetch(presigned_url, {
              method: 'PUT',
              headers: {
                'Content-Type': imageFile.type
              },
              body: imageFile
            });
            
            if (uploadResponse.ok) {
              // Construct the public URL (adjust based on your S3 configuration)
              imageUrl = `${process.env.NEXT_PUBLIC_S3_PUBLIC_URL || 'https://cordex-service-images.s3.us-west-2.amazonaws.com'}/${object_key}`;
              console.log('Image uploaded successfully:', imageUrl);
            } else {
              console.error('Failed to upload image:', await uploadResponse.text());
            }
          }
        } catch (err) {
          console.error('Error uploading image:', err);
          // Continue with service creation even if image upload fails
        }
      }
      
      // Create service with all available data
      const serviceToCreate = {
        name: serviceName,
        description: serviceDescription, // Include description field
        endpoint: apiEndpoint,
        provider_contract_address: deployedProviderContractAddress,
        coin_contract_address: deployedTokenAddress,
        bonding_curve_address: deployedBondingCurveAddress || undefined,
        owner_wallet_address: address,
        is_active: true,
        image: imageUrl
      };

      const createdService = await createService(serviceToCreate);
      if (!createdService || !createdService.id) {
        throw new Error('Failed to register the service with the backend or missing service ID.');
      }
      console.log('Service registered with backend:', createdService);
      setCreatedServiceId(createdService.id);
      
      setCurrentStep('complete');
      
    } catch (error: unknown) {
      console.error('Deployment error:', error);
      setError(error instanceof Error ? error.message : 'Failed to deploy service');
      if (deployedProviderContractAddress) setProviderContractAddress(deployedProviderContractAddress);
      if (deployedTokenAddress) setProviderTokenAddress(deployedTokenAddress);
      if (deployedBondingCurveAddress) setBondingCurveAddress(deployedBondingCurveAddress);
      
      // Determine what step to return to based on progress and whether bonding curve is enabled
      if (deployBondingCurve) {
        setCurrentStep(deployedBondingCurveAddress ? 'registering-service' : 
                       deployedTokenAddress ? 'deploying-curve' : 
                       deployedProviderContractAddress ? 'approving-tokens' : 'input');
      } else {
        setCurrentStep(deployedProviderContractAddress ? 'registering-service' : 'input');
      }
    }
  };

  const handleRedirectToManage = () => {
    if (createdServiceId) {
      router.push(`/service/${createdServiceId}`);
    } else if (providerContractAddress) {
      console.warn("Redirecting with contract address as service ID is not available yet.");
      router.push(`/manage-service/${providerContractAddress}`);
    }
  };

  // Function to handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('[LaunchServiceFlow] handleImageChange triggered. File:', file);
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="mb-6">
        <TypedText text="launch your service" />
      </h2>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}
      
      <Card className="p-6" variant="transparent">
        {currentStep === 'input' && (
          <>
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">Service Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-1">Service Name</label>
                  <Input 
                    value={serviceName} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setServiceName(e.target.value)}
                    placeholder="My AI Service"
                    className="bg-black/50 border-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Description (Optional)</label>
                  <Textarea 
                    value={serviceDescription} 
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setServiceDescription(e.target.value)}
                    placeholder="Describe what your service does..."
                    rows={3}
                    className="bg-black/50 border-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Service Image (Optional)</label>
                  <div className="flex flex-col space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-black/50 file:text-white hover:file:bg-black/30"
                    />
                    {imagePreview && (
                      <div className="relative w-32 h-32 mt-2 border border-gray-600 rounded overflow-hidden">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="object-cover w-full h-full"
                        />
                        <button 
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">API Endpoint</label>
                  <Input 
                    value={apiEndpoint} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiEndpoint(e.target.value)}
                    placeholder="https://api.myservice.com/v1"
                    className="bg-black/50 border-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Max Escrow (CRDX)</label>
                  <Input 
                    type="number"
                    value={maxEscrow} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxEscrow(e.target.value)}
                    min="0"
                    className="bg-black/50 border-gray-600"
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">Token Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-1">Token Name</label>
                  <Input 
                    value={tokenName} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTokenName(e.target.value)}
                    placeholder="My Service Token"
                    className="bg-black/50 border-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Token Symbol</label>
                  <Input 
                    value={tokenSymbol} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTokenSymbol(e.target.value)}
                    placeholder="MST"
                    maxLength={5}
                    className="bg-black/50 border-gray-600"
                  />
                </div>
                
                <div className="flex items-center space-x-3 mt-4">
                  <input
                    type="checkbox"
                    id="deployBondingCurve"
                    checked={deployBondingCurve}
                    onChange={(e) => setDeployBondingCurve(e.target.checked)}
                    className="h-4 w-4 bg-black/50 border-gray-600 rounded focus:ring-white"
                  />
                  <label htmlFor="deployBondingCurve" className="text-gray-300">
                    Deploy bonding curve (enables token trading)
                  </label>
                </div>
                
                {deployBondingCurve && (
                  <div className="pl-7 mt-2 border-l border-gray-700">
                    <label className="block text-gray-300 mb-1">
                      Percentage of tokens to deposit in bonding curve: {tokenPercentage}%
                    </label>
                    <Slider
                      min={1}
                      max={99}
                      step={1}
                      value={[tokenPercentage]}
                      onValueChange={(values) => setTokenPercentage(values[0])}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      This determines how many of your tokens will be available for trading.
                      Remaining tokens will stay in your wallet.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={handleServiceDeployment}
              disabled={currentStep !== 'input'}
              className="px-4 py-2 border border-white text-white font-medium hover:bg-white hover:text-black transition-colors cursor-pointer flex justify-center items-center w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Launch Service
            </button>
          </>
        )}
        
        {currentStep !== 'input' && currentStep !== 'complete' && (
          <div className="text-center py-10 border border-gray-700 rounded-lg bg-black/30 p-6">
            <TypedText
              text={
                currentStep === 'confirming' ? 'waiting for confirmation' :
                currentStep === 'deploying-service' ? 'deploying your service' :
                currentStep === 'approving-tokens' ? 'approving tokens' :
                currentStep === 'deploying-curve' ? 'deploying bonding curve' :
                'registering service on cordex'
              }
              className="text-xl mb-6"
            />
            <div className="flex justify-center items-center mb-4">
              <LoadingDots text={
                currentStep === 'confirming' ? 'confirm in wallet' :
                currentStep === 'deploying-service' ? 'deploying' :
                currentStep === 'approving-tokens' ? 'approving' :
                currentStep === 'deploying-curve' ? 'deploying' :
                'registering'
              } />
            </div>
            <p className="text-gray-400 mt-4">
              Please confirm the transaction in your wallet when prompted. This may take a few moments.
            </p>
          </div>
        )}
        
        {currentStep === 'complete' && providerContractAddress && (
          <div className="text-center py-6">
            <h3 className="text-xl font-semibold mb-6 text-green-500">
              <TypedText text="Deployment Complete!" />
            </h3>
            <p className="mb-4 text-gray-300">Your service has been successfully launched and activated.</p>
            
            <div className="space-y-2 mb-6 text-left">
              <p className="text-gray-400">
                Provider Contract: <CopyableHash hash={providerContractAddress} />
              </p>
              {providerTokenAddress && (
                <p className="text-gray-400">
                  Token Address: <CopyableHash hash={providerTokenAddress} />
                </p>
              )}
              {bondingCurveAddress && (
                <p className="text-gray-400">
                  Bonding Curve: <CopyableHash hash={bondingCurveAddress} />
                </p>
              )}
            </div>
            
            <button 
              onClick={handleRedirectToManage}
              className="px-4 py-2 border border-white text-white font-medium hover:bg-white hover:text-black transition-colors cursor-pointer flex justify-center items-center mt-4"
            >
              View Your Service
            </button>
          </div>
        )}
      </Card>
    </div>
  );
} 