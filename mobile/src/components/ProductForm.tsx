import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { absoluteUrl, LocalImage, request, uploadImages } from '@/lib/api';
import { descriptionToText, textToDescription } from '@/lib/description';
import { parseDecimal, slugify } from '@/lib/format';
import {
  CatalogOptions,
  createProduct,
  deleteProduct,
  fetchCatalogOptions,
  ProductDetail,
  ProductPayload,
  updateProduct
} from '@/lib/queries';
import { colors, radius, space } from '@/lib/theme';
import { Button, Card, Chip, Field, SectionTitle, SwitchRow } from './ui';

type Photo = { kind: 'remote'; url: string } | ({ kind: 'local' } & LocalImage);

const decimalText = (n: number | null | undefined) => (n || n === 0 ? String(n).replace('.', ',') : '');

function initialPhotos(p?: ProductDetail): Photo[] {
  if (!p) return [];
  return [p.image, ...(p.gallery ?? [])]
    .filter((i): i is { url: string } => Boolean(i?.url))
    .map((i) => ({ kind: 'remote', url: i.url }));
}

/** Tipo de paquete para los productos con envío: el de por defecto o, si no hay ninguno, se crea como en scripts/import-shopify.mjs. */
async function ensurePackageId(options: CatalogOptions): Promise<number> {
  const existing = options.packages.find((p) => p.isDefault) ?? options.packages[0];
  if (existing) return existing.packageId;
  const { data } = await request<{ data: { package_id: number } }>('/api/packages', {
    method: 'POST',
    json: { name: 'Libro / material impreso', length: 30, width: 22, height: 5, weight: 0.05, is_default: true }
  });
  return data.package_id;
}

