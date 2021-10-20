(() => {
  'use strict';
  var t = {
      814: (t) => {
        t.exports = function (t) {
          var e = [];
          return (
            (e.toString = function () {
              return this.map(function (e) {
                var n = t(e);
                return e[2] ? '@media '.concat(e[2], ' {').concat(n, '}') : n;
              }).join('');
            }),
            (e.i = function (t, n, o) {
              'string' == typeof t && (t = [[null, t, '']]);
              var i = {};
              if (o)
                for (var r = 0; r < this.length; r++) {
                  var a = this[r][0];
                  null != a && (i[a] = !0);
                }
              for (var l = 0; l < t.length; l++) {
                var s = [].concat(t[l]);
                (o && i[s[0]]) ||
                  (n &&
                    (s[2]
                      ? (s[2] = ''.concat(n, ' and ').concat(s[2]))
                      : (s[2] = n)),
                  e.push(s));
              }
            }),
            e
          );
        };
      },
      340: (t, e, n) => {
        n.d(e, { Z: () => r });
        var o = n(814),
          i = n.n(o)()(function (t) {
            return t[1];
          });
        i.push([
          t.id,
          "html,\nbody {\n\tmargin: 0;\n\tpadding: 0;\n}\n\nbutton {\n\tmargin: 0;\n\tpadding: 0;\n\tborder: 0;\n\tbackground: none;\n\tfont-size: 100%;\n\tvertical-align: baseline;\n\tfont-family: inherit;\n\tfont-weight: inherit;\n\tcolor: inherit;\n\t-webkit-appearance: none;\n\tappearance: none;\n\t-webkit-font-smoothing: antialiased;\n\t-moz-osx-font-smoothing: grayscale;\n}\n\nbody {\n\tfont: 14px 'Helvetica Neue', Helvetica, Arial, sans-serif;\n\tline-height: 1.4em;\n\tbackground: #f5f5f5;\n\tcolor: #4d4d4d;\n\tmin-width: 230px;\n\tmax-width: 550px;\n\tmargin: 0 auto;\n\t-webkit-font-smoothing: antialiased;\n\t-moz-osx-font-smoothing: grayscale;\n\tfont-weight: 300;\n}\n\n:focus {\n\toutline: 0;\n}\n\n.hidden {\n\tdisplay: none;\n}\n\n.todoapp {\n\tbackground: #fff;\n\tmargin: 130px 0 40px 0;\n\tposition: relative;\n\tbox-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2),\n\t            0 25px 50px 0 rgba(0, 0, 0, 0.1);\n}\n\n.todoapp input::-webkit-input-placeholder {\n\tfont-style: italic;\n\tfont-weight: 300;\n\tcolor: #e6e6e6;\n}\n\n.todoapp input::-moz-placeholder {\n\tfont-style: italic;\n\tfont-weight: 300;\n\tcolor: #e6e6e6;\n}\n\n.todoapp input::input-placeholder {\n\tfont-style: italic;\n\tfont-weight: 300;\n\tcolor: #e6e6e6;\n}\n\n.todoapp h1 {\n\tposition: absolute;\n\ttop: -155px;\n\twidth: 100%;\n\tfont-size: 100px;\n\tfont-weight: 100;\n\ttext-align: center;\n\tcolor: rgba(175, 47, 47, 0.15);\n\t-webkit-text-rendering: optimizeLegibility;\n\t-moz-text-rendering: optimizeLegibility;\n\ttext-rendering: optimizeLegibility;\n}\n\n.new-todo,\n.edit {\n\tposition: relative;\n\tmargin: 0;\n\twidth: 100%;\n\tfont-size: 24px;\n\tfont-family: inherit;\n\tfont-weight: inherit;\n\tline-height: 1.4em;\n\tborder: 0;\n\tcolor: inherit;\n\tpadding: 6px;\n\tborder: 1px solid #999;\n\tbox-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);\n\tbox-sizing: border-box;\n\t-webkit-font-smoothing: antialiased;\n\t-moz-osx-font-smoothing: grayscale;\n}\n\n.new-todo {\n\tpadding: 16px 16px 16px 60px;\n\tborder: none;\n\tbackground: rgba(0, 0, 0, 0.003);\n\tbox-shadow: inset 0 -2px 1px rgba(0,0,0,0.03);\n}\n\n.main {\n\tposition: relative;\n\tz-index: 2;\n\tborder-top: 1px solid #e6e6e6;\n}\n\n.toggle-all {\n\ttext-align: center;\n\tborder: none; /* Mobile Safari */\n\topacity: 0;\n\tposition: absolute;\n}\n\n.toggle-all + label {\n\twidth: 60px;\n\theight: 34px;\n\tfont-size: 0;\n\tposition: absolute;\n\ttop: -52px;\n\tleft: -13px;\n\t-webkit-transform: rotate(90deg);\n\ttransform: rotate(90deg);\n}\n\n.toggle-all + label:before {\n\tcontent: '❯';\n\tfont-size: 22px;\n\tcolor: #e6e6e6;\n\tpadding: 10px 27px 10px 27px;\n}\n\n.toggle-all:checked + label:before {\n\tcolor: #737373;\n}\n\n.todo-list {\n\tmargin: 0;\n\tpadding: 0;\n\tlist-style: none;\n}\n\n.todo-list li {\n\tposition: relative;\n\tfont-size: 24px;\n\tborder-bottom: 1px solid #ededed;\n}\n\n.todo-list li:last-child {\n\tborder-bottom: none;\n}\n\n.todo-list li.editing {\n\tborder-bottom: none;\n\tpadding: 0;\n}\n\n.todo-list li.editing .edit {\n\tdisplay: block;\n\twidth: 506px;\n\tpadding: 12px 16px;\n\tmargin: 0 0 0 43px;\n}\n\n.todo-list li.editing .view {\n\tdisplay: none;\n}\n\n.todo-list li .toggle {\n\ttext-align: center;\n\twidth: 40px;\n\t/* auto, since non-WebKit browsers doesn't support input styling */\n\theight: auto;\n\tposition: absolute;\n\ttop: 0;\n\tbottom: 0;\n\tmargin: auto 0;\n\tborder: none; /* Mobile Safari */\n\t-webkit-appearance: none;\n\tappearance: none;\n}\n\n.todo-list li .toggle {\n\topacity: 0;\n}\n\n.todo-list li .toggle + label {\n\t/*\n\t\tFirefox requires `#` to be escaped - https://bugzilla.mozilla.org/show_bug.cgi?id=922433\n\t\tIE and Edge requires *everything* to be escaped to render, so we do that instead of just the `#` - https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/7157459/\n\t*/\n\tbackground-image: url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23ededed%22%20stroke-width%3D%223%22/%3E%3C/svg%3E');\n\tbackground-repeat: no-repeat;\n\tbackground-position: center left;\n}\n\n.todo-list li .toggle:checked + label {\n\tbackground-image: url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23bddad5%22%20stroke-width%3D%223%22/%3E%3Cpath%20fill%3D%22%235dc2af%22%20d%3D%22M72%2025L42%2071%2027%2056l-4%204%2020%2020%2034-52z%22/%3E%3C/svg%3E');\n}\n\n.todo-list li label {\n\tword-break: break-all;\n\tpadding: 15px 15px 15px 60px;\n\tdisplay: block;\n\tline-height: 1.2;\n\ttransition: color 0.4s;\n}\n\n.todo-list li.completed label {\n\tcolor: #d9d9d9;\n\ttext-decoration: line-through;\n}\n\n.todo-list li .destroy {\n\tdisplay: none;\n\tposition: absolute;\n\ttop: 0;\n\tright: 10px;\n\tbottom: 0;\n\twidth: 40px;\n\theight: 40px;\n\tmargin: auto 0;\n\tfont-size: 30px;\n\tcolor: #cc9a9a;\n\tmargin-bottom: 11px;\n\ttransition: color 0.2s ease-out;\n}\n\n.todo-list li .destroy:hover {\n\tcolor: #af5b5e;\n\tcursor:pointer;\n}\n\n.todo-list li .destroy:after {\n\tcontent: '×';\n}\n\n.todo-list li:hover .destroy {\n\tdisplay: block;\n}\n\n.todo-list li .edit {\n\tdisplay: none;\n}\n\n.todo-list li.editing:last-child {\n\tmargin-bottom: -1px;\n}\n\n.footer {\n\tcolor: #777;\n\tpadding: 10px 15px;\n\theight: 20px;\n\ttext-align: center;\n\tborder-top: 1px solid #e6e6e6;\n}\n\n.footer:before {\n\tcontent: '';\n\tposition: absolute;\n\tright: 0;\n\tbottom: 0;\n\tleft: 0;\n\theight: 50px;\n\toverflow: hidden;\n\tbox-shadow: 0 1px 1px rgba(0, 0, 0, 0.2),\n\t            0 8px 0 -3px #f6f6f6,\n\t            0 9px 1px -3px rgba(0, 0, 0, 0.2),\n\t            0 16px 0 -6px #f6f6f6,\n\t            0 17px 2px -6px rgba(0, 0, 0, 0.2);\n}\n\n.todo-count {\n\tfloat: left;\n\ttext-align: left;\n}\n\n.todo-count strong {\n\tfont-weight: 300;\n}\n\n.filters {\n\tmargin: 0;\n\tpadding: 0;\n\tlist-style: none;\n\tposition: absolute;\n\tright: 0;\n\tleft: 0;\n}\n\n.filters li {\n\tdisplay: inline;\n}\n\n.filters li {\n\tcolor: inherit;\n\tmargin: 3px;\n\tpadding: 3px 7px;\n\ttext-decoration: none;\n\tborder: 1px solid transparent;\n\tborder-radius: 3px;\n}\n\n.filters li:hover {\n\tborder-color: rgba(175, 47, 47, 0.1);\n\tcursor: pointer;\n}\n\n.filters li.selected {\n\tborder-color: rgba(175, 47, 47, 0.2);\n}\n\n.clear-completed,\nhtml .clear-completed:active {\n\tfloat: right;\n\tposition: relative;\n\tline-height: 20px;\n\ttext-decoration: none;\n\tcursor: pointer;\n}\n\n.clear-completed:hover {\n\ttext-decoration: underline;\n}\n\n.info {\n\tmargin: 65px auto 0;\n\tcolor: #bfbfbf;\n\tfont-size: 10px;\n\ttext-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);\n\ttext-align: center;\n}\n\n.info p {\n\tline-height: 1;\n}\n\n.info a {\n\tcolor: inherit;\n\ttext-decoration: none;\n\tfont-weight: 400;\n}\n\n.info a:hover {\n\ttext-decoration: underline;\n}",
          ''
        ]);
        const r = i;
      },
      379: (t, e, n) => {
        var o,
          i = (function () {
            var t = {};
            return function (e) {
              if (void 0 === t[e]) {
                var n = document.querySelector(e);
                if (
                  window.HTMLIFrameElement &&
                  n instanceof window.HTMLIFrameElement
                )
                  try {
                    n = n.contentDocument.head;
                  } catch (t) {
                    n = null;
                  }
                t[e] = n;
              }
              return t[e];
            };
          })(),
          r = [];
        function a(t) {
          for (var e = -1, n = 0; n < r.length; n++)
            if (r[n].identifier === t) {
              e = n;
              break;
            }
          return e;
        }
        function l(t, e) {
          for (var n = {}, o = [], i = 0; i < t.length; i++) {
            var l = t[i],
              s = e.base ? l[0] + e.base : l[0],
              d = n[s] || 0,
              c = ''.concat(s, ' ').concat(d);
            n[s] = d + 1;
            var p = a(c),
              h = { css: l[1], media: l[2], sourceMap: l[3] };
            -1 !== p
              ? (r[p].references++, r[p].updater(h))
              : r.push({ identifier: c, updater: f(h, e), references: 1 }),
              o.push(c);
          }
          return o;
        }
        function s(t) {
          var e = document.createElement('style'),
            o = t.attributes || {};
          if (void 0 === o.nonce) {
            var r = n.nc;
            r && (o.nonce = r);
          }
          if (
            (Object.keys(o).forEach(function (t) {
              e.setAttribute(t, o[t]);
            }),
            'function' == typeof t.insert)
          )
            t.insert(e);
          else {
            var a = i(t.insert || 'head');
            if (!a)
              throw new Error(
                "Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
              );
            a.appendChild(e);
          }
          return e;
        }
        var d,
          c =
            ((d = []),
            function (t, e) {
              return (d[t] = e), d.filter(Boolean).join('\n');
            });
        function p(t, e, n, o) {
          var i = n
            ? ''
            : o.media
            ? '@media '.concat(o.media, ' {').concat(o.css, '}')
            : o.css;
          if (t.styleSheet) t.styleSheet.cssText = c(e, i);
          else {
            var r = document.createTextNode(i),
              a = t.childNodes;
            a[e] && t.removeChild(a[e]),
              a.length ? t.insertBefore(r, a[e]) : t.appendChild(r);
          }
        }
        function h(t, e, n) {
          var o = n.css,
            i = n.media,
            r = n.sourceMap;
          if (
            (i ? t.setAttribute('media', i) : t.removeAttribute('media'),
            r &&
              'undefined' != typeof btoa &&
              (o +=
                '\n/*# sourceMappingURL=data:application/json;base64,'.concat(
                  btoa(unescape(encodeURIComponent(JSON.stringify(r)))),
                  ' */'
                )),
            t.styleSheet)
          )
            t.styleSheet.cssText = o;
          else {
            for (; t.firstChild; ) t.removeChild(t.firstChild);
            t.appendChild(document.createTextNode(o));
          }
        }
        var g = null,
          u = 0;
        function f(t, e) {
          var n, o, i;
          if (e.singleton) {
            var r = u++;
            (n = g || (g = s(e))),
              (o = p.bind(null, n, r, !1)),
              (i = p.bind(null, n, r, !0));
          } else
            (n = s(e)),
              (o = h.bind(null, n, e)),
              (i = function () {
                !(function (t) {
                  if (null === t.parentNode) return !1;
                  t.parentNode.removeChild(t);
                })(n);
              });
          return (
            o(t),
            function (e) {
              if (e) {
                if (
                  e.css === t.css &&
                  e.media === t.media &&
                  e.sourceMap === t.sourceMap
                )
                  return;
                o((t = e));
              } else i();
            }
          );
        }
        t.exports = function (t, e) {
          (e = e || {}).singleton ||
            'boolean' == typeof e.singleton ||
            (e.singleton =
              (void 0 === o &&
                (o = Boolean(
                  window && document && document.all && !window.atob
                )),
              o));
          var n = l((t = t || []), e);
          return function (t) {
            if (
              ((t = t || []),
              '[object Array]' === Object.prototype.toString.call(t))
            ) {
              for (var o = 0; o < n.length; o++) {
                var i = a(n[o]);
                r[i].references--;
              }
              for (var s = l(t, e), d = 0; d < n.length; d++) {
                var c = a(n[d]);
                0 === r[c].references && (r[c].updater(), r.splice(c, 1));
              }
              n = s;
            }
          };
        };
      }
    },
    e = {};
  function n(o) {
    var i = e[o];
    if (void 0 !== i) return i.exports;
    var r = (e[o] = { id: o, exports: {} });
    return t[o](r, r.exports, n), r.exports;
  }
  (n.n = (t) => {
    var e = t && t.__esModule ? () => t.default : () => t;
    return n.d(e, { a: e }), e;
  }),
    (n.d = (t, e) => {
      for (var o in e)
        n.o(e, o) &&
          !n.o(t, o) &&
          Object.defineProperty(t, o, { enumerable: !0, get: e[o] });
    }),
    (n.o = (t, e) => Object.prototype.hasOwnProperty.call(t, e)),
    (() => {
      const t = React;
      var e = n.n(t);
      const o = {
          uuid() {
            let t,
              e,
              n = '';
            for (t = 0; t < 32; t++)
              (e = (16 * Math.random()) | 0),
                (8 !== t && 12 !== t && 16 !== t && 20 !== t) || (n += '-'),
                (n += (12 === t ? 4 : 16 === t ? (3 & e) | 8 : e).toString(16));
            return n;
          },
          pluralize: (t, e) => (1 === t ? e : `${e}s`),
          store(t, e) {
            if (e) return localStorage.setItem(t, JSON.stringify(e));
            const n = localStorage.getItem(t);
            return (n && JSON.parse(n)) || [];
          },
          extend() {
            const t = {};
            for (let e = 0; e < arguments.length; e++) {
              const n = arguments[e];
              for (const e in n) n.hasOwnProperty(e) && (t[e] = n[e]);
            }
            return t;
          }
        },
        i = function (t) {
          (this.key = t), (this.todos = o.store(t)), (this.onChanges = []);
        };
      (i.prototype.subscribe = function (t) {
        this.onChanges.push(t);
      }),
        (i.prototype.inform = function () {
          o.store(this.key, this.todos),
            this.onChanges.forEach(function (t) {
              t();
            });
        }),
        (i.prototype.addTodo = function (t) {
          (this.todos = this.todos.concat({
            id: o.uuid(),
            title: t,
            completed: !1
          })),
            this.inform();
        }),
        (i.prototype.toggleAll = function (t) {
          (this.todos = this.todos.map(function (e) {
            return o.extend({}, e, { completed: t });
          })),
            this.inform();
        }),
        (i.prototype.toggle = function (t) {
          (this.todos = this.todos.map(function (e) {
            return e !== t ? e : o.extend({}, e, { completed: !e.completed });
          })),
            this.inform();
        }),
        (i.prototype.destroy = function (t) {
          (this.todos = this.todos.filter(function (e) {
            return e !== t;
          })),
            this.inform();
        }),
        (i.prototype.save = function (t, e) {
          (this.todos = this.todos.map(function (n) {
            return n !== t ? n : o.extend({}, n, { title: e });
          })),
            this.inform();
        }),
        (i.prototype.clearCompleted = function () {
          (this.todos = this.todos.filter(function (t) {
            return !t.completed;
          })),
            this.inform();
        });
      const r = i,
        a = e().createClass({
          displayName: 'TodoItem',
          handleSubmit: function (t) {
            var e = this.state.editText.trim();
            e
              ? (this.props.onSave(e), this.setState({ editText: e }))
              : this.props.onDestroy();
          },
          handleEdit: function () {
            this.props.onEdit(),
              this.setState({ editText: this.props.todo.title });
          },
          handleKeyDown: function (t) {
            27 === t.which
              ? (this.setState({ editText: this.props.todo.title }),
                this.props.onCancel(t))
              : 13 === t.which && this.handleSubmit(t);
          },
          handleChange: function (t) {
            this.props.editing && this.setState({ editText: t.target.value });
          },
          getInitialState: function () {
            return { editText: this.props.todo.title };
          },
          shouldComponentUpdate: function (t, e) {
            return (
              t.todo !== this.props.todo ||
              t.editing !== this.props.editing ||
              e.editText !== this.state.editText
            );
          },
          componentDidUpdate: function (t) {
            if (!t.editing && this.props.editing) {
              var n = e().findDOMNode(this.refs.editField);
              n.focus(), n.setSelectionRange(n.value.length, n.value.length);
            }
          },
          render: function () {
            let t = '';
            return (
              this.props.todo.completed && (t += 'completed'),
              this.props.editing && (t += 'editing'),
              e().createElement(
                'li',
                { className: t },
                e().createElement(
                  'div',
                  { className: 'view' },
                  e().createElement('input', {
                    className: 'toggle',
                    type: 'checkbox',
                    checked: this.props.todo.completed,
                    onChange: this.props.onToggle
                  }),
                  e().createElement(
                    'label',
                    { onDoubleClick: this.handleEdit },
                    this.props.todo.title
                  ),
                  e().createElement('div', {
                    className: 'destroy',
                    onClick: this.props.onDestroy
                  })
                ),
                e().createElement('input', {
                  ref: 'editField',
                  className: 'edit',
                  value: this.state.editText,
                  onBlur: this.handleSubmit,
                  onChange: this.handleChange,
                  onKeyDown: this.handleKeyDown
                })
              )
            );
          }
        }),
        l = 'active',
        s = 'completed',
        d = e().createClass({
          displayName: 'TodoFooter',
          render: function () {
            var t = o.pluralize(this.props.count, 'item'),
              n = null;
            this.props.completedCount > 0 &&
              (n = e().createElement(
                'div',
                {
                  className: 'clear-completed',
                  onClick: this.props.onClearCompleted
                },
                'Clear completed'
              ));
            var i = this.props.nowShowing,
              r = 'all' === i ? 'selected' : '',
              a = i === l ? 'selected' : '',
              d = i === s ? 'selected' : '';
            return e().createElement(
              'footer',
              { className: 'footer' },
              e().createElement(
                'span',
                { className: 'todo-count' },
                e().createElement('strong', null, this.props.count),
                ' ',
                t,
                ' left'
              ),
              e().createElement(
                'ul',
                { className: 'filters' },
                e().createElement(
                  'li',
                  {
                    onClick: () => {
                      this.props.onChangeRouter('all');
                    },
                    className: r
                  },
                  'All'
                ),
                ' ',
                e().createElement(
                  'li',
                  {
                    onClick: () => {
                      this.props.onChangeRouter(l);
                    },
                    className: a
                  },
                  'Active'
                ),
                ' ',
                e().createElement(
                  'li',
                  {
                    onClick: () => {
                      this.props.onChangeRouter(s);
                    },
                    className: d
                  },
                  'Completed'
                )
              ),
              n
            );
          }
        });
      class c extends e().Component {
        constructor(t) {
          super(t),
            (this.state = { nowShowing: 'all', editing: null, newTodo: '' }),
            (this.handleNewTodoKeyDown = this.handleNewTodoKeyDown.bind(this)),
            (this.handleChange = this.handleChange.bind(this)),
            (this.toggleAll = this.toggleAll.bind(this)),
            (this.toggle = this.toggle.bind(this)),
            (this.edit = this.edit.bind(this)),
            (this.save = this.save.bind(this)),
            (this.cancel = this.cancel.bind(this)),
            (this.clearCompleted = this.clearCompleted.bind(this));
        }
        changeRouter(t) {
          this.setState({ nowShowing: t });
        }
        handleChange(t) {
          this.setState({ newTodo: t.target.value });
        }
        handleNewTodoKeyDown(t) {
          if (13 === t.keyCode) {
            t.preventDefault();
            var e = this.state.newTodo.trim();
            e && (this.props.model.addTodo(e), this.setState({ newTodo: '' }));
          }
        }
        toggleAll(t) {
          var e = t.target.checked;
          this.props.model.toggleAll(e);
        }
        toggle(t) {
          this.props.model.toggle(t);
        }
        destroy(t) {
          this.props.model.destroy(t);
        }
        edit(t) {
          this.setState({ editing: t.id });
        }
        save(t, e) {
          this.props.model.save(t, e), this.setState({ editing: null });
        }
        cancel() {
          this.setState({ editing: null });
        }
        clearCompleted() {
          this.props.model.clearCompleted();
        }
        render() {
          var t,
            n,
            o = this.props.model.todos,
            i = o
              .filter(function (t) {
                switch (this.state.nowShowing) {
                  case 'active':
                    return !t.completed;
                  case 'completed':
                    return t.completed;
                  default:
                    return !0;
                }
              }, this)
              .map(function (t) {
                return e().createElement(a, {
                  key: t.id,
                  todo: t,
                  onToggle: this.toggle.bind(this, t),
                  onDestroy: this.destroy.bind(this, t),
                  onEdit: this.edit.bind(this, t),
                  editing: this.state.editing === t.id,
                  onSave: this.save.bind(this, t),
                  onCancel: this.cancel
                });
              }, this),
            r = o.reduce(function (t, e) {
              return e.completed ? t : t + 1;
            }, 0),
            l = o.length - r;
          return (
            (r || l) &&
              (t = e().createElement(d, {
                count: r,
                completedCount: l,
                nowShowing: this.state.nowShowing,
                onClearCompleted: this.clearCompleted,
                onChangeRouter: this.changeRouter.bind(this)
              })),
            o.length &&
              (n = e().createElement(
                'section',
                { className: 'main' },
                e().createElement('input', {
                  className: 'toggle-all',
                  type: 'checkbox',
                  onChange: this.toggleAll,
                  checked: 0 === r
                }),
                e().createElement('ul', { className: 'todo-list' }, i)
              )),
            e().createElement(
              'div',
              null,
              e().createElement(
                'div',
                { className: 'todoapp' },
                e().createElement(
                  'header',
                  { className: 'header' },
                  e().createElement('h1', null, 'todos'),
                  e().createElement('input', {
                    className: 'new-todo',
                    placeholder: 'What needs to be done?',
                    value: this.state.newTodo,
                    onKeyDown: this.handleNewTodoKeyDown,
                    onChange: this.handleChange,
                    autoFocus: !0
                  })
                ),
                n,
                t
              ),
              e().createElement(
                'div',
                { className: 'info' },
                e().createElement('p', null, 'Double-click to edit a todo'),
                e().createElement(
                  'p',
                  null,
                  'Created by ',
                  e().createElement(
                    'a',
                    { href: 'http://github.com/petehunt/' },
                    'petehunt'
                  )
                ),
                e().createElement(
                  'p',
                  null,
                  'Part of ',
                  e().createElement(
                    'a',
                    { href: 'http://todomvc.com' },
                    'TodoMVC'
                  )
                )
              )
            )
          );
        }
      }
      var p = n(379),
        h = n.n(p),
        g = n(340);
      h()(g.Z, { insert: 'head', singleton: !1 }),
        g.Z.locals,
        (function () {
          const t = new r('react-todos');
          function n() {
            e().render(
              e().createElement(c, { model: t }),
              document.body.getElementsByClassName('todo-appmvc')[0]
            );
          }
          t.subscribe(n), n();
        })();
    })();
})();
