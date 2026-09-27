import { InputField } from '@components/common/form/InputField.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { PhoneField } from './PhoneField.js';

interface NameAndTelephoneProps {
  fullName?: string;
  telephone?: string;
  getFieldName?: (fieldName: string) => string;
}

/** Nombre y teléfono (con código de país) del formulario de dirección. */
export function NameAndTelephone({ fullName, telephone, getFieldName }: NameAndTelephoneProps) {
  const field = (f: string) => (getFieldName ? getFieldName(f) : f);
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div>
        <InputField
          name={field('full_name')}
          defaultValue={fullName}
          label={_('Full name')}
          placeholder={_('Full name')}
          autoComplete="name"
          required
          validation={{ required: _('Full name is required') }}
        />
      </div>
      <div>
        <PhoneField name={field('telephone')} defaultValue={telephone} countryField={field('country')} />
      </div>
    </div>
  );
}