export function ProductForm({ product }: { product?: ProductDetail }) {
  const qc = useQueryClient();
  const isNew = !product;
  const options = useQuery({ queryKey: ['catalogOptions'], queryFn: fetchCatalogOptions });

  const initialDescription = descriptionToText(product?.description);
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [price, setPrice] = useState(decimalText(product?.price.regular.value));
  const [manageStock, setManageStock] = useState(product ? product.inventory.manageStock === 1 : true);
  const [qty, setQty] = useState(product ? String(product.inventory.qty ?? 0) : '1');
  const [available, setAvailable] = useState(product ? product.inventory.isInStock : true);
  const [enabled, setEnabled] = useState(product ? product.status === 1 : true);
  const [visible, setVisible] = useState(product ? product.visibility !== 0 : true);
  const [shippable, setShippable] = useState(product ? !product.noShippingRequired : true);
  const [weight, setWeight] = useState(product ? decimalText(product.weight?.value) : '0,5');
  const [categoryId, setCategoryId] = useState<number | null>(product?.category?.categoryId ?? null);
  const [taxClass, setTaxClass] = useState<number | null>(product?.taxClass ?? null);
  const [description, setDescription] = useState(initialDescription);
  const [photos, setPhotos] = useState<Photo[]>(() => initialPhotos(product));

  const addPhotos = async (source: 'library' | 'camera') => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Sin permiso', 'Permita el acceso a la cámara en los ajustes del teléfono.');
        return;
      }
      result = await ImagePicker.launchCameraAsync(opts);
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true, selectionLimit: 10 });
    }
    if (result.canceled) return;
    setPhotos((prev) => [
      ...prev,
      ...result.assets.map((a) => ({ kind: 'local' as const, uri: a.uri, fileName: a.fileName, mimeType: a.mimeType }))
    ]);
  };

  const makeMain = (index: number) => setPhotos((prev) => [prev[index], ...prev.filter((_, i) => i !== index)]);
  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['products'] });
    if (product) qc.invalidateQueries({ queryKey: ['product', product.productId] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const priceValue = parseDecimal(price);
      const qtyValue = Number.parseInt(qty, 10);
      const weightValue = parseDecimal(weight);
      if (!name.trim()) throw new Error('Escriba el nombre del artículo.');
      if (!sku.trim()) throw new Error('Escriba la referencia (SKU).');
      if (!Number.isFinite(priceValue) || priceValue < 0) throw new Error('El precio no es válido.');
      if (manageStock && (!Number.isFinite(qtyValue) || qtyValue < 0)) throw new Error('El stock debe ser un número entero.');
      if (shippable && (!Number.isFinite(weightValue) || weightValue <= 0)) throw new Error('Indique el peso en kg.');

      const opts = options.data ?? (await fetchCatalogOptions());
      const slug = slugify(name) || slugify(sku);
      const local = photos.filter((p): p is Extract<Photo, { kind: 'local' }> => p.kind === 'local');
      const uploaded = await uploadImages(`catalog/app/${slug || 'articulo'}`, local);
      let u = 0;
      const images = photos.map((p) => (p.kind === 'remote' ? p.url : uploaded[u++]));

      const payload: ProductPayload = {
        name: name.trim(),
        sku: sku.trim(),
        price: Math.round(priceValue * 100) / 100,
        qty: manageStock ? qtyValue : product?.inventory.qty ?? 0,
        manage_stock: manageStock ? 1 : 0,
        stock_availability: (manageStock ? qtyValue > 0 : available) ? 1 : 0,
        status: enabled ? 1 : 0,
        visibility: visible ? 1 : 0,
        no_shipping_required: !shippable,
        weight: shippable ? weightValue : 0,
        category_id: categoryId,
        tax_class: taxClass,
        images
      };
      if (shippable && !product?.package) payload.package_id = await ensurePackageId(opts);
      if (isNew || description !== initialDescription) {
        payload.description = textToDescription(description, slug || 'app');
      }

      if (product) {
        await updateProduct(product.uuid, payload);
        return;
      }
      const create = (urlKey: string) =>
        createProduct({ ...payload, url_key: urlKey, group_id: 1, meta_title: payload.name });
      try {
        await create(slug);
      } catch (e) {
        // La URL ya la usa otro artículo con el mismo nombre: se añade el SKU.
        if (!(e instanceof Error) || !/url/i.test(e.message)) throw e;
        await create(`${slug}-${slugify(sku)}`);
      }
    },
    onSuccess: () => {
      invalidate();
      router.back();
    },
    onError: (e) => Alert.alert('No se pudo guardar', e.message)
  });

  const remove = useMutation({
    mutationFn: () => deleteProduct(product!.uuid),
    onSuccess: () => {
      invalidate();
      router.back();
    },
    onError: (e) => Alert.alert('No se pudo borrar', e.message)
  });

  const confirmDelete = () =>
    Alert.alert('Borrar artículo', `¿Borrar «${product?.name}»? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => remove.mutate() }
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <SectionTitle>Fotos</SectionTitle>
        <Card>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(3) }}>
            {photos.map((p, i) => (
              <View key={(p.kind === 'remote' ? p.url : p.uri) + i}>
                <Pressable onPress={() => i > 0 && makeMain(i)} accessibilityLabel={i === 0 ? 'Foto principal' : 'Usar como principal'}>
                  <Image
                    source={{ uri: p.kind === 'remote' ? absoluteUrl(p.url) : p.uri }}
                    style={[styles.photo, i === 0 && styles.photoMain]}
                    contentFit="cover"
                  />
                </Pressable>
                {i === 0 ? <Text style={styles.photoTag}>Principal</Text> : null}
                <Pressable style={styles.photoRemove} onPress={() => removePhoto(i)} hitSlop={8} accessibilityLabel="Quitar foto">
                  <Ionicons name="close" size={14} color={colors.white} />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addPhoto} onPress={() => addPhotos('library')} accessibilityLabel="Añadir fotos de la galería">
              <Ionicons name="images-outline" size={24} color={colors.brand} />
              <Text style={styles.addPhotoText}>Galería</Text>
            </Pressable>
            {Platform.OS !== 'web' ? (
              <Pressable style={styles.addPhoto} onPress={() => addPhotos('camera')} accessibilityLabel="Hacer una foto">
                <Ionicons name="camera-outline" size={24} color={colors.brand} />
                <Text style={styles.addPhotoText}>Cámara</Text>
              </Pressable>
            ) : null}
          </ScrollView>
          {photos.length > 1 ? <Text style={styles.hint}>Toque una foto para ponerla como principal.</Text> : null}
        </Card>

        <SectionTitle>Datos</SectionTitle>
        <Card>
          <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ej.: Historia de al-Ándalus" />
          <Field label="Referencia (SKU)" value={sku} onChangeText={setSku} autoCapitalize="characters" autoCorrect={false} />
          <Field label="Precio (€, IVA incluido)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0,00" />
          <Field
            label="Descripción"
            value={description}
            onChangeText={setDescription}
            multiline
            hint="Separe los párrafos con una línea en blanco. Para negritas, títulos o columnas use el panel web."
          />
        </Card>

        <SectionTitle>Inventario</SectionTitle>
        <Card>
          <SwitchRow label="Controlar stock" value={manageStock} onValueChange={setManageStock} />
          {manageStock ? (
            <Field label="Unidades en stock" value={qty} onChangeText={setQty} keyboardType="number-pad" />
          ) : (
            <SwitchRow label="Disponible para la venta" value={available} onValueChange={setAvailable} />
          )}
        </Card>

        <SectionTitle>Envío</SectionTitle>
        <Card>
          <SwitchRow
            label="Requiere envío"
            hint="Desactívelo para productos digitales, cursos o donativos."
            value={shippable}
            onValueChange={setShippable}
          />
          {shippable ? <Field label="Peso (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /> : null}
        </Card>

        <SectionTitle>Organización</SectionTitle>
        <Card>
          <Text style={styles.label}>Categoría</Text>
          <View style={styles.chips}>
            <Chip label="Ninguna" selected={categoryId === null} onPress={() => setCategoryId(null)} />
            {options.data?.categories.map((c) => (
              <Chip key={c.categoryId} label={c.name} selected={categoryId === c.categoryId} onPress={() => setCategoryId(c.categoryId)} />
            ))}
          </View>
          <Text style={styles.label}>Impuesto</Text>
          <View style={styles.chips}>
            <Chip label="Ninguno" selected={taxClass === null} onPress={() => setTaxClass(null)} />
            {options.data?.taxClasses.map((t) => (
              <Chip key={t.taxClassId} label={t.name} selected={taxClass === t.taxClassId} onPress={() => setTaxClass(t.taxClassId)} />
            ))}
          </View>
          <SwitchRow label="Activo" hint="Si está desactivado no se puede comprar." value={enabled} onValueChange={setEnabled} />
          <SwitchRow label="Visible en la tienda" value={visible} onValueChange={setVisible} />
        </Card>

        <Button title={isNew ? 'Crear artículo' : 'Guardar cambios'} onPress={() => save.mutate()} loading={save.isPending} />
        {product ? (
          <Button
            title="Borrar artículo"
            variant="secondary"
            onPress={confirmDelete}
            loading={remove.isPending}
            style={{ marginTop: space(3) }}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space(4), paddingBottom: space(12) },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: space(2) },
  hint: { fontSize: 12, color: colors.inkMute, marginTop: space(2) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginBottom: space(4) },
  photo: { width: 88, height: 88, borderRadius: radius, backgroundColor: colors.smoke },
  photoMain: { borderWidth: 2, borderColor: colors.brand },
  photoTag: { fontSize: 11, color: colors.brandInk, fontWeight: '600', textAlign: 'center', marginTop: space(1) },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  addPhoto: {
    width: 88,
    height: 88,
    borderRadius: radius,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(1)
  },
  addPhotoText: { fontSize: 12, color: colors.brandInk }
});
