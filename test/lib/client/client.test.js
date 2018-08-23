'use strict';

const Promise = require('bluebird');
const chai = require('chai');
const sinon = require('sinon');
const DirtyChai = require('dirty-chai');
const SinonChai = require('sinon-chai');

chai.should();
chai.use(SinonChai);
chai.use(DirtyChai);

// use the default options
const DEFAULT_OPTIONS = require('../../../defaults').amqp;
const seneca = require('seneca')();
const amqputil = require('../../../lib/client/client-util');
const client = require('../../../lib/client');

describe('On client module', function() {
  let channel = {
    assertQueue: queue => Promise.resolve({ queue }),
    assertExchange: exchange => Promise.resolve({ exchange }),
    consume: () => Promise.resolve(),
    publish: () => Promise.resolve(),
    prefetch: Function.prototype,
    on: Function.prototype
  };

  let options = {
    ch: channel,
    options: DEFAULT_OPTIONS
  };

  after(function() {
    seneca.close();
  });

  let assertQueueSpy,
    assertExchangeSpy,
    consumeSpy,
    publishSpy,
    prefetchSpy,
    onSpy;

  before(function() {
    // Set some fixed id on queue options so generated name won't be random
    // and different each time resolveClientQueue() is called
    DEFAULT_OPTIONS.client.queues.id = 'foo';

    // Create spies for channel methods
    assertQueueSpy = sinon.spy(channel, 'assertQueue');
    assertExchangeSpy = sinon.spy(channel, 'assertExchange');
    consumeSpy = sinon.spy(channel, 'consume');
    publishSpy = sinon.spy(channel, 'publish');
    prefetchSpy = sinon.spy(channel, 'prefetch');
    onSpy = sinon.spy(channel, 'on');
  });

  afterEach(function() {
    // Reset the state of the stub functions
    assertQueueSpy.resetHistory();
    assertExchangeSpy.resetHistory();
    consumeSpy.resetHistory();
    publishSpy.resetHistory();
    prefetchSpy.resetHistory();
    onSpy.resetHistory();
  });

  describe('the setup() function', function() {
    it('should return a Promise', function() {
      client
        .setup(seneca, options, Function.prototype)
        .should.be.instanceof(Promise);
    });

    it('should resolve to a new Client instance', function(done) {
      client
        .setup(seneca, options, Function.prototype)
        .then(cl => {
          cl.should.be.an('object');
          cl.should.have.property('start');
        })
        .asCallback(done);
    });

    it('should have started the new client', function(done) {
      client
        .setup(seneca, options, Function.prototype)
        .then(cl => cl.started.should.be.true())
        .asCallback(done);
    });

    it('should set the prefetch value on the channel', function(done) {
      client
        .setup(seneca, options, Function.prototype)
        .then(() => {
          channel.prefetch.should.have.been.calledOnce();
          channel.prefetch.should.have.been.calledWith(
            DEFAULT_OPTIONS.client.channel.prefetch
          );
        })
        .asCallback(done);
    });

    it('should declare the exchange on the channel', function(done) {
      client
        .setup(seneca, options, Function.prototype)
        .then(() => {
          var ex = DEFAULT_OPTIONS.exchange;
          channel.assertExchange.should.have.been.calledOnce();
          channel.assertExchange.should.have.been.calledWith(
            ex.name,
            ex.type,
            ex.options
          );
        })
        .asCallback(done);
    });

    it('should declare the queue on the channel', function(done) {
      client
        .setup(seneca, options, Function.prototype)
        .then(() => {
          var queueOptions = DEFAULT_OPTIONS.client.queues;
          var queueName = amqputil.resolveClientQueue(queueOptions);
          channel.assertQueue.should.have.been.calledOnce();
          channel.assertQueue.should.have.been.calledWith(
            queueName,
            queueOptions.options
          );
        })
        .asCallback(done);
    });
  });
});
