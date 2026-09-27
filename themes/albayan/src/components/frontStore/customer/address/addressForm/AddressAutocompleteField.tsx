import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { Field, FieldError, FieldLabel } from '@components/common/ui/Field.js';
import { InputGroup, InputGroupInput } from '@components/common/ui/InputGroup.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  AddressSuggestion,
  fetchSuggestions,
  hasGoogleKey,
  matchProvince,
  newSessionToken,
  resolveSuggestion
} from './googlePlaces.js';

interface CountryOption {
  value: string;
  label: string;
  provinces?: { value: string; label: string }[];
}

interface Props {
  getFieldName: (field: string) => string;
  defaultValue?: string;
  allowCountries: CountryOption[];
}

/**
 * Campo «Dirección» con sugerencias de Google Places, como los formularios de
 * Google: al elegir una, rellena calle y número, ciudad, código postal,
 * provincia y país. Se puede seguir escribiendo a mano.
 */
export function AddressAutocompleteField({ getFieldName, defaultValue, allowCountries }: Props) {
  const {
    control,
    setValue,
    getValues,
    formState: { errors }
  } = useFormContext();
  const name = getFieldName('address_1');
  const fieldError = getNestedError(name, errors, undefined);
  const fieldId = `field-${name}`;

  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const session = useRef<any>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastQuery = useRef('');

  useEffect(() => () => clearTimeout(timer.current), []);

  const search = (text: string) => {
    clearTimeout(timer.current);
    if (!hasGoogleKey() || text.trim().length < 3) {
      setItems([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        lastQuery.current = text;
        session.current = session.current || (await newSessionToken());
        const country = String(getValues(getFieldName('country')) || 'ES');
        const found = await fetchSuggestions(text, country, session.current);
        if (lastQuery.current !== text) return;
        setItems(found);
        setActive(-1);
        setOpen(found.length > 0);
      } catch {
        setItems([]);
        setOpen(false);
      }
    }, 250);
  };

  const choose = async (s: AddressSuggestion) => {
    setOpen(false);
    try {
      const a = await resolveSuggestion(s);
      session.current = null; // la sesión de Google termina al pedir el detalle
      const opts = { shouldValidate: true, shouldDirty: true };
      setValue(name, a.address1, opts);
      if (a.city) setValue(getFieldName('city'), a.city, opts);
      const country = allowCountries.find((c) => c.value === a.country);
      const countryChanged = country && getValues(getFieldName('country')) !== country.value;
      if (country) setValue(getFieldName('country'), country.value, opts);
      const province = matchProvince(a, country?.provinces || []);
      // Si cambia el país, el selector de provincia se vuelve a montar: se espera un ciclo.
      setTimeout(
        () => {
          if (province) setValue(getFieldName('province'), province, opts);
          if (a.postcode) setValue(getFieldName('postcode'), a.postcode, opts);
        },
        countryChanged ? 50 : 0
      );
    } catch {
      // Sin detalle de Google: se queda el texto elegido para completarlo a mano.
      setValue(name, s.main, { shouldValidate: true, shouldDirty: true });
    }
  };

  return (
    <Field data-invalid={fieldError ? 'true' : 'false'}>
      <FieldLabel htmlFor={fieldId}>
        <>
          {_('Address')}
          <span className="text-destructive">*</span>
        </>
      </FieldLabel>
      <div className="relative">
        <InputGroup>
          <Controller
            name={name}
            control={control}
            defaultValue={defaultValue ?? ''}
            rules={{ required: _('Address is required') }}
            render={({ field }) => (
              <InputGroupInput
                {...field}
                id={fieldId}
                autoComplete="address-line1"
                placeholder={_('Address')}
                aria-invalid={fieldError ? 'true' : 'false'}
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={`${fieldId}-list`}
                onChange={(e) => {
                  field.onChange(e);
                  search(e.target.value);
                }}
                onBlur={() => {
                  field.onBlur();
                  setTimeout(() => setOpen(false), 150);
                }}
                onKeyDown={(e) => {
                  if (!open) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActive((i) => Math.min(items.length - 1, i + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActive((i) => Math.max(0, i - 1));
                  } else if (e.key === 'Enter' && active >= 0) {
                    e.preventDefault();
                    choose(items[active]);
                  } else if (e.key === 'Escape') {
                    setOpen(false);
                  }
                }}
              />
            )}
          />
        </InputGroup>
        {open && (
          <ul
            id={`${fieldId}-list`}
            role="listbox"
            className="albayan-places absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-white shadow-lg"
          >
            {items.map((s, i) => (
              <li
                key={`${s.main}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`cursor-pointer px-3 py-2.5 text-sm ${i === active ? 'bg-muted' : 'hover:bg-muted'}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(s);
                }}
              >
                <span className="font-medium">{s.main}</span>
                {s.secondary && <span className="ml-1 text-muted-foreground">{s.secondary}</span>}
              </li>
            ))}
            <li aria-hidden="true" className="border-t border-border px-3 py-1.5 text-right text-[11px] text-muted-foreground">
              {_('Suggestions by Google')}
            </li>
          </ul>
        )}
      </div>
      {fieldError && <FieldError id={`${fieldId}-error`}>{fieldError}</FieldError>}
    </Field>
  );
}
