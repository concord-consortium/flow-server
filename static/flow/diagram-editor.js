var g_diagramEditorInitialized = false;
var g_diagram = null;  // the diagram currently being edited
var g_diagramName = null;
var g_modified = false;  // true if the diagram has been modified since it was last saved
var g_svgDrawer = null;
var g_activeStartPin = null;
var g_activeLineSvg = null;
var g_dragBlock = null;
var g_dragBlockOffsetX = null;
var g_dragBlockOffsetY = null;
var g_startTimestamp = moment().valueOf() * 0.001;  // a unix timestamp used as the starting point for time series plots
var g_viewingBlockId = null; // When showing block data, track id
// current scaling value
var g_scale = 1.0;

/**
* Scaling constants for scale step (scale vactor), and min and max scaling.
*/
var SCALE_FACTOR = 1.1;
var SCALE_MIN = 0.5;
var SCALE_MAX = 1.5;

// indicates if BLE should be used for message processing

var g_useBle = false;

/* ======== EVENT HANDLERS ======= */


// handle mouse moves in SVG area; move blocks or connections
function mouseMove(e) {
	if (g_activeStartPin) {
		var x1 = g_activeStartPin.view.x;
		var y1 = g_activeStartPin.view.y;
		var x2 = e.pageX;
		var y2 = e.pageY;
		if (g_activeLineSvg) {
			g_activeLineSvg.plot(x1, y1, x2, y2);
		} else {
			g_activeLineSvg = g_svgDrawer.line(x1, y1, x2, y2).stroke({width: 10, color: '#555'}).back();
		}
	}
	if (g_dragBlock) {
		var x = e.pageX;
		var y = e.pageY;
		moveBlock(g_dragBlock, x + g_dragBlockOffsetX, y + g_dragBlockOffsetY);
		layoutModified();
	}
}


// handle mouse button up in SVG area
function mouseUp(e) {
	g_activeStartPin = null;
	g_dragBlock = null;
	if (g_activeLineSvg) {
		g_activeLineSvg.remove();
		g_activeLineSvg = null;
	}
}


// handle mouse down in pin SVG element
function pinMouseDown(e) {
	g_activeStartPin = this.remember('pin');
}


// handle mouse up in pin SVG; create a new connection between blocks
function pinMouseUp(e) {
	var endPin = this.remember('pin');
	var startPin = g_activeStartPin;
	if (startPin.isInput != endPin.isInput) {
		var sourcePin = endPin.isInput ? startPin : endPin;
		var destPin = endPin.isInput ? endPin : startPin;
		if (!destPin.sourcePin) {  // fix(later): remove existing connection and create new one
			destPin.sourcePin = sourcePin;
			displayConnection(destPin, g_scale);
			structureModified();
		}
		g_activeStartPin = null;
		g_activeLineSvg.remove();
		g_activeLineSvg = null;
        CodapTest.logTopic('Dataflow/ConnectBlock');
	}
}


// highlight a pin when move mouse over it
function pinMouseOver(e) {
	this.fill({color: '#f06'})
}


// unhighlight a pin
function pinMouseOut(e) {
	this.fill({color: '#4682b4'})
}


// don't pass mouse events out of a text input control
function inputMouseDown(e) {
	e.stopPropagation();
}


// drag a block div
function blockMouseDown(e) {
	var x = e.pageX;
	var y = e.pageY;

	// idenfify and store block
	for (var i = 0; i < g_diagram.blocks.length; i++) {
		var block = g_diagram.blocks[i];
		var view = block.view;
		if (x >= view.x && x <= view.x + view.w && y >= view.y && y <= view.y + view.h) {
			g_dragBlock = block;
			g_dragBlockOffsetX = view.x - x;
			g_dragBlockOffsetY = view.y - y;
		}
	}
}


// remove a connection by clicking on it; attached to connection SVG
function connectionClick(e) {
	var destPin = this.remember('destPin');
	destPin.sourcePin = null;
	destPin.view.svgConn.remove();
	structureModified();
}


// triggered when a numeric entry field is edited
function numberEntryChanged(e) {
	var block = g_diagram.findBlockById(e.data);
	var val = parseFloat($('#bv_' + block.id).val());
	if (isNaN(val)) {
		block.updateValue(null);
	} else {
		block.updateValue(val);
	}
	// fix(faster): only trigger if value has changed
	structureModified();  // fix(clean): add a separate valueChanged function?
}


