import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { AiWidget } from '@/components/ai/AiWidget';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { NetWorthCard } from '@/components/charts/NetWorthCard';
import { SpendingChart } from '@/components/charts/SpendingChart';
import { FadeSlideIn } from '@/components/ui/FadeSlideIn';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { mockBalanceSheet, mockCashFlow, mockQuickPrompts, mockSpendingCategories } from '@/data/mockAnalytics';

export default function AnalyticsScreen() {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: tabBarHeight + 24 }} showsVerticalScrollIndicator={false}>
        <FadeSlideIn className="mb-6">
          <Text className="font-body text-sm text-muted-foreground">Financial health</Text>
          <Text className="mt-0.5 font-display-bold text-[30px] tracking-[-0.6px] text-foreground">Analytics & Insights</Text>
        </FadeSlideIn>

        <FadeSlideIn delay={60}>
          <AiWidget
            prompts={mockQuickPrompts}
            spendingCategories={mockSpendingCategories}
            cashFlow={mockCashFlow}
            balanceSheet={mockBalanceSheet}
          />
        </FadeSlideIn>

        <FadeSlideIn delay={120} className="mt-6">
          <SpendingChart categories={mockSpendingCategories} />
        </FadeSlideIn>

        <FadeSlideIn delay={180} className="mt-6">
          <CashFlowChart cashFlow={mockCashFlow} />
        </FadeSlideIn>

        <FadeSlideIn delay={240} className="mt-6">
          <NetWorthCard balanceSheet={mockBalanceSheet} />
        </FadeSlideIn>
      </ScrollView>
    </SafeAreaView>
  );
}
