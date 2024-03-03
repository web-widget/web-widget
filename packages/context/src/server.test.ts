import { SCRIPT_ID } from './constants';
import {
  createSerializableContext,
  contextToScriptDescriptor,
  exposedToClient,
} from './server';

test('createSerializableContext should create context object', function () {
  const context = {
    pathname: '/',
    params: {},
    request: {} as Request,
    state: {
      token: 'TOKEN',
      isLogin: true,
      [exposedToClient]: ['isLogin'],
    },
  };
  const serializableContext = createSerializableContext(context);
  expect(serializableContext).toEqual({
    pathname: '/',
    params: {},
    request: context.request,
    state: {
      token: 'TOKEN',
      isLogin: true,
      [exposedToClient]: ['isLogin'],
      toJSON: expect.any(Function),
    },
    toJSON: expect.any(Function),
    widgetState: {},
    [exposedToClient]: ['pathname', 'params', 'state'],
  });

  expect(contextToScriptDescriptor(serializableContext)).toEqual({
    id: SCRIPT_ID,
    type: 'application/json',
    content: JSON.stringify(serializableContext),
  });
});