// triggered when a parameter entry field is edited
function paramEntryChanged(e) {
	var block = g_diagram.findBlockById(e.data);
	for (var i = 0; i < block.params.length; i++) {
		var param = block.params[i];
		var val = parseFloat($('#bp_' + param.name).val()); // fix(soon): handle non-numeric params?
		if (isNaN(val)) {
			param.value = param['default'];
		} else {
			param.value = val;
		}
	}
	// fix(faster): only trigger if value has changed
	structureModified();  // fix(clean): add a separate valueChanged function?
}


// rename a block (using the block menu)
function renameBlock(e) {
	var block = g_diagram.findBlockById(e.data.id);
	if (block) {
		modalPrompt({
			title: 'Rename Block',
			prompt: 'New Name',
			default: block.name,
			validator: Util.diagramValidator,
			resultFunc: function(newName) {
				sendMessage('rename_block', {old_name: block.name, new_name: newName});
				block.name = newName;
				$('#bn_' + block.id).html(newName);
				structureModified();
			}
		});
	}
}


// delete a block (using the block menu)
function deleteBlock(e) {
	var block = g_diagram.findBlockById(e.data.id);
	if (block) {
		undisplayBlock(block);  // remove UI elements
		g_diagram.removeBlock(block);
		structureModified();
	}
}

/**
 * Redraw blocks. Usually called as part of scaling.
*/
function redrawBlocks() {
	if (g_diagram) {  // remove any existing diagram elements
		for (var i = 0; i < g_diagram.blocks.length; i++) {
			undisplayBlock(g_diagram.blocks[i]);
		}
		for (var i = 0; i < g_diagram.blocks.length; i++) {
			displayBlock(g_diagram.blocks[i]);
		}
	}
    // redraw connections
    for (var i = 0; i < g_diagram.blocks.length; i++) {
        var block = g_diagram.blocks[i];
        for (var j = 0; j < block.pins.length; j++) {
            var pin = block.pins[j];
            if (pin.sourcePin) {
                displayConnection(pin, g_scale);
            }
        }
    }


}
// zoomin a block (using the block menu)
function zoominBlock(e) {
	if (g_scale < SCALE_MAX) {
	    g_scale = Math.min(g_scale * SCALE_FACTOR, SCALE_MAX);
	    redrawBlocks();
	}
}

function zoomoutBlock(e) {
	if (g_scale > SCALE_MIN) {
	    g_scale = Math.max(g_scale / SCALE_FACTOR, SCALE_MIN);
	    redrawBlocks();
	}
}

// view time series history for a block
function viewRecordedData(e) {
    if (e) {
        var block = g_diagram.findBlockById(e.data.id);
        if (block) {
            showPlotter();
            g_viewingBlockId = block.id;
            CodapTest.logTopic('Dataflow/ViewRecordedData');
        }
    } else {
            showPlotter();
            CodapTest.logTopic('Dataflow/ViewRecordedData');
    }
}


// explore a block's data in CODAP
function exploreData(e) {
	var block = g_diagram.findBlockById(e.data.id);
	if (block) {
		var attrs = [
			{name: 'value', type: 'numeric', precision: 2},
		];
		CodapTest.prepCollection(attrs);
		var data = [];
		var yd = block.view.yData.data;
		for (var i = 0; i < yd.length; i++) {
			data.push({'value': yd[i]});
		}
		CodapTest.sendData(data);
	}
}


/* ======== DISPLAY/DRAW FUNCTIONS ======= */


