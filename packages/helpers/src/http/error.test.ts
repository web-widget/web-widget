import { createHttpError, HttpError } from './error';
import { STATUS_TEXT, Status } from './status';

function randomStr(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

const STATUS_TEXT_KEYS = Object.keys(Status).filter(
  (k) => typeof Status[k as any] === 'number'
);
const STATUS_CODES = STATUS_TEXT_KEYS.map((k) => Status[k as any]);
const ClientServerErrorCodes = STATUS_CODES.filter((code) => {
  const _code = Number(code);
  return _code >= 400 && _code < 600;
});

function isError(err: any): boolean {
  return (
    Object.prototype.toString.call(err) === '[object Error]' ||
    err instanceof Error
  );
}

for (const code of ClientServerErrorCodes) {
  let _code = Number(code) as Status;
  const err = createHttpError(_code);
  const message = STATUS_TEXT[_code];
  let name = Status[_code];
  if (!name.endsWith('Error')) {
    name += 'Error';
  }

  test(`createHttpError(${_code}) should create error object`, function () {
    expect(isError(err)).toBe(true);
  });

  test(`createHttpError(${_code}) should have "message" property of "${message}"`, function () {
    expect(err.message).toEqual(message);
  });

  test(`createHttpError(${_code}) should have "name" property of "${name}"`, function () {
    expect(err.name).toEqual(name);
  });

  test(`createHttpError(${_code}) should have "statusCode" property of ${_code}`, function () {
    expect(err.status).toEqual(_code);
  });

  test(`createHttpError(${_code}) should have "expose" property set properly`, function () {
    if (_code >= 400 && _code < 500) {
      expect(err.expose).toBe(true);
    } else {
      expect(err.expose).toBe(false);
    }
  });
}

test(`createHttpError(status) when status unknown`, function () {
  expect(() => {
    createHttpError(3000);
  }).toThrowErrorMatchingInlineSnapshot('"Unknown HTTP Status Code `3000`"');
});

test(`createHttpError(status) when out of HTTP Error`, function () {
  const code = 200;
  expect(() => {
    createHttpError(code);
  }).toThrowErrorMatchingInlineSnapshot(
    `"Only 4xx or 5xx status codes allowed, but got \`${code}\`"`
  );
});

for (const code of ClientServerErrorCodes) {
  let _code = Number(code);
  const message = randomStr();
  const err = createHttpError(_code, message);
  let name = Status[_code];
  if (!name.endsWith('Error')) {
    name += 'Error';
  }

  test(`createHttpError(${_code}, "${message}") should create error object`, function () {
    expect(isError(err)).toBe(true);
  });

  test(`createHttpError(${_code}, "${message}") should have "message" property of "${message}"`, function () {
    expect(err.message).toEqual(message);
  });

  test(`createHttpError(${_code}, "${message}") should have "name" property of "${name}"`, function () {
    expect(err.name).toEqual(name);
  });

  test(`createHttpError(${_code}, "${message}") should have "statusCode" property of ${_code}`, function () {
    expect(err.status).toEqual(_code);
  });

  test(`createHttpError(${_code}, "${message}") should have "expose" property set properly`, function () {
    if (_code >= 400 && _code < 500) {
      expect(err.expose).toBe(true);
    } else {
      expect(err.expose).toBe(false);
    }
  });
}

for (const code of ClientServerErrorCodes) {
  let _code = Number(code);
  const message = randomStr();
  const props = {
    year: 2020,
    state: 'quarantine at home',
  };
  const propsStr = JSON.stringify(props);
  const err = createHttpError(_code, message, props);
  let name = Status[_code];
  if (!name.endsWith('Error')) {
    name += 'Error';
  }

  test(`createHttpError(${_code}, "${message}", ${propsStr}) should create error object`, function () {
    expect(isError(err)).toBe(true);
  });

  test(`createHttpError(${_code}, "${message}", ${propsStr}) should have "message" property of "${message}"`, function () {
    expect(err.message).toEqual(message);
  });

  test(`createHttpError(${_code}, "${message}", ${propsStr}) should have "name" property of "${name}"`, function () {
    expect(err.name).toEqual(name);
  });

  test(`createHttpError(${_code}, "${message}", ${propsStr}) should have "statusCode" property of ${_code}`, function () {
    expect(err.status).toEqual(_code);
  });

  test(`createHttpError(${_code}, "${message}", ${propsStr}) should have "props" property of ${propsStr}`, function () {
    expect(err.year).toEqual(props.year);
    expect(err.state).toEqual(props.state);
  });

  test(`createHttpError(${_code}, "${message}", ${propsStr}) should have "expose" property set properly`, function () {
    if (_code >= 400 && _code < 500) {
      expect(err.expose).toBe(true);
    } else {
      expect(err.expose).toBe(false);
    }
  });
}

for (const code of ClientServerErrorCodes) {
  let _code = Number(code) as Status;
  const props = {
    year: 2020,
    state: 'quarantine at home',
  };
  const message = STATUS_TEXT[_code];
  const propsStr = JSON.stringify(props);
  const err = createHttpError(_code, message, props);
  let name = Status[_code];
  if (!name.endsWith('Error')) {
    name += 'Error';
  }

  test(`createHttpError(${_code}, ${propsStr}) should create error object`, function () {
    expect(isError(err)).toBe(true);
  });

  test(`createHttpError(${_code}, ${propsStr}) should have "message" property of "${message}"`, function () {
    expect(err.message).toEqual(message);
  });

  test(`createHttpError(${_code}, ${propsStr}) should have "name" property of "${name}"`, function () {
    expect(err.name).toEqual(name);
  });

  test(`createHttpError(${_code}, ${propsStr}) should have "statusCode" property of ${_code}`, function () {
    expect(err.status).toEqual(_code);
  });

  test(`createHttpError(${_code}, ${propsStr}) should have "props" property of ${propsStr}`, function () {
    expect(err.year).toEqual(props.year);
    expect(err.state).toEqual(props.state);
  });

  test(`createHttpError(${_code}, ${propsStr}) should have "expose" property set properly`, function () {
    if (_code >= 400 && _code < 500) {
      expect(err.expose).toBe(true);
    } else {
      expect(err.expose).toBe(false);
    }
  });
}

test('instanceof HttpError', () => {
  expect(createHttpError(500) instanceof HttpError).toBe(true);
});

test('instanceof Error', () => {
  expect(createHttpError(500) instanceof Error).toBe(true);
});
