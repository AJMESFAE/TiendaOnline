import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OrderRow } from '@/components/rows';
import { Card, Chip, ErrorView, SectionTitle } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { fetchLifetimeSales, fetchOrders, fetchSalesStatistic } from '@/lib/queries';
import { colors, space } from '@/lib/theme';

type Period = 'daily' | 'weekly' | 'monthly';
const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Días' },
  { key: 'weekly', label: 'Semanas' },
  { key: 'monthly', label: 'Meses' }
];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// EverShop etiqueta los periodos en inglés ("Sep 27"): se pasan a "27 sept".
const MONTHS: Record<string, string> = {
  Jan: 'ene', Feb: 'feb', Mar: 'mar', Apr: 'abr', May: 'may', Jun: 'jun',
  Jul: 'jul', Aug: 'ago', Sep: 'sept', Oct: 'oct', Nov: 'nov', Dec: 'dic'
};
const periodLabel = (time: string) => {
  const [mon, day] = time.split(' ');
  return MONTHS[mon] && day ? `${Number(day)} ${MONTHS[mon]}` : time;
};

function SalesChart({ period }: { period: Period }) {
  const stats = useQuery({ queryKey: ['salestatistic', period], queryFn: () => fetchSalesStatistic(period) });
  const [selected, setSelected] = useState<number | null>(null);
  if (stats.isError) return <Text style={styles.muted}>No se pudieron cargar las ventas.</Text>;
  const data = (stats.data ?? []).map((d) => ({ time: periodLabel(d.time), total: Number(d.total) || 0, count: Number(d.count) || 0 }));
  const max = Math.max(1, ...data.map((d) => d.total));
  const shown = selected ?? data.length - 1;
  const current = data[shown];
  return (
    <View>
      <Text style={styles.chartValue}>{current ? formatMoney(current.total) : '—'}</Text>
      <Text style={styles.muted}>
        {current ? `${current.time} · ${current.count} ${current.count === 1 ? 'pedido' : 'pedidos'}` : ' '}
      </Text>
      <View style={styles.chart} accessibilityRole="summary">
        {data.map((d, i) => (
          <Pressable
            key={d.time + i}
            style={styles.barSlot}
            onPress={() => setSelected(i)}
            accessibilityLabel={`${d.time}: ${formatMoney(d.total)}, ${d.count} pedidos`}
          >
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  { height: `${Math.max(2, (d.total / max) * 100)}%`, opacity: i === shown ? 1 : 0.55 }
                ]}
              />
            </View>
            <Text style={[styles.barLabel, i === shown && { color: colors.ink, fontWeight: '600' }]} numberOfLines={1}>
              {d.time}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function Home() {
  const [period, setPeriod] = useState<Period>('daily');
  const lifetime = useQuery({ queryKey: ['lifetimesales'], queryFn: fetchLifetimeSales });
  const pending = useQuery({
    queryKey: ['orders', 'toShip', 'home'],
    queryFn: () => fetchOrders({ filter: 'toShip', page: 1, limit: 5 })
  });

  const refreshing = lifetime.isRefetching || pending.isRefetching;
  const refresh = () => {
    lifetime.refetch();
    pending.refetch();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
    >
      {lifetime.isError ? (
        <Card>
          <ErrorView error={lifetime.error} onRetry={() => lifetime.refetch()} />
        </Card>
      ) : (
        <Card style={styles.stats}>
          <Stat label="Importe total" value={lifetime.data?.total ?? '—'} />
          <Stat label="Pedidos" value={lifetime.data?.orders ?? '—'} />
          <Stat label="Por enviar" value={pending.data?.total ?? '—'} />
        </Card>
      )}

      <Card>
        <SectionTitle>Pedidos recientes</SectionTitle>
        <View style={styles.periods}>
          {PERIODS.map((p) => (
            <Chip key={p.key} label={p.label} selected={period === p.key} onPress={() => setPeriod(p.key)} />
          ))}
        </View>
        <SalesChart key={period} period={period} />
      </Card>

      <SectionTitle
        right={
          <Pressable onPress={() => router.navigate('/orders')} hitSlop={8}>
            <Text style={styles.link}>Ver todos</Text>
          </Pressable>
        }
      >
        Pedidos por enviar
      </SectionTitle>
      <View style={styles.list}>
        {pending.isError ? (
          <ErrorView error={pending.error} onRetry={() => pending.refetch()} />
        ) : pending.data?.items.length === 0 ? (
          <Text style={[styles.muted, { padding: space(4) }]}>No hay pedidos pendientes de envío.</Text>
        ) : (
          pending.data?.items.map((o) => <OrderRow key={o.uuid} order={o} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space(4) },
  stats: { flexDirection: 'row', gap: space(2) },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.ink },
  statLabel: { fontSize: 12, color: colors.inkSoft, marginTop: space(1) },
  periods: { flexDirection: 'row', gap: space(2), marginBottom: space(3) },
  chartValue: { fontSize: 22, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 13, color: colors.inkMute },
  link: { fontSize: 14, color: colors.brand, fontWeight: '600' },
  chart: {
    flexDirection: 'row',
    height: 160,
    marginTop: space(3),
    gap: space(2)
  },
  barSlot: { flex: 1, alignItems: 'center' },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line
  },
  bar: { width: '60%', maxWidth: 28, backgroundColor: colors.brand, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabel: { fontSize: 10, color: colors.inkMute, marginTop: space(1) },
  list: { backgroundColor: colors.white, borderRadius: 10, overflow: 'hidden', marginBottom: space(6) }
});
