import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { Field, FieldError, FieldLabel } from '@components/common/ui/Field.js';
import { InputGroup, InputGroupInput } from '@components/common/ui/InputGroup.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

/** Prefijos telefónicos (país → prefijo). España primero y por defecto. */
export const DIAL_CODES: { country: string; name: string; code: string }[] = [
  { country: 'ES', name: 'España', code: '+34' },
  { country: 'PT', name: 'Portugal', code: '+351' },
  { country: 'FR', name: 'Francia', code: '+33' },
  { country: 'AD', name: 'Andorra', code: '+376' },
  { country: 'IT', name: 'Italia', code: '+39' },
  { country: 'DE', name: 'Alemania', code: '+49' },
  { country: 'BE', name: 'Bélgica', code: '+32' },
  { country: 'NL', name: 'Países Bajos', code: '+31' },
  { country: 'GB', name: 'Reino Unido', code: '+44' },
  { country: 'IE', name: 'Irlanda', code: '+353' },
  { country: 'CH', name: 'Suiza', code: '+41' },
  { country: 'MA', name: 'Marruecos', code: '+212' },
  { country: 'DZ', name: 'Argelia', code: '+213' },
  { country: 'TN', name: 'Túnez', code: '+216' },
  { country: 'EG', name: 'Egipto', code: '+20' },
  { country: 'SA', name: 'Arabia Saudí', code: '+966' },
  { country: 'AE', name: 'Emiratos Árabes', code: '+971' },
  { country: 'TR', name: 'Turquía', code: '+90' },
  { country: 'US', name: 'Estados Unidos', code: '+1' },
  { country: 'MX', name: 'México', code: '+52' },
  { country: 'AR', name: 'Argentina', code: '+54' },
  { country: 'CO', name: 'Colombia', code: '+57' },
  { country: 'CL', name: 'Chile', code: '+56' },
  { country: 'PE', name: 'Perú', code: '+51' }
];

/** "+34 600111222" → { code: '+34', number: '600111222' }; sin prefijo, España. */
export function splitPhone(value: string | undefined): { code: string; number: string } {
  const v = String(value || '').trim();
  const found = [...DIAL_CODES].sort((a, b) => b.code.length - a.code.length).find((d) => v.startsWith(d.code));
  if (found) return { code: found.code, number: v.slice(found.code.length).replace(/\D/g, '') };
  const digits = v.replace(/\D/g, '');
  return { code: '+34', number: digits.startsWith('0034') ? digits.slice(4) : digits };
}

interface Props {
  name: string;
  defaultValue?: string;
  countryField?: string;
}

/**
 * Teléfono con código de país: selector de prefijo (+34 por defecto) y número.
 * Se guarda junto, «+34 600111222», para que el transportista (Packlink) y los
 * correos tengan el número completo. El prefijo sigue al país de la dirección
 * mientras el cliente no lo cambie a mano.
 */
export function PhoneField({ name, defaultValue, countryField }: Props) {
  const {
    control,
    watch,
    getValues,
    setValue,
    formState: { errors }
  } = useFormContext();
  const fieldError = getNestedError(name, errors, undefined);
  const fieldId = `field-${name}`;
  const country = countryField ? watch(countryField) : undefined;
  const touchedPrefix = useRef(false);
  const [code, setCode] = useState(splitPhone(defaultValue).code);

  useEffect(() => {
    if (touchedPrefix.current || !country) return;
    const dial = DIAL_CODES.find((d) => d.country === country);
    if (!dial) return;
    setCode(dial.code);
    const { number } = splitPhone(getValues(name));
    if (number) setValue(name, `${dial.code} ${number}`, { shouldDirty: true });
  }, [country]);

  const validate = (value: string) => {
    const { code: c, number } = splitPhone(value);
    if (!number) return _('Telephone is required');
    if (c === '+34' && !/^[6789]\d{8}$/.test(number)) return _('Enter a 9-digit Spanish phone number');
    if (number.length < 6 || number.length > 14) return _('Enter a valid phone number');
    return true;
  };

  return (
    <Field data-invalid={fieldError ? 'true' : 'false'}>
      <FieldLabel htmlFor={fieldId}>
        <>
          {_('Telephone')}
          <span className="text-destructive">*</span>
        </>
      </FieldLabel>
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue ? `${splitPhone(defaultValue).code} ${splitPhone(defaultValue).number}` : ''}
        rules={{ validate }}
        render={({ field }) => {
          const { number } = splitPhone(field.value);
          const emit = (c: string, n: string) => field.onChange(n ? `${c} ${n}` : '');
          return (
            <div className="flex gap-2">
              <select
                aria-label={_('Country calling code')}
                className="albayan-phone-prefix h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                value={code}
                onChange={(e) => {
                  touchedPrefix.current = true;
                  setCode(e.target.value);
                  emit(e.target.value, number);
                }}
              >
                {DIAL_CODES.map((d) => (
                  <option key={d.country} value={d.code}>
                    {d.country} {d.code}
                  </option>
                ))}
              </select>
              <InputGroup className="flex-1">
                <InputGroupInput
                  id={fieldId}
                  name={name}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="600 000 000"
                  value={number}
                  onBlur={field.onBlur}
                  aria-invalid={fieldError ? 'true' : 'false'}
                  onChange={(e) => emit(code, e.target.value.replace(/[^\d]/g, '').replace(/^0034/, ''))}
                />
              </InputGroup>
            </div>
          );
        }}
      />
      {fieldError && <FieldError id={`${fieldId}-error`}>{fieldError}</FieldError>}
    </Field>
  );
}
