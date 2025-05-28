/**
 * Utility functions for handling wallet errors and user cancellations
 */

export interface WalletError {
  isUserRejection: boolean;
  message: string;
  originalError: any;
}

/**
 * Checks if an error is due to user cancelling/rejecting a transaction
 */
export function isUserRejection(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code;
  const errorName = error.name?.toLowerCase() || '';

  // Common patterns for user rejection
  const rejectionPatterns = [
    'user rejected',
    'user denied',
    'user cancelled',
    'user canceled',
    'rejected by user',
    'transaction was rejected',
    'user refused',
    'operation was cancelled',
    'operation was canceled',
    'aborted by user',
    'metamask tx signature',
    'transaction rejected',
    'user rejected the request'
  ];

  // Common error codes for user rejection
  const rejectionCodes = [
    4001, // User rejected the request (EIP-1193)
    -32000, // User rejected
    -32603, // Internal error (sometimes used for cancellation)
    'ACTION_REJECTED', // Ethers.js
    'UNPREDICTABLE_GAS_LIMIT', // Sometimes indicates user rejection
  ];

  // Check message patterns
  const messageMatch = rejectionPatterns.some(pattern => 
    errorMessage.includes(pattern)
  );

  // Check error codes
  const codeMatch = rejectionCodes.some(code => 
    errorCode === code || errorCode === String(code)
  );

  // Check error name patterns
  const nameMatch = errorName.includes('rejection') || 
                   errorName.includes('cancelled') || 
                   errorName.includes('canceled');

  return messageMatch || codeMatch || nameMatch;
}

/**
 * Gets a user-friendly error message for wallet errors
 */
export function getWalletErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';

  if (isUserRejection(error)) {
    return 'Transaction cancelled by user';
  }

  const errorMessage = error.message || '';

  // Handle common wallet error patterns
  if (errorMessage.includes('insufficient funds')) {
    return 'Insufficient funds to complete the transaction';
  }

  if (errorMessage.includes('gas')) {
    return 'Transaction failed due to gas issues. Please try again with higher gas limit.';
  }

  if (errorMessage.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (errorMessage.includes('timeout')) {
    return 'Transaction timed out. Please try again.';
  }

  if (errorMessage.includes('nonce')) {
    return 'Transaction nonce error. Please reset your wallet and try again.';
  }

  // Return the original error message if no pattern matches, but clean it up
  const cleanMessage = errorMessage
    .replace(/^Error: /, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleanMessage || 'Transaction failed. Please try again.';
}

/**
 * Parses wallet errors and returns structured information
 */
export function parseWalletError(error: any): WalletError {
  const isRejection = isUserRejection(error);
  const message = getWalletErrorMessage(error);

  return {
    isUserRejection: isRejection,
    message,
    originalError: error
  };
} 