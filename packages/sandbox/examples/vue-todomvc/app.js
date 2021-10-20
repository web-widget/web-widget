(() => {
  var n = {
      635: (n, t, e) => {
        var o = e(15),
          A = e(645)(o);
        A.push([
          n.id,
          "\n.app {\n  font: 14px 'Helvetica Neue', Helvetica, Arial, sans-serif;\n  line-height: 1.4em;\n  /* background: #f5f5f5; */\n  color: #4d4d4d;\n  min-width: 230px;\n  max-width: 550px;\n  margin: 0 auto;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  font-weight: 300;\n}\nbutton {\n  margin: 0;\n  padding: 0;\n  border: 0;\n  background: none;\n  font-size: 100%;\n  vertical-align: baseline;\n  font-family: inherit;\n  font-weight: inherit;\n  color: inherit;\n  -webkit-appearance: none;\n  appearance: none;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n:focus {\n  outline: 0;\n}\n.hidden {\n  display: none;\n}\n.todoapp {\n  background: #fff;\n  margin: 130px 0 40px 0;\n  position: relative;\n  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1);\n}\n.todoapp input::-webkit-input-placeholder {\n  font-style: italic;\n  font-weight: 300;\n  color: #e6e6e6;\n}\n.todoapp input::-moz-placeholder {\n  font-style: italic;\n  font-weight: 300;\n  color: #e6e6e6;\n}\n.todoapp input::input-placeholder {\n  font-style: italic;\n  font-weight: 300;\n  color: #e6e6e6;\n}\n.todoapp h1 {\n  position: absolute;\n  top: -155px;\n  width: 100%;\n  font-size: 100px;\n  font-weight: 100;\n  text-align: center;\n  color: rgba(175, 47, 47, 0.15);\n  -webkit-text-rendering: optimizeLegibility;\n  -moz-text-rendering: optimizeLegibility;\n  text-rendering: optimizeLegibility;\n}\n.new-todo,\n.edit {\n  position: relative;\n  margin: 0;\n  width: 100%;\n  font-size: 24px;\n  font-family: inherit;\n  font-weight: inherit;\n  line-height: 1.4em;\n  border: 0;\n  color: inherit;\n  padding: 6px;\n  border: 1px solid #999;\n  box-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);\n  box-sizing: border-box;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.new-todo {\n  padding: 16px 16px 16px 60px;\n  border: none;\n  background: rgba(0, 0, 0, 0.003);\n  box-shadow: inset 0 -2px 1px rgba(0, 0, 0, 0.03);\n}\n.main {\n  position: relative;\n  z-index: 2;\n  border-top: 1px solid #e6e6e6;\n}\n.toggle-all {\n  width: 1px;\n  height: 1px;\n  border: none; /* Mobile Safari */\n  opacity: 0;\n  position: absolute;\n  right: 100%;\n  bottom: 100%;\n}\n.toggle-all + label {\n  width: 60px;\n  height: 34px;\n  font-size: 0;\n  position: absolute;\n  top: -52px;\n  left: -13px;\n  -webkit-transform: rotate(90deg);\n  transform: rotate(90deg);\n}\n.toggle-all + label:before {\n  content: '❯';\n  font-size: 22px;\n  color: #e6e6e6;\n  padding: 10px 27px 10px 27px;\n}\n.toggle-all:checked + label:before {\n  color: #737373;\n}\n.todo-list {\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n.todo-list li {\n  position: relative;\n  font-size: 24px;\n  border-bottom: 1px solid #ededed;\n}\n.todo-list li:last-child {\n  border-bottom: none;\n}\n.todo-list li.editing {\n  border-bottom: none;\n  padding: 0;\n}\n.todo-list li.editing .edit {\n  display: block;\n  width: calc(100% - 43px);\n  padding: 12px 16px;\n  margin: 0 0 0 43px;\n}\n.todo-list li.editing .view {\n  display: none;\n}\n.todo-list li .toggle {\n  text-align: center;\n  width: 40px;\n  /* auto, since non-WebKit browsers doesn't support input styling */\n  height: auto;\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  margin: auto 0;\n  border: none; /* Mobile Safari */\n  -webkit-appearance: none;\n  appearance: none;\n}\n.todo-list li .toggle {\n  opacity: 0;\n}\n.todo-list li .toggle + label {\n  /*\n\t\tFirefox requires `#` to be escaped - https://bugzilla.mozilla.org/show_bug.cgi?id=922433\n\t\tIE and Edge requires *everything* to be escaped to render, so we do that instead of just the `#` - https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/7157459/\n\t*/\n  background-image: url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23ededed%22%20stroke-width%3D%223%22/%3E%3C/svg%3E');\n  background-repeat: no-repeat;\n  background-position: center left;\n}\n.todo-list li .toggle:checked + label {\n  background-image: url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23bddad5%22%20stroke-width%3D%223%22/%3E%3Cpath%20fill%3D%22%235dc2af%22%20d%3D%22M72%2025L42%2071%2027%2056l-4%204%2020%2020%2034-52z%22/%3E%3C/svg%3E');\n}\n.todo-list li label {\n  word-break: break-all;\n  padding: 15px 15px 15px 60px;\n  display: block;\n  line-height: 1.2;\n  transition: color 0.4s;\n}\n.todo-list li.completed label {\n  color: #d9d9d9;\n  text-decoration: line-through;\n}\n.todo-list li .destroy {\n  display: none;\n  position: absolute;\n  top: 0;\n  right: 10px;\n  bottom: 0;\n  width: 40px;\n  height: 40px;\n  margin: auto 0;\n  font-size: 30px;\n  color: #cc9a9a;\n  margin-bottom: 11px;\n  transition: color 0.2s ease-out;\n}\n.todo-list li .destroy:hover {\n  color: #af5b5e;\n}\n.todo-list li .destroy:after {\n  content: '×';\n}\n.todo-list li:hover .destroy {\n  display: block;\n}\n.todo-list li .edit {\n  display: none;\n}\n.todo-list li.editing:last-child {\n  margin-bottom: -1px;\n}\n.footer {\n  color: #777;\n  padding: 10px 15px;\n  height: 20px;\n  text-align: center;\n  border-top: 1px solid #e6e6e6;\n}\n.footer:before {\n  content: '';\n  position: absolute;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  height: 50px;\n  overflow: hidden;\n  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2), 0 8px 0 -3px #f6f6f6,\n    0 9px 1px -3px rgba(0, 0, 0, 0.2), 0 16px 0 -6px #f6f6f6,\n    0 17px 2px -6px rgba(0, 0, 0, 0.2);\n}\n.todo-count {\n  float: left;\n  text-align: left;\n}\n.todo-count strong {\n  font-weight: 300;\n}\n.filters {\n  margin: 0;\n  padding: 0;\n  list-style: none;\n  position: absolute;\n  right: 0;\n  left: 0;\n}\n.filters li {\n  display: inline;\n}\n.filters li button {\n  color: inherit;\n  margin: 3px;\n  padding: 3px 7px;\n  text-decoration: none;\n  border: 1px solid transparent;\n  border-radius: 3px;\n}\n.filters li button:hover {\n  border-color: rgba(175, 47, 47, 0.1);\n}\n.filters li button.selected {\n  border-color: rgba(175, 47, 47, 0.2);\n}\n.clear-completed,\nhtml .clear-completed:active {\n  float: right;\n  position: relative;\n  line-height: 20px;\n  text-decoration: none;\n  cursor: pointer;\n}\n.clear-completed:hover {\n  text-decoration: underline;\n}\n.info {\n  margin: 65px auto 0;\n  color: #bfbfbf;\n  font-size: 10px;\n  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);\n  text-align: center;\n}\n.info p {\n  line-height: 1;\n}\n.info a {\n  color: inherit;\n  text-decoration: none;\n  font-weight: 400;\n}\n.info a:hover {\n  text-decoration: underline;\n}\n\n/*\n\tHack to remove background from Mobile Safari.\n\tCan't use it globally since it destroys checkboxes in Firefox\n*/\n@media screen and (-webkit-min-device-pixel-ratio: 0) {\n.toggle-all,\n  .todo-list li .toggle {\n    background: none;\n}\n.todo-list li .toggle {\n    height: 40px;\n}\n}\n@media (max-width: 430px) {\n.footer {\n    height: 50px;\n}\n.filters {\n    bottom: 10px;\n}\n}\n",
          '',
          {
            version: 3,
            sources: ['webpack://./src/App.vue'],
            names: [],
            mappings:
              ';AA4OA;EACA,yDAAA;EACA,kBAAA;EACA,yBAAA;EACA,cAAA;EACA,gBAAA;EACA,gBAAA;EACA,cAAA;EACA,mCAAA;EACA,kCAAA;EACA,gBAAA;AACA;AAEA;EACA,SAAA;EACA,UAAA;EACA,SAAA;EACA,gBAAA;EACA,eAAA;EACA,wBAAA;EACA,oBAAA;EACA,oBAAA;EACA,cAAA;EACA,wBAAA;EACA,gBAAA;EACA,mCAAA;EACA,kCAAA;AACA;AAEA;EACA,UAAA;AACA;AAEA;EACA,aAAA;AACA;AAEA;EACA,gBAAA;EACA,sBAAA;EACA,kBAAA;EACA,4EAAA;AACA;AAEA;EACA,kBAAA;EACA,gBAAA;EACA,cAAA;AACA;AAEA;EACA,kBAAA;EACA,gBAAA;EACA,cAAA;AACA;AAEA;EACA,kBAAA;EACA,gBAAA;EACA,cAAA;AACA;AAEA;EACA,kBAAA;EACA,WAAA;EACA,WAAA;EACA,gBAAA;EACA,gBAAA;EACA,kBAAA;EACA,8BAAA;EACA,0CAAA;EACA,uCAAA;EACA,kCAAA;AACA;AAEA;;EAEA,kBAAA;EACA,SAAA;EACA,WAAA;EACA,eAAA;EACA,oBAAA;EACA,oBAAA;EACA,kBAAA;EACA,SAAA;EACA,cAAA;EACA,YAAA;EACA,sBAAA;EACA,iDAAA;EACA,sBAAA;EACA,mCAAA;EACA,kCAAA;AACA;AAEA;EACA,4BAAA;EACA,YAAA;EACA,gCAAA;EACA,gDAAA;AACA;AAEA;EACA,kBAAA;EACA,UAAA;EACA,6BAAA;AACA;AAEA;EACA,UAAA;EACA,WAAA;EACA,YAAA,EAAA,kBAAA;EACA,UAAA;EACA,kBAAA;EACA,WAAA;EACA,YAAA;AACA;AAEA;EACA,WAAA;EACA,YAAA;EACA,YAAA;EACA,kBAAA;EACA,UAAA;EACA,WAAA;EACA,gCAAA;EACA,wBAAA;AACA;AAEA;EACA,YAAA;EACA,eAAA;EACA,cAAA;EACA,4BAAA;AACA;AAEA;EACA,cAAA;AACA;AAEA;EACA,SAAA;EACA,UAAA;EACA,gBAAA;AACA;AAEA;EACA,kBAAA;EACA,eAAA;EACA,gCAAA;AACA;AAEA;EACA,mBAAA;AACA;AAEA;EACA,mBAAA;EACA,UAAA;AACA;AAEA;EACA,cAAA;EACA,wBAAA;EACA,kBAAA;EACA,kBAAA;AACA;AAEA;EACA,aAAA;AACA;AAEA;EACA,kBAAA;EACA,WAAA;EACA,kEAAA;EACA,YAAA;EACA,kBAAA;EACA,MAAA;EACA,SAAA;EACA,cAAA;EACA,YAAA,EAAA,kBAAA;EACA,wBAAA;EACA,gBAAA;AACA;AAEA;EACA,UAAA;AACA;AAEA;EACA;;;EAGA;EACA,oUAAA;EACA,4BAAA;EACA,gCAAA;AACA;AAEA;EACA,yaAAA;AACA;AAEA;EACA,qBAAA;EACA,4BAAA;EACA,cAAA;EACA,gBAAA;EACA,sBAAA;AACA;AAEA;EACA,cAAA;EACA,6BAAA;AACA;AAEA;EACA,aAAA;EACA,kBAAA;EACA,MAAA;EACA,WAAA;EACA,SAAA;EACA,WAAA;EACA,YAAA;EACA,cAAA;EACA,eAAA;EACA,cAAA;EACA,mBAAA;EACA,+BAAA;AACA;AAEA;EACA,cAAA;AACA;AAEA;EACA,YAAA;AACA;AAEA;EACA,cAAA;AACA;AAEA;EACA,aAAA;AACA;AAEA;EACA,mBAAA;AACA;AAEA;EACA,WAAA;EACA,kBAAA;EACA,YAAA;EACA,kBAAA;EACA,6BAAA;AACA;AAEA;EACA,WAAA;EACA,kBAAA;EACA,QAAA;EACA,SAAA;EACA,OAAA;EACA,YAAA;EACA,gBAAA;EACA;;sCAEA;AACA;AAEA;EACA,WAAA;EACA,gBAAA;AACA;AAEA;EACA,gBAAA;AACA;AAEA;EACA,SAAA;EACA,UAAA;EACA,gBAAA;EACA,kBAAA;EACA,QAAA;EACA,OAAA;AACA;AAEA;EACA,eAAA;AACA;AAEA;EACA,cAAA;EACA,WAAA;EACA,gBAAA;EACA,qBAAA;EACA,6BAAA;EACA,kBAAA;AACA;AAEA;EACA,oCAAA;AACA;AAEA;EACA,oCAAA;AACA;AAEA;;EAEA,YAAA;EACA,kBAAA;EACA,iBAAA;EACA,qBAAA;EACA,eAAA;AACA;AAEA;EACA,0BAAA;AACA;AAEA;EACA,mBAAA;EACA,cAAA;EACA,eAAA;EACA,6CAAA;EACA,kBAAA;AACA;AAEA;EACA,cAAA;AACA;AAEA;EACA,cAAA;EACA,qBAAA;EACA,gBAAA;AACA;AAEA;EACA,0BAAA;AACA;;AAEA;;;CAGA;AACA;AACA;;IAEA,gBAAA;AACA;AAEA;IACA,YAAA;AACA;AACA;AAEA;AACA;IACA,YAAA;AACA;AAEA;IACA,YAAA;AACA;AACA',
            sourcesContent: [
              '<template>\n  <div class="app">\n    <section class="todoapp">\n      <header class="header">\n        <h1>todos</h1>\n        <input\n          class="new-todo"\n          autofocus\n          autocomplete="off"\n          placeholder="What needs to be done?"\n          v-model="newTodo"\n          @keyup.enter="addTodo"\n        />\n      </header>\n      <section class="main" v-show="todos.length" v-cloak>\n        <input\n          id="toggle-all"\n          class="toggle-all"\n          type="checkbox"\n          v-model="allDone"\n        />\n        <label for="toggle-all"></label>\n        <ul class="todo-list">\n          <li\n            v-for="todo in filteredTodos"\n            class="todo"\n            :key="todo.id"\n            :class="{ completed: todo.completed, editing: todo == editedTodo }"\n          >\n            <div class="view">\n              <input class="toggle" type="checkbox" v-model="todo.completed" />\n              <label @dblclick="editTodo(todo)">{{ todo.title }}</label>\n              <button class="destroy" @click="removeTodo(todo)"></button>\n            </div>\n            <input\n              class="edit"\n              type="text"\n              v-model="todo.title"\n              v-todo-focus="todo == editedTodo"\n              @blur="doneEdit(todo)"\n              @keyup.enter="doneEdit(todo)"\n              @keyup.esc="cancelEdit(todo)"\n            />\n          </li>\n        </ul>\n      </section>\n      <footer class="footer" v-show="todos.length" v-cloak>\n        <span class="todo-count">\n          <strong>{{ remaining }}</strong> {{ remaining | pluralize }} left\n        </span>\n        <ul class="filters">\n          <li>\n            <button @click="filters(\'all\')" :class="{ selected: visibility == \'all\' }">All</button>\n          </li>\n          <li>\n            <button @click="filters(\'active\')" :class="{ selected: visibility == \'active\' }"\n              >Active</button\n            >\n          </li>\n          <li>\n            <button\n               @click="filters(\'completed\')"\n              :class="{ selected: visibility == \'completed\' }"\n              >Completed</button\n            >\n          </li>\n        </ul>\n        <button\n          class="clear-completed"\n          @click="removeCompleted"\n          v-show="todos.length > remaining"\n        >\n          Clear completed\n        </button>\n      </footer>\n    </section>\n    <footer class="info">\n      <p>Double-click to edit a todo</p>\n      <p>Written by <a href="http://evanyou.me">Evan You</a></p>\n      <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>\n    </footer>\n  </div>\n</template>\n\n<script>\nconst filters = {\n  all(todos) {\n    return todos;\n  },\n  active(todos) {\n    return todos.filter(function(todo) {\n      return !todo.completed;\n    });\n  },\n  completed(todos) {\n    return todos.filter(function(todo) {\n      return todo.completed;\n    });\n  }\n};\n\n// localStorage persistence\nconst STORAGE_KEY = \'todos-vuejs-2.0\';\nconst todoStorage = {\n  fetch() {\n    const todos = JSON.parse(localStorage.getItem(STORAGE_KEY) || \'[]\');\n    todos.forEach(function (todo, index) {\n      todo.id = index;\n    });\n    todoStorage.uid = todos.length;\n    return todos;\n  },\n  save(todos) {\n    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));\n  }\n};\n\n// app Vue instance\n// eslint-disable-next-line no-undef\nexport default {\n  // app initial state\n  data() {\n    return {\n        todos: todoStorage.fetch(),\n        newTodo: \'\',\n        editedTodo: null,\n        visibility: \'all\'\n    }\n  },\n\n  // watch todos change for localStorage persistence\n  watch: {\n    todos: {\n      handler(todos) {\n        todoStorage.save(todos);\n      },\n      deep: true\n    }\n  },\n\n  // computed properties\n  // http://vuejs.org/guide/computed.html\n  computed: {\n    filteredTodos() {\n      return filters[this.visibility](this.todos);\n    },\n    remaining() {\n      return filters.active(this.todos).length;\n    },\n    allDone: {\n      get() {\n        return this.remaining === 0;\n      },\n      set(value) {\n        this.todos.forEach(function (todo) {\n          todo.completed = value;\n        });\n      }\n    }\n  },\n\n  filters: {\n    pluralize(n) {\n      return n === 1 ? \'item\' : \'items\';\n    }\n  },\n\n  // methods that implement data logic.\n  // note there\'s no DOM manipulation here at all.\n  methods: {\n    addTodo() {\n      const value = this.newTodo && this.newTodo.trim();\n      if (!value) {\n        return;\n      }\n      this.todos.push({\n        id: todoStorage.uid++,\n        title: value,\n        completed: false\n      });\n      this.newTodo = \'\';\n    },\n\n    removeTodo(todo) {\n      this.todos.splice(this.todos.indexOf(todo), 1);\n    },\n\n    editTodo(todo) {\n      this.beforeEditCache = todo.title;\n      this.editedTodo = todo;\n    },\n\n    doneEdit(todo) {\n      if (!this.editedTodo) {\n        return;\n      }\n      this.editedTodo = null;\n      todo.title = todo.title.trim();\n      if (!todo.title) {\n        this.removeTodo(todo);\n      }\n    },\n\n    cancelEdit(todo) {\n      this.editedTodo = null;\n      todo.title = this.beforeEditCache;\n    },\n\n    removeCompleted() {\n      this.todos = filters.active(this.todos);\n    },\n\n    filters(visibility) {\n      if (filters[visibility]) {\n        this.visibility = visibility;\n      } else {\n        //window.location.hash = \'\';\n        this.visibility = \'all\';\n      }\n    }\n  },\n\n  // a custom directive to wait for the DOM to be updated\n  // before focusing on the input field.\n  // http://vuejs.org/guide/custom-directive.html\n  directives: {\n    \'todo-focus\': function (el, binding) {\n      if (binding.value) {\n        el.focus();\n      }\n    }\n  }\n};\n</script>\n\n<style>\n.app {\n  font: 14px \'Helvetica Neue\', Helvetica, Arial, sans-serif;\n  line-height: 1.4em;\n  /* background: #f5f5f5; */\n  color: #4d4d4d;\n  min-width: 230px;\n  max-width: 550px;\n  margin: 0 auto;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  font-weight: 300;\n}\n\nbutton {\n  margin: 0;\n  padding: 0;\n  border: 0;\n  background: none;\n  font-size: 100%;\n  vertical-align: baseline;\n  font-family: inherit;\n  font-weight: inherit;\n  color: inherit;\n  -webkit-appearance: none;\n  appearance: none;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n:focus {\n  outline: 0;\n}\n\n.hidden {\n  display: none;\n}\n\n.todoapp {\n  background: #fff;\n  margin: 130px 0 40px 0;\n  position: relative;\n  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1);\n}\n\n.todoapp input::-webkit-input-placeholder {\n  font-style: italic;\n  font-weight: 300;\n  color: #e6e6e6;\n}\n\n.todoapp input::-moz-placeholder {\n  font-style: italic;\n  font-weight: 300;\n  color: #e6e6e6;\n}\n\n.todoapp input::input-placeholder {\n  font-style: italic;\n  font-weight: 300;\n  color: #e6e6e6;\n}\n\n.todoapp h1 {\n  position: absolute;\n  top: -155px;\n  width: 100%;\n  font-size: 100px;\n  font-weight: 100;\n  text-align: center;\n  color: rgba(175, 47, 47, 0.15);\n  -webkit-text-rendering: optimizeLegibility;\n  -moz-text-rendering: optimizeLegibility;\n  text-rendering: optimizeLegibility;\n}\n\n.new-todo,\n.edit {\n  position: relative;\n  margin: 0;\n  width: 100%;\n  font-size: 24px;\n  font-family: inherit;\n  font-weight: inherit;\n  line-height: 1.4em;\n  border: 0;\n  color: inherit;\n  padding: 6px;\n  border: 1px solid #999;\n  box-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);\n  box-sizing: border-box;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.new-todo {\n  padding: 16px 16px 16px 60px;\n  border: none;\n  background: rgba(0, 0, 0, 0.003);\n  box-shadow: inset 0 -2px 1px rgba(0, 0, 0, 0.03);\n}\n\n.main {\n  position: relative;\n  z-index: 2;\n  border-top: 1px solid #e6e6e6;\n}\n\n.toggle-all {\n  width: 1px;\n  height: 1px;\n  border: none; /* Mobile Safari */\n  opacity: 0;\n  position: absolute;\n  right: 100%;\n  bottom: 100%;\n}\n\n.toggle-all + label {\n  width: 60px;\n  height: 34px;\n  font-size: 0;\n  position: absolute;\n  top: -52px;\n  left: -13px;\n  -webkit-transform: rotate(90deg);\n  transform: rotate(90deg);\n}\n\n.toggle-all + label:before {\n  content: \'❯\';\n  font-size: 22px;\n  color: #e6e6e6;\n  padding: 10px 27px 10px 27px;\n}\n\n.toggle-all:checked + label:before {\n  color: #737373;\n}\n\n.todo-list {\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.todo-list li {\n  position: relative;\n  font-size: 24px;\n  border-bottom: 1px solid #ededed;\n}\n\n.todo-list li:last-child {\n  border-bottom: none;\n}\n\n.todo-list li.editing {\n  border-bottom: none;\n  padding: 0;\n}\n\n.todo-list li.editing .edit {\n  display: block;\n  width: calc(100% - 43px);\n  padding: 12px 16px;\n  margin: 0 0 0 43px;\n}\n\n.todo-list li.editing .view {\n  display: none;\n}\n\n.todo-list li .toggle {\n  text-align: center;\n  width: 40px;\n  /* auto, since non-WebKit browsers doesn\'t support input styling */\n  height: auto;\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  margin: auto 0;\n  border: none; /* Mobile Safari */\n  -webkit-appearance: none;\n  appearance: none;\n}\n\n.todo-list li .toggle {\n  opacity: 0;\n}\n\n.todo-list li .toggle + label {\n  /*\n\t\tFirefox requires `#` to be escaped - https://bugzilla.mozilla.org/show_bug.cgi?id=922433\n\t\tIE and Edge requires *everything* to be escaped to render, so we do that instead of just the `#` - https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/7157459/\n\t*/\n  background-image: url(\'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23ededed%22%20stroke-width%3D%223%22/%3E%3C/svg%3E\');\n  background-repeat: no-repeat;\n  background-position: center left;\n}\n\n.todo-list li .toggle:checked + label {\n  background-image: url(\'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23bddad5%22%20stroke-width%3D%223%22/%3E%3Cpath%20fill%3D%22%235dc2af%22%20d%3D%22M72%2025L42%2071%2027%2056l-4%204%2020%2020%2034-52z%22/%3E%3C/svg%3E\');\n}\n\n.todo-list li label {\n  word-break: break-all;\n  padding: 15px 15px 15px 60px;\n  display: block;\n  line-height: 1.2;\n  transition: color 0.4s;\n}\n\n.todo-list li.completed label {\n  color: #d9d9d9;\n  text-decoration: line-through;\n}\n\n.todo-list li .destroy {\n  display: none;\n  position: absolute;\n  top: 0;\n  right: 10px;\n  bottom: 0;\n  width: 40px;\n  height: 40px;\n  margin: auto 0;\n  font-size: 30px;\n  color: #cc9a9a;\n  margin-bottom: 11px;\n  transition: color 0.2s ease-out;\n}\n\n.todo-list li .destroy:hover {\n  color: #af5b5e;\n}\n\n.todo-list li .destroy:after {\n  content: \'×\';\n}\n\n.todo-list li:hover .destroy {\n  display: block;\n}\n\n.todo-list li .edit {\n  display: none;\n}\n\n.todo-list li.editing:last-child {\n  margin-bottom: -1px;\n}\n\n.footer {\n  color: #777;\n  padding: 10px 15px;\n  height: 20px;\n  text-align: center;\n  border-top: 1px solid #e6e6e6;\n}\n\n.footer:before {\n  content: \'\';\n  position: absolute;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  height: 50px;\n  overflow: hidden;\n  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2), 0 8px 0 -3px #f6f6f6,\n    0 9px 1px -3px rgba(0, 0, 0, 0.2), 0 16px 0 -6px #f6f6f6,\n    0 17px 2px -6px rgba(0, 0, 0, 0.2);\n}\n\n.todo-count {\n  float: left;\n  text-align: left;\n}\n\n.todo-count strong {\n  font-weight: 300;\n}\n\n.filters {\n  margin: 0;\n  padding: 0;\n  list-style: none;\n  position: absolute;\n  right: 0;\n  left: 0;\n}\n\n.filters li {\n  display: inline;\n}\n\n.filters li button {\n  color: inherit;\n  margin: 3px;\n  padding: 3px 7px;\n  text-decoration: none;\n  border: 1px solid transparent;\n  border-radius: 3px;\n}\n\n.filters li button:hover {\n  border-color: rgba(175, 47, 47, 0.1);\n}\n\n.filters li button.selected {\n  border-color: rgba(175, 47, 47, 0.2);\n}\n\n.clear-completed,\nhtml .clear-completed:active {\n  float: right;\n  position: relative;\n  line-height: 20px;\n  text-decoration: none;\n  cursor: pointer;\n}\n\n.clear-completed:hover {\n  text-decoration: underline;\n}\n\n.info {\n  margin: 65px auto 0;\n  color: #bfbfbf;\n  font-size: 10px;\n  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);\n  text-align: center;\n}\n\n.info p {\n  line-height: 1;\n}\n\n.info a {\n  color: inherit;\n  text-decoration: none;\n  font-weight: 400;\n}\n\n.info a:hover {\n  text-decoration: underline;\n}\n\n/*\n\tHack to remove background from Mobile Safari.\n\tCan\'t use it globally since it destroys checkboxes in Firefox\n*/\n@media screen and (-webkit-min-device-pixel-ratio: 0) {\n  .toggle-all,\n  .todo-list li .toggle {\n    background: none;\n  }\n\n  .todo-list li .toggle {\n    height: 40px;\n  }\n}\n\n@media (max-width: 430px) {\n  .footer {\n    height: 50px;\n  }\n\n  .filters {\n    bottom: 10px;\n  }\n}\n</style>'
            ],
            sourceRoot: ''
          }
        ]),
          (n.exports = A);
      },
      645: (n) => {
        'use strict';
        n.exports = function (n) {
          var t = [];
          return (
            (t.toString = function () {
              return this.map(function (t) {
                var e = n(t);
                return t[2] ? '@media '.concat(t[2], ' {').concat(e, '}') : e;
              }).join('');
            }),
            (t.i = function (n, e, o) {
              'string' == typeof n && (n = [[null, n, '']]);
              var A = {};
              if (o)
                for (var i = 0; i < this.length; i++) {
                  var l = this[i][0];
                  null != l && (A[l] = !0);
                }
              for (var r = 0; r < n.length; r++) {
                var a = [].concat(n[r]);
                (o && A[a[0]]) ||
                  (e &&
                    (a[2]
                      ? (a[2] = ''.concat(e, ' and ').concat(a[2]))
                      : (a[2] = e)),
                  t.push(a));
              }
            }),
            t
          );
        };
      },
      15: (n) => {
        'use strict';
        function t(n, t) {
          (null == t || t > n.length) && (t = n.length);
          for (var e = 0, o = new Array(t); e < t; e++) o[e] = n[e];
          return o;
        }
        n.exports = function (n) {
          var e,
            o,
            A =
              ((o = 4),
              (function (n) {
                if (Array.isArray(n)) return n;
              })((e = n)) ||
                (function (n, t) {
                  var e =
                    n &&
                    (('undefined' != typeof Symbol && n[Symbol.iterator]) ||
                      n['@@iterator']);
                  if (null != e) {
                    var o,
                      A,
                      i = [],
                      l = !0,
                      r = !1;
                    try {
                      for (
                        e = e.call(n);
                        !(l = (o = e.next()).done) &&
                        (i.push(o.value), !t || i.length !== t);
                        l = !0
                      );
                    } catch (n) {
                      (r = !0), (A = n);
                    } finally {
                      try {
                        l || null == e.return || e.return();
                      } finally {
                        if (r) throw A;
                      }
                    }
                    return i;
                  }
                })(e, o) ||
                (function (n, e) {
                  if (n) {
                    if ('string' == typeof n) return t(n, e);
                    var o = Object.prototype.toString.call(n).slice(8, -1);
                    return (
                      'Object' === o &&
                        n.constructor &&
                        (o = n.constructor.name),
                      'Map' === o || 'Set' === o
                        ? Array.from(n)
                        : 'Arguments' === o ||
                          /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(o)
                        ? t(n, e)
                        : void 0
                    );
                  }
                })(e, o) ||
                (function () {
                  throw new TypeError(
                    'Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
                  );
                })()),
            i = A[1],
            l = A[3];
          if ('function' == typeof btoa) {
            var r = btoa(unescape(encodeURIComponent(JSON.stringify(l)))),
              a =
                'sourceMappingURL=data:application/json;charset=utf-8;base64,'.concat(
                  r
                ),
              s = '/*# '.concat(a, ' */'),
              d = l.sources.map(function (n) {
                return '/*# sourceURL='
                  .concat(l.sourceRoot || '')
                  .concat(n, ' */');
              });
            return [i].concat(d).concat([s]).join('\n');
          }
          return [i].join('\n');
        };
      },
      702: (n, t, e) => {
        var o = e(635);
        o.__esModule && (o = o.default),
          'string' == typeof o && (o = [[n.id, o, '']]),
          o.locals && (n.exports = o.locals),
          (0, e(346).Z)('41001bd3', o, !1, {});
      },
      346: (n, t, e) => {
        'use strict';
        function o(n, t) {
          for (var e = [], o = {}, A = 0; A < t.length; A++) {
            var i = t[A],
              l = i[0],
              r = { id: n + ':' + A, css: i[1], media: i[2], sourceMap: i[3] };
            o[l] ? o[l].parts.push(r) : e.push((o[l] = { id: l, parts: [r] }));
          }
          return e;
        }
        e.d(t, { Z: () => u });
        var A = 'undefined' != typeof document;
        if ('undefined' != typeof DEBUG && DEBUG && !A)
          throw new Error(
            "vue-style-loader cannot be used in a non-browser environment. Use { target: 'node' } in your Webpack config to indicate a server-rendering environment."
          );
        var i = {},
          l = A && (document.head || document.getElementsByTagName('head')[0]),
          r = null,
          a = 0,
          s = !1,
          d = function () {},
          c = null,
          p = 'data-vue-ssr-id',
          g =
            'undefined' != typeof navigator &&
            /msie [6-9]\b/.test(navigator.userAgent.toLowerCase());
        function u(n, t, e, A) {
          (s = e), (c = A || {});
          var l = o(n, t);
          return (
            f(l),
            function (t) {
              for (var e = [], A = 0; A < l.length; A++) {
                var r = l[A];
                (a = i[r.id]).refs--, e.push(a);
              }
              for (t ? f((l = o(n, t))) : (l = []), A = 0; A < e.length; A++) {
                var a;
                if (0 === (a = e[A]).refs) {
                  for (var s = 0; s < a.parts.length; s++) a.parts[s]();
                  delete i[a.id];
                }
              }
            }
          );
        }
        function f(n) {
          for (var t = 0; t < n.length; t++) {
            var e = n[t],
              o = i[e.id];
            if (o) {
              o.refs++;
              for (var A = 0; A < o.parts.length; A++) o.parts[A](e.parts[A]);
              for (; A < e.parts.length; A++) o.parts.push(C(e.parts[A]));
              o.parts.length > e.parts.length &&
                (o.parts.length = e.parts.length);
            } else {
              var l = [];
              for (A = 0; A < e.parts.length; A++) l.push(C(e.parts[A]));
              i[e.id] = { id: e.id, refs: 1, parts: l };
            }
          }
        }
        function h() {
          var n = document.createElement('style');
          return (n.type = 'text/css'), l.appendChild(n), n;
        }
        function C(n) {
          var t,
            e,
            o = document.querySelector('style[' + p + '~="' + n.id + '"]');
          if (o) {
            if (s) return d;
            o.parentNode.removeChild(o);
          }
          if (g) {
            var A = a++;
            (o = r || (r = h())),
              (t = E.bind(null, o, A, !1)),
              (e = E.bind(null, o, A, !0));
          } else
            (o = h()),
              (t = x.bind(null, o)),
              (e = function () {
                o.parentNode.removeChild(o);
              });
          return (
            t(n),
            function (o) {
              if (o) {
                if (
                  o.css === n.css &&
                  o.media === n.media &&
                  o.sourceMap === n.sourceMap
                )
                  return;
                t((n = o));
              } else e();
            }
          );
        }
        var m,
          b =
            ((m = []),
            function (n, t) {
              return (m[n] = t), m.filter(Boolean).join('\n');
            });
        function E(n, t, e, o) {
          var A = e ? '' : o.css;
          if (n.styleSheet) n.styleSheet.cssText = b(t, A);
          else {
            var i = document.createTextNode(A),
              l = n.childNodes;
            l[t] && n.removeChild(l[t]),
              l.length ? n.insertBefore(i, l[t]) : n.appendChild(i);
          }
        }
        function x(n, t) {
          var e = t.css,
            o = t.media,
            A = t.sourceMap;
          if (
            (o && n.setAttribute('media', o),
            c.ssrId && n.setAttribute(p, t.id),
            A &&
              ((e += '\n/*# sourceURL=' + A.sources[0] + ' */'),
              (e +=
                '\n/*# sourceMappingURL=data:application/json;base64,' +
                btoa(unescape(encodeURIComponent(JSON.stringify(A)))) +
                ' */')),
            n.styleSheet)
          )
            n.styleSheet.cssText = e;
          else {
            for (; n.firstChild; ) n.removeChild(n.firstChild);
            n.appendChild(document.createTextNode(e));
          }
        }
      }
    },
    t = {};
  function e(o) {
    var A = t[o];
    if (void 0 !== A) return A.exports;
    var i = (t[o] = { id: o, exports: {} });
    return n[o](i, i.exports, e), i.exports;
  }
  (e.n = (n) => {
    var t = n && n.__esModule ? () => n.default : () => n;
    return e.d(t, { a: t }), t;
  }),
    (e.d = (n, t) => {
      for (var o in t)
        e.o(t, o) &&
          !e.o(n, o) &&
          Object.defineProperty(n, o, { enumerable: !0, get: t[o] });
    }),
    (e.o = (n, t) => Object.prototype.hasOwnProperty.call(n, t)),
    (() => {
      'use strict';
      const n = Vue;
      var t = e.n(n),
        o = function () {
          var n = this,
            t = n.$createElement,
            e = n._self._c || t;
          return e('div', { staticClass: 'app' }, [
            e('section', { staticClass: 'todoapp' }, [
              e('header', { staticClass: 'header' }, [
                e('h1', [n._v('todos')]),
                n._v(' '),
                e('input', {
                  directives: [
                    {
                      name: 'model',
                      rawName: 'v-model',
                      value: n.newTodo,
                      expression: 'newTodo'
                    }
                  ],
                  staticClass: 'new-todo',
                  attrs: {
                    autofocus: '',
                    autocomplete: 'off',
                    placeholder: 'What needs to be done?'
                  },
                  domProps: { value: n.newTodo },
                  on: {
                    keyup: function (t) {
                      return !t.type.indexOf('key') &&
                        n._k(t.keyCode, 'enter', 13, t.key, 'Enter')
                        ? null
                        : n.addTodo.apply(null, arguments);
                    },
                    input: function (t) {
                      t.target.composing || (n.newTodo = t.target.value);
                    }
                  }
                })
              ]),
              n._v(' '),
              e(
                'section',
                {
                  directives: [
                    {
                      name: 'show',
                      rawName: 'v-show',
                      value: n.todos.length,
                      expression: 'todos.length'
                    }
                  ],
                  staticClass: 'main'
                },
                [
                  e('input', {
                    directives: [
                      {
                        name: 'model',
                        rawName: 'v-model',
                        value: n.allDone,
                        expression: 'allDone'
                      }
                    ],
                    staticClass: 'toggle-all',
                    attrs: { id: 'toggle-all', type: 'checkbox' },
                    domProps: {
                      checked: Array.isArray(n.allDone)
                        ? n._i(n.allDone, null) > -1
                        : n.allDone
                    },
                    on: {
                      change: function (t) {
                        var e = n.allDone,
                          o = t.target,
                          A = !!o.checked;
                        if (Array.isArray(e)) {
                          var i = n._i(e, null);
                          o.checked
                            ? i < 0 && (n.allDone = e.concat([null]))
                            : i > -1 &&
                              (n.allDone = e
                                .slice(0, i)
                                .concat(e.slice(i + 1)));
                        } else n.allDone = A;
                      }
                    }
                  }),
                  n._v(' '),
                  e('label', { attrs: { for: 'toggle-all' } }),
                  n._v(' '),
                  e(
                    'ul',
                    { staticClass: 'todo-list' },
                    n._l(n.filteredTodos, function (t) {
                      return e(
                        'li',
                        {
                          key: t.id,
                          staticClass: 'todo',
                          class: {
                            completed: t.completed,
                            editing: t == n.editedTodo
                          }
                        },
                        [
                          e('div', { staticClass: 'view' }, [
                            e('input', {
                              directives: [
                                {
                                  name: 'model',
                                  rawName: 'v-model',
                                  value: t.completed,
                                  expression: 'todo.completed'
                                }
                              ],
                              staticClass: 'toggle',
                              attrs: { type: 'checkbox' },
                              domProps: {
                                checked: Array.isArray(t.completed)
                                  ? n._i(t.completed, null) > -1
                                  : t.completed
                              },
                              on: {
                                change: function (e) {
                                  var o = t.completed,
                                    A = e.target,
                                    i = !!A.checked;
                                  if (Array.isArray(o)) {
                                    var l = n._i(o, null);
                                    A.checked
                                      ? l < 0 &&
                                        n.$set(t, 'completed', o.concat([null]))
                                      : l > -1 &&
                                        n.$set(
                                          t,
                                          'completed',
                                          o.slice(0, l).concat(o.slice(l + 1))
                                        );
                                  } else n.$set(t, 'completed', i);
                                }
                              }
                            }),
                            n._v(' '),
                            e(
                              'label',
                              {
                                on: {
                                  dblclick: function (e) {
                                    return n.editTodo(t);
                                  }
                                }
                              },
                              [n._v(n._s(t.title))]
                            ),
                            n._v(' '),
                            e('button', {
                              staticClass: 'destroy',
                              on: {
                                click: function (e) {
                                  return n.removeTodo(t);
                                }
                              }
                            })
                          ]),
                          n._v(' '),
                          e('input', {
                            directives: [
                              {
                                name: 'model',
                                rawName: 'v-model',
                                value: t.title,
                                expression: 'todo.title'
                              },
                              {
                                name: 'todo-focus',
                                rawName: 'v-todo-focus',
                                value: t == n.editedTodo,
                                expression: 'todo == editedTodo'
                              }
                            ],
                            staticClass: 'edit',
                            attrs: { type: 'text' },
                            domProps: { value: t.title },
                            on: {
                              blur: function (e) {
                                return n.doneEdit(t);
                              },
                              keyup: [
                                function (e) {
                                  return !e.type.indexOf('key') &&
                                    n._k(e.keyCode, 'enter', 13, e.key, 'Enter')
                                    ? null
                                    : n.doneEdit(t);
                                },
                                function (e) {
                                  return !e.type.indexOf('key') &&
                                    n._k(e.keyCode, 'esc', 27, e.key, [
                                      'Esc',
                                      'Escape'
                                    ])
                                    ? null
                                    : n.cancelEdit(t);
                                }
                              ],
                              input: function (e) {
                                e.target.composing ||
                                  n.$set(t, 'title', e.target.value);
                              }
                            }
                          })
                        ]
                      );
                    }),
                    0
                  )
                ]
              ),
              n._v(' '),
              e(
                'footer',
                {
                  directives: [
                    {
                      name: 'show',
                      rawName: 'v-show',
                      value: n.todos.length,
                      expression: 'todos.length'
                    }
                  ],
                  staticClass: 'footer'
                },
                [
                  e('span', { staticClass: 'todo-count' }, [
                    e('strong', [n._v(n._s(n.remaining))]),
                    n._v(
                      ' ' +
                        n._s(n._f('pluralize')(n.remaining)) +
                        ' left\n      '
                    )
                  ]),
                  n._v(' '),
                  e('ul', { staticClass: 'filters' }, [
                    e('li', [
                      e(
                        'button',
                        {
                          class: { selected: 'all' == n.visibility },
                          on: {
                            click: function (t) {
                              return n.filters('all');
                            }
                          }
                        },
                        [n._v('All')]
                      )
                    ]),
                    n._v(' '),
                    e('li', [
                      e(
                        'button',
                        {
                          class: { selected: 'active' == n.visibility },
                          on: {
                            click: function (t) {
                              return n.filters('active');
                            }
                          }
                        },
                        [n._v('Active')]
                      )
                    ]),
                    n._v(' '),
                    e('li', [
                      e(
                        'button',
                        {
                          class: { selected: 'completed' == n.visibility },
                          on: {
                            click: function (t) {
                              return n.filters('completed');
                            }
                          }
                        },
                        [n._v('Completed')]
                      )
                    ])
                  ]),
                  n._v(' '),
                  e(
                    'button',
                    {
                      directives: [
                        {
                          name: 'show',
                          rawName: 'v-show',
                          value: n.todos.length > n.remaining,
                          expression: 'todos.length > remaining'
                        }
                      ],
                      staticClass: 'clear-completed',
                      on: { click: n.removeCompleted }
                    },
                    [n._v('\n        Clear completed\n      ')]
                  )
                ]
              )
            ]),
            n._v(' '),
            n._m(0)
          ]);
        };
      o._withStripped = !0;
      const A = {
          all: (n) => n,
          active: (n) =>
            n.filter(function (n) {
              return !n.completed;
            }),
          completed: (n) =>
            n.filter(function (n) {
              return n.completed;
            })
        },
        i = 'todos-vuejs-2.0',
        l = {
          fetch() {
            const n = JSON.parse(localStorage.getItem(i) || '[]');
            return (
              n.forEach(function (n, t) {
                n.id = t;
              }),
              (l.uid = n.length),
              n
            );
          },
          save(n) {
            localStorage.setItem(i, JSON.stringify(n));
          }
        },
        r = {
          data: () => ({
            todos: l.fetch(),
            newTodo: '',
            editedTodo: null,
            visibility: 'all'
          }),
          watch: {
            todos: {
              handler(n) {
                l.save(n);
              },
              deep: !0
            }
          },
          computed: {
            filteredTodos() {
              return A[this.visibility](this.todos);
            },
            remaining() {
              return A.active(this.todos).length;
            },
            allDone: {
              get() {
                return 0 === this.remaining;
              },
              set(n) {
                this.todos.forEach(function (t) {
                  t.completed = n;
                });
              }
            }
          },
          filters: { pluralize: (n) => (1 === n ? 'item' : 'items') },
          methods: {
            addTodo() {
              const n = this.newTodo && this.newTodo.trim();
              n &&
                (this.todos.push({ id: l.uid++, title: n, completed: !1 }),
                (this.newTodo = ''));
            },
            removeTodo(n) {
              this.todos.splice(this.todos.indexOf(n), 1);
            },
            editTodo(n) {
              (this.beforeEditCache = n.title), (this.editedTodo = n);
            },
            doneEdit(n) {
              this.editedTodo &&
                ((this.editedTodo = null),
                (n.title = n.title.trim()),
                n.title || this.removeTodo(n));
            },
            cancelEdit(n) {
              (this.editedTodo = null), (n.title = this.beforeEditCache);
            },
            removeCompleted() {
              this.todos = A.active(this.todos);
            },
            filters(n) {
              A[n] ? (this.visibility = n) : (this.visibility = 'all');
            }
          },
          directives: {
            'todo-focus': function (n, t) {
              t.value && n.focus();
            }
          }
        };
      e(702);
      var a = (function (n, t, e, o, A, i, l, r) {
        var a,
          s = 'function' == typeof n ? n.options : n;
        if (
          (t &&
            ((s.render = t),
            (s.staticRenderFns = [
              function () {
                var n = this,
                  t = n.$createElement,
                  e = n._self._c || t;
                return e('footer', { staticClass: 'info' }, [
                  e('p', [n._v('Double-click to edit a todo')]),
                  n._v(' '),
                  e('p', [
                    n._v('Written by '),
                    e('a', { attrs: { href: 'http://evanyou.me' } }, [
                      n._v('Evan You')
                    ])
                  ]),
                  n._v(' '),
                  e('p', [
                    n._v('Part of '),
                    e('a', { attrs: { href: 'http://todomvc.com' } }, [
                      n._v('TodoMVC')
                    ])
                  ])
                ]);
              }
            ]),
            (s._compiled = !0)),
          a)
        )
          if (s.functional) {
            s._injectStyles = a;
            var d = s.render;
            s.render = function (n, t) {
              return a.call(t), d(n, t);
            };
          } else {
            var c = s.beforeCreate;
            s.beforeCreate = c ? [].concat(c, a) : [a];
          }
        return { exports: n, options: s };
      })(r, o);
      a.options.__file = 'src/App.vue';
      const s = a.exports;
      new (t())({ el: '#app', components: { App: s }, render: (n) => n(s) });
    })();
})();
//# sourceMappingURL=app.js.map
