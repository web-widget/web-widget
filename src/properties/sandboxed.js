// 钩子：创建应用沙箱标记
export function createSandboxed(model) {
  return !!model.sandbox;
}
