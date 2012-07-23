var driver = function() {
  function req(method, path, data, c, fail) {
    if (!fail) fail = function(msg) { console.log("Request " + method + " " + path + " failed: " + msg); };
    var xhr = new XMLHttpRequest();
    xhr.open(method, "/driver" + path, true);
    xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    console.log("send " + method + " " + path);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        console.log("recv " + method + " " + path);
        if (xhr.status < 400) {
          var data = xhr.responseText, end = data.length;
          while (data.charAt(end - 1) == "\x00") --end;
          if (end != data.length) data = data.slice(0, end);
          c(data.length ? JSON.parse(data) : null);
        } else {
          var text = "No response";
          try {text = xhr.responseText;} catch(e){}
          fail(text);
        }
      }
    };
    xhr.send(data ? JSON.stringify(data) : null);
  }

  function get(path, c) { req("GET", path, null, c); }
  function post(path, data, c) { req("POST", path, data, c); }
  function del(path, c) { req("DELETE", path, null, c); }

  function asElement(elt, c) {
    if (elt == null) return c(null);
    if (elt.driverID) return c(elt.driverID);
    var id = elt.id;
    if (!id) id = elt.id = "tag_" + Math.floor(Math.random() * 0xffffffff).toString(16);
    post("/element", {using: "id", value: id}, function(data) {
      elt.driverID = data.value.ELEMENT;
      c(data.value.ELEMENT);
    });
  }

  function driver() {
    if (this == window) return new driver();
    this.queue = [];
  }
  driver.prototype = {
    run: function(c) {
      var cur = this.queue.shift(), self = this;
      if (cur) cur(function() { self.run(c); });
      else if (c) c();
    },
    add: function(f) { this.queue.push(f); return this; },
    then: function(f) {
      return this.add(function(c) { f(); c(); });
    },
    keys: function(seq) {
      return this.add(function(c) { post("/keys", {value: [seq]}, c); });
    },
    moveTo: function(x, y, elt) {
      return this.add(function(c) {
        asElement(elt, function(id) {
          post("/moveto", {element: id, xoffset: x, yoffset: y}, c);
        });
      });
    },
    click: function(button) {
      return this.add(function(c) { post("/click", {button: button || 0}, c); });
    },
    mouseDown: function() {
      return this.add(function(c) { post("/buttondown", {}, c); });
    },
    mouseUp: function() {
      return this.add(function(c) { post("/buttonup", {}, c); });
    },
    doubleClick: function() {
      return this.add(function(c) { post("/doubleclick", {}, c); });
    }
  };

  return driver;
}();
