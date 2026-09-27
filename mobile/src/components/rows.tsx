import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { absoluteUrl } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { OrderSummary, ProductSummary } from '@/lib/queries';
import { paymentLabel, shipmentLabel } from '@/lib/status';
import { colors, radius, space } from '@/lib/theme';
import { Badge } from './ui';

export function OrderRow({ order }: { order: OrderSummary }) {
  const pay = paymentLabel(order.paymentStatus);
  const ship = shipmentLabel(order.shipmentStatus);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/order/[uuid]', params: { uuid: order.uuid } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Pedido ${order.orderNumber}`}
    >
      <View style={{ flex: 1, gap: space(1) }}>
        <View style={styles.line}>
          <Text style={styles.title}>#{order.orderNumber}</Text>
          <Text style={styles.amount}>{order.grandTotal.text}</Text>
        </View>
        <Text style={styles.sub} numberOfLines={1}>
          {order.customerFullName || order.customerEmail || 'Cliente sin nombre'} · {formatDate(order.createdAt)}
        </Text>
        <View style={styles.badges}>
          {order.status?.code === 'canceled' ? (
            <Badge label="Cancelado" tone="danger" />
          ) : (
            <>
              <Badge label={pay.label} tone={pay.tone} />
              <Badge label={ship.label} tone={ship.tone} />
            </>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkMute} />
    </Pressable>
  );
}

export function ProductRow({ product }: { product: ProductSummary }) {
  const uri = absoluteUrl(product.image?.url);
  const { qty, manageStock, isInStock } = product.inventory;
  const stockTone = !isInStock || (manageStock && qty <= 0) ? 'danger' : manageStock && qty < 5 ? 'warning' : 'success';
  const stockText = manageStock ? `${qty} en stock` : isInStock ? 'Disponible' : 'Agotado';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(product.productId) } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={product.name}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.thumb} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Ionicons name="image-outline" size={22} color={colors.inkMute} />
        </View>
      )}
      <View style={{ flex: 1, gap: space(1) }}>
        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.sub}>
          {product.price.regular.text} · SKU {product.sku}
        </Text>
        <View style={styles.badges}>
          <Badge label={stockText} tone={stockTone} />
          {product.status !== 1 ? <Badge label="Desactivado" tone="neutral" /> : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkMute} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: colors.white,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line
  },
  pressed: { backgroundColor: colors.smoke },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space(2) },
  title: { fontSize: 16, fontWeight: '600', color: colors.ink, flexShrink: 1 },
  amount: { fontSize: 16, fontWeight: '700', color: colors.ink },
  sub: { fontSize: 13, color: colors.inkSoft },
  badges: { flexDirection: 'row', gap: space(1.5), flexWrap: 'wrap', marginTop: space(0.5) },
  thumb: { width: 56, height: 56, borderRadius: radius, backgroundColor: colors.smoke },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' }
});
