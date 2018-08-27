'use strict';
/**
 *
 * @module client/publisher
 */
const isObject = require('lodash/isObject');
const uuid = require('uuid');

// Module API
module.exports = createPublisher;

/**
 * IANA JSON Media Type string.
 * See https://tools.ietf.org/html/rfc4627
 *
 * @type {String}
 */
const JSON_CONTENT_TYPE = 'application/json';

function createPublisher(ch, { correlationId = uuid.v4() } = {}) {
  if (!isObject(ch)) {
    throw new TypeError(
      'Channel parameter `ch` must be provided (got: [' + typeof ch + '])'
    );
  }

  function publish(message, exchange, rk, options) {
    const opts = Object.assign({}, options, {
      contentType: JSON_CONTENT_TYPE,
      correlationId: correlationId
    });
    return ch.publish(exchange, rk, Buffer.from(message), opts);
  }

  const Publisher = {
    publish
  };

  return Object.create(Publisher);
}
