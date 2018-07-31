//var statusText = document.querySelector('#statusText');
var responseText = document.querySelector('#bleResponseText');
//var button = document.querySelector('#selectButton');

function bleStartConnect_delete() {
  //statusText.textContent = 'Waiting for notifications...';

  manylabsBle.connect()
  .then(() => manylabsBle.startNotificationsHttpStatus().then(handleHttpStatus))
  .then(() => manylabsBle.requestGet())
  .catch(error => {
    console.log("apps.js: manylabsBle.connect error")
    //statusText.textContent = error;
  });
}

function clear() {
  responseText.textContent = "";
}

function formatTime(dt) {
  var ts = dt.format("dd/MM/yyyy HH:mm:ss fff");
  return ts;
}


function bleStartConnect() {

  manylabsBle.connect()
  .then( () =>  {
    //statusText.textContent = 'Waiting for notifications...';
  })
  .then(() => manylabsBle.startNotificationsHttpStatus().then(handleHttpStatus))
  .then(() => manylabsBle.requestGet())
  .catch(error => {
    console.log("apps.js: manylabsBle.connect error: " + error)
    //statusText.textContent = error;
  });
}


function handleHttpStatus(httpStatus) {
  console.log("handleHttpStatus")
  httpStatus.addEventListener('characteristicvaluechanged', event => {
    console.log("handleHttpStatus.event characteristicvaluechanged")
    //console.log("event.target.value=" + event.target.value);
    var value = event.target.value;
    // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
    value = value.buffer ? value : new DataView(value);
    let http_status = value.getUint8(0);
    options = { hour12: false }
    var ts = new Date();
    var dt_prefix = ts.toLocaleTimeString('en-US', options) + ": ";
    //statusText.innerHTML = dt_prefix + "<br/>HTTP Status=" + http_status;
    if (http_status == manylabsBle.STATUS_BIT_BODY_RECEIVED) {
      // retrieve http body
      console.log("handleHttpStatus.event: Retrieving body...");
      manylabsBle.getHttpBody().then(body => {
        console.log("getHttpBody.body: " + body);
        var message = JSON.parse(body);
        var type = message['type'];

        //var type = "update_diagram"
        var func = g_blewsh.handlers[type];
        if (func) {
            console.log("message['parameters']:" + JSON.stringify(message['parameters']))
            func(moment(message['timestamp']), message['parameters']);
        }
        for (var i = 0; i < g_blewsh.genericHandlers.length; i++) {
            var func = g_blewsh.genericHandlers[i];
            func(moment(message['timestamp']), type, message['parameters']);
        }

        //responseText.innerHTML += "<br/>";
        //responseText.innerHTML += ts.toLocaleTimeString('en-US', options) + "." + (ts.getTime() % 999) + ": " + body;
        //responseText.innerHTML += dt_prefix + body;
     });

    } else {
      console.log("handleHttpStatus.event: Body not received: http_status=" + http_status);
    }
  });
}



