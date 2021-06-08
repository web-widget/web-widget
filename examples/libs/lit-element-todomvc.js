let t, e;
(t = this),
  (e = function(t) {
    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    const e =
        typeof window !== 'undefined' &&
        window.customElements != null &&
        void 0 !== window.customElements.polyfillWrapFlushCallback,
      i = (t, e, i = null) => {
        for (; e !== i; ) {
          const i = e.nextSibling;
          t.removeChild(e), (e = i);
        }
      },
      s = `{{lit-${String(Math.random()).slice(2)}}}`,
      o = `\x3c!--${s}--\x3e`,
      n = new RegExp(`${s}|${o}`);
    class r {
      constructor(t, e) {
        (this.parts = []), (this.element = e);
        const i = [],
          o = [],
          r = document.createTreeWalker(e.content, 133, null, !1);
        let h = 0,
          d = -1,
          p = 0;
        const {
          strings: u,
          values: { length: f }
        } = t;
        for (; p < f; ) {
          const t = r.nextNode();
          if (t !== null) {
            if ((d++, t.nodeType === 1)) {
              if (t.hasAttributes()) {
                const e = t.attributes,
                  { length: i } = e;
                let s = 0;
                for (let t = 0; t < i; t++) l(e[t].name, '$lit$') && s++;
                for (; s-- > 0; ) {
                  const e = u[p],
                    i = c.exec(e)[2],
                    s = `${i.toLowerCase()}$lit$`,
                    o = t.getAttribute(s);
                  t.removeAttribute(s);
                  const r = o.split(n);
                  this.parts.push({
                    type: 'attribute',
                    index: d,
                    name: i,
                    strings: r
                  }),
                    (p += r.length - 1);
                }
              }
              t.tagName === 'TEMPLATE' &&
                (o.push(t), (r.currentNode = t.content));
            } else if (t.nodeType === 3) {
              const e = t.data;
              if (e.indexOf(s) >= 0) {
                const s = t.parentNode,
                  o = e.split(n),
                  r = o.length - 1;
                for (let e = 0; e < r; e++) {
                  let i,
                    n = o[e];
                  if (n === '') i = a();
                  else {
                    const t = c.exec(n);
                    t !== null &&
                      l(t[2], '$lit$') &&
                      (n =
                        n.slice(0, t.index) +
                        t[1] +
                        t[2].slice(0, -'$lit$'.length) +
                        t[3]),
                      (i = document.createTextNode(n));
                  }
                  s.insertBefore(i, t),
                    this.parts.push({ type: 'node', index: ++d });
                }
                o[r] === ''
                  ? (s.insertBefore(a(), t), i.push(t))
                  : (t.data = o[r]),
                  (p += r);
              }
            } else if (t.nodeType === 8)
              if (t.data === s) {
                const e = t.parentNode;
                (t.previousSibling !== null && d !== h) ||
                  (d++, e.insertBefore(a(), t)),
                  (h = d),
                  this.parts.push({ type: 'node', index: d }),
                  t.nextSibling === null ? (t.data = '') : (i.push(t), d--),
                  p++;
              } else {
                let e = -1;
                for (; (e = t.data.indexOf(s, e + 1)) !== -1; )
                  this.parts.push({ type: 'node', index: -1 }), p++;
              }
          } else r.currentNode = o.pop();
        }
        for (const t of i) t.parentNode.removeChild(t);
      }
    }
    const l = (t, e) => {
        const i = t.length - e.length;
        return i >= 0 && t.slice(i) === e;
      },
      h = t => t.index !== -1,
      a = () => document.createComment(''),
      c = /([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;
    function d(t, e) {
      const {
          element: { content: i },
          parts: s
        } = t,
        o = document.createTreeWalker(i, 133, null, !1);
      let n = u(s),
        r = s[n],
        l = -1,
        h = 0;
      const a = [];
      let c = null;
      for (; o.nextNode(); ) {
        l++;
        const t = o.currentNode;
        for (
          t.previousSibling === c && (c = null),
            e.has(t) && (a.push(t), c === null && (c = t)),
            c !== null && h++;
          void 0 !== r && r.index === l;

        )
          (r.index = c !== null ? -1 : r.index - h), (n = u(s, n)), (r = s[n]);
      }
      a.forEach(t => t.parentNode.removeChild(t));
    }
    const p = t => {
        let e = t.nodeType === 11 ? 0 : 1;
        const i = document.createTreeWalker(t, 133, null, !1);
        for (; i.nextNode(); ) e++;
        return e;
      },
      u = (t, e = -1) => {
        for (let i = e + 1; i < t.length; i++) {
          const e = t[i];
          if (h(e)) return i;
        }
        return -1;
      },
      f = new WeakMap(),
      g = t => (...e) => {
        const i = t(...e);
        return f.set(i, !0), i;
      },
      m = t => typeof t === 'function' && f.has(t),
      b = {},
      w = {};
    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    class x {
      constructor(t, e, i) {
        (this.t = []),
          (this.template = t),
          (this.processor = e),
          (this.options = i);
      }

      update(t) {
        let e = 0;
        for (const i of this.t) void 0 !== i && i.setValue(t[e]), e++;
        for (const t of this.t) void 0 !== t && t.commit();
      }

      _clone() {
        const t = e
            ? this.template.element.content.cloneNode(!0)
            : document.importNode(this.template.element.content, !0),
          i = [],
          s = this.template.parts,
          o = document.createTreeWalker(t, 133, null, !1);
        let n,
          r = 0,
          l = 0,
          a = o.nextNode();
        for (; r < s.length; )
          if (((n = s[r]), h(n))) {
            for (; l < n.index; )
              l++,
                a.nodeName === 'TEMPLATE' &&
                  (i.push(a), (o.currentNode = a.content)),
                (a = o.nextNode()) === null &&
                  ((o.currentNode = i.pop()), (a = o.nextNode()));
            if (n.type === 'node') {
              const t = this.processor.handleTextExpression(this.options);
              t.insertAfterNode(a.previousSibling), this.t.push(t);
            } else
              this.t.push(
                ...this.processor.handleAttributeExpressions(
                  a,
                  n.name,
                  n.strings,
                  this.options
                )
              );
            r++;
          } else this.t.push(void 0), r++;
        return e && (document.adoptNode(t), customElements.upgrade(t)), t;
      }
    }
    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */ const y = ` ${s} `;
    class v {
      constructor(t, e, i, s) {
        (this.strings = t),
          (this.values = e),
          (this.type = i),
          (this.processor = s);
      }

      getHTML() {
        const t = this.strings.length - 1;
        let e = '',
          i = !1;
        for (let n = 0; n < t; n++) {
          const t = this.strings[n],
            r = t.lastIndexOf('\x3c!--');
          i = (r > -1 || i) && t.indexOf('--\x3e', r + 1) === -1;
          const l = c.exec(t);
          e +=
            l === null
              ? t + (i ? y : o)
              : `${t.substr(0, l.index) + l[1] + l[2]}$lit$${l[3]}${s}`;
        }
        return (e += this.strings[t]), e;
      }

      getTemplateElement() {
        const t = document.createElement('template');
        return (t.innerHTML = this.getHTML()), t;
      }
    }
    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */ const k = t =>
        t === null || !(typeof t === 'object' || typeof t === 'function'),
      S = t => Array.isArray(t) || !(!t || !t[Symbol.iterator]);
    class $ {
      constructor(t, e, i) {
        (this.dirty = !0),
          (this.element = t),
          (this.name = e),
          (this.strings = i),
          (this.parts = []);
        for (let t = 0; t < i.length - 1; t++)
          this.parts[t] = this._createPart();
      }

      _createPart() {
        return new _(this);
      }

      _getValue() {
        const t = this.strings,
          e = t.length - 1;
        let i = '';
        for (let s = 0; s < e; s++) {
          i += t[s];
          const e = this.parts[s];
          if (void 0 !== e) {
            const t = e.value;
            if (k(t) || !S(t)) i += typeof t === 'string' ? t : String(t);
            else for (const e of t) i += typeof e === 'string' ? e : String(e);
          }
        }
        return (i += t[e]), i;
      }

      commit() {
        this.dirty &&
          ((this.dirty = !1),
          this.element.setAttribute(this.name, this._getValue()));
      }
    }
    class _ {
      constructor(t) {
        (this.value = void 0), (this.committer = t);
      }

      setValue(t) {
        t === b ||
          (k(t) && t === this.value) ||
          ((this.value = t), m(t) || (this.committer.dirty = !0));
      }

      commit() {
        for (; m(this.value); ) {
          const t = this.value;
          (this.value = b), t(this);
        }
        this.value !== b && this.committer.commit();
      }
    }
    class C {
      constructor(t) {
        (this.value = void 0), (this.i = void 0), (this.options = t);
      }

      appendInto(t) {
        (this.startNode = t.appendChild(a())),
          (this.endNode = t.appendChild(a()));
      }

      insertAfterNode(t) {
        (this.startNode = t), (this.endNode = t.nextSibling);
      }

      appendIntoPart(t) {
        t.s((this.startNode = a())), t.s((this.endNode = a()));
      }

      insertAfterPart(t) {
        t.s((this.startNode = a())),
          (this.endNode = t.endNode),
          (t.endNode = this.startNode);
      }

      setValue(t) {
        this.i = t;
      }

      commit() {
        if (this.startNode.parentNode === null) return;
        for (; m(this.i); ) {
          const t = this.i;
          (this.i = b), t(this);
        }
        const t = this.i;
        t !== b &&
          (k(t)
            ? t !== this.value && this.o(t)
            : t instanceof v
            ? this.l(t)
            : t instanceof Node
            ? this.h(t)
            : S(t)
            ? this.p(t)
            : t === w
            ? ((this.value = w), this.clear())
            : this.o(t));
      }

      s(t) {
        this.endNode.parentNode.insertBefore(t, this.endNode);
      }

      h(t) {
        this.value !== t && (this.clear(), this.s(t), (this.value = t));
      }

      o(t) {
        const e = this.startNode.nextSibling,
          i = typeof (t = t == null ? '' : t) === 'string' ? t : String(t);
        e === this.endNode.previousSibling && e.nodeType === 3
          ? (e.data = i)
          : this.h(document.createTextNode(i)),
          (this.value = t);
      }

      l(t) {
        const e = this.options.templateFactory(t);
        if (this.value instanceof x && this.value.template === e)
          this.value.update(t.values);
        else {
          const i = new x(e, t.processor, this.options),
            s = i._clone();
          i.update(t.values), this.h(s), (this.value = i);
        }
      }

      p(t) {
        Array.isArray(this.value) || ((this.value = []), this.clear());
        const e = this.value;
        let i,
          s = 0;
        for (const o of t)
          (i = e[s]),
            void 0 === i &&
              ((i = new C(this.options)),
              e.push(i),
              s === 0 ? i.appendIntoPart(this) : i.insertAfterPart(e[s - 1])),
            i.setValue(o),
            i.commit(),
            s++;
        s < e.length && ((e.length = s), this.clear(i && i.endNode));
      }

      clear(t = this.startNode) {
        i(this.startNode.parentNode, t.nextSibling, this.endNode);
      }
    }
    class M {
      constructor(t, e, i) {
        if (
          ((this.value = void 0),
          (this.i = void 0),
          i.length !== 2 || i[0] !== '' || i[1] !== '')
        )
          throw new Error(
            'Boolean attributes can only contain a single expression'
          );
        (this.element = t), (this.name = e), (this.strings = i);
      }

      setValue(t) {
        this.i = t;
      }

      commit() {
        for (; m(this.i); ) {
          const t = this.i;
          (this.i = b), t(this);
        }
        if (this.i === b) return;
        const t = !!this.i;
        this.value !== t &&
          (t
            ? this.element.setAttribute(this.name, '')
            : this.element.removeAttribute(this.name),
          (this.value = t)),
          (this.i = b);
      }
    }
    class E extends $ {
      constructor(t, e, i) {
        super(t, e, i),
          (this.single = i.length === 2 && i[0] === '' && i[1] === '');
      }

      _createPart() {
        return new A(this);
      }

      _getValue() {
        return this.single ? this.parts[0].value : super._getValue();
      }

      commit() {
        this.dirty &&
          ((this.dirty = !1), (this.element[this.name] = this._getValue()));
      }
    }
    class A extends _ {}
    let D = !1;
    (() => {
      try {
        const t = {
          get capture() {
            return (D = !0), !1;
          }
        };
        window.addEventListener('test', t, t),
          window.removeEventListener('test', t, t);
      } catch (t) {}
    })();
    class z {
      constructor(t, e, i) {
        (this.value = void 0),
          (this.i = void 0),
          (this.element = t),
          (this.eventName = e),
          (this.eventContext = i),
          (this.u = t => this.handleEvent(t));
      }

      setValue(t) {
        this.i = t;
      }

      commit() {
        for (; m(this.i); ) {
          const t = this.i;
          (this.i = b), t(this);
        }
        if (this.i === b) return;
        const t = this.i,
          e = this.value,
          i =
            t == null ||
            (e != null &&
              (t.capture !== e.capture ||
                t.once !== e.once ||
                t.passive !== e.passive)),
          s = t != null && (e == null || i);
        i && this.element.removeEventListener(this.eventName, this.u, this.g),
          s &&
            ((this.g = T(t)),
            this.element.addEventListener(this.eventName, this.u, this.g)),
          (this.value = t),
          (this.i = b);
      }

      handleEvent(t) {
        typeof this.value === 'function'
          ? this.value.call(this.eventContext || this.element, t)
          : this.value.handleEvent(t);
      }
    }
    const T = t =>
      t &&
      (D
        ? { capture: t.capture, passive: t.passive, once: t.once }
        : t.capture);
    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */ function P(t) {
      let e = j.get(t.type);
      void 0 === e &&
        ((e = { stringsArray: new WeakMap(), keyString: new Map() }),
        j.set(t.type, e));
      let i = e.stringsArray.get(t.strings);
      if (void 0 !== i) return i;
      const o = t.strings.join(s);
      return (
        (i = e.keyString.get(o)),
        void 0 === i &&
          ((i = new r(t, t.getTemplateElement())), e.keyString.set(o, i)),
        e.stringsArray.set(t.strings, i),
        i
      );
    }
    const j = new Map(),
      O = new WeakMap(),
      U = new /**
       * @license
       * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
       * This code may only be used under the BSD style license found at
       * http://polymer.github.io/LICENSE.txt
       * The complete set of authors may be found at
       * http://polymer.github.io/AUTHORS.txt
       * The complete set of contributors may be found at
       * http://polymer.github.io/CONTRIBUTORS.txt
       * Code distributed by Google as part of the polymer project is also
       * subject to an additional IP rights grant found at
       * http://polymer.github.io/PATENTS.txt
       */
      (class {
        handleAttributeExpressions(t, e, i, s) {
          const o = e[0];
          return o === '.'
            ? new E(t, e.slice(1), i).parts
            : o === '@'
            ? [new z(t, e.slice(1), s.eventContext)]
            : o === '?'
            ? [new M(t, e.slice(1), i)]
            : new $(t, e, i).parts;
        }

        handleTextExpression(t) {
          return new C(t);
        }
      })();
    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    typeof window !== 'undefined' &&
      (window.litHtmlVersions || (window.litHtmlVersions = [])).push('1.2.1');
    const N = (t, ...e) => new v(t, e, 'html', U),
      /**
       * @license
       * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
       * This code may only be used under the BSD style license found at
       * http://polymer.github.io/LICENSE.txt
       * The complete set of authors may be found at
       * http://polymer.github.io/AUTHORS.txt
       * The complete set of contributors may be found at
       * http://polymer.github.io/CONTRIBUTORS.txt
       * Code distributed by Google as part of the polymer project is also
       * subject to an additional IP rights grant found at
       * http://polymer.github.io/PATENTS.txt
       */ W = (t, e) => `${t}--${e}`;
    let F = !0;
    void 0 === window.ShadyCSS
      ? (F = !1)
      : void 0 === window.ShadyCSS.prepareTemplateDom &&
        (console.warn(
          'Incompatible ShadyCSS version detected. Please update to at least @webcomponents/webcomponentsjs@2.0.2 and @webcomponents/shadycss@1.3.1.'
        ),
        (F = !1));
    const V = t => e => {
        const i = W(e.type, t);
        let o = j.get(i);
        void 0 === o &&
          ((o = { stringsArray: new WeakMap(), keyString: new Map() }),
          j.set(i, o));
        let n = o.stringsArray.get(e.strings);
        if (void 0 !== n) return n;
        const l = e.strings.join(s);
        if (((n = o.keyString.get(l)), void 0 === n)) {
          const i = e.getTemplateElement();
          F && window.ShadyCSS.prepareTemplateDom(i, t),
            (n = new r(e, i)),
            o.keyString.set(l, n);
        }
        return o.stringsArray.set(e.strings, n), n;
      },
      q = ['html', 'svg'],
      L = new Set(),
      I = (t, e, i) => {
        L.add(t);
        const s = i ? i.element : document.createElement('template'),
          o = e.querySelectorAll('style'),
          { length: n } = o;
        if (n === 0) return void window.ShadyCSS.prepareTemplateStyles(s, t);
        const r = document.createElement('style');
        for (let t = 0; t < n; t++) {
          const e = o[t];
          e.parentNode.removeChild(e), (r.textContent += e.textContent);
        }
        (t => {
          q.forEach(e => {
            const i = j.get(W(e, t));
            void 0 !== i &&
              i.keyString.forEach(t => {
                const {
                    element: { content: e }
                  } = t,
                  i = new Set();
                Array.from(e.querySelectorAll('style')).forEach(t => {
                  i.add(t);
                }),
                  d(t, i);
              });
          });
        })(t);
        const l = s.content;
        i
          ? (function(t, e, i = null) {
              const {
                element: { content: s },
                parts: o
              } = t;
              if (i == null) return void s.appendChild(e);
              const n = document.createTreeWalker(s, 133, null, !1);
              let r = u(o),
                l = 0,
                h = -1;
              for (; n.nextNode(); )
                for (
                  h++,
                    n.currentNode === i &&
                      ((l = p(e)), i.parentNode.insertBefore(e, i));
                  r !== -1 && o[r].index === h;

                ) {
                  if (l > 0) {
                    for (; r !== -1; ) (o[r].index += l), (r = u(o, r));
                    return;
                  }
                  r = u(o, r);
                }
            })(
              /**
               * @license
               * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
               * This code may only be used under the BSD style license found at
               * http://polymer.github.io/LICENSE.txt
               * The complete set of authors may be found at
               * http://polymer.github.io/AUTHORS.txt
               * The complete set of contributors may be found at
               * http://polymer.github.io/CONTRIBUTORS.txt
               * Code distributed by Google as part of the polymer project is also
               * subject to an additional IP rights grant found at
               * http://polymer.github.io/PATENTS.txt
               */ i,
              r,
              l.firstChild
            )
          : l.insertBefore(r, l.firstChild),
          window.ShadyCSS.prepareTemplateStyles(s, t);
        const h = l.querySelector('style');
        if (window.ShadyCSS.nativeShadow && h !== null)
          e.insertBefore(h.cloneNode(!0), e.firstChild);
        else if (i) {
          l.insertBefore(r, l.firstChild);
          const t = new Set();
          t.add(r), d(i, t);
        }
      };
    window.JSCompiler_renameProperty = (t, e) => t;
    const J = {
        toAttribute(t, e) {
          switch (e) {
            case Boolean:
              return t ? '' : null;
            case Object:
            case Array:
              return t == null ? t : JSON.stringify(t);
          }
          return t;
        },
        fromAttribute(t, e) {
          switch (e) {
            case Boolean:
              return t !== null;
            case Number:
              return t === null ? null : Number(t);
            case Object:
            case Array:
              return JSON.parse(t);
          }
          return t;
        }
      },
      H = (t, e) => e !== t && (e == e || t == t),
      R = {
        attribute: !0,
        type: String,
        converter: J,
        reflect: !1,
        hasChanged: H
      };
    class B extends HTMLElement {
      constructor() {
        super(),
          (this._updateState = 0),
          (this._instanceProperties = void 0),
          (this._updatePromise = new Promise(
            t => (this._enableUpdatingResolver = t)
          )),
          (this._changedProperties = new Map()),
          (this._reflectingProperties = void 0),
          this.initialize();
      }

      static get observedAttributes() {
        this.finalize();
        const t = [];
        return (
          this._classProperties.forEach((e, i) => {
            const s = this._attributeNameForProperty(i, e);
            void 0 !== s && (this._attributeToPropertyMap.set(s, i), t.push(s));
          }),
          t
        );
      }

      static _ensureClassProperties() {
        if (
          !this.hasOwnProperty(
            JSCompiler_renameProperty('_classProperties', this)
          )
        ) {
          this._classProperties = new Map();
          const t = Object.getPrototypeOf(this)._classProperties;
          void 0 !== t && t.forEach((t, e) => this._classProperties.set(e, t));
        }
      }

      static createProperty(t, e = R) {
        if (
          (this._ensureClassProperties(),
          this._classProperties.set(t, e),
          e.noAccessor || this.prototype.hasOwnProperty(t))
        )
          return;
        const i = typeof t === 'symbol' ? Symbol() : `__${t}`,
          s = this.getPropertyDescriptor(t, i, e);
        void 0 !== s && Object.defineProperty(this.prototype, t, s);
      }

      static getPropertyDescriptor(t, e, i) {
        return {
          get() {
            return this[e];
          },
          set(i) {
            const s = this[t];
            (this[e] = i), this._requestUpdate(t, s);
          },
          configurable: !0,
          enumerable: !0
        };
      }

      static getPropertyOptions(t) {
        return (this._classProperties && this._classProperties.get(t)) || R;
      }

      static finalize() {
        const t = Object.getPrototypeOf(this);
        if (
          (t.hasOwnProperty('finalized') || t.finalize(),
          (this.finalized = !0),
          this._ensureClassProperties(),
          (this._attributeToPropertyMap = new Map()),
          this.hasOwnProperty(JSCompiler_renameProperty('properties', this)))
        ) {
          const t = this.properties,
            e = [
              ...Object.getOwnPropertyNames(t),
              ...(typeof Object.getOwnPropertySymbols === 'function'
                ? Object.getOwnPropertySymbols(t)
                : [])
            ];
          for (const i of e) this.createProperty(i, t[i]);
        }
      }

      static _attributeNameForProperty(t, e) {
        const i = e.attribute;
        return !1 === i
          ? void 0
          : typeof i === 'string'
          ? i
          : typeof t === 'string'
          ? t.toLowerCase()
          : void 0;
      }

      static _valueHasChanged(t, e, i = H) {
        return i(t, e);
      }

      static _propertyValueFromAttribute(t, e) {
        const i = e.type,
          s = e.converter || J,
          o = typeof s === 'function' ? s : s.fromAttribute;
        return o ? o(t, i) : t;
      }

      static _propertyValueToAttribute(t, e) {
        if (void 0 === e.reflect) return;
        const i = e.type,
          s = e.converter;
        return ((s && s.toAttribute) || J.toAttribute)(t, i);
      }

      initialize() {
        this._saveInstanceProperties(), this._requestUpdate();
      }

      _saveInstanceProperties() {
        this.constructor._classProperties.forEach((t, e) => {
          if (this.hasOwnProperty(e)) {
            const t = this[e];
            delete this[e],
              this._instanceProperties ||
                (this._instanceProperties = new Map()),
              this._instanceProperties.set(e, t);
          }
        });
      }

      _applyInstanceProperties() {
        this._instanceProperties.forEach((t, e) => (this[e] = t)),
          (this._instanceProperties = void 0);
      }

      connectedCallback() {
        this.enableUpdating();
      }

      enableUpdating() {
        void 0 !== this._enableUpdatingResolver &&
          (this._enableUpdatingResolver(),
          (this._enableUpdatingResolver = void 0));
      }

      disconnectedCallback() {}

      attributeChangedCallback(t, e, i) {
        e !== i && this._attributeToProperty(t, i);
      }

      _propertyToAttribute(t, e, i = R) {
        const s = this.constructor,
          o = s._attributeNameForProperty(t, i);
        if (void 0 !== o) {
          const t = s._propertyValueToAttribute(e, i);
          if (void 0 === t) return;
          (this._updateState = 8 | this._updateState),
            t == null ? this.removeAttribute(o) : this.setAttribute(o, t),
            (this._updateState = -9 & this._updateState);
        }
      }

      _attributeToProperty(t, e) {
        if (8 & this._updateState) return;
        const i = this.constructor,
          s = i._attributeToPropertyMap.get(t);
        if (void 0 !== s) {
          const t = i.getPropertyOptions(s);
          (this._updateState = 16 | this._updateState),
            (this[s] = i._propertyValueFromAttribute(e, t)),
            (this._updateState = -17 & this._updateState);
        }
      }

      _requestUpdate(t, e) {
        let i = !0;
        if (void 0 !== t) {
          const s = this.constructor,
            o = s.getPropertyOptions(t);
          s._valueHasChanged(this[t], e, o.hasChanged)
            ? (this._changedProperties.has(t) ||
                this._changedProperties.set(t, e),
              !0 !== o.reflect ||
                16 & this._updateState ||
                (void 0 === this._reflectingProperties &&
                  (this._reflectingProperties = new Map()),
                this._reflectingProperties.set(t, o)))
            : (i = !1);
        }
        !this._hasRequestedUpdate &&
          i &&
          (this._updatePromise = this._enqueueUpdate());
      }

      requestUpdate(t, e) {
        return this._requestUpdate(t, e), this.updateComplete;
      }

      async _enqueueUpdate() {
        this._updateState = 4 | this._updateState;
        try {
          await this._updatePromise;
        } catch (t) {}
        const t = this.performUpdate();
        return t != null && (await t), !this._hasRequestedUpdate;
      }

      get _hasRequestedUpdate() {
        return 4 & this._updateState;
      }

      get hasUpdated() {
        return 1 & this._updateState;
      }

      performUpdate() {
        this._instanceProperties && this._applyInstanceProperties();
        let t = !1;
        const e = this._changedProperties;
        try {
          (t = this.shouldUpdate(e)), t ? this.update(e) : this._markUpdated();
        } catch (e) {
          throw ((t = !1), this._markUpdated(), e);
        }
        t &&
          (1 & this._updateState ||
            ((this._updateState = 1 | this._updateState), this.firstUpdated(e)),
          this.updated(e));
      }

      _markUpdated() {
        (this._changedProperties = new Map()),
          (this._updateState = -5 & this._updateState);
      }

      get updateComplete() {
        return this._getUpdateComplete();
      }

      _getUpdateComplete() {
        return this._updatePromise;
      }

      shouldUpdate(t) {
        return !0;
      }

      update(t) {
        void 0 !== this._reflectingProperties &&
          this._reflectingProperties.size > 0 &&
          (this._reflectingProperties.forEach((t, e) =>
            this._propertyToAttribute(e, this[e], t)
          ),
          (this._reflectingProperties = void 0)),
          this._markUpdated();
      }

      updated(t) {}

      firstUpdated(t) {}
    }
    B.finalized = !0;
    /**
    @license
    Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
    This code may only be used under the BSD style license found at
    http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
    http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
    found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
    part of the polymer project is also subject to an additional IP rights grant
    found at http://polymer.github.io/PATENTS.txt
    */
    const K =
        'adoptedStyleSheets' in Document.prototype &&
        'replace' in CSSStyleSheet.prototype,
      G = Symbol();
    class Q {
      constructor(t, e) {
        if (e !== G)
          throw new Error(
            'CSSResult is not constructable. Use `unsafeCSS` or `css` instead.'
          );
        this.cssText = t;
      }

      get styleSheet() {
        return (
          void 0 === this._styleSheet &&
            (K
              ? ((this._styleSheet = new CSSStyleSheet()),
                this._styleSheet.replaceSync(this.cssText))
              : (this._styleSheet = null)),
          this._styleSheet
        );
      }

      toString() {
        return this.cssText;
      }
    }
    const X = (t, ...e) => {
      const i = e.reduce(
        (e, i, s) =>
          e +
          (t => {
            if (t instanceof Q) return t.cssText;
            if (typeof t === 'number') return t;
            throw new Error(
              `Value passed to 'css' function must be a 'css' function result: ${t}. Use 'unsafeCSS' to pass non-literal values, but\n            take care to ensure page security.`
            );
          })(i) +
          t[s + 1],
        t[0]
      );
      return new Q(i, G);
    };
    /**
     * @license
     * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    (window.litElementVersions || (window.litElementVersions = [])).push(
      '2.3.1'
    );
    const Y = {};
    class Z extends B {
      static getStyles() {
        return this.styles;
      }

      static _getUniqueStyles() {
        if (this.hasOwnProperty(JSCompiler_renameProperty('_styles', this)))
          return;
        const t = this.getStyles();
        if (void 0 === t) this._styles = [];
        else if (Array.isArray(t)) {
          const e = (t, i) =>
              t.reduceRight(
                (t, i) => (Array.isArray(i) ? e(i, t) : (t.add(i), t)),
                i
              ),
            i = e(t, new Set()),
            s = [];
          i.forEach(t => s.unshift(t)), (this._styles = s);
        } else this._styles = [t];
      }

      initialize() {
        super.initialize(),
          this.constructor._getUniqueStyles(),
          (this.renderRoot = this.createRenderRoot()),
          window.ShadowRoot &&
            this.renderRoot instanceof window.ShadowRoot &&
            this.adoptStyles();
      }

      createRenderRoot() {
        return this.attachShadow({ mode: 'open' });
      }

      adoptStyles() {
        const t = this.constructor._styles;
        t.length !== 0 &&
          (void 0 === window.ShadyCSS || window.ShadyCSS.nativeShadow
            ? K
              ? (this.renderRoot.adoptedStyleSheets = t.map(t => t.styleSheet))
              : (this._needsShimAdoptedStyleSheets = !0)
            : window.ShadyCSS.ScopingShim.prepareAdoptedCssText(
                t.map(t => t.cssText),
                this.localName
              ));
      }

      connectedCallback() {
        super.connectedCallback(),
          this.hasUpdated &&
            void 0 !== window.ShadyCSS &&
            window.ShadyCSS.styleElement(this);
      }

      update(t) {
        const e = this.render();
        super.update(t),
          e !== Y &&
            this.constructor.render(e, this.renderRoot, {
              scopeName: this.localName,
              eventContext: this
            }),
          this._needsShimAdoptedStyleSheets &&
            ((this._needsShimAdoptedStyleSheets = !1),
            this.constructor._styles.forEach(t => {
              const e = document.createElement('style');
              (e.textContent = t.cssText), this.renderRoot.appendChild(e);
            }));
      }

      render() {
        return Y;
      }
    }
    (Z.finalized = !0),
      (Z.render = (t, e, s) => {
        if (!s || typeof s !== 'object' || !s.scopeName)
          throw new Error('The `scopeName` option is required.');
        const o = s.scopeName,
          n = O.has(e),
          r = F && e.nodeType === 11 && !!e.host,
          l = r && !L.has(o),
          h = l ? document.createDocumentFragment() : e;
        if (
          (((t, e, s) => {
            let o = O.get(e);
            void 0 === o &&
              (i(e, e.firstChild),
              O.set(e, (o = new C({ templateFactory: P, ...s }))),
              o.appendInto(e)),
              o.setValue(t),
              o.commit();
          })(t, h, { templateFactory: V(o), ...s }),
          l)
        ) {
          const t = O.get(h);
          O.delete(h);
          const s = t.value instanceof x ? t.value.template : void 0;
          I(o, h, s), i(e, e.firstChild), e.appendChild(h), O.set(e, t);
        }
        !n && r && window.ShadyCSS.styleElement(e.host);
      });
    /**
     * @license
     * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    const tt = new WeakMap(),
      et = g(t => e => {
        if (
          !(e instanceof _) ||
          e instanceof A ||
          e.committer.name !== 'style' ||
          e.committer.parts.length > 1
        )
          throw new Error(
            'The `styleMap` directive must be used in the style attribute and must be the only part in the attribute.'
          );
        const { committer: i } = e,
          { style: s } = i.element;
        let o = tt.get(e);
        void 0 === o &&
          ((s.cssText = i.strings.join(' ')), tt.set(e, (o = new Set()))),
          o.forEach(e => {
            e in t ||
              (o.delete(e),
              e.indexOf('-') === -1 ? (s[e] = null) : s.removeProperty(e));
          });
        for (const e in t)
          o.add(e),
            e.indexOf('-') === -1 ? (s[e] = t[e]) : s.setProperty(e, t[e]);
      });
    /**
     * @license
     * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at
     * http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at
     * http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at
     * http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at
     * http://polymer.github.io/PATENTS.txt
     */
    class it {
      constructor(t) {
        (this.classes = new Set()), (this.changed = !1), (this.element = t);
        const e = (t.getAttribute('class') || '').split(/\s+/);
        for (const t of e) this.classes.add(t);
      }

      add(t) {
        this.classes.add(t), (this.changed = !0);
      }

      remove(t) {
        this.classes.delete(t), (this.changed = !0);
      }

      commit() {
        if (this.changed) {
          let t = '';
          this.classes.forEach(e => (t += `${e} `)),
            this.element.setAttribute('class', t);
        }
      }
    }
    const st = new WeakMap(),
      ot = g(t => e => {
        if (
          !(e instanceof _) ||
          e instanceof A ||
          e.committer.name !== 'class' ||
          e.committer.parts.length > 1
        )
          throw new Error(
            'The `classMap` directive must be used in the `class` attribute and must be the only part in the attribute.'
          );
        const { committer: i } = e,
          { element: s } = i;
        let o = st.get(e);
        void 0 === o &&
          (s.setAttribute('class', i.strings.join(' ')),
          st.set(e, (o = new Set())));
        const n = s.classList || new it(s);
        o.forEach(e => {
          e in t || (n.remove(e), o.delete(e));
        });
        for (const e in t) {
          const i = t[e];
          i != o.has(e) &&
            (i ? (n.add(e), o.add(e)) : (n.remove(e), o.delete(e)));
        }
        typeof n.commit === 'function' && n.commit();
      }),
      nt = (t, e) => {
        const i = t.startNode.parentNode,
          s = void 0 === e ? t.endNode : e.startNode,
          o = i.insertBefore(a(), s);
        i.insertBefore(a(), s);
        const n = new C(t.options);
        return n.insertAfterNode(o), n;
      },
      rt = (t, e) => (t.setValue(e), t.commit(), t),
      lt = (t, e, i) => {
        const s = t.startNode.parentNode,
          o = i ? i.startNode : t.endNode,
          n = e.endNode.nextSibling;
        n !== o &&
          ((t, e, i = null, s = null) => {
            for (; e !== i; ) {
              const i = e.nextSibling;
              t.insertBefore(e, s), (e = i);
            }
          })(s, e.startNode, n, o);
      },
      ht = t => {
        i(t.startNode.parentNode, t.startNode, t.endNode.nextSibling);
      },
      at = (t, e, i) => {
        const s = new Map();
        for (let o = e; o <= i; o++) s.set(t[o], o);
        return s;
      },
      ct = new WeakMap(),
      dt = new WeakMap(),
      pt = g((t, e, i) => {
        let s;
        return (
          void 0 === i ? (i = e) : void 0 !== e && (s = e),
          e => {
            if (!(e instanceof C))
              throw new Error('repeat can only be used in text bindings');
            const o = ct.get(e) || [],
              n = dt.get(e) || [],
              r = [],
              l = [],
              h = [];
            let a,
              c,
              d = 0;
            for (const e of t) (h[d] = s ? s(e, d) : d), (l[d] = i(e, d)), d++;
            let p = 0,
              u = o.length - 1,
              f = 0,
              g = l.length - 1;
            for (; p <= u && f <= g; )
              if (o[p] === null) p++;
              else if (o[u] === null) u--;
              else if (n[p] === h[f]) (r[f] = rt(o[p], l[f])), p++, f++;
              else if (n[u] === h[g]) (r[g] = rt(o[u], l[g])), u--, g--;
              else if (n[p] === h[g])
                (r[g] = rt(o[p], l[g])), lt(e, o[p], r[g + 1]), p++, g--;
              else if (n[u] === h[f])
                (r[f] = rt(o[u], l[f])), lt(e, o[u], o[p]), u--, f++;
              else if (
                (void 0 === a && ((a = at(h, f, g)), (c = at(n, p, u))),
                a.has(n[p]))
              )
                if (a.has(n[u])) {
                  const t = c.get(h[f]),
                    i = void 0 !== t ? o[t] : null;
                  if (i === null) {
                    const t = nt(e, o[p]);
                    rt(t, l[f]), (r[f] = t);
                  } else (r[f] = rt(i, l[f])), lt(e, i, o[p]), (o[t] = null);
                  f++;
                } else ht(o[u]), u--;
              else ht(o[p]), p++;
            for (; f <= g; ) {
              const t = nt(e, r[g + 1]);
              rt(t, l[f]), (r[f++] = t);
            }
            for (; p <= u; ) {
              const t = o[p++];
              t !== null && ht(t);
            }
            ct.set(e, r), dt.set(e, h);
          }
        );
      }),
      ut = {
        fetch() {
          const t = JSON.parse(
            localStorage.getItem('todos-lit-element') || '[]'
          );
          return (
            t.forEach(function(t, e) {
              t.id = e;
            }),
            (ut.uid = t.length),
            t
          );
        },
        save(t) {
          localStorage.setItem('todos-lit-element', JSON.stringify(t));
        }
      },
      ft = {
        all(t) {
          return t;
        },
        active(t) {
          return t.filter(function(t) {
            return !t.completed;
          });
        },
        completed(t) {
          return t.filter(function(t) {
            return t.completed;
          });
        },
        pluralize(t) {
          return t === 1 ? 'item' : 'items';
        }
      };
    class gt extends Z {
      static get styles() {
        return X`
      :host {
        font: 14px 'Helvetica Neue', Helvetica, Arial, sans-serif;
        line-height: 1.4em;
        background: #f5f5f5;
        color: #4d4d4d;
        margin: 0 auto;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        font-weight: 300;
      }
      
      button {
        margin: 0;
        padding: 0;
        border: 0;
        background: none;
        font-size: 100%;
        vertical-align: baseline;
        font-family: inherit;
        font-weight: inherit;
        color: inherit;
        -webkit-appearance: none;
        appearance: none;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      :focus {
        outline: 0;
      }

      .hidden {
        display: none;
      }

      .todoapp {
        background: #fff;
        margin: 130px 0 40px 0;
        position: relative;
        box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2),
                    0 25px 50px 0 rgba(0, 0, 0, 0.1);
      }

      .todoapp input::-webkit-input-placeholder {
        font-style: italic;
        font-weight: 300;
        color: #e6e6e6;
      }

      .todoapp input::-moz-placeholder {
        font-style: italic;
        font-weight: 300;
        color: #e6e6e6;
      }

      .todoapp input::input-placeholder {
        font-style: italic;
        font-weight: 300;
        color: #e6e6e6;
      }

      .todoapp h1 {
        position: absolute;
        top: -155px;
        width: 100%;
        font-size: 100px;
        font-weight: 100;
        text-align: center;
        color: rgba(175, 47, 47, 0.15);
        -webkit-text-rendering: optimizeLegibility;
        -moz-text-rendering: optimizeLegibility;
        text-rendering: optimizeLegibility;
      }

      .new-todo,
      .edit {
        position: relative;
        margin: 0;
        width: 100%;
        font-size: 24px;
        font-family: inherit;
        font-weight: inherit;
        line-height: 1.4em;
        border: 0;
        color: inherit;
        padding: 6px;
        border: 1px solid #999;
        box-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);
        box-sizing: border-box;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .new-todo {
        padding: 16px 16px 16px 60px;
        border: none;
        background: rgba(0, 0, 0, 0.003);
        box-shadow: inset 0 -2px 1px rgba(0,0,0,0.03);
      }

      .main {
        position: relative;
        z-index: 2;
        border-top: 1px solid #e6e6e6;
      }

      .toggle-all {
        width: 1px;
        height: 1px;
        border: none; /* Mobile Safari */
        opacity: 0;
        position: absolute;
        right: 100%;
        bottom: 100%;
      }

      .toggle-all + label {
        width: 60px;
        height: 34px;
        font-size: 0;
        position: absolute;
        top: -52px;
        left: -13px;
        -webkit-transform: rotate(90deg);
        transform: rotate(90deg);
      }

      .toggle-all + label:before {
        content: '❯';
        font-size: 22px;
        color: #e6e6e6;
        padding: 10px 27px 10px 27px;
      }

      .toggle-all:checked + label:before {
        color: #737373;
      }

      .todo-list {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .todo-list li {
        position: relative;
        font-size: 24px;
        border-bottom: 1px solid #ededed;
      }

      .todo-list li:last-child {
        border-bottom: none;
      }

      .todo-list li.editing {
        border-bottom: none;
        padding: 0;
      }

      .todo-list li.editing .edit {
        display: block;
        width: calc(100% - 43px);
        padding: 12px 16px;
        margin: 0 0 0 43px;
      }

      .todo-list li.editing .view {
        display: none;
      }

      .todo-list li .toggle {
        text-align: center;
        width: 40px;
        /* auto, since non-WebKit browsers doesn't support input styling */
        height: auto;
        position: absolute;
        top: 0;
        bottom: 0;
        margin: auto 0;
        border: none; /* Mobile Safari */
        -webkit-appearance: none;
        appearance: none;
      }

      .todo-list li .toggle {
        opacity: 0;
      }

      .todo-list li .toggle + label {
        /*
          Firefox requires "#" to be escaped - https://bugzilla.mozilla.org/show_bug.cgi?id=922433
          IE and Edge requires *everything* to be escaped to render, so we do that instead of just the "#" - https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/7157459/
        */
        background-image: url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23ededed%22%20stroke-width%3D%223%22/%3E%3C/svg%3E');
        background-repeat: no-repeat;
        background-position: center left;
      }

      .todo-list li .toggle:checked + label {
        background-image: url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23bddad5%22%20stroke-width%3D%223%22/%3E%3Cpath%20fill%3D%22%235dc2af%22%20d%3D%22M72%2025L42%2071%2027%2056l-4%204%2020%2020%2034-52z%22/%3E%3C/svg%3E');
      }

      .todo-list li label {
        word-break: break-all;
        padding: 15px 15px 15px 60px;
        display: block;
        line-height: 1.2;
        transition: color 0.4s;
      }

      .todo-list li.completed label {
        color: #d9d9d9;
        text-decoration: line-through;
      }

      .todo-list li .destroy {
        display: none;
        position: absolute;
        top: 0;
        right: 10px;
        bottom: 0;
        width: 40px;
        height: 40px;
        margin: auto 0;
        font-size: 30px;
        color: #cc9a9a;
        margin-bottom: 11px;
        transition: color 0.2s ease-out;
      }

      .todo-list li .destroy:hover {
        color: #af5b5e;
      }

      .todo-list li .destroy:after {
        content: '×';
      }

      .todo-list li:hover .destroy {
        display: block;
      }

      .todo-list li .edit {
        display: none;
      }

      .todo-list li.editing:last-child {
        margin-bottom: -1px;
      }

      .footer {
        color: #777;
        padding: 10px 15px;
        height: 20px;
        text-align: center;
        border-top: 1px solid #e6e6e6;
      }

      .footer:before {
        content: '';
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 50px;
        overflow: hidden;
        box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2),
                    0 8px 0 -3px #f6f6f6,
                    0 9px 1px -3px rgba(0, 0, 0, 0.2),
                    0 16px 0 -6px #f6f6f6,
                    0 17px 2px -6px rgba(0, 0, 0, 0.2);
      }

      .todo-count {
        float: left;
        text-align: left;
      }

      .todo-count strong {
        font-weight: 300;
      }

      .filters {
        margin: 0;
        padding: 0;
        list-style: none;
        position: absolute;
        right: 0;
        left: 0;
      }

      .filters li {
        display: inline;
      }

      .filters li a {
        color: inherit;
        margin: 3px;
        padding: 3px 7px;
        text-decoration: none;
        border: 1px solid transparent;
        border-radius: 3px;
      }

      .filters li a:hover {
        border-color: rgba(175, 47, 47, 0.1);
      }

      .filters li a.selected {
        border-color: rgba(175, 47, 47, 0.2);
      }

      .clear-completed,
      html .clear-completed:active {
        float: right;
        position: relative;
        line-height: 20px;
        text-decoration: none;
        cursor: pointer;
      }

      .clear-completed:hover {
        text-decoration: underline;
      }

      .info {
        margin: 65px auto 0;
        color: #bfbfbf;
        font-size: 10px;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
        text-align: center;
      }

      .info p {
        line-height: 1;
      }

      .info a {
        color: inherit;
        text-decoration: none;
        font-weight: 400;
      }

      .info a:hover {
        text-decoration: underline;
      }

      /*
        Hack to remove background from Mobile Safari.
        Can't use it globally since it destroys checkboxes in Firefox
      */
      @media screen and (-webkit-min-device-pixel-ratio:0) {
        .toggle-all,
        .todo-list li .toggle {
          background: none;
        }

        .todo-list li .toggle {
          height: 40px;
        }
      }

      @media (max-width: 430px) {
        .footer {
          height: 50px;
        }

        .filters {
          bottom: 10px;
        }
      }
    `;
      }

      static get properties() {
        return {
          todos: { type: Array },
          newTodo: { type: String },
          editedTodo: { type: Object },
          visibility: { type: String }
        };
      }

      constructor() {
        super(),
          (this.todos = ut.fetch()),
          (this.newTodo = ''),
          (this.editedTodo = null),
          (this.visibility = 'all');
      }

      render() {
        return N`
      <div class="todoapp">
        <header class="header">
          <h1>todos</h1>
          <input
            class="new-todo"
            autofocus
            autocomplete="off"
            placeholder="What needs to be done?"
            .value=${this.newTodo}
            @input=${t => {
              this.newTodo = t.target.value;
            }}
            @keyup=${t => {
              t.keyCode === 13 && this.addTodo();
            }}
          >
        </header>
        <section class="main" style=${et({
          display: this.todos.length ? '' : 'none'
        })}>
          <input
            id="toggle-all"
            class="toggle-all"
            type="checkbox"
            ?checked=${this.allDone}
            @change=${t => {
              this.toggleTodoAll(t.target.checked);
            }}
          >
          <label for="toggle-all"></label>
          <ul class="todo-list">

          ${pt(
            this.filteredTodos,
            t => t.id,
            (t, e) => N`
            <li
              class="${ot({
                todo: !0,
                completed: t.completed,
                editing: t == this.editedTodo
              })}"
            >
              <div class="view">
                <input class="toggle" type="checkbox" ?checked=${
                  t.completed
                } @change=${() => {
              this.toggleTodo(t);
            }}>
                <label @dblclick=${() => {
                  this.editTodo(t);
                }}>${t.title}</label>
                <button class="destroy" @click=${() => {
                  this.removeTodo(t);
                }}></button>
              </div>
              <input
                class="edit"
                type="text"
                .value=${t.title}
                @input=${e => {
                  t.title = e.target.value;
                }}
                @blur=${() => {
                  this.doneEdit(t);
                }}
                @keyup=${e => {
                  e.keyCode === 13 && this.doneEdit(t),
                    e.keyCode === 27 && this.cancelEdit(t);
                }}
              >
            </li>
          `
          )}
          </ul>
        </section>
        <footer class="footer" style=${et({
          display: this.todos.length ? '' : 'none'
        })}>
          <span class="todo-count">
            <strong>${this.remaining}</strong> ${ft.pluralize(
          this.remaining
        )} left
          </span>
          <ul class="filters">
            <li>
              <a
                href="#/all"
                @click=${() => {
                  this.visibility = 'all';
                }}
                class=${ot({ selected: this.visibility == 'all' })}
              >
                All
              </a>
            </li>
            <li>
              <a
                href="#/active"
                @click=${() => {
                  this.visibility = 'active';
                }}
                class=${ot({ selected: this.visibility == 'active' })}
              >
                Active
              </a>
            </li>
            <li>
              <a
                href="#/completed"
                @click=${() => {
                  this.visibility = 'completed';
                }}
                class=${ot({ selected: this.visibility == 'completed' })}
              >
                Completed
              </a>
            </li>
          </ul>
          <button
            class="clear-completed"
            @click=${this.removeCompleted}
            style="${et({
              display: this.todos.length > this.remaining ? '' : 'none'
            })}"
          >
            Clear completed
          </button>
        </footer>
      </div>
      <footer class="info">
        <p>Double-click to edit a todo</p>
        <p>Written by <a href="https://github.com/aui">Aui</a></p>
        <p>Part of <a href="https://todomvc.com">TodoMVC</a></p>
      </footer>
    `;
      }

      get filteredTodos() {
        return ft[this.visibility](this.todos);
      }

      get remaining() {
        return ft.active(this.todos).length;
      }

      get allDone() {
        return this.remaining === 0;
      }

      set allDone(t) {
        this.todos.forEach(function(e) {
          e.completed = t;
        });
      }

      save() {
        ut.save(this.todos), this.requestUpdate();
      }

      toggleTodo(t) {
        (t.completed = !t.completed), this.save();
      }

      toggleTodoAll(t) {
        (this.allDone = t), this.save();
      }

      addTodo() {
        const t = this.newTodo && this.newTodo.trim();
        t &&
          (this.todos.push({ id: ut.uid++, title: t, completed: !1 }),
          (this.newTodo = ''),
          this.save());
      }

      removeTodo(t) {
        this.todos.splice(this.todos.indexOf(t), 1), this.save();
      }

      editTodo(t) {
        (this.beforeEditCache = t.title), (this.editedTodo = t);
      }

      doneEdit(t) {
        this.editedTodo &&
          ((this.editedTodo = null),
          (t.title = t.title.trim()),
          t.title || this.removeTodo(t),
          this.save());
      }

      cancelEdit(t) {
        (this.editedTodo = null), (t.title = this.beforeEditCache);
      }

      removeCompleted() {
        (this.todos = ft.active(this.todos)), this.save();
      }

      todoFocus(t, e) {
        e && t.focus();
      }
    }
    window.customElements.define('my-todo', gt),
      (t.MyTodo = gt),
      Object.defineProperty(t, 'm', { value: !0 });
  }),
  typeof exports === 'object' && typeof module !== 'undefined'
    ? e(exports)
    : typeof define === 'function' && define.amd
    ? define(['exports'], e)
    : e(((t = t || self).MyTodo = {}));
