import { getPinnedValue } from '../../../services/getRedsysConfig.js';

const find = (setting, name) => setting.find((s) => s.name === name)?.value;

/** Valor de config/entorno si está fijado; si no, el ajuste guardado. */
const value = (setting, key, settingName, defaultValue = null) => {
  const pinned = getPinnedValue(key);
  if (pinned !== undefined) {
    return pinned;
  }
  const stored = find(setting, settingName);
  return stored === undefined || stored === null || stored === ''
    ? defaultValue
    : stored;
};

export default {
  Setting: {
    redsysPaymentStatus: (setting) =>
      parseInt(value(setting, 'status', 'redsysPaymentStatus', '0'), 10) || 0,
    redsysMerchantCode: (setting) =>
      value(setting, 'merchantCode', 'redsysMerchantCode'),
    redsysTerminal: (setting) =>
      value(setting, 'terminal', 'redsysTerminal', '1'),
    redsysSecretKey: (setting, _, { user }) => {
      if (getPinnedValue('secretKey') !== undefined) {
        return '********************************';
      }
      return user ? find(setting, 'redsysSecretKey') ?? null : null;
    },
    redsysEnvironment: (setting) =>
      value(setting, 'environment', 'redsysEnvironment', 'test'),
    redsysCurrency: (setting) =>
      value(setting, 'currency', 'redsysCurrency', '978'),
    redsysMerchantName: (setting) =>
      value(setting, 'merchantName', 'redsysMerchantName'),
    redsysPayMethods: (setting) =>
      value(setting, 'payMethods', 'redsysPayMethods', ''),
    redsysPinnedFields: () =>
      [
        'status',
        'merchantCode',
        'terminal',
        'secretKey',
        'environment',
        'currency',
        'merchantName',
        'payMethods'
      ].filter((key) => getPinnedValue(key) !== undefined)
  }
};
