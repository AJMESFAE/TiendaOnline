import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '@/components/Sheet';
import { Badge, Button, Card, Chip, ErrorView, Field, Loading, Row, SectionTitle, SwitchRow } from '@/components/ui';
import { absoluteUrl } from '@/lib/api';
import { formatDate, formatMoney, parseDecimal } from '@/lib/format';
import {
  cancelOrder,
  createShipment,
  fetchCarriers,
  fetchOrder,
  markShipmentDelivered,
  OrderDetail,
  refundRedsys
} from '@/lib/queries';
import { isRedsysRefundable, paymentLabel, shipmentLabel } from '@/lib/status';
import { colors, radius, space } from '@/lib/theme';

type Address = OrderDetail['shippingAddress'];

function AddressBlock({ address }: { address: Address }) {
  if (!address) return <Text style={styles.muted}>Sin dirección</Text>;
  const lines = [
    address.fullName,
    address.address1,
    address.address2,
    [address.postcode, address.city].filter(Boolean).join(' '),
    [address.province?.name, address.country?.name].filter(Boolean).join(', ')
  ].filter(Boolean);
  return (
    <View>
      {lines.map((l, i) => (
        <Text key={i} style={styles.text} selectable>
          {l}
        </Text>
      ))}
      {address.telephone ? (
        <Pressable onPress={() => Linking.openURL(`tel:${address.telephone}`)} style={styles.inlineLink}>
          <Ionicons name="call-outline" size={16} color={colors.brand} />
          <Text style={styles.link}>{address.telephone}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ShipSheet({ order, visible, onClose }: { order: OrderDetail; visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const carriers = useQuery({ queryKey: ['carriers'], queryFn: fetchCarriers, enabled: visible });
  const [carrier, setCarrier] = useState('custom');
  const [tracking, setTracking] = useState('');
  const [notify, setNotify] = useState(true);
  const mutation = useMutation({
    mutationFn: () => createShipment(order, { carrier, trackingNumber: tracking, notifyCustomer: notify }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', order.uuid] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      setTracking('');
      onClose();
    },
    onError: (e) => Alert.alert('No se pudo registrar el envío', e.message)
  });
  return (
    <Sheet visible={visible} title="Marcar como enviado" onClose={onClose}>
      <Text style={styles.label}>Artículos</Text>
      {order.unshippedItems.map((i) => (
        <Text key={i.orderItemId} style={styles.text}>
          {i.qtyUnshipped} × {i.productName}
        </Text>
      ))}
      <Text style={[styles.label, { marginTop: space(4) }]}>Transportista</Text>
      <View style={styles.chipsWrap}>
        {(carriers.data ?? [{ code: 'custom', name: 'Otro' }]).map((c) => (
          <Chip
            key={c.code}
            label={c.code === 'custom' ? 'Otro / Correos' : c.name}
            selected={carrier === c.code}
            onPress={() => setCarrier(c.code)}
          />
        ))}
      </View>
      <Field
        label="Número de seguimiento (opcional)"
        value={tracking}
        onChangeText={setTracking}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <SwitchRow label="Avisar al cliente por email" value={notify} onValueChange={setNotify} />
      <Button title="Confirmar envío" onPress={() => mutation.mutate()} loading={mutation.isPending} style={{ marginTop: space(3) }} />
    </Sheet>
  );
}

function CancelSheet({ order, visible, onClose }: { order: OrderDetail; visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: () => cancelOrder(order.uuid, reason.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', order.uuid] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['lifetimesales'] });
      onClose();
    },
    onError: (e) => Alert.alert('No se pudo cancelar', e.message)
  });
  return (
    <Sheet visible={visible} title={`Cancelar pedido #${order.orderNumber}`} onClose={onClose}>
      <Text style={[styles.text, { marginBottom: space(4) }]}>
        El pedido se cancela y se repone el stock. Si ya estaba cobrado, haga también la devolución del importe.
      </Text>
      <Field label="Motivo" value={reason} onChangeText={setReason} multiline placeholder="Ej.: el cliente lo ha pedido por email" />
      <Button
        title="Cancelar pedido"
        variant="danger"
        onPress={() => mutation.mutate()}
        disabled={!reason.trim()}
        loading={mutation.isPending}
      />
    </Sheet>
  );
}

function RefundSheet({ order, visible, onClose }: { order: OrderDetail; visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(order.grandTotal.value.toFixed(2).replace('.', ','));
  const value = parseDecimal(amount);
  const mutation = useMutation({
    mutationFn: () => refundRedsys(order.uuid, value),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['order', order.uuid] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      onClose();
      Alert.alert('Devolución hecha', `Se han devuelto ${formatMoney(Number(res.data.amount))} a la tarjeta del cliente.`);
    },
    onError: (e) => Alert.alert('No se pudo devolver', e.message)
  });
  return (
    <Sheet visible={visible} title="Devolver importe (Redsys)" onClose={onClose}>
      <Text style={[styles.text, { marginBottom: space(4) }]}>
        La devolución se hace por el TPV de Redsys a la tarjeta o Bizum con que se pagó. Puede ser total o parcial.
      </Text>
      <Field label="Importe (€)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" hint={`Total del pedido: ${order.grandTotal.text}`} />
      <Button
        title={Number.isFinite(value) && value > 0 ? `Devolver ${formatMoney(value)}` : 'Devolver'}
        variant="danger"
        onPress={() =>
          Alert.alert('Confirmar devolución', `¿Devolver ${formatMoney(value)} al cliente? No se puede deshacer.`, [
            { text: 'No', style: 'cancel' },
            { text: 'Devolver', style: 'destructive', onPress: () => mutation.mutate() }
          ])
        }
        disabled={!(Number.isFinite(value) && value > 0)}
        loading={mutation.isPending}
      />
    </Sheet>
  );
}

export default function OrderScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['order', uuid], queryFn: () => fetchOrder(uuid) });
  const [sheet, setSheet] = useState<'ship' | 'cancel' | 'refund' | null>(null);

  const delivered = useMutation({
    mutationFn: markShipmentDelivered,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', uuid] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => Alert.alert('No se pudo marcar como entregado', e.message)
  });

  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorView error={query.error} onRetry={() => query.refetch()} />;
  const order = query.data;

  const pay = paymentLabel(order.paymentStatus);
  const ship = shipmentLabel(order.shipmentStatus);
  const isCanceled = order.shipmentStatus?.code === 'canceled' || order.status?.code === 'canceled';
  const canShip = !isCanceled && order.unshippedItems.length > 0;
  const canCancel = !isCanceled && Boolean(order.paymentStatus?.isCancelable);
  const canRefund = isRedsysRefundable(order.paymentMethod, order.paymentStatus?.code);

  return (
    <>
      <Stack.Screen options={{ title: `Pedido #${order.orderNumber}` }} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.brand} colors={[colors.brand]} />
        }
      >
        <Card>
          <View style={styles.headerRow}>
            <Text style={styles.total}>{order.grandTotal.text}</Text>
            <View style={styles.badges}>
              {isCanceled ? (
                <Badge label="Cancelado" tone="danger" />
              ) : (
                <>
                  <Badge label={pay.label} tone={pay.tone} />
                  <Badge label={ship.label} tone={ship.tone} />
                </>
              )}
            </View>
          </View>
          <Text style={styles.muted}>{formatDate(order.createdAt)}</Text>
          <Text style={styles.muted}>
            {order.paymentMethodName || order.paymentMethod || 'Pago'}
            {order.noShippingRequired ? ' · Sin envío' : order.shippingMethodName ? ` · ${order.shippingMethodName}` : ''}
          </Text>
        </Card>

        {canShip || canCancel || canRefund ? (
          <Card>
            {canShip ? <Button title="Marcar como enviado" onPress={() => setSheet('ship')} /> : null}
            {canRefund ? (
              <Button title="Devolver importe" variant="secondary" onPress={() => setSheet('refund')} style={{ marginTop: canShip ? space(3) : 0 }} />
            ) : null}
            {canCancel ? (
              <Button
                title="Cancelar pedido"
                variant="secondary"
                onPress={() => setSheet('cancel')}
                style={{ marginTop: canShip || canRefund ? space(3) : 0 }}
              />
            ) : null}
          </Card>
        ) : null}

        <SectionTitle>Artículos ({order.totalQty})</SectionTitle>
        <Card>
          {order.items.map((item) => {
            const uri = absoluteUrl(item.thumbnail);
            return (
              <View key={item.orderItemId} style={styles.item}>
                {uri ? <Image source={{ uri }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.muted}>
                    {item.qty} × {item.finalPriceInclTax.text} · SKU {item.productSku}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>{item.lineTotalInclTax.text}</Text>
              </View>
            );
          })}
          <View style={styles.divider} />
          <Row label="Subtotal" value={order.subTotalInclTax.text} />
          <Row label="Envío" value={order.shippingFeeInclTax.text} />
          {order.discountAmount.value > 0 ? (
            <Row label={`Descuento${order.coupon ? ` (${order.coupon})` : ''}`} value={`−${order.discountAmount.text}`} />
          ) : null}
          <Row label="IVA incluido" value={order.totalTaxAmount.text} />
          <Row label="Total" value={<Text style={styles.totalSmall}>{order.grandTotal.text}</Text>} />
        </Card>

        {order.shipments.length > 0 ? (
          <>
            <SectionTitle>Envíos</SectionTitle>
            {order.shipments.map((s) => {
              const st = shipmentLabel(s.status);
              return (
                <Card key={s.uuid}>
                  <View style={styles.headerRow}>
                    <Text style={styles.itemName}>{s.carrierName || s.carrier || 'Envío'}</Text>
                    <Badge label={st.label} tone={st.tone} />
                  </View>
                  {s.trackingNumber ? (
                    <Pressable
                      disabled={!s.trackingUrl}
                      onPress={() => s.trackingUrl && Linking.openURL(s.trackingUrl)}
                      style={styles.inlineLink}
                    >
                      <Ionicons name="navigate-outline" size={16} color={colors.brand} />
                      <Text style={s.trackingUrl ? styles.link : styles.text} selectable>
                        {s.trackingNumber}
                      </Text>
                    </Pressable>
                  ) : null}
                  {s.shippedAt ? <Text style={styles.muted}>Enviado: {formatDate(s.shippedAt)}</Text> : null}
                  {s.deliveredAt ? <Text style={styles.muted}>Entregado: {formatDate(s.deliveredAt)}</Text> : null}
                  {s.items.map((i, idx) => (
                    <Text key={idx} style={styles.text}>
                      {i.qty} × {i.productName}
                    </Text>
                  ))}
                  {s.phase === 'shipped' ? (
                    <Button
                      title="Marcar como entregado"
                      variant="secondary"
                      loading={delivered.isPending && delivered.variables === s.uuid}
                      onPress={() => delivered.mutate(s.uuid)}
                      style={{ marginTop: space(3) }}
                    />
                  ) : null}
                </Card>
              );
            })}
          </>
        ) : null}

        <SectionTitle>Cliente</SectionTitle>
        <Card>
          <Text style={styles.itemName}>{order.customerFullName || 'Sin nombre'}</Text>
          {order.customerEmail ? (
            <Pressable onPress={() => Linking.openURL(`mailto:${order.customerEmail}`)} style={styles.inlineLink}>
              <Ionicons name="mail-outline" size={16} color={colors.brand} />
              <Text style={styles.link}>{order.customerEmail}</Text>
            </Pressable>
          ) : null}
          {order.shippingNote ? (
            <View style={styles.note}>
              <Text style={styles.label}>Nota del cliente</Text>
              <Text style={styles.text}>{order.shippingNote}</Text>
            </View>
          ) : null}
        </Card>

        {!order.noShippingRequired ? (
          <>
            <SectionTitle>Dirección de envío</SectionTitle>
            <Card>
              <AddressBlock address={order.shippingAddress} />
            </Card>
          </>
        ) : null}
        <SectionTitle>Dirección de facturación</SectionTitle>
        <Card>
          <AddressBlock address={order.billingAddress} />
        </Card>

        {order.activities?.length ? (
          <>
            <SectionTitle>Historial</SectionTitle>
            <Card>
              {order.activities.map((a, i) => (
                <View key={i} style={styles.activity}>
                  <Text style={styles.text}>{a.comment}</Text>
                  <Text style={styles.muted}>{formatDate(a.createdAt)}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>

      <ShipSheet order={order} visible={sheet === 'ship'} onClose={() => setSheet(null)} />
      <CancelSheet order={order} visible={sheet === 'cancel'} onClose={() => setSheet(null)} />
      {canRefund ? <RefundSheet order={order} visible={sheet === 'refund'} onClose={() => setSheet(null)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: space(4), paddingBottom: space(10) },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space(2), marginBottom: space(1) },
  badges: { flexDirection: 'row', gap: space(1.5), flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 1 },
  total: { fontSize: 26, fontWeight: '700', color: colors.ink },
  totalSmall: { fontSize: 16, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 13, color: colors.inkMute, marginTop: space(0.5) },
  text: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: space(1.5) },
  link: { fontSize: 15, color: colors.brand, fontWeight: '500' },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), paddingVertical: space(1.5) },
  item: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(2) },
  itemName: { fontSize: 15, fontWeight: '600', color: colors.ink },
  itemTotal: { fontSize: 15, fontWeight: '600', color: colors.ink },
  thumb: { width: 44, height: 44, borderRadius: radius / 2, backgroundColor: colors.smoke },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: space(2) },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginBottom: space(4) },
  note: { marginTop: space(3), padding: space(3), backgroundColor: colors.warningSoft, borderRadius: radius },
  activity: { paddingVertical: space(2), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }
});
