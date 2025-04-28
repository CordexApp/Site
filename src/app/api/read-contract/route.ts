import { NextResponse } from 'next/server';
import { createPublicClient, getAddress, http } from 'viem';
import { optimismSepolia } from 'viem/chains';

// Create a public client to read from the blockchain
const publicClient = createPublicClient({
  chain: optimismSepolia,
  transport: http(),
});

// Helper function to convert BigInt values to strings for JSON serialization
function convertBigIntToString(value: any): any {
  if (typeof value === 'bigint') {
    return value.toString();
  } else if (Array.isArray(value)) {
    return value.map(convertBigIntToString);
  } else if (typeof value === 'object' && value !== null) {
    const result: Record<string, any> = {};
    for (const key in value) {
      result[key] = convertBigIntToString(value[key]);
    }
    return result;
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const functionName = searchParams.get('function');
    const args = searchParams.get('args');
    
    if (!address || !functionName) {
      return NextResponse.json(
        { error: 'address and function parameters are required' },
        { status: 400 }
      );
    }
    
    // Validate and format address
    let formattedAddress;
    try {
      formattedAddress = getAddress(address as string);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }
    
    // Parse function arguments if provided
    let parsedArgs: any[] = [];
    if (args) {
      const argParts = args.split(',');
      parsedArgs = argParts.map(arg => {
        // Try to detect address
        if (arg.startsWith('0x') && arg.length === 42) {
          try {
            return getAddress(arg);
          } catch {
            return arg; // If not a valid address, use as string
          }
        }
        // Try to parse as number if it looks like one
        if (/^-?\d+$/.test(arg)) {
          return BigInt(arg);
        }
        // Default to string
        return arg;
      });
    }
    
    // Generate a basic ABI for the requested function
    // This is a simplified approach - in a real app, you'd have proper ABIs
    let abiFragment;
    
    // Common function signatures - expand as needed
    if (functionName === 'name' || functionName === 'symbol') {
      abiFragment = {
        name: functionName,
        inputs: [],
        outputs: [{ type: 'string' }],
        stateMutability: 'view',
        type: 'function',
      };
    } else if (functionName === 'balanceOf') {
      abiFragment = {
        name: 'balanceOf',
        inputs: [{ type: 'address' }],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      };
    } else if (functionName === 'allowance') {
      abiFragment = {
        name: 'allowance',
        inputs: [{ type: 'address' }, { type: 'address' }],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      };
    } else if (functionName === 'tokenSupply' || functionName === 'accumulatedFees' || functionName === 'getCurrentPrice') {
      abiFragment = {
        name: functionName,
        inputs: [],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      };
    } else if (functionName === 'providerTokenAddress' || functionName === 'provider' || functionName === 'cordexTokenAddress') {
      abiFragment = {
        name: functionName,
        inputs: [],
        outputs: [{ type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      };
    } else {
      // Generic fallback (might not work for all functions)
      abiFragment = {
        name: functionName,
        inputs: [], // Empty inputs as fallback
        outputs: [{ type: 'bytes' }], // Generic output type
        stateMutability: 'view',
        type: 'function',
      };
    }
    
    console.log(`Reading ${functionName} on ${formattedAddress} with args:`, parsedArgs);
    
    // Make the contract read call
    const result = await publicClient.readContract({
      address: formattedAddress,
      abi: [abiFragment],
      functionName,
      args: parsedArgs,
    });
    
    // Convert any BigInt values to strings before returning
    const serializableResult = convertBigIntToString(result);
    
    return NextResponse.json({ result: serializableResult });
  } catch (error) {
    console.error('Contract read error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 