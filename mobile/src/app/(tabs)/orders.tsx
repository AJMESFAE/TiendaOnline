import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OrderRow } from '@/components/rows';
import { SearchBar } from '@/components/SearchBar';
import { Chip, Empty, ErrorView, Loading } from '@/components/ui';
import { fetchOrders, ORDER_FILTERS, OrderFilter, PAGE_SIZE } from '@/lib/queries';
import { colors, space } from '@/lib/theme';

export default function Orders() {
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [keyword, setKeyword] = useState('');

  const query = useInfiniteQuery({
    queryKey: ['orders', filter, keyword],
    queryFn: ({ pageParam }) => fetchOrders({ filter, keyword, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * PAGE_SIZE < last.total ? last.page + 1 : undefined)
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <SearchBar placeholder="Nº de pedido, nombre o email" onSearch={setKeyword} />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {ORDER_FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </ScrollView>
      </View>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorView error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.uuid}
          renderItem={({ item }) => <OrderRow order={item} />}
          ListHeaderComponent={
            <Text style={styles.count}>
              {total} {total === 1 ? 'pedido' : 'pedidos'}
            </Text>
          }
          ListEmptyComponent={<Empty text="No hay pedidos con estos filtros." />}
          ListFooterComponent={
            query.isFetchingNextPage ? <ActivityIndicator style={{ margin: space(4) }} color={colors.brand} /> : null
          }
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={() => query.refetch()}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: space(2), paddingHorizontal: space(4), paddingVertical: space(3) },
  count: { color: colors.inkMute, fontSize: 13, paddingHorizontal: space(4), paddingBottom: space(2) }
});