// create HTML/DOM elements for a block along with SVG pins (does not update diagram data structures)
function displayBlock(block) {
	var blockDiv = $('<div>', {class: 'flowBlock', id: 'b_' + block.id});
	block.view.div = blockDiv;
    //var scale = block.ctx.scale;
    //var scale = 0.6;
	// add menu
	var menuData = createMenuData();
	menuData.add('Rename', renameBlock, {id: block.id});
	menuData.add('Delete', deleteBlock, {id: block.id});
	//menuData.add('Zoom In (Ctrl+i)', zoominBlock, {id: block.id});
	//menuData.add('Zoom Out (Ctrl+o)', zoomoutBlock, {id: block.id});

	//if (block.hasSeq) {
	//	menuData.add('View Recorded Data', viewRecordedData, {id: block.id});
	//}
	var menuHolderDiv = $('<div>', {class: 'flowBlockMenuHolder'});
	var menuDiv = $('<div>', {class: 'dropdown flowBlockMenu'}).appendTo(menuHolderDiv);
	var menuInnerDiv = $('<div>', {
		'class': 'dropdown-toggle',
		'id': 'bm_' + block.id,
		'data-toggle': 'dropdown',
		'aria-expanded': 'true',
	}).appendTo(menuDiv);
	$('<span>', {class: 'flowBlockIcon glyphicon glyphicon-align-justify noSelect', 'aria-hidden': 'true'}).appendTo(menuInnerDiv);
	createDropDownList({menuData: menuData}).appendTo(menuDiv);
	menuHolderDiv.appendTo(blockDiv);

	// add name, value, and units
	if (block.type !== 'plot') {
		$('<div>', {class: 'flowBlockName noSelect', id: 'bn_' + block.id, html: block.name}).appendTo(blockDiv);
	}
	if (block.type === 'number_entry') {
		var input = $('<input>', {class: 'form-control flowBlockInput', type: 'text', id: 'bv_' + block.id}).appendTo(blockDiv);
		if (block.value !== null) {
			input.val(block.value);
		}
		input.mousedown(function(e) {e.stopPropagation()});
		input.keyup(block.id, numberEntryChanged);
	} else if (block.type === 'plot') {
		var canvas = $('<canvas>', {class: 'flowBlockPlot', width: 300, height: 200, id: 'bc_' + block.id}).appendTo(blockDiv);
			canvas.mousedown(blockMouseDown);
			canvas.mousemove(mouseMove);
			canvas.mouseup(mouseUp);
		blockDiv.addClass('flowBlockWithPlot');
	} else if (block.outputType === 'i') {  // image-valued blocks
		$('<img>', {class: 'flowBlockImage', width: 320, height: 240, id: 'bi_' + block.id}).appendTo(blockDiv);
		blockDiv.addClass('flowBlockWithImage');
		appendBlockParametersToBlockDiv(block, blockDiv);
	} else {
		var div = $('<div>', {class: 'flowBlockValueAndUnits noSelect'});
		$('<span>', {class: 'flowBlockValue', html: '...', id: 'bv_' + block.id}).appendTo(div);
		console.log(block.units);
		if (block.units) {
			var units = block.units;
			units = units.replace('degrees ', '&deg;');  // note removing space
			units = units.replace('percent', '%');
			$('<span>', {class: 'flowBlockUnits', html: ' ' + units}).appendTo(div);
		}
		div.appendTo(blockDiv);
		if (block.type === 'number_display_and_input') {
			appendBlockParametersToBlockDiv(block, blockDiv);
		}
	}

	// position the block as specified
	var x = block.view.x;
	var y = block.view.y;
	x = x * g_scale;
	y = y * g_scale;
	blockDiv.css('top', y + 'px');
	blockDiv.css('left', x + 'px');
	//console.log("blockDiv: x,y="+x+","+y);

	// add a mousedown handler for dragging/moving blocks
	blockDiv.mousedown(blockMouseDown);

	// add to DOM before get dimensions
	blockDiv.appendTo($('#diagramHolder'));

	// display plot after added to DOM
	if (block.type === 'plot') {
		displayPlot(block);
	}
    scaleClasses();
	// get dimensions of block div
	var w = parseInt(blockDiv.outerWidth(true));  // true to include the margin in the width
	var h = parseInt(blockDiv.outerHeight());  // not passing true here because we don't want the bottom margin
    //console.log("block w,h=" + w + ", " + h);
	block.view.w = w;
	block.view.h = h;
	var pinRadius = 15 * g_scale;
	if (pinRadius > 15) {
	    pinRadius = 15;
	} else if (pinRadius < 8) {
	    pinRadius = 8;
	}
	// position and draw pins
	for (var i = 0; i < block.pins.length; i++) {
		var pin = block.pins[i];
		if (pin.isInput) {
			if (block.inputCount == 1) {
				pin.view.offsetX = -5;
				pin.view.offsetY = h / 2;
			} else {
				pin.view.offsetX = -5;
				pin.view.offsetY = h / 4 + h / 2 * pin.index;
			}
		} else {
			pin.view.offsetX = w + 5;
			pin.view.offsetY = h / 2;
		}
		pin.view.x = x + pin.view.offsetX;
		pin.view.y = y + pin.view.offsetY;
		var pinSvg = g_svgDrawer.circle(pinRadius * 2).center(pin.view.x, pin.view.y).attr({fill: '#4682b4'});
		pinSvg.remember('pin', pin);
		pinSvg.mousedown(pinMouseDown);
		pinSvg.mouseup(pinMouseUp);
		pinSvg.mouseover(pinMouseOver);
		pinSvg.mouseout(pinMouseOut);
		pin.view.svg = pinSvg;
	}
}

