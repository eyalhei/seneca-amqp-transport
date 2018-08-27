'use strict';
/**
 * General purpose, high level module for declaration and setup of an AMQP
 * pub-sub publisher (client) and its pre-requisites (such as queues, exchanges and bindings).
 *
 * @module lib/publisher
 */
const Promise = require('bluebird');
const Client = require('./client-factory');

// Module API
module.exports = {
  setup
};

/**
 * Declares an exchange on the broker using the given channel.
 *
 * @param  {Channel} ch Active channel object.
 * @param  {Object} options Plugin options.
 * @return {Promise}  Resolves to an object containing the name of the declared
 *                    exchange.
 */
function declareRoute(ch, options) {
  const ex = options.exchange;
  return Promise.props({
    exchange: ch.assertExchange(ex.name, ex.type, ex.options).get('exchange')
  });
}

/**
 * Builds a new client and starts it using all passed in parameters.
 *
 * @param  {Seneca}   seneca          This plugin's Seneca instance.
 * @param  {Channel}  options.ch   Active amqplib channel object.
 * @param  {String}   options.exchange Name of the exchange to bind to.
 * @param  {Object}   options.options  Plugin general options.
 * @param  {Function} done             Async nodejs style callback.
 * @return {Promise}                   Resolves after AMQP client starts.
 */
function createActor(seneca, { ch, exchange, options }, done) {
  const client = Client(seneca, { ch, exchange, options });
  return Promise.resolve(client.start(done)).thenReturn(client);
}

/**
 * Declares everything needed for an AMQP RPC client to function and starts it.
 *
 * @param  {Seneca}   seneca          This plugin's Seneca instance.
 * @param  {Channel}  options.ch  Active amqplib channel object.
 * @param  {Object}   options.options Plugin general options.
 * @param  {Function} done            Async nodejs style callback.
 * @return {Promise}  Resolves when the publisher client has started and the
 *                    corresponding queue and exchange had both been
 *                    declared.
 */
function setup(seneca, { ch, options }, done) {
  return declareRoute(ch, options).then(function({ exchange }) {
    return createActor(seneca, { ch, exchange, options }, done);
  });
}
