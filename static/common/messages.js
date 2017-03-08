// This code manages a websocket connection for passing messages to/from the server.
// It maintains a list of message subscriptions and a set of message handlers.
// It manages pinging the server and reconnecting when disconnected.


// global instance of WebSocketHolder; creating the holder does not connect; use connectWebSocket when ready to connect
var g_wsh = createWebSocketHolder();



// ======== public API functions ========


// open a websocket connection to the server;
// afterOpen (optional) will called after the websocket is opened (will be re-called if reconnect);
// does not reconnect if already connected
function connectWebSocket(afterOpen) {
	g_wsh.afterOpen = afterOpen;
	if (g_wsh.connectStarted) // fix(later): move inside connect? need to be sure that reconnects still work
		return;
	g_wsh.connect();
}


// subscript to messages from a folder;
// if includeSelf is specified, messages sent from self will be reflected back
// fix(clean): move contents of this function into webSocketHolder (so this is just a simple wrapper)?
function subscribeToFolder(folderPath, includeSelf) {
	console.log('subscribe: ' + folderPath);
	for (var i = 0; i < g_wsh.subscriptions.length; i++) {
		if (g_wsh.subscriptions[i].folder == folderPath)
			return;
	}
	var subscription = {'folder': folderPath};
	if (includeSelf)
		subscription['include_self'] = 1;
	g_wsh.subscriptions.push(subscription);
	if (g_wsh.targetFolderPath === null) {
		g_wsh.targetFolderPath = folderPath;  // fix(soon): require explicitly setting this on connect or using setTargetFolder?
	}
}


// add a handler for a particular type of message;
// when a message of this type is received the server, the function will be called;
// the function will be passed three arguments: timestamp, message type, and message parameters (dictionary)
function addMessageHandler(type, func) {
	g_wsh.addHandler(type, func);
}


// top-level function for sending messages;
// defaults to using g_wsh.targetFolderPath as the target/recipient folder
function sendMessage(messageType, params, targetFolderPath) {
	if (!params)
		params = {};
	g_wsh.sendMessage(messageType, params, targetFolderPath);
}


// set the default destination for messages
// fix(clean): make this part of connect?
function setTargetFolder(targetFolderPath) {
	g_wsh.targetFolderPath = targetFolderPath;
}


// ======== a class for managing a websocket connection with message handlers/subscriptions/etc. ========