function appendBlockParametersToBlockDiv(block, blockDiv) {
	for (var i = 0; i < block.params.length; i++) {
		var param = block.params[i];
		param.value = param['default'];	// set value to default value so that we can send a value back to controller if no param entry change
		$('<div>', {class: 'flowBlockParamLabel', html: param.name}).appendTo(blockDiv);
		var input = $('<input>', {class: 'form-control flowBlockInput', type: 'text', id: 'bp_' + param.name, value: param['default']}).appendTo(blockDiv);
		input.mousedown(function(e) {e.stopPropagation()});
		input.keyup(block.id, paramEntryChanged);
	}
}

// move a block along with its pins and connections
function moveBlock(block, x, y) {

	// move block div
	block.view.div.css('top', y + 'px');
	block.view.div.css('left', x + 'px');
	block.view.x = x;
	block.view.y = y;

	// move pins
	for (var i = 0; i < block.pins.length; i++) {
		var pin = block.pins[i];
		pin.view.x = x + pin.view.offsetX;
		pin.view.y = y + pin.view.offsetY;
		pin.view.svg.center(pin.view.x, pin.view.y);
		if (pin.sourcePin) {
			moveConn(pin);
		}
	}

	// move connections
	var destPins = g_diagram.findDestPins(block);
	for (var i = 0; i < destPins.length; i++) {
		moveConn(destPins[i]);
	}
}


// move a connection between two blocks
function moveConn(destPin) {
	var x1 = destPin.sourcePin.view.x;
	var y1 = destPin.sourcePin.view.y;
	var x2 = destPin.view.x;
	var y2 = destPin.view.y;
	destPin.view.svgConn.plot(x1, y1, x2, y2);
}


// draw a connection between two blocks (as an SVG line)
function displayConnection(destPin, scale) {
    var strokeWidth = 10 * scale;
    if (strokeWidth > 10) {
        strokeWidth = 10;
    } else if (strokeWidth < 4) {
        strokeWidth = 4;
    }
	var x1 = destPin.sourcePin.view.x;
	var y1 = destPin.sourcePin.view.y;
	var x2 = destPin.view.x;
	var y2 = destPin.view.y;
	var line = g_svgDrawer.line(x1, y1, x2, y2).stroke({width: strokeWidth, color: '#555'}).back();
	line.remember('destPin', destPin);
	line.click(connectionClick);
	destPin.view.svgConn = line;
}


// remove the HTML/SVG elements associated with a block (does not update diagram data structures)
function undisplayBlock(block) {
	$('#b_' + block.id).remove();
	for (var i = 0; i < block.pins.length; i++) {
		var pin = block.pins[i];
		pin.view.svg.remove();
		if (pin.sourcePin) {  // remove connections to this block
			pin.view.svgConn.remove();
		}
	}

	// remove connections from this block
	var destPins = g_diagram.findDestPins(block);
	for (var i = 0; i < destPins.length; i++) {
		destPins[i].view.svgConn.remove();
	}
}


// display data in a plot block
function displayPlot(block) {
	var canvas = document.getElementById('bc_' + block.id);
	block.view.plotHandler = createPlotHandler(canvas);
	block.view.xData = createDataColumn('seconds', []);
	block.view.xData.type = 'timestamp';
	block.view.yData = createDataColumn('value', []);
	var dataPairs = [
		{
			'xData': block.view.xData,
			'yData': block.view.yData,
		}
	];
	block.view.plotHandler.plotter.setData(dataPairs);
	block.view.plotHandler.drawPlot(null, null);
}


// display the current value of a block in the UI
function displayBlockValue(block) {
	if (block.type === 'number_entry') {
		// do nothing
	} else if (block.type === 'plot') {
		if (block.value !== null && !isNaN(block.value)) {
			var timestamp = moment().valueOf() * 0.001 - g_startTimestamp;
			block.view.xData.data.push(timestamp);
			block.view.yData.data.push(block.value);
			if (block.view.xData.data.length > 30) {
				block.view.xData.data.shift();
				block.view.yData.data.shift();
			}
		} else {
			block.view.xData.data = [];
			block.view.yData.data = [];
		}
		block.view.plotHandler.plotter.autoBounds();
		block.view.plotHandler.drawPlot(null, null);
	} else if (block.outputType === 'i') {  // image-valued blocks
		if (block.value === null) {
			// fix(soon): display something to let user know camera is offline
		} else {
			console.log('set image ' + block.value.length);
			$('#bi_' + block.id).attr('src', 'data:image/jpeg;base64,' + block.value);
		}
	} else {
		if (block.value === null) {
			$('#bv_' + block.id).html('...');
		} else {
			$('#bv_' + block.id).html(block.value);  // fix(faster): check whether value has changed
		}
	}
}


