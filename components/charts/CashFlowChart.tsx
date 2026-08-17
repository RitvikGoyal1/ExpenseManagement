import { useCallback, useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";

import { Box } from "@/components/ui/box";
import { FadeSlideIn } from "@/components/ui/FadeSlideIn";
import { Text } from "@/components/ui/text";
import { cardShadow, colors } from "@/constants/theme";
import { CashFlowSummary } from "@/types/analytics";
import { formatCurrency } from "@/utils/format";
import { haptics } from "@/utils/haptics";

interface CashFlowChartProps {
  cashFlow: CashFlowSummary;
}

type SelectedBar = "income" | "outflow" | null;

function formatWholeCurrency(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

export function CashFlowChart({ cashFlow }: CashFlowChartProps) {
  const [chartWidth, setChartWidth] = useState(0);
  const [selectedBar, setSelectedBar] = useState<SelectedBar>(null);
  const net = cashFlow.totalIncome - cashFlow.totalOutflow;

  const handleLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  };

  const handleSelectBar = useCallback((bar: "income" | "outflow") => {
    haptics.selection();
    setSelectedBar((current) => (current === bar ? null : bar));
  }, []);

  // Sized directly off the measured card width instead of the library's
  // `adjustToWidth`, which sizes against the full screen width (via a
  // separate `parentWidth` prop) rather than the space actually available
  // inside this card — that mismatch is what was overflowing the card.
  const barWidth = chartWidth * 0.26;
  const barGap = chartWidth > 0 ? (chartWidth - barWidth * 2) / 3 : 0;

  // Headroom above the tallest bar so its topLabelComponent (the $ amount) has room to render —
  // without this, the tallest bar reaches the very top of the chart's `height` and clips its own label.
  const maxChartValue = Math.max(cashFlow.totalIncome, cashFlow.totalOutflow) * 1.25;

  const incomeColor =
    selectedBar === null || selectedBar === "income"
      ? colors.income
      : colors.textMuted;
  const outflowColor =
    selectedBar === null || selectedBar === "outflow"
      ? colors.expense
      : colors.textMuted;

  const barData = [
    {
      value: cashFlow.totalIncome,
      label: "Income",
      frontColor: incomeColor,
      onPress: () => handleSelectBar("income"),
      topLabelComponent: () => (
        <Text
          className="font-mono-semibold text-xs"
          style={{
            color:
              selectedBar === "income" ? colors.income : colors.textPrimary,
          }}
        >
          {formatWholeCurrency(cashFlow.totalIncome)}
        </Text>
      ),
    },
    {
      value: cashFlow.totalOutflow,
      label: "Outflow",
      frontColor: outflowColor,
      onPress: () => handleSelectBar("outflow"),
      topLabelComponent: () => (
        <Text
          className="font-mono-semibold text-xs"
          style={{
            color:
              selectedBar === "outflow" ? colors.expense : colors.textPrimary,
          }}
        >
          {formatWholeCurrency(cashFlow.totalOutflow)}
        </Text>
      ),
    },
  ];

  return (
    <Box
      className="rounded-lg border border-border bg-card p-6"
      style={cardShadow}
    >
      <Text className="font-display-semibold text-[17px] text-foreground">
        Income vs. outflow
      </Text>
      <Text className="mt-0.5 font-body text-[13px] text-muted-foreground">
        {cashFlow.month} · tap a bar for details
      </Text>

      <Box className="mt-6">
        <View onLayout={handleLayout}>
          {chartWidth > 0 && (
            <BarChart
              data={barData}
              width={chartWidth}
              height={150}
              maxValue={maxChartValue}
              barWidth={barWidth}
              spacing={barGap}
              initialSpacing={barGap}
              endSpacing={barGap}
              isAnimated
              animationDuration={650}
              disableScroll
              roundedTop
              barBorderRadius={10}
              hideRules
              hideYAxisText
              yAxisLabelWidth={0}
              yAxisThickness={0}
              xAxisThickness={0}
              xAxisLabelTextStyle={{
                fontFamily: "JetBrainsMono-Medium",
                fontSize: 11,
                color: colors.textMuted,
              }}
              noOfSections={4}
            />
          )}
        </View>
      </Box>

      {selectedBar ? (
        <FadeSlideIn
          key={selectedBar}
          className="mt-6 gap-1.5 border-t border-border pt-4"
          distance={8}
        >
          {selectedBar === "income" ? (
            <>
              <Text className="mb-1 font-mono text-[10px] tracking-[0.8px] text-muted-foreground">
                INCOME SOURCES
              </Text>
              {cashFlow.incomeSources.map((source) => (
                <Box key={source.id} className="flex-row justify-between">
                  <Text className="font-body-medium text-sm text-foreground">
                    {source.label}
                  </Text>
                  <Text className="font-mono-semibold text-sm text-income">
                    {formatCurrency(source.amount)}
                  </Text>
                </Box>
              ))}
            </>
          ) : (
            <>
              <Text className="mb-1 font-mono text-[10px] tracking-[0.8px] text-muted-foreground">
                OUTFLOW
              </Text>
              <Box className="flex-row justify-between">
                <Text className="font-body-medium text-sm text-foreground">
                  Share of income
                </Text>
                <Text className="font-mono-semibold text-sm text-destructive">
                  {(
                    (cashFlow.totalOutflow / cashFlow.totalIncome) *
                    100
                  ).toFixed(0)}
                  %
                </Text>
              </Box>
              <Box className="flex-row justify-between">
                <Text className="font-body-medium text-sm text-foreground">
                  Daily average
                </Text>
                <Text className="font-mono-semibold text-sm text-destructive">
                  {formatCurrency(cashFlow.totalOutflow / 30)}
                </Text>
              </Box>
            </>
          )}
        </FadeSlideIn>
      ) : (
        <Box className="mt-6 flex-row items-center justify-between border-t border-border pt-4">
          <Text className="font-body text-[13px] text-muted-foreground">
            Net this month
          </Text>
          <Text
            className={`font-mono-semibold text-[17px] ${net >= 0 ? "text-income" : "text-destructive"}`}
          >
            {formatCurrency(net)}
          </Text>
        </Box>
      )}
    </Box>
  );
}
