/*!
 * vary
 * https://github.com/jshttp/vary/tree/master
 * Copyright(c) 2014-2017 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * RegExp to match field-name in RFC 7230 sec 3.2
 *
 * field-name    = token
 * token         = 1*tchar
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *               / DIGIT / ALPHA
 *               ; any VCHAR, except delimiters
 */

const FIELD_NAME_REGEXP = /^[!#$%&'*+\-.^\w`|~]+$/;

/**
 * Append a field to a vary header.
 */
function append(header: string, field: string | string[]) {
  if (typeof header !== 'string') {
    throw new TypeError('header argument is required');
  }

  if (!field) {
    throw new TypeError('field argument is required');
  }

  // get fields array
  const fields = !Array.isArray(field) ? parse(String(field)) : field;

  // assert on invalid field names
  for (let j = 0; j < fields.length; j++) {
    if (!FIELD_NAME_REGEXP.test(fields[j])) {
      throw new TypeError('field argument contains an invalid header name');
    }
  }

  // existing, unspecified vary
  if (header === '*') {
    return header;
  }

  // enumerate current values
  let val = header;
  const vals = parse(header.toLowerCase());

  // unspecified vary
  if (fields.indexOf('*') !== -1 || vals.indexOf('*') !== -1) {
    return '*';
  }

  for (let i = 0; i < fields.length; i++) {
    const fld = fields[i].toLowerCase();

    // append value (case-preserving)
    if (vals.indexOf(fld) === -1) {
      vals.push(fld);
      val = val ? val + ', ' + fields[i] : fields[i];
    }
  }

  return val;
}

/**
 * Parse a vary header into an array.
 */
function parse(header: string) {
  let end = 0;
  let start = 0;
  const list = [];

  // gather tokens
  for (let i = 0, len = header.length; i < len; i++) {
    switch (header.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) {
          start = end = i + 1;
        }
        break;
      case 0x2c /* , */:
        list.push(header.substring(start, end));
        start = end = i + 1;
        break;
      default:
        end = i + 1;
        break;
    }
  }

  // final token
  list.push(header.substring(start, end));

  return list;
}

export function vary(headers: Headers, field: string | string[]) {
  if (!headers || !headers.get || !headers.set) {
    // quack quack
    throw new TypeError('headers argument is required');
  }

  // get existing header
  let val = headers.get('Vary') ?? '';

  // set new header
  if ((val = append(val, field))) {
    headers.set('Vary', val);
  }
}
