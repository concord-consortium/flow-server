// BLE websocket-like message handler
// based on websocket manager/handler messages.js
// For now only processed update_diagram messages
// TODO: also allow to process:
//   a list of message subscriptions
//   pinging the server
//   reconnecting when disconnected


// global instance of BLE WebSocketHolder; creating the holder does not connect; use connectWebSocket when ready to connect
var g_blewsh = blecreateWebSocketHolder();


// ======== public API functions ========


// open a websocket connection to the server;
// afterOpen (optional) will called after the websocket is opened (will be re-called if reconnect);
// does not reconnect if already connected
function bleconnectWebSocket(afterOpen) {
	g_blewsh.afterOpen = afterOpen;
	if (g_blewsh.connectStarted) // fix(later): move inside connect? need to be sure that reconnects still work
		return;
	g_blewsh.connect();
}


// subscript to messages from a folder;
// if includeSelf is specified, messages sent from self will be reflected back
// fix(clean): move contents of this function into webSocketHolder (so this is just a simple wrapper)?
function blesubscribeToFolder(folderPath, includeSelf) {
	console.log('subscribe: ' + folderPath);
	for (var i = 0; i < g_blewsh.subscriptions.length; i++) {
		if (g_blewsh.subscriptions[i].folder == folderPath)
			return;
	}
	var subscription = {'folder': folderPath};
	if (includeSelf)
		subscription['include_self'] = 1;
	g_blewsh.subscriptions.push(subscription);
	if (g_blewsh.targetFolderPath === null) {
		g_blewsh.targetFolderPath = folderPath;  // fix(soon): require explicitly setting this on connect or using setTargetFolder?
	}
}


// add a handler for a particular type of message;
// when a message of this type is received the server, the function will be called;
// the function will be passed three arguments: timestamp, message type, and message parameters (dictionary)
function bleaddMessageHandler(type, func) {
	g_blewsh.addHandler(type, func);
}


// top-level function for sending messages;
// defaults to using g_blewsh.targetFolderPath as the target/recipient folder
function blesendMessage(messageType, params, targetFolderPath) {
	if (!params)
		params = {};
	g_blewsh.sendMessage(messageType, params, targetFolderPath);
}


// set the default destination for messages
// fix(clean): make this part of connect?
function blesetTargetFolder(targetFolderPath) {
	g_blewsh.targetFolderPath = targetFolderPath;
}


// ======== a class for managing a websocket connection with message handlers/subscriptions/etc. ========


// create a websocket object with a few additional/custom methods
function blecreateWebSocketHolder() {

	// prepare the object
	var blewsh = {};
	blewsh.webSocket = null;
	blewsh.connected = false;
	blewsh.connectStarted = false;
	blewsh.handlers = {};
	blewsh.genericHandlers = [];
	blewsh.subscriptions = [];
	blewsh.errorModal = null;
	blewsh.pingStarted = false;
	blewsh.targetFolderPath = null;  // default target for messages
	blewsh.afterOpen = null;  // called after the websocket is opened (will be re-called if reconnect)

	// connect to the server; this creates a websocket object
	blewsh.connect = function() {
		blewsh.connectStarted = true; // fix(soon): could have race condition
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
			var func = blewsh.handlers[type];
			if (func) {
				console.log("message['parameters']:" + JSON.stringify(message['parameters']))
				func(moment(message['timestamp']), message['parameters']);
			}
			for (var i = 0; i < blewsh.genericHandlers.length; i++) {
				var func = blewsh.genericHandlers[i];
				func(moment(message['timestamp']), type, message['parameters']);
			}
		};

		// run this code after connection is opened
		this.webSocket.onopen = function() {
			blewsh.connected = true;

			// send a connect message (can be used to provide client version info)
			// fix(later): remove this if we're not sending any info?
			blewsh.sendMessage('connect');

			// send list of folders for which we want messages
			console.log('subscriptions: ' + g_blewsh.subscriptions.length);
			blewsh.sendMessage('subscribe', {'subscriptions': g_blewsh.subscriptions});

			// call user-provided function (if any) to run after websocket is open
			if (blewsh.afterOpen)
				blewsh.afterOpen();

			// hide reconnect modal if any
			setTimeout(function() {
				if (blewsh.errorModal && blewsh.connected) {
					console.log('hide');
					$('#wsError').modal('hide');
					$('#wsError').remove();
					$('body').removeClass('modal-open'); // fix(later): these two lines shouldn't be necessary, but otherwise window stays dark
					$('.modal-backdrop').remove(); // fix(later): these two lines shouldn't be necessary, but otherwise window stays dark
					blewsh.errorModal = null;
				}
			}, 1000);

			// start pinging if not already started
			if (blewsh.pingStarted === false) {
				blewsh.pingStarted = true;
				setTimeout(pingServer, 20000);
			}
		};

		// run this code when connection is closed
		this.webSocket.onclose = function() {
			console.log('connection closed by server');
			blewsh.connected = false;
			setTimeout(blereconnect, 10000);

			// show modal to display connection status
			// fix(later): if this gets displayed repeatedly, each time the background gets darker
			if (!blewsh.errorModal) {
				console.log('show');
				blewsh.errorModal = createBasicModal('wsError', 'Reconnecting to server...', {infoOnly: true});
				blewsh.errorModal.appendTo($('body'));
				$('#wsError-body').html('Will attempt to reconnect shortly.');
				$('#wsError').modal('show');
			}
		};
	};

	// send a message to the server;
	// messages should be addressed to a particular folder
	blewsh.sendMessage = function(type, parameters, folderPath) {
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
	blewsh.addHandler = function(type, func) {
		blewsh.handlers[type] = func;
	};

	// fix(clean): remove this; instead append '*' handler (make handlers for each type be a list)
	blewsh.addGenericHandler = function(func) {
		blewsh.genericHandlers.push(func);
	};

	// fix(clean): move out into blocks.js
	blewsh.addHandler('sequence_update', function(timestamp, params) {
		//console.log('sequence: ' + params['name'] + ', value: ' + params['value']);
		// var sequenceName = params['name'];
		// $.each(g_liveBlocks, function(id, block) {
		// 	if (block.sequenceName && block.sequenceName == sequenceName) {
		// 		// fix(soon): should use params['timestamp']? (not defined if from arduino)
		// 		block.onValue(timestamp, params['value']);
		// 	}
		// });
	});

	return blewsh;
}


// ======== other internal functions ========


// periodically send a message so that the connection doesn't timeout on heroku
// fix(later): should we disable this when disconnected?
function blepingServer() {
	g_blewsh.sendMessage('ping', {});
	setTimeout(blepingServer, 20000);
}


// attempt to reconnect to the server
function blereconnect() {
	console.log('attempting to reconnect');
	g_blewsh.connect();
}
