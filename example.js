//use http://localhost:7001 to test

var koa = require('koa');
var http = require('http');
var session = require('koa-sess');
var githubAuth = require('./');

var app = koa();

app.name = 'nae-web';
app.keys = ['key1', 'key2'];

app.use(session());
app.use(githubAuth({
  clientID: '5ec1d25d2a3baf99a03c',
  clientSecret: '513607494a244e2759738cae3d50a89494c1e7f0',
  callbackURL: 'http://localhost:7001/github/auth/callback',
  userKey: 'user',
  timeout: 10000
}));

app.use(function *handler() {
  if (!this.session.githubToken) {
    this.body = '<a href="/github/auth?redirect_uri=/callback">login with github</a>';
  } else {
    this.body = this.session.user;
  }
});

app.on('error', function (err) {
  if (!err.status || err.status >= 500) {
    logger.error(err);
  }
});

http.createServer(app.callback()).listen(7001);
