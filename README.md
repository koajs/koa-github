koa-github
==========

simple github auth middleware for koa

[![NPM](https://nodei.co/npm/koa-github.png?downloads=true)](https://nodei.co/npm/koa-github/)

## Example

```
//use http://localhost:7001 to test

var koa = require('koa');
var http = require('http');
var session = require('koa-sess');
var githubAuth = require('koa-github');

var app = koa();

app.name = 'nae-web';
app.keys = ['key1', 'key2'];

app.use(session());
app.use(githubAuth({
  clientID: '5ec1d25d2a3baf99a03c',
  clientSecret: '513607494a244e2759738cae3d50a89494c1e7f0',
  callbackURL: 'http://localhost:7001',
  userKey: 'user',
  timeout: 10000
}));

app.use(function *handler() {
  if (!this.session.githubToken) {
    this.body = '<a href="/github/auth">login with github</a>';
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
```

## Options  

```
  @param {Object} options 
    - [String] clientID      github client ID     // regist in https://github.com/settings/applications
    - [String] clientSecret  github client secret
    - [String] redirectUrl   github redirect url 
    - [String] signinPath    sign in with github url, default is /github/auth
    - [String] callbackPath  github callback url, default is /github/auth/callback
    - [String] tokenKey      session key, default is githubToken
    - [String] userKey       user key, if set user key, will request github once to get the user info
    - [Array]  scope         A comma separated list of scopes
    - [Number] timeout       request github api timeout
```

## TODO
* add test
* support redirect
* refine readme

## Licences
(The MIT License)

Copyright (c) 2013 dead-horse and other contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
