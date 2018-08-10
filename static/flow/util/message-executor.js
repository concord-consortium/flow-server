//
// Send a websocket message to a controller
// and handle a response.
//
// @param config - A json object containing configuration info.
//
//                  The config can contain the folowing keys:
//
//                  message_type - the message type to send.
//                  message_params - the params to send with the
//                      outgoing message.
//                  target_folder - the destination controller to send
//                      the message to.
//                  response_type - (optional) for messages which
//                      do not respond with <message_type>_response, specify
//                      the name of the response message type.
//                  src_folder - (optional) only handle responses from
//                      the src_folder controller.
//                  response_func - function to call when response is received.
//                      This function will be passed a timestamp and
//                      a params json object. This has the form
//                      function(timestamp, params)
//                  remove_handler - (optional) If true, remove the handler
//                      after handling the response. If false, do not remove
//                      the handler after handling the response. The default is
//                      true.
//
var MessageExecutor = function(config) {
    this.message_type   = config.message_type;
    this.message_params = config.message_params;
    this.target_folder  = config.target_folder;
    this.response_type  = this.message_type + "_response";
    this.src_folder     = null;
    this.response_func  = config.response_func;
    this.remove_handler = true;

    var _this = this;

    //
    // Add optional config parameters.
    //
    if(config.response_type) {
        this.response_type = config.response_type;
    }
    if(config.src_folder) {
        this.src_folder = config.src_folder;
    }
    if('remove_handler' in config) {
        this.remove_handler = config.remove_handler;
    } else {
        this.remove_handler = true;
    }

    //
    // Send the message and set the response handler.
    //
    this.execute = function() {

        console.debug("[DEBUG] MessageExecutor execute()");

        console.debug("[DEBUG] MessageExecutor call addMessageHandler",
                        this.response_type );

        //
        // Some kind of bug here does not allow multiple message types
        // to be handled simultaneously.
        //
        removeMessageHandlers();

        addMessageHandler(
            this.response_type,
            function(timestamp, params) {

                console.debug("[DEBUG] MessageExecutor handleResponse()", _this.response_type,_this.response_func, params);

                if( _this.src_folder != null &&
                    _this.src_folder != params.src_folder) {

                    console.debug("[DEBUG] MessageExecutor ignoring message from " + params.src_folder);
                    return;
                }
                if(_this.remove_handler) {
                    removeMessageHandler(_this.response_type);
                }
                _this.response_func(timestamp, params);
            });

         console.debug("[DEBUG] MessageExecutor setting subscription and " +
                    "target folder: " + this.target_folder);

        subscribeToFolder(this.target_folder);
        setTargetFolder(this.target_folder);

        if(g_webSocketInited) {

            console.info("[INFO] MessageExecutor sending message on connected websocket. " + this.message_type + " " + this.message_params);

            sendSubscriptions();
            sendMessage(this.message_type, this.message_params);
            return;
        }
        connectWebSocket(function() {

             console.info("[INFO] MessageExecutor connecting websocket.");

            sendMessage(_this.message_type, _this.message_params);
        });

    }

    return this;
}
