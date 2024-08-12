import primitives from '@edge-runtime/primitives';

if (!Reflect.get(global, 'DISABLE_INSTALL_MCA_SHIMS')) {
  for (const [key, value] of Object.entries(primitives)) {
    if (!(key in global)) {
      (global as any)[key] = value;
    }
  }
}
