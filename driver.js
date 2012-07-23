var child = require("child_process");
var httpProxy = require("http-proxy");
var http = require("http");

var driverPort = Math.ceil(Math.random() * 20000) + 10000;
var usePort = null;
var useBrowser = "firefox";
var proxyPort = Math.ceil(Math.random() * 20000) + 10000;
var targetFile = "index.html";

for (var i = 2; i < process.argv.length; ++i) {
  var arg = process.argv[i];
  if (arg == "--port" && ++i < process.argv.length) proxyPort = Number(process.argv[i]);
  else if (arg == "--rundriver" && ++i < process.argv.length) driverPort = Number(process.argv[i]);
  else if (arg == "--driver" && ++i < process.argv.length) usePort = Number(process.argv[i]);
  else if (arg == "--browser" && ++i < process.argv.length) useBrowser = process.argv[i];
  else targetFile = arg;
}

if (usePort != null)
  initSession(usePort, useBrowser, "/wd/hub");
else
  startOwnDriver(driverPort);

function startOwnDriver(port) {
  var driver = child.spawn("./chromedriver", ["--port=" + port]);
  driver.stdout.on("data", function(x) { console.log("driver: " + x); });
  driver.on("exit", function(msg) {
    abort("failed to start driver: " + msg);
  });
  process.on("exit", function() { driver.kill(); });
  setTimeout(initSession.bind(null, port, "chrome"), 300);
}

function initSession(port, browserName, prefix) {
  var args = {desiredCapabilities: {browserName: browserName, javascriptEnabled: true},
              sessionId: null};
  sendToDriver(port, (prefix || "") + "/session", args, function(resp) {
    startServing(port, resp.headers.location);
  });
}

function sendToDriver(port, path, data, c) {
  data = JSON.stringify(data);
  var opts = {port: port,
              path: path,
              headers: {"Content-Type": "application/json; charset=UTF-8",
                        "Content-Length": data.length},
              method: "POST"};
  var req = http.request(opts, function(resp) {
    var data = "";
    resp.on("data", function(d) { data += d.toString(); });
    resp.on("end", function() {
      if (resp.statusCode >= 400)
        abort("request to " + path + " failed: " + resp.statusCode + ": " + data);
      c(resp, data);
    });
  });
  req.on("error", function(msg) {
    abort("could not init session: " + msg);
  });
  req.write(data);
  req.end();
}

function startServing(port, sessionPath) {
  var files = new (require("node-static").Server)(".");
  var proxy = new httpProxy.RoutingProxy();
  http.createServer(function(req, resp) {
    var url = require("url").parse(req.url);
    var m = url.path.match(/^\/driver\b(.*)$/);
    if (m) {
      req.url = req.url.replace(/\/driver\b/, sessionPath);
      // Kludge to work around bad interpretation of headers by Chrome driver
      req.headers["Content-Length"] = req.headers["content-length"];
      proxy.proxyRequest(req, resp, {host: "localhost", port: port});
    } else {
      req.addListener("end", function() {files.serve(req, resp);});
    }
  }).listen(proxyPort);
  moveToPage(port, sessionPath);
}

function moveToPage(port, sessionPath) {
  sendToDriver(port, sessionPath + "/url",
               {url: "http://localhost:" + proxyPort + "/" + targetFile}, function() {});
}

function abort(msg) {
  console.log("abort: " + msg);
  process.exit(1);
}
