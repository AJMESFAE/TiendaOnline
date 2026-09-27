import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ProductRow } from '@/components/rows';
import { SearchBar } from '@/components/SearchBar';
import { Empty, ErrorView, Loading } from '@/components/ui';
import { fetchProducts, PAGE_SIZE } from '@/lib/queries';
import { colors, space } from '@/lib/theme';

export default function Products() {
  const [keyword, setKeyword] = useState('');

  const query = useInfiniteQuery({
    queryKey: ['products', keyword],
    queryFn: ({ pageParam }) => fetchProducts({ keyword, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * PAGE_SIZE < last.total ? last.page + 1 : undefined)
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <SearchBar placeholder="Buscar artículos" onSearch={setKeyword} />
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorView error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.uuid}
          renderItem={({ item }) => <ProductRow product={item} />}
          ListHeaderComponent={
            <Text style={styles.count}>
              {total} {total === 1 ? 'artículo' : 'artículos'}
            </Text>
          }
          ListEmptyComponent={<Empty text={keyword ? 'Ningún artículo coincide con la búsqueda.' : 'Todavía no hay artículos.'} />}
          ListFooterComponent={
            query.isFetchingNextPage ? <ActivityIndicator style={{ margin: space(4) }} color={colors.brand} /> : <View style={{ height: 96 }} />
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
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        onPress={() => router.push('/product/new')}
        accessibilityRole="button"
        accessibilityLabel="Nuevo artículo"
      >
        <Ionicons name="add" size={24} color={colors.white} />
        <Text style={styles.fabText}>Nuevo artículo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  count: { color: colors.inkMute, fontSize: 13, paddingHorizontal: space(4), paddingVertical: space(2) },
  fab: {
    position: 'absolute',
    right: space(4),
    bottom: space(4),
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    backgroundColor: colors.brand,
    borderRadius: 999,
    paddingHorizontal: space(5),
    paddingVertical: space(3.5),
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }
  },
  fabText: { color: colors.white, fontWeight: '700', fontSize: 15 }
});
