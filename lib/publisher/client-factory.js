'use strict';
/**
 * AMQP RPC client/publisher factory. This is the underlying representantion
 * of a Seneca client using an AMQP transport.
 *
 * @module lib/client/client-factory
 */
const Promise = require('bluebird');
const amqputil = require('../client/client-util');
const uuid = require('uuid');

// Module API
module.exports = createClient;

/**
 * IANA JSON Media Type string.
 * See https://tools.ietf.org/html/rfc4627
 *
 * @type {String}
 */
const JSON_CONTENT_TYPE = 'application/json';

/**
 * Closure factory function that creates AMQP RPC Client (publisher) objects.
 * A "Client" publishes AMQP messages to a fixed `exchange` with a routing key
 * built from a Seneca action pattern, like 'command:say,message:hi'.
 * It then starts consuming from a randomly named callback queue where it
 * expects a response from the remote service.
 *
 * See https://www.rabbitmq.com/tutorials/tutorial-six-javascript.html
 *
 * @param  {Seneca} seneca           This plugin's Seneca instance.
 * @param  {Channel} options.ch       Channel used for AMQP operations.
 * @param  {String} options.exchange Name of the exchange to publish to.
 * @param  {Object} options.options  General plugin's options.
 * @return {Client}                  A ready AMQP RPC client.
 */
function createClient(seneca, { ch, exchange, options = {} }) {
  const utils = seneca.export('transport/utils');

  function publish(message, exchange, rk) {
    const opts = Object.assign({}, options.publish, {
      contentType: JSON_CONTENT_TYPE,
      correlationId: options.correlationId || uuid.v4()
    });
    return ch.publish(exchange, rk, Buffer.from(message), opts);
  }

  function act(args, done) {
    const outmsg = utils.prepare_request(seneca, args, done);
    const outstr = utils.stringifyJSON(
      seneca,
      `client-${options.type}`,
      outmsg
    );
    const topic = amqputil.resolveClientTopic(args);
    return publish(outstr, exchange, topic).then(() => {
      const input = utils.parseJSON(seneca, `client-${options.type}`, '{}');
      return utils.handle_response(seneca, input, options);
    });
  }

  function callback(spec, topic, sendDone) {
    return sendDone(null, act);
  }

  const Client = {
    started: false,
    /**
     * Constructs a Seneca client and immediately bounds `seneca.act` calls
     * to AMQP RPC calls (assuming the proper 'role:transport,hook:client'
     * pattern was added before).
     *
     * @param  {Function} done Async callback function.
     * @return {Promise}
     */
    start(done) {
      ch.on('error', done);
      return Promise.resolve(
        utils.make_client(seneca, callback, options, done)
      ).then(() => {
        this.started = true;
        return this;
      });
    }
  };

  return Object.create(Client);
}
