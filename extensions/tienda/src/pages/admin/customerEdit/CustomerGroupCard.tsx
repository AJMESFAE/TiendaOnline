import { Button } from '@components/common/ui/Button.js';
import { toast } from '@components/common/ui/Sonner.js';
import React from 'react';

interface Props {
  customer?: { uuid: string; group?: { customerGroupId: number; groupName: string } | null } | null;
  customerGroups?: { items: { customerGroupId: number; groupName: string }[] } | null;
}

/** Grupo del cliente (p. ej. INSTITUTO), para los cupones limitados a un grupo. */
export default function CustomerGroupCard({ customer, customerGroups }: Props) {
  const groups = customerGroups?.items || [];
  const [groupId, setGroupId] = React.useState(String(customer?.group?.customerGroupId ?? 1));
  const [saving, setSaving] = React.useState(false);
  if (!customer?.uuid || groups.length === 0) return null;
  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tienda/customers/${customer.uuid}/group`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: Number(groupId) })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
      toast.success(`Grupo guardado: ${json.data.groupName}`);
    } catch (e: any) {
      toast.error(`No se pudo guardar el grupo: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="tienda-customer-group rounded-lg border border-border bg-white p-5">
      <h2 className="mb-1 text-base font-semibold">Grupo de cliente</h2>
      <p className="mb-3 text-sm text-muted-foreground">Los cupones limitados a un grupo solo los puede usar quien pertenece a él.</p>
      <div className="flex items-center gap-3">
        <select
          className="h-9 rounded-md border border-border bg-white px-3 text-sm"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          aria-label="Grupo de cliente"
        >
          {groups.map((g) => (
            <option key={g.customerGroupId} value={g.customerGroupId}>
              {g.groupName}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={save} isLoading={saving}>
          Guardar
        </Button>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
};

export const query = `
  query Query {
    customer(id: getContextValue("customerUuid", null)) {
      uuid
      group {
        customerGroupId
        groupName
      }
    }
    customerGroups {
      items {
        customerGroupId
        groupName
      }
    }
  }
`;
