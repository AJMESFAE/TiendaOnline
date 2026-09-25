const find = (setting, name) => setting.find((s) => s.name === name)?.value;

export default {
  Setting: {
    redsysDisplayName: (setting) =>
      find(setting, 'redsysDisplayName') || 'Tarjeta (Redsys)'
  }
};
