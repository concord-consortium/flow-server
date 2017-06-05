/**

Manylabs Web Bluetooth (BLE) functionality.

ManylabsBle class encapsulates client access to Manylabs HTTP proxy service and
is based on some code from googlechrome and webbluetoothcg examples:

  https://googlechrome.github.io/samples/web-bluetooth/index.html
and 
  https://webbluetoothcg.github.io/demos
  https://webbluetoothcg.github.io/demos/heart-rate-sensor/

*/

(function() {
  'use strict';

  // used for decoding in helper functions
  let encoder = new TextEncoder('utf-8'); 
  let decoder = new TextDecoder('utf-8'); 

  // Currently, bluez v5.44 doesn't understand the "standard name" http_proxy.
  // therefore we need to use http_proxy UUID in calls to requestDevice and
  // getPrimaryService. This may change in future version of bluez. 
  var http_proxy_service_name = 'http_proxy';

  // heart rate service: 180d
  // 0000180d-0000-1000-8000-00805f9b34fb
  //
  var HPS_SERVICE_UUID = '00001823-0000-1000-8000-00805f9b34fb';

  //const CANDLE_DEVICE_NAME_UUID = 0xFFFF;
  var URI_CHRC = '00002ab6-0000-1000-8000-00805f9b34fb';
  var BODY_CHRC = '00002ab8-0000-1000-8000-00805f9b34fb';
  var CONTROL_POINT_CHRC = '00002ab9-0000-1000-8000-00805f9b34fb';
  var HTTP_STATUS_CHRC = '00002aba-0000-1000-8000-00805f9b34fb';

    /*
    // map from Python code from hpservice.py:

CONTROL_POINT_MAP = {
    1: ("GET",     "http"),
    2: ("HEAD",    "http"),
    3: ("POST",    "http"),
    4: ("PUT",     "http"),
    5: ("DELETE",  "https"),
    6: ("GET",     "https"),
    7: ("HEAD",    "https"),
    8: ("POST",    "https"),
    9: ("PUT",     "https"),
    10: ("DELETE", "https"),
}    
    */

  // similar code in Javascript
  const CONTROL_POINT_MAP = {
    1: ["GET",     "http"],
    2: ["HEAD",    "http"],
    3: ["POST",    "http"],
    4: ["PUT",     "http"],
    5: ["DELETE",  "https"],
    6: ["GET",     "https"],
    7: ["HEAD",    "https"],
    8: ["POST",    "https"],
    9: ["PUT",     "https"],
   10: ["DELETE",  "https"]
  };

  // reverse map that will be built from CONTROL_POINT_MAP
  var CONTROL_POINT_REVERSE_MAP = {};

  function init_maps() {
    // buil reverse map
    for (var code in CONTROL_POINT_MAP) {
      var entry = CONTROL_POINT_MAP[code]
      CONTROL_POINT_REVERSE_MAP[entry] = code
    }
  }

  var service_name = HPS_SERVICE_UUID;

  // we'll be using only one uri to request websocket data
  //  which will notify about new response periodically and continuously 
  //  after the first request.
  var uri = "wss://localhost/api/v1/websocket"

  // set to false to minimize console.log printing
  var verbose = true;


  //var service_name = 'http_proxy';
  //   optionalServices: ['ba42561b-b1d2-440a-8d04-0cefb43faece']
  function log(text) {
    if (verbose) {
      console.log(text);
    }
  }


  init_maps();

  /**
   * Sample usage:
   control_point_code("GET", "http")
   control_point_code("POST", "https")
  */
  function control_point_code(method, schema) {
    return CONTROL_POINT_REVERSE_MAP[[method, schema]]
  }

  /**
   * 
  */
  class ManylabsBle {


    constructor() {

      // HTTP_STATUS_CHRC parsing bits
      this.STATUS_BIT_HEADERS_RECEIVED = 1;
      this.STATUS_BIT_HEADERS_TRUNCATED = 2;
      this.STATUS_BIT_BODY_RECEIVED = 4;
      this.STATUS_BIT_BODY_TRUNCATED = 8;


      this.device = null;
      this.server = null;

      // holds map for cached characteristics
      this._characteristics = new Map();
    }

    connect() {

      //console.log("deb1");
      return navigator.bluetooth.requestDevice({filters:[{services:[ HPS_SERVICE_UUID ]}]})
      .then(device => {
        //log("deb2")
        this.device = device;
        //this.device.addEventListener('gattserverdisconnected', () => {
        //    log('Device disconnected');
        //    // connect();
        //});

        return device.gatt.connect();
      })
      .then(server => {
        log("Calling getPrimaryService...")
        this.server = server;
        return Promise.all([
          server.getPrimaryService(service_name).then(service => {
            return Promise.all([
              this._cacheCharacteristic(service, URI_CHRC),
              this._cacheCharacteristic(service, BODY_CHRC),
              this._cacheCharacteristic(service, CONTROL_POINT_CHRC),
              this._cacheCharacteristic(service, HTTP_STATUS_CHRC),
            ])
          })
        ]);
      })
    }


    /**
     Performs GET request.
     - writes to uri property
     - writes to status control point property to trigger response
    */
    requestGet() {
      console.log("requestGet")
      let data = this._encodeString(uri);
      this._writeCharacteristicValue(URI_CHRC, data)
      var method_code = control_point_code("GET", "http")
      return this._writeCharacteristicValue(CONTROL_POINT_CHRC, new Uint8Array([method_code]))
    }

    /* Manylabs BLE Service high level access function */

    getHttpBody() {
      return this._readCharacteristicValue(BODY_CHRC)
      .then(value => {
        var value = value.buffer ? value : new DataView(value);
        var decoded = decoder.decode(value)
        //console.log("getHttpBody.value decoded: " + value);
        return decoded;
     });
    }

    startNotificationsHttpStatus() {
      console.log("startNotificationsHttpStatus")
      return this._startNotifications(HTTP_STATUS_CHRC);
    }
    stopNotificationsHttpStatus() {
      console.log("stopNotificationsHttpStatus")
      return this._stopNotifications(HTTP_STATUS_CHRC);
    }

    /* Web Bluetooth Access Helper Functions and encoding/decoding functions */

    _encodeString(data) {
      return encoder.encode(data);
    }

    _cacheCharacteristic(service, characteristicUuid) {
      return service.getCharacteristic(characteristicUuid)
      .then(characteristic => {
        this._characteristics.set(characteristicUuid, characteristic);
      });
    }
    _readCharacteristicValue(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      return characteristic.readValue()
      .then(value => {
        // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
        value = value.buffer ? value : new DataView(value);
        return value;
      });
    }
    _writeCharacteristicValue(characteristicUuid, value) {
      let characteristic = this._characteristics.get(characteristicUuid);
      return characteristic.writeValue(value);
    }
    _startNotifications(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      // Returns characteristic to set up characteristicvaluechanged event
      // handlers in the resolved promise.
      console.log("_startNotifications: " + characteristicUuid + ":" + JSON.stringify(characteristic))
      return characteristic.startNotifications()
      .then(() => characteristic);
    }
    _stopNotifications(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      // Returns characteristic to remove characteristicvaluechanged event
      // handlers in the resolved promise.
      return characteristic.stopNotifications()
      .then(() => characteristic);
    }
  }

  window.manylabsBle = new ManylabsBle();

})();
