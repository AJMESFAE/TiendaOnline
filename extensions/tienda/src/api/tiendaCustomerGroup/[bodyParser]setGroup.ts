import { error } from '@evershop/evershop/lib/log';
import { setCustomerGroup } from '../../services/customerGroups.js';

/** PUT /api/tienda/customers/:id/group — cambia el grupo de un cliente (panel de gestión). */
export default async (request, response) => {
  try {
    const group = await setCustomerGroup(String(request.params.id), Number(request.body.group_id));
    if (!group) {
      return response.status(400).json({ error: { status: 400, message: 'Cliente o grupo no válido' } });
    }
    response.status(200).json({ data: { groupId: group.customer_group_id, groupName: group.group_name } });
  } catch (e) {
    error(e);
    response.status(500).json({ error: { status: 500, message: 'No se pudo cambiar el grupo' } });
  }
};
