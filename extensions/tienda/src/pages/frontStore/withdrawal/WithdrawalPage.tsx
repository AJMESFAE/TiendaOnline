import { Button } from '@components/common/ui/Button.js';
import { Card, CardContent } from '@components/common/ui/Card.js';
import { Input } from '@components/common/ui/Input.js';
import { Label } from '@components/common/ui/Label.js';
import { Textarea } from '@components/common/ui/Textarea.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface Props {
  currentCustomer?: { email?: string; fullName?: string } | null;
  /** Pedido del enlace firmado de los correos: el cliente solo tiene que confirmar. */
  withdrawalOrder?: { orderNumber: string; email: string; fullName?: string | null; token: string } | null;
  homeUrl: string;
}

interface Result {
  id: number;
  orderNumber: string;
  receivedAt: string;
  email: string;
}

/**
 * Función de desistimiento (Directiva (UE) 2023/2673): el cliente indica su nombre,
 * el pedido y el correo del acuse, y lo confirma con «Confirmar desistimiento».
 */
export default function WithdrawalPage({ currentCustomer, withdrawalOrder, homeUrl }: Props) {
  const termsUrl = `${String(homeUrl || '').replace(/\/+$/, '')}/condiciones-de-venta`;
  const [form, setForm] = React.useState({
    orderNumber: withdrawalOrder?.orderNumber || '',
    email: withdrawalOrder?.email || currentCustomer?.email || '',
    fullName: withdrawalOrder?.fullName || currentCustomer?.fullName || '',
    items: '',
    comment: ''
  });
  const [sending, setSending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);

  React.useEffect(() => {
    const order = new URLSearchParams(window.location.search).get('order');
    if (order) setForm((f) => ({ ...f, orderNumber: order.replace(/[^\w-]/g, '').slice(0, 40) }));
  }, []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      const payload: Record<string, string> = withdrawalOrder
        ? { token: withdrawalOrder.token, fullName: form.fullName.trim() }
        : { orderNumber: form.orderNumber.trim(), email: form.email.trim(), fullName: form.fullName.trim() };
      if (form.items.trim()) payload.items = form.items.trim();
      if (form.comment.trim()) payload.comment = form.comment.trim();
      const res = await fetch('/api/tienda/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || _('Something went wrong. Please try again or write to us.'));
      setResult(json.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-width tienda-withdrawal flex flex-col items-center py-10">
      <div className="w-full max-w-xl">
        <Card className="rounded-lg border border-border py-8 shadow-none ring-0">
          <CardContent className="px-8">
            {result ? (
              <div role="status">
                <h1 className="mb-3 text-2xl font-semibold tracking-tight">{_('Withdrawal received')}</h1>
                <p className="mb-4 text-muted-foreground">
                  {_('We have registered your withdrawal from order #${number} on ${date}.', {
                    number: result.orderNumber,
                    date: result.receivedAt
                  })}
                </p>
                <p className="mb-4">
                  {_('We have sent the acknowledgement of receipt to ${email}. Reference: ${id}.', {
                    email: result.email,
                    id: String(result.id)
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {_('Please return the products within 14 days. We will refund you within 14 days, including the standard shipping costs.')}
                </p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate={false}>
                <h1 className="mb-1 text-2xl font-semibold tracking-tight">{_('Withdraw from the contract')}</h1>
                <p className="mb-6 text-muted-foreground">
                  {_('You can withdraw from your purchase within 14 calendar days of receiving it, without giving any reason.')}{' '}
                  <a className="underline" href={termsUrl}>
                    {_('More information')}
                  </a>
                </p>
                <div className="space-y-4">
                  {withdrawalOrder ? (
                    <div className="rounded-md bg-muted px-4 py-3 text-sm">
                      <div>
                        <strong>{_('Order number')}:</strong> <span dir="ltr">{withdrawalOrder.orderNumber}</span>
                      </div>
                      <div>
                        <strong>{_('Email used for the order')}:</strong> <span dir="ltr">{withdrawalOrder.email}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{_('We will send the acknowledgement of receipt to this address.')}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="w-order">{_('Order number')} *</Label>
                      <Input id="w-order" required maxLength={40} value={form.orderNumber} onChange={set('orderNumber')} placeholder="10001" dir="ltr" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="w-name">{_('Full name')} *</Label>
                    <Input id="w-name" required maxLength={255} autoComplete="name" value={form.fullName} onChange={set('fullName')} />
                  </div>
                  {!withdrawalOrder && (
                    <div className="space-y-1.5">
                      <Label htmlFor="w-email">{_('Email used for the order')} *</Label>
                      <Input id="w-email" type="email" required maxLength={255} autoComplete="email" value={form.email} onChange={set('email')} dir="ltr" />
                      <p className="text-xs text-muted-foreground">{_('We will send the acknowledgement of receipt to this address.')}</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="w-items">{_('Products you are returning (leave empty for the whole order)')}</Label>
                    <Textarea id="w-items" maxLength={2000} rows={2} value={form.items} onChange={set('items')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="w-comment">{_('Comments (optional)')}</Label>
                    <Textarea id="w-comment" maxLength={2000} rows={2} value={form.comment} onChange={set('comment')} />
                  </div>
                </div>
                {message && (
                  <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {message}
                  </p>
                )}
                <Button type="submit" size="lg" className="mt-6 w-full" isLoading={sending}>
                  {_('Confirm withdrawal')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    currentCustomer {
      email
      fullName
    }
    withdrawalOrder: tiendaWithdrawalOrder(token: getContextValue("withdrawalToken", "")) {
      orderNumber
      email
      fullName
      token
    }
    homeUrl: url(routeId: "homepage")
  }
`;
