'use strict';
/**
 * AMQP Subscriber/consumer factory. This is the underlying representantion
 * of a Seneca listener using an AMQP transport.
 *
 * @module lib/subscriber/listener-factory
 */
const Consumer = require('./consumer');

// Module API
module.exports = createSubscriber;

/**
 * Closure factory function that creates AMQP PubSub Listener (Subscriber) objects.
 * A "Subscriber" is created each time a call to `Seneca#listen()` is issued. It
 * declares a queue named after the `pin` (or `pins`) options and starts
 * consuming messages from it.
 *
 * See http://senecajs.org/api/#listen-options-this
 * and https://www.rabbitmq.com/tutorials/tutorial-six-javascript.html
 *
 * @param  {Seneca}  seneca         This plugin's Seneca instance.
 * @param  {Channel} options.ch     amqplib channel used for AMQP operations.
 * @param  {String}  options.queue  Name of the queue this listener should
 *                                  consume from.
 * @param  {Object} options.options  General plugin's options.
 * @return {Listener}                 A ready AMQP RPC listener.
 */
function createSubscriber(seneca, { ch, queue, options = {} }) {
  const utils = seneca.export('transport/utils');

  function handleMessage(message) {
    const data = utils.parseJSON(seneca, `listen-${options.type}`, message);
    return utils.handle_request(seneca, data, options, function(out) {
      // Here, `out` represents the reply from the Seneca add function
      // Since this is pub-sub we should ignore it
      if (out) {
        seneca.log.debug(out);
      }
      return;
    });
  }

  const consumer = Consumer(ch, { messageHandler: handleMessage });

  const Listener = {
    started: false,
    /**
     * Begins consuming incoming messages from a previously declared queue, as
     * indicated by the options given to the factory function. Upon each new
     * message, it will be deserialized and sent to the appropriate Seneca
     * handler function if properties on the payload match any configured act
     * pattern.
     *
     * Any returned value from the act will be sent in as response to a callback
     * queue following an RPC schema.
     *
     * See http://www.squaremobius.net/amqp.node/channel_api.html#channel_consume
     *
     * @return {Promise} Resolves after the consumer starts waiting for
     *                   messages.
     */
    listen() {
      return consumer.consume(queue, options.consume).then(() => {
        this.started = true;
        return this;
      });
    }
  };

  return Object.create(Listener);
}
