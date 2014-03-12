TESTS = test/*.test.js
REPORTER = spec
TIMEOUT = 5000
MOCHA_OPTS =
NPM_INSTALL = npm install --registry=http://registry.cnpmjs.org --cache=${HOME}/.npm/.cache/cnpm --disturl=http://dist.u.qiniudn.com

install:
	@$(NPM_INSTALL)

test:
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--harmony-generators \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) \
		--require should \
		$(MOCHA_OPTS) \
		$(TESTS)

test-cov:
	@NODE_ENV=test node --harmony \
		node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha \
		-- -u exports \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) \
		$(MOCHA_OPTS) \
		$(TESTS)
	@-$(MAKE) check-coverage

check-coverage:
	@./node_modules/.bin/istanbul check-coverage \
		--statements 100 \
		--functions 100 \
		--branches 100 \
		--lines 100

.PHONY: test