/* ======== OTHER FUNCTIONS ======= */



// initialize the diagram editor view (everything in this file); sets up handlers for messages from controller
function initDiagramEditor() {

	// ******************************************
	// *************** Embedded handler functions
	// ******************************************
	/**
	 * handle a new set of values for the blocks in the diagram
	 * (the controller code is responsible for computing diagram block values)
	 * @param timestamp
	 * @param params
	 */
	function update_diagram_handler(timestamp, params) {
		controllerConnected = true;

		var values = params.values;
		for (var blockId in values) {
			if (values.hasOwnProperty(blockId)) {
				var value = values[blockId];
				if (value !== null) {  // don't convert nulls to NaNs
					value = parseFloat(value);
				}
				var block = g_diagram.findBlockById(parseInt(blockId));  // fix(later): why aren't blockIds coming through as integers?
				if (block) {
					block.updateValue(value);  // will be null if no defined value (disconnected)
					displayBlockValue(block);
				}
			}
		}
	}

	function device_list_handler(timestamp, params) {
		controllerConnected = true;

		var devices = params.devices;
		for (var i = 0; i < devices.length; i++) {
			addDevice(devices[i]);
		}

	}

	function device_added_handler(timestamp, params) {
			controllerConnected = true;

		console.log('device_added');
		var deviceInfo = params;
		if (g_diagram.findBlockByName(deviceInfo.name) === null) {
			var inputCount = (deviceInfo.dir === 'out') ? 1 : 0;
			var outputCount = (deviceInfo.dir === 'in') ? 1 : 0;
			var inputType = 'n';
			var outputType = (deviceInfo.type === 'camera') ? 'i' : 'n';
			if (inputCount === 0) {
				inputType = null;
			}
			if (outputCount === 0) {
				outputType = null;
			}
			var blockSpec = {
				name: deviceInfo.name,
				type: deviceInfo.type,
				units: deviceInfo.units,
				has_seq: (deviceInfo.dir === 'in'),  // assume all inputs have sequences (for now)
				input_count: inputCount,
				output_count: outputCount,
				input_type: inputType,
				output_type: outputType,
				view: {
					x: 100 + g_diagram.blocks.length * 50,  // fix(later): smarter positioning
					y: 100 + g_diagram.blocks.length * 50,
				}
			};
			var block = createFlowBlock(blockSpec);
			g_diagram.blocks.push(block);
			displayBlock(block);
			structureModified();
            CodapTest.logTopic('Dataflow/ConnectSensor');
		}
	}

	function device_removed_handler(timestamp, params) {
		var block = g_diagram.findBlockByName(params.name);
		if (block) {
			undisplayBlock(block);  // remove UI elements
			g_diagram.removeBlock(block);
			structureModified();
		}
	}

	// ******************************************
	// ******** End of embedded handler functions
	// ******************************************

	var controllerConnected = false;

	// if currently recording update recording button
	if (g_recordingInterval) {
		$('#startRecording').hide();
		$('#stopRecording').show();
	}

	// request list of devices currently connected to controller
	// fix(soon): if we're loading a diagram, should we do this after we've loaded it?
	sendMessage('list_devices');

	// request information about block types from controller
	sendMessage('request_block_types');

	// one-time initialization of UI elements and message handlers
	if (g_diagramEditorInitialized === false) {
		g_svgDrawer = SVG('diagramHolder');
		$('#diagramHolder').mousemove(mouseMove);
		$('#diagramHolder').mouseup(mouseUp);



		if (g_useBle) {
			bleaddMessageHandler('device_list', device_list_handler);
			bleaddMessageHandler('device_added', device_added_handler);
			bleaddMessageHandler('device_removed', device_removed_handler);
			bleaddMessageHandler('update_diagram', update_diagram_handler);
		} else {
			addMessageHandler('device_list', device_list_handler);
			addMessageHandler('device_added', device_added_handler);
			addMessageHandler('device_removed', device_removed_handler);
			addMessageHandler('update_diagram', update_diagram_handler);
		}

		// Check that the controller has sent a message upon init
		window.setTimeout(function(){
			if (!controllerConnected){
				modalConfirm({title: 'Not connected to the controller', prompt: 'Would you like to exit?', yesFunc: function() {
					showControllerSelector();
				}, noFunc: function() {
				}});
			}
		}, 3000);

		g_diagramEditorInitialized = true;
	}
}


