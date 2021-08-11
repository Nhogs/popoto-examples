(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.neo4j = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertTxConfigIsEmpty = exports.assertDatabaseIsEmpty = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var neo4j_driver_core_1 = require("neo4j-driver-core");
/**
 * @param {TxConfig} txConfig the auto-commit transaction configuration.
 * @param {function(error: string)} onProtocolError called when the txConfig is not empty.
 * @param {ResultStreamObserver} observer the response observer.
 */
function assertTxConfigIsEmpty(txConfig, onProtocolError, observer) {
    if (onProtocolError === void 0) { onProtocolError = function () { }; }
    if (txConfig && !txConfig.isEmpty()) {
        var error = neo4j_driver_core_1.newError('Driver is connected to the database that does not support transaction configuration. ' +
            'Please upgrade to neo4j 3.5.0 or later in order to use this functionality');
        // unsupported API was used, consider this a fatal error for the current connection
        onProtocolError(error.message);
        observer.onError(error);
        throw error;
    }
}
exports.assertTxConfigIsEmpty = assertTxConfigIsEmpty;
/**
 * Asserts that the passed-in database name is empty.
 * @param {string} database
 * @param {fuction(err: String)} onProtocolError Called when it doesn't have database set
 */
function assertDatabaseIsEmpty(database, onProtocolError, observer) {
    if (onProtocolError === void 0) { onProtocolError = function () { }; }
    if (database) {
        var error = neo4j_driver_core_1.newError('Driver is connected to the database that does not support multiple databases. ' +
            'Please upgrade to neo4j 4.0.0 or later in order to use this functionality');
        // unsupported API was used, consider this a fatal error for the current connection
        onProtocolError(error.message);
        observer.onError(error);
        throw error;
    }
}
exports.assertDatabaseIsEmpty = assertDatabaseIsEmpty;

},{"neo4j-driver-core":58}],2:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var bolt_protocol_util_1 = require("./bolt-protocol-util");
var packstream_1 = require("../packstream");
var request_message_1 = __importDefault(require("./request-message"));
var stream_observers_1 = require("./stream-observers");
var neo4j_driver_core_1 = require("neo4j-driver-core");
var Bookmark = neo4j_driver_core_1.internal.bookmark.Bookmark, _a = neo4j_driver_core_1.internal.constants, ACCESS_MODE_WRITE = _a.ACCESS_MODE_WRITE, BOLT_PROTOCOL_V1 = _a.BOLT_PROTOCOL_V1, Logger = neo4j_driver_core_1.internal.logger.Logger, TxConfig = neo4j_driver_core_1.internal.txConfig.TxConfig;
var BoltProtocol = /** @class */ (function () {
    /**
     * @callback CreateResponseHandler Creates the response handler
     * @param {BoltProtocol} protocol The bolt protocol
     * @returns {ResponseHandler} The response handler
     */
    /**
     * @callback OnProtocolError Handles protocol error
     * @param {string} error The description
     */
    /**
     * @constructor
     * @param {Object} server the server informatio.
     * @param {Chunker} chunker the chunker.
     * @param {Object} packstreamConfig Packstream configuration
     * @param {boolean} packstreamConfig.disableLosslessIntegers if this connection should convert all received integers to native JS numbers.
     * @param {boolean} packstreamConfig.useBigInt if this connection should convert all received integers to native BigInt numbers.
     * @param {CreateResponseHandler} createResponseHandler Function which creates the response handler
     * @param {Logger} log the logger
     * @param {OnProtocolError} onProtocolError handles protocol errors
     */
    function BoltProtocol(server, chunker, _a, createResponseHandler, log, onProtocolError) {
        var _b = _a === void 0 ? {} : _a, disableLosslessIntegers = _b.disableLosslessIntegers, useBigInt = _b.useBigInt;
        if (createResponseHandler === void 0) { createResponseHandler = function () { return null; }; }
        this._server = server || {};
        this._chunker = chunker;
        this._packer = this._createPacker(chunker);
        this._unpacker = this._createUnpacker(disableLosslessIntegers, useBigInt);
        this._responseHandler = createResponseHandler(this);
        this._log = log;
        this._onProtocolError = onProtocolError;
        this._fatalError = null;
    }
    Object.defineProperty(BoltProtocol.prototype, "version", {
        /**
         * Returns the numerical version identifier for this protocol
         */
        get: function () {
            return BOLT_PROTOCOL_V1;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Get the packer.
     * @return {Packer} the protocol's packer.
     */
    BoltProtocol.prototype.packer = function () {
        return this._packer;
    };
    /**
     * Get the unpacker.
     * @return {Unpacker} the protocol's unpacker.
     */
    BoltProtocol.prototype.unpacker = function () {
        return this._unpacker;
    };
    /**
     * Transform metadata received in SUCCESS message before it is passed to the handler.
     * @param {Object} metadata the received metadata.
     * @return {Object} transformed metadata.
     */
    BoltProtocol.prototype.transformMetadata = function (metadata) {
        return metadata;
    };
    /**
     * Perform initialization and authentication of the underlying connection.
     * @param {Object} param
     * @param {string} param.userAgent the user agent.
     * @param {Object} param.authToken the authentication token.
     * @param {function(err: Error)} param.onError the callback to invoke on error.
     * @param {function()} param.onComplete the callback to invoke on completion.
     * @returns {StreamObserver} the stream observer that monitors the corresponding server response.
     */
    BoltProtocol.prototype.initialize = function (_a) {
        var _this = this;
        var _b = _a === void 0 ? {} : _a, userAgent = _b.userAgent, authToken = _b.authToken, onError = _b.onError, onComplete = _b.onComplete;
        var observer = new stream_observers_1.LoginObserver({
            onError: function (error) { return _this._onLoginError(error, onError); },
            onCompleted: function (metadata) { return _this._onLoginCompleted(metadata, onComplete); }
        });
        this.write(request_message_1.default.init(userAgent, authToken), observer, true);
        return observer;
    };
    /**
     * Perform protocol related operations for closing this connection
     */
    BoltProtocol.prototype.prepareToClose = function () {
        // no need to notify the database in this protocol version
    };
    /**
     * Begin an explicit transaction.
     * @param {Object} param
     * @param {Bookmark} param.bookmark the bookmark.
     * @param {TxConfig} param.txConfig the configuration.
     * @param {string} param.database the target database name.
     * @param {string} param.mode the access mode.
     * @param {function(err: Error)} param.beforeError the callback to invoke before handling the error.
     * @param {function(err: Error)} param.afterError the callback to invoke after handling the error.
     * @param {function()} param.beforeComplete the callback to invoke before handling the completion.
     * @param {function()} param.afterComplete the callback to invoke after handling the completion.
     * @returns {StreamObserver} the stream observer that monitors the corresponding server response.
     */
    BoltProtocol.prototype.beginTransaction = function (_a) {
        var _b = _a === void 0 ? {} : _a, bookmark = _b.bookmark, txConfig = _b.txConfig, database = _b.database, mode = _b.mode, beforeError = _b.beforeError, afterError = _b.afterError, beforeComplete = _b.beforeComplete, afterComplete = _b.afterComplete;
        return this.run('BEGIN', bookmark ? bookmark.asBeginTransactionParameters() : {}, {
            bookmark: bookmark,
            txConfig: txConfig,
            database: database,
            mode: mode,
            beforeError: beforeError,
            afterError: afterError,
            beforeComplete: beforeComplete,
            afterComplete: afterComplete,
            flush: false
        });
    };
    /**
     * Commit the explicit transaction.
     * @param {Object} param
     * @param {function(err: Error)} param.beforeError the callback to invoke before handling the error.
     * @param {function(err: Error)} param.afterError the callback to invoke after handling the error.
     * @param {function()} param.beforeComplete the callback to invoke before handling the completion.
     * @param {function()} param.afterComplete the callback to invoke after handling the completion.
     * @returns {StreamObserver} the stream observer that monitors the corresponding server response.
     */
    BoltProtocol.prototype.commitTransaction = function (_a) {
        var _b = _a === void 0 ? {} : _a, beforeError = _b.beforeError, afterError = _b.afterError, beforeComplete = _b.beforeComplete, afterComplete = _b.afterComplete;
        // WRITE access mode is used as a place holder here, it has
        // no effect on behaviour for Bolt V1 & V2
        return this.run('COMMIT', {}, {
            bookmark: Bookmark.empty(),
            txConfig: TxConfig.empty(),
            mode: ACCESS_MODE_WRITE,
            beforeError: beforeError,
            afterError: afterError,
            beforeComplete: beforeComplete,
            afterComplete: afterComplete
        });
    };
    /**
     * Rollback the explicit transaction.
     * @param {Object} param
     * @param {function(err: Error)} param.beforeError the callback to invoke before handling the error.
     * @param {function(err: Error)} param.afterError the callback to invoke after handling the error.
     * @param {function()} param.beforeComplete the callback to invoke before handling the completion.
     * @param {function()} param.afterComplete the callback to invoke after handling the completion.
     * @returns {StreamObserver} the stream observer that monitors the corresponding server response.
     */
    BoltProtocol.prototype.rollbackTransaction = function (_a) {
        var _b = _a === void 0 ? {} : _a, beforeError = _b.beforeError, afterError = _b.afterError, beforeComplete = _b.beforeComplete, afterComplete = _b.afterComplete;
        // WRITE access mode is used as a place holder here, it has
        // no effect on behaviour for Bolt V1 & V2
        return this.run('ROLLBACK', {}, {
            bookmark: Bookmark.empty(),
            txConfig: TxConfig.empty(),
            mode: ACCESS_MODE_WRITE,
            beforeError: beforeError,
            afterError: afterError,
            beforeComplete: beforeComplete,
            afterComplete: afterComplete
        });
    };
    /**
     * Send a Cypher query through the underlying connection.
     * @param {string} query the cypher query.
     * @param {Object} parameters the query parameters.
     * @param {Object} param
     * @param {Bookmark} param.bookmark the bookmark.
     * @param {TxConfig} param.txConfig the transaction configuration.
     * @param {string} param.database the target database name.
     * @param {string} param.mode the access mode.
     * @param {function(keys: string[])} param.beforeKeys the callback to invoke before handling the keys.
     * @param {function(keys: string[])} param.afterKeys the callback to invoke after handling the keys.
     * @param {function(err: Error)} param.beforeError the callback to invoke before handling the error.
     * @param {function(err: Error)} param.afterError the callback to invoke after handling the error.
     * @param {function()} param.beforeComplete the callback to invoke before handling the completion.
     * @param {function()} param.afterComplete the callback to invoke after handling the completion.
     * @param {boolean} param.flush whether to flush the buffered messages.
     * @returns {StreamObserver} the stream observer that monitors the corresponding server response.
     */
    BoltProtocol.prototype.run = function (query, parameters, _a) {
        var _b = _a === void 0 ? {} : _a, bookmark = _b.bookmark, txConfig = _b.txConfig, database = _b.database, mode = _b.mode, beforeKeys = _b.beforeKeys, afterKeys = _b.afterKeys, beforeError = _b.beforeError, afterError = _b.afterError, beforeComplete = _b.beforeComplete, afterComplete = _b.afterComplete, _c = _b.flush, flush = _c === void 0 ? true : _c;
        var observer = new stream_observers_1.ResultStreamObserver({
            server: this._server,
            beforeKeys: beforeKeys,
            afterKeys: afterKeys,
            beforeError: beforeError,
            afterError: afterError,
            beforeComplete: beforeComplete,
            afterComplete: afterComplete
        });
        // bookmark and mode are ignored in this version of the protocol
        bolt_protocol_util_1.assertTxConfigIsEmpty(txConfig, this._onProtocolError, observer);
        // passing in a database name on this protocol version throws an error
        bolt_protocol_util_1.assertDatabaseIsEmpty(database, this._onProtocolError, observer);
        this.write(request_message_1.default.run(query, parameters), observer, false);
        this.write(request_message_1.default.pullAll(), observer, flush);
        return observer;
    };
    /**
     * Send a RESET through the underlying connection.
     * @param {Object} param
     * @param {function(err: Error)} param.onError the callback to invoke on error.
     * @param {function()} param.onComplete the callback to invoke on completion.
     * @returns {StreamObserver} the stream observer that monitors the corresponding server response.
     */
    BoltProtocol.prototype.reset = function (_a) {
        var _b = _a === void 0 ? {} : _a, onError = _b.onError, onComplete = _b.onComplete;
        var observer = new stream_observers_1.ResetObserver({
            onProtocolError: this._onProtocolError,
            onError: onError,
            onComplete: onComplete
        });
        this.write(request_message_1.default.reset(), observer, true);
        return observer;
    };
    BoltProtocol.prototype._createPacker = function (chunker) {
        return new packstream_1.v1.Packer(chunker);
    };
    BoltProtocol.prototype._createUnpacker = function (disableLosslessIntegers, useBigInt) {
        return new packstream_1.v1.Unpacker(disableLosslessIntegers, useBigInt);
    };
    /**
     * Write a message to the network channel.
     * @param {RequestMessage} message the message to write.
     * @param {StreamObserver} observer the response observer.
     * @param {boolean} flush `true` if flush should happen after the message is written to the buffer.
     */
    BoltProtocol.prototype.write = function (message, observer, flush) {
        var _this = this;
        var queued = this.queueObserverIfProtocolIsNotBroken(observer);
        if (queued) {
            if (this._log.isDebugEnabled()) {
                this._log.debug("C: " + message);
            }
            this.packer().packStruct(message.signature, message.fields.map(function (field) { return _this.packer().packable(field); }));
            this._chunker.messageBoundary();
            if (flush) {
                this._chunker.flush();
            }
        }
    };
    /**
     * Notifies faltal erros to the observers and mark the protocol in the fatal error state.
     * @param {Error} error The error
     */
    BoltProtocol.prototype.notifyFatalError = function (error) {
        this._fatalError = error;
        return this._responseHandler._notifyErrorToObservers(error);
    };
    /**
     * Updates the the current observer with the next one on the queue.
     */
    BoltProtocol.prototype.updateCurrentObserver = function () {
        return this._responseHandler._updateCurrentObserver();
    };
    /**
     * Checks if exist an ongoing observable requests
     * @return {boolean}
     */
    BoltProtocol.prototype.hasOngoingObservableRequests = function () {
        return this._responseHandler.hasOngoingObservableRequests();
    };
    /**
     * Enqueue the observer if the protocol is not broken.
     * In case it's broken, the observer will be notified about the error.
     *
     * @param {StreamObserver} observer The observer
     * @returns {boolean} if it was queued
     */
    BoltProtocol.prototype.queueObserverIfProtocolIsNotBroken = function (observer) {
        if (this.isBroken()) {
            this.notifyFatalErrorToObserver(observer);
            return false;
        }
        return this._responseHandler._queueObserver(observer);
    };
    /**
     * Veritfy the protocol is not broken.
     * @returns {boolean}
     */
    BoltProtocol.prototype.isBroken = function () {
        return !!this._fatalError;
    };
    /**
     * Notifies the current fatal error to the observer
     *
     * @param {StreamObserver} observer The observer
     */
    BoltProtocol.prototype.notifyFatalErrorToObserver = function (observer) {
        if (observer && observer.onError) {
            observer.onError(this._fatalError);
        }
    };
    /**
     * Reset current failure on the observable response handler to null.
     */
    BoltProtocol.prototype.resetFailure = function () {
        this._responseHandler._resetFailure();
    };
    BoltProtocol.prototype._onLoginCompleted = function (metadata, onCompleted) {
        if (metadata) {
            var serverVersion = metadata.server;
            if (!this._server.version) {
                this._server.version = serverVersion;
            }
        }
        if (onCompleted) {
            onCompleted(metadata);
        }
    };
    BoltProtocol.prototype._onLoginError = function (error, onError) {
        this._onProtocolError(error.message);
        if (onError) {
            onError(error);
        }
    };
    return BoltProtocol;
}());
exports.default = BoltProtocol;

},{"../packstream":42,"./bolt-protocol-util":1,"./request-message":12,"./stream-observers":15,"neo4j-driver-core":58}],3:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var bolt_protocol_v1_1 = __importDefault(require("./bolt-protocol-v1"));
var packstream_1 = __importDefault(require("../packstream"));
var neo4j_driver_core_1 = require("neo4j-driver-core");
var BOLT_PROTOCOL_V2 = neo4j_driver_core_1.internal.constants.BOLT_PROTOCOL_V2;
var BoltProtocol = /** @class */ (function (_super) {
    __extends(BoltProtocol, _super);
    function BoltProtocol() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    BoltProtocol.prototype._createPacker = function (chunker) {
        return new packstream_1.default.Packer(chunker);
    };
    BoltProtocol.prototype._createUnpacker = function (disableLosslessIntegers, useBigInt) {
        return new packstream_1.default.Unpacker(disableLosslessIntegers, useBigInt);
    };
    Object.defineProperty(BoltProtocol.prototype, "version", {
        get: function () {
            return BOLT_PROTOCOL_V2;
        },
        enumerable: false,
        configurable: true
    });
    return BoltProtocol;
}(bolt_protocol_v1_1.default));
exports.default = BoltProtocol;

},{"../packstream":42,"./bolt-protocol-v1":2,"neo4j-driver-core":58}],4:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var bolt_protocol_v2_1 = __importDefault(require("./bolt-protocol-v2"));
var request_message_1 = __importDefault(require("./request-message"));
var bolt_protocol_util_1 = require("./bolt-protocol-util");
var stream_observers_1 = require("./stream-observers");
var neo4j_driver_core_1 = require("neo4j-driver-core");
var Bookmark = neo4j_driver_core_1.internal.bookmark.Bookmark, BOLT_PROTOCOL_V3 = neo4j_driver_core_1.internal.constants.BOLT_PROTOCOL_V3, TxConfig = neo4j_driver_core_1.internal.txConfig.TxConfig;
var CONTEXT = 'context';
var CALL_GET_ROUTING_TABLE = "CALL dbms.cluster.routing.getRoutingTable($" + CONTEXT + ")";
var noOpObserver = new stream_observers_1.StreamObserver();
var BoltProtocol = /** @class */ (function (_super) {
    __extends(BoltProtocol, _super);
    function BoltProtocol() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(BoltProtocol.prototype, "version", {
        get: function () {
            return BOLT_PROTOCOL_V3;
        },
        enumerable: false,
        configurable: true
    });
    BoltProtocol.prototype.transformMetadata = function (metadata) {
        if ('t_first' in metadata) {
            // Bolt V3 uses shorter key 't_first' to represent 'result_available_after'
            // adjust the key to be the same as in Bolt V1 so that ResultSummary can retrieve the value
            metadata.result_available_after = metadata.t_first;
            delete metadata.t_first;
        }
        if ('t_last' in metadata) {
            // Bolt V3 uses shorter key 't_last' to represent 'result_consumed_after'
            // adjust the key to be the same as in Bolt V1 so that ResultSummary can retrieve the value
            metadata.result_consumed_after = metadata.t_last;
            delete metadata.t_last;
        }
        return metadata;
    };
    BoltProtocol.prototype.initialize = function (_a) {
        var _this = this;
        var _b = _a === void 0 ? {} : _a, userAgent = _b.userAgent, authToken = _b.authToken, onError = _b.onError, onComplete = _b.onComplete;
        var observer = new stream_observers_1.LoginObserver({
            onError: function (error) { return _this._onLoginError(error, onError); },
            onCompleted: function (metadata) { return _this._onLoginCompleted(metadata, onComplete); }
        });
        this.write(request_message_1.default.hello(userAgent, authToken), observer, true);
        return observer;
    };
    BoltProtocol.prototype.prepareToClose = function () {
        this.write(request_message_1.default.goodbye(), noOpObserver, true);
    };
    BoltProtocol.prototype.beginTransaction = function (_a) {
        var _b = _a === void 0 ? {} : _a, bookmark = _b.bookmark, txConfig = _b.txConfig, database = _b.database, mode = _b.mode, beforeError = _b.beforeError, afterError = _b.afterError, beforeComplete = _b.beforeComplete, afterComplete = _b.afterComplete;
        var observer = new stream_observers_1.ResultStreamObserver({
            server: this._server,
            beforeError: beforeError,
            afterError: afterError,
            beforeComplete: beforeComplete,
            afterComplete: afterComplete
        });
        observer.prepareToHandleSingleResponse();
        // passing in a database name on this protocol version throws an error
        bolt_protocol_util_1.assertDatabaseIsEmpty(database, this._onProtocolError, observer);
        this.write(request_message_1.default.begin({ bookmark: bookmark, txConfig: txConfig, mode: mode }), observer, true);
        return observer;
    };
    BoltProtocol.prototype.commitTransaction = function (_a) {
        var _b = _a === void 0 ? {} : _a, beforeError = _b.beforeError, afterError = _b.afterError, beforeComplete = _b.beforeComplete, afterComplete = _b.afterComplete;
        var observer = new stream_observers_1.ResultStreamObserver({
            server: this._server,
            beforeError: beforeError,
            afterError: afterError,
            beforeComplete: beforeComplete,
            afterComplete: afterComplete
        });
        observer.prepareToHandleSingleResponse();
        this.write(request_message_1.default.commit(), observer, true);
        return observer;
    };
    BoltProtocol.prototype.rollbackTransaction = function (_a) {
        var _b = _a === void 0 ? {} : _a, beforeError = _b.beforeError, afterError = _b.afterError, beforeComplete = _b.beforeComplete, afterComplete = _b.afterComplete;
        var observer = new stream_observers_1.ResultStreamObserver({
            server: this._server,
            beforeError: beforeError,
            afterError: afterError,
            beforeComplete: beforeComplete,
            afterComplete: afterComplete
        });
        observer.prepareToHandleSingleResponse();
        this.write(request_message_1.default.rollback(), observer, true);
        return observer;
    };
    BoltProtocol.prototype.run = function (query, parameters, _a) {
        var _b = _a === void 0 ? {} : _a, bookmark = _b.bookmark, txConfig = _b.txConfig, database = _b.database, mode = _b.mode, beforeKeys = _b.beforeKeys, afterKeys = _b.afterKeys, beforeError = _b.beforeError, afterError = _b.afterError, beforeComplete = _b.beforeComplete, afterComplete = _b.afterComplete, _c = _b.flush, flush = _c === void 0 ? true : _c;
        var observer = new stream_observers_1.ResultStreamObserver({
            server: this._server,
            beforeKeys: beforeKeys,
            afterKeys: afterKeys,
            beforeError: beforeError,
            afterError: afterError,
            beforeComplete: beforeComplete,
            afterComplete: afterComplete
        });
        // passing in a database name on this protocol version throws an error
        bolt_protocol_util_1.assertDatabaseIsEmpty(database, this._onProtocolError, observer);
        this.write(request_message_1.default.runWithMetadata(query, parameters, {
            bookmark: bookmark,
            txConfig: txConfig,
            mode: mode
        }), observer, false);
        this.write(request_message_1.default.pullAll(), observer, flush);
        return observer;
    };
    /**
     * Request routing information
     *
     * @param {Object} param -
     * @param {object} param.routingContext The routing context used to define the routing table.
     *  Multi-datacenter deployments is one of its use cases
     * @param {string} param.databaseName The database name
     * @param {Bookmark} params.sessionContext.bookmark The bookmark used for request the routing table
     * @param {string} params.sessionContext.mode The session mode
     * @param {string} params.sessionContext.database The database name used on the session
     * @param {function()} params.sessionContext.afterComplete The session param used after the session closed
     * @param {function(err: Error)} param.onError
     * @param {function(RawRoutingTable)} param.onCompleted
     * @returns {RouteObserver} the route observer
     */
    BoltProtocol.prototype.requestRoutingInformation = function (_a) {
        var _b;
        var _c = _a.routingContext, routingContext = _c === void 0 ? {} : _c, _d = _a.sessionContext, sessionContext = _d === void 0 ? {} : _d, onError = _a.onError, onCompleted = _a.onCompleted;
        var resultObserver = this.run(CALL_GET_ROUTING_TABLE, (_b = {}, _b[CONTEXT] = routingContext, _b), __assign(__assign({}, sessionContext), { txConfig: TxConfig.empty() }));
        return new stream_observers_1.ProcedureRouteObserver({
            resultObserver: resultObserver,
            onProtocolError: this._onProtocolError,
            onError: onError,
            onCompleted: onCompleted
        });
    };
    return BoltProtocol;
}(bolt_protocol_v2_1.default));
exports.default = BoltProtocol;

},{"./bolt-protocol-util":1,"./bolt-protocol-v2":3,"./request-message":12,"./stream-observers":15,"neo4j-driver-core":58}],5:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var bolt_protocol_v3_1 = __importDefault(require("./bolt-protocol-v3"));
var request_message_1 = __importStar(require("./request-message"));
var stream_observers_1 = require("./stream-observers");
var neo4j_driver_core_1 = require("neo4j-driver-core");
var Bookmark = neo4j_driver_core_1.internal.bookmark.Bookmark, BOLT_PROTOCOL_V4_0 = neo4j_driver_core_1.internal.constants.BOLT_PROTOCOL_V4_0, TxConfig = neo4j_driver_core_1.internal.txConfig.TxConfig;
var CONTEXT = 'context';
var DATABASE = 'database';
var CALL_GET_ROUTING_TABLE_MULTI_DB = "CALL dbms.routing.getRoutingTable($" + CONTEXT + ", $" + DATABASE + ")";
var BoltProtocol = /** @class */ (function (_super) {
    __extends(BoltProtocol, _super);
    function BoltProtocol() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(BoltProtocol.prototype, "version", {
        get: function () {
            return BOLT_PROTOCOL_V4_0;
        },
        enumerable: false,
        configurable: true
    });
    BoltProtocol.prototype.beginTransaction = function (_a) {
        var _b = _a === void 0 ? {} : _a, bookmark = _b.bookmark, txConfig = _b.txConfig, database = _b.database, mode = _b.mode, beforeError = _b.beforeError, afterError = _b.afterError, beforeComplete = _b.beforeComplete, afterComplete = _b.afterComplete;
        var observer = new stream_observers_1.ResultStreamObserver({
            server: this._server,
            beforeError: beforeError,
            afterError: afterError,
            beforeComplete: beforeComplete,
            afterComplete: afterComplete
        });
        observer.prepareToHandleSingleResponse();
        this.write(request_message_1.default.begin({ bookmark: bookmark, txConfig: txConfig, database: database, mode: mode }), observer, true);
        return observer;
    };
    BoltProtocol.prototype.run = function (query, parameters, _a) {
        var _b = _a === void 0 ? {} : _a, bookmark = _b.bookmark, txConfig = _b.txConfig, database = _b.database, mode = _b.mode, beforeKeys = _b.beforeKeys, afterKeys = _b.afterKeys, beforeError = _b.beforeError, afterError = _b.afterError, beforeComplete = _b.beforeComplete, afterComplete = _b.afterComplete, _c = _b.flush, flush = _c === void 0 ? true : _c, _d = _b.reactive, reactive = _d === void 0 ? false : _d, _e = _b.fetchSize, fetchSize = _e === void 0 ? request_message_1.ALL : _e;
        var observer = new stream_observers_1.ResultStreamObserver({
            server: this._server,
            reactive: reactive,
            fetchSize: fetchSize,
            moreFunction: this._requestMore.bind(this),
            discardFunction: this._requestDiscard.bind(this),
            beforeKeys: beforeKeys,
            afterKeys: afterKeys,
            beforeError: beforeError,
            afterError: afterError,
            beforeComplete: beforeComplete,
            afterComplete: afterComplete
        });
        var flushRun = reactive;
        this.write(request_message_1.default.runWithMetadata(query, parameters, {
            bookmark: bookmark,
            txConfig: txConfig,
            database: database,
            mode: mode
        }), observer, flushRun && flush);
        if (!reactive) {
            this.write(request_message_1.default.pull({ n: fetchSize }), observer, flush);
        }
        return observer;
    };
    BoltProtocol.prototype._requestMore = function (stmtId, n, observer) {
        this.write(request_message_1.default.pull({ stmtId: stmtId, n: n }), observer, true);
    };
    BoltProtocol.prototype._requestDiscard = function (stmtId, observer) {
        this.write(request_message_1.default.discard({ stmtId: stmtId }), observer, true);
    };
    BoltProtocol.prototype._noOp = function () { };
    /**
     * Request routing information
     *
     * @param {Object} param -
     * @param {object} param.routingContext The routing context used to define the routing table.
     *  Multi-datacenter deployments is one of its use cases
     * @param {string} param.databaseName The database name
     * @param {Bookmark} params.sessionContext.bookmark The bookmark used for request the routing table
     * @param {string} params.sessionContext.mode The session mode
     * @param {string} params.sessionContext.database The database name used on the session
     * @param {function()} params.sessionContext.afterComplete The session param used after the session closed
     * @param {function(err: Error)} param.onError
     * @param {function(RawRoutingTable)} param.onCompleted
     * @returns {RouteObserver} the route observer
     */
    BoltProtocol.prototype.requestRoutingInformation = function (_a) {
        var _b;
        var _c = _a.routingContext, routingContext = _c === void 0 ? {} : _c, _d = _a.databaseName, databaseName = _d === void 0 ? null : _d, _e = _a.sessionContext, sessionContext = _e === void 0 ? {} : _e, onError = _a.onError, onCompleted = _a.onCompleted;
        var resultObserver = this.run(CALL_GET_ROUTING_TABLE_MULTI_DB, (_b = {},
            _b[CONTEXT] = routingContext,
            _b[DATABASE] = databaseName,
            _b), __assign(__assign({}, sessionContext), { txConfig: TxConfig.empty() }));
        return new stream_observers_1.ProcedureRouteObserver({
            resultObserver: resultObserver,
            onProtocolError: this._onProtocolError,
            onError: onError,
            onCompleted: onCompleted
        });
    };
    return BoltProtocol;
}(bolt_protocol_v3_1.default));
exports.default = BoltProtocol;

},{"./bolt-protocol-v3":4,"./request-message":12,"./stream-observers":15,"neo4j-driver-core":58}],6:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var bolt_protocol_v4x0_1 = __importDefault(require("./bolt-protocol-v4x0"));
var request_message_1 = __importDefault(require("./request-message"));
var stream_observers_1 = require("./stream-observers");
var neo4j_driver_core_1 = require("neo4j-driver-core");
var BOLT_PROTOCOL_V4_1 = neo4j_driver_core_1.internal.constants.BOLT_PROTOCOL_V4_1;
var BoltProtocol = /** @class */ (function (_super) {
    __extends(BoltProtocol, _super);
    /**
     * @constructor
     * @param {Object} server the server informatio.
     * @param {Chunker} chunker the chunker.
     * @param {Object} packstreamConfig Packstream configuration
     * @param {boolean} packstreamConfig.disableLosslessIntegers if this connection should convert all received integers to native JS numbers.
     * @param {boolean} packstreamConfig.useBigInt if this connection should convert all received integers to native BigInt numbers.
     * @param {CreateResponseHandler} createResponseHandler Function which creates the response handler
     * @param {Logger} log the logger
     * @param {Object} serversideRouting
     *
     */
    function BoltProtocol(server, chunker, packstreamConfig, createResponseHandler, log, onProtocolError, serversideRouting) {
        if (createResponseHandler === void 0) { createResponseHandler = function () { return null; }; }
        var _this = _super.call(this, server, chunker, packstreamConfig, createResponseHandler, log, onProtocolError) || this;
        _this._serversideRouting = serversideRouting;
        return _this;
    }
    Object.defineProperty(BoltProtocol.prototype, "version", {
        get: function () {
            return BOLT_PROTOCOL_V4_1;
        },
        enumerable: false,
        configurable: true
    });
    BoltProtocol.prototype.initialize = function (_a) {
        var _this = this;
        var _b = _a === void 0 ? {} : _a, userAgent = _b.userAgent, authToken = _b.authToken, onError = _b.onError, onComplete = _b.onComplete;
        var observer = new stream_observers_1.LoginObserver({
            onError: function (error) { return _this._onLoginError(error, onError); },
            onCompleted: function (metadata) { return _this._onLoginCompleted(metadata, onComplete); }
        });
        this.write(request_message_1.default.hello(userAgent, authToken, this._serversideRouting), observer, true);
        return observer;
    };
    return BoltProtocol;
}(bolt_protocol_v4x0_1.default));
exports.default = BoltProtocol;

},{"./bolt-protocol-v4x0":5,"./request-message":12,"./stream-observers":15,"neo4j-driver-core":58}],7:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var bolt_protocol_v4x1_1 = __importDefault(require("./bolt-protocol-v4x1"));
var neo4j_driver_core_1 = require("neo4j-driver-core");
var BOLT_PROTOCOL_V4_2 = neo4j_driver_core_1.internal.constants.BOLT_PROTOCOL_V4_2;
var BoltProtocol = /** @class */ (function (_super) {
    __extends(BoltProtocol, _super);
    function BoltProtocol() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(BoltProtocol.prototype, "version", {
        get: function () {
            return BOLT_PROTOCOL_V4_2;
        },
        enumerable: false,
        configurable: true
    });
    return BoltProtocol;
}(bolt_protocol_v4x1_1.default));
exports.default = BoltProtocol;

},{"./bolt-protocol-v4x1":6,"neo4j-driver-core":58}],8:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var bolt_protocol_v4x2_1 = __importDefault(require("./bolt-protocol-v4x2"));
var request_message_1 = __importDefault(require("./request-message"));
var stream_observers_1 = require("./stream-observers");
var neo4j_driver_core_1 = require("neo4j-driver-core");
var Bookmark = neo4j_driver_core_1.internal.bookmark.Bookmark, BOLT_PROTOCOL_V4_3 = neo4j_driver_core_1.internal.constants.BOLT_PROTOCOL_V4_3;
var BoltProtocol = /** @class */ (function (_super) {
    __extends(BoltProtocol, _super);
    function BoltProtocol() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(BoltProtocol.prototype, "version", {
        get: function () {
            return BOLT_PROTOCOL_V4_3;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Request routing information
     *
     * @param {Object} param -
     * @param {object} param.routingContext The routing context used to define the routing table.
     *  Multi-datacenter deployments is one of its use cases
     * @param {string} param.databaseName The database name
     * @param {Bookmark} params.sessionContext.bookmark The bookmark used for request the routing table
     * @param {function(err: Error)} param.onError
     * @param {function(RawRoutingTable)} param.onCompleted
     * @returns {RouteObserver} the route observer
     */
    BoltProtocol.prototype.requestRoutingInformation = function (_a) {
        var _b = _a.routingContext, routingContext = _b === void 0 ? {} : _b, _c = _a.databaseName, databaseName = _c === void 0 ? null : _c, _d = _a.sessionContext, sessionContext = _d === void 0 ? {} : _d, onError = _a.onError, onCompleted = _a.onCompleted;
        var observer = new stream_observers_1.RouteObserver({
            onProtocolError: this._onProtocolError,
            onError: onError,
            onCompleted: onCompleted
        });
        var bookmark = sessionContext.bookmark || Bookmark.empty();
        this.write(request_message_1.default.route(routingContext, bookmark.values(), databaseName), observer, true);
        return observer;
    };
    return BoltProtocol;
}(bolt_protocol_v4x2_1.default));
exports.default = BoltProtocol;

},{"./bolt-protocol-v4x2":7,"./request-message":12,"./stream-observers":15,"neo4j-driver-core":58}],9:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var neo4j_driver_core_1 = require("neo4j-driver-core");
var bolt_protocol_v1_1 = __importDefault(require("./bolt-protocol-v1"));
var bolt_protocol_v2_1 = __importDefault(require("./bolt-protocol-v2"));
var bolt_protocol_v3_1 = __importDefault(require("./bolt-protocol-v3"));
var bolt_protocol_v4x0_1 = __importDefault(require("./bolt-protocol-v4x0"));
var bolt_protocol_v4x1_1 = __importDefault(require("./bolt-protocol-v4x1"));
var bolt_protocol_v4x2_1 = __importDefault(require("./bolt-protocol-v4x2"));
var bolt_protocol_v4x3_1 = __importDefault(require("./bolt-protocol-v4x3"));
var response_handler_1 = __importDefault(require("./response-handler"));
/**
 * Creates a protocol with a given version
 *
 * @param {object} config
 * @param {number} config.version The version of the protocol
 * @param {channel} config.channel The channel
 * @param {Chunker} config.chunker The chunker
 * @param {Dechunker} config.dechunker The dechunker
 * @param {Logger} config.log The logger
 * @param {ResponseHandler~Observer} config.observer Observer
 * @param {boolean} config.disableLosslessIntegers Disable the lossless integers
 * @param {boolean} packstreamConfig.useBigInt if this connection should convert all received integers to native BigInt numbers.
 * @param {boolean} config.serversideRouting It's using server side routing
 */
function create(_a) {
    var _b = _a === void 0 ? {} : _a, version = _b.version, chunker = _b.chunker, dechunker = _b.dechunker, channel = _b.channel, disableLosslessIntegers = _b.disableLosslessIntegers, useBigInt = _b.useBigInt, serversideRouting = _b.serversideRouting, server = _b.server, // server info
    log = _b.log, observer = _b.observer;
    var createResponseHandler = function (protocol) {
        var responseHandler = new response_handler_1.default({
            transformMetadata: protocol.transformMetadata.bind(protocol),
            log: log,
            observer: observer
        });
        // reset the error handler to just handle errors and forget about the handshake promise
        channel.onerror = observer.onError.bind(observer);
        // Ok, protocol running. Simply forward all messages to the dechunker
        channel.onmessage = function (buf) { return dechunker.write(buf); };
        // setup dechunker to dechunk messages and forward them to the message handler
        dechunker.onmessage = function (buf) {
            responseHandler.handleResponse(protocol.unpacker().unpack(buf));
        };
        return responseHandler;
    };
    return createProtocol(version, server, chunker, { disableLosslessIntegers: disableLosslessIntegers, useBigInt: useBigInt }, serversideRouting, createResponseHandler, observer.onProtocolError.bind(observer), log);
}
exports.default = create;
function createProtocol(version, server, chunker, packingConfig, serversideRouting, createResponseHandler, onProtocolError, log) {
    switch (version) {
        case 1:
            return new bolt_protocol_v1_1.default(server, chunker, packingConfig, createResponseHandler, log, onProtocolError);
        case 2:
            return new bolt_protocol_v2_1.default(server, chunker, packingConfig, createResponseHandler, log, onProtocolError);
        case 3:
            return new bolt_protocol_v3_1.default(server, chunker, packingConfig, createResponseHandler, log, onProtocolError);
        case 4.0:
            return new bolt_protocol_v4x0_1.default(server, chunker, packingConfig, createResponseHandler, log, onProtocolError);
        case 4.1:
            return new bolt_protocol_v4x1_1.default(server, chunker, packingConfig, createResponseHandler, log, onProtocolError, serversideRouting);
        case 4.2:
            return new bolt_protocol_v4x2_1.default(server, chunker, packingConfig, createResponseHandler, log, onProtocolError, serversideRouting);
        case 4.3:
            return new bolt_protocol_v4x3_1.default(server, chunker, packingConfig, createResponseHandler, log, onProtocolError, serversideRouting);
        default:
            throw neo4j_driver_core_1.newError('Unknown Bolt protocol version: ' + version);
    }
}

},{"./bolt-protocol-v1":2,"./bolt-protocol-v2":3,"./bolt-protocol-v3":4,"./bolt-protocol-v4x0":5,"./bolt-protocol-v4x1":6,"./bolt-protocol-v4x2":7,"./bolt-protocol-v4x3":8,"./response-handler":13,"neo4j-driver-core":58}],10:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var channel_1 = require("../channel");
var neo4j_driver_core_1 = require("neo4j-driver-core");
var BOLT_MAGIC_PREAMBLE = 0x6060b017;
function version(major, minor) {
    return {
        major: major,
        minor: minor
    };
}
function createHandshakeMessage(versions) {
    if (versions.length > 4) {
        throw neo4j_driver_core_1.newError('It should not have more than 4 versions of the protocol');
    }
    var handshakeBuffer = channel_1.alloc(5 * 4);
    handshakeBuffer.writeInt32(BOLT_MAGIC_PREAMBLE);
    versions.forEach(function (version) {
        if (version instanceof Array) {
            var _a = version[0], major = _a.major, minor = _a.minor;
            var minMinor = version[1].minor;
            var range = minor - minMinor;
            handshakeBuffer.writeInt32((range << 16) | (minor << 8) | major);
        }
        else {
            var major = version.major, minor = version.minor;
            handshakeBuffer.writeInt32((minor << 8) | major);
        }
    });
    handshakeBuffer.reset();
    return handshakeBuffer;
}
function parseNegotiatedResponse(buffer) {
    var h = [
        buffer.readUInt8(),
        buffer.readUInt8(),
        buffer.readUInt8(),
        buffer.readUInt8()
    ];
    if (h[0] === 0x48 && h[1] === 0x54 && h[2] === 0x54 && h[3] === 0x50) {
        throw neo4j_driver_core_1.newError('Server responded HTTP. Make sure you are not trying to connect to the http endpoint ' +
            '(HTTP defaults to port 7474 whereas BOLT defaults to port 7687)');
    }
    return Number(h[3] + '.' + h[2]);
}
/**
 * @return {BaseBuffer}
 * @private
 */
function newHandshakeBuffer() {
    return createHandshakeMessage([
        [version(4, 3), version(4, 2)],
        version(4, 1),
        version(4, 0),
        version(3, 0)
    ]);
}
/**
 * This callback is displayed as a global member.
 * @callback BufferConsumerCallback
 * @param {buffer} buffer the remaining buffer
 */
/**
 * @typedef HandshakeResult
 * @property {number} protocolVersion The protocol version negotiated in the handshake
 * @property {function(BufferConsumerCallback)} consumeRemainingBuffer A function to consume the remaining buffer if it exists
 */
/**
 * Shake hands using the channel and return the protocol version
 *
 * @param {Channel} channel the channel use to shake hands
 * @returns {Promise<HandshakeResult>} Promise of protocol version and consumeRemainingBuffer
 */
function handshake(channel) {
    var _this = this;
    return new Promise(function (resolve, reject) {
        var handshakeErrorHandler = function (error) {
            reject(error);
        };
        channel.onerror = handshakeErrorHandler.bind(_this);
        if (channel._error) {
            handshakeErrorHandler(channel._error);
        }
        channel.onmessage = function (buffer) {
            try {
                // read the response buffer and initialize the protocol
                var protocolVersion = parseNegotiatedResponse(buffer);
                resolve({
                    protocolVersion: protocolVersion,
                    consumeRemainingBuffer: function (consumer) {
                        if (buffer.hasRemaining()) {
                            consumer(buffer.readSlice(buffer.remaining()));
                        }
                    }
                });
            }
            catch (e) {
                reject(e);
            }
        };
        channel.write(newHandshakeBuffer());
    });
}
exports.default = handshake;

},{"../channel":26,"neo4j-driver-core":58}],11:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawRoutingTable = exports.BoltProtocol = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var handshake_1 = __importDefault(require("./handshake"));
var create_1 = __importDefault(require("./create"));
var bolt_protocol_v4x3_1 = __importDefault(require("./bolt-protocol-v4x3"));
var routing_table_raw_1 = __importDefault(require("./routing-table-raw"));
__exportStar(require("./stream-observers"), exports);
exports.BoltProtocol = bolt_protocol_v4x3_1.default;
exports.RawRoutingTable = routing_table_raw_1.default;
exports.default = {
    handshake: handshake_1.default,
    create: create_1.default
};

},{"./bolt-protocol-v4x3":8,"./create":9,"./handshake":10,"./routing-table-raw":14,"./stream-observers":15}],12:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var neo4j_driver_core_1 = require("neo4j-driver-core");
var _a = neo4j_driver_core_1.internal.constants, ACCESS_MODE_READ = _a.ACCESS_MODE_READ, FETCH_ALL = _a.FETCH_ALL, assertString = neo4j_driver_core_1.internal.util.assertString;
/* eslint-disable no-unused-vars */
// Signature bytes for each request message type
var INIT = 0x01; // 0000 0001 // INIT <user_agent> <authentication_token>
var ACK_FAILURE = 0x0e; // 0000 1110 // ACK_FAILURE - unused
var RESET = 0x0f; // 0000 1111 // RESET
var RUN = 0x10; // 0001 0000 // RUN <query> <parameters>
var DISCARD_ALL = 0x2f; // 0010 1111 // DISCARD_ALL - unused
var PULL_ALL = 0x3f; // 0011 1111 // PULL_ALL
var HELLO = 0x01; // 0000 0001 // HELLO <metadata>
var GOODBYE = 0x02; // 0000 0010 // GOODBYE
var BEGIN = 0x11; // 0001 0001 // BEGIN <metadata>
var COMMIT = 0x12; // 0001 0010 // COMMIT
var ROLLBACK = 0x13; // 0001 0011 // ROLLBACK
var ROUTE = 0x66; // 0110 0110 // ROUTE
var DISCARD = 0x2f; // 0010 1111 // DISCARD
var PULL = 0x3f; // 0011 1111 // PULL
var READ_MODE = 'r';
/* eslint-enable no-unused-vars */
var NO_STATEMENT_ID = -1;
var RequestMessage = /** @class */ (function () {
    function RequestMessage(signature, fields, toString) {
        this.signature = signature;
        this.fields = fields;
        this.toString = toString;
    }
    /**
     * Create a new INIT message.
     * @param {string} clientName the client name.
     * @param {Object} authToken the authentication token.
     * @return {RequestMessage} new INIT message.
     */
    RequestMessage.init = function (clientName, authToken) {
        return new RequestMessage(INIT, [clientName, authToken], function () { return "INIT " + clientName + " {...}"; });
    };
    /**
     * Create a new RUN message.
     * @param {string} query the cypher query.
     * @param {Object} parameters the query parameters.
     * @return {RequestMessage} new RUN message.
     */
    RequestMessage.run = function (query, parameters) {
        return new RequestMessage(RUN, [query, parameters], function () { return "RUN " + query + " " + neo4j_driver_core_1.json.stringify(parameters); });
    };
    /**
     * Get a PULL_ALL message.
     * @return {RequestMessage} the PULL_ALL message.
     */
    RequestMessage.pullAll = function () {
        return PULL_ALL_MESSAGE;
    };
    /**
     * Get a RESET message.
     * @return {RequestMessage} the RESET message.
     */
    RequestMessage.reset = function () {
        return RESET_MESSAGE;
    };
    /**
     * Create a new HELLO message.
     * @param {string} userAgent the user agent.
     * @param {Object} authToken the authentication token.
     * @param {Object} optional server side routing, set to routing context to turn on server side routing (> 4.1)
     * @return {RequestMessage} new HELLO message.
     */
    RequestMessage.hello = function (userAgent, authToken, routing) {
        if (routing === void 0) { routing = null; }
        var metadata = Object.assign({ user_agent: userAgent }, authToken);
        if (routing) {
            metadata.routing = routing;
        }
        return new RequestMessage(HELLO, [metadata], function () { return "HELLO {user_agent: '" + userAgent + "', ...}"; });
    };
    /**
     * Create a new BEGIN message.
     * @param {Bookmark} bookmark the bookmark.
     * @param {TxConfig} txConfig the configuration.
     * @param {string} database the database name.
     * @param {string} mode the access mode.
     * @return {RequestMessage} new BEGIN message.
     */
    RequestMessage.begin = function (_a) {
        var _b = _a === void 0 ? {} : _a, bookmark = _b.bookmark, txConfig = _b.txConfig, database = _b.database, mode = _b.mode;
        var metadata = buildTxMetadata(bookmark, txConfig, database, mode);
        return new RequestMessage(BEGIN, [metadata], function () { return "BEGIN " + neo4j_driver_core_1.json.stringify(metadata); });
    };
    /**
     * Get a COMMIT message.
     * @return {RequestMessage} the COMMIT message.
     */
    RequestMessage.commit = function () {
        return COMMIT_MESSAGE;
    };
    /**
     * Get a ROLLBACK message.
     * @return {RequestMessage} the ROLLBACK message.
     */
    RequestMessage.rollback = function () {
        return ROLLBACK_MESSAGE;
    };
    /**
     * Create a new RUN message with additional metadata.
     * @param {string} query the cypher query.
     * @param {Object} parameters the query parameters.
     * @param {Bookmark} bookmark the bookmark.
     * @param {TxConfig} txConfig the configuration.
     * @param {string} database the database name.
     * @param {string} mode the access mode.
     * @return {RequestMessage} new RUN message with additional metadata.
     */
    RequestMessage.runWithMetadata = function (query, parameters, _a) {
        var _b = _a === void 0 ? {} : _a, bookmark = _b.bookmark, txConfig = _b.txConfig, database = _b.database, mode = _b.mode;
        var metadata = buildTxMetadata(bookmark, txConfig, database, mode);
        return new RequestMessage(RUN, [query, parameters, metadata], function () {
            return "RUN " + query + " " + neo4j_driver_core_1.json.stringify(parameters) + " " + neo4j_driver_core_1.json.stringify(metadata);
        });
    };
    /**
     * Get a GOODBYE message.
     * @return {RequestMessage} the GOODBYE message.
     */
    RequestMessage.goodbye = function () {
        return GOODBYE_MESSAGE;
    };
    /**
     * Generates a new PULL message with additional metadata.
     * @param {Integer|number} stmtId
     * @param {Integer|number} n
     * @return {RequestMessage} the PULL message.
     */
    RequestMessage.pull = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.stmtId, stmtId = _c === void 0 ? NO_STATEMENT_ID : _c, _d = _b.n, n = _d === void 0 ? FETCH_ALL : _d;
        var metadata = buildStreamMetadata(stmtId === null || stmtId === undefined ? NO_STATEMENT_ID : stmtId, n || FETCH_ALL);
        return new RequestMessage(PULL, [metadata], function () { return "PULL " + neo4j_driver_core_1.json.stringify(metadata); });
    };
    /**
     * Generates a new DISCARD message with additional metadata.
     * @param {Integer|number} stmtId
     * @param {Integer|number} n
     * @return {RequestMessage} the PULL message.
     */
    RequestMessage.discard = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.stmtId, stmtId = _c === void 0 ? NO_STATEMENT_ID : _c, _d = _b.n, n = _d === void 0 ? FETCH_ALL : _d;
        var metadata = buildStreamMetadata(stmtId === null || stmtId === undefined ? NO_STATEMENT_ID : stmtId, n || FETCH_ALL);
        return new RequestMessage(DISCARD, [metadata], function () { return "DISCARD " + neo4j_driver_core_1.json.stringify(metadata); });
    };
    /**
     * Generate the ROUTE message, this message is used to fetch the routing table from the server
     *
     * @param {object} routingContext The routing context used to define the routing table. Multi-datacenter deployments is one of its use cases
     * @param {string[]} bookmarks The list of the bookmark should be used
     * @param {string} databaseName The name of the database to get the routing table for.
     * @return {RequestMessage} the ROUTE message.
     */
    RequestMessage.route = function (routingContext, bookmarks, databaseName) {
        if (routingContext === void 0) { routingContext = {}; }
        if (bookmarks === void 0) { bookmarks = []; }
        if (databaseName === void 0) { databaseName = null; }
        return new RequestMessage(ROUTE, [routingContext, bookmarks, databaseName], function () {
            return "ROUTE " + neo4j_driver_core_1.json.stringify(routingContext) + " " + neo4j_driver_core_1.json.stringify(bookmarks) + " " + databaseName;
        });
    };
    return RequestMessage;
}());
exports.default = RequestMessage;
/**
 * Create an object that represent transaction metadata.
 * @param {Bookmark} bookmark the bookmark.
 * @param {TxConfig} txConfig the configuration.
 * @param {string} database the database name.
 * @param {string} mode the access mode.
 * @return {Object} a metadata object.
 */
function buildTxMetadata(bookmark, txConfig, database, mode) {
    var metadata = {};
    if (!bookmark.isEmpty()) {
        metadata.bookmarks = bookmark.values();
    }
    if (txConfig.timeout) {
        metadata.tx_timeout = txConfig.timeout;
    }
    if (txConfig.metadata) {
        metadata.tx_metadata = txConfig.metadata;
    }
    if (database) {
        metadata.db = assertString(database, 'database');
    }
    if (mode === ACCESS_MODE_READ) {
        metadata.mode = READ_MODE;
    }
    return metadata;
}
/**
 * Create an object that represents streaming metadata.
 * @param {Integer|number} stmtId The query id to stream its results.
 * @param {Integer|number} n The number of records to stream.
 * @returns {Object} a metadata object.
 */
function buildStreamMetadata(stmtId, n) {
    var metadata = { n: neo4j_driver_core_1.int(n) };
    if (stmtId !== NO_STATEMENT_ID) {
        metadata.qid = neo4j_driver_core_1.int(stmtId);
    }
    return metadata;
}
// constants for messages that never change
var PULL_ALL_MESSAGE = new RequestMessage(PULL_ALL, [], function () { return 'PULL_ALL'; });
var RESET_MESSAGE = new RequestMessage(RESET, [], function () { return 'RESET'; });
var COMMIT_MESSAGE = new RequestMessage(COMMIT, [], function () { return 'COMMIT'; });
var ROLLBACK_MESSAGE = new RequestMessage(ROLLBACK, [], function () { return 'ROLLBACK'; });
var GOODBYE_MESSAGE = new RequestMessage(GOODBYE, [], function () { return 'GOODBYE'; });

},{"neo4j-driver-core":58}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var neo4j_driver_core_1 = require("neo4j-driver-core");
// Signature bytes for each response message type
var SUCCESS = 0x70; // 0111 0000 // SUCCESS <metadata>
var RECORD = 0x71; // 0111 0001 // RECORD <value>
var IGNORED = 0x7e; // 0111 1110 // IGNORED <metadata>
var FAILURE = 0x7f; // 0111 1111 // FAILURE <metadata>
function NO_OP() { }
function NO_OP_IDENTITY(subject) {
    return subject;
}
var NO_OP_OBSERVER = {
    onNext: NO_OP,
    onCompleted: NO_OP,
    onError: NO_OP
};
/**
 * Treat the protocol responses and notify the observers
 */
var ResponseHandler = /** @class */ (function () {
    /**
     * Called when something went wrong with the connectio
     * @callback ResponseHandler~Observer~OnErrorApplyTransformation
     * @param {any} error The error
     * @returns {any} The new error
     */
    /**
     * Called when something went wrong with the connectio
     * @callback ResponseHandler~Observer~OnError
     * @param {any} error The error
     */
    /**
     * Called when something went wrong with the connectio
     * @callback ResponseHandler~MetadataTransformer
     * @param {any} metadata The metadata got onSuccess
     * @returns {any} The transformed metadata
     */
    /**
     * @typedef {Object} ResponseHandler~Observer
     * @property {ResponseHandler~Observer~OnError} onError Invoke when a connection error occurs
     * @property {ResponseHandler~Observer~OnError} onFailure Invoke when a protocol failure occurs
     * @property {ResponseHandler~Observer~OnErrorApplyTransformation} onErrorApplyTransformation Invoke just after the failure occurs,
     *  before notify to respective observer. This method should transform the failure reason to the approprited one.
     */
    /**
     * Constructor
     * @param {Object} param The params
     * @param {ResponseHandler~MetadataTransformer} transformMetadata Transform metadata when the SUCCESS is received.
     * @param {Channel} channel The channel used to exchange messages
     * @param {Logger} log The logger
     * @param {ResponseHandler~Observer} observer Object which will be notified about errors
     */
    function ResponseHandler(_a) {
        var _b = _a === void 0 ? {} : _a, transformMetadata = _b.transformMetadata, log = _b.log, observer = _b.observer;
        this._pendingObservers = [];
        this._log = log;
        this._transformMetadata = transformMetadata || NO_OP_IDENTITY;
        this._observer = Object.assign({
            onError: NO_OP,
            onFailure: NO_OP,
            onErrorApplyTransformation: NO_OP_IDENTITY
        }, observer);
    }
    ResponseHandler.prototype.handleResponse = function (msg) {
        var payload = msg.fields[0];
        switch (msg.signature) {
            case RECORD:
                if (this._log.isDebugEnabled()) {
                    this._log.debug("S: RECORD " + neo4j_driver_core_1.json.stringify(msg));
                }
                this._currentObserver.onNext(payload);
                break;
            case SUCCESS:
                if (this._log.isDebugEnabled()) {
                    this._log.debug("S: SUCCESS " + neo4j_driver_core_1.json.stringify(msg));
                }
                try {
                    var metadata = this._transformMetadata(payload);
                    this._currentObserver.onCompleted(metadata);
                }
                finally {
                    this._updateCurrentObserver();
                }
                break;
            case FAILURE:
                if (this._log.isDebugEnabled()) {
                    this._log.debug("S: FAILURE " + neo4j_driver_core_1.json.stringify(msg));
                }
                try {
                    var error = neo4j_driver_core_1.newError(payload.message, payload.code);
                    this._currentFailure = this._observer.onErrorApplyTransformation(error);
                    this._currentObserver.onError(this._currentFailure);
                }
                finally {
                    this._updateCurrentObserver();
                    // Things are now broken. Pending observers will get FAILURE messages routed until we are done handling this failure.
                    this._observer.onFailure(this._currentFailure);
                }
                break;
            case IGNORED:
                if (this._log.isDebugEnabled()) {
                    this._log.debug("S: IGNORED " + neo4j_driver_core_1.json.stringify(msg));
                }
                try {
                    if (this._currentFailure && this._currentObserver.onError) {
                        this._currentObserver.onError(this._currentFailure);
                    }
                    else if (this._currentObserver.onError) {
                        this._currentObserver.onError(neo4j_driver_core_1.newError('Ignored either because of an error or RESET'));
                    }
                }
                finally {
                    this._updateCurrentObserver();
                }
                break;
            default:
                this._observer.onError(neo4j_driver_core_1.newError('Unknown Bolt protocol message: ' + msg));
        }
    };
    /*
     * Pop next pending observer form the list of observers and make it current observer.
     * @protected
     */
    ResponseHandler.prototype._updateCurrentObserver = function () {
        this._currentObserver = this._pendingObservers.shift();
    };
    ResponseHandler.prototype._queueObserver = function (observer) {
        observer = observer || NO_OP_OBSERVER;
        observer.onCompleted = observer.onCompleted || NO_OP;
        observer.onError = observer.onError || NO_OP;
        observer.onNext = observer.onNext || NO_OP;
        if (this._currentObserver === undefined) {
            this._currentObserver = observer;
        }
        else {
            this._pendingObservers.push(observer);
        }
        return true;
    };
    ResponseHandler.prototype._notifyErrorToObservers = function (error) {
        if (this._currentObserver && this._currentObserver.onError) {
            this._currentObserver.onError(error);
        }
        while (this._pendingObservers.length > 0) {
            var observer = this._pendingObservers.shift();
            if (observer && observer.onError) {
                observer.onError(error);
            }
        }
    };
    ResponseHandler.prototype.hasOngoingObservableRequests = function () {
        return this._currentObserver != null || this._pendingObservers.length > 0;
    };
    ResponseHandler.prototype._resetFailure = function () {
        this._currentFailure = null;
    };
    return ResponseHandler;
}());
exports.default = ResponseHandler;

},{"neo4j-driver-core":58}],14:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Represente the raw version of the routing table
 */
var RawRoutingTable = /** @class */ (function () {
    function RawRoutingTable() {
    }
    /**
     * Constructs the raw routing table for Record based result
     * @param {Record} record The record which will be used get the raw routing table
     * @returns {RawRoutingTable} The raw routing table
     */
    RawRoutingTable.ofRecord = function (record) {
        if (record === null) {
            return RawRoutingTable.ofNull();
        }
        return new RecordRawRoutingTable(record);
    };
    /**
     * Constructs the raw routing table for Success result for a Routing Message
     * @param {object} response The result
     * @returns {RawRoutingTable} The raw routing table
     */
    RawRoutingTable.ofMessageResponse = function (response) {
        if (response === null) {
            return RawRoutingTable.ofNull();
        }
        return new ResponseRawRoutingTable(response);
    };
    /**
     * Construct the raw routing table of a null response
     *
     * @returns {RawRoutingTable} the raw routing table
     */
    RawRoutingTable.ofNull = function () {
        return new NullRawRoutingTable();
    };
    Object.defineProperty(RawRoutingTable.prototype, "ttl", {
        /**
         * Get raw ttl
         *
         * @returns {number|string} ttl Time to live
         */
        get: function () {
            throw new Error('Not implemented');
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RawRoutingTable.prototype, "servers", {
        /**
         *
         * @typedef {Object} ServerRole
         * @property {string} role the role of the address on the cluster
         * @property {string[]} addresses the address within the role
         *
         * @return {ServerRole[]} list of servers addresses
         */
        get: function () {
            throw new Error('Not implemented');
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RawRoutingTable.prototype, "isNull", {
        /**
         * Indicates the result is null
         *
         * @returns {boolean} Is null
         */
        get: function () {
            throw new Error('Not implemented');
        },
        enumerable: false,
        configurable: true
    });
    return RawRoutingTable;
}());
exports.default = RawRoutingTable;
/**
 * Get the raw routing table information from route message response
 */
var ResponseRawRoutingTable = /** @class */ (function (_super) {
    __extends(ResponseRawRoutingTable, _super);
    function ResponseRawRoutingTable(response) {
        var _this = _super.call(this) || this;
        _this._response = response;
        return _this;
    }
    Object.defineProperty(ResponseRawRoutingTable.prototype, "ttl", {
        get: function () {
            return this._response.rt.ttl;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ResponseRawRoutingTable.prototype, "servers", {
        get: function () {
            return this._response.rt.servers;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ResponseRawRoutingTable.prototype, "isNull", {
        get: function () {
            return this._response === null;
        },
        enumerable: false,
        configurable: true
    });
    return ResponseRawRoutingTable;
}(RawRoutingTable));
/**
 * Null routing table
 */
var NullRawRoutingTable = /** @class */ (function (_super) {
    __extends(NullRawRoutingTable, _super);
    function NullRawRoutingTable() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(NullRawRoutingTable.prototype, "isNull", {
        get: function () {
            return true;
        },
        enumerable: false,
        configurable: true
    });
    return NullRawRoutingTable;
}(RawRoutingTable));
/**
 * Get the raw routing table information from the record
 */
var RecordRawRoutingTable = /** @class */ (function (_super) {
    __extends(RecordRawRoutingTable, _super);
    function RecordRawRoutingTable(record) {
        var _this = _super.call(this) || this;
        _this._record = record;
        return _this;
    }
    Object.defineProperty(RecordRawRoutingTable.prototype, "ttl", {
        get: function () {
            return this._record.get('ttl');
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RecordRawRoutingTable.prototype, "servers", {
        get: function () {
            return this._record.get('servers');
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RecordRawRoutingTable.prototype, "isNull", {
        get: function () {
            return this._record === null;
        },
        enumerable: false,
        configurable: true
    });
    return RecordRawRoutingTable;
}(RawRoutingTable));

},{}],15:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcedureRouteObserver = exports.RouteObserver = exports.CompletedObserver = exports.FailedObserver = exports.ResetObserver = exports.LoginObserver = exports.ResultStreamObserver = exports.StreamObserver = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var neo4j_driver_core_1 = require("neo4j-driver-core");
var request_message_1 = require("./request-message");
var routing_table_raw_1 = __importDefault(require("./routing-table-raw"));
var PROTOCOL_ERROR = neo4j_driver_core_1.error.PROTOCOL_ERROR;
var StreamObserver = /** @class */ (function () {
    function StreamObserver() {
    }
    StreamObserver.prototype.onNext = function (rawRecord) { };
    StreamObserver.prototype.onError = function (error) { };
    StreamObserver.prototype.onCompleted = function (meta) { };
    return StreamObserver;
}());
exports.StreamObserver = StreamObserver;
/**
 * Handles a RUN/PULL_ALL, or RUN/DISCARD_ALL requests, maps the responses
 * in a way that a user-provided observer can see these as a clean Stream
 * of records.
 * This class will queue up incoming messages until a user-provided observer
 * for the incoming stream is registered. Thus, we keep fields around
 * for tracking head/records/tail. These are only used if there is no
 * observer registered.
 * @access private
 */
var ResultStreamObserver = /** @class */ (function (_super) {
    __extends(ResultStreamObserver, _super);
    /**
     *
     * @param {Object} param
     * @param {Object} param.server
     * @param {boolean} param.reactive
     * @param {function(stmtId: number|Integer, n: number|Integer, observer: StreamObserver)} param.moreFunction -
     * @param {function(stmtId: number|Integer, observer: StreamObserver)} param.discardFunction -
     * @param {number|Integer} param.fetchSize -
     * @param {function(err: Error): Promise|void} param.beforeError -
     * @param {function(err: Error): Promise|void} param.afterError -
     * @param {function(keys: string[]): Promise|void} param.beforeKeys -
     * @param {function(keys: string[]): Promise|void} param.afterKeys -
     * @param {function(metadata: Object): Promise|void} param.beforeComplete -
     * @param {function(metadata: Object): Promise|void} param.afterComplete -
     */
    function ResultStreamObserver(_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.reactive, reactive = _c === void 0 ? false : _c, moreFunction = _b.moreFunction, discardFunction = _b.discardFunction, _d = _b.fetchSize, fetchSize = _d === void 0 ? request_message_1.ALL : _d, beforeError = _b.beforeError, afterError = _b.afterError, beforeKeys = _b.beforeKeys, afterKeys = _b.afterKeys, beforeComplete = _b.beforeComplete, afterComplete = _b.afterComplete, server = _b.server;
        var _this = _super.call(this) || this;
        _this._fieldKeys = null;
        _this._fieldLookup = null;
        _this._head = null;
        _this._queuedRecords = [];
        _this._tail = null;
        _this._error = null;
        _this._observers = [];
        _this._meta = {};
        _this._server = server;
        _this._beforeError = beforeError;
        _this._afterError = afterError;
        _this._beforeKeys = beforeKeys;
        _this._afterKeys = afterKeys;
        _this._beforeComplete = beforeComplete;
        _this._afterComplete = afterComplete;
        _this._queryId = null;
        _this._moreFunction = moreFunction;
        _this._discardFunction = discardFunction;
        _this._discard = false;
        _this._fetchSize = fetchSize;
        _this._setState(reactive ? _states.READY : _states.READY_STREAMING);
        _this._setupAuoPull(fetchSize);
        return _this;
    }
    /**
     * Will be called on every record that comes in and transform a raw record
     * to a Object. If user-provided observer is present, pass transformed record
     * to it's onNext method, otherwise, push to record que.
     * @param {Array} rawRecord - An array with the raw record
     */
    ResultStreamObserver.prototype.onNext = function (rawRecord) {
        var record = new neo4j_driver_core_1.Record(this._fieldKeys, rawRecord, this._fieldLookup);
        if (this._observers.some(function (o) { return o.onNext; })) {
            this._observers.forEach(function (o) {
                if (o.onNext) {
                    o.onNext(record);
                }
            });
        }
        else {
            this._queuedRecords.push(record);
            if (this._queuedRecords.length > this._highRecordWatermark) {
                this._autoPull = false;
            }
        }
    };
    ResultStreamObserver.prototype.onCompleted = function (meta) {
        this._state.onSuccess(this, meta);
    };
    /**
     * Will be called on errors.
     * If user-provided observer is present, pass the error
     * to it's onError method, otherwise set instance variable _error.
     * @param {Object} error - An error object
     */
    ResultStreamObserver.prototype.onError = function (error) {
        this._state.onError(this, error);
    };
    /**
     * Cancel pending record stream
     */
    ResultStreamObserver.prototype.cancel = function () {
        this._discard = true;
    };
    /**
     * Stream observer defaults to handling responses for two messages: RUN + PULL_ALL or RUN + DISCARD_ALL.
     * Response for RUN initializes query keys. Response for PULL_ALL / DISCARD_ALL exposes the result stream.
     *
     * However, some operations can be represented as a single message which receives full metadata in a single response.
     * For example, operations to begin, commit and rollback an explicit transaction use two messages in Bolt V1 but a single message in Bolt V3.
     * Messages are `RUN "BEGIN" {}` + `PULL_ALL` in Bolt V1 and `BEGIN` in Bolt V3.
     *
     * This function prepares the observer to only handle a single response message.
     */
    ResultStreamObserver.prototype.prepareToHandleSingleResponse = function () {
        this._head = [];
        this._fieldKeys = [];
        this._setState(_states.STREAMING);
    };
    /**
     * Mark this observer as if it has completed with no metadata.
     */
    ResultStreamObserver.prototype.markCompleted = function () {
        this._head = [];
        this._fieldKeys = [];
        this._tail = {};
        this._setState(_states.SUCCEEDED);
    };
    /**
     * Subscribe to events with provided observer.
     * @param {Object} observer - Observer object
     * @param {function(keys: String[])} observer.onKeys - Handle stream header, field keys.
     * @param {function(record: Object)} observer.onNext - Handle records, one by one.
     * @param {function(metadata: Object)} observer.onCompleted - Handle stream tail, the metadata.
     * @param {function(error: Object)} observer.onError - Handle errors, should always be provided.
     */
    ResultStreamObserver.prototype.subscribe = function (observer) {
        if (this._error) {
            observer.onError(this._error);
            return;
        }
        if (this._head && observer.onKeys) {
            observer.onKeys(this._head);
        }
        if (this._queuedRecords.length > 0 && observer.onNext) {
            for (var i = 0; i < this._queuedRecords.length; i++) {
                observer.onNext(this._queuedRecords[i]);
                if (this._queuedRecords.length - i - 1 <= this._lowRecordWatermark) {
                    this._autoPull = true;
                    if (this._state === _states.READY) {
                        this._handleStreaming();
                    }
                }
            }
        }
        if (this._tail && observer.onCompleted) {
            observer.onCompleted(this._tail);
        }
        this._observers.push(observer);
        if (this._state === _states.READY) {
            this._handleStreaming();
        }
    };
    ResultStreamObserver.prototype._handleHasMore = function (meta) {
        // We've consumed current batch and server notified us that there're more
        // records to stream. Let's invoke more or discard function based on whether
        // the user wants to discard streaming or not
        this._setState(_states.READY); // we've done streaming
        this._handleStreaming();
        delete meta.has_more;
    };
    ResultStreamObserver.prototype._handlePullSuccess = function (meta) {
        var _this = this;
        this._setState(_states.SUCCEEDED);
        var completionMetadata = Object.assign(this._server ? { server: this._server } : {}, this._meta, meta);
        var beforeHandlerResult = null;
        if (this._beforeComplete) {
            beforeHandlerResult = this._beforeComplete(completionMetadata);
        }
        var continuation = function () {
            // End of stream
            _this._tail = completionMetadata;
            if (_this._observers.some(function (o) { return o.onCompleted; })) {
                _this._observers.forEach(function (o) {
                    if (o.onCompleted) {
                        o.onCompleted(completionMetadata);
                    }
                });
            }
            if (_this._afterComplete) {
                _this._afterComplete(completionMetadata);
            }
        };
        if (beforeHandlerResult) {
            Promise.resolve(beforeHandlerResult).then(function () { return continuation(); });
        }
        else {
            continuation();
        }
    };
    ResultStreamObserver.prototype._handleRunSuccess = function (meta, afterSuccess) {
        var _this = this;
        if (this._fieldKeys === null) {
            // Stream header, build a name->index field lookup table
            // to be used by records. This is an optimization to make it
            // faster to look up fields in a record by name, rather than by index.
            // Since the records we get back via Bolt are just arrays of values.
            this._fieldKeys = [];
            this._fieldLookup = {};
            if (meta.fields && meta.fields.length > 0) {
                this._fieldKeys = meta.fields;
                for (var i = 0; i < meta.fields.length; i++) {
                    this._fieldLookup[meta.fields[i]] = i;
                }
                // remove fields key from metadata object
                delete meta.fields;
            }
            // Extract server generated query id for use in requestMore and discard
            // functions
            if (meta.qid !== null && meta.qid !== undefined) {
                this._queryId = meta.qid;
                // remove qid from metadata object
                delete meta.qid;
            }
            this._storeMetadataForCompletion(meta);
            var beforeHandlerResult = null;
            if (this._beforeKeys) {
                beforeHandlerResult = this._beforeKeys(this._fieldKeys);
            }
            var continuation_1 = function () {
                _this._head = _this._fieldKeys;
                if (_this._observers.some(function (o) { return o.onKeys; })) {
                    _this._observers.forEach(function (o) {
                        if (o.onKeys) {
                            o.onKeys(_this._fieldKeys);
                        }
                    });
                }
                if (_this._afterKeys) {
                    _this._afterKeys(_this._fieldKeys);
                }
                afterSuccess();
            };
            if (beforeHandlerResult) {
                Promise.resolve(beforeHandlerResult).then(function () { return continuation_1(); });
            }
            else {
                continuation_1();
            }
        }
    };
    ResultStreamObserver.prototype._handleError = function (error) {
        var _this = this;
        this._setState(_states.FAILED);
        this._error = error;
        var beforeHandlerResult = null;
        if (this._beforeError) {
            beforeHandlerResult = this._beforeError(error);
        }
        var continuation = function () {
            if (_this._observers.some(function (o) { return o.onError; })) {
                _this._observers.forEach(function (o) {
                    if (o.onError) {
                        o.onError(error);
                    }
                });
            }
            if (_this._afterError) {
                _this._afterError(error);
            }
        };
        if (beforeHandlerResult) {
            Promise.resolve(beforeHandlerResult).then(function () { return continuation(); });
        }
        else {
            continuation();
        }
    };
    ResultStreamObserver.prototype._handleStreaming = function () {
        if (this._head && this._observers.some(function (o) { return o.onNext || o.onCompleted; })) {
            if (this._discard) {
                this._discardFunction(this._queryId, this);
                this._setState(_states.STREAMING);
            }
            else if (this._autoPull) {
                this._moreFunction(this._queryId, this._fetchSize, this);
                this._setState(_states.STREAMING);
            }
        }
    };
    ResultStreamObserver.prototype._storeMetadataForCompletion = function (meta) {
        var keys = Object.keys(meta);
        var index = keys.length;
        var key = '';
        while (index--) {
            key = keys[index];
            this._meta[key] = meta[key];
        }
    };
    ResultStreamObserver.prototype._setState = function (state) {
        this._state = state;
    };
    ResultStreamObserver.prototype._setupAuoPull = function (fetchSize) {
        this._autoPull = true;
        if (fetchSize === request_message_1.ALL) {
            this._lowRecordWatermark = Number.MAX_VALUE; // we shall always lower than this number to enable auto pull
            this._highRecordWatermark = Number.MAX_VALUE; // we shall never reach this number to disable auto pull
        }
        else {
            this._lowRecordWatermark = 0.3 * fetchSize;
            this._highRecordWatermark = 0.7 * fetchSize;
        }
    };
    return ResultStreamObserver;
}(StreamObserver));
exports.ResultStreamObserver = ResultStreamObserver;
var LoginObserver = /** @class */ (function (_super) {
    __extends(LoginObserver, _super);
    /**
     *
     * @param {Object} param -
     * @param {function(err: Error)} param.onError
     * @param {function(metadata)} param.onCompleted
     */
    function LoginObserver(_a) {
        var _b = _a === void 0 ? {} : _a, onError = _b.onError, onCompleted = _b.onCompleted;
        var _this = _super.call(this) || this;
        _this._onError = onError;
        _this._onCompleted = onCompleted;
        return _this;
    }
    LoginObserver.prototype.onNext = function (record) {
        this.onError(neo4j_driver_core_1.newError('Received RECORD when initializing ' + neo4j_driver_core_1.json.stringify(record)));
    };
    LoginObserver.prototype.onError = function (error) {
        if (this._onError) {
            this._onError(error);
        }
    };
    LoginObserver.prototype.onCompleted = function (metadata) {
        if (this._onCompleted) {
            this._onCompleted(metadata);
        }
    };
    return LoginObserver;
}(StreamObserver));
exports.LoginObserver = LoginObserver;
var ResetObserver = /** @class */ (function (_super) {
    __extends(ResetObserver, _super);
    /**
     *
     * @param {Object} param -
     * @param {function(err: String)} param.onProtocolError
     * @param {function(err: Error)} param.onError
     * @param {function(metadata)} param.onComplete
     */
    function ResetObserver(_a) {
        var _b = _a === void 0 ? {} : _a, onProtocolError = _b.onProtocolError, onError = _b.onError, onComplete = _b.onComplete;
        var _this = _super.call(this) || this;
        _this._onProtocolError = onProtocolError;
        _this._onError = onError;
        _this._onComplete = onComplete;
        return _this;
    }
    ResetObserver.prototype.onNext = function (record) {
        this.onError(neo4j_driver_core_1.newError('Received RECORD when resetting: received record is: ' +
            neo4j_driver_core_1.json.stringify(record), PROTOCOL_ERROR));
    };
    ResetObserver.prototype.onError = function (error) {
        if (error.code === PROTOCOL_ERROR && this._onProtocolError) {
            this._onProtocolError(error.message);
        }
        if (this._onError) {
            this._onError(error);
        }
    };
    ResetObserver.prototype.onCompleted = function (metadata) {
        if (this._onComplete) {
            this._onComplete(metadata);
        }
    };
    return ResetObserver;
}(StreamObserver));
exports.ResetObserver = ResetObserver;
var FailedObserver = /** @class */ (function (_super) {
    __extends(FailedObserver, _super);
    function FailedObserver(_a) {
        var error = _a.error, onError = _a.onError;
        var _this = _super.call(this, { beforeError: onError }) || this;
        _this.onError(error);
        return _this;
    }
    return FailedObserver;
}(ResultStreamObserver));
exports.FailedObserver = FailedObserver;
var CompletedObserver = /** @class */ (function (_super) {
    __extends(CompletedObserver, _super);
    function CompletedObserver() {
        var _this = _super.call(this) || this;
        _super.prototype.markCompleted.call(_this);
        return _this;
    }
    return CompletedObserver;
}(ResultStreamObserver));
exports.CompletedObserver = CompletedObserver;
var ProcedureRouteObserver = /** @class */ (function (_super) {
    __extends(ProcedureRouteObserver, _super);
    function ProcedureRouteObserver(_a) {
        var resultObserver = _a.resultObserver, onProtocolError = _a.onProtocolError, onError = _a.onError, onCompleted = _a.onCompleted;
        var _this = _super.call(this) || this;
        _this._resultObserver = resultObserver;
        _this._onError = onError;
        _this._onCompleted = onCompleted;
        _this._records = [];
        _this._onProtocolError = onProtocolError;
        resultObserver.subscribe(_this);
        return _this;
    }
    ProcedureRouteObserver.prototype.onNext = function (record) {
        this._records.push(record);
    };
    ProcedureRouteObserver.prototype.onError = function (error) {
        if (error.code === PROTOCOL_ERROR && this._onProtocolError) {
            this._onProtocolError(error.message);
        }
        if (this._onError) {
            this._onError(error);
        }
    };
    ProcedureRouteObserver.prototype.onCompleted = function () {
        if (this._records !== null && this._records.length !== 1) {
            this.onError(neo4j_driver_core_1.newError('Illegal response from router. Received ' +
                this._records.length +
                ' records but expected only one.\n' +
                neo4j_driver_core_1.json.stringify(this._records), PROTOCOL_ERROR));
            return;
        }
        if (this._onCompleted) {
            this._onCompleted(routing_table_raw_1.default.ofRecord(this._records[0]));
        }
    };
    return ProcedureRouteObserver;
}(StreamObserver));
exports.ProcedureRouteObserver = ProcedureRouteObserver;
var RouteObserver = /** @class */ (function (_super) {
    __extends(RouteObserver, _super);
    /**
     *
     * @param {Object} param -
     * @param {function(err: String)} param.onProtocolError
     * @param {function(err: Error)} param.onError
     * @param {function(RawRoutingTable)} param.onCompleted
     */
    function RouteObserver(_a) {
        var _b = _a === void 0 ? {} : _a, onProtocolError = _b.onProtocolError, onError = _b.onError, onCompleted = _b.onCompleted;
        var _this = _super.call(this) || this;
        _this._onProtocolError = onProtocolError;
        _this._onError = onError;
        _this._onCompleted = onCompleted;
        return _this;
    }
    RouteObserver.prototype.onNext = function (record) {
        this.onError(neo4j_driver_core_1.newError('Received RECORD when resetting: received record is: ' +
            neo4j_driver_core_1.json.stringify(record), PROTOCOL_ERROR));
    };
    RouteObserver.prototype.onError = function (error) {
        if (error.code === PROTOCOL_ERROR && this._onProtocolError) {
            this._onProtocolError(error.message);
        }
        if (this._onError) {
            this._onError(error);
        }
    };
    RouteObserver.prototype.onCompleted = function (metadata) {
        if (this._onCompleted) {
            this._onCompleted(routing_table_raw_1.default.ofMessageResponse(metadata));
        }
    };
    return RouteObserver;
}(StreamObserver));
exports.RouteObserver = RouteObserver;
var _states = {
    READY_STREAMING: {
        // async start state
        onSuccess: function (streamObserver, meta) {
            streamObserver._handleRunSuccess(meta, function () {
                streamObserver._setState(_states.STREAMING);
            } // after run succeeded, async directly move to streaming
            // state
            );
        },
        onError: function (streamObserver, error) {
            streamObserver._handleError(error);
        },
        name: function () {
            return 'READY_STREAMING';
        }
    },
    READY: {
        // reactive start state
        onSuccess: function (streamObserver, meta) {
            streamObserver._handleRunSuccess(meta, function () { return streamObserver._handleStreaming(); } // after run succeeded received, reactive shall start pulling
            );
        },
        onError: function (streamObserver, error) {
            streamObserver._handleError(error);
        },
        name: function () {
            return 'READY';
        }
    },
    STREAMING: {
        onSuccess: function (streamObserver, meta) {
            if (meta.has_more) {
                streamObserver._handleHasMore(meta);
            }
            else {
                streamObserver._handlePullSuccess(meta);
            }
        },
        onError: function (streamObserver, error) {
            streamObserver._handleError(error);
        },
        name: function () {
            return 'STREAMING';
        }
    },
    FAILED: {
        onError: function (error) {
            // more errors are ignored
        },
        name: function () {
            return 'FAILED';
        }
    },
    SUCCEEDED: {
        name: function () {
            return 'SUCCEEDED';
        }
    }
};

},{"./request-message":12,"./routing-table-raw":14,"neo4j-driver-core":58}],16:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Common base with default implementation for most buffer methods.
 * Buffers are stateful - they track a current "position", this helps greatly
 * when reading and writing from them incrementally. You can also ignore the
 * stateful read/write methods.
 * readXXX and writeXXX-methods move the inner position of the buffer.
 * putXXX and getXXX-methods do not.
 * @access private
 */
var BaseBuffer = /** @class */ (function () {
    /**
     * Create a instance with the injected size.
     * @constructor
     * @param {Integer} size
     */
    function BaseBuffer(size) {
        this.position = 0;
        this.length = size;
    }
    BaseBuffer.prototype.getUInt8 = function (position) {
        throw new Error('Not implemented');
    };
    BaseBuffer.prototype.getInt8 = function (position) {
        throw new Error('Not implemented');
    };
    BaseBuffer.prototype.getFloat64 = function (position) {
        throw new Error('Not implemented');
    };
    BaseBuffer.prototype.putUInt8 = function (position, val) {
        throw new Error('Not implemented');
    };
    BaseBuffer.prototype.putInt8 = function (position, val) {
        throw new Error('Not implemented');
    };
    BaseBuffer.prototype.putFloat64 = function (position, val) {
        throw new Error('Not implemented');
    };
    /**
     * @param p
     */
    BaseBuffer.prototype.getInt16 = function (p) {
        return (this.getInt8(p) << 8) | this.getUInt8(p + 1);
    };
    /**
     * @param p
     */
    BaseBuffer.prototype.getUInt16 = function (p) {
        return (this.getUInt8(p) << 8) | this.getUInt8(p + 1);
    };
    /**
     * @param p
     */
    BaseBuffer.prototype.getInt32 = function (p) {
        return ((this.getInt8(p) << 24) |
            (this.getUInt8(p + 1) << 16) |
            (this.getUInt8(p + 2) << 8) |
            this.getUInt8(p + 3));
    };
    /**
     * @param p
     */
    BaseBuffer.prototype.getUInt32 = function (p) {
        return ((this.getUInt8(p) << 24) |
            (this.getUInt8(p + 1) << 16) |
            (this.getUInt8(p + 2) << 8) |
            this.getUInt8(p + 3));
    };
    /**
     * @param p
     */
    BaseBuffer.prototype.getInt64 = function (p) {
        return ((this.getInt8(p) << 56) |
            (this.getUInt8(p + 1) << 48) |
            (this.getUInt8(p + 2) << 40) |
            (this.getUInt8(p + 3) << 32) |
            (this.getUInt8(p + 4) << 24) |
            (this.getUInt8(p + 5) << 16) |
            (this.getUInt8(p + 6) << 8) |
            this.getUInt8(p + 7));
    };
    /**
     * Get a slice of this buffer. This method does not copy any data,
     * but simply provides a slice view of this buffer
     * @param start
     * @param length
     */
    BaseBuffer.prototype.getSlice = function (start, length) {
        return new SliceBuffer(start, length, this);
    };
    /**
     * @param p
     * @param val
     */
    BaseBuffer.prototype.putInt16 = function (p, val) {
        this.putInt8(p, val >> 8);
        this.putUInt8(p + 1, val & 0xff);
    };
    /**
     * @param p
     * @param val
     */
    BaseBuffer.prototype.putUInt16 = function (p, val) {
        this.putUInt8(p, (val >> 8) & 0xff);
        this.putUInt8(p + 1, val & 0xff);
    };
    /**
     * @param p
     * @param val
     */
    BaseBuffer.prototype.putInt32 = function (p, val) {
        this.putInt8(p, val >> 24);
        this.putUInt8(p + 1, (val >> 16) & 0xff);
        this.putUInt8(p + 2, (val >> 8) & 0xff);
        this.putUInt8(p + 3, val & 0xff);
    };
    /**
     * @param p
     * @param val
     */
    BaseBuffer.prototype.putUInt32 = function (p, val) {
        this.putUInt8(p, (val >> 24) & 0xff);
        this.putUInt8(p + 1, (val >> 16) & 0xff);
        this.putUInt8(p + 2, (val >> 8) & 0xff);
        this.putUInt8(p + 3, val & 0xff);
    };
    /**
     * @param p
     * @param val
     */
    BaseBuffer.prototype.putInt64 = function (p, val) {
        this.putInt8(p, val >> 48);
        this.putUInt8(p + 1, (val >> 42) & 0xff);
        this.putUInt8(p + 2, (val >> 36) & 0xff);
        this.putUInt8(p + 3, (val >> 30) & 0xff);
        this.putUInt8(p + 4, (val >> 24) & 0xff);
        this.putUInt8(p + 5, (val >> 16) & 0xff);
        this.putUInt8(p + 6, (val >> 8) & 0xff);
        this.putUInt8(p + 7, val & 0xff);
    };
    /**
     * @param position
     * @param other
     */
    BaseBuffer.prototype.putBytes = function (position, other) {
        for (var i = 0, end = other.remaining(); i < end; i++) {
            this.putUInt8(position + i, other.readUInt8());
        }
    };
    /**
     * Read from state position.
     */
    BaseBuffer.prototype.readUInt8 = function () {
        return this.getUInt8(this._updatePos(1));
    };
    /**
     * Read from state position.
     */
    BaseBuffer.prototype.readInt8 = function () {
        return this.getInt8(this._updatePos(1));
    };
    /**
     * Read from state position.
     */
    BaseBuffer.prototype.readUInt16 = function () {
        return this.getUInt16(this._updatePos(2));
    };
    /**
     * Read from state position.
     */
    BaseBuffer.prototype.readUInt32 = function () {
        return this.getUInt32(this._updatePos(4));
    };
    /**
     * Read from state position.
     */
    BaseBuffer.prototype.readInt16 = function () {
        return this.getInt16(this._updatePos(2));
    };
    /**
     * Read from state position.
     */
    BaseBuffer.prototype.readInt32 = function () {
        return this.getInt32(this._updatePos(4));
    };
    /**
     * Read from state position.
     */
    BaseBuffer.prototype.readInt64 = function () {
        return this.getInt32(this._updatePos(8));
    };
    /**
     * Read from state position.
     */
    BaseBuffer.prototype.readFloat64 = function () {
        return this.getFloat64(this._updatePos(8));
    };
    /**
     * Write to state position.
     * @param val
     */
    BaseBuffer.prototype.writeUInt8 = function (val) {
        this.putUInt8(this._updatePos(1), val);
    };
    /**
     * Write to state position.
     * @param val
     */
    BaseBuffer.prototype.writeInt8 = function (val) {
        this.putInt8(this._updatePos(1), val);
    };
    /**
     * Write to state position.
     * @param val
     */
    BaseBuffer.prototype.writeInt16 = function (val) {
        this.putInt16(this._updatePos(2), val);
    };
    /**
     * Write to state position.
     * @param val
     */
    BaseBuffer.prototype.writeInt32 = function (val) {
        this.putInt32(this._updatePos(4), val);
    };
    /**
     * Write to state position.
     * @param val
     */
    BaseBuffer.prototype.writeUInt32 = function (val) {
        this.putUInt32(this._updatePos(4), val);
    };
    /**
     * Write to state position.
     * @param val
     */
    BaseBuffer.prototype.writeInt64 = function (val) {
        this.putInt64(this._updatePos(8), val);
    };
    /**
     * Write to state position.
     * @param val
     */
    BaseBuffer.prototype.writeFloat64 = function (val) {
        this.putFloat64(this._updatePos(8), val);
    };
    /**
     * Write to state position.
     * @param val
     */
    BaseBuffer.prototype.writeBytes = function (val) {
        this.putBytes(this._updatePos(val.remaining()), val);
    };
    /**
     * Get a slice of this buffer. This method does not copy any data,
     * but simply provides a slice view of this buffer
     * @param length
     */
    BaseBuffer.prototype.readSlice = function (length) {
        return this.getSlice(this._updatePos(length), length);
    };
    BaseBuffer.prototype._updatePos = function (length) {
        var p = this.position;
        this.position += length;
        return p;
    };
    /**
     * Get remaining
     */
    BaseBuffer.prototype.remaining = function () {
        return this.length - this.position;
    };
    /**
     * Has remaining
     */
    BaseBuffer.prototype.hasRemaining = function () {
        return this.remaining() > 0;
    };
    /**
     * Reset position state
     */
    BaseBuffer.prototype.reset = function () {
        this.position = 0;
    };
    /**
     * Get string representation of buffer and it's state.
     * @return {string} Buffer as a string
     */
    BaseBuffer.prototype.toString = function () {
        return (this.constructor.name +
            '( position=' +
            this.position +
            ' )\n  ' +
            this.toHex());
    };
    /**
     * Get string representation of buffer.
     * @return {string} Buffer as a string
     */
    BaseBuffer.prototype.toHex = function () {
        var out = '';
        for (var i = 0; i < this.length; i++) {
            var hexByte = this.getUInt8(i).toString(16);
            if (hexByte.length === 1) {
                hexByte = '0' + hexByte;
            }
            out += hexByte;
            if (i !== this.length - 1) {
                out += ' ';
            }
        }
        return out;
    };
    return BaseBuffer;
}());
exports.default = BaseBuffer;
/**
 * Represents a view as slice of another buffer.
 * @access private
 */
var SliceBuffer = /** @class */ (function (_super) {
    __extends(SliceBuffer, _super);
    function SliceBuffer(start, length, inner) {
        var _this = _super.call(this, length) || this;
        _this._start = start;
        _this._inner = inner;
        return _this;
    }
    SliceBuffer.prototype.putUInt8 = function (position, val) {
        this._inner.putUInt8(this._start + position, val);
    };
    SliceBuffer.prototype.getUInt8 = function (position) {
        return this._inner.getUInt8(this._start + position);
    };
    SliceBuffer.prototype.putInt8 = function (position, val) {
        this._inner.putInt8(this._start + position, val);
    };
    SliceBuffer.prototype.putFloat64 = function (position, val) {
        this._inner.putFloat64(this._start + position, val);
    };
    SliceBuffer.prototype.getInt8 = function (position) {
        return this._inner.getInt8(this._start + position);
    };
    SliceBuffer.prototype.getFloat64 = function (position) {
        return this._inner.getFloat64(this._start + position);
    };
    return SliceBuffer;
}(BaseBuffer));

},{}],17:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseBuffer = void 0;
var base_buf_1 = __importDefault(require("./base-buf"));
exports.BaseBuffer = base_buf_1.default;
exports.default = base_buf_1.default;

},{"./base-buf":16}],18:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var buf_1 = __importDefault(require("../../buf"));
var HeapBuffer = /** @class */ (function (_super) {
    __extends(HeapBuffer, _super);
    function HeapBuffer(arg) {
        var _this = this;
        var buffer = arg instanceof ArrayBuffer ? arg : new ArrayBuffer(arg);
        _this = _super.call(this, buffer.byteLength) || this;
        _this._buffer = buffer;
        _this._view = new DataView(_this._buffer);
        return _this;
    }
    HeapBuffer.prototype.putUInt8 = function (position, val) {
        this._view.setUint8(position, val);
    };
    HeapBuffer.prototype.getUInt8 = function (position) {
        return this._view.getUint8(position);
    };
    HeapBuffer.prototype.putInt8 = function (position, val) {
        this._view.setInt8(position, val);
    };
    HeapBuffer.prototype.getInt8 = function (position) {
        return this._view.getInt8(position);
    };
    HeapBuffer.prototype.getFloat64 = function (position) {
        return this._view.getFloat64(position);
    };
    HeapBuffer.prototype.putFloat64 = function (position, val) {
        this._view.setFloat64(position, val);
    };
    HeapBuffer.prototype.getSlice = function (start, length) {
        if (this._buffer.slice) {
            return new HeapBuffer(this._buffer.slice(start, start + length));
        }
        else {
            // Some platforms (eg. phantomjs) don't support slice, so fall back to a copy
            // We do this rather than return a SliceBuffer, because sliceBuffer cannot
            // be passed to native network write ops etc - we need ArrayBuffer for that
            var copy = new HeapBuffer(length);
            for (var i = 0; i < length; i++) {
                copy.putUInt8(i, this.getUInt8(i + start));
            }
            return copy;
        }
    };
    /**
     * Specific to HeapBuffer, this gets a DataView from the
     * current position and of the specified length.
     */
    HeapBuffer.prototype.readView = function (length) {
        return new DataView(this._buffer, this._updatePos(length), length);
    };
    return HeapBuffer;
}(buf_1.default));
exports.default = HeapBuffer;

},{"../../buf":17}],19:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var browser_buf_1 = __importDefault(require("./browser-buf"));
var neo4j_driver_core_1 = require("neo4j-driver-core");
var _a = neo4j_driver_core_1.internal.util, ENCRYPTION_OFF = _a.ENCRYPTION_OFF, ENCRYPTION_ON = _a.ENCRYPTION_ON;
// Just to be sure that these values are with us even after WebSocket is injected
// for tests.
var WS_CONNECTING = 0;
var WS_OPEN = 1;
var WS_CLOSING = 2;
var WS_CLOSED = 3;
/**
 * Create a new WebSocketChannel to be used in web browsers.
 * @access private
 */
var WebSocketChannel = /** @class */ (function () {
    /**
     * Create new instance
     * @param {ChannelConfig} config - configuration for this channel.
     * @param {function(): string} protocolSupplier - function that detects protocol of the web page. Should only be used in tests.
     */
    function WebSocketChannel(config, protocolSupplier, socketFactory) {
        if (protocolSupplier === void 0) { protocolSupplier = detectWebPageProtocol; }
        if (socketFactory === void 0) { socketFactory = function (url) { return new WebSocket(url); }; }
        this._open = true;
        this._pending = [];
        this._error = null;
        this._handleConnectionError = this._handleConnectionError.bind(this);
        this._config = config;
        var _a = determineWebSocketScheme(config, protocolSupplier), scheme = _a.scheme, error = _a.error;
        if (error) {
            this._error = error;
            return;
        }
        this._ws = createWebSocket(scheme, config.address, socketFactory);
        this._ws.binaryType = 'arraybuffer';
        var self = this;
        // All connection errors are not sent to the error handler
        // we must also check for dirty close calls
        this._ws.onclose = function (e) {
            if (e && !e.wasClean) {
                self._handleConnectionError();
            }
            self._open = false;
        };
        this._ws.onopen = function () {
            // Connected! Cancel the connection timeout
            self._clearConnectionTimeout();
            // Drain all pending messages
            var pending = self._pending;
            self._pending = null;
            for (var i = 0; i < pending.length; i++) {
                self.write(pending[i]);
            }
        };
        this._ws.onmessage = function (event) {
            if (self.onmessage) {
                var b = new browser_buf_1.default(event.data);
                self.onmessage(b);
            }
        };
        this._ws.onerror = this._handleConnectionError;
        this._connectionTimeoutFired = false;
        this._connectionTimeoutId = this._setupConnectionTimeout();
    }
    WebSocketChannel.prototype._handleConnectionError = function () {
        if (this._connectionTimeoutFired) {
            // timeout fired - not connected within configured time
            this._error = neo4j_driver_core_1.newError("Failed to establish connection in " + this._config.connectionTimeout + "ms", this._config.connectionErrorCode);
            if (this.onerror) {
                this.onerror(this._error);
            }
            return;
        }
        // onerror triggers on websocket close as well.. don't get me started.
        if (this._open) {
            // http://stackoverflow.com/questions/25779831/how-to-catch-websocket-connection-to-ws-xxxnn-failed-connection-closed-be
            this._error = neo4j_driver_core_1.newError('WebSocket connection failure. Due to security ' +
                'constraints in your web browser, the reason for the failure is not available ' +
                'to this Neo4j Driver. Please use your browsers development console to determine ' +
                'the root cause of the failure. Common reasons include the database being ' +
                'unavailable, using the wrong connection URL or temporary network problems. ' +
                'If you have enabled encryption, ensure your browser is configured to trust the ' +
                'certificate Neo4j is configured to use. WebSocket `readyState` is: ' +
                this._ws.readyState, this._config.connectionErrorCode);
            if (this.onerror) {
                this.onerror(this._error);
            }
        }
    };
    /**
     * Write the passed in buffer to connection
     * @param {HeapBuffer} buffer - Buffer to write
     */
    WebSocketChannel.prototype.write = function (buffer) {
        // If there is a pending queue, push this on that queue. This means
        // we are not yet connected, so we queue things locally.
        if (this._pending !== null) {
            this._pending.push(buffer);
        }
        else if (buffer instanceof browser_buf_1.default) {
            try {
                this._ws.send(buffer._buffer);
            }
            catch (error) {
                if (this._ws.readyState !== WS_OPEN) {
                    // Websocket has been closed
                    this._handleConnectionError();
                }
                else {
                    // Some other error occured
                    throw error;
                }
            }
        }
        else {
            throw neo4j_driver_core_1.newError("Don't know how to send buffer: " + buffer);
        }
    };
    /**
     * Close the connection
     * @returns {Promise} A promise that will be resolved after channel is closed
     */
    WebSocketChannel.prototype.close = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this._ws && _this._ws.readyState !== WS_CLOSED) {
                _this._open = false;
                _this._clearConnectionTimeout();
                _this._ws.onclose = function () { return resolve(); };
                _this._ws.close();
            }
            else {
                resolve();
            }
        });
    };
    /**
     * Setup the receive timeout for the channel.
     *
     * Not supported for the browser channel.
     *
     * @param {number} receiveTimeout The amount of time the channel will keep without receive any data before timeout (ms)
     * @returns {void}
     */
    WebSocketChannel.prototype.setupReceiveTimeout = function (receiveTimeout) { };
    /**
     * Set connection timeout on the given WebSocket, if configured.
     * @return {number} the timeout id or null.
     * @private
     */
    WebSocketChannel.prototype._setupConnectionTimeout = function () {
        var _this = this;
        var timeout = this._config.connectionTimeout;
        if (timeout) {
            var webSocket_1 = this._ws;
            return setTimeout(function () {
                if (webSocket_1.readyState !== WS_OPEN) {
                    _this._connectionTimeoutFired = true;
                    webSocket_1.close();
                }
            }, timeout);
        }
        return null;
    };
    /**
     * Remove active connection timeout, if any.
     * @private
     */
    WebSocketChannel.prototype._clearConnectionTimeout = function () {
        var timeoutId = this._connectionTimeoutId;
        if (timeoutId || timeoutId === 0) {
            this._connectionTimeoutFired = false;
            this._connectionTimeoutId = null;
            clearTimeout(timeoutId);
        }
    };
    return WebSocketChannel;
}());
exports.default = WebSocketChannel;
function createWebSocket(scheme, address, socketFactory) {
    var url = scheme + '://' + address.asHostPort();
    try {
        return socketFactory(url);
    }
    catch (error) {
        if (isIPv6AddressIssueOnWindows(error, address)) {
            // WebSocket in IE and Edge browsers on Windows do not support regular IPv6 address syntax because they contain ':'.
            // It's an invalid character for UNC (https://en.wikipedia.org/wiki/IPv6_address#Literal_IPv6_addresses_in_UNC_path_names)
            // and Windows requires IPv6 to be changes in the following way:
            //   1) replace all ':' with '-'
            //   2) replace '%' with 's' for link-local address
            //   3) append '.ipv6-literal.net' suffix
            // only then resulting string can be considered a valid IPv6 address. Yes, this is extremely weird!
            // For more details see:
            //   https://social.msdn.microsoft.com/Forums/ie/en-US/06cca73b-63c2-4bf9-899b-b229c50449ff/whether-ie10-websocket-support-ipv6?forum=iewebdevelopment
            //   https://www.itdojo.com/ipv6-addresses-and-unc-path-names-overcoming-illegal/
            // Creation of WebSocket with unconverted address results in SyntaxError without message or stacktrace.
            // That is why here we "catch" SyntaxError and rewrite IPv6 address if needed.
            var windowsFriendlyUrl = asWindowsFriendlyIPv6Address(scheme, address);
            return socketFactory(windowsFriendlyUrl);
        }
        else {
            throw error;
        }
    }
}
function isIPv6AddressIssueOnWindows(error, address) {
    return error.name === 'SyntaxError' && isIPv6Address(address.asHostPort());
}
function isIPv6Address(hostAndPort) {
    return hostAndPort.charAt(0) === '[' && hostAndPort.indexOf(']') !== -1;
}
function asWindowsFriendlyIPv6Address(scheme, address) {
    // replace all ':' with '-'
    var hostWithoutColons = address.host().replace(new RegExp(':', 'g'), '-');
    // replace '%' with 's' for link-local IPv6 address like 'fe80::1%lo0'
    var hostWithoutPercent = hostWithoutColons.replace('%', 's');
    // append magic '.ipv6-literal.net' suffix
    var ipv6Host = hostWithoutPercent + '.ipv6-literal.net';
    return scheme + "://" + ipv6Host + ":" + address.port();
}
/**
 * @param {ChannelConfig} config - configuration for the channel.
 * @param {function(): string} protocolSupplier - function that detects protocol of the web page.
 * @return {{scheme: string|null, error: Neo4jError|null}} object containing either scheme or error.
 */
function determineWebSocketScheme(config, protocolSupplier) {
    var encryptionOn = isEncryptionExplicitlyTurnedOn(config);
    var encryptionOff = isEncryptionExplicitlyTurnedOff(config);
    var trust = config.trust;
    var secureProtocol = isProtocolSecure(protocolSupplier);
    verifyEncryptionSettings(encryptionOn, encryptionOff, secureProtocol);
    if (encryptionOff) {
        // encryption explicitly turned off in the config
        return { scheme: 'ws', error: null };
    }
    if (secureProtocol) {
        // driver is used in a secure https web page, use 'wss'
        return { scheme: 'wss', error: null };
    }
    if (encryptionOn) {
        // encryption explicitly requested in the config
        if (!trust || trust === 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES') {
            // trust strategy not specified or the only supported strategy is specified
            return { scheme: 'wss', error: null };
        }
        else {
            var error = neo4j_driver_core_1.newError('The browser version of this driver only supports one trust ' +
                "strategy, 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES'. " +
                trust +
                ' is not supported. Please ' +
                'either use TRUST_SYSTEM_CA_SIGNED_CERTIFICATES or disable encryption by setting ' +
                '`encrypted:"' +
                ENCRYPTION_OFF +
                '"` in the driver configuration.');
            return { scheme: null, error: error };
        }
    }
    // default to unencrypted web socket
    return { scheme: 'ws', error: null };
}
/**
 * @param {ChannelConfig} config - configuration for the channel.
 * @return {boolean} `true` if encryption enabled in the config, `false` otherwise.
 */
function isEncryptionExplicitlyTurnedOn(config) {
    return config.encrypted === true || config.encrypted === ENCRYPTION_ON;
}
/**
 * @param {ChannelConfig} config - configuration for the channel.
 * @return {boolean} `true` if encryption disabled in the config, `false` otherwise.
 */
function isEncryptionExplicitlyTurnedOff(config) {
    return config.encrypted === false || config.encrypted === ENCRYPTION_OFF;
}
/**
 * @param {function(): string} protocolSupplier - function that detects protocol of the web page.
 * @return {boolean} `true` if protocol returned by the given function is secure, `false` otherwise.
 */
function isProtocolSecure(protocolSupplier) {
    var protocol = typeof protocolSupplier === 'function' ? protocolSupplier() : '';
    return protocol && protocol.toLowerCase().indexOf('https') >= 0;
}
function verifyEncryptionSettings(encryptionOn, encryptionOff, secureProtocol) {
    if (secureProtocol === null) {
        // do nothing sice the protocol could not be identified
    }
    else if (encryptionOn && !secureProtocol) {
        // encryption explicitly turned on for a driver used on a HTTP web page
        console.warn('Neo4j driver is configured to use secure WebSocket on a HTTP web page. ' +
            'WebSockets might not work in a mixed content environment. ' +
            'Please consider configuring driver to not use encryption.');
    }
    else if (encryptionOff && secureProtocol) {
        // encryption explicitly turned off for a driver used on a HTTPS web page
        console.warn('Neo4j driver is configured to use insecure WebSocket on a HTTPS web page. ' +
            'WebSockets might not work in a mixed content environment. ' +
            'Please consider configuring driver to use encryption.');
    }
}
function detectWebPageProtocol() {
    return typeof window !== 'undefined' && window.location
        ? window.location.protocol
        : null;
}

},{"./browser-buf":18,"neo4j-driver-core":58}],20:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var neo4j_driver_core_1 = require("neo4j-driver-core");
var BaseHostNameResolver = neo4j_driver_core_1.internal.resolver.BaseHostNameResolver;
var BrowserHostNameResolver = /** @class */ (function (_super) {
    __extends(BrowserHostNameResolver, _super);
    function BrowserHostNameResolver() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    BrowserHostNameResolver.prototype.resolve = function (address) {
        return this._resolveToItself(address);
    };
    return BrowserHostNameResolver;
}(BaseHostNameResolver));
exports.default = BrowserHostNameResolver;

},{"neo4j-driver-core":58}],21:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var browser_buf_1 = __importDefault(require("./browser-buf"));
var text_encoding_utf_8_1 = require("text-encoding-utf-8");
var encoder = new text_encoding_utf_8_1.TextEncoder('utf-8');
var decoder = new text_encoding_utf_8_1.TextDecoder('utf-8');
function encode(str) {
    return new browser_buf_1.default(encoder.encode(str).buffer);
}
function decode(buffer, length) {
    if (buffer instanceof browser_buf_1.default) {
        return decoder.decode(buffer.readView(Math.min(length, buffer.length - buffer.position)));
    }
    else {
        // Copy the given buffer into a regular buffer and decode that
        var tmpBuf = new browser_buf_1.default(length);
        for (var i = 0; i < length; i++) {
            tmpBuf.writeUInt8(buffer.readUInt8());
        }
        tmpBuf.reset();
        return decoder.decode(tmpBuf.readView(length));
    }
}
exports.default = {
    encode: encode,
    decode: decode
};

},{"./browser-buf":18,"text-encoding-utf-8":52}],22:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.utf8 = exports.HostNameResolver = exports.Channel = exports.alloc = void 0;
var browser_buf_1 = __importDefault(require("./browser-buf"));
var browser_channel_1 = __importDefault(require("./browser-channel"));
var browser_host_name_resolver_1 = __importDefault(require("./browser-host-name-resolver"));
var browser_utf8_1 = __importDefault(require("./browser-utf8"));
/*

This module exports a set of components to be used in browser environment.
They are not compatible with NodeJS environment.
All files import/require APIs from `node/index.js` by default.
Such imports are replaced at build time with `browser/index.js` when building a browser bundle.

NOTE: exports in this module should have exactly the same names/structure as exports in `node/index.js`.

 */
var alloc = function (arg) { return new browser_buf_1.default(arg); };
exports.alloc = alloc;
exports.Channel = browser_channel_1.default;
exports.HostNameResolver = browser_host_name_resolver_1.default;
exports.utf8 = browser_utf8_1.default;

},{"./browser-buf":18,"./browser-channel":19,"./browser-host-name-resolver":20,"./browser-utf8":21}],23:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var neo4j_driver_core_1 = require("neo4j-driver-core");
var _a = neo4j_driver_core_1.internal.util, ENCRYPTION_OFF = _a.ENCRYPTION_OFF, ENCRYPTION_ON = _a.ENCRYPTION_ON;
var SERVICE_UNAVAILABLE = neo4j_driver_core_1.error.SERVICE_UNAVAILABLE;
var DEFAULT_CONNECTION_TIMEOUT_MILLIS = 30000; // 30 seconds by default
var ALLOWED_VALUES_ENCRYPTED = [
    null,
    undefined,
    true,
    false,
    ENCRYPTION_ON,
    ENCRYPTION_OFF
];
var ALLOWED_VALUES_TRUST = [
    null,
    undefined,
    'TRUST_ALL_CERTIFICATES',
    'TRUST_CUSTOM_CA_SIGNED_CERTIFICATES',
    'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES'
];
var ChannelConfig = /** @class */ (function () {
    /**
     * @constructor
     * @param {ServerAddress} address the address for the channel to connect to.
     * @param {Object} driverConfig the driver config provided by the user when driver is created.
     * @param {string} connectionErrorCode the default error code to use on connection errors.
     */
    function ChannelConfig(address, driverConfig, connectionErrorCode) {
        this.address = address;
        this.encrypted = extractEncrypted(driverConfig);
        this.trust = extractTrust(driverConfig);
        this.trustedCertificates = extractTrustedCertificates(driverConfig);
        this.knownHostsPath = extractKnownHostsPath(driverConfig);
        this.connectionErrorCode = connectionErrorCode || SERVICE_UNAVAILABLE;
        this.connectionTimeout = extractConnectionTimeout(driverConfig);
    }
    return ChannelConfig;
}());
exports.default = ChannelConfig;
function extractEncrypted(driverConfig) {
    var value = driverConfig.encrypted;
    if (ALLOWED_VALUES_ENCRYPTED.indexOf(value) === -1) {
        throw neo4j_driver_core_1.newError("Illegal value of the encrypted setting " + value + ". Expected one of " + ALLOWED_VALUES_ENCRYPTED);
    }
    return value;
}
function extractTrust(driverConfig) {
    var value = driverConfig.trust;
    if (ALLOWED_VALUES_TRUST.indexOf(value) === -1) {
        throw neo4j_driver_core_1.newError("Illegal value of the trust setting " + value + ". Expected one of " + ALLOWED_VALUES_TRUST);
    }
    return value;
}
function extractTrustedCertificates(driverConfig) {
    return driverConfig.trustedCertificates || [];
}
function extractKnownHostsPath(driverConfig) {
    return driverConfig.knownHosts || null;
}
function extractConnectionTimeout(driverConfig) {
    var configuredTimeout = parseInt(driverConfig.connectionTimeout, 10);
    if (configuredTimeout === 0) {
        // timeout explicitly configured to 0
        return null;
    }
    else if (configuredTimeout && configuredTimeout < 0) {
        // timeout explicitly configured to a negative value
        return null;
    }
    else if (!configuredTimeout) {
        // timeout not configured, use default value
        return DEFAULT_CONNECTION_TIMEOUT_MILLIS;
    }
    else {
        // timeout configured, use the provided value
        return configuredTimeout;
    }
}

},{"neo4j-driver-core":58}],24:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dechunker = exports.Chunker = void 0;
var base_buf_1 = __importDefault(require("../buf/base-buf"));
var node_1 = require("./node");
var combined_buf_1 = __importDefault(require("./combined-buf"));
var _CHUNK_HEADER_SIZE = 2;
var _MESSAGE_BOUNDARY = 0x00;
var _DEFAULT_BUFFER_SIZE = 1400; // http://stackoverflow.com/questions/2613734/maximum-packet-size-for-a-tcp-connection
/**
 * Looks like a writable buffer, chunks output transparently into a channel below.
 * @access private
 */
var Chunker = /** @class */ (function (_super) {
    __extends(Chunker, _super);
    function Chunker(channel, bufferSize) {
        var _this = _super.call(this, 0) || this;
        _this._bufferSize = bufferSize || _DEFAULT_BUFFER_SIZE;
        _this._ch = channel;
        _this._buffer = node_1.alloc(_this._bufferSize);
        _this._currentChunkStart = 0;
        _this._chunkOpen = false;
        return _this;
    }
    Chunker.prototype.putUInt8 = function (position, val) {
        this._ensure(1);
        this._buffer.writeUInt8(val);
    };
    Chunker.prototype.putInt8 = function (position, val) {
        this._ensure(1);
        this._buffer.writeInt8(val);
    };
    Chunker.prototype.putFloat64 = function (position, val) {
        this._ensure(8);
        this._buffer.writeFloat64(val);
    };
    Chunker.prototype.putBytes = function (position, data) {
        // TODO: If data is larger than our chunk size or so, we're very likely better off just passing this buffer on
        // rather than doing the copy here TODO: *however* note that we need some way to find out when the data has been
        // written (and thus the buffer can be re-used) if we take that approach
        while (data.remaining() > 0) {
            // Ensure there is an open chunk, and that it has at least one byte of space left
            this._ensure(1);
            if (this._buffer.remaining() > data.remaining()) {
                this._buffer.writeBytes(data);
            }
            else {
                this._buffer.writeBytes(data.readSlice(this._buffer.remaining()));
            }
        }
        return this;
    };
    Chunker.prototype.flush = function () {
        if (this._buffer.position > 0) {
            this._closeChunkIfOpen();
            // Local copy and clear the buffer field. This ensures that the buffer is not re-released if the flush call fails
            var out = this._buffer;
            this._buffer = null;
            this._ch.write(out.getSlice(0, out.position));
            // Alloc a new output buffer. We assume we're using NodeJS's buffer pooling under the hood here!
            this._buffer = node_1.alloc(this._bufferSize);
            this._chunkOpen = false;
        }
        return this;
    };
    /**
     * Bolt messages are encoded in one or more chunks, and the boundary between two messages
     * is encoded as a 0-length chunk, `00 00`. This inserts such a message boundary, closing
     * any currently open chunk as needed
     */
    Chunker.prototype.messageBoundary = function () {
        this._closeChunkIfOpen();
        if (this._buffer.remaining() < _CHUNK_HEADER_SIZE) {
            this.flush();
        }
        // Write message boundary
        this._buffer.writeInt16(_MESSAGE_BOUNDARY);
    };
    /** Ensure at least the given size is available for writing */
    Chunker.prototype._ensure = function (size) {
        var toWriteSize = this._chunkOpen ? size : size + _CHUNK_HEADER_SIZE;
        if (this._buffer.remaining() < toWriteSize) {
            this.flush();
        }
        if (!this._chunkOpen) {
            this._currentChunkStart = this._buffer.position;
            this._buffer.position = this._buffer.position + _CHUNK_HEADER_SIZE;
            this._chunkOpen = true;
        }
    };
    Chunker.prototype._closeChunkIfOpen = function () {
        if (this._chunkOpen) {
            var chunkSize = this._buffer.position - (this._currentChunkStart + _CHUNK_HEADER_SIZE);
            this._buffer.putUInt16(this._currentChunkStart, chunkSize);
            this._chunkOpen = false;
        }
    };
    return Chunker;
}(base_buf_1.default));
exports.Chunker = Chunker;
/**
 * Combines chunks until a complete message is gathered up, and then forwards that
 * message to an 'onmessage' listener.
 * @access private
 */
var Dechunker = /** @class */ (function () {
    function Dechunker() {
        this._currentMessage = [];
        this._partialChunkHeader = 0;
        this._state = this.AWAITING_CHUNK;
    }
    Dechunker.prototype.AWAITING_CHUNK = function (buf) {
        if (buf.remaining() >= 2) {
            // Whole header available, read that
            return this._onHeader(buf.readUInt16());
        }
        else {
            // Only one byte available, read that and wait for the second byte
            this._partialChunkHeader = buf.readUInt8() << 8;
            return this.IN_HEADER;
        }
    };
    Dechunker.prototype.IN_HEADER = function (buf) {
        // First header byte read, now we read the next one
        return this._onHeader((this._partialChunkHeader | buf.readUInt8()) & 0xffff);
    };
    Dechunker.prototype.IN_CHUNK = function (buf) {
        if (this._chunkSize <= buf.remaining()) {
            // Current packet is larger than current chunk, or same size:
            this._currentMessage.push(buf.readSlice(this._chunkSize));
            return this.AWAITING_CHUNK;
        }
        else {
            // Current packet is smaller than the chunk we're reading, split the current chunk itself up
            this._chunkSize -= buf.remaining();
            this._currentMessage.push(buf.readSlice(buf.remaining()));
            return this.IN_CHUNK;
        }
    };
    Dechunker.prototype.CLOSED = function (buf) {
        // no-op
    };
    /** Called when a complete chunk header has been received */
    Dechunker.prototype._onHeader = function (header) {
        if (header === 0) {
            // Message boundary
            var message = void 0;
            switch (this._currentMessage.length) {
                case 0:
                    // Keep alive chunk, sent by server to keep network alive.
                    return this.AWAITING_CHUNK;
                case 1:
                    // All data in one chunk, this signals the end of that chunk.
                    message = this._currentMessage[0];
                    break;
                default:
                    // A large chunk of data received, this signals that the last chunk has been received.
                    message = new combined_buf_1.default(this._currentMessage);
                    break;
            }
            this._currentMessage = [];
            this.onmessage(message);
            return this.AWAITING_CHUNK;
        }
        else {
            this._chunkSize = header;
            return this.IN_CHUNK;
        }
    };
    Dechunker.prototype.write = function (buf) {
        while (buf.hasRemaining()) {
            this._state = this._state(buf);
        }
    };
    return Dechunker;
}());
exports.Dechunker = Dechunker;

},{"../buf/base-buf":16,"./combined-buf":25,"./node":22}],25:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var buf_1 = require("../buf");
var node_1 = require("./node");
/**
 * Buffer that combines multiple buffers, exposing them as one single buffer.
 */
var CombinedBuffer = /** @class */ (function (_super) {
    __extends(CombinedBuffer, _super);
    function CombinedBuffer(buffers) {
        var _this = this;
        var length = 0;
        for (var i = 0; i < buffers.length; i++) {
            length += buffers[i].length;
        }
        _this = _super.call(this, length) || this;
        _this._buffers = buffers;
        return _this;
    }
    CombinedBuffer.prototype.getUInt8 = function (position) {
        // Surely there's a faster way to do this.. some sort of lookup table thing?
        for (var i = 0; i < this._buffers.length; i++) {
            var buffer = this._buffers[i];
            // If the position is not in the current buffer, skip the current buffer
            if (position >= buffer.length) {
                position -= buffer.length;
            }
            else {
                return buffer.getUInt8(position);
            }
        }
    };
    CombinedBuffer.prototype.getInt8 = function (position) {
        // Surely there's a faster way to do this.. some sort of lookup table thing?
        for (var i = 0; i < this._buffers.length; i++) {
            var buffer = this._buffers[i];
            // If the position is not in the current buffer, skip the current buffer
            if (position >= buffer.length) {
                position -= buffer.length;
            }
            else {
                return buffer.getInt8(position);
            }
        }
    };
    CombinedBuffer.prototype.getFloat64 = function (position) {
        // At some point, a more efficient impl. For now, we copy the 8 bytes
        // we want to read and depend on the platform impl of IEEE 754.
        var b = node_1.alloc(8);
        for (var i = 0; i < 8; i++) {
            b.putUInt8(i, this.getUInt8(position + i));
        }
        return b.getFloat64(0);
    };
    return CombinedBuffer;
}(buf_1.BaseBuffer));
exports.default = CombinedBuffer;

},{"../buf":17,"./node":22}],26:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelConfig = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
__exportStar(require("./node"), exports);
__exportStar(require("./chunking"), exports);
var channel_config_1 = require("./channel-config");
Object.defineProperty(exports, "ChannelConfig", { enumerable: true, get: function () { return __importDefault(channel_config_1).default; } });

},{"./channel-config":23,"./chunking":24,"./node":22}],27:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var connection_provider_pooled_1 = __importDefault(require("./connection-provider-pooled"));
var connection_1 = require("../connection");
var neo4j_driver_core_1 = require("neo4j-driver-core");
var _a = neo4j_driver_core_1.internal.constants, BOLT_PROTOCOL_V4_0 = _a.BOLT_PROTOCOL_V4_0, BOLT_PROTOCOL_V3 = _a.BOLT_PROTOCOL_V3;
var SERVICE_UNAVAILABLE = neo4j_driver_core_1.error.SERVICE_UNAVAILABLE, newError = neo4j_driver_core_1.error.newError;
var DirectConnectionProvider = /** @class */ (function (_super) {
    __extends(DirectConnectionProvider, _super);
    function DirectConnectionProvider(_a) {
        var id = _a.id, config = _a.config, log = _a.log, address = _a.address, userAgent = _a.userAgent, authToken = _a.authToken;
        var _this = _super.call(this, { id: id, config: config, log: log, userAgent: userAgent, authToken: authToken }) || this;
        _this._address = address;
        return _this;
    }
    /**
     * See {@link ConnectionProvider} for more information about this method and
     * its arguments.
     */
    DirectConnectionProvider.prototype.acquireConnection = function (_a) {
        var _this = this;
        var _b = _a === void 0 ? {} : _a, accessMode = _b.accessMode, database = _b.database, bookmarks = _b.bookmarks;
        var databaseSpecificErrorHandler = connection_1.ConnectionErrorHandler.create({
            errorCode: SERVICE_UNAVAILABLE,
            handleAuthorizationExpired: function (error, address) {
                return _this._handleAuthorizationExpired(error, address, database);
            }
        });
        return this._connectionPool
            .acquire(this._address)
            .then(function (connection) {
            return new connection_1.DelegateConnection(connection, databaseSpecificErrorHandler);
        });
    };
    DirectConnectionProvider.prototype._handleAuthorizationExpired = function (error, address, database) {
        this._log.warn("Direct driver " + this._id + " will close connection to " + address + " for database '" + database + "' because of an error " + error.code + " '" + error.message + "'");
        this._connectionPool.purge(address).catch(function () { });
        return error;
    };
    DirectConnectionProvider.prototype._hasProtocolVersion = function (versionPredicate) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, protocolVersion;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.createChannelConnection(this._address, this._config, this._createConnectionErrorHandler(), this._log)];
                    case 1:
                        connection = _a.sent();
                        protocolVersion = connection.protocol()
                            ? connection.protocol().version
                            : null;
                        return [4 /*yield*/, connection.close()];
                    case 2:
                        _a.sent();
                        if (protocolVersion) {
                            return [2 /*return*/, versionPredicate(protocolVersion)];
                        }
                        return [2 /*return*/, false];
                }
            });
        });
    };
    DirectConnectionProvider.prototype.supportsMultiDb = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._hasProtocolVersion(function (version) { return version >= BOLT_PROTOCOL_V4_0; })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DirectConnectionProvider.prototype.supportsTransactionConfig = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._hasProtocolVersion(function (version) { return version >= BOLT_PROTOCOL_V3; })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return DirectConnectionProvider;
}(connection_provider_pooled_1.default));
exports.default = DirectConnectionProvider;

},{"../connection":36,"./connection-provider-pooled":28,"neo4j-driver-core":58}],28:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var connection_1 = require("../connection");
var pool_1 = __importStar(require("../pool"));
var neo4j_driver_core_1 = require("neo4j-driver-core");
var SERVICE_UNAVAILABLE = neo4j_driver_core_1.error.SERVICE_UNAVAILABLE;
var PooledConnectionProvider = /** @class */ (function (_super) {
    __extends(PooledConnectionProvider, _super);
    function PooledConnectionProvider(_a, createChannelConnectionHook) {
        var id = _a.id, config = _a.config, log = _a.log, userAgent = _a.userAgent, authToken = _a.authToken;
        if (createChannelConnectionHook === void 0) { createChannelConnectionHook = null; }
        var _this = _super.call(this) || this;
        _this._id = id;
        _this._config = config;
        _this._log = log;
        _this._userAgent = userAgent;
        _this._authToken = authToken;
        _this._createChannelConnection =
            createChannelConnectionHook ||
                (function (address) {
                    return connection_1.createChannelConnection(address, _this._config, _this._createConnectionErrorHandler(), _this._log);
                });
        _this._connectionPool = new pool_1.default({
            create: _this._createConnection.bind(_this),
            destroy: _this._destroyConnection.bind(_this),
            validate: _this._validateConnection.bind(_this),
            installIdleObserver: PooledConnectionProvider._installIdleObserverOnConnection.bind(_this),
            removeIdleObserver: PooledConnectionProvider._removeIdleObserverOnConnection.bind(_this),
            config: pool_1.PoolConfig.fromDriverConfig(config),
            log: _this._log
        });
        _this._openConnections = {};
        return _this;
    }
    PooledConnectionProvider.prototype._createConnectionErrorHandler = function () {
        return new connection_1.ConnectionErrorHandler(SERVICE_UNAVAILABLE);
    };
    /**
     * Create a new connection and initialize it.
     * @return {Promise<Connection>} promise resolved with a new connection or rejected when failed to connect.
     * @access private
     */
    PooledConnectionProvider.prototype._createConnection = function (address, release) {
        var _this = this;
        return this._createChannelConnection(address).then(function (connection) {
            connection._release = function () { return release(address, connection); };
            _this._openConnections[connection.id] = connection;
            return connection
                .connect(_this._userAgent, _this._authToken)
                .catch(function (error) {
                // let's destroy this connection
                _this._destroyConnection(connection);
                // propagate the error because connection failed to connect / initialize
                throw error;
            });
        });
    };
    /**
     * Check that a connection is usable
     * @return {boolean} true if the connection is open
     * @access private
     **/
    PooledConnectionProvider.prototype._validateConnection = function (conn) {
        if (!conn.isOpen()) {
            return false;
        }
        var maxConnectionLifetime = this._config.maxConnectionLifetime;
        var lifetime = Date.now() - conn.creationTimestamp;
        return lifetime <= maxConnectionLifetime;
    };
    /**
     * Dispose of a connection.
     * @return {Connection} the connection to dispose.
     * @access private
     */
    PooledConnectionProvider.prototype._destroyConnection = function (conn) {
        delete this._openConnections[conn.id];
        return conn.close();
    };
    PooledConnectionProvider.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // purge all idle connections in the connection pool
                    return [4 /*yield*/, this._connectionPool.close()
                        // then close all connections driver has ever created
                        // it is needed to close connections that are active right now and are acquired from the pool
                    ];
                    case 1:
                        // purge all idle connections in the connection pool
                        _a.sent();
                        // then close all connections driver has ever created
                        // it is needed to close connections that are active right now and are acquired from the pool
                        return [4 /*yield*/, Promise.all(Object.values(this._openConnections).map(function (c) { return c.close(); }))];
                    case 2:
                        // then close all connections driver has ever created
                        // it is needed to close connections that are active right now and are acquired from the pool
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PooledConnectionProvider._installIdleObserverOnConnection = function (conn, observer) {
        conn._queueObserver(observer);
    };
    PooledConnectionProvider._removeIdleObserverOnConnection = function (conn) {
        conn._updateCurrentObserver();
    };
    return PooledConnectionProvider;
}(neo4j_driver_core_1.ConnectionProvider));
exports.default = PooledConnectionProvider;

},{"../connection":36,"../pool":46,"neo4j-driver-core":58}],29:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var neo4j_driver_core_1 = require("neo4j-driver-core");
var rediscovery_1 = __importStar(require("../rediscovery"));
var channel_1 = require("../channel");
var connection_provider_single_1 = __importDefault(require("./connection-provider-single"));
var connection_provider_pooled_1 = __importDefault(require("./connection-provider-pooled"));
var load_balancing_1 = require("../load-balancing");
var connection_1 = require("../connection");
var SERVICE_UNAVAILABLE = neo4j_driver_core_1.error.SERVICE_UNAVAILABLE, SESSION_EXPIRED = neo4j_driver_core_1.error.SESSION_EXPIRED;
var Bookmark = neo4j_driver_core_1.internal.bookmark.Bookmark, _a = neo4j_driver_core_1.internal.constants, READ = _a.ACCESS_MODE_READ, WRITE = _a.ACCESS_MODE_WRITE, BOLT_PROTOCOL_V3 = _a.BOLT_PROTOCOL_V3, BOLT_PROTOCOL_V4_0 = _a.BOLT_PROTOCOL_V4_0;
var UNAUTHORIZED_ERROR_CODE = 'Neo.ClientError.Security.Unauthorized';
var DATABASE_NOT_FOUND_ERROR_CODE = 'Neo.ClientError.Database.DatabaseNotFound';
var SYSTEM_DB_NAME = 'system';
var DEFAULT_DB_NAME = null;
var DEFAULT_ROUTING_TABLE_PURGE_DELAY = neo4j_driver_core_1.int(30000);
var RoutingConnectionProvider = /** @class */ (function (_super) {
    __extends(RoutingConnectionProvider, _super);
    function RoutingConnectionProvider(_a) {
        var id = _a.id, address = _a.address, routingContext = _a.routingContext, hostNameResolver = _a.hostNameResolver, config = _a.config, log = _a.log, userAgent = _a.userAgent, authToken = _a.authToken, routingTablePurgeDelay = _a.routingTablePurgeDelay;
        var _this = _super.call(this, { id: id, config: config, log: log, userAgent: userAgent, authToken: authToken }, function (address) {
            return connection_1.createChannelConnection(address, _this._config, _this._createConnectionErrorHandler(), _this._log, _this._routingContext);
        }) || this;
        _this._routingContext = __assign(__assign({}, routingContext), { address: address.toString() });
        _this._seedRouter = address;
        _this._rediscovery = new rediscovery_1.default(_this._routingContext);
        _this._loadBalancingStrategy = new load_balancing_1.LeastConnectedLoadBalancingStrategy(_this._connectionPool);
        _this._hostNameResolver = hostNameResolver;
        _this._dnsResolver = new channel_1.HostNameResolver();
        _this._log = log;
        _this._useSeedRouter = true;
        _this._routingTableRegistry = new RoutingTableRegistry(routingTablePurgeDelay
            ? neo4j_driver_core_1.int(routingTablePurgeDelay)
            : DEFAULT_ROUTING_TABLE_PURGE_DELAY);
        return _this;
    }
    RoutingConnectionProvider.prototype._createConnectionErrorHandler = function () {
        // connection errors mean SERVICE_UNAVAILABLE for direct driver but for routing driver they should only
        // result in SESSION_EXPIRED because there might still exist other servers capable of serving the request
        return new connection_1.ConnectionErrorHandler(SESSION_EXPIRED);
    };
    RoutingConnectionProvider.prototype._handleUnavailability = function (error, address, database) {
        this._log.warn("Routing driver " + this._id + " will forget " + address + " for database '" + database + "' because of an error " + error.code + " '" + error.message + "'");
        this.forget(address, database || DEFAULT_DB_NAME);
        return error;
    };
    RoutingConnectionProvider.prototype._handleAuthorizationExpired = function (error, address, database) {
        this._log.warn("Routing driver " + this._id + " will close connections to " + address + " for database '" + database + "' because of an error " + error.code + " '" + error.message + "'");
        this._connectionPool.purge(address).catch(function () { });
        return error;
    };
    RoutingConnectionProvider.prototype._handleWriteFailure = function (error, address, database) {
        this._log.warn("Routing driver " + this._id + " will forget writer " + address + " for database '" + database + "' because of an error " + error.code + " '" + error.message + "'");
        this.forgetWriter(address, database || DEFAULT_DB_NAME);
        return neo4j_driver_core_1.newError('No longer possible to write to server at ' + address, SESSION_EXPIRED);
    };
    /**
     * See {@link ConnectionProvider} for more information about this method and
     * its arguments.
     */
    RoutingConnectionProvider.prototype.acquireConnection = function (_a) {
        var _b = _a === void 0 ? {} : _a, accessMode = _b.accessMode, database = _b.database, bookmarks = _b.bookmarks;
        return __awaiter(this, void 0, void 0, function () {
            var name, address, databaseSpecificErrorHandler, routingTable, connection, error_1, transformed;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        databaseSpecificErrorHandler = new connection_1.ConnectionErrorHandler(SESSION_EXPIRED, function (error, address) { return _this._handleUnavailability(error, address, database); }, function (error, address) { return _this._handleWriteFailure(error, address, database); }, function (error, address) {
                            return _this._handleAuthorizationExpired(error, address, database);
                        });
                        return [4 /*yield*/, this._freshRoutingTable({
                                accessMode: accessMode,
                                database: database || DEFAULT_DB_NAME,
                                bookmark: bookmarks
                            })
                            // select a target server based on specified access mode
                        ];
                    case 1:
                        routingTable = _c.sent();
                        // select a target server based on specified access mode
                        if (accessMode === READ) {
                            address = this._loadBalancingStrategy.selectReader(routingTable.readers);
                            name = 'read';
                        }
                        else if (accessMode === WRITE) {
                            address = this._loadBalancingStrategy.selectWriter(routingTable.writers);
                            name = 'write';
                        }
                        else {
                            throw neo4j_driver_core_1.newError('Illegal mode ' + accessMode);
                        }
                        // we couldn't select a target server
                        if (!address) {
                            throw neo4j_driver_core_1.newError("Failed to obtain connection towards " + name + " server. Known routing table is: " + routingTable, SESSION_EXPIRED);
                        }
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this._acquireConnectionToServer(address, name, routingTable)];
                    case 3:
                        connection = _c.sent();
                        return [2 /*return*/, new connection_1.DelegateConnection(connection, databaseSpecificErrorHandler)];
                    case 4:
                        error_1 = _c.sent();
                        transformed = databaseSpecificErrorHandler.handleAndTransformError(error_1, address);
                        throw transformed;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    RoutingConnectionProvider.prototype._hasProtocolVersion = function (versionPredicate) {
        return __awaiter(this, void 0, void 0, function () {
            var addresses, lastError, i, connection, protocolVersion, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._resolveSeedRouter(this._seedRouter)];
                    case 1:
                        addresses = _a.sent();
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < addresses.length)) return [3 /*break*/, 8];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 6, , 7]);
                        return [4 /*yield*/, connection_1.createChannelConnection(addresses[i], this._config, this._createConnectionErrorHandler(), this._log)];
                    case 4:
                        connection = _a.sent();
                        protocolVersion = connection.protocol()
                            ? connection.protocol().version
                            : null;
                        return [4 /*yield*/, connection.close()];
                    case 5:
                        _a.sent();
                        if (protocolVersion) {
                            return [2 /*return*/, versionPredicate(protocolVersion)];
                        }
                        return [2 /*return*/, false];
                    case 6:
                        error_2 = _a.sent();
                        lastError = error_2;
                        return [3 /*break*/, 7];
                    case 7:
                        i++;
                        return [3 /*break*/, 2];
                    case 8:
                        if (lastError) {
                            throw lastError;
                        }
                        return [2 /*return*/, false];
                }
            });
        });
    };
    RoutingConnectionProvider.prototype.supportsMultiDb = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._hasProtocolVersion(function (version) { return version >= BOLT_PROTOCOL_V4_0; })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    RoutingConnectionProvider.prototype.supportsTransactionConfig = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._hasProtocolVersion(function (version) { return version >= BOLT_PROTOCOL_V3; })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    RoutingConnectionProvider.prototype.forget = function (address, database) {
        this._routingTableRegistry.apply(database, {
            applyWhenExists: function (routingTable) { return routingTable.forget(address); }
        });
        // We're firing and forgetting this operation explicitly and listening for any
        // errors to avoid unhandled promise rejection
        this._connectionPool.purge(address).catch(function () { });
    };
    RoutingConnectionProvider.prototype.forgetWriter = function (address, database) {
        this._routingTableRegistry.apply(database, {
            applyWhenExists: function (routingTable) { return routingTable.forgetWriter(address); }
        });
    };
    RoutingConnectionProvider.prototype._acquireConnectionToServer = function (address, serverName, routingTable) {
        return this._connectionPool.acquire(address);
    };
    RoutingConnectionProvider.prototype._freshRoutingTable = function (_a) {
        var _b = _a === void 0 ? {} : _a, accessMode = _b.accessMode, database = _b.database, bookmark = _b.bookmark;
        var currentRoutingTable = this._routingTableRegistry.get(database, function () { return new rediscovery_1.RoutingTable({ database: database }); });
        if (!currentRoutingTable.isStaleFor(accessMode)) {
            return currentRoutingTable;
        }
        this._log.info("Routing table is stale for database: \"" + database + "\" and access mode: \"" + accessMode + "\": " + currentRoutingTable);
        return this._refreshRoutingTable(currentRoutingTable, bookmark);
    };
    RoutingConnectionProvider.prototype._refreshRoutingTable = function (currentRoutingTable, bookmark) {
        var knownRouters = currentRoutingTable.routers;
        if (this._useSeedRouter) {
            return this._fetchRoutingTableFromSeedRouterFallbackToKnownRouters(knownRouters, currentRoutingTable, bookmark);
        }
        return this._fetchRoutingTableFromKnownRoutersFallbackToSeedRouter(knownRouters, currentRoutingTable, bookmark);
    };
    RoutingConnectionProvider.prototype._fetchRoutingTableFromSeedRouterFallbackToKnownRouters = function (knownRouters, currentRoutingTable, bookmark) {
        return __awaiter(this, void 0, void 0, function () {
            var seenRouters, newRoutingTable;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        seenRouters = [];
                        return [4 /*yield*/, this._fetchRoutingTableUsingSeedRouter(seenRouters, this._seedRouter, currentRoutingTable, bookmark)];
                    case 1:
                        newRoutingTable = _a.sent();
                        if (!newRoutingTable) return [3 /*break*/, 2];
                        this._useSeedRouter = false;
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this._fetchRoutingTableUsingKnownRouters(knownRouters, currentRoutingTable, bookmark)];
                    case 3:
                        // seed router did not return a valid routing table - try to use other known routers
                        newRoutingTable = _a.sent();
                        _a.label = 4;
                    case 4: return [4 /*yield*/, this._applyRoutingTableIfPossible(currentRoutingTable, newRoutingTable)];
                    case 5: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    RoutingConnectionProvider.prototype._fetchRoutingTableFromKnownRoutersFallbackToSeedRouter = function (knownRouters, currentRoutingTable, bookmark) {
        return __awaiter(this, void 0, void 0, function () {
            var newRoutingTable;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._fetchRoutingTableUsingKnownRouters(knownRouters, currentRoutingTable, bookmark)];
                    case 1:
                        newRoutingTable = _a.sent();
                        if (!!newRoutingTable) return [3 /*break*/, 3];
                        return [4 /*yield*/, this._fetchRoutingTableUsingSeedRouter(knownRouters, this._seedRouter, currentRoutingTable, bookmark)];
                    case 2:
                        // none of the known routers returned a valid routing table - try to use seed router address for rediscovery
                        newRoutingTable = _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this._applyRoutingTableIfPossible(currentRoutingTable, newRoutingTable)];
                    case 4: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    RoutingConnectionProvider.prototype._fetchRoutingTableUsingKnownRouters = function (knownRouters, currentRoutingTable, bookmark) {
        return __awaiter(this, void 0, void 0, function () {
            var newRoutingTable, lastRouterIndex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._fetchRoutingTable(knownRouters, currentRoutingTable, bookmark)];
                    case 1:
                        newRoutingTable = _a.sent();
                        if (newRoutingTable) {
                            // one of the known routers returned a valid routing table - use it
                            return [2 /*return*/, newRoutingTable];
                        }
                        lastRouterIndex = knownRouters.length - 1;
                        RoutingConnectionProvider._forgetRouter(currentRoutingTable, knownRouters, lastRouterIndex);
                        return [2 /*return*/, null];
                }
            });
        });
    };
    RoutingConnectionProvider.prototype._fetchRoutingTableUsingSeedRouter = function (seenRouters, seedRouter, routingTable, bookmark) {
        return __awaiter(this, void 0, void 0, function () {
            var resolvedAddresses, newAddresses;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._resolveSeedRouter(seedRouter)
                        // filter out all addresses that we've already tried
                    ];
                    case 1:
                        resolvedAddresses = _a.sent();
                        newAddresses = resolvedAddresses.filter(function (address) { return seenRouters.indexOf(address) < 0; });
                        return [4 /*yield*/, this._fetchRoutingTable(newAddresses, routingTable, bookmark)];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    RoutingConnectionProvider.prototype._resolveSeedRouter = function (seedRouter) {
        return __awaiter(this, void 0, void 0, function () {
            var resolvedAddresses, dnsResolvedAddresses;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._hostNameResolver.resolve(seedRouter)];
                    case 1:
                        resolvedAddresses = _a.sent();
                        return [4 /*yield*/, Promise.all(resolvedAddresses.map(function (address) { return _this._dnsResolver.resolve(address); }))];
                    case 2:
                        dnsResolvedAddresses = _a.sent();
                        return [2 /*return*/, [].concat.apply([], dnsResolvedAddresses)];
                }
            });
        });
    };
    RoutingConnectionProvider.prototype._fetchRoutingTable = function (routerAddresses, routingTable, bookmark) {
        var _this = this;
        return routerAddresses.reduce(function (refreshedTablePromise, currentRouter, currentIndex) { return __awaiter(_this, void 0, void 0, function () {
            var newRoutingTable, previousRouterIndex, session, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, refreshedTablePromise];
                    case 1:
                        newRoutingTable = _a.sent();
                        if (newRoutingTable) {
                            // valid routing table was fetched - just return it, try next router otherwise
                            return [2 /*return*/, newRoutingTable];
                        }
                        else {
                            previousRouterIndex = currentIndex - 1;
                            RoutingConnectionProvider._forgetRouter(routingTable, routerAddresses, previousRouterIndex);
                        }
                        return [4 /*yield*/, this._createSessionForRediscovery(currentRouter, bookmark)];
                    case 2:
                        session = _a.sent();
                        if (!session) return [3 /*break*/, 8];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, 6, 7]);
                        return [4 /*yield*/, this._rediscovery.lookupRoutingTableOnRouter(session, routingTable.database, currentRouter)];
                    case 4: return [2 /*return*/, _a.sent()];
                    case 5:
                        error_3 = _a.sent();
                        if (error_3 && error_3.code === DATABASE_NOT_FOUND_ERROR_CODE) {
                            // not finding the target database is a sign of a configuration issue
                            throw error_3;
                        }
                        this._log.warn("unable to fetch routing table because of an error " + error_3);
                        return [2 /*return*/, null];
                    case 6:
                        session.close();
                        return [7 /*endfinally*/];
                    case 7: return [3 /*break*/, 9];
                    case 8: 
                    // unable to acquire connection and create session towards the current router
                    // return null to signal that the next router should be tried
                    return [2 /*return*/, null];
                    case 9: return [2 /*return*/];
                }
            });
        }); }, Promise.resolve(null));
    };
    RoutingConnectionProvider.prototype._createSessionForRediscovery = function (routerAddress, bookmark) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, connectionProvider, protocolVersion, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this._connectionPool.acquire(routerAddress)];
                    case 1:
                        connection = _a.sent();
                        connectionProvider = new connection_provider_single_1.default(connection);
                        protocolVersion = connection.protocol().version;
                        if (protocolVersion < 4.0) {
                            return [2 /*return*/, new neo4j_driver_core_1.Session({
                                    mode: WRITE,
                                    bookmark: Bookmark.empty(),
                                    connectionProvider: connectionProvider
                                })];
                        }
                        return [2 /*return*/, new neo4j_driver_core_1.Session({
                                mode: READ,
                                database: SYSTEM_DB_NAME,
                                bookmark: bookmark,
                                connectionProvider: connectionProvider
                            })];
                    case 2:
                        error_4 = _a.sent();
                        // unable to acquire connection towards the given router
                        if (error_4 && error_4.code === UNAUTHORIZED_ERROR_CODE) {
                            // auth error and not finding system database is a sign of a configuration issue
                            // discovery should not proceed
                            throw error_4;
                        }
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    RoutingConnectionProvider.prototype._applyRoutingTableIfPossible = function (currentRoutingTable, newRoutingTable) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!newRoutingTable) {
                            // none of routing servers returned valid routing table, throw exception
                            throw neo4j_driver_core_1.newError("Could not perform discovery. No routing servers available. Known routing table: " + currentRoutingTable, SERVICE_UNAVAILABLE);
                        }
                        if (newRoutingTable.writers.length === 0) {
                            // use seed router next time. this is important when cluster is partitioned. it tries to make sure driver
                            // does not always get routing table without writers because it talks exclusively to a minority partition
                            this._useSeedRouter = true;
                        }
                        return [4 /*yield*/, this._updateRoutingTable(newRoutingTable)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, newRoutingTable];
                }
            });
        });
    };
    RoutingConnectionProvider.prototype._updateRoutingTable = function (newRoutingTable) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // close old connections to servers not present in the new routing table
                    return [4 /*yield*/, this._connectionPool.keepAll(newRoutingTable.allServers())];
                    case 1:
                        // close old connections to servers not present in the new routing table
                        _a.sent();
                        this._routingTableRegistry.removeExpired();
                        this._routingTableRegistry.register(newRoutingTable.database, newRoutingTable);
                        this._log.info("Updated routing table " + newRoutingTable);
                        return [2 /*return*/];
                }
            });
        });
    };
    RoutingConnectionProvider._forgetRouter = function (routingTable, routersArray, routerIndex) {
        var address = routersArray[routerIndex];
        if (routingTable && address) {
            routingTable.forgetRouter(address);
        }
    };
    return RoutingConnectionProvider;
}(connection_provider_pooled_1.default));
exports.default = RoutingConnectionProvider;
/**
 * Responsible for keeping track of the existing routing tables
 */
var RoutingTableRegistry = /** @class */ (function () {
    /**
     * Constructor
     * @param {int} routingTablePurgeDelay The routing table purge delay
     */
    function RoutingTableRegistry(routingTablePurgeDelay) {
        this._tables = new Map();
        this._routingTablePurgeDelay = routingTablePurgeDelay;
    }
    /**
     * Put a routing table in the registry
     *
     * @param {string} database The database name
     * @param {RoutingTable} table The routing table
     * @returns {RoutingTableRegistry} this
     */
    RoutingTableRegistry.prototype.register = function (database, table) {
        this._tables.set(database, table);
        return this;
    };
    /**
     * Apply function in the routing table for an specific database. If the database name is not defined, the function will
     * be applied for each element
     *
     * @param {string} database The database name
     * @param {object} callbacks The actions
     * @param {function (RoutingTable)} callbacks.applyWhenExists Call when the db exists or when the database property is not informed
     * @param {function ()} callbacks.applyWhenDontExists Call when the database doesn't have the routing table registred
     * @returns {RoutingTableRegistry} this
     */
    RoutingTableRegistry.prototype.apply = function (database, _a) {
        var _b = _a === void 0 ? {} : _a, applyWhenExists = _b.applyWhenExists, _c = _b.applyWhenDontExists, applyWhenDontExists = _c === void 0 ? function () { } : _c;
        if (this._tables.has(database)) {
            applyWhenExists(this._tables.get(database));
        }
        else if (typeof database === 'string' || database === null) {
            applyWhenDontExists();
        }
        else {
            this._forEach(applyWhenExists);
        }
        return this;
    };
    /**
     * Retrieves a routing table from a given database name
     * @param {string} database The database name
     * @param {function()|RoutingTable} defaultSupplier The routing table supplier, if it's not a function or not exists, it will return itself as default value
     * @returns {RoutingTable} The routing table for the respective database
     */
    RoutingTableRegistry.prototype.get = function (database, defaultSupplier) {
        if (this._tables.has(database)) {
            return this._tables.get(database);
        }
        return typeof defaultSupplier === 'function'
            ? defaultSupplier()
            : defaultSupplier;
    };
    /**
     * Remove the routing table which is already expired
     * @returns {RoutingTableRegistry} this
     */
    RoutingTableRegistry.prototype.removeExpired = function () {
        var _this = this;
        return this._removeIf(function (value) {
            return value.isExpiredFor(_this._routingTablePurgeDelay);
        });
    };
    RoutingTableRegistry.prototype._forEach = function (apply) {
        var e_1, _a;
        try {
            for (var _b = __values(this._tables), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), value = _d[1];
                apply(value);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return this;
    };
    RoutingTableRegistry.prototype._remove = function (key) {
        this._tables.delete(key);
        return this;
    };
    RoutingTableRegistry.prototype._removeIf = function (predicate) {
        var e_2, _a;
        try {
            for (var _b = __values(this._tables), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), key = _d[0], value = _d[1];
                if (predicate(value)) {
                    this._remove(key);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return this;
    };
    return RoutingTableRegistry;
}());

},{"../channel":26,"../connection":36,"../load-balancing":38,"../rediscovery":49,"./connection-provider-pooled":28,"./connection-provider-single":30,"neo4j-driver-core":58}],30:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var neo4j_driver_core_1 = require("neo4j-driver-core");
var SingleConnectionProvider = /** @class */ (function (_super) {
    __extends(SingleConnectionProvider, _super);
    function SingleConnectionProvider(connection) {
        var _this = _super.call(this) || this;
        _this._connection = connection;
        return _this;
    }
    /**
     * See {@link ConnectionProvider} for more information about this method and
     * its arguments.
     */
    SingleConnectionProvider.prototype.acquireConnection = function (_a) {
        var _b = _a === void 0 ? {} : _a, accessMode = _b.accessMode, database = _b.database, bookmarks = _b.bookmarks;
        var connection = this._connection;
        this._connection = null;
        return Promise.resolve(connection);
    };
    return SingleConnectionProvider;
}(neo4j_driver_core_1.ConnectionProvider));
exports.default = SingleConnectionProvider;

},{"neo4j-driver-core":58}],31:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingConnectionProvider = exports.DirectConnectionProvider = exports.PooledConnectionProvider = exports.SingleConnectionProvider = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var connection_provider_single_1 = require("./connection-provider-single");
Object.defineProperty(exports, "SingleConnectionProvider", { enumerable: true, get: function () { return __importDefault(connection_provider_single_1).default; } });
var connection_provider_pooled_1 = require("./connection-provider-pooled");
Object.defineProperty(exports, "PooledConnectionProvider", { enumerable: true, get: function () { return __importDefault(connection_provider_pooled_1).default; } });
var connection_provider_direct_1 = require("./connection-provider-direct");
Object.defineProperty(exports, "DirectConnectionProvider", { enumerable: true, get: function () { return __importDefault(connection_provider_direct_1).default; } });
var connection_provider_routing_1 = require("./connection-provider-routing");
Object.defineProperty(exports, "RoutingConnectionProvider", { enumerable: true, get: function () { return __importDefault(connection_provider_routing_1).default; } });

},{"./connection-provider-direct":27,"./connection-provider-pooled":28,"./connection-provider-routing":29,"./connection-provider-single":30}],32:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChannelConnection = void 0;
var channel_1 = require("../channel");
var neo4j_driver_core_1 = require("neo4j-driver-core");
var connection_1 = __importDefault(require("./connection"));
var bolt_1 = __importDefault(require("../bolt"));
var PROTOCOL_ERROR = neo4j_driver_core_1.error.PROTOCOL_ERROR;
var Logger = neo4j_driver_core_1.internal.logger.Logger;
var idGenerator = 0;
/**
 * Crete new connection to the provided address. Returned connection is not connected.
 * @param {ServerAddress} address - the Bolt endpoint to connect to.
 * @param {Object} config - the driver configuration.
 * @param {ConnectionErrorHandler} errorHandler - the error handler for connection errors.
 * @param {Logger} log - configured logger.
 * @return {Connection} - new connection.
 */
function createChannelConnection(address, config, errorHandler, log, serversideRouting, createChannel) {
    if (serversideRouting === void 0) { serversideRouting = null; }
    if (createChannel === void 0) { createChannel = function (channelConfig) { return new channel_1.Channel(channelConfig); }; }
    var channelConfig = new channel_1.ChannelConfig(address, config, errorHandler.errorCode());
    var channel = createChannel(channelConfig);
    return bolt_1.default.handshake(channel)
        .then(function (_a) {
        var version = _a.protocolVersion, consumeRemainingBuffer = _a.consumeRemainingBuffer;
        var chunker = new channel_1.Chunker(channel);
        var dechunker = new channel_1.Dechunker();
        var createProtocol = function (conn) {
            return bolt_1.default.create({
                version: version,
                channel: channel,
                chunker: chunker,
                dechunker: dechunker,
                disableLosslessIntegers: config.disableLosslessIntegers,
                useBigInt: config.useBigInt,
                serversideRouting: serversideRouting,
                server: conn.server,
                log: conn.logger,
                observer: {
                    onError: conn._handleFatalError.bind(conn),
                    onFailure: conn._resetOnFailure.bind(conn),
                    onProtocolError: conn._handleProtocolError.bind(conn),
                    onErrorApplyTransformation: function (error) {
                        return conn.handleAndTransformError(error, conn._address);
                    }
                }
            });
        };
        var connection = new ChannelConnection(channel, errorHandler, address, log, config.disableLosslessIntegers, serversideRouting, chunker, createProtocol);
        // forward all pending bytes to the dechunker
        consumeRemainingBuffer(function (buffer) { return dechunker.write(buffer); });
        return connection;
    })
        .catch(function (reason) {
        return channel.close().then(function () {
            throw reason;
        });
    });
}
exports.createChannelConnection = createChannelConnection;
var ChannelConnection = /** @class */ (function (_super) {
    __extends(ChannelConnection, _super);
    /**
     * @constructor
     * @param {Channel} channel - channel with a 'write' function and a 'onmessage' callback property.
     * @param {ConnectionErrorHandler} errorHandler the error handler.
     * @param {ServerAddress} address - the server address to connect to.
     * @param {Logger} log - the configured logger.
     * @param {boolean} disableLosslessIntegers if this connection should convert all received integers to native JS numbers.
     * @param {Chunker} chunker the chunker
     * @param protocolSupplier Bolt protocol supplier
     */
    function ChannelConnection(channel, errorHandler, address, log, disableLosslessIntegers, serversideRouting, chunker, // to be removed,
    protocolSupplier) {
        if (disableLosslessIntegers === void 0) { disableLosslessIntegers = false; }
        if (serversideRouting === void 0) { serversideRouting = null; }
        var _this = _super.call(this, errorHandler) || this;
        _this._id = idGenerator++;
        _this._address = address;
        _this._server = { address: address.asHostPort() };
        _this.creationTimestamp = Date.now();
        _this._disableLosslessIntegers = disableLosslessIntegers;
        _this._ch = channel;
        _this._chunker = chunker;
        _this._log = createConnectionLogger(_this, log);
        _this._serversideRouting = serversideRouting;
        // connection from the database, returned in response for HELLO message and might not be available
        _this._dbConnectionId = null;
        // bolt protocol is initially not initialized
        /**
         * @private
         * @type {BoltProtocol}
         */
        _this._protocol = protocolSupplier(_this);
        // Set to true on fatal errors, to get this out of connection pool.
        _this._isBroken = false;
        if (_this._log.isDebugEnabled()) {
            _this._log.debug("created towards " + address);
        }
        return _this;
    }
    Object.defineProperty(ChannelConnection.prototype, "id", {
        get: function () {
            return this._id;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ChannelConnection.prototype, "databaseId", {
        get: function () {
            return this._dbConnectionId;
        },
        set: function (value) {
            this._dbConnectionId = value;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Send initialization message.
     * @param {string} userAgent the user agent for this driver.
     * @param {Object} authToken the object containing auth information.
     * @return {Promise<Connection>} promise resolved with the current connection if connection is successful. Rejected promise otherwise.
     */
    ChannelConnection.prototype.connect = function (userAgent, authToken) {
        return this._initialize(userAgent, authToken);
    };
    /**
     * Perform protocol-specific initialization which includes authentication.
     * @param {string} userAgent the user agent for this driver.
     * @param {Object} authToken the object containing auth information.
     * @return {Promise<Connection>} promise resolved with the current connection if initialization is successful. Rejected promise otherwise.
     */
    ChannelConnection.prototype._initialize = function (userAgent, authToken) {
        var _this = this;
        var self = this;
        return new Promise(function (resolve, reject) {
            _this._protocol.initialize({
                userAgent: userAgent,
                authToken: authToken,
                onError: function (err) { return reject(err); },
                onComplete: function (metadata) {
                    if (metadata) {
                        // read server version from the response metadata, if it is available
                        var serverVersion = metadata.server;
                        if (!_this.version || serverVersion) {
                            _this.version = serverVersion;
                        }
                        // read database connection id from the response metadata, if it is available
                        var dbConnectionId = metadata.connection_id;
                        if (!_this.databaseId) {
                            _this.databaseId = dbConnectionId;
                        }
                        if (metadata.hints) {
                            var receiveTimeoutRaw = metadata.hints['connection.recv_timeout_seconds'];
                            if (receiveTimeoutRaw !== null &&
                                receiveTimeoutRaw !== undefined) {
                                var receiveTimeoutInSeconds = neo4j_driver_core_1.toNumber(receiveTimeoutRaw);
                                if (Number.isInteger(receiveTimeoutInSeconds) &&
                                    receiveTimeoutInSeconds > 0) {
                                    _this._ch.setupReceiveTimeout(receiveTimeoutInSeconds * 1000);
                                }
                                else {
                                    _this._log.info("Server located at " + _this._address + " supplied an invalid connection receive timeout value (" + receiveTimeoutInSeconds + "). " +
                                        'Please, verify the server configuration and status because this can be the symptom of a bigger issue.');
                                }
                            }
                        }
                    }
                    resolve(self);
                }
            });
        });
    };
    /**
     * Get the Bolt protocol for the connection.
     * @return {BoltProtocol} the protocol.
     */
    ChannelConnection.prototype.protocol = function () {
        return this._protocol;
    };
    Object.defineProperty(ChannelConnection.prototype, "address", {
        get: function () {
            return this._address;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ChannelConnection.prototype, "version", {
        /**
         * Get the version of the connected server.
         * Available only after initialization
         *
         * @returns {ServerVersion} version
         */
        get: function () {
            return this._server.version;
        },
        set: function (value) {
            this._server.version = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ChannelConnection.prototype, "server", {
        get: function () {
            return this._server;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ChannelConnection.prototype, "logger", {
        get: function () {
            return this._log;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * "Fatal" means the connection is dead. Only call this if something
     * happens that cannot be recovered from. This will lead to all subscribers
     * failing, and the connection getting ejected from the session pool.
     *
     * @param error an error object, forwarded to all current and future subscribers
     */
    ChannelConnection.prototype._handleFatalError = function (error) {
        this._isBroken = true;
        this._error = this.handleAndTransformError(error, this._address);
        if (this._log.isErrorEnabled()) {
            this._log.error("experienced a fatal error " + neo4j_driver_core_1.json.stringify(this._error));
        }
        this._protocol.notifyFatalError(this._error);
    };
    /**
     * This method still here because it's used by the {@link PooledConnectionProvider}
     *
     * @param {any} observer
     */
    ChannelConnection.prototype._queueObserver = function (observer) {
        return this._protocol.queueObserverIfProtocolIsNotBroken(observer);
    };
    ChannelConnection.prototype.hasOngoingObservableRequests = function () {
        return this._protocol.hasOngoingObservableRequests();
    };
    /**
     * Send a RESET-message to the database. Message is immediately flushed to the network.
     * @return {Promise<void>} promise resolved when SUCCESS-message response arrives, or failed when other response messages arrives.
     */
    ChannelConnection.prototype.resetAndFlush = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._protocol.reset({
                onError: function (error) {
                    if (_this._isBroken) {
                        // handling a fatal error, no need to raise a protocol violation
                        reject(error);
                    }
                    else {
                        var neo4jError = _this._handleProtocolError('Received FAILURE as a response for RESET: ' + error);
                        reject(neo4jError);
                    }
                },
                onComplete: function () {
                    resolve();
                }
            });
        });
    };
    ChannelConnection.prototype._resetOnFailure = function () {
        var _this = this;
        this._protocol.reset({
            onError: function () {
                _this._protocol.resetFailure();
            },
            onComplete: function () {
                _this._protocol.resetFailure();
            }
        });
    };
    /*
     * Pop next pending observer form the list of observers and make it current observer.
     * @protected
     */
    ChannelConnection.prototype._updateCurrentObserver = function () {
        this._protocol.updateCurrentObserver();
    };
    /** Check if this connection is in working condition */
    ChannelConnection.prototype.isOpen = function () {
        return !this._isBroken && this._ch._open;
    };
    /**
     * Call close on the channel.
     * @returns {Promise<void>} - A promise that will be resolved when the underlying channel is closed.
     */
    ChannelConnection.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this._log.isDebugEnabled()) {
                            this._log.debug('closing');
                        }
                        if (this._protocol && this.isOpen()) {
                            // protocol has been initialized and this connection is healthy
                            // notify the database about the upcoming close of the connection
                            this._protocol.prepareToClose();
                        }
                        return [4 /*yield*/, this._ch.close()];
                    case 1:
                        _a.sent();
                        if (this._log.isDebugEnabled()) {
                            this._log.debug('closed');
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    ChannelConnection.prototype.toString = function () {
        return "Connection [" + this.id + "][" + (this.databaseId || '') + "]";
    };
    ChannelConnection.prototype._handleProtocolError = function (message) {
        this._protocol.resetFailure();
        this._updateCurrentObserver();
        var error = neo4j_driver_core_1.newError(message, PROTOCOL_ERROR);
        this._handleFatalError(error);
        return error;
    };
    return ChannelConnection;
}(connection_1.default));
exports.default = ChannelConnection;
/**
 * Creates a log with the connection info as prefix
 * @param {Connection} connection The connection
 * @param {Logger} logger The logger
 * @returns {Logger} The new logger with enriched messages
 */
function createConnectionLogger(connection, logger) {
    return new Logger(logger._level, function (level, message) {
        return logger._loggerFunction(level, connection + " " + message);
    });
}

},{"../bolt":11,"../channel":26,"./connection":35,"neo4j-driver-core":58}],33:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var connection_1 = __importDefault(require("./connection"));
var DelegateConnection = /** @class */ (function (_super) {
    __extends(DelegateConnection, _super);
    /**
     * @param delegate {Connection} the delegated connection
     * @param errorHandler {ConnectionErrorHandler} the error handler
     */
    function DelegateConnection(delegate, errorHandler) {
        var _this = _super.call(this, errorHandler) || this;
        if (errorHandler) {
            _this._originalErrorHandler = delegate._errorHandler;
            delegate._errorHandler = _this._errorHandler;
        }
        _this._delegate = delegate;
        return _this;
    }
    Object.defineProperty(DelegateConnection.prototype, "id", {
        get: function () {
            return this._delegate.id;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DelegateConnection.prototype, "databaseId", {
        get: function () {
            return this._delegate.databaseId;
        },
        set: function (value) {
            this._delegate.databaseId = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DelegateConnection.prototype, "server", {
        get: function () {
            return this._delegate.server;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DelegateConnection.prototype, "address", {
        get: function () {
            return this._delegate.address;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DelegateConnection.prototype, "version", {
        get: function () {
            return this._delegate.version;
        },
        set: function (value) {
            this._delegate.version = value;
        },
        enumerable: false,
        configurable: true
    });
    DelegateConnection.prototype.isOpen = function () {
        return this._delegate.isOpen();
    };
    DelegateConnection.prototype.protocol = function () {
        return this._delegate.protocol();
    };
    DelegateConnection.prototype.connect = function (userAgent, authToken) {
        return this._delegate.connect(userAgent, authToken);
    };
    DelegateConnection.prototype.write = function (message, observer, flush) {
        return this._delegate.write(message, observer, flush);
    };
    DelegateConnection.prototype.resetAndFlush = function () {
        return this._delegate.resetAndFlush();
    };
    DelegateConnection.prototype.close = function () {
        return this._delegate.close();
    };
    DelegateConnection.prototype._release = function () {
        if (this._originalErrorHandler) {
            this._delegate._errorHandler = this._originalErrorHandler;
        }
        return this._delegate._release();
    };
    return DelegateConnection;
}(connection_1.default));
exports.default = DelegateConnection;

},{"./connection":35}],34:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var neo4j_driver_core_1 = require("neo4j-driver-core");
var SERVICE_UNAVAILABLE = neo4j_driver_core_1.error.SERVICE_UNAVAILABLE, SESSION_EXPIRED = neo4j_driver_core_1.error.SESSION_EXPIRED;
var ConnectionErrorHandler = /** @class */ (function () {
    function ConnectionErrorHandler(errorCode, handleUnavailability, handleWriteFailure, handleAuthorizationExpired) {
        this._errorCode = errorCode;
        this._handleUnavailability = handleUnavailability || noOpHandler;
        this._handleWriteFailure = handleWriteFailure || noOpHandler;
        this._handleAuthorizationExpired = handleAuthorizationExpired || noOpHandler;
    }
    ConnectionErrorHandler.create = function (_a) {
        var errorCode = _a.errorCode, handleUnavailability = _a.handleUnavailability, handleWriteFailure = _a.handleWriteFailure, handleAuthorizationExpired = _a.handleAuthorizationExpired;
        return new ConnectionErrorHandler(errorCode, handleUnavailability, handleWriteFailure, handleAuthorizationExpired);
    };
    /**
     * Error code to use for network errors.
     * @return {string} the error code.
     */
    ConnectionErrorHandler.prototype.errorCode = function () {
        return this._errorCode;
    };
    /**
     * Handle and transform the error.
     * @param {Neo4jError} error the original error.
     * @param {ServerAddress} address the address of the connection where the error happened.
     * @return {Neo4jError} new error that should be propagated to the user.
     */
    ConnectionErrorHandler.prototype.handleAndTransformError = function (error, address) {
        if (isAutorizationExpiredError(error)) {
            return this._handleAuthorizationExpired(error, address);
        }
        if (isAvailabilityError(error)) {
            return this._handleUnavailability(error, address);
        }
        if (isFailureToWrite(error)) {
            return this._handleWriteFailure(error, address);
        }
        return error;
    };
    return ConnectionErrorHandler;
}());
exports.default = ConnectionErrorHandler;
function isAutorizationExpiredError(error) {
    return error && error.code === 'Neo.ClientError.Security.AuthorizationExpired';
}
function isAvailabilityError(error) {
    if (error) {
        return (error.code === SESSION_EXPIRED ||
            error.code === SERVICE_UNAVAILABLE ||
            error.code === 'Neo.TransientError.General.DatabaseUnavailable');
    }
    return false;
}
function isFailureToWrite(error) {
    if (error) {
        return (error.code === 'Neo.ClientError.Cluster.NotALeader' ||
            error.code === 'Neo.ClientError.General.ForbiddenOnReadOnlyDatabase');
    }
    return false;
}
function noOpHandler(error) {
    return error;
}

},{"neo4j-driver-core":58}],35:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var Connection = /** @class */ (function () {
    /**
     * @param {ConnectionErrorHandler} errorHandler the error handler
     */
    function Connection(errorHandler) {
        this._errorHandler = errorHandler;
    }
    Object.defineProperty(Connection.prototype, "id", {
        get: function () {
            throw new Error('not implemented');
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Connection.prototype, "databaseId", {
        get: function () {
            throw new Error('not implemented');
        },
        set: function (value) {
            throw new Error('not implemented');
        },
        enumerable: false,
        configurable: true
    });
    /**
     * @returns {boolean} whether this connection is in a working condition
     */
    Connection.prototype.isOpen = function () {
        throw new Error('not implemented');
    };
    /**
     * @returns {BoltProtocol} the underlying bolt protocol assigned to this connection
     */
    Connection.prototype.protocol = function () {
        throw new Error('not implemented');
    };
    Object.defineProperty(Connection.prototype, "address", {
        /**
         * @returns {ServerAddress} the server address this connection is opened against
         */
        get: function () {
            throw new Error('not implemented');
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Connection.prototype, "version", {
        /**
         * @returns {ServerVersion} the version of the server this connection is connected to
         */
        get: function () {
            throw new Error('not implemented');
        },
        set: function (value) {
            throw new Error('not implemented');
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Connection.prototype, "server", {
        get: function () {
            throw new Error('not implemented');
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Connect to the target address, negotiate Bolt protocol and send initialization message.
     * @param {string} userAgent the user agent for this driver.
     * @param {Object} authToken the object containing auth information.
     * @return {Promise<Connection>} promise resolved with the current connection if connection is successful. Rejected promise otherwise.
     */
    Connection.prototype.connect = function (userAgent, authToken) {
        throw new Error('not implemented');
    };
    /**
     * Write a message to the network channel.
     * @param {RequestMessage} message the message to write.
     * @param {ResultStreamObserver} observer the response observer.
     * @param {boolean} flush `true` if flush should happen after the message is written to the buffer.
     */
    Connection.prototype.write = function (message, observer, flush) {
        throw new Error('not implemented');
    };
    /**
     * Send a RESET-message to the database. Message is immediately flushed to the network.
     * @return {Promise<void>} promise resolved when SUCCESS-message response arrives, or failed when other response messages arrives.
     */
    Connection.prototype.resetAndFlush = function () {
        throw new Error('not implemented');
    };
    /**
     * Call close on the channel.
     * @returns {Promise<void>} - A promise that will be resolved when the connection is closed.
     *
     */
    Connection.prototype.close = function () {
        throw new Error('not implemented');
    };
    /**
     *
     * @param error
     * @param address
     * @returns {Neo4jError|*}
     */
    Connection.prototype.handleAndTransformError = function (error, address) {
        if (this._errorHandler) {
            return this._errorHandler.handleAndTransformError(error, address);
        }
        return error;
    };
    return Connection;
}());
exports.default = Connection;

},{}],36:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChannelConnection = exports.ConnectionErrorHandler = exports.DelegateConnection = exports.ChannelConnection = exports.Connection = void 0;
var connection_1 = __importDefault(require("./connection"));
exports.Connection = connection_1.default;
var connection_channel_1 = __importStar(require("./connection-channel"));
exports.ChannelConnection = connection_channel_1.default;
Object.defineProperty(exports, "createChannelConnection", { enumerable: true, get: function () { return connection_channel_1.createChannelConnection; } });
var connection_delegate_1 = __importDefault(require("./connection-delegate"));
exports.DelegateConnection = connection_delegate_1.default;
var connection_error_handler_1 = __importDefault(require("./connection-error-handler"));
exports.ConnectionErrorHandler = connection_error_handler_1.default;
exports.default = connection_1.default;

},{"./connection":35,"./connection-channel":32,"./connection-delegate":33,"./connection-error-handler":34}],37:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.packstream = exports.channel = exports.buf = exports.bolt = exports.loadBalancing = void 0;
exports.loadBalancing = __importStar(require("./load-balancing"));
exports.bolt = __importStar(require("./bolt"));
exports.buf = __importStar(require("./buf"));
exports.channel = __importStar(require("./channel"));
exports.packstream = __importStar(require("./packstream"));
exports.pool = __importStar(require("./pool"));
__exportStar(require("./connection-provider"), exports);

},{"./bolt":11,"./buf":17,"./channel":26,"./connection-provider":31,"./load-balancing":38,"./packstream":42,"./pool":46}],38:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeastConnectedLoadBalancingStrategy = exports.LoadBalancingStrategy = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var load_balancing_strategy_1 = __importDefault(require("./load-balancing-strategy"));
exports.LoadBalancingStrategy = load_balancing_strategy_1.default;
var least_connected_load_balancing_strategy_1 = __importDefault(require("./least-connected-load-balancing-strategy"));
exports.LeastConnectedLoadBalancingStrategy = least_connected_load_balancing_strategy_1.default;
exports.default = least_connected_load_balancing_strategy_1.default;

},{"./least-connected-load-balancing-strategy":39,"./load-balancing-strategy":40}],39:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var round_robin_array_index_1 = __importDefault(require("./round-robin-array-index"));
var load_balancing_strategy_1 = __importDefault(require("./load-balancing-strategy"));
var LeastConnectedLoadBalancingStrategy = /** @class */ (function (_super) {
    __extends(LeastConnectedLoadBalancingStrategy, _super);
    /**
     * @constructor
     * @param {Pool} connectionPool the connection pool of this driver.
     */
    function LeastConnectedLoadBalancingStrategy(connectionPool) {
        var _this = _super.call(this) || this;
        _this._readersIndex = new round_robin_array_index_1.default();
        _this._writersIndex = new round_robin_array_index_1.default();
        _this._connectionPool = connectionPool;
        return _this;
    }
    /**
     * @inheritDoc
     */
    LeastConnectedLoadBalancingStrategy.prototype.selectReader = function (knownReaders) {
        return this._select(knownReaders, this._readersIndex);
    };
    /**
     * @inheritDoc
     */
    LeastConnectedLoadBalancingStrategy.prototype.selectWriter = function (knownWriters) {
        return this._select(knownWriters, this._writersIndex);
    };
    LeastConnectedLoadBalancingStrategy.prototype._select = function (addresses, roundRobinIndex) {
        var length = addresses.length;
        if (length === 0) {
            return null;
        }
        // choose start index for iteration in round-robin fashion
        var startIndex = roundRobinIndex.next(length);
        var index = startIndex;
        var leastConnectedAddress = null;
        var leastActiveConnections = Number.MAX_SAFE_INTEGER;
        // iterate over the array to find least connected address
        do {
            var address = addresses[index];
            var activeConnections = this._connectionPool.activeResourceCount(address);
            if (activeConnections < leastActiveConnections) {
                leastConnectedAddress = address;
                leastActiveConnections = activeConnections;
            }
            // loop over to the start of the array when end is reached
            if (index === length - 1) {
                index = 0;
            }
            else {
                index++;
            }
        } while (index !== startIndex);
        return leastConnectedAddress;
    };
    return LeastConnectedLoadBalancingStrategy;
}(load_balancing_strategy_1.default));
exports.default = LeastConnectedLoadBalancingStrategy;

},{"./load-balancing-strategy":40,"./round-robin-array-index":41}],40:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A facility to select most appropriate reader or writer among the given addresses for request processing.
 */
var LoadBalancingStrategy = /** @class */ (function () {
    function LoadBalancingStrategy() {
    }
    /**
     * Select next most appropriate reader from the list of given readers.
     * @param {string[]} knownReaders an array of currently known readers to select from.
     * @return {string} most appropriate reader or `null` if given array is empty.
     */
    LoadBalancingStrategy.prototype.selectReader = function (knownReaders) {
        throw new Error('Abstract function');
    };
    /**
     * Select next most appropriate writer from the list of given writers.
     * @param {string[]} knownWriters an array of currently known writers to select from.
     * @return {string} most appropriate writer or `null` if given array is empty.
     */
    LoadBalancingStrategy.prototype.selectWriter = function (knownWriters) {
        throw new Error('Abstract function');
    };
    return LoadBalancingStrategy;
}());
exports.default = LoadBalancingStrategy;

},{}],41:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var RoundRobinArrayIndex = /** @class */ (function () {
    /**
     * @constructor
     * @param {number} [initialOffset=0] the initial offset for round robin.
     */
    function RoundRobinArrayIndex(initialOffset) {
        this._offset = initialOffset || 0;
    }
    /**
     * Get next index for an array with given length.
     * @param {number} arrayLength the array length.
     * @return {number} index in the array.
     */
    RoundRobinArrayIndex.prototype.next = function (arrayLength) {
        if (arrayLength === 0) {
            return -1;
        }
        var nextOffset = this._offset;
        this._offset += 1;
        if (this._offset === Number.MAX_SAFE_INTEGER) {
            this._offset = 0;
        }
        return nextOffset % arrayLength;
    };
    return RoundRobinArrayIndex;
}());
exports.default = RoundRobinArrayIndex;

},{}],42:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.v2 = exports.v1 = void 0;
var v1 = __importStar(require("./packstream-v1"));
exports.v1 = v1;
var v2 = __importStar(require("./packstream-v2"));
exports.v2 = v2;
exports.default = v2;

},{"./packstream-v1":43,"./packstream-v2":44}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Structure = exports.Unpacker = exports.Packer = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var channel_1 = require("../channel");
var neo4j_driver_core_1 = require("neo4j-driver-core");
var PROTOCOL_ERROR = neo4j_driver_core_1.error.PROTOCOL_ERROR;
var TINY_STRING = 0x80;
var TINY_LIST = 0x90;
var TINY_MAP = 0xa0;
var TINY_STRUCT = 0xb0;
var NULL = 0xc0;
var FLOAT_64 = 0xc1;
var FALSE = 0xc2;
var TRUE = 0xc3;
var INT_8 = 0xc8;
var INT_16 = 0xc9;
var INT_32 = 0xca;
var INT_64 = 0xcb;
var STRING_8 = 0xd0;
var STRING_16 = 0xd1;
var STRING_32 = 0xd2;
var LIST_8 = 0xd4;
var LIST_16 = 0xd5;
var LIST_32 = 0xd6;
var BYTES_8 = 0xcc;
var BYTES_16 = 0xcd;
var BYTES_32 = 0xce;
var MAP_8 = 0xd8;
var MAP_16 = 0xd9;
var MAP_32 = 0xda;
var STRUCT_8 = 0xdc;
var STRUCT_16 = 0xdd;
var NODE = 0x4e;
var NODE_STRUCT_SIZE = 3;
var RELATIONSHIP = 0x52;
var RELATIONSHIP_STRUCT_SIZE = 5;
var UNBOUND_RELATIONSHIP = 0x72;
var UNBOUND_RELATIONSHIP_STRUCT_SIZE = 3;
var PATH = 0x50;
var PATH_STRUCT_SIZE = 3;
/**
 * A Structure have a signature and fields.
 * @access private
 */
var Structure = /** @class */ (function () {
    /**
     * Create new instance
     */
    function Structure(signature, fields) {
        this.signature = signature;
        this.fields = fields;
    }
    Structure.prototype.toString = function () {
        var fieldStr = '';
        for (var i = 0; i < this.fields.length; i++) {
            if (i > 0) {
                fieldStr += ', ';
            }
            fieldStr += this.fields[i];
        }
        return 'Structure(' + this.signature + ', [' + fieldStr + '])';
    };
    return Structure;
}());
exports.Structure = Structure;
/**
 * Class to pack
 * @access private
 */
var Packer = /** @class */ (function () {
    /**
     * @constructor
     * @param {Chunker} channel the chunker backed by a network channel.
     */
    function Packer(channel) {
        this._ch = channel;
        this._byteArraysSupported = true;
    }
    /**
     * Creates a packable function out of the provided value
     * @param x the value to pack
     * @returns Function
     */
    Packer.prototype.packable = function (x) {
        var _this = this;
        if (x === null) {
            return function () { return _this._ch.writeUInt8(NULL); };
        }
        else if (x === true) {
            return function () { return _this._ch.writeUInt8(TRUE); };
        }
        else if (x === false) {
            return function () { return _this._ch.writeUInt8(FALSE); };
        }
        else if (typeof x === 'number') {
            return function () { return _this.packFloat(x); };
        }
        else if (typeof x === 'string') {
            return function () { return _this.packString(x); };
        }
        else if (typeof x === 'bigint') {
            return function () { return _this.packInteger(neo4j_driver_core_1.int(x)); };
        }
        else if (neo4j_driver_core_1.isInt(x)) {
            return function () { return _this.packInteger(x); };
        }
        else if (x instanceof Int8Array) {
            return function () { return _this.packBytes(x); };
        }
        else if (x instanceof Array) {
            return function () {
                _this.packListHeader(x.length);
                for (var i_1 = 0; i_1 < x.length; i_1++) {
                    _this.packable(x[i_1] === undefined ? null : x[i_1])();
                }
            };
        }
        else if (isIterable(x)) {
            return this.packableIterable(x);
        }
        else if (x instanceof neo4j_driver_core_1.Node) {
            return this._nonPackableValue("It is not allowed to pass nodes in query parameters, given: " + x);
        }
        else if (x instanceof neo4j_driver_core_1.Relationship) {
            return this._nonPackableValue("It is not allowed to pass relationships in query parameters, given: " + x);
        }
        else if (x instanceof neo4j_driver_core_1.Path) {
            return this._nonPackableValue("It is not allowed to pass paths in query parameters, given: " + x);
        }
        else if (x instanceof Structure) {
            var packableFields = [];
            for (var i = 0; i < x.fields.length; i++) {
                packableFields[i] = this.packable(x.fields[i]);
            }
            return function () { return _this.packStruct(x.signature, packableFields); };
        }
        else if (typeof x === 'object') {
            return function () {
                var keys = Object.keys(x);
                var count = 0;
                for (var i_2 = 0; i_2 < keys.length; i_2++) {
                    if (x[keys[i_2]] !== undefined) {
                        count++;
                    }
                }
                _this.packMapHeader(count);
                for (var i_3 = 0; i_3 < keys.length; i_3++) {
                    var key = keys[i_3];
                    if (x[key] !== undefined) {
                        _this.packString(key);
                        _this.packable(x[key])();
                    }
                }
            };
        }
        else {
            return this._nonPackableValue("Unable to pack the given value: " + x);
        }
    };
    Packer.prototype.packableIterable = function (iterable) {
        try {
            var array = Array.from(iterable);
            return this.packable(array);
        }
        catch (e) {
            // handle errors from iterable to array conversion
            throw neo4j_driver_core_1.newError("Cannot pack given iterable, " + e.message + ": " + iterable);
        }
    };
    /**
     * Packs a struct
     * @param signature the signature of the struct
     * @param packableFields the fields of the struct, make sure you call `packable on all fields`
     */
    Packer.prototype.packStruct = function (signature, packableFields) {
        packableFields = packableFields || [];
        this.packStructHeader(packableFields.length, signature);
        for (var i = 0; i < packableFields.length; i++) {
            packableFields[i]();
        }
    };
    Packer.prototype.packInteger = function (x) {
        var high = x.high;
        var low = x.low;
        if (x.greaterThanOrEqual(-0x10) && x.lessThan(0x80)) {
            this._ch.writeInt8(low);
        }
        else if (x.greaterThanOrEqual(-0x80) && x.lessThan(-0x10)) {
            this._ch.writeUInt8(INT_8);
            this._ch.writeInt8(low);
        }
        else if (x.greaterThanOrEqual(-0x8000) && x.lessThan(0x8000)) {
            this._ch.writeUInt8(INT_16);
            this._ch.writeInt16(low);
        }
        else if (x.greaterThanOrEqual(-0x80000000) && x.lessThan(0x80000000)) {
            this._ch.writeUInt8(INT_32);
            this._ch.writeInt32(low);
        }
        else {
            this._ch.writeUInt8(INT_64);
            this._ch.writeInt32(high);
            this._ch.writeInt32(low);
        }
    };
    Packer.prototype.packFloat = function (x) {
        this._ch.writeUInt8(FLOAT_64);
        this._ch.writeFloat64(x);
    };
    Packer.prototype.packString = function (x) {
        var bytes = channel_1.utf8.encode(x);
        var size = bytes.length;
        if (size < 0x10) {
            this._ch.writeUInt8(TINY_STRING | size);
            this._ch.writeBytes(bytes);
        }
        else if (size < 0x100) {
            this._ch.writeUInt8(STRING_8);
            this._ch.writeUInt8(size);
            this._ch.writeBytes(bytes);
        }
        else if (size < 0x10000) {
            this._ch.writeUInt8(STRING_16);
            this._ch.writeUInt8((size / 256) >> 0);
            this._ch.writeUInt8(size % 256);
            this._ch.writeBytes(bytes);
        }
        else if (size < 0x100000000) {
            this._ch.writeUInt8(STRING_32);
            this._ch.writeUInt8(((size / 16777216) >> 0) % 256);
            this._ch.writeUInt8(((size / 65536) >> 0) % 256);
            this._ch.writeUInt8(((size / 256) >> 0) % 256);
            this._ch.writeUInt8(size % 256);
            this._ch.writeBytes(bytes);
        }
        else {
            throw neo4j_driver_core_1.newError('UTF-8 strings of size ' + size + ' are not supported');
        }
    };
    Packer.prototype.packListHeader = function (size) {
        if (size < 0x10) {
            this._ch.writeUInt8(TINY_LIST | size);
        }
        else if (size < 0x100) {
            this._ch.writeUInt8(LIST_8);
            this._ch.writeUInt8(size);
        }
        else if (size < 0x10000) {
            this._ch.writeUInt8(LIST_16);
            this._ch.writeUInt8(((size / 256) >> 0) % 256);
            this._ch.writeUInt8(size % 256);
        }
        else if (size < 0x100000000) {
            this._ch.writeUInt8(LIST_32);
            this._ch.writeUInt8(((size / 16777216) >> 0) % 256);
            this._ch.writeUInt8(((size / 65536) >> 0) % 256);
            this._ch.writeUInt8(((size / 256) >> 0) % 256);
            this._ch.writeUInt8(size % 256);
        }
        else {
            throw neo4j_driver_core_1.newError('Lists of size ' + size + ' are not supported');
        }
    };
    Packer.prototype.packBytes = function (array) {
        if (this._byteArraysSupported) {
            this.packBytesHeader(array.length);
            for (var i = 0; i < array.length; i++) {
                this._ch.writeInt8(array[i]);
            }
        }
        else {
            throw neo4j_driver_core_1.newError('Byte arrays are not supported by the database this driver is connected to');
        }
    };
    Packer.prototype.packBytesHeader = function (size) {
        if (size < 0x100) {
            this._ch.writeUInt8(BYTES_8);
            this._ch.writeUInt8(size);
        }
        else if (size < 0x10000) {
            this._ch.writeUInt8(BYTES_16);
            this._ch.writeUInt8(((size / 256) >> 0) % 256);
            this._ch.writeUInt8(size % 256);
        }
        else if (size < 0x100000000) {
            this._ch.writeUInt8(BYTES_32);
            this._ch.writeUInt8(((size / 16777216) >> 0) % 256);
            this._ch.writeUInt8(((size / 65536) >> 0) % 256);
            this._ch.writeUInt8(((size / 256) >> 0) % 256);
            this._ch.writeUInt8(size % 256);
        }
        else {
            throw neo4j_driver_core_1.newError('Byte arrays of size ' + size + ' are not supported');
        }
    };
    Packer.prototype.packMapHeader = function (size) {
        if (size < 0x10) {
            this._ch.writeUInt8(TINY_MAP | size);
        }
        else if (size < 0x100) {
            this._ch.writeUInt8(MAP_8);
            this._ch.writeUInt8(size);
        }
        else if (size < 0x10000) {
            this._ch.writeUInt8(MAP_16);
            this._ch.writeUInt8((size / 256) >> 0);
            this._ch.writeUInt8(size % 256);
        }
        else if (size < 0x100000000) {
            this._ch.writeUInt8(MAP_32);
            this._ch.writeUInt8(((size / 16777216) >> 0) % 256);
            this._ch.writeUInt8(((size / 65536) >> 0) % 256);
            this._ch.writeUInt8(((size / 256) >> 0) % 256);
            this._ch.writeUInt8(size % 256);
        }
        else {
            throw neo4j_driver_core_1.newError('Maps of size ' + size + ' are not supported');
        }
    };
    Packer.prototype.packStructHeader = function (size, signature) {
        if (size < 0x10) {
            this._ch.writeUInt8(TINY_STRUCT | size);
            this._ch.writeUInt8(signature);
        }
        else if (size < 0x100) {
            this._ch.writeUInt8(STRUCT_8);
            this._ch.writeUInt8(size);
            this._ch.writeUInt8(signature);
        }
        else if (size < 0x10000) {
            this._ch.writeUInt8(STRUCT_16);
            this._ch.writeUInt8((size / 256) >> 0);
            this._ch.writeUInt8(size % 256);
        }
        else {
            throw neo4j_driver_core_1.newError('Structures of size ' + size + ' are not supported');
        }
    };
    Packer.prototype.disableByteArrays = function () {
        this._byteArraysSupported = false;
    };
    Packer.prototype._nonPackableValue = function (message) {
        return function () {
            throw neo4j_driver_core_1.newError(message, PROTOCOL_ERROR);
        };
    };
    return Packer;
}());
exports.Packer = Packer;
/**
 * Class to unpack
 * @access private
 */
var Unpacker = /** @class */ (function () {
    /**
     * @constructor
     * @param {boolean} disableLosslessIntegers if this unpacker should convert all received integers to native JS numbers.
     * @param {boolean} useBigInt if this unpacker should convert all received integers to Bigint
     */
    function Unpacker(disableLosslessIntegers, useBigInt) {
        if (disableLosslessIntegers === void 0) { disableLosslessIntegers = false; }
        if (useBigInt === void 0) { useBigInt = false; }
        this._disableLosslessIntegers = disableLosslessIntegers;
        this._useBigInt = useBigInt;
    }
    Unpacker.prototype.unpack = function (buffer) {
        var marker = buffer.readUInt8();
        var markerHigh = marker & 0xf0;
        var markerLow = marker & 0x0f;
        if (marker === NULL) {
            return null;
        }
        var boolean = this._unpackBoolean(marker);
        if (boolean !== null) {
            return boolean;
        }
        var numberOrInteger = this._unpackNumberOrInteger(marker, buffer);
        if (numberOrInteger !== null) {
            if (neo4j_driver_core_1.isInt(numberOrInteger)) {
                if (this._useBigInt) {
                    return numberOrInteger.toBigInt();
                }
                else if (this._disableLosslessIntegers) {
                    return numberOrInteger.toNumberOrInfinity();
                }
            }
            return numberOrInteger;
        }
        var string = this._unpackString(marker, markerHigh, markerLow, buffer);
        if (string !== null) {
            return string;
        }
        var list = this._unpackList(marker, markerHigh, markerLow, buffer);
        if (list !== null) {
            return list;
        }
        var byteArray = this._unpackByteArray(marker, buffer);
        if (byteArray !== null) {
            return byteArray;
        }
        var map = this._unpackMap(marker, markerHigh, markerLow, buffer);
        if (map !== null) {
            return map;
        }
        var struct = this._unpackStruct(marker, markerHigh, markerLow, buffer);
        if (struct !== null) {
            return struct;
        }
        throw neo4j_driver_core_1.newError('Unknown packed value with marker ' + marker.toString(16));
    };
    Unpacker.prototype.unpackInteger = function (buffer) {
        var marker = buffer.readUInt8();
        var result = this._unpackInteger(marker, buffer);
        if (result == null) {
            throw neo4j_driver_core_1.newError('Unable to unpack integer value with marker ' + marker.toString(16));
        }
        return result;
    };
    Unpacker.prototype._unpackBoolean = function (marker) {
        if (marker === TRUE) {
            return true;
        }
        else if (marker === FALSE) {
            return false;
        }
        else {
            return null;
        }
    };
    Unpacker.prototype._unpackNumberOrInteger = function (marker, buffer) {
        if (marker === FLOAT_64) {
            return buffer.readFloat64();
        }
        else {
            return this._unpackInteger(marker, buffer);
        }
    };
    Unpacker.prototype._unpackInteger = function (marker, buffer) {
        if (marker >= 0 && marker < 128) {
            return neo4j_driver_core_1.int(marker);
        }
        else if (marker >= 240 && marker < 256) {
            return neo4j_driver_core_1.int(marker - 256);
        }
        else if (marker === INT_8) {
            return neo4j_driver_core_1.int(buffer.readInt8());
        }
        else if (marker === INT_16) {
            return neo4j_driver_core_1.int(buffer.readInt16());
        }
        else if (marker === INT_32) {
            var b = buffer.readInt32();
            return neo4j_driver_core_1.int(b);
        }
        else if (marker === INT_64) {
            var high = buffer.readInt32();
            var low = buffer.readInt32();
            return new neo4j_driver_core_1.Integer(low, high);
        }
        else {
            return null;
        }
    };
    Unpacker.prototype._unpackString = function (marker, markerHigh, markerLow, buffer) {
        if (markerHigh === TINY_STRING) {
            return channel_1.utf8.decode(buffer, markerLow);
        }
        else if (marker === STRING_8) {
            return channel_1.utf8.decode(buffer, buffer.readUInt8());
        }
        else if (marker === STRING_16) {
            return channel_1.utf8.decode(buffer, buffer.readUInt16());
        }
        else if (marker === STRING_32) {
            return channel_1.utf8.decode(buffer, buffer.readUInt32());
        }
        else {
            return null;
        }
    };
    Unpacker.prototype._unpackList = function (marker, markerHigh, markerLow, buffer) {
        if (markerHigh === TINY_LIST) {
            return this._unpackListWithSize(markerLow, buffer);
        }
        else if (marker === LIST_8) {
            return this._unpackListWithSize(buffer.readUInt8(), buffer);
        }
        else if (marker === LIST_16) {
            return this._unpackListWithSize(buffer.readUInt16(), buffer);
        }
        else if (marker === LIST_32) {
            return this._unpackListWithSize(buffer.readUInt32(), buffer);
        }
        else {
            return null;
        }
    };
    Unpacker.prototype._unpackListWithSize = function (size, buffer) {
        var value = [];
        for (var i = 0; i < size; i++) {
            value.push(this.unpack(buffer));
        }
        return value;
    };
    Unpacker.prototype._unpackByteArray = function (marker, buffer) {
        if (marker === BYTES_8) {
            return this._unpackByteArrayWithSize(buffer.readUInt8(), buffer);
        }
        else if (marker === BYTES_16) {
            return this._unpackByteArrayWithSize(buffer.readUInt16(), buffer);
        }
        else if (marker === BYTES_32) {
            return this._unpackByteArrayWithSize(buffer.readUInt32(), buffer);
        }
        else {
            return null;
        }
    };
    Unpacker.prototype._unpackByteArrayWithSize = function (size, buffer) {
        var value = new Int8Array(size);
        for (var i = 0; i < size; i++) {
            value[i] = buffer.readInt8();
        }
        return value;
    };
    Unpacker.prototype._unpackMap = function (marker, markerHigh, markerLow, buffer) {
        if (markerHigh === TINY_MAP) {
            return this._unpackMapWithSize(markerLow, buffer);
        }
        else if (marker === MAP_8) {
            return this._unpackMapWithSize(buffer.readUInt8(), buffer);
        }
        else if (marker === MAP_16) {
            return this._unpackMapWithSize(buffer.readUInt16(), buffer);
        }
        else if (marker === MAP_32) {
            return this._unpackMapWithSize(buffer.readUInt32(), buffer);
        }
        else {
            return null;
        }
    };
    Unpacker.prototype._unpackMapWithSize = function (size, buffer) {
        var value = {};
        for (var i = 0; i < size; i++) {
            var key = this.unpack(buffer);
            value[key] = this.unpack(buffer);
        }
        return value;
    };
    Unpacker.prototype._unpackStruct = function (marker, markerHigh, markerLow, buffer) {
        if (markerHigh === TINY_STRUCT) {
            return this._unpackStructWithSize(markerLow, buffer);
        }
        else if (marker === STRUCT_8) {
            return this._unpackStructWithSize(buffer.readUInt8(), buffer);
        }
        else if (marker === STRUCT_16) {
            return this._unpackStructWithSize(buffer.readUInt16(), buffer);
        }
        else {
            return null;
        }
    };
    Unpacker.prototype._unpackStructWithSize = function (structSize, buffer) {
        var signature = buffer.readUInt8();
        if (signature === NODE) {
            return this._unpackNode(structSize, buffer);
        }
        else if (signature === RELATIONSHIP) {
            return this._unpackRelationship(structSize, buffer);
        }
        else if (signature === UNBOUND_RELATIONSHIP) {
            return this._unpackUnboundRelationship(structSize, buffer);
        }
        else if (signature === PATH) {
            return this._unpackPath(structSize, buffer);
        }
        else {
            return this._unpackUnknownStruct(signature, structSize, buffer);
        }
    };
    Unpacker.prototype._unpackNode = function (structSize, buffer) {
        this._verifyStructSize('Node', NODE_STRUCT_SIZE, structSize);
        return new neo4j_driver_core_1.Node(this.unpack(buffer), // Identity
        this.unpack(buffer), // Labels
        this.unpack(buffer) // Properties
        );
    };
    Unpacker.prototype._unpackRelationship = function (structSize, buffer) {
        this._verifyStructSize('Relationship', RELATIONSHIP_STRUCT_SIZE, structSize);
        return new neo4j_driver_core_1.Relationship(this.unpack(buffer), // Identity
        this.unpack(buffer), // Start Node Identity
        this.unpack(buffer), // End Node Identity
        this.unpack(buffer), // Type
        this.unpack(buffer) // Properties
        );
    };
    Unpacker.prototype._unpackUnboundRelationship = function (structSize, buffer) {
        this._verifyStructSize('UnboundRelationship', UNBOUND_RELATIONSHIP_STRUCT_SIZE, structSize);
        return new neo4j_driver_core_1.UnboundRelationship(this.unpack(buffer), // Identity
        this.unpack(buffer), // Type
        this.unpack(buffer) // Properties
        );
    };
    Unpacker.prototype._unpackPath = function (structSize, buffer) {
        this._verifyStructSize('Path', PATH_STRUCT_SIZE, structSize);
        var nodes = this.unpack(buffer);
        var rels = this.unpack(buffer);
        var sequence = this.unpack(buffer);
        var segments = [];
        var prevNode = nodes[0];
        for (var i = 0; i < sequence.length; i += 2) {
            var nextNode = nodes[sequence[i + 1]];
            var relIndex = sequence[i];
            var rel = void 0;
            if (relIndex > 0) {
                rel = rels[relIndex - 1];
                if (rel instanceof neo4j_driver_core_1.UnboundRelationship) {
                    // To avoid duplication, relationships in a path do not contain
                    // information about their start and end nodes, that's instead
                    // inferred from the path sequence. This is us inferring (and,
                    // for performance reasons remembering) the start/end of a rel.
                    rels[relIndex - 1] = rel = rel.bind(prevNode.identity, nextNode.identity);
                }
            }
            else {
                rel = rels[-relIndex - 1];
                if (rel instanceof neo4j_driver_core_1.UnboundRelationship) {
                    // See above
                    rels[-relIndex - 1] = rel = rel.bind(nextNode.identity, prevNode.identity);
                }
            }
            // Done hydrating one path segment.
            segments.push(new neo4j_driver_core_1.PathSegment(prevNode, rel, nextNode));
            prevNode = nextNode;
        }
        return new neo4j_driver_core_1.Path(nodes[0], nodes[nodes.length - 1], segments);
    };
    Unpacker.prototype._unpackUnknownStruct = function (signature, structSize, buffer) {
        var result = new Structure(signature, []);
        for (var i = 0; i < structSize; i++) {
            result.fields.push(this.unpack(buffer));
        }
        return result;
    };
    Unpacker.prototype._verifyStructSize = function (structName, expectedSize, actualSize) {
        if (expectedSize !== actualSize) {
            throw neo4j_driver_core_1.newError("Wrong struct size for " + structName + ", expected " + expectedSize + " but was " + actualSize, PROTOCOL_ERROR);
        }
    };
    return Unpacker;
}());
exports.Unpacker = Unpacker;
function isIterable(obj) {
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}

},{"../channel":26,"neo4j-driver-core":58}],44:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Unpacker = exports.Packer = void 0;
var v1 = __importStar(require("./packstream-v1"));
var neo4j_driver_core_1 = require("neo4j-driver-core");
var temporal_factory_1 = require("./temporal-factory");
var _a = neo4j_driver_core_1.internal.temporalUtil, dateToEpochDay = _a.dateToEpochDay, localDateTimeToEpochSecond = _a.localDateTimeToEpochSecond, localTimeToNanoOfDay = _a.localTimeToNanoOfDay;
var POINT_2D = 0x58;
var POINT_2D_STRUCT_SIZE = 3;
var POINT_3D = 0x59;
var POINT_3D_STRUCT_SIZE = 4;
var DURATION = 0x45;
var DURATION_STRUCT_SIZE = 4;
var LOCAL_TIME = 0x74;
var LOCAL_TIME_STRUCT_SIZE = 1;
var TIME = 0x54;
var TIME_STRUCT_SIZE = 2;
var DATE = 0x44;
var DATE_STRUCT_SIZE = 1;
var LOCAL_DATE_TIME = 0x64;
var LOCAL_DATE_TIME_STRUCT_SIZE = 2;
var DATE_TIME_WITH_ZONE_OFFSET = 0x46;
var DATE_TIME_WITH_ZONE_OFFSET_STRUCT_SIZE = 3;
var DATE_TIME_WITH_ZONE_ID = 0x66;
var DATE_TIME_WITH_ZONE_ID_STRUCT_SIZE = 3;
var Packer = /** @class */ (function (_super) {
    __extends(Packer, _super);
    function Packer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Packer.prototype.disableByteArrays = function () {
        throw new Error('Bolt V2 should always support byte arrays');
    };
    Packer.prototype.packable = function (obj) {
        var _this = this;
        if (neo4j_driver_core_1.isPoint(obj)) {
            return function () { return packPoint(obj, _this); };
        }
        else if (neo4j_driver_core_1.isDuration(obj)) {
            return function () { return packDuration(obj, _this); };
        }
        else if (neo4j_driver_core_1.isLocalTime(obj)) {
            return function () { return packLocalTime(obj, _this); };
        }
        else if (neo4j_driver_core_1.isTime(obj)) {
            return function () { return packTime(obj, _this); };
        }
        else if (neo4j_driver_core_1.isDate(obj)) {
            return function () { return packDate(obj, _this); };
        }
        else if (neo4j_driver_core_1.isLocalDateTime(obj)) {
            return function () { return packLocalDateTime(obj, _this); };
        }
        else if (neo4j_driver_core_1.isDateTime(obj)) {
            return function () { return packDateTime(obj, _this); };
        }
        else {
            return _super.prototype.packable.call(this, obj);
        }
    };
    return Packer;
}(v1.Packer));
exports.Packer = Packer;
var Unpacker = /** @class */ (function (_super) {
    __extends(Unpacker, _super);
    /**
     * @constructor
     * @param {boolean} disableLosslessIntegers if this unpacker should convert all received integers to native JS numbers.
     * @param {boolean} useBigInt if this unpacker should convert all received integers to Bigint
     */
    function Unpacker(disableLosslessIntegers, useBigInt) {
        if (disableLosslessIntegers === void 0) { disableLosslessIntegers = false; }
        if (useBigInt === void 0) { useBigInt = false; }
        return _super.call(this, disableLosslessIntegers, useBigInt) || this;
    }
    Unpacker.prototype._unpackUnknownStruct = function (signature, structSize, buffer) {
        if (signature === POINT_2D) {
            return unpackPoint2D(this, structSize, buffer);
        }
        else if (signature === POINT_3D) {
            return unpackPoint3D(this, structSize, buffer);
        }
        else if (signature === DURATION) {
            return unpackDuration(this, structSize, buffer);
        }
        else if (signature === LOCAL_TIME) {
            return unpackLocalTime(this, structSize, buffer, this._disableLosslessIntegers, this._useBigInt);
        }
        else if (signature === TIME) {
            return unpackTime(this, structSize, buffer, this._disableLosslessIntegers, this._useBigInt);
        }
        else if (signature === DATE) {
            return unpackDate(this, structSize, buffer, this._disableLosslessIntegers, this._useBigInt);
        }
        else if (signature === LOCAL_DATE_TIME) {
            return unpackLocalDateTime(this, structSize, buffer, this._disableLosslessIntegers, this._useBigInt);
        }
        else if (signature === DATE_TIME_WITH_ZONE_OFFSET) {
            return unpackDateTimeWithZoneOffset(this, structSize, buffer, this._disableLosslessIntegers, this._useBigInt);
        }
        else if (signature === DATE_TIME_WITH_ZONE_ID) {
            return unpackDateTimeWithZoneId(this, structSize, buffer, this._disableLosslessIntegers, this._useBigInt);
        }
        else {
            return _super.prototype._unpackUnknownStruct.call(this, signature, structSize, buffer, this._disableLosslessIntegers, this._useBigInt);
        }
    };
    return Unpacker;
}(v1.Unpacker));
exports.Unpacker = Unpacker;
/**
 * Pack given 2D or 3D point.
 * @param {Point} point the point value to pack.
 * @param {Packer} packer the packer to use.
 */
function packPoint(point, packer) {
    var is2DPoint = point.z === null || point.z === undefined;
    if (is2DPoint) {
        packPoint2D(point, packer);
    }
    else {
        packPoint3D(point, packer);
    }
}
/**
 * Pack given 2D point.
 * @param {Point} point the point value to pack.
 * @param {Packer} packer the packer to use.
 */
function packPoint2D(point, packer) {
    var packableStructFields = [
        packer.packable(neo4j_driver_core_1.int(point.srid)),
        packer.packable(point.x),
        packer.packable(point.y)
    ];
    packer.packStruct(POINT_2D, packableStructFields);
}
/**
 * Pack given 3D point.
 * @param {Point} point the point value to pack.
 * @param {Packer} packer the packer to use.
 */
function packPoint3D(point, packer) {
    var packableStructFields = [
        packer.packable(neo4j_driver_core_1.int(point.srid)),
        packer.packable(point.x),
        packer.packable(point.y),
        packer.packable(point.z)
    ];
    packer.packStruct(POINT_3D, packableStructFields);
}
/**
 * Unpack 2D point value using the given unpacker.
 * @param {Unpacker} unpacker the unpacker to use.
 * @param {number} structSize the retrieved struct size.
 * @param {BaseBuffer} buffer the buffer to unpack from.
 * @return {Point} the unpacked 2D point value.
 */
function unpackPoint2D(unpacker, structSize, buffer) {
    unpacker._verifyStructSize('Point2D', POINT_2D_STRUCT_SIZE, structSize);
    return new neo4j_driver_core_1.Point(unpacker.unpack(buffer), // srid
    unpacker.unpack(buffer), // x
    unpacker.unpack(buffer), // y
    undefined // z
    );
}
/**
 * Unpack 3D point value using the given unpacker.
 * @param {Unpacker} unpacker the unpacker to use.
 * @param {number} structSize the retrieved struct size.
 * @param {BaseBuffer} buffer the buffer to unpack from.
 * @return {Point} the unpacked 3D point value.
 */
function unpackPoint3D(unpacker, structSize, buffer) {
    unpacker._verifyStructSize('Point3D', POINT_3D_STRUCT_SIZE, structSize);
    return new neo4j_driver_core_1.Point(unpacker.unpack(buffer), // srid
    unpacker.unpack(buffer), // x
    unpacker.unpack(buffer), // y
    unpacker.unpack(buffer) // z
    );
}
/**
 * Pack given duration.
 * @param {Duration} value the duration value to pack.
 * @param {Packer} packer the packer to use.
 */
function packDuration(value, packer) {
    var months = neo4j_driver_core_1.int(value.months);
    var days = neo4j_driver_core_1.int(value.days);
    var seconds = neo4j_driver_core_1.int(value.seconds);
    var nanoseconds = neo4j_driver_core_1.int(value.nanoseconds);
    var packableStructFields = [
        packer.packable(months),
        packer.packable(days),
        packer.packable(seconds),
        packer.packable(nanoseconds)
    ];
    packer.packStruct(DURATION, packableStructFields);
}
/**
 * Unpack duration value using the given unpacker.
 * @param {Unpacker} unpacker the unpacker to use.
 * @param {number} structSize the retrieved struct size.
 * @param {BaseBuffer} buffer the buffer to unpack from.
 * @return {Duration} the unpacked duration value.
 */
function unpackDuration(unpacker, structSize, buffer) {
    unpacker._verifyStructSize('Duration', DURATION_STRUCT_SIZE, structSize);
    var months = unpacker.unpack(buffer);
    var days = unpacker.unpack(buffer);
    var seconds = unpacker.unpack(buffer);
    var nanoseconds = unpacker.unpack(buffer);
    return new neo4j_driver_core_1.Duration(months, days, seconds, nanoseconds);
}
/**
 * Pack given local time.
 * @param {LocalTime} value the local time value to pack.
 * @param {Packer} packer the packer to use.
 */
function packLocalTime(value, packer) {
    var nanoOfDay = localTimeToNanoOfDay(value.hour, value.minute, value.second, value.nanosecond);
    var packableStructFields = [packer.packable(nanoOfDay)];
    packer.packStruct(LOCAL_TIME, packableStructFields);
}
/**
 * Unpack local time value using the given unpacker.
 * @param {Unpacker} unpacker the unpacker to use.
 * @param {number} structSize the retrieved struct size.
 * @param {BaseBuffer} buffer the buffer to unpack from.
 * @param {boolean} disableLosslessIntegers if integer properties in the result local time should be native JS numbers.
 * @return {LocalTime} the unpacked local time value.
 */
function unpackLocalTime(unpacker, structSize, buffer, disableLosslessIntegers) {
    unpacker._verifyStructSize('LocalTime', LOCAL_TIME_STRUCT_SIZE, structSize);
    var nanoOfDay = unpacker.unpackInteger(buffer);
    var result = temporal_factory_1.nanoOfDayToLocalTime(nanoOfDay);
    return convertIntegerPropsIfNeeded(result, disableLosslessIntegers);
}
/**
 * Pack given time.
 * @param {Time} value the time value to pack.
 * @param {Packer} packer the packer to use.
 */
function packTime(value, packer) {
    var nanoOfDay = localTimeToNanoOfDay(value.hour, value.minute, value.second, value.nanosecond);
    var offsetSeconds = neo4j_driver_core_1.int(value.timeZoneOffsetSeconds);
    var packableStructFields = [
        packer.packable(nanoOfDay),
        packer.packable(offsetSeconds)
    ];
    packer.packStruct(TIME, packableStructFields);
}
/**
 * Unpack time value using the given unpacker.
 * @param {Unpacker} unpacker the unpacker to use.
 * @param {number} structSize the retrieved struct size.
 * @param {BaseBuffer} buffer the buffer to unpack from.
 * @param {boolean} disableLosslessIntegers if integer properties in the result time should be native JS numbers.
 * @return {Time} the unpacked time value.
 */
function unpackTime(unpacker, structSize, buffer, disableLosslessIntegers, useBigInt) {
    unpacker._verifyStructSize('Time', TIME_STRUCT_SIZE, structSize);
    var nanoOfDay = unpacker.unpackInteger(buffer);
    var offsetSeconds = unpacker.unpackInteger(buffer);
    var localTime = temporal_factory_1.nanoOfDayToLocalTime(nanoOfDay);
    var result = new neo4j_driver_core_1.Time(localTime.hour, localTime.minute, localTime.second, localTime.nanosecond, offsetSeconds);
    return convertIntegerPropsIfNeeded(result, disableLosslessIntegers, useBigInt);
}
/**
 * Pack given neo4j date.
 * @param {Date} value the date value to pack.
 * @param {Packer} packer the packer to use.
 */
function packDate(value, packer) {
    var epochDay = dateToEpochDay(value.year, value.month, value.day);
    var packableStructFields = [packer.packable(epochDay)];
    packer.packStruct(DATE, packableStructFields);
}
/**
 * Unpack neo4j date value using the given unpacker.
 * @param {Unpacker} unpacker the unpacker to use.
 * @param {number} structSize the retrieved struct size.
 * @param {BaseBuffer} buffer the buffer to unpack from.
 * @param {boolean} disableLosslessIntegers if integer properties in the result date should be native JS numbers.
 * @return {Date} the unpacked neo4j date value.
 */
function unpackDate(unpacker, structSize, buffer, disableLosslessIntegers, useBigInt) {
    unpacker._verifyStructSize('Date', DATE_STRUCT_SIZE, structSize);
    var epochDay = unpacker.unpackInteger(buffer);
    var result = temporal_factory_1.epochDayToDate(epochDay);
    return convertIntegerPropsIfNeeded(result, disableLosslessIntegers, useBigInt);
}
/**
 * Pack given local date time.
 * @param {LocalDateTime} value the local date time value to pack.
 * @param {Packer} packer the packer to use.
 */
function packLocalDateTime(value, packer) {
    var epochSecond = localDateTimeToEpochSecond(value.year, value.month, value.day, value.hour, value.minute, value.second, value.nanosecond);
    var nano = neo4j_driver_core_1.int(value.nanosecond);
    var packableStructFields = [
        packer.packable(epochSecond),
        packer.packable(nano)
    ];
    packer.packStruct(LOCAL_DATE_TIME, packableStructFields);
}
/**
 * Unpack local date time value using the given unpacker.
 * @param {Unpacker} unpacker the unpacker to use.
 * @param {number} structSize the retrieved struct size.
 * @param {BaseBuffer} buffer the buffer to unpack from.
 * @param {boolean} disableLosslessIntegers if integer properties in the result local date-time should be native JS numbers.
 * @return {LocalDateTime} the unpacked local date time value.
 */
function unpackLocalDateTime(unpacker, structSize, buffer, disableLosslessIntegers, useBigInt) {
    unpacker._verifyStructSize('LocalDateTime', LOCAL_DATE_TIME_STRUCT_SIZE, structSize);
    var epochSecond = unpacker.unpackInteger(buffer);
    var nano = unpacker.unpackInteger(buffer);
    var result = temporal_factory_1.epochSecondAndNanoToLocalDateTime(epochSecond, nano);
    return convertIntegerPropsIfNeeded(result, disableLosslessIntegers, useBigInt);
}
/**
 * Pack given date time.
 * @param {DateTime} value the date time value to pack.
 * @param {Packer} packer the packer to use.
 */
function packDateTime(value, packer) {
    if (value.timeZoneId) {
        packDateTimeWithZoneId(value, packer);
    }
    else {
        packDateTimeWithZoneOffset(value, packer);
    }
}
/**
 * Pack given date time with zone offset.
 * @param {DateTime} value the date time value to pack.
 * @param {Packer} packer the packer to use.
 */
function packDateTimeWithZoneOffset(value, packer) {
    var epochSecond = localDateTimeToEpochSecond(value.year, value.month, value.day, value.hour, value.minute, value.second, value.nanosecond);
    var nano = neo4j_driver_core_1.int(value.nanosecond);
    var timeZoneOffsetSeconds = neo4j_driver_core_1.int(value.timeZoneOffsetSeconds);
    var packableStructFields = [
        packer.packable(epochSecond),
        packer.packable(nano),
        packer.packable(timeZoneOffsetSeconds)
    ];
    packer.packStruct(DATE_TIME_WITH_ZONE_OFFSET, packableStructFields);
}
/**
 * Unpack date time with zone offset value using the given unpacker.
 * @param {Unpacker} unpacker the unpacker to use.
 * @param {number} structSize the retrieved struct size.
 * @param {BaseBuffer} buffer the buffer to unpack from.
 * @param {boolean} disableLosslessIntegers if integer properties in the result date-time should be native JS numbers.
 * @return {DateTime} the unpacked date time with zone offset value.
 */
function unpackDateTimeWithZoneOffset(unpacker, structSize, buffer, disableLosslessIntegers, useBigInt) {
    unpacker._verifyStructSize('DateTimeWithZoneOffset', DATE_TIME_WITH_ZONE_OFFSET_STRUCT_SIZE, structSize);
    var epochSecond = unpacker.unpackInteger(buffer);
    var nano = unpacker.unpackInteger(buffer);
    var timeZoneOffsetSeconds = unpacker.unpackInteger(buffer);
    var localDateTime = temporal_factory_1.epochSecondAndNanoToLocalDateTime(epochSecond, nano);
    var result = new neo4j_driver_core_1.DateTime(localDateTime.year, localDateTime.month, localDateTime.day, localDateTime.hour, localDateTime.minute, localDateTime.second, localDateTime.nanosecond, timeZoneOffsetSeconds, null);
    return convertIntegerPropsIfNeeded(result, disableLosslessIntegers, useBigInt);
}
/**
 * Pack given date time with zone id.
 * @param {DateTime} value the date time value to pack.
 * @param {Packer} packer the packer to use.
 */
function packDateTimeWithZoneId(value, packer) {
    var epochSecond = localDateTimeToEpochSecond(value.year, value.month, value.day, value.hour, value.minute, value.second, value.nanosecond);
    var nano = neo4j_driver_core_1.int(value.nanosecond);
    var timeZoneId = value.timeZoneId;
    var packableStructFields = [
        packer.packable(epochSecond),
        packer.packable(nano),
        packer.packable(timeZoneId)
    ];
    packer.packStruct(DATE_TIME_WITH_ZONE_ID, packableStructFields);
}
/**
 * Unpack date time with zone id value using the given unpacker.
 * @param {Unpacker} unpacker the unpacker to use.
 * @param {number} structSize the retrieved struct size.
 * @param {BaseBuffer} buffer the buffer to unpack from.
 * @param {boolean} disableLosslessIntegers if integer properties in the result date-time should be native JS numbers.
 * @return {DateTime} the unpacked date time with zone id value.
 */
function unpackDateTimeWithZoneId(unpacker, structSize, buffer, disableLosslessIntegers, useBigInt) {
    unpacker._verifyStructSize('DateTimeWithZoneId', DATE_TIME_WITH_ZONE_ID_STRUCT_SIZE, structSize);
    var epochSecond = unpacker.unpackInteger(buffer);
    var nano = unpacker.unpackInteger(buffer);
    var timeZoneId = unpacker.unpack(buffer);
    var localDateTime = temporal_factory_1.epochSecondAndNanoToLocalDateTime(epochSecond, nano);
    var result = new neo4j_driver_core_1.DateTime(localDateTime.year, localDateTime.month, localDateTime.day, localDateTime.hour, localDateTime.minute, localDateTime.second, localDateTime.nanosecond, null, timeZoneId);
    return convertIntegerPropsIfNeeded(result, disableLosslessIntegers, useBigInt);
}
function convertIntegerPropsIfNeeded(obj, disableLosslessIntegers, useBigInt) {
    if (!disableLosslessIntegers && !useBigInt) {
        return obj;
    }
    var convert = function (value) {
        return useBigInt ? value.toBigInt() : value.toNumberOrInfinity();
    };
    var clone = Object.create(Object.getPrototypeOf(obj));
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            var value = obj[prop];
            clone[prop] = neo4j_driver_core_1.isInt(value) ? convert(value) : value;
        }
    }
    Object.freeze(clone);
    return clone;
}

},{"./packstream-v1":43,"./temporal-factory":45,"neo4j-driver-core":58}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.epochSecondAndNanoToLocalDateTime = exports.nanoOfDayToLocalTime = exports.epochDayToDate = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var neo4j_driver_core_1 = require("neo4j-driver-core");
var _a = neo4j_driver_core_1.internal.temporalUtil, DAYS_0000_TO_1970 = _a.DAYS_0000_TO_1970, DAYS_PER_400_YEAR_CYCLE = _a.DAYS_PER_400_YEAR_CYCLE, NANOS_PER_HOUR = _a.NANOS_PER_HOUR, NANOS_PER_MINUTE = _a.NANOS_PER_MINUTE, NANOS_PER_SECOND = _a.NANOS_PER_SECOND, SECONDS_PER_DAY = _a.SECONDS_PER_DAY, floorDiv = _a.floorDiv, floorMod = _a.floorMod;
/**
 * Converts given epoch day to a local date.
 * @param {Integer|number|string} epochDay the epoch day to convert.
 * @return {Date} the date representing the epoch day in years, months and days.
 */
function epochDayToDate(epochDay) {
    epochDay = neo4j_driver_core_1.int(epochDay);
    var zeroDay = epochDay.add(DAYS_0000_TO_1970).subtract(60);
    var adjust = neo4j_driver_core_1.int(0);
    if (zeroDay.lessThan(0)) {
        var adjustCycles = zeroDay
            .add(1)
            .div(DAYS_PER_400_YEAR_CYCLE)
            .subtract(1);
        adjust = adjustCycles.multiply(400);
        zeroDay = zeroDay.add(adjustCycles.multiply(-DAYS_PER_400_YEAR_CYCLE));
    }
    var year = zeroDay
        .multiply(400)
        .add(591)
        .div(DAYS_PER_400_YEAR_CYCLE);
    var dayOfYearEst = zeroDay.subtract(year
        .multiply(365)
        .add(year.div(4))
        .subtract(year.div(100))
        .add(year.div(400)));
    if (dayOfYearEst.lessThan(0)) {
        year = year.subtract(1);
        dayOfYearEst = zeroDay.subtract(year
            .multiply(365)
            .add(year.div(4))
            .subtract(year.div(100))
            .add(year.div(400)));
    }
    year = year.add(adjust);
    var marchDayOfYear = dayOfYearEst;
    var marchMonth = marchDayOfYear
        .multiply(5)
        .add(2)
        .div(153);
    var month = marchMonth
        .add(2)
        .modulo(12)
        .add(1);
    var day = marchDayOfYear
        .subtract(marchMonth
        .multiply(306)
        .add(5)
        .div(10))
        .add(1);
    year = year.add(marchMonth.div(10));
    return new neo4j_driver_core_1.Date(year, month, day);
}
exports.epochDayToDate = epochDayToDate;
/**
 * Converts nanoseconds of the day into local time.
 * @param {Integer|number|string} nanoOfDay the nanoseconds of the day to convert.
 * @return {LocalTime} the local time representing given nanoseconds of the day.
 */
function nanoOfDayToLocalTime(nanoOfDay) {
    nanoOfDay = neo4j_driver_core_1.int(nanoOfDay);
    var hour = nanoOfDay.div(NANOS_PER_HOUR);
    nanoOfDay = nanoOfDay.subtract(hour.multiply(NANOS_PER_HOUR));
    var minute = nanoOfDay.div(NANOS_PER_MINUTE);
    nanoOfDay = nanoOfDay.subtract(minute.multiply(NANOS_PER_MINUTE));
    var second = nanoOfDay.div(NANOS_PER_SECOND);
    var nanosecond = nanoOfDay.subtract(second.multiply(NANOS_PER_SECOND));
    return new neo4j_driver_core_1.LocalTime(hour, minute, second, nanosecond);
}
exports.nanoOfDayToLocalTime = nanoOfDayToLocalTime;
/**
 * Converts given epoch second and nanosecond adjustment into a local date time object.
 * @param {Integer|number|string} epochSecond the epoch second to use.
 * @param {Integer|number|string} nano the nanosecond to use.
 * @return {LocalDateTime} the local date time representing given epoch second and nano.
 */
function epochSecondAndNanoToLocalDateTime(epochSecond, nano) {
    var epochDay = floorDiv(epochSecond, SECONDS_PER_DAY);
    var secondsOfDay = floorMod(epochSecond, SECONDS_PER_DAY);
    var nanoOfDay = secondsOfDay.multiply(NANOS_PER_SECOND).add(nano);
    var localDate = epochDayToDate(epochDay);
    var localTime = nanoOfDayToLocalTime(nanoOfDay);
    return new neo4j_driver_core_1.LocalDateTime(localDate.year, localDate.month, localDate.day, localTime.hour, localTime.minute, localTime.second, localTime.nanosecond);
}
exports.epochSecondAndNanoToLocalDateTime = epochSecondAndNanoToLocalDateTime;

},{"neo4j-driver-core":58}],46:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MAX_SIZE = exports.DEFAULT_ACQUISITION_TIMEOUT = exports.PoolConfig = exports.Pool = void 0;
var pool_config_1 = __importStar(require("./pool-config"));
exports.PoolConfig = pool_config_1.default;
Object.defineProperty(exports, "DEFAULT_ACQUISITION_TIMEOUT", { enumerable: true, get: function () { return pool_config_1.DEFAULT_ACQUISITION_TIMEOUT; } });
Object.defineProperty(exports, "DEFAULT_MAX_SIZE", { enumerable: true, get: function () { return pool_config_1.DEFAULT_MAX_SIZE; } });
var pool_1 = __importDefault(require("./pool"));
exports.Pool = pool_1.default;
exports.default = pool_1.default;

},{"./pool":48,"./pool-config":47}],47:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ACQUISITION_TIMEOUT = exports.DEFAULT_MAX_SIZE = void 0;
var DEFAULT_MAX_SIZE = 100;
exports.DEFAULT_MAX_SIZE = DEFAULT_MAX_SIZE;
var DEFAULT_ACQUISITION_TIMEOUT = 60 * 1000; // 60 seconds
exports.DEFAULT_ACQUISITION_TIMEOUT = DEFAULT_ACQUISITION_TIMEOUT;
var PoolConfig = /** @class */ (function () {
    function PoolConfig(maxSize, acquisitionTimeout) {
        this.maxSize = valueOrDefault(maxSize, DEFAULT_MAX_SIZE);
        this.acquisitionTimeout = valueOrDefault(acquisitionTimeout, DEFAULT_ACQUISITION_TIMEOUT);
    }
    PoolConfig.defaultConfig = function () {
        return new PoolConfig(DEFAULT_MAX_SIZE, DEFAULT_ACQUISITION_TIMEOUT);
    };
    PoolConfig.fromDriverConfig = function (config) {
        var maxSizeConfigured = isConfigured(config.maxConnectionPoolSize);
        var maxSize = maxSizeConfigured
            ? config.maxConnectionPoolSize
            : DEFAULT_MAX_SIZE;
        var acquisitionTimeoutConfigured = isConfigured(config.connectionAcquisitionTimeout);
        var acquisitionTimeout = acquisitionTimeoutConfigured
            ? config.connectionAcquisitionTimeout
            : DEFAULT_ACQUISITION_TIMEOUT;
        return new PoolConfig(maxSize, acquisitionTimeout);
    };
    return PoolConfig;
}());
exports.default = PoolConfig;
function valueOrDefault(value, defaultValue) {
    return value === 0 || value ? value : defaultValue;
}
function isConfigured(value) {
    return value === 0 || value;
}

},{}],48:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var pool_config_1 = __importDefault(require("./pool-config"));
var neo4j_driver_core_1 = require("neo4j-driver-core");
var Logger = neo4j_driver_core_1.internal.logger.Logger;
var Pool = /** @class */ (function () {
    /**
     * @param {function(address: ServerAddress, function(address: ServerAddress, resource: object): Promise<object>): Promise<object>} create
     *                an allocation function that creates a promise with a new resource. It's given an address for which to
     *                allocate the connection and a function that will return the resource to the pool if invoked, which is
     *                meant to be called on .dispose or .close or whatever mechanism the resource uses to finalize.
     * @param {function(resource: object): Promise<void>} destroy
     *                called with the resource when it is evicted from this pool
     * @param {function(resource: object): boolean} validate
     *                called at various times (like when an instance is acquired and when it is returned.
     *                If this returns false, the resource will be evicted
     * @param {function(resource: object, observer: { onError }): void} installIdleObserver
     *                called when the resource is released back to pool
     * @param {function(resource: object): void} removeIdleObserver
     *                called when the resource is acquired from the pool
     * @param {PoolConfig} config configuration for the new driver.
     * @param {Logger} log the driver logger.
     */
    function Pool(_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.create, create = _c === void 0 ? function (address, release) { return Promise.resolve(); } : _c, _d = _b.destroy, destroy = _d === void 0 ? function (conn) { return Promise.resolve(); } : _d, _e = _b.validate, validate = _e === void 0 ? function (conn) { return true; } : _e, _f = _b.installIdleObserver, installIdleObserver = _f === void 0 ? function (conn, observer) { } : _f, _g = _b.removeIdleObserver, removeIdleObserver = _g === void 0 ? function (conn) { } : _g, _h = _b.config, config = _h === void 0 ? pool_config_1.default.defaultConfig() : _h, _j = _b.log, log = _j === void 0 ? Logger.noOp() : _j;
        this._create = create;
        this._destroy = destroy;
        this._validate = validate;
        this._installIdleObserver = installIdleObserver;
        this._removeIdleObserver = removeIdleObserver;
        this._maxSize = config.maxSize;
        this._acquisitionTimeout = config.acquisitionTimeout;
        this._pools = {};
        this._pendingCreates = {};
        this._acquireRequests = {};
        this._activeResourceCounts = {};
        this._release = this._release.bind(this);
        this._log = log;
        this._closed = false;
    }
    /**
     * Acquire and idle resource fom the pool or create a new one.
     * @param {ServerAddress} address the address for which we're acquiring.
     * @return {Object} resource that is ready to use.
     */
    Pool.prototype.acquire = function (address) {
        var _this = this;
        return this._acquire(address).then(function (resource) {
            var key = address.asKey();
            if (resource) {
                // New or existing resource acquired
                return resource;
            }
            // We're out of resources and will try to acquire later on when an existing resource is released.
            var allRequests = _this._acquireRequests;
            var requests = allRequests[key];
            if (!requests) {
                allRequests[key] = [];
            }
            return new Promise(function (resolve, reject) {
                var request;
                var timeoutId = setTimeout(function () {
                    // acquisition timeout fired
                    // remove request from the queue of pending requests, if it's still there
                    // request might've been taken out by the release operation
                    var pendingRequests = allRequests[key];
                    if (pendingRequests) {
                        allRequests[key] = pendingRequests.filter(function (item) { return item !== request; });
                    }
                    if (request.isCompleted()) {
                        // request already resolved/rejected by the release operation; nothing to do
                    }
                    else {
                        // request is still pending and needs to be failed
                        var activeCount = _this.activeResourceCount(address);
                        var idleCount = _this.has(address) ? _this._pools[key].length : 0;
                        request.reject(neo4j_driver_core_1.newError("Connection acquisition timed out in " + _this._acquisitionTimeout + " ms. Pool status: Active conn count = " + activeCount + ", Idle conn count = " + idleCount + "."));
                    }
                }, _this._acquisitionTimeout);
                request = new PendingRequest(key, resolve, reject, timeoutId, _this._log);
                allRequests[key].push(request);
            });
        });
    };
    /**
     * Destroy all idle resources for the given address.
     * @param {ServerAddress} address the address of the server to purge its pool.
     * @returns {Promise<void>} A promise that is resolved when the resources are purged
     */
    Pool.prototype.purge = function (address) {
        return this._purgeKey(address.asKey());
    };
    /**
     * Destroy all idle resources in this pool.
     * @returns {Promise<void>} A promise that is resolved when the resources are purged
     */
    Pool.prototype.close = function () {
        var _this = this;
        this._closed = true;
        return Promise.all(Object.keys(this._pools).map(function (key) { return _this._purgeKey(key); }));
    };
    /**
     * Keep the idle resources for the provided addresses and purge the rest.
     * @returns {Promise<void>} A promise that is resolved when the other resources are purged
     */
    Pool.prototype.keepAll = function (addresses) {
        var _this = this;
        var keysToKeep = addresses.map(function (a) { return a.asKey(); });
        var keysPresent = Object.keys(this._pools);
        var keysToPurge = keysPresent.filter(function (k) { return keysToKeep.indexOf(k) === -1; });
        return Promise.all(keysToPurge.map(function (key) { return _this._purgeKey(key); }));
    };
    /**
     * Check if this pool contains resources for the given address.
     * @param {ServerAddress} address the address of the server to check.
     * @return {boolean} `true` when pool contains entries for the given key, <code>false</code> otherwise.
     */
    Pool.prototype.has = function (address) {
        return address.asKey() in this._pools;
    };
    /**
     * Get count of active (checked out of the pool) resources for the given key.
     * @param {ServerAddress} address the address of the server to check.
     * @return {number} count of resources acquired by clients.
     */
    Pool.prototype.activeResourceCount = function (address) {
        return this._activeResourceCounts[address.asKey()] || 0;
    };
    Pool.prototype._acquire = function (address) {
        return __awaiter(this, void 0, void 0, function () {
            var key, pool, resource_1, numConnections, resource;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this._closed) {
                            throw neo4j_driver_core_1.newError('Pool is closed, it is no more able to serve requests.');
                        }
                        key = address.asKey();
                        pool = this._pools[key];
                        if (!pool) {
                            pool = [];
                            this._pools[key] = pool;
                            this._pendingCreates[key] = 0;
                        }
                        _a.label = 1;
                    case 1:
                        if (!pool.length) return [3 /*break*/, 5];
                        resource_1 = pool.pop();
                        if (!this._validate(resource_1)) return [3 /*break*/, 2];
                        if (this._removeIdleObserver) {
                            this._removeIdleObserver(resource_1);
                        }
                        // idle resource is valid and can be acquired
                        resourceAcquired(key, this._activeResourceCounts);
                        if (this._log.isDebugEnabled()) {
                            this._log.debug(resource_1 + " acquired from the pool " + key);
                        }
                        return [2 /*return*/, resource_1];
                    case 2: return [4 /*yield*/, this._destroy(resource_1)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [3 /*break*/, 1];
                    case 5:
                        // Ensure requested max pool size
                        if (this._maxSize > 0) {
                            numConnections = this.activeResourceCount(address) + this._pendingCreates[key];
                            if (numConnections >= this._maxSize) {
                                // Will put this request in queue instead since the pool is full
                                return [2 /*return*/, null];
                            }
                        }
                        // there exist no idle valid resources, create a new one for acquisition
                        // Keep track of how many pending creates there are to avoid making too many connections.
                        this._pendingCreates[key] = this._pendingCreates[key] + 1;
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, , 8, 9]);
                        return [4 /*yield*/, this._create(address, this._release)];
                    case 7:
                        // Invoke callback that creates actual connection
                        resource = _a.sent();
                        resourceAcquired(key, this._activeResourceCounts);
                        if (this._log.isDebugEnabled()) {
                            this._log.debug(resource + " created for the pool " + key);
                        }
                        return [3 /*break*/, 9];
                    case 8:
                        this._pendingCreates[key] = this._pendingCreates[key] - 1;
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/, resource];
                }
            });
        });
    };
    Pool.prototype._release = function (address, resource) {
        return __awaiter(this, void 0, void 0, function () {
            var key, pool;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = address.asKey();
                        pool = this._pools[key];
                        if (!pool) return [3 /*break*/, 4];
                        if (!!this._validate(resource)) return [3 /*break*/, 2];
                        if (this._log.isDebugEnabled()) {
                            this._log.debug(resource + " destroyed and can't be released to the pool " + key + " because it is not functional");
                        }
                        return [4 /*yield*/, this._destroy(resource)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        if (this._installIdleObserver) {
                            this._installIdleObserver(resource, {
                                onError: function (error) {
                                    _this._log.debug("Idle connection " + resource + " destroyed because of error: " + error);
                                    var pool = _this._pools[key];
                                    if (pool) {
                                        _this._pools[key] = pool.filter(function (r) { return r !== resource; });
                                    }
                                    // let's not care about background clean-ups due to errors but just trigger the destroy
                                    // process for the resource, we especially catch any errors and ignore them to avoid
                                    // unhandled promise rejection warnings
                                    _this._destroy(resource).catch(function () { });
                                }
                            });
                        }
                        pool.push(resource);
                        if (this._log.isDebugEnabled()) {
                            this._log.debug(resource + " released to the pool " + key);
                        }
                        _a.label = 3;
                    case 3: return [3 /*break*/, 6];
                    case 4:
                        // key has been purged, don't put it back, just destroy the resource
                        if (this._log.isDebugEnabled()) {
                            this._log.debug(resource + " destroyed and can't be released to the pool " + key + " because pool has been purged");
                        }
                        return [4 /*yield*/, this._destroy(resource)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        resourceReleased(key, this._activeResourceCounts);
                        this._processPendingAcquireRequests(address);
                        return [2 /*return*/];
                }
            });
        });
    };
    Pool.prototype._purgeKey = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var pool, resource;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pool = this._pools[key] || [];
                        _a.label = 1;
                    case 1:
                        if (!pool.length) return [3 /*break*/, 3];
                        resource = pool.pop();
                        if (this._removeIdleObserver) {
                            this._removeIdleObserver(resource);
                        }
                        return [4 /*yield*/, this._destroy(resource)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        delete this._pools[key];
                        return [2 /*return*/];
                }
            });
        });
    };
    Pool.prototype._processPendingAcquireRequests = function (address) {
        var _this = this;
        var key = address.asKey();
        var requests = this._acquireRequests[key];
        if (requests) {
            var pendingRequest_1 = requests.shift(); // pop a pending acquire request
            if (pendingRequest_1) {
                this._acquire(address)
                    .catch(function (error) {
                    // failed to acquire/create a new connection to resolve the pending acquire request
                    // propagate the error by failing the pending request
                    pendingRequest_1.reject(error);
                    return null;
                })
                    .then(function (resource) {
                    if (resource) {
                        // managed to acquire a valid resource from the pool
                        if (pendingRequest_1.isCompleted()) {
                            // request has been completed, most likely failed by a timeout
                            // return the acquired resource back to the pool
                            _this._release(address, resource);
                        }
                        else {
                            // request is still pending and can be resolved with the newly acquired resource
                            pendingRequest_1.resolve(resource); // resolve the pending request with the acquired resource
                        }
                    }
                });
            }
            else {
                delete this._acquireRequests[key];
            }
        }
    };
    return Pool;
}());
/**
 * Increment active (checked out of the pool) resource counter.
 * @param {string} key the resource group identifier (server address for connections).
 * @param {Object.<string, number>} activeResourceCounts the object holding active counts per key.
 */
function resourceAcquired(key, activeResourceCounts) {
    var currentCount = activeResourceCounts[key] || 0;
    activeResourceCounts[key] = currentCount + 1;
}
/**
 * Decrement active (checked out of the pool) resource counter.
 * @param {string} key the resource group identifier (server address for connections).
 * @param {Object.<string, number>} activeResourceCounts the object holding active counts per key.
 */
function resourceReleased(key, activeResourceCounts) {
    var currentCount = activeResourceCounts[key] || 0;
    var nextCount = currentCount - 1;
    if (nextCount > 0) {
        activeResourceCounts[key] = nextCount;
    }
    else {
        delete activeResourceCounts[key];
    }
}
var PendingRequest = /** @class */ (function () {
    function PendingRequest(key, resolve, reject, timeoutId, log) {
        this._key = key;
        this._resolve = resolve;
        this._reject = reject;
        this._timeoutId = timeoutId;
        this._log = log;
        this._completed = false;
    }
    PendingRequest.prototype.isCompleted = function () {
        return this._completed;
    };
    PendingRequest.prototype.resolve = function (resource) {
        if (this._completed) {
            return;
        }
        this._completed = true;
        clearTimeout(this._timeoutId);
        if (this._log.isDebugEnabled()) {
            this._log.debug(resource + " acquired from the pool " + this._key);
        }
        this._resolve(resource);
    };
    PendingRequest.prototype.reject = function (error) {
        if (this._completed) {
            return;
        }
        this._completed = true;
        clearTimeout(this._timeoutId);
        this._reject(error);
    };
    return PendingRequest;
}());
exports.default = Pool;

},{"./pool-config":47,"neo4j-driver-core":58}],49:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingTable = exports.Rediscovery = void 0;
var rediscovery_1 = __importDefault(require("./rediscovery"));
exports.Rediscovery = rediscovery_1.default;
var routing_table_1 = __importDefault(require("./routing-table"));
exports.RoutingTable = routing_table_1.default;
exports.default = rediscovery_1.default;

},{"./rediscovery":50,"./routing-table":51}],50:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var routing_table_1 = __importDefault(require("./routing-table"));
var bolt_1 = require("../bolt");
var neo4j_driver_core_1 = require("neo4j-driver-core");
var SERVICE_UNAVAILABLE = neo4j_driver_core_1.error.SERVICE_UNAVAILABLE;
var PROCEDURE_NOT_FOUND_CODE = 'Neo.ClientError.Procedure.ProcedureNotFound';
var DATABASE_NOT_FOUND_CODE = 'Neo.ClientError.Database.DatabaseNotFound';
var Rediscovery = /** @class */ (function () {
    /**
     * @constructor
     * @param {object} routingContext
     */
    function Rediscovery(routingContext) {
        this._routingContext = routingContext;
    }
    /**
     * Try to fetch new routing table from the given router.
     * @param {Session} session the session to use.
     * @param {string} database the database for which to lookup routing table.
     * @param {ServerAddress} routerAddress the URL of the router.
     * @return {Promise<RoutingTable>} promise resolved with new routing table or null when connection error happened.
     */
    Rediscovery.prototype.lookupRoutingTableOnRouter = function (session, database, routerAddress) {
        var _this = this;
        return session._acquireConnection(function (connection) {
            return _this._requestRawRoutingTable(connection, session, database, routerAddress).then(function (rawRoutingTable) {
                if (rawRoutingTable.isNull) {
                    return null;
                }
                return routing_table_1.default.fromRawRoutingTable(database, routerAddress, rawRoutingTable);
            });
        });
    };
    Rediscovery.prototype._requestRawRoutingTable = function (connection, session, database, routerAddress) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            connection.protocol().requestRoutingInformation({
                routingContext: _this._routingContext,
                databaseName: database,
                sessionContext: {
                    bookmark: session._lastBookmark,
                    mode: session._mode,
                    database: session._database,
                    afterComplete: session._onComplete
                },
                onCompleted: resolve,
                onError: function (error) {
                    if (error.code === DATABASE_NOT_FOUND_CODE) {
                        reject(error);
                    }
                    else if (error.code === PROCEDURE_NOT_FOUND_CODE) {
                        // throw when getServers procedure not found because this is clearly a configuration issue
                        reject(neo4j_driver_core_1.newError("Server at " + routerAddress.asHostPort() + " can't perform routing. Make sure you are connecting to a causal cluster", SERVICE_UNAVAILABLE));
                    }
                    else {
                        // return nothing when failed to connect because code higher in the callstack is still able to retry with a
                        // different session towards a different router
                        resolve(bolt_1.RawRoutingTable.ofNull());
                    }
                }
            });
        });
    };
    return Rediscovery;
}());
exports.default = Rediscovery;

},{"../bolt":11,"./routing-table":51,"neo4j-driver-core":58}],51:[function(require,module,exports){
"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidRoutingTable = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var neo4j_driver_core_1 = require("neo4j-driver-core");
var _a = neo4j_driver_core_1.internal.constants, WRITE = _a.ACCESS_MODE_WRITE, READ = _a.ACCESS_MODE_READ, ServerAddress = neo4j_driver_core_1.internal.serverAddress.ServerAddress;
var PROTOCOL_ERROR = neo4j_driver_core_1.error.PROTOCOL_ERROR;
var MIN_ROUTERS = 1;
/**
 * The routing table object used to determine the role of the servers in the driver.
 */
var RoutingTable = /** @class */ (function () {
    function RoutingTable(_a) {
        var _b = _a === void 0 ? {} : _a, database = _b.database, routers = _b.routers, readers = _b.readers, writers = _b.writers, expirationTime = _b.expirationTime, ttl = _b.ttl;
        this.database = database;
        this.databaseName = database || 'default database';
        this.routers = routers || [];
        this.readers = readers || [];
        this.writers = writers || [];
        this.expirationTime = expirationTime || neo4j_driver_core_1.int(0);
        this.ttl = ttl;
    }
    /**
     * Create a valid routing table from a raw object
     *
     * @param {string} database the database name. It is used for logging purposes
     * @param {ServerAddress} routerAddress The router address, it is used for loggin purposes
     * @param {RawRoutingTable} rawRoutingTable Method used to get the raw routing table to be processed
     * @param {RoutingTable} The valid Routing Table
     */
    RoutingTable.fromRawRoutingTable = function (database, routerAddress, rawRoutingTable) {
        return createValidRoutingTable(database, routerAddress, rawRoutingTable);
    };
    RoutingTable.prototype.forget = function (address) {
        // Don't remove it from the set of routers, since that might mean we lose our ability to re-discover,
        // just remove it from the set of readers and writers, so that we don't use it for actual work without
        // performing discovery first.
        this.readers = removeFromArray(this.readers, address);
        this.writers = removeFromArray(this.writers, address);
    };
    RoutingTable.prototype.forgetRouter = function (address) {
        this.routers = removeFromArray(this.routers, address);
    };
    RoutingTable.prototype.forgetWriter = function (address) {
        this.writers = removeFromArray(this.writers, address);
    };
    /**
     * Check if this routing table is fresh to perform the required operation.
     * @param {string} accessMode the type of operation. Allowed values are {@link READ} and {@link WRITE}.
     * @return {boolean} `true` when this table contains servers to serve the required operation, `false` otherwise.
     */
    RoutingTable.prototype.isStaleFor = function (accessMode) {
        return (this.expirationTime.lessThan(Date.now()) ||
            this.routers.length < MIN_ROUTERS ||
            (accessMode === READ && this.readers.length === 0) ||
            (accessMode === WRITE && this.writers.length === 0));
    };
    /**
     * Check if this routing table is expired for specified amount of duration
     *
     * @param {Integer} duration amount of duration in milliseconds to check for expiration
     * @returns {boolean}
     */
    RoutingTable.prototype.isExpiredFor = function (duration) {
        return this.expirationTime.add(duration).lessThan(Date.now());
    };
    RoutingTable.prototype.allServers = function () {
        return __spreadArray(__spreadArray(__spreadArray([], __read(this.routers)), __read(this.readers)), __read(this.writers));
    };
    RoutingTable.prototype.toString = function () {
        return ('RoutingTable[' +
            ("database=" + this.databaseName + ", ") +
            ("expirationTime=" + this.expirationTime + ", ") +
            ("currentTime=" + Date.now() + ", ") +
            ("routers=[" + this.routers + "], ") +
            ("readers=[" + this.readers + "], ") +
            ("writers=[" + this.writers + "]]"));
    };
    return RoutingTable;
}());
exports.default = RoutingTable;
/**
 * Remove all occurrences of the element in the array.
 * @param {Array} array the array to filter.
 * @param {Object} element the element to remove.
 * @return {Array} new filtered array.
 */
function removeFromArray(array, element) {
    return array.filter(function (item) { return item.asKey() !== element.asKey(); });
}
/**
 * Create a valid routing table from a raw object
 *
 * @param {string} database the database name. It is used for logging purposes
 * @param {ServerAddress} routerAddress The router address, it is used for loggin purposes
 * @param {RawRoutingTable} rawRoutingTable Method used to get the raw routing table to be processed
 * @param {RoutingTable} The valid Routing Table
 */
function createValidRoutingTable(database, routerAddress, rawRoutingTable) {
    var ttl = rawRoutingTable.ttl;
    var expirationTime = calculateExpirationTime(rawRoutingTable, routerAddress);
    var _a = parseServers(rawRoutingTable, routerAddress), routers = _a.routers, readers = _a.readers, writers = _a.writers;
    assertNonEmpty(routers, 'routers', routerAddress);
    assertNonEmpty(readers, 'readers', routerAddress);
    return new RoutingTable({
        database: database,
        routers: routers,
        readers: readers,
        writers: writers,
        expirationTime: expirationTime,
        ttl: ttl
    });
}
exports.createValidRoutingTable = createValidRoutingTable;
/**
 * Parse server from the RawRoutingTable.
 *
 * @param {RawRoutingTable} rawRoutingTable the raw routing table
 * @param {string} routerAddress the router address
 * @returns {Object} The object with the list of routers, readers and writers
 */
function parseServers(rawRoutingTable, routerAddress) {
    try {
        var routers_1 = [];
        var readers_1 = [];
        var writers_1 = [];
        rawRoutingTable.servers.forEach(function (server) {
            var role = server.role;
            var addresses = server.addresses;
            if (role === 'ROUTE') {
                routers_1 = parseArray(addresses).map(function (address) {
                    return ServerAddress.fromUrl(address);
                });
            }
            else if (role === 'WRITE') {
                writers_1 = parseArray(addresses).map(function (address) {
                    return ServerAddress.fromUrl(address);
                });
            }
            else if (role === 'READ') {
                readers_1 = parseArray(addresses).map(function (address) {
                    return ServerAddress.fromUrl(address);
                });
            }
        });
        return {
            routers: routers_1,
            readers: readers_1,
            writers: writers_1
        };
    }
    catch (error) {
        throw neo4j_driver_core_1.newError("Unable to parse servers entry from router " + routerAddress + " from addresses:\n" + neo4j_driver_core_1.json.stringify(rawRoutingTable.servers) + "\nError message: " + error.message, PROTOCOL_ERROR);
    }
}
/**
 * Call the expiration time using the ttls from the raw routing table and return it
 *
 * @param {RawRoutingTable} rawRoutingTable the routing table
 * @param {string} routerAddress the router address
 * @returns {number} the ttl
 */
function calculateExpirationTime(rawRoutingTable, routerAddress) {
    try {
        var now = neo4j_driver_core_1.int(Date.now());
        var expires = neo4j_driver_core_1.int(rawRoutingTable.ttl)
            .multiply(1000)
            .add(now);
        // if the server uses a really big expire time like Long.MAX_VALUE this may have overflowed
        if (expires.lessThan(now)) {
            return neo4j_driver_core_1.Integer.MAX_VALUE;
        }
        return expires;
    }
    catch (error) {
        throw neo4j_driver_core_1.newError("Unable to parse TTL entry from router " + routerAddress + " from raw routing table:\n" + neo4j_driver_core_1.json.stringify(rawRoutingTable) + "\nError message: " + error.message, PROTOCOL_ERROR);
    }
}
/**
 * Assert if serverAddressesArray is not empty, throws and PROTOCOL_ERROR otherwise
 *
 * @param {string[]} serverAddressesArray array of addresses
 * @param {string} serversName the server name
 * @param {string} routerAddress the router address
 */
function assertNonEmpty(serverAddressesArray, serversName, routerAddress) {
    if (serverAddressesArray.length === 0) {
        throw neo4j_driver_core_1.newError('Received no ' + serversName + ' from router ' + routerAddress, PROTOCOL_ERROR);
    }
}
function parseArray(addresses) {
    if (!Array.isArray(addresses)) {
        throw new TypeError('Array expected but got: ' + addresses);
    }
    return Array.from(addresses);
}

},{"neo4j-driver-core":58}],52:[function(require,module,exports){
'use strict';

// This is free and unencumbered software released into the public domain.
// See LICENSE.md for more information.

//
// Utilities
//

/**
 * @param {number} a The number to test.
 * @param {number} min The minimum value in the range, inclusive.
 * @param {number} max The maximum value in the range, inclusive.
 * @return {boolean} True if a >= min and a <= max.
 */
function inRange(a, min, max) {
  return min <= a && a <= max;
}

/**
 * @param {*} o
 * @return {Object}
 */
function ToDictionary(o) {
  if (o === undefined) return {};
  if (o === Object(o)) return o;
  throw TypeError('Could not convert argument to dictionary');
}

/**
 * @param {string} string Input string of UTF-16 code units.
 * @return {!Array.<number>} Code points.
 */
function stringToCodePoints(string) {
  // https://heycam.github.io/webidl/#dfn-obtain-unicode

  // 1. Let S be the DOMString value.
  var s = String(string);

  // 2. Let n be the length of S.
  var n = s.length;

  // 3. Initialize i to 0.
  var i = 0;

  // 4. Initialize U to be an empty sequence of Unicode characters.
  var u = [];

  // 5. While i < n:
  while (i < n) {

    // 1. Let c be the code unit in S at index i.
    var c = s.charCodeAt(i);

    // 2. Depending on the value of c:

    // c < 0xD800 or c > 0xDFFF
    if (c < 0xD800 || c > 0xDFFF) {
      // Append to U the Unicode character with code point c.
      u.push(c);
    }

    // 0xDC00 ≤ c ≤ 0xDFFF
    else if (0xDC00 <= c && c <= 0xDFFF) {
      // Append to U a U+FFFD REPLACEMENT CHARACTER.
      u.push(0xFFFD);
    }

    // 0xD800 ≤ c ≤ 0xDBFF
    else if (0xD800 <= c && c <= 0xDBFF) {
      // 1. If i = n−1, then append to U a U+FFFD REPLACEMENT
      // CHARACTER.
      if (i === n - 1) {
        u.push(0xFFFD);
      }
      // 2. Otherwise, i < n−1:
      else {
        // 1. Let d be the code unit in S at index i+1.
        var d = string.charCodeAt(i + 1);

        // 2. If 0xDC00 ≤ d ≤ 0xDFFF, then:
        if (0xDC00 <= d && d <= 0xDFFF) {
          // 1. Let a be c & 0x3FF.
          var a = c & 0x3FF;

          // 2. Let b be d & 0x3FF.
          var b = d & 0x3FF;

          // 3. Append to U the Unicode character with code point
          // 2^16+2^10*a+b.
          u.push(0x10000 + (a << 10) + b);

          // 4. Set i to i+1.
          i += 1;
        }

        // 3. Otherwise, d < 0xDC00 or d > 0xDFFF. Append to U a
        // U+FFFD REPLACEMENT CHARACTER.
        else  {
          u.push(0xFFFD);
        }
      }
    }

    // 3. Set i to i+1.
    i += 1;
  }

  // 6. Return U.
  return u;
}

/**
 * @param {!Array.<number>} code_points Array of code points.
 * @return {string} string String of UTF-16 code units.
 */
function codePointsToString(code_points) {
  var s = '';
  for (var i = 0; i < code_points.length; ++i) {
    var cp = code_points[i];
    if (cp <= 0xFFFF) {
      s += String.fromCharCode(cp);
    } else {
      cp -= 0x10000;
      s += String.fromCharCode((cp >> 10) + 0xD800,
                               (cp & 0x3FF) + 0xDC00);
    }
  }
  return s;
}


//
// Implementation of Encoding specification
// https://encoding.spec.whatwg.org/
//

//
// 3. Terminology
//

/**
 * End-of-stream is a special token that signifies no more tokens
 * are in the stream.
 * @const
 */ var end_of_stream = -1;

/**
 * A stream represents an ordered sequence of tokens.
 *
 * @constructor
 * @param {!(Array.<number>|Uint8Array)} tokens Array of tokens that provide the
 * stream.
 */
function Stream(tokens) {
  /** @type {!Array.<number>} */
  this.tokens = [].slice.call(tokens);
}

Stream.prototype = {
  /**
   * @return {boolean} True if end-of-stream has been hit.
   */
  endOfStream: function() {
    return !this.tokens.length;
  },

  /**
   * When a token is read from a stream, the first token in the
   * stream must be returned and subsequently removed, and
   * end-of-stream must be returned otherwise.
   *
   * @return {number} Get the next token from the stream, or
   * end_of_stream.
   */
   read: function() {
    if (!this.tokens.length)
      return end_of_stream;
     return this.tokens.shift();
   },

  /**
   * When one or more tokens are prepended to a stream, those tokens
   * must be inserted, in given order, before the first token in the
   * stream.
   *
   * @param {(number|!Array.<number>)} token The token(s) to prepend to the stream.
   */
  prepend: function(token) {
    if (Array.isArray(token)) {
      var tokens = /**@type {!Array.<number>}*/(token);
      while (tokens.length)
        this.tokens.unshift(tokens.pop());
    } else {
      this.tokens.unshift(token);
    }
  },

  /**
   * When one or more tokens are pushed to a stream, those tokens
   * must be inserted, in given order, after the last token in the
   * stream.
   *
   * @param {(number|!Array.<number>)} token The tokens(s) to prepend to the stream.
   */
  push: function(token) {
    if (Array.isArray(token)) {
      var tokens = /**@type {!Array.<number>}*/(token);
      while (tokens.length)
        this.tokens.push(tokens.shift());
    } else {
      this.tokens.push(token);
    }
  }
};

//
// 4. Encodings
//

// 4.1 Encoders and decoders

/** @const */
var finished = -1;

/**
 * @param {boolean} fatal If true, decoding errors raise an exception.
 * @param {number=} opt_code_point Override the standard fallback code point.
 * @return {number} The code point to insert on a decoding error.
 */
function decoderError(fatal, opt_code_point) {
  if (fatal)
    throw TypeError('Decoder error');
  return opt_code_point || 0xFFFD;
}

//
// 7. API
//

/** @const */ var DEFAULT_ENCODING = 'utf-8';

// 7.1 Interface TextDecoder

/**
 * @constructor
 * @param {string=} encoding The label of the encoding;
 *     defaults to 'utf-8'.
 * @param {Object=} options
 */
function TextDecoder(encoding, options) {
  if (!(this instanceof TextDecoder)) {
    return new TextDecoder(encoding, options);
  }
  encoding = encoding !== undefined ? String(encoding).toLowerCase() : DEFAULT_ENCODING;
  if (encoding !== DEFAULT_ENCODING) {
    throw new Error('Encoding not supported. Only utf-8 is supported');
  }
  options = ToDictionary(options);

  /** @private @type {boolean} */
  this._streaming = false;
  /** @private @type {boolean} */
  this._BOMseen = false;
  /** @private @type {?Decoder} */
  this._decoder = null;
  /** @private @type {boolean} */
  this._fatal = Boolean(options['fatal']);
  /** @private @type {boolean} */
  this._ignoreBOM = Boolean(options['ignoreBOM']);

  Object.defineProperty(this, 'encoding', {value: 'utf-8'});
  Object.defineProperty(this, 'fatal', {value: this._fatal});
  Object.defineProperty(this, 'ignoreBOM', {value: this._ignoreBOM});
}

TextDecoder.prototype = {
  /**
   * @param {ArrayBufferView=} input The buffer of bytes to decode.
   * @param {Object=} options
   * @return {string} The decoded string.
   */
  decode: function decode(input, options) {
    var bytes;
    if (typeof input === 'object' && input instanceof ArrayBuffer) {
      bytes = new Uint8Array(input);
    } else if (typeof input === 'object' && 'buffer' in input &&
               input.buffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(input.buffer,
                             input.byteOffset,
                             input.byteLength);
    } else {
      bytes = new Uint8Array(0);
    }

    options = ToDictionary(options);

    if (!this._streaming) {
      this._decoder = new UTF8Decoder({fatal: this._fatal});
      this._BOMseen = false;
    }
    this._streaming = Boolean(options['stream']);

    var input_stream = new Stream(bytes);

    var code_points = [];

    /** @type {?(number|!Array.<number>)} */
    var result;

    while (!input_stream.endOfStream()) {
      result = this._decoder.handler(input_stream, input_stream.read());
      if (result === finished)
        break;
      if (result === null)
        continue;
      if (Array.isArray(result))
        code_points.push.apply(code_points, /**@type {!Array.<number>}*/(result));
      else
        code_points.push(result);
    }
    if (!this._streaming) {
      do {
        result = this._decoder.handler(input_stream, input_stream.read());
        if (result === finished)
          break;
        if (result === null)
          continue;
        if (Array.isArray(result))
          code_points.push.apply(code_points, /**@type {!Array.<number>}*/(result));
        else
          code_points.push(result);
      } while (!input_stream.endOfStream());
      this._decoder = null;
    }

    if (code_points.length) {
      // If encoding is one of utf-8, utf-16be, and utf-16le, and
      // ignore BOM flag and BOM seen flag are unset, run these
      // subsubsteps:
      if (['utf-8'].indexOf(this.encoding) !== -1 &&
          !this._ignoreBOM && !this._BOMseen) {
        // If token is U+FEFF, set BOM seen flag.
        if (code_points[0] === 0xFEFF) {
          this._BOMseen = true;
          code_points.shift();
        } else {
          // Otherwise, if token is not end-of-stream, set BOM seen
          // flag and append token to output.
          this._BOMseen = true;
        }
      }
    }

    return codePointsToString(code_points);
  }
};

// 7.2 Interface TextEncoder

/**
 * @constructor
 * @param {string=} encoding The label of the encoding;
 *     defaults to 'utf-8'.
 * @param {Object=} options
 */
function TextEncoder(encoding, options) {
  if (!(this instanceof TextEncoder))
    return new TextEncoder(encoding, options);
  encoding = encoding !== undefined ? String(encoding).toLowerCase() : DEFAULT_ENCODING;
  if (encoding !== DEFAULT_ENCODING) {
    throw new Error('Encoding not supported. Only utf-8 is supported');
  }
  options = ToDictionary(options);

  /** @private @type {boolean} */
  this._streaming = false;
  /** @private @type {?Encoder} */
  this._encoder = null;
  /** @private @type {{fatal: boolean}} */
  this._options = {fatal: Boolean(options['fatal'])};

  Object.defineProperty(this, 'encoding', {value: 'utf-8'});
}

TextEncoder.prototype = {
  /**
   * @param {string=} opt_string The string to encode.
   * @param {Object=} options
   * @return {Uint8Array} Encoded bytes, as a Uint8Array.
   */
  encode: function encode(opt_string, options) {
    opt_string = opt_string ? String(opt_string) : '';
    options = ToDictionary(options);

    // NOTE: This option is nonstandard. None of the encodings
    // permitted for encoding (i.e. UTF-8, UTF-16) are stateful,
    // so streaming is not necessary.
    if (!this._streaming)
      this._encoder = new UTF8Encoder(this._options);
    this._streaming = Boolean(options['stream']);

    var bytes = [];
    var input_stream = new Stream(stringToCodePoints(opt_string));
    /** @type {?(number|!Array.<number>)} */
    var result;
    while (!input_stream.endOfStream()) {
      result = this._encoder.handler(input_stream, input_stream.read());
      if (result === finished)
        break;
      if (Array.isArray(result))
        bytes.push.apply(bytes, /**@type {!Array.<number>}*/(result));
      else
        bytes.push(result);
    }
    if (!this._streaming) {
      while (true) {
        result = this._encoder.handler(input_stream, input_stream.read());
        if (result === finished)
          break;
        if (Array.isArray(result))
          bytes.push.apply(bytes, /**@type {!Array.<number>}*/(result));
        else
          bytes.push(result);
      }
      this._encoder = null;
    }
    return new Uint8Array(bytes);
  }
};

//
// 8. The encoding
//

// 8.1 utf-8

/**
 * @constructor
 * @implements {Decoder}
 * @param {{fatal: boolean}} options
 */
function UTF8Decoder(options) {
  var fatal = options.fatal;

  // utf-8's decoder's has an associated utf-8 code point, utf-8
  // bytes seen, and utf-8 bytes needed (all initially 0), a utf-8
  // lower boundary (initially 0x80), and a utf-8 upper boundary
  // (initially 0xBF).
  var /** @type {number} */ utf8_code_point = 0,
      /** @type {number} */ utf8_bytes_seen = 0,
      /** @type {number} */ utf8_bytes_needed = 0,
      /** @type {number} */ utf8_lower_boundary = 0x80,
      /** @type {number} */ utf8_upper_boundary = 0xBF;

  /**
   * @param {Stream} stream The stream of bytes being decoded.
   * @param {number} bite The next byte read from the stream.
   * @return {?(number|!Array.<number>)} The next code point(s)
   *     decoded, or null if not enough data exists in the input
   *     stream to decode a complete code point.
   */
  this.handler = function(stream, bite) {
    // 1. If byte is end-of-stream and utf-8 bytes needed is not 0,
    // set utf-8 bytes needed to 0 and return error.
    if (bite === end_of_stream && utf8_bytes_needed !== 0) {
      utf8_bytes_needed = 0;
      return decoderError(fatal);
    }

    // 2. If byte is end-of-stream, return finished.
    if (bite === end_of_stream)
      return finished;

    // 3. If utf-8 bytes needed is 0, based on byte:
    if (utf8_bytes_needed === 0) {

      // 0x00 to 0x7F
      if (inRange(bite, 0x00, 0x7F)) {
        // Return a code point whose value is byte.
        return bite;
      }

      // 0xC2 to 0xDF
      if (inRange(bite, 0xC2, 0xDF)) {
        // Set utf-8 bytes needed to 1 and utf-8 code point to byte
        // − 0xC0.
        utf8_bytes_needed = 1;
        utf8_code_point = bite - 0xC0;
      }

      // 0xE0 to 0xEF
      else if (inRange(bite, 0xE0, 0xEF)) {
        // 1. If byte is 0xE0, set utf-8 lower boundary to 0xA0.
        if (bite === 0xE0)
          utf8_lower_boundary = 0xA0;
        // 2. If byte is 0xED, set utf-8 upper boundary to 0x9F.
        if (bite === 0xED)
          utf8_upper_boundary = 0x9F;
        // 3. Set utf-8 bytes needed to 2 and utf-8 code point to
        // byte − 0xE0.
        utf8_bytes_needed = 2;
        utf8_code_point = bite - 0xE0;
      }

      // 0xF0 to 0xF4
      else if (inRange(bite, 0xF0, 0xF4)) {
        // 1. If byte is 0xF0, set utf-8 lower boundary to 0x90.
        if (bite === 0xF0)
          utf8_lower_boundary = 0x90;
        // 2. If byte is 0xF4, set utf-8 upper boundary to 0x8F.
        if (bite === 0xF4)
          utf8_upper_boundary = 0x8F;
        // 3. Set utf-8 bytes needed to 3 and utf-8 code point to
        // byte − 0xF0.
        utf8_bytes_needed = 3;
        utf8_code_point = bite - 0xF0;
      }

      // Otherwise
      else {
        // Return error.
        return decoderError(fatal);
      }

      // Then (byte is in the range 0xC2 to 0xF4) set utf-8 code
      // point to utf-8 code point << (6 × utf-8 bytes needed) and
      // return continue.
      utf8_code_point = utf8_code_point << (6 * utf8_bytes_needed);
      return null;
    }

    // 4. If byte is not in the range utf-8 lower boundary to utf-8
    // upper boundary, run these substeps:
    if (!inRange(bite, utf8_lower_boundary, utf8_upper_boundary)) {

      // 1. Set utf-8 code point, utf-8 bytes needed, and utf-8
      // bytes seen to 0, set utf-8 lower boundary to 0x80, and set
      // utf-8 upper boundary to 0xBF.
      utf8_code_point = utf8_bytes_needed = utf8_bytes_seen = 0;
      utf8_lower_boundary = 0x80;
      utf8_upper_boundary = 0xBF;

      // 2. Prepend byte to stream.
      stream.prepend(bite);

      // 3. Return error.
      return decoderError(fatal);
    }

    // 5. Set utf-8 lower boundary to 0x80 and utf-8 upper boundary
    // to 0xBF.
    utf8_lower_boundary = 0x80;
    utf8_upper_boundary = 0xBF;

    // 6. Increase utf-8 bytes seen by one and set utf-8 code point
    // to utf-8 code point + (byte − 0x80) << (6 × (utf-8 bytes
    // needed − utf-8 bytes seen)).
    utf8_bytes_seen += 1;
    utf8_code_point += (bite - 0x80) << (6 * (utf8_bytes_needed - utf8_bytes_seen));

    // 7. If utf-8 bytes seen is not equal to utf-8 bytes needed,
    // continue.
    if (utf8_bytes_seen !== utf8_bytes_needed)
      return null;

    // 8. Let code point be utf-8 code point.
    var code_point = utf8_code_point;

    // 9. Set utf-8 code point, utf-8 bytes needed, and utf-8 bytes
    // seen to 0.
    utf8_code_point = utf8_bytes_needed = utf8_bytes_seen = 0;

    // 10. Return a code point whose value is code point.
    return code_point;
  };
}

/**
 * @constructor
 * @implements {Encoder}
 * @param {{fatal: boolean}} options
 */
function UTF8Encoder(options) {
  var fatal = options.fatal;
  /**
   * @param {Stream} stream Input stream.
   * @param {number} code_point Next code point read from the stream.
   * @return {(number|!Array.<number>)} Byte(s) to emit.
   */
  this.handler = function(stream, code_point) {
    // 1. If code point is end-of-stream, return finished.
    if (code_point === end_of_stream)
      return finished;

    // 2. If code point is in the range U+0000 to U+007F, return a
    // byte whose value is code point.
    if (inRange(code_point, 0x0000, 0x007f))
      return code_point;

    // 3. Set count and offset based on the range code point is in:
    var count, offset;
    // U+0080 to U+07FF:    1 and 0xC0
    if (inRange(code_point, 0x0080, 0x07FF)) {
      count = 1;
      offset = 0xC0;
    }
    // U+0800 to U+FFFF:    2 and 0xE0
    else if (inRange(code_point, 0x0800, 0xFFFF)) {
      count = 2;
      offset = 0xE0;
    }
    // U+10000 to U+10FFFF: 3 and 0xF0
    else if (inRange(code_point, 0x10000, 0x10FFFF)) {
      count = 3;
      offset = 0xF0;
    }

    // 4.Let bytes be a byte sequence whose first byte is (code
    // point >> (6 × count)) + offset.
    var bytes = [(code_point >> (6 * count)) + offset];

    // 5. Run these substeps while count is greater than 0:
    while (count > 0) {

      // 1. Set temp to code point >> (6 × (count − 1)).
      var temp = code_point >> (6 * (count - 1));

      // 2. Append to bytes 0x80 | (temp & 0x3F).
      bytes.push(0x80 | (temp & 0x3F));

      // 3. Decrease count by one.
      count -= 1;
    }

    // 6. Return bytes bytes, in order.
    return bytes;
  };
}

exports.TextEncoder = TextEncoder;
exports.TextDecoder = TextDecoder;
},{}],53:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Inteface define a common way to acquire a connection
 *
 * @private
 */
var ConnectionProvider = /** @class */ (function () {
    function ConnectionProvider() {
    }
    /**
     * This method acquires a connection against the specified database.
     *
     * Access mode and Bookmarks only applies to routing driver. Access mode only
     * differentiates the target server for the connection, where WRITE selects a
     * WRITER server, whereas READ selects a READ server. Bookmarks, when specified,
     * is only passed to the routing discovery procedure, for the system database to
     * synchronize on creation of databases and is never used in direct drivers.
     *
     * @param {object} param - object parameter
     * @param {string} param.accessMode - the access mode for the to-be-acquired connection
     * @param {string} param.database - the target database for the to-be-acquired connection
     * @param {Bookmark} param.bookmarks - the bookmarks to send to routing discovery
     */
    ConnectionProvider.prototype.acquireConnection = function (params) {
        throw Error('Not implemented');
    };
    /**
     * This method checks whether the backend database supports multi database functionality
     * by checking protocol handshake result.
     *
     * @returns {Promise<boolean>}
     */
    ConnectionProvider.prototype.supportsMultiDb = function () {
        throw Error('Not implemented');
    };
    /**
     * This method checks whether the backend database supports transaction config functionality
     * by checking protocol handshake result.
     *
     * @returns {Promise<boolean>}
     */
    ConnectionProvider.prototype.supportsTransactionConfig = function () {
        throw Error('Not implemented');
    };
    /**
     * Closes this connection provider along with its internals (connections, pools, etc.)
     *
     * @returns {Promise<void>}
     */
    ConnectionProvider.prototype.close = function () {
        throw Error('Not implemented');
    };
    return ConnectionProvider;
}());
exports.default = ConnectionProvider;

},{}],54:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Interface which defines the raw connection with the database
 * @private
 */
var Connection = /** @class */ (function () {
    function Connection() {
    }
    /**
     * @returns {boolean} whether this connection is in a working condition
     */
    Connection.prototype.isOpen = function () {
        return false;
    };
    /**
     * @todo be removed and internalize the methods
     * @returns {any} the underlying bolt protocol assigned to this connection
     */
    Connection.prototype.protocol = function () {
        throw Error('Not implemented');
    };
    /**
     * Connect to the target address, negotiate Bolt protocol and send initialization message.
     * @param {string} userAgent the user agent for this driver.
     * @param {Object} authToken the object containing auth information.
     * @return {Promise<Connection>} promise resolved with the current connection if connection is successful. Rejected promise otherwise.
     */
    Connection.prototype.connect = function (userAgent, authToken) {
        throw Error('Not implemented');
    };
    /**
     * Write a message to the network channel.
     * @param {RequestMessage} message the message to write.
     * @param {ResultStreamObserver} observer the response observer.
     * @param {boolean} flush `true` if flush should happen after the message is written to the buffer.
     */
    Connection.prototype.write = function (message, observer, flush) {
        throw Error('Not implemented');
    };
    /**
     * Send a RESET-message to the database. Message is immediately flushed to the network.
     * @return {Promise<void>} promise resolved when SUCCESS-message response arrives, or failed when other response messages arrives.
     */
    Connection.prototype.resetAndFlush = function () {
        throw Error('Not implemented');
    };
    /**
     * Call close on the channel.
     * @returns {Promise<void>} - A promise that will be resolved when the connection is closed.
     *
     */
    Connection.prototype.close = function () {
        throw Error('Not implemented');
    };
    /**
     * Called to release the connection
     */
    Connection.prototype._release = function () {
        return Promise.resolve();
    };
    return Connection;
}());
exports.default = Connection;

},{}],55:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WRITE = exports.READ = exports.Driver = void 0;
var bookmark_1 = require("./internal/bookmark");
var connectivity_verifier_1 = require("./internal/connectivity-verifier");
var configured_custom_resolver_1 = __importDefault(require("./internal/resolver/configured-custom-resolver"));
var constants_1 = require("./internal/constants");
var logger_1 = require("./internal/logger");
var session_1 = __importDefault(require("./session"));
var util_1 = require("./internal/util");
var DEFAULT_MAX_CONNECTION_LIFETIME = 60 * 60 * 1000; // 1 hour
/**
 * The default record fetch size. This is used in Bolt V4 protocol to pull query execution result in batches.
 * @type {number}
 */
var DEFAULT_FETCH_SIZE = 1000;
/**
 * Constant that represents read session access mode.
 * Should be used like this: `driver.session({ defaultAccessMode: neo4j.session.READ })`.
 * @type {string}
 */
var READ = constants_1.ACCESS_MODE_READ;
exports.READ = READ;
/**
 * Constant that represents write session access mode.
 * Should be used like this: `driver.session({ defaultAccessMode: neo4j.session.WRITE })`.
 * @type {string}
 */
var WRITE = constants_1.ACCESS_MODE_WRITE;
exports.WRITE = WRITE;
var idGenerator = 0;
/**
 * A driver maintains one or more {@link Session}s with a remote
 * Neo4j instance. Through the {@link Session}s you can send queries
 * and retrieve results from the database.
 *
 * Drivers are reasonably expensive to create - you should strive to keep one
 * driver instance around per Neo4j Instance you connect to.
 *
 * @access public
 */
var Driver = /** @class */ (function () {
    /**
     * You should not be calling this directly, instead use {@link driver}.
     * @constructor
     * @protected
     * @param {Object} meta Metainformation about the driver
     * @param {Object} config
     * @param {function(id: number, config:Object, log:Logger, hostNameResolver: ConfiguredCustomResolver): ConnectionProvider } createConnectonProvider Creates the connection provider
     */
    function Driver(meta, config, createConnectonProvider) {
        if (config === void 0) { config = {}; }
        sanitizeConfig(config);
        validateConfig(config);
        this._id = idGenerator++;
        this._meta = meta;
        this._config = config;
        this._log = logger_1.Logger.create(config);
        this._createConnectionProvider = createConnectonProvider;
        /**
         * Reference to the connection provider. Initialized lazily by {@link _getOrCreateConnectionProvider}.
         * @type {ConnectionProvider}
         * @protected
         */
        this._connectionProvider = null;
        this._afterConstruction();
    }
    /**
     * Verifies connectivity of this driver by trying to open a connection with the provided driver options.
     *
     * @public
     * @param {Object} param - The object parameter
     * @param {string} param.database - The target database to verify connectivity for.
     * @returns {Promise<ServerInfo>} promise resolved with server info or rejected with error.
     */
    Driver.prototype.verifyConnectivity = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.database, database = _c === void 0 ? '' : _c;
        var connectionProvider = this._getOrCreateConnectionProvider();
        var connectivityVerifier = new connectivity_verifier_1.ConnectivityVerifier(connectionProvider);
        return connectivityVerifier.verify({ database: database });
    };
    /**
     * Returns whether the server supports multi database capabilities based on the protocol
     * version negotiated via handshake.
     *
     * Note that this function call _always_ causes a round-trip to the server.
     *
     * @returns {Promise<boolean>} promise resolved with a boolean or rejected with error.
     */
    Driver.prototype.supportsMultiDb = function () {
        var connectionProvider = this._getOrCreateConnectionProvider();
        return connectionProvider.supportsMultiDb();
    };
    /**
     * Returns whether the server supports transaction config capabilities based on the protocol
     * version negotiated via handshake.
     *
     * Note that this function call _always_ causes a round-trip to the server.
     *
     * @returns {Promise<boolean>} promise resolved with a boolean or rejected with error.
     */
    Driver.prototype.supportsTransactionConfig = function () {
        var connectionProvider = this._getOrCreateConnectionProvider();
        return connectionProvider.supportsTransactionConfig();
    };
    /**
     * @protected
     * @returns {boolean}
     */
    Driver.prototype._supportsRouting = function () {
        return this._meta.routing;
    };
    /**
     * Returns boolean to indicate if driver has been configured with encryption enabled.
     *
     * @protected
     * @returns {boolean}
     */
    Driver.prototype._isEncrypted = function () {
        return this._config.encrypted === util_1.ENCRYPTION_ON;
    };
    /**
     * Returns the configured trust strategy that the driver has been configured with.
     *
     * @protected
     * @returns {TrustStrategy}
     */
    Driver.prototype._getTrust = function () {
        return this._config.trust;
    };
    /**
     * Acquire a session to communicate with the database. The session will
     * borrow connections from the underlying connection pool as required and
     * should be considered lightweight and disposable.
     *
     * This comes with some responsibility - make sure you always call
     * {@link close} when you are done using a session, and likewise,
     * make sure you don't close your session before you are done using it. Once
     * it is closed, the underlying connection will be released to the connection
     * pool and made available for others to use.
     *
     * @public
     * @param {Object} param - The object parameter
     * @param {string} param.defaultAccessMode=WRITE - The access mode of this session, allowed values are {@link READ} and {@link WRITE}.
     * @param {string|string[]} param.bookmarks - The initial reference or references to some previous
     * transactions. Value is optional and absence indicates that that the bookmarks do not exist or are unknown.
     * @param {number} param.fetchSize - The record fetch size of each batch of this session.
     * Use {@link FETCH_ALL} to always pull all records in one batch. This will override the config value set on driver config.
     * @param {string} param.database - The database this session will operate on.
     * @return {Session} new session.
     */
    Driver.prototype.session = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.defaultAccessMode, defaultAccessMode = _c === void 0 ? WRITE : _c, bookmarkOrBookmarks = _b.bookmarks, _d = _b.database, database = _d === void 0 ? '' : _d, fetchSize = _b.fetchSize;
        return this._newSession({
            defaultAccessMode: defaultAccessMode,
            bookmarkOrBookmarks: bookmarkOrBookmarks,
            database: database,
            reactive: false,
            fetchSize: validateFetchSizeValue(fetchSize, this._config.fetchSize)
        });
    };
    /**
     * Close all open sessions and other associated resources. You should
     * make sure to use this when you are done with this driver instance.
     * @public
     * @return {Promise<void>} promise resolved when the driver is closed.
     */
    Driver.prototype.close = function () {
        this._log.info("Driver " + this._id + " closing");
        if (this._connectionProvider) {
            return this._connectionProvider.close();
        }
        return Promise.resolve();
    };
    /**
     * @protected
     */
    Driver.prototype._afterConstruction = function () {
        this._log.info(this._meta.typename + " driver " + this._id + " created for server address " + this._meta.address);
    };
    /**
     * @private
     */
    Driver.prototype._newSession = function (_a) {
        var defaultAccessMode = _a.defaultAccessMode, bookmarkOrBookmarks = _a.bookmarkOrBookmarks, database = _a.database, reactive = _a.reactive, fetchSize = _a.fetchSize;
        var sessionMode = session_1.default._validateSessionMode(defaultAccessMode);
        var connectionProvider = this._getOrCreateConnectionProvider();
        var bookmark = bookmarkOrBookmarks
            ? new bookmark_1.Bookmark(bookmarkOrBookmarks)
            : bookmark_1.Bookmark.empty();
        return new session_1.default({
            mode: sessionMode,
            database: database || '',
            connectionProvider: connectionProvider,
            bookmark: bookmark,
            config: this._config,
            reactive: reactive,
            fetchSize: fetchSize
        });
    };
    /**
     * @private
     */
    Driver.prototype._getOrCreateConnectionProvider = function () {
        if (!this._connectionProvider) {
            this._connectionProvider = this._createConnectionProvider(this._id, this._config, this._log, createHostNameResolver(this._config));
        }
        return this._connectionProvider;
    };
    return Driver;
}());
exports.Driver = Driver;
/**
 * @private
 * @returns {Object} the given config.
 */
function validateConfig(config) {
    var resolver = config.resolver;
    if (resolver && typeof resolver !== 'function') {
        throw new TypeError("Configured resolver should be a function. Got: " + resolver);
    }
    return config;
}
/**
 * @private
 */
function sanitizeConfig(config) {
    config.maxConnectionLifetime = sanitizeIntValue(config.maxConnectionLifetime, DEFAULT_MAX_CONNECTION_LIFETIME);
    config.maxConnectionPoolSize = sanitizeIntValue(config.maxConnectionPoolSize, constants_1.DEFAULT_POOL_MAX_SIZE);
    config.connectionAcquisitionTimeout = sanitizeIntValue(config.connectionAcquisitionTimeout, constants_1.DEFAULT_POOL_ACQUISITION_TIMEOUT);
    config.fetchSize = validateFetchSizeValue(config.fetchSize, DEFAULT_FETCH_SIZE);
}
/**
 * @private
 */
function sanitizeIntValue(rawValue, defaultWhenAbsent) {
    var sanitizedValue = parseInt(rawValue, 10);
    if (sanitizedValue > 0 || sanitizedValue === 0) {
        return sanitizedValue;
    }
    else if (sanitizedValue < 0) {
        return Number.MAX_SAFE_INTEGER;
    }
    else {
        return defaultWhenAbsent;
    }
}
/**
 * @private
 */
function validateFetchSizeValue(rawValue, defaultWhenAbsent) {
    var fetchSize = parseInt(rawValue, 10);
    if (fetchSize > 0 || fetchSize === constants_1.FETCH_ALL) {
        return fetchSize;
    }
    else if (fetchSize === 0 || fetchSize < 0) {
        throw new Error("The fetch size can only be a positive value or " + constants_1.FETCH_ALL + " for ALL. However fetchSize = " + fetchSize);
    }
    else {
        return defaultWhenAbsent;
    }
}
/**
 * @private
 * @returns {ConfiguredCustomResolver} new custom resolver that wraps the passed-in resolver function.
 *              If resolved function is not specified, it defaults to an identity resolver.
 */
function createHostNameResolver(config) {
    return new configured_custom_resolver_1.default(config.resolver);
}
exports.default = Driver;

},{"./internal/bookmark":60,"./internal/connectivity-verifier":62,"./internal/constants":63,"./internal/logger":65,"./internal/resolver/configured-custom-resolver":68,"./internal/util":76,"./session":81}],56:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROTOCOL_ERROR = exports.SESSION_EXPIRED = exports.SERVICE_UNAVAILABLE = exports.Neo4jError = exports.newError = void 0;
// A common place for constructing error objects, to keep them
// uniform across the driver surface.
/**
 * Error code representing complete loss of service. Used by {@link Neo4jError#code}.
 * @type {string}
 */
var SERVICE_UNAVAILABLE = 'ServiceUnavailable';
exports.SERVICE_UNAVAILABLE = SERVICE_UNAVAILABLE;
/**
 * Error code representing transient loss of service. Used by {@link Neo4jError#code}.
 * @type {string}
 */
var SESSION_EXPIRED = 'SessionExpired';
exports.SESSION_EXPIRED = SESSION_EXPIRED;
/**
 * Error code representing serialization/deserialization issue in the Bolt protocol. Used by {@link Neo4jError#code}.
 * @type {string}
 */
var PROTOCOL_ERROR = 'ProtocolError';
exports.PROTOCOL_ERROR = PROTOCOL_ERROR;
/**
 * Error code representing an no classified error. Used by {@link Neo4jError#code}.
 * @type {string}
 */
var NOT_AVAILABLE = 'N/A';
/// TODO: Remove definitions of this.constructor and this.__proto__
/**
 * Class for all errors thrown/returned by the driver.
 */
var Neo4jError = /** @class */ (function (_super) {
    __extends(Neo4jError, _super);
    /**
     * @constructor
     * @param {string} message - the error message
     * @param {string} code - Optional error code. Will be populated when error originates in the database.
     */
    function Neo4jError(message, code) {
        var _this = _super.call(this, message) || this;
        _this.constructor = Neo4jError;
        // eslint-disable-next-line no-proto
        _this.__proto__ = Neo4jError.prototype;
        _this.code = code;
        _this.name = 'Neo4jError';
        return _this;
    }
    return Neo4jError;
}(Error));
exports.Neo4jError = Neo4jError;
/**
 * Create a new error from a message and error code
 * @param message the error message
 * @param code the error code
 * @return {Neo4jError} an {@link Neo4jError}
 * @private
 */
function newError(message, code) {
    return new Neo4jError(message, code !== null && code !== void 0 ? code : NOT_AVAILABLE);
}
exports.newError = newError;

},{}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPathSegment = exports.PathSegment = exports.isPath = exports.Path = exports.isUnboundRelationship = exports.UnboundRelationship = exports.isRelationship = exports.Relationship = exports.isNode = exports.Node = void 0;
var json_1 = require("./json");
var IDENTIFIER_PROPERTY_ATTRIBUTES = {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false
};
var NODE_IDENTIFIER_PROPERTY = '__isNode__';
var RELATIONSHIP_IDENTIFIER_PROPERTY = '__isRelationship__';
var UNBOUND_RELATIONSHIP_IDENTIFIER_PROPERTY = '__isUnboundRelationship__';
var PATH_IDENTIFIER_PROPERTY = '__isPath__';
var PATH_SEGMENT_IDENTIFIER_PROPERTY = '__isPathSegment__';
function hasIdentifierProperty(obj, property) {
    return (obj && obj[property]) === true;
}
/**
 * Class for Node Type.
 */
var Node = /** @class */ (function () {
    /**
     * @constructor
     * @protected
     * @param {Integer|number} identity - Unique identity
     * @param {Array<string>} labels - Array for all labels
     * @param {Object} properties - Map with node properties
     */
    function Node(identity, labels, properties) {
        /**
         * Identity of the node.
         * @type {Integer|number}
         */
        this.identity = identity;
        /**
         * Labels of the node.
         * @type {string[]}
         */
        this.labels = labels;
        /**
         * Properties of the node.
         * @type {Object}
         */
        this.properties = properties;
    }
    /**
     * @ignore
     */
    Node.prototype.toString = function () {
        var s = '(' + this.identity;
        for (var i = 0; i < this.labels.length; i++) {
            s += ':' + this.labels[i];
        }
        var keys = Object.keys(this.properties);
        if (keys.length > 0) {
            s += ' {';
            for (var i = 0; i < keys.length; i++) {
                if (i > 0)
                    s += ',';
                s += keys[i] + ':' + json_1.stringify(this.properties[keys[i]]);
            }
            s += '}';
        }
        s += ')';
        return s;
    };
    return Node;
}());
exports.Node = Node;
Object.defineProperty(Node.prototype, NODE_IDENTIFIER_PROPERTY, IDENTIFIER_PROPERTY_ATTRIBUTES);
/**
 * Test if given object is an instance of {@link Node} class.
 * @param {Object} obj the object to test.
 * @return {boolean} `true` if given object is a {@link Node}, `false` otherwise.
 */
function isNode(obj) {
    return hasIdentifierProperty(obj, NODE_IDENTIFIER_PROPERTY);
}
exports.isNode = isNode;
/**
 * Class for Relationship Type.
 */
var Relationship = /** @class */ (function () {
    /**
     * @constructor
     * @protected
     * @param {Integer|number} identity - Unique identity
     * @param {Integer|number} start - Identity of start Node
     * @param {Integer|number} end - Identity of end Node
     * @param {string} type - Relationship type
     * @param {Object} properties - Map with relationship properties
     */
    function Relationship(identity, start, end, type, properties) {
        /**
         * Identity of the relationship.
         * @type {Integer|number}
         */
        this.identity = identity;
        /**
         * Identity of the start node.
         * @type {Integer|number}
         */
        this.start = start;
        /**
         * Identity of the end node.
         * @type {Integer|number}
         */
        this.end = end;
        /**
         * Type of the relationship.
         * @type {string}
         */
        this.type = type;
        /**
         * Properties of the relationship.
         * @type {Object}
         */
        this.properties = properties;
    }
    /**
     * @ignore
     */
    Relationship.prototype.toString = function () {
        var s = '(' + this.start + ')-[:' + this.type;
        var keys = Object.keys(this.properties);
        if (keys.length > 0) {
            s += ' {';
            for (var i = 0; i < keys.length; i++) {
                if (i > 0)
                    s += ',';
                s += keys[i] + ':' + json_1.stringify(this.properties[keys[i]]);
            }
            s += '}';
        }
        s += ']->(' + this.end + ')';
        return s;
    };
    return Relationship;
}());
exports.Relationship = Relationship;
Object.defineProperty(Relationship.prototype, RELATIONSHIP_IDENTIFIER_PROPERTY, IDENTIFIER_PROPERTY_ATTRIBUTES);
/**
 * Test if given object is an instance of {@link Relationship} class.
 * @param {Object} obj the object to test.
 * @return {boolean} `true` if given object is a {@link Relationship}, `false` otherwise.
 */
function isRelationship(obj) {
    return hasIdentifierProperty(obj, RELATIONSHIP_IDENTIFIER_PROPERTY);
}
exports.isRelationship = isRelationship;
/**
 * Class for UnboundRelationship Type.
 * @access private
 */
var UnboundRelationship = /** @class */ (function () {
    /**
     * @constructor
     * @protected
     * @param {Integer|number} identity - Unique identity
     * @param {string} type - Relationship type
     * @param {Object} properties - Map with relationship properties
     */
    function UnboundRelationship(identity, type, properties) {
        /**
         * Identity of the relationship.
         * @type {Integer|number}
         */
        this.identity = identity;
        /**
         * Type of the relationship.
         * @type {string}
         */
        this.type = type;
        /**
         * Properties of the relationship.
         * @type {Object}
         */
        this.properties = properties;
    }
    /**
     * Bind relationship
     *
     * @protected
     * @param {Integer} start - Identity of start node
     * @param {Integer} end - Identity of end node
     * @return {Relationship} - Created relationship
     */
    UnboundRelationship.prototype.bind = function (start, end) {
        return new Relationship(this.identity, start, end, this.type, this.properties);
    };
    /**
     * @ignore
     */
    UnboundRelationship.prototype.toString = function () {
        var s = '-[:' + this.type;
        var keys = Object.keys(this.properties);
        if (keys.length > 0) {
            s += ' {';
            for (var i = 0; i < keys.length; i++) {
                if (i > 0)
                    s += ',';
                s += keys[i] + ':' + json_1.stringify(this.properties[keys[i]]);
            }
            s += '}';
        }
        s += ']->';
        return s;
    };
    return UnboundRelationship;
}());
exports.UnboundRelationship = UnboundRelationship;
Object.defineProperty(UnboundRelationship.prototype, UNBOUND_RELATIONSHIP_IDENTIFIER_PROPERTY, IDENTIFIER_PROPERTY_ATTRIBUTES);
/**
 * Test if given object is an instance of {@link UnboundRelationship} class.
 * @param {Object} obj the object to test.
 * @return {boolean} `true` if given object is a {@link UnboundRelationship}, `false` otherwise.
 */
function isUnboundRelationship(obj) {
    return hasIdentifierProperty(obj, UNBOUND_RELATIONSHIP_IDENTIFIER_PROPERTY);
}
exports.isUnboundRelationship = isUnboundRelationship;
/**
 * Class for PathSegment Type.
 */
var PathSegment = /** @class */ (function () {
    /**
     * @constructor
     * @protected
     * @param {Node} start - start node
     * @param {Relationship} rel - relationship that connects start and end node
     * @param {Node} end - end node
     */
    function PathSegment(start, rel, end) {
        /**
         * Start node.
         * @type {Node}
         */
        this.start = start;
        /**
         * Relationship.
         * @type {Relationship}
         */
        this.relationship = rel;
        /**
         * End node.
         * @type {Node}
         */
        this.end = end;
    }
    return PathSegment;
}());
exports.PathSegment = PathSegment;
Object.defineProperty(PathSegment.prototype, PATH_SEGMENT_IDENTIFIER_PROPERTY, IDENTIFIER_PROPERTY_ATTRIBUTES);
/**
 * Test if given object is an instance of {@link PathSegment} class.
 * @param {Object} obj the object to test.
 * @return {boolean} `true` if given object is a {@link PathSegment}, `false` otherwise.
 */
function isPathSegment(obj) {
    return hasIdentifierProperty(obj, PATH_SEGMENT_IDENTIFIER_PROPERTY);
}
exports.isPathSegment = isPathSegment;
/**
 * Class for Path Type.
 */
var Path = /** @class */ (function () {
    /**
     * @constructor
     * @protected
     * @param {Node} start  - start node
     * @param {Node} end - end node
     * @param {Array<PathSegment>} segments - Array of Segments
     */
    function Path(start, end, segments) {
        /**
         * Start node.
         * @type {Node}
         */
        this.start = start;
        /**
         * End node.
         * @type {Node}
         */
        this.end = end;
        /**
         * Segments.
         * @type {Array<PathSegment>}
         */
        this.segments = segments;
        /**
         * Length of the segments.
         * @type {Number}
         */
        this.length = segments.length;
    }
    return Path;
}());
exports.Path = Path;
Object.defineProperty(Path.prototype, PATH_IDENTIFIER_PROPERTY, IDENTIFIER_PROPERTY_ATTRIBUTES);
/**
 * Test if given object is an instance of {@link Path} class.
 * @param {Object} obj the object to test.
 * @return {boolean} `true` if given object is a {@link Path}, `false` otherwise.
 */
function isPath(obj) {
    return hasIdentifierProperty(obj, PATH_IDENTIFIER_PROPERTY);
}
exports.isPath = isPath;

},{"./json":77}],58:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.types = exports.Driver = exports.Session = exports.Transaction = exports.Connection = exports.ConnectionProvider = exports.Result = exports.Stats = exports.QueryStatistics = exports.ProfiledPlan = exports.Plan = exports.Notification = exports.ServerInfo = exports.queryType = exports.ResultSummary = exports.Record = exports.isPathSegment = exports.PathSegment = exports.isPath = exports.Path = exports.isUnboundRelationship = exports.UnboundRelationship = exports.isRelationship = exports.Relationship = exports.isNode = exports.Node = exports.Time = exports.LocalTime = exports.LocalDateTime = exports.isTime = exports.isLocalTime = exports.isLocalDateTime = exports.isDuration = exports.isDateTime = exports.isDate = exports.Duration = exports.DateTime = exports.Date = exports.Point = exports.isPoint = exports.internal = exports.toString = exports.toNumber = exports.inSafeRange = exports.isInt = exports.int = exports.Integer = exports.error = exports.Neo4jError = exports.newError = void 0;
exports.json = exports.driver = void 0;
var error_1 = require("./error");
Object.defineProperty(exports, "newError", { enumerable: true, get: function () { return error_1.newError; } });
Object.defineProperty(exports, "Neo4jError", { enumerable: true, get: function () { return error_1.Neo4jError; } });
var integer_1 = __importStar(require("./integer"));
exports.Integer = integer_1.default;
Object.defineProperty(exports, "int", { enumerable: true, get: function () { return integer_1.int; } });
Object.defineProperty(exports, "isInt", { enumerable: true, get: function () { return integer_1.isInt; } });
Object.defineProperty(exports, "inSafeRange", { enumerable: true, get: function () { return integer_1.inSafeRange; } });
Object.defineProperty(exports, "toNumber", { enumerable: true, get: function () { return integer_1.toNumber; } });
Object.defineProperty(exports, "toString", { enumerable: true, get: function () { return integer_1.toString; } });
var temporal_types_1 = require("./temporal-types");
Object.defineProperty(exports, "Date", { enumerable: true, get: function () { return temporal_types_1.Date; } });
Object.defineProperty(exports, "DateTime", { enumerable: true, get: function () { return temporal_types_1.DateTime; } });
Object.defineProperty(exports, "Duration", { enumerable: true, get: function () { return temporal_types_1.Duration; } });
Object.defineProperty(exports, "isDate", { enumerable: true, get: function () { return temporal_types_1.isDate; } });
Object.defineProperty(exports, "isDateTime", { enumerable: true, get: function () { return temporal_types_1.isDateTime; } });
Object.defineProperty(exports, "isDuration", { enumerable: true, get: function () { return temporal_types_1.isDuration; } });
Object.defineProperty(exports, "isLocalDateTime", { enumerable: true, get: function () { return temporal_types_1.isLocalDateTime; } });
Object.defineProperty(exports, "isLocalTime", { enumerable: true, get: function () { return temporal_types_1.isLocalTime; } });
Object.defineProperty(exports, "isTime", { enumerable: true, get: function () { return temporal_types_1.isTime; } });
Object.defineProperty(exports, "LocalDateTime", { enumerable: true, get: function () { return temporal_types_1.LocalDateTime; } });
Object.defineProperty(exports, "LocalTime", { enumerable: true, get: function () { return temporal_types_1.LocalTime; } });
Object.defineProperty(exports, "Time", { enumerable: true, get: function () { return temporal_types_1.Time; } });
var graph_types_1 = require("./graph-types");
Object.defineProperty(exports, "Node", { enumerable: true, get: function () { return graph_types_1.Node; } });
Object.defineProperty(exports, "isNode", { enumerable: true, get: function () { return graph_types_1.isNode; } });
Object.defineProperty(exports, "Relationship", { enumerable: true, get: function () { return graph_types_1.Relationship; } });
Object.defineProperty(exports, "isRelationship", { enumerable: true, get: function () { return graph_types_1.isRelationship; } });
Object.defineProperty(exports, "UnboundRelationship", { enumerable: true, get: function () { return graph_types_1.UnboundRelationship; } });
Object.defineProperty(exports, "isUnboundRelationship", { enumerable: true, get: function () { return graph_types_1.isUnboundRelationship; } });
Object.defineProperty(exports, "Path", { enumerable: true, get: function () { return graph_types_1.Path; } });
Object.defineProperty(exports, "isPath", { enumerable: true, get: function () { return graph_types_1.isPath; } });
Object.defineProperty(exports, "PathSegment", { enumerable: true, get: function () { return graph_types_1.PathSegment; } });
Object.defineProperty(exports, "isPathSegment", { enumerable: true, get: function () { return graph_types_1.isPathSegment; } });
var record_1 = __importDefault(require("./record"));
exports.Record = record_1.default;
var spatial_types_1 = require("./spatial-types");
Object.defineProperty(exports, "isPoint", { enumerable: true, get: function () { return spatial_types_1.isPoint; } });
Object.defineProperty(exports, "Point", { enumerable: true, get: function () { return spatial_types_1.Point; } });
var result_summary_1 = __importStar(require("./result-summary"));
exports.ResultSummary = result_summary_1.default;
Object.defineProperty(exports, "queryType", { enumerable: true, get: function () { return result_summary_1.queryType; } });
Object.defineProperty(exports, "ServerInfo", { enumerable: true, get: function () { return result_summary_1.ServerInfo; } });
Object.defineProperty(exports, "Notification", { enumerable: true, get: function () { return result_summary_1.Notification; } });
Object.defineProperty(exports, "Plan", { enumerable: true, get: function () { return result_summary_1.Plan; } });
Object.defineProperty(exports, "ProfiledPlan", { enumerable: true, get: function () { return result_summary_1.ProfiledPlan; } });
Object.defineProperty(exports, "QueryStatistics", { enumerable: true, get: function () { return result_summary_1.QueryStatistics; } });
Object.defineProperty(exports, "Stats", { enumerable: true, get: function () { return result_summary_1.Stats; } });
var result_1 = __importDefault(require("./result"));
exports.Result = result_1.default;
var connection_provider_1 = __importDefault(require("./connection-provider"));
exports.ConnectionProvider = connection_provider_1.default;
var connection_1 = __importDefault(require("./connection"));
exports.Connection = connection_1.default;
var transaction_1 = __importDefault(require("./transaction"));
exports.Transaction = transaction_1.default;
var session_1 = __importDefault(require("./session"));
exports.Session = session_1.default;
var driver_1 = __importStar(require("./driver")), driver = driver_1;
exports.Driver = driver_1.default;
exports.driver = driver;
var types = __importStar(require("./types"));
exports.types = types;
var json = __importStar(require("./json"));
exports.json = json;
var internal = __importStar(require("./internal")); // todo: removed afterwards
exports.internal = internal;
/**
 * Object containing string constants representing predefined {@link Neo4jError} codes.
 */
var error = {
    SERVICE_UNAVAILABLE: error_1.SERVICE_UNAVAILABLE,
    SESSION_EXPIRED: error_1.SESSION_EXPIRED,
    PROTOCOL_ERROR: error_1.PROTOCOL_ERROR
};
exports.error = error;
/**
 * @private
 */
var forExport = {
    newError: error_1.newError,
    Neo4jError: error_1.Neo4jError,
    error: error,
    Integer: integer_1.default,
    int: integer_1.int,
    isInt: integer_1.isInt,
    inSafeRange: integer_1.inSafeRange,
    toNumber: integer_1.toNumber,
    toString: integer_1.toString,
    internal: internal,
    isPoint: spatial_types_1.isPoint,
    Point: spatial_types_1.Point,
    Date: temporal_types_1.Date,
    DateTime: temporal_types_1.DateTime,
    Duration: temporal_types_1.Duration,
    isDate: temporal_types_1.isDate,
    isDateTime: temporal_types_1.isDateTime,
    isDuration: temporal_types_1.isDuration,
    isLocalDateTime: temporal_types_1.isLocalDateTime,
    isLocalTime: temporal_types_1.isLocalTime,
    isTime: temporal_types_1.isTime,
    LocalDateTime: temporal_types_1.LocalDateTime,
    LocalTime: temporal_types_1.LocalTime,
    Time: temporal_types_1.Time,
    Node: graph_types_1.Node,
    isNode: graph_types_1.isNode,
    Relationship: graph_types_1.Relationship,
    isRelationship: graph_types_1.isRelationship,
    UnboundRelationship: graph_types_1.UnboundRelationship,
    isUnboundRelationship: graph_types_1.isUnboundRelationship,
    Path: graph_types_1.Path,
    isPath: graph_types_1.isPath,
    PathSegment: graph_types_1.PathSegment,
    isPathSegment: graph_types_1.isPathSegment,
    Record: record_1.default,
    ResultSummary: result_summary_1.default,
    queryType: result_summary_1.queryType,
    ServerInfo: result_summary_1.ServerInfo,
    Notification: result_summary_1.Notification,
    Plan: result_summary_1.Plan,
    ProfiledPlan: result_summary_1.ProfiledPlan,
    QueryStatistics: result_summary_1.QueryStatistics,
    Stats: result_summary_1.Stats,
    Result: result_1.default,
    Transaction: transaction_1.default,
    Session: session_1.default,
    Driver: driver_1.default,
    Connection: connection_1.default,
    types: types,
    driver: driver,
    json: json
};
exports.default = forExport;

},{"./connection":54,"./connection-provider":53,"./driver":55,"./error":56,"./graph-types":57,"./integer":59,"./internal":64,"./json":77,"./record":78,"./result":80,"./result-summary":79,"./session":81,"./spatial-types":82,"./temporal-types":83,"./transaction":84,"./types":85}],59:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toString = exports.toNumber = exports.inSafeRange = exports.isInt = exports.int = void 0;
// 64-bit Integer library, originally from Long.js by dcodeIO
// https://github.com/dcodeIO/Long.js
// License Apache 2
var error_1 = require("./error");
/**
 * A cache of the Integer representations of small integer values.
 * @type {!Object}
 * @inner
 * @private
 */
// eslint-disable-next-line no-use-before-define
var INT_CACHE = new Map();
/**
 * Constructs a 64 bit two's-complement integer, given its low and high 32 bit values as *signed* integers.
 * See exported functions for more convenient ways of operating integers.
 * Use `int()` function to create new integers, `isInt()` to check if given object is integer,
 * `inSafeRange()` to check if it is safe to convert given value to native number,
 * `toNumber()` and `toString()` to convert given integer to number or string respectively.
 * @access public
 * @exports Integer
 * @class A Integer class for representing a 64 bit two's-complement integer value.
 * @param {number} low The low (signed) 32 bits of the long
 * @param {number} high The high (signed) 32 bits of the long
 * @constructor
 */
var Integer = /** @class */ (function () {
    function Integer(low, high) {
        /**
         * The low 32 bits as a signed value.
         * @type {number}
         * @expose
         */
        this.low = low || 0;
        /**
         * The high 32 bits as a signed value.
         * @type {number}
         * @expose
         */
        this.high = high || 0;
    }
    // The internal representation of an Integer is the two given signed, 32-bit values.
    // We use 32-bit pieces because these are the size of integers on which
    // JavaScript performs bit-operations.  For operations like addition and
    // multiplication, we split each number into 16 bit pieces, which can easily be
    // multiplied within JavaScript's floating-point representation without overflow
    // or change in sign.
    //
    // In the algorithms below, we frequently reduce the negative case to the
    // positive case by negating the input(s) and then post-processing the result.
    // Note that we must ALWAYS check specially whether those values are MIN_VALUE
    // (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
    // a positive number, it overflows back into a negative).  Not handling this
    // case would often result in infinite recursion.
    //
    // Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the from*
    // methods on which they depend.
    Integer.prototype.inSafeRange = function () {
        return (this.greaterThanOrEqual(Integer.MIN_SAFE_VALUE) &&
            this.lessThanOrEqual(Integer.MAX_SAFE_VALUE));
    };
    /**
     * Converts the Integer to an exact javascript Number, assuming it is a 32 bit integer.
     * @returns {number}
     * @expose
     */
    Integer.prototype.toInt = function () {
        return this.low;
    };
    /**
     * Converts the Integer to a the nearest floating-point representation of this value (double, 53 bit mantissa).
     * @returns {number}
     * @expose
     */
    Integer.prototype.toNumber = function () {
        return this.high * TWO_PWR_32_DBL + (this.low >>> 0);
    };
    /**
     * Converts the Integer to a BigInt representation of this value
     * @returns {bigint}
     * @expose
     */
    Integer.prototype.toBigInt = function () {
        if (this.isZero()) {
            return BigInt(0);
        }
        else if (this.isPositive()) {
            return (BigInt(this.high >>> 0) * BigInt(TWO_PWR_32_DBL) +
                BigInt(this.low >>> 0));
        }
        else {
            var negate = this.negate();
            return (BigInt(-1) *
                (BigInt(negate.high >>> 0) * BigInt(TWO_PWR_32_DBL) +
                    BigInt(negate.low >>> 0)));
        }
    };
    /**
     * Converts the Integer to native number or -Infinity/+Infinity when it does not fit.
     * @return {number}
     * @package
     */
    Integer.prototype.toNumberOrInfinity = function () {
        if (this.lessThan(Integer.MIN_SAFE_VALUE)) {
            return Number.NEGATIVE_INFINITY;
        }
        else if (this.greaterThan(Integer.MAX_SAFE_VALUE)) {
            return Number.POSITIVE_INFINITY;
        }
        else {
            return this.toNumber();
        }
    };
    /**
     * Converts the Integer to a string written in the specified radix.
     * @param {number=} radix Radix (2-36), defaults to 10
     * @returns {string}
     * @override
     * @throws {RangeError} If `radix` is out of range
     * @expose
     */
    Integer.prototype.toString = function (radix) {
        radix = radix || 10;
        if (radix < 2 || radix > 36) {
            throw RangeError('radix out of range: ' + radix);
        }
        if (this.isZero()) {
            return '0';
        }
        var rem;
        if (this.isNegative()) {
            if (this.equals(Integer.MIN_VALUE)) {
                // We need to change the Integer value before it can be negated, so we remove
                // the bottom-most digit in this base and then recurse to do the rest.
                var radixInteger = Integer.fromNumber(radix);
                var div = this.div(radixInteger);
                rem = div.multiply(radixInteger).subtract(this);
                return div.toString(radix) + rem.toInt().toString(radix);
            }
            else {
                return '-' + this.negate().toString(radix);
            }
        }
        // Do several (6) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        var radixToPower = Integer.fromNumber(Math.pow(radix, 6));
        rem = this;
        var result = '';
        while (true) {
            var remDiv = rem.div(radixToPower);
            var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt() >>> 0;
            var digits = intval.toString(radix);
            rem = remDiv;
            if (rem.isZero()) {
                return digits + result;
            }
            else {
                while (digits.length < 6) {
                    digits = '0' + digits;
                }
                result = '' + digits + result;
            }
        }
    };
    /**
     * Gets the high 32 bits as a signed integer.
     * @returns {number} Signed high bits
     * @expose
     */
    Integer.prototype.getHighBits = function () {
        return this.high;
    };
    /**
     * Gets the low 32 bits as a signed integer.
     * @returns {number} Signed low bits
     * @expose
     */
    Integer.prototype.getLowBits = function () {
        return this.low;
    };
    /**
     * Gets the number of bits needed to represent the absolute value of this Integer.
     * @returns {number}
     * @expose
     */
    Integer.prototype.getNumBitsAbs = function () {
        if (this.isNegative()) {
            return this.equals(Integer.MIN_VALUE) ? 64 : this.negate().getNumBitsAbs();
        }
        var val = this.high !== 0 ? this.high : this.low;
        for (var bit = 31; bit > 0; bit--) {
            if ((val & (1 << bit)) !== 0) {
                break;
            }
        }
        return this.high !== 0 ? bit + 33 : bit + 1;
    };
    /**
     * Tests if this Integer's value equals zero.
     * @returns {boolean}
     * @expose
     */
    Integer.prototype.isZero = function () {
        return this.high === 0 && this.low === 0;
    };
    /**
     * Tests if this Integer's value is negative.
     * @returns {boolean}
     * @expose
     */
    Integer.prototype.isNegative = function () {
        return this.high < 0;
    };
    /**
     * Tests if this Integer's value is positive.
     * @returns {boolean}
     * @expose
     */
    Integer.prototype.isPositive = function () {
        return this.high >= 0;
    };
    /**
     * Tests if this Integer's value is odd.
     * @returns {boolean}
     * @expose
     */
    Integer.prototype.isOdd = function () {
        return (this.low & 1) === 1;
    };
    /**
     * Tests if this Integer's value is even.
     * @returns {boolean}
     * @expose
     */
    Integer.prototype.isEven = function () {
        return (this.low & 1) === 0;
    };
    /**
     * Tests if this Integer's value equals the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     * @expose
     */
    Integer.prototype.equals = function (other) {
        var theOther = Integer.fromValue(other);
        return this.high === theOther.high && this.low === theOther.low;
    };
    /**
     * Tests if this Integer's value differs from the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     * @expose
     */
    Integer.prototype.notEquals = function (other) {
        return !this.equals(/* validates */ other);
    };
    /**
     * Tests if this Integer's value is less than the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     * @expose
     */
    Integer.prototype.lessThan = function (other) {
        return this.compare(/* validates */ other) < 0;
    };
    /**
     * Tests if this Integer's value is less than or equal the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     * @expose
     */
    Integer.prototype.lessThanOrEqual = function (other) {
        return this.compare(/* validates */ other) <= 0;
    };
    /**
     * Tests if this Integer's value is greater than the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     * @expose
     */
    Integer.prototype.greaterThan = function (other) {
        return this.compare(/* validates */ other) > 0;
    };
    /**
     * Tests if this Integer's value is greater than or equal the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     * @expose
     */
    Integer.prototype.greaterThanOrEqual = function (other) {
        return this.compare(/* validates */ other) >= 0;
    };
    /**
     * Compares this Integer's value with the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {number} 0 if they are the same, 1 if the this is greater and -1
     *  if the given one is greater
     * @expose
     */
    Integer.prototype.compare = function (other) {
        var theOther = Integer.fromValue(other);
        if (this.equals(theOther)) {
            return 0;
        }
        var thisNeg = this.isNegative();
        var otherNeg = theOther.isNegative();
        if (thisNeg && !otherNeg) {
            return -1;
        }
        if (!thisNeg && otherNeg) {
            return 1;
        }
        // At this point the sign bits are the same
        return this.subtract(theOther).isNegative() ? -1 : 1;
    };
    /**
     * Negates this Integer's value.
     * @returns {!Integer} Negated Integer
     * @expose
     */
    Integer.prototype.negate = function () {
        if (this.equals(Integer.MIN_VALUE)) {
            return Integer.MIN_VALUE;
        }
        return this.not().add(Integer.ONE);
    };
    /**
     * Returns the sum of this and the specified Integer.
     * @param {!Integer|number|string} addend Addend
     * @returns {!Integer} Sum
     * @expose
     */
    Integer.prototype.add = function (addend) {
        var theAddend = Integer.fromValue(addend);
        // Divide each number into 4 chunks of 16 bits, and then sum the chunks.
        var a48 = this.high >>> 16;
        var a32 = this.high & 0xffff;
        var a16 = this.low >>> 16;
        var a00 = this.low & 0xffff;
        var b48 = theAddend.high >>> 16;
        var b32 = theAddend.high & 0xffff;
        var b16 = theAddend.low >>> 16;
        var b00 = theAddend.low & 0xffff;
        var c48 = 0;
        var c32 = 0;
        var c16 = 0;
        var c00 = 0;
        c00 += a00 + b00;
        c16 += c00 >>> 16;
        c00 &= 0xffff;
        c16 += a16 + b16;
        c32 += c16 >>> 16;
        c16 &= 0xffff;
        c32 += a32 + b32;
        c48 += c32 >>> 16;
        c32 &= 0xffff;
        c48 += a48 + b48;
        c48 &= 0xffff;
        return Integer.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
    };
    /**
     * Returns the difference of this and the specified Integer.
     * @param {!Integer|number|string} subtrahend Subtrahend
     * @returns {!Integer} Difference
     * @expose
     */
    Integer.prototype.subtract = function (subtrahend) {
        var theSubtrahend = Integer.fromValue(subtrahend);
        return this.add(theSubtrahend.negate());
    };
    /**
     * Returns the product of this and the specified Integer.
     * @param {!Integer|number|string} multiplier Multiplier
     * @returns {!Integer} Product
     * @expose
     */
    Integer.prototype.multiply = function (multiplier) {
        if (this.isZero()) {
            return Integer.ZERO;
        }
        var theMultiplier = Integer.fromValue(multiplier);
        if (theMultiplier.isZero()) {
            return Integer.ZERO;
        }
        if (this.equals(Integer.MIN_VALUE)) {
            return theMultiplier.isOdd() ? Integer.MIN_VALUE : Integer.ZERO;
        }
        if (theMultiplier.equals(Integer.MIN_VALUE)) {
            return this.isOdd() ? Integer.MIN_VALUE : Integer.ZERO;
        }
        if (this.isNegative()) {
            if (theMultiplier.isNegative()) {
                return this.negate().multiply(theMultiplier.negate());
            }
            else {
                return this.negate()
                    .multiply(theMultiplier)
                    .negate();
            }
        }
        else if (theMultiplier.isNegative()) {
            return this.multiply(theMultiplier.negate()).negate();
        }
        // If both longs are small, use float multiplication
        if (this.lessThan(TWO_PWR_24) && theMultiplier.lessThan(TWO_PWR_24)) {
            return Integer.fromNumber(this.toNumber() * theMultiplier.toNumber());
        }
        // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
        // We can skip products that would overflow.
        var a48 = this.high >>> 16;
        var a32 = this.high & 0xffff;
        var a16 = this.low >>> 16;
        var a00 = this.low & 0xffff;
        var b48 = theMultiplier.high >>> 16;
        var b32 = theMultiplier.high & 0xffff;
        var b16 = theMultiplier.low >>> 16;
        var b00 = theMultiplier.low & 0xffff;
        var c48 = 0;
        var c32 = 0;
        var c16 = 0;
        var c00 = 0;
        c00 += a00 * b00;
        c16 += c00 >>> 16;
        c00 &= 0xffff;
        c16 += a16 * b00;
        c32 += c16 >>> 16;
        c16 &= 0xffff;
        c16 += a00 * b16;
        c32 += c16 >>> 16;
        c16 &= 0xffff;
        c32 += a32 * b00;
        c48 += c32 >>> 16;
        c32 &= 0xffff;
        c32 += a16 * b16;
        c48 += c32 >>> 16;
        c32 &= 0xffff;
        c32 += a00 * b32;
        c48 += c32 >>> 16;
        c32 &= 0xffff;
        c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
        c48 &= 0xffff;
        return Integer.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
    };
    /**
     * Returns this Integer divided by the specified.
     * @param {!Integer|number|string} divisor Divisor
     * @returns {!Integer} Quotient
     * @expose
     */
    Integer.prototype.div = function (divisor) {
        var theDivisor = Integer.fromValue(divisor);
        if (theDivisor.isZero()) {
            throw error_1.newError('division by zero');
        }
        if (this.isZero()) {
            return Integer.ZERO;
        }
        var approx, rem, res;
        if (this.equals(Integer.MIN_VALUE)) {
            if (theDivisor.equals(Integer.ONE) ||
                theDivisor.equals(Integer.NEG_ONE)) {
                return Integer.MIN_VALUE;
            }
            if (theDivisor.equals(Integer.MIN_VALUE)) {
                return Integer.ONE;
            }
            else {
                // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
                var halfThis = this.shiftRight(1);
                approx = halfThis.div(theDivisor).shiftLeft(1);
                if (approx.equals(Integer.ZERO)) {
                    return theDivisor.isNegative() ? Integer.ONE : Integer.NEG_ONE;
                }
                else {
                    rem = this.subtract(theDivisor.multiply(approx));
                    res = approx.add(rem.div(theDivisor));
                    return res;
                }
            }
        }
        else if (theDivisor.equals(Integer.MIN_VALUE)) {
            return Integer.ZERO;
        }
        if (this.isNegative()) {
            if (theDivisor.isNegative()) {
                return this.negate().div(theDivisor.negate());
            }
            return this.negate()
                .div(theDivisor)
                .negate();
        }
        else if (theDivisor.isNegative()) {
            return this.div(theDivisor.negate()).negate();
        }
        // Repeat the following until the remainder is less than other:  find a
        // floating-point that approximates remainder / other *from below*, add this
        // into the result, and subtract it from the remainder.  It is critical that
        // the approximate value is less than or equal to the real value so that the
        // remainder never becomes negative.
        res = Integer.ZERO;
        rem = this;
        while (rem.greaterThanOrEqual(theDivisor)) {
            // Approximate the result of division. This may be a little greater or
            // smaller than the actual value.
            approx = Math.max(1, Math.floor(rem.toNumber() / theDivisor.toNumber()));
            // We will tweak the approximate result by changing it in the 48-th digit or
            // the smallest non-fractional digit, whichever is larger.
            var log2 = Math.ceil(Math.log(approx) / Math.LN2);
            var delta = log2 <= 48 ? 1 : Math.pow(2, log2 - 48);
            // Decrease the approximation until it is smaller than the remainder.  Note
            // that if it is too large, the product overflows and is negative.
            var approxRes = Integer.fromNumber(approx);
            var approxRem = approxRes.multiply(theDivisor);
            while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
                approx -= delta;
                approxRes = Integer.fromNumber(approx);
                approxRem = approxRes.multiply(theDivisor);
            }
            // We know the answer can't be zero... and actually, zero would cause
            // infinite recursion since we would make no progress.
            if (approxRes.isZero()) {
                approxRes = Integer.ONE;
            }
            res = res.add(approxRes);
            rem = rem.subtract(approxRem);
        }
        return res;
    };
    /**
     * Returns this Integer modulo the specified.
     * @param {!Integer|number|string} divisor Divisor
     * @returns {!Integer} Remainder
     * @expose
     */
    Integer.prototype.modulo = function (divisor) {
        var theDivisor = Integer.fromValue(divisor);
        return this.subtract(this.div(theDivisor).multiply(theDivisor));
    };
    /**
     * Returns the bitwise NOT of this Integer.
     * @returns {!Integer}
     * @expose
     */
    Integer.prototype.not = function () {
        return Integer.fromBits(~this.low, ~this.high);
    };
    /**
     * Returns the bitwise AND of this Integer and the specified.
     * @param {!Integer|number|string} other Other Integer
     * @returns {!Integer}
     * @expose
     */
    Integer.prototype.and = function (other) {
        var theOther = Integer.fromValue(other);
        return Integer.fromBits(this.low & theOther.low, this.high & theOther.high);
    };
    /**
     * Returns the bitwise OR of this Integer and the specified.
     * @param {!Integer|number|string} other Other Integer
     * @returns {!Integer}
     * @expose
     */
    Integer.prototype.or = function (other) {
        var theOther = Integer.fromValue(other);
        return Integer.fromBits(this.low | theOther.low, this.high | theOther.high);
    };
    /**
     * Returns the bitwise XOR of this Integer and the given one.
     * @param {!Integer|number|string} other Other Integer
     * @returns {!Integer}
     * @expose
     */
    Integer.prototype.xor = function (other) {
        var theOther = Integer.fromValue(other);
        return Integer.fromBits(this.low ^ theOther.low, this.high ^ theOther.high);
    };
    /**
     * Returns this Integer with bits shifted to the left by the given amount.
     * @param {number|!Integer} numBits Number of bits
     * @returns {!Integer} Shifted Integer
     * @expose
     */
    Integer.prototype.shiftLeft = function (numBits) {
        var bitsCount = Integer.toNumber(numBits);
        if ((bitsCount &= 63) === 0) {
            return Integer.ZERO;
        }
        else if (bitsCount < 32) {
            return Integer.fromBits(this.low << bitsCount, (this.high << bitsCount) | (this.low >>> (32 - bitsCount)));
        }
        else {
            return Integer.fromBits(0, this.low << (bitsCount - 32));
        }
    };
    /**
     * Returns this Integer with bits arithmetically shifted to the right by the given amount.
     * @param {number|!Integer} numBits Number of bits
     * @returns {!Integer} Shifted Integer
     * @expose
     */
    Integer.prototype.shiftRight = function (numBits) {
        var bitsCount = Integer.toNumber(numBits);
        if ((bitsCount &= 63) === 0) {
            return Integer.ZERO;
        }
        else if (numBits < 32) {
            return Integer.fromBits((this.low >>> bitsCount) | (this.high << (32 - bitsCount)), this.high >> bitsCount);
        }
        else {
            return Integer.fromBits(this.high >> (bitsCount - 32), this.high >= 0 ? 0 : -1);
        }
    };
    /**
     * Tests if the specified object is a Integer.
     * @access private
     * @param {*} obj Object
     * @returns {boolean}
     * @expose
     */
    Integer.isInteger = function (obj) {
        return (obj && obj.__isInteger__) === true;
    };
    /**
     * Returns a Integer representing the given 32 bit integer value.
     * @access private
     * @param {number} value The 32 bit integer in question
     * @returns {!Integer} The corresponding Integer value
     * @expose
     */
    Integer.fromInt = function (value) {
        var obj, cachedObj;
        value = value | 0;
        if (value >= -128 && value < 128) {
            cachedObj = INT_CACHE.get(value);
            if (cachedObj) {
                return cachedObj;
            }
        }
        obj = new Integer(value, value < 0 ? -1 : 0);
        if (value >= -128 && value < 128) {
            INT_CACHE.set(value, obj);
        }
        return obj;
    };
    /**
     * Returns a Integer representing the 64 bit integer that comes by concatenating the given low and high bits. Each is
     *  assumed to use 32 bits.
     * @access private
     * @param {number} lowBits The low 32 bits
     * @param {number} highBits The high 32 bits
     * @returns {!Integer} The corresponding Integer value
     * @expose
     */
    Integer.fromBits = function (lowBits, highBits) {
        return new Integer(lowBits, highBits);
    };
    /**
     * Returns a Integer representing the given value, provided that it is a finite number. Otherwise, zero is returned.
     * @access private
     * @param {number} value The number in question
     * @returns {!Integer} The corresponding Integer value
     * @expose
     */
    Integer.fromNumber = function (value) {
        if (isNaN(value) || !isFinite(value)) {
            return Integer.ZERO;
        }
        if (value <= -TWO_PWR_63_DBL) {
            return Integer.MIN_VALUE;
        }
        if (value + 1 >= TWO_PWR_63_DBL) {
            return Integer.MAX_VALUE;
        }
        if (value < 0) {
            return Integer.fromNumber(-value).negate();
        }
        return new Integer(value % TWO_PWR_32_DBL | 0, (value / TWO_PWR_32_DBL) | 0);
    };
    /**
     * Returns a Integer representation of the given string, written using the specified radix.
     * @access private
     * @param {string} str The textual representation of the Integer
     * @param {number=} radix The radix in which the text is written (2-36), defaults to 10
     * @returns {!Integer} The corresponding Integer value
     * @expose
     */
    Integer.fromString = function (str, radix) {
        if (str.length === 0) {
            throw error_1.newError('number format error: empty string');
        }
        if (str === 'NaN' ||
            str === 'Infinity' ||
            str === '+Infinity' ||
            str === '-Infinity') {
            return Integer.ZERO;
        }
        radix = radix || 10;
        if (radix < 2 || radix > 36) {
            throw error_1.newError('radix out of range: ' + radix);
        }
        var p;
        if ((p = str.indexOf('-')) > 0) {
            throw error_1.newError('number format error: interior "-" character: ' + str);
        }
        else if (p === 0) {
            return Integer.fromString(str.substring(1), radix).negate();
        }
        // Do several (8) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        var radixToPower = Integer.fromNumber(Math.pow(radix, 8));
        var result = Integer.ZERO;
        for (var i = 0; i < str.length; i += 8) {
            var size = Math.min(8, str.length - i);
            var value = parseInt(str.substring(i, i + size), radix);
            if (size < 8) {
                var power = Integer.fromNumber(Math.pow(radix, size));
                result = result.multiply(power).add(Integer.fromNumber(value));
            }
            else {
                result = result.multiply(radixToPower);
                result = result.add(Integer.fromNumber(value));
            }
        }
        return result;
    };
    /**
     * Converts the specified value to a Integer.
     * @access private
     * @param {!Integer|number|string|bigint|!{low: number, high: number}} val Value
     * @returns {!Integer}
     * @expose
     */
    Integer.fromValue = function (val) {
        if (val /* is compatible */ instanceof Integer) {
            return val;
        }
        if (typeof val === 'number') {
            return Integer.fromNumber(val);
        }
        if (typeof val === 'string') {
            return Integer.fromString(val);
        }
        if (typeof val === 'bigint') {
            return Integer.fromString(val.toString());
        }
        // Throws for non-objects, converts non-instanceof Integer:
        return new Integer(val.low, val.high);
    };
    /**
     * Converts the specified value to a number.
     * @access private
     * @param {!Integer|number|string|!{low: number, high: number}} val Value
     * @returns {number}
     * @expose
     */
    Integer.toNumber = function (val) {
        switch (typeof val) {
            case 'number':
                return val;
            case 'bigint':
                return Number(val);
            default:
                return Integer.fromValue(val).toNumber();
        }
    };
    /**
     * Converts the specified value to a string.
     * @access private
     * @param {!Integer|number|string|!{low: number, high: number}} val Value
     * @param {number} radix optional radix for string conversion, defaults to 10
     * @returns {string}
     * @expose
     */
    Integer.toString = function (val, radix) {
        return Integer.fromValue(val).toString(radix);
    };
    /**
     * Checks if the given value is in the safe range in order to be converted to a native number
     * @access private
     * @param {!Integer|number|string|!{low: number, high: number}} val Value
     * @param {number} radix optional radix for string conversion, defaults to 10
     * @returns {boolean}
     * @expose
     */
    Integer.inSafeRange = function (val) {
        return Integer.fromValue(val).inSafeRange();
    };
    /**
     * Signed zero.
     * @type {!Integer}
     * @expose
     */
    Integer.ZERO = Integer.fromInt(0);
    /**
     * Signed one.
     * @type {!Integer}
     * @expose
     */
    Integer.ONE = Integer.fromInt(1);
    /**
     * Signed negative one.
     * @type {!Integer}
     * @expose
     */
    Integer.NEG_ONE = Integer.fromInt(-1);
    /**
     * Maximum signed value.
     * @type {!Integer}
     * @expose
     */
    Integer.MAX_VALUE = Integer.fromBits(0xffffffff | 0, 0x7fffffff | 0);
    /**
     * Minimum signed value.
     * @type {!Integer}
     * @expose
     */
    Integer.MIN_VALUE = Integer.fromBits(0, 0x80000000 | 0);
    /**
     * Minimum safe value.
     * @type {!Integer}
     * @expose
     */
    Integer.MIN_SAFE_VALUE = Integer.fromBits(0x1 | 0, 0xffffffffffe00000 | 0);
    /**
     * Maximum safe value.
     * @type {!Integer}
     * @expose
     */
    Integer.MAX_SAFE_VALUE = Integer.fromBits(0xffffffff | 0, 0x1fffff | 0);
    /**
     * An indicator used to reliably determine if an object is a Integer or not.
     * @type {boolean}
     * @const
     * @expose
     * @private
     */
    Integer.__isInteger__ = true;
    return Integer;
}());
Object.defineProperty(Integer.prototype, '__isInteger__', {
    value: true,
    enumerable: false,
    configurable: false
});
/**
 * @type {number}
 * @const
 * @inner
 * @private
 */
var TWO_PWR_16_DBL = 1 << 16;
/**
 * @type {number}
 * @const
 * @inner
 * @private
 */
var TWO_PWR_24_DBL = 1 << 24;
/**
 * @type {number}
 * @const
 * @inner
 * @private
 */
var TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;
/**
 * @type {number}
 * @const
 * @inner
 * @private
 */
var TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL;
/**
 * @type {number}
 * @const
 * @inner
 * @private
 */
var TWO_PWR_63_DBL = TWO_PWR_64_DBL / 2;
/**
 * @type {!Integer}
 * @const
 * @inner
 * @private
 */
var TWO_PWR_24 = Integer.fromInt(TWO_PWR_24_DBL);
/**
 * Cast value to Integer type.
 * @access public
 * @param {Mixed} value - The value to use.
 * @return {Integer} - An object of type Integer.
 */
var int = Integer.fromValue;
exports.int = int;
/**
 * Check if a variable is of Integer type.
 * @access public
 * @param {Mixed} value - The variable to check.
 * @return {Boolean} - Is it of the Integer type?
 */
var isInt = Integer.isInteger;
exports.isInt = isInt;
/**
 * Check if a variable can be safely converted to a number
 * @access public
 * @param {Mixed} value - The variable to check
 * @return {Boolean} - true if it is safe to call toNumber on variable otherwise false
 */
var inSafeRange = Integer.inSafeRange;
exports.inSafeRange = inSafeRange;
/**
 * Converts a variable to a number
 * @access public
 * @param {Mixed} value - The variable to convert
 * @return {number} - the variable as a number
 */
var toNumber = Integer.toNumber;
exports.toNumber = toNumber;
/**
 * Converts the integer to a string representation
 * @access public
 * @param {Mixed} value - The variable to convert
 * @param {number} radix - radix to use in string conversion, defaults to 10
 * @return {string} - returns a string representation of the integer
 */
var toString = Integer.toString;
exports.toString = toString;
exports.default = Integer;

},{"./error":56}],60:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bookmark = void 0;
var util = __importStar(require("./util"));
var BOOKMARKS_KEY = 'bookmarks';
var Bookmark = /** @class */ (function () {
    /**
     * @constructor
     * @param {string|string[]} values single bookmark as string or multiple bookmarks as a string array.
     */
    function Bookmark(values) {
        this._values = asStringArray(values);
    }
    Bookmark.empty = function () {
        return EMPTY_BOOKMARK;
    };
    /**
     * Check if the given bookmark is meaningful and can be send to the database.
     * @return {boolean} returns `true` bookmark has a value, `false` otherwise.
     */
    Bookmark.prototype.isEmpty = function () {
        return this._values.length === 0;
    };
    /**
     * Get all bookmark values as an array.
     * @return {string[]} all values.
     */
    Bookmark.prototype.values = function () {
        return this._values;
    };
    /**
     * Get this bookmark as an object for begin transaction call.
     * @return {Object} the value of this bookmark as object.
     */
    Bookmark.prototype.asBeginTransactionParameters = function () {
        var _a;
        if (this.isEmpty()) {
            return {};
        }
        // Driver sends {bookmark: "max", bookmarks: ["one", "two", "max"]} instead of simple
        // {bookmarks: ["one", "two", "max"]} for backwards compatibility reasons. Old servers can only accept single
        // bookmark that is why driver has to parse and compare given list of bookmarks. This functionality will
        // eventually be removed.
        return _a = {},
            _a[BOOKMARKS_KEY] = this._values,
            _a;
    };
    return Bookmark;
}());
exports.Bookmark = Bookmark;
var EMPTY_BOOKMARK = new Bookmark(null);
/**
 * Converts given value to an array.
 * @param {string|string[]|Array} [value=undefined] argument to convert.
 * @return {string[]} value converted to an array.
 */
function asStringArray(value) {
    if (!value) {
        return [];
    }
    if (util.isString(value)) {
        return [value];
    }
    if (Array.isArray(value)) {
        var result = [];
        var flattenedValue = flattenArray(value);
        for (var i = 0; i < flattenedValue.length; i++) {
            var element = flattenedValue[i];
            // if it is undefined or null, ignore it
            if (element !== undefined && element !== null) {
                if (!util.isString(element)) {
                    throw new TypeError("Bookmark value should be a string, given: '" + element + "'");
                }
                result.push(element);
            }
        }
        return result;
    }
    throw new TypeError("Bookmark should either be a string or a string array, given: '" + value + "'");
}
/**
 * Recursively flattens an array so that the result becomes a single array
 * of values, which does not include any sub-arrays
 *
 * @param {Array} value
 */
function flattenArray(values) {
    return values.reduce(function (dest, value) {
        return Array.isArray(value)
            ? dest.concat(flattenArray(value))
            : dest.concat(value);
    }, []);
}

},{"./util":76}],61:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_CONNECTION_HOLDER = exports.ReadOnlyConnectionHolder = exports.ConnectionHolder = void 0;
var error_1 = require("../error");
var util_1 = require("./util");
var constants_1 = require("./constants");
var bookmark_1 = require("./bookmark");
/**
 * Utility to lazily initialize connections and return them back to the pool when unused.
 * @private
 */
var ConnectionHolder = /** @class */ (function () {
    /**
     * @constructor
     * @param {string} mode - the access mode for new connection holder.
     * @param {string} database - the target database name.
     * @param {Bookmark} bookmark - the last bookmark
     * @param {ConnectionProvider} connectionProvider - the connection provider to acquire connections from.
     */
    function ConnectionHolder(_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.mode, mode = _c === void 0 ? constants_1.ACCESS_MODE_WRITE : _c, _d = _b.database, database = _d === void 0 ? '' : _d, bookmark = _b.bookmark, connectionProvider = _b.connectionProvider;
        this._mode = mode;
        this._database = database ? util_1.assertString(database, 'database') : '';
        this._bookmark = bookmark || bookmark_1.Bookmark.empty();
        this._connectionProvider = connectionProvider;
        this._referenceCount = 0;
        this._connectionPromise = Promise.resolve();
    }
    ConnectionHolder.prototype.mode = function () {
        return this._mode;
    };
    ConnectionHolder.prototype.database = function () {
        return this._database;
    };
    ConnectionHolder.prototype.bookmark = function () {
        return this._bookmark;
    };
    ConnectionHolder.prototype.connectionProvider = function () {
        return this._connectionProvider;
    };
    ConnectionHolder.prototype.referenceCount = function () {
        return this._referenceCount;
    };
    ConnectionHolder.prototype.initializeConnection = function () {
        if (this._referenceCount === 0 && this._connectionProvider) {
            this._connectionPromise = this._connectionProvider.acquireConnection({
                accessMode: this._mode,
                database: this._database,
                bookmarks: this._bookmark
            });
        }
        else {
            this._referenceCount++;
            return false;
        }
        this._referenceCount++;
        return true;
    };
    ConnectionHolder.prototype.getConnection = function () {
        return this._connectionPromise;
    };
    ConnectionHolder.prototype.releaseConnection = function () {
        if (this._referenceCount === 0) {
            return this._connectionPromise;
        }
        this._referenceCount--;
        if (this._referenceCount === 0) {
            return this._releaseConnection();
        }
        return this._connectionPromise;
    };
    ConnectionHolder.prototype.close = function () {
        if (this._referenceCount === 0) {
            return this._connectionPromise;
        }
        this._referenceCount = 0;
        return this._releaseConnection();
    };
    /**
     * Return the current pooled connection instance to the connection pool.
     * We don't pool Session instances, to avoid users using the Session after they've called close.
     * The `Session` object is just a thin wrapper around Connection anyway, so it makes little difference.
     * @return {Promise} - promise resolved then connection is returned to the pool.
     * @private
     */
    ConnectionHolder.prototype._releaseConnection = function () {
        this._connectionPromise = this._connectionPromise
            .then(function (connection) {
            if (connection) {
                return connection
                    .resetAndFlush()
                    .catch(ignoreError)
                    .then(function () { return connection._release(); });
            }
            else {
                return Promise.resolve();
            }
        })
            .catch(ignoreError);
        return this._connectionPromise;
    };
    return ConnectionHolder;
}());
exports.ConnectionHolder = ConnectionHolder;
/**
 * Provides a interaction with a ConnectionHolder without change it state by
 * releasing or initilizing
 */
var ReadOnlyConnectionHolder = /** @class */ (function (_super) {
    __extends(ReadOnlyConnectionHolder, _super);
    /**
     * Contructor
     * @param {ConnectionHolder} connectionHolder the connection holder which will treat the requests
     */
    function ReadOnlyConnectionHolder(connectionHolder) {
        var _this = _super.call(this, {
            mode: connectionHolder.mode(),
            database: connectionHolder.database(),
            bookmark: connectionHolder.bookmark(),
            connectionProvider: connectionHolder.connectionProvider()
        }) || this;
        _this._connectionHolder = connectionHolder;
        return _this;
    }
    /**
     * Return the true if the connection is suppose to be initilized with the command.
     *
     * @return {boolean}
     */
    ReadOnlyConnectionHolder.prototype.initializeConnection = function () {
        if (this._connectionHolder.referenceCount() === 0) {
            return false;
        }
        return true;
    };
    /**
     * Get the current connection promise.
     * @return {Promise<Connection>} promise resolved with the current connection.
     */
    ReadOnlyConnectionHolder.prototype.getConnection = function () {
        return this._connectionHolder.getConnection();
    };
    /**
     * Get the current connection promise, doesn't performs the release
     * @return {Promise<Connection>} promise with the resolved current connection
     */
    ReadOnlyConnectionHolder.prototype.releaseConnection = function () {
        return this._connectionHolder.getConnection().catch(function () { return Promise.resolve(); });
    };
    /**
     * Get the current connection promise, doesn't performs the connection close
     * @return {Promise<Connection>} promise with the resolved current connection
     */
    ReadOnlyConnectionHolder.prototype.close = function () {
        return this._connectionHolder.getConnection().catch(function () { return Promise.resolve(); });
    };
    return ReadOnlyConnectionHolder;
}(ConnectionHolder));
exports.ReadOnlyConnectionHolder = ReadOnlyConnectionHolder;
exports.default = ReadOnlyConnectionHolder;
var EmptyConnectionHolder = /** @class */ (function (_super) {
    __extends(EmptyConnectionHolder, _super);
    function EmptyConnectionHolder() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    EmptyConnectionHolder.prototype.mode = function () {
        return undefined;
    };
    EmptyConnectionHolder.prototype.database = function () {
        return undefined;
    };
    EmptyConnectionHolder.prototype.initializeConnection = function () {
        // nothing to initialize
        return true;
    };
    EmptyConnectionHolder.prototype.getConnection = function () {
        return Promise.reject(error_1.newError('This connection holder does not serve connections'));
    };
    EmptyConnectionHolder.prototype.releaseConnection = function () {
        return Promise.resolve();
    };
    EmptyConnectionHolder.prototype.close = function () {
        return Promise.resolve();
    };
    return EmptyConnectionHolder;
}(ConnectionHolder));
/**
 * Connection holder that does not manage any connections.
 * @type {ConnectionHolder}
 * @private
 */
var EMPTY_CONNECTION_HOLDER = new EmptyConnectionHolder();
exports.EMPTY_CONNECTION_HOLDER = EMPTY_CONNECTION_HOLDER;
// eslint-disable-next-line handle-callback-err
function ignoreError(error) { }

},{"../error":56,"./bookmark":60,"./constants":63,"./util":76}],62:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectivityVerifier = void 0;
var connection_holder_1 = require("./connection-holder");
var constants_1 = require("./constants");
var error_1 = require("../error");
/**
 * Verifies connectivity using the given connection provider.
 */
var ConnectivityVerifier = /** @class */ (function () {
    /**
     * @constructor
     * @param {ConnectionProvider} connectionProvider the provider to obtain connections from.
     */
    function ConnectivityVerifier(connectionProvider) {
        this._connectionProvider = connectionProvider;
    }
    /**
     * Try to obtain a working connection from the connection provider.
     * @returns {Promise<object>} promise resolved with server info or rejected with error.
     */
    ConnectivityVerifier.prototype.verify = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.database, database = _c === void 0 ? '' : _c;
        return acquireAndReleaseDummyConnection(this._connectionProvider, database);
    };
    return ConnectivityVerifier;
}());
exports.ConnectivityVerifier = ConnectivityVerifier;
/**
 * @private
 * @param {ConnectionProvider} connectionProvider the provider to obtain connections from.
 * @param {string|undefined} database The database name
 * @return {Promise<object>} promise resolved with server info or rejected with error.
 */
function acquireAndReleaseDummyConnection(connectionProvider, database) {
    var connectionHolder = new connection_holder_1.ConnectionHolder({
        mode: constants_1.ACCESS_MODE_READ,
        database: database,
        connectionProvider: connectionProvider
    });
    connectionHolder.initializeConnection();
    return connectionHolder
        .getConnection()
        .then(function (connection) {
        // able to establish a connection
        if (!connection) {
            throw error_1.newError('Unexpected error acquiring transaction');
        }
        return connectionHolder.close().then(function () { return connection.server; });
    })
        .catch(function (error) {
        // failed to establish a connection
        return connectionHolder
            .close()
            .catch(function (ignoredError) {
            // ignore connection release error
        })
            .then(function () {
            return Promise.reject(error);
        });
    });
}

},{"../error":56,"./connection-holder":61,"./constants":63}],63:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOLT_PROTOCOL_V4_3 = exports.BOLT_PROTOCOL_V4_2 = exports.BOLT_PROTOCOL_V4_1 = exports.BOLT_PROTOCOL_V4_0 = exports.BOLT_PROTOCOL_V3 = exports.BOLT_PROTOCOL_V2 = exports.BOLT_PROTOCOL_V1 = exports.DEFAULT_POOL_MAX_SIZE = exports.DEFAULT_POOL_ACQUISITION_TIMEOUT = exports.ACCESS_MODE_WRITE = exports.ACCESS_MODE_READ = exports.FETCH_ALL = void 0;
var FETCH_ALL = -1;
exports.FETCH_ALL = FETCH_ALL;
var DEFAULT_POOL_ACQUISITION_TIMEOUT = 60 * 1000; // 60 seconds
exports.DEFAULT_POOL_ACQUISITION_TIMEOUT = DEFAULT_POOL_ACQUISITION_TIMEOUT;
var DEFAULT_POOL_MAX_SIZE = 100;
exports.DEFAULT_POOL_MAX_SIZE = DEFAULT_POOL_MAX_SIZE;
var ACCESS_MODE_READ = 'READ';
exports.ACCESS_MODE_READ = ACCESS_MODE_READ;
var ACCESS_MODE_WRITE = 'WRITE';
exports.ACCESS_MODE_WRITE = ACCESS_MODE_WRITE;
var BOLT_PROTOCOL_V1 = 1;
exports.BOLT_PROTOCOL_V1 = BOLT_PROTOCOL_V1;
var BOLT_PROTOCOL_V2 = 2;
exports.BOLT_PROTOCOL_V2 = BOLT_PROTOCOL_V2;
var BOLT_PROTOCOL_V3 = 3;
exports.BOLT_PROTOCOL_V3 = BOLT_PROTOCOL_V3;
var BOLT_PROTOCOL_V4_0 = 4.0;
exports.BOLT_PROTOCOL_V4_0 = BOLT_PROTOCOL_V4_0;
var BOLT_PROTOCOL_V4_1 = 4.1;
exports.BOLT_PROTOCOL_V4_1 = BOLT_PROTOCOL_V4_1;
var BOLT_PROTOCOL_V4_2 = 4.2;
exports.BOLT_PROTOCOL_V4_2 = BOLT_PROTOCOL_V4_2;
var BOLT_PROTOCOL_V4_3 = 4.3;
exports.BOLT_PROTOCOL_V4_3 = BOLT_PROTOCOL_V4_3;

},{}],64:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryStrategy = exports.resolver = exports.serverAddress = exports.urlUtil = exports.logger = exports.connectivityVerifier = exports.transactionExecutor = exports.txConfig = exports.connectionHolder = exports.constants = exports.bookmark = exports.observer = exports.temporalUtil = exports.util = void 0;
var util = __importStar(require("./util"));
exports.util = util;
var temporalUtil = __importStar(require("./temporal-util"));
exports.temporalUtil = temporalUtil;
var observer = __importStar(require("./observers"));
exports.observer = observer;
var bookmark = __importStar(require("./bookmark"));
exports.bookmark = bookmark;
var constants = __importStar(require("./constants"));
exports.constants = constants;
var connectionHolder = __importStar(require("./connection-holder"));
exports.connectionHolder = connectionHolder;
var txConfig = __importStar(require("./tx-config"));
exports.txConfig = txConfig;
var transactionExecutor = __importStar(require("./transaction-executor"));
exports.transactionExecutor = transactionExecutor;
var connectivityVerifier = __importStar(require("./connectivity-verifier"));
exports.connectivityVerifier = connectivityVerifier;
var logger = __importStar(require("./logger"));
exports.logger = logger;
var urlUtil = __importStar(require("./url-util"));
exports.urlUtil = urlUtil;
var serverAddress = __importStar(require("./server-address"));
exports.serverAddress = serverAddress;
var resolver = __importStar(require("./resolver"));
exports.resolver = resolver;
var retryStrategy = __importStar(require("./retry-strategy"));
exports.retryStrategy = retryStrategy;

},{"./bookmark":60,"./connection-holder":61,"./connectivity-verifier":62,"./constants":63,"./logger":65,"./observers":66,"./resolver":69,"./retry-strategy":70,"./server-address":71,"./temporal-util":72,"./transaction-executor":73,"./tx-config":74,"./url-util":75,"./util":76}],65:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var error_1 = require("../error");
var ERROR = 'error';
var WARN = 'warn';
var INFO = 'info';
var DEBUG = 'debug';
var DEFAULT_LEVEL = INFO;
var levels = (_a = {},
    _a[ERROR] = 0,
    _a[WARN] = 1,
    _a[INFO] = 2,
    _a[DEBUG] = 3,
    _a);
/**
 * Logger used by the driver to notify about various internal events. Single logger should be used per driver.
 */
var Logger = /** @class */ (function () {
    /**
     * @constructor
     * @param {string} level the enabled logging level.
     * @param {function(level: string, message: string)} loggerFunction the function to write the log level and message.
     */
    function Logger(level, loggerFunction) {
        this._level = level;
        this._loggerFunction = loggerFunction;
    }
    /**
     * Create a new logger based on the given driver configuration.
     * @param {Object} driverConfig the driver configuration as supplied by the user.
     * @return {Logger} a new logger instance or a no-op logger when not configured.
     */
    Logger.create = function (driverConfig) {
        if (driverConfig && driverConfig.logging) {
            var loggingConfig = driverConfig.logging;
            var level = extractConfiguredLevel(loggingConfig);
            var loggerFunction = extractConfiguredLogger(loggingConfig);
            return new Logger(level, loggerFunction);
        }
        return this.noOp();
    };
    /**
     * Create a no-op logger implementation.
     * @return {Logger} the no-op logger implementation.
     */
    Logger.noOp = function () {
        return noOpLogger;
    };
    /**
     * Check if error logging is enabled, i.e. it is not a no-op implementation.
     * @return {boolean} `true` when enabled, `false` otherwise.
     */
    Logger.prototype.isErrorEnabled = function () {
        return isLevelEnabled(this._level, ERROR);
    };
    /**
     * Log an error message.
     * @param {string} message the message to log.
     */
    Logger.prototype.error = function (message) {
        if (this.isErrorEnabled()) {
            this._loggerFunction(ERROR, message);
        }
    };
    /**
     * Check if warn logging is enabled, i.e. it is not a no-op implementation.
     * @return {boolean} `true` when enabled, `false` otherwise.
     */
    Logger.prototype.isWarnEnabled = function () {
        return isLevelEnabled(this._level, WARN);
    };
    /**
     * Log an warning message.
     * @param {string} message the message to log.
     */
    Logger.prototype.warn = function (message) {
        if (this.isWarnEnabled()) {
            this._loggerFunction(WARN, message);
        }
    };
    /**
     * Check if info logging is enabled, i.e. it is not a no-op implementation.
     * @return {boolean} `true` when enabled, `false` otherwise.
     */
    Logger.prototype.isInfoEnabled = function () {
        return isLevelEnabled(this._level, INFO);
    };
    /**
     * Log an info message.
     * @param {string} message the message to log.
     */
    Logger.prototype.info = function (message) {
        if (this.isInfoEnabled()) {
            this._loggerFunction(INFO, message);
        }
    };
    /**
     * Check if debug logging is enabled, i.e. it is not a no-op implementation.
     * @return {boolean} `true` when enabled, `false` otherwise.
     */
    Logger.prototype.isDebugEnabled = function () {
        return isLevelEnabled(this._level, DEBUG);
    };
    /**
     * Log a debug message.
     * @param {string} message the message to log.
     */
    Logger.prototype.debug = function (message) {
        if (this.isDebugEnabled()) {
            this._loggerFunction(DEBUG, message);
        }
    };
    return Logger;
}());
exports.Logger = Logger;
var NoOpLogger = /** @class */ (function (_super) {
    __extends(NoOpLogger, _super);
    function NoOpLogger() {
        return _super.call(this, INFO, function (level, message) { }) || this;
    }
    NoOpLogger.prototype.isErrorEnabled = function () {
        return false;
    };
    NoOpLogger.prototype.error = function (message) { };
    NoOpLogger.prototype.isWarnEnabled = function () {
        return false;
    };
    NoOpLogger.prototype.warn = function (message) { };
    NoOpLogger.prototype.isInfoEnabled = function () {
        return false;
    };
    NoOpLogger.prototype.info = function (message) { };
    NoOpLogger.prototype.isDebugEnabled = function () {
        return false;
    };
    NoOpLogger.prototype.debug = function (message) { };
    return NoOpLogger;
}(Logger));
var noOpLogger = new NoOpLogger();
/**
 * Check if the given logging level is enabled.
 * @param {string} configuredLevel the configured level.
 * @param {string} targetLevel the level to check.
 * @return {boolean} value of `true` when enabled, `false` otherwise.
 */
function isLevelEnabled(configuredLevel, targetLevel) {
    return levels[configuredLevel] >= levels[targetLevel];
}
/**
 * Extract the configured logging level from the driver's logging configuration.
 * @param {Object} loggingConfig the logging configuration.
 * @return {string} the configured log level or default when none configured.
 */
function extractConfiguredLevel(loggingConfig) {
    if (loggingConfig && loggingConfig.level) {
        var configuredLevel = loggingConfig.level;
        var value = levels[configuredLevel];
        if (!value && value !== 0) {
            throw error_1.newError("Illegal logging level: " + configuredLevel + ". Supported levels are: " + Object.keys(levels));
        }
        return configuredLevel;
    }
    return DEFAULT_LEVEL;
}
/**
 * Extract the configured logger function from the driver's logging configuration.
 * @param {Object} loggingConfig the logging configuration.
 * @return {function(level: string, message: string)} the configured logging function.
 */
function extractConfiguredLogger(loggingConfig) {
    if (loggingConfig && loggingConfig.logger) {
        var configuredLogger = loggingConfig.logger;
        if (configuredLogger && typeof configuredLogger === 'function') {
            return configuredLogger;
        }
    }
    throw error_1.newError("Illegal logger function: " + loggingConfig.logger);
}

},{"../error":56}],66:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailedObserver = exports.CompletedObserver = void 0;
var CompletedObserver = /** @class */ (function () {
    function CompletedObserver() {
    }
    CompletedObserver.prototype.subscribe = function (observer) {
        apply(observer, observer.onKeys, []);
        apply(observer, observer.onCompleted, {});
    };
    CompletedObserver.prototype.cancel = function () {
        // do nothing
    };
    CompletedObserver.prototype.prepareToHandleSingleResponse = function () {
        // do nothing
    };
    CompletedObserver.prototype.markCompleted = function () {
        // do nothing
    };
    CompletedObserver.prototype.onError = function (error) {
        // nothing to do, already finished
        throw Error('CompletedObserver not supposed to call onError');
    };
    return CompletedObserver;
}());
exports.CompletedObserver = CompletedObserver;
var FailedObserver = /** @class */ (function () {
    function FailedObserver(_a) {
        var error = _a.error, onError = _a.onError;
        this._error = error;
        this._beforeError = onError;
        this._observers = [];
        this.onError(error);
    }
    FailedObserver.prototype.subscribe = function (observer) {
        apply(observer, observer.onError, this._error);
        this._observers.push(observer);
    };
    FailedObserver.prototype.onError = function (error) {
        var _this = this;
        Promise.resolve(apply(this, this._beforeError, error)).then(function () {
            return _this._observers.forEach(function (o) { return apply(o, o.onError, error); });
        });
    };
    FailedObserver.prototype.cancel = function () {
        // do nothing
    };
    FailedObserver.prototype.prepareToHandleSingleResponse = function () {
        // do nothing
    };
    FailedObserver.prototype.markCompleted = function () {
        // do nothing
    };
    return FailedObserver;
}());
exports.FailedObserver = FailedObserver;
function apply(thisArg, func, param) {
    if (func) {
        func.bind(thisArg)(param);
    }
}

},{}],67:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var BaseHostNameResolver = /** @class */ (function () {
    function BaseHostNameResolver() {
    }
    BaseHostNameResolver.prototype.resolve = function () {
        throw new Error('Abstract function');
    };
    /**
     * @protected
     */
    BaseHostNameResolver.prototype._resolveToItself = function (address) {
        return Promise.resolve([address]);
    };
    return BaseHostNameResolver;
}());
exports.default = BaseHostNameResolver;

},{}],68:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var server_address_1 = require("../server-address");
function resolveToSelf(address) {
    return Promise.resolve([address]);
}
var ConfiguredCustomResolver = /** @class */ (function () {
    function ConfiguredCustomResolver(resolverFunction) {
        this._resolverFunction = resolverFunction || resolveToSelf;
    }
    ConfiguredCustomResolver.prototype.resolve = function (seedRouter) {
        var _this = this;
        return new Promise(function (resolve) {
            return resolve(_this._resolverFunction(seedRouter.asHostPort()));
        }).then(function (resolved) {
            if (!Array.isArray(resolved)) {
                throw new TypeError('Configured resolver function should either return an array of addresses or a Promise resolved with an array of addresses.' +
                    ("Each address is '<host>:<port>'. Got: " + resolved));
            }
            return resolved.map(function (r) { return server_address_1.ServerAddress.fromUrl(r); });
        });
    };
    return ConfiguredCustomResolver;
}());
exports.default = ConfiguredCustomResolver;

},{"../server-address":71}],69:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfiguredCustomResolver = exports.BaseHostNameResolver = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var base_host_name_resolver_1 = __importDefault(require("./base-host-name-resolver"));
exports.BaseHostNameResolver = base_host_name_resolver_1.default;
var configured_custom_resolver_1 = __importDefault(require("./configured-custom-resolver"));
exports.ConfiguredCustomResolver = configured_custom_resolver_1.default;

},{"./base-host-name-resolver":67,"./configured-custom-resolver":68}],70:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.canRetryOn = void 0;
var error_1 = require("../error");
/**
 * Verified error and returns if it could be retried or not
 *
 * @param _error The error
 * @returns If the transaction could be retried.
 */
function canRetryOn(_error) {
    return (_error &&
        _error instanceof error_1.Neo4jError &&
        _error.code &&
        (_error.code === error_1.SERVICE_UNAVAILABLE ||
            _error.code === error_1.SESSION_EXPIRED ||
            _isAuthorizationExpired(_error) ||
            _isTransientError(_error)));
}
exports.canRetryOn = canRetryOn;
function _isTransientError(error) {
    // Retries should not happen when transaction was explicitly terminated by the user.
    // Termination of transaction might result in two different error codes depending on where it was
    // terminated. These are really client errors but classification on the server is not entirely correct and
    // they are classified as transient.
    var code = error.code;
    if (code.indexOf('TransientError') >= 0) {
        if (code === 'Neo.TransientError.Transaction.Terminated' ||
            code === 'Neo.TransientError.Transaction.LockClientStopped') {
            return false;
        }
        return true;
    }
    return false;
}
function _isAuthorizationExpired(error) {
    return error.code === 'Neo.ClientError.Security.AuthorizationExpired';
}

},{"../error":56}],71:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerAddress = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var util_1 = require("./util");
var urlUtil = __importStar(require("./url-util"));
var ServerAddress = /** @class */ (function () {
    function ServerAddress(host, resolved, port, hostPort) {
        this._host = util_1.assertString(host, 'host');
        this._resolved = resolved ? util_1.assertString(resolved, 'resolved') : null;
        this._port = util_1.assertNumber(port, 'port');
        this._hostPort = hostPort;
        this._stringValue = resolved ? hostPort + "(" + resolved + ")" : "" + hostPort;
    }
    ServerAddress.prototype.host = function () {
        return this._host;
    };
    ServerAddress.prototype.resolvedHost = function () {
        return this._resolved ? this._resolved : this._host;
    };
    ServerAddress.prototype.port = function () {
        return this._port;
    };
    ServerAddress.prototype.resolveWith = function (resolved) {
        return new ServerAddress(this._host, resolved, this._port, this._hostPort);
    };
    ServerAddress.prototype.asHostPort = function () {
        return this._hostPort;
    };
    ServerAddress.prototype.asKey = function () {
        return this._hostPort;
    };
    ServerAddress.prototype.toString = function () {
        return this._stringValue;
    };
    ServerAddress.fromUrl = function (url) {
        var urlParsed = urlUtil.parseDatabaseUrl(url);
        return new ServerAddress(urlParsed.host, null, urlParsed.port, urlParsed.hostAndPort);
    };
    return ServerAddress;
}());
exports.ServerAddress = ServerAddress;

},{"./url-util":75,"./util":76}],72:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.floorMod = exports.floorDiv = exports.assertValidNanosecond = exports.assertValidSecond = exports.assertValidMinute = exports.assertValidHour = exports.assertValidDay = exports.assertValidMonth = exports.assertValidYear = exports.timeZoneOffsetInSeconds = exports.totalNanoseconds = exports.dateToIsoString = exports.timeZoneOffsetToIsoString = exports.timeToIsoString = exports.durationToIsoString = exports.dateToEpochDay = exports.localDateTimeToEpochSecond = exports.localTimeToNanoOfDay = exports.normalizeNanosecondsForDuration = exports.normalizeSecondsForDuration = exports.SECONDS_PER_DAY = exports.DAYS_PER_400_YEAR_CYCLE = exports.DAYS_0000_TO_1970 = exports.NANOS_PER_HOUR = exports.NANOS_PER_MINUTE = exports.NANOS_PER_MILLISECOND = exports.NANOS_PER_SECOND = exports.SECONDS_PER_HOUR = exports.SECONDS_PER_MINUTE = exports.MINUTES_PER_HOUR = exports.NANOSECOND_OF_SECOND_RANGE = exports.SECOND_OF_MINUTE_RANGE = exports.MINUTE_OF_HOUR_RANGE = exports.HOUR_OF_DAY_RANGE = exports.DAY_OF_MONTH_RANGE = exports.MONTH_OF_YEAR_RANGE = exports.YEAR_RANGE = void 0;
var integer_1 = __importStar(require("../integer"));
var error_1 = require("../error");
var util_1 = require("./util");
/*
  Code in this util should be compatible with code in the database that uses JSR-310 java.time APIs.

  It is based on a library called ThreeTen (https://github.com/ThreeTen/threetenbp) which was derived
  from JSR-310 reference implementation previously hosted on GitHub. Code uses `Integer` type everywhere
  to correctly handle large integer values that are greater than `Number.MAX_SAFE_INTEGER`.

  Please consult either ThreeTen or js-joda (https://github.com/js-joda/js-joda) when working with the
  conversion functions.
 */
var ValueRange = /** @class */ (function () {
    function ValueRange(min, max) {
        this._minNumber = min;
        this._maxNumber = max;
        this._minInteger = integer_1.int(min);
        this._maxInteger = integer_1.int(max);
    }
    ValueRange.prototype.contains = function (value) {
        if (integer_1.isInt(value) && value instanceof integer_1.default) {
            return (value.greaterThanOrEqual(this._minInteger) &&
                value.lessThanOrEqual(this._maxInteger));
        }
        else if (typeof value === 'bigint') {
            var intValue = integer_1.int(value);
            return (intValue.greaterThanOrEqual(this._minInteger) &&
                intValue.lessThanOrEqual(this._maxInteger));
        }
        else {
            return value >= this._minNumber && value <= this._maxNumber;
        }
    };
    ValueRange.prototype.toString = function () {
        return "[" + this._minNumber + ", " + this._maxNumber + "]";
    };
    return ValueRange;
}());
exports.YEAR_RANGE = new ValueRange(-999999999, 999999999);
exports.MONTH_OF_YEAR_RANGE = new ValueRange(1, 12);
exports.DAY_OF_MONTH_RANGE = new ValueRange(1, 31);
exports.HOUR_OF_DAY_RANGE = new ValueRange(0, 23);
exports.MINUTE_OF_HOUR_RANGE = new ValueRange(0, 59);
exports.SECOND_OF_MINUTE_RANGE = new ValueRange(0, 59);
exports.NANOSECOND_OF_SECOND_RANGE = new ValueRange(0, 999999999);
exports.MINUTES_PER_HOUR = 60;
exports.SECONDS_PER_MINUTE = 60;
exports.SECONDS_PER_HOUR = exports.SECONDS_PER_MINUTE * exports.MINUTES_PER_HOUR;
exports.NANOS_PER_SECOND = 1000000000;
exports.NANOS_PER_MILLISECOND = 1000000;
exports.NANOS_PER_MINUTE = exports.NANOS_PER_SECOND * exports.SECONDS_PER_MINUTE;
exports.NANOS_PER_HOUR = exports.NANOS_PER_MINUTE * exports.MINUTES_PER_HOUR;
exports.DAYS_0000_TO_1970 = 719528;
exports.DAYS_PER_400_YEAR_CYCLE = 146097;
exports.SECONDS_PER_DAY = 86400;
function normalizeSecondsForDuration(seconds, nanoseconds) {
    return integer_1.int(seconds).add(floorDiv(nanoseconds, exports.NANOS_PER_SECOND));
}
exports.normalizeSecondsForDuration = normalizeSecondsForDuration;
function normalizeNanosecondsForDuration(nanoseconds) {
    return floorMod(nanoseconds, exports.NANOS_PER_SECOND);
}
exports.normalizeNanosecondsForDuration = normalizeNanosecondsForDuration;
/**
 * Converts given local time into a single integer representing this same time in nanoseconds of the day.
 * @param {Integer|number|string} hour the hour of the local time to convert.
 * @param {Integer|number|string} minute the minute of the local time to convert.
 * @param {Integer|number|string} second the second of the local time to convert.
 * @param {Integer|number|string} nanosecond the nanosecond of the local time to convert.
 * @return {Integer} nanoseconds representing the given local time.
 */
function localTimeToNanoOfDay(hour, minute, second, nanosecond) {
    hour = integer_1.int(hour);
    minute = integer_1.int(minute);
    second = integer_1.int(second);
    nanosecond = integer_1.int(nanosecond);
    var totalNanos = hour.multiply(exports.NANOS_PER_HOUR);
    totalNanos = totalNanos.add(minute.multiply(exports.NANOS_PER_MINUTE));
    totalNanos = totalNanos.add(second.multiply(exports.NANOS_PER_SECOND));
    return totalNanos.add(nanosecond);
}
exports.localTimeToNanoOfDay = localTimeToNanoOfDay;
/**
 * Converts given local date time into a single integer representing this same time in epoch seconds UTC.
 * @param {Integer|number|string} year the year of the local date-time to convert.
 * @param {Integer|number|string} month the month of the local date-time to convert.
 * @param {Integer|number|string} day the day of the local date-time to convert.
 * @param {Integer|number|string} hour the hour of the local date-time to convert.
 * @param {Integer|number|string} minute the minute of the local date-time to convert.
 * @param {Integer|number|string} second the second of the local date-time to convert.
 * @param {Integer|number|string} nanosecond the nanosecond of the local date-time to convert.
 * @return {Integer} epoch second in UTC representing the given local date time.
 */
function localDateTimeToEpochSecond(year, month, day, hour, minute, second, nanosecond) {
    var epochDay = dateToEpochDay(year, month, day);
    var localTimeSeconds = localTimeToSecondOfDay(hour, minute, second);
    return epochDay.multiply(exports.SECONDS_PER_DAY).add(localTimeSeconds);
}
exports.localDateTimeToEpochSecond = localDateTimeToEpochSecond;
/**
 * Converts given local date into a single integer representing it's epoch day.
 * @param {Integer|number|string} year the year of the local date to convert.
 * @param {Integer|number|string} month the month of the local date to convert.
 * @param {Integer|number|string} day the day of the local date to convert.
 * @return {Integer} epoch day representing the given date.
 */
function dateToEpochDay(year, month, day) {
    year = integer_1.int(year);
    month = integer_1.int(month);
    day = integer_1.int(day);
    var epochDay = year.multiply(365);
    if (year.greaterThanOrEqual(0)) {
        epochDay = epochDay.add(year
            .add(3)
            .div(4)
            .subtract(year.add(99).div(100))
            .add(year.add(399).div(400)));
    }
    else {
        epochDay = epochDay.subtract(year
            .div(-4)
            .subtract(year.div(-100))
            .add(year.div(-400)));
    }
    epochDay = epochDay.add(month
        .multiply(367)
        .subtract(362)
        .div(12));
    epochDay = epochDay.add(day.subtract(1));
    if (month.greaterThan(2)) {
        epochDay = epochDay.subtract(1);
        if (!isLeapYear(year)) {
            epochDay = epochDay.subtract(1);
        }
    }
    return epochDay.subtract(exports.DAYS_0000_TO_1970);
}
exports.dateToEpochDay = dateToEpochDay;
/**
 * Format given duration to an ISO 8601 string.
 * @param {Integer|number|string} months the number of months.
 * @param {Integer|number|string} days the number of days.
 * @param {Integer|number|string} seconds the number of seconds.
 * @param {Integer|number|string} nanoseconds the number of nanoseconds.
 * @return {string} ISO string that represents given duration.
 */
function durationToIsoString(months, days, seconds, nanoseconds) {
    var monthsString = formatNumber(months);
    var daysString = formatNumber(days);
    var secondsAndNanosecondsString = formatSecondsAndNanosecondsForDuration(seconds, nanoseconds);
    return "P" + monthsString + "M" + daysString + "DT" + secondsAndNanosecondsString + "S";
}
exports.durationToIsoString = durationToIsoString;
/**
 * Formats given time to an ISO 8601 string.
 * @param {Integer|number|string} hour the hour value.
 * @param {Integer|number|string} minute the minute value.
 * @param {Integer|number|string} second the second value.
 * @param {Integer|number|string} nanosecond the nanosecond value.
 * @return {string} ISO string that represents given time.
 */
function timeToIsoString(hour, minute, second, nanosecond) {
    var hourString = formatNumber(hour, 2);
    var minuteString = formatNumber(minute, 2);
    var secondString = formatNumber(second, 2);
    var nanosecondString = formatNanosecond(nanosecond);
    return hourString + ":" + minuteString + ":" + secondString + nanosecondString;
}
exports.timeToIsoString = timeToIsoString;
/**
 * Formats given time zone offset in seconds to string representation like '±HH:MM', '±HH:MM:SS' or 'Z' for UTC.
 * @param {Integer|number|string} offsetSeconds the offset in seconds.
 * @return {string} ISO string that represents given offset.
 */
function timeZoneOffsetToIsoString(offsetSeconds) {
    offsetSeconds = integer_1.int(offsetSeconds);
    if (offsetSeconds.equals(0)) {
        return 'Z';
    }
    var isNegative = offsetSeconds.isNegative();
    if (isNegative) {
        offsetSeconds = offsetSeconds.multiply(-1);
    }
    var signPrefix = isNegative ? '-' : '+';
    var hours = formatNumber(offsetSeconds.div(exports.SECONDS_PER_HOUR), 2);
    var minutes = formatNumber(offsetSeconds.div(exports.SECONDS_PER_MINUTE).modulo(exports.MINUTES_PER_HOUR), 2);
    var secondsValue = offsetSeconds.modulo(exports.SECONDS_PER_MINUTE);
    var seconds = secondsValue.equals(0) ? null : formatNumber(secondsValue, 2);
    return seconds
        ? "" + signPrefix + hours + ":" + minutes + ":" + seconds
        : "" + signPrefix + hours + ":" + minutes;
}
exports.timeZoneOffsetToIsoString = timeZoneOffsetToIsoString;
/**
 * Formats given date to an ISO 8601 string.
 * @param {Integer|number|string} year the date year.
 * @param {Integer|number|string} month the date month.
 * @param {Integer|number|string} day the date day.
 * @return {string} ISO string that represents given date.
 */
function dateToIsoString(year, month, day) {
    year = integer_1.int(year);
    var isNegative = year.isNegative();
    if (isNegative) {
        year = year.multiply(-1);
    }
    var yearString = formatNumber(year, 4);
    if (isNegative) {
        yearString = '-' + yearString;
    }
    var monthString = formatNumber(month, 2);
    var dayString = formatNumber(day, 2);
    return yearString + "-" + monthString + "-" + dayString;
}
exports.dateToIsoString = dateToIsoString;
/**
 * Get the total number of nanoseconds from the milliseconds of the given standard JavaScript date and optional nanosecond part.
 * @param {global.Date} standardDate the standard JavaScript date.
 * @param {Integer|number|bigint|undefined} nanoseconds the optional number of nanoseconds.
 * @return {Integer|number|bigint} the total amount of nanoseconds.
 */
function totalNanoseconds(standardDate, nanoseconds) {
    nanoseconds = nanoseconds || 0;
    var nanosFromMillis = standardDate.getMilliseconds() * exports.NANOS_PER_MILLISECOND;
    return add(nanoseconds, nanosFromMillis);
}
exports.totalNanoseconds = totalNanoseconds;
/**
 * Get the time zone offset in seconds from the given standard JavaScript date.
 *
 * <b>Implementation note:</b>
 * Time zone offset returned by the standard JavaScript date is the difference, in minutes, from local time to UTC.
 * So positive value means offset is behind UTC and negative value means it is ahead.
 * For Neo4j temporal types, like `Time` or `DateTime` offset is in seconds and represents difference from UTC to local time.
 * This is different from standard JavaScript dates and that's why implementation negates the returned value.
 *
 * @param {global.Date} standardDate the standard JavaScript date.
 * @return {number} the time zone offset in seconds.
 */
function timeZoneOffsetInSeconds(standardDate) {
    var offsetInMinutes = standardDate.getTimezoneOffset();
    if (offsetInMinutes === 0) {
        return 0;
    }
    return -1 * offsetInMinutes * exports.SECONDS_PER_MINUTE;
}
exports.timeZoneOffsetInSeconds = timeZoneOffsetInSeconds;
/**
 * Assert that the year value is valid.
 * @param {Integer|number} year the value to check.
 * @return {Integer|number} the value of the year if it is valid. Exception is thrown otherwise.
 */
function assertValidYear(year) {
    return assertValidTemporalValue(year, exports.YEAR_RANGE, 'Year');
}
exports.assertValidYear = assertValidYear;
/**
 * Assert that the month value is valid.
 * @param {Integer|number} month the value to check.
 * @return {Integer|number} the value of the month if it is valid. Exception is thrown otherwise.
 */
function assertValidMonth(month) {
    return assertValidTemporalValue(month, exports.MONTH_OF_YEAR_RANGE, 'Month');
}
exports.assertValidMonth = assertValidMonth;
/**
 * Assert that the day value is valid.
 * @param {Integer|number} day the value to check.
 * @return {Integer|number} the value of the day if it is valid. Exception is thrown otherwise.
 */
function assertValidDay(day) {
    return assertValidTemporalValue(day, exports.DAY_OF_MONTH_RANGE, 'Day');
}
exports.assertValidDay = assertValidDay;
/**
 * Assert that the hour value is valid.
 * @param {Integer|number} hour the value to check.
 * @return {Integer|number} the value of the hour if it is valid. Exception is thrown otherwise.
 */
function assertValidHour(hour) {
    return assertValidTemporalValue(hour, exports.HOUR_OF_DAY_RANGE, 'Hour');
}
exports.assertValidHour = assertValidHour;
/**
 * Assert that the minute value is valid.
 * @param {Integer|number} minute the value to check.
 * @return {Integer|number} the value of the minute if it is valid. Exception is thrown otherwise.
 */
function assertValidMinute(minute) {
    return assertValidTemporalValue(minute, exports.MINUTE_OF_HOUR_RANGE, 'Minute');
}
exports.assertValidMinute = assertValidMinute;
/**
 * Assert that the second value is valid.
 * @param {Integer|number} second the value to check.
 * @return {Integer|number} the value of the second if it is valid. Exception is thrown otherwise.
 */
function assertValidSecond(second) {
    return assertValidTemporalValue(second, exports.SECOND_OF_MINUTE_RANGE, 'Second');
}
exports.assertValidSecond = assertValidSecond;
/**
 * Assert that the nanosecond value is valid.
 * @param {Integer|number} nanosecond the value to check.
 * @return {Integer|number} the value of the nanosecond if it is valid. Exception is thrown otherwise.
 */
function assertValidNanosecond(nanosecond) {
    return assertValidTemporalValue(nanosecond, exports.NANOSECOND_OF_SECOND_RANGE, 'Nanosecond');
}
exports.assertValidNanosecond = assertValidNanosecond;
/**
 * Check if the given value is of expected type and is in the expected range.
 * @param {Integer|number} value the value to check.
 * @param {ValueRange} range the range.
 * @param {string} name the name of the value.
 * @return {Integer|number} the value if valid. Exception is thrown otherwise.
 */
function assertValidTemporalValue(value, range, name) {
    util_1.assertNumberOrInteger(value, name);
    if (!range.contains(value)) {
        throw error_1.newError(name + " is expected to be in range " + range + " but was: " + value);
    }
    return value;
}
/**
 * Converts given local time into a single integer representing this same time in seconds of the day. Nanoseconds are skipped.
 * @param {Integer|number|string} hour the hour of the local time.
 * @param {Integer|number|string} minute the minute of the local time.
 * @param {Integer|number|string} second the second of the local time.
 * @return {Integer} seconds representing the given local time.
 */
function localTimeToSecondOfDay(hour, minute, second) {
    hour = integer_1.int(hour);
    minute = integer_1.int(minute);
    second = integer_1.int(second);
    var totalSeconds = hour.multiply(exports.SECONDS_PER_HOUR);
    totalSeconds = totalSeconds.add(minute.multiply(exports.SECONDS_PER_MINUTE));
    return totalSeconds.add(second);
}
/**
 * Check if given year is a leap year. Uses algorithm described here {@link https://en.wikipedia.org/wiki/Leap_year#Algorithm}.
 * @param {Integer|number|string} year the year to check. Will be converted to {@link Integer} for all calculations.
 * @return {boolean} `true` if given year is a leap year, `false` otherwise.
 */
function isLeapYear(year) {
    year = integer_1.int(year);
    if (!year.modulo(4).equals(0)) {
        return false;
    }
    else if (!year.modulo(100).equals(0)) {
        return true;
    }
    else if (!year.modulo(400).equals(0)) {
        return false;
    }
    else {
        return true;
    }
}
/**
 * @param {Integer|number|string} x the divident.
 * @param {Integer|number|string} y the divisor.
 * @return {Integer} the result.
 */
function floorDiv(x, y) {
    x = integer_1.int(x);
    y = integer_1.int(y);
    var result = x.div(y);
    if (x.isPositive() !== y.isPositive() && result.multiply(y).notEquals(x)) {
        result = result.subtract(1);
    }
    return result;
}
exports.floorDiv = floorDiv;
/**
 * @param {Integer|number|string} x the divident.
 * @param {Integer|number|string} y the divisor.
 * @return {Integer} the result.
 */
function floorMod(x, y) {
    x = integer_1.int(x);
    y = integer_1.int(y);
    return x.subtract(floorDiv(x, y).multiply(y));
}
exports.floorMod = floorMod;
/**
 * @param {Integer|number|string} seconds the number of seconds to format.
 * @param {Integer|number|string} nanoseconds the number of nanoseconds to format.
 * @return {string} formatted value.
 */
function formatSecondsAndNanosecondsForDuration(seconds, nanoseconds) {
    seconds = integer_1.int(seconds);
    nanoseconds = integer_1.int(nanoseconds);
    var secondsString;
    var nanosecondsString;
    var secondsNegative = seconds.isNegative();
    var nanosecondsGreaterThanZero = nanoseconds.greaterThan(0);
    if (secondsNegative && nanosecondsGreaterThanZero) {
        if (seconds.equals(-1)) {
            secondsString = '-0';
        }
        else {
            secondsString = seconds.add(1).toString();
        }
    }
    else {
        secondsString = seconds.toString();
    }
    if (nanosecondsGreaterThanZero) {
        if (secondsNegative) {
            nanosecondsString = formatNanosecond(nanoseconds
                .negate()
                .add(2 * exports.NANOS_PER_SECOND)
                .modulo(exports.NANOS_PER_SECOND));
        }
        else {
            nanosecondsString = formatNanosecond(nanoseconds.add(exports.NANOS_PER_SECOND).modulo(exports.NANOS_PER_SECOND));
        }
    }
    return nanosecondsString ? secondsString + nanosecondsString : secondsString;
}
/**
 * @param {Integer|number|string} value the number of nanoseconds to format.
 * @return {string} formatted and possibly left-padded nanoseconds part as string.
 */
function formatNanosecond(value) {
    value = integer_1.int(value);
    return value.equals(0) ? '' : '.' + formatNumber(value, 9);
}
/**
 * @param {Integer|number|string} num the number to format.
 * @param {number} [stringLength=undefined] the string length to left-pad to.
 * @return {string} formatted and possibly left-padded number as string.
 */
function formatNumber(num, stringLength) {
    num = integer_1.int(num);
    var isNegative = num.isNegative();
    if (isNegative) {
        num = num.negate();
    }
    var numString = num.toString();
    if (stringLength) {
        // left pad the string with zeroes
        while (numString.length < stringLength) {
            numString = '0' + numString;
        }
    }
    return isNegative ? '-' + numString : numString;
}
function add(x, y) {
    if (x instanceof integer_1.default) {
        return x.add(y);
    }
    else if (typeof x === 'bigint') {
        return x + BigInt(y);
    }
    return x + y;
}

},{"../error":56,"../integer":59,"./util":76}],73:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionExecutor = void 0;
var error_1 = require("../error");
var retry_strategy_1 = require("./retry-strategy");
var DEFAULT_MAX_RETRY_TIME_MS = 30 * 1000; // 30 seconds
var DEFAULT_INITIAL_RETRY_DELAY_MS = 1000; // 1 seconds
var DEFAULT_RETRY_DELAY_MULTIPLIER = 2.0;
var DEFAULT_RETRY_DELAY_JITTER_FACTOR = 0.2;
var TransactionExecutor = /** @class */ (function () {
    function TransactionExecutor(maxRetryTimeMs, initialRetryDelayMs, multiplier, jitterFactor) {
        this._maxRetryTimeMs = _valueOrDefault(maxRetryTimeMs, DEFAULT_MAX_RETRY_TIME_MS);
        this._initialRetryDelayMs = _valueOrDefault(initialRetryDelayMs, DEFAULT_INITIAL_RETRY_DELAY_MS);
        this._multiplier = _valueOrDefault(multiplier, DEFAULT_RETRY_DELAY_MULTIPLIER);
        this._jitterFactor = _valueOrDefault(jitterFactor, DEFAULT_RETRY_DELAY_JITTER_FACTOR);
        this._inFlightTimeoutIds = [];
        this._verifyAfterConstruction();
    }
    TransactionExecutor.prototype.execute = function (transactionCreator, transactionWork) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._executeTransactionInsidePromise(transactionCreator, transactionWork, resolve, reject);
        }).catch(function (error) {
            var retryStartTimeMs = Date.now();
            var retryDelayMs = _this._initialRetryDelayMs;
            return _this._retryTransactionPromise(transactionCreator, transactionWork, error, retryStartTimeMs, retryDelayMs);
        });
    };
    TransactionExecutor.prototype.close = function () {
        // cancel all existing timeouts to prevent further retries
        this._inFlightTimeoutIds.forEach(function (timeoutId) { return clearTimeout(timeoutId); });
        this._inFlightTimeoutIds = [];
    };
    TransactionExecutor.prototype._retryTransactionPromise = function (transactionCreator, transactionWork, error, retryStartTime, retryDelayMs) {
        var _this = this;
        var elapsedTimeMs = Date.now() - retryStartTime;
        if (elapsedTimeMs > this._maxRetryTimeMs || !retry_strategy_1.canRetryOn(error)) {
            return Promise.reject(error);
        }
        return new Promise(function (resolve, reject) {
            var nextRetryTime = _this._computeDelayWithJitter(retryDelayMs);
            var timeoutId = setTimeout(function () {
                // filter out this timeoutId when time has come and function is being executed
                _this._inFlightTimeoutIds = _this._inFlightTimeoutIds.filter(function (id) { return id !== timeoutId; });
                _this._executeTransactionInsidePromise(transactionCreator, transactionWork, resolve, reject);
            }, nextRetryTime);
            // add newly created timeoutId to the list of all in-flight timeouts
            _this._inFlightTimeoutIds.push(timeoutId);
        }).catch(function (error) {
            var nextRetryDelayMs = retryDelayMs * _this._multiplier;
            return _this._retryTransactionPromise(transactionCreator, transactionWork, error, retryStartTime, nextRetryDelayMs);
        });
    };
    TransactionExecutor.prototype._executeTransactionInsidePromise = function (transactionCreator, transactionWork, resolve, reject) {
        var _this = this;
        var tx;
        try {
            tx = transactionCreator();
        }
        catch (error) {
            // failed to create a transaction
            reject(error);
            return;
        }
        var resultPromise = this._safeExecuteTransactionWork(tx, transactionWork);
        resultPromise
            .then(function (result) {
            return _this._handleTransactionWorkSuccess(result, tx, resolve, reject);
        })
            .catch(function (error) { return _this._handleTransactionWorkFailure(error, tx, reject); });
    };
    TransactionExecutor.prototype._safeExecuteTransactionWork = function (tx, transactionWork) {
        try {
            var result = transactionWork(tx);
            // user defined callback is supposed to return a promise, but it might not; so to protect against an
            // incorrect API usage we wrap the returned value with a resolved promise; this is effectively a
            // validation step without type checks
            return Promise.resolve(result);
        }
        catch (error) {
            return Promise.reject(error);
        }
    };
    TransactionExecutor.prototype._handleTransactionWorkSuccess = function (result, tx, resolve, reject) {
        if (tx.isOpen()) {
            // transaction work returned resolved promise and transaction has not been committed/rolled back
            // try to commit the transaction
            tx.commit()
                .then(function () {
                // transaction was committed, return result to the user
                resolve(result);
            })
                .catch(function (error) {
                // transaction failed to commit, propagate the failure
                reject(error);
            });
        }
        else {
            // transaction work returned resolved promise and transaction is already committed/rolled back
            // return the result returned by given transaction work
            resolve(result);
        }
    };
    TransactionExecutor.prototype._handleTransactionWorkFailure = function (error, tx, reject) {
        if (tx.isOpen()) {
            // transaction work failed and the transaction is still open, roll it back and propagate the failure
            tx.rollback()
                .catch(function (ignore) {
                // ignore the rollback error
            })
                .then(function () { return reject(error); }); // propagate the original error we got from the transaction work
        }
        else {
            // transaction is already rolled back, propagate the error
            reject(error);
        }
    };
    TransactionExecutor.prototype._computeDelayWithJitter = function (delayMs) {
        var jitter = delayMs * this._jitterFactor;
        var min = delayMs - jitter;
        var max = delayMs + jitter;
        return Math.random() * (max - min) + min;
    };
    TransactionExecutor.prototype._verifyAfterConstruction = function () {
        if (this._maxRetryTimeMs < 0) {
            throw error_1.newError('Max retry time should be >= 0: ' + this._maxRetryTimeMs);
        }
        if (this._initialRetryDelayMs < 0) {
            throw error_1.newError('Initial retry delay should >= 0: ' + this._initialRetryDelayMs);
        }
        if (this._multiplier < 1.0) {
            throw error_1.newError('Multiplier should be >= 1.0: ' + this._multiplier);
        }
        if (this._jitterFactor < 0 || this._jitterFactor > 1) {
            throw error_1.newError('Jitter factor should be in [0.0, 1.0]: ' + this._jitterFactor);
        }
    };
    return TransactionExecutor;
}());
exports.TransactionExecutor = TransactionExecutor;
function _valueOrDefault(value, defaultValue) {
    if (value || value === 0) {
        return value;
    }
    return defaultValue;
}

},{"../error":56,"./retry-strategy":70}],74:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxConfig = void 0;
var util = __importStar(require("./util"));
var error_1 = require("../error");
var integer_1 = require("../integer");
/**
 * Internal holder of the transaction configuration.
 * It performs input validation and value conversion for further serialization by the Bolt protocol layer.
 * Users of the driver provide transaction configuration as regular objects `{timeout: 10, metadata: {key: 'value'}}`.
 * Driver converts such objects to {@link TxConfig} immediately and uses converted values everywhere.
 */
var TxConfig = /** @class */ (function () {
    /**
     * @constructor
     * @param {Object} config the raw configuration object.
     */
    function TxConfig(config) {
        assertValidConfig(config);
        this.timeout = extractTimeout(config);
        this.metadata = extractMetadata(config);
    }
    /**
     * Get an empty config object.
     * @return {TxConfig} an empty config.
     */
    TxConfig.empty = function () {
        return EMPTY_CONFIG;
    };
    /**
     * Check if this config object is empty. I.e. has no configuration values specified.
     * @return {boolean} `true` if this object is empty, `false` otherwise.
     */
    TxConfig.prototype.isEmpty = function () {
        return Object.values(this).every(function (value) { return value == null; });
    };
    return TxConfig;
}());
exports.TxConfig = TxConfig;
var EMPTY_CONFIG = new TxConfig({});
/**
 * @return {Integer|null}
 */
function extractTimeout(config) {
    if (util.isObject(config) && (config.timeout || config.timeout === 0)) {
        util.assertNumberOrInteger(config.timeout, 'Transaction timeout');
        var timeout = integer_1.int(config.timeout);
        if (timeout.isZero()) {
            throw error_1.newError('Transaction timeout should not be zero');
        }
        if (timeout.isNegative()) {
            throw error_1.newError('Transaction timeout should not be negative');
        }
        return timeout;
    }
    return null;
}
/**
 * @return {object|null}
 */
function extractMetadata(config) {
    if (util.isObject(config) && config.metadata) {
        var metadata = config.metadata;
        util.assertObject(metadata, 'config.metadata');
        if (Object.keys(metadata).length !== 0) {
            // not an empty object
            return metadata;
        }
    }
    return null;
}
function assertValidConfig(config) {
    if (config) {
        util.assertObject(config, 'Transaction config');
    }
}

},{"../error":56,"../integer":59,"./util":76}],75:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Url = exports.formatIPv6Address = exports.formatIPv4Address = exports.defaultPortForScheme = exports.parseDatabaseUrl = void 0;
var util_1 = require("./util");
var DEFAULT_BOLT_PORT = 7687;
var DEFAULT_HTTP_PORT = 7474;
var DEFAULT_HTTPS_PORT = 7473;
var Url = /** @class */ (function () {
    function Url(scheme, host, port, hostAndPort, query) {
        /**
         * Nullable scheme (protocol) of the URL.
         * Example: 'bolt', 'neo4j', 'http', 'https', etc.
         * @type {string}
         */
        this.scheme = scheme;
        /**
         * Nonnull host name or IP address. IPv6 not wrapped in square brackets.
         * Example: 'neo4j.com', 'localhost', '127.0.0.1', '192.168.10.15', '::1', '2001:4860:4860::8844', etc.
         * @type {string}
         */
        this.host = host;
        /**
         * Nonnull number representing port. Default port for the given scheme is used if given URL string
         * does not contain port. Example: 7687 for bolt, 7474 for HTTP and 7473 for HTTPS.
         * @type {number}
         */
        this.port = port;
        /**
         * Nonnull host name or IP address plus port, separated by ':'. IPv6 wrapped in square brackets.
         * Example: 'neo4j.com', 'neo4j.com:7687', '127.0.0.1', '127.0.0.1:8080', '[2001:4860:4860::8844]',
         * '[2001:4860:4860::8844]:9090', etc.
         * @type {string}
         */
        this.hostAndPort = hostAndPort;
        /**
         * Nonnull object representing parsed query string key-value pairs. Duplicated keys not supported.
         * Example: '{}', '{'key1': 'value1', 'key2': 'value2'}', etc.
         * @type {Object}
         */
        this.query = query;
    }
    return Url;
}());
exports.Url = Url;
function parseDatabaseUrl(url) {
    util_1.assertString(url, 'URL');
    var sanitized = sanitizeUrl(url);
    var parsedUrl = uriJsParse(sanitized.url);
    var scheme = sanitized.schemeMissing
        ? null
        : extractScheme(parsedUrl.scheme);
    var host = extractHost(parsedUrl.host); // no square brackets for IPv6
    var formattedHost = formatHost(host); // has square brackets for IPv6
    var port = extractPort(parsedUrl.port, scheme);
    var hostAndPort = formattedHost + ":" + port;
    var query = extractQuery(
    // @ts-ignore
    parsedUrl.query || extractResourceQueryString(parsedUrl.resourceName), url);
    return new Url(scheme, host, port, hostAndPort, query);
}
exports.parseDatabaseUrl = parseDatabaseUrl;
function extractResourceQueryString(resource) {
    if (typeof resource !== 'string') {
        return null;
    }
    var _a = __read(resource.split('?'), 2), _ = _a[0], query = _a[1];
    return query;
}
function sanitizeUrl(url) {
    url = url.trim();
    if (url.indexOf('://') === -1) {
        // url does not contain scheme, add dummy 'none://' to make parser work correctly
        return { schemeMissing: true, url: "none://" + url };
    }
    return { schemeMissing: false, url: url };
}
function extractScheme(scheme) {
    if (scheme) {
        scheme = scheme.trim();
        if (scheme.charAt(scheme.length - 1) === ':') {
            scheme = scheme.substring(0, scheme.length - 1);
        }
        return scheme;
    }
    return null;
}
function extractHost(host, url) {
    if (!host) {
        throw new Error("Unable to extract host from " + url);
    }
    return host.trim();
}
function extractPort(portString, scheme) {
    var port = typeof portString === 'string' ? parseInt(portString, 10) : portString;
    return port === 0 || port ? port : defaultPortForScheme(scheme);
}
function extractQuery(queryString, url) {
    var query = queryString ? trimAndSanitizeQuery(queryString) : null;
    var context = {};
    if (query) {
        query.split('&').forEach(function (pair) {
            var keyValue = pair.split('=');
            if (keyValue.length !== 2) {
                throw new Error("Invalid parameters: '" + keyValue + "' in URL '" + url + "'.");
            }
            var key = trimAndVerifyQueryElement(keyValue[0], 'key', url);
            var value = trimAndVerifyQueryElement(keyValue[1], 'value', url);
            if (context[key]) {
                throw new Error("Duplicated query parameters with key '" + key + "' in URL '" + url + "'");
            }
            context[key] = value;
        });
    }
    return context;
}
function trimAndSanitizeQuery(query) {
    query = (query || '').trim();
    if (query && query.charAt(0) === '?') {
        query = query.substring(1, query.length);
    }
    return query;
}
function trimAndVerifyQueryElement(element, name, url) {
    element = (element || '').trim();
    if (!element) {
        throw new Error("Illegal empty " + name + " in URL query '" + url + "'");
    }
    return element;
}
function escapeIPv6Address(address) {
    var startsWithSquareBracket = address.charAt(0) === '[';
    var endsWithSquareBracket = address.charAt(address.length - 1) === ']';
    if (!startsWithSquareBracket && !endsWithSquareBracket) {
        return "[" + address + "]";
    }
    else if (startsWithSquareBracket && endsWithSquareBracket) {
        return address;
    }
    else {
        throw new Error("Illegal IPv6 address " + address);
    }
}
function formatHost(host) {
    if (!host) {
        throw new Error("Illegal host " + host);
    }
    var isIPv6Address = host.indexOf(':') >= 0;
    return isIPv6Address ? escapeIPv6Address(host) : host;
}
function formatIPv4Address(address, port) {
    return address + ":" + port;
}
exports.formatIPv4Address = formatIPv4Address;
function formatIPv6Address(address, port) {
    var escapedAddress = escapeIPv6Address(address);
    return escapedAddress + ":" + port;
}
exports.formatIPv6Address = formatIPv6Address;
function defaultPortForScheme(scheme) {
    if (scheme === 'http') {
        return DEFAULT_HTTP_PORT;
    }
    else if (scheme === 'https') {
        return DEFAULT_HTTPS_PORT;
    }
    else {
        return DEFAULT_BOLT_PORT;
    }
}
exports.defaultPortForScheme = defaultPortForScheme;
function uriJsParse(value) {
    // JS version of Python partition function
    function partition(s, delimiter) {
        var i = s.indexOf(delimiter);
        if (i >= 0)
            return [s.substring(0, i), s[i], s.substring(i + 1)];
        else
            return [s, '', ''];
    }
    // JS version of Python rpartition function
    function rpartition(s, delimiter) {
        var i = s.lastIndexOf(delimiter);
        if (i >= 0)
            return [s.substring(0, i), s[i], s.substring(i + 1)];
        else
            return ['', '', s];
    }
    function between(s, ldelimiter, rdelimiter) {
        var lpartition = partition(s, ldelimiter);
        var rpartition = partition(lpartition[2], rdelimiter);
        return [rpartition[0], rpartition[2]];
    }
    // Parse an authority string into an object
    // with the following keys:
    // - userInfo (optional, might contain both user name and password)
    // - host
    // - port (optional, included only as a string)
    function parseAuthority(value) {
        var parsed = {}, parts;
        // Parse user info
        parts = rpartition(value, '@');
        if (parts[1] === '@') {
            parsed.userInfo = decodeURIComponent(parts[0]);
            value = parts[2];
        }
        // Parse host and port
        var _a = __read(between(value, "[", "]"), 2), ipv6Host = _a[0], rest = _a[1];
        if (ipv6Host !== '') {
            parsed.host = ipv6Host;
            parts = partition(rest, ':');
        }
        else {
            parts = partition(value, ':');
            parsed.host = parts[0];
        }
        if (parts[1] === ':') {
            parsed.port = parts[2];
        }
        return parsed;
    }
    var parsed = {}, parts;
    // Parse scheme
    parts = partition(value, ':');
    if (parts[1] === ':') {
        parsed.scheme = decodeURIComponent(parts[0]);
        value = parts[2];
    }
    // Parse fragment
    parts = partition(value, '#');
    if (parts[1] === '#') {
        parsed.fragment = decodeURIComponent(parts[2]);
        value = parts[0];
    }
    // Parse query
    parts = partition(value, '?');
    if (parts[1] === '?') {
        parsed.query = parts[2];
        value = parts[0];
    }
    // Parse authority and path
    if (value.startsWith('//')) {
        parts = partition(value.substr(2), '/');
        parsed = __assign(__assign({}, parsed), parseAuthority(parts[0]));
        parsed.path = parts[1] + parts[2];
    }
    else {
        parsed.path = value;
    }
    return parsed;
}

},{"./util":76}],76:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENCRYPTION_OFF = exports.ENCRYPTION_ON = exports.validateQueryAndParameters = exports.assertValidDate = exports.assertNumberOrInteger = exports.assertNumber = exports.assertString = exports.assertObject = exports.isString = exports.isObject = exports.isEmptyObjectOrNull = void 0;
var integer_1 = require("../integer");
var json_1 = require("../json");
var ENCRYPTION_ON = 'ENCRYPTION_ON';
exports.ENCRYPTION_ON = ENCRYPTION_ON;
var ENCRYPTION_OFF = 'ENCRYPTION_OFF';
exports.ENCRYPTION_OFF = ENCRYPTION_OFF;
/**
 * Verifies if the object is null or empty
 * @param obj The subject object
 * @returns {boolean} True if it's empty object or null
 */
function isEmptyObjectOrNull(obj) {
    if (obj === null) {
        return true;
    }
    if (!isObject(obj)) {
        return false;
    }
    for (var prop in obj) {
        if (Object.prototype.hasOwnProperty.bind(obj, prop)) {
            return false;
        }
    }
    return true;
}
exports.isEmptyObjectOrNull = isEmptyObjectOrNull;
/**
 * Verify if it's an object
 * @param obj The subject
 * @returns {boolean} True if it's an object
 */
function isObject(obj) {
    return typeof obj === 'object' && !Array.isArray(obj) && obj !== null;
}
exports.isObject = isObject;
/**
 * Check and normalize given query and parameters.
 * @param {string|{text: string, parameters: Object}} query the query to check.
 * @param {Object} parameters
 * @return {{validatedQuery: string|{text: string, parameters: Object}, params: Object}} the normalized query with parameters.
 * @throws TypeError when either given query or parameters are invalid.
 */
function validateQueryAndParameters(query, parameters, opt) {
    var validatedQuery = '';
    var params = parameters || {};
    var skipAsserts = (opt === null || opt === void 0 ? void 0 : opt.skipAsserts) || false;
    if (typeof query === 'string') {
        validatedQuery = query;
    }
    else if (query instanceof String) {
        validatedQuery = query.toString();
    }
    else if (typeof query === 'object' && query.text) {
        validatedQuery = query.text;
        params = query.parameters || {};
    }
    if (!skipAsserts) {
        assertCypherQuery(validatedQuery);
        assertQueryParameters(params);
    }
    return { validatedQuery: validatedQuery, params: params };
}
exports.validateQueryAndParameters = validateQueryAndParameters;
/**
 * Assert it's a object
 * @param {any} obj The subject
 * @param {string} objName The object name
 * @returns {object} The subject object
 * @throws {TypeError} when the supplied param is not an object
 */
function assertObject(obj, objName) {
    if (!isObject(obj)) {
        throw new TypeError(objName + ' expected to be an object but was: ' + json_1.stringify(obj));
    }
    return obj;
}
exports.assertObject = assertObject;
/**
 * Assert it's a string
 * @param {any} obj The subject
 * @param {string} objName The object name
 * @returns {string} The subject string
 * @throws {TypeError} when the supplied param is not a string
 */
function assertString(obj, objName) {
    if (!isString(obj)) {
        throw new TypeError(objName + ' expected to be string but was: ' + json_1.stringify(obj));
    }
    return obj;
}
exports.assertString = assertString;
/**
 * Assert it's a number
 * @param {any} obj The subject
 * @param {string} objName The object name
 * @returns {number} The number
 * @throws {TypeError} when the supplied param is not a number
 */
function assertNumber(obj, objName) {
    if (typeof obj !== 'number') {
        throw new TypeError(objName + ' expected to be a number but was: ' + json_1.stringify(obj));
    }
    return obj;
}
exports.assertNumber = assertNumber;
/**
 * Assert it's a number or integer
 * @param {any} obj The subject
 * @param {string} objName The object name
 * @returns {number|Integer} The subject object
 * @throws {TypeError} when the supplied param is not a number or integer
 */
function assertNumberOrInteger(obj, objName) {
    if (typeof obj !== 'number' && typeof obj !== 'bigint' && !integer_1.isInt(obj)) {
        throw new TypeError(objName +
            ' expected to be either a number or an Integer object but was: ' +
            json_1.stringify(obj));
    }
    return obj;
}
exports.assertNumberOrInteger = assertNumberOrInteger;
/**
 * Assert it's a valid datae
 * @param {any} obj The subject
 * @param {string} objName The object name
 * @returns {Date} The valida date
 * @throws {TypeError} when the supplied param is not a valid date
 */
function assertValidDate(obj, objName) {
    if (Object.prototype.toString.call(obj) !== '[object Date]') {
        throw new TypeError(objName +
            ' expected to be a standard JavaScript Date but was: ' +
            json_1.stringify(obj));
    }
    if (Number.isNaN(obj.getTime())) {
        throw new TypeError(objName +
            ' expected to be valid JavaScript Date but its time was NaN: ' +
            json_1.stringify(obj));
    }
    return obj;
}
exports.assertValidDate = assertValidDate;
/**
 * Validates a cypher query string
 * @param {any} obj The query
 * @returns {void}
 * @throws {TypeError} if the query is not valid
 */
function assertCypherQuery(obj) {
    assertString(obj, 'Cypher query');
    if (obj.trim().length === 0) {
        throw new TypeError('Cypher query is expected to be a non-empty string.');
    }
}
/**
 * Validates if the query parameters is an object
 * @param {any} obj The parameters
 * @returns {void}
 * @throws {TypeError} if the parameters is not valid
 */
function assertQueryParameters(obj) {
    if (!isObject(obj)) {
        // objects created with `Object.create(null)` do not have a constructor property
        var constructor = obj.constructor ? ' ' + obj.constructor.name : '';
        throw new TypeError("Query parameters are expected to either be undefined/null or an object, given:" + constructor + " " + obj);
    }
}
/**
 * Verify if the supplied object is a string
 *
 * @param str The string
 * @returns {boolean} True if the supplied object is an string
 */
function isString(str) {
    return Object.prototype.toString.call(str) === '[object String]';
}
exports.isString = isString;

},{"../integer":59,"../json":77}],77:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringify = void 0;
/**
 * Custom version on JSON.stringify that can handle values that normally don't support serialization, such as BigInt.
 * @private
 * @param val A JavaScript value, usually an object or array, to be converted.
 * @returns A JSON string representing the given value.
 */
function stringify(val) {
    return JSON.stringify(val, function (_, value) {
        return typeof value === 'bigint' ? value + "n" : value;
    });
}
exports.stringify = stringify;

},{}],78:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var error_1 = require("./error");
function generateFieldLookup(keys) {
    var lookup = {};
    keys.forEach(function (name, idx) {
        lookup[name] = idx;
    });
    return lookup;
}
/**
 * Records make up the contents of the {@link Result}, and is how you access
 * the output of a query. A simple query might yield a result stream
 * with a single record, for instance:
 *
 *     MATCH (u:User) RETURN u.name, u.age
 *
 * This returns a stream of records with two fields, named `u.name` and `u.age`,
 * each record represents one user found by the query above. You can access
 * the values of each field either by name:
 *
 *     record.get("u.name")
 *
 * Or by it's position:
 *
 *     record.get(0)
 *
 * @access public
 */
var Record = /** @class */ (function () {
    /**
     * Create a new record object.
     * @constructor
     * @protected
     * @param {string[]} keys An array of field keys, in the order the fields appear in the record
     * @param {Array} fields An array of field values
     * @param {Object} fieldLookup An object of fieldName -> value index, used to map
     *                            field names to values. If this is null, one will be
     *                            generated.
     */
    function Record(keys, fields, fieldLookup) {
        /**
         * Field keys, in the order the fields appear in the record.
         * @type {string[]}
         */
        this.keys = keys;
        /**
         * Number of fields
         * @type {Number}
         */
        this.length = keys.length;
        this._fields = fields;
        this._fieldLookup = fieldLookup || generateFieldLookup(keys);
    }
    /**
     * Run the given function for each field in this record. The function
     * will get three arguments - the value, the key and this record, in that
     * order.
     *
     * @param {function(value: Object, key: string, record: Record)} visitor the function to apply to each field.
     * @returns {void} Nothing
     */
    Record.prototype.forEach = function (visitor) {
        var e_1, _a;
        try {
            for (var _b = __values(this.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), key = _d[0], value = _d[1];
                visitor(value, key, this);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    /**
     * Run the given function for each field in this record. The function
     * will get three arguments - the value, the key and this record, in that
     * order.
     *
     * @param {function(value: Object, key: string, record: Record)} visitor the function to apply on each field
     * and return a value that is saved to the returned Array.
     *
     * @returns {Array}
     */
    Record.prototype.map = function (visitor) {
        var e_2, _a;
        var resultArray = [];
        try {
            for (var _b = __values(this.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), key = _d[0], value = _d[1];
                resultArray.push(visitor(value, key, this));
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return resultArray;
    };
    /**
     * Iterate over results. Each iteration will yield an array
     * of exactly two items - the key, and the value (in order).
     *
     * @generator
     * @returns {IterableIterator<Array>}
     */
    Record.prototype.entries = function () {
        var i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < this.keys.length)) return [3 /*break*/, 4];
                    return [4 /*yield*/, [this.keys[i], this._fields[i]]];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    };
    /**
     * Iterate over values.
     *
     * @generator
     * @returns {IterableIterator<Object>}
     */
    Record.prototype.values = function () {
        var i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < this.keys.length)) return [3 /*break*/, 4];
                    return [4 /*yield*/, this._fields[i]];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    };
    /**
     * Iterate over values. Delegates to {@link Record#values}
     *
     * @generator
     * @returns {IterableIterator<Object>}
     */
    Record.prototype[Symbol.iterator] = function () {
        var i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < this.keys.length)) return [3 /*break*/, 4];
                    return [4 /*yield*/, this._fields[i]];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    };
    /**
     * Generates an object out of the current Record
     *
     * @returns {Object}
     */
    Record.prototype.toObject = function () {
        var e_3, _a;
        var obj = {};
        try {
            for (var _b = __values(this.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), key = _d[0], value = _d[1];
                obj[key] = value;
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return obj;
    };
    /**
     * Get a value from this record, either by index or by field key.
     *
     * @param {string|Number} key Field key, or the index of the field.
     * @returns {*}
     */
    Record.prototype.get = function (key) {
        var index;
        if (!(typeof key === 'number')) {
            index = this._fieldLookup[key];
            if (index === undefined) {
                throw error_1.newError("This record has no field with key '" +
                    key +
                    "', available key are: [" +
                    this.keys +
                    '].');
            }
        }
        else {
            index = key;
        }
        if (index > this._fields.length - 1 || index < 0) {
            throw error_1.newError("This record has no field with index '" +
                index +
                "'. Remember that indexes start at `0`, " +
                'and make sure your query returns records in the shape you meant it to.');
        }
        return this._fields[index];
    };
    /**
     * Check if a value from this record, either by index or by field key, exists.
     *
     * @param {string|Number} key Field key, or the index of the field.
     * @returns {boolean}
     */
    Record.prototype.has = function (key) {
        // if key is a number, we check if it is in the _fields array
        if (typeof key === 'number') {
            return key >= 0 && key < this._fields.length;
        }
        // if it's not a number, we check _fieldLookup dictionary directly
        return this._fieldLookup[key] !== undefined;
    };
    return Record;
}());
exports.default = Record;

},{"./error":56}],79:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stats = exports.QueryStatistics = exports.ProfiledPlan = exports.Plan = exports.Notification = exports.ServerInfo = exports.queryType = void 0;
var integer_1 = __importStar(require("./integer"));
/**
 * A ResultSummary instance contains structured metadata for a {@link Result}.
 * @access public
 */
var ResultSummary = /** @class */ (function () {
    /**
     * @constructor
     * @param {string} query - The query this summary is for
     * @param {Object} parameters - Parameters for the query
     * @param {Object} metadata - Query metadata
     * @param {number|undefined} protocolVersion - Bolt Protocol Version
     */
    function ResultSummary(query, parameters, metadata, protocolVersion) {
        /**
         * The query and parameters this summary is for.
         * @type {{text: string, parameters: Object}}
         * @public
         */
        this.query = { text: query, parameters: parameters };
        /**
         * The type of query executed. Can be "r" for read-only query, "rw" for read-write query,
         * "w" for write-only query and "s" for schema-write query.
         * String constants are available in {@link queryType} object.
         * @type {string}
         * @public
         */
        this.queryType = metadata.type;
        /**
         * Counters for operations the query triggered.
         * @type {QueryStatistics}
         * @public
         */
        this.counters = new QueryStatistics(metadata.stats || {});
        // for backwards compatibility, remove in future version
        /**
         * Use {@link ResultSummary.counters} instead.
         * @type {QueryStatistics}
         * @deprecated
         */
        this.updateStatistics = this.counters;
        /**
         * This describes how the database will execute the query.
         * Query plan for the executed query if available, otherwise undefined.
         * Will only be populated for queries that start with "EXPLAIN".
         * @type {Plan|false}
         * @public
         */
        this.plan =
            metadata.plan || metadata.profile
                ? new Plan(metadata.plan || metadata.profile)
                : false;
        /**
         * This describes how the database did execute your query. This will contain detailed information about what
         * each step of the plan did. Profiled query plan for the executed query if available, otherwise undefined.
         * Will only be populated for queries that start with "PROFILE".
         * @type {ProfiledPlan}
         * @public
         */
        this.profile = metadata.profile ? new ProfiledPlan(metadata.profile) : false;
        /**
         * An array of notifications that might arise when executing the query. Notifications can be warnings about
         * problematic queries or other valuable information that can be presented in a client. Unlike failures
         * or errors, notifications do not affect the execution of a query.
         * @type {Array<Notification>}
         * @public
         */
        this.notifications = this._buildNotifications(metadata.notifications);
        /**
         * The basic information of the server where the result is obtained from.
         * @type {ServerInfo}
         * @public
         */
        this.server = new ServerInfo(metadata.server, protocolVersion);
        /**
         * The time it took the server to consume the result.
         * @type {number}
         * @public
         */
        this.resultConsumedAfter = metadata.result_consumed_after;
        /**
         * The time it took the server to make the result available for consumption in milliseconds.
         * @type {number}
         * @public
         */
        this.resultAvailableAfter = metadata.result_available_after;
        /**
         * The database name where this summary is obtained from.
         * @type {{name: string}}
         * @public
         */
        this.database = { name: metadata.db || null };
    }
    ResultSummary.prototype._buildNotifications = function (notifications) {
        if (!notifications) {
            return [];
        }
        return notifications.map(function (n) {
            return new Notification(n);
        });
    };
    /**
     * Check if the result summary has a plan
     * @return {boolean}
     */
    ResultSummary.prototype.hasPlan = function () {
        return this.plan instanceof Plan;
    };
    /**
     * Check if the result summary has a profile
     * @return {boolean}
     */
    ResultSummary.prototype.hasProfile = function () {
        return this.profile instanceof ProfiledPlan;
    };
    return ResultSummary;
}());
/**
 * Class for execution plan received by prepending Cypher with EXPLAIN.
 * @access public
 */
var Plan = /** @class */ (function () {
    /**
     * Create a Plan instance
     * @constructor
     * @param {Object} plan - Object with plan data
     */
    function Plan(plan) {
        this.operatorType = plan.operatorType;
        this.identifiers = plan.identifiers;
        this.arguments = plan.args;
        this.children = plan.children
            ? plan.children.map(function (child) { return new Plan(child); })
            : [];
    }
    return Plan;
}());
exports.Plan = Plan;
/**
 * Class for execution plan received by prepending Cypher with PROFILE.
 * @access public
 */
var ProfiledPlan = /** @class */ (function () {
    /**
     * Create a ProfiledPlan instance
     * @constructor
     * @param {Object} profile - Object with profile data
     */
    function ProfiledPlan(profile) {
        this.operatorType = profile.operatorType;
        this.identifiers = profile.identifiers;
        this.arguments = profile.args;
        this.dbHits = valueOrDefault('dbHits', profile);
        this.rows = valueOrDefault('rows', profile);
        this.pageCacheMisses = valueOrDefault('pageCacheMisses', profile);
        this.pageCacheHits = valueOrDefault('pageCacheHits', profile);
        this.pageCacheHitRatio = valueOrDefault('pageCacheHitRatio', profile);
        this.time = valueOrDefault('time', profile);
        this.children = profile.children
            ? profile.children.map(function (child) { return new ProfiledPlan(child); })
            : [];
    }
    ProfiledPlan.prototype.hasPageCacheStats = function () {
        return (this.pageCacheMisses > 0 ||
            this.pageCacheHits > 0 ||
            this.pageCacheHitRatio > 0);
    };
    return ProfiledPlan;
}());
exports.ProfiledPlan = ProfiledPlan;
/**
 * Stats Query statistics dictionary for a {@link QueryStatistics}
 * @public
 */
var Stats = /** @class */ (function () {
    /**
     * @constructor
     * @private
     */
    function Stats() {
        /**
         * nodes created
         * @type {number}
         * @public
         */
        this.nodesCreated = 0;
        /**
         * nodes deleted
         * @type {number}
         * @public
         */
        this.nodesDeleted = 0;
        /**
         * relationships created
         * @type {number}
         * @public
         */
        this.relationshipsCreated = 0;
        /**
         * relationships deleted
         * @type {number}
         * @public
         */
        this.relationshipsDeleted = 0;
        /**
         * properties set
         * @type {number}
         * @public
         */
        this.propertiesSet = 0;
        /**
         * labels added
         * @type {number}
         * @public
         */
        this.labelsAdded = 0;
        /**
         * labels removed
         * @type {number}
         * @public
         */
        this.labelsRemoved = 0;
        /**
         * indexes added
         * @type {number}
         * @public
         */
        this.indexesAdded = 0;
        /**
         * indexes removed
         * @type {number}
         * @public
         */
        this.indexesRemoved = 0;
        /**
         * constraints added
         * @type {number}
         * @public
         */
        this.constraintsAdded = 0;
        /**
         * constraints removed
         * @type {number}
         * @public
         */
        this.constraintsRemoved = 0;
    }
    return Stats;
}());
exports.Stats = Stats;
/**
 * Get statistical information for a {@link Result}.
 * @access public
 */
var QueryStatistics = /** @class */ (function () {
    /**
     * Structurize the statistics
     * @constructor
     * @param {Object} statistics - Result statistics
     */
    function QueryStatistics(statistics) {
        var _this = this;
        this._stats = {
            nodesCreated: 0,
            nodesDeleted: 0,
            relationshipsCreated: 0,
            relationshipsDeleted: 0,
            propertiesSet: 0,
            labelsAdded: 0,
            labelsRemoved: 0,
            indexesAdded: 0,
            indexesRemoved: 0,
            constraintsAdded: 0,
            constraintsRemoved: 0
        };
        this._systemUpdates = 0;
        Object.keys(statistics).forEach(function (index) {
            // To camelCase
            var camelCaseIndex = index.replace(/(-\w)/g, function (m) { return m[1].toUpperCase(); });
            if (camelCaseIndex in _this._stats) {
                _this._stats[camelCaseIndex] = intValue(statistics[index]);
            }
            else if (camelCaseIndex === 'systemUpdates') {
                _this._systemUpdates = intValue(statistics[index]);
            }
        });
        this._stats = Object.freeze(this._stats);
    }
    /**
     * Did the database get updated?
     * @return {boolean}
     */
    QueryStatistics.prototype.containsUpdates = function () {
        var _this = this;
        return (Object.keys(this._stats).reduce(function (last, current) {
            return last + _this._stats[current];
        }, 0) > 0);
    };
    /**
     * Returns the query statistics updates in a dictionary.
     * @returns {Stats}
     */
    QueryStatistics.prototype.updates = function () {
        return this._stats;
    };
    /**
     * Return true if the system database get updated, otherwise false
     * @returns {boolean} - If the system database get updated or not.
     */
    QueryStatistics.prototype.containsSystemUpdates = function () {
        return this._systemUpdates > 0;
    };
    /**
     * @returns {number} - Number of system updates
     */
    QueryStatistics.prototype.systemUpdates = function () {
        return this._systemUpdates;
    };
    return QueryStatistics;
}());
exports.QueryStatistics = QueryStatistics;
/**
 * Class for Cypher notifications
 * @access public
 */
var Notification = /** @class */ (function () {
    /**
     * Create a Notification instance
     * @constructor
     * @param {Object} notification - Object with notification data
     */
    function Notification(notification) {
        this.code = notification.code;
        this.title = notification.title;
        this.description = notification.description;
        this.severity = notification.severity;
        this.position = Notification._constructPosition(notification.position);
    }
    Notification._constructPosition = function (pos) {
        if (!pos) {
            return {};
        }
        return {
            offset: intValue(pos.offset),
            line: intValue(pos.line),
            column: intValue(pos.column)
        };
    };
    return Notification;
}());
exports.Notification = Notification;
/**
 * Class for exposing server info from a result.
 * @access public
 */
var ServerInfo = /** @class */ (function () {
    /**
     * Create a ServerInfo instance
     * @constructor
     * @param {Object} serverMeta - Object with serverMeta data
     * @param {Object} connectionInfo - Bolt connection info
     * @param {number} protocolVersion - Bolt Protocol Version
     */
    function ServerInfo(serverMeta, protocolVersion) {
        if (serverMeta) {
            /**
             * The server adress
             * @type {string}
             * @public
             */
            this.address = serverMeta.address;
            /**
             * The server version string.
             *
             * See {@link ServerInfo#protocolVersion} and {@link ServerInfo#agent}
             * @type {string}
             * @deprecated in 4.3, please use ServerInfo#agent, ServerInfo#protocolVersion, or call the <i>dbms.components</i> procedure instead.
             * <b>Method might be removed in the next major release.</b>
             
             * @public
             */
            this.version = serverMeta.version;
            /**
             * The server user agent string
             * @type {string}
             * @public
             */
            this.agent = serverMeta.version;
        }
        /**
         * The protocol version used by the connection
         * @type {number}
         * @public
         */
        this.protocolVersion = protocolVersion;
    }
    return ServerInfo;
}());
exports.ServerInfo = ServerInfo;
function intValue(value) {
    if (value instanceof integer_1.default) {
        return value.toInt();
    }
    else if (typeof value == 'bigint') {
        return integer_1.int(value).toInt();
    }
    else {
        return value;
    }
}
function valueOrDefault(key, values, defaultValue) {
    if (defaultValue === void 0) { defaultValue = 0; }
    if (key in values) {
        var value = values[key];
        return intValue(value);
    }
    else {
        return defaultValue;
    }
}
/**
 * The constants for query types
 * @type {{SCHEMA_WRITE: string, WRITE_ONLY: string, READ_ONLY: string, READ_WRITE: string}}
 */
var queryType = {
    READ_ONLY: 'r',
    READ_WRITE: 'rw',
    WRITE_ONLY: 'w',
    SCHEMA_WRITE: 's'
};
exports.queryType = queryType;
exports.default = ResultSummary;

},{"./integer":59}],80:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var result_summary_1 = __importDefault(require("./result-summary"));
var internal_1 = require("./internal");
var EMPTY_CONNECTION_HOLDER = internal_1.connectionHolder.EMPTY_CONNECTION_HOLDER;
/**
 * @private
 * @param {Error} error The error
 * @returns {void}
 */
var DEFAULT_ON_ERROR = function (error) {
    console.log('Uncaught error when processing result: ' + error);
};
/**
 * @private
 * @param {ResultSummary} summary
 * @returns {void}
 */
var DEFAULT_ON_COMPLETED = function (summary) { };
/**
 * A stream of {@link Record} representing the result of a query.
 * Can be consumed eagerly as {@link Promise} resolved with array of records and {@link ResultSummary}
 * summary, or rejected with error that contains {@link string} code and {@link string} message.
 * Alternatively can be consumed lazily using {@link Result#subscribe} function.
 * @access public
 */
var Result = /** @class */ (function () {
    /**
     * Inject the observer to be used.
     * @constructor
     * @access private
     * @param {Promise<observer.ResultStreamObserver>} streamObserverPromise
     * @param {mixed} query - Cypher query to execute
     * @param {Object} parameters - Map with parameters to use in query
     * @param {ConnectionHolder} connectionHolder - to be notified when result is either fully consumed or error happened.
     */
    function Result(streamObserverPromise, query, parameters, connectionHolder) {
        this._stack = captureStacktrace();
        this._streamObserverPromise = streamObserverPromise;
        this._p = null;
        this._query = query;
        this._parameters = parameters || {};
        this._connectionHolder = connectionHolder || EMPTY_CONNECTION_HOLDER;
    }
    /**
     * Returns a promise for the field keys.
     *
     * *Should not be combined with {@link Result#subscribe} function.*
     *
     * @public
     * @returns {Promise<string[]>} - Field keys, in the order they will appear in records.
     }
     */
    Result.prototype.keys = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._streamObserverPromise
                .then(function (observer) {
                return observer.subscribe({
                    onKeys: function (keys) { return resolve(keys); },
                    onError: function (err) { return reject(err); }
                });
            })
                .catch(reject);
        });
    };
    /**
     * Returns a promise for the result summary.
     *
     * *Should not be combined with {@link Result#subscribe} function.*
     *
     * @public
     * @returns {Promise<ResultSummary>} - Result summary.
     *
     */
    Result.prototype.summary = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._streamObserverPromise
                .then(function (o) {
                o.cancel();
                o.subscribe({
                    onCompleted: function (metadata) {
                        return _this._createSummary(metadata).then(resolve, reject);
                    },
                    onError: function (err) { return reject(err); }
                });
            })
                .catch(reject);
        });
    };
    /**
     * Create and return new Promise
     *
     * @private
     * @return {Promise} new Promise.
     */
    Result.prototype._getOrCreatePromise = function () {
        var _this = this;
        if (!this._p) {
            this._p = new Promise(function (resolve, reject) {
                var records = [];
                var observer = {
                    onNext: function (record) {
                        records.push(record);
                    },
                    onCompleted: function (summary) {
                        resolve({ records: records, summary: summary });
                    },
                    onError: function (error) {
                        reject(error);
                    }
                };
                _this.subscribe(observer);
            });
        }
        return this._p;
    };
    /**
     * Waits for all results and calls the passed in function with the results.
     *
     * *Should not be combined with {@link Result#subscribe} function.*
     *
     * @param {function(result: {records:Array<Record>, summary: ResultSummary})} onFulfilled - function to be called
     * when finished.
     * @param {function(error: {message:string, code:string})} onRejected - function to be called upon errors.
     * @return {Promise} promise.
     */
    Result.prototype.then = function (onFulfilled, onRejected) {
        return this._getOrCreatePromise().then(onFulfilled, onRejected);
    };
    /**
     * Catch errors when using promises.
     *
     * *Should not be combined with {@link Result#subscribe} function.*
     *
     * @param {function(error: Neo4jError)} onRejected - Function to be called upon errors.
     * @return {Promise} promise.
     */
    Result.prototype.catch = function (onRejected) {
        return this._getOrCreatePromise().catch(onRejected);
    };
    Result.prototype.finally = function (onfinally) {
        return this._getOrCreatePromise().finally(onfinally);
    };
    /**
     * Stream records to observer as they come in, this is a more efficient method
     * of handling the results, and allows you to handle arbitrarily large results.
     *
     * @param {Object} observer - Observer object
     * @param {function(keys: string[])} observer.onKeys - handle stream head, the field keys.
     * @param {function(record: Record)} observer.onNext - handle records, one by one.
     * @param {function(summary: ResultSummary)} observer.onCompleted - handle stream tail, the result summary.
     * @param {function(error: {message:string, code:string})} observer.onError - handle errors.
     * @return {void}
     */
    Result.prototype.subscribe = function (observer) {
        var _this = this;
        var onCompletedOriginal = observer.onCompleted || DEFAULT_ON_COMPLETED;
        var onCompletedWrapper = function (metadata) {
            _this._createSummary(metadata).then(function (summary) {
                return onCompletedOriginal.call(observer, summary);
            });
        };
        observer.onCompleted = onCompletedWrapper;
        var onErrorOriginal = observer.onError || DEFAULT_ON_ERROR;
        var onErrorWrapper = function (error) {
            // notify connection holder that the used connection is not needed any more because error happened
            // and result can't bee consumed any further; call the original onError callback after that
            _this._connectionHolder.releaseConnection().then(function () {
                replaceStacktrace(error, _this._stack);
                onErrorOriginal.call(observer, error);
            });
        };
        observer.onError = onErrorWrapper;
        this._streamObserverPromise
            .then(function (o) {
            return o.subscribe(observer);
        })
            .catch(function (error) { return observer.onError(error); });
    };
    /**
     * Signals the stream observer that the future records should be discarded on the server.
     *
     * @protected
     * @since 4.0.0
     * @returns {void}
     */
    Result.prototype._cancel = function () {
        this._streamObserverPromise.then(function (o) { return o.cancel(); });
    };
    Result.prototype._createSummary = function (metadata) {
        var _a = internal_1.util.validateQueryAndParameters(this._query, this._parameters, {
            skipAsserts: true
        }), query = _a.validatedQuery, parameters = _a.params;
        var connectionHolder = this._connectionHolder;
        return connectionHolder
            .getConnection()
            .then(
        // onFulfilled:
        function (connection) {
            return connectionHolder
                .releaseConnection()
                .then(function () {
                return connection ? connection.protocol().version : undefined;
            });
        }, 
        // onRejected:
        function (_) { return undefined; })
            .then(function (protocolVersion) {
            return new result_summary_1.default(query, parameters, metadata, protocolVersion);
        });
    };
    return Result;
}());
Symbol.toStringTag;
function captureStacktrace() {
    var error = new Error('');
    if (error.stack) {
        return error.stack.replace(/^Error(\n\r)*/, ''); // we don't need the 'Error\n' part, if only it exists
    }
    return null;
}
/**
 * @private
 * @param {Error} error The error
 * @param {string| null} newStack The newStack
 * @returns {void}
 */
function replaceStacktrace(error, newStack) {
    if (newStack) {
        // Error.prototype.toString() concatenates error.name and error.message nicely
        // then we add the rest of the stack trace
        error.stack = error.toString() + '\n' + newStack;
    }
}
exports.default = Result;

},{"./internal":64,"./result-summary":79}],81:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var observers_1 = require("./internal/observers");
var util_1 = require("./internal/util");
var error_1 = require("./error");
var result_1 = __importDefault(require("./result"));
var transaction_1 = __importDefault(require("./transaction"));
var connection_holder_1 = require("./internal/connection-holder");
var constants_1 = require("./internal/constants");
var transaction_executor_1 = require("./internal/transaction-executor");
var bookmark_1 = require("./internal/bookmark");
var tx_config_1 = require("./internal/tx-config");
/**
 * A Session instance is used for handling the connection and
 * sending queries through the connection.
 * In a single session, multiple queries will be executed serially.
 * In order to execute parallel queries, multiple sessions are required.
 * @access public
 */
var Session = /** @class */ (function () {
    /**
     * @constructor
     * @protected
     * @param {Object} args
     * @param {string} args.mode the default access mode for this session.
     * @param {ConnectionProvider} args.connectionProvider - The connection provider to acquire connections from.
     * @param {Bookmark} args.bookmark - The initial bookmark for this session.
     * @param {string} args.database the database name
     * @param {Object} args.config={} - This driver configuration.
     * @param {boolean} args.reactive - Whether this session should create reactive streams
     * @param {number} args.fetchSize - Defines how many records is pulled in each pulling batch
     */
    function Session(_a) {
        var mode = _a.mode, connectionProvider = _a.connectionProvider, bookmark = _a.bookmark, database = _a.database, config = _a.config, reactive = _a.reactive, fetchSize = _a.fetchSize;
        this._mode = mode;
        this._database = database;
        this._reactive = reactive;
        this._fetchSize = fetchSize;
        this._readConnectionHolder = new connection_holder_1.ConnectionHolder({
            mode: constants_1.ACCESS_MODE_READ,
            database: database,
            bookmark: bookmark,
            connectionProvider: connectionProvider
        });
        this._writeConnectionHolder = new connection_holder_1.ConnectionHolder({
            mode: constants_1.ACCESS_MODE_WRITE,
            database: database,
            bookmark: bookmark,
            connectionProvider: connectionProvider
        });
        this._open = true;
        this._hasTx = false;
        this._lastBookmark = bookmark || bookmark_1.Bookmark.empty();
        this._transactionExecutor = _createTransactionExecutor(config);
        this._onComplete = this._onCompleteCallback.bind(this);
    }
    /**
     * Run Cypher query
     * Could be called with a query object i.e.: `{text: "MATCH ...", parameters: {param: 1}}`
     * or with the query and parameters as separate arguments.
     *
     * @public
     * @param {mixed} query - Cypher query to execute
     * @param {Object} parameters - Map with parameters to use in query
     * @param {TransactionConfig} [transactionConfig] - Configuration for the new auto-commit transaction.
     * @return {Result} New Result.
     */
    Session.prototype.run = function (query, parameters, transactionConfig) {
        var _this = this;
        var _a = util_1.validateQueryAndParameters(query, parameters), validatedQuery = _a.validatedQuery, params = _a.params;
        var autoCommitTxConfig = transactionConfig
            ? new tx_config_1.TxConfig(transactionConfig)
            : tx_config_1.TxConfig.empty();
        return this._run(validatedQuery, params, function (connection) {
            _this._assertSessionIsOpen();
            return connection.protocol().run(validatedQuery, params, {
                bookmark: _this._lastBookmark,
                txConfig: autoCommitTxConfig,
                mode: _this._mode,
                database: _this._database,
                afterComplete: _this._onComplete,
                reactive: _this._reactive,
                fetchSize: _this._fetchSize
            });
        });
    };
    Session.prototype._run = function (query, parameters, customRunner) {
        var connectionHolder = this._connectionHolderWithMode(this._mode);
        var observerPromise;
        if (!this._open) {
            observerPromise = Promise.resolve(new observers_1.FailedObserver({
                error: error_1.newError('Cannot run query in a closed session.')
            }));
        }
        else if (!this._hasTx && connectionHolder.initializeConnection()) {
            observerPromise = connectionHolder
                .getConnection()
                .then(function (connection) { return customRunner(connection); })
                .catch(function (error) { return Promise.resolve(new observers_1.FailedObserver({ error: error })); });
        }
        else {
            observerPromise = Promise.resolve(new observers_1.FailedObserver({
                error: error_1.newError('Queries cannot be run directly on a ' +
                    'session with an open transaction; either run from within the ' +
                    'transaction or use a different session.')
            }));
        }
        return new result_1.default(observerPromise, query, parameters, connectionHolder);
    };
    Session.prototype._acquireConnection = function (connectionConsumer) {
        return __awaiter(this, void 0, void 0, function () {
            var promise, connectionHolder;
            var _this = this;
            return __generator(this, function (_a) {
                connectionHolder = this._connectionHolderWithMode(this._mode);
                if (!this._open) {
                    promise = Promise.reject(error_1.newError('Cannot run query in a closed session.'));
                }
                else if (!this._hasTx && connectionHolder.initializeConnection()) {
                    promise = connectionHolder
                        .getConnection()
                        .then(function (connection) { return connectionConsumer(connection); })
                        .then(function (result) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, connectionHolder.releaseConnection()];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/, result];
                            }
                        });
                    }); });
                }
                else {
                    promise = Promise.reject(error_1.newError('Queries cannot be run directly on a ' +
                        'session with an open transaction; either run from within the ' +
                        'transaction or use a different session.'));
                }
                return [2 /*return*/, promise];
            });
        });
    };
    /**
     * Begin a new transaction in this session. A session can have at most one transaction running at a time, if you
     * want to run multiple concurrent transactions, you should use multiple concurrent sessions.
     *
     * While a transaction is open the session cannot be used to run queries outside the transaction.
     *
     * @param {TransactionConfig} [transactionConfig] - Configuration for the new auto-commit transaction.
     * @returns {Transaction} New Transaction.
     */
    Session.prototype.beginTransaction = function (transactionConfig) {
        // this function needs to support bookmarks parameter for backwards compatibility
        // parameter was of type {string|string[]} and represented either a single or multiple bookmarks
        // that's why we need to check parameter type and decide how to interpret the value
        var arg = transactionConfig;
        var txConfig = tx_config_1.TxConfig.empty();
        if (arg) {
            txConfig = new tx_config_1.TxConfig(arg);
        }
        return this._beginTransaction(this._mode, txConfig);
    };
    Session.prototype._beginTransaction = function (accessMode, txConfig) {
        if (!this._open) {
            throw error_1.newError('Cannot begin a transaction on a closed session.');
        }
        if (this._hasTx) {
            throw error_1.newError('You cannot begin a transaction on a session with an open transaction; ' +
                'either run from within the transaction or use a different session.');
        }
        var mode = Session._validateSessionMode(accessMode);
        var connectionHolder = this._connectionHolderWithMode(mode);
        connectionHolder.initializeConnection();
        this._hasTx = true;
        var tx = new transaction_1.default({
            connectionHolder: connectionHolder,
            onClose: this._transactionClosed.bind(this),
            onBookmark: this._updateBookmark.bind(this),
            onConnection: this._assertSessionIsOpen.bind(this),
            reactive: this._reactive,
            fetchSize: this._fetchSize
        });
        tx._begin(this._lastBookmark, txConfig);
        return tx;
    };
    /**
     * @private
     * @returns {void}
     */
    Session.prototype._assertSessionIsOpen = function () {
        if (!this._open) {
            throw error_1.newError('You cannot run more transactions on a closed session.');
        }
    };
    /**
     * @private
     * @returns {void}
     */
    Session.prototype._transactionClosed = function () {
        this._hasTx = false;
    };
    /**
     * Return the bookmark received following the last completed {@link Transaction}.
     *
     * @return {string[]} A reference to a previous transaction.
     */
    Session.prototype.lastBookmark = function () {
        return this._lastBookmark.values();
    };
    /**
     * Execute given unit of work in a {@link READ} transaction.
     *
     * Transaction will automatically be committed unless the given function throws or returns a rejected promise.
     * Some failures of the given function or the commit itself will be retried with exponential backoff with initial
     * delay of 1 second and maximum retry time of 30 seconds. Maximum retry time is configurable via driver config's
     * `maxTransactionRetryTime` property in milliseconds.
     *
     * @param {function(tx: Transaction): Promise} transactionWork - Callback that executes operations against
     * a given {@link Transaction}.
     * @param {TransactionConfig} [transactionConfig] - Configuration for all transactions started to execute the unit of work.
     * @return {Promise} Resolved promise as returned by the given function or rejected promise when given
     * function or commit fails.
     */
    Session.prototype.readTransaction = function (transactionWork, transactionConfig) {
        var config = new tx_config_1.TxConfig(transactionConfig);
        return this._runTransaction(constants_1.ACCESS_MODE_READ, config, transactionWork);
    };
    /**
     * Execute given unit of work in a {@link WRITE} transaction.
     *
     * Transaction will automatically be committed unless the given function throws or returns a rejected promise.
     * Some failures of the given function or the commit itself will be retried with exponential backoff with initial
     * delay of 1 second and maximum retry time of 30 seconds. Maximum retry time is configurable via driver config's
     * `maxTransactionRetryTime` property in milliseconds.
     *
     * @param {function(tx: Transaction): Promise} transactionWork - Callback that executes operations against
     * a given {@link Transaction}.
     * @param {TransactionConfig} [transactionConfig] - Configuration for all transactions started to execute the unit of work.
     * @return {Promise} Resolved promise as returned by the given function or rejected promise when given
     * function or commit fails.
     */
    Session.prototype.writeTransaction = function (transactionWork, transactionConfig) {
        var config = new tx_config_1.TxConfig(transactionConfig);
        return this._runTransaction(constants_1.ACCESS_MODE_WRITE, config, transactionWork);
    };
    Session.prototype._runTransaction = function (accessMode, transactionConfig, transactionWork) {
        var _this = this;
        return this._transactionExecutor.execute(function () { return _this._beginTransaction(accessMode, transactionConfig); }, transactionWork);
    };
    /**
     * Update value of the last bookmark.
     * @private
     * @param {Bookmark} newBookmark - The new bookmark.
     * @returns {void}
     */
    Session.prototype._updateBookmark = function (newBookmark) {
        if (newBookmark && !newBookmark.isEmpty()) {
            this._lastBookmark = newBookmark;
        }
    };
    /**
     * Close this session.
     * @return {Promise}
     */
    Session.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this._open) return [3 /*break*/, 3];
                        this._open = false;
                        this._transactionExecutor.close();
                        return [4 /*yield*/, this._readConnectionHolder.close()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this._writeConnectionHolder.close()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype._connectionHolderWithMode = function (mode) {
        if (mode === constants_1.ACCESS_MODE_READ) {
            return this._readConnectionHolder;
        }
        else if (mode === constants_1.ACCESS_MODE_WRITE) {
            return this._writeConnectionHolder;
        }
        else {
            throw error_1.newError('Unknown access mode: ' + mode);
        }
    };
    /**
     * @private
     * @param {Object} meta Connection metadatada
     * @returns {void}
     */
    Session.prototype._onCompleteCallback = function (meta) {
        this._updateBookmark(new bookmark_1.Bookmark(meta.bookmark));
    };
    /**
     * @protected
     */
    Session._validateSessionMode = function (rawMode) {
        var mode = rawMode || constants_1.ACCESS_MODE_WRITE;
        if (mode !== constants_1.ACCESS_MODE_READ && mode !== constants_1.ACCESS_MODE_WRITE) {
            throw error_1.newError('Illegal session mode ' + mode);
        }
        return mode;
    };
    return Session;
}());
/**
 * @private
 * @param {object} config
 * @returns {TransactionExecutor} The transaction executor
 */
function _createTransactionExecutor(config) {
    var maxRetryTimeMs = config && config.maxTransactionRetryTime
        ? config.maxTransactionRetryTime
        : null;
    return new transaction_executor_1.TransactionExecutor(maxRetryTimeMs);
}
exports.default = Session;

},{"./error":56,"./internal/bookmark":60,"./internal/connection-holder":61,"./internal/constants":63,"./internal/observers":66,"./internal/transaction-executor":73,"./internal/tx-config":74,"./internal/util":76,"./result":80,"./transaction":84}],82:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPoint = exports.Point = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var util_1 = require("./internal/util");
var POINT_IDENTIFIER_PROPERTY = '__isPoint__';
/**
 * Represents a single two or three-dimensional point in a particular coordinate reference system.
 * Created `Point` objects are frozen with `Object.freeze()` in constructor and thus immutable.
 */
var Point = /** @class */ (function () {
    /**
     * @constructor
     * @param {T} srid - The coordinate reference system identifier.
     * @param {number} x - The `x` coordinate of the point.
     * @param {number} y - The `y` coordinate of the point.
     * @param {number} [z=undefined] - The `z` coordinate of the point or `undefined` if point has 2 dimensions.
     */
    function Point(srid, x, y, z) {
        /**
         * The coordinate reference system identifier.
         * @type {T}
         */
        this.srid = util_1.assertNumberOrInteger(srid, 'SRID');
        /**
         * The `x` coordinate of the point.
         * @type {number}
         */
        this.x = util_1.assertNumber(x, 'X coordinate');
        /**
         * The `y` coordinate of the point.
         * @type {number}
         */
        this.y = util_1.assertNumber(y, 'Y coordinate');
        /**
         * The `z` coordinate of the point or `undefined` if point is 2-dimensional.
         * @type {number}
         */
        this.z = z === null || z === undefined ? z : util_1.assertNumber(z, 'Z coordinate');
        Object.freeze(this);
    }
    /**
     * @ignore
     */
    Point.prototype.toString = function () {
        return this.z || this.z === 0
            ? "Point{srid=" + formatAsFloat(this.srid) + ", x=" + formatAsFloat(this.x) + ", y=" + formatAsFloat(this.y) + ", z=" + formatAsFloat(this.z) + "}"
            : "Point{srid=" + formatAsFloat(this.srid) + ", x=" + formatAsFloat(this.x) + ", y=" + formatAsFloat(this.y) + "}";
    };
    return Point;
}());
exports.Point = Point;
function formatAsFloat(number) {
    return Number.isInteger(number) ? number + '.0' : number.toString();
}
Object.defineProperty(Point.prototype, POINT_IDENTIFIER_PROPERTY, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false
});
/**
 * Test if given object is an instance of {@link Point} class.
 * @param {Object} obj the object to test.
 * @return {boolean} `true` if given object is a {@link Point}, `false` otherwise.
 */
function isPoint(obj) {
    return (obj && obj[POINT_IDENTIFIER_PROPERTY]) === true;
}
exports.isPoint = isPoint;

},{"./internal/util":76}],83:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDateTime = exports.DateTime = exports.isLocalDateTime = exports.LocalDateTime = exports.isDate = exports.Date = exports.isTime = exports.Time = exports.isLocalTime = exports.LocalTime = exports.isDuration = exports.Duration = void 0;
var util = __importStar(require("./internal/temporal-util"));
var util_1 = require("./internal/util");
var error_1 = require("./error");
var integer_1 = __importStar(require("./integer"));
var IDENTIFIER_PROPERTY_ATTRIBUTES = {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false
};
var DURATION_IDENTIFIER_PROPERTY = '__isDuration__';
var LOCAL_TIME_IDENTIFIER_PROPERTY = '__isLocalTime__';
var TIME_IDENTIFIER_PROPERTY = '__isTime__';
var DATE_IDENTIFIER_PROPERTY = '__isDate__';
var LOCAL_DATE_TIME_IDENTIFIER_PROPERTY = '__isLocalDateTime__';
var DATE_TIME_IDENTIFIER_PROPERTY = '__isDateTime__';
/**
 * Represents an ISO 8601 duration. Contains both date-based values (years, months, days) and time-based values (seconds, nanoseconds).
 * Created `Duration` objects are frozen with `Object.freeze()` in constructor and thus immutable.
 */
var Duration = /** @class */ (function () {
    /**
     * @constructor
     * @param {NumberOrInteger} months - The number of months for the new duration.
     * @param {NumberOrInteger} days - The number of days for the new duration.
     * @param {NumberOrInteger} seconds - The number of seconds for the new duration.
     * @param {NumberOrInteger} nanoseconds - The number of nanoseconds for the new duration.
     */
    function Duration(months, days, seconds, nanoseconds) {
        /**
         * The number of months.
         * @type {NumberOrInteger}
         */
        this.months = util_1.assertNumberOrInteger(months, 'Months');
        /**
         * The number of days.
         * @type {NumberOrInteger}
         */
        this.days = util_1.assertNumberOrInteger(days, 'Days');
        util_1.assertNumberOrInteger(seconds, 'Seconds');
        util_1.assertNumberOrInteger(nanoseconds, 'Nanoseconds');
        /**
         * The number of seconds.
         * @type {NumberOrInteger}
         */
        this.seconds = util.normalizeSecondsForDuration(seconds, nanoseconds);
        /**
         * The number of nanoseconds.
         * @type {NumberOrInteger}
         */
        this.nanoseconds = util.normalizeNanosecondsForDuration(nanoseconds);
        Object.freeze(this);
    }
    /**
     * @ignore
     */
    Duration.prototype.toString = function () {
        return util.durationToIsoString(this.months, this.days, this.seconds, this.nanoseconds);
    };
    return Duration;
}());
exports.Duration = Duration;
Object.defineProperty(Duration.prototype, DURATION_IDENTIFIER_PROPERTY, IDENTIFIER_PROPERTY_ATTRIBUTES);
/**
 * Test if given object is an instance of {@link Duration} class.
 * @param {Object} obj the object to test.
 * @return {boolean} `true` if given object is a {@link Duration}, `false` otherwise.
 */
function isDuration(obj) {
    return hasIdentifierProperty(obj, DURATION_IDENTIFIER_PROPERTY);
}
exports.isDuration = isDuration;
/**
 * Represents an instant capturing the time of day, but not the date, nor the timezone.
 * Created {@link LocalTime} objects are frozen with `Object.freeze()` in constructor and thus immutable.
 */
var LocalTime = /** @class */ (function () {
    /**
     * @constructor
     * @param {NumberOrInteger} hour - The hour for the new local time.
     * @param {NumberOrInteger} minute - The minute for the new local time.
     * @param {NumberOrInteger} second - The second for the new local time.
     * @param {NumberOrInteger} nanosecond - The nanosecond for the new local time.
     */
    function LocalTime(hour, minute, second, nanosecond) {
        /**
         * The hour.
         * @type {NumberOrInteger}
         */
        this.hour = util.assertValidHour(hour);
        /**
         * The minute.
         * @type {NumberOrInteger}
         */
        this.minute = util.assertValidMinute(minute);
        /**
         * The second.
         * @type {NumberOrInteger}
         */
        this.second = util.assertValidSecond(second);
        /**
         * The nanosecond.
         * @type {NumberOrInteger}
         */
        this.nanosecond = util.assertValidNanosecond(nanosecond);
        Object.freeze(this);
    }
    /**
     * Create a {@link LocalTime} object from the given standard JavaScript `Date` and optional nanoseconds.
     * Year, month, day and time zone offset components of the given date are ignored.
     * @param {global.Date} standardDate - The standard JavaScript date to convert.
     * @param {NumberOrInteger|undefined} nanosecond - The optional amount of nanoseconds.
     * @return {LocalTime<number>} New LocalTime.
     */
    LocalTime.fromStandardDate = function (standardDate, nanosecond) {
        verifyStandardDateAndNanos(standardDate, nanosecond);
        var totalNanoseconds = util.totalNanoseconds(standardDate, nanosecond);
        return new LocalTime(standardDate.getHours(), standardDate.getMinutes(), standardDate.getSeconds(), totalNanoseconds instanceof integer_1.default
            ? totalNanoseconds.toInt()
            : typeof totalNanoseconds === 'bigint'
                ? integer_1.int(totalNanoseconds).toInt()
                : totalNanoseconds);
    };
    /**
     * @ignore
     */
    LocalTime.prototype.toString = function () {
        return util.timeToIsoString(this.hour, this.minute, this.second, this.nanosecond);
    };
    return LocalTime;
}());
exports.LocalTime = LocalTime;
Object.defineProperty(LocalTime.prototype, LOCAL_TIME_IDENTIFIER_PROPERTY, IDENTIFIER_PROPERTY_ATTRIBUTES);
/**
 * Test if given object is an instance of {@link LocalTime} class.
 * @param {Object} obj the object to test.
 * @return {boolean} `true` if given object is a {@link LocalTime}, `false` otherwise.
 */
function isLocalTime(obj) {
    return hasIdentifierProperty(obj, LOCAL_TIME_IDENTIFIER_PROPERTY);
}
exports.isLocalTime = isLocalTime;
/**
 * Represents an instant capturing the time of day, and the timezone offset in seconds, but not the date.
 * Created {@link Time} objects are frozen with `Object.freeze()` in constructor and thus immutable.
 */
var Time = /** @class */ (function () {
    /**
     * @constructor
     * @param {NumberOrInteger} hour - The hour for the new local time.
     * @param {NumberOrInteger} minute - The minute for the new local time.
     * @param {NumberOrInteger} second - The second for the new local time.
     * @param {NumberOrInteger} nanosecond - The nanosecond for the new local time.
     * @param {NumberOrInteger} timeZoneOffsetSeconds - The time zone offset in seconds. Value represents the difference, in seconds, from UTC to local time.
     * This is different from standard JavaScript `Date.getTimezoneOffset()` which is the difference, in minutes, from local time to UTC.
     */
    function Time(hour, minute, second, nanosecond, timeZoneOffsetSeconds) {
        /**
         * The hour.
         * @type {NumberOrInteger}
         */
        this.hour = util.assertValidHour(hour);
        /**
         * The minute.
         * @type {NumberOrInteger}
         */
        this.minute = util.assertValidMinute(minute);
        /**
         * The second.
         * @type {NumberOrInteger}
         */
        this.second = util.assertValidSecond(second);
        /**
         * The nanosecond.
         * @type {NumberOrInteger}
         */
        this.nanosecond = util.assertValidNanosecond(nanosecond);
        /**
         * The time zone offset in seconds.
         * @type {NumberOrInteger}
         */
        this.timeZoneOffsetSeconds = util_1.assertNumberOrInteger(timeZoneOffsetSeconds, 'Time zone offset in seconds');
        Object.freeze(this);
    }
    /**
     * Create a {@link Time} object from the given standard JavaScript `Date` and optional nanoseconds.
     * Year, month and day components of the given date are ignored.
     * @param {global.Date} standardDate - The standard JavaScript date to convert.
     * @param {NumberOrInteger|undefined} nanosecond - The optional amount of nanoseconds.
     * @return {Time<number>} New Time.
     */
    Time.fromStandardDate = function (standardDate, nanosecond) {
        verifyStandardDateAndNanos(standardDate, nanosecond);
        return new Time(standardDate.getHours(), standardDate.getMinutes(), standardDate.getSeconds(), integer_1.toNumber(util.totalNanoseconds(standardDate, nanosecond)), util.timeZoneOffsetInSeconds(standardDate));
    };
    /**
     * @ignore
     */
    Time.prototype.toString = function () {
        return (util.timeToIsoString(this.hour, this.minute, this.second, this.nanosecond) + util.timeZoneOffsetToIsoString(this.timeZoneOffsetSeconds));
    };
    return Time;
}());
exports.Time = Time;
Object.defineProperty(Time.prototype, TIME_IDENTIFIER_PROPERTY, IDENTIFIER_PROPERTY_ATTRIBUTES);
/**
 * Test if given object is an instance of {@link Time} class.
 * @param {Object} obj the object to test.
 * @return {boolean} `true` if given object is a {@link Time}, `false` otherwise.
 */
function isTime(obj) {
    return hasIdentifierProperty(obj, TIME_IDENTIFIER_PROPERTY);
}
exports.isTime = isTime;
/**
 * Represents an instant capturing the date, but not the time, nor the timezone.
 * Created {@link Date} objects are frozen with `Object.freeze()` in constructor and thus immutable.
 */
var Date = /** @class */ (function () {
    /**
     * @constructor
     * @param {NumberOrInteger} year - The year for the new local date.
     * @param {NumberOrInteger} month - The month for the new local date.
     * @param {NumberOrInteger} day - The day for the new local date.
     */
    function Date(year, month, day) {
        /**
         * The year.
         * @type {NumberOrInteger}
         */
        this.year = util.assertValidYear(year);
        /**
         * The month.
         * @type {NumberOrInteger}
         */
        this.month = util.assertValidMonth(month);
        /**
         * The day.
         * @type {NumberOrInteger}
         */
        this.day = util.assertValidDay(day);
        Object.freeze(this);
    }
    /**
     * Create a {@link Date} object from the given standard JavaScript `Date`.
     * Hour, minute, second, millisecond and time zone offset components of the given date are ignored.
     * @param {global.Date} standardDate - The standard JavaScript date to convert.
     * @return {Date} New Date.
     */
    Date.fromStandardDate = function (standardDate) {
        verifyStandardDateAndNanos(standardDate);
        return new Date(standardDate.getFullYear(), standardDate.getMonth() + 1, standardDate.getDate());
    };
    /**
     * @ignore
     */
    Date.prototype.toString = function () {
        return util.dateToIsoString(this.year, this.month, this.day);
    };
    return Date;
}());
exports.Date = Date;
Object.defineProperty(Date.prototype, DATE_IDENTIFIER_PROPERTY, IDENTIFIER_PROPERTY_ATTRIBUTES);
/**
 * Test if given object is an instance of {@link Date} class.
 * @param {Object} obj - The object to test.
 * @return {boolean} `true` if given object is a {@link Date}, `false` otherwise.
 */
function isDate(obj) {
    return hasIdentifierProperty(obj, DATE_IDENTIFIER_PROPERTY);
}
exports.isDate = isDate;
/**
 * Represents an instant capturing the date and the time, but not the timezone.
 * Created {@link LocalDateTime} objects are frozen with `Object.freeze()` in constructor and thus immutable.
 */
var LocalDateTime = /** @class */ (function () {
    /**
     * @constructor
     * @param {NumberOrInteger} year - The year for the new local date.
     * @param {NumberOrInteger} month - The month for the new local date.
     * @param {NumberOrInteger} day - The day for the new local date.
     * @param {NumberOrInteger} hour - The hour for the new local time.
     * @param {NumberOrInteger} minute - The minute for the new local time.
     * @param {NumberOrInteger} second - The second for the new local time.
     * @param {NumberOrInteger} nanosecond - The nanosecond for the new local time.
     */
    function LocalDateTime(year, month, day, hour, minute, second, nanosecond) {
        /**
         * The year.
         * @type {NumberOrInteger}
         */
        this.year = util.assertValidYear(year);
        /**
         * The month.
         * @type {NumberOrInteger}
         */
        this.month = util.assertValidMonth(month);
        /**
         * The day.
         * @type {NumberOrInteger}
         */
        this.day = util.assertValidDay(day);
        /**
         * The hour.
         * @type {NumberOrInteger}
         */
        this.hour = util.assertValidHour(hour);
        /**
         * The minute.
         * @type {NumberOrInteger}
         */
        this.minute = util.assertValidMinute(minute);
        /**
         * The second.
         * @type {NumberOrInteger}
         */
        this.second = util.assertValidSecond(second);
        /**
         * The nanosecond.
         * @type {NumberOrInteger}
         */
        this.nanosecond = util.assertValidNanosecond(nanosecond);
        Object.freeze(this);
    }
    /**
     * Create a {@link LocalDateTime} object from the given standard JavaScript `Date` and optional nanoseconds.
     * Time zone offset component of the given date is ignored.
     * @param {global.Date} standardDate - The standard JavaScript date to convert.
     * @param {NumberOrInteger|undefined} nanosecond - The optional amount of nanoseconds.
     * @return {LocalDateTime} New LocalDateTime.
     */
    LocalDateTime.fromStandardDate = function (standardDate, nanosecond) {
        verifyStandardDateAndNanos(standardDate, nanosecond);
        return new LocalDateTime(standardDate.getFullYear(), standardDate.getMonth() + 1, standardDate.getDate(), standardDate.getHours(), standardDate.getMinutes(), standardDate.getSeconds(), integer_1.toNumber(util.totalNanoseconds(standardDate, nanosecond)));
    };
    /**
     * @ignore
     */
    LocalDateTime.prototype.toString = function () {
        return localDateTimeToString(this.year, this.month, this.day, this.hour, this.minute, this.second, this.nanosecond);
    };
    return LocalDateTime;
}());
exports.LocalDateTime = LocalDateTime;
Object.defineProperty(LocalDateTime.prototype, LOCAL_DATE_TIME_IDENTIFIER_PROPERTY, IDENTIFIER_PROPERTY_ATTRIBUTES);
/**
 * Test if given object is an instance of {@link LocalDateTime} class.
 * @param {Object} obj - The object to test.
 * @return {boolean} `true` if given object is a {@link LocalDateTime}, `false` otherwise.
 */
function isLocalDateTime(obj) {
    return hasIdentifierProperty(obj, LOCAL_DATE_TIME_IDENTIFIER_PROPERTY);
}
exports.isLocalDateTime = isLocalDateTime;
/**
 * Represents an instant capturing the date, the time and the timezone identifier.
 * Created {@ DateTime} objects are frozen with `Object.freeze()` in constructor and thus immutable.
 */
var DateTime = /** @class */ (function () {
    /**
     * @constructor
     * @param {NumberOrInteger} year - The year for the new date-time.
     * @param {NumberOrInteger} month - The month for the new date-time.
     * @param {NumberOrInteger} day - The day for the new date-time.
     * @param {NumberOrInteger} hour - The hour for the new date-time.
     * @param {NumberOrInteger} minute - The minute for the new date-time.
     * @param {NumberOrInteger} second - The second for the new date-time.
     * @param {NumberOrInteger} nanosecond - The nanosecond for the new date-time.
     * @param {NumberOrInteger} timeZoneOffsetSeconds - The time zone offset in seconds. Either this argument or `timeZoneId` should be defined.
     * Value represents the difference, in seconds, from UTC to local time.
     * This is different from standard JavaScript `Date.getTimezoneOffset()` which is the difference, in minutes, from local time to UTC.
     * @param {string|null} timeZoneId - The time zone id for the new date-time. Either this argument or `timeZoneOffsetSeconds` should be defined.
     */
    function DateTime(year, month, day, hour, minute, second, nanosecond, timeZoneOffsetSeconds, timeZoneId) {
        /**
         * The year.
         * @type {NumberOrInteger}
         */
        this.year = util.assertValidYear(year);
        /**
         * The month.
         * @type {NumberOrInteger}
         */
        this.month = util.assertValidMonth(month);
        /**
         * The day.
         * @type {NumberOrInteger}
         */
        this.day = util.assertValidDay(day);
        /**
         * The hour.
         * @type {NumberOrInteger}
         */
        this.hour = util.assertValidHour(hour);
        /**
         * The minute.
         * @type {NumberOrInteger}
         */
        this.minute = util.assertValidMinute(minute);
        /**
         * The second.
         * @type {NumberOrInteger}
         */
        this.second = util.assertValidSecond(second);
        /**
         * The nanosecond.
         * @type {NumberOrInteger}
         */
        this.nanosecond = util.assertValidNanosecond(nanosecond);
        var _a = __read(verifyTimeZoneArguments(timeZoneOffsetSeconds, timeZoneId), 2), offset = _a[0], id = _a[1];
        /**
         * The time zone offset in seconds.
         *
         * *Either this or {@link timeZoneId} is defined.*
         *
         * @type {NumberOrInteger}
         */
        this.timeZoneOffsetSeconds = offset;
        /**
         * The time zone id.
         *
         * *Either this or {@link timeZoneOffsetSeconds} is defined.*
         *
         * @type {string}
         */
        this.timeZoneId = id || undefined;
        Object.freeze(this);
    }
    /**
     * Create a {@link DateTime} object from the given standard JavaScript `Date` and optional nanoseconds.
     * @param {global.Date} standardDate - The standard JavaScript date to convert.
     * @param {NumberOrInteger|undefined} nanosecond - The optional amount of nanoseconds.
     * @return {DateTime} New DateTime.
     */
    DateTime.fromStandardDate = function (standardDate, nanosecond) {
        verifyStandardDateAndNanos(standardDate, nanosecond);
        return new DateTime(standardDate.getFullYear(), standardDate.getMonth() + 1, standardDate.getDate(), standardDate.getHours(), standardDate.getMinutes(), standardDate.getSeconds(), integer_1.toNumber(util.totalNanoseconds(standardDate, nanosecond)), util.timeZoneOffsetInSeconds(standardDate), null /* no time zone id */);
    };
    /**
     * @ignore
     */
    DateTime.prototype.toString = function () {
        var localDateTimeStr = localDateTimeToString(this.year, this.month, this.day, this.hour, this.minute, this.second, this.nanosecond);
        var timeZoneStr = this.timeZoneId
            ? "[" + this.timeZoneId + "]"
            : util.timeZoneOffsetToIsoString(this.timeZoneOffsetSeconds || 0);
        return localDateTimeStr + timeZoneStr;
    };
    return DateTime;
}());
exports.DateTime = DateTime;
Object.defineProperty(DateTime.prototype, DATE_TIME_IDENTIFIER_PROPERTY, IDENTIFIER_PROPERTY_ATTRIBUTES);
/**
 * Test if given object is an instance of {@link DateTime} class.
 * @param {Object} obj - The object to test.
 * @return {boolean} `true` if given object is a {@link DateTime}, `false` otherwise.
 */
function isDateTime(obj) {
    return hasIdentifierProperty(obj, DATE_TIME_IDENTIFIER_PROPERTY);
}
exports.isDateTime = isDateTime;
function hasIdentifierProperty(obj, property) {
    return (obj && obj[property]) === true;
}
function localDateTimeToString(year, month, day, hour, minute, second, nanosecond) {
    return (util.dateToIsoString(year, month, day) +
        'T' +
        util.timeToIsoString(hour, minute, second, nanosecond));
}
/**
 * @private
 * @param {NumberOrInteger} timeZoneOffsetSeconds
 * @param {string | null } timeZoneId
 * @returns {Array<NumberOrInteger | undefined | null, string | undefined | null>}
 */
function verifyTimeZoneArguments(timeZoneOffsetSeconds, timeZoneId) {
    var offsetDefined = timeZoneOffsetSeconds || timeZoneOffsetSeconds === 0;
    var idDefined = timeZoneId && timeZoneId !== '';
    if (offsetDefined && !idDefined) {
        util_1.assertNumberOrInteger(timeZoneOffsetSeconds, 'Time zone offset in seconds');
        return [timeZoneOffsetSeconds, undefined];
    }
    else if (!offsetDefined && idDefined) {
        util_1.assertString(timeZoneId, 'Time zone ID');
        return [undefined, timeZoneId];
    }
    else if (offsetDefined && idDefined) {
        throw error_1.newError("Unable to create DateTime with both time zone offset and id. Please specify either of them. Given offset: " + timeZoneOffsetSeconds + " and id: " + timeZoneId);
    }
    else {
        throw error_1.newError("Unable to create DateTime without either time zone offset or id. Please specify either of them. Given offset: " + timeZoneOffsetSeconds + " and id: " + timeZoneId);
    }
}
/**
 * @private
 * @param {StandardDate} standardDate
 * @param {NumberOrInteger} nanosecond
 * @returns {void}
 */
function verifyStandardDateAndNanos(standardDate, nanosecond) {
    util_1.assertValidDate(standardDate, 'Standard date');
    if (nanosecond !== null && nanosecond !== undefined) {
        util_1.assertNumberOrInteger(nanosecond, 'Nanosecond');
    }
}

},{"./error":56,"./integer":59,"./internal/temporal-util":72,"./internal/util":76}],84:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var util_1 = require("./internal/util");
var connection_holder_1 = require("./internal/connection-holder");
var bookmark_1 = require("./internal/bookmark");
var tx_config_1 = require("./internal/tx-config");
var observers_1 = require("./internal/observers");
var error_1 = require("./error");
var result_1 = __importDefault(require("./result"));
/**
 * Represents a transaction in the Neo4j database.
 *
 * @access public
 */
var Transaction = /** @class */ (function () {
    /**
     * @constructor
     * @param {ConnectionHolder} connectionHolder - the connection holder to get connection from.
     * @param {function()} onClose - Function to be called when transaction is committed or rolled back.
     * @param {function(bookmark: Bookmark)} onBookmark callback invoked when new bookmark is produced.
     * * @param {function()} onConnection - Function to be called when a connection is obtained to ensure the conneciton
     * is not yet released.
     * @param {boolean} reactive whether this transaction generates reactive streams
     * @param {number} fetchSize - the record fetch size in each pulling batch.
     */
    function Transaction(_a) {
        var connectionHolder = _a.connectionHolder, onClose = _a.onClose, onBookmark = _a.onBookmark, onConnection = _a.onConnection, reactive = _a.reactive, fetchSize = _a.fetchSize;
        this._connectionHolder = connectionHolder;
        this._reactive = reactive;
        this._state = _states.ACTIVE;
        this._onClose = onClose;
        this._onBookmark = onBookmark;
        this._onConnection = onConnection;
        this._onError = this._onErrorCallback.bind(this);
        this._onComplete = this._onCompleteCallback.bind(this);
        this._fetchSize = fetchSize;
        this._results = [];
    }
    /**
     * @private
     * @param {Bookmark | string |  string []} bookmark
     * @param {TxConfig} txConfig
     * @returns {void}
     */
    Transaction.prototype._begin = function (bookmark, txConfig) {
        var _this = this;
        this._connectionHolder
            .getConnection()
            .then(function (connection) {
            _this._onConnection();
            if (connection) {
                return connection.protocol().beginTransaction({
                    bookmark: bookmark,
                    txConfig: txConfig,
                    mode: _this._connectionHolder.mode(),
                    database: _this._connectionHolder.database(),
                    beforeError: _this._onError,
                    afterComplete: _this._onComplete
                });
            }
            else {
                throw error_1.newError('No connection available');
            }
        })
            .catch(function (error) { return _this._onError(error); });
    };
    /**
     * Run Cypher query
     * Could be called with a query object i.e.: `{text: "MATCH ...", parameters: {param: 1}}`
     * or with the query and parameters as separate arguments.
     * @param {mixed} query - Cypher query to execute
     * @param {Object} parameters - Map with parameters to use in query
     * @return {Result} New Result
     */
    Transaction.prototype.run = function (query, parameters) {
        var _a = util_1.validateQueryAndParameters(query, parameters), validatedQuery = _a.validatedQuery, params = _a.params;
        var result = this._state.run(validatedQuery, params, {
            connectionHolder: this._connectionHolder,
            onError: this._onError,
            onComplete: this._onComplete,
            onConnection: this._onConnection,
            reactive: this._reactive,
            fetchSize: this._fetchSize
        });
        this._results.push(result);
        return result;
    };
    /**
     * Commits the transaction and returns the result.
     *
     * After committing the transaction can no longer be used.
     *
     * @returns {Promise<void>} An empty promise if committed successfully or error if any error happened during commit.
     */
    Transaction.prototype.commit = function () {
        var committed = this._state.commit({
            connectionHolder: this._connectionHolder,
            onError: this._onError,
            onComplete: this._onComplete,
            onConnection: this._onConnection,
            pendingResults: this._results
        });
        this._state = committed.state;
        // clean up
        this._onClose();
        return new Promise(function (resolve, reject) {
            committed.result.subscribe({
                onCompleted: function () { return resolve(); },
                onError: function (error) { return reject(error); }
            });
        });
    };
    /**
     * Rollbacks the transaction.
     *
     * After rolling back, the transaction can no longer be used.
     *
     * @returns {Promise<void>} An empty promise if rolled back successfully or error if any error happened during
     * rollback.
     */
    Transaction.prototype.rollback = function () {
        var rolledback = this._state.rollback({
            connectionHolder: this._connectionHolder,
            onError: this._onError,
            onComplete: this._onComplete,
            onConnection: this._onConnection,
            pendingResults: this._results
        });
        this._state = rolledback.state;
        // clean up
        this._onClose();
        return new Promise(function (resolve, reject) {
            rolledback.result.subscribe({
                onCompleted: function () { return resolve(); },
                onError: function (error) { return reject(error); }
            });
        });
    };
    /**
     * Check if this transaction is active, which means commit and rollback did not happen.
     * @return {boolean} `true` when not committed and not rolled back, `false` otherwise.
     */
    Transaction.prototype.isOpen = function () {
        return this._state === _states.ACTIVE;
    };
    Transaction.prototype._onErrorCallback = function (err) {
        // error will be "acknowledged" by sending a RESET message
        // database will then forget about this transaction and cleanup all corresponding resources
        // it is thus safe to move this transaction to a FAILED state and disallow any further interactions with it
        this._state = _states.FAILED;
        this._onClose();
        // release connection back to the pool
        return this._connectionHolder.releaseConnection();
    };
    /**
     * @private
     * @param {object} meta The meta with bookmark
     * @returns {void}
     */
    Transaction.prototype._onCompleteCallback = function (meta) {
        this._onBookmark(new bookmark_1.Bookmark(meta.bookmark));
    };
    return Transaction;
}());
var _states = {
    // The transaction is running with no explicit success or failure marked
    ACTIVE: {
        commit: function (_a) {
            var connectionHolder = _a.connectionHolder, onError = _a.onError, onComplete = _a.onComplete, onConnection = _a.onConnection, pendingResults = _a.pendingResults;
            return {
                result: finishTransaction(true, connectionHolder, onError, onComplete, onConnection, pendingResults),
                state: _states.SUCCEEDED
            };
        },
        rollback: function (_a) {
            var connectionHolder = _a.connectionHolder, onError = _a.onError, onComplete = _a.onComplete, onConnection = _a.onConnection, pendingResults = _a.pendingResults;
            return {
                result: finishTransaction(false, connectionHolder, onError, onComplete, onConnection, pendingResults),
                state: _states.ROLLED_BACK
            };
        },
        run: function (query, parameters, _a) {
            var connectionHolder = _a.connectionHolder, onError = _a.onError, onComplete = _a.onComplete, onConnection = _a.onConnection, reactive = _a.reactive, fetchSize = _a.fetchSize;
            // RUN in explicit transaction can't contain bookmarks and transaction configuration
            // No need to include mode and database name as it shall be inclued in begin
            var observerPromise = connectionHolder
                .getConnection()
                .then(function (conn) {
                onConnection();
                if (conn) {
                    return conn.protocol().run(query, parameters, {
                        bookmark: bookmark_1.Bookmark.empty(),
                        txConfig: tx_config_1.TxConfig.empty(),
                        beforeError: onError,
                        afterComplete: onComplete,
                        reactive: reactive,
                        fetchSize: fetchSize
                    });
                }
                else {
                    throw error_1.newError('No connection available');
                }
            })
                .catch(function (error) { return new observers_1.FailedObserver({ error: error, onError: onError }); });
            return newCompletedResult(observerPromise, query, parameters, connectionHolder);
        }
    },
    // An error has occurred, transaction can no longer be used and no more messages will
    // be sent for this transaction.
    FAILED: {
        commit: function (_a) {
            var connectionHolder = _a.connectionHolder, onError = _a.onError, onComplete = _a.onComplete;
            return {
                result: newCompletedResult(new observers_1.FailedObserver({
                    error: error_1.newError('Cannot commit this transaction, because it has been rolled back either because of an error or explicit termination.'),
                    onError: onError
                }), 'COMMIT', {}, connectionHolder),
                state: _states.FAILED
            };
        },
        rollback: function (_a) {
            var connectionHolder = _a.connectionHolder, onError = _a.onError, onComplete = _a.onComplete;
            return {
                result: newCompletedResult(new observers_1.CompletedObserver(), 'ROLLBACK', {}, connectionHolder),
                state: _states.FAILED
            };
        },
        run: function (query, parameters, _a) {
            var connectionHolder = _a.connectionHolder, onError = _a.onError, onComplete = _a.onComplete;
            return newCompletedResult(new observers_1.FailedObserver({
                error: error_1.newError('Cannot run query in this transaction, because it has been rolled back either because of an error or explicit termination.'),
                onError: onError
            }), query, parameters, connectionHolder);
        }
    },
    // This transaction has successfully committed
    SUCCEEDED: {
        commit: function (_a) {
            var connectionHolder = _a.connectionHolder, onError = _a.onError, onComplete = _a.onComplete;
            return {
                result: newCompletedResult(new observers_1.FailedObserver({
                    error: error_1.newError('Cannot commit this transaction, because it has already been committed.'),
                    onError: onError
                }), 'COMMIT', {}),
                state: _states.SUCCEEDED,
                connectionHolder: connectionHolder
            };
        },
        rollback: function (_a) {
            var connectionHolder = _a.connectionHolder, onError = _a.onError, onComplete = _a.onComplete;
            return {
                result: newCompletedResult(new observers_1.FailedObserver({
                    error: error_1.newError('Cannot rollback this transaction, because it has already been committed.'),
                    onError: onError
                }), 'ROLLBACK', {}),
                state: _states.SUCCEEDED,
                connectionHolder: connectionHolder
            };
        },
        run: function (query, parameters, _a) {
            var connectionHolder = _a.connectionHolder, onError = _a.onError, onComplete = _a.onComplete;
            return newCompletedResult(new observers_1.FailedObserver({
                error: error_1.newError('Cannot run query in this transaction, because it has already been committed.'),
                onError: onError
            }), query, parameters, connectionHolder);
        }
    },
    // This transaction has been rolled back
    ROLLED_BACK: {
        commit: function (_a) {
            var connectionHolder = _a.connectionHolder, onError = _a.onError, onComplete = _a.onComplete;
            return {
                result: newCompletedResult(new observers_1.FailedObserver({
                    error: error_1.newError('Cannot commit this transaction, because it has already been rolled back.'),
                    onError: onError
                }), 'COMMIT', {}, connectionHolder),
                state: _states.ROLLED_BACK
            };
        },
        rollback: function (_a) {
            var connectionHolder = _a.connectionHolder, onError = _a.onError, onComplete = _a.onComplete;
            return {
                result: newCompletedResult(new observers_1.FailedObserver({
                    error: error_1.newError('Cannot rollback this transaction, because it has already been rolled back.')
                }), 'ROLLBACK', {}, connectionHolder),
                state: _states.ROLLED_BACK
            };
        },
        run: function (query, parameters, _a) {
            var connectionHolder = _a.connectionHolder, onError = _a.onError, onComplete = _a.onComplete;
            return newCompletedResult(new observers_1.FailedObserver({
                error: error_1.newError('Cannot run query in this transaction, because it has already been rolled back.'),
                onError: onError
            }), query, parameters, connectionHolder);
        }
    }
};
/**
 *
 * @param {boolean} commit
 * @param {ConnectionHolder} connectionHolder
 * @param {function(err:Error): any} onError
 * @param {function(metadata:object): any} onComplete
 * @param {function() : any} onConnection
 * @param {list<Result>>}pendingResults all run results in this transaction
 */
function finishTransaction(commit, connectionHolder, onError, onComplete, onConnection, pendingResults) {
    var observerPromise = connectionHolder
        .getConnection()
        .then(function (connection) {
        onConnection();
        pendingResults.forEach(function (r) { return r._cancel(); });
        return Promise.all(pendingResults).then(function (results) {
            if (connection) {
                if (commit) {
                    return connection.protocol().commitTransaction({
                        beforeError: onError,
                        afterComplete: onComplete
                    });
                }
                else {
                    return connection.protocol().rollbackTransaction({
                        beforeError: onError,
                        afterComplete: onComplete
                    });
                }
            }
            else {
                throw error_1.newError('No connection available');
            }
        });
    })
        .catch(function (error) { return new observers_1.FailedObserver({ error: error, onError: onError }); });
    // for commit & rollback we need result that uses real connection holder and notifies it when
    // connection is not needed and can be safely released to the pool
    return new result_1.default(observerPromise, commit ? 'COMMIT' : 'ROLLBACK', {}, connectionHolder);
}
/**
 * Creates a {@link Result} with empty connection holder.
 * For cases when result represents an intermediate or failed action, does not require any metadata and does not
 * need to influence real connection holder to release connections.
 * @param {ResultStreamObserver} observer - an observer for the created result.
 * @param {string} query - the cypher query that produced the result.
 * @param {Object} parameters - the parameters for cypher query that produced the result.
 * @param {ConnectionHolder} connectionHolder - the connection holder used to get the result
 * @return {Result} new result.
 * @private
 */
function newCompletedResult(observerPromise, query, parameters, connectionHolder) {
    if (connectionHolder === void 0) { connectionHolder = connection_holder_1.EMPTY_CONNECTION_HOLDER; }
    return new result_1.default(Promise.resolve(observerPromise), query, parameters, new connection_holder_1.ReadOnlyConnectionHolder(connectionHolder || connection_holder_1.EMPTY_CONNECTION_HOLDER));
}
exports.default = Transaction;

},{"./error":56,"./internal/bookmark":60,"./internal/connection-holder":61,"./internal/observers":66,"./internal/tx-config":74,"./internal/util":76,"./result":80}],85:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });

},{}],86:[function(require,module,exports){
(function (global){(function (){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connection = exports.ConnectionProvider = exports.DateTime = exports.LocalDateTime = exports.Date = exports.Time = exports.LocalTime = exports.Duration = exports.Point = exports.Transaction = exports.Session = exports.ServerInfo = exports.Notification = exports.QueryStatistics = exports.ProfiledPlan = exports.Plan = exports.Integer = exports.Path = exports.PathSegment = exports.UnboundRelationship = exports.Relationship = exports.Node = exports.ResultSummary = exports.Record = exports.Result = exports.Driver = exports.temporal = exports.spatial = exports.error = exports.session = exports.types = exports.logging = exports.auth = exports.Neo4jError = exports.integer = exports.isDateTime = exports.isLocalDateTime = exports.isDate = exports.isTime = exports.isLocalTime = exports.isDuration = exports.isPoint = exports.isInt = exports.int = exports.driver = void 0;
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var version_1 = __importDefault(require("./version"));
var neo4j_driver_core_1 = require("neo4j-driver-core");
Object.defineProperty(exports, "Neo4jError", { enumerable: true, get: function () { return neo4j_driver_core_1.Neo4jError; } });
Object.defineProperty(exports, "error", { enumerable: true, get: function () { return neo4j_driver_core_1.error; } });
Object.defineProperty(exports, "Integer", { enumerable: true, get: function () { return neo4j_driver_core_1.Integer; } });
Object.defineProperty(exports, "int", { enumerable: true, get: function () { return neo4j_driver_core_1.int; } });
Object.defineProperty(exports, "isInt", { enumerable: true, get: function () { return neo4j_driver_core_1.isInt; } });
Object.defineProperty(exports, "isPoint", { enumerable: true, get: function () { return neo4j_driver_core_1.isPoint; } });
Object.defineProperty(exports, "Point", { enumerable: true, get: function () { return neo4j_driver_core_1.Point; } });
Object.defineProperty(exports, "Date", { enumerable: true, get: function () { return neo4j_driver_core_1.Date; } });
Object.defineProperty(exports, "DateTime", { enumerable: true, get: function () { return neo4j_driver_core_1.DateTime; } });
Object.defineProperty(exports, "Duration", { enumerable: true, get: function () { return neo4j_driver_core_1.Duration; } });
Object.defineProperty(exports, "isDate", { enumerable: true, get: function () { return neo4j_driver_core_1.isDate; } });
Object.defineProperty(exports, "isDateTime", { enumerable: true, get: function () { return neo4j_driver_core_1.isDateTime; } });
Object.defineProperty(exports, "isDuration", { enumerable: true, get: function () { return neo4j_driver_core_1.isDuration; } });
Object.defineProperty(exports, "isLocalDateTime", { enumerable: true, get: function () { return neo4j_driver_core_1.isLocalDateTime; } });
Object.defineProperty(exports, "isLocalTime", { enumerable: true, get: function () { return neo4j_driver_core_1.isLocalTime; } });
Object.defineProperty(exports, "isTime", { enumerable: true, get: function () { return neo4j_driver_core_1.isTime; } });
Object.defineProperty(exports, "LocalDateTime", { enumerable: true, get: function () { return neo4j_driver_core_1.LocalDateTime; } });
Object.defineProperty(exports, "LocalTime", { enumerable: true, get: function () { return neo4j_driver_core_1.LocalTime; } });
Object.defineProperty(exports, "Time", { enumerable: true, get: function () { return neo4j_driver_core_1.Time; } });
Object.defineProperty(exports, "Node", { enumerable: true, get: function () { return neo4j_driver_core_1.Node; } });
Object.defineProperty(exports, "Path", { enumerable: true, get: function () { return neo4j_driver_core_1.Path; } });
Object.defineProperty(exports, "PathSegment", { enumerable: true, get: function () { return neo4j_driver_core_1.PathSegment; } });
Object.defineProperty(exports, "Relationship", { enumerable: true, get: function () { return neo4j_driver_core_1.Relationship; } });
Object.defineProperty(exports, "UnboundRelationship", { enumerable: true, get: function () { return neo4j_driver_core_1.UnboundRelationship; } });
Object.defineProperty(exports, "Record", { enumerable: true, get: function () { return neo4j_driver_core_1.Record; } });
Object.defineProperty(exports, "ResultSummary", { enumerable: true, get: function () { return neo4j_driver_core_1.ResultSummary; } });
Object.defineProperty(exports, "Result", { enumerable: true, get: function () { return neo4j_driver_core_1.Result; } });
Object.defineProperty(exports, "ConnectionProvider", { enumerable: true, get: function () { return neo4j_driver_core_1.ConnectionProvider; } });
Object.defineProperty(exports, "Driver", { enumerable: true, get: function () { return neo4j_driver_core_1.Driver; } });
Object.defineProperty(exports, "Plan", { enumerable: true, get: function () { return neo4j_driver_core_1.Plan; } });
Object.defineProperty(exports, "ProfiledPlan", { enumerable: true, get: function () { return neo4j_driver_core_1.ProfiledPlan; } });
Object.defineProperty(exports, "QueryStatistics", { enumerable: true, get: function () { return neo4j_driver_core_1.QueryStatistics; } });
Object.defineProperty(exports, "Notification", { enumerable: true, get: function () { return neo4j_driver_core_1.Notification; } });
Object.defineProperty(exports, "Session", { enumerable: true, get: function () { return neo4j_driver_core_1.Session; } });
Object.defineProperty(exports, "Transaction", { enumerable: true, get: function () { return neo4j_driver_core_1.Transaction; } });
Object.defineProperty(exports, "ServerInfo", { enumerable: true, get: function () { return neo4j_driver_core_1.ServerInfo; } });
Object.defineProperty(exports, "Connection", { enumerable: true, get: function () { return neo4j_driver_core_1.Connection; } });
var neo4j_driver_bolt_connection_1 = require("neo4j-driver-bolt-connection");
var READ = neo4j_driver_core_1.driver.READ, WRITE = neo4j_driver_core_1.driver.WRITE;
var _a = neo4j_driver_core_1.internal.util, ENCRYPTION_ON = _a.ENCRYPTION_ON, ENCRYPTION_OFF = _a.ENCRYPTION_OFF, assertString = _a.assertString, isEmptyObjectOrNull = _a.isEmptyObjectOrNull, ServerAddress = neo4j_driver_core_1.internal.serverAddress.ServerAddress, urlUtil = neo4j_driver_core_1.internal.urlUtil;
/**
 * Construct a new Neo4j Driver. This is your main entry point for this
 * library.
 *
 * ## Configuration
 *
 * This function optionally takes a configuration argument. Available configuration
 * options are as follows:
 *
 *     {
 *       // Encryption level: ENCRYPTION_ON or ENCRYPTION_OFF.
 *       encrypted: ENCRYPTION_ON|ENCRYPTION_OFF
 *
 *       // Trust strategy to use if encryption is enabled. There is no mode to disable
 *       // trust other than disabling encryption altogether. The reason for
 *       // this is that if you don't know who you are talking to, it is easy for an
 *       // attacker to hijack your encrypted connection, rendering encryption pointless.
 *       //
 *       // TRUST_SYSTEM_CA_SIGNED_CERTIFICATES is the default choice. For NodeJS environments, this
 *       // means that you trust whatever certificates are in the default trusted certificate
 *       // store of the underlying system. For Browser environments, the trusted certificate
 *       // store is usually managed by the browser. Refer to your system or browser documentation
 *       // if you want to explicitly add a certificate as trusted.
 *       //
 *       // TRUST_CUSTOM_CA_SIGNED_CERTIFICATES is another option for trust verification -
 *       // whenever we establish an encrypted connection, we ensure the host is using
 *       // an encryption certificate that is in, or is signed by, a certificate given
 *       // as trusted through configuration. This option is only available for NodeJS environments.
 *       //
 *       // TRUST_ALL_CERTIFICATES means that you trust everything without any verifications
 *       // steps carried out.  This option is only available for NodeJS environments and should not
 *       // be used on production systems.
 *       trust: "TRUST_SYSTEM_CA_SIGNED_CERTIFICATES" | "TRUST_CUSTOM_CA_SIGNED_CERTIFICATES" |
 *       "TRUST_ALL_CERTIFICATES",
 *
 *       // List of one or more paths to trusted encryption certificates. This only
 *       // works in the NodeJS bundle, and only matters if you use "TRUST_CUSTOM_CA_SIGNED_CERTIFICATES".
 *       // The certificate files should be in regular X.509 PEM format.
 *       // For instance, ['./trusted.pem']
 *       trustedCertificates: [],
 *
 *       // The maximum total number of connections allowed to be managed by the connection pool, per host.
 *       // This includes both in-use and idle connections. No maximum connection pool size is imposed
 *       // by default.
 *       maxConnectionPoolSize: 100,
 *
 *       // The maximum allowed lifetime for a pooled connection in milliseconds. Pooled connections older than this
 *       // threshold will be closed and removed from the pool. Such discarding happens during connection acquisition
 *       // so that new session is never backed by an old connection. Setting this option to a low value will cause
 *       // a high connection churn and might result in a performance hit. It is recommended to set maximum lifetime
 *       // to a slightly smaller value than the one configured in network equipment (load balancer, proxy, firewall,
 *       // etc. can also limit maximum connection lifetime). No maximum lifetime limit is imposed by default. Zero
 *       // and negative values result in lifetime not being checked.
 *       maxConnectionLifetime: 60 * 60 * 1000, // 1 hour
 *
 *       // The maximum amount of time to wait to acquire a connection from the pool (to either create a new
 *       // connection or borrow an existing one.
 *       connectionAcquisitionTimeout: 60000, // 1 minute
 *
 *       // Specify the maximum time in milliseconds transactions are allowed to retry via
 *       // `Session#readTransaction()` and `Session#writeTransaction()` functions.
 *       // These functions will retry the given unit of work on `ServiceUnavailable`, `SessionExpired` and transient
 *       // errors with exponential backoff using initial delay of 1 second.
 *       // Default value is 30000 which is 30 seconds.
 *       maxTransactionRetryTime: 30000, // 30 seconds
 *
 *       // Specify socket connection timeout in milliseconds. Numeric values are expected. Negative and zero values
 *       // result in no timeout being applied. Connection establishment will be then bound by the timeout configured
 *       // on the operating system level. Default value is 30000, which is 30 seconds.
 *       connectionTimeout: 30000, // 30 seconds
 *
 *       // Make this driver always return native JavaScript numbers for integer values, instead of the
 *       // dedicated {@link Integer} class. Values that do not fit in native number bit range will be represented as
 *       // `Number.NEGATIVE_INFINITY` or `Number.POSITIVE_INFINITY`.
 *       // **Warning:** ResultSummary It is not always safe to enable this setting when JavaScript applications are not the only ones
 *       // interacting with the database. Stored numbers might in such case be not representable by native
 *       // {@link Number} type and thus driver will return lossy values. This might also happen when data was
 *       // initially imported using neo4j import tool and contained numbers larger than
 *       // `Number.MAX_SAFE_INTEGER`. Driver will then return positive infinity, which is lossy.
 *       // Default value for this option is `false` because native JavaScript numbers might result
 *       // in loss of precision in the general case.
 *       disableLosslessIntegers: false,
 *
 *       // Make this driver always return native Javascript {@link BigInt} for integer values, instead of the dedicated {@link Integer} class or {@link Number}.
 *       //
 *       // Default value for this option is `false` for backwards compatibility.
 *       //
 *       // **Warning:** `BigInt` doesn't implement the method `toJSON`. In maner of serialize it as `json`, It's needed to add a custom implementation of the `toJSON` on the
 *       // `BigInt.prototype` {@see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json}
 *       useBigInt: false,
 *
 *       // Specify the logging configuration for the driver. Object should have two properties `level` and `logger`.
 *       //
 *       // Property `level` represents the logging level which should be one of: 'error', 'warn', 'info' or 'debug'. This property is optional and
 *       // its default value is 'info'. Levels have priorities: 'error': 0, 'warn': 1, 'info': 2, 'debug': 3. Enabling a certain level also enables all
 *       // levels with lower priority. For example: 'error', 'warn' and 'info' will be logged when 'info' level is configured.
 *       //
 *       // Property `logger` represents the logging function which will be invoked for every log call with an acceptable level. The function should
 *       // take two string arguments `level` and `message`. The function should not execute any blocking or long-running operations
 *       // because it is often executed on a hot path.
 *       //
 *       // No logging is done by default. See `neo4j.logging` object that contains predefined logging implementations.
 *       logging: {
 *         level: 'info',
 *         logger: (level, message) => console.log(level + ' ' + message)
 *       },
 *
 *       // Specify a custom server address resolver function used by the routing driver to resolve the initial address used to create the driver.
 *       // Such resolution happens:
 *       //  * during the very first rediscovery when driver is created
 *       //  * when all the known routers from the current routing table have failed and driver needs to fallback to the initial address
 *       //
 *       // In NodeJS environment driver defaults to performing a DNS resolution of the initial address using 'dns' module.
 *       // In browser environment driver uses the initial address as-is.
 *       // Value should be a function that takes a single string argument - the initial address. It should return an array of new addresses.
 *       // Address is a string of shape '<host>:<port>'. Provided function can return either a Promise resolved with an array of addresses
 *       // or array of addresses directly.
 *       resolver: function(address) {
 *         return ['127.0.0.1:8888', 'fallback.db.com:7687'];
 *       },
 *
 *      // Optionally override the default user agent name.
 *       userAgent: USER_AGENT
 *     }
 *
 * @param {string} url The URL for the Neo4j database, for instance "neo4j://localhost" and/or "bolt://localhost"
 * @param {Map<string,string>} authToken Authentication credentials. See {@link auth} for helpers.
 * @param {Object} config Configuration object. See the configuration section above for details.
 * @returns {Driver}
 */
function driver(url, authToken, config) {
    if (config === void 0) { config = {}; }
    assertString(url, 'Bolt URL');
    var parsedUrl = urlUtil.parseDatabaseUrl(url);
    // Determine entryption/trust options from the URL.
    var routing = false;
    var encrypted = false;
    var trust;
    switch (parsedUrl.scheme) {
        case 'bolt':
            break;
        case 'bolt+s':
            encrypted = true;
            trust = 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES';
            break;
        case 'bolt+ssc':
            encrypted = true;
            trust = 'TRUST_ALL_CERTIFICATES';
            break;
        case 'neo4j':
            routing = true;
            break;
        case 'neo4j+s':
            encrypted = true;
            trust = 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES';
            routing = true;
            break;
        case 'neo4j+ssc':
            encrypted = true;
            trust = 'TRUST_ALL_CERTIFICATES';
            routing = true;
            break;
        default:
            throw new Error("Unknown scheme: " + parsedUrl.scheme);
    }
    // Encryption enabled on URL, propagate trust to the config.
    if (encrypted) {
        // Check for configuration conflict between URL and config.
        if ('encrypted' in config || 'trust' in config) {
            throw new Error('Encryption/trust can only be configured either through URL or config, not both');
        }
        config.encrypted = ENCRYPTION_ON;
        config.trust = trust;
    }
    // Sanitize authority token. Nicer error from server when a scheme is set.
    authToken = authToken || {};
    authToken.scheme = authToken.scheme || 'none';
    // Use default user agent or user agent specified by user.
    config.userAgent = config.userAgent || USER_AGENT;
    var address = ServerAddress.fromUrl(parsedUrl.hostAndPort);
    var meta = {
        address: address,
        typename: routing ? 'Routing' : 'Direct',
        routing: routing
    };
    return new neo4j_driver_core_1.Driver(meta, config, createConnectionProviderFunction());
    function createConnectionProviderFunction() {
        if (routing) {
            return function (id, config, log, hostNameResolver) {
                return new neo4j_driver_bolt_connection_1.RoutingConnectionProvider({
                    id: id,
                    config: config,
                    log: log,
                    hostNameResolver: hostNameResolver,
                    authToken: authToken,
                    address: address,
                    userAgent: config.userAgent,
                    routingContext: parsedUrl.query
                });
            };
        }
        else {
            if (!isEmptyObjectOrNull(parsedUrl.query)) {
                throw new Error("Parameters are not supported with none routed scheme. Given URL: '" + url + "'");
            }
            return function (id, config, log) {
                return new neo4j_driver_bolt_connection_1.DirectConnectionProvider({
                    id: id,
                    config: config,
                    log: log,
                    authToken: authToken,
                    address: address,
                    userAgent: config.userAgent
                });
            };
        }
    }
}
exports.driver = driver;
/**
 * @property {function(username: string, password: string, realm: ?string)} basic the function to create a
 * basic authentication token.
 * @property {function(base64EncodedTicket: string)} kerberos the function to create a Kerberos authentication token.
 * Accepts a single string argument - base64 encoded Kerberos ticket.
 * @property {function(principal: string, credentials: string, realm: string, scheme: string, parameters: ?object)} custom
 * the function to create a custom authentication token.
 */
var auth = {
    basic: function (username, password, realm) {
        if (realm) {
            return {
                scheme: 'basic',
                principal: username,
                credentials: password,
                realm: realm
            };
        }
        else {
            return { scheme: 'basic', principal: username, credentials: password };
        }
    },
    kerberos: function (base64EncodedTicket) {
        return {
            scheme: 'kerberos',
            principal: '',
            credentials: base64EncodedTicket
        };
    },
    custom: function (principal, credentials, realm, scheme, parameters) {
        if (parameters) {
            return {
                scheme: scheme,
                principal: principal,
                credentials: credentials,
                realm: realm,
                parameters: parameters
            };
        }
        else {
            return {
                scheme: scheme,
                principal: principal,
                credentials: credentials,
                realm: realm
            };
        }
    }
};
exports.auth = auth;
var USER_AGENT = 'neo4j-javascript/' + version_1.default;
/**
 * Object containing predefined logging configurations. These are expected to be used as values of the driver config's `logging` property.
 * @property {function(level: ?string): object} console the function to create a logging config that prints all messages to `console.log` with
 * timestamp, level and message. It takes an optional `level` parameter which represents the maximum log level to be logged. Default value is 'info'.
 */
var logging = {
    console: function (level) {
        return {
            level: level,
            logger: function (level, message) {
                return console.log(global.Date.now() + " " + level.toUpperCase() + " " + message);
            }
        };
    }
};
exports.logging = logging;
/**
 * Object containing constructors for all neo4j types.
 */
var types = {
    Node: neo4j_driver_core_1.Node,
    Relationship: neo4j_driver_core_1.Relationship,
    UnboundRelationship: neo4j_driver_core_1.UnboundRelationship,
    PathSegment: neo4j_driver_core_1.PathSegment,
    Path: neo4j_driver_core_1.Path,
    Result: neo4j_driver_core_1.Result,
    ResultSummary: neo4j_driver_core_1.ResultSummary,
    Record: neo4j_driver_core_1.Record,
    Point: neo4j_driver_core_1.Point,
    Date: neo4j_driver_core_1.Date,
    DateTime: neo4j_driver_core_1.DateTime,
    Duration: neo4j_driver_core_1.Duration,
    LocalDateTime: neo4j_driver_core_1.LocalDateTime,
    LocalTime: neo4j_driver_core_1.LocalTime,
    Time: neo4j_driver_core_1.Time,
    Integer: neo4j_driver_core_1.Integer
};
exports.types = types;
/**
 * Object containing string constants representing session access modes.
 */
var session = {
    READ: READ,
    WRITE: WRITE
};
exports.session = session;
/**
 * Object containing functions to work with {@link Integer} objects.
 */
var integer = {
    toNumber: neo4j_driver_core_1.toNumber,
    toString: neo4j_driver_core_1.toString,
    inSafeRange: neo4j_driver_core_1.inSafeRange
};
exports.integer = integer;
/**
 * Object containing functions to work with spatial types, like {@link Point}.
 */
var spatial = {
    isPoint: neo4j_driver_core_1.isPoint
};
exports.spatial = spatial;
/**
 * Object containing functions to work with temporal types, like {@link Time} or {@link Duration}.
 */
var temporal = {
    isDuration: neo4j_driver_core_1.isDuration,
    isLocalTime: neo4j_driver_core_1.isLocalTime,
    isTime: neo4j_driver_core_1.isTime,
    isDate: neo4j_driver_core_1.isDate,
    isLocalDateTime: neo4j_driver_core_1.isLocalDateTime,
    isDateTime: neo4j_driver_core_1.isDateTime
};
exports.temporal = temporal;
/**
 * @private
 */
var forExport = {
    driver: driver,
    int: neo4j_driver_core_1.int,
    isInt: neo4j_driver_core_1.isInt,
    isPoint: neo4j_driver_core_1.isPoint,
    isDuration: neo4j_driver_core_1.isDuration,
    isLocalTime: neo4j_driver_core_1.isLocalTime,
    isTime: neo4j_driver_core_1.isTime,
    isDate: neo4j_driver_core_1.isDate,
    isLocalDateTime: neo4j_driver_core_1.isLocalDateTime,
    isDateTime: neo4j_driver_core_1.isDateTime,
    integer: integer,
    Neo4jError: neo4j_driver_core_1.Neo4jError,
    auth: auth,
    logging: logging,
    types: types,
    session: session,
    error: neo4j_driver_core_1.error,
    spatial: spatial,
    temporal: temporal,
    Driver: neo4j_driver_core_1.Driver,
    Result: neo4j_driver_core_1.Result,
    Record: neo4j_driver_core_1.Record,
    ResultSummary: neo4j_driver_core_1.ResultSummary,
    Node: neo4j_driver_core_1.Node,
    Relationship: neo4j_driver_core_1.Relationship,
    UnboundRelationship: neo4j_driver_core_1.UnboundRelationship,
    PathSegment: neo4j_driver_core_1.PathSegment,
    Path: neo4j_driver_core_1.Path,
    Integer: neo4j_driver_core_1.Integer,
    Plan: neo4j_driver_core_1.Plan,
    ProfiledPlan: neo4j_driver_core_1.ProfiledPlan,
    QueryStatistics: neo4j_driver_core_1.QueryStatistics,
    Notification: neo4j_driver_core_1.Notification,
    ServerInfo: neo4j_driver_core_1.ServerInfo,
    Session: neo4j_driver_core_1.Session,
    Transaction: neo4j_driver_core_1.Transaction,
    Point: neo4j_driver_core_1.Point,
    Duration: neo4j_driver_core_1.Duration,
    LocalTime: neo4j_driver_core_1.LocalTime,
    Time: neo4j_driver_core_1.Time,
    Date: neo4j_driver_core_1.Date,
    LocalDateTime: neo4j_driver_core_1.LocalDateTime,
    DateTime: neo4j_driver_core_1.DateTime,
    ConnectionProvider: neo4j_driver_core_1.ConnectionProvider,
    Connection: neo4j_driver_core_1.Connection
};
exports.default = forExport;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./version":87,"neo4j-driver-bolt-connection":37,"neo4j-driver-core":58}],87:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// DO NOT CHANGE THE VERSION BELOW HERE
// This is set by the build system at release time, using
//
// gulp set --x <releaseversion>
//
// This is set up this way to keep the version in the code in
// sync with the npm package version, and to allow the build
// system to control version names at packaging time.
exports.default = '4.3.2';

},{}]},{},[86])(86)
});
