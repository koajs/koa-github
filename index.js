/**!
 * koa-github - index.js
 *
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

'use strict';

/**
 * Module dependencies.
 */

var urllib = require('co-urllib');
var debug = require('debug')('koa-github');
var util = require('util');
var qsParse = require('querystring').parse;
var urlParse = require('url').parse;
var assert = require('assert');

var defaultOptions = {
  tokenKey: 'githubToken',
  signinPath: '/github/auth',
  timeout: 5000,
  scope: ['user'],
  redirect: 'redirect_uri'
};

function hasOwnProperty (obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * auth with github
 * need use session middleware before
 * see http://developer.github.com/v3/oauth/#web-application-flow
 * 
 * @param {Object} options 
 *   - [String] clientID      github client ID
 *   - [String] clientSecret  github client secret
 *   - [String] callbackURL   github callback url 
 *   - [String] signinPath    sign in with github's triggle path, default is /github/auth
 *   - [String] tokenKey      session key, default is githubToken
 *   - [String] userKey       user key, if set user key, will request github once to get the user info
 *   - [Array]  scope         A comma separated list of scopes
 *   - [Number] timeout       request github api timeout
 *   - [String] redirect      redirect key when call signinPath, so we can redirect after auth, default is redirect_uri
 *   
 */
module.exports = function (options) {
  options = options || {};
  if (!options.clientID || !options.clientSecret || !options.callbackURL) {
    throw new Error('github auth need clientID, clientSecret and callbackURL');
  }
  for (var key in defaultOptions) {
    if (!hasOwnProperty(options, key)) {
      options[key] = defaultOptions[key];
    }
  }
  options.callbackURL = options.callbackURL;
  options.callbackPath = urlParse(options.callbackURL).path;

  urllib.TIMEOUT = options.timeout;
  debug('init github auth middleware with options %j', options);

  function random() {
    return Math.random().toString();
  }

  return function *githubAuth(next) {
    if (!this.session) {
      return this.throw('github auth need session', 500);
    }

    // first step: redirect to github
    if (this.path === options.signinPath) {
      var state = random();
      var redirectUrl = 'https://github.com/login/oauth/authorize?';
      redirectUrl = util.format('%sclient_id=%s&redirect_uri=%s&scope=%s&state=%s',
        redirectUrl, options.clientID, options.callbackURL, options.scope, state);

      this.session._githubstate = state;

      //try to get the redirect url and set it to session
      try {
        var redirect = decodeURIComponent(urlParse(this.url, true).query[options.redirect] || '');
        if (redirect[0] === '/') {
          this.session._githubredirect = redirect;
          debug('get github callback redirect uri: %s', redirect);
        }
      } catch (err) {
        debug('decode redirect uri error');
      }
      debug('request github auth, redirect to %s', redirectUrl);
      //if already signin
      if (this.session[options.tokenKey]) {
        debug('already has github token');
        redirectUrl = this.session._githubredirect || '/';
        delete this.session._githubredirect;
      }
      return this.redirect(redirectUrl);
    }

    // secound step: github callback
    if (this.path === options.callbackPath) {
      //if already signin
      if (this.session[options.tokenKey]) {
        debug('already has github token');
        return this.redirect('/');
      }

      debug('after auth, jump from github.');
      var url = urlParse(this.request.url, true);

      // must have code
      if (!url.query.code || !url.query.state) {
        debug('request url need `code` and `state`');
        return this.throw(400);
      }

      // check the state, protect against cross-site request forgery attacks
      if (url.query.state !== this.session._githubstate) {
        debug('request state is %s, but the state in session is %s',
          url.query.state, this.session._githubstate);
        delete this.session._githubstate;
        return this.throw(403);
      }

      //step three: request to get the access token
      var tokenUrl = 'https://github.com/login/oauth/access_token';
      var requsetOptions = {
        data: {
          client_id: options.clientID,
          client_secret: options.clientSecret,
          code: url.query.code
        }
      };
      debug('request the access token with data: %j', requsetOptions.data);
      var token;
      try {
        var result = yield urllib.request(tokenUrl, requsetOptions);
        assert.equal(result[1].statusCode, 200, 
          'response status ' + result[1].statusCode + ' not match 200');

        token = qsParse(result[0].toString()).access_token;
        assert(token, 'response without access_token');
      } catch (err) {
        return this.throw('request github token error: ' + err.message, 500);
      }

      this.session[options.tokenKey] = token;
      debug('get access_token %s and store in session.%s', token, options.tokenKey);
      delete this.session._githubstate;

      //step four: if set userKey, get user
      if (options.userKey) {
        var result;
        try {
          var userUrl = 'https://api.github.com/user';
          var authOptions = {
            headers: {
              Authorization: 'token ' + token,
              'user-agent': 'koa-github'
            },
            dataType: 'json'
          };
          result = yield urllib.request(userUrl, authOptions);
          assert.equal(result[1].statusCode, 200, 
            'response status ' + result[1].statusCode + ' not match 200');
          assert(result[0], 'response without user info');
        } catch (err) {
          return this.throw('request github user info error: ' + err.message, 500);
        }
        debug('get user info %j and store in session.%s', result[0], options.userKey);
        this.session[options.userKey] = result[0];
      }
      var githubredirect = this.session._githubredirect || '/';
      delete this.session._githubredirect;
      return this.redirect(githubredirect);
    }

    yield next;
  };
};
