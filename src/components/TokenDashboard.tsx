"use client";

import { useTokenDashboard } from "@/hooks/useTokenDashboard";
import PriceChart from "./PriceChart";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { CopyableHash } from "@/components/ui/CopyableHash";
import TokenTrading from "./TokenTrading";
import { CommaFormatter } from "./ui/CommaFormatter";
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
        <h2 className="text-xl font-semibold mb-4">token information</h2>
        <LoadingDots text="loading token data" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-4 ">
        <h2 className="text-xl font-semibold mb-4">token information</h2>
        <p className="text-cordex-red">{error}</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-4 space-y-8">
      {/* Display Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-cordex-red text-cordex-red flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={clearErrorMessage}
            className="text-cordex-red hover:text-white font-bold"
          >
            x
          </button>
        </div>
      )}

      {/* Token Header Info */}
      {tokenInfo.address && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-4">
            <h1 className="text-2xl font-bold text-white">
              {tokenInfo.name || "unknown"} ({tokenInfo.symbol || "?"})
            </h1>
            {bondingCurveInfo && (
              <div className="text-cordex-green">
                market cap:{" "}
                <CommaFormatter
                  value={Number(
                    Number(bondingCurveInfo.tokenSupply) *
                      Number(bondingCurveInfo.currentPrice)
                  ).toFixed(0)}
                />{" "}
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
              symbol={tokenInfo.symbol || "token"}
            />
          </div>

          {/* Right Column - Trading UI and Addresses */}
          <div className="lg:col-span-1">
            {/* Trading UI */}
            <div className="lg:ml-4">
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
              <div className="mt-6 border border-gray-700 p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">
                  contract information
                </h4>
                <div className="flex flex-col text-sm space-y-3">
                  {tokenInfo.address && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">token:</span>
                      <CopyableHash
                        hash={tokenInfo.address}
                        className="text-right"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">provider:</span>
                    <CopyableHash
                      hash={providerContractAddress}
                      className="text-right"
                    />
                  </div>

                  {bondingCurveAddress && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">current price:</span>
                      <span className="text-white font-medium">
                        {Number(bondingCurveInfo.currentPrice).toFixed(6)}{" "}
                        cordex
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
