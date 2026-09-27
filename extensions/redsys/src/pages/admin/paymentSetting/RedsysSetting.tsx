import { InputField } from '@components/common/form/InputField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import React from 'react';

interface RedsysSettingProps {
  setting: {
    redsysPaymentStatus: 0 | 1;
    redsysDisplayName: string;
    redsysMerchantCode: string;
    redsysTerminal: string;
    redsysSecretKey: string;
    redsysEnvironment: string;
    redsysCurrency: string;
    redsysMerchantName: string;
    redsysPayMethods: string;
    redsysPinnedFields: string[];
  };
  notificationUrl: string;
}

function Row({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <CardContent className="pt-4 border-t border-border">
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-1 items-center flex">
          <h4>{label}</h4>
        </div>
        <div className="col-span-2">{children}</div>
      </div>
    </CardContent>
  );
}

export default function RedsysSetting({
  setting: {
    redsysPaymentStatus,
    redsysDisplayName,
    redsysMerchantCode,
    redsysTerminal,
    redsysSecretKey,
    redsysEnvironment,
    redsysCurrency,
    redsysMerchantName,
    redsysPayMethods,
    redsysPinnedFields
  },
  notificationUrl
}: RedsysSettingProps) {
  const pinned = new Set(redsysPinnedFields || []);
  const pinnedHelp =
    'Valor fijado por el servidor (variable de entorno o fichero de configuración).';
  // Un campo fijado no se envía con el formulario (sin `name`), para no
  // guardar en la base de datos el valor enmascarado.
  const pinnedInput = (key: string, value: string | null) =>
    pinned.has(key) ? (
      <input
        className="w-full rounded border border-border bg-muted px-3 py-2 text-muted-foreground"
        value={value ?? ''}
        readOnly
        title={pinnedHelp}
      />
    ) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redsys (TPV Virtual)</CardTitle>
        <CardDescription>
          Pago con tarjeta y Bizum mediante redirección al TPV Virtual de
          Redsys. URL de notificación online: <code>{notificationUrl}</code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>¿Activado?</h4>
          </div>
          <div className="col-span-2">
            {pinnedInput('status', redsysPaymentStatus ? 'Sí' : 'No') || (
              <ToggleField
                name="redsysPaymentStatus"
                defaultValue={redsysPaymentStatus}
                trueValue={1}
                falseValue={0}
              />
            )}
          </div>
        </div>
      </CardContent>
      <Row label="Nombre visible en el checkout">
        <InputField
          name="redsysDisplayName"
          placeholder="Tarjeta de crédito o débito"
          defaultValue={redsysDisplayName}
        />
      </Row>
      <Row label="Código de comercio (FUC)">
        {pinnedInput('merchantCode', redsysMerchantCode) || (
          <InputField
            name="redsysMerchantCode"
            placeholder="999008881"
            defaultValue={redsysMerchantCode}
          />
        )}
      </Row>
      <Row label="Terminal">
        {pinnedInput('terminal', redsysTerminal) || (
          <InputField
            name="redsysTerminal"
            placeholder="1"
            defaultValue={redsysTerminal}
          />
        )}
      </Row>
      <Row label="Clave secreta (SHA-256)">
        {pinnedInput('secretKey', redsysSecretKey) || (
          <InputField
            name="redsysSecretKey"
            type="password"
            placeholder="Clave de firma del Portal de Administración"
            defaultValue={redsysSecretKey}
          />
        )}
      </Row>
      <Row label="Nombre del comercio">
        {pinnedInput('merchantName', redsysMerchantName) || (
          <InputField
            name="redsysMerchantName"
            placeholder="Fundacion Andalusi"
            defaultValue={redsysMerchantName}
          />
        )}
      </Row>
      <Row label="Moneda (código ISO numérico)">
        {pinnedInput('currency', redsysCurrency) || (
          <InputField
            name="redsysCurrency"
            placeholder="978"
            defaultValue={redsysCurrency}
          />
        )}
      </Row>
      <Row label="Métodos de pago">
        {pinnedInput('payMethods', redsysPayMethods) || (
          <RadioGroupField
            name="redsysPayMethods"
            defaultValue={redsysPayMethods || ''}
            options={[
              { label: 'Todos los activos en el TPV', value: '' },
              { label: 'Solo tarjeta', value: 'C' },
              { label: 'Solo Bizum', value: 'z' }
            ]}
          />
        )}
      </Row>
      <Row label="Entorno">
        {pinnedInput('environment', redsysEnvironment) || (
          <RadioGroupField
            name="redsysEnvironment"
            defaultValue={redsysEnvironment}
            options={[
              { label: 'Pruebas (sis-t.redsys.es)', value: 'test' },
              { label: 'Real (sis.redsys.es)', value: 'live' }
            ]}
          />
        )}
      </Row>
    </Card>
  );
}

export const layout = {
  areaId: 'paymentSetting',
  sortOrder: 5
};

export const query = `
  query Query {
    setting {
      redsysPaymentStatus
      redsysDisplayName
      redsysMerchantCode
      redsysTerminal
      redsysSecretKey
      redsysEnvironment
      redsysCurrency
      redsysMerchantName
      redsysPayMethods
      redsysPinnedFields
    }
    notificationUrl: url(routeId: "redsysNotification")
  }
`;
