function diagramEditorView() {
	return Vue.component('diagram-editor', {
		template: [
			'<div id="diagramEditorPanel" class="flowPanel">',
				'<div id="diagramHolder" v-on:mousemove="mouseMove" v-on:mouseup="mouseUp">',
					'<block v-for="(block, i) in diagram.blocks" :key="block.id" v-bind:block="block"></block>',
				'</div>',
				'<div class="menuBar">',
					'<button class="btn btn-primary" onclick="sendMessage(\'add_camera\');">Add Camera</button>',
					'<button class="btn btn-primary" onclick="addNumericBlock()">Add Numeric Entry</button>',
					'<button class="btn btn-primary" onclick="showFilterBlockSelector()">Add Filter</button>',
					'<button class="btn btn-primary" onclick="addPlotBlock()">Add Plot</button>',
					'<button class="btn btn-primary" onclick="closeDiagramEditor()">Close Diagram</button>',
					'<button class="btn" onclick="sendMessage(\'add_sim_sensor\');">Add Sim Sensor</button>',
					'<button class="btn" onclick="sendMessage(\'add_sim_actuator\');">Add Sim Actuator</button>',
					'<button class="btn" onclick="sendMessage(\'remove_sim_device\');">Remove Sim Device</button>',
				'</div>',
			'</div>'
		].join('\n'),
		props: [
			'diagram',
		],
		components: {
			'block': blockComponent()
		},
		data: function(){
			return {
				svgDrawer: null,
				activeStartPin: null,
				diagramEditorInitialized: false,
				// diagram: {},  // the diagram currently being edited
				diagramName: null,
				modified: false,  // true if the diagram has been modified since it was last saved
				activeLineSvg: null,
				dragBlock: null,
				dragBlockOffsetX: null,
				dragBlockOffsetY: null,
				startTimestamp: moment().valueOf() * 0.001,  // a unix timestamp used as the starting point for time series plots
				viewingBlockId: null, // When showing block data, track id
			}
		},
		methods: {
			// handle mouse moves in SVG area; move blocks or connections
			mouseMove: function(e) {
				if (this.activeStartPin) {
					var x1 = this.activeStartPin.view.x;
					var y1 = this.activeStartPin.view.y;
					var x2 = e.pageX;
					var y2 = e.pageY;
					if (g_activeLineSvg) {
						this.activeLineSvg.plot(x1, y1, x2, y2);
					} else {
						this.activeLineSvg = this.svgDrawer.line(x1, y1, x2, y2).stroke({width: 10, color: '#555'}).back();
					}
				}
				if (this.dragBlock) {
					var x = e.pageX;
					var y = e.pageY;
					moveBlock(this.dragBlock, x + this.dragBlockOffsetX, y + this.dragBlockOffsetY);
					layoutModified();
				}
			},
			// handle mouse button up in SVG area
			mouseUp: function(e) {
				this.activeStartPin = null;
				this.dragBlock = null;
				if (this.activeLineSvg) {
					this.activeLineSvg.remove();
					this.activeLineSvg = null;
				}
			},


		},
		mounted: function(){
			var view = this;
			var controllerConnected = false;

			// request list of devices currently connected to controller
			// fix(soon): if we're loading a diagram, should we do this after we've loaded it?
			sendMessage('list_devices');

			// one-time initialization of UI elements and message handlers
			if (this.diagramEditorInitialized === false) {
				this.svgDrawer = SVG('diagramHolder');

				// handle a list of devices from the controller
				addMessageHandler('device_list', function(timestamp, params) {
					controllerConnected = true;

					var devices = params.devices;
					for (var i = 0; i < devices.length; i++) {
						// view.addDevice(devices[i]); // TODO: where does this function live?
					}
				});

				// handle a newly added device from the controller
				addMessageHandler('device_added', function(timestamp, params) {
					controllerConnected = true;

					console.log('device_added');
					var deviceInfo = params;
					if (view.diagram.findBlockByName(deviceInfo.name) === null) {
						var inputCount = (deviceInfo.dir === 'out') ? 1 : 0;
						var outputCount = (deviceInfo.dir === 'in') ? 1 : 0;
						var blockSpec = {
							name: deviceInfo.name,
							type: deviceInfo.type,
							units: deviceInfo.units,
							has_seq: (deviceInfo.dir === 'in'),  // assume all inputs have sequences (for now)
							input_count: inputCount,
							output_count: outputCount,
							view: {
								x: 100 + view.diagram.blocks.length * 50,  // fix(later): smarter positioning
								y: 100 + view.diagram.blocks.length * 50,
							}
						};
						var block = createFlowBlock(blockSpec);
						view.diagram.blocks.push(block);
						displayBlock(block);
						structureModified();
					}
				});

				// handle a device being unplugged
				addMessageHandler('device_removed', function(timestamp, params) {
					controllerConnected = true;

					var block = g_diagram.findBlockByName(params.name);
					if (block) {
						undisplayBlock(block);  // remove UI elements
						view.diagram.removeBlock(block);
						structureModified();
					}
				});

				// handle a new set of values for the blocks in the diagram
				// (the controller code is responsible for computing diagram block values)
				addMessageHandler('update_diagram', function(timestamp, params) {
					controllerConnected = true;

					var values = params.values;
					for (var blockId in values) {
						if (values.hasOwnProperty(blockId)) {
							var value = values[blockId];
							var block = view.diagram.findBlockById(parseInt(blockId));  // fix(later): why aren't blockIds coming through as integers?
							if (block && value !== null) {
								block.updateValue(value); // will be null if no defined value (disconnected)
								displayBlockValue(block);
							}
						}
					}
				});

				// Check that the controller has sent a message upon init
				window.setTimeout(function(){
					if (!controllerConnected){
						modalConfirm({title: 'Not connected to the controller', prompt: 'Would you like to exit?', yesFunc: function() {
							showControllerSelector();
						}, noFunc: function() {
						}});
					}
				}, 1000);

				this.diagramEditorInitialized = true;
			}
		}
	});
}


