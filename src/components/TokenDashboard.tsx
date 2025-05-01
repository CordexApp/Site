"use client";

import { useTokenDashboard } from "@/hooks/useTokenDashboard";
import PriceChart from "./PriceChart";

interface TokenDashboardProps {
  providerContractAddress: `0x${string}`;
}

export default function TokenDashboard({
  providerContractAddress,
}: TokenDashboardProps) {
  const {
    ownerAddress,
    bondingCurveAddress,
    tokenInfo,
    bondingCurveInfo,
    buyState,
    sellState,
    isLoading,
    error,
    successInfo,
    blockExplorerUrl,
    // Chart state
    chartData,
    chartTimeframe,
    availableTimeframes,
    isChartLoading,
    // Tab state
    activeTab,
    setActiveTab,
    // Functions
    handleBuyAmountChange,
    handleSellAmountChange,
    approveBuy,
    approveSell,
    executeBuy,
    executeSell,
    handleTimeframeChange,
    clearSuccessMessage,
    clearErrorMessage,
  } = useTokenDashboard(providerContractAddress);

  if (isLoading) {
    return (
      <div className="mt-8 p-4 bg-gray-800 rounded border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Token Information</h2>
        <p className="text-gray-400">Loading token data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-4 bg-gray-800 rounded border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Token Information</h2>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  // Calculate if the user has sufficient balance to sell
  const hasInsufficientTokenBalance = () => {
    if (!tokenInfo.balance || !sellState.amount) return false;
    return Number(sellState.amount) > Number(tokenInfo.balance);
  };

  return (
    <div className="mt-8 p-4 bg-gray-800 rounded border border-gray-700 space-y-8">
      {/* Price Chart */}
      {bondingCurveAddress && (
        <div className="pt-4 border-t border-gray-700">
          <PriceChart
            data={chartData}
            timeframe={chartTimeframe}
            onTimeframeChange={handleTimeframeChange}
            availableTimeframes={availableTimeframes}
            isLoading={isChartLoading}
            symbol={tokenInfo.symbol || "Token"}
          />
        </div>
      )}
      {/* Trading UI */}
      {bondingCurveAddress && tokenInfo.address && (
        <div className="mt-6 border-t border-gray-700 pt-4">
          <h3 className="text-xl font-medium text-gray-100 mb-4">
            Trade Tokens
          </h3>

          <div className="flex border-b border-gray-700">
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "buy"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
              onClick={() => setActiveTab("buy")}
            >
              Buy Tokens
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "sell"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
              onClick={() => setActiveTab("sell")}
            >
              Sell Tokens
            </button>
          </div>

          <div className="mt-4">
            {activeTab === "buy" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Amount of {tokenInfo.symbol || "tokens"} to buy
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={buyState.amount}
                      onChange={(e) => handleBuyAmountChange(e.target.value)}
                      placeholder="0.0"
                      className="bg-gray-700 border border-gray-600 text-white p-2 rounded-md w-full"
                      disabled={buyState.isProcessing || buyState.isApproving}
                    />
                    <span className="text-gray-400 text-sm whitespace-nowrap">
                      {tokenInfo.symbol || "tokens"}
                    </span>
                  </div>
                </div>

                {buyState.amount && Number(buyState.amount) > 0 && (
                  <div className="bg-gray-700 p-2 rounded-md">
                    <p className="text-sm text-gray-300">
                      Estimated cost:{" "}
                      {Number(buyState.estimatedCost).toFixed(6)} CORDEX
                    </p>
                  </div>
                )}

                {buyState.hasAllowance ? (
                  <button
                    onClick={executeBuy}
                    disabled={
                      !buyState.amount ||
                      buyState.isProcessing ||
                      Number(buyState.amount) <= 0
                    }
                    className={`w-full py-2 px-4 rounded-md font-medium ${
                      !buyState.amount ||
                      buyState.isProcessing ||
                      Number(buyState.amount) <= 0
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {buyState.isProcessing
                      ? "Processing..."
                      : `Buy ${tokenInfo.symbol || "Tokens"}`}
                  </button>
                ) : (
                  <button
                    onClick={approveBuy}
                    disabled={buyState.isApproving}
                    className={`w-full py-2 px-4 rounded-md font-medium ${
                      buyState.isApproving
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {buyState.isApproving ? "Approving..." : "Approve CORDEX"}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Amount of {tokenInfo.symbol || "tokens"} to sell
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={sellState.amount}
                      onChange={(e) => handleSellAmountChange(e.target.value)}
                      placeholder="0.0"
                      className="bg-gray-700 border border-gray-600 text-white p-2 rounded-md w-full"
                      disabled={sellState.isProcessing || sellState.isApproving}
                    />
                    <span className="text-gray-400 text-sm whitespace-nowrap">
                      {tokenInfo.symbol || "tokens"}
                    </span>
                  </div>
                </div>

                {sellState.amount && Number(sellState.amount) > 0 && (
                  <div className="bg-gray-700 p-2 rounded-md">
                    <p className="text-sm text-gray-300">
                      Estimated payout:{" "}
                      {Number(sellState.estimatedCost).toFixed(6)} CORDEX
                    </p>
                  </div>
                )}

                {hasInsufficientTokenBalance() && (
                  <p className="text-red-400 text-sm">
                    Insufficient token balance
                  </p>
                )}

                {sellState.hasAllowance ? (
                  <button
                    onClick={executeSell}
                    disabled={
                      !sellState.amount ||
                      sellState.isProcessing ||
                      Number(sellState.amount) <= 0 ||
                      hasInsufficientTokenBalance()
                    }
                    className={`w-full py-2 px-4 rounded-md font-medium ${
                      !sellState.amount ||
                      sellState.isProcessing ||
                      Number(sellState.amount) <= 0 ||
                      hasInsufficientTokenBalance()
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-orange-600 hover:bg-orange-700 text-white"
                    }`}
                  >
                    {sellState.isProcessing
                      ? "Processing..."
                      : `Sell ${tokenInfo.symbol || "Tokens"}`}
                  </button>
                ) : (
                  <button
                    onClick={approveSell}
                    disabled={sellState.isApproving}
                    className={`w-full py-2 px-4 rounded-md font-medium ${
                      sellState.isApproving
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {sellState.isApproving
                      ? "Approving..."
                      : `Approve ${tokenInfo.symbol || "Tokens"}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold">Token Information</h2>

      {/* Display Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-md text-red-200 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={clearErrorMessage}
            className="text-red-200 hover:text-white font-bold"
          >
            X
          </button>
        </div>
      )}

      {/* Display Success Message */}
      {successInfo && (
        <div className="mb-4 p-3 bg-green-900 border border-green-700 rounded-md text-green-200 flex justify-between items-center">
          <div>
            <span>{successInfo.message}</span>
            {blockExplorerUrl && successInfo.txHash && (
              <a
                href={`${blockExplorerUrl}/tx/${successInfo.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 underline hover:text-green-100 text-xs"
              >
                View Transaction
              </a>
            )}
          </div>
          <button
            onClick={clearSuccessMessage}
            className="text-green-200 hover:text-white font-bold"
          >
            X
          </button>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-300">
            Provider Contract
          </h3>
          <p className="text-gray-400 break-words">{providerContractAddress}</p>
        </div>

        {ownerAddress && (
          <div>
            <h3 className="text-lg font-medium text-gray-300">Owner Address</h3>
            <p className="text-gray-400 break-words">{ownerAddress}</p>
          </div>
        )}

        <div>
          <h3 className="text-lg font-medium text-gray-300">Provider Token</h3>
          {tokenInfo.address ? (
            <div>
              <p className="text-gray-400 mb-1">
                <span className="font-medium">Name:</span>{" "}
                {tokenInfo.name || "Unknown"}
              </p>
              <p className="text-gray-400 mb-1">
                <span className="font-medium">Symbol:</span>{" "}
                {tokenInfo.symbol || "Unknown"}
              </p>
              <p className="text-gray-400 mb-1 break-words">
                <span className="font-medium">Address:</span>{" "}
                {tokenInfo.address}
              </p>
              {tokenInfo.balance !== null && (
                <p className="text-gray-400 mb-1">
                  <span className="font-medium">Your Balance:</span>{" "}
                  {Number(tokenInfo.balance).toFixed(4)}{" "}
                  {tokenInfo.symbol || "tokens"}
                </p>
              )}
              {tokenInfo.balance === null && tokenInfo.address && (
                <p className="text-yellow-400 text-sm mt-2">
                  Connect your wallet to view token balance
                </p>
              )}
            </div>
          ) : (
            <p className="text-yellow-400">
              No provider token found for this service.
            </p>
          )}
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-300">Bonding Curve</h3>
          {bondingCurveAddress ? (
            <div>
              <p className="text-gray-400 break-words mb-2">
                {bondingCurveAddress}
              </p>
              <div className="bg-gray-700 p-3 rounded-md mt-2">
                <p className="text-gray-300 mb-1">
                  <span className="font-medium">Current Price:</span>{" "}
                  {Number(bondingCurveInfo.currentPrice).toFixed(6)} CORDEX
                </p>
                <p className="text-gray-300 mb-1">
                  <span className="font-medium">Token Supply:</span>{" "}
                  {Number(bondingCurveInfo.tokenSupply).toFixed(4)}{" "}
                  {tokenInfo.symbol || "tokens"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-yellow-400">
              No bonding curve contract linked to this token.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