/**
 * zoom blocks
 * Params:
 *   blocks
 *   factor: factor to zoom by, such as 0.7 or 1.3
 */
function zoomBlocks(blocks, factor) {
	for (var i = 0; i < blocks.length; i++) {
		blocks[i].view.x = Math.round(blocks[i].view.x * factor);
		blocks[i].view.y = Math.round(blocks[i].view.y * factor);
	}
}

/**
 * scaling table for css classes.
 * contains a map for each class for css properties to scale -> mapped to defautl value at 1.0 scale.
*/
var CLASS_SCALING_TABLE = {
   'flowBlock': { "width": 175 },
   'flowBlockValue': { "font-size": 36 },
   'flowBlockValueAndUnits': { "margin-bottom": 15 },
   'flowBlockName': { "font-size": 16 },
   'flowBlockValue': { "font-size": 36 },
   'flowBlockUnits': { "font-size": 22 },
   'flowBlockInput': { "font-size": 20, "margin-bottom": 25 },
   'flowBlockMenuHolder': { "height": 26 },
   'flowBlockWithPlot': { "width": 330 },
   'flowBlockWithImage': { "width": 330 },
};

/**
* Scale css classes based on current scale value.
* Will scale the following css classes:
* - flowBlockValueAndUnits
* - flowBlockValue
* etc. as specified in CLASS_SCALING_TABLE
*/
function scaleClasses() {
	// adjust css sizing properties based on scale

	// allow reset to exactly 1.0 scale if it's slightly off
	if (g_scale > 0.95 && g_scale < 1.05) {
	    do_reset = true;
	    g_scale = 1.0;
	} else {
	    do_reset = false;
	}
    for (var key in CLASS_SCALING_TABLE) {
      var node = $("." + key)
      if (node) {
        for (var cssProp in CLASS_SCALING_TABLE[key]) {
            var value = node.css(cssProp);
            if (value) {
                var defaultValue = CLASS_SCALING_TABLE[key][cssProp];
                var newValue = Math.round(defaultValue * g_scale);
                // append "px" if needed
                if (value && value.endsWith("px")) {
                    newValue = "" + newValue + "px";
                }
                //console.log("scaleClasses: " + key + " - " + cssProp + ": " + value + " -> " + newValue);
                node.css(cssProp, newValue);
                //$("." + key).css(cssProp, newValue);
            } else {
                //console.log("scaleClasses: skipping " + key + " - " + cssProp);
            }
        }
      }
    }

}

// load a diagram from a spec dictionary into the editor
function loadDiagram(diagramSpec) {
    // bind zoom menu/function to keyboard keys
    $(document).bind('keydown', 'ctrl+i', zoominBlock);
    $(document).bind('keydown', 'ctrl+o', zoomoutBlock);

	if (g_diagram) {  // remove any existing diagram elements
		for (var i = 0; i < g_diagram.blocks.length; i++) {
			undisplayBlock(g_diagram.blocks[i]);
		}
	}
	g_scale = 1.0;
	g_diagram = specToDiagram(diagramSpec);
	g_diagramName = diagramSpec.name;
	//zoomBlocks(g_diagram.blocks, g_scale);
	for (var i = 0; i < g_diagram.blocks.length; i++) {
		displayBlock(g_diagram.blocks[i]);
	}
	for (var i = 0; i < g_diagram.blocks.length; i++) {
		var block = g_diagram.blocks[i];
		for (var j = 0; j < block.pins.length; j++) {
			var pin = block.pins[j];
			if (pin.sourcePin) {
				displayConnection(pin, g_scale);
			}
		}
	}
	g_modified = false;
}



// add a numeric data entry block to the diagram
function addNumericBlock() {
	var block = createFlowBlock({name: 'number', type: 'number_entry', output_count: 1, output_type: 'n'});
	g_diagram.blocks.push(block);
	block.view.x = 100;
	block.view.y = 100;
	displayBlock(block);
	structureModified();
}


