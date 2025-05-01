"use client";

import { useTokenDashboard } from "@/hooks/useTokenDashboard";
import PriceChart from "./PriceChart";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { CopyableHash } from "@/components/ui/CopyableHash";
import TokenTrading from "./TokenTrading";

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
      <div className="mt-8 p-4">
        <h2 className="text-xl font-semibold mb-4">Token Information</h2>
        <LoadingDots text="Loading token data" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-4 ">
        <h2 className="text-xl font-semibold mb-4">Token Information</h2>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-4 space-y-8">
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

      {/* Token Header Info */}
      {tokenInfo.address && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-4">
            <h1 className="text-2xl font-bold text-white">
              {tokenInfo.name || "Unknown"} ({tokenInfo.symbol || "?"})
            </h1>
            {bondingCurveInfo && (
              <div className="text-cordex-green">
                Market Cap:{" "}
                {Number(
                  Number(bondingCurveInfo.tokenSupply) *
                    Number(bondingCurveInfo.currentPrice)
                ).toFixed(0)}{" "}
                CRDX
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart and Trading Section - Responsive Layout */}
      {bondingCurveAddress && (
        <div className="lg:grid lg:grid-cols-3 lg:gap-6">
          {/* Price Chart - Takes 2/3 of space on lg screens */}
          <div className="lg:col-span-2 mb-6 lg:mb-0">
            <PriceChart
              data={chartData}
              timeframe={chartTimeframe}
              onTimeframeChange={handleTimeframeChange}
              availableTimeframes={availableTimeframes}
              isLoading={isChartLoading}
              symbol={tokenInfo.symbol || "Token"}
            />
          </div>

          {/* Right Column - Trading UI and Addresses */}
          <div className="lg:col-span-1">
            {/* Trading UI */}
            {tokenInfo.address && (
              <div className="border-t border-gray-700 pt-4 lg:border-t-0 lg:pt-0">
                <TokenTrading
                  tokenSymbol={tokenInfo.symbol || ""}
                  tokenAddress={tokenInfo.address}
                  buyState={buyState}
                  sellState={sellState}
                  successInfo={successInfo}
                  blockExplorerUrl={blockExplorerUrl || null}
                  activeTab={activeTab}
                  tokenBalance={tokenInfo.balance}
                  handleBuyAmountChange={handleBuyAmountChange}
                  handleSellAmountChange={handleSellAmountChange}
                  approveBuy={approveBuy}
                  approveSell={approveSell}
                  executeBuy={executeBuy}
                  executeSell={executeSell}
                  setActiveTab={setActiveTab}
                  clearSuccessMessage={clearSuccessMessage}
                />
              </div>
            )}

            {/* Condensed Address Information */}
            <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col text-sm space-y-2">
              {tokenInfo.address && (
                <div className="flex items-center">
                  <span className="text-gray-400 mr-2 w-16">Token:</span>
                  <CopyableHash hash={tokenInfo.address} />
                </div>
              )}

              <div className="flex items-center">
                <span className="text-gray-400 mr-2 w-16">Provider:</span>
                <CopyableHash hash={providerContractAddress} />
              </div>

              {bondingCurveAddress && (
                <div className="flex items-center">
                  <span className="text-gray-400 mr-2 w-16">Price:</span>
                  <span className="text-gray-300">
                    {Number(bondingCurveInfo.currentPrice).toFixed(6)} CORDEX
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
