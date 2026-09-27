import React, { useEffect, useState } from 'react';

/** Aviso en el carrito al volver del TPV sin haber completado el pago. */
export default function RedsysPaymentNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(new URLSearchParams(window.location.search).get('payment') === 'failed');
  }, []);
  if (!show) return null;
  return (
    <div
      role="alert"
      className="mx-auto mt-6 max-w-3xl rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900"
    >
      <strong>El pago no se ha completado.</strong> No se ha realizado ningún cargo y tus productos
      siguen en el carrito. Puedes volver a intentarlo cuando quieras.
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 1
};