// add a filter block to the diagram
function addFilterBlock(e) {
	var type = e.data;
	$('#filterModal').modal('hide');
	var blockSpec = {
		name: type,
		type: type,
		input_count: 2,
		output_count: 1,
		input_type: 'n',
		output_type: 'n',
	}
	if (type === 'not' || type == 'absolute value') {
		blockSpec.input_count = 1;
	}
	if (type === 'simple moving average'|| type === 'exponential moving average') {
		blockSpec.input_count = 1;
		blockSpec.type = "number_display_and_input"
		blockSpec.params = [{
			'name': 'period',
			'type': 'n',
			'min': 0,
			'max': 9999,
			'default': 10
		}];
	}
	if (type === 'blur' || type === 'brightness') {  // fix(soon): get this from controller block type spec list
		blockSpec.input_type = 'i';
		blockSpec.output_type = 'i';
		blockSpec.input_count = 1;
		if (type === 'blur') {
			blockSpec.params = [{
				'name': 'blur_amount',
				'type': 'n',
				'min': 0,
				'max': 50,
				'default': 5,
			}];
		} else {
			blockSpec.params = [{
				'name': 'brightness_adjustment',
				'type': 'n',
				'min': -100,
				'max': 100,
				'default': 0,
			}];
		}
	}
	var block = createFlowBlock(blockSpec);  // fix(soon): generate unique name from type
	g_diagram.blocks.push(block);
	block.view.x = 300;
	block.view.y = 200;
	displayBlock(block);
	structureModified();
}


// display a dialog with a list of allowed filter types
function showFilterBlockSelector() {
	var modal = createBasicModal('filterModal', 'Select a Filter', {infoOnly: true});
	modal.appendTo($('body'));
	var modalBody = $('#filterModal-body');
	var filterTypes = [
		"not", "and", "or", "xor", "nand",
		"plus", "minus", "times", "divided by", "absolute value",
		"equals", "not equals", "less than", "greater than",
		"simple moving average", "exponential moving average"
	];
	for (var i = 0; i < filterTypes.length; i++) {
		var type = filterTypes[i];
		var button = $('<button>', {html: type, class: 'btn filter'});
		button.click(type, addFilterBlock);
		button.appendTo(modalBody);
	}
	$('#filterModal').modal('show');
}


// add a plotting block to the current diagram
function addPlotBlock() {
	var block = createFlowBlock({name: 'plot', type: 'plot', input_count: 1, input_type: 'n'});
	g_diagram.blocks.push(block);
	block.view.x = 500;
	block.view.y = 300;
	displayBlock(block);
	structureModified();
    CodapTest.logTopic('Dataflow/AddPlot');
}


// save the diagram to the controller
function saveDiagram(promptForName, closeWhenDone, chainDialog) {
	if (g_modified) {

		// prompt for name
		if (promptForName || !g_diagramName) {
			modalPrompt({
				title: 'Save Diagram',
				prompt: 'Name',
				default: g_diagramName,
				validator: Util.diagramValidator,
				resultFunc: function(name) {

					// send diagram to controller
					var diagramSpec = diagramToSpec(g_diagram);
					sendMessage('save_diagram', {'name': name, 'diagram': diagramSpec});  // fix(soon): should check for success
					diagramSpec.name = name;  // fix(clean): this is a bit messy; sometime diagram spec has name, sometimes not
					sendMessage('set_diagram', {'diagram': diagramSpec});
					g_diagramName = name;
					g_modified = false;

                    //
                    // Set new name in diagram view.
                    //
                    setDiagramInfo( { diagramName: g_diagramName } );

					// update diagram list
					updateDiagramSpec(diagramSpec);
                    if (chainDialog) {
                        chainDialog();
                    }
					if (closeWhenDone) {
						showControllerViewer();
					}
				}
			});

		// or save using existing name
		} else {

            // console.log("[DEBUG] Save diagram name '"+ name + 
            //            "' g_diagramName '" + g_diagramName + "'");

			// send diagram to controller
			var diagramSpec = diagramToSpec(g_diagram);
			sendMessage('save_diagram', {'name': g_diagramName, 'diagram': diagramSpec});  // fix(soon): should check for success

			diagramSpec.name = g_diagramName;  // fix(clean): this is a bit messy; sometime diagram spec has name, sometimes not
			sendMessage('set_diagram', {'diagram': diagramSpec});

			g_modified = false;

			// update diagram list
			updateDiagramSpec(diagramSpec);
            if (chainDialog) {
                chainDialog();
            }

			if (closeWhenDone) {
				showControllerViewer();
			}
		}
	} else {
        if (chainDialog) {
            chainDialog();
        }
		if (closeWhenDone) {
			showControllerViewer();
		}
	}
}