// create a websocket object with a few additional/custom methods
function createWebSocketHolder() {

	// prepare the object
	var wsh = {};
	wsh.webSocket = null;
	wsh.connected = false;
	wsh.connectStarted = false;
	wsh.handlers = {};
	wsh.genericHandlers = [];
	wsh.subscriptions = [];
	wsh.errorModal = null;
	wsh.pingStarted = false;
	wsh.targetFolderPath = null;  // default target for messages
	wsh.afterOpen = null;  // called after the websocket is opened (will be re-called if reconnect)

	// connect to the server; this creates a websocket object
	wsh.connect = function() {
		wsh.connectStarted = true; // fix(soon): could have race condition
		console.log('connecting');

		// compute url
		var protocol = 'ws://';
		if (window.location.protocol.slice(0, 5) == 'https')
			protocol = 'wss://';
		var url = protocol + window.location.host + '/api/v1/websocket';

		// open the connection
		if ('WebSocket' in window) {
			this.webSocket = new WebSocket(url);
		} else {
			alert('This app requires a browser with WebSocket support.');
		}

		// handle message from websocket
		this.webSocket.onmessage = function(evt) {
			var message = JSON.parse(evt.data);
			var type = message['type'];
			if (type == 'error') {
				if (message.parameters.message == 'invalid session') {
					console.log('invalid session');
					window.location.reload();
				}
			}
			var func = wsh.handlers[type];
			if (func) {
				func(moment(message['timestamp']), message['parameters']);
			}
			for (var i = 0; i < wsh.genericHandlers.length; i++) {
				var func = wsh.genericHandlers[i];
				func(moment(message['timestamp']), type, message['parameters']);
			}
		};

		// run this code after connection is opened
		this.webSocket.onopen = function() {
			wsh.connected = true;

			// send a connect message (can be used to provide client version info)
			// fix(later): remove this if we're not sending any info?
			wsh.sendMessage('connect');

			// send list of folders for which we want messages
			console.log('subscriptions: ' + g_wsh.subscriptions.length);
			wsh.sendMessage('subscribe', {'subscriptions': g_wsh.subscriptions});

			// call user-provided function (if any) to run after websocket is open
			if (wsh.afterOpen)
				wsh.afterOpen();

			// hide reconnect modal if any
			setTimeout(function() {
				if (wsh.errorModal && wsh.connected) {
					console.log('hide');
					$('#wsError').modal('hide');
					$('#wsError').remove();
					$('body').removeClass('modal-open'); // fix(later): these two lines shouldn't be necessary, but otherwise window stays dark
					$('.modal-backdrop').remove(); // fix(later): these two lines shouldn't be necessary, but otherwise window stays dark
					wsh.errorModal = null;
				}
			}, 1000);

			// start pinging if not already started
			if (wsh.pingStarted === false) {
				wsh.pingStarted = true;
				setTimeout(pingServer, 20000);
			}
		};

		// run this code when connection is closed
		this.webSocket.onclose = function() {
			console.log('connection closed by server');
			wsh.connected = false;
			setTimeout(reconnect, 10000);

			// show modal to display connection status
			// fix(later): if this gets displayed repeatedly, each time the background gets darker
			if (!wsh.errorModal) {
				console.log('show');
				wsh.errorModal = createBasicModal('wsError', 'Reconnecting to server...', {infoOnly: true});
				wsh.errorModal.appendTo($('body'));
				$('#wsError-body').html('Will attempt to reconnect shortly.');
				$('#wsError').modal('show');
			}
		};
	};

	// send a message to the server;
	// messages should be addressed to a particular folder
	wsh.sendMessage = function(type, parameters, folderPath) {
		if (this.connected === false) {// fix(soon): queue message to send after reconnect?
			return;
		}

		// construct a message string
		if (!parameters)
			parameters = {};
		var message = {
			'type': type,
			'parameters': parameters,
			'folder': folderPath || this.targetFolderPath,
		};
		var messageStr = JSON.stringify(message);

		// send the message to the server
		try {
			this.webSocket.send(messageStr);
		} catch (e) {
			console.log('error sending ' + type + '; try to reconnect in 10 seconds');
			this.connected = true; // fix(soon): should this be false?
			setTimeout(reconnect, 10000);
		}
	};

	// add a handler for a particular type of message;
	// when a message of this type is received the server, the function will be called;
	// the function will be passed three arguments: timestamp, message type, and message parameters (dictionary)
	wsh.addHandler = function(type, func) {
		wsh.handlers[type] = func;
	};

	// fix(clean): remove this; instead append '*' handler (make handlers for each type be a list)
	wsh.addGenericHandler = function(func) {
		wsh.genericHandlers.push(func);
	};

	// fix(clean): move out into blocks.js
	wsh.addHandler('sequence_update', function(timestamp, params) {
		//console.log('sequence: ' + params['name'] + ', value: ' + params['value']);
		var sequenceName = params['name'];
		$.each(g_liveBlocks, function(id, block) {
			if (block.sequenceName && block.sequenceName == sequenceName) {
				// fix(soon): should use params['timestamp']? (not defined if from arduino)
				block.onValue(timestamp, params['value']);
			}
		});
	});

	return wsh;
}


// ======== other internal functions ========


// periodically send a message so that the connection doesn't timeout on heroku
// fix(later): should we disable this when disconnected?
function pingServer() {
	g_wsh.sendMessage('ping', {});
	setTimeout(pingServer, 20000);
}


// attempt to reconnect to the server
function reconnect() {
	console.log('attempting to reconnect');
	g_wsh.connect();
}
