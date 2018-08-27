'use strict';
/**
 * @module lib/subscriber/consumer
 */
const isObject = require('lodash/isObject');
const isFunction = require('lodash/isFunction');

// Module API
module.exports = createConsumer;

function createConsumer(ch, { queue, messageHandler } = {}) {
  if (!isObject(ch)) {
    throw new TypeError(
      'Channel parameter `ch` must be provided (got: [' + typeof ch + '])'
    );
  }

  const handleMessage = isFunction(messageHandler)
    ? messageHandler
    : Function.prototype;

  function onMessage(message) {
    if (message) {
      let content = message.content ? message.content.toString() : undefined;
      if (!content) {
        // Do not requeue message if there is no payload
        return ch.nack(message, false, false);
      }

      try {
        handleMessage(content);
        ch.ack(message);
      } catch (err) {
        // Failure to handle the message will result in it
        // being rejected (possibly sent to dead letter)
        ch.nack(message, false, false);
      }
    }
  }

  const Consumer = {
    consume: (q, options) => ch.consume(q || queue, onMessage, options)
  };

  return Object.create(Consumer);
}
