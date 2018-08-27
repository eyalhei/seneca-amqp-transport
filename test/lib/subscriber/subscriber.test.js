'use strict';

const Promise = require('bluebird');
const chai = require('chai');
const DirtyChai = require('dirty-chai');
const sinon = require('sinon');
const SinonChai = require('sinon-chai');
chai.should();
chai.use(SinonChai);
chai.use(DirtyChai);

const DEFAULT_OPTIONS = require('../../../defaults')['amqp-pubsub'];
const seneca = require('seneca')();
const subscriber = require('../../../lib/subscriber');

describe('On subscriber module', function() {
  let channel = {
    assertQueue: queue =>
      Promise.resolve({
        queue
      }),
    assertExchange: exchange =>
      Promise.resolve({
        exchange
      }),
    consume: () => Promise.resolve(),
    publish: () => Promise.resolve(),
    bindQueue: () => Promise.resolve(),
    sendToQueue: () => Promise.resolve(),
    ack: Function.prototype,
    nack: Function.prototype,
    prefetch: Function.prototype,
    on: Function.prototype
  };

  let options = {
    ch: channel,
    options: DEFAULT_OPTIONS
  };
  options.options.name = 'queuename';

  const assertQueueSpy = sinon.spy(channel, 'assertQueue');
  const assertExchangeSpy = sinon.spy(channel, 'assertExchange');
  const prefetchSpy = sinon.spy(channel, 'prefetch');
  const bindQueueSpy = sinon.spy(channel, 'bindQueue');

  const queueOptions = DEFAULT_OPTIONS.subscriber.queues;
  const expectedQueueName = [queueOptions.prefix, options.options.name].join(
    queueOptions.separator
  );

  before(function() {
    // Add some `pin` to the options to be used in queue name creation
    DEFAULT_OPTIONS.pin = 'role:entity,cmd:create';
  });

  before(function(done) {
    seneca.ready(() => done());
  });

  after(function() {
    seneca.close();
  });

  describe('the setup() function', function() {
    afterEach(function() {
      // Reset the state of the stub functions
      assertQueueSpy.resetHistory();
      assertExchangeSpy.resetHistory();
      prefetchSpy.resetHistory();
      bindQueueSpy.resetHistory();
    });

    it('should return a Promise', function() {
      subscriber
        .setup(seneca, options, Function.prototype)
        .should.be.instanceof(Promise);
    });

    it('should resolve to a new Subscriber instance', function(done) {
      subscriber
        .setup(seneca, options, Function.prototype)
        .then(li => {
          li.should.be.an('object');
          li.should.have.property('listen');
        })
        .asCallback(done);
    });

    it('should have started the new subscriber', function(done) {
      subscriber
        .setup(seneca, options, Function.prototype)
        .then(li => {
          li.started.should.be.true();
        })
        .asCallback(done);
    });

    it('should set the prefetch value on the channel', function(done) {
      subscriber
        .setup(seneca, options, Function.prototype)
        .then(() => {
          channel.prefetch.should.have.been.calledOnce();
          channel.prefetch.should.have.been.calledWith(
            DEFAULT_OPTIONS.subscriber.channel.prefetch
          );
        })
        .asCallback(done);
    });

    it('should declare the exchange on the channel', function(done) {
      subscriber
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
      subscriber
        .setup(seneca, options, Function.prototype)
        .then(() => {
          channel.assertQueue.should.have.been.calledOnce();
          channel.assertQueue.should.have.been.calledWith(
            expectedQueueName,
            queueOptions.options
          );
        })
        .asCallback(done);
    });

    it('should bind the queue to the exchange', function(done) {
      subscriber
        .setup(seneca, options, Function.prototype)
        .then(() => {
          channel.bindQueue.should.have.been.calledOnce();
          channel.bindQueue.should.have.been.calledWith(
            expectedQueueName,
            DEFAULT_OPTIONS.exchange.name
          );
        })
        .asCallback(done);
    });
  });
});
