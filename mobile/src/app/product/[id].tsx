import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ProductForm } from '@/components/ProductForm';
import { ErrorView, Loading } from '@/components/ui';
import { fetchProduct } from '@/lib/queries';

export default function EditProduct() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const query = useQuery({ queryKey: ['product', productId], queryFn: () => fetchProduct(productId) });
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorView error={query.error} onRetry={() => query.refetch()} />;
  return (
    <>
      <Stack.Screen options={{ title: query.data.name }} />
      <ProductForm product={query.data} />
    </>
  );
}