//
// Call saveDiagram and ensure that the saved diagram is
// started so that we do not leave a _temp_ diagram in the running state.
//
function saveDiagramAndStart(promptForName, closeWhenDone, chainDialog) {

    //
    // Add handler called after diagram is saved.
    //
    addMessageHandler('save_diagram_response', function(ts, result) {
        console.log("[DEBUG] Checking save_diagram_response", result);
        removeMessageHandler('save_diagram_response');
        if(result.success) {
            console.log("[DEBUG] Saved diagram. Starting saved diagram.");

            //
            // Now start the diagram we just saved, so that the _temp_
            // diagram isn't running and we can instead set a diagram
            // present in our list as running.
            //
            addMessageHandler('start_diagram_response', function(ts, result) {
                console.log("[DEBUG] Checking start_diagram_response", result);
                removeMessageHandler('start_diagram_response');
                if(result.success) {
                    console.log("[DEBUG] Diagram started. Returning to controller view.");
                    if(closeWhenDone) {
                        showControllerViewer();
                    }
                }
            });
            sendMessage('start_diagram', { name: g_diagramName } );
        }
    });
    saveDiagram(promptForName, false);
}

//
// Close the diagram editor (optionally saving diagram changes)
// and go back to the controller viewer
//
function closeDiagramEditor() {
    if (g_modified) {
        modalConfirm({title: 'Save Diagram?', prompt: 'Do you want to save this diagram?', yesFunc: function() {

            saveDiagramAndStart(true, true);

        }, noFunc: function() {

            //
            // If they do not save changes, then reload the previously
            // running diagram so that we do not leave a modified _temp_
            // diagram running on the controller.
            //
            addMessageHandler('start_diagram_response', function(ts, result) {
                console.log("[DEBUG] Checking start_diagram_response", result);
                removeMessageHandler('start_diagram_response');
                if(result.success) {
                    console.log("[DEBUG] Returning to controller view.");
                    showControllerViewer();
                }
            });

            console.log("[DEBUG] Restart unmodified diagram: " + g_diagramName);
            sendMessage('start_diagram', { name: g_diagramName } );

        }});
    } else {
        showControllerViewer();
    }
}


//
// Instruct the controller to start data recording (not just data displaying)
//
function startRecordingData() {

    // g_modified check for existing diagrams?
    var modal = createBasicModal('recordingSettings', 'Start Recording Data');
    modal.appendTo($('body'));
    var modalBody = $('#recordingSettings-body');
    var fg = createFormGroup({id: 'rate', label: 'Update Rate (seconds)'}).appendTo(modalBody);
    createTextInput({id: 'rate', value: '60'}).appendTo(fg);
    // disable showing run_name
    var showRunName = false;
    if (showRunName) {
        var fg2 = createFormGroup({id: 'run_name', label: 'Run name'}).appendTo(modalBody);
        createTextInput({id: 'run_name', value: 'Noname'}).appendTo(fg2);
    }
    $('#recordingSettings-ok').click(function() {
        var rate = parseInt($('#rate').val());
        var run_name = $('#run_name').val();
        if (rate < 1) {
            $('#recordingSettings').modal('hide');
            alert("Recording interval must be an integer >= 1.");
        } else {
            g_recordingInterval = rate;
            var params;
               if (showRunName) {
                params = {
                    'rate': rate,
                    'run_name': run_name
                };
            } else {
                params = {
                    'rate': rate
                };
            }
            sendMessage('start_recording', params);

            setDiagramInfo( {   controllerName: g_controller.name,
                                diagramName:    g_diagramName,
                                interval:       g_recordingInterval } );

            $('#startRecording').hide();
            $('#stopRecording').show();
            $('#recordingSettings').modal('hide');
            CodapTest.logTopic('Dataflow/SetUpdateRate');
        }
    });
    $('#recordingSettings').modal('show');
    CodapTest.logTopic('Dataflow/StartRecordingData');
}

//
// Instruct the controller to stop data recording
//
function stopRecordingData() {
    sendMessage('stop_recording');
    $('#stopRecording').hide();
    $('#startRecording').show();
    g_recordingInterval = 0;
    CodapTest.logTopic('Dataflow/StopRecordingData');

    setDiagramInfo( {   controllerName: g_controller.name,
                        diagramName:    g_diagramName,
                        interval:       g_recordingInterval } );

}


// call this when the visual appearance of the diagram is changed, but not the functional structure;
// we should save changes (if the user chooses to do so), but there's no need to send the diagram to the controller
function layoutModified() {
	g_modified = true;
}


// call this when the diagram's functional structure is changed; we need to send the diagram to the controller
function structureModified() {
	g_modified = true;
	sendMessage('set_diagram', {diagram: diagramToSpec(g_diagram)});
	console.log('sent diagram');
}


window.addEventListener('beforeunload', function(){
	if (g_modified){
		return 'Your changes have not been saved. Are you sure you want to close the page?';
	}
})
