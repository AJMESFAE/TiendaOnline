import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Button } from '@components/common/ui/Button.js';
import { toast } from '@components/common/ui/Sonner.js';
import {
  useCheckout,
  useCheckoutDispatch
} from '@components/frontStore/checkout/CheckoutContext.js';
import React, { useEffect } from 'react';

interface RedsysMethodProps {
  createPaymentAPI: string;
  setting: {
    redsysDisplayName: string;
  };
}

interface RedsysPaymentForm {
  action: string;
  fields: Record<string, string>;
}

/** Envía el formulario firmado al TPV de Redsys (POST con redirección). */
function submitToRedsys({ action, fields }: RedsysPaymentForm) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.style.display = 'none';
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

function CardIcons() {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      <svg width="34" height="22" viewBox="0 0 38 24">
        <rect width="38" height="24" rx="3" fill="#fff" stroke="#ddd" />
        <path
          fill="#142688"
          d="M16.3 16.4h-2.5l1.6-9.2h2.5l-1.6 9.2zm9.5-9c-.5-.2-1.3-.4-2.2-.4-2.5 0-4.2 1.3-4.2 3.1 0 1.4 1.2 2.1 2.2 2.6 1 .5 1.3.8 1.3 1.2 0 .7-.8 1-1.5 1-1 0-1.6-.1-2.4-.5l-.3-.2-.4 2.2c.6.3 1.7.5 2.8.5 2.6 0 4.3-1.3 4.3-3.2 0-1.1-.7-1.9-2.1-2.6-.9-.4-1.4-.7-1.4-1.2 0-.4.5-.8 1.4-.8.8 0 1.4.2 1.9.4l.2.1.4-2.2zm6.5-.2h-1.9c-.6 0-1.1.2-1.3.8l-3.7 8.4h2.6l.5-1.4h3.2l.3 1.4h2.3l-2-9.2zm-3.1 5.9 1-2.6.3-.9.2.8.6 2.7h-2.1zM11.7 7.2l-2.4 6.3-.3-1.3c-.4-1.5-1.8-3.1-3.4-3.9l2.2 8.1h2.6l3.9-9.2h-2.6z"
        />
      </svg>
      <svg width="34" height="22" viewBox="0 0 38 24">
        <rect width="38" height="24" rx="3" fill="#fff" stroke="#ddd" />
        <circle cx="15" cy="12" r="7" fill="#EB001B" />
        <circle cx="23" cy="12" r="7" fill="#F79E1B" />
        <path
          fill="#FF5F00"
          d="M22 12c0-2.4-1.2-4.5-3-5.7-1.8 1.3-3 3.4-3 5.7s1.2 4.5 3 5.7c1.8-1.2 3-3.3 3-5.7z"
        />
      </svg>
    </span>
  );
}

export default function RedsysMethod({
  createPaymentAPI,
  setting: { redsysDisplayName }
}: RedsysMethodProps) {
  const {
    orderPlaced,
    orderId,
    checkoutData: { paymentMethod }
  } = useCheckout();
  const { registerPaymentComponent } = useCheckoutDispatch();

  // Vuelta desde el TPV con el pago no completado (URL KO).
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('payment') === 'failed'
    ) {
      toast.error(
        _('The payment was not completed. You can try again or choose another payment method.')
      );
    }
  }, []);

  useEffect(() => {
    const startPayment = async () => {
      try {
        const response = await fetch(createPaymentAPI, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId })
        });
        const json = await response.json();
        if (json.error) {
          throw new Error(json.error.message);
        }
        submitToRedsys(json.data as RedsysPaymentForm);
      } catch (e) {
        toast.error(
          e?.message || _('Could not connect to the payment gateway.')
        );
        setTimeout(() => window.location.reload(), 2500);
      }
    };
    if (orderPlaced && orderId && paymentMethod === 'redsys') {
      startPayment();
    }
  }, [orderPlaced, orderId]);

  useEffect(() => {
    registerPaymentComponent('redsys', {
      nameRenderer: () => (
        <div className="flex items-center justify-between w-full">
          <span>{_(redsysDisplayName)}</span>
          <CardIcons />
        </div>
      ),
      formRenderer: () => (
        <div className="flex justify-center text-muted-foreground">
          <div className="w-full md:w-2/3 text-center py-3 text-sm">
            {_('You will be redirected to the secure Redsys gateway to pay by card or Bizum.')}
          </div>
        </div>
      ),
      checkoutButtonRenderer: () => {
        const { checkout } = useCheckoutDispatch();
        const { loadingStates, orderPlaced } = useCheckout();
        const isDisabled = loadingStates.placingOrder || orderPlaced;
        const handleClick = async (e: React.MouseEvent) => {
          e.preventDefault();
          try {
            await checkout();
          } catch (error) {
            toast.error(
              error?.message ||
                _('The order could not be placed. Please try again.')
            );
          }
        };
        return (
          <Button
            variant="default"
            size="xl"
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            className="w-full py-4 px-6 font-semibold text-lg"
          >
            {isDisabled ? _('Redirecting to the payment gateway…') : _('Pay now')}
          </Button>
        );
      }
    });
  }, [registerPaymentComponent, redsysDisplayName]);

  return null;
}

export const layout = {
  areaId: 'checkoutFormAfter',
  sortOrder: 5
};

export const query = `
  query Query {
    setting {
      redsysDisplayName
    }
    createPaymentAPI: url(routeId: "redsysCreatePayment")
  }
`;
