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
var debug = require('debug')('githubAuth');
var util = require('util');
var qsParse = require('querystring').parse;
var urlParse = require('url').parse;

var defaultOptions = {
  tokenKey: 'githubToken',
  signinPath: '/github/auth',
  callbackPath: '/github/auth/callback',
  timeout: 5000,
  scope: ['user']
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
 *   - [String] redirectUrl   github redirect url 
 *   - [String] signinPath    sign in with github url, default is /github/auth
 *   - [String] callbackPath  github callback url, default is /github/auth/callback
 *   - [String] tokenKey      session key, default is githubToken
 *   - [String] userKey       user key, if set user key, will request github once to get the user info
 *   - [Array]  scope         A comma separated list of scopes
 *   - [Number] timeout       request github api timeout
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
  urllib.TIMEOUT = options.timeout;
  debug('init github auth middleware with options %j', options);

  function random() {
    return Math.random().toString();
  }

  return function *githubAuth(next) {
    if (this.session[options.tokenKey]) {
      debug('already has github token');
      return yield next;
    }

    // first step: redirect to github
    if (this.path === options.signinPath) {
      var state = random();
      var redirectUrl = 'https://github.com/login/oauth/authorize?';
      redirectUrl = util.format('%sclient_id=%s&redirect_uri=%s%s&scope=%s&state=%s',
        redirectUrl, options.clientID, options.callbackURL, options.callbackPath, 
        options.scope, state);

      this.session._githubstate = state;
      debug('request github auth, redirect to %s', redirectUrl);
      return this.redirect(redirectUrl);
    }

    // secound step: github callback
    if (this.path === options.callbackPath) {
      debug('after auth, jump from github.');
      var url = urlParse(this.request.url, true);

      // must have code
      if (!url.query.code) {
        debug('request url do not have `code`');
        this.throw(400);
      }

      // check the state, protect against cross-site request forgery attacks
      if (url.query.state !== this.session._githubstate) {
        debug('request state is %s, but the state in session is %s',
          url.query.state, this.session._githubstate);
        delete this.session._githubstate;
        this.throw(403);
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
      var result;
      try {
        result = yield urllib.request(tokenUrl, requsetOptions);
      } catch (err) {
        return this.throw('request github token error:' + err.message, 500);
      }
      if (result[1].statusCode !== 200) {
        return this.throw('request github token error: ' + result[0].toString(),
          result[1].statusCode);
      }
      var token = qsParse(result[0].toString()).access_token;
      if (!token) {
        return this.throw('request github token response no token', 404);
      }
      this.session[options.tokenKey] = token;
      debug('get access_token %s and store in session.%s', token, options.tokenKey);
      delete this.session._githubstate;

      //step four: if set userKey, get user
      if (options.userKey) {
        try {
          var userUrl = 'https://api.github.com/user';
          var authOptions = {
            headers: {
              Authorization: 'token ' + token,
              'user-agent': urllib.USER_AGENT
            },
            dataType: 'json'
          };
          result = yield urllib.request(userUrl, authOptions);
        } catch (err) {
          return this.throw('request github user info error:' + err.message, 500);
        }
        if (result[1].statusCode !== 200) {
          return this.throw('request github user info error: ' + result[0].toString(),
            result[1].statusCode);
        }
        if (!result[0]) {
          return this.throw('request github user info response no user', 404);
        }
        debug('get user info %j and store in session.%s', result[0], options.userKey);
        this.session[options.userKey] = result[0];
      }
      return this.redirect('/');
    }

    yield next;
  };
};
