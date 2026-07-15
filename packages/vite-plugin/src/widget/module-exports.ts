import * as esModuleLexer from 'es-module-lexer';

export async function hasDefaultExport(
  code: string,
  id: string
): Promise<boolean> {
  await esModuleLexer.init;
  const [, exports] = esModuleLexer.parse(code, id);
  return exports.some(({ n }) => n === 'default');
}