// handle mouse down in pin SVG element
function pinMouseDown(e) {
	this.activeStartPin = this.remember('pin');
}


// handle mouse up in pin SVG; create a new connection between blocks
function pinMouseUp(e) {
	var endPin = this.remember('pin');
	var startPin = this.activeStartPin;
	if (startPin.isInput != endPin.isInput) {
		var sourcePin = endPin.isInput ? startPin : endPin;
		var destPin = endPin.isInput ? endPin : startPin;
		if (!destPin.sourcePin) {  // fix(later): remove existing connection and create new one
			destPin.sourcePin = sourcePin;
			displayConnection(destPin);
			structureModified();
		}
		this.activeStartPin = null;
		g_activeLineSvg.remove();
		g_activeLineSvg = null;
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


// delete a block (using the block menu)
function deleteBlock(e) {
	var block = g_diagram.findBlockById(e.data.id);
	if (block) {
		undisplayBlock(block);  // remove UI elements
		g_diagram.removeBlock(block);
		structureModified();
	}
}


// view time series history for a block
function viewData(e) {
	var block = g_diagram.findBlockById(e.data.id);
	if (block) {
		showPlotter();
		addSequence(block);
		g_viewingBlockId = block.id;
	}
}


// explore a block's data in CODAP
function exploreData(e) {
	var block = g_diagram.findBlockById(e.data.id);
	if (block) {
		CodapTest.sendSequence(block.view.yData.data);
	}
}


/* ======== DISPLAY/DRAW FUNCTIONS ======= */




// move a block along with its pins and connections
function moveBlock(block, x, y) {

	// move block div
	block.view.div.css('top', y + 'px'); // TODO: use Block Vue css
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
function displayConnection(destPin) {
	var x1 = destPin.sourcePin.view.x;
	var y1 = destPin.sourcePin.view.y;
	var x2 = destPin.view.x;
	var y2 = destPin.view.y;
	var line = this.svgDrawer.line(x1, y1, x2, y2).stroke({width: 10, color: '#555'}).back();
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




/* ======== OTHER FUNCTIONS ======= */

// load a diagram from a spec dictionary into the editor
function loadDiagram(diagramSpec) {
	if (g_diagram) {  // remove any existing diagram elements
		for (var i = 0; i < g_diagram.blocks.length; i++) {
			undisplayBlock(g_diagram.blocks[i]);
		}
	}
	g_diagram = specToDiagram(diagramSpec);
	g_diagramName = diagramSpec.name;
	for (var i = 0; i < g_diagram.blocks.length; i++) {
		displayBlock(g_diagram.blocks[i]);
	}
	for (var i = 0; i < g_diagram.blocks.length; i++) {
		var block = g_diagram.blocks[i];
		for (var j = 0; j < block.pins.length; j++) {
			var pin = block.pins[j];
			if (pin.sourcePin) {
				displayConnection(pin);
			}
		}
	}
	g_modified = false;
}


// add a numeric data entry block to the diagram
function addNumericBlock() {
	var block = createFlowBlock({name: 'number', type: 'number_entry', output_count: 1});
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
	}
	if (type == 'not') {
		blockSpec.input_count = 1;
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
	var block = createFlowBlock({name: 'plot', type: 'plot', input_count: 1});
	g_diagram.blocks.push(block);
	block.view.x = 500;
	block.view.y = 300;
	displayBlock(block);
	structureModified();
}


// close the diagram editor (optionally saving diagram changes) and go back to the controller viewer
function closeDiagramEditor() {
	if (g_modified) {
		modalConfirm({title: 'Save Diagram?', prompt: 'Do you want to save this diagram?', yesFunc: function() {
			modalPrompt({
				title: 'Save Diagram',
				prompt: 'Name',
				default: g_diagramName,
				validator: Util.diagramValidator,
				resultFunc: function(name) {
					var diagramSpec = diagramToSpec(g_diagram);
					sendMessage('save_diagram', {'name': name, 'diagram': diagramSpec});  // fix(soon): should check for success
					diagramSpec.name = g_diagramName;  // fix(clean): this is a bit messy; sometime diagram spec has name, sometimes not
					updateDiagramSpec(diagramSpec);
					showControllerViewer();
				}});
		}, noFunc: function() {
			showControllerViewer();
		}});
	} else {
		showControllerViewer();
	}
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
