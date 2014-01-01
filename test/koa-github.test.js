/**!
 * koa-github - test/koa-github.test.js
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

var app = require('./support/server');
var should = require('should');
var request = require('supertest');

describe('koa-github', function () {
  describe('GET /github/auth', function () {
    it('should redirect ok', function (done) {
      request(app)
      .get('/github/auth')
      .expect(302, done);
    });
  });

  describe('GET /github/auth/callback', function () {
    it('should 400', function (done) {
      request(app)
      .get('/github/auth/callback?code=123')
      .expect(400, done);
    });

    it('should 403', function (done) {
      request(app)
      .get('/github/auth/callback?code=123&state=123')
      .expect(403, done);
    });
  });
});